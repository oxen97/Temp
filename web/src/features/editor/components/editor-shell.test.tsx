import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { INTERFACE_SCALE_STORAGE_KEY } from "../lib/interface-scale";
import {
  defaultInteractionSoundSettings,
  useEditorStore,
} from "../store/editor-store";
import type {
  CanvasElement,
  InteractionSoundSettings,
} from "../store/editor-store";
import { calculateCanvasFitZoom } from "../lib/geometry";
import { createDefaultInteraction } from "../lib/interaction-model";
import {
  calculateInteractionSoundVolume,
  chooseInteractionSoundAsset,
} from "../lib/sound-playback";
import {
  soundOutputBitrate,
  soundPreloadAttribute,
} from "../lib/sound-settings";
import { EditorShell } from "./editor-shell";

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:background-music-test"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  window.localStorage.clear();
  useEditorStore.setState({
    activePageId: "page-1",
    activeTool: "selection",
    artboard: {
      background: "#d9d9d9",
      cornerRadius: 10,
      height: 679,
      width: 1208,
    },
    clipboard: [],
    future: [],
    pages: [{ id: "page-1", name: "Intro", elements: [] }],
    past: [],
    selectedElementIds: [],
    selectedShape: "rectangle",
    zoom: 100,
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function setTestBackgroundMusic(
  startPlayback: "on-page-enter" | "after-delay" | "on-interaction" | "manual",
  delaySeconds = 0,
) {
  useEditorStore.setState((state) => ({
    pages: state.pages.map((page) =>
      page.id === state.activePageId
        ? {
            ...page,
            backgroundMusic: {
              asset: {
                durationSeconds: 1,
                mimeType: "audio/wav",
                name: "viewer-test.wav",
                sizeBytes: 1024,
                src: "blob:viewer-background-music-test",
              },
              delaySeconds,
              fadeInSeconds: 0,
              fadeOutSeconds: 0,
              loop: false,
              startPlayback,
              volume: 100,
            },
          }
        : page,
    ),
  }));
}

function testInteractionSound(
  overrides: Partial<InteractionSoundSettings> = {},
): InteractionSoundSettings {
  return {
    ...defaultInteractionSoundSettings,
    id: "test-interaction-sound",
    ...overrides,
    assets: overrides.assets
      ? overrides.assets.map((asset) => ({ ...asset }))
      : [],
  };
}

function testSoundAsset(name: string) {
  return {
    durationSeconds: 1,
    mimeType: "audio/wav",
    name: `${name}.wav`,
    sizeBytes: 128,
    src: `blob:${name}`,
  };
}

function testSoundShape(
  id: string,
  x: number,
  interactionSounds?: InteractionSoundSettings[],
): CanvasElement {
  return {
    cornerRadius: 0,
    fill: "#ffffff",
    height: 80,
    id,
    interactionSounds,
    locked: false,
    name: id,
    opacity: 100,
    rotation: 0,
    stroke: "#000000",
    strokeWidth: 0,
    type: "rectangle",
    visible: true,
    width: 100,
    x,
    y: 100,
  };
}

function createMp3WithEmbeddedPng() {
  const ascii = (value: string) =>
    Uint8Array.from(value, (character) => character.charCodeAt(0));
  const concat = (...parts: Uint8Array[]) => {
    const result = new Uint8Array(
      parts.reduce((total, part) => total + part.length, 0),
    );
    let offset = 0;
    parts.forEach((part) => {
      result.set(part, offset);
      offset += part.length;
    });
    return result;
  };
  const uint32 = (value: number) =>
    Uint8Array.of(
      (value >>> 24) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 8) & 0xff,
      value & 0xff,
    );
  const syncSafe = (value: number) =>
    Uint8Array.of(
      (value >>> 21) & 0x7f,
      (value >>> 14) & 0x7f,
      (value >>> 7) & 0x7f,
      value & 0x7f,
    );
  const png = Uint8Array.from(
    atob(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    ),
    (character) => character.charCodeAt(0),
  );
  const payload = concat(
    Uint8Array.of(0),
    ascii("image/png"),
    Uint8Array.of(0, 3, 0),
    png,
  );
  const frame = concat(
    ascii("APIC"),
    uint32(payload.length),
    Uint8Array.of(0, 0),
    payload,
  );
  const tag = concat(
    ascii("ID3"),
    Uint8Array.of(3, 0, 0),
    syncSafe(frame.length),
    frame,
  );
  return new File([tag], "covered.mp3", { type: "audio/mpeg" });
}

describe("canvas fit zoom", () => {
  it("fits to the available canvas without using device pixel ratio", () => {
    expect(calculateCanvasFitZoom(1200, 900, 1920, 1080)).toBe(59.9);
    expect(calculateCanvasFitZoom(3000, 2000, 1920, 1080)).toBe(153.65);
  });

  it("clamps invalid and extreme fit values", () => {
    expect(calculateCanvasFitZoom(0, 0, 1920, 1080)).toBe(100);
    expect(calculateCanvasFitZoom(10, 10, 1920, 1080)).toBe(5);
    expect(calculateCanvasFitZoom(20000, 20000, 100, 100)).toBe(500);
  });
});

describe("interaction sound fades", () => {
  const settings = {
    fadeInSeconds: 1,
    fadeOutSeconds: 1,
    volume: 80,
  };

  it("applies fade-in and natural fade-out without fading every loop", () => {
    expect(calculateInteractionSoundVolume(settings, 0, 0, 10, false)).toBe(0);
    expect(
      calculateInteractionSoundVolume(settings, 0.5, 0.5, 10, false),
    ).toBeCloseTo(0.4, 5);
    expect(calculateInteractionSoundVolume(settings, 2, 5, 10, false)).toBe(
      0.8,
    );
    expect(
      calculateInteractionSoundVolume(settings, 2, 9.5, 10, false),
    ).toBeCloseTo(0.4, 5);
    expect(calculateInteractionSoundVolume(settings, 2, 9.5, 10, true)).toBe(
      0.8,
    );
  });
});

describe("interaction sound playback selection", () => {
  const assets = [
    testSoundAsset("first"),
    testSoundAsset("second"),
    testSoundAsset("third"),
  ];

  it("plays Multiple Sounds one at a time in sequential order", () => {
    const settings = testInteractionSound({
      assets,
      playbackMode: "sequential",
      soundSource: "multiple",
    });
    const cursor = { lastSource: null, sequentialIndex: 0 };

    expect(chooseInteractionSoundAsset(settings, cursor)?.src).toBe(
      "blob:first",
    );
    expect(chooseInteractionSoundAsset(settings, cursor)?.src).toBe(
      "blob:second",
    );
    expect(chooseInteractionSoundAsset(settings, cursor)?.src).toBe(
      "blob:third",
    );
    expect(chooseInteractionSoundAsset(settings, cursor)?.src).toBe(
      "blob:first",
    );
  });

  it("shuffles one sound while avoiding consecutive repeats when enabled", () => {
    const settings = testInteractionSound({
      assets,
      avoidRepeating: true,
      playbackMode: "shuffle",
      soundSource: "multiple",
    });
    const cursor = { lastSource: null, sequentialIndex: 0 };

    expect(chooseInteractionSoundAsset(settings, cursor, () => 0)?.src).toBe(
      "blob:first",
    );
    expect(chooseInteractionSoundAsset(settings, cursor, () => 0)?.src).toBe(
      "blob:second",
    );
  });

  it("maps advanced sound output and preload settings", () => {
    expect(soundOutputBitrate("high")).toBe(320);
    expect(soundOutputBitrate("medium")).toBe(192);
    expect(soundOutputBitrate("low")).toBe(128);
    expect(soundPreloadAttribute("all")).toBe("auto");
    expect(soundPreloadAttribute("auto")).toBe("metadata");
    expect(soundPreloadAttribute("on-demand")).toBe("none");
  });
});

describe("EditorShell", () => {
  it("starts with one empty page and no fabricated layers", () => {
    render(<EditorShell />);

    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByLabelText("Creation tools")).toBeInTheDocument();
    expect(screen.getByLabelText("Exhibition canvas")).toBeInTheDocument();
    expect(screen.getByLabelText("Properties")).toBeInTheDocument();
    expect(screen.getByText("Intro")).toBeInTheDocument();
    expect(screen.getByLabelText("Layers")).toBeEmptyDOMElement();
  });

  it("offers a 3D asset tab with GLB and glTF uploads", () => {
    const { container } = render(<EditorShell />);

    const uploadInput = container.querySelector(".asset-upload input");
    expect(uploadInput).toHaveAttribute("accept", "image/*");
    const threeDTab = screen.getByRole("tab", { name: "3D" });
    expect(threeDTab).toHaveAttribute("aria-selected", "false");
    fireEvent.click(threeDTab);
    expect(threeDTab).toHaveAttribute("aria-selected", "true");

    expect(uploadInput).toHaveAttribute(
      "accept",
      ".glb,.gltf,model/gltf-binary,model/gltf+json",
    );
  });

  it("keeps uploaded images and videos in their respective asset tabs", () => {
    vi.mocked(URL.createObjectURL).mockImplementation(
      (blob) => `blob:${blob instanceof File ? blob.name : "asset"}`,
    );
    const { container } = render(<EditorShell />);
    const uploadInput = container.querySelector<HTMLInputElement>(
      ".asset-upload input",
    );
    expect(uploadInput).not.toBeNull();

    fireEvent.change(uploadInput!, {
      target: {
        files: [new File(["image"], "photo.png", { type: "image/png" })],
      },
    });
    expect(
      screen.getByRole("button", { name: "Add uploaded asset 1" }),
    ).toHaveStyle("background-image: url(blob:photo.png)");

    fireEvent.click(screen.getByRole("tab", { name: "Video" }));
    expect(
      screen.queryByRole("button", { name: "Add uploaded asset 1" }),
    ).not.toBeInTheDocument();

    fireEvent.change(uploadInput!, {
      target: {
        files: [new File(["video"], "clip.mp4", { type: "video/mp4" })],
      },
    });
    const addVideo = screen.getByRole("button", {
      name: "Add uploaded video clip.mp4",
    });
    expect(addVideo).toBeInTheDocument();
    expect(addVideo.querySelector("video")).toBeNull();

    fireEvent.click(addVideo);
    expect(useEditorStore.getState().pages[0].elements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Video 1",
          src: "blob:clip.mp4",
          type: "video",
        }),
      ]),
    );
    expect(
      document.querySelector(".canvas-element.element-video video"),
    ).toHaveAttribute("src", "blob:clip.mp4");

    fireEvent.click(screen.getByRole("tab", { name: "Image" }));
    expect(
      screen.getByRole("button", { name: "Add uploaded asset 1" }),
    ).toHaveStyle("background-image: url(blob:photo.png)");
    expect(
      screen.queryByRole("button", {
        name: "Add uploaded video clip.mp4",
      }),
    ).not.toBeInTheDocument();
  });

  it("scales the editor chrome without changing the canvas zoom", async () => {
    render(<EditorShell />);

    fireEvent.click(screen.getByRole("button", { name: "100 %" }));
    expect(
      screen.getByRole("menu", { name: "View and interface scale" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: "Auto (100%)" }),
    ).toHaveAttribute("aria-checked", "true");

    fireEvent.click(screen.getByRole("menuitemradio", { name: "125%" }));

    await waitFor(() =>
      expect(document.querySelector(".editor-shell")).toHaveAttribute(
        "data-interface-scale",
        "125",
      ),
    );
    expect(document.querySelector(".editor-shell")).toHaveStyle(
      "--interface-scale: 1.25",
    );
    expect(window.localStorage.getItem(INTERFACE_SCALE_STORAGE_KEY)).toBe(
      "125",
    );
    expect(useEditorStore.getState().zoom).toBe(100);
    expect(screen.getByLabelText("Exhibition canvas")).not.toHaveStyle(
      "zoom: 1.25",
    );
    expect(document.querySelectorAll(".interface-scale-surface")).toHaveLength(
      5,
    );
    expect(screen.getByLabelText("Creation tools")).toHaveClass(
      "interface-scale-surface",
    );
    expect(screen.getByLabelText("Project panels")).toHaveClass(
      "interface-scale-surface",
    );
    expect(screen.getByLabelText("Properties")).toHaveClass(
      "interface-scale-surface",
    );
  });

  it("offers Zoom to Fit independently from interface scale", async () => {
    render(<EditorShell />);
    const canvas = screen.getByLabelText("Exhibition canvas");
    Object.defineProperty(canvas, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 900,
        height: 900,
        left: 0,
        right: 1200,
        toJSON: () => ({}),
        top: 0,
        width: 1200,
        x: 0,
        y: 0,
      }),
    });

    fireEvent.click(screen.getByRole("button", { name: "100 %" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Zoom to Fit/ }));

    await waitFor(() => expect(useEditorStore.getState().zoom).toBe(95.2));

    act(() => useEditorStore.getState().setZoom(200));
    fireEvent.keyDown(window, { code: "Digit1", key: "!", shiftKey: true });
    expect(useEditorStore.getState().zoom).toBe(95.2);
  });

  it("renders gradient and image backgrounds in the SCENES thumbnail", () => {
    useEditorStore.setState((state) => ({
      artboard: {
        ...state.artboard,
        backgroundGradientEnabled: true,
        backgroundImage: "blob:scene-thumbnail-background",
        backgroundImageOpacity: 65,
        backgroundMediaType: "image",
        backgroundSolidEnabled: true,
        gradientStops: [
          { color: "#ff0000", opacity: 100, position: 0 },
          { color: "#0000ff", opacity: 100, position: 100 },
        ],
      },
    }));

    const { container } = render(<EditorShell />);
    const thumbnail = container.querySelector<HTMLElement>(".scene-thumbnail")!;
    const gradientLayer = thumbnail.querySelector<HTMLElement>(
      '[data-background-layer="gradient"]',
    );
    const imageLayer = thumbnail.querySelector<HTMLElement>(
      '[data-background-layer="image"]',
    );

    expect(gradientLayer?.style.backgroundImage).toContain("linear-gradient");
    expect(imageLayer?.style.backgroundImage).toContain(
      "blob:scene-thumbnail-background",
    );
    expect(imageLayer?.style.opacity).toBe("0.65");
  });

  it("renders the Figma SCENES panel without changing the other property tabs", () => {
    render(<EditorShell />);

    fireEvent.click(screen.getByRole("tab", { name: "SCENES" }));

    expect(useEditorStore.getState().activeTool).toBe("selection");
    expect(screen.getByRole("button", { name: "Selection" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("tabpanel", { name: "Scenes settings" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Page Name")).toHaveValue("Intro");
    expect(screen.getByLabelText("Page Width")).toHaveValue(1208);
    expect(screen.getByLabelText("Page Height")).toHaveValue(679);
    fireEvent.click(screen.getByLabelText("Page aspect ratio"));
    expect(screen.getByRole("option", { name: "9 : 16" })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Free" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Background")).toHaveLength(1);
    expect(screen.getByRole("tab", { name: "DESIGN" })).toBeInTheDocument();

    expect(screen.queryByLabelText("Center content")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Hide overflow")).not.toBeInTheDocument();
  });

  it("moves the property tab indicator with the selected panel", () => {
    render(<EditorShell />);

    const tablist = screen.getByRole("tablist", {
      name: "Property sections",
    });
    expect(tablist).toHaveAttribute("data-active-tab", "design");

    fireEvent.click(screen.getByRole("tab", { name: "SCENES" }));
    expect(tablist).toHaveAttribute("data-active-tab", "scenes");
    expect(screen.getByRole("tab", { name: "SCENES" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.click(screen.getByRole("tab", { name: "DESIGN" }));
    expect(tablist).toHaveAttribute("data-active-tab", "design");
    expect(screen.getByRole("tab", { name: "DESIGN" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("keeps the current property tab when creation tools are selected", () => {
    render(<EditorShell />);

    fireEvent.click(screen.getByRole("tab", { name: "SCENES" }));
    fireEvent.click(screen.getByRole("button", { name: /^Rectangle$/ }));
    expect(
      screen.getByRole("tabpanel", { name: "Scenes settings" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Text$/ }));
    expect(
      screen.getByRole("tabpanel", { name: "Scenes settings" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "SCENES" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("renders the Figma SOUND panel without changing the other panels", () => {
    render(<EditorShell />);

    fireEvent.click(screen.getByRole("tab", { name: "SOUND" }));

    expect(
      screen.getByRole("tabpanel", { name: "Sound settings" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "SOUND" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Background Music (BGM)")).toBeInTheDocument();
    expect(screen.queryByText("Interaction Sounds")).not.toBeInTheDocument();
    expect(screen.getByText("No file")).toBeInTheDocument();
    expect(
      document.querySelector(".sound-file-thumbnail-icon"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Upload background music" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Play background music preview" }),
    ).toBeDisabled();
    expect(screen.getByText("00:00 / 0.0MB")).toBeInTheDocument();
    expect(screen.getByLabelText("Sound volume")).toHaveValue(100);
    expect(screen.getByLabelText("Fade in duration")).toHaveValue(0);
    expect(screen.getByLabelText("Fade out duration")).toHaveValue(0);
    const loopButton = screen.getByRole("button", { name: "Loop" });
    expect(loopButton).toHaveAttribute("aria-pressed", "true");
    expect(loopButton).toHaveClass("is-active");
    expect(
      document.querySelector<HTMLAudioElement>(".sound-upload-card audio"),
    ).toHaveProperty("loop", true);
    expect(
      screen.getByRole("button", { name: "Start playback" }),
    ).toHaveTextContent("On Page Enter");
    expect(
      screen.queryByRole("region", { name: "Advanced Settings" }),
    ).not.toBeInTheDocument();
    expect(document.querySelector(".sound-advanced-divider")).toBeNull();
    expect(screen.getByRole("tab", { name: "DESIGN" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "SCENES" })).toBeInTheDocument();
  });

  it("shows Interaction Sounds for shapes and uploaded images", () => {
    const rectangle: CanvasElement = {
      cornerRadius: 0,
      fill: "#ffffff",
      height: 80,
      id: "sound-rectangle",
      locked: false,
      name: "Sound Rectangle",
      opacity: 100,
      rotation: 0,
      stroke: "#000000",
      strokeWidth: 0,
      type: "rectangle",
      visible: true,
      width: 100,
      x: 100,
      y: 100,
    };
    const circle: CanvasElement = {
      ...rectangle,
      id: "sound-circle",
      name: "Sound Circle",
      type: "circle",
      x: 240,
    };
    const text: CanvasElement = {
      ...rectangle,
      fontFamily: "Inter",
      fontSize: 24,
      fontWeight: "400",
      id: "sound-text",
      name: "Sound Text",
      text: "Text",
      type: "text",
      x: 380,
    };
    const image: CanvasElement = {
      ...rectangle,
      id: "sound-image",
      name: "Sound Image",
      src: "/figma/shape-picker.svg",
      stroke: "transparent",
      type: "image",
      x: 520,
    };
    useEditorStore.setState({
      pages: [
        {
          elements: [rectangle, circle, text, image],
          id: "page-1",
          name: "Intro",
        },
      ],
      selectedElementIds: [rectangle.id],
    });

    render(<EditorShell />);
    fireEvent.click(screen.getByRole("tab", { name: "SOUND" }));

    expect(
      screen.getByRole("region", { name: "Interaction Sounds" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Add$/ }),
    ).not.toBeInTheDocument();

    act(() =>
      useEditorStore.setState({
        selectedElementIds: [rectangle.id, circle.id],
      }),
    );
    expect(screen.getByRole("button", { name: /^Add$/ })).toBeInTheDocument();

    act(() => useEditorStore.setState({ selectedElementIds: [text.id] }));
    expect(
      screen.queryByRole("region", { name: "Interaction Sounds" }),
    ).not.toBeInTheDocument();

    act(() => useEditorStore.setState({ selectedElementIds: [image.id] }));
    expect(
      screen.getByRole("region", { name: "Interaction Sounds" }),
    ).toBeInTheDocument();

    act(() =>
      useEditorStore.setState({ selectedElementIds: [rectangle.id, image.id] }),
    );
    expect(
      screen.getByRole("region", { name: "Interaction Sounds" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Add$/ })).toBeInTheDocument();

    act(() =>
      useEditorStore.setState({
        selectedElementIds: [rectangle.id, text.id],
      }),
    );
    expect(
      screen.queryByRole("region", { name: "Interaction Sounds" }),
    ).not.toBeInTheDocument();
  });

  it("keeps global Advanced Settings ready without showing them for Selected Object", () => {
    render(<EditorShell />);
    fireEvent.click(screen.getByRole("tab", { name: "SOUND" }));

    expect(
      screen.queryByRole("region", { name: "Advanced Settings" }),
    ).not.toBeInTheDocument();

    act(() =>
      useEditorStore.getState().updateAdvancedSound({
        autoNormalize: false,
        outputQuality: "medium",
        preloadSounds: "on-demand",
        spatialSound: false,
        unloadUnusedSounds: false,
      }),
    );

    expect(useEditorStore.getState().pages[0].advancedSound).toEqual({
      autoNormalize: false,
      outputQuality: "medium",
      preloadSounds: "on-demand",
      spatialSound: false,
      unloadUnusedSounds: false,
    });

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    const preview = screen.getByRole("dialog", { name: "Viewer preview" });
    expect(preview).toHaveAttribute("data-output-quality", "medium");
    expect(preview).toHaveAttribute("data-output-kbps", "192");
    expect(
      preview.querySelector<HTMLAudioElement>(".viewer-interaction-sound"),
    ).toHaveAttribute("preload", "none");
  });

  it("lists, searches, filters, and navigates All Sounds without showing an empty BGM section", () => {
    const shape = testSoundShape("sound-shape-layer", 100, [
      testInteractionSound({
        assets: [testSoundAsset("soft-chime")],
        id: "shape-hover-sound",
      }),
    ]);
    shape.name = "Hero Rectangle";
    const image: CanvasElement = {
      ...testSoundShape("sound-image-layer", 260, [
        testInteractionSound({
          assets: [testSoundAsset("poster-click")],
          event: "click",
          id: "image-click-sound",
          trigger: "click",
        }),
      ]),
      name: "Poster Image",
      src: "/figma/shape-picker.svg",
      type: "image",
    };
    useEditorStore.setState({
      pages: [{ elements: [shape, image], id: "page-1", name: "Intro" }],
    });

    render(<EditorShell />);
    fireEvent.click(screen.getByRole("tab", { name: "SOUND" }));
    fireEvent.click(screen.getByRole("button", { name: "All Sounds" }));

    expect(
      screen.queryByRole("region", { name: "All Sounds background music" }),
    ).not.toBeInTheDocument();
    const interactionSounds = screen.getByRole("region", {
      name: "All Sounds interaction sounds",
    });
    expect(within(interactionSounds).getByText("Hero Rectangle")).toBeVisible();
    expect(within(interactionSounds).getByText("Poster Image")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Search objects or sounds"), {
      target: { value: "poster-click" },
    });
    expect(
      within(interactionSounds).queryByText("Hero Rectangle"),
    ).not.toBeInTheDocument();
    expect(within(interactionSounds).getByText("Poster Image")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Search objects or sounds"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByLabelText("Filter sounds by trigger"));
    fireEvent.click(screen.getByRole("option", { name: "Hover" }));
    expect(within(interactionSounds).getByText("Hero Rectangle")).toBeVisible();
    expect(
      within(interactionSounds).queryByText("Poster Image"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Filter sounds by trigger"));
    fireEvent.click(screen.getByRole("option", { name: "All Triggers" }));
    fireEvent.click(screen.getByLabelText("Filter sounds by object type"));
    fireEvent.click(screen.getByRole("option", { name: "Images" }));
    expect(within(interactionSounds).getByText("Poster Image")).toBeVisible();
    expect(
      within(interactionSounds).queryByText("Hero Rectangle"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "More options for poster-click.wav",
      }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Go to Layer" }));
    expect(useEditorStore.getState().selectedElementIds).toEqual([image.id]);
    expect(
      screen.getByRole("button", { name: "Selected Object" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("region", { name: "Interaction Sounds" }),
    ).toBeInTheDocument();
  });

  it("deletes BGM and an individual interaction asset from All Sounds", () => {
    const shape = testSoundShape("delete-sound-layer", 100, [
      testInteractionSound({
        assets: [testSoundAsset("keep-me"), testSoundAsset("delete-me")],
        id: "delete-sound-setting",
        soundSource: "multiple",
      }),
    ]);
    useEditorStore.setState({
      pages: [
        {
          backgroundMusic: {
            asset: testSoundAsset("all-sounds-bgm"),
            delaySeconds: 0,
            fadeInSeconds: 0,
            fadeOutSeconds: 0,
            loop: true,
            startPlayback: "on-page-enter",
            volume: 100,
          },
          elements: [shape],
          id: "page-1",
          name: "Intro",
        },
      ],
    });

    render(<EditorShell />);
    fireEvent.click(screen.getByRole("tab", { name: "SOUND" }));
    fireEvent.click(screen.getByRole("button", { name: "All Sounds" }));

    const backgroundSection = screen.getByRole("region", {
      name: "All Sounds background music",
    });
    fireEvent.click(
      within(backgroundSection).getByRole("button", {
        name: "All Sounds background music options",
      }),
    );
    const backgroundMenu = within(backgroundSection).getByRole("menu", {
      name: "All Sounds background music options menu",
    });
    expect(within(backgroundMenu).getAllByRole("menuitem")).toHaveLength(1);
    fireEvent.click(
      within(backgroundMenu).getByRole("menuitem", {
        name: "Delete Sound",
      }),
    );
    expect(
      useEditorStore.getState().pages[0].backgroundMusic?.asset,
    ).toBeNull();
    expect(
      screen.queryByRole("region", { name: "All Sounds background music" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "More options for delete-me.wav" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete Sound" }));
    expect(
      useEditorStore.getState().pages[0].elements[0].interactionSounds?.[0]
        .assets,
    ).toEqual([testSoundAsset("keep-me")]);
  });

  it("applies All Sounds bulk actions only to checked sound rows", () => {
    const first = testSoundShape("bulk-first", 100, [
      testInteractionSound({
        assets: [testSoundAsset("bulk-first")],
        id: "bulk-first-setting",
        volume: 90,
      }),
    ]);
    const second = testSoundShape("bulk-second", 260, [
      testInteractionSound({
        assets: [testSoundAsset("bulk-second")],
        id: "bulk-second-setting",
        volume: 70,
      }),
    ]);
    useEditorStore.setState({
      pages: [{ elements: [first, second], id: "page-1", name: "Intro" }],
    });

    render(<EditorShell />);
    fireEvent.click(screen.getByRole("tab", { name: "SOUND" }));
    fireEvent.click(screen.getByRole("button", { name: "All Sounds" }));

    expect(document.querySelectorAll(".layer-sound-indicator")).toHaveLength(2);
    fireEvent.click(screen.getByLabelText("Select bulk-first sounds"));
    fireEvent.click(
      screen.getByRole("button", { name: "Edit selected sounds" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Change Volume" }));
    expect(
      screen.getByRole("group", { name: "Selected sounds volume control" }),
    ).toBeVisible();
    fireEvent.pointerDown(document.body);
    expect(
      screen.queryByRole("group", { name: "Selected sounds volume control" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Edit selected sounds" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Change Volume" }));
    expect(screen.getByLabelText("Selected sounds volume")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Selected sounds volume value"), {
      target: { value: "42" },
    });
    expect(
      useEditorStore.getState().pages[0].elements[0].interactionSounds?.[0]
        .volume,
    ).toBe(42);
    expect(
      useEditorStore.getState().pages[0].elements[1].interactionSounds?.[0]
        .volume,
    ).toBe(70);

    fireEvent.click(
      screen.getByRole("button", { name: "Edit selected sounds" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Edit selected sounds" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Disable" }));
    expect(
      useEditorStore.getState().pages[0].elements[0].interactionSounds?.[0]
        .enabled,
    ).toBe(false);
    expect(
      screen.getByRole("button", { name: "Play bulk-first.wav" }),
    ).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", { name: "Edit selected sounds" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(
      useEditorStore.getState().pages[0].elements[0].interactionSounds?.[0]
        .assets,
    ).toEqual([]);
    expect(
      useEditorStore.getState().pages[0].elements[1].interactionSounds?.[0]
        .assets,
    ).toEqual([testSoundAsset("bulk-second")]);
  });

  it("stores All Sounds mixer and Advanced Settings as page-wide sound controls", () => {
    render(<EditorShell />);
    fireEvent.click(screen.getByRole("tab", { name: "SOUND" }));
    fireEvent.click(screen.getByRole("button", { name: "All Sounds" }));

    expect(screen.getByRole("region", { name: "Master Volume" })).toBeVisible();
    expect(
      screen.getByRole("region", { name: "Advanced Settings" }),
    ).toBeVisible();

    fireEvent.change(screen.getByLabelText("Master sound volume"), {
      target: { value: "70" },
    });
    fireEvent.change(
      screen.getByLabelText("All Sounds background music volume value"),
      { target: { value: "55" } },
    );
    fireEvent.change(
      screen.getByLabelText("All Sounds interaction sound volume value"),
      { target: { value: "35" } },
    );
    expect(useEditorStore.getState().pages[0].soundMixer).toEqual({
      backgroundMusicVolume: 55,
      interactionSoundVolume: 35,
      masterVolume: 70,
    });

    fireEvent.click(screen.getByLabelText("Output quality"));
    fireEvent.click(screen.getByRole("option", { name: "Medium (192 kbps)" }));
    fireEvent.click(screen.getByRole("button", { name: "Spatial Sound" }));
    fireEvent.click(screen.getByRole("button", { name: "Auto Normalize" }));
    fireEvent.click(screen.getByLabelText("Preload sounds"));
    fireEvent.click(screen.getByRole("option", { name: "On Demand" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Unload Unused Sounds" }),
    );
    expect(useEditorStore.getState().pages[0].advancedSound).toEqual({
      autoNormalize: false,
      outputQuality: "medium",
      preloadSounds: "on-demand",
      spatialSound: false,
      unloadUnusedSounds: false,
    });
  });

  it("disables empty interaction audio and opens its Event Settings", () => {
    const rectangle: CanvasElement = {
      cornerRadius: 0,
      fill: "#ffffff",
      height: 80,
      id: "interaction-sound-rectangle",
      locked: false,
      name: "Interaction Sound Rectangle",
      opacity: 100,
      rotation: 0,
      stroke: "#000000",
      strokeWidth: 0,
      type: "rectangle",
      visible: true,
      width: 100,
      x: 100,
      y: 100,
    };
    useEditorStore.setState({
      pages: [{ elements: [rectangle], id: "page-1", name: "Intro" }],
      selectedElementIds: [rectangle.id],
    });

    render(<EditorShell />);
    fireEvent.click(screen.getByRole("tab", { name: "SOUND" }));

    const hoverRow = screen.getByRole("group", {
      name: "Hover interaction sound",
    });
    expect(hoverRow).toHaveClass("is-empty");
    expect(
      screen.queryByRole("group", { name: "Click interaction sound" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("Hover sound file name: empty"),
    ).toBeEmptyDOMElement();
    expect(
      screen.getByRole("button", { name: "Preview Hover sound" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Hover sound volume")).toBeDisabled();
    expect(within(hoverRow).getByText("100 %")).toHaveClass(
      "sound-interaction-volume",
    );

    fireEvent.click(
      screen.getByRole("button", { name: "More Hover sound options" }),
    );
    expect(
      screen.getByRole("menu", { name: "Hover sound options menu" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Delete Sound" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("menuitem", { name: "Event Settings" }));

    expect(hoverRow).toHaveClass("is-expanded");
    const details = screen.getByRole("group", {
      name: "Hover sound details",
    });
    expect(within(details).getByText("Event Settings")).toBeInTheDocument();
    expect(within(details).getByText("Trigger")).toBeInTheDocument();
    expect(within(details).getByText("Event")).toBeInTheDocument();
    expect(within(details).getByText("Sound Source")).toBeInTheDocument();
    expect(
      within(details).getByRole("radio", { name: "Single Sound" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(within(details).getByText("Sound File")).toBeInTheDocument();
    expect(
      within(details).getByRole("button", { name: "Add Sound" }),
    ).toBeInTheDocument();
    expect(within(details).queryByText("Change Sound")).not.toBeInTheDocument();
    expect(within(details).getByText("00:00/0.0MB")).toBeInTheDocument();
    expect(
      within(details).queryByRole("button", {
        name: "Remove Hover sound file 1",
      }),
    ).not.toBeInTheDocument();
    expect(within(details).getByText("Fade In")).toBeInTheDocument();
    expect(within(details).getByText("Fade Out")).toBeInTheDocument();

    fireEvent.click(
      within(details).getByRole("radio", { name: "Multiple Sounds" }),
    );
    expect(details).toHaveClass("is-multiple");
    expect(details.querySelectorAll(".sound-event-file-control")).toHaveLength(
      1,
    );
    expect(
      within(details).getByRole("button", { name: "Add Sound" }),
    ).toBeInTheDocument();
    expect(within(details).getByText("Playback Mode")).toBeInTheDocument();
    expect(
      within(details).getByText("Avoid repeating the same sound"),
    ).toBeInTheDocument();

    fireEvent.click(
      within(details).getByRole("button", {
        name: "Hover sound playback mode",
      }),
    );
    const playbackMenu = screen.getByRole("listbox", {
      name: "Hover sound playback mode menu",
    });
    expect(
      within(playbackMenu)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Shuffle", "Sequential"]);
    expect(within(playbackMenu).queryByText("Random")).not.toBeInTheDocument();
  });

  it("dims and disables a collapsed selected-object sound marked disabled", () => {
    const rectangle = testSoundShape("disabled-selected-sound", 100, [
      testInteractionSound({
        assets: [testSoundAsset("disabled-selected-sound")],
        enabled: false,
      }),
    ]);
    useEditorStore.setState({
      pages: [{ elements: [rectangle], id: "page-1", name: "Intro" }],
      selectedElementIds: [rectangle.id],
    });

    render(<EditorShell />);
    fireEvent.click(screen.getByRole("tab", { name: "SOUND" }));

    const hoverRow = screen.getByRole("group", {
      name: "Hover interaction sound",
    });
    expect(hoverRow).toHaveAttribute("data-disabled", "true");
    expect(hoverRow).not.toHaveClass("is-expanded");
    expect(
      within(hoverRow).getByRole("button", { name: "Preview Hover sound" }),
    ).toBeDisabled();
    expect(
      within(hoverRow).getByLabelText("Hover sound volume"),
    ).toBeDisabled();
  });

  it("appends a shared upload to every selected Multiple Sounds object", () => {
    const first = testSoundShape("shared-multiple-first", 100, [
      testInteractionSound({
        assets: [testSoundAsset("first-existing")],
        id: "first-shared-setting",
        soundSource: "multiple",
      }),
    ]);
    const second = testSoundShape("shared-multiple-second", 260, [
      testInteractionSound({
        assets: [testSoundAsset("second-existing")],
        id: "second-shared-setting",
        soundSource: "multiple",
      }),
    ]);
    useEditorStore.setState({
      pages: [{ elements: [first, second], id: "page-1", name: "Intro" }],
      selectedElementIds: [first.id, second.id],
    });

    render(<EditorShell />);
    fireEvent.click(screen.getByRole("tab", { name: "SOUND" }));
    fireEvent.click(screen.getByRole("button", { name: /^Add$/ }));
    fireEvent.change(screen.getByLabelText("Choose interaction sound file"), {
      target: {
        files: [
          new File([new Uint8Array([1, 2, 3])], "shared-added.wav", {
            type: "audio/wav",
          }),
        ],
      },
    });

    const [storedFirst, storedSecond] =
      useEditorStore.getState().pages[0].elements;
    expect(
      storedFirst.interactionSounds?.[0].assets.map((asset) => asset.name),
    ).toEqual(["first-existing.wav", "shared-added.wav"]);
    expect(
      storedSecond.interactionSounds?.[0].assets.map((asset) => asset.name),
    ).toEqual(["second-existing.wav", "shared-added.wav"]);
  });

  it("applies a common upload according to each selected object's sound source", () => {
    const single = testSoundShape("mixed-common-single", 100, [
      testInteractionSound({
        assets: [testSoundAsset("single-existing")],
        id: "mixed-single-setting",
        soundSource: "single",
      }),
    ]);
    const multiple = testSoundShape("mixed-common-multiple", 260, [
      testInteractionSound({
        assets: [testSoundAsset("multiple-existing")],
        id: "mixed-multiple-setting",
        soundSource: "multiple",
      }),
    ]);
    useEditorStore.setState({
      pages: [{ elements: [single, multiple], id: "page-1", name: "Intro" }],
      selectedElementIds: [single.id, multiple.id],
    });

    render(<EditorShell />);
    fireEvent.click(screen.getByRole("tab", { name: "SOUND" }));
    fireEvent.click(screen.getByRole("button", { name: /^Add$/ }));
    fireEvent.change(screen.getByLabelText("Choose interaction sound file"), {
      target: {
        files: [
          new File([new Uint8Array([4, 5, 6])], "common-sound.wav", {
            type: "audio/wav",
          }),
        ],
      },
    });

    const [storedSingle, storedMultiple] =
      useEditorStore.getState().pages[0].elements;
    expect(storedSingle.interactionSounds?.[0]).toMatchObject({
      soundSource: "single",
    });
    expect(
      storedSingle.interactionSounds?.[0].assets.map((asset) => asset.name),
    ).toEqual(["common-sound.wav"]);
    expect(storedMultiple.interactionSounds?.[0]).toMatchObject({
      soundSource: "multiple",
    });
    expect(
      storedMultiple.interactionSounds?.[0].assets.map((asset) => asset.name),
    ).toEqual(["multiple-existing.wav", "common-sound.wav"]);
  });

  it("deletes every interaction sound asset from the selected object", () => {
    const shape = testSoundShape("delete-all-object-sounds", 100, [
      testInteractionSound({
        assets: [testSoundAsset("hover-sound")],
        id: "delete-hover-setting",
      }),
      testInteractionSound({
        assets: [testSoundAsset("click-sound")],
        event: "click",
        id: "delete-click-setting",
        trigger: "click",
      }),
    ]);
    useEditorStore.setState({
      pages: [{ elements: [shape], id: "page-1", name: "Intro" }],
      selectedElementIds: [shape.id],
    });

    render(<EditorShell />);
    fireEvent.click(screen.getByRole("tab", { name: "SOUND" }));
    fireEvent.click(
      screen.getByRole("button", { name: "More Hover sound options" }),
    );
    const deleteSound = screen.getByRole("menuitem", {
      name: "Delete Sound",
    });
    expect(deleteSound).toBeEnabled();
    fireEvent.click(deleteSound);

    const storedSounds =
      useEditorStore.getState().pages[0].elements[0].interactionSounds;
    expect(storedSounds).toHaveLength(2);
    expect(storedSounds?.every((sound) => sound.assets.length === 0)).toBe(
      true,
    );
    expect(
      screen.getByRole("group", { name: "Hover interaction sound" }),
    ).toHaveClass("is-empty");
  });

  it("restores each shape's expanded Event Settings and sound choices", () => {
    const first = testSoundShape("persistent-sound-first", 100);
    const second = testSoundShape("persistent-sound-second", 260);
    useEditorStore.setState({
      pages: [{ elements: [first, second], id: "page-1", name: "Intro" }],
      selectedElementIds: [first.id],
    });

    render(<EditorShell />);
    fireEvent.click(screen.getByRole("tab", { name: "SOUND" }));
    fireEvent.click(
      screen.getByRole("button", { name: "More Hover sound options" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Event Settings" }));

    let details = screen.getByRole("group", { name: "Hover sound details" });
    fireEvent.click(
      within(details).getByRole("radio", { name: "Multiple Sounds" }),
    );
    fireEvent.click(
      within(details).getByRole("button", {
        name: "Hover sound playback mode",
      }),
    );
    fireEvent.click(screen.getByRole("option", { name: "Sequential" }));
    fireEvent.click(
      within(details).getByRole("checkbox", {
        name: "Avoid repeating the same sound",
      }),
    );

    act(() => useEditorStore.setState({ selectedElementIds: [second.id] }));
    expect(
      screen.queryByRole("group", { name: "Hover sound details" }),
    ).not.toBeInTheDocument();

    act(() => useEditorStore.setState({ selectedElementIds: [first.id] }));
    details = screen.getByRole("group", { name: "Hover sound details" });
    expect(
      within(details).getByRole("radio", { name: "Multiple Sounds" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      within(details).getByRole("button", {
        name: "Hover sound playback mode",
      }),
    ).toHaveTextContent("Sequential");
    expect(
      within(details).getByRole("checkbox", {
        name: "Avoid repeating the same sound",
      }),
    ).not.toBeChecked();

    const stored = useEditorStore
      .getState()
      .pages[0].elements.find((element) => element.id === first.id);
    expect(stored?.interactionSoundExpanded).toBe(true);
    expect(stored?.interactionSounds?.[0]).toMatchObject({
      avoidRepeating: false,
      playbackMode: "sequential",
      soundSource: "multiple",
    });
  });

  it("shows the exact Event choices for each interaction sound Trigger", () => {
    const rectangle = testSoundShape("trigger-event-rectangle", 100);
    useEditorStore.setState({
      pages: [{ elements: [rectangle], id: "page-1", name: "Intro" }],
      selectedElementIds: [rectangle.id],
    });

    render(<EditorShell />);
    fireEvent.click(screen.getByRole("tab", { name: "SOUND" }));
    fireEvent.click(
      screen.getByRole("button", { name: "More Hover sound options" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Event Settings" }));

    const expected = [
      {
        events: ["Enter", "While Hovering", "Leave"],
        label: "Hover",
        value: "hover",
      },
      {
        events: ["Click", "Double Click"],
        label: "Click",
        value: "click",
      },
      {
        events: ["Press Start", "While Pressing", "Release"],
        label: "Press",
        value: "press",
      },
      {
        events: ["Drag Start", "While Dragging", "Drop"],
        label: "Drag",
        value: "drag",
      },
      {
        events: ["While Scrolling", "Reach Point"],
        label: "Scroll",
        value: "scroll",
      },
    ] as const;
    let currentLabel = "Hover";

    fireEvent.click(
      screen.getByRole("button", { name: "Hover sound trigger" }),
    );
    const triggerMenu = screen.getByRole("listbox", {
      name: "Hover sound trigger menu",
    });
    expect(
      within(triggerMenu)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(expected.map(({ label }) => label));
    fireEvent.click(within(triggerMenu).getByRole("option", { name: "Hover" }));

    expected.forEach(({ events, label, value }) => {
      if (label !== currentLabel) {
        fireEvent.click(
          screen.getByRole("button", {
            name: `${currentLabel} sound trigger`,
          }),
        );
        fireEvent.click(
          within(
            screen.getByRole("listbox", {
              name: `${currentLabel} sound trigger menu`,
            }),
          ).getByRole("option", { name: label }),
        );
        currentLabel = label;
      }

      const details = screen.getByRole("group", {
        name: `${label} sound details`,
      });
      const eventButton = within(details).getByRole("button", {
        name: `${label} sound event`,
      });
      expect(eventButton).toHaveTextContent(events[0]);
      fireEvent.click(eventButton);
      const eventMenu = screen.getByRole("listbox", {
        name: `${label} sound event menu`,
      });
      expect(
        within(eventMenu)
          .getAllByRole("option")
          .map((option) => option.textContent),
      ).toEqual([...events]);
      fireEvent.click(
        within(eventMenu).getByRole("option", { name: events[0] }),
      );

      const stored =
        useEditorStore.getState().pages[0].elements[0].interactionSounds?.[0];
      expect(stored?.trigger).toBe(value);
      expect(stored?.event).toBe(
        value === "hover"
          ? "enter"
          : value === "click"
            ? "click"
            : value === "press"
              ? "press-start"
              : value === "drag"
                ? "drag-start"
                : "while-scrolling",
      );
    });
  });

  it("uploads one or multiple interaction sounds and uses the supplied steppers", () => {
    const rectangle = testSoundShape("upload-sound-rectangle", 100);
    vi.mocked(URL.createObjectURL).mockImplementation(
      (blob) => `blob:${blob instanceof File ? blob.name : "audio"}`,
    );
    useEditorStore.setState({
      pages: [{ elements: [rectangle], id: "page-1", name: "Intro" }],
      selectedElementIds: [rectangle.id],
    });

    render(<EditorShell />);
    fireEvent.click(screen.getByRole("tab", { name: "SOUND" }));
    fireEvent.click(
      screen.getByRole("button", { name: "More Hover sound options" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Event Settings" }));

    let details = screen.getByRole("group", { name: "Hover sound details" });
    const increaseFade = within(details).getByRole("button", {
      name: "Increase Hover sound fade in duration",
    });
    const decreaseFade = within(details).getByRole("button", {
      name: "Decrease Hover sound fade in duration",
    });
    expect(increaseFade.querySelector("img")?.getAttribute("src")).toContain(
      "/figma/sound/stepper-up.svg",
    );
    expect(decreaseFade.querySelector("img")?.getAttribute("src")).toContain(
      "/figma/sound/stepper-down.svg",
    );
    fireEvent.click(increaseFade);
    expect(
      within(details).getByLabelText("Hover sound fade in duration"),
    ).toHaveValue(0.1);

    fireEvent.click(within(details).getByRole("button", { name: "Add Sound" }));
    fireEvent.change(screen.getByLabelText("Choose interaction sound file"), {
      target: {
        files: [new File(["first"], "first.wav", { type: "audio/wav" })],
      },
    });
    details = screen.getByRole("group", { name: "Hover sound details" });
    expect(
      within(details).getByRole("button", { name: "Change Sound" }),
    ).toBeInTheDocument();
    expect(
      within(details).getByRole("button", {
        name: "Remove Hover sound file 1",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Preview Hover sound" }),
    ).toBeEnabled();
    expect(screen.getByLabelText("Hover sound volume")).toBeEnabled();

    fireEvent.click(
      within(details).getByRole("radio", { name: "Multiple Sounds" }),
    );
    details = screen.getByRole("group", { name: "Hover sound details" });
    expect(details.querySelectorAll(".sound-event-file-control")).toHaveLength(
      1,
    );
    fireEvent.click(within(details).getByRole("button", { name: "Add Sound" }));
    fireEvent.change(screen.getByLabelText("Choose interaction sound file"), {
      target: {
        files: [new File(["second"], "second.wav", { type: "audio/wav" })],
      },
    });
    details = screen.getByRole("group", { name: "Hover sound details" });
    expect(details.querySelectorAll(".sound-event-file-control")).toHaveLength(
      2,
    );
    expect(within(details).getByText("first.wav")).toBeInTheDocument();
    expect(within(details).getByText("second.wav")).toBeInTheDocument();
    expect(
      useEditorStore.getState().pages[0].elements[0].interactionSounds?.[0]
        .assets,
    ).toHaveLength(2);
  });

  it("collapses the background music section and edits its playback settings", () => {
    render(<EditorShell />);
    fireEvent.click(screen.getByRole("tab", { name: "SOUND" }));

    const collapseButton = screen.getByRole("button", {
      name: "Collapse background music",
    });
    const content = document.querySelector<HTMLElement>(".sound-bgm-content")!;
    expect(collapseButton).toHaveAttribute("aria-expanded", "true");
    expect(collapseButton).toHaveClass("is-expanded");
    expect(content).not.toHaveAttribute("hidden");

    fireEvent.click(collapseButton);
    expect(
      screen.getByRole("button", { name: "Expand background music" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(content).toHaveAttribute("hidden");
    fireEvent.click(
      screen.getByRole("button", { name: "Expand background music" }),
    );

    fireEvent.change(screen.getByLabelText("Background music volume"), {
      target: { value: "62" },
    });
    expect(screen.getByLabelText("Sound volume")).toHaveValue(62);
    fireEvent.change(screen.getByLabelText("Fade in duration"), {
      target: { value: "1.5" },
    });
    fireEvent.change(screen.getByLabelText("Fade out duration"), {
      target: { value: "2.25" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Loop" }));

    fireEvent.click(screen.getByRole("button", { name: "Start playback" }));
    expect(
      screen.getByRole("option", { name: "On Page Enter" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "After Delay" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "On Interaction" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Manual" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "After Delay" }));
    fireEvent.change(screen.getByLabelText("Playback delay"), {
      target: { value: "3.5" },
    });

    expect(screen.getByRole("button", { name: "Loop" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByLabelText("Playback delay")).toHaveValue(3.5);
    expect(useEditorStore.getState().pages[0].backgroundMusic).toMatchObject({
      delaySeconds: 3.5,
      fadeInSeconds: 1.5,
      fadeOutSeconds: 2.25,
      loop: false,
      startPlayback: "after-delay",
      volume: 62,
    });

    fireEvent.click(screen.getByRole("tab", { name: "DESIGN" }));
    fireEvent.click(screen.getByRole("tab", { name: "SOUND" }));
    expect(screen.getByLabelText("Sound volume")).toHaveValue(62);
    expect(
      screen.getByRole("button", { name: "Start playback" }),
    ).toHaveTextContent("After Delay");
  });

  it("uploads, changes, and deletes the background music file", () => {
    render(<EditorShell />);
    fireEvent.click(screen.getByRole("tab", { name: "SOUND" }));

    const input = screen.getByLabelText("Choose background music file");
    fireEvent.change(input, {
      target: {
        files: [
          new File([new Uint8Array([82, 73, 70, 70])], "ambient.wav", {
            type: "audio/wav",
          }),
        ],
      },
    });

    expect(screen.getByText("ambient.wav")).toBeInTheDocument();
    expect(screen.queryByText("No file")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Upload background music" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Play background music preview" }),
    ).toBeEnabled();
    expect(
      document.querySelector(".sound-file-thumbnail-icon"),
    ).toBeInTheDocument();
    expect(
      document.querySelector(".sound-file-thumbnail-artwork"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Background music file options" }),
    );
    expect(
      screen.getByRole("menuitem", { name: "Change File" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete File" }));

    expect(screen.getByText("No file")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Upload background music" }),
    ).toBeInTheDocument();
    expect(
      useEditorStore.getState().pages[0].backgroundMusic?.asset,
    ).toBeNull();
  });

  it("shows embedded cover art and falls back to the audio icon if it cannot render", async () => {
    vi.mocked(URL.createObjectURL)
      .mockReturnValueOnce("blob:covered-audio-test")
      .mockReturnValueOnce("blob:embedded-cover-test");
    render(<EditorShell />);
    fireEvent.click(screen.getByRole("tab", { name: "SOUND" }));

    fireEvent.change(screen.getByLabelText("Choose background music file"), {
      target: { files: [createMp3WithEmbeddedPng()] },
    });

    const artwork = await waitFor(() => {
      const image = document.querySelector<HTMLImageElement>(
        ".sound-file-thumbnail-artwork",
      );
      expect(image).toHaveAttribute("src", "blob:embedded-cover-test");
      return image!;
    });
    expect(
      document.querySelector(".sound-file-thumbnail-icon"),
    ).not.toBeInTheDocument();
    expect(
      useEditorStore.getState().pages[0].backgroundMusic?.asset?.artworkSrc,
    ).toBe("blob:embedded-cover-test");

    fireEvent.error(artwork);
    expect(
      document.querySelector(".sound-file-thumbnail-artwork"),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector(".sound-file-thumbnail-icon"),
    ).toBeInTheDocument();
  });

  it("keeps asynchronously discovered artwork in an undo snapshot", () => {
    const asset = {
      durationSeconds: 0,
      mimeType: "audio/mpeg",
      name: "history-cover.mp3",
      sizeBytes: 128,
      src: "blob:history-audio-test",
    };
    useEditorStore.setState((state) => ({
      pages: state.pages.map((page) => ({
        ...page,
        backgroundMusic: {
          asset,
          delaySeconds: 1,
          fadeInSeconds: 0,
          fadeOutSeconds: 0,
          loop: true,
          startPlayback: "on-page-enter" as const,
          volume: 100,
        },
      })),
    }));
    act(() => useEditorStore.getState().checkpoint());
    useEditorStore.setState((state) => ({
      pages: state.pages.map((page) => ({
        ...page,
        backgroundMusic: undefined,
      })),
    }));

    act(() =>
      useEditorStore
        .getState()
        .setBackgroundMusicArtwork(
          "page-1",
          asset.src,
          "blob:history-cover-test",
        ),
    );
    expect(
      useEditorStore.getState().past[0].pages[0].backgroundMusic?.asset
        ?.artworkSrc,
    ).toBe("blob:history-cover-test");

    act(() => useEditorStore.getState().undo());
    expect(
      useEditorStore.getState().pages[0].backgroundMusic?.asset?.artworkSrc,
    ).toBe("blob:history-cover-test");
  });

  it("starts viewer background music on page entry and after a delay", async () => {
    const play = vi.mocked(HTMLMediaElement.prototype.play);
    setTestBackgroundMusic("on-page-enter");
    const firstRender = render(<EditorShell />);

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
    firstRender.unmount();

    play.mockClear();
    setTestBackgroundMusic("after-delay", 0.01);
    render(<EditorShell />);
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
  });

  it("does not run a click interaction after dragging a preview element", () => {
    const shape = {
      ...testSoundShape("preview-drag-click", 100),
      interactions: [
        createDefaultInteraction({
          effect: "move",
          id: "preview-click-move",
          moveX: 260,
          trigger: "click-tap",
        }),
        createDefaultInteraction({
          effect: "move",
          id: "preview-drag-move",
          trigger: "drag",
        }),
        createDefaultInteraction({
          effect: "scale",
          id: "preview-hover-scale",
          scaleX: 130,
          scaleY: 130,
          trigger: "hover",
        }),
      ],
    };
    useEditorStore.setState({
      pages: [{ id: "page-1", name: "Intro", elements: [shape] }],
    });

    render(<EditorShell />);
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    const previewElement = screen
      .getByRole("dialog", { name: "Viewer preview" })
      .querySelector<HTMLElement>(`[data-element-id="${shape.id}"]`)!;
    expect(previewElement.classList.contains("is-draggable")).toBe(true);
    const beforeDrag = previewElement.style.transform;
    fireEvent.pointerEnter(previewElement);
    expect(previewElement.style.transform).not.toBe(beforeDrag);
    fireEvent.pointerLeave(previewElement);
    expect(previewElement.style.transform).toBe(beforeDrag);

    fireEvent.pointerDown(previewElement, {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerMove(previewElement, {
      clientX: 150,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerUp(previewElement, {
      clientX: 150,
      clientY: 100,
      pointerId: 1,
    });
    const afterDrag = previewElement.style.transform;
    expect(afterDrag).not.toBe(beforeDrag);
    fireEvent.click(previewElement);
    expect(previewElement.style.transform).toBe(afterDrag);

    fireEvent.pointerDown(previewElement, {
      clientX: 150,
      clientY: 100,
      pointerId: 2,
    });
    fireEvent.pointerUp(previewElement, {
      clientX: 150,
      clientY: 100,
      pointerId: 2,
    });
    fireEvent.click(previewElement);
    expect(previewElement.style.transform).not.toBe(afterDrag);
  });

  it("keeps On Page Enter music sourced during development effect replay", async () => {
    const playedSources: (string | null)[] = [];
    vi.mocked(HTMLMediaElement.prototype.play).mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      playedSources.push(this.getAttribute("src"));
      return Promise.resolve();
    });
    setTestBackgroundMusic("on-page-enter");

    render(
      <StrictMode>
        <EditorShell />
      </StrictMode>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    const backgroundMusic = await waitFor(() => {
      const audio = document.querySelector<HTMLAudioElement>(
        ".viewer-background-music",
      );
      expect(audio).not.toBeNull();
      return audio!;
    });
    expect(backgroundMusic).toHaveAttribute(
      "src",
      "blob:viewer-background-music-test",
    );
    expect(playedSources.length).toBeGreaterThan(0);
    expect(playedSources).not.toContain(null);
    expect(playedSources).not.toContain("");
  });

  it("waits for viewer interaction and leaves manual playback idle", async () => {
    const play = vi.mocked(HTMLMediaElement.prototype.play);
    setTestBackgroundMusic("manual");
    const manualRender = render(<EditorShell />);

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(
      screen.getByRole("dialog", { name: "Viewer preview" }),
    ).toBeVisible();
    expect(play).not.toHaveBeenCalled();
    manualRender.unmount();

    setTestBackgroundMusic("on-interaction");
    render(<EditorShell />);
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(play).not.toHaveBeenCalled();
    fireEvent.pointerDown(document.querySelector(".viewer-preview-viewport")!);
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
  });

  it("plays configured Preview triggers exclusively and preserves the current sound for an unconfigured shape", () => {
    const soundAsset = (name: string) => ({
      durationSeconds: 1,
      mimeType: "audio/wav",
      name: `${name}.wav`,
      sizeBytes: 128,
      src: `blob:${name}`,
    });
    const hoverShape = testSoundShape("preview-hover", 20, [
      testInteractionSound({
        assets: [soundAsset("hover")],
        event: "enter",
        id: "hover-setting",
        trigger: "hover",
      }),
    ]);
    const clickShape = testSoundShape("preview-click", 140, [
      testInteractionSound({
        assets: [soundAsset("click")],
        event: "click",
        id: "click-setting",
        trigger: "click",
      }),
    ]);
    const pressShape = testSoundShape("preview-press", 260, [
      testInteractionSound({
        assets: [soundAsset("press")],
        event: "press-start",
        id: "press-setting",
        trigger: "press",
      }),
    ]);
    const dragShape = testSoundShape("preview-drag", 380, [
      testInteractionSound({
        assets: [soundAsset("drag")],
        event: "drag-start",
        id: "drag-setting",
        trigger: "drag",
      }),
    ]);
    const scrollShape = testSoundShape("preview-scroll", 500, [
      testInteractionSound({
        assets: [soundAsset("scroll")],
        event: "while-scrolling",
        id: "scroll-setting",
        trigger: "scroll",
      }),
    ]);
    const emptyShape = testSoundShape("preview-empty", 620);
    useEditorStore.setState({
      pages: [
        {
          elements: [
            hoverShape,
            clickShape,
            pressShape,
            dragShape,
            scrollShape,
            emptyShape,
          ],
          id: "page-1",
          name: "Intro",
        },
      ],
    });

    render(<EditorShell />);
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    const preview = screen.getByRole("dialog", { name: "Viewer preview" });
    const interactionAudio = preview.querySelector<HTMLAudioElement>(
      ".viewer-interaction-sound",
    )!;
    const element = (id: string) =>
      preview.querySelector<HTMLElement>(`[data-element-id="${id}"]`)!;
    const play = vi.mocked(HTMLMediaElement.prototype.play);
    const pause = vi.mocked(HTMLMediaElement.prototype.pause);

    fireEvent.pointerEnter(element(hoverShape.id));
    expect(interactionAudio.src).toBe("blob:hover");
    expect(play).toHaveBeenCalledTimes(1);

    const pausesBeforeEmpty = pause.mock.calls.length;
    fireEvent.click(element(emptyShape.id));
    expect(interactionAudio.src).toBe("blob:hover");
    expect(pause).toHaveBeenCalledTimes(pausesBeforeEmpty);
    expect(play).toHaveBeenCalledTimes(1);

    fireEvent.pointerEnter(element(clickShape.id));
    expect(interactionAudio.src).toBe("blob:hover");
    fireEvent.click(element(clickShape.id));
    expect(interactionAudio.src).toBe("blob:click");
    expect(play).toHaveBeenCalledTimes(2);

    fireEvent.pointerDown(element(pressShape.id), {
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    });
    expect(interactionAudio.src).toBe("blob:press");
    expect(play).toHaveBeenCalledTimes(3);

    fireEvent.pointerDown(element(dragShape.id), {
      clientX: 0,
      clientY: 0,
      pointerId: 2,
    });
    fireEvent.pointerMove(element(dragShape.id), {
      clientX: 5,
      clientY: 0,
      pointerId: 2,
    });
    expect(interactionAudio.src).toBe("blob:drag");
    expect(play).toHaveBeenCalledTimes(4);

    fireEvent.wheel(element(scrollShape.id));
    expect(interactionAudio.src).toBe("blob:scroll");
    expect(interactionAudio.loop).toBe(true);
    expect(play).toHaveBeenCalledTimes(5);
  });

  it("ducks background music while an interaction sound is playing", async () => {
    setTestBackgroundMusic("on-page-enter");
    const clickShape = testSoundShape("ducking-click", 140, [
      testInteractionSound({
        assets: [testSoundAsset("ducking")],
        event: "click",
        id: "ducking-setting",
        trigger: "click",
      }),
    ]);
    useEditorStore.setState((state) => ({
      pages: state.pages.map((page) => ({
        ...page,
        elements: [clickShape],
      })),
    }));

    render(<EditorShell />);
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    const preview = screen.getByRole("dialog", { name: "Viewer preview" });
    const backgroundMusic = preview.querySelector<HTMLAudioElement>(
      ".viewer-background-music",
    )!;
    const interactionAudio = preview.querySelector<HTMLAudioElement>(
      ".viewer-interaction-sound",
    )!;
    const previewElement = preview.querySelector<HTMLElement>(
      `[data-element-id="${clickShape.id}"]`,
    )!;

    expect(backgroundMusic).toHaveAttribute("data-ducked", "false");
    fireEvent.click(previewElement);
    expect(backgroundMusic).toHaveAttribute("data-ducked", "true");
    await waitFor(() => expect(backgroundMusic.volume).toBeCloseTo(0.25, 1));

    fireEvent.ended(interactionAudio);
    expect(backgroundMusic).toHaveAttribute("data-ducked", "false");
    await waitFor(() => expect(backgroundMusic.volume).toBeGreaterThan(0.95));
  });

  it("applies the All Sounds master and channel volumes to viewer playback", () => {
    setTestBackgroundMusic("on-page-enter");
    const clickShape = testSoundShape("mixer-click", 140, [
      testInteractionSound({
        assets: [testSoundAsset("mixer-interaction")],
        event: "click",
        id: "mixer-click-setting",
        trigger: "click",
        volume: 80,
      }),
    ]);
    useEditorStore.setState((state) => ({
      pages: state.pages.map((page) => ({
        ...page,
        backgroundMusic: page.backgroundMusic
          ? { ...page.backgroundMusic, volume: 80 }
          : undefined,
        elements: [clickShape],
        soundMixer: {
          backgroundMusicVolume: 50,
          interactionSoundVolume: 50,
          masterVolume: 50,
        },
      })),
    }));

    render(<EditorShell />);
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    const preview = screen.getByRole("dialog", { name: "Viewer preview" });
    const backgroundMusic = preview.querySelector<HTMLAudioElement>(
      ".viewer-background-music",
    )!;
    const interactionAudio = preview.querySelector<HTMLAudioElement>(
      ".viewer-interaction-sound",
    )!;
    const previewElement = preview.querySelector<HTMLElement>(
      `[data-element-id="${clickShape.id}"]`,
    )!;

    expect(backgroundMusic.volume).toBeCloseTo(0.2, 5);
    fireEvent.click(previewElement);
    expect(interactionAudio.volume).toBeCloseTo(0.2, 5);
  });

  it("plays and fades one Multiple Sounds file at a time in sequence", async () => {
    vi.useFakeTimers();
    const pausedByMedia = new WeakMap<HTMLMediaElement, boolean>();
    vi.spyOn(HTMLMediaElement.prototype, "paused", "get").mockImplementation(
      function (this: HTMLMediaElement) {
        return pausedByMedia.get(this) ?? true;
      },
    );
    const play = vi
      .mocked(HTMLMediaElement.prototype.play)
      .mockImplementation(function (this: HTMLMediaElement) {
        pausedByMedia.set(this, false);
        return Promise.resolve();
      });
    const pause = vi
      .mocked(HTMLMediaElement.prototype.pause)
      .mockImplementation(function (this: HTMLMediaElement) {
        pausedByMedia.set(this, true);
      });
    const hoverShape = testSoundShape("preview-hover-multiple", 20, [
      testInteractionSound({
        assets: [testSoundAsset("first"), testSoundAsset("second")],
        event: "while-hovering",
        fadeInSeconds: 0.2,
        fadeOutSeconds: 0.2,
        id: "hover-multiple-setting",
        playbackMode: "sequential",
        soundSource: "multiple",
        trigger: "hover",
        volume: 60,
      }),
    ]);
    useEditorStore.setState({
      pages: [
        {
          elements: [hoverShape],
          id: "page-1",
          name: "Intro",
        },
      ],
    });

    render(<EditorShell />);
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    const preview = screen.getByRole("dialog", { name: "Viewer preview" });
    const previewElement = preview.querySelector<HTMLElement>(
      `[data-element-id="${hoverShape.id}"]`,
    )!;
    const interactionAudios = Array.from(
      preview.querySelectorAll<HTMLAudioElement>(".viewer-interaction-sound"),
    );
    expect(interactionAudios).toHaveLength(1);
    const interactionAudio = interactionAudios[0];

    fireEvent.pointerEnter(previewElement);
    await act(async () => Promise.resolve());
    expect(play).toHaveBeenCalledTimes(1);
    expect(interactionAudio.src).toBe("blob:first");
    expect(interactionAudio.loop).toBe(true);
    expect(interactionAudio.volume).toBe(0);

    act(() => vi.advanceTimersByTime(112));
    expect(interactionAudio.volume).toBeGreaterThan(0);
    expect(interactionAudio.volume).toBeLessThan(0.6);

    act(() => vi.advanceTimersByTime(150));
    expect(interactionAudio.volume).toBeCloseTo(0.6, 5);

    const pausesBeforeLeave = pause.mock.calls.length;
    fireEvent.pointerLeave(previewElement);
    expect(pause).toHaveBeenCalledTimes(pausesBeforeLeave);
    act(() => vi.advanceTimersByTime(112));
    expect(interactionAudio.volume).toBeGreaterThan(0);
    expect(interactionAudio.volume).toBeLessThan(0.6);

    act(() => vi.advanceTimersByTime(150));
    expect(pause).toHaveBeenCalledTimes(pausesBeforeLeave + 1);
    expect(interactionAudio.loop).toBe(false);
    expect(pausedByMedia.get(interactionAudio)).toBe(true);

    fireEvent.pointerEnter(previewElement);
    await act(async () => Promise.resolve());
    expect(play).toHaveBeenCalledTimes(2);
    expect(interactionAudio.src).toBe("blob:second");
  });

  it("replaces the active selected sound only for a configured trigger", async () => {
    const pausedByMedia = new WeakMap<HTMLMediaElement, boolean>();
    vi.spyOn(HTMLMediaElement.prototype, "paused", "get").mockImplementation(
      function (this: HTMLMediaElement) {
        return pausedByMedia.get(this) ?? true;
      },
    );
    const play = vi
      .mocked(HTMLMediaElement.prototype.play)
      .mockImplementation(function (this: HTMLMediaElement) {
        pausedByMedia.set(this, false);
        return Promise.resolve();
      });
    const pause = vi
      .mocked(HTMLMediaElement.prototype.pause)
      .mockImplementation(function (this: HTMLMediaElement) {
        pausedByMedia.set(this, true);
      });
    const hoverShape = testSoundShape("preview-group-hover", 20, [
      testInteractionSound({
        assets: [testSoundAsset("first"), testSoundAsset("second")],
        event: "while-hovering",
        id: "hover-group-setting",
        playbackMode: "sequential",
        soundSource: "multiple",
        trigger: "hover",
      }),
    ]);
    const emptyShape = testSoundShape("preview-group-empty", 160);
    const clickShape = testSoundShape("preview-group-click", 300, [
      testInteractionSound({
        assets: [testSoundAsset("third"), testSoundAsset("fourth")],
        event: "click",
        id: "click-group-setting",
        playbackMode: "sequential",
        soundSource: "multiple",
        trigger: "click",
      }),
    ]);
    useEditorStore.setState({
      pages: [
        {
          elements: [hoverShape, emptyShape, clickShape],
          id: "page-1",
          name: "Intro",
        },
      ],
    });

    render(<EditorShell />);
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    const preview = screen.getByRole("dialog", { name: "Viewer preview" });
    const element = (id: string) =>
      preview.querySelector<HTMLElement>(`[data-element-id="${id}"]`)!;
    const interactionAudios = Array.from(
      preview.querySelectorAll<HTMLAudioElement>(".viewer-interaction-sound"),
    );

    fireEvent.pointerEnter(element(hoverShape.id));
    await act(async () => Promise.resolve());
    expect(play).toHaveBeenCalledTimes(1);
    expect(interactionAudios).toHaveLength(1);
    expect(interactionAudios[0].src).toBe("blob:first");

    fireEvent.click(element(emptyShape.id));
    expect(play).toHaveBeenCalledTimes(1);
    expect(pause).not.toHaveBeenCalled();
    interactionAudios.forEach((audio) =>
      expect(pausedByMedia.get(audio)).toBe(false),
    );

    fireEvent.click(element(clickShape.id));
    await act(async () => Promise.resolve());
    expect(pause).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledTimes(2);
    expect(interactionAudios[0].src).toBe("blob:third");
    interactionAudios.forEach((audio) =>
      expect(pausedByMedia.get(audio)).toBe(false),
    );
  });

  it("fades a continuous interaction sound before stopping it", async () => {
    vi.useFakeTimers();
    let paused = true;
    vi.spyOn(HTMLMediaElement.prototype, "paused", "get").mockImplementation(
      () => paused,
    );
    const play = vi
      .mocked(HTMLMediaElement.prototype.play)
      .mockImplementation(() => {
        paused = false;
        return Promise.resolve();
      });
    const pause = vi
      .mocked(HTMLMediaElement.prototype.pause)
      .mockImplementation(() => {
        paused = true;
      });
    const hoverShape = testSoundShape("preview-hover-fade", 20, [
      testInteractionSound({
        assets: [
          {
            durationSeconds: 1,
            mimeType: "audio/wav",
            name: "hover-fade.wav",
            sizeBytes: 128,
            src: "blob:hover-fade",
          },
        ],
        event: "while-hovering",
        fadeInSeconds: 0,
        fadeOutSeconds: 0.2,
        id: "hover-fade-setting",
        trigger: "hover",
      }),
    ]);
    useEditorStore.setState({
      pages: [
        {
          elements: [hoverShape],
          id: "page-1",
          name: "Intro",
        },
      ],
    });

    render(<EditorShell />);
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    const preview = screen.getByRole("dialog", { name: "Viewer preview" });
    const previewElement = preview.querySelector<HTMLElement>(
      `[data-element-id="${hoverShape.id}"]`,
    )!;
    const interactionAudio = preview.querySelector<HTMLAudioElement>(
      ".viewer-interaction-sound",
    )!;

    fireEvent.pointerEnter(previewElement);
    await act(async () => Promise.resolve());
    expect(play).toHaveBeenCalledTimes(1);
    expect(interactionAudio.volume).toBe(1);
    expect(interactionAudio.loop).toBe(true);

    const pausesBeforeLeave = pause.mock.calls.length;
    fireEvent.pointerLeave(previewElement);
    expect(pause).toHaveBeenCalledTimes(pausesBeforeLeave);

    act(() => vi.advanceTimersByTime(100));
    expect(interactionAudio.volume).toBeGreaterThan(0);
    expect(interactionAudio.volume).toBeLessThan(1);
    expect(pause).toHaveBeenCalledTimes(pausesBeforeLeave);

    act(() => vi.advanceTimersByTime(150));
    expect(pause).toHaveBeenCalledTimes(pausesBeforeLeave + 1);
    expect(interactionAudio.loop).toBe(false);
  });

  it("keeps element dragging enabled while the SCENES panel is open", () => {
    const element: CanvasElement = {
      cornerRadius: 0,
      fill: "#ffffff",
      height: 80,
      id: "scene-drag-rectangle",
      locked: false,
      name: "Scene Drag Rectangle",
      opacity: 100,
      rotation: 0,
      stroke: "#000000",
      strokeWidth: 1,
      type: "rectangle",
      visible: true,
      width: 100,
      x: 120,
      y: 140,
    };
    useEditorStore.setState({
      pages: [{ elements: [element], id: "page-1", name: "Intro" }],
      selectedElementIds: [],
    });

    const { container } = render(<EditorShell />);
    fireEvent.click(screen.getByRole("tab", { name: "SCENES" }));

    const canvas = screen.getByLabelText("Exhibition canvas");
    const canvasElement = container.querySelector<HTMLElement>(
      '[data-element-id="scene-drag-rectangle"]',
    )!;
    let hasPointerCapture = false;
    Object.assign(canvas, {
      hasPointerCapture: () => hasPointerCapture,
      releasePointerCapture: () => {
        hasPointerCapture = false;
      },
      setPointerCapture: () => {
        hasPointerCapture = true;
      },
    });
    fireEvent.pointerDown(canvasElement, {
      clientX: 200,
      clientY: 220,
      pointerId: 23,
    });
    fireEvent(
      canvas,
      new PointerEvent("pointerrawupdate", {
        bubbles: true,
        clientX: 260,
        clientY: 277,
        pointerId: 23,
      }),
    );
    const rawPreviewTranslate = canvasElement.style.translate;
    const dimensions = screen.getByLabelText("Selection dimensions");
    const rawDimensionsTranslate = dimensions.style.translate;
    fireEvent.pointerMove(canvas, {
      clientX: 224,
      clientY: 237,
      pointerId: 23,
    });
    expect(rawPreviewTranslate).not.toBe("");
    expect(canvasElement.style.translate).toBe(rawPreviewTranslate);
    expect(rawDimensionsTranslate).toBe(rawPreviewTranslate);
    expect(dimensions.style.translate).toBe(rawDimensionsTranslate);
    expect(dimensions.style.transform).toBe("");
    expect(useEditorStore.getState().pages[0].elements[0]).toMatchObject({
      x: element.x,
      y: element.y,
    });
    fireEvent.pointerUp(canvas, {
      clientX: 224,
      clientY: 237,
      pointerId: 23,
    });

    expect(useEditorStore.getState().activeTool).toBe("selection");
    expect(useEditorStore.getState().pages[0].elements[0].x).not.toBe(
      element.x,
    );
    expect(useEditorStore.getState().pages[0].elements[0].y).not.toBe(
      element.y,
    );
  });

  it("previews corner resizing from raw pointer input and commits on release", () => {
    const element: CanvasElement = {
      cornerRadius: 0,
      fill: "#ffffff",
      height: 80,
      id: "raw-resize-rectangle",
      locked: false,
      name: "Raw Resize Rectangle",
      opacity: 100,
      rotation: 0,
      stroke: "#000000",
      strokeWidth: 1,
      type: "rectangle",
      visible: true,
      width: 100,
      x: 120,
      y: 140,
    };
    useEditorStore.setState({
      pages: [{ elements: [element], id: "page-1", name: "Intro" }],
      selectedElementIds: [element.id],
    });

    const { container } = render(<EditorShell />);
    const canvas = screen.getByLabelText("Exhibition canvas");
    const canvasElement = container.querySelector<HTMLElement>(
      '[data-element-id="raw-resize-rectangle"]',
    )!;
    Object.assign(canvas, {
      hasPointerCapture: () => false,
      releasePointerCapture: () => undefined,
      setPointerCapture: () => undefined,
    });

    fireEvent.pointerDown(screen.getByLabelText("Resize se"), {
      clientX: 220,
      clientY: 220,
      pointerId: 24,
    });
    fireEvent(
      canvas,
      new PointerEvent("pointerrawupdate", {
        bubbles: true,
        clientX: 260,
        clientY: 260,
        pointerId: 24,
      }),
    );
    const rawWidth = canvasElement.style.width;
    const rawHeight = canvasElement.style.height;

    expect(Number.parseFloat(rawWidth)).toBeGreaterThan(element.width);
    expect(Number.parseFloat(rawHeight)).toBeGreaterThan(element.height);
    expect(useEditorStore.getState().pages[0].elements[0]).toMatchObject({
      height: element.height,
      width: element.width,
    });

    fireEvent.pointerMove(canvas, {
      clientX: 230,
      clientY: 230,
      pointerId: 24,
    });
    expect(canvasElement.style.width).toBe(rawWidth);
    expect(canvasElement.style.height).toBe(rawHeight);

    fireEvent.pointerUp(canvas, {
      clientX: 260,
      clientY: 260,
      pointerId: 24,
    });
    expect(useEditorStore.getState().pages[0].elements[0].width).toBe(
      Number.parseFloat(rawWidth),
    );
    expect(useEditorStore.getState().pages[0].elements[0].height).toBe(
      Number.parseFloat(rawHeight),
    );
  });

  it("previews image pixels together with the image frame while resizing", () => {
    const element: CanvasElement = {
      cornerRadius: 0,
      fill: "#ffffff",
      height: 80,
      id: "raw-resize-image",
      locked: false,
      name: "Raw Resize Image",
      opacity: 100,
      rotation: 0,
      src: "/figma/shape-picker.svg",
      stroke: "transparent",
      strokeStyle: "none",
      strokeWidth: 0,
      type: "image",
      visible: true,
      width: 100,
      x: 120,
      y: 140,
    };
    useEditorStore.setState({
      pages: [{ elements: [element], id: "page-1", name: "Intro" }],
      selectedElementIds: [element.id],
    });

    const { container } = render(<EditorShell />);
    const canvas = screen.getByLabelText("Exhibition canvas");
    const canvasElement = container.querySelector<HTMLElement>(
      '[data-element-id="raw-resize-image"]',
    )!;
    const imageContent = canvasElement.querySelector<HTMLElement>(
      ".image-shape-content",
    )!;
    const imageSource = canvasElement.querySelector<HTMLElement>(
      ".image-shape-source",
    )!;
    const selectionOutline = canvasElement.querySelector<SVGSVGElement>(
      ".selection-outline-svg",
    )!;
    const selectionFrame = selectionOutline.querySelector<SVGRectElement>(
      "rect[data-selection-frame]",
    )!;
    const expectImageOutlineInsideFrame = () => {
      const viewBox = selectionOutline.viewBox.baseVal;
      const strokeWidth = Number(selectionFrame.getAttribute("stroke-width"));
      const x = Number(selectionFrame.getAttribute("x"));
      const y = Number(selectionFrame.getAttribute("y"));
      const width = Number(selectionFrame.getAttribute("width"));
      const height = Number(selectionFrame.getAttribute("height"));
      expect(selectionOutline.dataset.selectionStrokePlacement).toBe("inside");
      expect(x).toBeCloseTo(strokeWidth / 2, 6);
      expect(y).toBeCloseTo(strokeWidth / 2, 6);
      expect(x * 2 + width).toBeCloseTo(viewBox.width, 6);
      expect(y * 2 + height).toBeCloseTo(viewBox.height, 6);
    };
    expectImageOutlineInsideFrame();
    Object.assign(canvas, {
      hasPointerCapture: () => false,
      releasePointerCapture: () => undefined,
      setPointerCapture: () => undefined,
    });

    fireEvent.pointerDown(screen.getByLabelText("Resize se"), {
      clientX: 220,
      clientY: 220,
      pointerId: 25,
    });
    fireEvent(
      canvas,
      new PointerEvent("pointerrawupdate", {
        bubbles: true,
        clientX: 260,
        clientY: 260,
        pointerId: 25,
      }),
    );

    expect(Number.parseFloat(canvasElement.style.width)).toBeGreaterThan(
      element.width,
    );
    expect(Number.parseFloat(imageContent.style.width)).toBeGreaterThan(
      element.width,
    );
    expect(Number.parseFloat(imageSource.style.width)).toBeGreaterThan(
      element.width,
    );
    expectImageOutlineInsideFrame();
    expect(useEditorStore.getState().pages[0].elements[0]).toMatchObject({
      height: element.height,
      width: element.width,
    });

    fireEvent.pointerUp(canvas, {
      clientX: 260,
      clientY: 260,
      pointerId: 25,
    });
    expect(useEditorStore.getState().pages[0].elements[0].width).toBe(
      Number.parseFloat(canvasElement.style.width),
    );
  });

  it("connects SCENES page, viewport, checkbox, and color controls to editor state", () => {
    render(<EditorShell />);
    fireEvent.click(screen.getByRole("tab", { name: "SCENES" }));

    const pageName = screen.getByLabelText("Page Name");
    fireEvent.change(pageName, { target: { value: "Gallery" } });
    fireEvent.blur(pageName);
    expect(useEditorStore.getState().pages[0].name).toBe("Gallery");

    const pageWidth = screen.getByLabelText("Page Width");
    const pageHeight = screen.getByLabelText("Page Height");
    expect(pageWidth).toHaveAttribute("min", "0");
    expect(pageWidth).not.toHaveAttribute("max");
    expect(pageHeight).toHaveAttribute("min", "0");
    expect(pageHeight).not.toHaveAttribute("max");

    fireEvent.change(pageWidth, {
      target: { value: "1600" },
    });
    expect(useEditorStore.getState().artboard).toMatchObject({
      height: 679,
      width: 1600,
    });

    fireEvent.change(pageHeight, {
      target: { value: "5000" },
    });
    expect(useEditorStore.getState().artboard).toMatchObject({
      height: 5000,
      width: 1600,
    });

    fireEvent.click(screen.getByLabelText("Page aspect ratio"));
    fireEvent.click(screen.getByRole("option", { name: "9 : 16" }));
    expect(useEditorStore.getState().artboard).toMatchObject({
      height: 1920,
      pageAspectRatio: "9:16",
      width: 1080,
    });

    fireEvent.click(screen.getByRole("button", { name: "Fill" }));
    expect(useEditorStore.getState().artboard.viewportMode).toBe("fill");

    fireEvent.click(screen.getByRole("button", { name: /Scroll/ }));
    expect(useEditorStore.getState().artboard.pageType).toBe("scroll");

    fireEvent.change(screen.getByLabelText("Solid background color"), {
      target: { value: "336699" },
    });
    expect(useEditorStore.getState().artboard.background).toBe("#336699");
    expect(
      screen.getByLabelText("Solid background opacity").closest("label"),
    ).toHaveClass("scene-percent-field", "is-wide");
  });

  it("applies Page Type and Viewport settings to the audience preview", () => {
    render(<EditorShell />);
    fireEvent.click(screen.getByRole("tab", { name: "SCENES" }));
    fireEvent.click(screen.getByRole("button", { name: /Scroll/ }));
    fireEvent.click(screen.getByRole("button", { name: "Fill" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    const preview = screen.getByRole("dialog", { name: "Viewer preview" });
    const viewport = preview.querySelector<HTMLElement>(
      ".viewer-preview-viewport",
    );
    expect(viewport).toHaveAttribute("data-page-type", "scroll");
    expect(viewport).toHaveAttribute("data-viewport-mode", "fill");
    expect(viewport).toHaveClass("is-scroll");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "Viewer preview" }),
    ).not.toBeInTheDocument();
  });

  it("switches SCENES background controls and only shows playback options for video", () => {
    render(<EditorShell />);
    fireEvent.click(screen.getByRole("tab", { name: "SCENES" }));

    expect(screen.getByLabelText("Solid background color")).toBeVisible();
    expect(screen.queryByText("Auto Play")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Gradation" }));
    expect(useEditorStore.getState().artboard.backgroundGradientEnabled).toBe(
      true,
    );
    expect(screen.getByRole("button", { name: "Solid" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Gradation" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("Solid background color")).toBeVisible();
    const gradientType = screen.getByLabelText("Gradient Type");
    expect(gradientType).toBeVisible();
    fireEvent.click(gradientType);
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["Linear", "Radial", "Conic", "Rectangular", "Freeform"]);
    fireEvent.click(screen.getByRole("option", { name: "Linear" }));
    expect(screen.getAllByLabelText(/^Gradient color \d$/)).toHaveLength(2);

    const firstGradientStop = screen.getByRole("slider", {
      name: "Gradient stop 1 position",
    });
    const gradientPreview = firstGradientStop.parentElement!;
    let hasPointerCapture = false;
    Object.assign(firstGradientStop, {
      hasPointerCapture: () => hasPointerCapture,
      releasePointerCapture: () => {
        hasPointerCapture = false;
      },
      setPointerCapture: () => {
        hasPointerCapture = true;
      },
    });
    Object.defineProperty(gradientPreview, "getBoundingClientRect", {
      value: () => ({ left: 0, width: 200 }) as DOMRect,
    });
    fireEvent.pointerDown(firstGradientStop, { clientX: 0, pointerId: 1 });
    fireEvent.pointerMove(firstGradientStop, { clientX: 40, pointerId: 1 });
    expect(
      [
        ...document.querySelectorAll<HTMLElement>(
          '[data-background-layer="gradient"]',
        ),
      ].some((layer) => layer.style.backgroundImage.includes("20%")),
    ).toBe(true);
    fireEvent.pointerUp(firstGradientStop, { clientX: 40, pointerId: 1 });
    expect(useEditorStore.getState().artboard.gradientStops?.[0].position).toBe(
      20,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add gradient color" }));
    expect(useEditorStore.getState().artboard.gradientStops).toHaveLength(3);
    expect(screen.getAllByLabelText(/^Gradient color \d$/)).toHaveLength(3);
    expect(
      [...document.querySelectorAll<HTMLElement>(".artboard-background-layer")]
        .map((layer) => layer.style.backgroundImage)
        .join(" "),
    ).toContain("linear-gradient");

    fireEvent.click(screen.getByRole("button", { name: "Image" }));
    const addGradientColor = screen.getByRole("button", {
      name: "Add gradient color",
    });
    const uploadImage = screen.getByRole("button", {
      name: "Upload background image",
    });
    expect(
      Number.parseFloat(uploadImage.style.top) -
        Number.parseFloat(addGradientColor.style.top),
    ).toBe(39);
    expect(
      screen.getByLabelText("Upload background image", { selector: "input" }),
    ).toHaveAttribute("accept", "image/*");
    expect(screen.queryByText("Auto Play")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gradation" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const mediaFit = screen.getByLabelText("Background media fit");
    fireEvent.click(mediaFit);
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["Cover", "Contain", "Original", "Stretch"]);
    fireEvent.click(screen.getByRole("option", { name: "Contain" }));
    expect(useEditorStore.getState().artboard.backgroundImageFit).toBe(
      "contain",
    );

    act(() => {
      useEditorStore.setState((state) => ({
        artboard: {
          ...state.artboard,
          backgroundImage: "blob:uploaded-background",
        },
      }));
    });
    const replaceImageButton = screen.getByRole("button", {
      name: "Replace background image",
    });
    expect(replaceImageButton.style.backgroundImage).toBe("");
    expect(replaceImageButton.querySelector("video")).toBeNull();
    expect(replaceImageButton).toHaveTextContent("Replace");

    fireEvent.click(screen.getByRole("button", { name: "Video" }));
    expect(
      screen.getByLabelText("Upload background video", { selector: "input" }),
    ).toHaveAttribute("accept", "video/*");
    expect(screen.getByLabelText("Auto Play")).toBeChecked();
    expect(screen.getByLabelText("Loop")).toBeChecked();
    expect(screen.getByLabelText("Mute")).toBeChecked();

    fireEvent.click(screen.getByLabelText("Auto Play"));
    expect(useEditorStore.getState().artboard.backgroundAutoPlay).toBe(false);
  });

  it("clamps canvas zoom between 5% and 500%", () => {
    useEditorStore.getState().setZoom(0);
    expect(useEditorStore.getState().zoom).toBe(5);

    useEditorStore.getState().setZoom(600);
    expect(useEditorStore.getState().zoom).toBe(500);
  });

  it("opens the Figma shape picker and keeps the selected shape", () => {
    render(<EditorShell />);

    fireEvent.pointerDown(screen.getByRole("button", { name: "Rectangle" }));
    expect(screen.getByRole("toolbar", { name: "Shape picker" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Circle" }));
    expect(screen.getByRole("button", { name: "Circle" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    expect(
      screen.getByRole("button", { name: "Pen Tool" }),
    ).toBeInTheDocument();
  });

  it("creates a page from the scene add control", () => {
    render(<EditorShell />);

    fireEvent.click(screen.getByRole("button", { name: "Add scene" }));

    expect(screen.getByText("Page 2")).toBeInTheDocument();
    expect(useEditorStore.getState().pages).toHaveLength(2);
    expect(useEditorStore.getState().activePageId).not.toBe("page-1");
  });

  describe("deleting scenes", () => {
    beforeEach(() => {
      useEditorStore.setState({
        activePageId: "page-1",
        pages: [
          { elements: [], id: "page-1", name: "Intro" },
          { elements: [], id: "page-2", name: "Middle" },
          { elements: [], id: "page-3", name: "Outro" },
        ],
      });
    });

    const pageIds = () =>
      useEditorStore.getState().pages.map((page) => page.id);
    const sceneItem = (name: string) => {
      const item = screen.getByText(name).closest(".scene-item");
      if (!(item instanceof HTMLElement)) throw new Error(`No scene ${name}`);
      return item;
    };

    it("keeps every scene when Delete is pressed with nothing selected", () => {
      render(<EditorShell />);
      fireEvent.keyDown(window, { key: "Delete" });
      fireEvent.keyDown(window, { key: "Delete", repeat: true });
      fireEvent.keyDown(window, { key: "Backspace" });
      expect(pageIds()).toEqual(["page-1", "page-2", "page-3"]);
    });

    it("deletes the focused scene once, even while the key is held", () => {
      render(<EditorShell />);
      const middle = sceneItem("Middle");
      middle.focus();
      fireEvent.keyDown(middle, { key: "Delete" });
      expect(pageIds()).toEqual(["page-1", "page-3"]);

      const outro = sceneItem("Outro");
      outro.focus();
      fireEvent.keyDown(outro, { key: "Delete", repeat: true });
      expect(pageIds()).toEqual(["page-1", "page-3"]);

      useEditorStore.getState().undo();
      expect(pageIds()).toEqual(["page-1", "page-2", "page-3"]);
    });

    it("never deletes the last scene", () => {
      useEditorStore.setState({
        pages: [{ elements: [], id: "page-1", name: "Intro" }],
      });
      render(<EditorShell />);
      fireEvent.keyDown(sceneItem("Intro"), { key: "Delete" });
      expect(pageIds()).toEqual(["page-1"]);
    });
  });

  it("locks all selected layers when one selected layer lock is toggled", () => {
    const elements = [
      {
        cornerRadius: 0,
        fill: "#ffffff",
        height: 120,
        id: "rectangle-1",
        locked: false,
        name: "Rectangle",
        opacity: 1,
        rotation: 0,
        stroke: "#000000",
        strokeWidth: 1,
        type: "rectangle" as const,
        visible: true,
        width: 160,
        x: 120,
        y: 120,
      },
      {
        cornerRadius: 0,
        fill: "#ffffff",
        height: 100,
        id: "circle-1",
        locked: false,
        name: "Circle",
        opacity: 1,
        rotation: 0,
        stroke: "#000000",
        strokeWidth: 1,
        type: "circle" as const,
        visible: true,
        width: 100,
        x: 320,
        y: 120,
      },
    ];
    useEditorStore.setState({
      pages: [{ elements, id: "page-1", name: "Intro" }],
      selectedElementIds: elements.map((element) => element.id),
    });

    render(<EditorShell />);

    fireEvent.click(screen.getByRole("button", { name: "Lock Rectangle" }));

    expect(
      useEditorStore
        .getState()
        .pages[0].elements.every((element) => element.locked),
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: "Unlock Rectangle" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Unlock Circle" }),
    ).toBeInTheDocument();
  });

  it("shows or hides all selected layers when one visibility control is toggled", () => {
    const elements = [
      {
        cornerRadius: 0,
        fill: "#ffffff",
        height: 120,
        id: "rectangle-1",
        locked: false,
        name: "Rectangle",
        opacity: 1,
        rotation: 0,
        stroke: "#000000",
        strokeWidth: 1,
        type: "rectangle" as const,
        visible: true,
        width: 160,
        x: 120,
        y: 120,
      },
      {
        cornerRadius: 0,
        fill: "#ffffff",
        height: 100,
        id: "circle-1",
        locked: false,
        name: "Circle",
        opacity: 1,
        rotation: 0,
        stroke: "#000000",
        strokeWidth: 1,
        type: "circle" as const,
        visible: true,
        width: 100,
        x: 320,
        y: 120,
      },
    ];
    useEditorStore.setState({
      pages: [{ elements, id: "page-1", name: "Intro" }],
      selectedElementIds: elements.map((element) => element.id),
    });

    render(<EditorShell />);

    fireEvent.click(screen.getByRole("button", { name: "Hide Rectangle" }));

    expect(
      useEditorStore
        .getState()
        .pages[0].elements.every((element) => !element.visible),
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: "Show Circle" }),
    ).toBeInTheDocument();
  });

  it("moves selected elements with one-pixel arrow-key steps", () => {
    const element = {
      cornerRadius: 0,
      fill: "#ffffff",
      height: 120,
      id: "rectangle-1",
      locked: false,
      name: "Rectangle",
      opacity: 1,
      rotation: 0,
      stroke: "#000000",
      strokeWidth: 1,
      type: "rectangle" as const,
      visible: true,
      width: 160,
      x: 120,
      y: 120,
    };
    useEditorStore.setState({
      pages: [{ elements: [element], id: "page-1", name: "Intro" }],
      selectedElementIds: [element.id],
    });

    render(<EditorShell />);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowDown", shiftKey: true });

    expect(useEditorStore.getState().pages[0].elements[0]).toMatchObject({
      x: 121,
      y: 130,
    });
  });

  it("toggles grouping with Shift+G and selects grouped layers together", () => {
    const elements: CanvasElement[] = [
      {
        cornerRadius: 0,
        fill: "#ffffff",
        height: 40,
        id: "group-rectangle",
        locked: false,
        name: "Group Rectangle",
        opacity: 100,
        rotation: 0,
        stroke: "#000000",
        strokeWidth: 1,
        type: "rectangle",
        visible: true,
        width: 100,
        x: 100,
        y: 100,
      },
      {
        cornerRadius: 0,
        fill: "#ffffff",
        height: 80,
        id: "group-circle",
        locked: false,
        name: "Group Circle",
        opacity: 100,
        rotation: 0,
        stroke: "#000000",
        strokeWidth: 1,
        type: "circle",
        visible: true,
        width: 80,
        x: 240,
        y: 100,
      },
    ];
    useEditorStore.setState({
      pages: [{ elements, id: "page-1", name: "Intro" }],
      selectedElementIds: elements.map((element) => element.id),
    });

    const { container } = render(<EditorShell />);

    fireEvent.keyDown(window, { key: "G", shiftKey: true });
    const groupedElements = useEditorStore.getState().pages[0].elements;
    expect(groupedElements[0].groupId).toBeTruthy();
    expect(groupedElements[1].groupId).toBe(groupedElements[0].groupId);
    expect(
      container.querySelectorAll(".canvas-element.is-selected"),
    ).toHaveLength(0);
    expect(screen.getByLabelText("Group selection")).toHaveStyle({
      height: "80px",
      left: "100px",
      top: "100px",
      width: "220px",
    });

    useEditorStore.getState().setSelectedElementIds([]);
    fireEvent.click(screen.getByText("Group Rectangle"));
    expect(useEditorStore.getState().selectedElementIds).toEqual(
      expect.arrayContaining(["group-rectangle", "group-circle"]),
    );

    fireEvent.keyDown(window, { key: "g", shiftKey: true });
    expect(
      useEditorStore
        .getState()
        .pages[0].elements.every((element) => element.groupId === undefined),
    ).toBe(true);
  });

  it("offers 30-degree rotation presets and limits corner radius to rectangles", () => {
    const elements: CanvasElement[] = [
      {
        cornerRadius: 0,
        fill: "#ffffff",
        height: 80,
        id: "rotation-rectangle",
        locked: false,
        name: "Rotation Rectangle",
        opacity: 100,
        rotation: 0,
        stroke: "#000000",
        strokeWidth: 1,
        type: "rectangle",
        visible: true,
        width: 100,
        x: 100,
        y: 100,
      },
      {
        cornerRadius: 0,
        fill: "#ffffff",
        height: 80,
        id: "rotation-circle",
        locked: false,
        name: "Rotation Circle",
        opacity: 100,
        rotation: 0,
        stroke: "#000000",
        strokeWidth: 1,
        type: "circle",
        visible: true,
        width: 80,
        x: 240,
        y: 100,
      },
    ];
    useEditorStore.setState({
      pages: [{ elements, id: "page-1", name: "Intro" }],
      selectedElementIds: ["rotation-rectangle"],
    });

    render(<EditorShell />);

    const presets = screen.getByLabelText("Rotation presets");
    expect(presets.closest(".design-dropdown")).toHaveClass("is-no-scroll");
    fireEvent.click(presets);
    const presetMenu = screen.getByRole("listbox", {
      name: "Rotation presets menu",
    });
    expect(
      Array.from(presetMenu.querySelectorAll('[role="option"]')).map(
        (option) => option.textContent,
      ),
    ).toEqual([
      "0°",
      "30°",
      "60°",
      "90°",
      "120°",
      "150°",
      "180°",
      "210°",
      "240°",
      "270°",
      "300°",
      "330°",
    ]);
    fireEvent.click(screen.getByRole("option", { name: "330°" }));
    expect(useEditorStore.getState().pages[0].elements[0].rotation).toBe(330);
    expect(screen.getByText("Corner Radius")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Rotation Circle"));
    expect(screen.queryByText("Corner Radius")).not.toBeInTheDocument();
  });

  it("applies the complete single-shape Design controls", () => {
    const element: CanvasElement = {
      cornerRadius: 0,
      fill: "#ffffff",
      height: 120,
      id: "star-design",
      locked: false,
      name: "Star",
      opacity: 100,
      rotation: 0,
      stroke: "#000000",
      strokeWidth: 1,
      type: "star",
      visible: true,
      width: 120,
      x: 120,
      y: 120,
    };
    useEditorStore.setState({
      pages: [{ elements: [element], id: "page-1", name: "Intro" }],
      selectedElementIds: [element.id],
    });

    render(<EditorShell />);

    fireEvent.click(screen.getByRole("button", { name: "Flip horizontal" }));
    fireEvent.click(screen.getByRole("radio", { name: "Origin 1" }));
    fireEvent.change(screen.getByLabelText("Fill opacity"), {
      target: { value: "42" },
    });
    fireEvent.change(screen.getByLabelText("Fill"), {
      target: { value: "rgb(12, 34, 56)" },
    });
    fireEvent.click(screen.getByLabelText("Stroke style"));
    expect(
      screen
        .getByRole("option", { name: "Dashed" })
        .querySelector(".design-dropdown-stroke-preview.is-dashed"),
    ).toBeInTheDocument();
    expect(
      screen
        .getByRole("option", { name: "None" })
        .querySelector(".design-dropdown-stroke-preview.is-none"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "Dashed" }));
    fireEvent.change(screen.getByLabelText("Stroke width"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Stroke opacity"), {
      target: { value: "65" },
    });
    expect(screen.queryByText("Corner Radius")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Polygon points"), {
      target: { value: "7" },
    });

    expect(useEditorStore.getState().pages[0].elements[0]).toMatchObject({
      fill: "rgb(12, 34, 56)",
      fillOpacity: 42,
      flipX: true,
      polygonPoints: 7,
      strokeOpacity: 65,
      strokeStyle: "dashed",
      strokeWidth: 4,
      transformOrigin: 0,
    });
    expect(
      screen.getByRole("button", { name: "Flip horizontal" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(document.querySelector(".canvas-element .vector-shape")).toHaveStyle(
      { transform: "scale(-1, 1)" },
    );
    expect(screen.getByLabelText("Fill swatch")).toHaveValue("#0c2238");

    fireEvent.click(screen.getByLabelText("Stroke style"));
    fireEvent.click(screen.getByRole("option", { name: "None" }));
    expect(useEditorStore.getState().pages[0].elements[0].strokeStyle).toBe(
      "none",
    );
    expect(
      document.querySelector(".canvas-element .vector-shape polygon"),
    ).toHaveAttribute("stroke", "none");
  });

  it("uses Origin as the responsive anchor when the canvas ratio changes", () => {
    const elements: CanvasElement[] = [
      {
        cornerRadius: 0,
        fill: "#ffffff",
        height: 40,
        id: "origin-top-left",
        locked: false,
        name: "Origin Top Left",
        opacity: 100,
        rotation: 90,
        stroke: "#000000",
        strokeWidth: 1,
        transformOrigin: 0,
        type: "rectangle",
        visible: true,
        width: 40,
        x: 100,
        y: 100,
      },
      {
        cornerRadius: 0,
        fill: "#ffffff",
        height: 40,
        id: "origin-center",
        locked: false,
        name: "Origin Center",
        opacity: 100,
        rotation: 0,
        stroke: "#000000",
        strokeWidth: 1,
        transformOrigin: 4,
        type: "rectangle",
        visible: true,
        width: 40,
        x: 100,
        y: 100,
      },
      {
        cornerRadius: 0,
        fill: "#ffffff",
        height: 40,
        id: "origin-bottom-right",
        locked: false,
        name: "Origin Bottom Right",
        opacity: 100,
        rotation: 0,
        stroke: "#000000",
        strokeWidth: 1,
        transformOrigin: 8,
        type: "rectangle",
        visible: true,
        width: 40,
        x: 100,
        y: 100,
      },
    ];
    useEditorStore.setState({
      pages: [{ elements, id: "page-1", name: "Intro" }],
      selectedElementIds: ["origin-top-left"],
    });

    const { container } = render(<EditorShell />);
    expect(
      container.querySelector('[data-element-id="origin-top-left"]'),
    ).toHaveStyle({ transformOrigin: "center" });

    act(() => {
      useEditorStore.getState().updateArtboard({ height: 779, width: 1408 });
    });

    expect(
      useEditorStore
        .getState()
        .pages[0].elements.map(({ id, x, y }) => ({ id, x, y })),
    ).toEqual([
      { id: "origin-top-left", x: 100, y: 100 },
      { id: "origin-center", x: 200, y: 150 },
      { id: "origin-bottom-right", x: 300, y: 200 },
    ]);

    act(() => useEditorStore.getState().undo());
    expect(useEditorStore.getState().artboard).toMatchObject({
      height: 679,
      width: 1208,
    });
    expect(
      useEditorStore.getState().pages[0].elements.map(({ x, y }) => ({ x, y })),
    ).toEqual([
      { x: 100, y: 100 },
      { x: 100, y: 100 },
      { x: 100, y: 100 },
    ]);
  });

  it("keeps color-picker dragging to one undo checkpoint", () => {
    const element: CanvasElement = {
      cornerRadius: 0,
      fill: "#ffffff",
      height: 120,
      id: "rectangle-color",
      locked: false,
      name: "Rectangle",
      opacity: 100,
      rotation: 0,
      stroke: "#000000",
      strokeWidth: 1,
      type: "rectangle",
      visible: true,
      width: 120,
      x: 120,
      y: 120,
    };
    useEditorStore.setState({
      pages: [{ elements: [element], id: "page-1", name: "Intro" }],
      selectedElementIds: [element.id],
    });

    render(<EditorShell />);

    const topLeftCorner = screen.getByRole("button", {
      name: "Top left corner",
    });
    const topRightCorner = screen.getByRole("button", {
      name: "Top right corner",
    });
    expect(topLeftCorner).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(topRightCorner);
    expect(topLeftCorner).toHaveAttribute("aria-pressed", "true");
    expect(topRightCorner).toHaveAttribute("aria-pressed", "true");

    const swatch = screen.getByLabelText("Fill swatch");
    fireEvent.focus(swatch);
    fireEvent.change(swatch, { target: { value: "#112233" } });
    fireEvent.change(swatch, { target: { value: "#223344" } });
    fireEvent.change(swatch, { target: { value: "#334455" } });
    expect(useEditorStore.getState().pages[0].elements[0].fill).toBe("#ffffff");
    fireEvent.blur(swatch);

    expect(useEditorStore.getState().past).toHaveLength(1);
    expect(useEditorStore.getState().pages[0].elements[0].fill).toBe("#334455");
  });

  it("edits only the initially selected top-left rectangle corner", () => {
    const element: CanvasElement = {
      cornerRadius: 0,
      fill: "#ffffff",
      height: 120,
      id: "rectangle-initial-corner",
      locked: false,
      name: "Rectangle",
      opacity: 100,
      rotation: 0,
      stroke: "#000000",
      strokeWidth: 1,
      type: "rectangle",
      visible: true,
      width: 120,
      x: 120,
      y: 120,
    };
    useEditorStore.setState({
      pages: [{ elements: [element], id: "page-1", name: "Intro" }],
      selectedElementIds: [element.id],
    });

    render(<EditorShell />);

    expect(
      screen.getByRole("button", { name: "Top left corner" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Link corner radius")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    fireEvent.change(screen.getByLabelText("Corner radius value"), {
      target: { value: "12" },
    });

    expect(useEditorStore.getState().pages[0].elements[0].cornerRadii).toEqual([
      12, 0, 0, 0,
    ]);
  });

  it("keeps polygon points editable without showing corner radius", () => {
    const element: CanvasElement = {
      cornerRadius: 0,
      fill: "#ffffff",
      height: 120,
      id: "polygon-points",
      locked: false,
      name: "Polygon",
      opacity: 100,
      polygonPoints: 3,
      rotation: 0,
      stroke: "#000000",
      strokeWidth: 1,
      type: "triangle",
      visible: true,
      width: 120,
      x: 120,
      y: 120,
    };
    useEditorStore.setState({
      pages: [{ elements: [element], id: "page-1", name: "Intro" }],
      selectedElementIds: [element.id],
    });

    render(<EditorShell />);

    expect(screen.queryByText("Corner Radius")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Corner selection")).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("Opacity value").nextElementSibling,
    ).toHaveClass("number-unit--percent");

    const points = screen.getByLabelText("Polygon points");
    expect(points.parentElement).toHaveClass("number-field--unitless");
    fireEvent.focus(points);
    fireEvent.change(points, { target: { value: "" } });
    expect(points).toHaveValue(null);
    fireEvent.change(points, { target: { value: "12" } });
    fireEvent.blur(points);

    expect(useEditorStore.getState().pages[0].elements[0].polygonPoints).toBe(
      12,
    );
  });

  it("keeps width and height proportional while Lock Ratio is enabled", () => {
    const element: CanvasElement = {
      cornerRadius: 0,
      fill: "#ffffff",
      height: 80,
      id: "ratio-rectangle",
      locked: false,
      name: "Ratio Rectangle",
      opacity: 100,
      rotation: 0,
      stroke: "#000000",
      strokeWidth: 1,
      type: "rectangle",
      visible: true,
      width: 160,
      x: 120,
      y: 120,
    };
    useEditorStore.setState({
      pages: [{ elements: [element], id: "page-1", name: "Intro" }],
      selectedElementIds: [element.id],
    });

    render(<EditorShell />);

    const ratioSwitch = screen.getByLabelText("Lock Ratio");
    fireEvent.change(screen.getByLabelText("w"), {
      target: { value: "200" },
    });
    expect(useEditorStore.getState().pages[0].elements[0]).toMatchObject({
      height: 100,
      width: 200,
    });

    fireEvent.click(ratioSwitch);
    fireEvent.change(screen.getByLabelText("w"), {
      target: { value: "240" },
    });
    expect(useEditorStore.getState().pages[0].elements[0]).toMatchObject({
      height: 100,
      width: 240,
    });

    fireEvent.click(ratioSwitch);
    fireEvent.change(screen.getByLabelText("h"), {
      target: { value: "120" },
    });
    expect(useEditorStore.getState().pages[0].elements[0]).toMatchObject({
      height: 120,
      width: 288,
    });
  });

  it("shows transform values with at most one decimal place", () => {
    const element: CanvasElement = {
      cornerRadius: 0,
      fill: "#ffffff",
      height: 80.456,
      id: "decimal-rectangle",
      locked: false,
      name: "Decimal Rectangle",
      opacity: 100,
      rotation: 0,
      stroke: "#000000",
      strokeWidth: 1,
      type: "rectangle",
      visible: true,
      width: 160.123,
      x: 120.156,
      y: 24.987,
    };
    useEditorStore.setState({
      pages: [{ elements: [element], id: "page-1", name: "Intro" }],
      selectedElementIds: [element.id],
    });

    render(<EditorShell />);

    expect(screen.getByLabelText("x")).toHaveValue(120.2);
    expect(screen.getByLabelText("y")).toHaveValue(25);
    expect(screen.getByLabelText("w")).toHaveValue(160.1);
    expect(screen.getByLabelText("h")).toHaveValue(80.5);
  });

  it("maps rectangle corner controls to their visual positions after flipping", () => {
    const element: CanvasElement = {
      cornerRadii: [1, 2, 3, 4],
      cornerRadius: 1,
      fill: "#ffffff",
      flipX: true,
      height: 120,
      id: "flipped-rectangle",
      locked: false,
      name: "Flipped Rectangle",
      opacity: 100,
      rotation: 0,
      stroke: "#000000",
      strokeWidth: 1,
      type: "rectangle",
      visible: true,
      width: 120,
      x: 120,
      y: 120,
    };
    useEditorStore.setState({
      pages: [{ elements: [element], id: "page-1", name: "Intro" }],
      selectedElementIds: [element.id],
    });

    render(<EditorShell />);

    const visualTopLeft = screen.getByRole("button", {
      name: "Top left corner",
    });
    const visualTopRight = screen.getByRole("button", {
      name: "Top right corner",
    });
    expect(visualTopLeft).toHaveAttribute("aria-pressed", "false");
    expect(visualTopRight).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(visualTopRight);
    fireEvent.click(visualTopLeft);
    fireEvent.change(screen.getByLabelText("Corner radius value"), {
      target: { value: "9" },
    });

    expect(useEditorStore.getState().pages[0].elements[0].cornerRadii).toEqual([
      1, 9, 3, 4,
    ]);
  });

  it("keeps polygon corner controls hidden even for legacy rounded polygons", () => {
    const element: CanvasElement = {
      cornerRadius: 60,
      fill: "#ffffff",
      height: 120,
      id: "rounded-triangle",
      locked: false,
      name: "Rounded Triangle",
      opacity: 100,
      polygonCornerRadii: [60, 60, 60],
      polygonPoints: 3,
      rotation: 0,
      stroke: "#000000",
      strokeWidth: 1,
      type: "triangle",
      visible: true,
      width: 120,
      x: 120,
      y: 120,
    };
    useEditorStore.setState({
      pages: [{ elements: [element], id: "page-1", name: "Intro" }],
      selectedElementIds: [element.id],
    });

    render(<EditorShell />);

    expect(screen.queryByText("Corner Radius")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Corner selection")).not.toBeInTheDocument();
  });

  it("focuses and saves text immediately after drawing a text shape", async () => {
    const { container } = render(<EditorShell />);
    const canvas = screen.getByLabelText("Exhibition canvas");
    Object.defineProperties(canvas, {
      hasPointerCapture: { configurable: true, value: () => false },
      releasePointerCapture: { configurable: true, value: () => undefined },
      setPointerCapture: { configurable: true, value: () => undefined },
    });

    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    fireEvent.pointerDown(screen.getByLabelText("Artboard"), {
      clientX: 120,
      clientY: 120,
      pointerId: 7,
    });
    fireEvent.pointerUp(canvas, {
      clientX: 120,
      clientY: 120,
      pointerId: 7,
    });

    await waitFor(() => {
      expect(
        container.querySelector<HTMLElement>(
          ".canvas-element.element-text .text-shape",
        ),
      ).toHaveAttribute("contenteditable", "true");
    });
    expect(screen.getByRole("heading", { name: /^TEXT$/ })).toBeVisible();
    const activeEditor = container.querySelector<HTMLElement>(
      ".canvas-element.element-text .text-shape",
    );
    expect(activeEditor).toHaveFocus();
    expect(useEditorStore.getState().pages[0].elements[0]).toMatchObject({
      fill: "#000000",
      stroke: "transparent",
      strokeWidth: 0,
      text: "",
      textResizeMode: "auto-width",
    });
    expect(
      container.querySelector(".layer-symbol.symbol-text .layer-text-icon"),
    ).toHaveAttribute("src", "/figma/text.svg");

    Object.defineProperties(activeEditor!, {
      scrollHeight: { configurable: true, value: 34 },
      scrollWidth: { configurable: true, value: 95 },
    });
    activeEditor!.textContent = "Edited text";
    fireEvent.input(activeEditor!);
    expect(activeEditor!.closest<HTMLElement>(".canvas-element")).toHaveStyle({
      height: "34px",
      width: "96px",
    });
    fireEvent.blur(activeEditor!);
    expect(useEditorStore.getState().pages[0].elements[0]).toMatchObject({
      height: 34,
      text: "Edited text",
      width: 96,
    });

    const textElement = container.querySelector<HTMLElement>(
      ".canvas-element.element-text",
    )!;
    fireEvent.pointerDown(textElement, {
      clientX: 120,
      clientY: 120,
      pointerId: 9,
    });
    fireEvent.pointerUp(canvas, {
      clientX: 120,
      clientY: 120,
      pointerId: 9,
    });
    fireEvent.pointerDown(textElement, {
      clientX: 120,
      clientY: 120,
      pointerId: 9,
    });
    await waitFor(() =>
      expect(
        container.querySelector<HTMLElement>(
          ".canvas-element.element-text .text-shape",
        ),
      ).toHaveAttribute("contenteditable", "true"),
    );
    const reopenedEditor = container.querySelector<HTMLElement>(
      ".canvas-element.element-text .text-shape",
    )!;
    reopenedEditor.textContent = "Revised text";
    fireEvent.blur(reopenedEditor);
    expect(useEditorStore.getState().pages[0].elements[0].text).toBe(
      "Revised text",
    );

    fireEvent.click(screen.getByLabelText("Font"));
    fireEvent.click(screen.getByRole("option", { name: "Georgia" }));
    fireEvent.change(screen.getByLabelText("Font size"), {
      target: { value: "37" },
    });
    fireEvent.click(screen.getByLabelText("Font weight"));
    fireEvent.click(screen.getByRole("option", { name: "Semi Bold" }));
    const sizePresets = screen.getByLabelText("Font size presets");
    expect(sizePresets.closest(".design-dropdown")).toHaveClass("is-no-scroll");
    fireEvent.click(sizePresets);
    expect(
      screen.queryByRole("option", { name: "Size" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "48" }));
    expect(useEditorStore.getState().pages[0].elements[0]).toMatchObject({
      fontFamily: "Georgia",
      fontSize: 48,
      fontWeight: "600",
    });
    const styledText = container.querySelector<HTMLElement>(
      ".canvas-element.element-text .text-shape",
    )!;
    expect(styledText.style.fontFamily).toContain("Georgia");
    expect(styledText).toHaveStyle({ fontSize: "48px", fontWeight: "600" });
  });

  it("keeps the text tool independent from the previously selected pen tool", () => {
    render(<EditorShell />);
    const canvas = screen.getByLabelText("Exhibition canvas");
    Object.defineProperties(canvas, {
      hasPointerCapture: { configurable: true, value: () => false },
      releasePointerCapture: { configurable: true, value: () => undefined },
      setPointerCapture: { configurable: true, value: () => undefined },
    });

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    fireEvent.click(screen.getByRole("button", { name: "Pen Tool" }));
    fireEvent.keyDown(window, { key: "t" });
    expect(useEditorStore.getState().activeTool).toBe("text");
    fireEvent.pointerDown(screen.getByLabelText("Artboard"), {
      clientX: 100,
      clientY: 100,
      pointerId: 8,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 220,
      clientY: 150,
      pointerId: 8,
    });
    const liveDraft = document.querySelector<HTMLElement>(
      ".draw-draft.draw-draft-preview",
    );
    expect(Number.parseFloat(liveDraft?.style.width ?? "0")).toBeGreaterThan(1);
    fireEvent.pointerUp(canvas, {
      clientX: 220,
      clientY: 150,
      pointerId: 8,
    });

    expect(useEditorStore.getState().pages[0].elements).toHaveLength(1);
    expect(useEditorStore.getState().pages[0].elements[0]).toMatchObject({
      textResizeMode: "fixed",
      type: "text",
    });
  });

  it("spaces shapes and combines them with Pathfinder while preserving undo", () => {
    const elements: CanvasElement[] = [
      {
        cornerRadius: 0,
        fill: "#ffffff",
        height: 50,
        id: "rectangle-design-1",
        locked: false,
        name: "Rectangle 1",
        opacity: 100,
        rotation: 0,
        stroke: "#000000",
        strokeWidth: 1,
        type: "rectangle",
        visible: true,
        width: 50,
        x: 10,
        y: 20,
      },
      {
        cornerRadius: 0,
        fill: "#ffffff",
        height: 50,
        id: "rectangle-design-2",
        locked: false,
        name: "Rectangle 2",
        opacity: 100,
        rotation: 0,
        stroke: "#000000",
        strokeWidth: 1,
        type: "rectangle",
        visible: true,
        width: 50,
        x: 150,
        y: 20,
      },
    ];
    useEditorStore.setState({
      pages: [{ elements, id: "page-1", name: "Intro" }],
      selectedElementIds: elements.map((element) => element.id),
    });

    const { container } = render(<EditorShell />);

    fireEvent.change(screen.getByLabelText("Horizontal spacing value"), {
      target: { value: "10" },
    });
    expect(useEditorStore.getState().pages[0].elements[1].x).toBe(70);

    fireEvent.click(screen.getByRole("button", { name: "Union selection" }));
    expect(useEditorStore.getState().pages[0].elements).toHaveLength(1);
    expect(
      useEditorStore.getState().pages[0].elements[0].pathfinder,
    ).toMatchObject({
      operation: "union",
    });

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(useEditorStore.getState().pages[0].elements).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Subtract selection" }));
    expect(
      useEditorStore.getState().pages[0].elements[0].pathfinder,
    ).toMatchObject({ operation: "subtract" });
    expect(useEditorStore.getState().pages[0].elements[0]).toMatchObject({
      height: 50,
      width: 50,
      x: 70,
      y: 20,
    });
    expect(
      container.querySelectorAll('.canvas-element svg path[stroke="#000000"]')
        .length,
    ).toBe(1);
  });

  it("uses an image as Pathfinder geometry and preserves its bitmap fill", () => {
    const imageSource = "data:image/png;base64,cGF0aGZpbmRlcg==";
    const elements: CanvasElement[] = [
      {
        cornerRadius: 0,
        fill: "#000000",
        height: 40,
        id: "pathfinder-image-cutter",
        locked: false,
        name: "Image Cutter",
        opacity: 100,
        rotation: 0,
        stroke: "#000000",
        strokeWidth: 1,
        type: "rectangle",
        visible: true,
        width: 40,
        x: 30,
        y: 40,
      },
      {
        cornerRadius: 0,
        fill: "#ffffff",
        height: 80,
        id: "pathfinder-image",
        locked: false,
        name: "Pathfinder Image",
        opacity: 100,
        rotation: 0,
        src: imageSource,
        stroke: "transparent",
        strokeWidth: 0,
        type: "image",
        visible: true,
        width: 80,
        x: 10,
        y: 20,
        imageCrop: {
          baseHeight: 100,
          baseWidth: 120,
          bottom: 10,
          left: 20,
          right: 20,
          scaleX: 1,
          scaleY: 1,
          top: 10,
        },
      },
    ];
    useEditorStore.setState({
      pages: [{ elements, id: "page-1", name: "Intro" }],
      selectedElementIds: elements.map((element) => element.id),
    });

    const { container } = render(<EditorShell />);

    fireEvent.click(screen.getByRole("button", { name: "Union selection" }));
    expect(
      useEditorStore.getState().pages[0].elements[0].pathfinder,
    ).toMatchObject({
      imageFill: { src: imageSource },
      operation: "union",
    });
    expect(
      container.querySelector(".canvas-element svg image"),
    ).toHaveAttribute("href", imageSource);
    expect(
      container.querySelector(
        '.canvas-element svg [data-pathfinder-image-viewport="true"]',
      ),
    ).toHaveAttribute("width", "80");
    expect(
      container.querySelector(".canvas-element svg image"),
    ).toHaveAttribute("x", "-20");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    const subtract = screen.getByRole("button", {
      name: "Subtract selection",
    });
    expect(subtract).toBeEnabled();
    fireEvent.click(subtract);

    const result = useEditorStore.getState().pages[0].elements[0];
    expect(result).toMatchObject({
      height: 80,
      type: "pen",
      width: 80,
      x: 10,
      y: 20,
    });
    expect(result.pathfinder).toMatchObject({
      imageFill: { src: imageSource },
      operation: "subtract",
    });
    expect(result.pathfinder?.polygons?.[0]).toHaveLength(2);
    expect(
      container.querySelector(".canvas-element svg image"),
    ).toHaveAttribute("href", imageSource);

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    fireEvent.click(screen.getByRole("button", { name: "Exclude selection" }));

    const excluded = useEditorStore.getState().pages[0].elements[0];
    expect(excluded.pathfinder).toMatchObject({
      imageFill: { src: imageSource },
      operation: "exclude",
    });
    expect(excluded.pathfinder?.polygons?.[0]).toHaveLength(2);
    expect(
      container.querySelectorAll(".canvas-element svg clipPath path"),
    ).toHaveLength(1);
    expect(
      container.querySelector(".canvas-element svg clipPath path"),
    ).toHaveAttribute("fill-rule", "evenodd");
    expect(container.querySelector(".canvas-element svg mask")).not.toBeNull();
    expect(
      container.querySelector(
        '.canvas-element svg [data-pathfinder-image-viewport="true"]',
      ),
    ).toHaveAttribute("x", "0.2");
    expect(
      container.querySelector(
        '.canvas-element svg [data-pathfinder-image-viewport="true"]',
      ),
    ).toHaveAttribute("width", "79.6");
  });

  it("keeps vector stroke data at its design width when the canvas is zoomed", async () => {
    const element: CanvasElement = {
      cornerRadius: 0,
      fill: "#ffffff",
      height: 80,
      id: "zoom-stroke",
      locked: false,
      name: "Zoom Stroke",
      opacity: 100,
      rotation: 0,
      stroke: "#000000",
      strokeWidth: 1,
      type: "rectangle",
      visible: true,
      width: 80,
      x: 10,
      y: 20,
    };
    useEditorStore.setState({
      pages: [{ elements: [element], id: "page-1", name: "Intro" }],
      zoom: 500,
    });

    const { container } = render(<EditorShell />);

    await waitFor(() =>
      expect(
        container.querySelector('[data-element-id="zoom-stroke"] rect'),
      ).toHaveAttribute("stroke-width", "1"),
    );
  });

  it("removes both arrowheads at the shared elbow of diagonal distances", () => {
    const subject: CanvasElement = {
      cornerRadius: 0,
      fill: "#ffffff",
      height: 50,
      id: "distance-subject",
      locked: false,
      name: "Distance Subject",
      opacity: 100,
      rotation: 0,
      stroke: "#000000",
      strokeWidth: 1,
      type: "rectangle",
      visible: true,
      width: 50,
      x: 20,
      y: 200,
    };
    const target: CanvasElement = {
      ...subject,
      id: "distance-target",
      name: "Distance Target",
      x: 200,
      y: 20,
    };
    useEditorStore.setState({
      pages: [{ elements: [subject, target], id: "page-1", name: "Intro" }],
      selectedElementIds: [subject.id],
    });

    const { container } = render(<EditorShell />);
    const canvas = screen.getByLabelText("Exhibition canvas");
    const targetNode = container.querySelector<HTMLElement>(
      '[data-element-id="distance-target"]',
    )!;
    const originalElementFromPoint = document.elementFromPoint;
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: () => targetNode,
    });

    try {
      fireEvent.keyDown(window, { key: "Alt" });
      fireEvent.pointerMove(canvas, {
        altKey: true,
        clientX: 200,
        clientY: 20,
      });
      const measurements = container.querySelectorAll(
        ".distance-measurement:not(.distance-preview-slot)",
      );
      expect(measurements).toHaveLength(2);
      expect(measurements[0]).toHaveClass("hide-min-arrow");
      expect(measurements[1]).toHaveClass("hide-min-arrow");

      fireEvent.blur(window);
      expect(
        container.querySelectorAll(
          ".distance-measurement:not(.distance-preview-slot)",
        ),
      ).toHaveLength(0);
    } finally {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: originalElementFromPoint,
      });
    }
  });

  it("moves Pathfinder artwork with a dragged anchor instead of detaching the node", () => {
    const elements: CanvasElement[] = [
      {
        cornerRadius: 0,
        fill: "#ff0000",
        height: 80,
        id: "anchor-back",
        locked: false,
        name: "Anchor Back",
        opacity: 100,
        rotation: 0,
        stroke: "#000000",
        strokeWidth: 1,
        type: "rectangle",
        visible: true,
        width: 80,
        x: 10,
        y: 20,
      },
      {
        cornerRadius: 0,
        fill: "#0000ff",
        height: 80,
        id: "anchor-front",
        locked: false,
        name: "Anchor Front",
        opacity: 100,
        rotation: 0,
        stroke: "#000000",
        strokeWidth: 1,
        type: "rectangle",
        visible: true,
        width: 80,
        x: 50,
        y: 50,
      },
    ];
    useEditorStore.setState({
      pages: [{ elements, id: "page-1", name: "Intro" }],
      selectedElementIds: elements.map((element) => element.id),
    });

    const { container } = render(<EditorShell />);
    const canvas = screen.getByLabelText("Exhibition canvas");
    Object.defineProperties(canvas, {
      hasPointerCapture: { configurable: true, value: () => false },
      releasePointerCapture: { configurable: true, value: () => undefined },
      setPointerCapture: { configurable: true, value: () => undefined },
    });
    fireEvent.click(screen.getByRole("button", { name: "Union selection" }));

    const initial = useEditorStore.getState().pages[0].elements[0];
    const initialPath = initial.pathfinder?.paths[0];
    const path = initial.vectorPaths?.[0];
    const nodeIndex =
      path?.points.findIndex(
        (point) =>
          point.x > 0 &&
          point.x < initial.width &&
          point.y > 0 &&
          point.y < initial.height,
      ) ?? -1;
    expect(nodeIndex).toBeGreaterThanOrEqual(0);
    const anchor = path!.points[nodeIndex];
    const canvasElement =
      container.querySelector<HTMLElement>(".canvas-element")!;
    fireEvent.doubleClick(canvasElement);
    const node = screen.getByRole("button", {
      name: `Move ${initial.name} node ${nodeIndex + 1}`,
    });
    const artboard = screen.getByLabelText("Artboard");
    const scale = Number(
      artboard.style.getPropertyValue("--artboard-scale") || "1",
    );
    const startX = (initial.x + anchor.x) * scale;
    const startY = (initial.y + anchor.y) * scale;
    fireEvent.pointerDown(node, {
      clientX: startX,
      clientY: startY,
      pointerId: 12,
    });
    fireEvent.pointerMove(canvas, {
      clientX: startX + 12 * scale,
      clientY: startY + 7 * scale,
      pointerId: 12,
    });
    fireEvent.pointerUp(canvas, {
      clientX: startX + 12 * scale,
      clientY: startY + 7 * scale,
      pointerId: 12,
    });

    const updated = useEditorStore.getState().pages[0].elements[0];
    const updatedAnchor = updated.vectorPaths?.[0].points[nodeIndex];
    expect(updatedAnchor?.x).toBeCloseTo(anchor.x + 12);
    expect(updatedAnchor?.y).toBeCloseTo(anchor.y + 7);
    expect(updated.pathfinder?.polygons?.[0][0][nodeIndex]).toEqual([
      updatedAnchor!.x,
      updatedAnchor!.y,
    ]);
    expect(updated.pathfinder?.paths[0]).not.toBe(initialPath);
    expect(
      container.querySelector(".canvas-element .vector-shape > path"),
    ).toHaveAttribute("d", updated.pathfinder?.paths[0]);
  });

  it("keeps a Divide piece draggable after it has been clicked once", () => {
    const elements: CanvasElement[] = [
      {
        cornerRadius: 0,
        fill: "#ff0000",
        height: 80,
        id: "divide-drag-back",
        locked: false,
        name: "Divide Drag Back",
        opacity: 100,
        rotation: 0,
        stroke: "#111111",
        strokeWidth: 1,
        type: "rectangle",
        visible: true,
        width: 80,
        x: 10,
        y: 20,
      },
      {
        cornerRadius: 0,
        fill: "#0000ff",
        height: 80,
        id: "divide-drag-front",
        locked: false,
        name: "Divide Drag Front",
        opacity: 100,
        rotation: 0,
        stroke: "#222222",
        strokeWidth: 1,
        type: "rectangle",
        visible: true,
        width: 80,
        x: 50,
        y: 50,
      },
    ];
    useEditorStore.setState({
      pages: [{ elements, id: "page-1", name: "Intro" }],
      selectedElementIds: elements.map((element) => element.id),
    });

    const { container } = render(<EditorShell />);
    const canvas = screen.getByLabelText("Exhibition canvas");
    Object.defineProperties(canvas, {
      hasPointerCapture: { configurable: true, value: () => false },
      releasePointerCapture: { configurable: true, value: () => undefined },
      setPointerCapture: { configurable: true, value: () => undefined },
    });
    fireEvent.click(screen.getByRole("button", { name: "Divide selection" }));

    const rightBottom = useEditorStore.getState().pages[0].elements.at(-1)!;
    const rightBottomNode = container.querySelector<HTMLElement>(
      `[data-element-id="${rightBottom.id}"]`,
    )!;
    const visiblePath = rightBottomNode.querySelector<SVGPathElement>(
      ".vector-shape > path",
    )!;
    const anchor = rightBottom.vectorPaths![0].points[0];
    const artboard = screen.getByLabelText("Artboard");
    const scale = Number(
      artboard.style.getPropertyValue("--artboard-scale") || "1",
    );
    const startX = (rightBottom.x + anchor.x) * scale;
    const startY = (rightBottom.y + anchor.y) * scale;

    fireEvent.pointerDown(visiblePath, {
      clientX: startX,
      clientY: startY,
      pointerId: 14,
      timeStamp: 100,
    });
    fireEvent.pointerUp(canvas, {
      clientX: startX,
      clientY: startY,
      pointerId: 14,
    });
    fireEvent.click(visiblePath);

    const originalElementFromPoint = document.elementFromPoint;
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: () => visiblePath,
    });
    const dragStartX = startX + 10;
    fireEvent.pointerDown(visiblePath, {
      clientX: dragStartX,
      clientY: startY,
      pointerId: 15,
      timeStamp: 1_000,
    });
    fireEvent.pointerMove(canvas, {
      clientX: dragStartX + 18 * scale,
      clientY: startY + 13 * scale,
      pointerId: 15,
    });
    fireEvent.pointerUp(canvas, {
      clientX: dragStartX + 18 * scale,
      clientY: startY + 13 * scale,
      pointerId: 15,
    });
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: originalElementFromPoint,
    });

    const movedPiece = useEditorStore
      .getState()
      .pages[0].elements.find((element) => element.id === rightBottom.id)!;
    expect(movedPiece.x).not.toBe(rightBottom.x);
    expect(movedPiece.y).not.toBe(rightBottom.y);

    const movedNode = container.querySelector<HTMLElement>(
      `[data-element-id="${rightBottom.id}"]`,
    )!;
    const movedPath = movedNode.querySelector<SVGPathElement>(
      ".vector-shape > path",
    )!;
    const editX = dragStartX + 18 * scale + 10;
    const editY = startY + 13 * scale;
    fireEvent.pointerDown(movedPath, {
      clientX: editX,
      clientY: editY,
      pointerId: 16,
      timeStamp: 2_000,
    });
    fireEvent.pointerUp(canvas, {
      clientX: editX,
      clientY: editY,
      pointerId: 16,
    });
    fireEvent.pointerDown(movedPath, {
      clientX: editX,
      clientY: editY,
      pointerId: 17,
      timeStamp: 2_200,
    });
    expect(
      screen.getByLabelText(`Edit nodes for ${movedPiece.name}`),
    ).toBeInTheDocument();
  });

  it("divides every overlap face and trims only hidden back areas", () => {
    const elements: CanvasElement[] = [
      {
        cornerRadius: 0,
        fill: "#ff0000",
        height: 80,
        id: "divide-back",
        locked: false,
        name: "Back Rectangle",
        opacity: 100,
        rotation: 0,
        stroke: "#111111",
        strokeWidth: 2,
        type: "rectangle",
        visible: true,
        width: 80,
        x: 10,
        y: 20,
      },
      {
        cornerRadius: 0,
        fill: "#0000ff",
        height: 80,
        id: "divide-front",
        locked: false,
        name: "Front Rectangle",
        opacity: 100,
        rotation: 0,
        stroke: "#222222",
        strokeWidth: 3,
        type: "rectangle",
        visible: true,
        width: 80,
        x: 50,
        y: 20,
      },
    ];
    useEditorStore.setState({
      pages: [{ elements, id: "page-1", name: "Intro" }],
      selectedElementIds: elements.map((element) => element.id),
    });

    render(<EditorShell />);

    expect(
      screen.queryByRole("button", { name: "Flatten selection" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Outline selection" }),
    ).not.toBeInTheDocument();

    const shapeModeCases = [
      {
        asset: "Group 153.svg",
        button: "Union selection",
        fill: "#0000ff",
        operation: "union",
        pathCount: 1,
        stroke: "#222222",
        strokeWidth: 3,
        width: 120,
        x: 10,
      },
      {
        asset: "Group 154.svg",
        button: "Subtract selection",
        fill: "#0000ff",
        operation: "subtract",
        pathCount: 1,
        stroke: "#222222",
        strokeWidth: 3,
        width: 40,
        x: 90,
      },
      {
        asset: "Group 155.svg",
        button: "Intersect selection",
        fill: "#0000ff",
        operation: "intersect",
        pathCount: 1,
        stroke: "#222222",
        strokeWidth: 3,
        width: 40,
        x: 50,
      },
      {
        asset: "Group 156.svg",
        button: "Exclude selection",
        fill: "#0000ff",
        operation: "exclude",
        pathCount: 2,
        stroke: "#222222",
        strokeWidth: 3,
        width: 120,
        x: 10,
      },
    ] as const;
    shapeModeCases.forEach((pathfinderCase) => {
      fireEvent.click(
        screen.getByRole("button", { name: pathfinderCase.button }),
      );
      const result = useEditorStore.getState().pages[0].elements[0];
      expect(result).toMatchObject({
        fill: pathfinderCase.fill,
        stroke: pathfinderCase.stroke,
        strokeWidth: pathfinderCase.strokeWidth,
        width: pathfinderCase.width,
        x: pathfinderCase.x,
      });
      expect(result.pathfinder?.operation).toBe(pathfinderCase.operation);
      expect(result.pathfinder?.paths).toHaveLength(pathfinderCase.pathCount);
      const layerSymbol = document.querySelector(
        `[data-pathfinder-operation="${pathfinderCase.operation}"]`,
      );
      expect(layerSymbol?.querySelector("img")?.getAttribute("src")).toContain(
        encodeURIComponent(pathfinderCase.asset),
      );
      const renderedPath = document.querySelector(
        ".canvas-element .vector-shape > path",
      );
      expect(renderedPath).toHaveAttribute("fill", pathfinderCase.fill);
      expect(renderedPath).toHaveAttribute("stroke", pathfinderCase.stroke);
      expect(document.querySelector(".canvas-element mask")).toBeNull();
      expect(document.querySelector(".canvas-element clipPath")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    });

    fireEvent.click(screen.getByRole("button", { name: "Divide selection" }));

    const divided = useEditorStore.getState().pages[0].elements;
    expect(divided).toHaveLength(3);
    expect(divided.map((element) => element.pathfinder?.operation)).toEqual([
      "divide",
      "divide",
      "divide",
    ]);
    expect(divided[1]).toMatchObject({
      fill: "#0000ff",
      height: 80,
      stroke: "#222222",
      strokeWidth: 3,
      width: 40,
      x: 50,
      y: 20,
    });
    expect(
      Array.from(
        document.querySelectorAll(".canvas-element .vector-shape > path"),
      ).map((path) => path.getAttribute("stroke")),
    ).toEqual(["#111111", "#222222", "#222222"]);
    expect(useEditorStore.getState().selectedElementIds).toHaveLength(3);
    expect(
      document
        .querySelector(
          '[data-pathfinder-operation="divide"] .layer-pathfinder-icon',
        )
        ?.getAttribute("src"),
    ).toContain("Group%20158.svg");

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    fireEvent.click(screen.getByRole("button", { name: "Trim selection" }));

    const trimmed = useEditorStore.getState().pages[0].elements;
    expect(trimmed).toHaveLength(2);
    expect(trimmed.map((element) => element.pathfinder?.operation)).toEqual([
      "trim",
      "trim",
    ]);
    expect(trimmed[0]).toMatchObject({
      fill: "#ff0000",
      stroke: "transparent",
      strokeWidth: 0,
      width: 40,
      x: 10,
    });
    expect(trimmed[1]).toMatchObject({
      fill: "#0000ff",
      stroke: "transparent",
      strokeWidth: 0,
      width: 80,
      x: 50,
    });
    expect(
      document
        .querySelector(
          '[data-pathfinder-operation="trim"] .layer-pathfinder-icon',
        )
        ?.getAttribute("src"),
    ).toContain("Group%20159.svg");
    expect(
      Array.from(
        document.querySelectorAll(".canvas-element .vector-shape > path"),
      ).every((path) => path.getAttribute("stroke") === "transparent"),
    ).toBe(true);
    expect(useEditorStore.getState().selectedElementIds).toHaveLength(2);
  });

  it("keeps the full triangle bounds when Pathfinder creates its result", () => {
    const triangle = (id: string): CanvasElement => ({
      cornerRadius: 0,
      fill: "#ffffff",
      height: 120,
      id,
      locked: false,
      name: "Triangle",
      opacity: 100,
      rotation: 0,
      stroke: "#000000",
      strokeWidth: 1,
      type: "triangle",
      visible: true,
      width: 120,
      x: 10,
      y: 20,
    });
    const elements = [triangle("triangle-1"), triangle("triangle-2")];
    useEditorStore.setState({
      pages: [{ elements, id: "page-1", name: "Intro" }],
      selectedElementIds: elements.map((element) => element.id),
    });

    render(<EditorShell />);
    fireEvent.click(screen.getByRole("button", { name: "Union selection" }));

    const result = useEditorStore.getState().pages[0].elements[0];
    expect(result.x).toBeCloseTo(10);
    expect(result.y).toBeCloseTo(20);
    expect(result.width).toBeCloseTo(120);
    expect(result.height).toBeCloseTo(120);
  });
});
