"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

import styles from "./mon-demo-experience.module.css";

type Point = { x: number; y: number };
type Blob = Point & { born: number; radius: number; hue: number };
type Eye = { u: number; v: number; size: number; tilt: number };

type DemoModel = {
  bars: number[];
  barVelocity: number[];
  blobs: Blob[];
  eyes: Eye[];
  pointer: Point;
  pointerDown: boolean;
  previousPointer: Point;
};

const SCENES = [
  {
    number: "01",
    name: "PENDULUM",
    instruction: "선을 드래그해 공간을 흔들어 보세요",
  },
  {
    number: "02",
    name: "AFTERIMAGE",
    instruction: "화면을 누른 채 움직여 빛의 흔적을 남겨 보세요",
  },
  {
    number: "03",
    name: "GAZE",
    instruction: "화면을 클릭해 새로운 시선을 만들어 보세요",
  },
  {
    number: "04",
    name: "RESONANCE",
    instruction: "포인터를 움직여 선의 흐름을 바꿔 보세요",
  },
] as const;

const initialEyes: Eye[] = [
  { u: 0.26, v: 0.32, size: 0.095, tilt: -0.18 },
  { u: 0.71, v: 0.27, size: 0.14, tilt: 0.12 },
  { u: 0.5, v: 0.57, size: 0.18, tilt: -0.11 },
  { u: 0.82, v: 0.72, size: 0.085, tilt: -0.25 },
  { u: 0.17, v: 0.59, size: 0.09, tilt: 0.24 },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function fillBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
}

