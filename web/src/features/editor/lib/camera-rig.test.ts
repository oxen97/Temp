import { describe, expect, it, vi } from "vitest";

import { continuousInteractionTriggers } from "@/features/editor/components/panels/interaction-panel-policy";
import {
  CAMERA_CONTINUOUS_TRIGGERS,
  type CameraAngles,
  CameraRig,
  cameraDragAngles,
  cameraEase,
  cameraElevation,
  cameraInputForState,
  cameraPersistence,
  cameraPitchRange,
  cameraPointerAngles,
  isArtworkCameraDrag,
  orbitCameraPose,
  sceneWithCameraProjection,
  ZERO_CAMERA_ANGLES,
} from "@/features/editor/lib/camera-rig";
import {
  createDefaultInteraction,
  type InteractionDefinition,
} from "@/features/editor/lib/interaction-model";
import { IDLE_RUNTIME_STATE } from "@/features/editor/lib/interaction-runtime";

function manualClock() {
  let now = 0;
  return {
    advance(seconds: number) {
      now += seconds;
    },
    now: () => now,
  };
}

function cameraRotate(overrides: Partial<InteractionDefinition> = {}) {
  return createDefaultInteraction({
    cameraRotateX: 60,
    cameraRotateY: -180,
    effect: "camera-rotate",
    motion: "direct",
    smoothing: 0,
    trackDistance: 800,
    trigger: "drag",
    triggerArea: "entire-artwork",
    ...overrides,
  });
}

function setup() {
  const clock = manualClock();
  const rig = new CameraRig(clock.now);
  /** Steps the rig at 60 frames per second. Returns whether it still moves. */
  const run = (seconds: number) => {
    let moving = false;
    for (let frame = 0; frame < Math.round(seconds * 60); frame += 1) {
      clock.advance(1 / 60);
      moving = rig.step();
    }
    return moving;
  };
  return { clock, rig, run };
}

function expectAngles(
  actual: CameraAngles,
  expected: Partial<CameraAngles>,
  digits = 4,
) {
  const full = { ...ZERO_CAMERA_ANGLES, ...expected };
  expect(actual.x).toBeCloseTo(full.x, digits);
  expect(actual.y).toBeCloseTo(full.y, digits);
  expect(actual.z).toBeCloseTo(full.z, digits);
}

const drag = (interaction: InteractionDefinition, dx: number, dy = 0) => ({
  active: true,
  angles: cameraDragAngles(interaction, { dx, dy }),
});
const release = { active: false, angles: { ...ZERO_CAMERA_ANGLES } };

