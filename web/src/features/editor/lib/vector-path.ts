import { type CSSProperties } from "react";

import {
  type HandleMirroring,
  type PenAnchor,
  type Point,
  type VectorHandleRef,
  type VectorPointRef,
} from "@/features/editor/lib/editor-types";
import {
  boundsFromPointList,
  cubicExtremaAmounts,
  cubicPoint,
  interpolatePoint,
  rotatePoint,
} from "@/features/editor/lib/geometry";
import {
  polygonCornerRadii,
  polygonPointsForElement,
  roundedPolygonSamples,
  roundedRectanglePoints,
} from "@/features/editor/lib/polygon";
import {
  type CanvasElement,
  type PathfinderData,
  type PathPoint,
  type VectorPath,
} from "@/features/editor/store/editor-store";

export function scaleVectorPaths(
  paths: VectorPath[],
  scaleX: number,
  scaleY: number,
) {
  const scalePoint = (point: Point) => ({
    x: point.x * scaleX,
    y: point.y * scaleY,
  });
  return paths.map((path) => ({
    ...path,
    points: path.points.map((point) => ({
      ...point,
      ...scalePoint(point),
      handleIn: point.handleIn ? scalePoint(point.handleIn) : undefined,
      handleOut: point.handleOut ? scalePoint(point.handleOut) : undefined,
    })),
  }));
}

export function vectorPathsForElement(element: CanvasElement): VectorPath[] {
  if (element.vectorPaths?.length) return element.vectorPaths;
  return element.points?.length
    ? [{ points: element.points, closed: element.closed }]
    : [];
}

export function cloneVectorPaths(paths: VectorPath[]): VectorPath[] {
  return paths.map((path) => ({
    closed: path.closed,
    points: path.points.map((point) => ({
      ...point,
      handleIn: point.handleIn ? { ...point.handleIn } : undefined,
      handleOut: point.handleOut ? { ...point.handleOut } : undefined,
    })),
  }));
}

export function clearOrphanedVectorHandles(paths: VectorPath[]): VectorPath[] {
  return paths.map((path) => {
    if (path.points.length !== 1) return path;
    return {
      ...path,
      closed: false,
      points: path.points.map((point) => ({
        ...point,
        handleIn: undefined,
        handleOut: undefined,
      })),
    };
  });
}

export function vectorPathUpdates(paths: VectorPath[]): Partial<CanvasElement> {
  const first = paths[0];
  return {
    closed: first?.closed,
    points: first?.points,
    vectorPaths: paths,
  };
}

export function vectorPointKey(point: VectorPointRef) {
  return `${point.pathIndex}:${point.nodeIndex}`;
}

export function vectorHandleKey(handle: VectorHandleRef) {
  return `${handle.pathIndex}:${handle.nodeIndex}:${handle.handle}`;
}

export function vectorVisualGeometryPoints(paths: VectorPath[]) {
  return paths.flatMap((path) => {
    if (!path.points.length) return [];

    const points: Point[] = path.points.map((point) => ({
      x: point.x,
      y: point.y,
    }));
    const segmentCount = path.closed
      ? path.points.length
      : Math.max(0, path.points.length - 1);

    for (let index = 0; index < segmentCount; index += 1) {
      const from = path.points[index];
      const to = path.points[(index + 1) % path.points.length];
      const controlOne = from.handleOut ?? from;
      const controlTwo = to.handleIn ?? to;
      if (!from.handleOut && !to.handleIn) continue;
      const extrema = [
        ...cubicExtremaAmounts(from.x, controlOne.x, controlTwo.x, to.x),
        ...cubicExtremaAmounts(from.y, controlOne.y, controlTwo.y, to.y),
      ];
      extrema.forEach((amount) => {
        points.push(cubicPoint(from, controlOne, controlTwo, to, amount));
      });
    }

    return points;
  });
}

export function pathData(points: PenAnchor[], closed = false) {
  if (!points.length) return "";
  const first = points[0];
  let data = `M ${first.x} ${first.y}`;

  const appendSegment = (from: PenAnchor, to: PenAnchor) => {
    const controlOne = from.handleOut;
    const controlTwo = to.handleIn;
    if (controlOne || controlTwo) {
      const firstControl = controlOne ?? from;
      const secondControl = controlTwo ?? to;
      return ` C ${firstControl.x} ${firstControl.y} ${secondControl.x} ${secondControl.y} ${to.x} ${to.y}`;
    }
    return ` L ${to.x} ${to.y}`;
  };

  for (let index = 1; index < points.length; index += 1) {
    data += appendSegment(points[index - 1], points[index]);
  }
  if (closed && points.length > 1) {
    data += appendSegment(points[points.length - 1], first);
    data += " Z";
  }
  return data;
}

