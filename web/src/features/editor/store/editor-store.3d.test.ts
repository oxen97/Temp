import { beforeEach, describe, expect, it } from "vitest";

import {
  type CanvasElement,
  useEditorStore,
} from "@/features/editor/store/editor-store";
import {
  createDefaultScene3DSettings,
  createPrimitiveObject3D,
} from "@/features/editor/three/types";

const object3d = () =>
  createPrimitiveObject3D({
    dimensions: { depth: 60, height: 80, width: 100 },
    id: "box-1",
    name: "Box 1",
    position: { x: 200, y: 150, z: 20 },
    primitive: "box",
  });

const rectangle = (): CanvasElement => ({
  cornerRadii: [1, 2, 3, 4],
  cornerRadius: 0,
  fill: "#ffffff",
  height: 60,
  id: "rectangle-1",
  locked: false,
  name: "Rectangle 1",
  opacity: 100,
  rotation: 0,
  stroke: "#000000",
  strokeWidth: 0,
  type: "rectangle",
  visible: true,
  width: 80,
  x: 100,
  y: 120,
});

beforeEach(() => {
  useEditorStore.setState({
    activePageId: "page-1",
    activeTool: "selection",
    clipboard: [],
    future: [],
    pages: [
      {
        elements: [],
        id: "page-1",
        name: "Intro",
        objects3d: [],
        scene3d: createDefaultScene3DSettings(),
      },
    ],
    past: [],
    selectedElementIds: [],
    selectedObject3DIds: [],
  });
});

