export type InteractionOption = { label: string; value: string };

export type Interaction3DContext = {
  /** Explicitly marks this interaction as targeting one or more 3D objects. */
  is3D?: boolean;
  /** The selected 3D object's source, when every selected object shares it. */
  sourceKind?: "asset" | "primitive" | "vector";
  /** Imported clip names. An empty array means that the asset has no clips. */
  animationNames?: readonly string[];
  /** Allows callers to expose authored morph-target animation controls. */
  hasMorphTargets?: boolean;
  /** Allows callers to expose source-material slot controls. */
  hasMaterialSlots?: boolean;
  /** A selected 2D object can collide with a 3D proxy on this page. */
  isHybridCollision?: boolean;
  hasBones?: boolean;
  hasJoints?: boolean;
  hasMeshes?: boolean;
  hasMeshFaceGroups?: boolean;
};

export const threeDCollisionTriggerOptions: InteractionOption[] = [
  { label: "Collision Enter", value: "collision-enter" },
  { label: "While Colliding", value: "while-colliding" },
  { label: "Collision Exit", value: "collision-exit" },
];

export const model3DTriggerOptions: InteractionOption[] = [
  { label: "Model Animation Starts", value: "model-animation-start" },
  { label: "While Model Animation Plays", value: "while-model-animation" },
  { label: "Model Animation Ends", value: "model-animation-end" },
  { label: "Model Animation Loops", value: "model-animation-loop" },
  { label: "Model Animation Marker", value: "model-animation-marker" },
];

export const modelInteractionTriggers = new Set(
  model3DTriggerOptions.map((option) => option.value),
);

export const continuousInteractionTriggers = new Set([
  "pointer-move",
  "drag",
  "wheel-pinch",
  "scroll-swipe",
  "while-overlapping",
  "near-target",
  "while-colliding",
  "while-model-animation",
]);

