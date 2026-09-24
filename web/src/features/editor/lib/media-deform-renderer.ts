import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  DynamicDrawUsage,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  Vector2,
  Vector4,
  WebGLRenderer,
} from "three";

import type { CanvasElement } from "../store/editor-store";
import {
  MEDIA_DEFORM_MAX_CANVAS_EDGE,
  mediaDeformCanvasSize,
  type MediaDeformBounds,
  type MediaDeformMesh,
} from "./media-deform";

// Each object retains its DOM stacking position, but all objects share ONE
// WebGL context. A synchronous 2D copy preserves alpha before the next draw.
// Allocate only on the client after a usable source is available.
let shared: { renderer: WebGLRenderer; users: number } | null = null;
const sourceTextures = new WeakMap<
  HTMLImageElement | HTMLVideoElement,
  { texture: Texture; users: number; time: number }
>();
const decodedVideoFrames = new WeakMap<HTMLVideoElement, number>();

/** Three's video upload path uses decoded video dimensions and texImage2D.
 * A plain Texture(video) takes the static-image allocation path (zero HTML
 * width/height), producing black pixels. This keeps the public VideoTexture
 * protocol while our shared decoder clock owns updates and cleanup. */
class ClockedVideoTexture extends Texture {
  readonly isVideoTexture = true;
  update() {
    /* acquireMediaDeformTexture.update owns decoded-frame uploads. */
  }
}

/** A decoder callback, not a continuously changing playback clock, determines
 * when a shared video texture needs a new upload. */
export function markMediaDeformVideoFrame(source: HTMLVideoElement) {
  decodedVideoFrames.set(source, (decodedVideoFrames.get(source) ?? 0) + 1);
}

/** A source shared by its ordinary mesh and several bridges uploads once. */
export function acquireMediaDeformTexture(
  source: HTMLImageElement | HTMLVideoElement,
) {
  let entry = sourceTextures.get(source);
  if (!entry) {
    const texture =
      source instanceof HTMLVideoElement
        ? new ClockedVideoTexture(source)
        : new Texture(source);
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    entry = { texture, users: 0, time: -1 };
    sourceTextures.set(source, entry);
  }
  const resource = entry;
  resource.users += 1;
  let released = false;
  return {
    texture: resource.texture,
    update() {
      if (released) return;
      if (source instanceof HTMLVideoElement && source.readyState >= 2) {
        const frame = decodedVideoFrames.get(source) ?? source.currentTime;
        if (resource.time !== frame) {
          resource.time = frame;
          resource.texture.needsUpdate = true;
        }
      }
    },
    release() {
      if (released) return;
      released = true;
      resource.users -= 1;
      if (!resource.users) {
        resource.texture.dispose();
        sourceTextures.delete(source);
      }
    },
  };
}

