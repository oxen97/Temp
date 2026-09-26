import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultInteraction } from "@/features/editor/lib/interaction-model";
import {
  defaultBackgroundMusicSettings,
  defaultSoundAdvancedSettings,
  defaultSoundMixerSettings,
  type CanvasElement,
} from "@/features/editor/store/editor-store";

import type { ViewerPointerTrailsElement } from "./viewer-pointer-trails";
import { ViewerPreview } from "./viewer-preview";

const { shapeRender } = vi.hoisted(() => ({ shapeRender: vi.fn() }));

vi.mock("@/features/editor/components/canvas/artboard-3d-scene", () => ({
  Artboard3DScene: () => null,
}));
vi.mock("@/features/editor/components/canvas/artboard-background", () => ({
  ArtboardBackground: () => null,
}));
vi.mock("@/features/editor/components/canvas/shape-graphic", () => ({
  ShapeGraphic: ({ element }: { element: CanvasElement }) => {
    shapeRender(element.id);
    return <span>{element.name}</span>;
  },
}));
vi.mock("@/features/editor/components/viewer/viewer-background-music", () => ({
  ViewerBackgroundMusic: () => null,
}));

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
    width: 20,
    height: 20,
    rotation: 0,
    opacity: 100,
    fill: "#fff",
    stroke: "none",
    strokeWidth: 0,
    cornerRadius: 0,
    visible: true,
    locked: false,
    ...overrides,
  };
}

/** Marks drawn by the canvas trail layer (the layer exposes what it draws). */
function trailMarks(container: HTMLElement) {
  return (
    container
      .querySelector<ViewerPointerTrailsElement>(".viewer-pointer-trails")
      ?.amousTrails?.snapshot() ?? []
  );
}

const commonProps = {
  advancedSound: defaultSoundAdvancedSettings,
  artboard: { background: "#000", cornerRadius: 0, height: 100, width: 200 },
  backgroundMusic: defaultBackgroundMusicSettings,
  mixer: defaultSoundMixerSettings,
  objects3d: [],
  onClose: vi.fn(),
  projectId: "generated-effects-preview",
};

