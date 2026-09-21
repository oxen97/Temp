import { Blob as NodeBlob } from "node:buffer";
import { Bone, BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { describe, expect, it, vi } from "vitest";

import {
  clearModelAssetCache,
  extractModelAssetSceneMetadata,
  importModelAsset,
  loadModelAsset,
  parseGltfJson,
  validateGltfJson,
} from "./model-assets";

const storedAssets = vi.hoisted(() => new Map<string, unknown>());

vi.mock("@/lib/persistence/database", () => ({
  MODEL_ASSET_STORE: "model-assets",
  openAmousDatabase: async () => ({
    get: async (_store: string, key: string) => storedAssets.get(key),
    put: async (_store: string, value: unknown, key: string) => {
      storedAssets.set(key, value);
    },
  }),
}));

describe("extractModelAssetSceneMetadata", () => {
  it("collects GLB bones, joints, meshes, face groups, materials, and morphs", () => {
    const scene = new Group();
    const rootBone = new Bone();
    rootBone.name = "Root";
    scene.add(rootBone);

    const geometry = new BoxGeometry();
    geometry.clearGroups();
    geometry.addGroup(0, 6, 0);
    geometry.addGroup(6, 6, 1);
    const body = new Mesh(geometry, [
      new MeshStandardMaterial({ name: "Body" }),
      new MeshStandardMaterial({ name: "Glass" }),
    ]);
    body.name = "BodyMesh";
    body.morphTargetDictionary = { Blink: 0, Smile: 1 };
    scene.add(body);

    expect(extractModelAssetSceneMetadata(scene)).toEqual({
      boneNames: ["Root"],
      jointNames: ["Root"],
      materialNames: ["Body", "Glass"],
      meshFaceGroupNames: [
        "BodyMesh · Face Group 1",
        "BodyMesh · Face Group 2",
      ],
      meshNames: ["BodyMesh"],
      morphTargetNames: ["Blink", "Smile"],
    });

    geometry.dispose();
    for (const material of body.material) material.dispose();
  });
});

describe("self-contained glTF files", () => {
  it("imports JSON glTF and reloads it from stored data", async () => {
    const source = JSON.stringify({
      asset: { version: "2.0" },
      scenes: [{}],
      scene: 0,
    });
    const file = Object.assign(new NodeBlob([source]), {
      name: "scene.gltf",
    }) as unknown as File;

    const metadata = await importModelAsset("gltf-test", file);
    expect(metadata.mimeType).toBe("model/gltf+json");
    expect(metadata.fileName).toBe("scene.gltf");

    await clearModelAssetCache();
    const reloaded = await loadModelAsset("gltf-test", metadata.id);
    expect(reloaded.scene.type).toBe("Group");
    await clearModelAssetCache();
  });

  it("loads JSON glTF with an embedded geometry buffer", async () => {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const source = JSON.stringify({
      asset: { version: "2.0" },
      buffers: [
        {
          byteLength: positions.byteLength,
          uri: `data:application/octet-stream;base64,${Buffer.from(positions.buffer).toString("base64")}`,
        },
      ],
      bufferViews: [{ buffer: 0, byteLength: positions.byteLength }],
      accessors: [
        {
          bufferView: 0,
          componentType: 5126,
          count: 3,
          type: "VEC3",
          min: [0, 0, 0],
          max: [1, 1, 0],
        },
      ],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
      nodes: [{ mesh: 0 }],
      scenes: [{ nodes: [0] }],
      scene: 0,
    });

    const gltf = await parseGltfJson(source);
    expect(gltf.scene.children).toHaveLength(1);
    expect(gltf.scene.children[0].type).toBe("Mesh");
  });

  it("rejects external buffer and texture references", () => {
    const source = { asset: { version: "2.0" } };
    expect(() =>
      validateGltfJson(
        JSON.stringify({ ...source, buffers: [{ uri: "mesh.bin" }] }),
      ),
    ).toThrow(/External glTF buffer files/);
    expect(() =>
      validateGltfJson(
        JSON.stringify({ ...source, images: [{ uri: "texture.png" }] }),
      ),
    ).toThrow(/External glTF image files/);
  });

  it("rejects invalid JSON and non-2.0 glTF files", () => {
    expect(() => validateGltfJson("{")).toThrow(/valid JSON/);
    expect(() => validateGltfJson('{"asset":{"version":"1.0"}}')).toThrow(
      /glTF 2.0/,
    );
  });
});
