import { act, cleanup, fireEvent, render } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultInteraction } from "@/features/editor/lib/interaction-model";
import { createPrimitiveObject3D } from "@/features/editor/three/types";
import {
  defaultBackgroundMusicSettings,
  defaultSoundAdvancedSettings,
  defaultSoundMixerSettings,
  type CanvasElement,
} from "@/features/editor/store/editor-store";

import { ViewerPreview } from "./viewer-preview";

const { shapeRender } = vi.hoisted(() => ({ shapeRender: vi.fn() }));
vi.mock("@/features/editor/components/canvas/artboard-3d-scene", () => ({
  Artboard3DScene: () => null,
}));
vi.mock("@/features/editor/components/canvas/artboard-background", () => ({
  ArtboardBackground: () => null,
}));
vi.mock("@/features/editor/components/viewer/viewer-background-music", () => ({
  ViewerBackgroundMusic: () => null,
}));
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

function shape(
  id: string,
  overrides: Partial<CanvasElement> = {},
): CanvasElement {
  return {
    id,
    name: id,
    type: "rectangle",
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    rotation: 0,
    opacity: 100,
    fill: "#fff",
    stroke: "#283947",
    strokeWidth: 2,
    cornerRadius: 0,
    visible: true,
    locked: false,
    ...overrides,
  };
}

function curve(id: string): CanvasElement {
  return shape(id, {
    type: "pen",
    fill: "none",
    vectorPaths: [
      {
        points: [
          { x: 0, y: 25, handleOut: { x: 35, y: 25 } },
          { x: 100, y: 25, handleIn: { x: 65, y: 25 } },
        ],
      },
    ],
  });
}

const commonProps = {
  advancedSound: defaultSoundAdvancedSettings,
  artboard: { background: "#000", cornerRadius: 0, height: 100, width: 200 },
  backgroundMusic: defaultBackgroundMusicSettings,
  mixer: defaultSoundMixerSettings,
  objects3d: [],
  onClose: vi.fn(),
  projectId: "user-authored-wave-project",
};

let frames: Map<number, FrameRequestCallback>;
let now: number;
function tick(time: number) {
  now = time;
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((callback) => callback(time)));
}

