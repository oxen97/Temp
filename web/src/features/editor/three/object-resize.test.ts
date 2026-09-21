import { describe, expect, it } from "vitest";

import {
  resizeObject3DFromScreen,
  resizeObject3DWithinSelection,
} from "@/features/editor/three/object-resize";
import {
  createDefaultScene3DSettings,
  createPrimitiveObject3D,
} from "@/features/editor/three/types";

const object = createPrimitiveObject3D({
  dimensions: { depth: 100, height: 100, width: 100 },
  id: "cube",
  name: "Cube",
  position: { x: 200, y: 250, z: 30 },
  primitive: "box",
});
const bounds = { x: 150, y: 200, width: 100, height: 100 };

describe("resizeObject3DFromScreen", () => {
  it("scales from the opposite corner and preserves depth", () => {
    const transform = resizeObject3DFromScreen({
      artboardHeight: 1080,
      deltaX: 50,
      deltaY: 30,
      handle: "se",
      initial: object,
      initialBounds: bounds,
      preserveRatio: false,
      scene: createDefaultScene3DSettings(),
    });
    expect(transform.scale).toEqual({ x: 1.5, y: 1.3, z: 1 });
    expect(transform.position).toEqual({ x: 225, y: 265, z: 30 });
  });

  it("keeps aspect ratio when requested", () => {
    const transform = resizeObject3DFromScreen({
      artboardHeight: 1080,
      deltaX: -20,
      deltaY: 50,
      handle: "sw",
      initial: object,
      initialBounds: bounds,
      preserveRatio: true,
      scene: createDefaultScene3DSettings(),
    });
    expect(transform.scale.x).toBeCloseTo(1.5);
    expect(transform.scale.y).toBeCloseTo(1.5);
    expect(transform.scale.z).toBeCloseTo(1.5);
    expect(transform.position).toEqual({ x: 175, y: 275, z: 30 });
  });
});

describe("resizeObject3DWithinSelection", () => {
  it("moves and scales a 3D member with the shared selection while preserving depth", () => {
    const transform = resizeObject3DWithinSelection({
      artboardHeight: 1080,
      initial: object,
      objectBounds: bounds,
      resizedSelectionBounds: { x: 100, y: 100, width: 400, height: 300 },
      scene: createDefaultScene3DSettings(),
      selectionBounds: { x: 100, y: 100, width: 200, height: 200 },
    });

    expect(transform.position).toEqual({ x: 300, y: 325, z: 30 });
    expect(transform.scale).toEqual({ x: 2, y: 1.5, z: 1 });
    expect(transform.rotation).toEqual(object.transform.rotation);
  });
});
