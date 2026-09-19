import { Path, Shape, ShapeUtils, Vector2 } from "three";

import {
  outlinePathsForElement,
  vectorPathsForElement,
} from "@/features/editor/lib/vector-path";
import type { VectorPath } from "@/features/editor/lib/vector-types";
import type { CanvasElement } from "@/features/editor/store/editor-store";
import type { VectorShapeSnapshot } from "@/features/editor/three/types";

const supportedVectorTypes = new Set([
  "rectangle",
  "circle",
  "triangle",
  "star",
  "pen",
]);

function clonePath(path: VectorPath): VectorPath {
  return {
    closed: path.closed,
    points: path.points.map((point) => ({
      ...point,
      handleIn: point.handleIn ? { ...point.handleIn } : undefined,
      handleOut: point.handleOut ? { ...point.handleOut } : undefined,
    })),
  };
}

function reversePath(path: VectorPath): VectorPath {
  return {
    closed: path.closed,
    points: [...path.points].reverse().map((point) => ({
      x: point.x,
      y: point.y,
      handleIn: point.handleOut ? { ...point.handleOut } : undefined,
      handleOut: point.handleIn ? { ...point.handleIn } : undefined,
    })),
  };
}

function transformedPoint(
  point: { x: number; y: number },
  snapshot: VectorShapeSnapshot,
) {
  return new Vector2(
    point.x - snapshot.width / 2,
    snapshot.height / 2 - point.y,
  );
}

function normalizedWinding(
  path: VectorPath,
  snapshot: VectorShapeSnapshot,
  clockwise: boolean,
) {
  const points = path.points.map((point) => transformedPoint(point, snapshot));
  return ShapeUtils.isClockWise(points) === clockwise
    ? path
    : reversePath(path);
}

function appendPathSegments(
  target: Shape | Path,
  source: VectorPath,
  snapshot: VectorShapeSnapshot,
) {
  const first = source.points[0];
  if (!first) return;
  const start = transformedPoint(first, snapshot);
  target.moveTo(start.x, start.y);

  const appendSegment = (
    from: VectorPath["points"][number],
    to: VectorPath["points"][number],
  ) => {
    const destination = transformedPoint(to, snapshot);
    if (from.handleOut || to.handleIn) {
      const firstControl = transformedPoint(from.handleOut ?? from, snapshot);
      const secondControl = transformedPoint(to.handleIn ?? to, snapshot);
      target.bezierCurveTo(
        firstControl.x,
        firstControl.y,
        secondControl.x,
        secondControl.y,
        destination.x,
        destination.y,
      );
    } else {
      target.lineTo(destination.x, destination.y);
    }
  };

  for (let index = 1; index < source.points.length; index += 1) {
    appendSegment(source.points[index - 1], source.points[index]);
  }
  if (source.closed && source.points.length > 1) {
    appendSegment(source.points[source.points.length - 1], first);
    target.closePath();
  }
}

function assertUsableClosedPath(path: VectorPath, index: number) {
  if (!path.closed || path.points.length < 3) {
    throw new Error(
      `Vector path ${index} must be closed with at least 3 points.`,
    );
  }
  for (const point of path.points) {
    const values = [
      point.x,
      point.y,
      point.handleIn?.x,
      point.handleIn?.y,
      point.handleOut?.x,
      point.handleOut?.y,
    ].filter((value): value is number => value !== undefined);
    if (values.some((value) => !Number.isFinite(value))) {
      throw new Error(`Vector path ${index} contains a non-finite coordinate.`);
    }
  }
}

export function vectorSnapshotToShapes(snapshot: VectorShapeSnapshot) {
  if (!(snapshot.width > 0) || !(snapshot.height > 0)) {
    throw new Error("Vector snapshot dimensions must be positive.");
  }
  const groups = snapshot.shapeGroups.length
    ? snapshot.shapeGroups
    : snapshot.paths.map((_, index) => [index]);

  const referencedPathIndexes = new Set(groups.flat());
  referencedPathIndexes.forEach((index) => {
    const path = snapshot.paths[index];
    if (!path) throw new Error(`Shape group references missing path ${index}.`);
    assertUsableClosedPath(path, index);
  });

  return groups.map((group, groupIndex) => {
    const [outerIndex, ...holeIndexes] = group;
    const outer = snapshot.paths[outerIndex];
    if (!outer) throw new Error(`Shape group ${groupIndex} has no outer path.`);
    const shape = new Shape();
    appendPathSegments(
      shape,
      normalizedWinding(outer, snapshot, true),
      snapshot,
    );
    for (const holeIndex of holeIndexes) {
      const source = snapshot.paths[holeIndex];
      if (!source) {
        throw new Error(`Shape group ${groupIndex} references a missing hole.`);
      }
      const hole = new Path();
      appendPathSegments(
        hole,
        normalizedWinding(source, snapshot, false),
        snapshot,
      );
      shape.holes.push(hole);
    }
    return shape;
  });
}

export function vectorShapeSnapshotForElement(
  element: CanvasElement,
): VectorShapeSnapshot {
  if (!supportedVectorTypes.has(element.type)) {
    throw new Error(`${element.type} cannot be converted to 3D geometry.`);
  }

  const sourcePaths =
    element.type === "pen"
      ? vectorPathsForElement(element)
      : outlinePathsForElement(element).map((points) => ({
          closed: true,
          points,
        }));
  const paths = sourcePaths.map(clonePath);
  const shapeGroups: number[][] = [];

  if (element.pathfinder?.polygons?.length) {
    let pathIndex = 0;
    for (const polygon of element.pathfinder.polygons) {
      shapeGroups.push(
        Array.from({ length: polygon.length }, () => pathIndex++),
      );
    }
  } else {
    paths.forEach((path, index) => {
      if (path.closed && path.points.length >= 3) shapeGroups.push([index]);
    });
  }

  return {
    height: Math.max(1, element.height),
    paths,
    shapeGroups,
    width: Math.max(1, element.width),
  };
}

export function cloneVectorShapeSnapshot(
  snapshot: VectorShapeSnapshot,
): VectorShapeSnapshot {
  return {
    height: snapshot.height,
    paths: snapshot.paths.map(clonePath),
    shapeGroups: snapshot.shapeGroups.map((group) => [...group]),
    width: snapshot.width,
  };
}
