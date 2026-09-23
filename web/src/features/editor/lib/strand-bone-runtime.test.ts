import { describe, expect, it } from "vitest";

import type { VectorPath } from "@/features/editor/lib/vector-types";

import {
  applyStrandSwipeImpulse,
  closestStrandBone,
  createStrandPose,
  limitStrandPoseDisplacement,
  stepStrandPose,
  strandPosePath,
  strandPoseRibbonPath,
} from "./strand-bone-runtime";

const straight: VectorPath = {
  points: [
    { x: 0, y: 0 },
    { x: 0, y: 120 },
  ],
};

const settings = { stiffness: 0.45, damping: 0.82 };

describe("createStrandPose", () => {
  it("samples a straight line with an anchored endpoint", () => {
    const pose = createStrandPose(straight, { anchor: "top", spacing: 12 });
    expect(pose.points.length).toBe(11);
    expect(pose.anchorIndex).toBe(0);
    expect(pose.points[0]).toEqual({ x: 0, y: 0 });
    expect(pose.points.at(-1)).toEqual({ x: 0, y: 120 });
    expect(straight.points).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 120 },
    ]);
  });

  it("samples existing Bezier handles and anchors a reversed path", () => {
    const curved: VectorPath = {
      points: [
        { x: 0, y: 120, handleOut: { x: 80, y: 90 } },
        { x: 0, y: 0, handleIn: { x: 80, y: 30 } },
      ],
    };
    const pose = createStrandPose(curved, { anchor: "top" });
    expect(pose.anchorIndex).toBe(pose.points.length - 1);
    expect(Math.max(...pose.points.map((point) => point.x))).toBeGreaterThan(
      40,
    );
    expect(curved.points[0].handleOut).toEqual({ x: 80, y: 90 });
  });
});

