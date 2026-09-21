import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useEditorStore } from "@/features/editor/store/editor-store";
import {
  createDefaultScene3DSettings,
  createPrimitiveObject3D,
} from "@/features/editor/three/types";

import { EditorShell } from "./editor-shell";

vi.mock("@/features/editor/components/canvas/artboard-3d-scene", () => ({
  Artboard3DScene: () => null,
}));

const cube = () =>
  createPrimitiveObject3D({
    dimensions: { depth: 60, height: 80, width: 100 },
    id: "museum-cube",
    name: "Museum Cube",
    position: { x: 200, y: 150, z: 20 },
    primitive: "box",
  });

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
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
    pages: [
      {
        id: "page-1",
        name: "Intro",
        elements: [],
        objects3d: [cube()],
        scene3d: { ...createDefaultScene3DSettings(), enabled: true },
      },
    ],
    past: [],
    selectedElementIds: [],
    selectedObject3DIds: [],
    selectedShape: "rectangle",
    zoom: 100,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("3D objects in LAYERS", () => {
  it("shows a 3D object as a selectable layer and selects only that object", () => {
    render(<EditorShell />);

    const layers = screen.getByRole("listbox", { name: "Layers" });
    const row = within(layers).getByRole("option", { name: /Museum Cube/ });
    expect(row).toHaveAttribute("aria-selected", "false");

    fireEvent.click(row);

    expect(useEditorStore.getState().selectedObject3DIds).toEqual([
      "museum-cube",
    ]);
    expect(useEditorStore.getState().selectedElementIds).toEqual([]);
    expect(row).toHaveAttribute("aria-selected", "true");
  });

  it("toggles 3D visibility and locking without selecting the row", () => {
    render(<EditorShell />);

    const layers = screen.getByRole("listbox", { name: "Layers" });
    const row = within(layers).getByRole("option", { name: /Museum Cube/ });

    fireEvent.click(
      within(row).getByRole("button", { name: "Hide Museum Cube" }),
    );
    expect(useEditorStore.getState().pages[0].objects3d?.[0].visible).toBe(
      false,
    );
    expect(
      within(row).getByRole("button", { name: "Show Museum Cube" }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(row).getByRole("button", { name: "Lock Museum Cube" }),
    );
    expect(useEditorStore.getState().pages[0].objects3d?.[0].locked).toBe(true);
    expect(
      within(row).getByRole("button", { name: "Unlock Museum Cube" }),
    ).toBeInTheDocument();
    expect(useEditorStore.getState().selectedObject3DIds).toEqual([]);
  });

  it("shows 3D design controls, edits all rotation axes, and deletes only the selected model", () => {
    render(<EditorShell />);
    const row = within(screen.getByRole("listbox", { name: "Layers" })).getByRole(
      "option",
      { name: /Museum Cube/ },
    );
    fireEvent.click(row);

    expect(screen.getByRole("spinbutton", { name: "Rotation X" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Rotation Y" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Rotation Z" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Rotation Y" }), {
      target: { value: "45" },
    });
    expect(useEditorStore.getState().pages[0].objects3d?.[0].transform.rotation.y).toBe(45);

    fireEvent.keyDown(window, { key: "Delete" });
    expect(useEditorStore.getState().pages[0].objects3d).toEqual([]);
    expect(useEditorStore.getState().pages).toHaveLength(1);
  });

  it("keeps 2D and 3D layers selected together with Shift and deletes both", () => {
    const page = useEditorStore.getState().pages[0];
    useEditorStore.setState({
      pages: [{
        ...page,
        elements: [{
          id: "rectangle-a",
          name: "Rectangle A",
          type: "rectangle",
          x: 100,
          y: 100,
          width: 80,
          height: 60,
          rotation: 0,
          opacity: 100,
          fill: "#ffffff",
          stroke: "#000000",
          strokeWidth: 0,
          cornerRadius: 0,
          visible: true,
          locked: false,
        }],
      }],
    });
    render(<EditorShell />);
    const layers = screen.getByRole("listbox", { name: "Layers" });
    fireEvent.click(within(layers).getByRole("option", { name: /Museum Cube/ }));
    fireEvent.click(within(layers).getByRole("option", { name: /Rectangle A/ }), {
      shiftKey: true,
    });

    expect(useEditorStore.getState().selectedObject3DIds).toEqual(["museum-cube"]);
    expect(useEditorStore.getState().selectedElementIds).toEqual(["rectangle-a"]);
    expect(screen.getByText("2 2D / 3D objects selected")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Delete" });
    expect(useEditorStore.getState().pages[0].objects3d).toEqual([]);
    expect(useEditorStore.getState().pages[0].elements).toEqual([]);
    expect(useEditorStore.getState().pages).toHaveLength(1);
  });
});
