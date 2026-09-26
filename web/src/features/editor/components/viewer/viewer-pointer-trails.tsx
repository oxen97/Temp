import {
  forwardRef,
  memo,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";

import {
  trimTrailParticles,
  type ViewerTrailParticle,
} from "@/features/editor/lib/viewer-generated-effects";
import {
  trailBlend,
  trailBlurRatioIndex,
  trailMarkFrame,
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
/** How often the drawing scale is re-read while marks keep animating. */
const SCALE_REFRESH_MS = 1000;

type Rect = { left: number; top: number; right: number; bottom: number };

type BlendLayer = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D | null;
  composite: GlobalCompositeOperation;
  dirty: Rect | null;
  /** Backing store is released while no marks are alive. */
  allocated: boolean;
};

/**
 * Draws every mark into one canvas per blend mode. A mark is a pre-blurred
 * sprite, so the per-frame cost is one image draw per mark: no DOM node, CSS
 * filter or blend layer per mark. React never renders during the animation.
 */
class TrailLayer {
  private particles: ViewerTrailParticle[] = [];
  private limits = new Map<string, number>();
  private layers = new Map<string, BlendLayer>();
  private frame: number | null = null;
  private disposed = false;
  private pixelScale = 1;
  private scaleReadAt = -Infinity;
  private counts = { live: -1, retiring: -1 };

  constructor(private container: ViewerPointerTrailsElement) {
    container.amousTrails = { snapshot: (now) => this.snapshot(now) };
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
    const blend = trailBlend(blendMode);
    const existing = this.layers.get(blend.key);
    if (existing) return existing;
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
      dirty: null,
      allocated: false,
    };
    this.layers.set(blend.key, layer);
    return layer;
  }

  /** Canvas pixels per artboard pixel: preview scale × device pixel ratio. */
  private readPixelScale(now: number) {
    if (now - this.scaleReadAt < SCALE_REFRESH_MS) return;
    this.scaleReadAt = now;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const rect = this.container.getBoundingClientRect();
    const preview = width > 0 && rect.width > 0 ? rect.width / width : 1;
    const device =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
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
    const width = Math.max(
      1,
      Math.round(this.container.clientWidth * this.pixelScale),
    );
    const height = Math.max(
      1,
      Math.round(this.container.clientHeight * this.pixelScale),
    );
    if (layer.canvas.width !== width) layer.canvas.width = width;
    if (layer.canvas.height !== height) layer.canvas.height = height;
    layer.context = layer.canvas.getContext("2d");
    layer.dirty = { left: 0, top: 0, right: width, bottom: height };
    layer.allocated = true;
  }

  /** Frees the backing stores once every mark has faded. */
  private release() {
    for (const layer of this.layers.values()) {
      if (!layer.allocated) continue;
      layer.canvas.width = 0;
      layer.canvas.height = 0;
      layer.context = null;
      layer.dirty = null;
      layer.allocated = false;
    }
  }

  private draw(now: number) {
    this.readPixelScale(now);
    const frames = this.particles.map((particle) =>
      trailMarkFrame(particle, now),
    );
    const drawn = new Map<BlendLayer, Rect | null>();
    for (const layer of this.layers.values()) drawn.set(layer, null);
    for (const mark of frames) {
      const layer = this.layerFor(mark.blendMode);
      if (!layer.allocated) this.allocate(layer);
      if (!drawn.has(layer)) drawn.set(layer, null);
    }
    const scale = this.pixelScale;
    for (const [layer] of drawn) {
      if (!layer.allocated) continue;
      const context = layer.context;
      if (!context) continue;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      // Only the area marks covered in the previous frame needs clearing.
      if (layer.dirty) {
        context.clearRect(
          layer.dirty.left,
          layer.dirty.top,
          layer.dirty.right - layer.dirty.left,
          layer.dirty.bottom - layer.dirty.top,
        );
      }
      context.globalCompositeOperation = layer.composite;
    }
    for (const mark of frames) {
      if (mark.opacity <= 0.003 || mark.diameter <= 0) continue;
      const layer = this.layerFor(mark.blendMode);
      const context = layer.context;
      if (!context) continue;
      const ratioIndex = trailBlurRatioIndex(mark.blur, mark.diameter);
      const sprite = trailSprite(mark.color, ratioIndex);
      if (!sprite) continue;
      const extent = trailSpriteExtent(mark.diameter, ratioIndex) * scale;
      const left = mark.x * scale - extent / 2;
      const top = mark.y * scale - extent / 2;
      context.globalAlpha = Math.min(1, mark.opacity);
      context.drawImage(sprite, left, top, extent, extent);
      const bounds = drawn.get(layer) ?? null;
      drawn.set(layer, {
        left: Math.min(bounds?.left ?? Infinity, Math.floor(left) - 1),
        top: Math.min(bounds?.top ?? Infinity, Math.floor(top) - 1),
        right: Math.max(
          bounds?.right ?? -Infinity,
          Math.ceil(left + extent) + 1,
        ),
        bottom: Math.max(
          bounds?.bottom ?? -Infinity,
          Math.ceil(top + extent) + 1,
        ),
      });
    }
    for (const [layer, bounds] of drawn) layer.dirty = bounds;
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
