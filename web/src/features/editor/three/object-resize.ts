import { Euler, MathUtils, Vector3 } from "three";

import type { ElementRect, ResizeHandle } from "@/features/editor/lib/editor-types";
import { resizedBoundsFromCorner } from "@/features/editor/lib/element-transform";
import type {
  Object3DElement,
  Scene3DSettings,
  SpatialTransform3D,
} from "@/features/editor/three/types";

function projectedHalfExtents(
  object: Object3DElement,
  scale: SpatialTransform3D["scale"],
) {
  const { x, y, z } = object.transform.rotation;
  const rotation = new Euler(
    MathUtils.degToRad(x),
    MathUtils.degToRad(y),
    MathUtils.degToRad(z),
  );
  const axes = [
    new Vector3(1, 0, 0).applyEuler(rotation),
    new Vector3(0, 1, 0).applyEuler(rotation),
    new Vector3(0, 0, 1).applyEuler(rotation),
  ];
  const radii = [
    (object.dimensions.width * Math.abs(scale.x)) / 2,
    (object.dimensions.height * Math.abs(scale.y)) / 2,
    (object.dimensions.depth * Math.abs(scale.z)) / 2,
  ];
  const sphere =
    object.source.kind === "primitive" && object.source.primitive === "sphere";
  const extent = (screenAxis: "x" | "y") =>
    sphere
      ? Math.hypot(
          ...axes.map((axis, index) => axis[screenAxis] * radii[index]),
        )
      : axes.reduce(
          (sum, axis, index) =>
            sum + Math.abs(axis[screenAxis]) * radii[index],
          0,
        );
  return { x: extent("x"), y: extent("y") };
}

function fitUnlockedScaleToProjectedBounds(
  object: Object3DElement,
  initialBounds: ElementRect,
  nextBounds: ElementRect,
  initialScale: SpatialTransform3D["scale"],
  depthRatio: number,
) {
  const initialHalf = projectedHalfExtents(object, initialScale);
  const target = {
    x: initialHalf.x + (nextBounds.width - initialBounds.width) / 2,
    y: initialHalf.y + (nextBounds.height - initialBounds.height) / 2,
  };
  const next = {
    ...initialScale,
    x: initialScale.x * (nextBounds.width / Math.max(1, initialBounds.width)),
    y: initialScale.y * (nextBounds.height / Math.max(1, initialBounds.height)),
    z: initialScale.z * depthRatio,
  };
  const signX = Math.sign(initialScale.x) || 1;
  const signY = Math.sign(initialScale.y) || 1;

  // Rotation mixes width, height and fixed depth in the projected frame.
  // Solve the two screen-space extents so the dragged corner tracks the cursor.
  for (let iteration = 0; iteration < 5; iteration += 1) {
    const current = projectedHalfExtents(object, next);
    const errorX = current.x - target.x;
    const errorY = current.y - target.y;
    if (Math.hypot(errorX, errorY) < 0.01) break;
    const epsilonX = Math.max(0.0001, Math.abs(next.x) * 0.001);
    const epsilonY = Math.max(0.0001, Math.abs(next.y) * 0.001);
    const shiftedX = projectedHalfExtents(object, {
      ...next,
      x: next.x + signX * epsilonX,
    });
    const shiftedY = projectedHalfExtents(object, {
      ...next,
      y: next.y + signY * epsilonY,
    });
    const xx = (shiftedX.x - current.x) / epsilonX;
    const yx = (shiftedX.y - current.y) / epsilonX;
    const xy = (shiftedY.x - current.x) / epsilonY;
    const yy = (shiftedY.y - current.y) / epsilonY;
    const determinant = xx * yy - xy * yx;
    if (Math.abs(determinant) < 0.00001) break;
    const correctionX = (errorX * yy - errorY * xy) / determinant;
    const correctionY = (errorY * xx - errorX * yx) / determinant;
    next.x = signX * Math.max(0.001, Math.abs(next.x) - correctionX);
    next.y = signY * Math.max(0.001, Math.abs(next.y) - correctionY);
  }
  return next;
}

