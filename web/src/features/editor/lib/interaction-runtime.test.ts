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

  it("uses target triggers as implicit drags without double-applying a Drag row", () => {
    const drop = createDefaultInteraction({
      id: "drop",
      trigger: "drop-on-target",
      effect: "snap-to-target",
    });
    const drag = createDefaultInteraction({ trigger: "drag", effect: "move" });
    const visual = runtimeVisualForElement([drop, drag], {
      ...IDLE_RUNTIME_STATE,
      dragOffset: { x: 10, y: 20 },
      drag: { dx: 30, dy: 40 },
    });
    expect(visual.tx).toBe(40);
    expect(visual.ty).toBe(60);
  });

  it("plays ordinary effects after a target event fires", () => {
    const drop = createDefaultInteraction({
      id: "drop-opacity",
      trigger: "drop-on-target",
      effect: "opacity",
      opacityTo: 25,
    });
    expect(
      runtimeVisualForElement([drop], IDLE_RUNTIME_STATE).opacity,
    ).toBeNull();
    expect(
      runtimeVisualForElement([drop], {
        ...IDLE_RUNTIME_STATE,
        triggeredInteractionIds: [drop.id],
      }).opacity,
    ).toBeCloseTo(0.25);
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

  it("maps scroll-swipe distance to effect intensity", () => {
    const scroll = createDefaultInteraction({
      trigger: "scroll-swipe",
      effect: "rotate",
      rotateTo: 90,
      trackDistance: 200,
    });
    expect(runtimeVisualForElement([scroll], IDLE_RUNTIME_STATE).rotate).toBe(
      0,
    );
    const half = runtimeVisualForElement([scroll], {
      ...IDLE_RUNTIME_STATE,
      scroll: 100,
    });
    expect(half.rotate).toBeCloseTo(45);
    const full = runtimeVisualForElement([scroll], {
      ...IDLE_RUNTIME_STATE,
      scroll: 400,
    });
    expect(full.rotate).toBeCloseTo(90);
  });

  it("hides proportionally for show-hide and flags shake while active", () => {
    const hide = runtimeVisualForElement(
      [createDefaultInteraction({ trigger: "hover", effect: "show-hide" })],
      { ...IDLE_RUNTIME_STATE, hovering: true },
    );
    expect(hide.opacity).toBe(0);

    const shaking = runtimeVisualForElement(
      [createDefaultInteraction({ trigger: "hover", effect: "shake" })],
      { ...IDLE_RUNTIME_STATE, hovering: true },
    );
    expect(shaking.shake).toBe(true);

    const still = runtimeVisualForElement(
      [createDefaultInteraction({ trigger: "hover", effect: "shake" })],
      IDLE_RUNTIME_STATE,
    );
    expect(still.shake).toBe(false);
  });

  it("lets physics take over the transform once released", () => {
    const visual = runtimeVisualForElement(
      [
        createDefaultInteraction({
          trigger: "click-tap",
          effect: "move",
          moveX: 999,
        }),
      ],
      {
        ...IDLE_RUNTIME_STATE,
        toggled: true,
        physics: { x: 250, y: 400, rotation: 30 },
      },
      { center: { x: 200, y: 200 }, pointer: null },
    );
    // Physics offset from center wins over the authored move effect.
    expect(visual.tx).toBe(50);
    expect(visual.ty).toBe(200);
    expect(visual.rotate).toBe(30);
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

  it("uses zero authored smoothing for instant Direct pointer movement and return", () => {
    const follow = createDefaultInteraction({
      trigger: "pointer-move",
      effect: "move",
      motion: "direct",
      smoothing: 0,
      continuousEasing: "linear",
      // Event settings must not delay a continuous interaction.
      duration: 4,
      delay: 2,
      easing: "ease-in-out",
      moveX: 50,
      trackDistance: 100,
    });
    expect(activeTransition([follow], IDLE_RUNTIME_STATE)).toBe(
      "transform 0s linear 0s, opacity 0.3s ease-out 0s, filter 0.3s ease-out 0s",
    );
    expect(
      runtimeVisualForElement([follow], IDLE_RUNTIME_STATE, {
        center: { x: 0, y: 0 },
        pointer: { x: 100, y: 0 },
      }).tx,
    ).toBe(50);
    expect(
      runtimeVisualForElement([follow], IDLE_RUNTIME_STATE, {
        center: { x: 0, y: 0 },
        pointer: null,
      }).tx,
    ).toBe(0);
    // Pointer leave must not reintroduce the fallback 0.3 s transition.
    expect(activeTransition([follow], IDLE_RUNTIME_STATE)).toContain(
      "transform 0s linear 0s",
    );
  });

  it("honors continuous smoothing and easing independently from event timing", () => {
    const follow = createDefaultInteraction({
      trigger: "pointer-move",
      effect: "scale",
      motion: "direct",
      smoothing: 0.18,
      continuousEasing: "ease-in",
      duration: 4,
      delay: 2,
      easing: "ease-out",
    });
    expect(activeTransition([follow], IDLE_RUNTIME_STATE)).toContain(
      "transform 0.18s ease-in 0s",
    );
  });

  it.each([
    ["move", "transform"],
    ["rotate", "transform"],
    ["scale", "transform"],
    ["skew", "transform"],
    ["opacity", "opacity"],
    ["show-hide", "opacity"],
    ["blur", "filter"],
    ["shadow", "filter"],
  ])("limits continuous %s timing to its %s CSS property", (effect, property) => {
    const pointer = createDefaultInteraction({
      trigger: "pointer-move",
      effect,
      motion: "direct",
      smoothing: 0,
      continuousEasing: "linear",
    });
    const transition = activeTransition([pointer], IDLE_RUNTIME_STATE);
    for (const candidate of ["transform", "opacity", "filter"]) {
      expect(transition).toContain(
        candidate === property
          ? `${candidate} 0s linear 0s`
          : `${candidate} 0.3s ease-out 0s`,
      );
    }
  });

  it("keeps a simultaneous click opacity animation while pointer movement stays direct", () => {
    const pointer = createDefaultInteraction({
      trigger: "pointer-move",
      effect: "move",
      motion: "direct",
      smoothing: 0,
    });
    const click = createDefaultInteraction({
      trigger: "click-tap",
      effect: "opacity",
      motion: "direct",
      duration: 0.8,
      delay: 0.2,
      easing: "ease-in",
    });
    expect(
      activeTransition([pointer, click], {
        ...IDLE_RUNTIME_STATE,
        toggled: true,
      }),
    ).toBe(
      "transform 0s linear 0s, opacity 0.8s ease-in 0.2s, filter 0.8s ease-in 0.2s",
    );
  });

  it("ignores disabled and separately rendered pointer effects for CSS transition ownership", () => {
    const event = createDefaultInteraction({
      trigger: "click-tap",
      effect: "move",
      motion: "direct",
      duration: 0.7,
      easing: "linear",
    });
    const disabled = createDefaultInteraction({
      trigger: "pointer-move",
      effect: "move",
      enabled: false,
      smoothing: 0,
    });
    const wave = createDefaultInteraction({
      trigger: "pointer-move",
      effect: "wave-deform",
      smoothing: 0,
    });
    const state = { ...IDLE_RUNTIME_STATE, toggled: true };
    expect(activeTransition([disabled, wave, event], state)).toBe(
      activeTransition([event], state),
    );
    expect(activeTransition([disabled, wave], IDLE_RUNTIME_STATE)).toBe(
      activeTransition(undefined, IDLE_RUNTIME_STATE),
    );
  });

  it("retains authored spring response for continuous properties", () => {
    const spring = createDefaultInteraction({
      trigger: "pointer-move",
      effect: "move",
      motion: "spring",
      smoothing: 0.2,
      duration: 5,
      springStrength: 100,
      springMass: 4,
      springDamping: 10,
    });
    expect(activeTransition([spring], IDLE_RUNTIME_STATE)).toContain(
      "transform 0.4s cubic-bezier(0.2, 1.25, 0.3, 1) 0s",
    );
  });

  it.each(["click-tap", "hover"])(
    "preserves Direct %s event duration, easing, delay, and return behavior",
    (trigger) => {
      const event = createDefaultInteraction({
        trigger,
        effect: "move",
        motion: "direct",
        duration: 0.65,
        delay: 0.15,
        easing: "ease-in-out",
        smoothing: 0,
      });
      expect(
        activeTransition([event], {
          ...IDLE_RUNTIME_STATE,
          toggled: true,
          hovering: true,
        }),
      ).toBe(
        "transform 0.65s ease-in-out 0.15s, opacity 0.65s ease-in-out 0.15s, filter 0.65s ease-in-out 0.15s",
      );
      expect(activeTransition([event], IDLE_RUNTIME_STATE)).toBe(
        "transform 0.3s ease-out 0s, opacity 0.3s ease-out 0s, filter 0.3s ease-out 0s",
      );
    },
  );

  it("maps authored spring strength and damping into the active transition", () => {
    const spring = createDefaultInteraction({
      id: "spring-drop",
      trigger: "drop-on-target",
      motion: "spring",
      duration: 0.4,
      springStrength: 100,
      springMass: 1,
      springDamping: 10,
    });
    const transition = activeTransition([spring], {
      ...IDLE_RUNTIME_STATE,
      triggeredInteractionIds: [spring.id],
    });
    expect(transition).toContain("transform 0.4s");
    expect(transition).toContain("cubic-bezier(0.2, 1.25, 0.3, 1)");
  });

  it("uses the most recently fired target row for transition timing", () => {
    const fast = createDefaultInteraction({
      id: "fast",
      trigger: "drop-on-target",
      duration: 0.1,
      motion: "direct",
    });
    const slow = createDefaultInteraction({
      id: "slow",
      trigger: "drop-on-target",
      duration: 0.8,
      motion: "direct",
    });
    expect(
      activeTransition([fast, slow], {
        ...IDLE_RUNTIME_STATE,
        triggeredInteractionIds: [fast.id, slow.id],
      }),
    ).toContain("transform 0.8s");
    expect(
      activeTransition([fast, slow], {
        ...IDLE_RUNTIME_STATE,
        triggeredInteractionIds: [slow.id, fast.id],
      }),
    ).toContain("transform 0.1s");
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
