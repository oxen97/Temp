import { describe, expect, it } from "vitest";

import type { CanvasElement } from "../store/editor-store";
import { createDefaultInteraction } from "./interaction-model";
import {
  createMediaDeformMesh,
  MEDIA_DEFORM_MAX_CANVAS_EDGE,
  MEDIA_DEFORM_MAX_CANVAS_PIXELS,
  MEDIA_DEFORM_MAX_SEGMENTS,
  mediaDeformCanvasSize,
  mediaDeformHitPath,
  updateMediaDeformMesh,
} from "./media-deform";
import type { StrandAnchor, StrandPose } from "./strand-bone-runtime";

const media = (overrides: Partial<CanvasElement> = {}): CanvasElement => ({
  id: "uploaded-media",
  name: "Uploaded media",
  type: "image",
  src: "/photo.png",
  x: 0,
  y: 0,
  width: 112,
  height: 112,
  rotation: 0,
  opacity: 100,
  fill: "none",
  stroke: "none",
  strokeWidth: 0,
  cornerRadius: 0,
  visible: true,
  locked: false,
  ...overrides,
});

function pose(): StrandPose {
  const rest = [
    { x: 56, y: 0 },
    { x: 56, y: 56 },
    { x: 56, y: 112 },
  ];
  return {
    rest,
    points: rest.map((point) => ({ ...point })),
    velocities: rest.map(() => ({ x: 0, y: 0 })),
    anchorIndex: 0,
  };
}

