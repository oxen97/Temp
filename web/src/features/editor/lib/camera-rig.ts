/**
 * Artwork camera rig for the Camera Rotate effect (Preview only).
 *
 * Interactions contribute orbit angles about the scene camera target. The rig
 * adds them up, keeps or releases each contribution according to its RESET
 * choice, and eases the camera toward the sum with the HOW motion of the
 * interaction that changed it last. The 3D scene steps the rig once per
 * rendered frame and orbits its base camera pose by `angles()`.
 *
 * Angles are degrees. X tilts the camera up (+) or down, Y turns it right (+)
 * around the vertical axis through the target, and Z rolls the image
 * clockwise (+). The editor camera never uses the rig: it stays front-facing.
 */
import { isTargetDragTrigger } from "@/features/editor/lib/interaction-drop-runtime";
import type { InteractionDefinition } from "@/features/editor/lib/interaction-model";
import {
  easingToCss,
  type ElementRuntimeState,
  interactionIntensity,
} from "@/features/editor/lib/interaction-runtime";
import type { Scene3DSettings } from "@/features/editor/three/types";

export type CameraAngles = { x: number; y: number; z: number };
export type CameraVector = { x: number; y: number; z: number };

export const ZERO_CAMERA_ANGLES: Readonly<CameraAngles> = Object.freeze({
  x: 0,
  y: 0,
  z: 0,
});

/** The camera never tilts past this elevation, so it cannot flip over the target. */
export const MAX_CAMERA_ELEVATION = 85;

/**
 * Triggers whose input is followed continuously (TIMING: Smoothing) rather
 * than played as an event (TIMING: Duration, Delay, Easing). Mirrors
 * `continuousInteractionTriggers` in the interaction panel policy.
 */
export const CAMERA_CONTINUOUS_TRIGGERS: ReadonlySet<string> = new Set([
  "pointer-move",
  "drag",
  "wheel-pinch",
  "scroll-swipe",
  "while-overlapping",
  "near-target",
  "while-colliding",
  "while-model-animation",
]);

export function isCameraEffect(effect: string) {
  return effect.startsWith("camera-");
}

export function isCameraRotateInteraction(
  interaction: InteractionDefinition,
): boolean {
  return (
    interaction.enabled !== false && interaction.effect === "camera-rotate"
  );
}

/** Drag → Camera Rotate that starts anywhere on the artwork (page-level). */
export function isArtworkCameraDrag(interaction: InteractionDefinition) {
  return (
    isCameraRotateInteraction(interaction) &&
    interaction.trigger === "drag" &&
    interaction.triggerArea === "entire-artwork"
  );
}

/**
 * A press on this element or object starts its own gesture — a drag, a drop
 * gesture or a button — so it never starts an artwork camera drag.
 */
export function ownsPointerGesture(
  interactions: readonly InteractionDefinition[] | undefined,
) {
  return (interactions ?? []).some(
    (interaction) =>
      interaction.enabled !== false &&
      interaction.triggerArea !== "entire-artwork" &&
      (interaction.trigger === "drag" ||
        interaction.trigger === "click-tap" ||
        isTargetDragTrigger(interaction.trigger)),
  );
}

const claimedPointerEvents = new WeakSet<Event>();

/**
 * Marks a native pointer event as taken by a 3D object's own gesture. The
 * event still bubbles to the page, which then leaves the camera alone.
 */
export function claimPointerGesture(event: Event) {
  claimedPointerEvents.add(event);
}

export function isPointerGestureClaimed(event: Event) {
  return claimedPointerEvents.has(event);
}

