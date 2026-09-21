import { describe, expect, it } from "vitest";

import {
  createDefaultInteraction,
  normalizeInteraction,
  normalizeInteractions,
} from "@/features/editor/lib/interaction-model";

describe("interaction model", () => {
  it("creates a valid default interaction", () => {
    const interaction = createDefaultInteraction();
    expect(interaction.enabled).toBe(true);
    expect(interaction.trigger).toBe("click-tap");
    expect(interaction.effect).toBe("move");
    expect(interaction.motion).toBe("spring");
    expect(interaction.resetMode).toBe("contextual");
    expect(interaction.stackObstacleIds).toEqual([]);
    expect(interaction.strandAnchor).toBe("top");
    expect(interaction.strandStiffness).toBe(0.45);
    expect(interaction.strandDamping).toBe(0.82);
    expect(interaction.strandNeighborRadius).toBe(0);
    expect(interaction.strandNeighborStrength).toBe(0);
    expect(interaction.liquidAttraction).toBe(0);
    expect(interaction.id).toBeTruthy();
  });

  it("gives each created interaction a unique id", () => {
    expect(createDefaultInteraction().id).not.toBe(
      createDefaultInteraction().id,
    );
  });

  it("applies overrides over defaults", () => {
    const interaction = createDefaultInteraction({
      id: "fixed-id",
      trigger: "hover",
      moveX: 250,
    });
    expect(interaction.id).toBe("fixed-id");
    expect(interaction.trigger).toBe("hover");
    expect(interaction.moveX).toBe(250);
    expect(interaction.effect).toBe("move");
  });

  it("normalizes missing and wrong-typed fields to defaults", () => {
    const normalized = normalizeInteraction({
      id: "keep-me",
      trigger: "drag",
      moveX: "not-a-number",
      enabled: "yes",
      stackObstacleIds: ["a", "b"],
    });
    expect(normalized.id).toBe("keep-me");
    expect(normalized.trigger).toBe("drag");
    expect(normalized.moveX).toBe(100);
    expect(normalized.enabled).toBe(true);
    expect(normalized.stackObstacleIds).toEqual(["a", "b"]);
  });

  it("drops unknown fields and invalid array entries", () => {
    const normalized = normalizeInteraction({
      unknownField: "dropped",
      stackObstacleIds: ["ok", 3, {}],
    });
    expect("unknownField" in normalized).toBe(false);
    expect(normalized.stackObstacleIds).toEqual([]);
  });

  it("returns defaults for non-object input", () => {
    expect(normalizeInteraction(null).trigger).toBe("click-tap");
    expect(normalizeInteraction("nope").effect).toBe("move");
  });

  it("round-trips through JSON without loss", () => {
    const interaction = createDefaultInteraction({
      id: "rt",
      name: "Move on click",
      moveX: 42,
      yoyo: true,
      stackObstacleIds: ["x"],
    });
    const restored = normalizeInteraction(
      JSON.parse(JSON.stringify(interaction)),
    );
    expect(restored).toEqual(interaction);
  });

  it("normalizes strand authoring fields through saved data", () => {
    const interaction = createDefaultInteraction({
      effect: "strand-bend",
      strandAnchor: "left",
      strandStiffness: 0.6,
      strandDamping: 0.7,
      strandInfluenceRadius: 120,
      strandMaxDisplacement: 80,
      strandNeighborRadius: 160,
      strandNeighborStrength: 55,
    });
    expect(normalizeInteraction(JSON.parse(JSON.stringify(interaction)))).toEqual(interaction);
    expect(normalizeInteraction({ effect: "strand-bend" })).toMatchObject({
      strandNeighborRadius: 0,
      strandNeighborStrength: 0,
    });
  });

  it("keeps magnetic pairing opt-in for old projects and round-trips its strength", () => {
    expect(normalizeInteraction({ effect: "liquid-merge" }).liquidAttraction).toBe(0);
    const authored = createDefaultInteraction({ effect: "liquid-merge", liquidAttraction: 72 });
    expect(normalizeInteraction(JSON.parse(JSON.stringify(authored))).liquidAttraction).toBe(72);
  });

  it("normalizes a list, dropping non-objects", () => {
    const list = normalizeInteractions([
      { id: "a", trigger: "hover" },
      null,
      "bad",
      { id: "b" },
    ]);
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe("a");
    expect(list[0].trigger).toBe("hover");
    expect(list[1].id).toBe("b");
  });
});
