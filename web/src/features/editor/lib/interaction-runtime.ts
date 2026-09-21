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
 * Effects: `move`, `rotate`, `scale`, `opacity`. Physics motions
 * (spring/inertia/bounce), collision, and 3D-object interactions are handled by
 * later runtime phases; unsupported triggers/effects are simply inert here.
 */
import type { InteractionDefinition } from "@/features/editor/lib/interaction-model";

export type RuntimeVisual = {
  tx: number;
  ty: number;
  rotate: number;
  scaleX: number;
  scaleY: number;
  opacity: number | null;
};

export const IDENTITY_VISUAL: RuntimeVisual = {
  tx: 0,
  ty: 0,
  rotate: 0,
  scaleX: 1,
  scaleY: 1,
  opacity: null,
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
};

export const IDLE_RUNTIME_STATE: ElementRuntimeState = {
  toggled: false,
  hovering: false,
  drag: null,
  dragOffset: { x: 0, y: 0 },
};

/** Triggers this runtime slice can play. */
export const RUNTIME_TRIGGERS = ["click-tap", "hover", "drag"] as const;

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
    default:
      return false;
  }
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
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
    default:
      return 0;
  }
}

/** Accumulates every active interaction on an element into one visual. */
export function runtimeVisualForElement(
  interactions: InteractionDefinition[] | undefined,
  state: ElementRuntimeState,
): RuntimeVisual {
  let visual = IDENTITY_VISUAL;
  for (const interaction of interactions ?? []) {
    if (interaction.enabled === false) continue;
    // Drag + move is direct repositioning: follow the pointer 1:1 and persist
    // the dropped displacement, rather than mapping progress to a target.
    if (interaction.trigger === "drag" && interaction.effect === "move") {
      visual = {
        ...visual,
        tx: visual.tx + state.dragOffset.x + (state.drag?.dx ?? 0),
        ty: visual.ty + state.dragOffset.y + (state.drag?.dy ?? 0),
      };
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

/**
 * CSS transition for an element. Dragging follows the pointer with no easing;
 * otherwise transform + opacity animate over the active interaction's duration.
 */
export function activeTransition(
  interactions: InteractionDefinition[] | undefined,
  state: ElementRuntimeState,
): string {
  if (state.drag) return "none";
  const active = (interactions ?? []).find(
    (interaction) =>
      interaction.trigger !== "drag" &&
      isRuntimeInteractionActive(interaction, state),
  );
  const duration = active ? Math.max(0, active.duration) : 0.3;
  const easing = active ? easingToCss(active.easing) : "ease-out";
  return `transform ${duration}s ${easing}, opacity ${duration}s ${easing}`;
}

export function composeTransform(
  baseRotation: number,
  visual: RuntimeVisual,
): string {
  return `translate(${visual.tx}px, ${visual.ty}px) rotate(${
    baseRotation + visual.rotate
  }deg) scale(${visual.scaleX}, ${visual.scaleY})`;
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
