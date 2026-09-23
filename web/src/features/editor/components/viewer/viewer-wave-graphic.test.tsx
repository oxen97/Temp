import { act, cleanup, render } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultInteraction } from "@/features/editor/lib/interaction-model";
import { IDENTITY_VISUAL } from "@/features/editor/lib/interaction-runtime";
import {
  bendOpenPath,
  type StrandBendVisual,
} from "@/features/editor/lib/strand-bend";
import { pathData } from "@/features/editor/lib/vector-path";
import { waveDeformedPaths } from "@/features/editor/lib/viewer-generated-effects";
import { ViewerWaveClock } from "@/features/editor/lib/viewer-wave-clock";
import type { CanvasElement } from "@/features/editor/store/editor-store";

import { ViewerWaveGraphic } from "./viewer-wave-graphic";

const { shapeRender } = vi.hoisted(() => ({ shapeRender: vi.fn() }));
vi.mock(
  "@/features/editor/components/canvas/shape-graphic",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/features/editor/components/canvas/shape-graphic")
      >();
    return {
      ...actual,
      ShapeGraphic: (props: ComponentProps<typeof actual.ShapeGraphic>) => {
        shapeRender(props.element.id);
        return <actual.ShapeGraphic {...props} />;
      },
    };
  },
);

let frames: Map<number, FrameRequestCallback>;
function tick(time: number) {
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((callback) => callback(time)));
}