describe("strand bone interaction", () => {
  it("passes swipe momentum to the free end without moving the anchor", () => {
    const pose = createStrandPose(straight, { anchor: "top", spacing: 12 });
    const swiped = applyStrandSwipeImpulse(pose, 24, 1);
    expect(swiped.points[0]).toEqual(pose.rest[0]);
    expect(swiped.velocities[0]).toEqual({ x: 0, y: 0 });
    expect(swiped.velocities.at(-1)?.x).toBeGreaterThan(0);
    expect(swiped.velocities.at(-1)?.x).toBeGreaterThan(
      swiped.velocities[1].x,
    );
    const moved = stepStrandPose(swiped, {
      dt: 1 / 60,
      stiffness: 0.25,
      damping: 0.14,
    });
    expect(moved.points.at(-1)?.x).toBeGreaterThan(swiped.points.at(-1)!.x);
    expect(pose.points.at(-1)?.x).toBe(0);
  });

  it("keeps a graded swipe velocity when repeated impulses reach the speed limit", () => {
    let pose = createStrandPose(straight, { anchor: "bottom", spacing: 12 });
    for (let swipe = 0; swipe < 20; swipe += 1) {
      pose = applyStrandSwipeImpulse(pose, 70, 1);
    }
    expect(pose.velocities[0].x).toBeCloseTo(850);
    expect(pose.velocities[0].x).toBeGreaterThan(pose.velocities[5].x * 3);
    for (let index = 1; index < pose.points.length; index += 1) {
      expect(pose.velocities[index - 1].x).toBeGreaterThan(
        pose.velocities[index].x,
      );
    }
    expect(pose.points[pose.anchorIndex]).toEqual(pose.rest[pose.anchorIndex]);
    expect(pose.velocities[pose.anchorIndex]).toEqual({ x: 0, y: 0 });
  });

  it.each(["top", "bottom"] as const)(
    "keeps a smooth %s-anchored bend at the displacement limit across repeated reversals",
    (anchor) => {
      let pose = createStrandPose(
        {
          points: [
            { x: 0, y: 0 },
            { x: 0, y: 360 },
          ],
        },
        { anchor, spacing: 12 },
      );
      const sway = { dt: 1 / 60, stiffness: 0.29, damping: 0.18 };
      let maximumDisplacement = 0;
      let maximumTangentChange = 0;
      for (let frame = 0; frame < 120; frame += 1) {
        const direction = Math.floor(frame / 30) % 2 === 0 ? 1 : -1;
        pose = limitStrandPoseDisplacement(
          stepStrandPose(
            applyStrandSwipeImpulse(pose, direction * 70, 1),
            sway,
          ),
          175,
          { preserveShape: true },
        );
        const displacements = pose.points.map((point, index) =>
          Math.hypot(point.x - pose.rest[index].x, point.y - pose.rest[index].y),
        );
        maximumDisplacement = Math.max(maximumDisplacement, ...displacements);
        expect(Math.max(...displacements)).toBeLessThanOrEqual(175.0001);
        expect(pose.points[pose.anchorIndex]).toEqual(
          pose.rest[pose.anchorIndex],
        );
        const tangents = pose.points.slice(1).map((point, index) =>
          Math.atan2(
            point.x - pose.points[index].x,
            point.y - pose.points[index].y,
          ),
        );
        for (let index = 1; index < tangents.length; index += 1) {
          // Per-bone clipping makes a sharp tangent break where the upper
          // section hits the limit and the lower section is still moving.
          maximumTangentChange = Math.max(
            maximumTangentChange,
            Math.abs(tangents[index] - tangents[index - 1]),
          );
        }
      }
      expect(maximumDisplacement).toBeCloseTo(175);
      expect(maximumTangentChange).toBeLessThan(Math.PI / 18);
      for (let frame = 0; frame < 600; frame += 1) {
        pose = stepStrandPose(pose, sway);
      }
      expect(pose.points).toEqual(pose.rest);
      expect(
        pose.velocities.every((velocity) => velocity.x === 0 && velocity.y === 0),
      ).toBe(true);
    },
  );

  it("keeps a fully rigid nose straight through a 2D grab and spring release", () => {
    const horizontal: VectorPath = {
      points: [
        { x: 0, y: 0 },
        { x: 120, y: 0 },
      ],
    };
    let pose = createStrandPose(horizontal, { anchor: "left", spacing: 12 });
    const rigid = { stiffness: 1, damping: 0.32, dt: 1 / 60 };
    const free = pose.points.length - 1;

    for (const target of [
      { x: 150, y: 40 },
      { x: 180, y: 60 },
    ]) {
      pose = stepStrandPose(pose, {
        ...rigid,
        grab: { index: free, target },
      });
      expect(pose.points[0]).toEqual({ x: 0, y: 0 });
      expect(pose.points[free]).toEqual(target);
      for (let index = 1; index < free; index += 1) {
        const fraction = index / free;
        expect(pose.points[index].x).toBeCloseTo(target.x * fraction, 4);
        expect(pose.points[index].y).toBeCloseTo(target.y * fraction, 4);
      }
    }

    const releasedFrom = pose.points[free].x;
    pose = stepStrandPose(pose, rigid);
    expect(pose.points[free].x).toBeGreaterThan(releasedFrom);
    let minimumX = pose.points[free].x;
    for (let frame = 0; frame < 120; frame += 1) {
      pose = stepStrandPose(pose, rigid);
      minimumX = Math.min(minimumX, pose.points[free].x);
      expect(pose.points[0]).toEqual({ x: 0, y: 0 });
    }
    expect(minimumX).toBeLessThan(120);
    expect(pose.points[free].x).toBeCloseTo(120, 1);
    expect(pose.points[free].y).toBeCloseTo(0, 1);
  });

  it("captures the nearest movable bone and preserves pointer offset", () => {
    const pose = createStrandPose(straight, { anchor: "top", spacing: 12 });
    const grab = closestStrandBone(pose, { x: 7, y: 74 });
    expect(grab.index).toBe(6);
    expect(grab.offset).toEqual({ x: 7, y: 2 });
    expect(closestStrandBone(pose, { x: 0, y: 0 }).index).toBe(1);
  });

  it("hard-pins both the anchor and grabbed bone in x and y", () => {
    let pose = createStrandPose(straight, { anchor: "top", spacing: 12 });
    const target = { x: 67, y: 34 };
    for (let index = 0; index < 40; index += 1) {
      pose = stepStrandPose(pose, {
        ...settings,
        dt: 1 / 60,
        grab: { index: 6, target },
      });
      expect(pose.points[0]).toEqual({ x: 0, y: 0 });
      expect(pose.points[6]).toEqual(target);
    }
    expect(pose.points[5].x).toBeGreaterThan(0);
    expect(strandPosePath(pose)).toContain(" C ");
  });

  it("moves the whole free end with a middle grab, including shortening and lengthening", () => {
    let pose = createStrandPose(straight, { anchor: "top", spacing: 12 });
    pose = stepStrandPose(pose, {
      ...settings,
      dt: 1 / 60,
      grab: { index: 5, target: { x: 60, y: 30 } },
    });
    expect(pose.points[0]).toEqual({ x: 0, y: 0 });
    expect(pose.points[5]).toEqual({ x: 60, y: 30 });
    expect(pose.points[10].x).toBeCloseTo(60, 1);
    expect(pose.points[10].y).toBeCloseTo(90, 1);
    expect(pose.points[3].x).toBeGreaterThan(20);
    expect(pose.points[3].x).toBeLessThan(60);

    pose = stepStrandPose(pose, {
      ...settings,
      dt: 1 / 60,
      grab: { index: 5, target: { x: 60, y: 100 } },
    });
    expect(pose.points[5]).toEqual({ x: 60, y: 100 });
    expect(pose.points[10].x).toBeCloseTo(60, 1);
    expect(pose.points[10].y).toBeCloseTo(160, 1);
  });

  it("flows through a neighbor's middle latch without a vertical lower segment", () => {
    const rest = createStrandPose(straight, { anchor: "top", spacing: 12 });
    const grab = { index: 5, target: { x: 60, y: 60 } };
    const material = stepStrandPose(rest, {
      ...settings,
      dt: 1 / 60,
      grab,
    });
    const fluid = stepStrandPose(rest, {
      ...settings,
      dt: 1 / 60,
      grab,
      grabProfile: "fluid",
    });

    // The ordinary material grab still carries its lower half straight down.
    expect(material.points[6].x).toBeCloseTo(material.points[5].x, 1);
    expect(fluid.points[0]).toEqual(rest.points[0]);
    expect(fluid.points[5]).toEqual(grab.target);

    const incomingSlope = fluid.points[5].x - fluid.points[4].x;
    const outgoingSlope = fluid.points[6].x - fluid.points[5].x;
    expect(incomingSlope).toBeGreaterThan(1);
    expect(outgoingSlope).toBeGreaterThan(1);
    expect(Math.abs(incomingSlope - outgoingSlope)).toBeLessThan(
      Math.max(incomingSlope, outgoingSlope) * 0.4,
    );
    expect(fluid.points[10].x).toBeGreaterThan(grab.target.x * 1.15);
  });

  it("keeps adjacent bones connected across a middle grab on a reversed path", () => {
    const reversed: VectorPath = {
      points: [
        { x: 0, y: 120 },
        { x: 0, y: 0 },
      ],
    };
    let pose = createStrandPose(reversed, { anchor: "top", spacing: 12 });
    pose = stepStrandPose(pose, {
      ...settings,
      dt: 1 / 60,
      grab: { index: 5, target: { x: 45, y: 35 } },
    });
    expect(pose.points[pose.anchorIndex]).toEqual({ x: 0, y: 0 });
    expect(pose.points[5]).toEqual({ x: 45, y: 35 });
    expect(pose.points[0].x).toBeCloseTo(45, 1);
    expect(pose.points[0].y).toBeCloseTo(
      pose.rest[0].y + (35 - pose.rest[5].y),
      1,
    );
    for (let index = 1; index < pose.points.length; index += 1) {
      expect(
        Math.hypot(
          pose.points[index].x - pose.points[index - 1].x,
          pose.points[index].y - pose.points[index - 1].y,
        ),
      ).toBeLessThan(20);
    }
  });

  it("bounds curve handles at an abrupt bend instead of overshooting into a loop", () => {
    const pose = createStrandPose(straight, { anchor: "top", spacing: 40 });
    const folded = {
      ...pose,
      points: [
        { x: 0, y: 0 },
        { x: 12, y: 0 },
        { x: 12, y: 120 },
        { x: 24, y: 120 },
      ],
    };
    const path = strandPosePath(folded);
    const firstSegment = path.match(
      /^M 0 0 C ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) 12 0/,
    );
    expect(firstSegment).not.toBeNull();
    const [, firstX, firstY, secondX, secondY] = firstSegment!.map(Number);
    expect(Math.hypot(firstX, firstY)).toBeLessThanOrEqual(3.85);
    expect(Math.hypot(12 - secondX, secondY)).toBeLessThanOrEqual(3.85);
    expect(path).not.toMatch(/NaN|Infinity/);
  });

  it("attracts ungrabbed bones laterally and keeps the anchor fixed", () => {
    let pose = createStrandPose(straight, { anchor: "top" });
    for (let index = 0; index < 35; index += 1) {
      pose = stepStrandPose(pose, {
        ...settings,
        dt: 1 / 60,
        pointerForce: {
          pointer: { x: 50, y: 72 },
          radius: 100,
          strength: 80,
        },
      });
    }
    expect(pose.points[0]).toEqual({ x: 0, y: 0 });
    expect(pose.points[6].x).toBeGreaterThan(1);
  });

  it("pulls the free end of a neighboring strand instead of making a middle spike", () => {
    let pose = createStrandPose(straight, { anchor: "top", spacing: 12 });
    for (let frame = 0; frame < 80; frame += 1) {
      pose = stepStrandPose(pose, {
        ...settings,
        dt: 1 / 60,
        pointerForce: {
          pointer: { x: 55, y: 60 },
          radius: 95,
          strength: 85,
        },
      });
    }
    const x = pose.points.map((point) => point.x);
    const largestStep = Math.max(
      ...x.slice(1).map((value, index) => Math.abs(value - x[index])),
    );
    expect(pose.points[0]).toEqual(pose.rest[0]);
    expect(x[5]).toBeGreaterThan(4);
    expect(x.at(-1)).toBeGreaterThan(x[5] * 0.65);
    expect(largestStep).toBeLessThan(x[5] * 0.4);
  });

  it("accepts generic pair attractors without taking ownership of detection", () => {
    let pose = createStrandPose(straight, { anchor: "top" });
    for (let index = 0; index < 30; index += 1) {
      pose = stepStrandPose(pose, {
        ...settings,
        dt: 1 / 60,
        attractors: [{ point: { x: -40, y: 70 }, radius: 90, strength: 70 }],
      });
    }
    expect(pose.points[6].x).toBeLessThan(-1);
    expect(pose.points.at(-1)!.x).toBeLessThan(pose.points[6].x * 0.65);
  });

  it("relaxes back to the exact rest pose without jitter after release", () => {
    let pose = createStrandPose(straight, { anchor: "top" });
    for (let index = 0; index < 30; index += 1) {
      pose = stepStrandPose(pose, {
        ...settings,
        dt: 1 / 60,
        grab: { index: 6, target: { x: 80, y: 25 } },
      });
    }
    for (let index = 0; index < 600; index += 1) {
      pose = stepStrandPose(pose, { ...settings, dt: 1 / 60 });
    }
    expect(pose.points).toEqual(pose.rest);
    expect(pose.velocities.every((velocity) => velocity.x === 0)).toBe(true);
    expect(pose.velocities.every((velocity) => velocity.y === 0)).toBe(true);
  });

  it("settles when a retained attractor moves outside its radius", () => {
    let pose = createStrandPose(straight, { anchor: "top" });
    for (let index = 0; index < 30; index += 1) {
      pose = stepStrandPose(pose, {
        ...settings,
        dt: 1 / 60,
        pointerForce: {
          pointer: { x: 50, y: 70 },
          radius: 100,
          strength: 80,
        },
      });
    }
    for (let index = 0; index < 600; index += 1) {
      pose = stepStrandPose(pose, {
        ...settings,
        dt: 1 / 60,
        pointerForce: {
          pointer: { x: 500, y: 500 },
          radius: 100,
          strength: 80,
        },
      });
    }
    expect(pose.points).toEqual(pose.rest);
  });

  it("carries a bounded release velocity through the strand, then settles", () => {
    let pose = createStrandPose(straight, { anchor: "top", spacing: 12 });
    const grab = { index: 6, target: { x: 35, y: 72 } };
    pose = stepStrandPose(pose, { ...settings, dt: 1 / 60, grab });
    pose = stepStrandPose(pose, {
      ...settings,
      dt: 1 / 60,
      grab: { index: 6, target: { x: 45, y: 72 } },
    });
    const releaseX = pose.points[6].x;
    expect(pose.velocities[6].x).toBeGreaterThan(0);
    expect(
      Math.hypot(pose.velocities[6].x, pose.velocities[6].y),
    ).toBeLessThanOrEqual(900);

    pose = stepStrandPose(pose, { ...settings, dt: 1 / 60 });
    expect(pose.points[0]).toEqual(pose.rest[0]);
    expect(pose.points[6].x).toBeGreaterThan(releaseX);

    for (let frame = 0; frame < 600; frame += 1) {
      pose = stepStrandPose(pose, { ...settings, dt: 1 / 60 });
    }
    expect(pose.points).toEqual(pose.rest);
  });

  it("loses release momentum if the user holds still before letting go", () => {
    let pose = createStrandPose(straight, { anchor: "top", spacing: 12 });
    const grab = { index: 6, target: { x: 50, y: 72 } };
    pose = stepStrandPose(pose, { ...settings, dt: 1 / 60, grab });
    for (let frame = 0; frame < 45; frame += 1) {
      pose = stepStrandPose(pose, { ...settings, dt: 1 / 60, grab });
    }
    expect(pose.points[6]).toEqual(grab.target);
    expect(Math.abs(pose.velocities[6].x)).toBeLessThan(1);
  });

  it("keeps several nearby attractors connected and finite", () => {
    let pose = createStrandPose(straight, { anchor: "top", spacing: 12 });
    const attractors = Array.from({ length: 8 }, (_, index) => ({
      point: { x: 58 + index * 3, y: 35 + index * 9 },
      radius: 125,
      strength: 70,
    }));
    for (let frame = 0; frame < 100; frame += 1) {
      pose = stepStrandPose(pose, {
        ...settings,
        dt: 1 / 60,
        attractors,
      });
    }
    expect(pose.points[0]).toEqual(pose.rest[0]);
    expect(pose.points.at(-1)!.x).toBeGreaterThan(5);
    const jumps = pose.points
      .slice(1)
      .map((point, index) =>
        Math.hypot(
          point.x - pose.points[index].x,
          point.y - pose.points[index].y,
        ),
      );
    expect(Math.max(...jumps)).toBeLessThan(35);
    expect(
      pose.points.every(
        (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
      ),
    ).toBe(true);
  });
});

