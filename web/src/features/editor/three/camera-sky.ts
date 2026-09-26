import {
  ClampToEdgeWrapping,
  LinearFilter,
  Mesh,
  NoColorSpace,
  PerspectiveCamera,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  type Texture,
  TextureLoader,
  Vector2,
  WebGLRenderer,
} from "three";

import { backgroundMediaType } from "@/features/editor/lib/artboard-style";
import {
  isCameraRotateInteraction,
  sceneWithCameraProjection,
} from "@/features/editor/lib/camera-rig";
import type { InteractionDefinition } from "@/features/editor/lib/interaction-model";
import type { ArtboardSettings } from "@/features/editor/store/editor-store";
import { disposeRenderer } from "@/features/editor/three/resource-disposal";
import {
  resolveScene3DSettings,
  type Scene3DSettings,
} from "@/features/editor/three/types";

/**
 * "Rotate with Camera" background.
 *
 * On a scene with Camera Rotate the background image becomes a sky around the
 * 3D camera: the image is read as a 360° × 180° (equirectangular) panorama,
 * its center straight ahead of the camera at rest. The Preview draws it in the
 * 3D layer from the live camera, so it turns with every orbit; the editor,
 * thumbnails and navigator show the same view at rest as a still picture.
 */
export type CameraSky = {
  /** Vertical field of view of the view (the camera's own in perspective). */
  fov: number;
  /** Background media opacity, 0–1. */
  opacity: number;
  src: string;
};

type CameraSkySource = {
  interactions?: InteractionDefinition[];
  visible: boolean;
};

export function sceneUsesCameraRotate(sources: readonly CameraSkySource[]) {
  return sources.some(
    (source) =>
      source.visible &&
      (source.interactions ?? []).some(isCameraRotateInteraction),
  );
}

/**
 * The sky a scene shows, or null when its background is drawn flat: the
 * option is off, the background has no image, or nothing turns the camera.
 */
export function cameraSkyForScene(
  artboard: ArtboardSettings,
  sources: readonly CameraSkySource[],
  scene3d?: Partial<Scene3DSettings>,
): CameraSky | null {
  if (
    !artboard.backgroundRotateWithCamera ||
    backgroundMediaType(artboard) !== "image" ||
    !artboard.backgroundImage
  ) {
    return null;
  }
  const visible = sources.filter((source) => source.visible);
  if (!sceneUsesCameraRotate(visible)) return null;
  // The first camera effect sets the projection; an orthographic camera has
  // no field of view of its own, so the scene's Perspective value is used.
  const scene = resolveScene3DSettings(
    sceneWithCameraProjection(scene3d, visible),
  );
  return {
    fov: Math.min(160, Math.max(1, scene.perspective)),
    opacity: Math.min(
      1,
      Math.max(0, (artboard.backgroundImageOpacity ?? 100) / 100),
    ),
    src: artboard.backgroundImage,
  };
}

const SKY_VERTEX_SHADER = /* glsl */ `
varying vec2 vScreen;

void main() {
  vScreen = position.xy;
  // A full-screen quad on the far plane: every object stays in front of it.
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

const SKY_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D map;
uniform float opacity;
uniform vec2 halfExtent;
varying vec2 vScreen;

void main() {
  // The ray through this pixel, turned into world space by the live camera.
  vec3 view = normalize(vec3(vScreen * halfExtent, -1.0));
  vec3 world = transpose(mat3(viewMatrix)) * view;
  float longitude = atan(world.x, -world.z);
  float latitude = asin(clamp(world.y, -1.0, 1.0));
  vec2 uv = vec2(
    longitude / 6.283185307179586 + 0.5,
    latitude / 3.141592653589793 + 0.5
  );
  vec4 color = texture2D(map, uv);
  gl_FragColor = vec4(color.rgb, color.a * opacity);
}
`;

