import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BufferGeometry, ShaderMaterial, Texture } from "three";

import type { CanvasElement } from "../store/editor-store";
import { createMediaDeformMesh } from "./media-deform";
import {
  acquireMediaDeformTexture,
  createMediaDeformRenderer,
  markMediaDeformVideoFrame,
} from "./media-deform-renderer";
import { createMediaLiquidRenderer } from "./media-deform-bridge-renderer";
import {
  buildMediaLiquidBridge,
  mediaLiquidSurface,
  MEDIA_LIQUID_MAX_PAIRS,
} from "./media-deform-bridge";
import { IDENTITY_VISUAL } from "./interaction-runtime";

const gpu = vi.hoisted(() => ({
  construct: vi.fn(),
  render: vi.fn(),
  dispose: vi.fn(),
  forceContextLoss: vi.fn(),
  setViewport: vi.fn(),
  setScissor: vi.fn(),
}));
vi.mock("three", async (original) => ({
  ...(await original<typeof import("three")>()),
  WebGLRenderer: class {
    domElement = document.createElement("canvas");
    constructor() {
      gpu.construct();
    }
    setPixelRatio = vi.fn();
    setSize = vi.fn();
    setClearColor = vi.fn();
    setScissorTest = vi.fn();
    setViewport = gpu.setViewport;
    setScissor = gpu.setScissor;
    render = gpu.render;
    dispose = gpu.dispose;
    forceContextLoss = gpu.forceContextLoss;
  },
}));

const element: CanvasElement = {
  id: "media",
  name: "media",
  type: "image",
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  opacity: 100,
  fill: "none",
  stroke: "none",
  strokeWidth: 0,
  cornerRadius: 12,
  visible: true,
  locked: false,
};
let drawImage: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.clearAllMocks();
  drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    clearRect: vi.fn(),
    drawImage,
  } as unknown as CanvasRenderingContext2D);
});
afterEach(() => vi.restoreAllMocks());