export function acquireMediaDeformGpu() {
  if (!shared) {
    const renderer = new WebGLRenderer({
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(1);
    renderer.setSize(
      MEDIA_DEFORM_MAX_CANVAS_EDGE,
      MEDIA_DEFORM_MAX_CANVAS_EDGE,
      false,
    );
    renderer.setClearColor(0x000000, 0);
    renderer.setScissorTest(true);
    shared = { renderer, users: 0 };
  }
  const resource = shared;
  resource.users += 1;
  let released = false;
  return {
    renderer: resource.renderer,
    release() {
      if (released) return;
      released = true;
      resource.users -= 1;
      if (resource.users === 0) {
        resource.renderer.dispose();
        resource.renderer.forceContextLoss();
        if (shared === resource) shared = null;
      }
    },
  };
}

export type MediaDeformRenderer = {
  render(bounds: MediaDeformBounds, sourceChanged?: boolean): void;
  dispose(): void;
};

const vertexShader = `
  attribute vec2 mediaLocal;
  varying vec2 textureUv;
  varying vec2 localPoint;
  void main() {
    textureUv = uv;
    localPoint = mediaLocal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const fragmentShader = `
  uniform sampler2D mediaMap;
  uniform float videoSource;
  uniform vec2 mediaSize;
  uniform vec4 cornerRadii;
  varying vec2 textureUv;
  varying vec2 localPoint;
  void main() {
    // CSS backgrounds do not repeat or extend the outermost source texel.
    if (textureUv.x < 0.0 || textureUv.x > 1.0 || textureUv.y < 0.0 || textureUv.y > 1.0) discard;
    vec4 color = texture2D(mediaMap, textureUv);
    // WebGL video textures use linear storage; image textures decode sRGB in
    // hardware. Match Three's standard DECODE_VIDEO_TEXTURE material branch.
    if (videoSource > 0.5) color = sRGBTransferEOTF(color);
    float radius = localPoint.y < mediaSize.y * 0.5
      ? (localPoint.x < mediaSize.x * 0.5 ? cornerRadii.x : cornerRadii.y)
      : (localPoint.x < mediaSize.x * 0.5 ? cornerRadii.w : cornerRadii.z);
    if (radius > 0.0) {
      vec2 delta = abs(localPoint - mediaSize * 0.5) - (mediaSize * 0.5 - vec2(radius));
      float distance = length(max(delta, vec2(0.0))) + min(max(delta.x, delta.y), 0.0) - radius;
      float edge = max(fwidth(distance), 0.001);
      color.a *= 1.0 - smoothstep(-edge, edge, distance);
    }
    gl_FragColor = color;
    #include <colorspace_fragment>
  }
`;

/** Returns null when WebGL or the 2D copy target is unavailable; the component
 * keeps its ordinary image/video visible in that case. No object owns a context. */
export function createMediaDeformRenderer(
  canvas: HTMLCanvasElement,
  mesh: MediaDeformMesh,
  element: CanvasElement,
  source: HTMLImageElement | HTMLVideoElement,
): MediaDeformRenderer | null {
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return null;
  let resource: ReturnType<typeof acquireMediaDeformGpu>;
  try {
    resource = acquireMediaDeformGpu();
  } catch {
    return null;
  }
  const geometry = new BufferGeometry();
  const position = new BufferAttribute(mesh.positions, 3).setUsage(
    DynamicDrawUsage,
  );
  geometry.setAttribute("position", position);
  geometry.setAttribute("uv", new BufferAttribute(mesh.uv, 2));
  geometry.setAttribute("mediaLocal", new BufferAttribute(mesh.local, 2));
  geometry.setIndex(new BufferAttribute(mesh.indices, 1));
  // Native decoded-frame callbacks and the shared wave clock drive rendering.
  const textureResource = acquireMediaDeformTexture(source);
  const texture = textureResource.texture;
  const corners = element.cornerRadii ?? [
    element.cornerRadius,
    element.cornerRadius,
    element.cornerRadius,
    element.cornerRadius,
  ];
  const maxRadius = Math.min(mesh.width, mesh.height) / 2;
  const radii = corners.map((radius) =>
    Math.min(maxRadius, Math.max(0, radius)),
  );
  const material = new ShaderMaterial({
    uniforms: {
      mediaMap: { value: texture },
      videoSource: { value: source instanceof HTMLVideoElement ? 1 : 0 },
      mediaSize: { value: new Vector2(mesh.width, mesh.height) },
      cornerRadii: { value: new Vector4(...radii) },
    },
    vertexShader,
    fragmentShader,
    side: DoubleSide,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const object = new Mesh(geometry, material);
  object.frustumCulled = false;
  const scene = new Scene();
  scene.add(object);
  const camera = new OrthographicCamera(
    0,
    mesh.width,
    0,
    mesh.height,
    0.1,
    100,
  );
  camera.position.z = 10;
  let disposed = false;
  return {
    render(bounds) {
      if (disposed) return;
      // Small quantized guard bands prevent canvas reallocation for subpixel
      // motion and leave room for antialiasing beyond the deformed perimeter.
      const left = Math.floor((bounds.left - 2) / 8) * 8;
      const top = Math.floor((bounds.top - 2) / 8) * 8;
      const width = Math.max(
        8,
        Math.ceil((bounds.left + bounds.width + 2 - left) / 8) * 8,
      );
      const height = Math.max(
        8,
        Math.ceil((bounds.top + bounds.height + 2 - top) / 8) * 8,
      );
      const size = mediaDeformCanvasSize(
        { left, top, width, height },
        window.devicePixelRatio || 1,
      );
      if (canvas.width !== size.width) canvas.width = size.width;
      if (canvas.height !== size.height) canvas.height = size.height;
      canvas.style.left = `${left}px`;
      canvas.style.top = `${top}px`;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      camera.left = left;
      camera.right = left + width;
      camera.top = top;
      camera.bottom = top + height;
      camera.updateProjectionMatrix();
      position.needsUpdate = true;
      textureResource.update();
      const { renderer } = resource;
      renderer.setViewport(0, 0, size.width, size.height);
      renderer.setScissor(0, 0, size.width, size.height);
      renderer.render(scene, camera);
      context.clearRect(0, 0, size.width, size.height);
      context.drawImage(
        renderer.domElement,
        0,
        MEDIA_DEFORM_MAX_CANVAS_EDGE - size.height,
        size.width,
        size.height,
        0,
        0,
        size.width,
        size.height,
      );
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.remove(object);
      geometry.dispose();
      material.dispose();
      textureResource.release();
      resource.release();
      canvas.width = 1;
      canvas.height = 1;
    },
  };
}
