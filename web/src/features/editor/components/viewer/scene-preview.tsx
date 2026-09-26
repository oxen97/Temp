import { memo, useMemo } from "react";

import { ArtboardBackground } from "@/features/editor/components/canvas/artboard-background";
import { ShapeGraphic } from "@/features/editor/components/canvas/shape-graphic";
import { Scene3DPreview } from "@/features/editor/components/viewer/scene-3d-preview";
import { useCameraSkyBackground } from "@/features/editor/hooks/use-camera-sky-background";
import { textStyleForElement } from "@/features/editor/lib/element-style";
import {
  type ArtboardSettings,
  type CanvasElement,
} from "@/features/editor/store/editor-store";
import { cameraSkyForScene } from "@/features/editor/three/camera-sky";
import type {
  Object3DElement,
  Scene3DSettings,
} from "@/features/editor/three/types";

const NO_OBJECTS_3D: Object3DElement[] = [];

// Memoized: the scene list renders one thumbnail per scene. The store keeps an
// unchanged scene's elements as the same array, so only thumbnails whose scene
// (or the shared artboard/media previews) changed are re-rendered.
export const ScenePreview = memo(function ScenePreview({
  artboard: sceneArtboard,
  elements,
  mediaPreviewSources = {},
  objects3d = NO_OBJECTS_3D,
  projectId,
  scene3d,
  sceneId,
}: {
  /** The artboard with this scene's own background (lib/scene-background). */
  artboard: ArtboardSettings;
  elements: CanvasElement[];
  mediaPreviewSources?: Record<string, string | undefined>;
  objects3d?: Object3DElement[];
  projectId: string;
  scene3d?: Partial<Scene3DSettings>;
  sceneId?: string;
}) {
  const sky = useMemo(
    () =>
      cameraSkyForScene(sceneArtboard, [...elements, ...objects3d], scene3d),
    [elements, objects3d, scene3d, sceneArtboard],
  );
  const artboard = useCameraSkyBackground(sceneArtboard, sky);
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
        <ArtboardBackground
          artboard={artboard}
          playVideo={false}
          sceneId={sceneId}
        />
        <Scene3DPreview
          artboardHeight={artboard.height}
          artboardWidth={artboard.width}
          layer="behind-2d"
          objects={objects3d}
          projectId={projectId}
          scene={scene3d}
        />
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
                <ShapeGraphic
                  element={element}
                  mediaSrc={
                    element.src && element.src in mediaPreviewSources
                      ? (mediaPreviewSources[element.src] ?? "")
                      : undefined
                  }
                  playMedia={false}
                />
              )}
            </span>
          ))}
        <Scene3DPreview
          artboardHeight={artboard.height}
          artboardWidth={artboard.width}
          layer="front-of-2d"
          objects={objects3d}
          projectId={projectId}
          scene={scene3d}
        />
      </span>
    </span>
  );
});
