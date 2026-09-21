import { describe, expect, it } from "vitest";

import {
  InteractionPhysics3DWorld,
  metersToPx,
  pxToMeters,
  type Rapier3DApi,
} from "@/features/editor/lib/interaction-physics-3d";

// Actual gravity and collision simulation remains browser-tested: loading
// Rapier's WASM in the parallel Vitest suite is slow and flaky. These tests
// cover the world-px bridge and the 3D body's/collider's construction contract.
describe("interaction physics 3D units", () => {
  it("maps pixels and meters", () => {
    expect(pxToMeters(100)).toBe(1);
    expect(metersToPx(1)).toBe(100);
    expect(metersToPx(pxToMeters(320))).toBeCloseTo(320);
    expect(pxToMeters(0)).toBe(0);
  });
});

function createRapier3DContractDouble() {
  type Vector = { x: number; y: number; z: number };
  type Body = {
    kind: "fixed" | "dynamic";
    position: Vector;
    orientation: { x: number; y: number; z: number; w: number };
    translation: () => Vector;
    rotation: () => { x: number; y: number; z: number; w: number };
  };
  type BodyDescription = Pick<Body, "kind" | "position"> & {
    setTranslation: (x: number, y: number, z: number) => BodyDescription;
  };
  type ColliderDescription = {
    size: [number, number, number];
    restitution: number;
    setRestitution: (value: number) => ColliderDescription;
  };
  const bodies: Body[] = [];
  const colliders: { description: ColliderDescription; body: Body }[] = [];
  const removed: Body[] = [];
  let steps = 0;
  let freed = false;
  let gravity: Vector | null = null;

  const bodyDescription = (kind: Body["kind"]): BodyDescription => ({
    kind,
    position: { x: 0, y: 0, z: 0 },
    setTranslation(x, y, z) {
      this.position = { x, y, z };
      return this;
    },
  });
  const rapier = {
    RigidBodyDesc: {
      fixed: () => bodyDescription("fixed"),
      dynamic: () => bodyDescription("dynamic"),
    },
    ColliderDesc: {
      cuboid: (x: number, y: number, z: number): ColliderDescription => ({
        size: [x, y, z],
        restitution: 0,
        setRestitution(value) {
          this.restitution = value;
          return this;
        },
      }),
    },
    World: class {
      constructor(options: Vector) {
        gravity = options;
      }
      createRigidBody(description: BodyDescription): Body {
        const body: Body = {
          kind: description.kind,
          position: description.position,
          orientation: { x: 0, y: 0, z: 0, w: 1 },
          translation() {
            return this.position;
          },
          rotation() {
            return this.orientation;
          },
        };
        bodies.push(body);
        return body;
      }
      createCollider(description: ColliderDescription, body: Body) {
        colliders.push({ description, body });
      }
      removeRigidBody(body: Body) {
        removed.push(body);
      }
      step() {
        steps += 1;
      }
      free() {
        freed = true;
      }
    },
  } as unknown as Rapier3DApi;
  return {
    rapier,
    bodies,
    colliders,
    removed,
    get gravity() {
      return gravity;
    },
    get steps() {
      return steps;
    },
    get freed() {
      return freed;
    },
  };
}

describe("interaction 3D physics world contract", () => {
  it("creates six artboard bounds and reads a released 3D body", () => {
    const double = createRapier3DContractDouble();
    const world = new InteractionPhysics3DWorld(double.rapier, {
      width: 800,
      height: 600,
    });
    expect(double.bodies.filter((body) => body.kind === "fixed")).toHaveLength(
      6,
    );
    expect(double.colliders).toHaveLength(6);
    expect(double.gravity).toEqual({ x: 0, y: -9.81, z: 0 });
    expect(double.bodies[0].position).toEqual({ x: 4, y: -6.4, z: 0 });
    expect(double.colliders[0].description.size).toEqual([4.8, 0.4, 5.8]);

    world.addBody({
      id: "cube-a",
      x: 200,
      y: -150,
      z: 50,
      width: 100,
      height: 80,
      depth: 60,
      bounciness: 2,
    });
    world.addBody({
      id: "cube-a",
      x: 300,
      y: -200,
      z: 70,
      width: 100,
      height: 80,
      depth: 60,
      bounciness: 2,
    });
    expect(
      double.bodies.filter((body) => body.kind === "dynamic"),
    ).toHaveLength(1);
    const body = double.bodies.at(-1)!;
    expect(body.position).toEqual({ x: 2, y: -1.5, z: 0.5 });
    expect(double.colliders.at(-1)?.description.size).toEqual([0.5, 0.4, 0.3]);
    expect(double.colliders.at(-1)?.description.restitution).toBe(1);

    body.position = { x: 2.5, y: -3, z: 0.75 };
    body.orientation = { x: 0, y: 0.5, z: 0, w: 0.866 };
    expect(world.read("cube-a")).toEqual({
      position: [250, -300, 75],
      quaternion: [0, 0.5, 0, 0.866],
    });
    world.step();
    expect(double.steps).toBe(1);
    world.removeBody("cube-a");
    expect(double.removed).toHaveLength(1);
    expect(world.read("cube-a")).toBeNull();
    world.dispose();
    expect(double.freed).toBe(true);
  });

  it("adds a single fixed 2D collision proxy and clears it on dispose", () => {
    const double = createRapier3DContractDouble();
    const world = new InteractionPhysics3DWorld(double.rapier, {
      width: 800,
      height: 600,
    });
    const proxy = {
      id: "flat-rectangle",
      x: 300,
      y: -200,
      z: 0,
      width: 120,
      height: 40,
      depth: 20,
      bounciness: -1,
    };
    world.addStaticProxy(proxy);
    world.addStaticProxy(proxy);
    expect(world.hasProxy(proxy.id)).toBe(true);
    expect(double.bodies).toHaveLength(7);
    expect(double.bodies.at(-1)?.kind).toBe("fixed");
    expect(double.bodies.at(-1)?.position).toEqual({ x: 3, y: -2, z: 0 });
    expect(double.colliders.at(-1)?.description.size).toEqual([0.6, 0.2, 0.1]);
    expect(double.colliders.at(-1)?.description.restitution).toBe(0);
    world.dispose();
    expect(world.hasProxy(proxy.id)).toBe(false);
  });
});
