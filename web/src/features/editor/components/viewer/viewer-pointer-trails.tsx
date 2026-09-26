import {
  forwardRef,
  memo,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";

import {
  trailParticleOpacity,
  trimTrailParticles,
  type ViewerTrailParticle,
} from "@/features/editor/lib/viewer-generated-effects";
import {
  hasTrailSprite,
  TRAIL_BLUR_SCALE,
  trailBlend,
  trailBlurLevel,
  trailMarkFrame,
  trailMarkScale,
  trailSprite,
  trailSpriteExtent,
  type TrailMarkFrame,
} from "@/features/editor/lib/viewer-trail-sprites";

export type ViewerPointerTrailsHandle = {
  append: (particles: ViewerTrailParticle[], now: number) => void;
  /** Current marks as drawn, for tests and diagnostics. */
  snapshot: (now?: number) => TrailMarkFrame[];
};

/** Exposed on the layer element so browser tests can read what is drawn. */
export type ViewerPointerTrailsElement = HTMLDivElement & {
  amousTrails?: { snapshot: (now?: number) => TrailMarkFrame[] };
};

/** Backing-store budget per blend layer (about 4K at 2× on a large artboard). */
const MAX_BACKING_PIXELS = 3840 * 2160;
/** Sprites built per frame for marks moving to a new blur level. A mark whose
 * next level is not built yet keeps its current sprite a frame longer, so the
 * first seconds of drawing never stall on sprite work. */
const SPRITES_PER_FRAME = 4;
/** A layer whose sharpest mark is blurred by at least this many device pixels
 * is drawn at half resolution: a quarter of the pixels to fill and composite,
 * with no visible difference in a glow that soft. Hysteresis avoids flapping. */
const SOFT_SIGMA_ENTER = 4;
const SOFT_SIGMA_EXIT = 3.5;
const SOFT_RESOLUTION = 0.5;

type Rect = { left: number; top: number; right: number; bottom: number };

type BlendLayer = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D | null;
  composite: GlobalCompositeOperation;
  /** Canvas pixels per device pixel (1, or less for soft glows). */
  resolution: number;
  /** Canvas pixels per artboard pixel at the current allocation. */
  scale: number;
  /** Smallest authored blur among this frame's marks. */
  minBlur: number;
  /** Area marks covered in the previous frame, cleared before the next. */
  dirty: Rect;
  hasDirty: boolean;
  /** Area covered in the frame being drawn. */
  next: Rect;
  hasNext: boolean;
  /** Backing store is released while no marks are alive. */
  allocated: boolean;
};

type HeldSprite = { level: number; sprite: HTMLCanvasElement | null };

const emptyRect = (): Rect => ({
  left: Infinity,
  top: Infinity,
  right: -Infinity,
  bottom: -Infinity,
});

/**
 * Draws every mark into one canvas per blend mode. A mark is a pre-blurred
 * sprite, so the per-frame cost is one image draw per mark: no DOM node, CSS
 * filter or blend layer per mark. React never renders during the animation,
 * and the frame loop allocates nothing per mark.
 */
class TrailLayer {
  private particles: ViewerTrailParticle[] = [];
  private limits = new Map<string, number>();
  private layers = new Map<string, BlendLayer>();
  /** Authored blend mode → its layer, without re-deriving it per mark. */
  private layerByMode = new Map<string, BlendLayer>();
  private held = new WeakMap<ViewerTrailParticle, HeldSprite>();
  private frame: number | null = null;
  private disposed = false;
  private pixelScale = 1;
  private scaleStale = true;
  private devicePixelRatio = 0;
  private counts = { live: -1, retiring: -1 };
  private readonly onResize = () => {
    this.scaleStale = true;
  };

  constructor(private container: ViewerPointerTrailsElement) {
    container.amousTrails = { snapshot: (now) => this.snapshot(now) };
    window.addEventListener("resize", this.onResize);
    this.writeCounts();
  }

  setLimits(limits: Map<string, number>) {
    this.limits = limits;
  }

  append(particles: ViewerTrailParticle[], now: number) {
    if (this.disposed || !particles.length) return;
    this.particles.push(...particles);
    // Pointer events are frame-aligned, so the next display frame draws the
    // new samples together with the aging marks: one canvas pass per frame.
    this.particles = trimTrailParticles(this.particles, now, this.limits);
    this.writeCounts();
    this.schedule();
  }

  snapshot(now = performance.now()): TrailMarkFrame[] {
    return trimTrailParticles(this.particles, now, this.limits).map(
      (particle) => trailMarkFrame(particle, now),
    );
  }

