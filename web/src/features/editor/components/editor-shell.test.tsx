import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useEditorStore } from "../store/editor-store";
import type { CanvasElement } from "../store/editor-store";
import { EditorShell } from "./editor-shell";

beforeEach(() => {
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

afterEach(cleanup);

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

    expect(useEditorStore.getState().activeTool).toBe("settings");
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

  it("connects SCENES page, viewport, checkbox, and color controls to editor state", () => {
    render(<EditorShell />);
    fireEvent.click(screen.getByRole("tab", { name: "SCENES" }));

    const pageName = screen.getByLabelText("Page Name");
    fireEvent.change(pageName, { target: { value: "Gallery" } });
    fireEvent.blur(pageName);
    expect(useEditorStore.getState().pages[0].name).toBe("Gallery");

    fireEvent.change(screen.getByLabelText("Page Width"), {
      target: { value: "1600" },
    });
    expect(useEditorStore.getState().artboard).toMatchObject({
      height: 900,
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

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
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
      height: "86px",
      left: "97px",
      top: "97px",
      width: "226px",
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
    expect(
      screen.getByRole("heading", { name: /^TEXT$/ }),
    ).toBeVisible();
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
    expect(Number.parseFloat(liveDraft?.style.width ?? "0")).toBeGreaterThan(
      1,
    );
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

  it("keeps the rendered triangle size when Pathfinder creates its result", () => {
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
    expect(result.x).toBeCloseTo(11.2);
    expect(result.y).toBeCloseTo(21.2);
    expect(result.width).toBeCloseTo(117.6);
    expect(result.height).toBeCloseTo(117.6);
  });
});
