import type { Material, Object3D, Texture, WebGLRenderer } from "three";

function textureValues(material: Material) {
  return Object.values(material).filter(
    (value): value is Texture =>
      Boolean(value) && typeof value === "object" && value.isTexture === true,
  );
}

export function disposeObject3D(root: Object3D) {
  const disposedTextures = new Set<Texture>();
  root.traverse((child) => {
    const renderable = child as Object3D & {
      geometry?: { dispose: () => void };
      material?: Material | Material[];
    };
    renderable.geometry?.dispose();
    const materials = Array.isArray(renderable.material)
      ? renderable.material
      : renderable.material
        ? [renderable.material]
        : [];
    for (const material of materials) {
      for (const texture of textureValues(material)) {
        if (!disposedTextures.has(texture)) {
          texture.dispose();
          disposedTextures.add(texture);
        }
      }
      material.dispose();
    }
  });
}

export function disposeRenderer(renderer: WebGLRenderer) {
  renderer.renderLists.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
}
