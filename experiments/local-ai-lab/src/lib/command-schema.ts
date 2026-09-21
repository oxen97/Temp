import { z } from "zod";

export const TRIGGERS = [
  "click-tap",
  "double-click",
  "hover",
  "touch-start",
  "touch-end",
  "long-press",
  "pointer-move",
  "drag",
  "wheel-pinch",
  "scroll-swipe",
  "overlap-start",
  "while-overlapping",
  "overlap-end",
  "drop-on-target",
  "near-target",
  "after-delay",
  "repeat-every",
  "idle-start",
  "idle-end",
  "video-starts",
  "video-ends",
  "page-enter",
  "page-exit",
  "collision-enter",
  "while-colliding",
  "collision-exit",
  "model-animation-start",
  "while-model-animation",
  "model-animation-end",
  "model-animation-loop",
  "model-animation-marker",
] as const;

export const MAPPINGS = [
  "pointer-position",
  "pointer-velocity",
  "drag-progress",
  "drag-angle",
  "wheel-amount",
  "scroll-progress",
  "overlap-time",
  "distance-to-target",
  "contact-duration",
  "collision-impulse",
  "penetration-depth",
  "animation-progress",
  "animation-time",
  "position-3d",
  "depth-progress",
  "surface-position",
  "pointer-depth",
  "distance-3d",
] as const;

export const EFFECTS = [
  "move",
  "scale",
  "rotate",
  "skew",
  "distort",
  "opacity",
  "color",
  "blur",
  "shadow",
  "show-hide",
  "shake",
  "order",
  "particle",
  "pixelate",
  "dissolve",
  "trail",
  "text-reveal",
  "stroke-draw",
  "character-animation",
  "word-animation",
  "play",
  "pause",
  "resume",
  "seek",
  "camera-move",
  "camera-zoom",
  "camera-rotate",
  "camera-look-at",
  "camera-shake",
  "animate-lighting",
  "post-processing",
  "shader-parameter",
  "look-at-target",
  "orbit-around-target",
  "attach-to-target",
  "play-model-animation",
  "pause-model-animation",
  "resume-model-animation",
  "stop-model-animation",
  "change-model-animation",
  "seek-model-animation",
  "crossfade-model-animation",
  "change-material",
  "material-parameter",
  "material-slot",
  "morph-target",
  "bone-transform",
  "joint-rotation",
  "mesh-transform",
  "mesh-visibility",
  "mesh-face-material",
  "liquid-merge",
  "collision-bounce",
  "stack-on-target",
  "group-animation",
] as const;

export const MOTIONS = [
  "direct",
  "spring",
  "inertia",
  "bounce",
  "gravity",
  "collision-bounce",
] as const;

export const RESETS = [
  "contextual",
  "keep",
  "restart",
  "return",
  "leave",
  "page-exit",
  "reverse",
  "restore-transform",
  "restore-position",
  "restore-rotation",
  "restore-scale",
  "reset-velocity",
  "stop-animation",
  "initial-animation",
  "restore-camera",
  "restore-visual",
  "restore-full-3d",
] as const;

const EntityIdSchema = z.string().trim().min(1).max(128);
const BoundedTextSchema = z.string().trim().min(1).max(500);
const UniqueIdsSchema = z
  .array(EntityIdSchema)
  .max(32)
  .refine((ids) => new Set(ids).size === ids.length, "ID 목록에 중복이 있습니다.");
const NonEmptyUniqueIdsSchema = UniqueIdsSchema.min(1);

export const InteractionIntentSchema = z
  .object({
    enabled: z.boolean(),
    trigger: z.enum(TRIGGERS),
    triggerTargetId: EntityIdSchema.nullable(),
    mapping: z.enum(MAPPINGS).nullable(),
    effect: z.enum(EFFECTS),
    effectTargetId: EntityIdSchema.nullable(),
    motion: z.enum(MOTIONS).nullable(),
    reset: z.enum(RESETS),
    summary: z.string().trim().min(1).max(300),
  })
  .strict();

const AddInteractionSchema = z
  .object({
    action: z.literal("addInteraction"),
    targetIds: NonEmptyUniqueIdsSchema,
    interaction: InteractionIntentSchema,
  })
  .strict();

const UpdateInteractionSchema = z
  .object({
    action: z.literal("updateInteraction"),
    interactionId: EntityIdSchema,
    interaction: InteractionIntentSchema,
  })
  .strict();

