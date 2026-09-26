import { describe, expect, it } from "vitest";

import type { ViewerTrailParticle } from "./viewer-generated-effects";
import {
  TRAIL_BLUR_LEVELS,
  TRAIL_BLUR_STEP,
  trailBlend,
  trailBlurLevel,
  trailBlurRatio,
  trailMarkFrame,
  trailSpriteExtent,
  trailSpriteMask,
  trailSpriteSize,
} from "./viewer-trail-sprites";

const particle: ViewerTrailParticle = {
  id: 1,
  interactionId: "trail",
  createdAt: 1000,
  lifespan: 2,
  x: 40,
  y: 50,
  size: 20,
  growth: 1.8,
  fade: 1,
  blur: 12,
  color: "#ffcc00",
  blendMode: "screen",
  fadeOutDuration: 0.5,
};

function alphaAt(level: number, x: number, y: number) {
  const size = trailSpriteSize(level);
  const mask = trailSpriteMask(level);
  return mask[Math.floor(y) * size + Math.floor(x)];
}

/** Coverage at a distance from the center, in disc diameters, filtered the
 * way a scaled `drawImage` samples the sprite (bilinear, at pixel centers). */
function coverage(level: number, distance: number) {
  const size = trailSpriteSize(level);
  const mask = trailSpriteMask(level);
  const disc = size / (1 + 6 * trailBlurRatio(level));
  const x = Math.min(size - 1, size / 2 + distance * disc - 0.5);
  const y = size / 2 - 0.5;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const at = (column: number, row: number) =>
    mask[Math.min(size - 1, row) * size + Math.min(size - 1, column)];
  return (
    at(x0, y0) * (1 - fx) * (1 - fy) +
    at(x0 + 1, y0) * fx * (1 - fy) +
    at(x0, y0 + 1) * (1 - fx) * fy +
    at(x0 + 1, y0 + 1) * fx * fy
  );
}

describe("trail sprites", () => {
  it("describes a mark with the same growth, fade and world blur as before", () => {
    expect(trailMarkFrame(particle, 2000)).toMatchObject({
      diameter: 20 * 1.4,
      scale: 1.4,
      opacity: 0.5,
      blur: 12 * 0.45,
      retiring: false,
    });
    expect(
      trailMarkFrame(
        { ...particle, retiringAt: 2000, retiringOpacity: 0.5 },
        2250,
      ),
    ).toMatchObject({ retiring: true, opacity: 0.25 });
  });

  it("picks the nearest blur level in 4% steps", () => {
    expect(trailBlurLevel(0, 20)).toBe(0);
    expect(trailBlurLevel(0.1, 20)).toBe(0);
    const half = Math.log(TRAIL_BLUR_STEP) / 2 + 1e-9;
    for (const [blur, diameter] of [
      [5, 20],
      [4.5, 12],
      [6.3, 57.8],
      [1, 40],
    ]) {
      const ratio = blur / diameter;
      const level = trailBlurLevel(blur, diameter);
      expect(
        Math.abs(Math.log(trailBlurRatio(level) / ratio)),
      ).toBeLessThanOrEqual(half);
    }
    const widest = trailBlurRatio(trailBlurLevel(90, 10));
    expect(widest).toBeGreaterThanOrEqual(1.5);
    expect(widest).toBeLessThan(1.5 * TRAIL_BLUR_STEP);
    expect(trailBlurLevel(90, 10)).toBe(TRAIL_BLUR_LEVELS - 1);
    expect(trailSpriteExtent(20, 0)).toBe(20);
    const level = trailBlurLevel(5, 20);
    expect(trailSpriteExtent(20, level)).toBeCloseTo(
      20 * (1 + 6 * trailBlurRatio(level)),
    );
  });

  it("moves a growing mark through neighbouring levels without visible jumps", () => {
    // A mark keeps its blur in world pixels while it grows, so it steps down
    // through the levels. Each switch must change the drawn coverage only
    // slightly; 20% steps changed a mark's core by up to 12 points.
    let previous = trailBlurLevel(6.3, 12);
    let worst = 0;
    for (let diameter = 12; diameter <= 58; diameter += 0.25) {
      const level = trailBlurLevel(6.3, diameter);
      expect(previous - level).toBeLessThanOrEqual(1);
      if (level !== previous) {
        for (const distance of [0, 0.25, 0.5, 0.75, 1, 1.5])
          worst = Math.max(
            worst,
            Math.abs(coverage(level, distance) - coverage(previous, distance)),
          );
      }
      previous = level;
    }
    expect(worst).toBeGreaterThan(0);
    expect(worst).toBeLessThan(0.03);
  });

  it("renders the CSS mark profile: solid core, soft ring, clipped disc", () => {
    const size = trailSpriteSize(0);
    const center = size / 2;
    expect(alphaAt(0, center, center)).toBeCloseTo(1);
    // 76% of the farthest-corner ray lies beyond the disc: the edge keeps ~9%.
    expect(alphaAt(0, center + size * 0.49, center)).toBeLessThan(0.2);
    expect(alphaAt(0, 0, 0)).toBe(0);
  });

  it("spreads a blurred mark over its glow margin and fades to clear", () => {
    const level = trailBlurLevel(5, 20);
    const ratio = trailBlurRatio(level);
    const size = trailSpriteSize(level);
    const soft = trailSpriteMask(level);
    const sharp = trailSpriteMask(0);
    const center = size / 2;
    expect(alphaAt(level, center, center)).toBeLessThan(alphaAt(0, 64, 64));
    expect(alphaAt(level, center, center)).toBeGreaterThan(0.3);
    expect(alphaAt(level, 1, center)).toBeLessThan(0.01);
    // The disc occupies 1 / (1 + 6r) of the sprite; blur keeps its coverage.
    const disc = size / (1 + 6 * ratio);
    const sharpCoverage =
      sharp.reduce((sum, value) => sum + value, 0) / trailSpriteSize(0) ** 2;
    const softCoverage = soft.reduce((sum, value) => sum + value, 0);
    expect(softCoverage / disc ** 2).toBeCloseTo(sharpCoverage, 1);
  });

  it("maps the authored blend modes to canvas and CSS blending", () => {
    expect(trailBlend("screen")).toEqual({
      key: "screen",
      composite: "screen",
      css: "screen",
    });
    expect(trailBlend("lighter")).toEqual({
      key: "lighter",
      composite: "lighter",
      css: "plus-lighter",
    });
    expect(trailBlend("normal").composite).toBe("source-over");
    expect(trailBlend("unknown").key).toBe("normal");
  });
});
