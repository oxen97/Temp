import { describe, expect, it, vi } from "vitest";
import {
  Color,
  Group,
  Mesh,
  BoxGeometry,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  Vector2,
  Vector4,
  type WebGLRenderer,
} from "three";
import { IDENTITY_VISUAL } from "@/features/editor/lib/interaction-runtime";
import {
  compositorDimensions,
  ObjectVisualCompositor,
  screenShadow,
} from "./object-visual-compositor";

function renderer(failCapture = false) {
  let target: unknown = null;
  let clearAlpha = 1;
  let scissor = true;
  const clearColor = new Color("red");
  const viewport = new Vector4(0, 0, 1400, 900);
  const calls: { scene: Scene; visibleMeshes: string[]; capture: boolean }[] =
    [];
  const gl = {
    autoClear: true,
    getDrawingBufferSize: (out: Vector2) => out.set(3840, 2160),
    getRenderTarget: () => target,
    setRenderTarget: (value: unknown) => {
      target = value;
    },
    getViewport: (out: Vector4) => out.copy(viewport),
    setViewport: (value: Vector4) => viewport.copy(value),
    getScissor: (out: Vector4) => out.set(1, 2, 1300, 800),
    setScissor: vi.fn(),
    getScissorTest: () => scissor,
    setScissorTest: (value: boolean) => {
      scissor = value;
    },
    getClearColor: (out: Color) => out.copy(clearColor),
    getClearAlpha: () => clearAlpha,
    setClearColor: (value: Color | number, alpha: number) => {
      clearColor.set(value);
      clearAlpha = alpha;
    },
    clear: vi.fn(),
    render: (scene: Scene) => {
      if (failCapture && target && scene.name === "artwork")
        throw new Error("GPU context lost");
      const visibleMeshes: string[] = [];
      scene.traverseVisible((node) => {
        if ((node as Mesh).isMesh) visibleMeshes.push(node.name);
      });
      calls.push({ scene, visibleMeshes, capture: target !== null });
    },
  };
  return { gl: gl as unknown as WebGLRenderer, calls };
}

function artwork() {
  const scene = new Scene();
  scene.name = "artwork";
  const a = new Group();
  const b = new Group();
  for (const [root, name] of [
    [a, "blurred"],
    [b, "unaffected"],
  ] as const) {
    const mesh = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    mesh.name = name;
    root.add(mesh);
    scene.add(root);
  }
  return { scene, a, b };
}

describe("per-object 3D visual compositor", () => {
  it("parses the shared runtime shadow, including alpha", () => {
    const shadow = screenShadow(
      "drop-shadow(-3px 7px 12px rgba(0, 128, 255, 0.35))",
    )!;
    expect(shadow).toMatchObject({ x: -3, y: 7, blur: 12, opacity: 0.35 });
    expect(shadow.color.getHexString()).toBe("0080ff");
    expect(
      screenShadow("drop-shadow(0px 0px 2px #11223380)")?.opacity,
    ).toBeCloseTo(128 / 255);
    expect(screenShadow(null)).toBeNull();
  });

  it("bounds GPU scratch resolution even on very large monitors", () => {
    for (const [width, height] of [
      [3840, 2160],
      [10000, 10000],
      [0, 0],
    ]) {
      const size = compositorDimensions(width, height);
      expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(1024);
      expect(size.width * size.height).toBeLessThanOrEqual(787000);
      expect(Math.min(size.width, size.height)).toBeGreaterThan(0);
    }
  });

  it("filters only the target and restores visibility and renderer state", () => {
    const { scene, a, b } = artwork();
    const { gl, calls } = renderer();
    const compositor = new ObjectVisualCompositor();
    compositor.render(
      gl,
      scene,
      new PerspectiveCamera(),
      [{ root: a, visual: { current: { ...IDENTITY_VISUAL, blur: 8 } } }],
      1920,
      1080,
    );
    const artworkCalls = calls.filter((call) => call.scene === scene);
    expect(artworkCalls).toHaveLength(2);
    expect(artworkCalls[0].visibleMeshes).toEqual(["unaffected"]);
    expect(artworkCalls[1].visibleMeshes).toEqual(["blurred"]);
    expect(a.visible && b.visible).toBe(true);
    expect(gl.autoClear).toBe(true);
    expect(gl.getRenderTarget()).toBeNull();
    expect(gl.getScissorTest()).toBe(true);
    expect(gl.getClearColor(new Color()).getHexString()).toBe("ff0000");
    compositor.dispose();
  });

  it("restores scene and renderer state even if capture fails", () => {
    const { scene, a, b } = artwork();
    const { gl } = renderer(true);
    const compositor = new ObjectVisualCompositor();
    expect(() =>
      compositor.render(
        gl,
        scene,
        new PerspectiveCamera(),
        [{ root: a, visual: { current: { ...IDENTITY_VISUAL, blur: 3 } } }],
        1000,
        800,
      ),
    ).toThrow("GPU context lost");
    expect(a.visible && b.visible).toBe(true);
    expect(gl.getRenderTarget()).toBeNull();
    expect(gl.autoClear).toBe(true);
    compositor.dispose();
  });
});