const RemoveInteractionSchema = z
  .object({
    action: z.literal("removeInteraction"),
    interactionIds: NonEmptyUniqueIdsSchema,
  })
  .strict();

const ExplainInteractionSchema = z
  .object({
    action: z.literal("explainInteraction"),
    interactionIds: UniqueIdsSchema.max(8),
    explanation: BoundedTextSchema,
  })
  .strict();

const SelectObjectSchema = z
  .object({
    action: z.literal("selectObject"),
    targetIds: NonEmptyUniqueIdsSchema,
    mode: z.enum(["replace", "add", "remove"]),
  })
  .strict();

const UnsupportedSchema = z
  .object({
    action: z.literal("unsupported"),
    reasonCode: z.enum([
      "not-in-catalog",
      "runtime-unavailable",
      "missing-source-type",
      "out-of-scope",
    ]),
    reason: BoundedTextSchema,
    alternatives: z.array(BoundedTextSchema).max(3),
  })
  .strict();

const NeedsClarificationSchema = z
  .object({
    action: z.literal("needsClarification"),
    missingField: z.enum([
      "target",
      "trigger",
      "effect",
      "direction",
      "amount",
      "collision-target",
      "animation-clip",
    ]),
    question: BoundedTextSchema,
    choices: z.array(BoundedTextSchema).min(2).max(5),
  })
  .strict();

export const AiCommandSchema = z.discriminatedUnion("action", [
  AddInteractionSchema,
  UpdateInteractionSchema,
  RemoveInteractionSchema,
  ExplainInteractionSchema,
  SelectObjectSchema,
  UnsupportedSchema,
  NeedsClarificationSchema,
]);

export const AiEnvelopeSchema = z
  .object({
    schemaVersion: z.literal("amous-ai-lab/v1"),
    mode: z.literal("draft-only"),
    commands: z.array(AiCommandSchema).min(1).max(8),
  })
  .strict()
  .superRefine((envelope, context) => {
    const terminalCommands = envelope.commands.filter(
      (command) =>
        command.action === "unsupported" || command.action === "needsClarification",
    );
    if (terminalCommands.length > 0 && envelope.commands.length !== 1) {
      context.addIssue({
        code: "custom",
        path: ["commands"],
        message: "unsupported/needsClarification은 다른 명령과 함께 사용할 수 없습니다.",
      });
    }
  });

export type InteractionIntent = z.infer<typeof InteractionIntentSchema>;
export type AiCommand = z.infer<typeof AiCommandSchema>;
export type AiEnvelope = z.infer<typeof AiEnvelopeSchema>;

export type LabObject = {
  id: string;
  name: string;
  type: "shape" | "image" | "video" | "text" | "group" | "3d-model" | "3d-primitive";
  hybridCollision?: boolean;
};

export type LabInteraction = {
  id: string;
  objectId: string;
  trigger?: string;
  effect?: string;
};

export type LabContext = {
  selectedObjectIds: string[];
  objects: LabObject[];
  interactions: LabInteraction[];
};

export const LabContextSchema = z
  .object({
    selectedObjectIds: UniqueIdsSchema,
    objects: z
      .array(
        z
          .object({
            id: EntityIdSchema,
            name: z.string().trim().min(1).max(200),
            type: z.enum([
              "shape",
              "image",
              "video",
              "text",
              "group",
              "3d-model",
              "3d-primitive",
            ]),
            hybridCollision: z.boolean().optional(),
          })
          .strict(),
      )
      .max(128),
    interactions: z
      .array(
        z
          .object({
            id: EntityIdSchema,
            objectId: EntityIdSchema,
            trigger: z.string().optional(),
            effect: z.string().optional(),
          })
          .strict(),
      )
      .max(128),
  })
  .strict();

export const LAB_CONTEXT_EXAMPLE: LabContext = {
  selectedObjectIds: ["rect-a"],
  objects: [
    { id: "rect-a", name: "Rectangle A", type: "shape" },
    { id: "circle-b", name: "Circle B", type: "shape" },
    { id: "model-c", name: "Model C", type: "3d-model" },
  ],
  interactions: [],
};

const REQUIRES_TRIGGER_TARGET = new Set<string>([
  "overlap-start",
  "while-overlapping",
  "overlap-end",
  "drop-on-target",
  "near-target",
  "collision-enter",
  "while-colliding",
  "collision-exit",
]);

