import type { InteractionDefinition } from "@/features/editor/lib/interaction-model";

/** Triggers that turn a pointer gesture into a target-aware drag. */
export const TARGET_DRAG_TRIGGERS = [
  "drop-on-target",
  "drop-outside-target",
  "drag-enter-target",
  "drag-leave-target",
] as const;

export type TargetDragTrigger = (typeof TARGET_DRAG_TRIGGERS)[number];

export type DropRuntimeElement = {
  id: string;
  type: string;
  tag?: string;
  tags?: readonly string[];
};

export type RuntimeRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RuntimePoint = { x: number; y: number };

export type DropOccupancyResolution = {
  accepted: boolean;
  evicted: string[];
  occupants: string[];
};

export function isTargetDragTrigger(
  trigger: string,
): trigger is TargetDragTrigger {
  return (TARGET_DRAG_TRIGGERS as readonly string[]).includes(trigger);
}

/** A target trigger is itself draggable; authors do not need a duplicate Drag row. */
export function hasTargetDragGesture(
  interactions: readonly InteractionDefinition[] | undefined,
): boolean {
  return (interactions ?? []).some(
    (interaction) =>
      interaction.enabled !== false && isTargetDragTrigger(interaction.trigger),
  );
}

/**
 * Checks the dragged object against a target's acceptance rule. The tag branch
 * keeps older/generated data inert-but-safe until canvas tags are first-class.
 */
export function matchesDropRule(
  interaction: InteractionDefinition,
  source: DropRuntimeElement,
): boolean {
  const expected = interaction.targetMatchValue.trim();
  switch (interaction.targetMatchMode) {
    case "object-id":
      return expected.length > 0 && source.id === expected;
    case "object-type":
      return expected.length > 0 && source.type === expected;
    case "tag":
      return (
        expected.length > 0 &&
        (source.tag === expected || source.tags?.includes(expected) === true)
      );
    case "any":
    default:
      return true;
  }
}

/** Shortest edge-to-edge distance; zero means the two AABBs overlap. */
export function rectGap(a: RuntimeRect, b: RuntimeRect): number {
  const dx = Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width), 0);
  const dy = Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height), 0);
  return Math.hypot(dx, dy);
}

/**
 * Hit-tests a dragged element against the target's rendered bounds. The current
 * target UI exposes this bounding-box mode only.
 */
export function isDropTargetHit(
  source: RuntimeRect,
  target: RuntimeRect,
  tolerance: number,
): boolean {
  return rectGap(source, target) <= Math.max(0, tolerance);
}

function rectAnchor(rect: RuntimeRect, anchor: string): RuntimePoint {
  switch (anchor) {
    case "top-left":
      return { x: rect.x, y: rect.y };
    case "top-right":
      return { x: rect.x + rect.width, y: rect.y };
    case "bottom-left":
      return { x: rect.x, y: rect.y + rect.height };
    case "bottom-right":
      return { x: rect.x + rect.width, y: rect.y + rect.height };
    case "center":
    case "custom":
    default:
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }
}

/**
 * Returns the persistent translation needed to align like-named source and
 * target anchors. Snap offsets are expressed in artboard pixels.
 */
export function snapOffsetForTarget({
  anchor,
  authoredSource,
  offsetX,
  offsetY,
  target,
}: {
  anchor: string;
  authoredSource: RuntimeRect;
  offsetX: number;
  offsetY: number;
  target: RuntimeRect;
}): RuntimePoint {
  const sourceAnchor = rectAnchor(authoredSource, anchor);
  const targetAnchor = rectAnchor(target, anchor);
  return {
    x: targetAnchor.x - sourceAnchor.x + offsetX,
    y: targetAnchor.y - sourceAnchor.y + offsetY,
  };
}

/**
 * Applies capacity and occupied-target policy without mutating caller state.
 * Occupants are ordered oldest-first, which makes Replace deterministic.
 */
export function resolveDropOccupancy({
  behavior,
  capacity,
  occupants,
  sourceId,
}: {
  behavior: string;
  capacity: number;
  occupants: readonly string[];
  sourceId: string;
}): DropOccupancyResolution {
  const current = occupants.filter(
    (id, index, values) => values.indexOf(id) === index,
  );
  if (current.includes(sourceId)) {
    return { accepted: true, evicted: [], occupants: current };
  }
  const limit = Math.max(0, Math.floor(capacity));
  if (limit === 0 || current.length < limit || behavior === "allow") {
    return {
      accepted: true,
      evicted: [],
      occupants: [...current, sourceId],
    };
  }
  if (behavior !== "replace") {
    return { accepted: false, evicted: [], occupants: current };
  }
  const evictionCount = Math.max(1, current.length - limit + 1);
  const evicted = current.slice(0, evictionCount);
  return {
    accepted: true,
    evicted,
    occupants: [...current.slice(evictionCount), sourceId],
  };
}

/** Restricts a live drag delta by authored axis and artboard bounds. */
export function constrainDragDelta({
  artboard,
  authoredSource,
  bounds,
  committedOffset,
  delta,
  dragAxis,
  transformedSource,
}: {
  artboard: { width: number; height: number };
  authoredSource: RuntimeRect;
  bounds: string;
  committedOffset: RuntimePoint;
  delta: RuntimePoint;
  dragAxis: string;
  /** Live AABB after applying `delta`, including scale/rotation/skew. */
  transformedSource?: RuntimeRect;
}): RuntimePoint {
  let x = dragAxis === "vertical" || dragAxis === "y" ? 0 : delta.x;
  let y = dragAxis === "horizontal" || dragAxis === "x" ? 0 : delta.y;
  if (bounds !== "artboard") return { x, y };

  if (transformedSource) {
    if (dragAxis !== "vertical" && dragAxis !== "y") {
      if (transformedSource.x < 0) x -= transformedSource.x;
      else if (transformedSource.x + transformedSource.width > artboard.width)
        x -= transformedSource.x + transformedSource.width - artboard.width;
    }
    if (dragAxis !== "horizontal" && dragAxis !== "x") {
      if (transformedSource.y < 0) y -= transformedSource.y;
      else if (transformedSource.y + transformedSource.height > artboard.height)
        y -= transformedSource.y + transformedSource.height - artboard.height;
    }
    return { x, y };
  }

  const minX = -authoredSource.x - committedOffset.x;
  const maxX =
    artboard.width -
    (authoredSource.x + authoredSource.width) -
    committedOffset.x;
  const minY = -authoredSource.y - committedOffset.y;
  const maxY =
    artboard.height -
    (authoredSource.y + authoredSource.height) -
    committedOffset.y;
  x = Math.min(Math.max(x, minX), maxX);
  y = Math.min(Math.max(y, minY), maxY);
  return { x, y };
}
