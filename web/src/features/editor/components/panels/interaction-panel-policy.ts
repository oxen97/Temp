export type InteractionOption = { label: string; value: string };

export const continuousInteractionTriggers = new Set([
  "pointer-move",
  "drag",
  "wheel-pinch",
  "scroll-swipe",
  "while-overlapping",
]);

export const collisionInteractionTriggers = new Set([
  "overlap-start",
  "while-overlapping",
  "overlap-end",
  "drop-on-target",
]);

export const timeInteractionTriggers = new Set([
  "after-delay",
  "repeat-every",
  "idle-start",
  "idle-end",
]);

export const mediaInteractionTriggers = new Set(["video-starts", "video-ends"]);

export const pageInteractionTriggers = new Set(["page-enter", "page-exit"]);

export const mappingOptions: Record<string, InteractionOption[]> = {
  "pointer-move": [
    { label: "Pointer Position", value: "pointer-position" },
    { label: "Pointer Velocity", value: "pointer-velocity" },
  ],
  drag: [
    { label: "Drag Progress", value: "drag-progress" },
    { label: "Drag Angle", value: "drag-angle" },
    { label: "Pointer Velocity", value: "pointer-velocity" },
  ],
  "wheel-pinch": [{ label: "Wheel / Pinch Amount", value: "wheel-amount" }],
  "scroll-swipe": [{ label: "Scroll Progress", value: "scroll-progress" }],
  "while-overlapping": [{ label: "Overlap Time", value: "overlap-time" }],
};

const commonEffects: InteractionOption[] = [
  { label: "Move", value: "move" },
  { label: "Scale", value: "scale" },
  { label: "Rotate", value: "rotate" },
  { label: "Skew", value: "skew" },
  { label: "Distort", value: "distort" },
  { label: "Opacity", value: "opacity" },
  { label: "Color", value: "color" },
  { label: "Blur", value: "blur" },
  { label: "Shadow", value: "shadow" },
  { label: "Show / Hide", value: "show-hide" },
  { label: "Shake", value: "shake" },
  { label: "Order", value: "order" },
];

const imageEffects: InteractionOption[] = [
  { label: "Particle", value: "particle" },
  { label: "Pixelate", value: "pixelate" },
  { label: "Dissolve", value: "dissolve" },
  { label: "Trail", value: "trail" },
];

const textEffects: InteractionOption[] = [
  { label: "Text Reveal", value: "text-reveal" },
  { label: "Stroke Draw", value: "stroke-draw" },
  { label: "Character Animation", value: "character-animation" },
  { label: "Word Animation", value: "word-animation" },
];

const videoEffects: InteractionOption[] = [
  { label: "Play", value: "play" },
  { label: "Pause", value: "pause" },
  { label: "Resume", value: "resume" },
  { label: "Seek", value: "seek" },
];

export const immediateEffects = new Set([
  "order",
  "play",
  "pause",
  "resume",
  "seek",
]);

export function getEffectOptions(
  selectedTypes: readonly string[],
): InteractionOption[] {
  if (selectedTypes.length > 1) {
    return [
      ...commonEffects,
      { label: "Group Animation", value: "group-animation" },
    ];
  }
  const type = selectedTypes[0];
  if (type === "image") return [...commonEffects, ...imageEffects];
  if (type === "text") return [...commonEffects, ...textEffects];
  if (type === "video") return [...commonEffects, ...videoEffects];
  return commonEffects;
}

export function getMappingOptions(trigger: string): InteractionOption[] {
  return mappingOptions[trigger] ?? [];
}

export function getMotionOptions(
  trigger: string,
  mapping: string,
  effect: string,
): InteractionOption[] {
  if (immediateEffects.has(effect)) return [];
  const eventMotions = ["direct", "spring", "inertia", "bounce", "gravity"];
  const progressMotions = ["direct", "spring", "inertia", "bounce"];
  const velocityMotions = ["direct", "spring"];
  const triggerMotions = !continuousInteractionTriggers.has(trigger)
    ? eventMotions
    : mapping === "pointer-velocity" ||
        mapping === "pointer-position" ||
        mapping === "overlap-time"
      ? velocityMotions
      : progressMotions;
  const effectMotions: Record<string, string[]> = {
    move: eventMotions,
    rotate: progressMotions,
    scale: ["direct", "spring", "bounce"],
    skew: ["direct", "spring"],
    distort: ["direct", "spring"],
  };
  const allowed = effectMotions[effect] ?? ["direct"];
  const labels: Record<string, string> = {
    direct: "Direct",
    spring: "Spring",
    inertia: "Inertia",
    bounce: "Bounce",
    gravity: "Gravity",
  };
  return triggerMotions
    .filter((value) => allowed.includes(value))
    .map((value) => ({ label: labels[value], value }));
}

export type ResetPolicy = {
  description: string;
  options: InteractionOption[];
};

export function getResetPolicy(
  trigger: string,
  hoverFallback: string,
): ResetPolicy {
  const contextual = { label: "Contextual default", value: "contextual" };
  const keep = { label: "Keep final state", value: "keep" };
  const restart = { label: "Restart when triggered again", value: "restart" };
  const release = { label: "Return when trigger ends", value: "return" };
  const leave = { label: "Return when pointer leaves", value: "leave" };
  const pageExit = { label: "Return on page exit", value: "page-exit" };
  const reverse = { label: "Follow reverse scroll", value: "reverse" };
  if (trigger === "hover") {
    return {
      description:
        hoverFallback === "long-press"
          ? "Default: return when the pointer leaves or the finger is released."
          : hoverFallback === "tap"
            ? "Default: return on pointer leave; mobile Tap toggles off on the next tap."
            : "Default: return when the pointer leaves or touch ends.",
      options: [contextual, leave, release, keep],
    };
  }
  if (trigger === "pointer-move") {
    return {
      description: "Default: return when the pointer leaves or touch ends.",
      options: [contextual, leave, release, keep],
    };
  }
  if (trigger === "drag" || trigger === "while-overlapping") {
    return {
      description:
        trigger === "drag"
          ? "Default: return when the drag is released."
          : "Default: return when the elements separate.",
      options: [contextual, release, keep],
    };
  }
  if (trigger === "scroll-swipe") {
    return {
      description: "Default: follow scroll progress in both directions.",
      options: [contextual, reverse, keep, pageExit],
    };
  }
  if (trigger === "wheel-pinch") {
    return {
      description: "Default: keep the mapped value until page exit.",
      options: [contextual, pageExit, release],
    };
  }
  if (trigger === "page-enter") {
    return {
      description: "Default: hold the result until page exit.",
      options: [contextual],
    };
  }
  if (trigger === "page-exit") {
    return {
      description:
        "Default: run the exit effect, then discard this page's runtime state.",
      options: [contextual],
    };
  }
  return {
    description:
      "Default: keep the final state; replay from the beginning when retriggered.",
    options:
      trigger === "long-press"
        ? [contextual, keep, restart, release]
        : [contextual, keep, restart],
  };
}
