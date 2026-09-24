"use client";

import { useFrame, useThree } from "@react-three/fiber";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import {
  Color,
  DepthTexture,
  Mesh,
  NoBlending,
  NormalBlending,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector4,
  WebGLRenderTarget,
  type Camera,
  type Group,
  type Object3D,
  type Texture,
  type WebGLRenderer,
} from "three";
import type { RuntimeVisual } from "@/features/editor/lib/interaction-runtime";

type Entry = { root: Group; visual: MutableRefObject<RuntimeVisual> };
const RegistryContext = createContext<Map<Group, Entry> | null>(null);

export type ScreenShadow = {
  x: number;
  y: number;
  blur: number;
  color: Color;
  opacity: number;
};

/** Parse only the drop-shadow syntax produced by our shared runtime. */
export function screenShadow(value: string | null): ScreenShadow | null {
  const match = value?.match(
    /^drop-shadow\(([-\d.]+)px\s+([-\d.]+)px\s+([-\d.]+)px\s+(.+)\)$/,
  );
  if (!match) return null;
  const rgba = match[4].match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/,
  );
  const color = new Color();
  let opacity = 1;
  if (rgba) {
    color.setRGB(
      Number(rgba[1]) / 255,
      Number(rgba[2]) / 255,
      Number(rgba[3]) / 255,
      "srgb",
    );
    opacity = Math.max(0, Math.min(1, Number(rgba[4] ?? 1)));
  } else {
    const hex = match[4].match(/^#([\da-f]{6})([\da-f]{2})$/i);
    color.set(hex ? `#${hex[1]}` : match[4]);
    if (hex) opacity = parseInt(hex[2], 16) / 255;
  }
  return {
    x: Number(match[1]),
    y: Number(match[2]),
    blur: Math.max(0, Number(match[3])),
    color,
    opacity,
  };
}