describe("shared media renderer", () => {
  it("uploads shared live video once per decoded frame, not once per display tick", () => {
    const video = document.createElement("video");
    Object.defineProperty(video, "readyState", { value: 2 });
    const first = acquireMediaDeformTexture(video);
    const second = acquireMediaDeformTexture(video);
    expect(first.texture).toBe(second.texture);
    expect(first.texture).toHaveProperty("isVideoTexture", true);
    expect(first.texture).toHaveProperty("update", expect.any(Function));
    markMediaDeformVideoFrame(video);
    first.update();
    const uploadedVersion = first.texture.version;
    video.currentTime = 0.01;
    first.update();
    second.update();
    video.currentTime = 0.02;
    second.update();
    expect(first.texture.version).toBe(uploadedVersion);
    markMediaDeformVideoFrame(video);
    second.update();
    first.update();
    expect(first.texture.version).toBe(uploadedVersion + 1);
    first.release();
    second.release();
  });

  it("shares the ordinary media texture and GPU context with colored bridges", () => {
    const source = document.createElement("img");
    const mesh = createMediaDeformMesh(element);
    const textureDispose = vi.spyOn(Texture.prototype, "dispose");
    const ordinary = createMediaDeformRenderer(
      document.createElement("canvas"),
      mesh,
      element,
      source,
    )!;
    const bridgeRenderer = createMediaLiquidRenderer(
      document.createElement("canvas"),
    )!;
    const a = mediaLiquidSurface(element, IDENTITY_VISUAL, { mesh, source })!;
    const b = mediaLiquidSurface(
      { ...element, id: "blue", type: "rectangle", x: 120, fill: "#1177ff" },
      IDENTITY_VISUAL,
    )!;
    const bridge = buildMediaLiquidBridge(a, b, 24, 0.6)!;
    bridgeRenderer.render(bridge, a, b, 0.6);
    expect(gpu.construct).toHaveBeenCalledTimes(1);
    const [scene] = gpu.render.mock.calls[0];
    const material = scene.children[0].material as ShaderMaterial;
    expect(material.uniforms.texturedA.value).toBe(1);
    expect(material.uniforms.texturedB.value).toBe(0);
    expect(material.uniforms.colorB.value.getHexString()).toBe("1177ff");
    expect(material.fragmentShader).toContain("a.rgb *= a.a");
    ordinary.dispose();
    expect(textureDispose).not.toHaveBeenCalled();
    expect(gpu.dispose).not.toHaveBeenCalled();
    bridgeRenderer.dispose();
    bridgeRenderer.dispose();
    expect(textureDispose).toHaveBeenCalledTimes(1);
    expect(gpu.dispose).toHaveBeenCalledTimes(1);
  });

  it("caps simultaneous bridges and releases the budget when previews close", () => {
    const bridges = Array.from({ length: MEDIA_LIQUID_MAX_PAIRS }, () =>
      createMediaLiquidRenderer(document.createElement("canvas"))!,
    );
    expect(bridges.every(Boolean)).toBe(true);
    expect(
      createMediaLiquidRenderer(document.createElement("canvas")),
    ).toBeNull();
    expect(gpu.construct).toHaveBeenCalledTimes(1);
    bridges.forEach((bridge) => bridge.dispose());
    const next = createMediaLiquidRenderer(document.createElement("canvas"));
    expect(next).not.toBeNull();
    next!.dispose();
  });

  it("shares one GPU context and disposes every GPU allocation exactly once", () => {
    const geometryDispose = vi.spyOn(BufferGeometry.prototype, "dispose");
    const materialDispose = vi.spyOn(ShaderMaterial.prototype, "dispose");
    const textureDispose = vi.spyOn(Texture.prototype, "dispose");
    const source = document.createElement("img");
    const first = createMediaDeformRenderer(
      document.createElement("canvas"),
      createMediaDeformMesh(element),
      element,
      source,
    )!;
    const second = createMediaDeformRenderer(
      document.createElement("canvas"),
      createMediaDeformMesh(element),
      element,
      source,
    )!;
    expect(gpu.construct).toHaveBeenCalledTimes(1);
    first.dispose();
    first.dispose();
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(textureDispose).not.toHaveBeenCalled();
    expect(gpu.dispose).not.toHaveBeenCalled();
    second.dispose();
    expect(geometryDispose).toHaveBeenCalledTimes(2);
    expect(materialDispose).toHaveBeenCalledTimes(2);
    expect(textureDispose).toHaveBeenCalledTimes(1);
    expect(gpu.dispose).toHaveBeenCalledTimes(1);
    expect(gpu.forceContextLoss).toHaveBeenCalledTimes(1);
    const reopened = createMediaDeformRenderer(
      document.createElement("canvas"),
      createMediaDeformMesh(element),
      element,
      source,
    )!;
    expect(gpu.construct).toHaveBeenCalledTimes(2);
    reopened.dispose();
  });

  it("copies the viewport immediately with transparent material and cropped texture UVs", () => {
    const canvas = document.createElement("canvas");
    const renderer = createMediaDeformRenderer(
      canvas,
      createMediaDeformMesh(element),
      element,
      document.createElement("img"),
    )!;
    renderer.render({ left: -75, top: -20, width: 250, height: 140 });
    expect(canvas.style.left).toBe("-80px");
    expect(canvas.style.top).toBe("-24px");
    expect(canvas.style.width).toBe("264px");
    expect(drawImage).toHaveBeenCalledTimes(1);
    const [scene] = gpu.render.mock.calls[0];
    const material = scene.children[0].material as ShaderMaterial;
    expect(material.transparent).toBe(true);
    expect(material.depthTest).toBe(false);
    expect(material.uniforms.cornerRadii.value.toArray()).toEqual([
      12, 12, 12, 12,
    ]);
    expect(material.fragmentShader).toContain("color.a *=");
    expect(material.fragmentShader).toContain("textureUv.x < 0.0");
    renderer.dispose();
    renderer.render({ left: 0, top: 0, width: 100, height: 100 });
    expect(drawImage).toHaveBeenCalledTimes(1);
  });

  it("gracefully leaves the ordinary media visible when WebGL is unavailable", () => {
    gpu.construct.mockImplementationOnce(() => {
      throw new Error("WebGL disabled");
    });
    expect(
      createMediaDeformRenderer(
        document.createElement("canvas"),
        createMediaDeformMesh(element),
        element,
        document.createElement("img"),
      ),
    ).toBeNull();
    expect(gpu.render).not.toHaveBeenCalled();
  });
});
