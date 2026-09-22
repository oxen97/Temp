import {
  Box3,
  BoxGeometry,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  Vector3,
} from "three";
import { describe, expect, it } from "vitest";

import {
  editorPointToWorld,
  projectObjectToScreen,
  projectEditorMoveToScreen,
  projectWorldBoxToScreen,
  rotationDegreesToRadians,
  screenPointToNdc,
  screenOffsetToEditorMove,
  spatialTransformToWorld,
  worldPointToEditor,
} from "@/features/editor/three/coordinate-system";
import { createDefaultSpatialTransform3D } from "@/features/editor/three/types";

function createCamera() {
  const camera = new OrthographicCamera(-100, 100, 50, -50, 0.1, 1000);
  camera.position.set(0, 0, 100);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

describe("3D editor coordinate conversion", () => {
  it("maps screen-down editor Y to world-up Y and round-trips points", () => {
    const editorPoint = { x: 12, y: 34, z: -8 };
    const worldPoint = editorPointToWorld(editorPoint);

    expect(worldPoint.toArray()).toEqual([12, -34, -8]);
    expect(worldPointToEditor(worldPoint)).toEqual(editorPoint);
  });

  it("converts authored rotation degrees and spatial transforms for Three.js", () => {
    expect(rotationDegreesToRadians({ x: 180, y: 90, z: -45 })).toEqual([
      Math.PI,
      Math.PI / 2,
      -Math.PI / 4,
    ]);

    const transform = createDefaultSpatialTransform3D({ x: 20, y: 30, z: 4 });
    transform.rotation = { x: 0, y: 90, z: 180 };
    transform.scale = { x: 2, y: 3, z: 4 };

    expect(spatialTransformToWorld(transform)).toEqual({
      position: [20, -30, 4],
      rotation: [0, Math.PI / 2, Math.PI],
      scale: [2, 3, 4],
    });
  });

  it("normalizes client coordinates into WebGL NDC", () => {
    const bounds = { height: 100, left: 10, top: 20, width: 200 };

    expect(screenPointToNdc(10, 20, bounds)).toEqual({ x: -1, y: 1 });
    expect(screenPointToNdc(110, 70, bounds)).toEqual({ x: 0, y: 0 });
    expect(screenPointToNdc(210, 120, bounds)).toEqual({ x: 1, y: -1 });
  });

  it("round-trips screen snap offsets into editor XY movement at 3D depth", () => {
    for (const camera of [
      createCamera(),
      new PerspectiveCamera(50, 2, 0.1, 2000),
    ]) {
      if (camera instanceof PerspectiveCamera) {
        camera.position.set(30, -10, 300);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
      }
      const anchor = { x: 18, y: 26, z: 12 };
      const pixelDelta = { x: 15, y: -9 };
      const editorDelta = screenOffsetToEditorMove(
        anchor,
        pixelDelta,
        camera,
        800,
        400,
      );
      expect(editorDelta).not.toBeNull();
      const projected = projectEditorMoveToScreen(
        anchor,
        {
          x: anchor.x + editorDelta!.x,
          y: anchor.y + editorDelta!.y,
          z: anchor.z,
        },
        camera,
        800,
        400,
      );
      expect(projected.x).toBeCloseTo(pixelDelta.x, 5);
      expect(projected.y).toBeCloseTo(pixelDelta.y, 5);
    }
  });

  it("projects world boxes and objects into artboard pixel bounds", () => {
    const camera = createCamera();
    const box = new Box3(new Vector3(-50, -25, 0), new Vector3(50, 25, 0));

    expect(projectWorldBoxToScreen(box, camera, 800, 400)).toEqual({
      height: 200,
      width: 400,
      x: 200,
      y: 100,
    });

    const object = new Mesh(new BoxGeometry(20, 10, 4));
    object.position.set(25, -10, 0);
    const projected = projectObjectToScreen(object, camera, 800, 400);

    expect(projected?.x).toBeCloseTo(460, 5);
    expect(projected?.y).toBeCloseTo(220, 5);
    expect(projected?.width).toBeCloseTo(80, 5);
    expect(projected?.height).toBeCloseTo(40, 5);
    object.geometry.dispose();
  });

  it("projects through the camera's current pose before the next render", () => {
    const camera = createCamera();
    camera.position.set(40, -20, 100);
    camera.lookAt(40, -20, 0);
    // No explicit updateMatrixWorld: the editor's bounds reporter executes
    // before Three's renderer refreshes the camera on this frame.
    const box = new Box3(new Vector3(30, -25, 0), new Vector3(50, -15, 0));

    const projected = projectWorldBoxToScreen(box, camera, 800, 400);
    expect(projected?.x).toBeCloseTo(360, 5);
    expect(projected?.y).toBeCloseTo(180, 5);
    expect(projected?.width).toBeCloseTo(80, 5);
    expect(projected?.height).toBeCloseTo(40, 5);
  });

  it("does not project an empty world box", () => {
    expect(projectWorldBoxToScreen(new Box3(), createCamera(), 800, 400)).toBe(
      null,
    );
  });
});