const REQUIRES_EFFECT_TARGET = new Set<string>([
  "camera-look-at",
  "look-at-target",
  "orbit-around-target",
  "attach-to-target",
  "liquid-merge",
  "collision-bounce",
  "stack-on-target",
]);

const ALLOWED_MAPPINGS_BY_TRIGGER = new Map<string, ReadonlySet<string>>([
  ["pointer-move", new Set(["pointer-position", "pointer-velocity"])],
  ["drag", new Set(["drag-progress", "drag-angle", "pointer-velocity"])],
  ["wheel-pinch", new Set(["wheel-amount"])],
  ["scroll-swipe", new Set(["scroll-progress"])],
  ["while-overlapping", new Set(["overlap-time"])],
  ["near-target", new Set(["distance-to-target"])],
  ["while-colliding", new Set(["contact-duration", "collision-impulse", "penetration-depth"])],
  ["while-model-animation", new Set(["animation-progress", "animation-time"])],
]);

const THREE_D_MAPPING_ADDITIONS = new Map<string, ReadonlySet<string>>([
  ["pointer-move", new Set(["surface-position", "pointer-depth"])],
  ["drag", new Set(["position-3d", "depth-progress"])],
  ["near-target", new Set(["distance-3d"])],
]);

const THREE_D_COLLISION_TRIGGERS = new Set<string>([
  "collision-enter",
  "while-colliding",
  "collision-exit",
]);

const IMAGE_ONLY_EFFECTS = new Set<string>(["particle", "pixelate", "dissolve", "trail"]);
const TEXT_ONLY_EFFECTS = new Set<string>([
  "text-reveal",
  "stroke-draw",
  "character-animation",
  "word-animation",
]);
const VIDEO_ONLY_EFFECTS = new Set<string>(["play", "pause", "resume", "seek"]);

const UNSUPPORTED_FRACTURE_PATTERN =
  /(?:\d+\s*(?:개|pieces?)\s*(?:의\s*)?(?:조각|파편)|조각(?:으)?로|산산조각|깨뜨|부서뜨|파쇄|분쇄|fractur|shatter|break\s+(?:it|them|the\s+\w+)?\s*(?:in)?to\s+\d*\s*pieces?|\bscatter\b)/i;

const IMMEDIATE_EFFECTS = new Set<string>([
  "show-hide",
  "order",
  "play",
  "pause",
  "resume",
  "seek",
  "pause-model-animation",
  "resume-model-animation",
  "stop-model-animation",
  "change-model-animation",
  "seek-model-animation",
]);

const MODEL_ONLY_TRIGGERS = new Set<string>([
  "model-animation-start",
  "while-model-animation",
  "model-animation-end",
  "model-animation-loop",
  "model-animation-marker",
]);

const MODEL_ONLY_EFFECTS = new Set<string>([
  "play-model-animation",
  "pause-model-animation",
  "resume-model-animation",
  "stop-model-animation",
  "change-model-animation",
  "seek-model-animation",
  "crossfade-model-animation",
  "change-material",
  "material-parameter",
  "material-slot",
  "morph-target",
  "bone-transform",
  "joint-rotation",
  "mesh-transform",
  "mesh-visibility",
  "mesh-face-material",
]);

export function parseModelJson(raw: string): unknown {
  const withoutFence = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace < firstBrace) {
    throw new Error("응답에서 JSON 객체를 찾을 수 없습니다.");
  }
  return JSON.parse(withoutFence.slice(firstBrace, lastBrace + 1));
}

export function validateModelOutput(
  raw: string,
  labContext?: LabContext,
  userPrompt?: string,
): { value: AiEnvelope | null; errors: string[] } {
  let parsed: unknown;
  try {
    parsed = parseModelJson(raw);
  } catch (error) {
    return {
      value: null,
      errors: [error instanceof Error ? error.message : "JSON 파싱에 실패했습니다."],
    };
  }

  const result = AiEnvelopeSchema.safeParse(parsed);
  if (!result.success) {
    return {
      value: null,
      errors: result.error.issues.map(
        (issue) => `${issue.path.join(".") || "root"}: ${issue.message}`,
      ),
    };
  }

  const errors = labContext ? validateAgainstContext(result.data, labContext) : [];
  if (
    userPrompt &&
    UNSUPPORTED_FRACTURE_PATTERN.test(userPrompt) &&
    !(result.data.commands.length === 1 && result.data.commands[0].action === "unsupported")
  ) {
    errors.push(
      "원 요청은 현재 지원하지 않는 파쇄·조각·흩어짐 기능입니다. 지원 기능의 조합으로 임의 대체하지 말고 unsupported를 반환해야 합니다.",
    );
  }
  return { value: errors.length === 0 ? result.data : null, errors };
}

