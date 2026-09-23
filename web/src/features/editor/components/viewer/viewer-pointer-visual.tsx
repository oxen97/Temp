import { memo, useLayoutEffect, useRef } from "react";

import {
  composeFilter,
  composeTransform,
  IDLE_RUNTIME_STATE,
  runtimeVisualForElement,
} from "@/features/editor/lib/interaction-runtime";
import type { ViewerWaveClock } from "@/features/editor/lib/viewer-wave-clock";
import type { CanvasElement } from "@/features/editor/store/editor-store";

const pointerVisualEffects = new Set([
  "move",
  "rotate",
  "scale",
  "skew",
  "opacity",
  "show-hide",
  "blur",
  "shadow",
]);

/** Conservative fast path: independent pointer visuals and navigation events
 * need no shared collision/drop/physics state. Complex scenes retain the
 * full runtime path; no demo IDs or authored values are special-cased. */
export function isolatedPointerVisualIds(
  elements: CanvasElement[],
): Set<string> {
  const enabled = (element: CanvasElement) =>
    (element.interactions ?? []).filter((entry) => entry.enabled !== false);
  const independent = elements.every((element) =>
    enabled(element).every(
      (entry) =>
        (entry.trigger === "click-tap" && entry.effect === "emit-event") ||
        (entry.trigger === "pointer-move" &&
          (entry.effect === "wave-deform" ||
            pointerVisualEffects.has(entry.effect)) &&
          (entry.motion === "direct" || entry.motion === "spring")),
    ),
  );
  if (!independent) return new Set();
  const waveTargets = new Set(
    elements.flatMap((element) =>
      enabled(element).flatMap((entry) =>
        entry.effect === "wave-deform" ? (entry.waveTargetIds ?? []) : [],
      ),
    ),
  );
  return new Set(
    elements
      .filter((element) => {
        const interactions = enabled(element);
        return (
          !waveTargets.has(element.id) &&
          interactions.length > 0 &&
          interactions.every(
            (entry) =>
              entry.trigger === "pointer-move" &&
              pointerVisualEffects.has(entry.effect),
          )
        );
      })
      .map((element) => element.id),
  );
}

/** Reuses the canonical visual computation; only its delivery is imperative.
 * The parent still owns authored dimensions, transition, hit targets and input. */
export const ViewerPointerVisual = memo(function ViewerPointerVisual({
  element,
  clock,
}: {
  element: CanvasElement;
  clock: ViewerWaveClock;
}) {
  const marker = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const node = marker.current?.parentElement;
    if (!node) return;
    return clock.subscribePointer((pointer) => {
      const visual = runtimeVisualForElement(
        element.interactions,
        IDLE_RUNTIME_STATE,
        {
          pointer,
          center: {
            x: element.x + element.width / 2,
            y: element.y + element.height / 2,
          },
        },
      );
      node.style.transform = composeTransform(element.rotation, visual);
      node.style.opacity = String(visual.opacity ?? element.opacity / 100);
      node.style.filter = composeFilter(visual) ?? "";
    });
  }, [element, clock]);
  return <span aria-hidden="true" ref={marker} style={{ display: "none" }} />;
});
