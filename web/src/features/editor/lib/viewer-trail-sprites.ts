import {
  trailParticleOpacity,
  type ViewerTrailParticle,
} from "@/features/editor/lib/viewer-generated-effects";

/** Authored trail blur → world-pixel Gaussian radius (unchanged from the
 * previous CSS `blur()` rendering, which used the same factor). */
export const TRAIL_BLUR_SCALE = 0.45;

/** A mark's blurred glow reaches about three radii beyond its disc. */
const GLOW_REACH = 3;

/** Blur-to-diameter ratios of the pre-blurred sprites. Level 0 is a sharp
 * disc; the others grow geometrically by `TRAIL_BLUR_STEP`. A mark keeps its
 * blur in world pixels while it grows, so its ratio falls and it moves through
 * the levels. With 4% steps a switch changes the drawn coverage by under two
 * percentage points; the former 20% steps made growing marks visibly flicker. */
const MIN_RATIO = 0.02;
const MAX_RATIO = 1.5;
export const TRAIL_BLUR_STEP = 1.04;
export const TRAIL_BLUR_LEVELS =
  2 + Math.ceil(Math.log(MAX_RATIO / MIN_RATIO) / Math.log(TRAIL_BLUR_STEP));

export function trailBlurRatio(level: number): number {
  return level <= 0
    ? 0
    : MIN_RATIO *
        TRAIL_BLUR_STEP ** (Math.min(level, TRAIL_BLUR_LEVELS - 1) - 1);
}

export function trailBlurLevel(blur: number, diameter: number): number {
  if (!(blur > 0) || !(diameter > 0)) return 0;
  const ratio = blur / diameter;
  // Below the first level the blur is under 2% of the disc: draw it sharp.
  if (ratio < MIN_RATIO / Math.sqrt(TRAIL_BLUR_STEP)) return 0;
  const level =
    1 + Math.round(Math.log(ratio / MIN_RATIO) / Math.log(TRAIL_BLUR_STEP));
  return Math.min(TRAIL_BLUR_LEVELS - 1, Math.max(1, level));
}

/** Drawn sprite edge for a disc of `diameter`, including its glow margin. */
export function trailSpriteExtent(diameter: number, level: number) {
  return diameter * (1 + 2 * GLOW_REACH * trailBlurRatio(level));
}

/** Sprite edge in pixels: a soft glow needs little resolution, a crisp disc
 * more. Keeps the whole sprite set of a busy trail within a few megabytes. */
export function trailSpriteSize(level: number) {
  return trailBlurRatio(level) >= 0.08 ? 64 : 128;
}

export type TrailMarkFrame = {
  id: number;
  interactionId: string;
  x: number;
  y: number;
  /** Rendered disc diameter in artboard pixels (authored size × growth). */
  diameter: number;
  scale: number;
  opacity: number;
  /** Gaussian blur radius in artboard pixels. */
  blur: number;
  color: string;
  blendMode: string;
  retiring: boolean;
};

/** Growth factor of a mark at `now` (1 at birth, `growth` at the end of life). */
export function trailMarkScale(particle: ViewerTrailParticle, now: number) {
  const progress = Math.max(
    0,
    Math.min(1, (now - particle.createdAt) / (particle.lifespan * 1000)),
  );
  return 1 + (particle.growth - 1) * progress;
}

/** Geometry and opacity of one mark at `now`; the renderer and tests share it. */
export function trailMarkFrame(
  particle: ViewerTrailParticle,
  now: number,
): TrailMarkFrame {
  const scale = trailMarkScale(particle, now);
  return {
    id: particle.id,
    interactionId: particle.interactionId,
    x: particle.x,
    y: particle.y,
    diameter: particle.size * Math.max(0, scale),
    scale,
    opacity: trailParticleOpacity(particle, now),
    blur: Math.max(0, particle.blur) * TRAIL_BLUR_SCALE,
    color: particle.color,
    blendMode: particle.blendMode,
    retiring: particle.retiringAt !== undefined,
  };
}

const masks = new Map<number, Float32Array>();

function blurAxis(
  source: Float32Array,
  target: Float32Array,
  size: number,
  kernel: Float32Array,
  horizontal: boolean,
) {
  const radius = (kernel.length - 1) / 2;
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      let sum = 0;
      const from = Math.max(-radius, -(horizontal ? column : row));
      const to = Math.min(radius, size - 1 - (horizontal ? column : row));
      for (let offset = from; offset <= to; offset += 1) {
        const index = horizontal
          ? row * size + column + offset
          : (row + offset) * size + column;
        sum += source[index] * kernel[offset + radius];
      }
      target[row * size + column] = sum;
    }
  }
}