beforeEach(() => {
  frames = new Map();
  let id = 0;
  shapeRender.mockClear();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (frameId: number) =>
    frames.delete(frameId),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function pen(overrides: Partial<CanvasElement> = {}): CanvasElement {
  return {
    id: "authored-curve",
    name: "My editable curve",
    type: "pen",
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    rotation: 0,
    opacity: 100,
    fill: "none",
    stroke: "#283947",
    strokeWidth: 2,
    cornerRadius: 0,
    visible: true,
    locked: false,
    vectorPaths: [
      {
        points: [
          { x: 0, y: 25, handleOut: { x: 35, y: 25 } },
          { x: 100, y: 25, handleIn: { x: 65, y: 25 } },
        ],
      },
    ],
    ...overrides,
  };
}

const interaction = createDefaultInteraction({
  id: "user-created-wave",
  trigger: "pointer-move",
  effect: "wave-deform",
  waveAmplitude: 20,
  waveLength: 180,
  waveSpeed: 0.4,
  waveFalloff: 80,
  wavePointerX: 40,
  wavePointerY: 30,
});
const base = {
  interaction,
  visual: IDENTITY_VISUAL,
  artboardWidth: 200,
  artboardHeight: 100,
  elementIndex: 0,
};

function pathValues(container: HTMLElement, selector: string) {
  return [...container.querySelectorAll(selector)].map((path) =>
    path.getAttribute("d"),
  );
}

describe("ViewerWaveGraphic", () => {
  it("updates hit and visible geometry without rerendering the real ShapeGraphic", () => {
    const clock = new ViewerWaveClock();
    const view = render(
      <ViewerWaveGraphic {...base} clock={clock} element={pen()} />,
    );
    const initial = pathValues(view.container, ".pen-visible-path");
    clock.setPointer({ x: 140, y: 80 });
    tick(100);
    tick(116);
    tick(132);
    expect(pathValues(view.container, ".pen-visible-path")).not.toEqual(
      initial,
    );
    expect(pathValues(view.container, ".pen-hit-area")).toEqual(
      pathValues(view.container, ".pen-visible-path"),
    );
    expect(shapeRender).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector(".pen-visible-path")).toHaveAttribute(
      "stroke",
      "#283947",
    );
    expect(frames.size).toBe(1);
    view.unmount();
    expect(frames.size).toBe(0);
  });

  it("reacts to edited geometry and wave parameters, including line-to-path rendering", () => {
    const clock = new ViewerWaveClock();
    clock.setReducedMotion(true);
    clock.setPointer({ x: 150, y: 80 });
    const view = render(
      <ViewerWaveGraphic
        {...base}
        clock={clock}
        element={pen({ type: "line" })}
      />,
    );
    const initial = pathValues(view.container, ".strand-visible-path");
    expect(view.container.querySelector("line")).not.toBeInTheDocument();
    const changed = { ...interaction, waveAmplitude: 90, wavePointerY: 130 };
    view.rerender(
      <ViewerWaveGraphic
        {...base}
        interaction={changed}
        clock={clock}
        element={pen({ type: "line", width: 160 })}
      />,
    );
    expect(pathValues(view.container, ".strand-visible-path")).not.toEqual(
      initial,
    );
    expect(pathValues(view.container, ".strand-hit-area")).toEqual(
      pathValues(view.container, ".strand-visible-path"),
    );
    expect(frames.size).toBe(0);
  });

  it("visibly deforms a straight line between its anchored endpoints", () => {
    const clock = new ViewerWaveClock();
    const view = render(
      <ViewerWaveGraphic
        {...base}
        clock={clock}
        element={pen({ type: "line" })}
      />,
    );
    const initial = pathValues(view.container, ".strand-visible-path")[0];
    tick(250);
    const animated = pathValues(view.container, ".strand-visible-path")[0];
    expect(animated).not.toBe(initial);
    expect(animated).toMatch(/^M 0 25 /);
    expect(animated).toMatch(/100 25$/);
    expect(pathValues(view.container, ".strand-hit-area")).toEqual([animated]);
    expect(shapeRender).toHaveBeenCalledTimes(1);
  });

  it("uses local pointer coordinates after translation, rotation, scale and flips", () => {
    const clock = new ViewerWaveClock();
    clock.setReducedMotion(true);
    // Local (70, 35) relative to (50,25), scale(-2,-3), rotate90,
    // then translate to the element's runtime world center (160,90).
    const pointer = { x: 190, y: 50 };
    clock.setPointer(pointer);
    const element = pen({
      x: 100,
      y: 40,
      rotation: 60,
      flipX: true,
      flipY: true,
    });
    const visual = {
      ...IDENTITY_VISUAL,
      tx: 10,
      ty: 25,
      rotate: 30,
      scaleX: 2,
      scaleY: 3,
    };
    const view = render(
      <ViewerWaveGraphic
        {...base}
        clock={clock}
        element={element}
        visual={visual}
      />,
    );
    const expected = waveDeformedPaths(
      element,
      interaction,
      { x: 70, y: 35 },
      { x: 0.9, y: 0 },
      0,
      1,
      0,
    )[0];
    expect(pathValues(view.container, ".pen-visible-path")).toEqual([
      pathData(expected.points, expected.closed),
    ]);
  });

  it("preserves a strand first-path override while other paths still wave", () => {
    const clock = new ViewerWaveClock();
    clock.setReducedMotion(true);
    clock.setPointer({ x: 170, y: 75 });
    const element = pen();
    element.vectorPaths = [
      ...element.vectorPaths!,
      {
        points: [
          { x: 0, y: 40 },
          { x: 50, y: 40 },
          { x: 100, y: 40 },
        ],
      },
    ];
    const override = "M 0 25 C 30 100 70 100 100 25";
    const view = render(
      <ViewerWaveGraphic
        {...base}
        clock={clock}
        element={element}
        strandPathData={override}
      />,
    );
    const paths = pathValues(view.container, ".pen-visible-path");
    expect(paths[0]).toBe(override);
    expect(paths[1]).not.toBe(pathData(element.vectorPaths[1].points));
    expect(pathValues(view.container, ".pen-hit-area")).toEqual(paths);
  });

  it("combines wave deformation with the authored strand bend", () => {
    const clock = new ViewerWaveClock();
    clock.setReducedMotion(true);
    clock.setPointer({ x: 150, y: 75 });
    const element = pen();
    const bend: StrandBendVisual = {
      dx: 10,
      dy: 20,
      anchor: "left",
      stiffness: 0.3,
      damping: 0.2,
      influenceRadius: 200,
      maxDisplacement: 100,
    };
    const view = render(
      <ViewerWaveGraphic
        {...base}
        clock={clock}
        element={element}
        strandBend={bend}
      />,
    );
    const waved = waveDeformedPaths(
      element,
      interaction,
      { x: 150, y: 75 },
      { x: 0.5, y: 0.5 },
      0,
      1,
      0,
    )[0];
    const expected = bendOpenPath(waved, bend);
    expect(pathValues(view.container, ".pen-visible-path")).toEqual([
      pathData(expected.points, expected.closed),
    ]);
  });
});
