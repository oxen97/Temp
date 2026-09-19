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

export function projectWorldBoxToScreen(
  box: Box3,
  camera: Camera,
  viewportWidth: number,
  viewportHeight: number,
): ProjectedBounds | null {
  if (box.isEmpty()) return null;
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
