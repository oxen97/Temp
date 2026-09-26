import { describe, expect, it } from "vitest";

import type { ViewerTrailParticle } from "./viewer-generated-effects";
import {
  TRAIL_BLUR_RATIOS,
  TRAIL_SPRITE_SIZE,
  trailBlend,
  trailBlurRatioIndex,
  trailMarkFrame,
  trailSpriteExtent,
  trailSpriteMask,
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

function alphaAt(mask: Float32Array, x: number, y: number) {
  return mask[Math.floor(y) * TRAIL_SPRITE_SIZE + Math.floor(x)];
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
      trailMarkFrame({ ...particle, retiringAt: 2000, retiringOpacity: 0.5 }, 2250),
    ).toMatchObject({ retiring: true, opacity: 0.25 });
  });

  it("picks the nearest pre-rendered blur ratio", () => {
    expect(trailBlurRatioIndex(0, 20)).toBe(0);
    expect(TRAIL_BLUR_RATIOS[trailBlurRatioIndex(4.5, 12)]).toBe(0.36);
    expect(TRAIL_BLUR_RATIOS[trailBlurRatioIndex(5, 20)]).toBe(0.25);
    expect(TRAIL_BLUR_RATIOS[trailBlurRatioIndex(90, 10)]).toBe(1.5);
    expect(trailSpriteExtent(20, 0)).toBe(20);
    expect(trailSpriteExtent(20, trailBlurRatioIndex(5, 20))).toBeCloseTo(50);
  });

  it("renders the CSS mark profile: solid core, soft ring, clipped disc", () => {
    const mask = trailSpriteMask(0);
    const center = TRAIL_SPRITE_SIZE / 2;
    expect(alphaAt(mask, center, center)).toBeCloseTo(1);
    // 76% of the farthest-corner ray lies beyond the disc: the edge keeps ~9%.
    expect(alphaAt(mask, center + TRAIL_SPRITE_SIZE * 0.49, center)).toBeLessThan(0.2);
    expect(alphaAt(mask, 0, 0)).toBe(0);
  });

  it("spreads a blurred mark over its glow margin and fades to clear", () => {
    const sharp = trailSpriteMask(0);
    const index = TRAIL_BLUR_RATIOS.indexOf(0.25);
    const soft = trailSpriteMask(index);
    const center = TRAIL_SPRITE_SIZE / 2;
    expect(alphaAt(soft, center, center)).toBeLessThan(alphaAt(sharp, center, center));
    expect(alphaAt(soft, center, center)).toBeGreaterThan(0.3);
    expect(alphaAt(soft, 1, center)).toBeLessThan(0.01);
    // The disc occupies 1 / (1 + 6r) of the sprite; blur keeps its coverage.
    const disc = TRAIL_SPRITE_SIZE / (1 + 6 * 0.25);
    const sharpCoverage = sharp.reduce((sum, value) => sum + value, 0);
    const softCoverage = soft.reduce((sum, value) => sum + value, 0);
    expect(softCoverage).toBeCloseTo(
      sharpCoverage * (disc / TRAIL_SPRITE_SIZE) ** 2,
      -1,
    );
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
