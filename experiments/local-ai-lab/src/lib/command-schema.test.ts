import { describe, expect, it } from "vitest";
import {
  AiEnvelopeSchema,
  LAB_CONTEXT_EXAMPLE,
  createDeterministicUnsupportedDraft,
  parseModelJson,
  validateModelOutput,
} from "./command-schema";

const validOutput = {
  schemaVersion: "amous-ai-lab/v1",
  mode: "draft-only",
  commands: [
    {
      action: "addInteraction",
      targetIds: ["rect-a"],
      interaction: {
        enabled: true,
        trigger: "click-tap",
        triggerTargetId: null,
        mapping: null,
        effect: "move",
        effectTargetId: null,
        motion: "spring",
        reset: "keep",
        summary: "Rectangle A를 클릭하면 스프링처럼 이동",
      },
    },
  ],
};

describe("AMOUS AI command schema", () => {
  it("accepts a strict draft-only interaction intent", () => {
    expect(AiEnvelopeSchema.safeParse(validOutput).success).toBe(true);
  });

  it("rejects an unknown effect", () => {
    const invalid = structuredClone(validOutput);
    invalid.commands[0].interaction.effect = "scatter";
    expect(AiEnvelopeSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects unknown keys", () => {
    const invalid = { ...validOutput, confidence: 0.99 };
    expect(AiEnvelopeSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects terminal commands mixed with mutations", () => {
    const invalid = structuredClone(validOutput) as Record<string, unknown> & {
      commands: unknown[];
    };
    invalid.commands.push({
      action: "unsupported",
      reasonCode: "not-in-catalog",
      reason: "지원하지 않음",
      alternatives: [],
    });
    expect(AiEnvelopeSchema.safeParse(invalid).success).toBe(false);
  });

  it("extracts fenced JSON", () => {
    expect(parseModelJson(`\n\`\`\`json\n${JSON.stringify(validOutput)}\n\`\`\``)).toEqual(
      validOutput,
    );
  });

  it("checks object IDs against the supplied lab context", () => {
    const invalid = structuredClone(validOutput);
    invalid.commands[0].targetIds = ["missing-id"];
    const result = validateModelOutput(JSON.stringify(invalid), LAB_CONTEXT_EXAMPLE);
    expect(result.value).toBeNull();
    expect(result.errors.join(" ")).toContain("존재하지 않는 object ID");
  });

  it("requires target and collision motion for collision bounce", () => {
    const invalid = structuredClone(validOutput);
    invalid.commands[0].interaction.trigger = "collision-enter";
    invalid.commands[0].interaction.effect = "collision-bounce";
    invalid.commands[0].interaction.motion = "spring";
    const result = validateModelOutput(JSON.stringify(invalid), LAB_CONTEXT_EXAMPLE);
    expect(result.value).toBeNull();
    expect(result.errors).toHaveLength(4);
  });

  it("rejects a model attempt to approximate a fracture request", () => {
    const approximation = structuredClone(validOutput) as {
      commands: Array<{ targetIds: string[]; interaction: Record<string, unknown> }>;
    };
    approximation.commands[0].interaction.trigger = "collision-enter";
    approximation.commands[0].interaction.triggerTargetId = "rect-a";
    approximation.commands[0].interaction.mapping = "collision-impulse";
    approximation.commands[0].interaction.effect = "particle";
    approximation.commands[0].interaction.effectTargetId = "rect-a";
    approximation.commands[0].interaction.motion = "direct";

    const result = validateModelOutput(
      JSON.stringify(approximation),
      LAB_CONTEXT_EXAMPLE,
      "Rectangle A가 충돌하면 20개 조각으로 깨져서 흩어지게 해줘.",
    );
    expect(result.value).toBeNull();
    expect(result.errors.join(" ")).toContain("unsupported");
    expect(result.errors.join(" ")).toContain("자기 자신");
    expect(result.errors.join(" ")).toContain("image 오브젝트");
  });

  it("returns a deterministic unsupported draft for fracture semantics", () => {
    const draft = createDeterministicUnsupportedDraft(
      "Rectangle A가 충돌하면 20개 조각으로 깨져서 흩어지게 해줘.",
    );
    expect(draft?.commands).toHaveLength(1);
    expect(draft?.commands[0].action).toBe("unsupported");
  });

  it("rejects mappings on event and time triggers", () => {
    const invalid = structuredClone(validOutput) as {
      commands: Array<{ interaction: Record<string, unknown> }>;
    };
    invalid.commands[0].interaction.trigger = "after-delay";
    invalid.commands[0].interaction.mapping = "collision-impulse";
    const result = validateModelOutput(JSON.stringify(invalid), LAB_CONTEXT_EXAMPLE);
    expect(result.value).toBeNull();
    expect(result.errors.join(" ")).toContain("Mapping을 지정하면 안 됩니다");
  });
});
