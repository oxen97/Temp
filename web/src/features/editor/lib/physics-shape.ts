import type { PhysicsShape } from "@/features/editor/lib/interaction-physics";
import {
  polygonPointsForElement,
  roundedRectanglePoints,
} from "@/features/editor/lib/polygon";
import type { CanvasElement } from "@/features/editor/store/editor-store";

type Point = { x: number; y: number };

const ELLIPSE_SEGMENTS = 32;
/** Turns flatter than this (in px², scaled by edge lengths) count as straight. */
const CONVEX_TOLERANCE = 1e-6;

/**
 * The collider for a released 2D element, matching what is drawn so resting
 * shapes touch without gaps: circles roll as balls, ellipses and rounded
 * rectangles use their drawn outline, and concave outlines such as stars are
 * split into convex pieces (a single hull would fill the notches between the
 * points). Everything else (text, images, videos, paths) keeps the bounding
 * box, which is what the artist sees as the selection.
 *
 * Every piece is a solid polygon, so the physics engine derives each body's
 * mass from the drawn area and stacks stay stable.
 */
export function physicsShapeForElement(element: CanvasElement): PhysicsShape {
  const width = Math.max(1, element.width);
  const height = Math.max(1, element.height);
  const flipX = element.flipX ? -1 : 1;
  const flipY = element.flipY ? -1 : 1;
  const centered = (point: Point): Point => ({
    x: (point.x - width / 2) * flipX,
    y: (point.y - height / 2) * flipY,
  });
  if (element.type === "circle") {
    if (Math.abs(width - height) < 0.5)
      return { kind: "ball", radius: width / 2 };
    return {
      kind: "polygons",
      parts: [
        Array.from({ length: ELLIPSE_SEGMENTS }, (_, index) => {
          const angle = (index / ELLIPSE_SEGMENTS) * Math.PI * 2;
          return {
            x: (Math.cos(angle) * width) / 2,
            y: (Math.sin(angle) * height) / 2,
          };
        }),
      ],
    };
  }
  if (element.type === "triangle" || element.type === "star") {
    const outline = polygonPointsForElement(element).map((point) =>
      centered({ x: (point.x / 100) * width, y: (point.y / 100) * height }),
    );
    if (outline.length >= 3)
      return { kind: "polygons", parts: convexParts(outline) };
  }
  if (element.type === "rectangle") {
    const outline = roundedRectanglePoints({ ...element, width, height });
    // Four points means no rounded corner: the box collider is exact.
    if (outline.length > 4)
      return { kind: "polygons", parts: [outline.map(centered)] };
  }
  return { kind: "box" };
}

function signedArea(points: Point[]) {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

/** Positive when o → a → b turns the same way as a positive-area polygon. */
function turn(o: Point, a: Point, b: Point) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function isConvex(points: Point[]) {
  for (let index = 0; index < points.length; index += 1) {
    const previous = points[(index + points.length - 1) % points.length];
    const next = points[(index + 1) % points.length];
    const scale =
      Math.hypot(points[index].x - previous.x, points[index].y - previous.y) *
      Math.hypot(next.x - points[index].x, next.y - points[index].y);
    if (turn(previous, points[index], next) < -CONVEX_TOLERANCE * scale)
      return false;
  }
  return true;
}

function insideTriangle(point: Point, a: Point, b: Point, c: Point) {
  return (
    turn(a, b, point) >= 0 && turn(b, c, point) >= 0 && turn(c, a, point) >= 0
  );
}

/** Ear clipping for a simple polygon with positive signed area. */
function triangulate(points: Point[]): Point[][] {
  const remaining = [...points];
  const triangles: Point[][] = [];
  let guard = remaining.length * remaining.length;
  while (remaining.length > 3 && guard > 0) {
    guard -= 1;
    let clipped = false;
    for (let index = 0; index < remaining.length; index += 1) {
      const previous =
        remaining[(index + remaining.length - 1) % remaining.length];
      const current = remaining[index];
      const next = remaining[(index + 1) % remaining.length];
      if (turn(previous, current, next) <= 0) continue;
      const blocked = remaining.some(
        (point) =>
          point !== previous &&
          point !== current &&
          point !== next &&
          insideTriangle(point, previous, current, next),
      );
      if (blocked) continue;
      triangles.push([previous, current, next]);
      remaining.splice(index, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  // Normally the last triangle; for self-touching input, the leftover outline.
  if (remaining.length >= 3) triangles.push(remaining);
  return triangles;
}

/**
 * Hertel–Mehlhorn: drop shared diagonals while the merged piece stays convex,
 * so a five-point star becomes a few solid pieces instead of many slivers.
 */
function mergeConvex(pieces: Point[][]): Point[][] {
  const parts = pieces.map((piece) => [...piece]);
  let merged = true;
  while (merged) {
    merged = false;
    search: for (let i = 0; i < parts.length; i += 1) {
      for (let j = i + 1; j < parts.length; j += 1) {
        const a = parts[i];
        const b = parts[j];
        for (let edge = 0; edge < a.length; edge += 1) {
          const from = a[edge];
          const to = a[(edge + 1) % a.length];
          const reverse = b.findIndex(
            (point, index) =>
              point === to && b[(index + 1) % b.length] === from,
          );
          if (reverse < 0) continue;
          // Walk a from `to` around to `from`, then b past `from` back to `to`.
          const joined: Point[] = [];
          for (let step = 0; step < a.length; step += 1)
            joined.push(a[(edge + 1 + step) % a.length]);
          for (let step = 2; step < b.length; step += 1)
            joined.push(b[(reverse + step) % b.length]);
          if (!isConvex(joined)) continue;
          parts[i] = joined;
          parts.splice(j, 1);
          merged = true;
          break search;
        }
      }
    }
  }
  return parts;
}

/** Convex pieces whose union is the outline (the outline itself when convex). */
export function convexParts(outline: Point[]): Point[][] {
  const oriented = signedArea(outline) < 0 ? [...outline].reverse() : outline;
  if (isConvex(oriented)) return [oriented];
  return mergeConvex(triangulate(oriented));
}
