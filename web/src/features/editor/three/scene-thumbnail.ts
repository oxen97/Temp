import {
  AmbientLight,
  BasicShadowMap,
  Box3,
  Color,
  DirectionalLight,
  DoubleSide,
  FrontSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from "three";

import { orthographicCameraPlacement } from "@/features/editor/three/camera-clearance";
import { spatialTransformToWorld } from "@/features/editor/three/coordinate-system";
import { createGeometry3D } from "@/features/editor/three/geometry-factory";
import { cloneModelAssetScene } from "@/features/editor/three/model-assets";
import {
  disposeObject3D,
  disposeRenderer,
} from "@/features/editor/three/resource-disposal";
import {
  resolveScene3DSettings,
  type Material3DSettings,
  type Object3DElement,
  type Scene3DSettings,
} from "@/features/editor/three/types";

export type Scene3DPreviewLayer = "behind-2d" | "front-of-2d";

export type Scene3DThumbnailRequest = {
  artboardHeight: number;
  artboardWidth: number;
  layer: Scene3DPreviewLayer;
  objects: Object3DElement[];
  projectId: string;
  scene?: Partial<Scene3DSettings>;
};

const MAX_THUMBNAIL_EDGE = 128;
const MAX_CACHE_ENTRIES = 64;
const thumbnailCache = new Map<string, string>();
const pendingThumbnails = new Map<string, Promise<string | null>>();
let renderQueue: Promise<void> = Promise.resolve();

function hashString(source: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function renderRelevantObject(object: Object3DElement) {
  return {
    castShadow: object.castShadow,
    compositeLayer: object.compositeLayer,
    dimensions: object.dimensions,
    id: object.id,
    material: object.material,
    receiveShadow: object.receiveShadow,
    source: object.source,
    transform: object.transform,
    visible: object.visible,
  };
}

export function createScene3DThumbnailKey({
  artboardHeight,
  artboardWidth,
  layer,
  objects,
  projectId,
  scene,
}: Scene3DThumbnailRequest) {
  const source = JSON.stringify({
    artboardHeight,
    artboardWidth,
    layer,
    objects: objects.map(renderRelevantObject),
    projectId,
    scene: resolveScene3DSettings(scene),
  });
  return `scene-3d:${hashString(source)}:${source.length}`;
}

function rememberThumbnail(key: string, url: string) {
  thumbnailCache.delete(key);
  thumbnailCache.set(key, url);
  while (thumbnailCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = thumbnailCache.keys().next().value;
    if (!oldestKey) break;
    thumbnailCache.delete(oldestKey);
  }
}

export function getCachedScene3DThumbnail(key: string) {
  return thumbnailCache.get(key);
}

function overrideAssetMaterials(
  object: Object3D,
  settings: Material3DSettings,
) {
  object.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    for (const material of materials) {
      const color = (material as Material & { color?: Color }).color;
      if (color) color.set(settings.color);
      if ("metalness" in material) material.metalness = settings.metalness;
      if ("roughness" in material) material.roughness = settings.roughness;
      material.opacity = settings.opacity / 100;
      material.transparent = settings.opacity < 100;
      material.side = settings.doubleSided ? DoubleSide : FrontSide;
      material.needsUpdate = true;
    }
  });
}

function applyAuthoredTransform(group: Group, object: Object3DElement) {
  const world = spatialTransformToWorld(object.transform);
  group.position.set(...world.position);
  group.rotation.set(...world.rotation);
  group.scale.set(...world.scale);
}

async function buildThumbnailObject(
  object: Object3DElement,
  projectId: string,
) {
  const group = new Group();
  group.name = object.name;
  applyAuthoredTransform(group, object);

  if (object.source.kind !== "asset") {
    const geometry = createGeometry3D(object);
    const material = new MeshStandardMaterial({
      color: object.material.color,
      metalness: object.material.metalness,
      opacity: object.material.opacity / 100,
      roughness: object.material.roughness,
      side: object.material.doubleSided ? DoubleSide : FrontSide,
      transparent: object.material.opacity < 100,
    });
    const mesh = new Mesh(geometry, material);
    mesh.castShadow = object.castShadow;
    mesh.receiveShadow = object.receiveShadow;
    group.add(mesh);
    return group;
  }

  const model = await cloneModelAssetScene(projectId, object.source.assetId);
  const bounds = new Box3().setFromObject(model, true);
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  const scale = new Vector3(
    object.dimensions.width / Math.max(0.0001, size.x),
    object.dimensions.height / Math.max(0.0001, size.y),
    object.dimensions.depth / Math.max(0.0001, size.z),
  );
  model.scale.copy(scale);
  if (object.transform.pivot === "center") {
    model.position.set(
      -center.x * scale.x,
      -center.y * scale.y,
      -center.z * scale.z,
    );
  }
  if (!object.material.useSourceMaterial) {
    overrideAssetMaterials(model, object.material);
  }
  group.add(model);
  return group;
}

