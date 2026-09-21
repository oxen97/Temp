import { describe, expect, it } from "vitest";

import { createDefaultInteraction } from "@/features/editor/lib/interaction-model";
import {
  activeTransition,
  composeFilter,
  composeTransform,
  easingToCss,
  hasRuntimeInteractions,
  IDENTITY_VISUAL,
  IDLE_RUNTIME_STATE,
  interactionIntensity,
  isRuntimeInteractionActive,
  runtimeVisualForElement,
} from "@/features/editor/lib/interaction-runtime";

describe("interaction runtime", () => {
  it("treats an interaction as active only when its trigger is on", () => {
    const click = createDefaultInteraction({ trigger: "click-tap" });
    expect(isRuntimeInteractionActive(click, IDLE_RUNTIME_STATE)).toBe(false);
    expect(
      isRuntimeInteractionActive(click, {
        ...IDLE_RUNTIME_STATE,
        toggled: true,
      }),
    ).toBe(true);

    const hover = createDefaultInteraction({ trigger: "hover" });
    expect(
      isRuntimeInteractionActive(hover, {
        ...IDLE_RUNTIME_STATE,
        hovering: true,
      }),
    ).toBe(true);
  });

  it("ignores a disabled interaction", () => {
    const disabled = createDefaultInteraction({
      trigger: "click-tap",
      enabled: false,
    });
    expect(
      isRuntimeInteractionActive(disabled, {
        ...IDLE_RUNTIME_STATE,
        toggled: true,
      }),
    ).toBe(false);
  });

  it("returns the identity visual when nothing is active", () => {
    const move = createDefaultInteraction({ trigger: "click-tap" });
    expect(runtimeVisualForElement([move], IDLE_RUNTIME_STATE)).toEqual(
      IDENTITY_VISUAL,
    );
  });

  it("applies the move effect on an active click", () => {
    const move = createDefaultInteraction({
      trigger: "click-tap",
      effect: "move",
      moveX: 120,
      moveY: -30,
    });
    const visual = runtimeVisualForElement([move], {
      ...IDLE_RUNTIME_STATE,
      toggled: true,
    });
    expect(visual.tx).toBe(120);
    expect(visual.ty).toBe(-30);
  });

  it("applies rotate, scale, and opacity effects", () => {
    const rotate = runtimeVisualForElement(
      [
        createDefaultInteraction({
          trigger: "hover",
          effect: "rotate",
          rotateTo: 90,
        }),
      ],
      { ...IDLE_RUNTIME_STATE, hovering: true },
    );
    expect(rotate.rotate).toBe(90);

    const scale = runtimeVisualForElement(
      [
        createDefaultInteraction({
          trigger: "hover",
          effect: "scale",
          scaleX: 150,
          scaleY: 50,
        }),
      ],
      { ...IDLE_RUNTIME_STATE, hovering: true },
    );
    expect(scale.scaleX).toBeCloseTo(1.5);
    expect(scale.scaleY).toBeCloseTo(0.5);

    const opacity = runtimeVisualForElement(
      [
        createDefaultInteraction({
          trigger: "hover",
          effect: "opacity",
          opacityTo: 40,
        }),
      ],
      { ...IDLE_RUNTIME_STATE, hovering: true },
    );
    expect(opacity.opacity).toBeCloseTo(0.4);
  });

  it("follows the pointer for a drag interaction", () => {
    const drag = createDefaultInteraction({ trigger: "drag" });
    const visual = runtimeVisualForElement([drag], {
      ...IDLE_RUNTIME_STATE,
      drag: { dx: 40, dy: 15 },
    });
    expect(visual.tx).toBe(40);
    expect(visual.ty).toBe(15);
  });

  it("keeps a dropped drag offset and adds the live delta on top", () => {
    const drag = createDefaultInteraction({ trigger: "drag" });
    const dropped = runtimeVisualForElement([drag], {
      ...IDLE_RUNTIME_STATE,
      dragOffset: { x: 100, y: 50 },
    });
    expect(dropped.tx).toBe(100);
    expect(dropped.ty).toBe(50);

    const dragging = runtimeVisualForElement([drag], {
      ...IDLE_RUNTIME_STATE,
      dragOffset: { x: 100, y: 50 },
      drag: { dx: 20, dy: -10 },
    });
    expect(dragging.tx).toBe(120);
    expect(dragging.ty).toBe(40);
  });

  it("scrubs a non-move drag effect proportionally to drag progress", () => {
    const scrub = createDefaultInteraction({
      trigger: "drag",
      effect: "scale",
      scaleX: 200,
      scaleY: 200,
      trackDistance: 100,
    });
    // Halfway (50 of 100) → scale lerps 1 → 2 by 0.5 = 1.5.
    const half = runtimeVisualForElement([scrub], {
      ...IDLE_RUNTIME_STATE,
      drag: { dx: 50, dy: 0 },
    });
    expect(half.scaleX).toBeCloseTo(1.5);
    // Full distance → target.
    const full = runtimeVisualForElement([scrub], {
      ...IDLE_RUNTIME_STATE,
      drag: { dx: 100, dy: 0 },
    });
    expect(full.scaleX).toBeCloseTo(2);
    // Beyond track distance → clamped to target.
    const over = runtimeVisualForElement([scrub], {
      ...IDLE_RUNTIME_STATE,
      drag: { dx: 400, dy: 0 },
    });
    expect(over.scaleX).toBeCloseTo(2);
  });

  it("reports intensity as on/off for momentary triggers and progress for drag", () => {
    expect(
      interactionIntensity(createDefaultInteraction({ trigger: "hover" }), {
        ...IDLE_RUNTIME_STATE,
        hovering: true,
      }),
    ).toBe(1);
    expect(
      interactionIntensity(
        createDefaultInteraction({ trigger: "hover" }),
        IDLE_RUNTIME_STATE,
      ),
    ).toBe(0);
    expect(
      interactionIntensity(
        createDefaultInteraction({ trigger: "drag", trackDistance: 200 }),
        { ...IDLE_RUNTIME_STATE, drag: { dx: 100, dy: 0 } },
      ),
    ).toBeCloseTo(0.5);
  });

  it("activates an after-delay interaction only once timed", () => {
    const timed = createDefaultInteraction({
      trigger: "after-delay",
      effect: "move",
      moveX: 80,
      moveY: 0,
    });
    expect(runtimeVisualForElement([timed], IDLE_RUNTIME_STATE).tx).toBe(0);
    expect(
      runtimeVisualForElement([timed], { ...IDLE_RUNTIME_STATE, timed: true })
        .tx,
    ).toBe(80);
    expect(hasRuntimeInteractions([timed])).toBe(true);
  });

  it("makes pointer-move follow the cursor, bounded by moveX/Y", () => {
    const follow = createDefaultInteraction({
      trigger: "pointer-move",
      effect: "move",
      moveX: 100,
      moveY: 100,
      trackDistance: 200,
    });
    const center = { x: 500, y: 500 };
    const half = runtimeVisualForElement([follow], IDLE_RUNTIME_STATE, {
      center,
      pointer: { x: 600, y: 500 },
    });
    expect(half.tx).toBeCloseTo(50);
    expect(half.ty).toBeCloseTo(0);

    const far = runtimeVisualForElement([follow], IDLE_RUNTIME_STATE, {
      center,
      pointer: { x: 5000, y: 500 },
    });
    expect(far.tx).toBeCloseTo(100);

    const noPointer = runtimeVisualForElement([follow], IDLE_RUNTIME_STATE, {
      center,
      pointer: null,
    });
    expect(noPointer.tx).toBe(0);
  });

  it("scales a non-move pointer-move effect by proximity", () => {
    const glow = createDefaultInteraction({
      trigger: "pointer-move",
      effect: "scale",
      scaleX: 200,
      scaleY: 200,
      trackDistance: 100,
    });
    const center = { x: 0, y: 0 };
    const onCenter = runtimeVisualForElement([glow], IDLE_RUNTIME_STATE, {
      center,
      pointer: { x: 0, y: 0 },
    });
    expect(onCenter.scaleX).toBeCloseTo(2);

    const near = runtimeVisualForElement([glow], IDLE_RUNTIME_STATE, {
      center,
      pointer: { x: 50, y: 0 },
    });
    expect(near.scaleX).toBeCloseTo(1.5);

    const far = runtimeVisualForElement([glow], IDLE_RUNTIME_STATE, {
      center,
      pointer: { x: 500, y: 0 },
    });
    expect(far.scaleX).toBeCloseTo(1);
  });

  it("combines multiple active interactions", () => {
    const visual = runtimeVisualForElement(
      [
        createDefaultInteraction({
          trigger: "hover",
          effect: "move",
          moveX: 10,
          moveY: 0,
        }),
        createDefaultInteraction({
          trigger: "hover",
          effect: "scale",
          scaleX: 200,
          scaleY: 200,
        }),
      ],
      { ...IDLE_RUNTIME_STATE, hovering: true },
    );
    expect(visual.tx).toBe(10);
    expect(visual.scaleX).toBeCloseTo(2);
  });

  it("composes a transform string with the base rotation", () => {
    expect(
      composeTransform(30, { ...IDENTITY_VISUAL, tx: 5, ty: 6, rotate: 15 }),
    ).toBe("translate(5px, 6px) rotate(45deg) scale(1, 1) skew(0deg, 0deg)");
  });

  it("applies skew, blur, and shadow effects and composes a filter", () => {
    const skew = runtimeVisualForElement(
      [
        createDefaultInteraction({
          trigger: "hover",
          effect: "skew",
          skewX: 20,
          skewY: 5,
        }),
      ],
      { ...IDLE_RUNTIME_STATE, hovering: true },
    );
    expect(skew.skewX).toBe(20);
    expect(skew.skewY).toBe(5);

    const blur = runtimeVisualForElement(
      [
        createDefaultInteraction({
          trigger: "hover",
          effect: "blur",
          blurAmount: 8,
        }),
      ],
      { ...IDLE_RUNTIME_STATE, hovering: true },
    );
    expect(blur.blur).toBe(8);
    expect(composeFilter(blur)).toBe("blur(8px)");

    const shadow = runtimeVisualForElement(
      [
        createDefaultInteraction({
          trigger: "hover",
          effect: "shadow",
          shadowColor: "#000",
          shadowX: 0,
          shadowY: 10,
          shadowBlur: 20,
        }),
      ],
      { ...IDLE_RUNTIME_STATE, hovering: true },
    );
    expect(shadow.shadow).toBe("drop-shadow(0px 10px 20px #000)");
    expect(composeFilter(shadow)).toBe("drop-shadow(0px 10px 20px #000)");

    expect(composeFilter(IDENTITY_VISUAL)).toBeUndefined();
  });

  it("scales blur by intensity for a scrubbed drag", () => {
    const blur = createDefaultInteraction({
      trigger: "drag",
      effect: "blur",
      blurAmount: 10,
      trackDistance: 100,
    });
    const half = runtimeVisualForElement([blur], {
      ...IDLE_RUNTIME_STATE,
      drag: { dx: 50, dy: 0 },
    });
    expect(half.blur).toBeCloseTo(5);
  });

  it("falls back to a safe easing and disables transition while dragging", () => {
    expect(easingToCss("linear")).toBe("linear");
    expect(easingToCss("spring")).toBe("ease-out");
    expect(
      activeTransition(undefined, {
        ...IDLE_RUNTIME_STATE,
        drag: { dx: 1, dy: 1 },
      }),
    ).toBe("none");
  });

  it("detects whether an element has playable interactions", () => {
    expect(
      hasRuntimeInteractions([createDefaultInteraction({ trigger: "hover" })]),
    ).toBe(true);
    expect(
      hasRuntimeInteractions([
        createDefaultInteraction({ trigger: "long-press" }),
      ]),
    ).toBe(false);
    expect(hasRuntimeInteractions(undefined)).toBe(false);
  });
});
