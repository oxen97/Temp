import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultInteraction } from "@/features/editor/lib/interaction-model";
import {
  defaultBackgroundMusicSettings,
  defaultSoundAdvancedSettings,
  defaultSoundMixerSettings,
  type CanvasElement,
} from "@/features/editor/store/editor-store";

import { ViewerPreview } from "./viewer-preview";

vi.mock("@/features/editor/components/canvas/artboard-3d-scene", () => ({
  Artboard3DScene: ({ interactive }: { interactive: boolean }) => (
    <div
      data-interactive={interactive ? "true" : "false"}
      data-testid="artboard-3d-scene"
    />
  ),
}));
vi.mock("@/features/editor/components/canvas/artboard-background", () => ({
  ArtboardBackground: () => null,
}));
vi.mock("@/features/editor/components/canvas/shape-graphic", () => ({
  ShapeGraphic: ({ element }: { element: CanvasElement }) => (
    <span>{element.name}</span>
  ),
}));
vi.mock("@/features/editor/components/viewer/viewer-background-music", () => ({
  ViewerBackgroundMusic: () => null,
}));

function shape(overrides: Partial<CanvasElement>): CanvasElement {
  return {
    id: "shape",
    name: "Shape",
    type: "rectangle",
    x: 0,
    y: 0,
    width: 20,
    height: 20,
    rotation: 0,
    opacity: 100,
    fill: "#fff",
    stroke: "#000",
    strokeWidth: 0,
    cornerRadius: 0,
    visible: true,
    locked: false,
    ...overrides,
  };
}

const commonProps = {
  advancedSound: defaultSoundAdvancedSettings,
  artboard: {
    background: "#000",
    cornerRadius: 0,
    height: 100,
    width: 200,
  },
  backgroundMusic: defaultBackgroundMusicSettings,
  mixer: defaultSoundMixerSettings,
  objects3d: [],
  onClose: vi.fn(),
  projectId: "preview-drop-test",
};

function dragElement({
  element,
  fromX,
  pointerId,
  toX,
  y = 10,
}: {
  element: HTMLElement;
  fromX: number;
  pointerId: number;
  toX: number;
  y?: number;
}) {
  fireEvent.pointerDown(element, {
    button: 0,
    clientX: fromX,
    clientY: y,
    isPrimary: true,
    pointerId,
    pointerType: "mouse",
  });
  fireEvent.pointerMove(element, {
    clientX: toX,
    clientY: y,
    isPrimary: true,
    pointerId,
    pointerType: "mouse",
  });
  fireEvent.pointerUp(element, {
    clientX: toX,
    clientY: y,
    isPrimary: true,
    pointerId,
    pointerType: "mouse",
  });
}

