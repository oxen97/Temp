import { memo, useLayoutEffect, useRef } from "react";

import { ShapeGraphic } from "@/features/editor/components/canvas/shape-graphic";
import type { InteractionDefinition } from "@/features/editor/lib/interaction-model";
import type { RuntimeVisual } from "@/features/editor/lib/interaction-runtime";
import {
  bendOpenPath,
  type StrandBendVisual,
} from "@/features/editor/lib/strand-bend";
import { pathData } from "@/features/editor/lib/vector-path";
import {
  viewerPointToElementLocal,
  waveDeformedPaths,
} from "@/features/editor/lib/viewer-generated-effects";
import type { ViewerWaveClock } from "@/features/editor/lib/viewer-wave-clock";
import type { CanvasElement } from "@/features/editor/store/editor-store";

/** ShapeGraphic still owns appearance, stroke, hit areas and editing semantics.
 * Only animated path geometry is updated here, once per shared display frame. */
export const ViewerWaveGraphic = memo(function ViewerWaveGraphic({
  element,
  interaction,
  visual,
  clock,
  artboardWidth,
  artboardHeight,
  elementIndex,
  strandBend,
  strandPathData,
  strandRibbonPathData,
}: {
  element: CanvasElement;
  interaction: InteractionDefinition;
  visual: RuntimeVisual;
  clock: ViewerWaveClock;
  artboardWidth: number;
  artboardHeight: number;
  elementIndex: number;
  strandBend?: StrandBendVisual;
  strandPathData?: string;
  strandRibbonPathData?: string;
}) {
  const rootRef = useRef<HTMLSpanElement>(null);
  // A wave-driven line needs SVG paths rather than the static <line> branch.
  const initialPath =
    element.type === "line"
      ? (strandPathData ??
        `M 0 ${element.height / 2} L ${element.width} ${element.height / 2}`)
      : strandPathData;
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const hitPaths = root.querySelectorAll<SVGPathElement>(
      element.type === "pen" ? ".pen-hit-area" : ".strand-hit-area",
    );
    const visiblePaths = root.querySelectorAll<SVGPathElement>(
      element.type === "pen" ? ".pen-visible-path" : ".strand-visible-path",
    );
    const previous: string[] = [];
    return clock.subscribe((frame) => {
      const pointer = frame.pointer ?? {
        x: artboardWidth / 2,
        y: artboardHeight / 2,
      };
      const paths = waveDeformedPaths(
        element,
        interaction,
        viewerPointToElementLocal(pointer, element, visual),
        {
          x: (pointer.x / Math.max(1, artboardWidth) - 0.5) * 2,
          y: (pointer.y / Math.max(1, artboardHeight) - 0.5) * 2,
        },
        frame.seconds,
        frame.strength,
        elementIndex,
      );
      for (const [index, path] of paths.entries()) {
        // Preserve the existing first-path override and combined strand bend.
        const rendered =
          element.type === "pen" && strandBend && !strandPathData
            ? bendOpenPath(path, strandBend)
            : path;
        const d =
          index === 0 && strandPathData
            ? strandPathData
            : pathData(rendered.points, rendered.closed);
        if (d === previous[index]) continue;
        previous[index] = d;
        hitPaths[index]?.setAttribute("d", d);
        visiblePaths[index]?.setAttribute("d", d);
      }
    });
  }, [
    element,
    interaction,
    visual,
    clock,
    artboardWidth,
    artboardHeight,
    elementIndex,
    strandBend,
    strandPathData,
  ]);
  return (
    <span ref={rootRef} style={{ display: "contents" }}>
      <ShapeGraphic
        element={element}
        strandBend={strandBend}
        strandPathData={initialPath}
        strandRibbonPathData={strandRibbonPathData}
      />
    </span>
  );
});