/** Resize a 3D object by its projected 2D frame. */
export function resizeObject3DFromScreen({
  artboardHeight,
  deltaX,
  deltaY,
  handle,
  initial,
  initialBounds,
  preserveRatio,
  scene,
}: {
  artboardHeight: number;
  deltaX: number;
  deltaY: number;
  handle: ResizeHandle;
  initial: Object3DElement;
  initialBounds: ElementRect;
  preserveRatio: boolean;
  scene: Scene3DSettings;
}): SpatialTransform3D {
  const bounds = resizedBoundsFromCorner(
    initialBounds,
    handle,
    deltaX,
    deltaY,
    preserveRatio,
  );
  const scaleX = bounds.width / Math.max(1, initialBounds.width);
  const scaleY = bounds.height / Math.max(1, initialBounds.height);
  // A rotated model exposes part of its depth on screen. Keeping Z fixed
  // leaves an irreducible projected width/height, so the mesh appears to stop
  // shrinking while the pointer and selection box keep moving. Shrink depth
  // with the smaller screen ratio (and scale it uniformly with locked ratio).
  const depthRatio = preserveRatio ? scaleX : Math.min(scaleX, scaleY);
  const scale = {
    x: initial.transform.scale.x * scaleX,
    y: initial.transform.scale.y * scaleY,
    z: initial.transform.scale.z * depthRatio,
  };
  const frontOrthographic =
    scene.projection === "orthographic" &&
    Math.abs(scene.cameraPosition.x - scene.cameraTarget.x) < 0.0001 &&
    Math.abs(scene.cameraPosition.y - scene.cameraTarget.y) < 0.0001;
  if (frontOrthographic && !preserveRatio) {
    Object.assign(
      scale,
      fitUnlockedScaleToProjectedBounds(
        initial,
        initialBounds,
        bounds,
        initial.transform.scale,
        depthRatio,
      ),
    );
  }
  const initialHalf = frontOrthographic
    ? projectedHalfExtents(initial, initial.transform.scale)
    : null;
  const resizedHalf = frontOrthographic
    ? projectedHalfExtents(initial, scale)
    : null;
  const perspectiveDistance =
    artboardHeight /
    (2 * Math.tan((Math.max(1, scene.perspective) * Math.PI) / 360));
  const cameraDistance =
    perspectiveDistance * Math.max(0.05, scene.cameraPosition.z / 1000);
  const worldPerScreenPixel =
    scene.projection === "perspective"
      ? Math.max(0.01, cameraDistance - initial.transform.position.z) /
        perspectiveDistance
      : 1;
  const initialCenterX = initialBounds.x + initialBounds.width / 2;
  const initialCenterY = initialBounds.y + initialBounds.height / 2;
  const nextCenterX = bounds.x + bounds.width / 2;
  const nextCenterY = bounds.y + bounds.height / 2;

  return {
    ...initial.transform,
    position: {
      ...initial.transform.position,
      x:
        initial.transform.position.x +
        (initialHalf && resizedHalf
          ? (handle.includes("w") ? -1 : 1) *
            (resizedHalf.x - initialHalf.x)
          : (nextCenterX - initialCenterX) * worldPerScreenPixel),
      y:
        initial.transform.position.y +
        (initialHalf && resizedHalf
          ? (handle.includes("n") ? -1 : 1) *
            (resizedHalf.y - initialHalf.y)
          : (nextCenterY - initialCenterY) * worldPerScreenPixel),
    },
    scale,
  };
}

/** Apply a shared 2D selection resize to one member of a 2D/3D selection. */
export function resizeProjectedBoundsWithinSelection(
  objectBounds: ElementRect,
  selectionBounds: ElementRect,
  resizedSelectionBounds: ElementRect,
): ElementRect {
  const scaleX =
    resizedSelectionBounds.width / Math.max(1, selectionBounds.width);
  const scaleY =
    resizedSelectionBounds.height / Math.max(1, selectionBounds.height);
  return {
    x: resizedSelectionBounds.x + (objectBounds.x - selectionBounds.x) * scaleX,
    y: resizedSelectionBounds.y + (objectBounds.y - selectionBounds.y) * scaleY,
    width: objectBounds.width * scaleX,
    height: objectBounds.height * scaleY,
  };
}

export function resizeObject3DWithinSelection({
  artboardHeight,
  initial,
  objectBounds,
  resizedSelectionBounds,
  scene,
  selectionBounds,
}: {
  artboardHeight: number;
  initial: Object3DElement;
  objectBounds: ElementRect;
  resizedSelectionBounds: ElementRect;
  scene: Scene3DSettings;
  selectionBounds: ElementRect;
}): SpatialTransform3D {
  const scaleX =
    resizedSelectionBounds.width / Math.max(1, selectionBounds.width);
  const scaleY =
    resizedSelectionBounds.height / Math.max(1, selectionBounds.height);
  const oldCenterX = objectBounds.x + objectBounds.width / 2;
  const oldCenterY = objectBounds.y + objectBounds.height / 2;
  const resizedObjectBounds = resizeProjectedBoundsWithinSelection(
    objectBounds,
    selectionBounds,
    resizedSelectionBounds,
  );
  const newCenterX = resizedObjectBounds.x + resizedObjectBounds.width / 2;
  const newCenterY = resizedObjectBounds.y + resizedObjectBounds.height / 2;
  const perspectiveDistance =
    artboardHeight /
    (2 * Math.tan((Math.max(1, scene.perspective) * Math.PI) / 360));
  const cameraDistance =
    perspectiveDistance * Math.max(0.05, scene.cameraPosition.z / 1000);
  const worldPerScreenPixel =
    scene.projection === "perspective"
      ? Math.max(0.01, cameraDistance - initial.transform.position.z) /
        perspectiveDistance
      : 1;

  return {
    ...initial.transform,
    position: {
      ...initial.transform.position,
      x:
        initial.transform.position.x +
        (newCenterX - oldCenterX) * worldPerScreenPixel,
      y:
        initial.transform.position.y +
        (newCenterY - oldCenterY) * worldPerScreenPixel,
    },
    scale: {
      ...initial.transform.scale,
      x: initial.transform.scale.x * scaleX,
      y: initial.transform.scale.y * scaleY,
      z: initial.transform.scale.z * Math.min(scaleX, scaleY),
    },
  };
}