export function createDeterministicUnsupportedDraft(prompt: string): AiEnvelope | null {
  if (!UNSUPPORTED_FRACTURE_PATTERN.test(prompt)) return null;
  return {
    schemaVersion: "amous-ai-lab/v1",
    mode: "draft-only",
    commands: [
      {
        action: "unsupported",
        reasonCode: "not-in-catalog",
        reason:
          "오브젝트를 실제 조각으로 파쇄하거나 파편을 생성하는 Fracture/Shatter/Scatter 효과는 현재 AMOUS Interaction 목록과 런타임에 없습니다.",
        alternatives: [
          "이미지 오브젝트에 Particle 시각 효과 사용",
          "미리 분리한 조각 오브젝트에 개별 Move·Rotate 효과 적용",
        ],
      },
    ],
  };
}

export function validateAgainstContext(
  envelope: AiEnvelope,
  labContext: LabContext,
): string[] {
  const errors: string[] = [];
  const objectsById = new Map(labContext.objects.map((object) => [object.id, object]));
  const interactionsById = new Map(
    labContext.interactions.map((interaction) => [interaction.id, interaction]),
  );

  const assertObjectIds = (ids: string[], path: string) => {
    for (const id of ids) {
      if (!objectsById.has(id)) errors.push(`${path}: 존재하지 않는 object ID '${id}'`);
    }
  };

  envelope.commands.forEach((command, index) => {
    const path = `commands.${index}`;
    if (command.action === "addInteraction" || command.action === "selectObject") {
      assertObjectIds(command.targetIds, `${path}.targetIds`);
    }
    if (
      command.action === "updateInteraction" &&
      !interactionsById.has(command.interactionId)
    ) {
      errors.push(`${path}.interactionId: 존재하지 않는 interaction ID '${command.interactionId}'`);
    }
    if (command.action === "removeInteraction" || command.action === "explainInteraction") {
      for (const id of command.interactionIds) {
        if (!interactionsById.has(id)) {
          errors.push(`${path}.interactionIds: 존재하지 않는 interaction ID '${id}'`);
        }
      }
    }
    if (command.action !== "addInteraction" && command.action !== "updateInteraction") return;

    const intent = command.interaction;
    const affectedIds =
      command.action === "addInteraction"
        ? command.targetIds
        : [interactionsById.get(command.interactionId)?.objectId].filter(
            (id): id is string => Boolean(id),
          );
    const affectedObjects = affectedIds
      .map((id) => objectsById.get(id))
      .filter((object): object is LabObject => Boolean(object));

    if (intent.triggerTargetId) assertObjectIds([intent.triggerTargetId], `${path}.triggerTargetId`);
    if (intent.effectTargetId) assertObjectIds([intent.effectTargetId], `${path}.effectTargetId`);
    if (REQUIRES_TRIGGER_TARGET.has(intent.trigger) && !intent.triggerTargetId) {
      errors.push(`${path}.triggerTargetId: '${intent.trigger}'에는 감지 대상 ID가 필요합니다.`);
    }
    if (!REQUIRES_TRIGGER_TARGET.has(intent.trigger) && intent.triggerTargetId !== null) {
      errors.push(`${path}.triggerTargetId: '${intent.trigger}'에는 감지 대상 ID를 지정하면 안 됩니다.`);
    }
    if (intent.triggerTargetId && affectedIds.includes(intent.triggerTargetId)) {
      errors.push(`${path}.triggerTargetId: 오브젝트 자기 자신을 충돌·근접 대상으로 지정할 수 없습니다.`);
    }
    if (REQUIRES_EFFECT_TARGET.has(intent.effect) && !intent.effectTargetId) {
      errors.push(`${path}.effectTargetId: '${intent.effect}'에는 효과 대상 ID가 필요합니다.`);
    }
    if (!REQUIRES_EFFECT_TARGET.has(intent.effect) && intent.effectTargetId !== null) {
      errors.push(`${path}.effectTargetId: '${intent.effect}'에는 별도 효과 대상 ID를 지정하면 안 됩니다.`);
    }
    if (intent.effectTargetId && affectedIds.includes(intent.effectTargetId)) {
      errors.push(`${path}.effectTargetId: 관계형 효과의 대상은 현재 오브젝트와 달라야 합니다.`);
    }
    const baseMappings = ALLOWED_MAPPINGS_BY_TRIGGER.get(intent.trigger);
    const is3DTarget =
      affectedObjects.length > 0 &&
      affectedObjects.every(
        (object) => object.type === "3d-model" || object.type === "3d-primitive",
      );
    const isHybridTarget = affectedObjects.some((object) => object.hybridCollision === true);
    const allowedMappings = baseMappings
      ? new Set([
          ...baseMappings,
          ...(is3DTarget ? (THREE_D_MAPPING_ADDITIONS.get(intent.trigger) ?? []) : []),
        ])
      : undefined;
    if (!allowedMappings && intent.mapping !== null) {
      errors.push(`${path}.mapping: '${intent.trigger}' Trigger에는 Mapping을 지정하면 안 됩니다.`);
    } else if (allowedMappings && intent.mapping && !allowedMappings.has(intent.mapping)) {
      errors.push(
        `${path}.mapping: '${intent.mapping}'은 '${intent.trigger}' Trigger에서 사용할 수 없습니다.`,
      );
    }
    if (allowedMappings && intent.mapping === null) {
      errors.push(`${path}.mapping: '${intent.trigger}' Trigger에는 Mapping이 필요합니다.`);
    }
    if (
      THREE_D_COLLISION_TRIGGERS.has(intent.trigger) &&
      !is3DTarget &&
      !isHybridTarget
    ) {
      errors.push(
        `${path}.trigger: '${intent.trigger}'는 3D 또는 2D↔3D Hybrid Collision에서만 사용할 수 있습니다. 일반 2D 도형은 overlap Trigger를 사용해야 합니다.`,
      );
    }
    if (IMAGE_ONLY_EFFECTS.has(intent.effect) && affectedObjects.some((object) => object.type !== "image")) {
      errors.push(`${path}.effect: '${intent.effect}'는 image 오브젝트에만 사용할 수 있습니다.`);
    }
    if (TEXT_ONLY_EFFECTS.has(intent.effect) && affectedObjects.some((object) => object.type !== "text")) {
      errors.push(`${path}.effect: '${intent.effect}'는 text 오브젝트에만 사용할 수 있습니다.`);
    }
    if (VIDEO_ONLY_EFFECTS.has(intent.effect) && affectedObjects.some((object) => object.type !== "video")) {
      errors.push(`${path}.effect: '${intent.effect}'는 video 오브젝트에만 사용할 수 있습니다.`);
    }
    if (IMMEDIATE_EFFECTS.has(intent.effect) && intent.motion !== null) {
      errors.push(`${path}.motion: 즉시 실행 Effect '${intent.effect}'의 motion은 null이어야 합니다.`);
    }
    if (intent.effect === "collision-bounce" && intent.motion !== "collision-bounce") {
      errors.push(`${path}.motion: collision-bounce Effect는 collision-bounce motion을 사용해야 합니다.`);
    }
    if (
      (intent.effect === "collision-bounce" || intent.effect === "stack-on-target") &&
      intent.triggerTargetId &&
      intent.effectTargetId !== intent.triggerTargetId
    ) {
      errors.push(
        `${path}.effectTargetId: '${intent.effect}' 대상은 충돌 감지 대상과 같아야 합니다.`,
      );
    }
    if (intent.effect === "stack-on-target" && intent.motion !== "gravity") {
      errors.push(`${path}.motion: stack-on-target Effect는 gravity motion을 사용해야 합니다.`);
    }
    if (
      (MODEL_ONLY_TRIGGERS.has(intent.trigger) || MODEL_ONLY_EFFECTS.has(intent.effect)) &&
      affectedObjects.some((object) => object.type !== "3d-model")
    ) {
      errors.push(`${path}: 모델 전용 Trigger/Effect는 3d-model에만 사용할 수 있습니다.`);
    }
  });

  return errors;
}

export const AI_COMMAND_JSON_SCHEMA = z.toJSONSchema(AiEnvelopeSchema, {
  target: "draft-7",
});
