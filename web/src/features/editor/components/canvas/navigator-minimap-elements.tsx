import { memo } from "react";

import { ShapeGraphic } from "@/features/editor/components/canvas/shape-graphic";
import { type CanvasElement } from "@/features/editor/store/editor-store";

/**
 * The element previews inside the navigator minimap. Memoized: selection, tool
 * and panel changes re-render the editor shell but leave the elements, the
 * navigator scale and the media previews unchanged, so the minimap is skipped.
 */
export const NavigatorMinimapElements = memo(function NavigatorMinimapElements({
  elements,
  mediaPreviewSources,
  navigatorScale,
}: {
  elements: CanvasElement[];
  mediaPreviewSources: Record<string, string | undefined>;
  navigatorScale: number;
}) {
  return (
    <>
      {elements.map((element) => {
        if (!element.visible) return null;
        return (
          <div
            className="navigator-element"
            key={element.id}
            style={{
              height: element.height * navigatorScale,
              left: element.x * navigatorScale,
              opacity: element.opacity / 100,
              top: element.y * navigatorScale,
              transform: `rotate(${element.rotation}deg)`,
              transformOrigin: "center",
              width: element.width * navigatorScale,
            }}
          >
            {element.type === "text" ? (
              <span className="navigator-text">{element.text}</span>
            ) : (
              <ShapeGraphic
                element={element}
                imageScale={navigatorScale}
                mediaSrc={
                  element.src && element.src in mediaPreviewSources
                    ? (mediaPreviewSources[element.src] ?? "")
                    : undefined
                }
                playMedia={false}
              />
            )}
          </div>
        );
      })}
    </>
  );
});
