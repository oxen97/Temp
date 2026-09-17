import { ARTBOARD_TOOLBAR_GUTTER } from "@/features/editor/lib/editor-constants";
import {
  type CornerPosition,
  type ElementRect,
  type PenAnchor,
  type Point,
} from "@/features/editor/lib/editor-types";
import { type CanvasElement } from "@/features/editor/store/editor-store";

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function calculateCanvasFitZoom(
  canvasWidth: number,
  canvasHeight: number,
  artboardWidth: number,
  artboardHeight: number,
) {
  if (
    canvasWidth <= 0 ||
    canvasHeight <= 0 ||
    artboardWidth <= 0 ||
    artboardHeight <= 0
  ) {
    return 100;
  }

  const availableWidth = Math.max(1, canvasWidth - ARTBOARD_TOOLBAR_GUTTER * 2);
  const availableHeight = Math.max(1, canvasHeight - 96);
  return Number(
    clamp(
      100 *
        Math.min(
          availableWidth / artboardWidth,
          availableHeight / artboardHeight,
        ),
      5,
      500,
    ).toFixed(2),
  );
}

export function boundsFromPoints(start: Point, current: Point) {
  return {
    x: Math.min(start.x, current.x),
    y: Math.min(start.y, current.y),
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y),
  };
}

export function boundsFromPointList(points: Point[]) {
  if (!points.length) return { height: 0, width: 0, x: 0, y: 0 };
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    height: Math.max(...ys) - y,
    width: Math.max(...xs) - x,
    x,
    y,
  };
}

export function cubicExtremaAmounts(
  start: number,
  controlOne: number,
  controlTwo: number,
  end: number,
) {
  const a = -start + 3 * controlOne - 3 * controlTwo + end;
  const b = 2 * (start - 2 * controlOne + controlTwo);
  const c = controlOne - start;
  if (Math.abs(a) < 1e-9) {
    if (Math.abs(b) < 1e-9) return [];
    const amount = -c / b;
    return amount > 0 && amount < 1 ? [amount] : [];
  }

  const discriminant = b * b - 4 * a * c;
  if (discriminant < -1e-9) return [];
  const root = Math.sqrt(Math.max(0, discriminant));
  return [(-b + root) / (2 * a), (-b - root) / (2 * a)].filter(
    (amount) => amount > 0 && amount < 1,
  );
}

export function interpolatePoint(a: Point, b: Point, amount: number): Point {
  return {
    x: a.x + (b.x - a.x) * amount,
    y: a.y + (b.y - a.y) * amount,
  };
}

export function cubicPoint(
  start: Point,
  controlOne: Point,
  controlTwo: Point,
  end: Point,
  amount: number,
) {
  const first = interpolatePoint(start, controlOne, amount);
  const second = interpolatePoint(controlOne, controlTwo, amount);
  const third = interpolatePoint(controlTwo, end, amount);
  return interpolatePoint(
    interpolatePoint(first, second, amount),
    interpolatePoint(second, third, amount),
    amount,
  );
}

export function elementLocalPoint(element: CanvasElement, point: Point): Point {
  const center = {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  };
  const radians = (-element.rotation * Math.PI) / 180;
  const translated = { x: point.x - center.x, y: point.y - center.y };
  return {
    x:
      translated.x * Math.cos(radians) -
      translated.y * Math.sin(radians) +
      element.width / 2,
    y:
      translated.x * Math.sin(radians) +
      translated.y * Math.cos(radians) +
      element.height / 2,
  };
}

export function elementWorldPoint(element: CanvasElement, point: Point): Point {
  const center = {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  };
  const offset = rotatePoint(
    {
      x: point.x - element.width / 2,
      y: point.y - element.height / 2,
    },
    element.rotation,
  );
  return { x: center.x + offset.x, y: center.y + offset.y };
}

export function elementWorldPathPoint(
  element: CanvasElement,
  point: PenAnchor,
): PenAnchor {
  return {
    ...elementWorldPoint(element, point),
    handleIn: point.handleIn
      ? elementWorldPoint(element, point.handleIn)
      : undefined,
    handleOut: point.handleOut
      ? elementWorldPoint(element, point.handleOut)
      : undefined,
  };
}