  private layerFor(blendMode: string): BlendLayer {
    const known = this.layerByMode.get(blendMode);
    if (known) return known;
    const blend = trailBlend(blendMode);
    const existing = this.layers.get(blend.key);
    if (existing) {
      this.layerByMode.set(blendMode, existing);
      return existing;
    }
    const canvas = document.createElement("canvas");
    canvas.className = "viewer-pointer-trail-canvas";
    canvas.dataset.trailBlend = blend.key;
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      height: "100%",
      left: "0",
      mixBlendMode: blend.css,
      pointerEvents: "none",
      position: "absolute",
      top: "0",
      width: "100%",
    });
    this.container.appendChild(canvas);
    const layer: BlendLayer = {
      canvas,
      context: null,
      composite: blend.composite,
      resolution: 1,
      scale: 1,
      minBlur: Infinity,
      dirty: emptyRect(),
      hasDirty: false,
      next: emptyRect(),
      hasNext: false,
      allocated: false,
    };
    this.layers.set(blend.key, layer);
    this.layerByMode.set(blendMode, layer);
    return layer;
  }

  /** Canvas pixels per artboard pixel: preview scale × device pixel ratio.
   * Layout is read only after a resize, a display change or an idle period;
   * reading it every frame would force a layout pass while the scene animates. */
  private readPixelScale() {
    const device =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    if (!this.scaleStale && device === this.devicePixelRatio) return;
    this.scaleStale = false;
    this.devicePixelRatio = device;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const rect = this.container.getBoundingClientRect();
    const preview = width > 0 && rect.width > 0 ? rect.width / width : 1;
    let scale = Math.max(0.25, preview * device);
    const pixels = width * height * scale * scale;
    if (pixels > MAX_BACKING_PIXELS)
      scale *= Math.sqrt(MAX_BACKING_PIXELS / pixels);
    if (Math.abs(scale - this.pixelScale) > 0.01) {
      this.pixelScale = scale;
      for (const layer of this.layers.values())
        if (layer.allocated) this.allocate(layer);
    }
  }

  private allocate(layer: BlendLayer) {
    layer.scale = this.pixelScale * layer.resolution;
    const width = Math.max(
      1,
      Math.round(this.container.clientWidth * layer.scale),
    );
    const height = Math.max(
      1,
      Math.round(this.container.clientHeight * layer.scale),
    );
    if (layer.canvas.width !== width) layer.canvas.width = width;
    if (layer.canvas.height !== height) layer.canvas.height = height;
    layer.context = layer.canvas.getContext("2d");
    // A resized backing store starts blank; nothing is left to clear.
    layer.hasDirty = false;
    layer.allocated = true;
  }

  /** Frees the backing stores once every mark has faded. */
  private release() {
    for (const layer of this.layers.values()) {
      if (!layer.allocated) continue;
      layer.canvas.width = 0;
      layer.canvas.height = 0;
      layer.context = null;
      layer.hasDirty = false;
      layer.allocated = false;
    }
    // The preview may have been resized while nothing was drawn.
    this.scaleStale = true;
  }

  /** The sprite for `level`, building at most a few new ones per frame. */
  private spriteFor(
    particle: ViewerTrailParticle,
    level: number,
    budget: { left: number },
  ): HeldSprite {
    const held = this.held.get(particle);
    if (held && held.level === level) return held;
    const built = hasTrailSprite(particle.color, level);
    if (held && !built && budget.left <= 0) return held;
    if (!built) budget.left -= 1;
    const next = { level, sprite: trailSprite(particle.color, level) };
    this.held.set(particle, next);
    return next;
  }

  /** Half resolution for a soft layer, full resolution once a sharper mark
   * joins it. Every frame repaints all marks, so a reallocation never shows. */
  private resolutionFor(layer: BlendLayer) {
    if (layer.minBlur === Infinity) return layer.resolution;
    const sigma = layer.minBlur * TRAIL_BLUR_SCALE * this.pixelScale;
    if (layer.resolution < 1)
      return sigma < SOFT_SIGMA_EXIT ? 1 : layer.resolution;
    return sigma >= SOFT_SIGMA_ENTER ? SOFT_RESOLUTION : 1;
  }

  private draw(now: number) {
    this.readPixelScale();
    for (const layer of this.layers.values()) layer.minBlur = Infinity;
    for (const particle of this.particles) {
      const layer = this.layerFor(particle.blendMode);
      layer.minBlur = Math.min(layer.minBlur, Math.max(0, particle.blur));
    }
    for (const layer of this.layers.values()) {
      layer.hasNext = false;
      const resolution = this.resolutionFor(layer);
      if (resolution !== layer.resolution) {
        layer.resolution = resolution;
        if (layer.allocated) this.allocate(layer);
      }
      const context = layer.context;
      if (!layer.allocated || !context) continue;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      // Only the area marks covered in the previous frame needs clearing.
      if (layer.hasDirty) {
        const { left, top, right, bottom } = layer.dirty;
        context.clearRect(left, top, right - left, bottom - top);
      }
      context.globalCompositeOperation = layer.composite;
    }
    const budget = { left: SPRITES_PER_FRAME };
    for (const particle of this.particles) {
      const opacity = trailParticleOpacity(particle, now);
      const diameter =
        particle.size * Math.max(0, trailMarkScale(particle, now));
      if (opacity <= 0.003 || diameter <= 0) continue;
      const layer = this.layerFor(particle.blendMode);
      if (!layer.allocated) {
        this.allocate(layer);
        const context = layer.context;
        if (context) context.globalCompositeOperation = layer.composite;
      }
      const context = layer.context;
      if (!context) continue;
      const level = trailBlurLevel(
        Math.max(0, particle.blur) * TRAIL_BLUR_SCALE,
        diameter,
      );
      const { level: drawnLevel, sprite } = this.spriteFor(
        particle,
        level,
        budget,
      );
      if (!sprite) continue;
      // Sized by the level actually drawn, so the disc keeps its diameter.
      const scale = layer.scale;
      const extent = trailSpriteExtent(diameter, drawnLevel) * scale;
      const left = particle.x * scale - extent / 2;
      const top = particle.y * scale - extent / 2;
      context.globalAlpha = Math.min(1, opacity);
      context.drawImage(sprite, left, top, extent, extent);
      const next = layer.next;
      if (!layer.hasNext) {
        next.left = Infinity;
        next.top = Infinity;
        next.right = -Infinity;
        next.bottom = -Infinity;
        layer.hasNext = true;
      }
      next.left = Math.min(next.left, Math.floor(left) - 1);
      next.top = Math.min(next.top, Math.floor(top) - 1);
      next.right = Math.max(next.right, Math.ceil(left + extent) + 1);
      next.bottom = Math.max(next.bottom, Math.ceil(top + extent) + 1);
    }
    for (const layer of this.layers.values()) {
      // Swap the rectangles instead of allocating new ones.
      const covered = layer.next;
      layer.next = layer.dirty;
      layer.dirty = covered;
      layer.hasDirty = layer.hasNext;
    }
    if (!this.particles.length) this.release();
    this.writeCounts();
  }

  private writeCounts() {
    let retiring = 0;
    for (const particle of this.particles)
      if (particle.retiringAt !== undefined) retiring += 1;
    const live = this.particles.length - retiring;
    if (live === this.counts.live && retiring === this.counts.retiring) return;
    this.counts = { live, retiring };
    this.container.dataset.trailLive = String(live);
    this.container.dataset.trailRetiring = String(retiring);
  }

  private animate = (now: number) => {
    this.frame = null;
    if (this.disposed) return;
    this.particles = trimTrailParticles(this.particles, now, this.limits);
    this.draw(now);
    this.schedule();
  };

  private schedule() {
    if (!this.disposed && this.frame === null && this.particles.length) {
      this.frame = requestAnimationFrame(this.animate);
    }
  }

  dispose() {
    this.disposed = true;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.particles = [];
    this.layers.clear();
    this.layerByMode.clear();
    window.removeEventListener("resize", this.onResize);
    delete this.container.amousTrails;
    this.container.replaceChildren();
  }
}

export const ViewerPointerTrails = memo(
  forwardRef<
    ViewerPointerTrailsHandle,
    {
      limits: Map<string, number>;
    }
  >(function ViewerPointerTrails({ limits }, ref) {
    const containerRef = useRef<ViewerPointerTrailsElement>(null);
    const layerRef = useRef<TrailLayer | null>(null);
    useImperativeHandle(
      ref,
      () => ({
        append: (particles, now) => layerRef.current?.append(particles, now),
        snapshot: (now) => layerRef.current?.snapshot(now) ?? [],
      }),
      [],
    );
    useLayoutEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const layer = new TrailLayer(container);
      layerRef.current = layer;
      return () => {
        layer.dispose();
        layerRef.current = null;
      };
    }, []);
    useLayoutEffect(() => {
      layerRef.current?.setLimits(limits);
    }, [limits]);
    return (
      <div
        aria-hidden="true"
        className="viewer-pointer-trails"
        ref={containerRef}
        style={{
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          position: "absolute",
          zIndex: 900,
        }}
      />
    );
  }),
);
