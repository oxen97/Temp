import { describe, expect, it } from "vitest";

import {
  InteractionPhysicsWorld,
  metersToPx,
  pxToMeters,
  type RapierApi,
} from "@/features/editor/lib/interaction-physics";

// Actual gravity and collision simulation remains browser-tested: loading
// Rapier's WASM in the parallel Vitest suite is slow and flaky. These tests
// cover the coordinate bridge and the contract used to construct that world.
describe("interaction physics units", () => {
  it("maps pixels and meters", () => {
    expect(pxToMeters(100)).toBe(1);
    expect(metersToPx(1)).toBe(100);
    expect(metersToPx(pxToMeters(250))).toBeCloseTo(250);
    expect(pxToMeters(0)).toBe(0);
  });
});

function createRapierContractDouble() {
  type Body = {
    kind: "fixed" | "dynamic";
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    angle: number;
    translation: () => { x: number; y: number };
    rotation: () => number;
  };
  type BodyDescription = Pick<Body, "kind" | "position" | "velocity"> & {
    setTranslation: (x: number, y: number) => BodyDescription;
    setLinvel: (x: number, y: number) => BodyDescription;
  };
  type ColliderDescription = {
    kind?: "cuboid" | "ball" | "round-cuboid" | "hull";
    size: [number, number];
    radius?: number;
    points?: number[];
    restitution: number;
    setRestitution: (value: number) => ColliderDescription;
  };
  const bodies: Body[] = [];
  const colliders: { description: ColliderDescription; body: Body }[] = [];
  const removed: Body[] = [];
  let steps = 0;
  let freed = false;
  let gravity: { x: number; y: number } | null = null;

  const bodyDescription = (kind: Body["kind"]): BodyDescription => ({
    kind,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    setTranslation(x, y) {
      this.position = { x, y };
      return this;
    },
    setLinvel(x, y) {
      this.velocity = { x, y };
      return this;
    },
  });
  const rapier = {
    RigidBodyDesc: {
      fixed: () => bodyDescription("fixed"),
      dynamic: () => bodyDescription("dynamic"),
    },
    ColliderDesc: {
      cuboid: (x: number, y: number): ColliderDescription => ({
        kind: "cuboid",
        size: [x, y],
        restitution: 0,
        setRestitution(value) {
          this.restitution = value;
          return this;
        },
      }),
      ball: (radius: number): ColliderDescription => ({
        kind: "ball",
        size: [radius, radius],
        radius,
        restitution: 0,
        setRestitution(value) {
          this.restitution = value;
          return this;
        },
      }),
      roundCuboid: (x: number, y: number, radius: number): ColliderDescription => ({
        kind: "round-cuboid",
        size: [x, y],
        radius,
        restitution: 0,
        setRestitution(value) {
          this.restitution = value;
          return this;
        },
      }),
      convexHull: (points: Float32Array): ColliderDescription => ({
        kind: "hull",
        size: [0, 0],
        points: [...points],
        restitution: 0,
        setRestitution(value) {
          this.restitution = value;
          return this;
        },
      }),
    },
    World: class {
      constructor(options: { x: number; y: number }) {
        gravity = options;
      }
      createRigidBody(description: BodyDescription): Body {
        const body: Body = {
          kind: description.kind,
          position: description.position,
          velocity: description.velocity,
          angle: 0,
          translation() {
            return this.position;
          },
          rotation() {
            return this.angle;
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
  } as unknown as RapierApi;
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

describe("interaction 2D physics world contract", () => {
  it("builds four artboard walls and converts a released body's coordinates and velocity", () => {
    const double = createRapierContractDouble();
    const world = new InteractionPhysicsWorld(double.rapier, {
      width: 800,
      height: 600,
    });
    expect(double.bodies.filter((body) => body.kind === "fixed")).toHaveLength(
      4,
    );
    expect(double.colliders).toHaveLength(4);
    expect(double.gravity).toEqual({ x: 0, y: 9.81 });
    expect(double.bodies[0].position).toEqual({ x: 4, y: 6.3 });
    expect(double.colliders[0].description.size).toEqual([4.6, 0.3]);

    world.addBody({
      id: "shape-a",
      centerX: 200,
      centerY: 150,
      width: 100,
      height: 50,
      bounciness: 4,
      velocityX: 300,
      velocityY: -100,
    });
    expect(world.hasBody("shape-a")).toBe(true);
    const dynamic = double.bodies.at(-1)!;
    expect(dynamic.kind).toBe("dynamic");
    expect(dynamic.position).toEqual({ x: 2, y: 1.5 });
    expect(dynamic.velocity).toEqual({ x: 3, y: -1 });
    expect(double.colliders.at(-1)?.description.size).toEqual([0.5, 0.25]);
    expect(double.colliders.at(-1)?.description.restitution).toBe(1);

    dynamic.position = { x: 2.5, y: 3 };
    dynamic.angle = Math.PI / 2;
    expect(world.read("shape-a")).toEqual({ x: 250, y: 300, rotation: 90 });
    world.step();
    expect(double.steps).toBe(1);
    world.dispose();
    expect(double.freed).toBe(true);
    expect(world.hasBody("shape-a")).toBe(false);
  });

  it("does not duplicate bodies and removes a released body", () => {
    const double = createRapierContractDouble();
    const world = new InteractionPhysicsWorld(double.rapier, {
      width: 800,
      height: 600,
    });
    const input = {
      id: "shape-a",
      centerX: 100,
      centerY: 100,
      width: 10,
      height: 10,
      bounciness: -1,
    };
    world.addBody(input);
    world.addBody(input);
    expect(
      double.bodies.filter((body) => body.kind === "dynamic"),
    ).toHaveLength(1);
    expect(double.colliders.at(-1)?.description.restitution).toBe(0);
    world.removeBody("shape-a");
    expect(double.removed).toHaveLength(1);
    expect(world.hasBody("shape-a")).toBe(false);
    expect(world.read("shape-a")).toBeNull();
    world.dispose();
  });

  it("builds a collider that matches the drawn shape", () => {
    const double = createRapierContractDouble();
    const world = new InteractionPhysicsWorld(double.rapier, {
      width: 800,
      height: 600,
    });
    const base = { centerX: 100, centerY: 100, width: 80, height: 40, bounciness: 0.5 };
    world.addBody({ ...base, id: "ball", shape: { kind: "ball", radius: 40 } });
    expect(double.colliders.at(-1)?.description).toMatchObject({
      kind: "ball",
      radius: 0.4,
      restitution: 0.5,
    });
    world.addBody({ ...base, id: "pill", shape: { kind: "round-box", radius: 10 } });
    const pill = double.colliders.at(-1)!.description;
    expect(pill.kind).toBe("round-cuboid");
    expect(pill.radius).toBeCloseTo(0.1);
    expect(pill.size[0]).toBeCloseTo(0.3);
    expect(pill.size[1]).toBeCloseTo(0.1);
    world.addBody({
      ...base,
      id: "triangle",
      shape: {
        kind: "hull",
        points: [
          { x: 0, y: -20 },
          { x: 40, y: 20 },
          { x: -40, y: 20 },
        ],
      },
    });
    expect(double.colliders.at(-1)?.description.kind).toBe("hull");
    expect(double.colliders.at(-1)?.description.points).toEqual([
      0, -0.2, 0.4, 0.2, -0.4, 0.2,
    ].map((value) => expect.closeTo(value)));
    world.addBody({ ...base, id: "box" });
    expect(double.colliders.at(-1)?.description).toMatchObject({
      kind: "cuboid",
      size: [0.4, 0.2],
    });
    world.dispose();
  });
});
