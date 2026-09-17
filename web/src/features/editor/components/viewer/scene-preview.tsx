import { ArtboardBackground } from "@/features/editor/components/canvas/artboard-background";
import { ShapeGraphic } from "@/features/editor/components/canvas/shape-graphic";
import { textStyleForElement } from "@/features/editor/lib/element-style";
import {
  type ArtboardSettings,
  type CanvasElement,
} from "@/features/editor/store/editor-store";

export function ScenePreview({
  artboard,
  elements,
}: {
  artboard: ArtboardSettings;
  elements: CanvasElement[];
}) {
  const previewSize = 49;
  const scale = Math.max(
    previewSize / artboard.width,
    previewSize / artboard.height,
  );
  const offsetX = (previewSize - artboard.width * scale) / 2;
  const offsetY = (previewSize - artboard.height * scale) / 2;

  return (
    <span className="scene-thumbnail">
      <span
        aria-hidden="true"
        className="scene-preview-world"
        style={{
          height: artboard.height,
          left: offsetX,
          top: offsetY,
          transform: `scale(${scale})`,
          width: artboard.width,
        }}
      >
        <ArtboardBackground artboard={artboard} playVideo={false} />
        {elements
          .filter((element) => element.visible)
          .map((element) => (
            <span
              className={`scene-preview-element preview-${element.type}`}
              key={element.id}
              style={{
                height: element.height,
                left: element.x,
                opacity: element.opacity / 100,
                top: element.y,
                transform: `rotate(${element.rotation}deg)`,
                transformOrigin: "center",
                width: element.width,
              }}
            >
              {element.type === "text" ? (
                <span
                  className="text-shape"
                  style={textStyleForElement(element)}
                >
                  {element.text}
                </span>
              ) : (
                <ShapeGraphic element={element} />
              )}
            </span>
          ))}
      </span>
    </span>
  );
}