describe("camera rotate input mapping", () => {
  it("follows the panel's continuous trigger list", () => {
    expect([...CAMERA_CONTINUOUS_TRIGGERS].sort()).toEqual(
      [...continuousInteractionTriggers].sort(),
    );
  });

  it("turns the authored angles once per Track distance dragged, in the drag's direction", () => {
    const interaction = cameraRotate({ cameraRotateZ: 20 });
    expectAngles(cameraDragAngles(interaction, { dx: 800, dy: 0 }), {
      y: -180,
      z: 20,
    });
    expectAngles(cameraDragAngles(interaction, { dx: -400, dy: 400 }), {
      x: 30,
      y: 90,
      z: -10,
    });
    // Drags longer than Track distance keep turning.
    expectAngles(cameraDragAngles(interaction, { dx: 1600, dy: 0 }), {
      y: -360,
      z: 40,
    });
    expectAngles(
      cameraDragAngles({ ...interaction, dragAxis: "x" }, { dx: 400, dy: 400 }),
      { y: -90, z: 10 },
    );
    expectAngles(
      cameraDragAngles({ ...interaction, dragAxis: "y" }, { dx: 400, dy: 400 }),
      { x: 30 },
    );
  });

  it("scales pointer offsets by Track distance and stops at the authored angles", () => {
    const interaction = cameraRotate({
      cameraRotateX: 10,
      cameraRotateY: 30,
      trackDistance: 500,
      trigger: "pointer-move",
    });
    expectAngles(cameraPointerAngles(interaction, { x: 250, y: -500 }), {
      x: -10,
      y: 15,
    });
    expectAngles(cameraPointerAngles(interaction, { x: 5000, y: 5000 }), {
      x: 10,
      y: 30,
    });
    expectAngles(
      cameraPointerAngles(
        { ...interaction, pointerAxis: "x" },
        { x: 250, y: 250 },
      ),
      { y: 15 },
    );
    expectAngles(
      cameraPointerAngles(
        { ...interaction, pointerAxis: "y" },
        { x: 250, y: 250 },
      ),
      { x: 5 },
    );
  });

  it("reads drag deltas and trigger intensity from runtime state", () => {
    const dragInteraction = cameraRotate();
    expect(cameraInputForState(dragInteraction, IDLE_RUNTIME_STATE)).toEqual({
      active: false,
      angles: ZERO_CAMERA_ANGLES,
    });
    const dragging = cameraInputForState(dragInteraction, {
      ...IDLE_RUNTIME_STATE,
      drag: { dx: 400, dy: 0 },
    });
    expect(dragging?.active).toBe(true);
    expectAngles(dragging!.angles, { y: -90 });

    const click = cameraRotate({
      trigger: "click-tap",
      triggerArea: "selected-object",
    });
    expect(cameraInputForState(click, IDLE_RUNTIME_STATE)?.active).toBe(false);
    const clicked = cameraInputForState(click, {
      ...IDLE_RUNTIME_STATE,
      toggled: true,
    });
    expect(clicked?.active).toBe(true);
    expectAngles(clicked!.angles, { x: 60, y: -180 });

    // Pointer Move needs the pointer position, not element state.
    expect(
      cameraInputForState(
        cameraRotate({ trigger: "pointer-move" }),
        IDLE_RUNTIME_STATE,
      ),
    ).toBeNull();
  });

  it("maps RESET to how a contribution persists", () => {
    expect(cameraPersistence(cameraRotate({ resetMode: "keep" }))).toBe(
      "accumulate",
    );
    expect(
      cameraPersistence(
        cameraRotate({ resetMode: "keep", trigger: "pointer-move" }),
      ),
    ).toBe("hold");
    expect(
      cameraPersistence(cameraRotate({ resetMode: "keep", trigger: "hover" })),
    ).toBe("hold");
    expect(
      cameraPersistence(
        cameraRotate({ resetMode: "keep", trigger: "click-tap" }),
      ),
    ).toBe("return");
    expect(cameraPersistence(cameraRotate({ resetMode: "contextual" }))).toBe(
      "return",
    );
    expect(cameraPersistence(cameraRotate({ resetMode: "release" }))).toBe(
      "return",
    );
    expect(
      cameraPersistence(cameraRotate({ resetMode: "restore-camera" })),
    ).toBe("return");
  });

  it("recognizes page-level camera drags", () => {
    expect(isArtworkCameraDrag(cameraRotate())).toBe(true);
    expect(
      isArtworkCameraDrag(cameraRotate({ triggerArea: "selected-object" })),
    ).toBe(false);
    expect(isArtworkCameraDrag(cameraRotate({ enabled: false }))).toBe(false);
    expect(isArtworkCameraDrag(cameraRotate({ effect: "move" }))).toBe(false);
  });

  it("eases like the TIMING easings", () => {
    expect(cameraEase("linear", 0.3)).toBeCloseTo(0.3);
    expect(cameraEase("ease-in-out", 0.5)).toBeCloseTo(0.5, 3);
    expect(cameraEase("ease-in", 0.3)).toBeLessThan(0.3);
    expect(cameraEase("ease-out", 0.3)).toBeGreaterThan(0.3);
    expect(cameraEase("unknown", 0.3)).toBeCloseTo(cameraEase("ease-out", 0.3));
    expect(cameraEase("ease", 0)).toBe(0);
    expect(cameraEase("ease", 1.5)).toBe(1);
  });
});

