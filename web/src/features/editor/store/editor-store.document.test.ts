import { beforeEach, describe, expect, it } from "vitest";

import { type EditorPage, useEditorStore } from "./editor-store";

const artboard = {
  background: "#d9d9d9",
  cornerRadius: 10,
  height: 679,
  width: 1208,
};

const current: EditorPage[] = [
  { elements: [], id: "page-1", name: "Intro" },
  { elements: [], id: "page-2", name: "Middle" },
];

const opened: EditorPage[] = [
  { elements: [], id: "opened-1", name: "Opening" },
  { elements: [], id: "opened-2", name: "Ending" },
];

beforeEach(() => {
  useEditorStore.setState({
    activePageId: "page-2",
    activeTool: "rectangle",
    artboard,
    future: [],
    pages: current,
    past: [],
    selectedElementIds: ["shape-1"],
    selectedObject3DIds: ["cube-1"],
  });
});

describe("replaceDocument", () => {
  it("swaps in an opened document with nothing selected", () => {
    useEditorStore.getState().replaceDocument({
      activePageId: "opened-2",
      artboard: { ...artboard, background: "#101010", width: 1920 },
      pages: opened,
    });
    const state = useEditorStore.getState();
    expect(state.pages).toBe(opened);
    expect(state.activePageId).toBe("opened-2");
    expect(state.artboard).toMatchObject({ background: "#101010", width: 1920 });
    expect(state.activeTool).toBe("selection");
    expect(state.selectedElementIds).toEqual([]);
    expect(state.selectedObject3DIds).toEqual([]);
  });

  it("keeps the previous document one undo away", () => {
    useEditorStore.getState().replaceDocument({
      activePageId: "opened-1",
      pages: opened,
    });
    // A document without its own artboard keeps the current one.
    expect(useEditorStore.getState().artboard).toEqual(artboard);

    const pageIds = () =>
      useEditorStore.getState().pages.map((page) => page.id);
    useEditorStore.getState().undo();
    expect(pageIds()).toEqual(["page-1", "page-2"]);
    expect(useEditorStore.getState().activePageId).toBe("page-2");

    useEditorStore.getState().redo();
    expect(pageIds()).toEqual(["opened-1", "opened-2"]);
  });

  it("falls back to the first scene and ignores an empty document", () => {
    useEditorStore.getState().replaceDocument({
      activePageId: "missing",
      pages: opened,
    });
    expect(useEditorStore.getState().activePageId).toBe("opened-1");

    useEditorStore.getState().replaceDocument({ activePageId: "x", pages: [] });
    expect(useEditorStore.getState().pages).toBe(opened);
  });
});