const finite = (value: number | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

function authoredAngles(interaction: InteractionDefinition): CameraAngles {
  return {
    x: finite(interaction.cameraRotateX),
    y: finite(interaction.cameraRotateY),
    z: finite(interaction.cameraRotateZ),
  };
}

function scaleAngles(angles: CameraAngles, factor: number): CameraAngles {
  return { x: angles.x * factor, y: angles.y * factor, z: angles.z * factor };
}

function addAngles(a: CameraAngles, b: CameraAngles): CameraAngles {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtractAngles(a: CameraAngles, b: CameraAngles): CameraAngles {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function mixAngles(a: CameraAngles, b: CameraAngles, t: number): CameraAngles {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

function sameAngles(a: CameraAngles, b: CameraAngles, epsilon = 1e-6) {
  return (
    Math.abs(a.x - b.x) <= epsilon &&
    Math.abs(a.y - b.y) <= epsilon &&
    Math.abs(a.z - b.z) <= epsilon
  );
}

function magnitude(angles: CameraAngles) {
  return Math.hypot(angles.x, angles.y, angles.z);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Drag: each Track distance dragged turns the camera by the authored angles,
 * in the drag's direction. Horizontal movement drives Y (and Z), vertical
 * movement drives X. Drag axis X or Y ignores the other direction.
 */
export function cameraDragAngles(
  interaction: InteractionDefinition,
  delta: { dx: number; dy: number },
): CameraAngles {
  const track = Math.max(1, finite(interaction.trackDistance));
  const across = interaction.dragAxis === "y" ? 0 : finite(delta.dx) / track;
  const down = interaction.dragAxis === "x" ? 0 : finite(delta.dy) / track;
  const angles = authoredAngles(interaction);
  return { x: angles.x * down, y: angles.y * across, z: angles.z * across };
}

/**
 * Pointer Move: the pointer's offset from the center, over Track distance and
 * clamped to ±1, scales the authored angles (right/down are positive).
 */
export function cameraPointerAngles(
  interaction: InteractionDefinition,
  offset: { x: number; y: number },
): CameraAngles {
  const track = Math.max(1, finite(interaction.trackDistance));
  const across =
    interaction.pointerAxis === "y"
      ? 0
      : clamp(finite(offset.x) / track, -1, 1);
  const down =
    interaction.pointerAxis === "x"
      ? 0
      : clamp(finite(offset.y) / track, -1, 1);
  const angles = authoredAngles(interaction);
  return { x: angles.x * down, y: angles.y * across, z: angles.z * across };
}

/** Event and progress triggers: the authored angles at the given 0..1 amount. */
export function cameraIntensityAngles(
  interaction: InteractionDefinition,
  intensity: number,
): CameraAngles {
  return scaleAngles(
    authoredAngles(interaction),
    clamp(finite(intensity), 0, 1),
  );
}

export type CameraInput = { active: boolean; angles: CameraAngles };

/**
 * Input for a Camera Rotate interaction from an element's runtime state. Drag
 * uses the signed drag delta; click, hover, delay, scroll and target triggers
 * use the runtime's 0..1 intensity. Pointer Move needs the pointer position
 * and is handled by `cameraPointerAngles` instead (returns null here).
 */
export function cameraInputForState(
  interaction: InteractionDefinition,
  state: ElementRuntimeState,
): CameraInput | null {
  if (interaction.trigger === "pointer-move") return null;
  if (interaction.trigger === "drag") {
    return {
      active: state.drag !== null,
      angles: state.drag
        ? cameraDragAngles(interaction, state.drag)
        : { ...ZERO_CAMERA_ANGLES },
    };
  }
  const intensity = interactionIntensity(interaction, state);
  return {
    active: intensity > 0,
    angles: cameraIntensityAngles(interaction, intensity),
  };
}

/** How a contribution persists after its trigger ends (RESET). */
export type CameraPersistence = "return" | "hold" | "accumulate";

export function cameraPersistence(
  interaction: InteractionDefinition,
): CameraPersistence {
  if (interaction.resetMode !== "keep") return "return";
  // Keep final state: a drag leaves the camera where it was released and the
  // next drag continues from there; pointer and hover input holds its last angle.
  if (interaction.trigger === "drag") return "accumulate";
  if (interaction.trigger === "pointer-move" || interaction.trigger === "hover")
    return "hold";
  return "return";
}

type CameraMotion = "direct" | "spring" | "inertia" | "bounce";

type Tween = {
  duration: number;
  easing: string;
  from: CameraAngles;
  start: number;
  to: CameraAngles;
};

type CameraSource = {
  active: boolean;
  /** Inertia velocity (degrees/second) after a released drag. */
  coast: CameraAngles | null;
  held: CameraAngles;
  interaction: InteractionDefinition;
  live: CameraAngles;
  /** True once the input has changed since it became active. */
  moved: boolean;
  /** Pitch shift that keeps an active source inside the elevation limits. */
  pitchBias: number;
  /** Typical time between input samples, seconds (smoothed). */
  sampleInterval: number | null;
  sampledAt: number | null;
  /** Rate of change of `live`, degrees/second (smoothed). */
  velocity: CameraAngles;
};

/**
 * A release counts as a flick when the pointer moved within this window.
 * Slow devices deliver fewer pointer samples, so the window widens with the
 * measured sample interval (up to half a second).
 */
function flickWindow(sampleInterval: number | null) {
  return Math.min(0.5, Math.max(0.12, (sampleInterval ?? 0) * 1.5));
}

export type CameraRigSnapshot = {
  angles: CameraAngles;
  settled: boolean;
  target: CameraAngles;
};

const defaultClock = () =>
  (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;

/** Bezier control points for the TIMING easings the panel offers. */
const EASING_CURVES: Record<string, [number, number, number, number]> = {
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
};

export function cameraEase(easing: string, progress: number): number {
  const t = clamp(progress, 0, 1);
  const name = easingToCss(easing);
  if (name === "linear" || t === 0 || t === 1) return t;
  const [x1, y1, x2, y2] = EASING_CURVES[name] ?? EASING_CURVES["ease-out"];
  const bezier = (u: number, a: number, b: number) =>
    3 * a * u * (1 - u) * (1 - u) + 3 * b * u * u * (1 - u) + u * u * u;
  let low = 0;
  let high = 1;
  let u = t;
  for (let index = 0; index < 30; index += 1) {
    u = (low + high) / 2;
    if (bezier(u, x1, x2) < t) low = u;
    else high = u;
  }
  return bezier(u, y1, y2);
}

/**
 * Sums Camera Rotate contributions and moves the artwork camera toward them.
 * `update` is called whenever an input changes; `step` once per frame.
 */
export class CameraRig {
  reducedMotion = false;

  private readonly clock: () => number;
  private readonly listeners = new Set<() => void>();
  private readonly sources = new Map<string, CameraSource>();
  private continuous = true;
  private current: CameraAngles = { ...ZERO_CAMERA_ANGLES };
  private goal: CameraAngles = { ...ZERO_CAMERA_ANGLES };
  private governor: InteractionDefinition | null = null;
  private lastStep: number | null = null;
  private pending: { at: number; goal: CameraAngles } | null = null;
  private pitchRange: [number, number] = [
    -MAX_CAMERA_ELEVATION,
    MAX_CAMERA_ELEVATION,
  ];
  private settled = true;
  private speed: CameraAngles = { ...ZERO_CAMERA_ANGLES };
  private tween: Tween | null = null;

  constructor(clock: () => number = defaultClock) {
    this.clock = clock;
  }

  /** The camera's current orbit angles. */
  angles(): CameraAngles {
    return { ...this.current };
  }

  /** Where the camera is heading: every contribution added up. */
  target(): CameraAngles {
    let total = { ...ZERO_CAMERA_ANGLES };
    for (const source of this.sources.values())
      total = addAngles(total, this.contribution(source));
    total.x = clamp(total.x, this.pitchRange[0], this.pitchRange[1]);
    return total;
  }

  snapshot(): CameraRigSnapshot {
    return {
      angles: this.angles(),
      settled: this.settled,
      target: this.target(),
    };
  }

  isSettled() {
    return this.settled;
  }

  /** Reduced motion plays every change directly: no coasting, springs or tweens. */
  setReducedMotion(reduced: boolean) {
    this.reducedMotion = reduced;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Limits the orbit pitch, in degrees relative to the base camera, so the
   * final elevation stays within ±MAX_CAMERA_ELEVATION.
   */
  setPitchRange(min: number, max: number) {
    const low = Math.min(min, max);
    const high = Math.max(min, max);
    if (low === this.pitchRange[0] && high === this.pitchRange[1]) return;
    this.pitchRange = [low, high];
    for (const source of this.sources.values()) this.limitHeldPitch(source);
    this.retarget(this.governor, this.continuous, this.clock());
  }

  update(key: string, interaction: InteractionDefinition, input: CameraInput) {
    const now = this.clock();
    let source = this.sources.get(key);
    if (!source) {
      if (!input.active) return;
      source = {
        active: false,
        coast: null,
        held: { ...ZERO_CAMERA_ANGLES },
        interaction,
        live: { ...ZERO_CAMERA_ANGLES },
        moved: false,
        pitchBias: 0,
        sampleInterval: null,
        sampledAt: null,
        velocity: { ...ZERO_CAMERA_ANGLES },
      };
      this.sources.set(key, source);
    }
    source.interaction = interaction;
    const persistence = cameraPersistence(interaction);
    const live = input.active
      ? {
          x: finite(input.angles.x),
          y: finite(input.angles.y),
          z: finite(input.angles.z),
        }
      : { ...ZERO_CAMERA_ANGLES };
    let changed = false;
    if (input.active) {
      if (!source.active) {
        source.active = true;
        source.coast = null;
        source.moved = false;
        source.pitchBias = 0;
        source.sampleInterval = null;
        source.velocity = { ...ZERO_CAMERA_ANGLES };
        // Absolute inputs (pointer, hover) take over again from the held angle.
        if (persistence === "hold") source.held = { ...ZERO_CAMERA_ANGLES };
        source.sampledAt = now;
        changed = true;
      } else if (!sameAngles(live, source.live)) {
        const elapsed = source.sampledAt === null ? 0 : now - source.sampledAt;
        if (elapsed > 1e-4) {
          const instant = scaleAngles(
            subtractAngles(live, source.live),
            1 / elapsed,
          );
          source.velocity = mixAngles(source.velocity, instant, 0.6);
          // The wait between the press and the first movement says nothing
          // about how often this device reports the pointer.
          if (source.moved) {
            const interval = Math.min(0.4, elapsed);
            source.sampleInterval =
              source.sampleInterval === null
                ? interval
                : source.sampleInterval +
                  (interval - source.sampleInterval) * 0.5;
          }
        }
        // Only movement counts as a sample: a resting pointer must not flick.
        source.moved = true;
        source.sampledAt = now;
        changed = true;
      }
      source.live = live;
      this.limitLivePitch(source);
    } else if (source.active) {
      const released = this.contribution(source);
      source.active = false;
      if (persistence === "accumulate") {
        source.held = released;
        const recent =
          source.sampledAt !== null &&
          now - source.sampledAt < flickWindow(source.sampleInterval);
        source.coast =
          !this.reducedMotion && interaction.motion === "inertia" && recent
            ? scaleAngles(
                source.velocity,
                Math.max(0, finite(interaction.initialVelocity)) / 100,
              )
            : null;
      } else if (persistence === "hold") {
        source.held = released;
      } else {
        source.held = { ...ZERO_CAMERA_ANGLES };
      }
      source.live = { ...ZERO_CAMERA_ANGLES };
      source.pitchBias = 0;
      source.velocity = { ...ZERO_CAMERA_ANGLES };
      this.limitHeldPitch(source);
      changed = true;
    }
    if (!changed) return;
    this.retarget(
      interaction,
      CAMERA_CONTINUOUS_TRIGGERS.has(interaction.trigger),
      now,
    );
  }

  remove(key: string) {
    const source = this.sources.get(key);
    if (!source) return;
    this.sources.delete(key);
    this.retarget(this.governor, this.continuous, this.clock());
  }

  /** Removes the contributions under `prefix` whose keys are not in `keep`. */
  prune(prefix: string, keep: ReadonlySet<string>) {
    for (const key of [...this.sources.keys()])
      if (key.startsWith(prefix) && !keep.has(key)) this.remove(key);
  }

  /** Forget every contribution and put the camera back at once (page change). */
  reset() {
    this.sources.clear();
    this.current = { ...ZERO_CAMERA_ANGLES };
    this.goal = { ...ZERO_CAMERA_ANGLES };
    this.speed = { ...ZERO_CAMERA_ANGLES };
    this.pending = null;
    this.tween = null;
    this.governor = null;
    this.settled = true;
    this.notify();
  }

  /** Advances the camera one frame. Returns true while it is still moving. */
  step(): boolean {
    const now = this.clock();
    const dt = this.lastStep === null ? 0 : clamp(now - this.lastStep, 0, 0.1);
    this.lastStep = now;

    // Released Inertia drags keep turning and slow down (degrees/second).
    let coasted = false;
    let coasting = false;
    for (const source of this.sources.values()) {
      if (!source.coast) continue;
      const decay =
        0.5 +
        (Math.max(0, finite(source.interaction.deceleration)) +
          Math.max(0, finite(source.interaction.friction))) /
          20;
      source.held = addAngles(source.held, scaleAngles(source.coast, dt));
      source.coast = scaleAngles(source.coast, Math.exp(-decay * dt));
      this.limitHeldPitch(source);
      coasted = true;
      if (magnitude(source.coast) < 1) source.coast = null;
      else coasting = true;
    }
    if (coasted) this.goal = this.target();

    if (this.pending && now >= this.pending.at) {
      const { at, goal } = this.pending;
      this.pending = null;
      this.setGoal(goal, at);
    }

    const motion = this.motion();
    if (this.tween) {
      const tween = this.tween;
      const progress =
        tween.duration <= 0 ? 1 : (now - tween.start) / tween.duration;
      if (progress >= 1) {
        this.current = { ...tween.to };
        this.tween = null;
      } else if (progress > 0) {
        this.current = mixAngles(
          tween.from,
          tween.to,
          cameraEase(tween.easing, progress),
        );
      }
    } else if (motion === "spring" || motion === "bounce") {
      this.stepSpring(motion, dt);
    } else {
      const smoothing = this.continuous
        ? Math.max(0, finite(this.governor?.smoothing))
        : 0;
      const tau = this.reducedMotion ? Math.min(0.05, smoothing) : smoothing;
      this.current =
        tau <= 1e-4
          ? { ...this.goal }
          : mixAngles(this.current, this.goal, 1 - Math.exp(-dt / tau));
    }

    const moving =
      coasting ||
      this.pending !== null ||
      this.tween !== null ||
      magnitude(subtractAngles(this.goal, this.current)) > 0.01 ||
      magnitude(this.speed) > 0.01;
    if (!moving) {
      this.current = { ...this.goal };
      this.speed = { ...ZERO_CAMERA_ANGLES };
    }
    this.settled = !moving;
    return moving;
  }

  private contribution(source: CameraSource): CameraAngles {
    if (!source.active) return source.held;
    return addAngles(source.held, {
      ...source.live,
      x: source.live.x + source.pitchBias,
    });
  }

  private otherPitch(except: CameraSource) {
    let pitch = 0;
    for (const source of this.sources.values())
      if (source !== except) pitch += this.contribution(source).x;
    return pitch;
  }

  /** An active drag past the pitch limit shifts its origin, so reversing responds at once. */
  private limitLivePitch(source: CameraSource) {
    const pitch = this.otherPitch(source) + this.contribution(source).x;
    if (pitch > this.pitchRange[1])
      source.pitchBias -= pitch - this.pitchRange[1];
    else if (pitch < this.pitchRange[0])
      source.pitchBias += this.pitchRange[0] - pitch;
  }

  private limitHeldPitch(source: CameraSource) {
    const other = this.otherPitch(source);
    const limited = clamp(
      source.held.x,
      this.pitchRange[0] - other,
      this.pitchRange[1] - other,
    );
    if (limited !== source.held.x) {
      source.held = { ...source.held, x: limited };
      if (source.coast) source.coast = { ...source.coast, x: 0 };
    }
  }

  private motion(): CameraMotion {
    if (this.reducedMotion) return "direct";
    const motion = this.governor?.motion;
    return motion === "spring" || motion === "inertia" || motion === "bounce"
      ? motion
      : "direct";
  }

  private retarget(
    governor: InteractionDefinition | null,
    continuous: boolean,
    now: number,
  ) {
    // After an idle period the next frame must not see one huge time step.
    if (this.settled) this.lastStep = now;
    this.governor = governor;
    this.continuous = continuous;
    const next = this.target();
    const delay =
      !continuous && governor && !this.reducedMotion
        ? Math.max(0, finite(governor.delay))
        : 0;
    if (delay > 0) {
      this.pending = { at: now + delay, goal: next };
    } else {
      this.pending = null;
      this.setGoal(next, now);
    }
    this.settled = false;
    this.notify();
  }

  private setGoal(goal: CameraAngles, now: number) {
    const motion = this.motion();
    this.tween = null;
    if (
      !this.continuous &&
      (motion === "direct" || motion === "inertia") &&
      !sameAngles(goal, this.current)
    ) {
      const duration = this.reducedMotion
        ? 0
        : Math.max(0, finite(this.governor?.duration));
      if (duration > 0) {
        this.tween = {
          duration,
          easing: this.governor?.easing ?? "ease-out",
          from: { ...this.current },
          start: now,
          to: { ...goal },
        };
      } else {
        this.current = { ...goal };
      }
    }
    this.goal = { ...goal };
  }

  private stepSpring(motion: "spring" | "bounce", dt: number) {
    const interaction = this.governor;
    const stiffness =
      motion === "bounce"
        ? Math.max(1, finite(interaction?.bounceStrength)) * 2
        : Math.max(1, finite(interaction?.springStrength));
    const damping =
      motion === "bounce"
        ? Math.max(0, finite(interaction?.bounceDamping)) * 0.6
        : Math.max(0, finite(interaction?.springDamping));
    const mass =
      motion === "bounce" ? 1 : Math.max(0.01, finite(interaction?.springMass));
    const steps = Math.max(1, Math.ceil(dt * 240));
    const h = dt / steps;
    let { x, y, z } = this.current;
    let { x: vx, y: vy, z: vz } = this.speed;
    for (let index = 0; index < steps; index += 1) {
      vx += ((stiffness * (this.goal.x - x) - damping * vx) / mass) * h;
      vy += ((stiffness * (this.goal.y - y) - damping * vy) / mass) * h;
      vz += ((stiffness * (this.goal.z - z) - damping * vz) / mass) * h;
      x += vx * h;
      y += vy * h;
      z += vz * h;
    }
    this.current = { x, y, z };
    this.speed = { x: vx, y: vy, z: vz };
  }

  private notify() {
    for (const listener of this.listeners) listener();
  }
}

/** Elevation of the camera above the target's horizontal plane, in degrees. */
export function cameraElevation(position: CameraVector, target: CameraVector) {
  const dx = position.x - target.x;
  const dy = position.y - target.y;
  const dz = position.z - target.z;
  const radius = Math.hypot(dx, dy, dz);
  if (radius < 1e-9) return 0;
  return (Math.asin(clamp(dy / radius, -1, 1)) * 180) / Math.PI;
}

/** Pitch limits (relative to a base elevation) that keep the orbit upright. */
export function cameraPitchRange(baseElevation: number): [number, number] {
  return [
    -MAX_CAMERA_ELEVATION - baseElevation,
    MAX_CAMERA_ELEVATION - baseElevation,
  ];
}

/**
 * Orbits a camera (three.js world space, Y up) around its target. Y turns the
 * camera around the vertical axis through the target, X raises it (elevation
 * stays within ±MAX_CAMERA_ELEVATION), and the returned roll (radians) is
 * applied about the view axis after `lookAt`.
 */
export function orbitCameraPose(
  position: CameraVector,
  target: CameraVector,
  angles: CameraAngles,
): { position: CameraVector; roll: number } {
  const dx = position.x - target.x;
  const dy = position.y - target.y;
  const dz = position.z - target.z;
  const radius = Math.hypot(dx, dy, dz);
  const roll = (finite(angles.z) * Math.PI) / 180;
  if (radius < 1e-9) return { position: { ...position }, roll };
  const azimuth = Math.atan2(dx, dz) + (finite(angles.y) * Math.PI) / 180;
  const limit = (MAX_CAMERA_ELEVATION * Math.PI) / 180;
  const elevation = clamp(
    Math.asin(clamp(dy / radius, -1, 1)) + (finite(angles.x) * Math.PI) / 180,
    -limit,
    limit,
  );
  const horizontal = radius * Math.cos(elevation);
  return {
    position: {
      x: target.x + horizontal * Math.sin(azimuth),
      y: target.y + radius * Math.sin(elevation),
      z: target.z + horizontal * Math.cos(azimuth),
    },
    roll,
  };
}

/**
 * Preview renders with the Projection / Field of view of the page's first
 * camera effect, so authors choose a perspective camera from the panel.
 */
export function sceneWithCameraProjection(
  scene: Partial<Scene3DSettings> | undefined,
  sources: readonly { interactions?: InteractionDefinition[] }[],
): Partial<Scene3DSettings> | undefined {
  for (const source of sources) {
    const camera = (source.interactions ?? []).find(
      (interaction) =>
        interaction.enabled !== false && isCameraEffect(interaction.effect),
    );
    if (!camera) continue;
    if (camera.cameraProjection === "perspective") {
      return {
        ...scene,
        perspective: clamp(finite(camera.cameraFov) || 35, 1, 160),
        projection: "perspective",
      };
    }
    return { ...scene, projection: "orthographic" };
  }
  return scene;
}