export function pathfinderDataForVectorPaths(
  element: CanvasElement,
  paths: VectorPath[],
  originOffset: Point,
): PathfinderData | undefined {
  const pathfinder = element.pathfinder;
  if (!pathfinder) return undefined;

  const ringCounts = pathfinder.polygons?.map((polygon) => polygon.length);
  const preservesPolygonGroups =
    Boolean(ringCounts?.length) &&
    ringCounts!.reduce((total, count) => total + count, 0) === paths.length;
  let pathIndex = 0;
  const polygons = preservesPolygonGroups
    ? ringCounts!.map((ringCount) =>
        Array.from({ length: ringCount }, () => {
          const path = paths[pathIndex++];
          const ring = path.points.map(
            (point) => [point.x, point.y] as [number, number],
          );
          const first = ring[0];
          const last = ring.at(-1);
          if (
            path.closed &&
            first &&
            (!last || first[0] !== last[0] || first[1] !== last[1])
          ) {
            ring.push([first[0], first[1]]);
          }
          return ring;
        }),
      )
    : undefined;

  return {
    ...pathfinder,
    imageFill: pathfinder.imageFill
      ? {
          ...pathfinder.imageFill,
          x: pathfinder.imageFill.x - originOffset.x,
          y: pathfinder.imageFill.y - originOffset.y,
        }
      : undefined,
    paths: paths.map((path) => pathData(path.points, path.closed)),
    polygons,
  };
}

export function penHandleLineStyle(from: Point, to: Point): CSSProperties {
  const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  return {
    left: from.x,
    top: from.y,
    transform: `rotate(${angle}deg)`,
    transformOrigin: "0 50%",
    width: Math.hypot(to.x - from.x, to.y - from.y),
  };
}

export type PathInsertion = {
  distance: number;
  pathIndex: number;
  segmentIndex: number;
  t: number;
};

export function nearestVectorPathPosition(
  paths: VectorPath[],
  point: Point,
): PathInsertion | null {
  let nearest: PathInsertion | null = null;
  paths.forEach((path, pathIndex) => {
    if (path.points.length < 2) return;
    const segmentCount = path.closed
      ? path.points.length
      : path.points.length - 1;
    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
      const start = path.points[segmentIndex];
      const end = path.points[(segmentIndex + 1) % path.points.length];
      const controlOne = start.handleOut ?? start;
      const controlTwo = end.handleIn ?? end;
      const curved = Boolean(start.handleOut || end.handleIn);
      const samples = curved ? 32 : 1;
      let previous = { x: start.x, y: start.y };
      for (let sample = 1; sample <= samples; sample += 1) {
        const t = sample / samples;
        const current = curved
          ? cubicPoint(start, controlOne, controlTwo, end, t)
          : {
              x: start.x + (end.x - start.x) * t,
              y: start.y + (end.y - start.y) * t,
            };
        const segmentX = current.x - previous.x;
        const segmentY = current.y - previous.y;
        const lengthSquared = segmentX * segmentX + segmentY * segmentY;
        const amount = lengthSquared
          ? Math.max(
              0,
              Math.min(
                1,
                ((point.x - previous.x) * segmentX +
                  (point.y - previous.y) * segmentY) /
                  lengthSquared,
              ),
            )
          : 0;
        const closest = {
          x: previous.x + segmentX * amount,
          y: previous.y + segmentY * amount,
        };
        const distance = Math.hypot(point.x - closest.x, point.y - closest.y);
        if (!nearest || distance < nearest.distance) {
          nearest = {
            distance,
            pathIndex,
            segmentIndex,
            t: (sample - 1 + amount) / samples,
          };
        }
        previous = current;
      }
    }
  });
  return nearest;
}

export function splitVectorSegment(
  path: VectorPath,
  segmentIndex: number,
  amount: number,
): VectorPath {
  const points: PathPoint[] = path.points.map((point) => ({
    ...point,
    handleIn: point.handleIn ? { ...point.handleIn } : undefined,
    handleOut: point.handleOut ? { ...point.handleOut } : undefined,
  }));
  const nextIndex = (segmentIndex + 1) % points.length;
  const start = points[segmentIndex];
  const end = points[nextIndex];
  const curved = Boolean(start.handleOut || end.handleIn);
  if (!curved) {
    const inserted = interpolatePoint(start, end, amount);
    if (nextIndex === 0 && path.closed) points.push(inserted);
    else points.splice(segmentIndex + 1, 0, inserted);
    return { ...path, points };
  }

  const controlOne = start.handleOut ?? start;
  const controlTwo = end.handleIn ?? end;
  const first = interpolatePoint(start, controlOne, amount);
  const second = interpolatePoint(controlOne, controlTwo, amount);
  const third = interpolatePoint(controlTwo, end, amount);
  const left = interpolatePoint(first, second, amount);
  const right = interpolatePoint(second, third, amount);
  const middle = interpolatePoint(left, right, amount);
  const updatedStart = { ...start, handleOut: first };
  const updatedEnd = { ...end, handleIn: third };
  const inserted: PathPoint = {
    x: middle.x,
    y: middle.y,
    handleIn: left,
    handleOut: right,
  };
  points[segmentIndex] = updatedStart;
  points[nextIndex] = updatedEnd;
  if (nextIndex === 0 && path.closed) points.push(inserted);
  else points.splice(segmentIndex + 1, 0, inserted);
  return { ...path, points };
}

