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

export type ViewerPointerTrailsHandle = {
  append: (particles: ViewerTrailParticle[], now: number) => void;
};

/** Owns only the transient, aria-hidden marks. No React state or layout reads
 * are needed during animation, so the rest of the artwork stays untouched. */
class TrailLayer {
  private particles: ViewerTrailParticle[] = [];
  private nodes = new Map<number, HTMLSpanElement>();
  private limits = new Map<string, number>();
  private frame: number | null = null;
  private disposed = false;

  constructor(private container: HTMLDivElement) {}

  setLimits(limits: Map<string, number>) {
    this.limits = limits;
  }

  append(particles: ViewerTrailParticle[], now: number) {
    if (this.disposed || !particles.length) return;
    this.particles.push(...particles);
    // New samples are visible in the same pointer event; existing marks are
    // animated only once per display frame, not once per pointer sample.
    this.reconcile(now);
    this.schedule();
  }

  private createNode(particle: ViewerTrailParticle) {
    const node = document.createElement("span");
    node.className = "viewer-pointer-particle";
    node.dataset.trailInteractionId = particle.interactionId;
    Object.assign(node.style, {
      background: `radial-gradient(circle, ${particle.color} 0%, ${particle.color} 16%, transparent 76%)`,
      borderRadius: "50%",
      height: `${particle.size}px`,
      left: `${particle.x}px`,
      mixBlendMode:
        particle.blendMode === "lighter"
          ? "plus-lighter"
          : particle.blendMode === "screen"
            ? "screen"
            : "normal",
      pointerEvents: "none",
      position: "absolute",
      top: `${particle.y}px`,
      width: `${particle.size}px`,
    });
    this.nodes.set(particle.id, node);
    this.container.appendChild(node);
    return node;
  }

  private paint(
    node: HTMLSpanElement,
    particle: ViewerTrailParticle,
    now: number,
  ) {
    const progress = Math.max(
      0,
      Math.min(1, (now - particle.createdAt) / (particle.lifespan * 1000)),
    );
    const scale = 1 + (particle.growth - 1) * progress;
    node.style.transform = `translate(-50%, -50%) scale(${scale})`;
    node.style.opacity = String(trailParticleOpacity(particle, now));
    // Compensate for the growing mark so authored blur stays in artboard px.
    // In particular, don't create a filter/paint layer for the common blur=0.
    if (particle.blur > 0)
      node.style.filter = `blur(${(particle.blur * 0.45) / Math.max(0.0001, scale)}px)`;
  }

  private reconcile(now: number) {
    this.particles = trimTrailParticles(this.particles, now, this.limits);
    const liveIds = new Set<number>();
    for (const particle of this.particles) {
      liveIds.add(particle.id);
      const existing = this.nodes.get(particle.id);
      const node = existing ?? this.createNode(particle);
      if (!existing) this.paint(node, particle, now);
      if (
        particle.retiringAt !== undefined &&
        !node.hasAttribute("data-trail-retiring")
      ) {
        node.dataset.trailRetiring = "true";
      }
    }
    for (const [id, node] of this.nodes) {
      if (!liveIds.has(id)) {
        node.remove();
        this.nodes.delete(id);
      }
    }
  }

  private animate = (now: number) => {
    this.frame = null;
    if (this.disposed) return;
    this.reconcile(now);
    for (const particle of this.particles) {
      this.paint(this.nodes.get(particle.id)!, particle, now);
    }
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
    this.nodes.clear();
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
    const containerRef = useRef<HTMLDivElement>(null);
    const layerRef = useRef<TrailLayer | null>(null);
    useImperativeHandle(
      ref,
      () => ({
        append: (particles, now) => layerRef.current?.append(particles, now),
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
