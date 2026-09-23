import { describe, expect, it } from "vitest";

import {
  constrainDragDelta,
  hasTargetDragGesture,
  isDropTargetHit,
  matchesDropRule,
  rectGap,
  resolveDropOccupancy,
  snapOffsetForTarget,
} from "@/features/editor/lib/interaction-drop-runtime";
import { createDefaultInteraction } from "@/features/editor/lib/interaction-model";

describe("target interaction runtime", () => {
  it("hit-tests rendered bounds with a non-negative tolerance", () => {
    const source = { x: 0, y: 0, width: 20, height: 20 };
    const target = { x: 30, y: 0, width: 20, height: 20 };
    expect(rectGap(source, target)).toBe(10);
    expect(isDropTargetHit(source, target, 9)).toBe(false);
    expect(isDropTargetHit(source, target, 10)).toBe(true);
    expect(isDropTargetHit(source, target, -10)).toBe(false);
  });

  it("aligns center and corner anchors and applies authored offsets", () => {
    const authoredSource = { x: 10, y: 20, width: 20, height: 10 };
    const target = { x: 100, y: 200, width: 80, height: 40 };
    expect(
      snapOffsetForTarget({
        anchor: "center",
        authoredSource,
        offsetX: 5,
        offsetY: -5,
        target,
      }),
    ).toEqual({ x: 125, y: 190 });
    expect(
      snapOffsetForTarget({
        anchor: "bottom-right",
        authoredSource,
        offsetX: 0,
        offsetY: 0,
        target,
      }),
    ).toEqual({ x: 150, y: 210 });
  });

  it("matches any, object id, and object type acceptance rules", () => {
    const source = { id: "star-a", type: "star" };
    expect(
      matchesDropRule(
        createDefaultInteraction({ targetMatchMode: "any" }),
        source,
      ),
    ).toBe(true);
    expect(
      matchesDropRule(
        createDefaultInteraction({
          targetMatchMode: "object-id",
          targetMatchValue: "star-a",
        }),
        source,
      ),
    ).toBe(true);
    expect(
      matchesDropRule(
        createDefaultInteraction({
          targetMatchMode: "object-type",
          targetMatchValue: "circle",
        }),
        source,
      ),
    ).toBe(false);
  });

  it("resolves unlimited, reject, replace, allow, and repeated occupancy", () => {
    expect(
      resolveDropOccupancy({
        behavior: "reject",
        capacity: 0,
        occupants: ["a", "b"],
        sourceId: "c",
      }),
    ).toEqual({ accepted: true, evicted: [], occupants: ["a", "b", "c"] });
    expect(
      resolveDropOccupancy({
        behavior: "reject",
        capacity: 1,
        occupants: ["a"],
        sourceId: "b",
      }),
    ).toEqual({ accepted: false, evicted: [], occupants: ["a"] });
    expect(
      resolveDropOccupancy({
        behavior: "replace",
        capacity: 2,
        occupants: ["a", "b"],
        sourceId: "c",
      }),
    ).toEqual({ accepted: true, evicted: ["a"], occupants: ["b", "c"] });
    expect(
      resolveDropOccupancy({
        behavior: "allow",
        capacity: 1,
        occupants: ["a"],
        sourceId: "b",
      }),
    ).toEqual({ accepted: true, evicted: [], occupants: ["a", "b"] });
    expect(
      resolveDropOccupancy({
        behavior: "replace",
        capacity: 1,
        occupants: ["a", "a"],
        sourceId: "a",
      }),
    ).toEqual({ accepted: true, evicted: [], occupants: ["a"] });
  });

  it("constrains both canonical axes and clamps to the artboard", () => {
    const common = {
      artboard: { width: 100, height: 80 },
      authoredSource: { x: 20, y: 10, width: 30, height: 20 },
      committedOffset: { x: 10, y: 5 },
      delta: { x: 100, y: -100 },
    };
    expect(
      constrainDragDelta({ ...common, bounds: "none", dragAxis: "x" }),
    ).toEqual({ x: 100, y: 0 });
    expect(
      constrainDragDelta({ ...common, bounds: "none", dragAxis: "y" }),
    ).toEqual({ x: 0, y: -100 });
    expect(
      constrainDragDelta({
        ...common,
        bounds: "artboard",
        dragAxis: "free",
      }),
    ).toEqual({ x: 40, y: -15 });
  });

  it("clamps from a live transformed AABB when one is supplied", () => {
    expect(
      constrainDragDelta({
        artboard: { width: 100, height: 80 },
        authoredSource: { x: 10, y: 10, width: 20, height: 20 },
        bounds: "artboard",
        committedOffset: { x: 0, y: 0 },
        delta: { x: 80, y: -20 },
        dragAxis: "free",
        // A rotated/scaled rendering extends 8 px past the right and 6 px
        // above the artboard even though its authored box would fit.
        transformedSource: { x: 72, y: -6, width: 36, height: 30 },
      }),
    ).toEqual({ x: 72, y: -14 });
  });

  it("treats every target event, including outside drop, as a drag gesture", () => {
    for (const trigger of [
      "drop-on-target",
      "drop-outside-target",
      "drag-enter-target",
      "drag-leave-target",
    ]) {
      expect(
        hasTargetDragGesture([createDefaultInteraction({ trigger })]),
      ).toBe(true);
    }
  });
});