beforeEach(() => {
  shapeRender.mockClear();
  frames = new Map();
  now = 0;
  let id = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (frameId: number) =>
    frames.delete(frameId),
  );
  Object.defineProperty(document.documentElement, "clientWidth", {
    configurable: true,
    value: 200,
  });
  Object.defineProperty(document.documentElement, "clientHeight", {
    configurable: true,
    value: 100,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const pointer = (clientX: number, clientY: number) => ({
  clientX,
  clientY,
  pointerId: 1,
  pointerType: "mouse",
  isPrimary: true,
});

describe("viewer authored wave effects", () => {
  it("animates 28 authored paths with one clock and no whole-scene React rerenders", () => {
    const curves = Array.from({ length: 28 }, (_, index) =>
      curve(`user-path-${index}`),
    );
    curves[0].interactions = [
      createDefaultInteraction({
        id: "wave",
        trigger: "pointer-move",
        effect: "wave-deform",
        waveAmplitude: 20,
        waveSpeed: 0.4,
        wavePointerX: 40,
        waveTargetIds: curves.slice(1).map((element) => element.id),
      }),
    ];
    const view = render(
      <ViewerPreview
        {...commonProps}
        elements={[shape("static-backdrop"), ...curves]}
      />,
    );
    tick(0);
    const page = view.container.querySelector(".viewer-preview-page")!;
    const initialPaths = [
      ...view.container.querySelectorAll(".pen-visible-path"),
    ].map((path) => path.getAttribute("d"));
    const initialRenders = shapeRender.mock.calls.length;
    for (let sample = 0; sample < 20; sample += 1) {
      fireEvent.pointerMove(page, pointer(110 + sample * 2, 75));
      tick(16 + sample * 16);
      // The preview also has its independent strand simulation loop. Wave
      // rendering must add at most one shared frame, never one per path.
      expect(frames.size).toBeLessThanOrEqual(2);
    }
    const paths = [...view.container.querySelectorAll(".pen-visible-path")].map(
      (path) => path.getAttribute("d"),
    );
    expect(paths).toHaveLength(28);
    expect(paths.every((path, index) => path !== initialPaths[index])).toBe(
      true,
    );
    expect(
      [...view.container.querySelectorAll(".pen-hit-area")].map((path) =>
        path.getAttribute("d"),
      ),
    ).toEqual(paths);
    expect(shapeRender).toHaveBeenCalledTimes(initialRenders);
    fireEvent.pointerLeave(page);
    tick(350);
    expect(shapeRender).toHaveBeenCalledTimes(initialRenders);
    view.unmount();
    expect(frames.size).toBe(0);
  });

  it("keeps user pointer response without an ambient animation loop for reduced motion", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    const element = curve("accessible-path");
    element.interactions = [
      createDefaultInteraction({
        id: "wave",
        trigger: "pointer-move",
        effect: "wave-deform",
        wavePointerX: 80,
        wavePointerY: 60,
      }),
    ];
    const view = render(
      <ViewerPreview {...commonProps} elements={[element]} />,
    );
    tick(0);
    const path = view.container.querySelector(".pen-visible-path")!;
    const initial = path.getAttribute("d");
    const initialRenders = shapeRender.mock.calls.length;
    fireEvent.pointerMove(
      view.container.querySelector(".viewer-preview-page")!,
      pointer(160, 80),
    );
    expect(path.getAttribute("d")).not.toBe(initial);
    const pointerPath = path.getAttribute("d");
    tick(100);
    tick(200);
    expect(path.getAttribute("d")).toBe(pointerPath);
    expect(shapeRender).toHaveBeenCalledTimes(initialRenders);
  });

  it("moves a separate Direct follower alongside waves without rerendering the artwork", () => {
    const element = curve("moving-wave");
    element.interactions = [
      createDefaultInteraction({
        id: "wave",
        trigger: "pointer-move",
        effect: "wave-deform",
        wavePointerX: 50,
      }),
    ];
    const follower = shape("pointer-follower", {
      interactions: [
        createDefaultInteraction({
          id: "follow",
          trigger: "pointer-move",
          effect: "move",
          motion: "direct",
          moveX: 50,
          moveY: 20,
        }),
      ],
    });
    const view = render(
      <ViewerPreview {...commonProps} elements={[element, follower]} />,
    );
    tick(0);
    const movingElement = view.container.querySelector<HTMLElement>(
      '[data-element-id="pointer-follower"]',
    )!;
    const initialTransform = movingElement.style.transform;
    const initialRenders = shapeRender.mock.calls.length;
    const waveElement = view.container.querySelector<HTMLElement>(
      '[data-element-id="moving-wave"]',
    )!;
    const page = view.container.querySelector(".viewer-preview-page")!;
    // Crossing an authored wave or independent follower must not register
    // unrelated Hover runtime state and invalidate the entire scene.
    for (const target of [waveElement, movingElement]) {
      fireEvent.pointerEnter(target, pointer(80, 30));
      expect(shapeRender).toHaveBeenCalledTimes(initialRenders);
      fireEvent.pointerLeave(target, {
        ...pointer(90, 40),
        relatedTarget: page,
      });
      expect(shapeRender).toHaveBeenCalledTimes(initialRenders);
    }
    fireEvent.pointerMove(page, pointer(180, 80));
    tick(16);
    expect(movingElement.style.transform).not.toBe(initialTransform);
    expect(shapeRender).toHaveBeenCalledTimes(initialRenders);
    const rendered = view.container
      .querySelector(".pen-visible-path")!
      .getAttribute("d");
    tick(100);
    expect(
      view.container.querySelector(".pen-visible-path")!.getAttribute("d"),
    ).not.toBe(rendered);
    expect(shapeRender).toHaveBeenCalledTimes(initialRenders);
    fireEvent.pointerLeave(
      view.container.querySelector(".viewer-preview-page")!,
    );
    expect(movingElement.style.transform).toBe(initialTransform);
    expect(shapeRender).toHaveBeenCalledTimes(initialRenders);
  });

  it("still applies and resets a genuinely authored Hover opacity effect", () => {
    const element = shape("hover-opacity", {
      interactions: [
        createDefaultInteraction({
          id: "fade-on-hover",
          trigger: "hover",
          effect: "opacity",
          opacityTo: 25,
        }),
      ],
    });
    const view = render(
      <ViewerPreview {...commonProps} elements={[element]} />,
    );
    tick(0);
    const target = view.container.querySelector<HTMLElement>(
      '[data-element-id="hover-opacity"]',
    )!;
    expect(target.style.opacity).toBe("1");
    fireEvent.pointerEnter(target, pointer(50, 25));
    expect(target.style.opacity).toBe("0.25");
    fireEvent.pointerLeave(target, pointer(180, 80));
    expect(target.style.opacity).toBe("1");
  });

  it("keeps the shared React runtime when 3D objects are present", () => {
    const follower = shape("hybrid-pointer-follower", {
      interactions: [
        createDefaultInteraction({
          id: "follow",
          trigger: "pointer-move",
          effect: "move",
          motion: "direct",
          moveX: 50,
        }),
      ],
    });
    const object3d = createPrimitiveObject3D({
      id: "cube",
      name: "Cube",
      primitive: "box",
      dimensions: { width: 20, height: 20, depth: 20 },
      position: { x: 100, y: 50, z: 0 },
    });
    const view = render(
      <ViewerPreview
        {...commonProps}
        elements={[follower]}
        objects3d={[object3d]}
      />,
    );
    tick(0);
    const initialRenders = shapeRender.mock.calls.length;
    const movingElement = view.container.querySelector<HTMLElement>(
      '[data-element-id="hybrid-pointer-follower"]',
    )!;
    const initialTransform = movingElement.style.transform;
    fireEvent.pointerMove(
      view.container.querySelector(".viewer-preview-page")!,
      pointer(180, 80),
    );
    expect(movingElement.style.transform).not.toBe(initialTransform);
    expect(shapeRender.mock.calls.length).toBeGreaterThan(initialRenders);
  });
});
