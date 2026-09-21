/**
 * Rapier-backed 3D physics for the interaction runtime (Stage 3).
 *
 * The 3D counterpart of `interaction-physics.ts`. It runs in the R3F scene's
 * world coordinates (three.js, y-up), where 1 px = 1 world unit; the artboard's
 * top-left is world (0, 0) and its bottom edge is world y = -height (the scene
 * flips the editor's y-down axis). Gravity is therefore -y. Callers pass and
 * receive world-space values; this module bridges to Rapier meters.
 */
import type RAPIER from "@dimforge/rapier3d-compat";

export type Rapier3DApi = typeof RAPIER;

export const PIXELS_PER_METER = 100;

export function pxToMeters(px: number): number {
  return px / PIXELS_PER_METER;
}

export function metersToPx(meters: number): number {
  return meters * PIXELS_PER_METER;
}

let rapierPromise: Promise<Rapier3DApi> | null = null;

/** Lazily loads and initializes Rapier 3D (WASM). Client-only. */
export async function loadRapier3D(): Promise<Rapier3DApi> {
  if (!rapierPromise) {
    rapierPromise = import("@dimforge/rapier3d-compat").then(async (module) => {
      const rapier = module.default;
      await rapier.init();
      return rapier;
    });
  }
  return rapierPromise;
}

export type PhysicsBody3DInput = {
  id: string;
  /** Object center in world px (three.js coords: y-up). */
  x: number;
  y: number;
  z: number;
  /** Object size in px. */
  width: number;
  height: number;
  depth: number;
  /** Restitution 0..1. */
  bounciness: number;
};

export type Physics3DReadout = {
  /** Body center in world px. */
  position: [number, number, number];
  /** Body orientation as a quaternion [x, y, z, w]. */
  quaternion: [number, number, number, number];
};

export type Physics3DWorldOptions = {
  /** Artboard size in px. */
  width: number;
  height: number;
  /** Depth bound in px (world z spans [-depth/2, depth/2]). */
  depth?: number;
  /** Gravity in m/s² on world-y (down is negative). Defaults to -9.81. */
  gravityY?: number;
  wallThickness?: number;
  wallBounciness?: number;
};

/**
 * A 3D world sized to the artboard box (world x [0,w], y [-h,0], z [-d/2,d/2]),
 * with static bounds on all sides and a dynamic body per released object.
 */
export class InteractionPhysics3DWorld {
  private readonly rapier: Rapier3DApi;
  private readonly world: RAPIER.World;
  private readonly bodies = new Map<string, RAPIER.RigidBody>();

  constructor(rapier: Rapier3DApi, options: Physics3DWorldOptions) {
    this.rapier = rapier;
    this.world = new rapier.World({
      x: 0,
      y: options.gravityY ?? -9.81,
      z: 0,
    });
    this.createBounds(options);
  }

  private createBounds({
    width,
    height,
    depth = 1000,
    wallThickness = 80,
    wallBounciness = 0.3,
  }: Physics3DWorldOptions) {
    const w = pxToMeters(width);
    const h = pxToMeters(height);
    const d = pxToMeters(depth);
    const t = pxToMeters(wallThickness);
    const half = t / 2;
    const addWall = (
      cx: number,
      cy: number,
      cz: number,
      hx: number,
      hy: number,
      hz: number,
    ) => {
      const body = this.world.createRigidBody(
        this.rapier.RigidBodyDesc.fixed().setTranslation(cx, cy, cz),
      );
      this.world.createCollider(
        this.rapier.ColliderDesc.cuboid(hx, hy, hz).setRestitution(
          wallBounciness,
        ),
        body,
      );
    };
    // Artboard box: x in [0,w], y in [-h,0] (screen-down flipped), z in [-d/2,d/2].
    addWall(w / 2, -h - half, 0, w / 2 + t, half, d / 2 + t); // floor
    addWall(w / 2, half, 0, w / 2 + t, half, d / 2 + t); // ceiling
    addWall(-half, -h / 2, 0, half, h / 2 + t, d / 2 + t); // left
    addWall(w + half, -h / 2, 0, half, h / 2 + t, d / 2 + t); // right
    addWall(w / 2, -h / 2, -d / 2 - half, w / 2 + t, h / 2 + t, half); // back
    addWall(w / 2, -h / 2, d / 2 + half, w / 2 + t, h / 2 + t, half); // front
  }

  hasBody(id: string): boolean {
    return this.bodies.has(id);
  }

  addBody(input: PhysicsBody3DInput): void {
    if (this.bodies.has(input.id)) return;
    const body = this.world.createRigidBody(
      this.rapier.RigidBodyDesc.dynamic().setTranslation(
        pxToMeters(input.x),
        pxToMeters(input.y),
        pxToMeters(input.z),
      ),
    );
    const bounciness = Math.min(1, Math.max(0, input.bounciness));
    this.world.createCollider(
      this.rapier.ColliderDesc.cuboid(
        pxToMeters(Math.max(1, input.width) / 2),
        pxToMeters(Math.max(1, input.height) / 2),
        pxToMeters(Math.max(1, input.depth) / 2),
      ).setRestitution(bounciness),
      body,
    );
    this.bodies.set(input.id, body);
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

  read(id: string): Physics3DReadout | null {
    const body = this.bodies.get(id);
    if (!body) return null;
    const t = body.translation();
    const r = body.rotation();
    return {
      position: [metersToPx(t.x), metersToPx(t.y), metersToPx(t.z)],
      quaternion: [r.x, r.y, r.z, r.w],
    };
  }

  dispose(): void {
    this.world.free();
    this.bodies.clear();
  }
}
