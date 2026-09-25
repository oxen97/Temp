import { useShallow } from "zustand/shallow";

import {
  type CanvasElement,
  type EditorPage,
  type EditorState,
  useEditorStore,
} from "@/features/editor/store/editor-store";

/**
 * Store access for editor components.
 *
 * Components subscribe to the smallest slice they render from, so a store
 * change only re-renders the components whose slice actually changed.
 *
 * Zustand v5: a selector that builds a new array or object on every call
 * (map/filter/object literal) must be wrapped in `useShallow`, otherwise React
 * loops with "Maximum update depth exceeded". Selectors that return values
 * already held by the store (a page, an element, a number) need no wrapper.
 */

export function selectActivePage(state: EditorState): EditorPage | undefined {
  return (
    state.pages.find((page) => page.id === state.activePageId) ?? state.pages[0]
  );
}

/**
 * Everything the editor shell reads from the store.
 *
 * The undo/redo history and the clipboard are only exposed as sizes: the shell
 * only uses them to enable the Undo/Redo buttons and for the "N copied" status,
 * so a history-only change (for example `checkpoint()`) no longer re-renders it.
 * Actions are stable references and never trigger a re-render.
 */
export function useEditorShellStore() {
  return useEditorStore(
    useShallow((state) => ({
      activePageId: state.activePageId,
      activeTool: state.activeTool,
      addElement: state.addElement,
      addInteraction: state.addInteraction,
      addObject3D: state.addObject3D,
      addPage: state.addPage,
      artboard: state.artboard,
      checkpoint: state.checkpoint,
      clipboardLength: state.clipboard.length,
      copySelected: state.copySelected,
      futureLength: state.future.length,
      pages: state.pages,
      pasteClipboard: state.pasteClipboard,
      pastLength: state.past.length,
      redo: state.redo,
      removeInteraction: state.removeInteraction,
      removePage: state.removePage,
      removeSelected: state.removeSelected,
      replaceElements: state.replaceElements,
      renameElement: state.renameElement,
      renamePage: state.renamePage,
      replaceDocument: state.replaceDocument,
      selectedElementIds: state.selectedElementIds,
      selectedObject3DIds: state.selectedObject3DIds,
      selectedShape: state.selectedShape,
      setActivePageId: state.setActivePageId,
      setActiveTool: state.setActiveTool,
      setPageLogicRules: state.setPageLogicRules,
      setSelectedElementIds: state.setSelectedElementIds,
      setSelectedItems: state.setSelectedItems,
      setSelectedObject3DIds: state.setSelectedObject3DIds,
      setSelectedShape: state.setSelectedShape,
      setZoom: state.setZoom,
      toggleElementLocked: state.toggleElementLocked,
      toggleElementVisible: state.toggleElementVisible,
      undo: state.undo,
      updateArtboard: state.updateArtboard,
      updateAdvancedSound: state.updateAdvancedSound,
      updateBackgroundMusic: state.updateBackgroundMusic,
      updateElement: state.updateElement,
      updateElements: state.updateElements,
      updateInteraction: state.updateInteraction,
      updateObject3D: state.updateObject3D,
      updateSoundMixer: state.updateSoundMixer,
      zoom: state.zoom,
    })),
  );
}

/*
 * Slice hooks for panels and canvas pieces that subscribe on their own.
 * New panels (for example the redesigned Interaction tab) should be built on
 * hooks like these instead of receiving the whole document through props.
 */

/** IDs of the active scene's 2D elements; changes only on add/remove/reorder. */
export function useActiveElementIds(): string[] {
  return useEditorStore(
    useShallow(
      (state) =>
        selectActivePage(state)?.elements.map((element) => element.id) ?? [],
    ),
  );
}

/** One element of the active scene; re-renders only when that element changes. */
export function useCanvasElement(elementId: string): CanvasElement | undefined {
  return useEditorStore((state) =>
    selectActivePage(state)?.elements.find(
      (element) => element.id === elementId,
    ),
  );
}

/** Whether one 2D element is selected; re-renders only when that answer flips. */
export function useIsElementSelected(elementId: string): boolean {
  return useEditorStore((state) =>
    state.selectedElementIds.includes(elementId),
  );
}

/** Undo/redo availability without subscribing to the history arrays. */
export function useHistoryAvailability() {
  return useEditorStore(
    useShallow((state) => ({
      canRedo: state.future.length > 0,
      canUndo: state.past.length > 0,
    })),
  );
}
