import { describe, expect, it } from "vitest";

import {
  BALL_ANGULAR_DAMPING,
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
    angularDamping: number;
    angle: number;
    sleeping: boolean;
    translation: () => { x: number; y: number };
    rotation: () => number;
    isSleeping: () => boolean;
  };
  type BodyDescription = Pick<
    Body,
    "kind" | "position" | "velocity" | "angularDamping"
  > & {
    setTranslation: (x: number, y: number) => BodyDescription;
    setLinvel: (x: number, y: number) => BodyDescription;
    setAngularDamping: (value: number) => BodyDescription;
  };
  type ColliderDescription = {
    kind?: "cuboid" | "ball" | "hull";
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
    angularDamping: 0,
    setTranslation(x, y) {
      this.position = { x, y };
      return this;
    },
    setLinvel(x, y) {
      this.velocity = { x, y };
      return this;
    },
    setAngularDamping(value) {
      this.angularDamping = value;
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
          angularDamping: description.angularDamping,
          angle: 0,
          sleeping: false,
          translation() {
            return this.position;
          },
          rotation() {
            return this.angle;
          },
          isSleeping() {
            return this.sleeping;
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

  it("builds colliders that match the drawn shape", () => {
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
    // Balls get rolling resistance so they come to rest on a flat floor.
    expect(double.bodies.at(-1)?.angularDamping).toBe(BALL_ANGULAR_DAMPING);

    const before = double.colliders.length;
    world.addBody({
      ...base,
      id: "star",
      shape: {
        kind: "polygons",
        parts: [
          [
            { x: 0, y: -20 },
            { x: 40, y: 20 },
            { x: -40, y: 20 },
          ],
          [
            { x: 0, y: 20 },
            { x: 10, y: 40 },
            { x: -10, y: 40 },
          ],
        ],
      },
    });
    // Every convex piece becomes a collider on the same body.
    const pieces = double.colliders.slice(before);
    expect(pieces).toHaveLength(2);
    expect(new Set(pieces.map((piece) => piece.body)).size).toBe(1);
    expect(pieces.every((piece) => piece.description.restitution === 0.5)).toBe(true);
    expect(pieces[0].description.points).toEqual(
      [0, -0.2, 0.4, 0.2, -0.4, 0.2].map((value) => expect.closeTo(value)),
    );
    expect(double.bodies.at(-1)?.angularDamping).toBe(0);

    world.addBody({ ...base, id: "box" });
    expect(double.colliders.at(-1)?.description).toMatchObject({
      kind: "cuboid",
      size: [0.4, 0.2],
    });
    world.dispose();
  });

  it("reports rest only when every released body sleeps", () => {
    const double = createRapierContractDouble();
    const world = new InteractionPhysicsWorld(double.rapier, {
      width: 800,
      height: 600,
    });
    expect(world.isResting()).toBe(true);
    world.addBody({ id: "a", centerX: 10, centerY: 10, width: 10, height: 10, bounciness: 0 });
    world.addBody({ id: "b", centerX: 40, centerY: 10, width: 10, height: 10, bounciness: 0 });
    const [a, b] = double.bodies.filter((body) => body.kind === "dynamic");
    expect(world.isResting()).toBe(false);
    a.sleeping = true;
    expect(world.isResting()).toBe(false);
    b.sleeping = true;
    expect(world.isResting()).toBe(true);
    world.dispose();
  });
});
