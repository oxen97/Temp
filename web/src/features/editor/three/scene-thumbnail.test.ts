import { BoxGeometry, Mesh, MeshStandardMaterial, Scene } from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cloneModelAssetScene } from "@/features/editor/three/model-assets";
import {
  clearScene3DThumbnailCache,
  createScene3DThumbnailKey,
  requestScene3DThumbnail,
  type Scene3DThumbnailRequest,
} from "@/features/editor/three/scene-thumbnail";
import {
  createDefaultScene3DSettings,
  createPrimitiveObject3D,
} from "@/features/editor/three/types";

vi.mock("@/features/editor/three/model-assets", () => ({
  cloneModelAssetScene: vi.fn(),
}));

const { renderSpy } = vi.hoisted(() => ({ renderSpy: vi.fn() }));
vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return {
    ...actual,
    WebGLRenderer: class {
      outputColorSpace = actual.SRGBColorSpace;
      renderLists = { dispose: vi.fn() };
      shadowMap = { enabled: false, type: actual.BasicShadowMap };
      toneMapping = actual.NoToneMapping;
      dispose = vi.fn();
      forceContextLoss = vi.fn();
      render = renderSpy;
      setClearColor = vi.fn();
      setPixelRatio = vi.fn();
      setSize = vi.fn();
    },
  };
});

let capturedPose: { position: number[]; rotationZ: number } | null = null;

function primitive() {
  const object = createPrimitiveObject3D({
    dimensions: { depth: 60, height: 80, width: 100 },
    id: "preview-cube",
    name: "Preview Cube",
    position: { x: 220, y: 150, z: 25 },
    primitive: "box",
  });
  object.transform.rotation = { x: 10, y: 20, z: 30 };
  return object;
}

function request(
  overrides: Partial<Scene3DThumbnailRequest> = {},
): Scene3DThumbnailRequest {
  return {
    artboardHeight: 1080,
    artboardWidth: 1920,
    layer: "behind-2d",
    objects: [primitive()],
    projectId: "test-project",
    scene: { ...createDefaultScene3DSettings(), enabled: true },
    ...overrides,
  };
}

beforeEach(() => {
  clearScene3DThumbnailCache();
  renderSpy.mockReset();
  capturedPose = null;
  renderSpy.mockImplementation((renderedScene: Scene) => {
    const group = renderedScene.getObjectByName("Preview Cube");
    if (group) {
      capturedPose = {
        position: group.position.toArray(),
        rotationZ: group.rotation.z,
      };
    }
  });
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    "data:image/png;base64,scene-preview",
  );
  vi.mocked(cloneModelAssetScene).mockImplementation(
    async () => new Mesh(new BoxGeometry(), new MeshStandardMaterial()),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(cloneModelAssetScene).mockReset();
});

describe("scene 3D thumbnail", () => {
  it("renders transformed primitives once and reuses the static PNG cache", async () => {
    const input = request();

    await expect(requestScene3DThumbnail(input)).resolves.toBe(
      "data:image/png;base64,scene-preview",
    );
    expect(renderSpy).toHaveBeenCalledOnce();
    expect(capturedPose?.position).toEqual([220, -150, 25]);
    expect(capturedPose?.rotationZ).toBeCloseTo(Math.PI / 6);

    await requestScene3DThumbnail(input);
    expect(renderSpy).toHaveBeenCalledOnce();
  });

  it("separates composite layers and changes its key for visual edits", async () => {
    const behind = request();
    const frontObject = primitive();
    frontObject.compositeLayer = "front-of-2d";
    const front = request({ layer: "front-of-2d", objects: [frontObject] });

    expect(createScene3DThumbnailKey(behind)).not.toBe(
      createScene3DThumbnailKey(front),
    );
    const recolored = request();
    recolored.objects[0].material.color = "#ff0000";
    expect(createScene3DThumbnailKey(behind)).not.toBe(
      createScene3DThumbnailKey(recolored),
    );

    await requestScene3DThumbnail(front);
    expect(renderSpy).toHaveBeenCalledOnce();
  });

  it("loads GLB geometry but skips hidden objects and disabled scenes", async () => {
    const asset = primitive();
    asset.id = "asset-object";
    asset.source = { assetId: "asset-1", kind: "asset" };

    await requestScene3DThumbnail(request({ objects: [asset] }));
    expect(cloneModelAssetScene).toHaveBeenCalledWith(
      "test-project",
      "asset-1",
    );
    expect(renderSpy).toHaveBeenCalledOnce();

    const hidden = primitive();
    hidden.visible = false;
    await expect(
      requestScene3DThumbnail(request({ objects: [hidden] })),
    ).resolves.toBeNull();
    await expect(
      requestScene3DThumbnail(
        request({
          scene: { ...createDefaultScene3DSettings(), enabled: false },
        }),
      ),
    ).resolves.toBeNull();
    expect(renderSpy).toHaveBeenCalledOnce();
  });
});
