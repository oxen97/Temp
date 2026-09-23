import { createDefaultInteraction } from "@/features/editor/lib/interaction-model";
import type { CanvasElement } from "@/features/editor/store/editor-store";

function svgImage(markup: string) {
  // ShapeGraphic inserts this into an unquoted CSS url(...); encode the
  // punctuation encodeURIComponent intentionally leaves untouched as well.
  const encoded = encodeURIComponent(markup).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

/** An original, editable study of the eyes visible between MON's strands. */
const hairyBackdropSvg = svgImage(`
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <linearGradient id="room" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f05d41"/>
      <stop offset=".34" stop-color="#c92546"/>
      <stop offset=".7" stop-color="#7f1947"/>
      <stop offset="1" stop-color="#32112e"/>
    </linearGradient>
    <radialGradient id="eyeLight"><stop stop-color="#fffdf1"/><stop offset="1" stop-color="#ffdbe0"/></radialGradient>
    <filter id="softEye" x="-30%" y="-100%" width="160%" height="300%">
      <feGaussianBlur stdDeviation="16"/>
    </filter>
  </defs>
  <rect width="1920" height="1080" fill="url(#room)"/>
  <ellipse cx="960" cy="437" rx="540" ry="215" fill="#270b28" opacity=".42" filter="url(#softEye)"/>
  <path d="M505 433 Q661 378 828 429 Q665 472 505 433Z" fill="#240d25" stroke="#351027" stroke-width="14"/>
  <path d="M1092 429 Q1259 378 1415 433 Q1254 472 1092 429Z" fill="#240d25" stroke="#351027" stroke-width="14"/>
  <path d="M524 432 Q666 407 810 432 Q668 448 524 432Z" fill="url(#eyeLight)"/>
  <path d="M1110 432 Q1254 407 1396 432 Q1253 448 1110 432Z" fill="url(#eyeLight)"/>
  <path d="M723 420 Q743 430 724 444 Q711 434 723 420Z" fill="#231025" opacity=".9"/>
  <path d="M1194 420 Q1174 430 1193 444 Q1206 434 1194 420Z" fill="#231025" opacity=".9"/>
</svg>`);

function backdropElement(width: number, height: number): CanvasElement {
  return {
    cornerRadius: 0,
    fill: "transparent",
    height,
    id: "mon-demo-backdrop",
    interactions: [],
    locked: true,
    name: "Hairy study · backdrop and eyes",
    opacity: 100,
    rotation: 0,
    src: hairyBackdropSvg,
    stroke: "transparent",
    strokeStyle: "none",
    strokeWidth: 0,
    type: "image",
    visible: true,
    width,
    x: 0,
    y: 0,
  };
}

/** Native, individually editable strands with authored Bend and Merge rules. */
export function createMonDemoElements(width: number, height: number) {
  const sx = width / 1920;
  const sy = height / 1080;
  const strandCount = 45;
  const pitch = width / strandCount;
  const strandWidth = 52 * sx;
  const strandCenter = strandWidth / 2;
  const strands: CanvasElement[] = Array.from(
    { length: strandCount },
    (_, index) => {
      const strandHeight = (925 + ((index * 73) % 220)) * sy;
      const id = `mon-demo-strand-${index + 1}`;
      const tint = Math.round(33 + 12 * Math.sin(index * 0.47));
      const channel = (value: number) => value.toString(16).padStart(2, "0");
      const red = `#${channel(216 + Math.round(9 * Math.sin(index * 0.69)))}${channel(tint)}${channel(67 + Math.round(10 * Math.cos(index * 0.38)))}`;
      return {
        id,
        name: `MON strand ${index + 1}`,
        type: "pen",
        x: (index + 0.5) * pitch - strandCenter,
        y: -48 * sy,
        width: strandWidth,
        height: strandHeight,
        rotation: 0,
        opacity: 100,
        fill: "none",
        stroke: red,
        // The narrow gaps keep each ribbon distinct and avoid pre-merging.
        strokeWidth: (33 + Math.sin(index * 1.39) * 1.5) * sx,
        strokeStyle: "solid",
        cornerRadius: 0,
        visible: true,
        locked: false,
        vectorPaths: [
          {
            points: [
              { x: strandCenter, y: 0 },
              { x: strandCenter, y: strandHeight },
            ],
          },
        ],
        interactions: [
          createDefaultInteraction({
            id: `${id}-bend`,
            name: "Drag to bend strand",
            trigger: "drag",
            effect: "strand-bend",
            motion: "spring",
            strandAnchor: "top",
            strandStiffness: 0.53,
            strandDamping: 0.78,
            strandInfluenceRadius: 230 * sy,
            strandMaxDisplacement: 1100 * sx,
            strandNeighborRadius: 205 * sx,
            strandNeighborStrength: 68,
          }),
          ...Array.from(
            { length: Math.min(4, strandCount - index - 1) },
            (_, neighborIndex) => {
              const offset = neighborIndex + 1;
              return createDefaultInteraction({
                id: `${id}-liquid-${offset}`,
                name:
                  offset === 1
                    ? "Merge with neighboring strand"
                    : `Merge with nearby strand +${offset}`,
                trigger: "near-target",
                effect: "liquid-merge",
                motion: "direct",
                collisionTarget: `mon-demo-strand-${index + offset + 1}`,
                joinDistance: 2 * sx,
                releaseDistance: 7 * sx,
                bridgeWidth: 4 * sx,
                liquidSmoothness: 28,
                liquidAttraction: 100,
              });
            },
          ),
        ],
      };
    },
  );
  return [backdropElement(width, height), ...strands];
}

/** The four pages shown by the MON art preview. The index is zero based. */
export const MON_ART_SCENES = [
  {
    id: "mon-art-scene-1",
    name: "PENDULUM",
    instruction: "선을 드래그해 공간을 흔들어 보세요",
  },
  {
    id: "mon-art-scene-2",
    name: "AFTERIMAGE",
    instruction: "화면을 누른 채 움직여 빛의 흔적을 남겨 보세요",
  },
  {
    id: "mon-art-scene-3",
    name: "GAZE",
    instruction: "화면을 클릭해 새로운 시선을 만들어 보세요",
  },
  {
    id: "mon-art-scene-4",
    name: "RESONANCE",
    instruction: "포인터를 움직여 선의 흐름을 바꿔 보세요",
  },
] as const;

function monArtElement(
  id: string,
  name: string,
  type: CanvasElement["type"],
  x: number,
  y: number,
  width: number,
  height: number,
  fill = "transparent",
): CanvasElement {
  return {
    id,
    name,
    type,
    x,
    y,
    width,
    height,
    fill,
    rotation: 0,
    opacity: 100,
    stroke: "transparent",
    strokeStyle: "none",
    strokeWidth: 0,
    cornerRadius: 0,
    visible: true,
    locked: false,
    interactions: [],
  };
}

function monArtBackdrop(
  sceneNumber: number,
  width: number,
  height: number,
  body: string,
): CanvasElement {
  const backdrop = monArtElement(
    `mon-art-${sceneNumber}-backdrop`,
    "Scene background",
    "image",
    0,
    0,
    width,
    height,
  );
  backdrop.src = svgImage(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">${body}</svg>`,
  );
  backdrop.locked = true;
  return backdrop;
}

function monArtText(
  id: string,
  name: string,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
  fill = "#fff1e9",
): CanvasElement {
  return {
    ...monArtElement(id, name, "text", x, y, width, height, fill),
    text: value,
    fontFamily: "Arial",
    fontSize,
    fontWeight: "700",
    textResizeMode: "fixed",
  };
}

function monArtPen(
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  stroke: string,
  strokeWidth: number,
  points: NonNullable<CanvasElement["vectorPaths"]>[number]["points"],
): CanvasElement {
  return {
    ...monArtElement(id, name, "pen", x, y, width, height),
    fill: "none",
    stroke,
    strokeStyle: "solid",
    strokeWidth,
    vectorPaths: [{ points }],
  };
}

function pendulumElements(width: number, height: number): CanvasElement[] {
  const sx = width / 1920;
  const sy = height / 1080;
  const spacing = width / 22;
  const thickness = Math.max(12 * sx, Math.min(spacing * 0.53, 46 * sx));
  const backdrop = monArtBackdrop(
    1,
    width,
    height,
    `<defs><linearGradient id="wash" x2="1" y2="1"><stop stop-color="#100209" stop-opacity=".56"/><stop offset=".55" stop-color="#932d2f" stop-opacity=".12"/><stop offset="1" stop-color="#0f0207" stop-opacity=".45"/></linearGradient></defs><rect width="1920" height="1080" fill="#50131c"/><rect width="1920" height="1080" fill="url(#wash)"/>`,
  );
  const numeral = monArtText(
    "mon-art-1-ghost-number",
    "Background numeral 01",
    "01",
    width * 0.35,
    height * 0.55,
    width * 0.3,
    height * 0.34,
    Math.min(width * 0.22, height * 0.38),
    "#f9b9a2",
  );
  numeral.fontWeight = "900";
  numeral.fillOpacity = 6;
  numeral.textAlign = "center";
  const bars = Array.from({ length: 21 }, (_, index) => {
    const x = spacing * (index + 1);
    const length =
      height *
      (0.54 + 0.14 * Math.sin(index * 1.4 + 0.5) + (index % 5) * 0.027);
    const color =
      index % 4 === 0 ? "#a24648" : index % 3 === 0 ? "#822b34" : "#6e2029";
    const bar = monArtPen(
      `mon-art-1-bar-${index + 1}`,
      `Pendulum strand ${index + 1}`,
      x - spacing / 2,
      -24 * sy,
      spacing,
      length + 24 * sy,
      color,
      thickness,
      [
        {
          x: spacing / 2,
          y: 0,
          handleOut: { x: spacing / 2, y: length * 0.3 },
        },
        {
          x: spacing / 2,
          y: length + 24 * sy,
          handleIn: { x: spacing / 2, y: length * 0.75 },
        },
      ],
    );
    bar.interactions = [
      createDefaultInteraction({
        id: `${bar.id}-bend`,
        name: "Drag strand to swing",
        trigger: "drag",
        effect: "strand-bend",
        motion: "spring",
        strandAnchor: "top",
        strandStiffness: 0.53,
        strandDamping: 0.78,
        strandInfluenceRadius: 230 * sy,
        strandMaxDisplacement: 1100 * sx,
        strandNeighborRadius: 205 * sx,
        strandNeighborStrength: 68,
      }),
    ];
    return bar;
  });
  return [backdrop, ...bars, numeral];
}

function afterimageElements(width: number, height: number): CanvasElement[] {
  const s = Math.min(width, height);
  const backdrop = monArtBackdrop(
    2,
    width,
    height,
    `<defs><radialGradient id="ambient"><stop stop-color="#1e0c0c"/><stop offset="1" stop-color="#09090b"/></radialGradient></defs><rect width="1920" height="1080" fill="#09090b"/><ellipse cx="960" cy="518" rx="1114" ry="650" fill="url(#ambient)"/>`,
  );
  const rings = [0.19, 0.13].map((fraction, index) => {
    const radius = s * fraction;
    const ring = monArtElement(
      `mon-art-2-ring-${index + 1}`,
      `Afterimage orbit ${index + 1}`,
      "circle",
      width * 0.5 - radius,
      height * 0.47 - radius,
      radius * 2,
      radius * 2,
      "none",
    );
    ring.stroke = "#ef7146";
    ring.strokeOpacity = 28;
    ring.strokeWidth = Math.max(1, width / 1920);
    ring.strokeStyle = "solid";
    return ring;
  });
  const ember = monArtElement(
    "mon-art-2-ember",
    "Interactive ember",
    "circle",
    width * 0.5 - 4,
    height * 0.47 - 4,
    8,
    8,
    "#d85d3e",
  );
  ember.interactions = [
    createDefaultInteraction({
      id: "mon-art-2-ember-pulse",
      name: "Touch the ember",
      trigger: "hover",
      effect: "scale",
      scaleX: 500,
      scaleY: 500,
      duration: 0.35,
    }),
  ];
  return [backdrop, ...rings, ember];
}

function gazeElements(width: number, height: number): CanvasElement[] {
  const backdrop = monArtBackdrop(
    3,
    width,
    height,
    `<defs><linearGradient id="wash" x2="1" y2="1"><stop stop-color="#ffd3ab" stop-opacity=".36"/><stop offset=".48" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#7f246f" stop-opacity=".27"/></linearGradient></defs><rect width="1920" height="1080" fill="#ee79b5"/><rect width="1920" height="1080" fill="url(#wash)"/>`,
  );
  const specs = [
    { u: 0.26, v: 0.32, size: 0.095, tilt: -0.18 },
    { u: 0.71, v: 0.27, size: 0.14, tilt: 0.12 },
    { u: 0.5, v: 0.57, size: 0.18, tilt: -0.11 },
    { u: 0.82, v: 0.72, size: 0.085, tilt: -0.25 },
    { u: 0.17, v: 0.59, size: 0.09, tilt: 0.24 },
  ];
  const eyes = specs.flatMap(({ u, v, size, tilt }, index) => {
    const unit = Math.min(width, height) * size;
    const centerX = width * u;
    const centerY = height * v;
    const groupId = `mon-art-3-eye-${index + 1}`;
    const rotation = (tilt * 180) / Math.PI;
    const layer = (
      suffix: string,
      label: string,
      x: number,
      y: number,
      shapeWidth: number,
      shapeHeight: number,
      fill: string,
    ) => {
      const element = monArtElement(
        `${groupId}-${suffix}`,
        `Eye ${index + 1} · ${label}`,
        "circle",
        x,
        y,
        shapeWidth,
        shapeHeight,
        fill,
      );
      element.groupId = groupId;
      element.rotation = rotation;
      return element;
    };
    const almond = (
      suffix: string,
      halfWidth: number,
      curveHeight: number,
      fill: string,
    ) => {
      const shapeWidth = halfWidth * 2;
      const shapeHeight = curveHeight;
      const midY = shapeHeight / 2;
      const controlOffset = (curveHeight * 2) / 3;
      const element = monArtPen(
        `${groupId}-${suffix}`,
        `Eye ${index + 1} · ${suffix}`,
        centerX - halfWidth,
        centerY - shapeHeight / 2,
        shapeWidth,
        shapeHeight,
        "transparent",
        0,
        [
          {
            x: 0,
            y: midY,
            handleIn: { x: shapeWidth / 3, y: midY + controlOffset },
            handleOut: { x: shapeWidth / 3, y: midY - controlOffset },
          },
          {
            x: shapeWidth,
            y: midY,
            handleIn: { x: (shapeWidth * 2) / 3, y: midY - controlOffset },
            handleOut: { x: (shapeWidth * 2) / 3, y: midY + controlOffset },
          },
        ],
      );
      element.vectorPaths = [{ points: element.vectorPaths![0].points, closed: true }];
      element.fill = fill;
      element.strokeStyle = "none";
      element.groupId = groupId;
      element.rotation = rotation;
      return element;
    };
    const socket = almond("socket", unit * 1.17, unit * 1.08, "#381329");
    const white = almond("white", unit * 1.02, unit * 0.85, "#fff5df");
    const iris = layer(
      "iris",
      "iris",
      centerX - unit * 0.48,
      centerY - unit * 0.48,
      unit * 0.96,
      unit * 0.96,
      "#f29b4a",
    );
    const pupil = layer(
      "pupil",
      "pupil",
      centerX - unit * 0.27,
      centerY - unit * 0.27,
      unit * 0.54,
      unit * 0.54,
      "#341527",
    );
    const shine = layer(
      "shine",
      "glint",
      centerX - unit * 0.18,
      centerY - unit * 0.205,
      unit * 0.17,
      unit * 0.17,
      "#fff8ec",
    );
    for (const detail of [iris, pupil, shine]) {
      detail.interactions = [
        createDefaultInteraction({
          id: `${detail.id}-follow`,
          name: "Gaze follows pointer",
          trigger: "pointer-move",
          effect: "move",
          moveX: unit * 0.19,
          moveY: unit * 0.14,
          trackDistance: Math.max(width * 0.35, 1),
          motion: "direct",
        }),
      ];
    }
    return [socket, white, iris, pupil, shine];
  });
  return [backdrop, ...eyes];
}

function resonanceElements(width: number, height: number): CanvasElement[] {
  const backdrop = monArtBackdrop(
    4,
    width,
    height,
    `<rect width="1920" height="1080" fill="#101936"/>`,
  );
  const strokes = Array.from({ length: 37 }, (_, index) => {
    const line = index - 18;
    const offset = line * Math.max(19, height * 0.032);
    const startY = height * 0.49 + offset;
    const firstY = height * 0.43 + offset * 0.45 + Math.sin(line * 0.45) * 25;
    const secondY = height * 0.61 + offset * 0.45;
    const endY = height * 0.47 + offset;
    const top = Math.min(startY, firstY, secondY, endY);
    const bottom = Math.max(startY, firstY, secondY, endY);
    const left = -width * 0.12;
    const stroke = monArtPen(
      `mon-art-4-wave-${index + 1}`,
      `Resonance line ${index + 1}`,
      left,
      top,
      width * 1.25,
      Math.max(bottom - top, 1),
      "#cdd8ef",
      1,
      [
        {
          x: 0,
          y: startY - top,
          handleOut: { x: width * 0.4, y: firstY - top },
        },
        {
          x: width * 1.25,
          y: endY - top,
          handleIn: { x: width * 0.71, y: secondY - top },
        },
      ],
    );
    stroke.strokeOpacity = 27;
    return stroke;
  });
  const monOutline = monArtElement(
    "mon-art-4-mon-outline",
    "MON outline artwork",
    "image",
    width * 0.19,
    height * 0.2,
    width * 0.62,
    height * 0.58,
  );
  monOutline.src = svgImage(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600"><text x="600" y="370" text-anchor="middle" fill="none" stroke="#e7e5db" stroke-opacity=".83" stroke-width="4.3" stroke-linejoin="round" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="480">MON</text><text x="609" y="382" text-anchor="middle" fill="none" stroke="#e37765" stroke-opacity=".62" stroke-width="2" stroke-linejoin="round" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="480">MON</text></svg>`,
  );
  monOutline.interactions = [
    createDefaultInteraction({
      id: "mon-art-4-mon-follow",
      name: "MON follows pointer",
      trigger: "pointer-move",
      effect: "move",
      moveX: 8,
      moveY: 8,
      trackDistance: Math.max(width * 0.5, 1),
      motion: "direct",
    }),
  ];
  const dotSize = Math.max(6, width * 0.008);
  const dot = monArtElement(
    "mon-art-4-focus-dot",
    "Focus point",
    "circle",
    width * 0.5 - dotSize / 2,
    height * 0.48 - dotSize / 2,
    dotSize,
    dotSize,
    "#e1746e",
  );
  return [backdrop, ...strokes, monOutline, dot];
}

function monArtChrome(sceneIndex: number, width: number, height: number) {
  const scene = MON_ART_SCENES[sceneIndex];
  const sx = width / 1920;
  const sy = height / 1080;
  const text = (
    suffix: string,
    name: string,
    value: string,
    x: number,
    y: number,
    w: number,
    h: number,
    size: number,
  ) =>
    monArtText(
      `mon-art-${sceneIndex + 1}-${suffix}`,
      name,
      value,
      x * sx,
      y * sy,
      w * sx,
      h * sy,
      size * Math.min(sx, sy),
    );
  const brand = text("brand", "MON mark", "M•N", 80, 58, 110, 60, 55);
  brand.fontWeight = "900";
  brand.lineHeight = 0.9;
  const brandSub = text(
    "brand-sub",
    "Study subtitle",
    "INTERACTION STUDY\n2D / ORIGINAL PROTOTYPE",
    205,
    72,
    220,
    40,
    9,
  );
  brandSub.letterSpacing = 1.5 * sx;
  brandSub.fillOpacity = 73;
  brandSub.lineHeight = 1.6;
  const close = text(
    "close",
    "Close label",
    "CLOSE   ×",
    1728,
    68,
    112,
    30,
    11,
  );
  close.letterSpacing = 2 * sx;
  const center = text(
    "center-label",
    "Experience label",
    "INTERACTIVE EXPERIENCE / 2026",
    -90,
    430,
    365,
    24,
    9,
  );
  center.rotation = -90;
  center.fillOpacity = 65;
  center.letterSpacing = 2 * sx;
  const number = text(
    "scene-number",
    "Scene number",
    `${String(sceneIndex + 1).padStart(2, "0")} / 04`,
    80,
    824,
    180,
    25,
    12,
  );
  number.letterSpacing = 2 * sx;
  const title = text(
    "scene-title",
    "Scene title",
    scene.name,
    80,
    859,
    1320,
    106,
    105,
  );
  title.fontWeight = "800";
  title.letterSpacing = -5 * sx;
  title.lineHeight = 0.9;
  const instruction = text(
    "instruction",
    "Interaction instruction",
    scene.instruction,
    80,
    981,
    1000,
    32,
    14,
  );
  instruction.fontWeight = "500";
  instruction.fillOpacity = 78;
  const nextBorder = monArtElement(
    `mon-art-${sceneIndex + 1}-next-border`,
    "Next scene button",
    "rectangle",
    1560 * sx,
    920 * sy,
    280 * sx,
    60 * sy,
  );
  nextBorder.stroke = "#fff2e7";
  nextBorder.strokeOpacity = 63;
  nextBorder.strokeWidth = Math.max(1, Math.min(sx, sy));
  nextBorder.strokeStyle = "solid";
  const nextLabel = text(
    "next-label",
    "Next scene label",
    "NEXT SCENE",
    1580,
    940,
    200,
    30,
    10,
  );
  nextLabel.letterSpacing = 2 * sx;
  const nextArrow = text(
    "next-arrow",
    "Next scene arrow",
    "↗",
    1798,
    928,
    40,
    42,
    23,
  );
  const credit = text(
    "credit",
    "Study credit",
    "Inspired by Kim Jongmin's MON · Independent visual study",
    1360,
    1040,
    480,
    20,
    9,
  );
  credit.textAlign = "right";
  credit.fillOpacity = 55;
  return [
    brand,
    brandSub,
    close,
    center,
    number,
    title,
    instruction,
    nextBorder,
    nextLabel,
    nextArrow,
    credit,
  ];
}

/** Static, editable editor artwork for a MON art preview scene (zero-based index). */
export function createMonArtSceneElements(
  sceneIndex: number,
  width: number,
  height: number,
): CanvasElement[] {
  if (
    !Number.isInteger(sceneIndex) ||
    sceneIndex < 0 ||
    sceneIndex >= MON_ART_SCENES.length
  ) {
    throw new RangeError(`Unknown MON art scene index: ${sceneIndex}`);
  }
  const sceneArtwork = [
    pendulumElements,
    afterimageElements,
    gazeElements,
    resonanceElements,
  ][sceneIndex](width, height);
  return [...sceneArtwork, ...monArtChrome(sceneIndex, width, height)];
}
