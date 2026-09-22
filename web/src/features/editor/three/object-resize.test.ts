import { BoxGeometry, Group, Mesh, MeshBasicMaterial, OrthographicCamera } from "three";
import { describe, expect, it } from "vitest";

import {
  projectObjectToScreen,
  spatialTransformToWorld,
} from "@/features/editor/three/coordinate-system";
import {
  resizeObject3DFromScreen,
  resizeObject3DWithinSelection,
  resizeProjectedBoundsWithinSelection,
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
  it("scales from the opposite corner, including visible depth", () => {
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
    expect(transform.scale).toEqual({ x: 1.5, y: 1.3, z: 1.3 });
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

  it("keeps a rotated box shrinking smoothly instead of stopping at its fixed depth", () => {
    const rotated = createPrimitiveObject3D({
      dimensions: { depth: 150, height: 150, width: 150 },
      id: "rotated-cube",
      name: "Rotated cube",
      position: { x: 770, y: 540, z: 10 },
      primitive: "box",
    });
    rotated.transform.rotation = { x: 22, y: 34, z: 0 };
    const camera = new OrthographicCamera(-960, 960, 540, -540, 0.1, 100000);
    camera.position.set(960, -540, 1000);
    camera.lookAt(960, -540, 0);
    camera.updateProjectionMatrix();
    const group = new Group();
    group.add(new Mesh(new BoxGeometry(150, 150, 150), new MeshBasicMaterial()));
    const apply = (transform: typeof rotated.transform) => {
      const world = spatialTransformToWorld(transform);
      group.position.set(...world.position);
      group.rotation.set(...world.rotation);
      group.scale.set(...world.scale);
      group.updateMatrixWorld(true);
      return projectObjectToScreen(group, camera, 1920, 1080)!;
    };
    const initial = apply(rotated.transform);
    let previousWidth = initial.width;
    let previousHeight = initial.height;
    for (let ratio = 0.9; ratio >= 0.2; ratio -= 0.1) {
      const transform = resizeObject3DFromScreen({
        artboardHeight: 1080,
        deltaX: initial.width * (ratio - 1),
        deltaY: initial.height * (ratio - 1),
        handle: "se",
        initial: rotated,
        initialBounds: initial,
        preserveRatio: false,
        scene: createDefaultScene3DSettings(),
      });
      const actual = apply(transform);
      expect(actual.width).toBeLessThan(previousWidth);
      expect(actual.height).toBeLessThan(previousHeight);
      expect(Math.abs(actual.width - initial.width * ratio)).toBeLessThan(2);
      expect(Math.abs(actual.height - initial.height * ratio)).toBeLessThan(2);
      expect(Math.abs(actual.x - initial.x)).toBeLessThan(2);
      expect(Math.abs(actual.y - initial.y)).toBeLessThan(2);
      previousWidth = actual.width;
      previousHeight = actual.height;
    }
  });
});

describe("resizeObject3DWithinSelection", () => {
  it("moves and scales a 3D member with the shared selection", () => {
    const transform = resizeObject3DWithinSelection({
      artboardHeight: 1080,
      initial: object,
      objectBounds: bounds,
      resizedSelectionBounds: { x: 100, y: 100, width: 400, height: 300 },
      scene: createDefaultScene3DSettings(),
      selectionBounds: { x: 100, y: 100, width: 200, height: 200 },
    });

    expect(transform.position).toEqual({ x: 300, y: 325, z: 30 });
    expect(transform.scale).toEqual({ x: 2, y: 1.5, z: 1.5 });
    expect(transform.rotation).toEqual(object.transform.rotation);
  });

  it("scales projected object bounds with the combined frame", () => {
    expect(
      resizeProjectedBoundsWithinSelection(
        { x: 150, y: 200, width: 100, height: 80 },
        { x: 100, y: 100, width: 200, height: 200 },
        { x: 80, y: 90, width: 300, height: 100 },
      ),
    ).toEqual({ x: 155, y: 140, width: 150, height: 40 });
  });
});
