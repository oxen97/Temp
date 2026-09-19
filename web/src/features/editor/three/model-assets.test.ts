import { Bone, BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { describe, expect, it } from "vitest";

import { extractModelAssetSceneMetadata } from "./model-assets";

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
