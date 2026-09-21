/**
 * Canonical, serializable interaction model.
 *
 * This is the single persisted shape an authored interaction takes on a 2D
 * element. The interaction panel (its current preview UI and any future
 * redesign), the viewer runtime, and AI-generated drafts all target this
 * type — the panel writes it, the runtime reads it, and it round-trips through
 * the project document (2D elements are stored as pass-through data, so no
 * schema change is required to persist it).
 *
 * Field vocabulary mirrors the interaction pipeline (WHEN → MAPPING → DO → HOW
 * → TIMING → RESET → ADVANCED) defined in `interaction-panel-policy.ts`. Values
 * are plain scalars so a definition can be shallow-merged, diffed, and safely
 * serialized to JSON.
 *
 * Scope: this v1 covers the 2D authoring pipeline. 3D-object-only sections
 * (spatial transforms, colliders, rigid bodies, GLB clip/material/morph
 * control) and the camera / visual-pipeline / shader sections are intentionally
 * left out until their runtimes exist; `normalizeInteraction` fills defaults for
 * any field a stored definition is missing, so those sections can be added later
 * without breaking existing data.
 */
export type InteractionDefinition = {
  // Identity
  id: string;
  enabled: boolean;
  name: string;

  // WHEN — trigger
  trigger: string;
  triggerArea: string;
  sourceVideo: string;
  fallback: string;
  longPressSeconds: number;
  collisionTarget: string;
  detection: string;
  joinDistance: number;
  releaseDistance: number;
  timeSeconds: number;

  // MAPPING
  mapping: string;
  pointerAxis: string;
  mappingMode: string;
  trackDistance: number;
  dragAxis: string;
  rangeMin: number;
  rangeMax: number;
  threshold: number;

  // DO — effect
  effect: string;
  groupEffect: string;
  moveX: number;
  moveY: number;
  movePath: string;
  referencePoint: string;
  scaleX: number;
  scaleY: number;
  rotateTo: number;
  opacityTo: number;
  skewX: number;
  skewY: number;
  blurAmount: number;
  shadowColor: string;
  shadowX: number;
  shadowY: number;
  shadowBlur: number;
  bridgeWidth: number;
  liquidSmoothness: number;
  affectedObjects: string;
  impactBounciness: number;
  impactMass: number;
  targetMass: number;
  impactFriction: number;

  // HOW — motion
  motion: string;
  springStrength: number;
  springMass: number;
  springDamping: number;
  initialVelocity: number;
  friction: number;
  deceleration: number;
  bounceStrength: number;
  bounceCount: number;
  bounceDamping: number;
  bounceOff: string;
  gravityContact: string;
  stackColliders: string;
  stackObstacleIds: string[];
  stackMass: number;
  stackFriction: number;
  stackSleepSpeed: number;
  gravityStrength: number;
  bounciness: number;
  gravityDirection: string;

  // TIMING
  duration: number;
  delay: number;
  stagger: number;
  easing: string;
  smoothing: number;
  continuousEasing: string;

  // RESET
  resetMode: string;

  // ADVANCED
  sameProperty: string;
  otherProperty: string;
  repeat: number;
  yoyo: boolean;
  hold: number;
  cursor: string;
};

function createInteractionId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `interaction-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 9)}`
  );
}

/**
 * Default authored interaction. Defaults match the interaction panel's initial
 * control values so a freshly created definition is a valid, sensible starting
 * point. `overrides` are applied last, so passing `{ id }` reuses a caller's id
 * and passing any field replaces its default.
 */
export function createDefaultInteraction(
  overrides: Partial<InteractionDefinition> = {},
): InteractionDefinition {
  return {
    id: createInteractionId(),
    enabled: true,
    name: "",

    trigger: "click-tap",
    triggerArea: "selected-object",
    sourceVideo: "",
    fallback: "tap",
    longPressSeconds: 0.5,
    collisionTarget: "",
    detection: "bounding-box",
    joinDistance: 30,
    releaseDistance: 45,
    timeSeconds: 5,

    mapping: "drag-progress",
    pointerAxis: "both",
    mappingMode: "follow",
    trackDistance: 300,
    dragAxis: "free",
    rangeMin: 0,
    rangeMax: 100,
    threshold: 80,

    effect: "move",
    groupEffect: "move",
    moveX: 100,
    moveY: 0,
    movePath: "straight",
    referencePoint: "center",
    scaleX: 120,
    scaleY: 120,
    rotateTo: 45,
    opacityTo: 40,
    skewX: 12,
    skewY: 0,
    blurAmount: 6,
    shadowColor: "rgba(0, 0, 0, 0.35)",
    shadowX: 0,
    shadowY: 12,
    shadowBlur: 24,
    bridgeWidth: 50,
    liquidSmoothness: 60,
    affectedObjects: "selected",
    impactBounciness: 65,
    impactMass: 1,
    targetMass: 1,
    impactFriction: 20,

    motion: "spring",
    springStrength: 100,
    springMass: 1,
    springDamping: 12,
    initialVelocity: 100,
    friction: 50,
    deceleration: 50,
    bounceStrength: 100,
    bounceCount: 2,
    bounceDamping: 12,
    bounceOff: "artboard",
    gravityContact: "bounce",
    stackColliders: "physics",
    stackObstacleIds: [],
    stackMass: 1,
    stackFriction: 25,
    stackSleepSpeed: 5,
    gravityStrength: 100,
    bounciness: 50,
    gravityDirection: "down",

    duration: 0.3,
    delay: 0,
    stagger: 0.05,
    easing: "ease-out",
    smoothing: 0.1,
    continuousEasing: "linear",

    resetMode: "contextual",

    sameProperty: "replace",
    otherProperty: "parallel",
    repeat: 1,
    yoyo: false,
    hold: 0,
    cursor: "pointer",
    ...overrides,
  };
}

/**
 * Coerces arbitrary stored/generated data into a valid `InteractionDefinition`.
 * Any missing or wrong-typed field falls back to its default, so definitions
 * survive schema evolution and malformed AI output without throwing. Only fields
 * present on the current model are kept; unknown fields are dropped.
 */
export function normalizeInteraction(raw: unknown): InteractionDefinition {
  const base = createDefaultInteraction();
  if (!raw || typeof raw !== "object") return base;
  const source = raw as Record<string, unknown>;
  const result: Record<string, unknown> = { ...base };
  for (const key of Object.keys(base)) {
    const fallback = (base as Record<string, unknown>)[key];
    const value = source[key];
    if (key === "id") {
      if (typeof value === "string" && value.length > 0) result[key] = value;
    } else if (Array.isArray(fallback)) {
      if (
        Array.isArray(value) &&
        value.every((item) => typeof item === "string")
      ) {
        result[key] = [...value];
      }
    } else if (typeof fallback === "number") {
      if (typeof value === "number" && Number.isFinite(value)) {
        result[key] = value;
      }
    } else if (typeof fallback === "boolean") {
      if (typeof value === "boolean") result[key] = value;
    } else if (typeof fallback === "string") {
      if (typeof value === "string") result[key] = value;
    }
  }
  return result as InteractionDefinition;
}

/** Normalizes a stored list, dropping non-object entries. */
export function normalizeInteractions(raw: unknown): InteractionDefinition[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (entry) => entry && typeof entry === "object" && !Array.isArray(entry),
    )
    .map((entry) => normalizeInteraction(entry));
}
