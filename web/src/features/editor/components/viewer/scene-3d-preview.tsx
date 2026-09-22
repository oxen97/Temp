"use client";

import { useEffect, useMemo, useState } from "react";

import {
  createScene3DThumbnailKey,
  getCachedScene3DThumbnail,
  requestScene3DThumbnail,
  type Scene3DPreviewLayer,
} from "@/features/editor/three/scene-thumbnail";
import {
  resolveScene3DSettings,
  type Object3DElement,
  type Scene3DSettings,
} from "@/features/editor/three/types";

const RENDER_DEBOUNCE_MS = 120;

export function Scene3DPreview({
  artboardHeight,
  artboardWidth,
  layer,
  objects,
  projectId,
  scene,
}: {
  artboardHeight: number;
  artboardWidth: number;
  layer: Scene3DPreviewLayer;
  objects: Object3DElement[];
  projectId: string;
  scene?: Partial<Scene3DSettings>;
}) {
  const visibleObjects = useMemo(
    () =>
      objects.filter(
        (object) =>
          object.visible &&
          (object.compositeLayer ?? "behind-2d") === layer,
      ),
    [layer, objects],
  );
  const request = useMemo(
    () => ({
      artboardHeight,
      artboardWidth,
      layer,
      objects: visibleObjects,
      projectId,
      scene,
    }),
    [
      artboardHeight,
      artboardWidth,
      layer,
      projectId,
      scene,
      visibleObjects,
    ],
  );
  const key = useMemo(() => createScene3DThumbnailKey(request), [request]);
  const [rendered, setRendered] = useState<{ key: string; url: string } | null>(
    null,
  );
  const cached = getCachedScene3DThumbnail(key);
  const preview = cached ?? (rendered?.key === key ? rendered.url : undefined);
  const enabled =
    resolveScene3DSettings(scene).enabled && visibleObjects.length > 0;

  useEffect(() => {
    if (!enabled || getCachedScene3DThumbnail(key)) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      requestScene3DThumbnail(request).then((url) => {
        if (!active || !url) return;
        setRendered({ key, url });
      });
    }, RENDER_DEBOUNCE_MS);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [enabled, key, request]);

  if (!enabled) return null;
  return (
    <span
      aria-hidden="true"
      className={`scene-preview-3d scene-preview-3d--${layer}`}
      data-preview-state={preview ? "ready" : "loading"}
      data-testid={`scene-3d-preview-${layer}`}
      style={
        preview
          ? {
              backgroundImage: `url("${preview}")`,
              height: artboardHeight,
              width: artboardWidth,
            }
          : { height: artboardHeight, width: artboardWidth }
      }
    />
  );
}