describe("media deformation mesh", () => {
  it.each<StrandAnchor>(["left", "right", "top", "bottom"])(
    "preserves the free tip's depth and width for a %s anchor through stretch, rotation and compression",
    (anchor) => {
      const horizontal = anchor === "left" || anchor === "right";
      const reverse = anchor === "right" || anchor === "bottom";
      const element = media({
        width: horizontal ? 210 : 52,
        height: horizontal ? 52 : 210,
      });
      const mesh = createMediaDeformMesh(element, { tipLength: 28, anchor });
      const rest = horizontal
        ? [
            { x: 0, y: 26 },
            { x: 210, y: 26 },
          ]
        : [
            { x: 26, y: 0 },
            { x: 26, y: 210 },
          ];
      const anchorIndex = reverse ? 1 : 0;
      const root = rest[anchorIndex];
      const free = rest[1 - anchorIndex];
      const skeleton: StrandPose = {
        rest,
        points: rest,
        velocities: rest.map(() => ({ x: 0, y: 0 })),
        anchorIndex,
      };
      const original = [...mesh.positions];
      const uv = [...mesh.uv];
      // No visual change at rest despite the non-uniform, cap-aligned topology.
      updateMediaDeformMesh(mesh, skeleton);
      expect([...mesh.positions]).toEqual(original);

      const capIndices = Array.from(
        { length: mesh.local.length / 2 },
        (_, index) => index,
      ).filter((index) => {
        const axial = mesh.local[index * 2 + (horizontal ? 0 : 1)];
        return reverse ? axial <= 28 : axial >= 210 - 28;
      });
      for (const scale of [4, 0.5, 1]) {
        const angle = Math.PI / 5;
        skeleton.points = rest.map((point) => ({
          x:
            root.x +
            scale *
              ((point.x - root.x) * Math.cos(angle) -
                (point.y - root.y) * Math.sin(angle)),
          y:
            root.y +
            scale *
              ((point.x - root.x) * Math.sin(angle) +
                (point.y - root.y) * Math.cos(angle)),
        }));
        updateMediaDeformMesh(mesh, skeleton);
        const tip = skeleton.points[1 - anchorIndex];
        for (const index of capIndices) {
          const dx = mesh.local[index * 2] - free.x;
          const dy = mesh.local[index * 2 + 1] - free.y;
          expect(mesh.positions[index * 3]).toBeCloseTo(
            tip.x + dx * Math.cos(angle) - dy * Math.sin(angle),
            3,
          );
          expect(mesh.positions[index * 3 + 1]).toBeCloseTo(
            tip.y + dx * Math.sin(angle) + dy * Math.cos(angle),
            3,
          );
        }
        expect([...mesh.uv]).toEqual(uv);
      }
      // A very short shaft cannot invert even when shorter than the chosen tip.
      skeleton.points = rest.map((point) => ({
        x: root.x + (point.x - root.x) * 0.05,
        y: root.y + (point.y - root.y) * 0.05,
      }));
      updateMediaDeformMesh(mesh, skeleton);
      expect([...mesh.positions].every(Number.isFinite)).toBe(true);
      for (let row = 0; row <= mesh.rows; row += 1) {
        for (let column = 0; column <= mesh.columns; column += 1) {
          const index = row * (mesh.columns + 1) + column;
          if (horizontal && column > 0)
            expect(mesh.positions[index * 3]).toBeGreaterThan(
              mesh.positions[(index - 1) * 3],
            );
          if (!horizontal && row > 0)
            expect(mesh.positions[index * 3 + 1]).toBeGreaterThan(
              mesh.positions[(index - mesh.columns - 1) * 3 + 1],
            );
        }
      }
      updateMediaDeformMesh(mesh, null);
      expect([...mesh.positions]).toEqual(original);
    },
  );

  it("retains the original full-texture stretch when tip preservation is not authored", () => {
    const mesh = createMediaDeformMesh(
      media({ width: 210, height: 52, type: "video" }),
    );
    updateMediaDeformMesh(mesh, {
      rest: [
        { x: 0, y: 26 },
        { x: 210, y: 26 },
      ],
      points: [
        { x: 0, y: 26 },
        { x: 840, y: 26 },
      ],
      velocities: [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ],
      anchorIndex: 0,
    });
    for (let index = 0; index < mesh.local.length / 2; index += 1) {
      expect(mesh.positions[index * 3]).toBeCloseTo(mesh.local[index * 2] * 4);
      expect(mesh.positions[index * 3 + 1]).toBeCloseTo(
        mesh.local[index * 2 + 1],
      );
    }
  });

  it("bounds geometry and raster budgets even for a huge imported source", () => {
    const mesh = createMediaDeformMesh(
      media({ width: 200_000, height: 100_000 }),
    );
    expect(mesh.positions.length / 3).toBeLessThanOrEqual(
      (MEDIA_DEFORM_MAX_SEGMENTS + 1) ** 2,
    );
    expect(mesh.indices.length).toBeLessThanOrEqual(
      MEDIA_DEFORM_MAX_SEGMENTS ** 2 * 6,
    );
    const size = mediaDeformCanvasSize(
      { left: -500, top: -500, width: 200_000, height: 100_000 },
      4,
    );
    expect(size.width).toBeLessThanOrEqual(MEDIA_DEFORM_MAX_CANVAS_EDGE);
    expect(size.height).toBeLessThanOrEqual(MEDIA_DEFORM_MAX_CANVAS_EDGE);
    expect(size.width * size.height).toBeLessThanOrEqual(
      MEDIA_DEFORM_MAX_CANVAS_PIXELS,
    );
  });

  it("keeps rest positions and buffers unchanged until a pose actually bends", () => {
    const mesh = createMediaDeformMesh(media());
    const expected = [...mesh.positions];
    const positionBuffer = mesh.positions;
    const uvBuffer = mesh.uv;
    const skeleton = pose();
    updateMediaDeformMesh(mesh, skeleton);
    expect([...mesh.positions]).toEqual(expected);
    expect(mesh.positions).toBe(positionBuffer);
    expect(mesh.uv).toBe(uvBuffer);
    const bindings = mesh.bindings;
    updateMediaDeformMesh(mesh, {
      ...skeleton,
      points: skeleton.points.map((point) => ({ x: point.x + 75, y: point.y })),
    });
    expect(mesh.bindings).toBe(bindings);
    expect(mesh.positions[0]).toBe(75);
    expect(mesh.positions[1]).toBe(0);
    expect(mesh.positions[mesh.positions.length - 3]).toBe(187);
    expect([...mesh.uv]).toEqual([...uvBuffer]);
  });

  it("rotates cross sections around the deformed strand without narrowing the texture", () => {
    const mesh = createMediaDeformMesh(media());
    const skeleton = pose();
    skeleton.points = [
      { x: 56, y: 0 },
      { x: 84, y: 56 },
      { x: 112, y: 112 },
    ];
    updateMediaDeformMesh(mesh, skeleton);
    const row = mesh.rows / 2;
    const left = row * (mesh.columns + 1) * 3;
    const right = (row * (mesh.columns + 1) + mesh.columns) * 3;
    expect(
      Math.hypot(
        mesh.positions[right] - mesh.positions[left],
        mesh.positions[right + 1] - mesh.positions[left + 1],
      ),
    ).toBeCloseTo(112, 4);
    const center = (row * (mesh.columns + 1) + mesh.columns / 2) * 3;
    expect(mesh.positions[center]).toBe(84);
    expect(mesh.positions[center + 1]).toBe(56);
    expect(mediaDeformHitPath(mesh)).not.toBe(
      mediaDeformHitPath(createMediaDeformMesh(media())),
    );
  });

  it("preserves crop/scale source coordinates before visually flipping the viewport", () => {
    const mesh = createMediaDeformMesh(
      media({
        width: 120,
        height: 80,
        flipX: true,
        flipY: true,
        imageCrop: {
          baseWidth: 100,
          baseHeight: 100,
          left: 10,
          top: 20,
          right: 30,
          bottom: 40,
          scaleX: 2,
          scaleY: 2,
        },
      }),
    );
    expect(mesh.uv[0]).toBeCloseTo(0.1);
    expect(mesh.uv[1]).toBeCloseTo(0.8);
    expect(mesh.uv[mesh.uv.length - 2]).toBeCloseTo(0.7);
    expect(mesh.uv[mesh.uv.length - 1]).toBeCloseTo(0.4);
    expect(mesh.positions[0]).toBe(120);
    expect(mesh.positions[1]).toBe(80);
    expect(mesh.positions[mesh.positions.length - 3]).toBe(0);
    expect(mesh.positions[mesh.positions.length - 2]).toBe(0);
  });

  it("adds authored wave motion to the same shared pose", () => {
    const mesh = createMediaDeformMesh(media());
    const skeleton = pose();
    skeleton.points = skeleton.points.map((point) => ({
      x: point.x + 20,
      y: point.y,
    }));
    const wave = {
      interaction: createDefaultInteraction({
        effect: "wave-deform",
        waveAmplitude: 30,
        waveLength: 224,
        waveSpeed: 0.5,
        wavePointerX: 0,
        wavePointerY: 0,
      }),
      localPointer: { x: 56, y: 56 },
      normalizedPointer: { x: 0, y: 0 },
      seconds: 0,
      strength: 1,
      elementIndex: 0,
    };
    updateMediaDeformMesh(mesh, skeleton, wave);
    const center =
      ((mesh.rows / 2) * (mesh.columns + 1) + mesh.columns / 2) * 3;
    expect(mesh.positions[center]).toBe(76);
    expect(mesh.positions[center + 1]).toBeCloseTo(86);
    const originalPath = mediaDeformHitPath(mesh);
    updateMediaDeformMesh(mesh, skeleton, { ...wave, seconds: 1 });
    expect(mesh.positions[center + 1]).toBeCloseTo(26);
    expect(mediaDeformHitPath(mesh)).not.toBe(originalPath);
  });

  it("uses the actual deformed boundary for out-of-bounds pointer targeting", () => {
    const mesh = createMediaDeformMesh(media());
    const skeleton = pose();
    skeleton.points = skeleton.points.map((point) => ({
      ...point,
      x: point.x + 250,
    }));
    const bounds = updateMediaDeformMesh(mesh, skeleton);
    expect(bounds).toEqual({ left: 250, top: 0, width: 112, height: 112 });
    expect(mediaDeformHitPath(mesh)).toMatch(/^M250 0 /);
    expect(mesh.boundary.length).toBe((mesh.columns + mesh.rows) * 2);
    expect(new Set(mesh.boundary).size).toBe(mesh.boundary.length);
    updateMediaDeformMesh(mesh, null);
    expect(mesh.positions[0]).toBe(0);
  });

  it("ignores a malformed pose instead of uploading non-finite geometry", () => {
    const mesh = createMediaDeformMesh(media());
    const skeleton = pose();
    skeleton.points[1].x = NaN;
    updateMediaDeformMesh(mesh, skeleton);
    expect([...mesh.positions].every(Number.isFinite)).toBe(true);
  });
});