/**
 * Alpha coverage of one mark: the former CSS mark (a disc whose radial
 * gradient is solid to 16% and clear at 76% of its farthest-corner ray),
 * blurred once here instead of by a per-mark CSS filter every frame.
 */
export function trailSpriteMask(level: number): Float32Array {
  const cached = masks.get(level);
  if (cached) return cached;
  const size = trailSpriteSize(level);
  const ratio = trailBlurRatio(level);
  const disc = size / (1 + 2 * GLOW_REACH * ratio);
  const radius = disc / 2;
  const center = size / 2;
  const ray = radius * Math.SQRT2;
  const solid = 0.16 * ray;
  const clear = 0.76 * ray;
  let alpha = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = Math.hypot(x + 0.5 - center, y + 0.5 - center);
      const gradient =
        distance <= solid
          ? 1
          : Math.max(0, (clear - distance) / (clear - solid));
      const clip = Math.min(1, Math.max(0, radius - distance + 0.5));
      alpha[y * size + x] = gradient * clip;
    }
  }
  const sigma = ratio * disc;
  if (sigma > 0.25) {
    const reach = Math.ceil(sigma * 3);
    const kernel = new Float32Array(reach * 2 + 1);
    let total = 0;
    for (let offset = -reach; offset <= reach; offset += 1) {
      const weight = Math.exp(-(offset * offset) / (2 * sigma * sigma));
      kernel[offset + reach] = weight;
      total += weight;
    }
    for (let index = 0; index < kernel.length; index += 1)
      kernel[index] /= total;
    const scratch = new Float32Array(alpha.length);
    blurAxis(alpha, scratch, size, kernel, true);
    const blurred = new Float32Array(alpha.length);
    blurAxis(scratch, blurred, size, kernel, false);
    alpha = blurred;
  }
  masks.set(level, alpha);
  return alpha;
}

/** Colored sprites of the levels in use. A busy four-color trail uses about
 * 150; older entries are dropped in bulk beyond the cap (marks keep drawing
 * the sprite they hold). */
const MAX_SPRITES = 1024;
const sprites = new Map<string, HTMLCanvasElement | null>();

const spriteKey = (color: string, level: number) => `${level}|${color}`;

export function hasTrailSprite(color: string, level: number) {
  return sprites.has(spriteKey(color, level));
}

export function trailSprite(
  color: string,
  level: number,
): HTMLCanvasElement | null {
  const key = spriteKey(color, level);
  const cached = sprites.get(key);
  if (cached !== undefined) return cached;
  let sprite: HTMLCanvasElement | null = null;
  if (typeof document !== "undefined") {
    const size = trailSpriteSize(level);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (context) {
      const mask = trailSpriteMask(level);
      const pixels = context.createImageData(size, size);
      for (let index = 0; index < mask.length; index += 1) {
        const offset = index * 4;
        pixels.data[offset] = 255;
        pixels.data[offset + 1] = 255;
        pixels.data[offset + 2] = 255;
        pixels.data[offset + 3] = Math.round(mask[index] * 255);
      }
      context.putImageData(pixels, 0, 0);
      // Tint the white coverage with the authored CSS color, keeping its alpha.
      context.globalCompositeOperation = "source-in";
      context.fillStyle = color;
      context.fillRect(0, 0, size, size);
      sprite = canvas;
    }
  }
  if (sprites.size >= MAX_SPRITES) {
    let drop = MAX_SPRITES / 4;
    for (const stale of sprites.keys()) {
      sprites.delete(stale);
      drop -= 1;
      if (drop <= 0) break;
    }
  }
  sprites.set(key, sprite);
  return sprite;
}

/** Canvas composite operation and CSS blend for one of the authored modes. */
export function trailBlend(blendMode: string): {
  key: "screen" | "lighter" | "normal";
  composite: GlobalCompositeOperation;
  css: string;
} {
  if (blendMode === "lighter")
    return { key: "lighter", composite: "lighter", css: "plus-lighter" };
  if (blendMode === "screen")
    return { key: "screen", composite: "screen", css: "screen" };
  return { key: "normal", composite: "source-over", css: "normal" };
}