export function constrainAngle(point: Point, origin: Point, step = 45): Point {
  const deltaX = point.x - origin.x;
  const deltaY = point.y - origin.y;
  const distance = Math.hypot(deltaX, deltaY);
  if (!distance) return origin;
  const angle = Math.atan2(deltaY, deltaX);
  const increment = (step * Math.PI) / 180;
  const snappedAngle = Math.round(angle / increment) * increment;
  return {
    x: origin.x + Math.cos(snappedAngle) * distance,
    y: origin.y + Math.sin(snappedAngle) * distance,
  };
}

export function rotatePoint(point: Point, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: point.x * Math.cos(radians) - point.y * Math.sin(radians),
    y: point.x * Math.sin(radians) + point.y * Math.cos(radians),
  };
}

export function rectFromElement(element: CanvasElement): ElementRect {
  return {
    id: element.id,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };
}

export function boundsFromElements(
  elements: CanvasElement[],
): ElementRect | null {
  if (!elements.length) return null;
  const rects = elements.map(rectFromElement);
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function visualFlipTransform(element: CanvasElement) {
  return `scale(${element.flipX ? -1 : 1}, ${element.flipY ? -1 : 1})`;
}

export function sourceCornerIndexForVisualPosition(
  position: CornerPosition,
  element: CanvasElement,
) {
  let row = position.startsWith("bottom") ? 1 : 0;
  let column = position.endsWith("right") ? 1 : 0;
  if (element.flipX) column = 1 - column;
  if (element.flipY) row = 1 - row;
  return [
    [0, 1],
    [3, 2],
  ][row][column];
}

export function worldPointForDesign(
  element: CanvasElement,
  point: Point,
): Point {
  const origin = {
    x: element.width / 2,
    y: element.height / 2,
  };
  const flipped = {
    x: element.flipX ? element.width - point.x : point.x,
    y: element.flipY ? element.height - point.y : point.y,
  };
  const rotated = rotatePoint(
    { x: flipped.x - origin.x, y: flipped.y - origin.y },
    element.rotation,
  );
  return {
    x: element.x + origin.x + rotated.x,
    y: element.y + origin.y + rotated.y,
  };
}

export function offsetRect(rect: ElementRect, delta: Point): ElementRect {
  return { ...rect, x: rect.x + delta.x, y: rect.y + delta.y };
}

export function centerOf(rect: ElementRect, axis: "x" | "y") {
  return axis === "x" ? rect.x + rect.width / 2 : rect.y + rect.height / 2;
}

export function lineGeometry(start: Point, current: Point) {
  const deltaX = current.x - start.x;
  const deltaY = current.y - start.y;
  const length = Math.max(24, Math.hypot(deltaX, deltaY));
  const centerX = (start.x + current.x) / 2;
  const centerY = (start.y + current.y) / 2;
  return {
    height: 24,
    rotation: Math.atan2(deltaY, deltaX) * (180 / Math.PI),
    width: length,
    x: centerX - length / 2,
    y: centerY - 12,
  };
}

export function lineDraftGeometry(start: Point, current: Point) {
  const padding = 6;
  const x = Math.min(start.x, current.x) - padding;
  const y = Math.min(start.y, current.y) - padding;
  const width = Math.max(24, Math.abs(current.x - start.x) + padding * 2);
  const height = Math.max(24, Math.abs(current.y - start.y) + padding * 2);
  return {
    height,
    startX: start.x - x,
    startY: start.y - y,
    endX: current.x - x,
    endY: current.y - y,
    width,
    x,
    y,
  };
}

export function lineEndpoints(element: CanvasElement) {
  const radians = element.rotation * (Math.PI / 180);
  const halfWidth = element.width / 2;
  const center = {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  };
  const direction = {
    x: Math.cos(radians) * halfWidth,
    y: Math.sin(radians) * halfWidth,
  };
  return {
    end: { x: center.x + direction.x, y: center.y + direction.y },
    start: { x: center.x - direction.x, y: center.y - direction.y },
  };
}

export function intersects(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return (
    a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y
  );
}
