import type { PathPoint, VectorPath } from "@/features/editor/lib/vector-types";

/**
 * Viewer-only deformation. dx/dy are pointer displacement in element-local px;
 * stiffness and damping use the persisted model's normalized 0..1 scale.
 */
export type StrandBendVisual = {
  dx: number;
  dy: number;
  anchor: "top" | "bottom" | "left" | "right";
  stiffness: number;
  damping: number;
  influenceRadius: number;
  maxDisplacement: number;
  /** Optional pointer position in element-local y px; focuses a vertical bend. */
  focusY?: number;
};

type Point = { x: number; y: number };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function along(from: Point, to: Point, amount: number): Point {
  return {
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount,
  };
}

/**
 * Bend an open authored vector path without changing its stored points.
 * Every straight or curved segment becomes a cubic; existing handles retain
 * their shape while their positions follow the same displacement field.
 */
export function bendOpenPath(
  path: VectorPath,
  bend: StrandBendVisual,
): VectorPath {
  if (path.closed || path.points.length < 2) return path;

  const xs = path.points.map((point) => point.x);
  const ys = path.points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const horizontal = maxX - minX;
  const vertical = maxY - minY;
  // A horizontal line with a "top" anchor (or vice versa) still needs a
  // fixed end, so fall back to its non-degenerate major axis.
  const useHorizontal =
    bend.anchor === "left" || bend.anchor === "right"
      ? horizontal > 0.0001 || vertical <= 0.0001
      : vertical <= 0.0001 && horizontal > 0.0001;
  const min = useHorizontal ? minX : minY;
  const extent = Math.max(0.0001, useHorizontal ? horizontal : vertical);
  const anchorAtMax = bend.anchor === "right" || bend.anchor === "bottom";
  const stiffness = clamp(bend.stiffness, 0, 1);
  const damping = clamp(bend.damping, 0, 1);
  const maxDisplacement = Math.max(0, bend.maxDisplacement);
  const rawLength = Math.hypot(bend.dx, bend.dy);
  const limit =
    rawLength > maxDisplacement && rawLength > 0
      ? maxDisplacement / rawLength
      : 1;
  const compliance = 1 / (1 + stiffness);
  const offset = {
    x: bend.dx * limit * compliance,
    y: bend.dy * limit * compliance,
  };
  const exponent = 1.35 + damping * 1.25;
  const radius = Math.max(1, bend.influenceRadius);
  const anchorFalloff = Math.exp(-extent / radius);
  const focusProgress =
    !useHorizontal && Number.isFinite(bend.focusY)
      ? clamp(
          anchorAtMax
            ? 1 - ((bend.focusY as number) - min) / extent
            : ((bend.focusY as number) - min) / extent,
          0.05,
          1,
        )
      : null;

  const deform = (point: Point): Point => {
    const coordinate = useHorizontal ? point.x : point.y;
    const fraction = clamp((coordinate - min) / extent, 0, 1);
    const progress = anchorAtMax ? 1 - fraction : fraction;
    // Normalize the falloff so the authored anchor stays exactly fixed and
    // the free end receives the full offset for every radius.
    const localized =
      (Math.exp(-((1 - progress) * extent) / radius) - anchorFalloff) /
      (1 - anchorFalloff);
    const weight =
      focusProgress === null
        ? Math.pow(clamp(localized, 0, 1), exponent)
        : progress <= focusProgress
          ? Math.pow(progress / focusProgress, exponent)
          : Math.exp(-((progress - focusProgress) * extent) / radius);
    return {
      x: point.x + offset.x * weight,
      y: point.y + offset.y * weight,
    };
  };

  const points: PathPoint[] = path.points.map((point) => deform(point));
  for (let index = 0; index < path.points.length - 1; index += 1) {
    const from = path.points[index];
    const to = path.points[index + 1];
    const controlOne = from.handleOut ?? along(from, to, 1 / 3);
    const controlTwo = to.handleIn ?? along(from, to, 2 / 3);
    points[index].handleOut = deform(controlOne);
    points[index + 1].handleIn = deform(controlTwo);
  }
  return { ...path, points };
}
