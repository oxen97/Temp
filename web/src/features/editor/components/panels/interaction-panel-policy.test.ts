import { describe, expect, it } from "vitest";

import {
  collisionInteractionTriggers,
  getEffectOptions,
  getMappingOptions,
  getMotionOptions,
  getResetPolicy,
  model3DTriggerOptions,
  modelInteractionTriggers,
  threeDCollisionTriggerOptions,
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
    ["near-target", ["distance-to-target"]],
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

  it("offers pair effects only with compatible triggers and element types", () => {
    expect(values(getEffectOptions(["rectangle"], "near-target")).at(-1)).toBe(
      "liquid-merge",
    );
    expect(values(getEffectOptions(["circle"], "while-overlapping"))).toContain(
      "liquid-merge",
    );
    expect(
      values(getEffectOptions(["rectangle"], "overlap-start")).at(-1),
    ).toBe("collision-bounce");
    expect(values(getEffectOptions(["image"], "drop-on-target")).at(-1)).toBe(
      "collision-bounce",
    );
    expect(values(getEffectOptions(["rectangle"], "click-tap"))).not.toContain(
      "liquid-merge",
    );
    expect(values(getEffectOptions(["line"], "near-target"))).not.toContain(
      "liquid-merge",
    );
    expect(values(getEffectOptions(["text"], "near-target"))).not.toContain(
      "liquid-merge",
    );
    expect(
      values(getEffectOptions(["rectangle", "circle"], "near-target")),
    ).not.toContain("liquid-merge");
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

  it("offers only relevant motion controls for pair effects", () => {
    expect(
      values(
        getMotionOptions("near-target", "distance-to-target", "liquid-merge"),
      ),
    ).toEqual(["direct", "spring"]);
    expect(
      values(getMotionOptions("overlap-start", "", "collision-bounce")),
    ).toEqual(["collision-bounce"]);
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

  it("separates liquid shapes when apart and keeps the physical result after a bounce", () => {
    expect(
      getResetPolicy("near-target", "tap", "liquid-merge").description,
    ).toContain("separate");
    expect(
      values(
        getResetPolicy("overlap-start", "tap", "collision-bounce").options,
      ),
    ).toEqual(["contextual", "keep"]);
  });

  it("keeps a settled pile until page exit and can restart the simulation", () => {
    const policy = getResetPolicy("page-enter", "tap", "move", true);
    expect(policy.description).toContain("settled pile until page exit");
    expect(values(policy.options)).toEqual(["contextual", "restart"]);
  });
});

describe("3D interaction policy", () => {
  it("defines physical contact and model lifecycle triggers separately from 2D overlap", () => {
    expect(values(threeDCollisionTriggerOptions)).toEqual([
      "collision-enter",
      "while-colliding",
      "collision-exit",
    ]);
    expect(values(model3DTriggerOptions)).toEqual([
      "model-animation-start",
      "while-model-animation",
      "model-animation-end",
      "model-animation-loop",
      "model-animation-marker",
    ]);
    expect(collisionInteractionTriggers.has("collision-enter")).toBe(true);
    expect(collisionInteractionTriggers.has("while-colliding")).toBe(true);
    expect(modelInteractionTriggers.has("model-animation-end")).toBe(true);
  });

  it("adds depth and contact mappings only to a 3D interaction", () => {
    expect(values(getMappingOptions("drag"))).toEqual([
      "drag-progress",
      "drag-angle",
      "pointer-velocity",
    ]);
    expect(values(getMappingOptions("drag", { is3D: true }))).toEqual([
      "drag-progress",
      "drag-angle",
      "pointer-velocity",
      "position-3d",
      "depth-progress",
    ]);
    expect(values(getMappingOptions("pointer-move", { is3D: true }))).toEqual([
      "pointer-position",
      "pointer-velocity",
      "surface-position",
      "pointer-depth",
    ]);
    expect(values(getMappingOptions("near-target", { is3D: true }))).toEqual([
      "distance-to-target",
      "distance-3d",
    ]);
    expect(
      values(getMappingOptions("while-colliding", { is3D: true })),
    ).toEqual(["contact-duration", "collision-impulse", "penetration-depth"]);
    expect(
      values(getMappingOptions("while-model-animation", { is3D: true })),
    ).toEqual(["animation-progress", "animation-time"]);
  });

  it("offers spatial effects to 3D objects without changing the 2D shape menu", () => {
    const twoD = values(getEffectOptions(["rectangle"], "click-tap"));
    const threeD = values(
      getEffectOptions(["object3d"], "click-tap", {
        is3D: true,
        sourceKind: "primitive",
      }),
    );
    expect(twoD).not.toContain("look-at-target");
    expect(twoD).not.toContain("material-parameter");
    expect(threeD).toEqual(
      expect.arrayContaining([
        "move",
        "look-at-target",
        "orbit-around-target",
        "attach-to-target",
        "change-material",
        "material-parameter",
      ]),
    );
    expect(threeD).not.toContain("play-model-animation");
  });

  it("filters imported-model effects by real animation, material, and morph capabilities", () => {
    const effects = values(
      getEffectOptions(["object3d"], "click-tap", {
        animationNames: ["Idle", "Walk"],
        hasMaterialSlots: true,
        hasMorphTargets: true,
        is3D: true,
        sourceKind: "asset",
      }),
    );
    expect(effects).toEqual(
      expect.arrayContaining([
        "play-model-animation",
        "pause-model-animation",
        "resume-model-animation",
        "stop-model-animation",
        "change-model-animation",
        "seek-model-animation",
        "crossfade-model-animation",
        "material-slot",
        "morph-target",
      ]),
    );

    const assetWithoutCapabilities = values(
      getEffectOptions(["object3d"], "click-tap", {
        animationNames: [],
        is3D: true,
        sourceKind: "asset",
      }),
    );
    expect(assetWithoutCapabilities).not.toContain("play-model-animation");
    expect(assetWithoutCapabilities).not.toContain("material-slot");
    expect(assetWithoutCapabilities).not.toContain("morph-target");
  });

  it("offers 3D pair effects only for compatible sources and contact triggers", () => {
    expect(
      values(
        getEffectOptions(["object3d"], "near-target", {
          is3D: true,
          sourceKind: "primitive",
        }),
      ),
    ).toContain("liquid-merge");
    expect(
      values(
        getEffectOptions(["object3d"], "near-target", {
          is3D: true,
          sourceKind: "asset",
        }),
      ),
    ).not.toContain("liquid-merge");

    const collisionEffects = values(
      getEffectOptions(["object3d"], "collision-enter", {
        is3D: true,
        sourceKind: "primitive",
      }),
    );
    expect(collisionEffects).toContain("collision-bounce");
    expect(collisionEffects).toContain("stack-on-target");
  });

  it("intersects 3D spatial effects with their supported motion behaviors", () => {
    expect(values(getMotionOptions("click-tap", "", "look-at-target"))).toEqual(
      ["direct", "spring"],
    );
    expect(
      values(getMotionOptions("click-tap", "", "orbit-around-target")),
    ).toEqual(["direct", "spring", "inertia"]);
    expect(
      values(getMotionOptions("collision-enter", "", "stack-on-target")),
    ).toEqual(["gravity"]);
    expect(getMotionOptions("click-tap", "", "play-model-animation")).toEqual(
      [],
    );
  });

  it("adds granular transform, physics, and animation reset choices only in 3D", () => {
    expect(
      values(getResetPolicy("click-tap", "tap", "move").options),
    ).not.toContain("restore-transform");

    const transformReset = values(
      getResetPolicy("click-tap", "tap", "move", false, { is3D: true }).options,
    );
    expect(transformReset).toEqual(
      expect.arrayContaining([
        "restore-transform",
        "restore-position",
        "restore-rotation",
        "restore-scale",
        "reset-velocity",
      ]),
    );

    const animationReset = values(
      getResetPolicy("click-tap", "tap", "play-model-animation", false, {
        is3D: true,
      }).options,
    );
    expect(animationReset).toEqual(
      expect.arrayContaining(["stop-animation", "initial-animation"]),
    );
  });
});
