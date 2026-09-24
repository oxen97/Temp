import { beforeEach, describe, expect, it } from "vitest";

import {
  hydrateEditorDocument,
  serializeEditorDocument,
} from "@/core/project/editor-document";
import { createDefaultInteraction } from "@/features/editor/lib/interaction-model";
import { createSceneLogicRule } from "@/features/editor/lib/scene-logic";
import { createVectorObject3DFromElement } from "@/features/editor/three/object-factory";
import {
  type CanvasElement,
  useEditorStore,
} from "@/features/editor/store/editor-store";

const shape = (id: string): CanvasElement => ({
  cornerRadius: 0,
  fill: "#ffffff",
  height: 80,
  id,
  locked: false,
  name: id,
  opacity: 100,
  rotation: 0,
  stroke: "transparent",
  strokeWidth: 0,
  type: "rectangle",
  visible: true,
  width: 120,
  x: 0,
  y: 0,
});

const elementInteractions = (elementId: string) =>
  useEditorStore
    .getState()
    .pages[0].elements.find((element) => element.id === elementId)
    ?.interactions;

beforeEach(() => {
  useEditorStore.setState({
    activePageId: "page-1",
    activeTool: "selection",
    future: [],
    pages: [{ elements: [shape("shape-1")], id: "page-1", name: "Intro" }],
    past: [],
    selectedElementIds: [],
    selectedObject3DIds: [],
  });
});