function thumbnailPixelSize(artboardWidth: number, artboardHeight: number) {
  const width = Math.max(1, artboardWidth);
  const height = Math.max(1, artboardHeight);
  if (width >= height) {
    return {
      height: Math.max(1, Math.round((MAX_THUMBNAIL_EDGE * height) / width)),
      width: MAX_THUMBNAIL_EDGE,
    };
  }
  return {
    height: MAX_THUMBNAIL_EDGE,
    width: Math.max(1, Math.round((MAX_THUMBNAIL_EDGE * width) / height)),
  };
}

function createThumbnailCamera(
  artboardWidth: number,
  artboardHeight: number,
  objects: Object3DElement[],
  settings: Scene3DSettings,
) {
  const centerX = artboardWidth / 2;
  const centerY = -artboardHeight / 2;
  if (settings.projection === "orthographic") {
    const camera = new OrthographicCamera(
      -artboardWidth / 2,
      artboardWidth / 2,
      artboardHeight / 2,
      -artboardHeight / 2,
      0.1,
      100000,
    );
    const placement = orthographicCameraPlacement({
      artboardHeight,
      artboardWidth,
      objects,
      scene: settings,
    });
    camera.position.copy(placement.position);
    camera.far = placement.far;
    camera.lookAt(placement.target);
    camera.updateProjectionMatrix();
    return camera;
  }

  const perspectiveDistance =
    artboardHeight /
    (2 * Math.tan((Math.max(1, settings.perspective) * Math.PI) / 360));
  const cameraDistance =
    perspectiveDistance * Math.max(0.05, settings.cameraPosition.z / 1000);
  const camera = new PerspectiveCamera(
    settings.perspective,
    artboardWidth / Math.max(1, artboardHeight),
    0.1,
    100000,
  );
  camera.position.set(
    centerX + settings.cameraPosition.x,
    centerY - settings.cameraPosition.y,
    cameraDistance,
  );
  camera.lookAt(
    centerX + settings.cameraTarget.x,
    centerY - settings.cameraTarget.y,
    settings.cameraTarget.z,
  );
  camera.updateProjectionMatrix();
  return camera;
}

async function renderScene3DThumbnail({
  artboardHeight,
  artboardWidth,
  layer,
  objects,
  projectId,
  scene,
}: Scene3DThumbnailRequest) {
  const settings = resolveScene3DSettings(scene);
  const visibleObjects = objects.filter(
    (object) =>
      object.visible &&
      (object.compositeLayer ?? "behind-2d") === layer,
  );
  if (!settings.enabled || visibleObjects.length === 0) return null;

  const thumbnailScene = new Scene();
  let renderer: WebGLRenderer | undefined;
  try {
    const renderedObjects = await Promise.allSettled(
      visibleObjects.map((object) => buildThumbnailObject(object, projectId)),
    );
    renderedObjects.forEach((result) => {
      if (result.status === "fulfilled") thumbnailScene.add(result.value);
    });
    if (!renderedObjects.some((result) => result.status === "fulfilled")) {
      return null;
    }
    thumbnailScene.add(new AmbientLight(0xffffff, settings.ambientLight));
    const directionalLight = new DirectionalLight(0xffffff, 1.25);
    directionalLight.position.set(artboardWidth * 0.25, 0, 1000);
    directionalLight.castShadow = true;
    thumbnailScene.add(directionalLight);

    const canvas = document.createElement("canvas");
    renderer = new WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas,
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = BasicShadowMap;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(1);
    const pixelSize = thumbnailPixelSize(artboardWidth, artboardHeight);
    renderer.setSize(pixelSize.width, pixelSize.height, false);
    const camera = createThumbnailCamera(
      artboardWidth,
      artboardHeight,
      visibleObjects,
      settings,
    );
    renderer.render(thumbnailScene, camera);
    return canvas.toDataURL("image/png");
  } finally {
    for (const child of [...thumbnailScene.children]) {
      thumbnailScene.remove(child);
      disposeObject3D(child);
    }
    if (renderer) disposeRenderer(renderer);
  }
}

export function requestScene3DThumbnail(request: Scene3DThumbnailRequest) {
  const key = createScene3DThumbnailKey(request);
  const cached = getCachedScene3DThumbnail(key);
  if (cached) return Promise.resolve(cached);
  const pending = pendingThumbnails.get(key);
  if (pending) return pending;

  let resolveRequest!: (value: string | null) => void;
  const result = new Promise<string | null>((resolve) => {
    resolveRequest = resolve;
  });
  pendingThumbnails.set(key, result);
  renderQueue = renderQueue
    .catch(() => undefined)
    .then(async () => {
      try {
        const thumbnail = await renderScene3DThumbnail(request);
        if (thumbnail) rememberThumbnail(key, thumbnail);
        resolveRequest(thumbnail);
      } catch {
        resolveRequest(null);
      } finally {
        pendingThumbnails.delete(key);
      }
    });
  return result;
}

export function clearScene3DThumbnailCache() {
  thumbnailCache.clear();
}
