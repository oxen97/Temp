"use client";

import { Box } from "lucide-react";
import {
  AmbientLight,
  Box3,
  DirectionalLight,
  OrthographicCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { useEffect, useState } from "react";

import {
  disposeObject3D,
  disposeRenderer,
} from "@/features/editor/three/resource-disposal";
import { cloneModelAssetScene } from "@/features/editor/three/model-assets";

const THUMBNAIL_SIZE = 128;
const thumbnailCache = new Map<string, string>();
let renderQueue: Promise<void> = Promise.resolve();

async function renderModelThumbnail(projectId: string, assetId: string) {
  const model = await cloneModelAssetScene(projectId, assetId);
  let renderer: WebGLRenderer | undefined;
  try {
    const bounds = new Box3().setFromObject(model, true);
    if (bounds.isEmpty()) return null;

    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    model.position.sub(center);

    const scene = new Scene();
    scene.add(model);
    scene.add(new AmbientLight(0xffffff, 1));
    const light = new DirectionalLight(0xffffff, 1.25);
    light.position.set(-1, 0, 2);
    scene.add(light);

    // Match the artboard's default front-facing orthographic camera. The model
    // already contains any authored rotation, so adding a thumbnail-only orbit
    // would show a different angle from the object placed on the canvas.
    const extent = Math.max(size.x, size.y, 0.01) * 0.62;
    const camera = new OrthographicCamera(
      -extent,
      extent,
      extent,
      -extent,
      0.01,
      10000,
    );
    camera.position.set(0, 0, Math.max(size.z * 2, extent * 4));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    const canvas = document.createElement("canvas");
    renderer = new WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, false);
    renderer.render(scene, camera);
    return canvas.toDataURL("image/png");
  } finally {
    if (renderer) disposeRenderer(renderer);
    disposeObject3D(model);
  }
}

export function ModelAssetThumbnail({
  assetId,
  projectId,
}: {
  assetId: string;
  projectId: string;
}) {
  const key = `${projectId}:${assetId}`;
  const [rendered, setRendered] = useState<{ key: string; url: string } | null>(
    null,
  );
  const image =
    thumbnailCache.get(key) ??
    (rendered?.key === key ? rendered.url : undefined);

  useEffect(() => {
    let active = true;
    if (thumbnailCache.has(key)) return;

    // Serializing short renders avoids creating many WebGL contexts when several
    // models are imported at once.
    renderQueue = renderQueue
      .catch(() => undefined)
      .then(async () => {
        if (!active) return;
        try {
          const preview = await renderModelThumbnail(projectId, assetId);
          if (!preview) return;
          thumbnailCache.set(key, preview);
          if (active) setRendered({ key, url: preview });
        } catch {
          // A missing WebGL context still leaves a usable, labeled asset tile.
        }
      });
    return () => {
      active = false;
    };
  }, [assetId, key, projectId]);

  return (
    <span
      aria-hidden="true"
      className="uploaded-asset-thumbnail"
      data-preview-state={image ? "ready" : "fallback"}
      data-testid="model-thumbnail"
      style={image ? { backgroundImage: `url("${image}")` } : undefined}
    >
      {image ? null : <Box size={22} strokeWidth={1.25} />}
    </span>
  );
}
