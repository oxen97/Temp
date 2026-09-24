import { BoxGeometry, Uint16BufferAttribute } from "three";
import { describe, expect, it } from "vitest";

import { subdivideDeformableGeometry } from "./subdivide-deformable-geometry";

describe("sparse imported mesh refinement", () => {
  it("adds curved-surface samples within a fixed budget and preserves UV/material/morph data", () => {
    const source = new BoxGeometry(12, 100, 10);
    source.morphAttributes.position = [source.getAttribute("position").clone()];
    source.morphTargetsRelative = true;
    const originalCount = source.getAttribute("position").count;
    const result = subdivideDeformableGeometry(source);
    const count = result.getAttribute("position").count;
    expect(count).toBeGreaterThan(originalCount);
    expect(count / 3).toBeLessThanOrEqual(4096);
    expect(result.getAttribute("uv").count).toBe(count);
    expect(result.getAttribute("normal").count).toBe(count);
    expect(result.morphAttributes.position?.[0].count).toBe(count);
    expect(result.morphTargetsRelative).toBe(true);
    expect(result.groups.map((group) => group.materialIndex)).toEqual(
      source.groups.map((group) => group.materialIndex),
    );
    expect(result.groups.reduce((sum, group) => sum + group.count, 0)).toBe(
      count,
    );
    expect(
      new Set(
        Array.from({ length: count }, (_, index) =>
          result.getAttribute("position").getY(index),
        ),
      ).size,
    ).toBeGreaterThan(8);
    expect(source.getAttribute("position").count).toBe(originalCount);
    result.dispose();
  });

  it("leaves joint indices discrete rather than interpolating a skeleton", () => {
    const source = new BoxGeometry(10, 50, 10);
    source.setAttribute(
      "skinIndex",
      new Uint16BufferAttribute(
        new Uint16Array(source.getAttribute("position").count * 4),
        4,
      ),
    );
    const result = subdivideDeformableGeometry(source);
    expect(result.getAttribute("position").count).toBe(
      source.getAttribute("position").count,
    );
    expect(result.getAttribute("skinIndex").array).toBeInstanceOf(Uint16Array);
    result.dispose();
  });
});