export const collisionInteractionTriggers = new Set([
  "overlap-start",
  "while-overlapping",
  "overlap-end",
  "drop-on-target",
  "drop-outside-target",
  "drag-enter-target",
  "drag-leave-target",
  "near-target",
  ...threeDCollisionTriggerOptions.map((option) => option.value),
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
  "near-target": [
    { label: "Proximity to Target", value: "distance-to-target" },
  ],
  "while-colliding": [
    { label: "Contact Duration", value: "contact-duration" },
    { label: "Collision Impulse", value: "collision-impulse" },
    { label: "Penetration Depth", value: "penetration-depth" },
  ],
  "while-model-animation": [
    { label: "Animation Progress", value: "animation-progress" },
    { label: "Animation Time", value: "animation-time" },
  ],
};

const threeDMappingAdditions: Record<string, InteractionOption[]> = {
  drag: [
    { label: "3D Position", value: "position-3d" },
    { label: "Depth Progress", value: "depth-progress" },
  ],
  "near-target": [{ label: "3D Distance", value: "distance-3d" }],
  "pointer-move": [
    { label: "Surface Position", value: "surface-position" },
    { label: "Pointer Depth", value: "pointer-depth" },
  ],
};

const liquidMergeTriggers = new Set(["near-target", "while-overlapping"]);
const strandBendTriggers = new Set(["drag", "pointer-move"]);
const pointerTrailTriggers = new Set(["drag"]);
const waveDeformTriggers = new Set(["pointer-move"]);
const deformableTypes = new Set(["line", "pen", "image", "video", "object3d"]);
const collisionBounceTriggers = new Set(["overlap-start", "drop-on-target"]);
const mergeable2DTypes = new Set([
  "rectangle", "circle", "triangle", "star", "line", "pen", "image", "video",
]);

export function isLiquidMergeShape(type: string): boolean {
  return mergeable2DTypes.has(type);
}

export function isLiquidMergeTarget(sourceType: string, targetType: string, trigger = "near-target"): boolean {
  if (sourceType === "object3d") return targetType === "object3d";
  if (!isLiquidMergeShape(sourceType) || !isLiquidMergeShape(targetType)) return false;
  const hasMedia = [sourceType, targetType].some((type) => type === "image" || type === "video");
  if (hasMedia && trigger !== "near-target") return false;
  return !hasMedia || ![sourceType, targetType].some((type) => type === "line" || type === "pen");
}

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

const twoDTargetEffects: InteractionOption[] = [
  { label: "Snap to Target", value: "snap-to-target" },
  { label: "Return to Origin", value: "return-to-origin" },
  { label: "Attach to Target", value: "attach-to-target" },
  { label: "Open Modal", value: "open-modal" },
  { label: "Close Modal", value: "close-modal" },
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

export const cameraEffects: InteractionOption[] = [
  { label: "Camera Move", value: "camera-move" },
  { label: "Camera Zoom / Dolly", value: "camera-zoom" },
  { label: "Camera Rotate", value: "camera-rotate" },
  { label: "Camera Look At", value: "camera-look-at" },
  { label: "Camera Shake", value: "camera-shake" },
];

export const visualPipelineEffects: InteractionOption[] = [
  { label: "Animate Lighting", value: "animate-lighting" },
  { label: "Post Processing", value: "post-processing" },
  { label: "Shader Parameter", value: "shader-parameter" },
];

export const spatial3DEffects: InteractionOption[] = [
  { label: "Look At Target", value: "look-at-target" },
  { label: "Orbit Around Target", value: "orbit-around-target" },
  { label: "Attach To Target", value: "attach-to-target" },
];

export const model3DAnimationEffects: InteractionOption[] = [
  { label: "Play Model Animation", value: "play-model-animation" },
  { label: "Pause Model Animation", value: "pause-model-animation" },
  { label: "Resume Model Animation", value: "resume-model-animation" },
  { label: "Stop Model Animation", value: "stop-model-animation" },
  { label: "Change Model Animation", value: "change-model-animation" },
  { label: "Seek Model Animation", value: "seek-model-animation" },
  {
    label: "Crossfade Model Animation",
    value: "crossfade-model-animation",
  },
];

export const model3DMaterialEffects: InteractionOption[] = [
  { label: "Change Material", value: "change-material" },
  { label: "Material Parameter", value: "material-parameter" },
  { label: "Material Slot", value: "material-slot" },
];

export const model3DMorphEffects: InteractionOption[] = [
  { label: "Morph Target", value: "morph-target" },
];

export const model3DStructureEffects: InteractionOption[] = [
  { label: "Bone Transform", value: "bone-transform" },
  { label: "Joint Rotation", value: "joint-rotation" },
  { label: "Mesh Transform", value: "mesh-transform" },
  { label: "Mesh Visibility", value: "mesh-visibility" },
  { label: "Mesh Face Material", value: "mesh-face-material" },
];

const modelAnimationEffectValues = new Set(
  model3DAnimationEffects.map((option) => option.value),
);

export const immediateEffects = new Set([
  "pointer-trail",
  "spawn-instance",
  "emit-event",
  "order",
  "play",
  "pause",
  "resume",
  "seek",
  "open-modal",
  "close-modal",
  "play-model-animation",
  "pause-model-animation",
  "resume-model-animation",
  "stop-model-animation",
  "change-model-animation",
  "seek-model-animation",
  "crossfade-model-animation",
  "material-slot",
  "mesh-visibility",
  "mesh-face-material",
]);

function is3DSelection(
  selectedTypes: readonly string[],
  context: Interaction3DContext,
) {
  return context.is3D ?? selectedTypes.some((type) => type === "object3d");
}

export function getEffectOptions(
  selectedTypes: readonly string[],
  trigger = "",
  context: Interaction3DContext = {},
): InteractionOption[] {
  if (selectedTypes.length > 1) {
    const optionsByType = selectedTypes.map((type) =>
      getEffectOptions([type], trigger, {
        ...context,
        is3D: type === "object3d",
      }),
    );
    const singleTargetEffects = new Set([
      "liquid-merge", "collision-bounce", "stack-on-target",
    ]);
    return [
      ...optionsByType[0].filter(
        (option) =>
          !singleTargetEffects.has(option.value) &&
          optionsByType.every((options) =>
            options.some((candidate) => candidate.value === option.value),
          ),
      ),
      { label: "Group Animation", value: "group-animation" },
    ];
  }
  const is3D = is3DSelection(selectedTypes, context);
  const hybridCollisionEffects =
    selectedTypes.length === 1 && context.isHybridCollision
      ? [
          ...(trigger === "collision-enter"
            ? [{ label: "Bounce Off Target", value: "collision-bounce" }]
            : []),
          ...(trigger === "collision-enter" || trigger === "drop-on-target"
            ? [{ label: "Stack On Target", value: "stack-on-target" }]
            : []),
        ]
      : [];
  const authoredPointerEffects: InteractionOption[] = [
    ...(trigger === "click-tap"
      ? [{ label: "Emit Event (Logic Only)", value: "emit-event" }]
      : []),
    ...(pointerTrailTriggers.has(trigger)
      ? [{ label: "Emit Pointer Trail", value: "pointer-trail" }]
      : []),
    ...(trigger === "click-tap"
      ? [{ label: "Spawn Instance", value: "spawn-instance" }]
      : []),
  ];
  const type = selectedTypes[0];
  const deformationEffects: InteractionOption[] = deformableTypes.has(type)
    ? [
        ...(strandBendTriggers.has(trigger)
          ? [{ label: "Strand Bend", value: "strand-bend" }]
          : []),
        ...(waveDeformTriggers.has(trigger)
          ? [{ label: "Wave / Curve Deform", value: "wave-deform" }]
          : []),
      ]
    : [];
  if (type === "image") {
    return [
      ...commonEffects,
      ...cameraEffects,
      ...visualPipelineEffects,
      ...twoDTargetEffects,
      ...imageEffects,
      ...authoredPointerEffects,
      ...deformationEffects,
      ...(trigger === "near-target"
        ? [{ label: "Liquid Merge", value: "liquid-merge" }]
        : []),
      ...(collisionBounceTriggers.has(trigger)
        ? [{ label: "Bounce Off Target", value: "collision-bounce" }]
        : []),
      ...hybridCollisionEffects,
    ];
  }
  if (type === "text")
    return [
      ...commonEffects,
      ...cameraEffects,
      ...visualPipelineEffects,
      ...twoDTargetEffects,
      ...textEffects,
      ...authoredPointerEffects,
      ...hybridCollisionEffects,
    ];
  if (type === "video")
    return [
      ...commonEffects,
      ...cameraEffects,
      ...visualPipelineEffects,
      ...twoDTargetEffects,
      ...videoEffects,
      ...authoredPointerEffects,
      ...deformationEffects,
      ...(trigger === "near-target"
        ? [{ label: "Liquid Merge", value: "liquid-merge" }]
        : []),
      ...hybridCollisionEffects,
    ];
  if (is3D) {
    const hasAnimations = (context.animationNames?.length ?? 0) > 0;
    return [
      ...commonEffects,
      ...cameraEffects,
      ...visualPipelineEffects,
      ...spatial3DEffects,
      ...deformationEffects,
      ...authoredPointerEffects,
      ...twoDTargetEffects.filter((option) => option.value !== "attach-to-target"),
      { label: "Change Material", value: "change-material" },
      { label: "Material Parameter", value: "material-parameter" },
      ...(context.sourceKind === "asset" && hasAnimations
        ? model3DAnimationEffects
        : []),
      ...(context.sourceKind === "asset" && context.hasMaterialSlots
        ? [{ label: "Material Slot", value: "material-slot" }]
        : []),
      ...(context.sourceKind === "asset" && context.hasMorphTargets
        ? model3DMorphEffects
        : []),
      ...(context.sourceKind === "asset" && context.hasBones
        ? [{ label: "Bone Transform", value: "bone-transform" }]
        : []),
      ...(context.sourceKind === "asset" && context.hasJoints
        ? [{ label: "Joint Rotation", value: "joint-rotation" }]
        : []),
      ...(context.sourceKind === "asset" && context.hasMeshes
        ? [
            { label: "Mesh Transform", value: "mesh-transform" },
            { label: "Mesh Visibility", value: "mesh-visibility" },
          ]
        : []),
      ...(context.sourceKind === "asset" && context.hasMeshFaceGroups
        ? [{ label: "Mesh Face Material", value: "mesh-face-material" }]
        : []),
      ...(liquidMergeTriggers.has(trigger)
        ? [{ label: "Liquid Merge", value: "liquid-merge" }]
        : []),
      ...(collisionBounceTriggers.has(trigger) || trigger === "collision-enter"
        ? [{ label: "Bounce Off Target", value: "collision-bounce" }]
        : []),
      ...(trigger === "collision-enter" || trigger === "drop-on-target"
        ? [{ label: "Stack On Target", value: "stack-on-target" }]
        : []),
    ];
  }
  return [
    ...commonEffects,
    ...cameraEffects,
    ...visualPipelineEffects,
    ...twoDTargetEffects,
    ...authoredPointerEffects,
    ...deformationEffects,
    ...(type !== undefined &&
    isLiquidMergeShape(type) &&
    liquidMergeTriggers.has(trigger)
      ? [{ label: "Liquid Merge", value: "liquid-merge" }]
      : []),
    ...(selectedTypes.length === 1 && collisionBounceTriggers.has(trigger)
      ? [{ label: "Bounce Off Target", value: "collision-bounce" }]
      : []),
    ...hybridCollisionEffects,
  ];
}

export function getMappingOptions(
  trigger: string,
  context: Interaction3DContext = {},
): InteractionOption[] {
  const options = mappingOptions[trigger] ?? [];
  if (!context.is3D) return options;
  return [...options, ...(threeDMappingAdditions[trigger] ?? [])];
}

export function getMotionOptions(
  trigger: string,
  mapping: string,
  effect: string,
  groupSubEffect = "move",
): InteractionOption[] {
  // Group Animation is a stagger wrapper: motions come from the child effect.
  const resolvedEffect = effect === "group-animation" ? groupSubEffect : effect;
  if (resolvedEffect === "collision-bounce") {
    return [{ label: "Collision bounce", value: "collision-bounce" }];
  }
  if (resolvedEffect === "stack-on-target") {
    return [{ label: "Gravity", value: "gravity" }];
  }
  if (immediateEffects.has(resolvedEffect)) return [];
  const eventMotions = ["direct", "spring", "inertia", "bounce", "gravity"];
  const progressMotions = ["direct", "spring", "inertia", "bounce"];
  const velocityMotions = ["direct", "spring"];
  const triggerMotions = !continuousInteractionTriggers.has(trigger)
    ? eventMotions
    : mapping === "pointer-velocity" ||
        mapping === "pointer-position" ||
        mapping === "pointer-depth" ||
        mapping === "surface-position" ||
        mapping === "overlap-time" ||
        mapping === "contact-duration" ||
        mapping === "collision-impulse" ||
        mapping === "penetration-depth" ||
        mapping === "distance-3d" ||
        mapping === "distance-to-target"
      ? velocityMotions
      : progressMotions;
  const effectMotions: Record<string, string[]> = {
    move: eventMotions,
    rotate: progressMotions,
    scale: ["direct", "spring", "bounce"],
    skew: ["direct", "spring"],
    distort: ["direct", "spring"],
    "liquid-merge": ["direct", "spring"],
    "strand-bend": ["direct", "spring"],
    "wave-deform": ["direct"],
    "look-at-target": ["direct", "spring"],
    "orbit-around-target": ["direct", "spring", "inertia"],
    "attach-to-target": ["direct", "spring"],
    "snap-to-target": ["direct", "spring"],
    "return-to-origin": ["direct", "spring"],
    "morph-target": ["direct", "spring"],
    "change-material": ["direct"],
    "material-parameter": ["direct"],
    "camera-move": eventMotions,
    "camera-zoom": ["direct", "spring", "inertia"],
    "camera-rotate": progressMotions,
    "camera-look-at": ["direct", "spring"],
    "camera-shake": ["direct", "spring"],
    "animate-lighting": ["direct", "spring"],
    "post-processing": ["direct", "spring"],
    "shader-parameter": ["direct", "spring"],
    "bone-transform": progressMotions,
    "joint-rotation": progressMotions,
    "mesh-transform": eventMotions,
  };
  const allowed = effectMotions[resolvedEffect] ?? ["direct"];
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

function getBaseResetPolicy(
  trigger: string,
  hoverFallback: string,
  effect = "",
  stacking = false,
): ResetPolicy {
  const contextual = { label: "Contextual default", value: "contextual" };
  const keep = { label: "Keep final state", value: "keep" };
  const restart = { label: "Restart when triggered again", value: "restart" };
  const release = { label: "Return when trigger ends", value: "return" };
  const leave = { label: "Return when pointer leaves", value: "leave" };
  const pageExit = { label: "Return on page exit", value: "page-exit" };
  const reverse = { label: "Follow reverse scroll", value: "reverse" };
  const stayAtTarget = { label: "Stay at target", value: "stay-at-target" };
  const returnToOrigin = {
    label: "Return to origin",
    value: "return-to-origin",
  };
  if (
    effect === "snap-to-target" ||
    effect === "attach-to-target" ||
    effect === "return-to-origin"
  ) {
    return {
      description:
        effect === "return-to-origin"
          ? "Default: return to the position captured when the interaction starts."
          : "Default: stay attached to the accepted target until the page exits.",
      options: [contextual, stayAtTarget, returnToOrigin, pageExit],
    };
  }
  if (effect === "open-modal" || effect === "close-modal") {
    return {
      description:
        "Default: keep the dialog state until another interaction changes it or the page exits.",
      options: [contextual, keep, pageExit],
    };
  }
  if (effect === "pointer-trail") {
    return {
      description: "Default: each emitted mark fades after its own lifespan.",
      options: [contextual, pageExit],
    };
  }
  if (effect === "spawn-instance") {
    return {
      description: "Default: spawned instances remain until page exit or the instance limit is reached.",
      options: [contextual, pageExit],
    };
  }
  if (
    trigger === "drop-on-target" ||
    trigger === "drop-outside-target" ||
    trigger === "drag-enter-target" ||
    trigger === "drag-leave-target"
  ) {
    const returnsByDefault =
      trigger === "drop-outside-target" || trigger === "drag-leave-target";
    return {
      description: returnsByDefault
        ? "Default: return to the drag origin when the object leaves or misses the target."
        : "Default: stay at the accepted target until another interaction moves the object.",
      options: [contextual, stayAtTarget, returnToOrigin, pageExit],
    };
  }
  if (stacking) {
    return {
      description:
        "Default: keep the settled pile until page exit; reset on the next page enter.",
      options: [contextual, restart],
    };
  }
  if (effect === "collision-bounce") {
    return {
      description: "Default: keep the position reached after the collision.",
      options: [contextual, keep],
    };
  }
  if (trigger === "while-colliding") {
    return {
      description: "Default: return when the physical contact ends.",
      options: [contextual, release, keep],
    };
  }
  if (trigger === "collision-enter") {
    return {
      description: "Default: keep the state reached after the impact.",
      options: [contextual, keep, pageExit],
    };
  }
  if (trigger === "collision-exit") {
    return {
      description: "Default: keep the state reached after separation.",
      options: [contextual, keep, pageExit],
    };
  }
  if (modelInteractionTriggers.has(trigger)) {
    return {
      description:
        "Default: keep the result and restore the authored pose on page exit.",
      options: [contextual, keep, pageExit, restart],
    };
  }
  if (trigger === "near-target") {
    return {
      description: "Default: separate when the elements move apart.",
      options: [contextual, release, keep],
    };
  }
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

export function getResetPolicy(
  trigger: string,
  hoverFallback: string,
  effect = "",
  stacking = false,
  context: Interaction3DContext = {},
): ResetPolicy {
  const policy = getBaseResetPolicy(trigger, hoverFallback, effect, stacking);
  if (!context.is3D && !context.isHybridCollision) return policy;

  const options = [...policy.options];
  const append = (option: InteractionOption) => {
    if (!options.some((current) => current.value === option.value)) {
      options.push(option);
    }
  };
  const transformEffects = new Set([
    "move",
    "scale",
    "rotate",
    "look-at-target",
    "orbit-around-target",
    "attach-to-target",
    "stack-on-target",
    "collision-bounce",
    "mesh-transform",
  ]);

  if (transformEffects.has(effect) || stacking) {
    append({
      label: "Restore initial 3D transform",
      value: "restore-transform",
    });
    append({ label: "Restore initial position", value: "restore-position" });
    append({ label: "Restore initial rotation", value: "restore-rotation" });
    append({ label: "Restore initial scale", value: "restore-scale" });
    append({ label: "Reset physics velocity", value: "reset-velocity" });
  }
  if (modelAnimationEffectValues.has(effect)) {
    append({ label: "Stop model animation", value: "stop-animation" });
    append({
      label: "Return to initial animation",
      value: "initial-animation",
    });
  }
  if (effect.startsWith("camera-")) {
    append({ label: "Restore initial camera", value: "restore-camera" });
  }
  if (
    effect === "animate-lighting" ||
    effect === "post-processing" ||
    effect === "shader-parameter" ||
    effect === "shadow" ||
    effect === "blur" ||
    effect === "color"
  ) {
    append({ label: "Restore visual state", value: "restore-visual" });
  }
  append({ label: "Return full 3D state", value: "restore-full-3d" });

  return { ...policy, options };
}
