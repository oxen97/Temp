"use client";

import { useEffect, useMemo, useState } from "react";

import type { ArtboardSettings } from "@/features/editor/store/editor-store";
import {
  type CameraSky,
  cameraSkyViewKey,
  cameraSkyViewRequest,
  getCachedCameraSkyView,
  requestCameraSkyView,
} from "@/features/editor/three/camera-sky";

const RENDER_DEBOUNCE_MS = 120;

/**
 * The artboard as the editor draws it. With "Rotate with Camera" in effect,
 * the flat background image is replaced by the sky as the Preview camera sees
 * it at rest, so the canvas, thumbnails and navigator match the Preview's
 * first frame. The image layer waits for that still instead of flashing the
 * whole panorama; if the still cannot be made, the flat image is kept.
 */
export function useCameraSkyBackground(
  artboard: ArtboardSettings,
  sky: CameraSky | null,
): ArtboardSettings {
  const src = sky?.src;
  const fov = sky?.fov;
  const request = useMemo(
    () =>
      src === undefined || fov === undefined
        ? null
        : cameraSkyViewRequest({ fov, src }, artboard.width, artboard.height),
    [artboard.height, artboard.width, fov, src],
  );
  const key = request ? cameraSkyViewKey(request) : null;
  const [rendered, setRendered] = useState<{
    key: string;
    view: string | null;
  } | null>(null);
  const cached = key ? getCachedCameraSkyView(key) : undefined;
  const view =
    cached ?? (key && rendered?.key === key ? rendered.view : undefined);

  useEffect(() => {
    if (!request || !key || getCachedCameraSkyView(key)) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      void requestCameraSkyView(request).then((next) => {
        if (active) setRendered({ key, view: next });
      });
    }, RENDER_DEBOUNCE_MS);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [key, request]);

  return useMemo(() => {
    // Off, or the still could not be made: draw the image flat.
    if (!request || view === null) return artboard;
    return {
      ...artboard,
      backgroundImage: view,
      backgroundImageFit: "stretch",
      backgroundMediaPreview: view,
      backgroundMediaPreviewSource: view,
    };
  }, [artboard, request, view]);
}