describe("editor store interactions", () => {
  it("authors 3D interactions with undo, redo, document persistence, and removal", () => {
    const object = createVectorObject3DFromElement({ element: shape("template"), id: "model" });
    useEditorStore.setState((state) => ({
      pages: state.pages.map((page) => ({ ...page, objects3d: [object] })),
    }));
    const interactions = () => useEditorStore.getState().pages[0].objects3d?.[0].interactions;
    useEditorStore.getState().addInteraction("model", createDefaultInteraction({ id: "bend", effect: "strand-bend", trigger: "drag" }));
    useEditorStore.getState().updateInteraction("model", "bend", { strandMaxDisplacement: 85, strandAnchor: "bottom" });
    expect(interactions()?.[0]).toMatchObject({ strandMaxDisplacement: 85, strandAnchor: "bottom" });
    useEditorStore.getState().undo();
    expect(interactions()?.[0].strandMaxDisplacement).not.toBe(85);
    useEditorStore.getState().redo();
    expect(interactions()?.[0].strandMaxDisplacement).toBe(85);
    const state = useEditorStore.getState();
    const restored = hydrateEditorDocument(serializeEditorDocument({
      artboard: state.artboard,
      id: "3d-project",
      name: "3D project",
      pages: state.pages,
    }));
    expect(restored.pages[0].objects3d?.[0].interactions?.[0]).toMatchObject({ id: "bend", strandMaxDisplacement: 85, strandAnchor: "bottom" });
    expect(elementInteractions("shape-1")).toBeUndefined();
    useEditorStore.getState().setInteractions("model", [createDefaultInteraction({ id: "wave", effect: "wave-deform" })]);
    expect(interactions()?.map((interaction) => interaction.id)).toEqual(["wave"]);
    useEditorStore.getState().removeInteraction("model", "wave");
    expect(interactions()).toEqual([]);
    useEditorStore.getState().undo();
    expect(interactions()?.[0].id).toBe("wave");
  });

  it("stores page routes in undo history", () => {
    const rule = createSceneLogicRule({
      id: "intro-next",
      objectId: "shape-1",
      interactionId: "next-click",
      targetPageId: "gallery",
    });
    useEditorStore.getState().setPageLogicRules("page-1", [rule]);
    expect(useEditorStore.getState().pages[0].logicRules).toEqual([rule]);
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().pages[0].logicRules).toBeUndefined();
    useEditorStore.getState().redo();
    expect(useEditorStore.getState().pages[0].logicRules).toEqual([rule]);
  });

  it("adds an interaction to an element", () => {
    useEditorStore
      .getState()
      .addInteraction("shape-1", createDefaultInteraction({ id: "int-1" }));
    expect(elementInteractions("shape-1")).toHaveLength(1);
    expect(elementInteractions("shape-1")?.[0].id).toBe("int-1");
  });

  it("updates a single interaction by id", () => {
    useEditorStore
      .getState()
      .addInteraction("shape-1", createDefaultInteraction({ id: "int-1" }));
    useEditorStore
      .getState()
      .addInteraction("shape-1", createDefaultInteraction({ id: "int-2" }));
    useEditorStore
      .getState()
      .updateInteraction("shape-1", "int-2", { trigger: "hover", moveX: 250 });
    const list = elementInteractions("shape-1");
    expect(list?.[0].trigger).toBe("click-tap");
    expect(list?.[1].trigger).toBe("hover");
    expect(list?.[1].moveX).toBe(250);
  });

  it("undoes and redoes an interaction edit without changing another interaction", () => {
    useEditorStore
      .getState()
      .setInteractions("shape-1", [
        createDefaultInteraction({ id: "int-1", moveX: 10 }),
        createDefaultInteraction({ id: "int-2", moveX: 20 }),
      ]);
    useEditorStore
      .getState()
      .updateInteraction("shape-1", "int-2", { moveX: 250 });

    expect(elementInteractions("shape-1")?.map((entry) => entry.moveX)).toEqual(
      [10, 250],
    );
    useEditorStore.getState().undo();
    expect(elementInteractions("shape-1")?.map((entry) => entry.moveX)).toEqual(
      [10, 20],
    );
    useEditorStore.getState().redo();
    expect(elementInteractions("shape-1")?.map((entry) => entry.moveX)).toEqual(
      [10, 250],
    );
  });

  it("does not record an edit when the target interaction is missing", () => {
    const before = useEditorStore.getState();
    before.updateInteraction("shape-1", "missing", { moveX: 250 });
    expect(useEditorStore.getState()).toBe(before);
  });

  it("clones nested interaction data in undo snapshots", () => {
    useEditorStore
      .getState()
      .addInteraction(
        "shape-1",
        createDefaultInteraction({ id: "int-1", stackObstacleIds: ["first"] }),
      );
    useEditorStore.getState().checkpoint();
    elementInteractions("shape-1")?.[0].stackObstacleIds.push("later");

    useEditorStore.getState().undo();
    expect(elementInteractions("shape-1")?.[0].stackObstacleIds).toEqual([
      "first",
    ]);
  });

  it("removes an interaction by id", () => {
    useEditorStore
      .getState()
      .addInteraction("shape-1", createDefaultInteraction({ id: "int-1" }));
    useEditorStore
      .getState()
      .addInteraction("shape-1", createDefaultInteraction({ id: "int-2" }));
    useEditorStore.getState().removeInteraction("shape-1", "int-1");
    const list = elementInteractions("shape-1");
    expect(list).toHaveLength(1);
    expect(list?.[0].id).toBe("int-2");
  });

  it("replaces all interactions", () => {
    useEditorStore
      .getState()
      .addInteraction("shape-1", createDefaultInteraction({ id: "int-1" }));
    useEditorStore
      .getState()
      .setInteractions("shape-1", [
        createDefaultInteraction({ id: "int-a" }),
        createDefaultInteraction({ id: "int-b" }),
      ]);
    expect(elementInteractions("shape-1")?.map((entry) => entry.id)).toEqual([
      "int-a",
      "int-b",
    ]);
  });

  it("undoes an added interaction", () => {
    useEditorStore
      .getState()
      .addInteraction("shape-1", createDefaultInteraction({ id: "int-1" }));
    useEditorStore.getState().undo();
    expect(elementInteractions("shape-1") ?? []).toHaveLength(0);
  });

  it("persists interactions through the project document round trip", () => {
    useEditorStore.getState().addInteraction(
      "shape-1",
      createDefaultInteraction({
        id: "int-1",
        moveX: 42,
        name: "Move on click",
      }),
    );
    const state = useEditorStore.getState();
    const document = serializeEditorDocument({
      artboard: state.artboard,
      id: "project-1",
      name: "Project",
      pages: state.pages,
    });
    const restored = hydrateEditorDocument(document).pages[0].elements.find(
      (element) => element.id === "shape-1",
    );
    expect(restored?.interactions).toHaveLength(1);
    expect(restored?.interactions?.[0]).toMatchObject({
      id: "int-1",
      moveX: 42,
      name: "Move on click",
    });
  });
});
