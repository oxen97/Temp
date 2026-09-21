import { describe, expect, it } from "vitest";

import { bendOpenPath, type StrandBendVisual } from "./strand-bend";

const bend: StrandBendVisual = {
  anchor: "top",
  damping: 0,
  dx: 80,
  dy: 0,
  influenceRadius: 90,
  maxDisplacement: 100,
  stiffness: 0,
};

describe("bendOpenPath", () => {
  it("pins the top and bends a two-point vertical strand into a cubic", () => {
    const path = {
      points: [
        { x: 10, y: 0 },
        { x: 10, y: 120 },
      ],
    };
    const result = bendOpenPath(path, bend);

    expect(result.points[0]).toMatchObject({ x: 10, y: 0 });
    expect(result.points[1]).toMatchObject({ x: 90, y: 120 });
    expect(result.points[0].handleOut!.x).toBeGreaterThan(10);
    expect(result.points[0].handleOut!.x).toBeLessThan(10 + 80 / 3);
    expect(result.points[1].handleIn!.x).toBeGreaterThan(
      result.points[0].handleOut!.x,
    );
    expect(path.points[0]).toEqual({ x: 10, y: 0 });
    expect(path.points[1]).toEqual({ x: 10, y: 120 });
  });

  it("pins the selected opposite side and supports horizontal lines", () => {
    const vertical = bendOpenPath(
      {
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 100 },
        ],
      },
      { ...bend, anchor: "bottom" },
    );
    expect(vertical.points[0].x).toBe(80);
    expect(vertical.points[1].x).toBe(0);

    const horizontal = bendOpenPath(
      {
        points: [
          { x: 0, y: 12 },
          { x: 100, y: 12 },
        ],
      },
      { ...bend, anchor: "top", dx: 0, dy: 30 },
    );
    expect(horizontal.points[0]).toMatchObject({ x: 0, y: 12 });
    expect(horizontal.points[1]).toMatchObject({ x: 100, y: 42 });
  });

  it("limits displacement and attenuates a stiffer strand", () => {
    const path = {
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 100 },
      ],
    };
    const result = bendOpenPath(path, {
      ...bend,
      dx: 200,
      maxDisplacement: 100,
      stiffness: 1,
    });
    expect(result.points[1].x).toBe(50);
  });

  it("uses influence radius to focus the bend near the free end", () => {
    const path = {
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 120 },
      ],
    };
    const focused = bendOpenPath(path, { ...bend, influenceRadius: 20 });
    const broad = bendOpenPath(path, { ...bend, influenceRadius: 400 });
    expect(focused.points[0].handleOut!.x).toBeLessThan(
      broad.points[0].handleOut!.x,
    );
    expect(focused.points[1].x).toBe(80);
    expect(broad.points[1].x).toBe(80);
  });

  it("can focus the visual bend at the pointer's height", () => {
    const path = {
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 120 },
      ],
    };
    const result = bendOpenPath(path, {
      ...bend,
      focusY: 60,
      influenceRadius: 35,
    });
    expect(result.points[0].x).toBe(0);
    expect(result.points[1].handleIn!.x).toBeGreaterThan(result.points[1].x);
  });

  it("retains existing curve handles and leaves closed paths alone", () => {
    const path = {
      points: [
        { x: 0, y: 0, handleOut: { x: 25, y: 10 } },
        { x: 0, y: 100, handleIn: { x: -20, y: 80 } },
      ],
    };
    const result = bendOpenPath(path, bend);
    expect(result.points[0].handleOut!.x).toBeGreaterThan(25);
    expect(result.points[1].handleIn!.x).toBeGreaterThan(-20);
    expect(path.points[0].handleOut).toEqual({ x: 25, y: 10 });

    const closed = { ...path, closed: true };
    expect(bendOpenPath(closed, bend)).toBe(closed);
  });
});
