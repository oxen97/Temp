import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDefaultInteraction } from "@/features/editor/lib/interaction-model";
import {
  defaultBackgroundMusicSettings,
  defaultSoundAdvancedSettings,
  defaultSoundMixerSettings,
  type CanvasElement,
} from "@/features/editor/store/editor-store";

import { ViewerPreview } from "./viewer-preview";

vi.mock("@/features/editor/components/canvas/artboard-3d-scene", () => ({
  Artboard3DScene: () => null,
}));
vi.mock("@/features/editor/components/canvas/artboard-background", () => ({
  ArtboardBackground: ({ paused }: { paused?: boolean }) => (
    <span data-testid="background" data-paused={paused ? "true" : "false"} />
  ),
}));
vi.mock("@/features/editor/components/canvas/shape-graphic", () => ({
  ShapeGraphic: ({
    element,
    mediaPaused,
  }: {
    element: CanvasElement;
    mediaPaused?: boolean;
  }) => (
    <span data-media-paused={mediaPaused ? "true" : "false"}>
      {element.name}
    </span>
  ),
}));
vi.mock("@/features/editor/components/viewer/viewer-background-music", () => ({
  ViewerBackgroundMusic: () => null,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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
  artboard: { background: "#000", cornerRadius: 0, height: 100, width: 200 },
  backgroundMusic: defaultBackgroundMusicSettings,
  mixer: defaultSoundMixerSettings,
  objects3d: [],
  onClose: vi.fn(),
  projectId: "media-playback-test",
};

function openModal(backdrop: boolean) {
  return createDefaultInteraction({
    id: "open",
    effect: "open-modal",
    modalBackdrop: backdrop,
    modalTarget: "dialog-video",
    trigger: "click-tap",
  });
}

function scene(backdrop = true) {
  return [
    shape({
      id: "tile",
      name: "Tile video",
      type: "video",
      src: "/tile.webm",
      interactions: [openModal(backdrop)],
    }),
    shape({ id: "feature", name: "Feature video", type: "video", src: "/f.webm" }),
    shape({
      id: "dialog-video",
      name: "Dialog video",
      type: "video",
      src: "/big.webm",
      groupId: "dialog",
    }),
  ];
}

const paused = (view: ReturnType<typeof render>, id: string) =>
  view.container
    .querySelector(`[data-element-id="${id}"] [data-media-paused]`)
    ?.getAttribute("data-media-paused");

describe("viewer media playback", () => {
  it("keeps a closed dialog's video paused and only plays it while open", () => {
    const view = render(<ViewerPreview {...commonProps} elements={scene()} />);
    expect(paused(view, "dialog-video")).toBe("true");
    expect(paused(view, "tile")).toBe("false");
    expect(paused(view, "feature")).toBe("false");
    expect(view.getByTestId("background")).toHaveAttribute("data-paused", "false");

    fireEvent.click(
      view.container.querySelector<HTMLElement>('[data-element-id="tile"]')!,
    );
    // Only the dialog decodes while its backdrop covers the page.
    expect(paused(view, "dialog-video")).toBe("false");
    expect(paused(view, "tile")).toBe("true");
    expect(paused(view, "feature")).toBe("true");
    expect(view.getByTestId("background")).toHaveAttribute("data-paused", "true");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(paused(view, "dialog-video")).toBe("true");
    expect(paused(view, "tile")).toBe("false");
    expect(paused(view, "feature")).toBe("false");
    expect(view.getByTestId("background")).toHaveAttribute("data-paused", "false");
  });

  it("keeps the page playing behind a dialog without a backdrop", () => {
    const view = render(
      <ViewerPreview {...commonProps} elements={scene(false)} />,
    );
    fireEvent.click(
      view.container.querySelector<HTMLElement>('[data-element-id="tile"]')!,
    );
    expect(paused(view, "dialog-video")).toBe("false");
    expect(paused(view, "tile")).toBe("false");
    expect(paused(view, "feature")).toBe("false");
    expect(view.getByTestId("background")).toHaveAttribute("data-paused", "false");
  });
});
