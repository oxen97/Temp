import { Minus, Plus } from "lucide-react";
import { memo } from "react";

import { ArtboardBackground } from "@/features/editor/components/canvas/artboard-background";
import { NavigatorMinimapElements } from "@/features/editor/components/canvas/navigator-minimap-elements";
import { useNavigatorViewport } from "@/features/editor/hooks/use-navigator-viewport";
import { type NavigatorViewportStore } from "@/features/editor/lib/navigator-viewport-store";
import {
  type ArtboardSettings,
  type CanvasElement,
} from "@/features/editor/store/editor-store";

const navigatorPreviewSize = { height: 104, width: 184 };

/**
 * The navigator minimap in the canvas corner. It reads the visible canvas area
 * from `viewportStore`, so a viewport change after zooming or panning only
 * re-renders this component (and the 3D scene), not the whole editor shell.
 * Memoized: its other inputs only change on zoom, content or visibility.
 */
export const EditorNavigator = memo(function EditorNavigator({
  artboard,
  elements,
  mediaPreviewSources,
  onZoomIn,
  onZoomOut,
  viewportStore,
  visible,
  zoom,
}: {
  artboard: ArtboardSettings;
  elements: CanvasElement[];
  mediaPreviewSources: Record<string, string | undefined>;
  onZoomIn: () => void;
  onZoomOut: () => void;
  viewportStore: NavigatorViewportStore;
  visible: boolean;
  zoom: number;
}) {
  const navigatorViewport = useNavigatorViewport(viewportStore);
  const navigatorWorldBounds = {
    bottom: Math.max(
      artboard.height,
      navigatorViewport.y + navigatorViewport.height,
    ),
    left: Math.min(0, navigatorViewport.x),
    right: Math.max(
      artboard.width,
      navigatorViewport.x + navigatorViewport.width,
    ),
    top: Math.min(0, navigatorViewport.y),
  };
  const navigatorWorldSize = {
    height: Math.max(1, navigatorWorldBounds.bottom - navigatorWorldBounds.top),
    width: Math.max(1, navigatorWorldBounds.right - navigatorWorldBounds.left),
  };
  const navigatorScale = Math.min(
    navigatorPreviewSize.width / navigatorWorldSize.width,
    navigatorPreviewSize.height / navigatorWorldSize.height,
  );
  const navigatorMap = {
    height: navigatorWorldSize.height * navigatorScale,
    left:
      (navigatorPreviewSize.width - navigatorWorldSize.width * navigatorScale) /
      2,
    top:
      (navigatorPreviewSize.height -
        navigatorWorldSize.height * navigatorScale) /
      2,
    width: navigatorWorldSize.width * navigatorScale,
  };
  const navigatorBoard = {
    height: artboard.height * navigatorScale,
    left: -navigatorWorldBounds.left * navigatorScale,
    top: -navigatorWorldBounds.top * navigatorScale,
    width: artboard.width * navigatorScale,
  };
  const navigatorViewportStyle = {
    height: navigatorViewport.height * navigatorScale,
    left: (navigatorViewport.x - navigatorWorldBounds.left) * navigatorScale,
    top: (navigatorViewport.y - navigatorWorldBounds.top) * navigatorScale,
    width: navigatorViewport.width * navigatorScale,
  };

  return (
    <aside
      aria-label="Navigator"
      className={`navigator interface-scale-surface ${visible ? "is-visible" : ""}`}
    >
      <span className="navigator-title">Navigator</span>
      <div className="navigator-preview">
        <div
          className="navigator-map"
          style={{
            height: navigatorMap.height,
            left: navigatorMap.left,
            top: navigatorMap.top,
            width: navigatorMap.width,
          }}
        >
          <div
            className="navigator-artboard"
            style={{
              background: "transparent",
              height: navigatorBoard.height,
              left: navigatorBoard.left,
              top: navigatorBoard.top,
              width: navigatorBoard.width,
            }}
          >
            <ArtboardBackground artboard={artboard} playVideo={false} />
            <NavigatorMinimapElements
              elements={elements}
              mediaPreviewSources={mediaPreviewSources}
              navigatorScale={navigatorScale}
            />
          </div>
          <span
            aria-hidden="true"
            className="navigator-viewport"
            style={navigatorViewportStyle}
          />
        </div>
      </div>
      <div className="navigator-zoom">
        <button aria-label="Zoom out" onClick={() => onZoomOut()} type="button">
          <Minus size={13} />
        </button>
        <strong>{Math.round(zoom)} %</strong>
        <button aria-label="Zoom in" onClick={() => onZoomIn()} type="button">
          <Plus size={13} />
        </button>
      </div>
    </aside>
  );
});
