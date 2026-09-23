import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createDefaultInteraction,
  type InteractionDefinition,
} from "@/features/editor/lib/interaction-model";
import {
  composeFilter,
  composeTransform,
  IDLE_RUNTIME_STATE,
  runtimeVisualForElement,
} from "@/features/editor/lib/interaction-runtime";
import { ViewerWaveClock } from "@/features/editor/lib/viewer-wave-clock";
import type { CanvasElement } from "@/features/editor/store/editor-store";

import {
  isolatedPointerVisualIds,
  ViewerPointerVisual,
} from "./viewer-pointer-visual";

function shape(
  id: string,
  interactions: InteractionDefinition[] = [],
): CanvasElement {
  return {
    id,
    name: id,
    type: "circle",
    x: 20,
    y: 30,
    width: 40,
    height: 20,
    rotation: 20,
    opacity: 65,
    fill: "#fff",
    stroke: "none",
    strokeWidth: 0,
    cornerRadius: 0,
    visible: true,
    locked: false,
    interactions,
  };
}

const move = createDefaultInteraction({
  id: "move",
  trigger: "pointer-move",
  effect: "move",
  motion: "direct",
  moveX: 80,
  moveY: 50,
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("isolatedPointerVisualIds", () => {
  it("isolates generic pointer visuals beside wave paths, static layers and navigation", () => {
    const elements = [
      shape("backdrop"),
      shape("follower", [move]),
      shape("soft-follower", [{ ...move, motion: "spring" }]),
      shape("curve", [
        createDefaultInteraction({
          trigger: "pointer-move",
          effect: "wave-deform",
        }),
      ]),
      shape("next-page", [
        createDefaultInteraction({
          trigger: "click-tap",
          effect: "emit-event",
        }),
      ]),
    ];
    expect([...isolatedPointerVisualIds(elements)]).toEqual([
      "follower",
      "soft-follower",
    ]);
  });

  it.each([
    ["drag", { trigger: "drag", effect: "move" }],
    ["collision", { trigger: "collision-enter", effect: "collision-bounce" }],
    ["spawn", { trigger: "click-tap", effect: "spawn-instance" }],
    ["gravity", { trigger: "pointer-move", effect: "move", motion: "gravity" }],
    ["drop", { trigger: "drag", effect: "snap-to-target" }],
  ] as const)(
    "leaves all visuals on the shared runtime in a %s scene",
    (_name, overrides) => {
      const other = createDefaultInteraction(overrides);
      expect(
        isolatedPointerVisualIds([
          shape("follower", [move]),
          shape("complex", [other]),
        ]).size,
      ).toBe(0);
    },
  );

  it("does not isolate mixed effects on the same element and ignores disabled effects", () => {
    const wave = createDefaultInteraction({
      trigger: "pointer-move",
      effect: "wave-deform",
    });
    expect(
      isolatedPointerVisualIds([shape("combined", [move, wave])]).size,
    ).toBe(0);
    const disabledDrag = createDefaultInteraction({
      trigger: "drag",
      effect: "move",
      enabled: false,
    });
    expect([
      ...isolatedPointerVisualIds([shape("follower", [move, disabledDrag])]),
    ]).toEqual(["follower"]);
  });

  it("keeps additional Wave targets on the shared path for current inverse-transform coordinates", () => {
    const wave = createDefaultInteraction({
      trigger: "pointer-move",
      effect: "wave-deform",
      waveTargetIds: ["moving-wave-target"],
    });
    const elements = [
      shape("wave-source", [wave]),
      shape("moving-wave-target", [move]),
      shape("independent-follower", [move]),
    ];
    expect([...isolatedPointerVisualIds(elements)]).toEqual([
      "independent-follower",
    ]);
    elements[0].interactions = [{ ...wave, enabled: false }];
    expect([...isolatedPointerVisualIds(elements)]).toEqual([
      "moving-wave-target",
      "independent-follower",
    ]);
  });
});

describe("ViewerPointerVisual", () => {
  it("uses canonical visual composition and resets every property on pointer leave", () => {
    const interactions = [
      move,
      createDefaultInteraction({
        trigger: "pointer-move",
        effect: "opacity",
        opacityTo: 20,
      }),
      createDefaultInteraction({
        trigger: "pointer-move",
        effect: "blur",
        blurAmount: 8,
      }),
    ];
    const element = shape("local-follower", interactions);
    const clock = new ViewerWaveClock();
    const raf = vi.fn();
    vi.stubGlobal("requestAnimationFrame", raf);
    const view = render(
      <div data-testid="target">
        <ViewerPointerVisual element={element} clock={clock} />
      </div>,
    );
    const target = view.getByTestId("target");
    const initial = target.style.transform;
    expect(target.style.opacity).toBe("0.65");
    const pointer = { x: 110, y: 60 };
    act(() => clock.setPointer(pointer));
    const expected = runtimeVisualForElement(interactions, IDLE_RUNTIME_STATE, {
      pointer,
      center: { x: 40, y: 40 },
    });
    expect(target.style.transform).toBe(
      composeTransform(element.rotation, expected),
    );
    expect(target.style.opacity).toBe(String(expected.opacity));
    expect(target.style.filter).toBe(composeFilter(expected));
    act(() => clock.setPointer(null));
    expect(target.style.transform).toBe(initial);
    expect(target.style.opacity).toBe("0.65");
    expect(target.style.filter).toBe("");
    expect(raf).not.toHaveBeenCalled();
    view.unmount();
    act(() => clock.setPointer(pointer));
    expect(target.style.transform).toBe(initial);
  });

  it("recomputes from edited UI values while keeping the current pointer", () => {
    const clock = new ViewerWaveClock();
    clock.setPointer({ x: 180, y: 80 });
    const element = shape("follower", [move]);
    const view = render(
      <div data-testid="target">
        <ViewerPointerVisual element={element} clock={clock} />
      </div>,
    );
    const target = view.getByTestId("target");
    const initial = target.style.transform;
    const edited = { ...element, interactions: [{ ...move, moveX: 200 }] };
    view.rerender(
      <div data-testid="target">
        <ViewerPointerVisual element={edited} clock={clock} />
      </div>,
    );
    expect(target.style.transform).not.toBe(initial);
    const expected = runtimeVisualForElement(
      edited.interactions,
      IDLE_RUNTIME_STATE,
      { pointer: { x: 180, y: 80 }, center: { x: 40, y: 40 } },
    );
    expect(target.style.transform).toBe(
      composeTransform(element.rotation, expected),
    );
  });
});
