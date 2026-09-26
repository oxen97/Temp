import { describe, expect, it } from "vitest";

import type { CanvasElement } from "@/features/editor/store/editor-store";

import { convexParts, physicsShapeForElement } from "./physics-shape";

function element(overrides: Partial<CanvasElement>): CanvasElement {
  return {
    id: "shape",
    name: "Shape",
    type: "rectangle",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 100,
    fill: "#fff",
    stroke: "none",
    strokeWidth: 0,
    cornerRadius: 0,
    visible: true,
    locked: false,
    ...overrides,
  };
}

type Point = { x: number; y: number };

function area(points: Point[]) {
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

function convex(points: Point[]) {
  let sign = 0;
  for (let index = 0; index < points.length; index += 1) {
    const o = points[index];
    const a = points[(index + 1) % points.length];
    const b = points[(index + 2) % points.length];
    const turn = (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    if (Math.abs(turn) < 1e-9) continue;
    if (sign && Math.sign(turn) !== sign) return false;
    sign = Math.sign(turn);
  }
  return true;
}

function contains(points: Point[], point: Point) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const a = points[i];
    const b = points[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}

const STAR_OUTLINE = [
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
].map((point) => ({ x: point.x - 50, y: point.y - 50 }));

describe("physics collider shapes", () => {
  it("rolls circles as balls and uses the drawn outline of ellipses", () => {
    expect(physicsShapeForElement(element({ type: "circle" }))).toEqual({
      kind: "ball",
      radius: 50,
    });
    const ellipse = physicsShapeForElement(
      element({ type: "circle", width: 200, height: 100 }),
    );
    expect(ellipse.kind).toBe("polygons");
    if (ellipse.kind !== "polygons") return;
    expect(ellipse.parts).toHaveLength(1);
    expect(ellipse.parts[0]).toHaveLength(32);
    expect(ellipse.parts[0][0]).toEqual({ x: 100, y: 0 });
    expect(ellipse.parts[0][8].y).toBeCloseTo(50);
  });

  it("keeps a triangle as one piece around the center, with flips", () => {
    const triangle = physicsShapeForElement(
      element({ type: "triangle", width: 120, height: 80 }),
    );
    expect(triangle.kind).toBe("polygons");
    if (triangle.kind !== "polygons") return;
    expect(triangle.parts).toHaveLength(1);
    expect(area(triangle.parts[0])).toBeCloseTo((120 * 80) / 2);
    expect(triangle.parts[0]).toEqual(
      expect.arrayContaining([
        { x: 0, y: -40 },
        { x: 60, y: 40 },
        { x: -60, y: 40 },
      ]),
    );
    const flipped = physicsShapeForElement(
      element({ type: "triangle", width: 120, height: 80, flipY: true }),
    );
    expect(flipped.kind === "polygons" && flipped.parts[0]).toEqual(
      expect.arrayContaining([{ x: 0, y: 40 }]),
    );
  });

  it("splits a star into convex pieces that cover exactly the star", () => {
    const star = physicsShapeForElement(element({ type: "star" }));
    expect(star.kind).toBe("polygons");
    if (star.kind !== "polygons") return;
    // One hull would fill the notches between the points.
    expect(star.parts.length).toBeGreaterThan(1);
    expect(star.parts.length).toBeLessThanOrEqual(8);
    expect(star.parts.every(convex)).toBe(true);
    const pieces = star.parts.reduce((sum, part) => sum + area(part), 0);
    expect(pieces).toBeCloseTo(area(STAR_OUTLINE), 6);
    // A notch point (inside the hull, outside the star) is in no piece.
    const notch = { x: 0, y: 40 };
    expect(contains(STAR_OUTLINE, notch)).toBe(false);
    expect(star.parts.some((part) => contains(part, notch))).toBe(false);
    // The center and each tip are covered.
    expect(star.parts.some((part) => contains(part, { x: 0, y: 0 }))).toBe(
      true,
    );
    for (const tip of [
      { x: 0, y: -45 },
      { x: 45, y: -11 },
      { x: 27, y: 45 },
    ])
      expect(star.parts.some((part) => contains(part, tip))).toBe(true);
  });

  it("decomposes any simple outline in either winding", () => {
    const l = [
      { x: 0, y: 0 },
      { x: 60, y: 0 },
      { x: 60, y: 20 },
      { x: 20, y: 20 },
      { x: 20, y: 60 },
      { x: 0, y: 60 },
    ];
    for (const outline of [l, [...l].reverse()]) {
      const parts = convexParts(outline);
      expect(parts.length).toBe(2);
      expect(parts.every(convex)).toBe(true);
      expect(parts.reduce((sum, part) => sum + area(part), 0)).toBeCloseTo(
        area(l),
      );
    }
    expect(
      convexParts([...l.slice(0, 2), { x: 60, y: 60 }, { x: 0, y: 60 }]),
    ).toHaveLength(1);
  });

  it("follows rounded corners, including different radii, and boxes the rest", () => {
    const pill = physicsShapeForElement(
      element({ cornerRadius: 35, width: 200, height: 70 }),
    );
    expect(pill.kind).toBe("polygons");
    if (pill.kind !== "polygons") return;
    expect(pill.parts).toHaveLength(1);
    const xs = pill.parts[0].map((point) => point.x);
    const ys = pill.parts[0].map((point) => point.y);
    expect(Math.min(...xs)).toBeCloseTo(-100);
    expect(Math.max(...xs)).toBeCloseTo(100);
    expect(Math.min(...ys)).toBeCloseTo(-35);
    expect(Math.max(...ys)).toBeCloseTo(35);
    // The whole drawn area weighs in, not just the straight core.
    const exact = 200 * 70 - (4 - Math.PI) * 35 * 35;
    expect(area(pill.parts[0])).toBeGreaterThan(exact * 0.99);
    expect(area(pill.parts[0])).toBeLessThanOrEqual(exact);

    const mixed = physicsShapeForElement(
      element({ cornerRadii: [4, 30, 30, 30], flipX: true }),
    );
    expect(mixed.kind === "polygons" && mixed.parts[0]).toEqual(
      // Flipped: the small top-left radius is drawn at the top right.
      expect.arrayContaining([{ x: 50, y: expect.closeTo(-46) }]),
    );

    expect(physicsShapeForElement(element({}))).toEqual({ kind: "box" });
    expect(physicsShapeForElement(element({ type: "image" }))).toEqual({
      kind: "box",
    });
  });
});
