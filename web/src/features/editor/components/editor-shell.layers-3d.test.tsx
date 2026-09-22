import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  defaultInteractionSoundSettings,
  useEditorStore,
} from "@/features/editor/store/editor-store";
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
  it("uses the same selected and All Sounds controls for a 3D object", () => {
    const page = useEditorStore.getState().pages[0];
    const object = cube();
    object.interactionSounds = [{
      ...defaultInteractionSoundSettings,
      assets: [{
        durationSeconds: 1,
        mimeType: "audio/wav",
        name: "cube-click.wav",
        sizeBytes: 128,
        src: "blob:cube-click",
      }],
    }];
    useEditorStore.setState({ pages: [{ ...page, objects3d: [object] }] });

    render(<EditorShell />);
    const row = within(screen.getByRole("listbox", { name: "Layers" })).getByRole(
      "option", { name: /Museum Cube/ },
    );
    fireEvent.click(row);
    fireEvent.click(screen.getByRole("tab", { name: "SOUND" }));
    expect(screen.getByRole("region", { name: "Interaction Sounds" })).toBeInTheDocument();
    expect(screen.getByLabelText("Hover sound file name: cube-click.wav")).toBeInTheDocument();
    expect(row.querySelector(".layer-sound-indicator")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "More Hover sound options" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Event Settings" }));
    expect(useEditorStore.getState().pages[0].objects3d?.[0].interactionSoundExpanded).toBe(true);
    fireEvent.click(screen.getByLabelText("Hover sound trigger"));
    fireEvent.click(screen.getByRole("option", { name: "Click" }));
    expect(useEditorStore.getState().pages[0].objects3d?.[0].interactionSounds?.[0]).toMatchObject({
      trigger: "click",
      event: "click",
    });

    fireEvent.click(screen.getByRole("button", { name: "All Sounds" }));
    const allSounds = screen.getByRole("region", { name: "All Sounds interaction sounds" });
    expect(within(allSounds).getByText("Museum Cube")).toBeInTheDocument();
    expect(within(allSounds).getByText("cube-click.wav")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "More options for cube-click.wav" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Go to Layer" }));
    expect(useEditorStore.getState().selectedObject3DIds).toEqual([object.id]);
    expect(screen.getByRole("button", { name: "Selected Object" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "All Sounds" }));
    fireEvent.click(screen.getByRole("button", { name: "More options for cube-click.wav" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete Sound" }));
    expect(useEditorStore.getState().pages[0].objects3d?.[0].interactionSounds?.[0].assets).toEqual([]);
    expect(row.querySelector(".layer-sound-indicator")).toBeNull();
  });

  it("applies a shared sound setting to mixed 2D and 3D selections", () => {
    const page = useEditorStore.getState().pages[0];
    useEditorStore.setState({
      pages: [{
        ...page,
        elements: [{
          cornerRadius: 0,
          fill: "#ffffff",
          height: 60,
          id: "rectangle-a",
          locked: false,
          name: "Rectangle A",
          opacity: 100,
          rotation: 0,
          stroke: "transparent",
          strokeWidth: 0,
          type: "rectangle",
          visible: true,
          width: 80,
          x: 100,
          y: 100,
        }],
      }],
      selectedElementIds: ["rectangle-a"],
      selectedObject3DIds: ["museum-cube"],
    });

    render(<EditorShell />);
    fireEvent.click(screen.getByRole("tab", { name: "SOUND" }));
    expect(screen.getByRole("region", { name: "Interaction Sounds" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Add$/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "More Hover sound options" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Event Settings" }));
    fireEvent.click(screen.getByLabelText("Hover sound trigger"));
    fireEvent.click(screen.getByRole("option", { name: "Click" }));

    const nextPage = useEditorStore.getState().pages[0];
    expect(nextPage.elements[0].interactionSounds?.[0].trigger).toBe("click");
    expect(nextPage.objects3d?.[0].interactionSounds?.[0].trigger).toBe("click");
  });

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

  it("applies layer lock and visibility to a mixed 2D/3D selection", () => {
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
          stroke: "transparent",
          strokeWidth: 0,
          cornerRadius: 0,
          visible: true,
          locked: false,
        }],
      }],
      selectedElementIds: ["rectangle-a"],
      selectedObject3DIds: ["museum-cube"],
    });

    render(<EditorShell />);
    const layers = screen.getByRole("listbox", { name: "Layers" });
    fireEvent.click(within(layers).getByRole("button", { name: "Lock Museum Cube" }));
    let currentPage = useEditorStore.getState().pages[0];
    expect(currentPage.elements[0].locked).toBe(true);
    expect(currentPage.objects3d?.[0].locked).toBe(true);
    expect(useEditorStore.getState().selectedElementIds).toEqual([]);
    expect(useEditorStore.getState().selectedObject3DIds).toEqual([]);

    fireEvent.click(within(layers).getByRole("button", { name: "Hide Rectangle A" }));
    currentPage = useEditorStore.getState().pages[0];
    expect(currentPage.elements[0].visible).toBe(false);
    expect(currentPage.objects3d?.[0].visible).toBe(true);
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
