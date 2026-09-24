import { describe, expect, it } from "vitest";

import type { CanvasElement } from "../store/editor-store";
import { IDENTITY_VISUAL } from "./interaction-runtime";
import { createMediaDeformMesh, updateMediaDeformMesh } from "./media-deform";
import {
  buildMediaLiquidBridge,
  closestMediaLiquidContact,
  mediaLiquidSurface,
  MEDIA_LIQUID_BOUNDARY_SAMPLES,
  MEDIA_LIQUID_COLUMNS,
  MEDIA_LIQUID_ROWS,
} from "./media-deform-bridge";
import type { StrandPose } from "./strand-bone-runtime";

function element(overrides: Partial<CanvasElement> = {}): CanvasElement {
  return {
    id: "surface",
    name: "Surface",
    type: "rectangle",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 100,
    fill: "#35a7cb",
    stroke: "none",
    strokeWidth: 0,
    cornerRadius: 0,
    visible: true,
    locked: false,
    ...overrides,
  };
}

function rectangle(x = 0, y = 0, width = 100, height = 100) {
  return mediaLiquidSurface(element({ x, y, width, height }), IDENTITY_VISUAL)!;
}

describe("textured media liquid bridge geometry", () => {
  it("requires a decoded media source and preserves source UVs through cropping and flips", () => {
    const image = element({
      type: "image",
      x: 10,
      y: 20,
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
    });
    expect(mediaLiquidSurface(image, IDENTITY_VISUAL)).toBeNull();
    const source = document.createElement("img");
    const mesh = createMediaDeformMesh(image);
    const originalPositions = [...mesh.positions];
    const originalUVs = [...mesh.uv];
    const surface = mediaLiquidSurface(image, IDENTITY_VISUAL, {
      mesh,
      source,
    })!;
    expect(surface.source).toBe(source);
    expect(surface.boundary[0]).toMatchObject({ x: 130, y: 100 });
    expect(surface.boundary[0].u).toBeCloseTo(0.1);
    expect(surface.boundary[0].v).toBeCloseTo(0.8);
    expect(surface.bounds).toEqual({
      left: 10,
      top: 20,
      width: 120,
      height: 80,
    });
    expect([...mesh.positions]).toEqual(originalPositions);
    expect([...mesh.uv]).toEqual(originalUVs);
    const bridge = buildMediaLiquidBridge(
      surface,
      rectangle(180, 20, 100, 80),
      30,
      0.6,
    )!;
    for (let index = 0; index < bridge.uvA.length; index += 2) {
      expect(bridge.uvA[index]).toBeGreaterThanOrEqual(0.1 - 1e-6);
      expect(bridge.uvA[index]).toBeLessThanOrEqual(0.7 + 1e-6);
      expect(bridge.uvA[index + 1]).toBeGreaterThanOrEqual(0.4 - 1e-6);
      expect(bridge.uvA[index + 1]).toBeLessThanOrEqual(0.8 + 1e-6);
    }
  });

  it("finds opposing edge interiors and favors the middle of parallel faces", () => {
    const contact = closestMediaLiquidContact(rectangle(), rectangle(140));
    expect(contact.distance).toBeCloseTo(40);
    expect(contact.a).toMatchObject({ x: 100, y: 50 });
    expect(contact.b).toMatchObject({ x: 140, y: 50 });
    const shifted = closestMediaLiquidContact(
      rectangle(),
      rectangle(140, 35, 100, 20),
    );
    expect(shifted.distance).toBeCloseTo(40);
    expect(shifted.a.x).toBeCloseTo(100);
    expect(shifted.b.x).toBeCloseTo(140);
    expect(shifted.a.y).toBeCloseTo(shifted.b.y);
    expect(shifted.a.y).toBeGreaterThanOrEqual(35);
    expect(shifted.a.y).toBeLessThanOrEqual(55);
  });

  it("follows rounded media corners through cropped flips and live mesh deformation", () => {
    const image = element({
      type: "image",
      x: 10,
      y: 20,
      width: 120,
      height: 80,
      cornerRadius: 20,
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
    });
    const mesh = createMediaDeformMesh(image);
    const source = document.createElement("img");
    const before = mediaLiquidSurface(image, IDENTITY_VISUAL, {
      mesh,
      source,
    })!;
    for (const corner of [
      { x: 10, y: 20 },
      { x: 130, y: 20 },
      { x: 130, y: 100 },
      { x: 10, y: 100 },
    ]) {
      expect(
        before.boundary.some(
          (point) => Math.hypot(point.x - corner.x, point.y - corner.y) < 1e-5,
        ),
      ).toBe(false);
    }
    const cornerInset = 20 * (1 - Math.SQRT1_2);
    expect(before.boundary[3].x).toBeCloseTo(130 - cornerInset);
    expect(before.boundary[3].y).toBeCloseTo(100 - cornerInset);
    expect(before.boundary[3].u).toBeCloseTo(0.1 + (0.6 * cornerInset) / 120);
    expect(before.boundary[3].v).toBeCloseTo(0.8 - (0.4 * cornerInset) / 80);
    const rest = [
      { x: 60, y: 0 },
      { x: 60, y: 40 },
      { x: 60, y: 80 },
    ];
    updateMediaDeformMesh(mesh, {
      rest,
      points: rest.map((point) => ({ x: point.x + 25, y: point.y + 10 })),
      velocities: rest.map(() => ({ x: 0, y: 0 })),
      anchorIndex: 0,
    });
    const after = mediaLiquidSurface(image, IDENTITY_VISUAL, { mesh, source })!;
    // Authored pose translation is mirrored with the media mesh, exactly once.
    expect(after.boundary[3].x).toBeCloseTo(before.boundary[3].x - 25);
    expect(after.boundary[3].y).toBeCloseTo(before.boundary[3].y - 10);
    expect(after.boundary[3].u).toBeCloseTo(before.boundary[3].u);
    expect(after.boundary[3].v).toBeCloseTo(before.boundary[3].v);
    expect(after.source).toBe(source);
  });

  it("takes bridge endpoints from the live deformed mesh while preserving its texture coordinates", () => {
    const image = element({ type: "video" });
    const mesh = createMediaDeformMesh(image);
    const source = document.createElement("video");
    const before = mediaLiquidSurface(image, IDENTITY_VISUAL, {
      mesh,
      source,
    })!;
    const rest = [
      { x: 50, y: 0 },
      { x: 50, y: 50 },
      { x: 50, y: 100 },
    ];
    const pose: StrandPose = {
      rest,
      points: rest.map((point) => ({ x: point.x + 25, y: point.y + 10 })),
      velocities: rest.map(() => ({ x: 0, y: 0 })),
      anchorIndex: 0,
    };
    updateMediaDeformMesh(mesh, pose);
    const after = mediaLiquidSurface(image, IDENTITY_VISUAL, { mesh, source })!;
    expect(after.bounds).toEqual({
      left: 25,
      top: 10,
      width: 100,
      height: 100,
    });
    expect(after.boundary.map(({ u, v }) => ({ u, v }))).toEqual(
      before.boundary.map(({ u, v }) => ({ u, v })),
    );
    expect(
      closestMediaLiquidContact(after, rectangle(150, 10)).distance,
    ).toBeCloseTo(25);
    expect(after.source).toBe(source);
  });

  it("applies object transforms once and retains each source color and effective opacity", () => {
    const source = document.createElement("img");
    const image = element({
      type: "image",
      x: 10,
      y: 20,
      width: 120,
      height: 80,
      flipX: true,
      flipY: true,
      opacity: 35,
    });
    const surface = mediaLiquidSurface(
      image,
      {
        ...IDENTITY_VISUAL,
        tx: 5,
        ty: -7,
        rotate: 90,
        scaleX: 2,
        scaleY: 3,
        opacity: 0.6,
      },
      { source, mesh: createMediaDeformMesh(image) },
    )!;
    expect(surface.boundary[0].x).toBeCloseTo(-45);
    expect(surface.boundary[0].y).toBeCloseTo(173);
    expect(surface.opacity).toBe(0.6);
    const vector = mediaLiquidSurface(
      element({ fill: "#ff00aa", fillOpacity: 40, opacity: 50 }),
      IDENTITY_VISUAL,
    )!;
    expect(vector.source).toBeNull();
    expect(vector.color).toBe("#ff00aa");
    expect(vector.opacity).toBeCloseTo(0.2);
    const overridden = mediaLiquidSurface(element({ fillOpacity: 40 }), {
      ...IDENTITY_VISUAL,
      opacity: 0.7,
    })!;
    expect(overridden.opacity).toBeCloseTo(0.28);
  });

  it("bounds boundary work and triangle allocation regardless of source size or bridge width", () => {
    const image = element({ type: "image", width: 100_000, height: 80_000 });
    const a = mediaLiquidSurface(image, IDENTITY_VISUAL, {
      mesh: createMediaDeformMesh(image),
      source: document.createElement("img"),
    })!;
    expect(a.boundary.length).toBeLessThanOrEqual(
      MEDIA_LIQUID_BOUNDARY_SAMPLES,
    );
    const bridge = buildMediaLiquidBridge(
      a,
      rectangle(100_500, 40_000),
      1_000_000,
      900,
    )!;
    const vertices = (MEDIA_LIQUID_COLUMNS + 1) * (MEDIA_LIQUID_ROWS + 1);
    expect(bridge.positions).toHaveLength(vertices * 3);
    expect(bridge.uvA).toHaveLength(vertices * 2);
    expect(bridge.uvB).toHaveLength(vertices * 2);
    expect(bridge.blend).toHaveLength(vertices * 2);
    expect(bridge.indices).toHaveLength(
      MEDIA_LIQUID_COLUMNS * MEDIA_LIQUID_ROWS * 6,
    );
    expect(Math.max(...bridge.indices)).toBeLessThan(vertices);
    expect(
      [
        ...bridge.positions,
        ...bridge.uvA,
        ...bridge.uvB,
        ...bridge.blend,
      ].every(Number.isFinite),
    ).toBe(true);
  });

  it("keeps bridge ends on their own material and narrows only the gap as smoothing increases", () => {
    const a = rectangle();
    const b = rectangle(140);
    const broad = buildMediaLiquidBridge(a, b, 40, 0)!;
    const narrow = buildMediaLiquidBridge(a, b, 40, 1)!;
    const centerRow = MEDIA_LIQUID_ROWS / 2;
    const start = centerRow * (MEDIA_LIQUID_COLUMNS + 1);
    const end = start + MEDIA_LIQUID_COLUMNS;
    expect([...broad.positions.slice(start * 3, start * 3 + 2)]).toEqual([
      100, 50,
    ]);
    expect([...broad.positions.slice(end * 3, end * 3 + 2)]).toEqual([140, 50]);
    expect(broad.blend[start * 2]).toBe(0);
    expect(broad.blend[end * 2]).toBe(1);
    const middleTopY = (MEDIA_LIQUID_COLUMNS / 2) * 3 + 1;
    expect(Math.abs(narrow.positions[middleTopY] - 50)).toBeLessThan(
      Math.abs(broad.positions[middleTopY] - 50),
    );
  });

  it("does not paint a connector when boundaries overlap or width is zero", () => {
    expect(
      buildMediaLiquidBridge(rectangle(), rectangle(80, 20), 40, 0.5),
    ).toBeNull();
    expect(
      buildMediaLiquidBridge(rectangle(), rectangle(140), 0, 0.5),
    ).toBeNull();
    expect(
      buildMediaLiquidBridge(rectangle(), rectangle(140), -10, 0.5),
    ).toBeNull();
  });

  it("does not paint a connector for an object fully contained in the other", () => {
    expect(
      buildMediaLiquidBridge(rectangle(), rectangle(25, 25, 50, 50), 20, 0.5),
    ).toBeNull();
  });
});