/** Settings a sky texture needs: no mipmaps (no seam behind), wrap across. */
export function prepareCameraSkyTexture(texture: Texture) {
  texture.colorSpace = NoColorSpace;
  texture.generateMipmaps = false;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

const TEXTURE_TIMEOUT_MS = 20_000;

export function loadCameraSkyTexture(src: string): Promise<Texture> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("The sky image did not load.")),
      TEXTURE_TIMEOUT_MS,
    );
    new TextureLoader().load(
      src,
      (texture) => {
        clearTimeout(timeout);
        resolve(prepareCameraSkyTexture(texture));
      },
      undefined,
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

/**
 * The sky's material. The image's own colors pass straight through, so the
 * sky matches the flat background pixel for pixel.
 */
export function createCameraSkyMaterial(texture: Texture) {
  return new ShaderMaterial({
    depthTest: true,
    depthWrite: false,
    fragmentShader: SKY_FRAGMENT_SHADER,
    // Blended so a lower media opacity lets the color layers show through.
    transparent: true,
    uniforms: {
      halfExtent: { value: new Vector2(1, 1) },
      map: { value: texture },
      opacity: { value: 1 },
    },
    vertexShader: SKY_VERTEX_SHADER,
  });
}

export function setCameraSkyView(
  material: ShaderMaterial,
  { aspect, fov, opacity }: { aspect: number; fov: number; opacity: number },
) {
  const half = Math.tan((Math.min(160, Math.max(1, fov)) * Math.PI) / 360);
  (material.uniforms.halfExtent.value as Vector2).set(
    half * Math.max(0.0001, aspect),
    half,
  );
  material.uniforms.opacity.value = Math.min(1, Math.max(0, opacity));
}

/* ------------------------------------------------ the view at rest (still) */

export type CameraSkyViewRequest = {
  fov: number;
  height: number;
  src: string;
  width: number;
};

const MAX_VIEW_EDGE = 2048;
const MAX_CACHED_VIEWS = 12;
const viewCache = new Map<string, string>();
const pendingViews = new Map<string, Promise<string | null>>();
let renderQueue: Promise<void> = Promise.resolve();

function hashString(source: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/** The still for an artboard, at most 2048 px on its long side. */
export function cameraSkyViewRequest(
  sky: Pick<CameraSky, "fov" | "src">,
  artboardWidth: number,
  artboardHeight: number,
): CameraSkyViewRequest {
  const width = Math.max(1, artboardWidth);
  const height = Math.max(1, artboardHeight);
  const scale = Math.min(1, MAX_VIEW_EDGE / Math.max(width, height));
  return {
    fov: sky.fov,
    height: Math.max(1, Math.round(height * scale)),
    src: sky.src,
    width: Math.max(1, Math.round(width * scale)),
  };
}

export function cameraSkyViewKey(request: CameraSkyViewRequest) {
  return [
    hashString(request.src),
    request.src.length,
    request.fov.toFixed(3),
    `${request.width}x${request.height}`,
  ].join(":");
}

export function getCachedCameraSkyView(key: string) {
  const view = viewCache.get(key);
  if (view !== undefined) {
    // Most recently used last.
    viewCache.delete(key);
    viewCache.set(key, view);
  }
  return view;
}

function rememberView(key: string, view: string) {
  viewCache.delete(key);
  viewCache.set(key, view);
  while (viewCache.size > MAX_CACHED_VIEWS) {
    const oldest = viewCache.keys().next().value;
    if (oldest === undefined) break;
    viewCache.delete(oldest);
  }
}

async function renderCameraSkyView(request: CameraSkyViewRequest) {
  const texture = await loadCameraSkyTexture(request.src);
  const geometry = new PlaneGeometry(2, 2);
  const material = createCameraSkyMaterial(texture);
  let renderer: WebGLRenderer | undefined;
  try {
    setCameraSkyView(material, {
      aspect: request.width / request.height,
      fov: request.fov,
      opacity: 1,
    });
    const scene = new Scene();
    const sky = new Mesh(geometry, material);
    sky.frustumCulled = false;
    scene.add(sky);
    const canvas = document.createElement("canvas");
    renderer = new WebGLRenderer({
      alpha: true,
      antialias: false,
      canvas,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(1);
    renderer.setSize(request.width, request.height, false);
    renderer.setClearColor(0x000000, 0);
    // At rest the camera looks straight ahead, at the image's center.
    renderer.render(scene, new PerspectiveCamera());
    return canvas.toDataURL("image/webp", 0.92);
  } finally {
    geometry.dispose();
    material.dispose();
    texture.dispose();
    if (renderer) disposeRenderer(renderer);
  }
}

/** Renders (once per request) the sky as the camera sees it at rest. */
export function requestCameraSkyView(
  request: CameraSkyViewRequest,
): Promise<string | null> {
  const key = cameraSkyViewKey(request);
  const cached = getCachedCameraSkyView(key);
  if (cached) return Promise.resolve(cached);
  const pending = pendingViews.get(key);
  if (pending) return pending;
  let resolveView!: (view: string | null) => void;
  const result = new Promise<string | null>((resolve) => {
    resolveView = resolve;
  });
  pendingViews.set(key, result);
  renderQueue = renderQueue
    .catch(() => undefined)
    .then(async () => {
      try {
        const view = await renderCameraSkyView(request);
        rememberView(key, view);
        resolveView(view);
      } catch {
        resolveView(null);
      } finally {
        pendingViews.delete(key);
      }
    });
  return result;
}

export function clearCameraSkyViewCache() {
  viewCache.clear();
}