describe("camera rig", () => {
  it("follows a drag and returns when released without Keep", () => {
    const { rig, run } = setup();
    const interaction = cameraRotate();
    rig.update("drag", interaction, drag(interaction, 400));
    run(0.05);
    expectAngles(rig.angles(), { y: -90 });
    rig.update("drag", interaction, release);
    expect(run(0.05)).toBe(false);
    expectAngles(rig.angles(), {});
    expect(rig.isSettled()).toBe(true);
  });

  it("keeps the camera where a Keep drag ends and continues from there on the next drag", () => {
    const { rig, run } = setup();
    const interaction = cameraRotate({ resetMode: "keep" });
    rig.update("drag", interaction, drag(interaction, 400));
    run(0.05);
    rig.update("drag", interaction, release);
    run(0.5);
    expectAngles(rig.angles(), { y: -90 });
    rig.update("drag", interaction, drag(interaction, 0));
    rig.update("drag", interaction, drag(interaction, 200, 400));
    run(0.05);
    expectAngles(rig.angles(), { x: 30, y: -135 });
  });

  it("stops tilting at the elevation limit and responds at once when the drag reverses", () => {
    const { rig, run } = setup();
    const interaction = cameraRotate({ resetMode: "keep" });
    rig.update("drag", interaction, drag(interaction, 0, 2000));
    run(0.05);
    expect(rig.angles().x).toBeCloseTo(85);
    rig.update("drag", interaction, drag(interaction, 0, 1900));
    run(0.05);
    expect(rig.angles().x).toBeCloseTo(77.5);
    rig.update("drag", interaction, release);
    run(0.05);
    expect(rig.angles().x).toBeCloseTo(77.5);
  });

  it("measures the pitch limit from the base camera elevation", () => {
    expect(
      cameraElevation({ x: 0, y: 500, z: 866.0254 }, { x: 0, y: 0, z: 0 }),
    ).toBeCloseTo(30, 3);
    expect(cameraPitchRange(30)).toEqual([-115, 55]);
    const { rig, run } = setup();
    rig.setPitchRange(...cameraPitchRange(30));
    const interaction = cameraRotate({ resetMode: "keep" });
    rig.update("drag", interaction, drag(interaction, 0, 2000));
    run(0.05);
    expect(rig.angles().x).toBeCloseTo(55);
    expect(rig.target().x).toBeCloseTo(55);
  });

  it("coasts after a flick with Inertia and comes to rest", () => {
    const { clock, rig, run } = setup();
    const interaction = cameraRotate({
      deceleration: 50,
      friction: 50,
      initialVelocity: 100,
      motion: "inertia",
      resetMode: "keep",
    });
    rig.update("drag", interaction, drag(interaction, 0));
    for (let frame = 1; frame <= 6; frame += 1) {
      clock.advance(1 / 60);
      rig.update("drag", interaction, drag(interaction, frame * 10));
      rig.step();
    }
    const released = rig.angles().y;
    expect(released).toBeCloseTo(-13.5);
    rig.update("drag", interaction, release);
    expect(run(0.1)).toBe(true);
    expect(rig.angles().y).toBeLessThan(released);
    run(3);
    expect(rig.isSettled()).toBe(true);
    const rest = rig.angles().y;
    // About 134°/s decaying at 5.5/s travels roughly 24° further.
    expect(rest).toBeLessThan(released - 15);
    expect(rest).toBeGreaterThan(released - 35);
    expect(rig.target().y).toBeCloseTo(rest);
  });

  it("still recognizes a flick on a slow device that reports the pointer rarely", () => {
    const { clock, rig, run } = setup();
    const interaction = cameraRotate({ motion: "inertia", resetMode: "keep" });
    rig.update("drag", interaction, drag(interaction, 0));
    // One sample every 0.3 s, then the release arrives 0.25 s later.
    for (let sample = 1; sample <= 4; sample += 1) {
      clock.advance(0.3);
      rig.update("drag", interaction, drag(interaction, sample * 60));
    }
    clock.advance(0.25);
    rig.update("drag", interaction, release);
    run(0.2);
    expect(rig.angles().y).toBeLessThan(-54 - 1);
    run(3);
    expect(rig.isSettled()).toBe(true);

    // A pointer that rested for a whole second is not a flick anywhere.
    const rested = setup();
    rested.rig.update("drag", interaction, drag(interaction, 0));
    for (let sample = 1; sample <= 4; sample += 1) {
      rested.clock.advance(0.3);
      rested.rig.update("drag", interaction, drag(interaction, sample * 60));
    }
    rested.clock.advance(1);
    rested.rig.update("drag", interaction, release);
    rested.run(1);
    expect(rested.rig.angles().y).toBeCloseTo(-54);
  });

  it("does not coast when the pointer rested before release or motion is reduced", () => {
    for (const variant of ["rested", "reduced"] as const) {
      const { clock, rig, run } = setup();
      rig.reducedMotion = variant === "reduced";
      const interaction = cameraRotate({
        motion: "inertia",
        resetMode: "keep",
      });
      rig.update("drag", interaction, drag(interaction, 0));
      for (let frame = 1; frame <= 6; frame += 1) {
        clock.advance(1 / 60);
        rig.update("drag", interaction, drag(interaction, frame * 10));
        rig.step();
      }
      if (variant === "rested") {
        run(0.2);
        // The release event repeats the resting position.
        rig.update("drag", interaction, drag(interaction, 60));
      }
      rig.update("drag", interaction, release);
      run(1);
      expect(rig.angles().y).toBeCloseTo(-13.5);
    }
  });

  it("smooths continuous input by the TIMING smoothing time", () => {
    const { rig, run } = setup();
    const interaction = cameraRotate({ smoothing: 0.2 });
    rig.update("drag", interaction, drag(interaction, 400));
    run(0.2);
    // One time constant covers about 63% of the way.
    expect(rig.angles().y).toBeCloseTo(-90 * (1 - Math.exp(-1)), 0);
    run(3);
    expect(rig.angles().y).toBeCloseTo(-90);
    expect(rig.isSettled()).toBe(true);
  });

  it("plays event triggers with Duration, Delay and Easing", () => {
    const { clock, rig } = setup();
    const interaction = cameraRotate({
      cameraRotateX: 0,
      cameraRotateY: 100,
      delay: 0.5,
      duration: 1,
      easing: "linear",
      trigger: "click-tap",
      triggerArea: "selected-object",
    });
    rig.update("click", interaction, {
      active: true,
      angles: { x: 0, y: 100, z: 0 },
    });
    clock.advance(0.25);
    rig.step();
    expect(rig.angles().y).toBe(0);
    expect(rig.isSettled()).toBe(false);
    clock.advance(0.5);
    rig.step();
    expect(rig.angles().y).toBeCloseTo(25);
    clock.advance(0.25);
    rig.step();
    expect(rig.angles().y).toBeCloseTo(50);
    clock.advance(0.6);
    expect(rig.step()).toBe(false);
    expect(rig.angles().y).toBeCloseTo(100);
    expect(rig.isSettled()).toBe(true);
  });

  it("springs to event angles with Spring motion", () => {
    const { rig, run } = setup();
    const interaction = cameraRotate({
      cameraRotateX: 0,
      cameraRotateY: 90,
      motion: "spring",
      trigger: "click-tap",
      triggerArea: "selected-object",
    });
    rig.update("click", interaction, {
      active: true,
      angles: { x: 0, y: 90, z: 0 },
    });
    expect(run(0.1)).toBe(true);
    const early = rig.angles().y;
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(90);
    let peak = early;
    for (let frame = 0; frame < 120; frame += 1) {
      run(1 / 60);
      peak = Math.max(peak, rig.angles().y);
    }
    // Spring 100 / Damping 12 overshoots a little before it settles.
    expect(peak).toBeGreaterThan(90);
    run(3);
    expect(rig.angles().y).toBeCloseTo(90);
    expect(rig.isSettled()).toBe(true);
  });

  it("holds the last pointer angle with Keep and takes over again from the pointer", () => {
    const { rig, run } = setup();
    const interaction = cameraRotate({
      cameraRotateX: 10,
      cameraRotateY: 30,
      resetMode: "keep",
      trackDistance: 500,
      trigger: "pointer-move",
    });
    const at = (x: number, y: number) => ({
      active: true,
      angles: cameraPointerAngles(interaction, { x, y }),
    });
    rig.update("pointer", interaction, at(250, -500));
    run(0.05);
    expectAngles(rig.angles(), { x: -10, y: 15 });
    rig.update("pointer", interaction, release);
    run(0.5);
    expectAngles(rig.angles(), { x: -10, y: 15 });
    rig.update("pointer", interaction, at(-500, 0));
    run(0.05);
    expectAngles(rig.angles(), { y: -30 });
  });

  it("adds contributions together and forgets removed ones", () => {
    const { rig, run } = setup();
    const dragInteraction = cameraRotate({ resetMode: "keep" });
    const click = cameraRotate({
      cameraRotateX: 0,
      cameraRotateY: 45,
      duration: 0,
      trigger: "click-tap",
      triggerArea: "selected-object",
    });
    rig.update("drag", dragInteraction, drag(dragInteraction, 400));
    rig.update("drag", dragInteraction, release);
    rig.update("click", click, { active: true, angles: { x: 0, y: 45, z: 0 } });
    run(0.1);
    expectAngles(rig.angles(), { y: -45 });
    rig.remove("click");
    run(0.1);
    expectAngles(rig.angles(), { y: -90 });
  });

  it("notifies only when the camera has somewhere new to go", () => {
    const { rig } = setup();
    const listener = vi.fn();
    const unsubscribe = rig.subscribe(listener);
    const interaction = cameraRotate();
    rig.update("drag", interaction, drag(interaction, 400));
    rig.update("drag", interaction, drag(interaction, 400));
    expect(listener).toHaveBeenCalledTimes(1);
    // An inactive input for an unknown source creates nothing.
    rig.update("other", interaction, release);
    expect(listener).toHaveBeenCalledTimes(1);
    rig.update("drag", interaction, drag(interaction, 500));
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    rig.update("drag", interaction, drag(interaction, 600));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("puts the camera back at once on reset", () => {
    const { rig, run } = setup();
    const interaction = cameraRotate({ resetMode: "keep" });
    rig.update("drag", interaction, drag(interaction, 400));
    rig.update("drag", interaction, release);
    run(0.1);
    rig.reset();
    expect(rig.snapshot()).toEqual({
      angles: ZERO_CAMERA_ANGLES,
      settled: true,
      target: ZERO_CAMERA_ANGLES,
    });
  });
});

describe("camera orbit pose", () => {
  const front = { x: 0, y: 0, z: 1000 };
  const origin = { x: 0, y: 0, z: 0 };

  it("turns right around the vertical axis for positive Y", () => {
    const { position } = orbitCameraPose(front, origin, { x: 0, y: 90, z: 0 });
    expect(position.x).toBeCloseTo(1000);
    expect(position.y).toBeCloseTo(0);
    expect(position.z).toBeCloseTo(0);
  });

  it("rises for positive X and never passes the elevation limit", () => {
    const up = orbitCameraPose(front, origin, { x: 30, y: 0, z: 0 }).position;
    expect(up.y).toBeCloseTo(500);
    expect(up.z).toBeCloseTo(866.0254, 3);
    const over = orbitCameraPose(front, origin, {
      x: 120,
      y: 0,
      z: 0,
    }).position;
    expect(cameraElevation(over, origin)).toBeCloseTo(85);
  });

  it("keeps the distance to the target and rolls by Z", () => {
    const target = { x: 960, y: -540, z: 0 };
    const base = { x: 960, y: -540, z: 1600 };
    const pose = orbitCameraPose(base, target, { x: -25, y: 140, z: 8 });
    expect(
      Math.hypot(
        pose.position.x - target.x,
        pose.position.y - target.y,
        pose.position.z - target.z,
      ),
    ).toBeCloseTo(1600);
    expect(pose.roll).toBeCloseTo((8 * Math.PI) / 180);
    expect(orbitCameraPose(base, target, ZERO_CAMERA_ANGLES).position).toEqual(
      base,
    );
  });
});

describe("preview camera projection", () => {
  const scene = {
    enabled: true,
    perspective: 35,
    projection: "orthographic" as const,
  };

  it("uses the Projection and Field of view of the first camera effect", () => {
    const perspective = cameraRotate({
      cameraFov: 50,
      cameraProjection: "perspective",
    });
    expect(
      sceneWithCameraProjection(scene, [{ interactions: [perspective] }]),
    ).toEqual({
      ...scene,
      perspective: 50,
      projection: "perspective",
    });
    const orthographic = cameraRotate({ cameraProjection: "orthographic" });
    expect(
      sceneWithCameraProjection({ ...scene, projection: "perspective" }, [
        { interactions: [] },
        { interactions: [orthographic, perspective] },
      ])?.projection,
    ).toBe("orthographic");
  });

  it("leaves the scene alone without an enabled camera effect", () => {
    const disabled = cameraRotate({
      cameraProjection: "perspective",
      enabled: false,
    });
    const move = createDefaultInteraction({ effect: "move" });
    expect(
      sceneWithCameraProjection(scene, [
        { interactions: [disabled, move] },
        {},
      ]),
    ).toBe(scene);
  });
});
