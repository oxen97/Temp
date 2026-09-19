import { beforeEach, describe, expect, it } from "vitest";

import { useEditorStore } from "@/features/editor/store/editor-store";
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

beforeEach(() => {
  useEditorStore.setState({
    activePageId: "page-1",
    activeTool: "selection",
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
});
