import { describe, expect, it } from "vitest";

import {
  RESTING_STRAND_SPRING,
  stepStrandSpring,
  strandNeighborTargets,
  type StrandNeighborCandidate,
} from "./strand-neighbor-pull";

const strand: StrandNeighborCandidate = {
  id: "neighbor",
  x: -10,
  y: 0,
  width: 20,
  height: 120,
  anchor: "top",
  radius: 100,
  strength: 100,
};

describe("strandNeighborTargets", () => {
  it("pulls a nearby strand laterally and excludes the dragged source", () => {
    const targets = strandNeighborTargets({ x: 40, y: 90 }, { id: "source" }, [
      { ...strand, id: "source" },
      strand,
    ]);
    expect(targets.has("source")).toBe(false);
    expect(targets.get("neighbor")!.x).toBeGreaterThan(0);
    expect(targets.get("neighbor")!.y).toBeCloseTo(0);
  });

  it("returns zero outside the radius or without a pointer", () => {
    expect(
      strandNeighborTargets({ x: 200, y: 60 }, null, [strand]).get("neighbor"),
    ).toEqual({ x: 0, y: 0 });
    expect(strandNeighborTargets(null, null, [strand]).get("neighbor")).toEqual(
      { x: 0, y: 0 },
    );
  });

  it("responds to authored radius and strength", () => {
    const pointer = { x: 40, y: 90 };
    const strong = strandNeighborTargets(pointer, null, [strand]).get(
      "neighbor",
    )!;
    const weak = strandNeighborTargets(pointer, null, [
      { ...strand, strength: 25 },
    ]).get("neighbor")!;
    const narrow = strandNeighborTargets(pointer, null, [
      { ...strand, radius: 20 },
    ]).get("neighbor")!;
    expect(weak.x).toBeCloseTo(strong.x / 4);
    expect(narrow).toEqual({ x: 0, y: 0 });
  });

  it("uses a supplied centerline and returns element-local offset", () => {
    const rotated = {
      ...strand,
      x: 0,
      y: 0,
      width: 120,
      height: 20,
      rotation: -90,
      centerline: [
        { x: 0, y: 10 },
        { x: 120, y: 10 },
      ],
    };
    const result = strandNeighborTargets({ x: 90, y: 40 }, null, [rotated]).get(
      "neighbor",
    )!;
    expect(result.x).toBeLessThan(0);
    expect(result.y).toBeCloseTo(0);
    expect(rotated.centerline[0]).toEqual({ x: 0, y: 10 });
  });
});

describe("stepStrandSpring", () => {
  const settings = { stiffness: 0.45, damping: 0.82, maxDisplacement: 60 };

  it("moves toward a target, clamps displacement, then relaxes to rest", () => {
    let state = RESTING_STRAND_SPRING;
    for (let index = 0; index < 120; index += 1) {
      state = stepStrandSpring(state, { x: 200, y: 0 }, 1 / 60, settings);
      expect(Math.hypot(state.dx, state.dy)).toBeLessThanOrEqual(60.0001);
    }
    expect(state.dx).toBeCloseTo(60);
    for (let index = 0; index < 240; index += 1) {
      state = stepStrandSpring(state, { x: 0, y: 0 }, 1 / 60, settings);
    }
    expect(state).toEqual(RESTING_STRAND_SPRING);
  });

  it("does not advance for a zero time step", () => {
    expect(
      stepStrandSpring(RESTING_STRAND_SPRING, { x: 50, y: 0 }, 0, settings),
    ).toBe(RESTING_STRAND_SPRING);
  });
});