/** One bounded pair of scratch targets is reused for every object, not N canvases. */
export function compositorDimensions(width: number, height: number) {
  const ratio = Math.min(
    1,
    1024 / Math.max(1, width, height),
    Math.sqrt(786432 / Math.max(1, width * height)),
  );
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

const vertexShader = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const blurFragment = `
uniform sampler2D source;
uniform vec2 stepUv;
varying vec2 vUv;
void main() {
  vec4 sum = vec4(0.0);
  float total = 0.0;
  for (int i = -15; i <= 15; i++) {
    float x = float(i) / 5.0;
    float weight = exp(-0.5 * x * x);
    sum += texture2D(source, vUv + stepUv * float(i)) * weight;
    total += weight;
  }
  gl_FragColor = sum / total;
}
`;
const compositeFragment = `
uniform sampler2D source;
uniform sampler2D sourceDepth;
uniform vec2 offsetUv;
uniform vec2 depthSearchUv;
uniform vec3 shadowColor;
uniform float shadowOpacity;
uniform bool isShadow;
varying vec2 vUv;
void main() {
  vec2 uv = vUv - offsetUv;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) discard;
  vec4 pixel = texture2D(source, uv);
  if (pixel.a < 0.001) discard;
  float depth = texture2D(sourceDepth, uv).x;
  // Blur extends outside the original silhouette. Recover nearby object depth
  // there, so an unrelated foreground model still occludes the filtered edge.
  if (depth > 0.99999) {
    for (int i = 1; i <= 3; i++) {
      vec2 d = depthSearchUv * float(i) / 3.0;
      depth = min(depth, texture2D(sourceDepth, uv + vec2(d.x, 0.0)).x);
      depth = min(depth, texture2D(sourceDepth, uv - vec2(d.x, 0.0)).x);
      depth = min(depth, texture2D(sourceDepth, uv + vec2(0.0, d.y)).x);
      depth = min(depth, texture2D(sourceDepth, uv - vec2(0.0, d.y)).x);
    }
  }
  gl_FragDepth = min(1.0, depth + (isShadow ? 0.00001 : 0.0));
  if (isShadow) pixel = vec4(shadowColor, pixel.a * shadowOpacity);
  else pixel.rgb /= max(0.001, pixel.a);
  gl_FragColor = pixel;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/** Isolate each effect-bearing object. Never CSS-filter the whole 3D canvas. */
export class ObjectVisualCompositor {
  private capture = new WebGLRenderTarget(1, 1, { depthBuffer: true });
  private horizontal = new WebGLRenderTarget(1, 1, { depthBuffer: false });
  private vertical = new WebGLRenderTarget(1, 1, { depthBuffer: false });
  private camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quadScene = new Scene();
  private geometry = new PlaneGeometry(2, 2);
  private blur = new ShaderMaterial({
    vertexShader,
    fragmentShader: blurFragment,
    uniforms: { source: { value: null }, stepUv: { value: new Vector2() } },
    depthTest: false,
    depthWrite: false,
    blending: NoBlending,
    toneMapped: false,
  });
  private composite = new ShaderMaterial({
    vertexShader,
    fragmentShader: compositeFragment,
    uniforms: {
      source: { value: null },
      sourceDepth: { value: null },
      offsetUv: { value: new Vector2() },
      depthSearchUv: { value: new Vector2() },
      shadowColor: { value: new Color() },
      shadowOpacity: { value: 1 },
      isShadow: { value: false },
    },
    transparent: true,
    depthTest: true,
    depthWrite: true,
    blending: NormalBlending,
  });
  private quad = new Mesh(this.geometry, this.blur);
  private size = new Vector2();

  constructor() {
    this.capture.depthTexture = new DepthTexture(1, 1);
    this.quadScene.add(this.quad);
    this.quad.frustumCulled = false;
  }

  private filtered(
    gl: WebGLRenderer,
    radius: number,
    artboardWidth: number,
    artboardHeight: number,
  ): Texture {
    if (radius <= 0.01) return this.capture.texture;
    this.quad.material = this.blur;
    this.blur.uniforms.source.value = this.capture.texture;
    this.blur.uniforms.stepUv.value.set(
      Math.min(256, radius) / Math.max(1, artboardWidth) / 5,
      0,
    );
    gl.setRenderTarget(this.horizontal);
    gl.clear();
    gl.render(this.quadScene, this.camera);
    this.blur.uniforms.source.value = this.horizontal.texture;
    this.blur.uniforms.stepUv.value.set(
      0,
      Math.min(256, radius) / Math.max(1, artboardHeight) / 5,
    );
    gl.setRenderTarget(this.vertical);
    gl.clear();
    gl.render(this.quadScene, this.camera);
    return this.vertical.texture;
  }

  render(
    gl: WebGLRenderer,
    scene: Scene,
    camera: Camera,
    entries: Iterable<Entry>,
    artboardWidth: number,
    artboardHeight: number,
  ): void {
    const active = Array.from(entries).filter(
      ({ root, visual }) =>
        root.visible && (visual.current.blur > 0.01 || visual.current.shadow),
    );
    if (!active.length) {
      gl.render(scene, camera);
      return;
    }
    gl.getDrawingBufferSize(this.size);
    const size = compositorDimensions(this.size.x, this.size.y);
    for (const target of [this.capture, this.horizontal, this.vertical]) {
      if (target.width !== size.width || target.height !== size.height)
        target.setSize(size.width, size.height);
    }
    const originalTarget = gl.getRenderTarget();
    const originalViewport = gl.getViewport(new Vector4());
    const originalScissor = gl.getScissor(new Vector4());
    const originalScissorTest = gl.getScissorTest();
    const originalColor = gl.getClearColor(new Color());
    const originalAlpha = gl.getClearAlpha();
    const originalAutoClear = gl.autoClear;
    const background = scene.background;
    const visibility = new Map<Object3D, boolean>();
    scene.traverse((node) => {
      if (
        (node as Mesh).isMesh ||
        node.type === "Line" ||
        node.type === "Points" ||
        active.some((entry) => entry.root === node)
      )
        visibility.set(node, node.visible);
    });
    const restore = () => {
      for (const [node, visible] of visibility) node.visible = visible;
    };
    try {
      // Normal scene first, including all non-blurred objects. Its depth buffer
      // is retained while the isolated filtered objects are composited back.
      for (const entry of active)
        if (entry.visual.current.blur > 0.01) entry.root.visible = false;
      gl.render(scene, camera);
      restore();
      gl.autoClear = false;
      gl.setScissorTest(false);
      scene.background = null;
      for (const { root, visual } of active) {
        const members = new Set<Object3D>();
        root.traverse((node) => members.add(node));
        for (const [node, visible] of visibility)
          node.visible =
            visible &&
            (members.has(node) ||
              node === root ||
              (!(node as Mesh).isMesh &&
                node.type !== "Line" &&
                node.type !== "Points"));
        // An active peer's root must stay hidden during this isolated capture.
        for (const peer of active)
          if (peer.root !== root) peer.root.visible = false;
        root.visible = true;
        gl.setRenderTarget(this.capture);
        gl.setClearColor(0x000000, 0);
        gl.clear();
        gl.render(scene, camera);
        restore();
        const shadow = screenShadow(visual.current.shadow);
        const draw = (radius: number, shadowMode: boolean) => {
          const texture = this.filtered(
            gl,
            radius,
            artboardWidth,
            artboardHeight,
          );
          this.quad.material = this.composite;
          const uniforms = this.composite.uniforms;
          uniforms.source.value = texture;
          uniforms.sourceDepth.value = this.capture.depthTexture;
          uniforms.depthSearchUv.value.set(
            (radius * 2) / Math.max(1, artboardWidth),
            (radius * 2) / Math.max(1, artboardHeight),
          );
          uniforms.offsetUv.value.set(
            shadowMode && shadow ? shadow.x / Math.max(1, artboardWidth) : 0,
            shadowMode && shadow ? -shadow.y / Math.max(1, artboardHeight) : 0,
          );
          uniforms.isShadow.value = shadowMode;
          if (shadow) {
            uniforms.shadowColor.value.copy(shadow.color);
            uniforms.shadowOpacity.value = shadow.opacity;
          }
          this.composite.depthWrite = !shadowMode;
          gl.setRenderTarget(originalTarget);
          gl.setViewport(originalViewport);
          gl.render(this.quadScene, this.camera);
        };
        if (shadow && shadow.opacity > 0) draw(shadow.blur, true);
        if (visual.current.blur > 0.01) draw(visual.current.blur, false);
      }
    } finally {
      restore();
      scene.background = background;
      gl.autoClear = originalAutoClear;
      gl.setRenderTarget(originalTarget);
      gl.setViewport(originalViewport);
      gl.setScissor(originalScissor);
      gl.setScissorTest(originalScissorTest);
      gl.setClearColor(originalColor, originalAlpha);
    }
  }

  dispose() {
    this.capture.dispose();
    this.horizontal.dispose();
    this.vertical.dispose();
    this.geometry.dispose();
    this.blur.dispose();
    this.composite.dispose();
  }
}

function RenderPass({
  entries,
  artboardWidth,
  artboardHeight,
}: {
  entries: Map<Group, Entry>;
  artboardWidth: number;
  artboardHeight: number;
}) {
  const compositor = useRef<ObjectVisualCompositor | null>(null);
  useLayoutEffect(() => {
    const instance = new ObjectVisualCompositor();
    compositor.current = instance;
    return () => {
      compositor.current = null;
      instance.dispose();
    };
  }, []);
  useFrame(({ gl, scene, camera }) => {
    if (compositor.current)
      compositor.current.render(
        gl,
        scene,
        camera,
        entries.values(),
        artboardWidth,
        artboardHeight,
      );
    else gl.render(scene, camera);
  }, 1);
  return null;
}

export function Object3DVisualCompositorProvider({
  children,
  enabled,
  artboardWidth,
  artboardHeight,
}: {
  children: ReactNode;
  enabled: boolean;
  artboardWidth: number;
  artboardHeight: number;
}) {
  const [entries] = useState(() => new Map<Group, Entry>());
  return (
    <RegistryContext.Provider value={entries}>
      {children}
      {enabled ? (
        <RenderPass
          entries={entries}
          artboardWidth={artboardWidth}
          artboardHeight={artboardHeight}
        />
      ) : null}
    </RegistryContext.Provider>
  );
}

export function useObject3DCompositor({
  root,
  visual,
  enabled,
}: {
  root: Group | null;
  visual: MutableRefObject<RuntimeVisual>;
  enabled: boolean;
}) {
  const entries = useContext(RegistryContext);
  const { invalidate } = useThree();
  useLayoutEffect(() => {
    if (!enabled || !root?.isObject3D || !entries) return;
    entries.set(root, { root, visual });
    invalidate();
    return () => {
      entries.delete(root);
      invalidate();
    };
  }, [enabled, root, visual, entries, invalidate]);
}
