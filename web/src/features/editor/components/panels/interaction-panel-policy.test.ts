import { describe, expect, it } from "vitest";

import {
  getEffectOptions,
  getMappingOptions,
  getMotionOptions,
  getResetPolicy,
} from "./interaction-panel-policy";

const values = (options: readonly { value: string }[]) =>
  options.map((option) => option.value);

describe("interaction mapping policy", () => {
  it.each([
    ["pointer-move", ["pointer-position", "pointer-velocity"]],
    ["drag", ["drag-progress", "drag-angle", "pointer-velocity"]],
    ["wheel-pinch", ["wheel-amount"]],
    ["scroll-swipe", ["scroll-progress"]],
    ["while-overlapping", ["overlap-time"]],
    ["click-tap", []],
    ["overlap-start", []],
    ["drop-on-target", []],
    ["page-enter", []],
    ["video-starts", []],
  ])("shows only the mappings relevant to %s", (trigger, expected) => {
    expect(values(getMappingOptions(trigger))).toEqual(expected);
  });
});

describe("effect options by selected element", () => {
  it("offers common effects but not element-specific effects for a shape", () => {
    const effects = values(getEffectOptions(["rectangle"]));
    expect(effects).toContain("move");
    expect(effects).toContain("opacity");
    expect(effects).not.toContain("particle");
    expect(effects).not.toContain("text-reveal");
    expect(effects).not.toContain("play");
    expect(effects).not.toContain("group-animation");
  });

  it.each([
    ["image", ["particle", "pixelate", "dissolve", "trail"]],
    ["text", ["text-reveal", "character-animation", "word-animation"]],
    ["video", ["play", "pause", "resume", "seek"]],
  ])("adds only %s-specific effects", (type, specificEffects) => {
    const effects = values(getEffectOptions([type]));
    expect(effects).toEqual(expect.arrayContaining(specificEffects));
    expect(effects).toContain("move");
  });

  it("offers Group Animation only for a multiple selection", () => {
    expect(values(getEffectOptions(["image", "rectangle"]))).toContain(
      "group-animation",
    );
    expect(values(getEffectOptions(["image"]))).not.toContain(
      "group-animation",
    );
  });
});

describe("effect and motion compatibility", () => {
  it("allows Gravity for an event-driven Move, but not progress or velocity Move", () => {
    expect(values(getMotionOptions("click-tap", "", "move"))).toEqual([
      "direct",
      "spring",
      "inertia",
      "bounce",
      "gravity",
    ]);
    expect(values(getMotionOptions("drag", "drag-progress", "move"))).toEqual([
      "direct",
      "spring",
      "inertia",
      "bounce",
    ]);
    expect(
      values(getMotionOptions("pointer-move", "pointer-velocity", "move")),
    ).toEqual(["direct", "spring"]);
  });

  it("intersects each effect's allowed motions with the trigger's allowed motions", () => {
    expect(values(getMotionOptions("click-tap", "", "rotate"))).toEqual([
      "direct",
      "spring",
      "inertia",
      "bounce",
    ]);
    expect(values(getMotionOptions("drag", "drag-progress", "scale"))).toEqual([
      "direct",
      "spring",
      "bounce",
    ]);
    expect(
      values(getMotionOptions("pointer-move", "pointer-position", "scale")),
    ).toEqual(["direct", "spring"]);
    expect(values(getMotionOptions("click-tap", "", "distort"))).toEqual([
      "direct",
      "spring",
    ]);
    expect(values(getMotionOptions("click-tap", "", "opacity"))).toEqual([
      "direct",
    ]);
  });

  it.each(["order", "play", "pause", "resume", "seek"])(
    "hides HOW for the immediate %s command",
    (effect) => {
      expect(getMotionOptions("click-tap", "", effect)).toEqual([]);
    },
  );

  it("resolves Group Animation motions from its child effect", () => {
    expect(
      values(getMotionOptions("page-enter", "", "group-animation", "move")),
    ).toEqual(["direct", "spring", "inertia", "bounce", "gravity"]);
    expect(
      values(getMotionOptions("page-enter", "", "group-animation", "opacity")),
    ).toEqual(["direct"]);
  });

  it("defaults the Group Animation child effect to Move", () => {
    expect(
      values(getMotionOptions("page-enter", "", "group-animation")),
    ).toEqual(["direct", "spring", "inertia", "bounce", "gravity"]);
  });
});

describe("contextual reset policy", () => {
  it.each([
    ["hover", "leave", "pointer leave"],
    ["pointer-move", "leave", "pointer leaves"],
    ["drag", "return", "drag is released"],
    ["while-overlapping", "return", "elements separate"],
    ["scroll-swipe", "reverse", "both directions"],
    ["wheel-pinch", "page-exit", "until page exit"],
    ["page-enter", "contextual", "until page exit"],
    ["page-exit", "contextual", "discard"],
    ["click-tap", "keep", "keep the final state"],
    ["overlap-start", "keep", "keep the final state"],
    ["video-ends", "keep", "keep the final state"],
  ])(
    "gives %s a relevant default and choices",
    (trigger, expectedChoice, hint) => {
      const policy = getResetPolicy(trigger, "tap");
      expect(values(policy.options)).toContain("contextual");
      expect(values(policy.options)).toContain(expectedChoice);
      expect(policy.description).toContain(hint);
    },
  );

  it("describes finger release for Hover's Long Press fallback", () => {
    expect(getResetPolicy("hover", "long-press").description).toContain(
      "finger is released",
    );
  });

  it("does not offer an irrelevant Leave option for a page exit", () => {
    expect(values(getResetPolicy("page-exit", "tap").options)).toEqual([
      "contextual",
    ]);
    expect(values(getResetPolicy("page-enter", "tap").options)).toEqual([
      "contextual",
    ]);
  });
});
