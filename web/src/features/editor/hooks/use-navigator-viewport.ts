import { useLayoutEffect, useState } from "react";

import { type NavigatorViewport } from "@/features/editor/lib/editor-types";
import { type NavigatorViewportStore } from "@/features/editor/lib/navigator-viewport-store";

/**
 * Reads the visible canvas area from the shell's viewport store.
 *
 * Subscribes in a layout effect: subscribers mount together with the editor
 * shell, whose layout effect measures the viewport after theirs has run, and a
 * store update made during layout re-renders them before the browser paints —
 * the same timing the navigator had when this value was editor-shell state.
 */
export function useNavigatorViewport(
  store: NavigatorViewportStore,
): NavigatorViewport {
  const [viewport, setViewport] = useState(store.getSnapshot);
  useLayoutEffect(
    () => store.subscribe(() => setViewport(store.getSnapshot())),
    [store],
  );
  return viewport;
}
