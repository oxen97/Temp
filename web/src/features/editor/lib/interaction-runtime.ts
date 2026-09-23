/**
 * Viewer interaction runtime — pure core.
 *
 * Turns an element's authored `InteractionDefinition[]` plus the element's live
 * runtime state (which triggers are currently active) into the visual transform
 * to apply in the viewer preview. This is the read side of the interaction
 * engine: the panel/AI write definitions, this computes what the viewer shows.
 *
 * Scope (v1): the core 2D pipeline the viewer can play today — triggers
 * `click-tap` (toggle) and `hover` (momentary, full effect), plus `drag` as a
 * continuous trigger that either repositions the element (drag + move: follow
 * the pointer 1:1 and stay where dropped) or scrubs an effect proportionally to
 * drag progress (drag + rotate/scale/opacity, mapped by `trackDistance`).
 * Also `after-delay` (fires once after `timeSeconds`, auto-play),
 * `pointer-move` (follows / reacts to the cursor over the stage), and
 * `scroll-swipe` (wheel distance scrubs the effect, mapped by `trackDistance`).
 * Effects: `move`, `rotate`, `scale`, `opacity`. Physics motions
 * (spring/inertia/bounce), collision, and 3D-object interactions are handled by
 * later runtime phases; unsupported triggers/effects are simply inert here.
 */
import type { InteractionDefinition } from "@/features/editor/lib/interaction-model";
import { hasTargetDragGesture } from "@/features/editor/lib/interaction-drop-runtime";

export type RuntimeVisual = {
  tx: number;
  ty: number;
  rotate: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
  blur: number;
  shadow: string | null;
  opacity: number | null;
  shake: boolean;
};

export const IDENTITY_VISUAL: RuntimeVisual = {
  tx: 0,
  ty: 0,
  rotate: 0,
  scaleX: 1,
  scaleY: 1,
  skewX: 0,
  skewY: 0,
  blur: 0,
  shadow: null,
  opacity: null,
  shake: false,
};

export type ElementRuntimeState = {
  /** `click-tap` toggles this on each activation. */
  toggled: boolean;
  /** True while a `hover` pointer is over the element. */
  hovering: boolean;
  /** Live pointer delta in artboard pixels while a `drag` is in progress. */
  drag: { dx: number; dy: number } | null;
  /** Committed drag displacement in artboard pixels (persists after drop). */
  dragOffset: { x: number; y: number };
  /** True once an `after-delay` timer has elapsed. */
  timed: boolean;
  /** Accumulated wheel/scroll distance in px for `scroll-swipe`. */
  scroll: number;
  /** Live physics readout (center px + degrees) once released into the sim. */
  physics: { x: number; y: number; rotation: number } | null;
  /** Event-style interactions that fired and keep their authored end state. */
  triggeredInteractionIds: readonly string[];
};

export const IDLE_RUNTIME_STATE: ElementRuntimeState = {
  toggled: false,
  hovering: false,
  drag: null,
  dragOffset: { x: 0, y: 0 },
  timed: false,
  scroll: 0,
  physics: null,
  triggeredInteractionIds: [],
};

/** Triggers this runtime slice can play. */
export const RUNTIME_TRIGGERS = [
  "click-tap",
  "hover",
  "drag",
  "drop-on-target",
  "drop-outside-target",
  "drag-enter-target",
  "drag-leave-target",
  "after-delay",
  "pointer-move",
  "scroll-swipe",
] as const;

/**
 * Per-element geometry the runtime needs for pointer-driven triggers. Supplied
 * by the viewer at render time; omit for elements/interactions that don't use
 * the pointer position.
 */
export type RuntimeContext = {
  /** Pointer position in artboard px, or null when the pointer is off-stage. */
  pointer: { x: number; y: number } | null;
  /** The element's center in artboard px. */
  center: { x: number; y: number };
};

