import { Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { createGeometry3D } from "@/features/editor/three/geometry-factory";
import {
  createDefaultMaterial3DSettings,
  createDefaultSpatialTransform3D,
  createPrimitiveObject3D,
  type Object3DElement,
  type VectorGeometry3DParameters,
  type VectorShapeSnapshot,
} from "@/features/editor/three/types";

function geometrySize(object: Object3DElement) {
  const geometry = createGeometry3D(object);
  const result = geometry.boundingBox!.getSize(new Vector3());
  geometry.dispose();
  return result;
}

function vectorObject(
  parameters: VectorGeometry3DParameters,
  snapshot: VectorShapeSnapshot,
  dimensions = { depth: 24, height: 90, width: 180 },
): Object3DElement {
  return {
    castShadow: true,
    compositeLayer: "behind-2d",
    dimensions,
    id: `vector-${parameters.mode}`,
    locked: false,
    material: createDefaultMaterial3DSettings(),
    name: "Vector 3D",
    receiveShadow: true,
    source: { kind: "vector", parameters, snapshot },
    transform: createDefaultSpatialTransform3D(),
    type: "object3d",
    visible: true,
  };
}

const rectangleSnapshot: VectorShapeSnapshot = {
  height: 60,
  paths: [
    {
      closed: true,
      points: [
        { x: 0, y: 0 },
        { x: 120, y: 0 },
        { x: 120, y: 60 },
        { x: 0, y: 60 },
      ],
    },
  ],
  shapeGroups: [[0]],
  width: 120,
};

describe("createGeometry3D", () => {
  it.each(["box", "sphere", "cylinder", "cone", "torus"] as const)(
    "fits a %s primitive to the authored dimensions",
    (primitive) => {
      const object = createPrimitiveObject3D({
        dimensions: { depth: 40, height: 80, width: 120 },
        id: primitive,
        name: primitive,
        position: { x: 0, y: 0, z: 0 },
        primitive,
      });

      const size = geometrySize(object);

      expect(size.x).toBeCloseTo(120, 3);
      expect(size.y).toBeCloseTo(80, 3);
      expect(size.z).toBeCloseTo(40, 3);
    },
  );

  it("creates a centered plane from a closed vector snapshot", () => {
    const object = vectorObject(
      { curveSegments: 8, mode: "plane" },
      rectangleSnapshot,
    );
    const geometry = createGeometry3D(object);
    const bounds = geometry.boundingBox!;
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());

    expect(size.x).toBeCloseTo(180, 5);
    expect(size.y).toBeCloseTo(90, 5);
    expect(size.z).toBe(0);
    expect(center.x).toBeCloseTo(0, 5);
    expect(center.y).toBeCloseTo(0, 5);
    geometry.dispose();
  });

  it("extrudes a vector snapshot to the requested three-dimensional bounds", () => {
    const object = vectorObject(
      {
        bevelEnabled: false,
        bevelSegments: 1,
        bevelSize: 0,
        bevelThickness: 0,
        curveSegments: 8,
        mode: "extrude",
        steps: 1,
      },
      rectangleSnapshot,
    );

    const size = geometrySize(object);

    expect(size.x).toBeCloseTo(180, 5);
    expect(size.y).toBeCloseTo(90, 5);
    expect(size.z).toBeCloseTo(24, 5);
  });

  it("revolves an open profile and fits the resulting mesh", () => {
    const profile: VectorShapeSnapshot = {
      height: 100,
      paths: [
        {
          closed: false,
          points: [
            { x: 1, y: 100 },
            { x: 35, y: 80 },
            { x: 45, y: 20 },
            { x: 1, y: 0 },
          ],
        },
      ],
      shapeGroups: [],
      width: 50,
    };
    const object = vectorObject(
      {
        angleDegrees: 360,
        curveSegments: 8,
        mode: "revolve",
        segments: 32,
      },
      profile,
      { depth: 100, height: 160, width: 100 },
    );

    const size = geometrySize(object);

    expect(size.x).toBeCloseTo(100, 4);
    expect(size.y).toBeCloseTo(160, 4);
    expect(size.z).toBeCloseTo(100, 4);
  });

  it("creates a rounded inflate approximation within the requested bounds", () => {
    const inflate = vectorObject(
      { amount: 0.5, mode: "inflate" },
      rectangleSnapshot,
    );

    const size = geometrySize(inflate);

    expect(size.x).toBeCloseTo(180, 4);
    expect(size.y).toBeCloseTo(90, 4);
    expect(size.z).toBeCloseTo(24, 4);
  });

  it("rejects invalid dimensions and asset sources", () => {
    const invalid = createPrimitiveObject3D({
      dimensions: { depth: 10, height: 10, width: 0 },
      id: "invalid",
      name: "Invalid",
      position: { x: 0, y: 0, z: 0 },
      primitive: "box",
    });
    expect(() => createGeometry3D(invalid)).toThrow(/finite and positive/);

    const asset: Object3DElement = {
      ...createPrimitiveObject3D({
        dimensions: { depth: 10, height: 10, width: 10 },
        id: "asset",
        name: "Asset",
        position: { x: 0, y: 0, z: 0 },
        primitive: "box",
      }),
      source: { assetId: "model-1", kind: "asset" },
    };
    expect(() => createGeometry3D(asset)).toThrow(/GLTFLoader/);
  });
});
