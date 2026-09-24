import { type NavigatorViewport } from "@/features/editor/lib/editor-types";

/**
 * Holds the visible canvas area in artboard coordinates.
 *
 * The editor shell measures it after every zoom, pan or resize. Only the
 * navigator and the 3D scene read it, so it lives outside React state: an
 * update re-renders those two subscribers instead of the whole editor shell.
 */
export type NavigatorViewportStore = {
  getSnapshot: () => NavigatorViewport;
  subscribe: (listener: () => void) => () => void;
  /** Same contract as a React state updater: return `current` to skip. */
  update: (updater: (current: NavigatorViewport) => NavigatorViewport) => void;
};

export function createNavigatorViewportStore(
  initialViewport: NavigatorViewport,
): NavigatorViewportStore {
  let viewport = initialViewport;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => viewport,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update: (updater) => {
      const next = updater(viewport);
      if (next === viewport) return;
      viewport = next;
      listeners.forEach((listener) => listener());
    },
  };
}