describe("strandPoseRibbonPath", () => {
  it("draws a finite smooth closed outline with subtly varied width", () => {
    const pose = createStrandPose(straight, {
      anchor: "top",
      spacing: 60,
    });
    const outline = strandPoseRibbonPath(pose, 20);
    expect(outline).toMatch(/^M -9 0 C /);
    expect(outline).toContain("-9.866 40");
    expect(outline).toContain("-9 132 9 132 9 120");
    expect(outline).toMatch(/ Z$/);
    expect(outline).not.toMatch(/NaN|Infinity/);
    expect(strandPoseRibbonPath(pose, 40)).toMatch(/^M -18 0 C /);
  });

  it("keeps rounded caps and finite coordinates after folding", () => {
    const pose = createStrandPose(straight, {
      anchor: "top",
      spacing: 60,
    });
    const folded = {
      ...pose,
      points: [pose.points[0], { x: 50, y: 60 }, pose.points[0]],
    };
    const outline = strandPoseRibbonPath(folded, 20);
    expect(outline).toMatch(/^M /);
    expect(outline).toMatch(/ Z$/);
    expect(outline).not.toMatch(/NaN|Infinity/);
  });

  it("does not make a malformed outline for empty or invalid width", () => {
    const pose = createStrandPose(straight, { anchor: "top" });
    expect(strandPoseRibbonPath(pose, 0)).toBe("");
    expect(strandPoseRibbonPath(pose, Number.NaN)).toBe("");
    expect(strandPoseRibbonPath({ ...pose, points: [] }, 20)).toBe("");
  });
});
