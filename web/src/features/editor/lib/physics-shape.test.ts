import { describe, expect, it } from "vitest";

import type { CanvasElement } from "@/features/editor/store/editor-store";

import { physicsShapeForElement } from "./physics-shape";

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

describe("physics collider shapes", () => {
  it("rolls circles as balls and approximates ellipses with a hull", () => {
    expect(physicsShapeForElement(element({ type: "circle" }))).toEqual({
      kind: "ball",
      radius: 50,
    });
    const ellipse = physicsShapeForElement(
      element({ type: "circle", width: 200, height: 100 }),
    );
    expect(ellipse.kind).toBe("hull");
    if (ellipse.kind !== "hull") return;
    expect(ellipse.points).toHaveLength(32);
    expect(ellipse.points[0]).toEqual({ x: 100, y: 0 });
    expect(ellipse.points[8].y).toBeCloseTo(50);
  });

  it("uses the drawn outline of triangles and stars around the center", () => {
    const triangle = physicsShapeForElement(
      element({ type: "triangle", width: 120, height: 80 }),
    );
    expect(triangle).toEqual({
      kind: "hull",
      points: [
        { x: 0, y: -40 },
        { x: 60, y: 40 },
        { x: -60, y: 40 },
      ],
    });
    const flipped = physicsShapeForElement(
      element({ type: "triangle", width: 120, height: 80, flipY: true }),
    );
    expect(flipped.kind === "hull" && flipped.points[0]).toEqual({ x: 0, y: 40 });
    const star = physicsShapeForElement(element({ type: "star" }));
    expect(star.kind === "hull" && star.points).toHaveLength(10);
  });

  it("keeps rounded corners and boxes everything else", () => {
    expect(
      physicsShapeForElement(element({ cornerRadius: 24, width: 200, height: 40 })),
    ).toEqual({ kind: "round-box", radius: 20 });
    expect(
      physicsShapeForElement(element({ cornerRadii: [4, 12, 12, 12] })),
    ).toEqual({ kind: "round-box", radius: 4 });
    expect(physicsShapeForElement(element({}))).toEqual({ kind: "box" });
    expect(physicsShapeForElement(element({ type: "image" }))).toEqual({
      kind: "box",
    });
  });
});
