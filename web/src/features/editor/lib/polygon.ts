import { type Point } from "@/features/editor/lib/editor-types";
import { clamp, interpolatePoint } from "@/features/editor/lib/geometry";
import { type CanvasElement } from "@/features/editor/store/editor-store";

export function regularPolygonPoints(count: number, innerRatio?: number) {
  const points: Point[] = [];
  const total = innerRatio ? count * 2 : count;
  for (let index = 0; index < total; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / total;
    const radius = innerRatio && index % 2 ? 50 * innerRatio : 50;
    points.push({
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
    });
  }
  return points;
}

export function polygonPointsForElement(element: CanvasElement) {
  if (element.type === "triangle") {
    return (element.polygonPoints ?? 3) === 3
      ? [
          { x: 50, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
        ]
      : regularPolygonPoints(clamp(element.polygonPoints ?? 3, 3, 12));
  }
  if (element.type === "star") {
    const pointCount = clamp(element.polygonPoints ?? 5, 3, 12);
    return pointCount === 5
      ? [
          { x: 50, y: 0 },
          { x: 61, y: 38 },
          { x: 100, y: 38 },
          { x: 69, y: 60 },
          { x: 80, y: 100 },
          { x: 50, y: 76 },
          { x: 20, y: 100 },
          { x: 31, y: 60 },
          { x: 0, y: 38 },
          { x: 39, y: 38 },
        ]
      : regularPolygonPoints(pointCount, 0.4);
  }
  return [];
}

export function polygonPointString(points: Point[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function roundedPolygonCorners(
  points: Point[],
  radius: number | readonly number[],
) {
  return points.map((point, index) => {
    const amount = Math.max(
      0,
      typeof radius === "number" ? radius : (radius[index] ?? 0),
    );
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const previousLength = Math.hypot(
      point.x - previous.x,
      point.y - previous.y,
    );
    const nextLength = Math.hypot(next.x - point.x, next.y - point.y);
    const distance = Math.min(amount, previousLength / 2, nextLength / 2);
    return {
      end: interpolatePoint(point, next, distance / Math.max(1, nextLength)),
      point,
      start: interpolatePoint(
        point,
        previous,
        distance / Math.max(1, previousLength),
      ),
    };
  });
}

export function roundedPolygonPath(
  points: Point[],
  radius: number | readonly number[],
) {
  if (!points.length) return "";
  const corners = roundedPolygonCorners(points, radius);
  let data = `M ${corners[0].start.x} ${corners[0].start.y}`;
  corners.forEach((corner, index) => {
    data += ` Q ${corner.point.x} ${corner.point.y} ${corner.end.x} ${corner.end.y}`;
    const nextCorner = corners[(index + 1) % corners.length];
    data += ` L ${nextCorner.start.x} ${nextCorner.start.y}`;
  });
  return `${data} Z`;
}

export function roundedPolygonSamples(
  points: Point[],
  radius: number | readonly number[],
) {
  const hasRoundedCorner =
    typeof radius === "number"
      ? radius > 0
      : radius.some((cornerRadius) => cornerRadius > 0);
  if (!points.length || !hasRoundedCorner) return points;
  const corners = roundedPolygonCorners(points, radius);
  const samples: Point[] = [];
  corners.forEach((corner, index) => {
    samples.push(corner.start);
    for (let sample = 1; sample <= 8; sample += 1) {
      const amount = sample / 8;
      const inverse = 1 - amount;
      samples.push({
        x:
          inverse * inverse * corner.start.x +
          2 * inverse * amount * corner.point.x +
          amount * amount * corner.end.x,
        y:
          inverse * inverse * corner.start.y +
          2 * inverse * amount * corner.point.y +
          amount * amount * corner.end.y,
      });
    }
    samples.push(corners[(index + 1) % corners.length].start);
  });
  return samples;
}

export function polygonCornerIndicatorPaths(
  points: Point[],
  radii: readonly number[],
) {
  const corners = roundedPolygonCorners(points, radii);
  return corners.map((corner, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const previousLength = Math.hypot(
      corner.point.x - previous.x,
      corner.point.y - previous.y,
    );
    const nextLength = Math.hypot(
      next.x - corner.point.x,
      next.y - corner.point.y,
    );
    const visibleLength = 20;
    const startDistance = Math.hypot(
      corner.start.x - corner.point.x,
      corner.start.y - corner.point.y,
    );
    const endDistance = Math.hypot(
      corner.end.x - corner.point.x,
      corner.end.y - corner.point.y,
    );
    const visibleStart = interpolatePoint(
      corner.point,
      previous,
      Math.min(Math.max(visibleLength, startDistance), previousLength / 2) /
        Math.max(1, previousLength),
    );
    const visibleEnd = interpolatePoint(
      corner.point,
      next,
      Math.min(Math.max(visibleLength, endDistance), nextLength / 2) /
        Math.max(1, nextLength),
    );
    return `M ${visibleStart.x} ${visibleStart.y} L ${corner.start.x} ${corner.start.y} Q ${corner.point.x} ${corner.point.y} ${corner.end.x} ${corner.end.y} L ${visibleEnd.x} ${visibleEnd.y}`;
  });
}

export function polygonCornerRadiusValues(
  element: CanvasElement,
  points: Point[],
) {
  return points.map(
    (_, index) => element.polygonCornerRadii?.[index] ?? element.cornerRadius,
  );
}

export function polygonCornerRadii(element: CanvasElement, points: Point[]) {
  const radii = polygonCornerRadiusValues(element, points);
  const scale = 100 / Math.max(1, Math.min(element.width, element.height));
  return radii.map((radius) => radius * scale);
}

export function roundedRectanglePoints(element: CanvasElement) {
  const radii = (
    element.cornerRadii ?? [
      element.cornerRadius,
      element.cornerRadius,
      element.cornerRadius,
      element.cornerRadius,
    ]
  ).map((radius) =>
    clamp(radius, 0, Math.min(element.width / 2, element.height / 2)),
  );
  if (radii.every((radius) => radius === 0)) {
    return [
      { x: 0, y: 0 },
      { x: element.width, y: 0 },
      { x: element.width, y: element.height },
      { x: 0, y: element.height },
    ];
  }
  const centers = [
    { x: radii[0], y: radii[0], start: -Math.PI, end: -Math.PI / 2 },
    {
      x: element.width - radii[1],
      y: radii[1],
      start: -Math.PI / 2,
      end: 0,
    },
    {
      x: element.width - radii[2],
      y: element.height - radii[2],
      start: 0,
      end: Math.PI / 2,
    },
    {
      x: radii[3],
      y: element.height - radii[3],
      start: Math.PI / 2,
      end: Math.PI,
    },
  ];
  return centers.flatMap((center, cornerIndex) =>
    Array.from({ length: 9 }, (_, sample) => {
      const angle = center.start + ((center.end - center.start) * sample) / 8;
      const radius = radii[cornerIndex];
      return {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
      };
    }),
  );
}
