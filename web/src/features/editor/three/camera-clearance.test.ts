import { describe, expect, it } from "vitest";

import { orthographicCameraPlacement } from "@/features/editor/three/camera-clearance";
import {
  createDefaultScene3DSettings,
  createPrimitiveObject3D,
} from "@/features/editor/three/types";

const scene = createDefaultScene3DSettings();
const sphere = createPrimitiveObject3D({
  dimensions: { depth: 150, height: 150, width: 150 },
  id: "sphere",
  name: "Sphere",
  position: { x: 960, y: 540, z: 25 },
  primitive: "sphere",
});

describe("orthographicCameraPlacement", () => {
  it("keeps the default camera distance for an ordinary model", () => {
    const placement = orthographicCameraPlacement({
      artboardHeight: 1080,
      artboardWidth: 1920,
      objects: [sphere],
      scene,
    });
    expect(placement.distance).toBe(1000);
  });

  it("moves behind a large sphere before its front surface reaches the near plane", () => {
    const enlarged = {
      ...sphere,
      transform: {
        ...sphere.transform,
        scale: { x: 2150 / 150, y: 2150 / 150, z: 2150 / 150 },
      },
    };
    const placement = orthographicCameraPlacement({
      artboardHeight: 1080,
      artboardWidth: 1920,
      objects: [enlarged],
      scene,
    });
    expect(placement.distance).toBeGreaterThan(2100 / 2);
    expect(placement.position.z).toBeGreaterThan(2150 / 2 + 25);
    expect(placement.far).toBeGreaterThan(placement.distance);
  });

  it("uses the live pose during a drag before it is committed to the store", () => {
    const placement = orthographicCameraPlacement({
      artboardHeight: 1080,
      artboardWidth: 1920,
      objects: [sphere],
      override: {
        objectId: sphere.id,
        pose: {
          position: [960, -540, 25],
          scale: [14, 14, 14],
        },
      },
      scene,
    });
    expect(placement.distance).toBeGreaterThan(1000);
  });
});
