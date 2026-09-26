import { beforeEach, describe, expect, it } from "vitest";

import { artboardForScene } from "@/features/editor/lib/scene-background";

import {
  type ArtboardSettings,
  type EditorPage,
  useEditorStore,
} from "./editor-store";

const artboard: ArtboardSettings = {
  background: "#d9d9d9",
  backgroundSolidEnabled: true,
  cornerRadius: 10,
  height: 1080,
  width: 1920,
};

const pages: EditorPage[] = [
  { elements: [], id: "page-1", name: "Intro" },
  { elements: [], id: "page-2", name: "Space" },
];

beforeEach(() => {
  useEditorStore.setState({
    activePageId: "page-2",
    artboard,
    future: [],
    pages,
    past: [],
    selectedElementIds: [],
    selectedObject3DIds: [],
  });
});

function shown(pageId: string) {
  const state = useEditorStore.getState();
  return artboardForScene(
    state.artboard,
    state.pages.find((page) => page.id === pageId),
  );
}

describe("scene backgrounds in the editor store", () => {
  it("edits one scene's background, starting from the common one", () => {
    useEditorStore.getState().updateSceneBackground("page-2", {
      backgroundImage: "blob:sky",
      backgroundMediaType: "image",
      backgroundRotateWithCamera: true,
    });
    const state = useEditorStore.getState();
    expect(state.pages[1].background).toEqual({
      background: "#d9d9d9",
      backgroundImage: "blob:sky",
      backgroundMediaType: "image",
      backgroundRotateWithCamera: true,
      backgroundSolidEnabled: true,
    });
    expect(state.pages[0].background).toBeUndefined();
    expect(state.artboard).toBe(artboard);
    expect(shown("page-1").backgroundImage).toBeUndefined();
    expect(state.past).toHaveLength(1);

    // Turning a layer off leaves no stale key behind.
    useEditorStore.getState().updateSceneBackground("page-2", {
      backgroundMediaType: undefined,
    });
    expect(useEditorStore.getState().pages[1].background).not.toHaveProperty(
      "backgroundMediaType",
    );
  });

  it("undoes and redoes a scene background edit", () => {
    useEditorStore
      .getState()
      .updateSceneBackground("page-2", { background: "#000000" });
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().pages[1].background).toBeUndefined();
    useEditorStore.getState().redo();
    expect(shown("page-2").background).toBe("#000000");
  });

  it("makes one scene's background the common one for every scene", () => {
    useEditorStore
      .getState()
      .updateSceneBackground("page-1", { background: "#ff0000" });
    useEditorStore.getState().updateSceneBackground("page-2", {
      background: "#000000",
      backgroundRotateWithCamera: true,
    });
    useEditorStore.getState().applySceneBackgroundToAll("page-2");
    let state = useEditorStore.getState();
    expect(state.pages.every((page) => !page.background)).toBe(true);
    expect(state.artboard).toMatchObject({
      background: "#000000",
      backgroundRotateWithCamera: true,
      height: 1080,
      width: 1920,
    });
    expect(shown("page-1").background).toBe("#000000");

    // New scenes use the common background.
    useEditorStore.getState().addPage();
    state = useEditorStore.getState();
    const added = state.pages.at(-1)!;
    expect(added.background).toBeUndefined();
    expect(shown(added.id).background).toBe("#000000");

    // Nothing left to apply: no undo step is added.
    const steps = state.past.length;
    useEditorStore.getState().applySceneBackgroundToAll(added.id);
    expect(useEditorStore.getState().past).toHaveLength(steps);

    // One undo brings every scene's own background back.
    useEditorStore.getState().undo();
    useEditorStore.getState().undo();
    state = useEditorStore.getState();
    expect(state.artboard.background).toBe("#d9d9d9");
    expect(shown("page-1").background).toBe("#ff0000");
    expect(shown("page-2").background).toBe("#000000");
  });

  it("keeps scene backgrounds when the page size changes", () => {
    useEditorStore
      .getState()
      .updateSceneBackground("page-2", { background: "#000000" });
    useEditorStore.getState().updateArtboard({ height: 1920, width: 1080 });
    expect(shown("page-2")).toMatchObject({
      background: "#000000",
      height: 1920,
      width: 1080,
    });
  });

  it("adds a late poster wherever its file is shown, without an undo step", () => {
    useEditorStore.getState().updateSceneBackground("page-2", {
      backgroundMediaPreview: "",
      backgroundMediaPreviewSource: "blob:clip",
      backgroundMediaType: "video",
      backgroundVideo: "blob:clip",
    });
    useEditorStore.getState().applySceneBackgroundToAll("page-2");
    useEditorStore.getState().updateSceneBackground("page-1", {
      background: "#123456",
    });
    useEditorStore.getState().undo();
    const steps = useEditorStore.getState().past.length;

    useEditorStore
      .getState()
      .setBackgroundMediaPreview("blob:clip", "data:image/png;base64,cG9zdGVy");
    const state = useEditorStore.getState();
    expect(state.artboard.backgroundMediaPreview).toBe(
      "data:image/png;base64,cG9zdGVy",
    );
    expect(state.past).toHaveLength(steps);
    // The redo step still shows the same file, so it gets the poster too.
    expect(
      state.future[0].pages.find((page) => page.id === "page-1")?.background
        ?.backgroundMediaPreview,
    ).toBe("data:image/png;base64,cG9zdGVy");
    // Another file's background is left alone.
    useEditorStore
      .getState()
      .setBackgroundMediaPreview("blob:other", "data:image/png;base64,eA==");
    expect(useEditorStore.getState().artboard.backgroundMediaPreview).toBe(
      "data:image/png;base64,cG9zdGVy",
    );
  });
});
