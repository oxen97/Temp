import { beforeEach, describe, expect, it } from "vitest";

import {
  hydrateEditorDocument,
  serializeEditorDocument,
} from "@/core/project/editor-document";
import { createDefaultInteraction } from "@/features/editor/lib/interaction-model";
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
    useEditorStore
      .getState()
      .addInteraction(
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