describe("viewer target interactions", () => {
  beforeEach(() => {
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
    vi.useRealTimers();
  });

  it("snaps a dropped source and resets placement when the preview reopens", () => {
    const elements = [
      shape({
        id: "source",
        name: "Source",
        x: 10,
        interactions: [
          createDefaultInteraction({
            id: "drop-snap",
            collisionTarget: "target",
            duration: 0,
            effect: "snap-to-target",
            trigger: "drop-on-target",
          }),
        ],
      }),
      shape({ id: "target", name: "Target", x: 100 }),
    ];
    const first = render(
      <ViewerPreview {...commonProps} elements={elements} />,
    );
    const source = first.container.querySelector<HTMLElement>(
      '[data-element-id="source"]',
    )!;

    dragElement({
      element: source,
      fromX: 20,
      pointerId: 1,
      toX: 110,
    });

    expect(source.style.transform).toContain("translate(90px, 0px)");

    first.unmount();
    const reopened = render(
      <ViewerPreview {...commonProps} elements={elements} />,
    );
    expect(
      reopened.container.querySelector<HTMLElement>(
        '[data-element-id="source"]',
      )!.style.transform,
    ).toContain("translate(0px, 0px)");
  });

  it("runs every matching drop row so one drop can snap and open a modal", () => {
    const elements = [
      shape({
        id: "source",
        name: "Source",
        x: 10,
        interactions: [
          createDefaultInteraction({
            id: "drop-snap",
            collisionTarget: "target",
            duration: 0,
            effect: "snap-to-target",
            trigger: "drop-on-target",
          }),
          createDefaultInteraction({
            id: "drop-modal",
            collisionTarget: "target",
            effect: "open-modal",
            modalTarget: "dialog",
            trigger: "drop-on-target",
          }),
        ],
      }),
      shape({ id: "target", name: "Target", x: 100 }),
      shape({ id: "dialog", name: "Dialog", x: 150 }),
    ];
    const view = render(<ViewerPreview {...commonProps} elements={elements} />);
    const source = view.container.querySelector<HTMLElement>(
      '[data-element-id="source"]',
    )!;
    const dialog = view.container.querySelector<HTMLElement>(
      '[data-element-id="dialog"]',
    )!;

    expect(dialog.style.display).toBe("none");
    dragElement({
      element: source,
      fromX: 20,
      pointerId: 2,
      toX: 110,
    });

    expect(source.style.transform).toContain("translate(90px, 0px)");
    expect(dialog).toHaveAttribute("role", "dialog");
    expect(dialog.style.display).not.toBe("none");
  });

  it("does not run non-placement drop rows when target capacity rejects the drop", () => {
    const placement = (id: string) =>
      createDefaultInteraction({
        id,
        collisionTarget: "target",
        duration: 0,
        effect: "snap-to-target",
        occupiedBehavior: "reject",
        targetCapacity: 1,
        trigger: "drop-on-target",
      });
    const elements = [
      shape({
        id: "first-source",
        name: "First source",
        x: 10,
        interactions: [placement("first-snap")],
      }),
      shape({
        id: "second-source",
        name: "Second source",
        x: 40,
        interactions: [
          placement("second-snap"),
          createDefaultInteraction({
            id: "second-modal",
            collisionTarget: "target",
            effect: "open-modal",
            modalTarget: "dialog",
            trigger: "drop-on-target",
          }),
        ],
      }),
      shape({ id: "target", name: "Target", x: 100 }),
      shape({ id: "dialog", name: "Dialog", x: 150 }),
    ];
    const view = render(<ViewerPreview {...commonProps} elements={elements} />);
    const first = view.container.querySelector<HTMLElement>(
      '[data-element-id="first-source"]',
    )!;
    const second = view.container.querySelector<HTMLElement>(
      '[data-element-id="second-source"]',
    )!;
    const dialog = view.container.querySelector<HTMLElement>(
      '[data-element-id="dialog"]',
    )!;

    dragElement({
      element: first,
      fromX: 20,
      pointerId: 3,
      toX: 110,
    });
    expect(first.style.transform).toContain("translate(90px, 0px)");

    dragElement({
      element: second,
      fromX: 50,
      pointerId: 4,
      toX: 110,
    });

    expect(second.style.transform).toContain("translate(0px, 0px)");
    expect(dialog.style.display).toBe("none");
  });

  it("resets a non-placement drop effect after its duration and hold", () => {
    vi.useFakeTimers();
    const elements = [
      shape({
        id: "source",
        name: "Source",
        opacity: 100,
        x: 10,
        interactions: [
          createDefaultInteraction({
            id: "drop-opacity",
            collisionTarget: "target",
            duration: 0.1,
            effect: "opacity",
            hold: 0.05,
            opacityTo: 25,
            resetMode: "return-to-origin",
            trigger: "drop-on-target",
          }),
        ],
      }),
      shape({ id: "target", name: "Target", x: 100 }),
    ];
    const view = render(<ViewerPreview {...commonProps} elements={elements} />);
    const source = view.container.querySelector<HTMLElement>(
      '[data-element-id="source"]',
    )!;

    dragElement({
      element: source,
      fromX: 20,
      pointerId: 5,
      toX: 110,
    });
    expect(source.style.opacity).toBe("0.25");

    act(() => vi.advanceTimersByTime(149));
    expect(source.style.opacity).toBe("0.25");
    act(() => vi.advanceTimersByTime(2));
    expect(source.style.opacity).toBe("1");
  });

  it("resets contextual exit effects but keeps contextual successful-drop effects", () => {
    vi.useFakeTimers();
    const elements = [
      shape({
        id: "source",
        name: "Source",
        opacity: 100,
        x: 10,
        interactions: [
          createDefaultInteraction({
            id: "outside-opacity",
            collisionTarget: "target",
            duration: 0.05,
            effect: "opacity",
            opacityTo: 25,
            resetMode: "contextual",
            trigger: "drop-outside-target",
          }),
          createDefaultInteraction({
            id: "inside-opacity",
            collisionTarget: "target",
            duration: 0.05,
            effect: "opacity",
            opacityTo: 40,
            resetMode: "contextual",
            trigger: "drop-on-target",
          }),
        ],
      }),
      shape({ id: "target", name: "Target", x: 100 }),
    ];
    const view = render(<ViewerPreview {...commonProps} elements={elements} />);
    const source = view.container.querySelector<HTMLElement>(
      '[data-element-id="source"]',
    )!;

    dragElement({
      element: source,
      fromX: 20,
      pointerId: 7,
      toX: 40,
    });
    expect(source.style.opacity).toBe("0.25");
    act(() => vi.advanceTimersByTime(50));
    expect(source.style.opacity).toBe("1");

    dragElement({
      element: source,
      fromX: 20,
      pointerId: 8,
      toX: 110,
    });
    expect(source.style.opacity).toBe("0.4");
    act(() => vi.advanceTimersByTime(100));
    expect(source.style.opacity).toBe("0.4");
  });

  it("commits the actual drop position for a non-placement row that stays at target", () => {
    const elements = [
      shape({
        id: "source",
        name: "Source",
        opacity: 100,
        x: 10,
        interactions: [
          createDefaultInteraction({
            id: "stay-opacity",
            collisionTarget: "target",
            duration: 0,
            effect: "opacity",
            opacityTo: 25,
            resetMode: "stay-at-target",
            trigger: "drop-on-target",
          }),
        ],
      }),
      shape({ id: "target", name: "Target", x: 100 }),
    ];
    const view = render(<ViewerPreview {...commonProps} elements={elements} />);
    const source = view.container.querySelector<HTMLElement>(
      '[data-element-id="source"]',
    )!;

    dragElement({
      element: source,
      fromX: 20,
      pointerId: 9,
      toX: 110,
    });

    expect(source.style.opacity).toBe("0.25");
    expect(source.style.transform).toContain("translate(90px, 0px)");
  });

  it("uses the latest target geometry when a delayed snap command runs", () => {
    vi.useFakeTimers();
    const elements = [
      shape({
        id: "source",
        name: "Source",
        x: 10,
        interactions: [
          createDefaultInteraction({
            id: "delayed-snap",
            collisionTarget: "target",
            delay: 0.1,
            duration: 0,
            effect: "snap-to-target",
            trigger: "drop-on-target",
          }),
        ],
      }),
      shape({
        id: "target",
        name: "Target",
        x: 100,
        interactions: [
          createDefaultInteraction({
            id: "move-target",
            duration: 0,
            effect: "move",
            moveX: 50,
            moveY: 0,
            trigger: "click-tap",
          }),
        ],
      }),
    ];
    const view = render(<ViewerPreview {...commonProps} elements={elements} />);
    const source = view.container.querySelector<HTMLElement>(
      '[data-element-id="source"]',
    )!;
    const target = view.container.querySelector<HTMLElement>(
      '[data-element-id="target"]',
    )!;

    dragElement({
      element: source,
      fromX: 20,
      pointerId: 6,
      toX: 110,
    });
    fireEvent.click(target);
    expect(target.style.transform).toContain("translate(50px, 0px)");

    act(() => vi.advanceTimersByTime(100));
    expect(source.style.transform).toContain("translate(140px, 0px)");
  });

  it("opens a grouped modal with a backdrop and lets Escape close it first", () => {
    const elements = [
      shape({
        id: "opener",
        name: "Open",
        interactions: [
          createDefaultInteraction({
            id: "open-modal",
            effect: "open-modal",
            modalTarget: "dialog-frame",
            trigger: "click-tap",
          }),
        ],
      }),
      shape({
        id: "dialog-frame",
        name: "Dialog",
        groupId: "dialog-group",
        x: 50,
      }),
      shape({
        id: "dialog-copy",
        name: "Dialog copy",
        groupId: "dialog-group",
        x: 55,
        y: 25,
      }),
    ];
    const view = render(<ViewerPreview {...commonProps} elements={elements} />);
    const opener = view.container.querySelector<HTMLElement>(
      '[data-element-id="opener"]',
    )!;
    const frame = view.container.querySelector<HTMLElement>(
      '[data-element-id="dialog-frame"]',
    )!;
    const copy = view.container.querySelector<HTMLElement>(
      '[data-element-id="dialog-copy"]',
    )!;

    expect(frame.style.display).toBe("none");
    expect(copy.style.display).toBe("none");
    fireEvent.click(opener);
    expect(frame).toHaveAttribute("role", "dialog");
    expect(frame).toHaveAttribute("aria-modal", "true");
    expect(frame).toHaveAccessibleName("Dialog");
    expect(copy).toHaveAttribute("data-modal-member", "true");
    expect(
      view.container.querySelector(".viewer-preview-modal-backdrop"),
    ).toBeInTheDocument();
    expect(opener).toHaveAttribute("inert");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(frame.style.display).toBe("none");
    expect(
      view.container.querySelector(".viewer-preview-modal-backdrop"),
    ).not.toBeInTheDocument();
  });

  it("makes 2D and 3D content behind a modal inert and supports backdrop close", () => {
    const elements = [
      shape({
        id: "opener",
        name: "Open",
        interactions: [
          createDefaultInteraction({
            id: "open-modal",
            effect: "open-modal",
            modalCloseOnBackdrop: true,
            modalTarget: "dialog",
            trigger: "click-tap",
          }),
        ],
      }),
      shape({ id: "dialog", name: "Dialog", x: 50 }),
    ];
    const view = render(<ViewerPreview {...commonProps} elements={elements} />);
    const opener = view.container.querySelector<HTMLElement>(
      '[data-element-id="opener"]',
    )!;
    const dialog = view.container.querySelector<HTMLElement>(
      '[data-element-id="dialog"]',
    )!;
    const scene = view.getByTestId("artboard-3d-scene");

    expect(scene).toHaveAttribute("data-interactive", "true");
    fireEvent.click(opener);

    const sceneLayer = view.container.querySelector<HTMLElement>(
      "[data-viewer-3d-layer]",
    )!;
    const backdrop = view.container.querySelector<HTMLButtonElement>(
      ".viewer-preview-modal-backdrop",
    )!;
    expect(dialog).toHaveAttribute("role", "dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(opener).toHaveAttribute("aria-hidden", "true");
    expect(opener).toHaveAttribute("inert");
    expect(sceneLayer).toHaveAttribute("aria-hidden", "true");
    expect(sceneLayer).toHaveAttribute("inert");
    expect(scene).toHaveAttribute("data-interactive", "false");

    fireEvent.click(backdrop);
    expect(dialog.style.display).toBe("none");
    expect(sceneLayer).not.toHaveAttribute("aria-hidden");
    expect(sceneLayer).not.toHaveAttribute("inert");
    expect(scene).toHaveAttribute("data-interactive", "true");
  });

  it("renders a non-dismissible backdrop as presentation instead of a button", () => {
    const elements = [
      shape({
        id: "opener",
        name: "Open",
        interactions: [
          createDefaultInteraction({
            id: "open-locked-modal",
            effect: "open-modal",
            modalCloseOnBackdrop: false,
            modalTarget: "dialog",
            trigger: "click-tap",
          }),
        ],
      }),
      shape({ id: "dialog", name: "Locked dialog", x: 50 }),
    ];
    const view = render(<ViewerPreview {...commonProps} elements={elements} />);
    fireEvent.click(
      view.container.querySelector<HTMLElement>('[data-element-id="opener"]')!,
    );

    const backdrop = view.container.querySelector<HTMLElement>(
      ".viewer-preview-modal-backdrop",
    )!;
    expect(backdrop.tagName).toBe("DIV");
    expect(backdrop).toHaveAttribute("aria-hidden", "true");
    expect(backdrop).not.toHaveAttribute("role", "button");
  });
});