function drawPendulum(
  ctx: CanvasRenderingContext2D,
  model: DemoModel,
  width: number,
  height: number,
  reducedMotion: boolean,
) {
  fillBackground(ctx, width, height, "#50131c");
  const wash = ctx.createLinearGradient(0, 0, width, height);
  wash.addColorStop(0, "rgba(20, 2, 9, .56)");
  wash.addColorStop(0.55, "rgba(147, 45, 47, .12)");
  wash.addColorStop(1, "rgba(15, 2, 7, .45)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);

  const count = model.bars.length;
  const spacing = width / (count + 1);
  const thickness = clamp(spacing * 0.53, 12, 46);
  for (let index = 0; index < count; index++) {
    const x = spacing * (index + 1);
    const length =
      height *
      (0.54 + 0.14 * Math.sin(index * 1.4 + 0.5) + (index % 5) * 0.027);
    const near = Math.max(
      0,
      1 - Math.abs(model.pointer.x - x) / (spacing * 2.4),
    );
    if (!reducedMotion) {
      const attraction = model.pointerDown
        ? (model.pointer.x - x) * near * 0.0028
        : 0;
      model.barVelocity[index] += -model.bars[index] * 0.018 + attraction;
      model.barVelocity[index] *= 0.94;
      model.bars[index] += model.barVelocity[index];
    }
    const bend = model.bars[index];
    ctx.beginPath();
    ctx.moveTo(x, -24);
    ctx.bezierCurveTo(
      x + bend * 0.08,
      length * 0.3,
      x + bend * 0.8,
      length * 0.75,
      x + bend,
      length,
    );
    ctx.lineCap = "round";
    ctx.lineWidth = thickness + 9;
    ctx.strokeStyle = "rgba(27, 3, 9, .46)";
    ctx.stroke();
    ctx.lineWidth = thickness;
    ctx.strokeStyle =
      index % 4 === 0 ? "#a24648" : index % 3 === 0 ? "#822b34" : "#6e2029";
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - thickness * 0.25, -24);
    ctx.bezierCurveTo(
      x + bend * 0.08 - thickness * 0.25,
      length * 0.3,
      x + bend * 0.8 - thickness * 0.25,
      length * 0.75,
      x + bend - thickness * 0.25,
      length,
    );
    ctx.lineWidth = Math.max(1, thickness * 0.055);
    ctx.strokeStyle = "rgba(251, 174, 150, .31)";
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(249, 185, 162, .06)";
  ctx.font = `900 ${Math.min(width * 0.22, height * 0.38)}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("01", width * 0.5, height * 0.86);
}

function addBlob(model: DemoModel, x: number, y: number, now: number) {
  model.blobs.push({
    x,
    y,
    born: now,
    radius: 19 + Math.random() * 54,
    hue: Math.random() * 26,
  });
  if (model.blobs.length > 110) model.blobs.shift();
}

function drawAfterimage(
  ctx: CanvasRenderingContext2D,
  model: DemoModel,
  width: number,
  height: number,
  now: number,
  reducedMotion: boolean,
) {
  fillBackground(ctx, width, height, "#09090b");
  const ambient = ctx.createRadialGradient(
    width * 0.5,
    height * 0.48,
    0,
    width * 0.5,
    height * 0.48,
    width * 0.58,
  );
  ambient.addColorStop(0, "#1e0c0c");
  ambient.addColorStop(1, "#09090b");
  ctx.fillStyle = ambient;
  ctx.fillRect(0, 0, width, height);

  const lifespan = reducedMotion ? 7000 : 2600;
  model.blobs = model.blobs.filter((blob) => now - blob.born < lifespan);
  ctx.globalCompositeOperation = "screen";
  for (const blob of model.blobs) {
    const age = (now - blob.born) / lifespan;
    const radius = blob.radius * (1 + age * 1.2);
    const gradient = ctx.createRadialGradient(
      blob.x,
      blob.y,
      radius * 0.06,
      blob.x,
      blob.y,
      radius * 2.2,
    );
    const alpha = (1 - age) * 0.9;
    gradient.addColorStop(0, `rgba(255, 177, 99, ${alpha})`);
    gradient.addColorStop(
      0.27,
      `rgba(234, ${73 + blob.hue}, 40, ${alpha * 0.72})`,
    );
    gradient.addColorStop(0.67, `rgba(162, 27, 35, ${alpha * 0.23})`);
    gradient.addColorStop(1, "rgba(96, 4, 19, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(blob.x, blob.y, radius * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  if (model.blobs.length === 0) {
    ctx.strokeStyle = "rgba(239, 113, 70, .28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(
      width * 0.5,
      height * 0.47,
      Math.min(width, height) * 0.13,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(
      width * 0.5,
      height * 0.47,
      Math.min(width, height) * 0.19,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.fillStyle = "#d85d3e";
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.47, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEye(
  ctx: CanvasRenderingContext2D,
  eye: Eye,
  width: number,
  height: number,
  pointer: Point,
) {
  const x = eye.u * width;
  const y = eye.v * height;
  const size = Math.min(width, height) * eye.size;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(eye.tilt);
  ctx.fillStyle = "rgba(99, 18, 74, .21)";
  ctx.beginPath();
  ctx.ellipse(
    size * 0.09,
    size * 0.14,
    size * 1.17,
    size * 0.58,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.fillStyle = "#381329";
  ctx.beginPath();
  ctx.moveTo(-size * 1.17, 0);
  ctx.quadraticCurveTo(0, -size * 1.08, size * 1.17, 0);
  ctx.quadraticCurveTo(0, size * 1.08, -size * 1.17, 0);
  ctx.fill();
  ctx.fillStyle = "#fff5df";
  ctx.beginPath();
  ctx.moveTo(-size * 1.02, 0);
  ctx.quadraticCurveTo(0, -size * 0.85, size * 1.02, 0);
  ctx.quadraticCurveTo(0, size * 0.85, -size * 1.02, 0);
  ctx.fill();
  ctx.save();
  ctx.clip();
  const lookX =
    clamp((pointer.x - x) / Math.max(width * 0.35, 1), -1, 1) * size * 0.19;
  const lookY =
    clamp((pointer.y - y) / Math.max(height * 0.35, 1), -1, 1) * size * 0.14;
  ctx.fillStyle = "#f29b4a";
  ctx.beginPath();
  ctx.arc(lookX, lookY, size * 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#341527";
  ctx.beginPath();
  ctx.arc(lookX, lookY, size * 0.27, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff8ec";
  ctx.beginPath();
  ctx.arc(
    lookX - size * 0.1,
    lookY - size * 0.12,
    size * 0.085,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = Math.max(2, size * 0.055);
  ctx.strokeStyle = "#381329";
  ctx.beginPath();
  ctx.moveTo(-size * 1.17, 0);
  ctx.quadraticCurveTo(0, -size * 1.08, size * 1.17, 0);
  ctx.stroke();
  ctx.restore();
}

function drawGaze(
  ctx: CanvasRenderingContext2D,
  model: DemoModel,
  width: number,
  height: number,
) {
  fillBackground(ctx, width, height, "#ee79b5");
  const wash = ctx.createLinearGradient(0, 0, width, height);
  wash.addColorStop(0, "rgba(255, 211, 171, .36)");
  wash.addColorStop(0.48, "rgba(255, 255, 255, 0)");
  wash.addColorStop(1, "rgba(127, 36, 111, .27)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);
  for (const eye of model.eyes) drawEye(ctx, eye, width, height, model.pointer);
}

function drawResonance(
  ctx: CanvasRenderingContext2D,
  model: DemoModel,
  width: number,
  height: number,
  now: number,
  reducedMotion: boolean,
) {
  fillBackground(ctx, width, height, "#101936");
  const px = (model.pointer.x / width - 0.5) * 2;
  const py = (model.pointer.y / height - 0.5) * 2;
  const drift = reducedMotion ? 0 : now * 0.00018;
  ctx.save();
  ctx.strokeStyle = "rgba(205, 216, 239, .27)";
  ctx.lineWidth = 1;
  for (let i = -18; i <= 18; i++) {
    const offset = i * Math.max(19, height * 0.032);
    const pull = px * width * 0.1 * Math.exp(-Math.abs(i) / 12);
    ctx.beginPath();
    ctx.moveTo(-width * 0.12, height * 0.49 + offset);
    ctx.bezierCurveTo(
      width * 0.28,
      height * 0.43 + offset * 0.45 + Math.sin(i * 0.45 + drift) * 25,
      width * 0.59 + pull,
      height * 0.61 + offset * 0.45 + py * 55,
      width * 1.13,
      height * 0.47 + offset,
    );
    ctx.stroke();
  }
  ctx.restore();
  const typeSize = clamp(width * 0.25, 95, height * 0.5);
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${typeSize}px Arial, Helvetica, sans-serif`;
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(1.5, typeSize * 0.009);
  ctx.strokeStyle = "rgba(231, 229, 219, .83)";
  ctx.strokeText("MON", width * 0.5, height * 0.48);
  ctx.lineWidth = Math.max(1, typeSize * 0.004);
  ctx.strokeStyle = "rgba(227, 119, 101, .62)";
  ctx.strokeText("MON", width * 0.5 + 9 + px * 8, height * 0.48 + 12 + py * 8);
  ctx.restore();
  ctx.fillStyle = "#e1746e";
  ctx.beginPath();
  ctx.arc(
    width * 0.5 + px * 40,
    height * 0.48 + py * 28,
    Math.max(3, width * 0.004),
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

export function MonDemoExperience({ onClose }: { onClose: () => void }) {
  const [scene, setScene] = useState(0);
  const sceneRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotionRef = useRef(false);
  const modelRef = useRef<DemoModel>({
    bars: Array(21).fill(0),
    barVelocity: Array(21).fill(0),
    blobs: [],
    eyes: [...initialEyes],
    pointer: { x: 0, y: 0 },
    pointerDown: false,
    previousPointer: { x: 0, y: 0 },
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motion.matches;
    reducedMotionRef.current = reducedMotion;
    let width = 1;
    let height = 1;
    let frame = 0;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (modelRef.current.pointer.x === 0)
        modelRef.current.pointer = { x: width * 0.5, y: height * 0.5 };
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    const onMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      reducedMotionRef.current = event.matches;
    };
    motion.addEventListener("change", onMotionChange);

    const draw = (now: number) => {
      context.clearRect(0, 0, width, height);
      const model = modelRef.current;
      switch (sceneRef.current) {
        case 0:
          drawPendulum(context, model, width, height, reducedMotion);
          break;
        case 1:
          drawAfterimage(context, model, width, height, now, reducedMotion);
          break;
        case 2:
          drawGaze(context, model, width, height);
          break;
        default:
          drawResonance(context, model, width, height, now, reducedMotion);
      }
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(frame);
      motion.removeEventListener("change", onMotionChange);
      observer.disconnect();
    };
  }, []);

  const pointerPosition = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const model = modelRef.current;
    const point = pointerPosition(event);
    model.pointer = point;
    model.previousPointer = point;
    model.pointerDown = true;
    if (sceneRef.current === 1)
      addBlob(model, point.x, point.y, performance.now());
    if (sceneRef.current === 2) {
      const { width, height } = event.currentTarget.getBoundingClientRect();
      model.eyes.push({
        u: point.x / width,
        v: point.y / height,
        size: 0.075 + Math.random() * 0.075,
        tilt: (Math.random() - 0.5) * 0.5,
      });
      if (model.eyes.length > 15) model.eyes.shift();
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const model = modelRef.current;
    const point = pointerPosition(event);
    if (model.pointerDown && sceneRef.current === 0) {
      const spacing = event.currentTarget.clientWidth / (model.bars.length + 1);
      const drag = point.x - model.previousPointer.x;
      model.bars.forEach((_, index) => {
        const distance = Math.abs(point.x - spacing * (index + 1));
        const influence = Math.max(0, 1 - distance / (spacing * 2.3));
        if (reducedMotionRef.current) {
          model.bars[index] = clamp(
            model.bars[index] + drag * influence,
            -110,
            110,
          );
        } else {
          model.barVelocity[index] += clamp(drag * influence * 0.25, -12, 12);
        }
      });
    }
    if (model.pointerDown && sceneRef.current === 1) {
      const distance = Math.hypot(
        point.x - model.previousPointer.x,
        point.y - model.previousPointer.y,
      );
      const steps = Math.max(1, Math.ceil(distance / 22));
      for (let step = 1; step <= steps; step++) {
        const t = step / steps;
        addBlob(
          model,
          model.previousPointer.x + (point.x - model.previousPointer.x) * t,
          model.previousPointer.y + (point.y - model.previousPointer.y) * t,
          performance.now(),
        );
      }
    }
    model.pointer = point;
    model.previousPointer = point;
  };

  const endPointer = () => {
    modelRef.current.pointerDown = false;
  };
  const nextScene = () => {
    const next = (sceneRef.current + 1) % SCENES.length;
    sceneRef.current = next;
    modelRef.current.pointerDown = false;
    setScene(next);
  };

  return (
    <div
      className={styles.root}
      role="region"
      aria-label="MON 영감 2D 인터랙션 데모"
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label={`${SCENES[scene].name} 인터랙션 화면`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      />
      <div className={styles.topline}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>
            M<span>•</span>N
          </span>
          <span className={styles.brandSub}>
            INTERACTION STUDY
            <br />
            2D / ORIGINAL PROTOTYPE
          </span>
        </div>
        <button
          className={styles.close}
          type="button"
          onClick={onClose}
          aria-label="데모 닫기"
        >
          CLOSE <span aria-hidden="true">×</span>
        </button>
      </div>
      <div className={styles.centerLabel} aria-hidden="true">
        INTERACTIVE EXPERIENCE&nbsp; / &nbsp;2026
      </div>
      <div className={styles.bottomline}>
        <div className={styles.sceneInfo}>
          <span className={styles.sceneNumber}>
            {SCENES[scene].number}
            <span className={styles.sceneCount}> / 04</span>
          </span>
          <span className={styles.sceneName}>{SCENES[scene].name}</span>
          <span className={styles.instruction}>
            {SCENES[scene].instruction}
          </span>
        </div>
        <button
          className={styles.next}
          type="button"
          onClick={nextScene}
          aria-label={`다음 장면으로 이동: ${SCENES[(scene + 1) % 4].name}`}
        >
          <span>NEXT SCENE</span>
          <span className={styles.nextArrow} aria-hidden="true">
            ↗
          </span>
        </button>
      </div>
      <div className={styles.credit}>
        Inspired by Kim Jongmin&apos;s MON · Independent visual study
      </div>
    </div>
  );
}