export function isRuntimeInteractionActive(
  interaction: InteractionDefinition,
  state: ElementRuntimeState,
): boolean {
  if (interaction.enabled === false) return false;
  switch (interaction.trigger) {
    case "click-tap":
      return state.toggled;
    case "hover":
      return state.hovering;
    case "drag":
      return state.drag !== null;
    case "after-delay":
      return state.timed;
    case "scroll-swipe":
      return state.scroll > 0;
    case "drop-on-target":
    case "drop-outside-target":
    case "drag-enter-target":
    case "drag-leave-target":
      return state.triggeredInteractionIds.includes(interaction.id);
    default:
      return false;
  }
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Applies one effect at a given intensity (0..1), interpolating from the
 * element's neutral state to the effect's target. Intensity is 1 for momentary
 * triggers (click/hover) and the mapped progress for continuous triggers.
 */
export function accumulateEffect(
  visual: RuntimeVisual,
  interaction: InteractionDefinition,
  intensity = 1,
): RuntimeVisual {
  switch (interaction.effect) {
    case "move":
      return {
        ...visual,
        tx: visual.tx + interaction.moveX * intensity,
        ty: visual.ty + interaction.moveY * intensity,
      };
    case "rotate":
      return {
        ...visual,
        rotate: visual.rotate + interaction.rotateTo * intensity,
      };
    case "scale":
      return {
        ...visual,
        scaleX:
          visual.scaleX * (1 + (interaction.scaleX / 100 - 1) * intensity),
        scaleY:
          visual.scaleY * (1 + (interaction.scaleY / 100 - 1) * intensity),
      };
    case "opacity":
      return {
        ...visual,
        opacity: 1 + (clamp01(interaction.opacityTo / 100) - 1) * intensity,
      };
    case "skew":
      return {
        ...visual,
        skewX: visual.skewX + interaction.skewX * intensity,
        skewY: visual.skewY + interaction.skewY * intensity,
      };
    case "blur":
      return {
        ...visual,
        blur: visual.blur + Math.max(0, interaction.blurAmount) * intensity,
      };
    case "shadow":
      return {
        ...visual,
        shadow: `drop-shadow(${interaction.shadowX * intensity}px ${
          interaction.shadowY * intensity
        }px ${Math.max(0, interaction.shadowBlur * intensity)}px ${
          interaction.shadowColor
        })`,
      };
    case "show-hide":
      // Hide proportionally: fully visible at 0, hidden at 1.
      return { ...visual, opacity: 1 - intensity };
    case "shake":
      return { ...visual, shake: visual.shake || intensity > 0 };
    default:
      return visual;
  }
}

/**
 * How strongly an interaction is currently applied, 0..1. Momentary triggers
 * are on/off; continuous triggers (drag) map an input to a progress value.
 */
export function interactionIntensity(
  interaction: InteractionDefinition,
  state: ElementRuntimeState,
): number {
  if (interaction.enabled === false) return 0;
  switch (interaction.trigger) {
    case "click-tap":
      return state.toggled ? 1 : 0;
    case "hover":
      return state.hovering ? 1 : 0;
    case "drag": {
      if (!state.drag) return 0;
      const distance = Math.hypot(state.drag.dx, state.drag.dy);
      return clamp01(distance / Math.max(1, interaction.trackDistance));
    }
    case "after-delay":
      return state.timed ? 1 : 0;
    case "scroll-swipe":
      return clamp01(state.scroll / Math.max(1, interaction.trackDistance));
    case "drop-on-target":
    case "drop-outside-target":
    case "drag-enter-target":
    case "drag-leave-target":
      return state.triggeredInteractionIds.includes(interaction.id) ? 1 : 0;
    default:
      return 0;
  }
}

/** Accumulates every active interaction on an element into one visual. */
export function runtimeVisualForElement(
  interactions: InteractionDefinition[] | undefined,
  state: ElementRuntimeState,
  context?: RuntimeContext,
): RuntimeVisual {
  // Once an element is released into the physics sim, the simulation drives its
  // transform entirely (position + rotation), overriding authored effects.
  if (state.physics && context) {
    return {
      ...IDENTITY_VISUAL,
      tx: state.physics.x - context.center.x,
      ty: state.physics.y - context.center.y,
      rotate: state.physics.rotation,
    };
  }
  let visual = IDENTITY_VISUAL;
  let directDragApplied = false;
  // Target-aware interactions are complete drag gestures in their own right.
  // This keeps the dragged object under the pointer even when the author did
  // not add a redundant `Drag → Move` interaction alongside Drop On Target.
  if (hasTargetDragGesture(interactions)) {
    visual = {
      ...visual,
      tx: visual.tx + state.dragOffset.x + (state.drag?.dx ?? 0),
      ty: visual.ty + state.dragOffset.y + (state.drag?.dy ?? 0),
    };
    directDragApplied = true;
  }
  for (const interaction of interactions ?? []) {
    if (interaction.enabled === false) continue;
    // Drag + move is direct repositioning: follow the pointer 1:1 and persist
    // the dropped displacement, rather than mapping progress to a target.
    if (interaction.trigger === "drag" && interaction.effect === "move") {
      if (!directDragApplied) {
        visual = {
          ...visual,
          tx: visual.tx + state.dragOffset.x + (state.drag?.dx ?? 0),
          ty: visual.ty + state.dragOffset.y + (state.drag?.dy ?? 0),
        };
        directDragApplied = true;
      }
      continue;
    }
    // Pointer-move reacts to the cursor's position over the stage: move follows
    // the pointer (bounded by moveX/Y over trackDistance); other effects scale
    // with proximity (strongest when the pointer is on the element).
    if (interaction.trigger === "pointer-move") {
      if (!context?.pointer) continue;
      const offsetX = context.pointer.x - context.center.x;
      const offsetY = context.pointer.y - context.center.y;
      const track = Math.max(1, interaction.trackDistance);
      if (interaction.effect === "move") {
        visual = {
          ...visual,
          tx: visual.tx + clamp(offsetX / track, -1, 1) * interaction.moveX,
          ty: visual.ty + clamp(offsetY / track, -1, 1) * interaction.moveY,
        };
      } else {
        const proximity = clamp01(1 - Math.hypot(offsetX, offsetY) / track);
        if (proximity > 0) {
          visual = accumulateEffect(visual, interaction, proximity);
        }
      }
      continue;
    }
    const intensity = interactionIntensity(interaction, state);
    if (intensity <= 0) continue;
    visual = accumulateEffect(visual, interaction, intensity);
  }
  return visual;
}

const CSS_EASINGS = new Set([
  "linear",
  "ease",
  "ease-in",
  "ease-out",
  "ease-in-out",
]);

export function easingToCss(easing: string): string {
  return CSS_EASINGS.has(easing) ? easing : "ease-out";
}

type TransitionProperty = "transform" | "opacity" | "filter";

/** Only effects composed by RuntimeVisual own these CSS properties. */
function transitionPropertyForEffect(effect: string): TransitionProperty | null {
  switch (effect) {
    case "move":
    case "rotate":
    case "scale":
    case "skew":
      return "transform";
    case "opacity":
    case "show-hide":
      return "opacity";
    case "blur":
    case "shadow":
      return "filter";
    default:
      return null;
  }
}

/**
 * Dragging follows the pointer without a CSS transition. Other pointer-driven
 * properties use the continuous TIMING controls (Smoothing / Easing), never a
 * hidden event Duration / Delay. This also applies while returning to rest
 * after pointer leave. Unrelated event properties keep their event timing.
 *
 * Transform components share one CSS property: if continuous and event effects
 * both change transform, continuous timing wins so an event cannot unexpectedly
 * add latency to pointer following. Event-only Direct still uses Duration.
 */
export function activeTransition(
  interactions: InteractionDefinition[] | undefined,
  state: ElementRuntimeState,
): string {
  if (state.drag) return "none";
  const activeInteractions = (interactions ?? []).filter(
    (interaction) =>
      interaction.trigger !== "drag" &&
      isRuntimeInteractionActive(interaction, state),
  );
  const activeById = new Map(
    activeInteractions.map((interaction) => [interaction.id, interaction]),
  );
  const latestTriggered = [...state.triggeredInteractionIds]
    .reverse()
    .map((id) => activeById.get(id))
    .find((interaction) => interaction !== undefined);
  const active = latestTriggered ?? activeInteractions[0];
  const continuousByProperty = new Map<TransitionProperty, InteractionDefinition>();
  for (const interaction of interactions ?? []) {
    if (interaction.enabled === false || interaction.trigger !== "pointer-move") {
      continue;
    }
    const property = transitionPropertyForEffect(interaction.effect);
    if (property && !continuousByProperty.has(property)) {
      continuousByProperty.set(property, interaction);
    }
  }
  return (["transform", "opacity", "filter"] as const)
    .map((property) => {
      const continuous = continuousByProperty.get(property);
      return `${property} ${transitionTiming(continuous ?? active, !!continuous)}`;
    })
    .join(", ");
}

function transitionTiming(
  active: InteractionDefinition | undefined,
  continuous: boolean,
): string {
  let duration = active
    ? Math.max(0, continuous ? active.smoothing : active.duration)
    : 0.3;
  let easing = active
    ? easingToCss(continuous ? active.continuousEasing : active.easing)
    : "ease-out";
  if (active?.motion === "spring") {
    const springScale = clamp(
      Math.sqrt(
        (Math.max(0.01, active.springMass) * 100) /
          Math.max(1, active.springStrength),
      ),
      0.5,
      2.5,
    );
    duration *= springScale;
    const overshoot = 1 + clamp((20 - active.springDamping) / 40, 0, 0.5);
    easing = `cubic-bezier(0.2, ${overshoot}, 0.3, 1)`;
  }
  // Target commands are dispatched after their delay so geometry is captured
  // at the firing moment; ordinary visual effects use a CSS delay.
  const delay =
    active &&
    !continuous &&
    active.trigger !== "drop-on-target" &&
    active.trigger !== "drop-outside-target" &&
    active.trigger !== "drag-enter-target" &&
    active.trigger !== "drag-leave-target"
      ? Math.max(0, active.delay)
      : 0;
  return `${duration}s ${easing} ${delay}s`;
}

export function composeTransform(
  baseRotation: number,
  visual: RuntimeVisual,
): string {
  return `translate(${visual.tx}px, ${visual.ty}px) rotate(${
    baseRotation + visual.rotate
  }deg) scale(${visual.scaleX}, ${visual.scaleY}) skew(${visual.skewX}deg, ${
    visual.skewY
  }deg)`;
}

/** CSS `filter` value for blur/shadow effects, or undefined when neither applies. */
export function composeFilter(visual: RuntimeVisual): string | undefined {
  const parts: string[] = [];
  if (visual.blur > 0) parts.push(`blur(${visual.blur}px)`);
  if (visual.shadow) parts.push(visual.shadow);
  return parts.length ? parts.join(" ") : undefined;
}

/** Does the element have any interaction this runtime slice can play? */
export function hasRuntimeInteractions(
  interactions: InteractionDefinition[] | undefined,
): boolean {
  return (interactions ?? []).some(
    (interaction) =>
      interaction.enabled !== false &&
      (RUNTIME_TRIGGERS as readonly string[]).includes(interaction.trigger),
  );
}