export function vectorElementGeometryUpdate(
  element: CanvasElement,
  paths: VectorPath[],
): Partial<CanvasElement> {
  const bounds = boundsFromPointList(vectorVisualGeometryPoints(paths));
  const width = Math.max(8, bounds.width);
  const height = Math.max(8, bounds.height);
  const normalizedPaths = paths.map((path) => ({
    ...path,
    points: path.points.map((point) => ({
      ...point,
      x: point.x - bounds.x,
      y: point.y - bounds.y,
      handleIn: point.handleIn
        ? { x: point.handleIn.x - bounds.x, y: point.handleIn.y - bounds.y }
        : undefined,
      handleOut: point.handleOut
        ? { x: point.handleOut.x - bounds.x, y: point.handleOut.y - bounds.y }
        : undefined,
    })),
  }));
  const oldCenter = {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  };
  const centerOffset = rotatePoint(
    {
      x: bounds.x + width / 2 - element.width / 2,
      y: bounds.y + height / 2 - element.height / 2,
    },
    element.rotation,
  );
  const nextCenter = {
    x: oldCenter.x + centerOffset.x,
    y: oldCenter.y + centerOffset.y,
  };
  return {
    ...vectorPathUpdates(normalizedPaths),
    height,
    pathfinder: pathfinderDataForVectorPaths(element, normalizedPaths, bounds),
    width,
    x: Math.round(nextCenter.x - width / 2),
    y: Math.round(nextCenter.y - height / 2),
  };
}

export function mirroredHandle(
  anchor: Point,
  nextHandle: Point,
  oppositeHandle: Point | undefined,
  mode: HandleMirroring,
) {
  if (mode === "none") return oppositeHandle;
  if (mode === "angle-length" || !oppositeHandle) {
    return {
      x: anchor.x * 2 - nextHandle.x,
      y: anchor.y * 2 - nextHandle.y,
    };
  }
  const nextVector = {
    x: nextHandle.x - anchor.x,
    y: nextHandle.y - anchor.y,
  };
  const length = Math.hypot(nextVector.x, nextVector.y);
  const oppositeLength = Math.hypot(
    oppositeHandle.x - anchor.x,
    oppositeHandle.y - anchor.y,
  );
  if (!length) return oppositeHandle;
  return {
    x: anchor.x - (nextVector.x / length) * oppositeLength,
    y: anchor.y - (nextVector.y / length) * oppositeLength,
  };
}

export function sampledVectorPaths(element: CanvasElement): Point[][] {
  return vectorPathsForElement(element).map((path) => {
    if (!path.points.length) return [];
    const sampled: Point[] = [{ x: path.points[0].x, y: path.points[0].y }];
    const segmentCount = path.closed
      ? path.points.length
      : Math.max(0, path.points.length - 1);
    for (let index = 0; index < segmentCount; index += 1) {
      const from = path.points[index];
      const to = path.points[(index + 1) % path.points.length];
      const curved = Boolean(from.handleOut || to.handleIn);
      const samples = curved ? 24 : 1;
      for (let sample = 1; sample <= samples; sample += 1) {
        sampled.push(
          curved
            ? cubicPoint(
                from,
                from.handleOut ?? from,
                to.handleIn ?? to,
                to,
                sample / samples,
              )
            : { x: to.x, y: to.y },
        );
      }
    }
    return sampled;
  });
}

export function outlinePathsForElement(element: CanvasElement): Point[][] {
  if (element.type === "circle") {
    return [
      Array.from({ length: 48 }, (_, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / 48;
        return {
          x: element.width / 2 + Math.cos(angle) * (element.width / 2),
          y: element.height / 2 + Math.sin(angle) * (element.height / 2),
        };
      }),
    ];
  }
  if (element.type === "triangle" || element.type === "star") {
    const polygonPoints = polygonPointsForElement(element);
    const points = roundedPolygonSamples(
      polygonPoints,
      polygonCornerRadii(element, polygonPoints),
    );
    return [
      points.map((point) => ({
        x: (point.x / 100) * element.width,
        y: (point.y / 100) * element.height,
      })),
    ];
  }
  if (element.type === "pen") return sampledVectorPaths(element);
  if (element.type === "line") {
    return [
      [
        { x: 0, y: element.height / 2 },
        { x: element.width, y: element.height / 2 },
      ],
    ];
  }
  return [[...roundedRectanglePoints(element)]];
}