describe("editor store 3D state", () => {
  it("adds an object, enables the scene, and uses exclusive 3D selection", () => {
    useEditorStore.setState({ selectedElementIds: ["shape-1"] });

    useEditorStore.getState().addObject3D(object3d());

    const state = useEditorStore.getState();
    expect(state.pages[0].objects3d).toHaveLength(1);
    expect(state.pages[0].scene3d).toMatchObject({
      enabled: true,
      projection: "orthographic",
    });
    expect(state.selectedElementIds).toEqual([]);
    expect(state.selectedObject3DIds).toEqual(["box-1"]);

    state.setSelectedElementIds(["shape-2"]);
    expect(useEditorStore.getState().selectedObject3DIds).toEqual([]);

    state.setSelectedObject3DIds(["box-1"]);
    expect(useEditorStore.getState().selectedElementIds).toEqual([]);
  });

  it("undoes and redoes 3D object creation together with scene and selection", () => {
    useEditorStore.getState().addObject3D(object3d());

    useEditorStore.getState().undo();
    let state = useEditorStore.getState();
    expect(state.pages[0].objects3d).toEqual([]);
    expect(state.pages[0].scene3d?.enabled).toBe(false);
    expect(state.selectedObject3DIds).toEqual([]);

    state.redo();
    state = useEditorStore.getState();
    expect(state.pages[0].objects3d?.[0]).toMatchObject({
      id: "box-1",
      name: "Box 1",
    });
    expect(state.pages[0].scene3d?.enabled).toBe(true);
    expect(state.selectedObject3DIds).toEqual(["box-1"]);
  });

  it("deep-copies a selected 3D object and restores the paste with undo and redo", () => {
    const source = object3d();
    useEditorStore.setState((state) => ({
      pages: state.pages.map((page) => ({
        ...page,
        objects3d: [source],
        scene3d: createDefaultScene3DSettings(),
      })),
      selectedObject3DIds: [source.id],
    }));

    useEditorStore.getState().copySelected();
    const copied = useEditorStore.getState().clipboard[0];
    expect(copied.type).toBe("object3d");
    if (copied.type !== "object3d") throw new Error("Expected a 3D object");
    expect(copied).not.toBe(source);
    expect(copied.transform).not.toBe(source.transform);
    expect(copied.source).not.toBe(source.source);

    useEditorStore.getState().pasteClipboard();
    let state = useEditorStore.getState();
    const pasted = state.pages[0].objects3d?.[1];
    expect(pasted).toMatchObject({
      locked: false,
      name: "Box 1 copy",
      transform: {
        position: { x: 216, y: 166, z: 20 },
      },
    });
    expect(pasted?.id).not.toBe(source.id);
    expect(pasted?.transform).not.toBe(copied.transform);
    expect(pasted?.source).not.toBe(copied.source);
    expect(state.pages[0].scene3d?.enabled).toBe(true);
    expect(state.selectedElementIds).toEqual([]);
    expect(state.selectedObject3DIds).toEqual([pasted?.id]);
    expect(state.past).toHaveLength(1);

    const pastedId = pasted?.id;
    state.undo();
    state = useEditorStore.getState();
    expect(state.pages[0].objects3d?.map((object) => object.id)).toEqual([
      source.id,
    ]);
    expect(state.pages[0].scene3d?.enabled).toBe(false);
    expect(state.selectedObject3DIds).toEqual([source.id]);

    state.redo();
    state = useEditorStore.getState();
    expect(state.pages[0].objects3d?.map((object) => object.id)).toEqual([
      source.id,
      pastedId,
    ]);
    expect(state.pages[0].scene3d?.enabled).toBe(true);
    expect(state.selectedObject3DIds).toEqual([pastedId]);
  });

  it("copies and pastes a mixed 2D and 3D selection together", () => {
    const element = rectangle();
    const object = object3d();
    useEditorStore.setState((state) => ({
      pages: state.pages.map((page) => ({
        ...page,
        elements: [element],
        objects3d: [object],
      })),
      selectedElementIds: [element.id],
      selectedObject3DIds: [object.id],
    }));

    useEditorStore.getState().copySelected();
    const clipboard = useEditorStore.getState().clipboard;
    expect(clipboard.map((item) => item.type)).toEqual([
      "rectangle",
      "object3d",
    ]);
    expect(clipboard[0]).not.toBe(element);
    if (clipboard[0].type === "object3d") {
      throw new Error("Expected a 2D element");
    }
    expect(clipboard[0].cornerRadii).not.toBe(element.cornerRadii);

    useEditorStore.getState().pasteClipboard();
    const state = useEditorStore.getState();
    const pastedElement = state.pages[0].elements[1];
    const pastedObject = state.pages[0].objects3d?.[1];
    expect(pastedElement).toMatchObject({
      name: "Rectangle 1 copy",
      x: 116,
      y: 136,
    });
    expect(pastedElement.id).not.toBe(element.id);
    expect(pastedElement.cornerRadii).not.toBe(clipboard[0].cornerRadii);
    expect(pastedObject).toMatchObject({
      name: "Box 1 copy",
      transform: { position: { x: 216, y: 166, z: 20 } },
    });
    expect(pastedObject?.id).not.toBe(object.id);
    expect(state.selectedElementIds).toEqual([pastedElement.id]);
    expect(state.selectedObject3DIds).toEqual([pastedObject?.id]);
  });

  it("keeps object updates isolated and restores scene settings with undo", () => {
    useEditorStore.getState().addObject3D(object3d());
    useEditorStore.getState().updateObject3D("box-1", {
      name: "Renamed box",
    });

    expect(useEditorStore.getState().pages[0].objects3d?.[0].name).toBe(
      "Renamed box",
    );

    useEditorStore.getState().updateScene3D({
      perspective: 52,
      projection: "perspective",
    });
    expect(useEditorStore.getState().pages[0].scene3d).toMatchObject({
      perspective: 52,
      projection: "perspective",
    });

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().pages[0].scene3d).toMatchObject({
      perspective: 35,
      projection: "orthographic",
    });
  });

  it("gives new pages independent default 3D scene state", () => {
    useEditorStore.getState().addPage();
    const state = useEditorStore.getState();
    const firstScene = state.pages[0].scene3d;
    const secondScene = state.pages[1].scene3d;

    expect(secondScene).toEqual(createDefaultScene3DSettings());
    expect(secondScene).not.toBe(firstScene);
    expect(state.pages[1].objects3d).toEqual([]);
    expect(state.selectedObject3DIds).toEqual([]);
  });

  it("moves 3D object centers with an artboard resize and removes unlocked selections", () => {
    const unlocked = object3d();
    const locked = {
      ...object3d(),
      id: "box-locked",
      locked: true,
    };
    useEditorStore.setState((state) => ({
      pages: state.pages.map((page) => ({
        ...page,
        objects3d: [unlocked, locked],
      })),
      selectedObject3DIds: [unlocked.id, locked.id],
    }));

    const initialArtboard = useEditorStore.getState().artboard;
    useEditorStore.getState().updateArtboard({
      height: initialArtboard.height + 40,
      width: initialArtboard.width + 100,
    });

    let objects = useEditorStore.getState().pages[0].objects3d!;
    expect(objects[0].transform.position).toMatchObject({ x: 250, y: 170 });
    expect(objects[1].transform.position).toMatchObject({ x: 250, y: 170 });

    useEditorStore.getState().removeSelected();
    objects = useEditorStore.getState().pages[0].objects3d!;
    expect(objects.map(({ id }) => id)).toEqual(["box-locked"]);
    expect(useEditorStore.getState().selectedObject3DIds).toEqual([]);
  });

  it("locks selected 3D layers together, then prevents their selection", () => {
    const first = object3d();
    const second = { ...object3d(), id: "box-2", name: "Box 2" };
    useEditorStore.setState((state) => ({
      pages: state.pages.map((page) => ({
        ...page,
        objects3d: [first, second],
      })),
      selectedObject3DIds: [first.id, second.id],
    }));

    useEditorStore.getState().toggleElementLocked(first.id);
    let objects = useEditorStore.getState().pages[0].objects3d!;
    expect(objects.map((object) => object.locked)).toEqual([true, true]);
    expect(useEditorStore.getState().selectedObject3DIds).toEqual([]);

    useEditorStore.getState().setSelectedObject3DIds([first.id, second.id]);
    expect(useEditorStore.getState().selectedObject3DIds).toEqual([]);

    useEditorStore.getState().toggleElementVisible(second.id);
    objects = useEditorStore.getState().pages[0].objects3d!;
    expect(objects.map((object) => object.visible)).toEqual([true, false]);
  });
});
