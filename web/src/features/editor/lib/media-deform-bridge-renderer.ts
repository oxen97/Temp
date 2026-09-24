import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Mesh,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
} from "three";

import {
  MEDIA_DEFORM_MAX_CANVAS_EDGE,
  mediaDeformCanvasSize,
} from "./media-deform";
import {
  MEDIA_LIQUID_MAX_PAIRS,
  type MediaLiquidGeometry,
  type MediaLiquidSurface,
} from "./media-deform-bridge";
import {
  acquireMediaDeformGpu,
  acquireMediaDeformTexture,
} from "./media-deform-renderer";

const vertexShader = `
  attribute vec2 sourceUvA;
  attribute vec2 sourceUvB;
  attribute vec2 bridgeBlend;
  varying vec2 uvA;
  varying vec2 uvB;
  varying vec2 blendAmount;
  void main() {
    uvA = sourceUvA;
    uvB = sourceUvB;
    blendAmount = bridgeBlend;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const fragmentShader = `
  uniform sampler2D mapA;
  uniform sampler2D mapB;
  uniform float texturedA;
  uniform float texturedB;
  uniform float videoA;
  uniform float videoB;
  uniform vec3 colorA;
  uniform vec3 colorB;
  uniform float opacityA;
  uniform float opacityB;
  uniform float softness;
  varying vec2 uvA;
  varying vec2 uvB;
  varying vec2 blendAmount;
  vec4 sampleSource(sampler2D map, vec2 uv, float textured, float video, vec3 color, float opacity) {
    if (textured < 0.5) return vec4(color, opacity);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
    vec4 result = texture2D(map, uv);
    if (video > 0.5) result = sRGBTransferEOTF(result);
    result.a *= opacity;
    return result;
  }
  void main() {
    vec4 a = sampleSource(mapA, uvA, texturedA, videoA, colorA, opacityA);
    vec4 b = sampleSource(mapB, uvB, texturedB, videoB, colorB, opacityB);
    // Premultiplied mixing prevents transparent borders adding a black fringe.
    a.rgb *= a.a;
    b.rgb *= b.a;
    vec4 color = mix(a, b, smoothstep(0.0, 1.0, blendAmount.x));
    color.rgb /= max(color.a, 0.00001);
    float edge = 0.015 + softness * 0.075;
    color.a *= smoothstep(0.0, edge, blendAmount.y) * smoothstep(0.0, edge, 1.0 - blendAmount.y);
    gl_FragColor = color;
    #include <colorspace_fragment>
  }
`;

let activePairs = 0;
export type MediaLiquidRenderer = {
  render(
    bridge: MediaLiquidGeometry,
    a: MediaLiquidSurface,
    b: MediaLiquidSurface,
    smoothness: number,
  ): void;
  dispose(): void;
};

export function createMediaLiquidRenderer(
  canvas: HTMLCanvasElement,
): MediaLiquidRenderer | null {
  if (activePairs >= MEDIA_LIQUID_MAX_PAIRS) return null;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return null;
  let gpu: ReturnType<typeof acquireMediaDeformGpu>;
  try {
    gpu = acquireMediaDeformGpu();
  } catch {
    return null;
  }
  activePairs += 1;
  const geometry = new BufferGeometry();
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: DoubleSide,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      mapA: { value: null },
      mapB: { value: null },
      texturedA: { value: 0 },
      texturedB: { value: 0 },
      videoA: { value: 0 },
      videoB: { value: 0 },
      colorA: { value: new Color() },
      colorB: { value: new Color() },
      opacityA: { value: 1 },
      opacityB: { value: 1 },
      softness: { value: 0.5 },
    },
  });
  const object = new Mesh(geometry, material);
  object.frustumCulled = false;
  const scene = new Scene();
  scene.add(object);
  const camera = new OrthographicCamera(0, 1, 0, 1, 0.1, 100);
  camera.position.z = 10;
  let disposed = false;
  let sourceA: MediaLiquidSurface["source"] = null;
  let sourceB: MediaLiquidSurface["source"] = null;
  let textureA: ReturnType<typeof acquireMediaDeformTexture> | null = null;
  let textureB: ReturnType<typeof acquireMediaDeformTexture> | null = null;
  const attribute = (name: string, values: Float32Array, size: number) => {
    let buffer = geometry.getAttribute(name) as BufferAttribute | undefined;
    if (!buffer) {
      buffer = new BufferAttribute(values.slice(), size).setUsage(
        DynamicDrawUsage,
      );
      geometry.setAttribute(name, buffer);
    } else buffer.array.set(values);
    buffer.needsUpdate = true;
  };
  const paint = (surface: MediaLiquidSurface, suffix: "A" | "B") => {
    material.uniforms[`textured${suffix}`].value = surface.source ? 1 : 0;
    material.uniforms[`video${suffix}`].value =
      surface.source instanceof HTMLVideoElement ? 1 : 0;
    const clear = surface.color === "none" || surface.color === "transparent";
    material.uniforms[`color${suffix}`].value.set(
      clear ? "#000000" : surface.color,
    );
    material.uniforms[`opacity${suffix}`].value =
      clear && !surface.source ? 0 : surface.opacity;
  };
  return {
    render(bridge, a, b, smoothness) {
      if (disposed) return;
      if (a.source !== sourceA) {
        textureA?.release();
        sourceA = a.source;
        textureA = a.source ? acquireMediaDeformTexture(a.source) : null;
        material.uniforms.mapA.value = textureA?.texture ?? null;
      }
      if (b.source !== sourceB) {
        textureB?.release();
        sourceB = b.source;
        textureB = b.source ? acquireMediaDeformTexture(b.source) : null;
        material.uniforms.mapB.value = textureB?.texture ?? null;
      }
      textureA?.update();
      textureB?.update();
      paint(a, "A");
      paint(b, "B");
      material.uniforms.softness.value = Math.max(0, Math.min(1, smoothness));
      attribute("position", bridge.positions, 3);
      attribute("sourceUvA", bridge.uvA, 2);
      attribute("sourceUvB", bridge.uvB, 2);
      attribute("bridgeBlend", bridge.blend, 2);
      if (!geometry.index)
        geometry.setIndex(new BufferAttribute(bridge.indices, 1));
      const left = Math.floor(bridge.bounds.left - 2);
      const top = Math.floor(bridge.bounds.top - 2);
      const width = Math.max(1, Math.ceil(bridge.bounds.width + 4));
      const height = Math.max(1, Math.ceil(bridge.bounds.height + 4));
      const size = mediaDeformCanvasSize(
        { left, top, width, height },
        window.devicePixelRatio || 1,
      );
      if (canvas.width !== size.width) canvas.width = size.width;
      if (canvas.height !== size.height) canvas.height = size.height;
      Object.assign(canvas.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      });
      camera.left = left;
      camera.right = left + width;
      camera.top = top;
      camera.bottom = top + height;
      camera.updateProjectionMatrix();
      gpu.renderer.setViewport(0, 0, size.width, size.height);
      gpu.renderer.setScissor(0, 0, size.width, size.height);
      gpu.renderer.render(scene, camera);
      context.clearRect(0, 0, size.width, size.height);
      context.drawImage(
        gpu.renderer.domElement,
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
      activePairs -= 1;
      scene.remove(object);
      geometry.dispose();
      material.dispose();
      textureA?.release();
      textureB?.release();
      gpu.release();
      canvas.width = 1;
      canvas.height = 1;
    },
  };
}
