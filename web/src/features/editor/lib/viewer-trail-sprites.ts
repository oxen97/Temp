import {
  trailParticleOpacity,
  type ViewerTrailParticle,
} from "@/features/editor/lib/viewer-generated-effects";

/** Authored trail blur → world-pixel Gaussian radius (unchanged from the
 * previous CSS `blur()` rendering, which used the same factor). */
export const TRAIL_BLUR_SCALE = 0.45;

/** Sprite edge in pixels. Marks are soft, so one resolution serves every size. */
export const TRAIL_SPRITE_SIZE = 128;

/** A mark's blurred glow reaches about three radii beyond its disc. */
const GLOW_REACH = 3;

/** Blur-to-diameter ratios with a pre-rendered sprite. A mark uses the nearest
 * ratio; neighbouring steps are visually indistinguishable at trail sizes. */
export const TRAIL_BLUR_RATIOS = [
  0, 0.03, 0.06, 0.09, 0.12, 0.16, 0.2, 0.25, 0.3, 0.36, 0.43, 0.5, 0.6, 0.7,
  0.85, 1, 1.25, 1.5,
] as const;

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

/** Geometry and opacity of one mark at `now`; the renderer and tests share it. */
export function trailMarkFrame(
  particle: ViewerTrailParticle,
  now: number,
): TrailMarkFrame {
  const progress = Math.max(
    0,
    Math.min(1, (now - particle.createdAt) / (particle.lifespan * 1000)),
  );
  const scale = 1 + (particle.growth - 1) * progress;
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

export function trailBlurRatioIndex(blur: number, diameter: number): number {
  if (!(blur > 0) || !(diameter > 0)) return 0;
  const ratio = blur / diameter;
  let best = 0;
  for (let index = 1; index < TRAIL_BLUR_RATIOS.length; index += 1) {
    if (
      Math.abs(TRAIL_BLUR_RATIOS[index] - ratio) <
      Math.abs(TRAIL_BLUR_RATIOS[best] - ratio)
    )
      best = index;
  }
  return best;
}

/** Drawn sprite edge for a disc of `diameter`, including its glow margin. */
export function trailSpriteExtent(diameter: number, ratioIndex: number) {
  return diameter * (1 + 2 * GLOW_REACH * TRAIL_BLUR_RATIOS[ratioIndex]);
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
      for (let offset = -radius; offset <= radius; offset += 1) {
        const x = horizontal ? column + offset : column;
        const y = horizontal ? row : row + offset;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        sum += source[y * size + x] * kernel[offset + radius];
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
export function trailSpriteMask(ratioIndex: number): Float32Array {
  const cached = masks.get(ratioIndex);
  if (cached) return cached;
  const size = TRAIL_SPRITE_SIZE;
  const ratio = TRAIL_BLUR_RATIOS[ratioIndex];
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
  masks.set(ratioIndex, alpha);
  return alpha;
}

/** Colored sprites are cheap to rebuild; the cap bounds pathological color lists. */
const MAX_SPRITES = 256;
const sprites = new Map<string, HTMLCanvasElement | null>();

export function trailSprite(
  color: string,
  ratioIndex: number,
): HTMLCanvasElement | null {
  const key = `${ratioIndex}|${color}`;
  if (sprites.has(key)) return sprites.get(key)!;
  let sprite: HTMLCanvasElement | null = null;
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = TRAIL_SPRITE_SIZE;
    canvas.height = TRAIL_SPRITE_SIZE;
    const context = canvas.getContext("2d");
    if (context) {
      const mask = trailSpriteMask(ratioIndex);
      const pixels = context.createImageData(
        TRAIL_SPRITE_SIZE,
        TRAIL_SPRITE_SIZE,
      );
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
      context.fillRect(0, 0, TRAIL_SPRITE_SIZE, TRAIL_SPRITE_SIZE);
      sprite = canvas;
    }
  }
  if (sprites.size >= MAX_SPRITES) sprites.clear();
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
