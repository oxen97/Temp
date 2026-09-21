import { describe, expect, it } from "vitest";

import {
  isRenderableMetaballSource,
  metaballAlphaMatrix,
  metaballFilterBounds,
  metaballStrokePath,
  metaballTransformAttribute,
} from "./metaball";

describe("metaball helpers", () => {
  it("pads the filter around every source, including a moving stroke", () => {
    const bounds = metaballFilterBounds(
      [
        { id: "a", kind: "circle", x: 10, y: 20, radius: 5 },
        {
          id: "b",
          kind: "stroke",
          points: [
            { x: 40, y: 20 },
            { x: 60, y: 40 },
          ],
          width: 8,
        },
      ],
      17,
    );
    expect(bounds.x).toBeLessThan(5);
    expect(bounds.y).toBeLessThan(15);
    expect(bounds.x + bounds.width).toBeGreaterThan(64);
    expect(bounds.y + bounds.height).toBeGreaterThan(44);
  });

  it("rejects invalid geometry instead of producing an invalid SVG filter", () => {
    expect(
      isRenderableMetaballSource({
        id: "invalid",
        kind: "circle",
        x: Number.NaN,
        y: 0,
        radius: 10,
      }),
    ).toBe(false);
    expect(metaballFilterBounds([], 20)).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });

  it("creates an SVG path from artboard points", () => {
    expect(
      metaballStrokePath([
        { x: 0, y: 1 },
        { x: 10, y: 12 },
      ]),
    ).toBe("M 0 1 L 10 12");
    expect(metaballStrokePath([])).toBe("");
  });

  it("keeps a finite alpha threshold when smoothness is out of range", () => {
    expect(metaballAlphaMatrix(-1)).toBe(metaballAlphaMatrix(0));
    expect(metaballAlphaMatrix(2)).toBe(metaballAlphaMatrix(1));
  });

  it("supports authored closed shapes and transformed bounds", () => {
    const sources = [
      {
        id: "rounded-rectangle",
        kind: "rect" as const,
        x: 0,
        y: 0,
        width: 20,
        height: 10,
        cornerRadius: 3,
        transform: {
          translateX: 100,
          translateY: 50,
          originX: 10,
          originY: 5,
          rotationDegrees: 90,
        },
      },
      {
        id: "star",
        kind: "polygon" as const,
        points: [
          { x: 150, y: 0 },
          { x: 160, y: 20 },
          { x: 140, y: 20 },
        ],
      },
      {
        id: "curve",
        kind: "path" as const,
        d: "M 0 0 Q 20 20 40 0 Z",
        bounds: { x: 0, y: 0, width: 40, height: 20 },
        transform: { translateX: 200 },
      },
    ];
    expect(sources.every(isRenderableMetaballSource)).toBe(true);
    const bounds = metaballFilterBounds(sources, 0);
    expect(bounds.x).toBeLessThan(105);
    expect(bounds.y).toBeLessThan(45);
    expect(bounds.x + bounds.width).toBeGreaterThan(240);
    expect(bounds.y + bounds.height).toBeGreaterThan(60);
    expect(metaballTransformAttribute(sources[0].transform)).toContain(
      "rotate(90)",
    );
  });

  it("rejects non-finite transformed paths", () => {
    expect(
      isRenderableMetaballSource({
        id: "invalid-path",
        kind: "path",
        d: "M 0 0 Z",
        bounds: { x: 0, y: 0, width: 20, height: 20 },
        transform: { translateY: Number.POSITIVE_INFINITY },
      }),
    ).toBe(false);
  });
});