beforeEach(() => {
  shapeRender.mockClear();
  // jsdom has no 2D canvas; the trail layer keeps its model without drawing.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
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

describe("viewer generated interactions", () => {
  it("keeps the artwork static during trail-only drag samples and fading frames", () => {
    const frames = new Map<number, FrameRequestCallback>();
    let frameId = 0;
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      const id = ++frameId;
      frames.set(id, callback);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    const tick = (time: number) => {
      now = time;
      const pending = [...frames.values()];
      frames.clear();
      act(() => pending.forEach((callback) => callback(time)));
    };
    const emitter = shape("emitter", {
      width: 200,
      height: 100,
      fill: "transparent",
      interactions: [
        createDefaultInteraction({
          id: "trail",
          trigger: "drag",
          triggerArea: "entire-artwork",
          effect: "pointer-trail",
          trailSpacing: 5,
          trailLifespan: 2,
        }),
      ],
    });
    const view = render(
      <ViewerPreview
        {...commonProps}
        elements={[shape("background"), emitter]}
      />,
    );
    tick(0);
    const surface = view.container.querySelector(
      '[data-element-id="emitter"]',
    )!;
    fireEvent.pointerDown(surface, {
      button: 0,
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
    });
    const initialRenderCount = shapeRender.mock.calls.length;
    for (const clientX of [20, 30, 40]) {
      fireEvent.pointerMove(surface, {
        clientX,
        clientY: 10,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
      });
    }
    expect(trailMarks(view.container)).toHaveLength(7);
    expect(shapeRender).toHaveBeenCalledTimes(initialRenderCount);
    tick(500);
    tick(1000);
    expect(shapeRender).toHaveBeenCalledTimes(initialRenderCount);
    expect(trailMarks(view.container)[0]?.opacity).toBe(0.5);
  });

  it("still moves a dragged object when it also emits a trail", () => {
    const emitter = shape("emitter", {
      interactions: [
        createDefaultInteraction({
          id: "trail",
          trigger: "drag",
          effect: "pointer-trail",
          trailSpacing: 5,
        }),
        createDefaultInteraction({
          id: "move",
          trigger: "drag",
          effect: "move",
          motion: "direct",
        }),
      ],
    });
    const view = render(
      <ViewerPreview {...commonProps} elements={[emitter]} />,
    );
    const surface = view.container.querySelector<HTMLElement>(
      '[data-element-id="emitter"]',
    )!;
    fireEvent.pointerDown(surface, {
      button: 0,
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
    });
    fireEvent.pointerMove(surface, {
      clientX: 35,
      clientY: 25,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
    });
    expect(surface.style.transform).toContain("translate(25px, 15px)");
    expect(trailMarks(view.container).length).toBeGreaterThan(1);
  });

  it("emits a drag trail at pointer-down and along the artboard path", () => {
    const emitter = shape("emitter", {
      width: 200,
      height: 100,
      fill: "transparent",
      interactions: [
        createDefaultInteraction({
          id: "trail",
          trigger: "drag",
          triggerArea: "entire-artwork",
          effect: "pointer-trail",
          trailSpacing: 10,
          trailMaxCount: 10,
        }),
      ],
    });
    const view = render(
      <ViewerPreview {...commonProps} elements={[emitter]} />,
    );
    const page = view.container.querySelector<HTMLElement>(
      ".viewer-preview-page",
    )!;
    fireEvent.pointerDown(page, {
      button: 0,
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
    });
    fireEvent.pointerMove(page, {
      clientX: 35,
      clientY: 10,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
    });
    expect(trailMarks(view.container)).toHaveLength(3);
    expect(
      view.container.querySelector<HTMLElement>('[data-element-id="emitter"]')
        ?.style.transform,
    ).toContain("translate(0px, 0px)");
  });

  it("spawns a group through an overlapping child and reports click logic", () => {
    const onInteractionEvent = vi.fn();
    const emitter = shape("emitter", {
      width: 200,
      height: 100,
      interactions: [
        createDefaultInteraction({
          id: "spawn",
          trigger: "click-tap",
          triggerArea: "entire-artwork",
          effect: "spawn-instance",
          spawnSourceId: "eye",
          spawnSizeMin: 100,
          spawnSizeMax: 100,
          spawnRotationMin: 0,
          spawnRotationMax: 0,
          spawnMaxCount: 1,
          spawnOverflow: "remove-oldest",
        }),
      ],
    });
    const child = shape("socket", { groupId: "eye", x: 70 });
    const iris = shape("iris", { groupId: "eye", x: 75, width: 8, height: 8 });
    const button = shape("next", {
      x: 170,
      interactions: [
        createDefaultInteraction({
          id: "next-click",
          trigger: "click-tap",
          effect: "emit-event",
        }),
      ],
    });
    const view = render(
      <ViewerPreview
        {...commonProps}
        elements={[emitter, child, iris, button]}
        onInteractionEvent={onInteractionEvent}
      />,
    );
    fireEvent.click(
      view.container.querySelector('[data-element-id="socket"]')!,
      {
        clientX: 80,
        clientY: 50,
      },
    );
    expect(
      view.container.querySelectorAll("[data-spawn-instance-id]"),
    ).toHaveLength(2);
    fireEvent.click(view.container.querySelector('[data-element-id="next"]')!, {
      clientX: 180,
      clientY: 50,
    });
    expect(
      view.container.querySelectorAll("[data-spawn-instance-id]"),
    ).toHaveLength(2);
    expect(onInteractionEvent).toHaveBeenCalledWith({
      objectId: "next",
      interactionId: "next-click",
      eventSource: "on-trigger",
    });
  });
});
