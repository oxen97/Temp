import { describe, expect, it } from "vitest";

import {
  orthographicCameraPlacement,
  orthographicOrbitPlacement,
} from "@/features/editor/three/camera-clearance";
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

describe("orthographicOrbitPlacement", () => {
  it("stands outside every object in any orbit direction", () => {
    const edge = createPrimitiveObject3D({
      dimensions: { depth: 200, height: 200, width: 200 },
      id: "edge",
      name: "Edge",
      position: { x: 1900, y: 540, z: 0 },
      primitive: "box",
    });
    const input = {
      artboardHeight: 1080,
      artboardWidth: 1920,
      objects: [sphere, edge],
      scene,
    };
    const front = orthographicCameraPlacement(input);
    const orbit = orthographicOrbitPlacement(input);
    // Turned 90° to the right the camera looks along X, where the edge box
    // sits 940 px from the target plus its bounding radius.
    const reach = 940 + Math.hypot(200, 200, 200) / 2;
    expect(front.distance).toBeLessThan(reach);
    expect(orbit.distance).toBeGreaterThan(reach);
    expect(orbit.far).toBeGreaterThan(orbit.distance + reach);
    expect(orbit.target.equals(front.target)).toBe(true);
    expect(orbit.position.x).toBeCloseTo(front.target.x);
    expect(orbit.position.y).toBeCloseTo(front.target.y);
  });
});
