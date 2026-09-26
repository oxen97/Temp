/**
 * Rapier-backed 2D physics for the interaction runtime (Stage 2 spike).
 *
 * Physics motions (gravity/bounce/inertia) can't be expressed as the pure
 * per-render transform the rest of the runtime uses — they need a persistent
 * simulation. This module owns that: a lazily-loaded Rapier world that holds a
 * dynamic body per released element plus static artboard bounds, stepped each
 * frame by the viewer. Simple move/rotate/scale effects do NOT go through here
 * (that would be wasteful) — only physics-driven motion does.
 *
 * Units: the editor works in artboard pixels (y grows downward on screen); the
 * world works in meters. `PIXELS_PER_METER` bridges the two, and gravity is +y
 * (downward in screen space).
 */
import type RAPIER from "@dimforge/rapier2d-compat";

export type RapierApi = typeof RAPIER;

export const PIXELS_PER_METER = 100;

export function pxToMeters(px: number): number {
  return px / PIXELS_PER_METER;
}

export function metersToPx(meters: number): number {
  return meters * PIXELS_PER_METER;
}

let rapierPromise: Promise<RapierApi> | null = null;

/** Lazily loads and initializes Rapier (WASM). Client-only; safe to call repeatedly. */
export async function loadRapier(): Promise<RapierApi> {
  if (!rapierPromise) {
    rapierPromise = import("@dimforge/rapier2d-compat").then(async (module) => {
      const rapier = module.default;
      await rapier.init();
      return rapier;
    });
  }
  return rapierPromise;
}

/**
 * Collider outline in artboard px around the body center. Matching the drawn
 * shape lets round and pointed shapes rest against each other without the gaps
 * a bounding box leaves at their corners.
 */
export type PhysicsShape =
  | { kind: "box" }
  | { kind: "ball"; radius: number }
  | { kind: "round-box"; radius: number }
  | { kind: "hull"; points: { x: number; y: number }[] };

export type PhysicsBodyInput = {
  id: string;
  /** Element center in artboard px. */
  centerX: number;
  centerY: number;
  /** Element size in px. */
  width: number;
  height: number;
  /** Restitution 0..1. */
  bounciness: number;
  /** Optional initial velocity in px/s. */
  velocityX?: number;
  velocityY?: number;
  /** Defaults to the bounding box. */
  shape?: PhysicsShape;
};

export type PhysicsReadout = {
  /** Body center in artboard px. */
  x: number;
  y: number;
  /** Rotation in degrees. */
  rotation: number;
};

export type PhysicsWorldOptions = {
  /** Artboard size in px — static bounds are built around it. */
  width: number;
  height: number;
  /** Gravity in m/s² (screen space: +y is down). Defaults to 0 / 9.81. */
  gravityX?: number;
  gravityY?: number;
  wallThickness?: number;
  wallBounciness?: number;
};

/**
 * A 2D world sized to the artboard, with static walls on all four sides and a
 * dynamic body per released element.
 */
export class InteractionPhysicsWorld {
  private readonly rapier: RapierApi;
  private readonly world: RAPIER.World;
  private readonly bodies = new Map<string, RAPIER.RigidBody>();

  constructor(rapier: RapierApi, options: PhysicsWorldOptions) {
    this.rapier = rapier;
    this.world = new rapier.World({
      x: options.gravityX ?? 0,
      y: options.gravityY ?? 9.81,
    });
    this.createBounds(options);
  }

  private createBounds({
    width,
    height,
    wallThickness = 60,
    wallBounciness = 0.3,
  }: PhysicsWorldOptions) {
    const w = pxToMeters(width);
    const h = pxToMeters(height);
    const t = pxToMeters(wallThickness);
    const half = t / 2;
    const addWall = (cx: number, cy: number, hx: number, hy: number) => {
      const body = this.world.createRigidBody(
        this.rapier.RigidBodyDesc.fixed().setTranslation(cx, cy),
      );
      this.world.createCollider(
        this.rapier.ColliderDesc.cuboid(hx, hy).setRestitution(wallBounciness),
        body,
      );
    };
    addWall(w / 2, h + half, w / 2 + t, half); // floor
    addWall(w / 2, -half, w / 2 + t, half); // ceiling
    addWall(-half, h / 2, half, h / 2 + t); // left
    addWall(w + half, h / 2, half, h / 2 + t); // right
  }

  hasBody(id: string): boolean {
    return this.bodies.has(id);
  }

  addBody(input: PhysicsBodyInput): void {
    if (this.bodies.has(input.id)) return;
    const desc = this.rapier.RigidBodyDesc.dynamic()
      .setTranslation(pxToMeters(input.centerX), pxToMeters(input.centerY))
      .setLinvel(
        pxToMeters(input.velocityX ?? 0),
        pxToMeters(input.velocityY ?? 0),
      );
    const body = this.world.createRigidBody(desc);
    const bounciness = Math.min(1, Math.max(0, input.bounciness));
    this.world.createCollider(
      this.colliderFor(input).setRestitution(bounciness),
      body,
    );
    this.bodies.set(input.id, body);
  }

  private colliderFor(input: PhysicsBodyInput) {
    const halfWidth = pxToMeters(Math.max(1, input.width) / 2);
    const halfHeight = pxToMeters(Math.max(1, input.height) / 2);
    const shape = input.shape ?? { kind: "box" };
    const { ColliderDesc } = this.rapier;
    if (shape.kind === "ball") {
      return ColliderDesc.ball(pxToMeters(Math.max(0.5, shape.radius)));
    }
    if (shape.kind === "round-box") {
      const radius = Math.min(pxToMeters(shape.radius), halfWidth, halfHeight);
      if (radius > 0) {
        // Rapier grows the inner box by the radius on every side.
        return ColliderDesc.roundCuboid(
          Math.max(0.001, halfWidth - radius),
          Math.max(0.001, halfHeight - radius),
          radius,
        );
      }
    }
    if (shape.kind === "hull" && shape.points.length >= 3) {
      const hull = ColliderDesc.convexHull(
        new Float32Array(
          shape.points.flatMap((point) => [
            pxToMeters(point.x),
            pxToMeters(point.y),
          ]),
        ),
      );
      if (hull) return hull;
    }
    return ColliderDesc.cuboid(halfWidth, halfHeight);
  }

  removeBody(id: string): void {
    const body = this.bodies.get(id);
    if (!body) return;
    this.world.removeRigidBody(body);
    this.bodies.delete(id);
  }

  step(): void {
    this.world.step();
  }

  read(id: string): PhysicsReadout | null {
    const body = this.bodies.get(id);
    if (!body) return null;
    const translation = body.translation();
    return {
      x: metersToPx(translation.x),
      y: metersToPx(translation.y),
      rotation: (body.rotation() * 180) / Math.PI,
    };
  }

  dispose(): void {
    this.world.free();
    this.bodies.clear();
  }
}
