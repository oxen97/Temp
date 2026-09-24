import { Box3, type Camera, MathUtils, type Object3D, Vector3 } from "three";

import type {
  SpatialTransform3D,
  Vector3Value,
} from "@/features/editor/three/types";

export type ProjectedBounds = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export function editorPointToWorld(point: Vector3Value): Vector3 {
  return new Vector3(point.x, -point.y, point.z);
}

export function worldPointToEditor(point: Vector3): Vector3Value {
  return { x: point.x, y: -point.y, z: point.z };
}

export function rotationDegreesToRadians(rotation: Vector3Value) {
  return [
    MathUtils.degToRad(rotation.x),
    MathUtils.degToRad(rotation.y),
    MathUtils.degToRad(rotation.z),
  ] as const;
}

export function spatialTransformToWorld(transform: SpatialTransform3D) {
  const position = editorPointToWorld(transform.position);
  return {
    position: [position.x, position.y, position.z] as const,
    rotation: rotationDegreesToRadians(transform.rotation),
    scale: [transform.scale.x, transform.scale.y, transform.scale.z] as const,
  };
}

export function screenPointToNdc(
  clientX: number,
  clientY: number,
  bounds: Pick<DOMRect, "height" | "left" | "top" | "width">,
) {
  return {
    x: ((clientX - bounds.left) / Math.max(1, bounds.width)) * 2 - 1,
    y: -((clientY - bounds.top) / Math.max(1, bounds.height)) * 2 + 1,
  };
}

/** Projects a world hit to authored artboard pixels, including viewport offsets. */
export function worldPointToArtboard(
  point: Vector3,
  camera: Camera,
  viewport: ProjectedBounds,
): { x: number; y: number } | null {
  camera.updateWorldMatrix(true, false);
  const projected = point.clone().project(camera);
  if (![projected.x, projected.y, projected.z].every(Number.isFinite))
    return null;
  return {
    x: viewport.x + ((projected.x + 1) * viewport.width) / 2,
    y: viewport.y + ((1 - projected.y) * viewport.height) / 2,
  };
}

/**
 * Places an artboard pixel at the spawned object's own Z depth. The result is
 * authoring coordinates (Y-down), not the source hit's world XY coordinates.
 */
export function artboardPointToEditorAtDepth(
  point: { x: number; y: number },
  depth: number,
  camera: Camera,
  viewport: ProjectedBounds,
): { x: number; y: number } | null {
  if (![point.x, point.y, depth].every(Number.isFinite)) return null;
  camera.updateWorldMatrix(true, false);
  const x = ((point.x - viewport.x) / Math.max(1, viewport.width)) * 2 - 1;
  const y = 1 - ((point.y - viewport.y) / Math.max(1, viewport.height)) * 2;
  const near = new Vector3(x, y, -1).unproject(camera);
  const direction = new Vector3(x, y, 1).unproject(camera).sub(near);
  if (Math.abs(direction.z) < 1e-8) return null;
  const world = near.addScaledVector(direction, (depth - near.z) / direction.z);
  return Number.isFinite(world.x) && Number.isFinite(world.y)
    ? { x: world.x, y: -world.y }
    : null;
}

/** Screen-space movement of an authored point at its actual 3D depth. */
export function projectEditorMoveToScreen(
  from: Vector3Value,
  to: Vector3Value,
  camera: Camera,
  viewportWidth: number,
  viewportHeight: number,
) {
  camera.updateWorldMatrix(true, false);
  const start = editorPointToWorld(from).project(camera);
  const end = editorPointToWorld(to).project(camera);
  return {
    x: ((end.x - start.x) * viewportWidth) / 2,
    y: ((start.y - end.y) * viewportHeight) / 2,
  };
}

/** Convert a pixel snap correction into an editor XY translation at fixed Z. */
export function screenOffsetToEditorMove(
  anchor: Vector3Value,
  offset: { x: number; y: number },
  camera: Camera,
  viewportWidth: number,
  viewportHeight: number,
) {
  camera.updateWorldMatrix(true, false);
  const projected = editorPointToWorld(anchor).project(camera);
  const x = projected.x + (2 * offset.x) / Math.max(1, viewportWidth);
  const y = projected.y - (2 * offset.y) / Math.max(1, viewportHeight);
  const near = new Vector3(x, y, -1).unproject(camera);
  const far = new Vector3(x, y, 1).unproject(camera);
  const direction = far.sub(near);
  if (Math.abs(direction.z) < 1e-8) return null;
  const world = near.addScaledVector(
    direction,
    (anchor.z - near.z) / direction.z,
  );
  return { x: world.x - anchor.x, y: -world.y - anchor.y };
}

export function projectWorldBoxToScreen(
  box: Box3,
  camera: Camera,
  viewportWidth: number,
  viewportHeight: number,
): ProjectedBounds | null {
  if (box.isEmpty()) return null;
  // BoundsReporter runs in useFrame before Three renders the scene. When the
  // scene camera has just moved, its inverse world matrix may still describe
  // the previous frame; projecting with it offsets the DOM selection box from
  // the mesh that the renderer draws a moment later.
  camera.updateWorldMatrix(true, false);
  const points = [
    [box.min.x, box.min.y, box.min.z],
    [box.min.x, box.min.y, box.max.z],
    [box.min.x, box.max.y, box.min.z],
    [box.min.x, box.max.y, box.max.z],
    [box.max.x, box.min.y, box.min.z],
    [box.max.x, box.min.y, box.max.z],
    [box.max.x, box.max.y, box.min.z],
    [box.max.x, box.max.y, box.max.z],
  ].map(([x, y, z]) => new Vector3(x, y, z).project(camera));

  if (
    points.some(
      (point) =>
        !Number.isFinite(point.x) ||
        !Number.isFinite(point.y) ||
        !Number.isFinite(point.z),
    )
  ) {
    return null;
  }

  const xs = points.map((point) => ((point.x + 1) / 2) * viewportWidth);
  const ys = points.map((point) => ((1 - point.y) / 2) * viewportHeight);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  return { height: bottom - top, width: right - left, x: left, y: top };
}

export function projectObjectToScreen(
  object: Object3D,
  camera: Camera,
  viewportWidth: number,
  viewportHeight: number,
) {
  object.updateWorldMatrix(true, true);
  return projectWorldBoxToScreen(
    new Box3().setFromObject(object, true),
    camera,
    viewportWidth,
    viewportHeight,
  );
}
