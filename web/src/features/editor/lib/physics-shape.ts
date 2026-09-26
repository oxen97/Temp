import type { PhysicsShape } from "@/features/editor/lib/interaction-physics";
import { polygonPointsForElement } from "@/features/editor/lib/polygon";
import type { CanvasElement } from "@/features/editor/store/editor-store";

const ELLIPSE_SEGMENTS = 32;

/**
 * The collider for a released 2D element: circles roll as balls, rounded
 * rectangles keep their corners, triangles and stars use their outline's
 * convex hull. Everything else (text, images, videos, paths) keeps the
 * bounding box, which is what the artist sees as the selection.
 */
export function physicsShapeForElement(element: CanvasElement): PhysicsShape {
  const width = Math.max(1, element.width);
  const height = Math.max(1, element.height);
  if (element.type === "circle") {
    if (Math.abs(width - height) < 0.5) return { kind: "ball", radius: width / 2 };
    return {
      kind: "hull",
      points: Array.from({ length: ELLIPSE_SEGMENTS }, (_, index) => {
        const angle = (index / ELLIPSE_SEGMENTS) * Math.PI * 2;
        return {
          x: (Math.cos(angle) * width) / 2,
          y: (Math.sin(angle) * height) / 2,
        };
      }),
    };
  }
  if (element.type === "triangle" || element.type === "star") {
    const flipX = element.flipX ? -1 : 1;
    const flipY = element.flipY ? -1 : 1;
    const points = polygonPointsForElement(element).map((point) => ({
      x: ((point.x / 100) * width - width / 2) * flipX,
      y: ((point.y / 100) * height - height / 2) * flipY,
    }));
    if (points.length >= 3) return { kind: "hull", points };
  }
  if (element.type === "rectangle") {
    const radii = element.cornerRadii ?? [
      element.cornerRadius,
      element.cornerRadius,
      element.cornerRadius,
      element.cornerRadius,
    ];
    const radius = Math.min(
      ...radii.map((value) => Math.max(0, value ?? 0)),
      width / 2,
      height / 2,
    );
    if (radius > 0) return { kind: "round-box", radius };
  }
  return { kind: "box" };
}
