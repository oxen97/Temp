import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import type { Bone, Material, Mesh, Object3D, Texture } from "three";

import { disposeObject3D } from "@/features/editor/three/resource-disposal";
import type { Model3DAssetMetadata } from "@/features/editor/three/types";
import {
  MODEL_ASSET_STORE,
  openAmousDatabase,
} from "@/lib/persistence/database";

const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
export const MAX_MODEL_ASSET_BYTES = 100 * 1024 * 1024;
export const LOCAL_PROJECT_ID = "local-project";

export type StoredModel3DAsset = {
  blob: Blob;
  metadata: Model3DAssetMetadata;
  projectId: string;
};

const cache = new Map<string, Promise<GLTF>>();

const assetKey = (projectId: string, assetId: string) =>
  `${projectId}:${assetId}`;

function createAssetId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `model-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
  );
}

export function validateGlbBuffer(buffer: ArrayBuffer) {
  if (buffer.byteLength < 20) throw new Error("GLB file is incomplete.");
  if (buffer.byteLength > MAX_MODEL_ASSET_BYTES) {
    throw new Error("GLB file exceeds the 100 MB project limit.");
  }
  const header = new DataView(buffer, 0, 12);
  if (header.getUint32(0, true) !== GLB_MAGIC) {
    throw new Error("Only binary glTF (.glb) files are supported.");
  }
  if (header.getUint32(4, true) !== GLB_VERSION) {
    throw new Error("Only glTF 2.0 GLB files are supported.");
  }
  if (header.getUint32(8, true) !== buffer.byteLength) {
    throw new Error("GLB header length does not match the uploaded file.");
  }
}

export async function parseGlb(buffer: ArrayBuffer) {
  validateGlbBuffer(buffer);
  return new GLTFLoader().parseAsync(buffer, "");
}

export function validateGltfJson(source: string) {
  if (new TextEncoder().encode(source).byteLength > MAX_MODEL_ASSET_BYTES) {
    throw new Error("glTF file exceeds the 100 MB project limit.");
  }
  let document: unknown;
  try {
    document = JSON.parse(source);
  } catch {
    throw new Error("glTF file does not contain valid JSON.");
  }
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error("glTF file must contain a JSON object.");
  }
  const gltf = document as {
    asset?: { version?: unknown };
    buffers?: { uri?: unknown }[];
    images?: { uri?: unknown }[];
  };
  if (gltf.asset?.version !== "2.0") {
    throw new Error("Only glTF 2.0 files are supported.");
  }
  for (const [kind, resources] of [
    ["buffer", gltf.buffers],
    ["image", gltf.images],
  ] as const) {
    if (resources !== undefined && !Array.isArray(resources)) {
      throw new Error(`glTF ${kind} list is invalid.`);
    }
    for (const resource of resources ?? []) {
      if (!resource || typeof resource !== "object") {
        throw new Error(`glTF ${kind} is invalid.`);
      }
      if (kind === "buffer" && resource.uri === undefined) {
        throw new Error(
          "A .gltf buffer must be embedded as a data URI. For a binary chunk, upload a .glb file.",
        );
      }
      if (
        resource.uri !== undefined &&
        (typeof resource.uri !== "string" || !/^data:/i.test(resource.uri))
      ) {
        throw new Error(
          `External glTF ${kind} files are not supported. Embed them as data URIs or upload a .glb file.`,
        );
      }
    }
  }
  return gltf;
}

export async function parseGltfJson(source: string) {
  validateGltfJson(source);
  return new GLTFLoader().parseAsync(source, "");
}

export function extractModelAssetSceneMetadata(scene: Object3D): {
  boneNames: string[];
  jointNames: string[];
  materialNames: string[];
  meshFaceGroupNames: string[];
  meshNames: string[];
  morphTargetNames: string[];
} {
  const boneNames = new Set<string>();
  const jointNames = new Set<string>();
  const materialNames = new Set<string>();
  const meshFaceGroupNames = new Set<string>();
  const meshNames = new Set<string>();
  const morphTargetNames = new Set<string>();
  const visitedMaterials = new Set<string>();
  let unnamedBoneCount = 0;
  let unnamedMeshCount = 0;

  scene.traverse((child) => {
    const bone = child as Bone;
    if (bone.isBone) {
      unnamedBoneCount += 1;
      const boneName = bone.name.trim() || `Bone ${unnamedBoneCount}`;
      boneNames.add(boneName);
      jointNames.add(boneName);
    }

    const mesh = child as Mesh;
    if (!mesh.isMesh) return;

    unnamedMeshCount += 1;
    const meshName = mesh.name.trim() || `Mesh ${unnamedMeshCount}`;
    meshNames.add(meshName);
    if (mesh.geometry.groups.length > 0) {
      mesh.geometry.groups.forEach((_group, index) => {
        meshFaceGroupNames.add(`${meshName} · Face Group ${index + 1}`);
      });
    } else {
      meshFaceGroupNames.add(`${meshName} · All Faces`);
    }

    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    for (const material of materials) {
      if (!material || visitedMaterials.has(material.uuid)) continue;
      visitedMaterials.add(material.uuid);
      materialNames.add(
        material.name.trim() || `Material ${visitedMaterials.size}`,
      );
    }

    const namedMorphTargets = Object.keys(mesh.morphTargetDictionary ?? {});
    if (namedMorphTargets.length > 0) {
      for (const name of namedMorphTargets) {
        if (name.trim()) morphTargetNames.add(name.trim());
      }
      return;
    }

    const morphTargetCount = Math.max(
      0,
      ...Object.values(mesh.geometry.morphAttributes).map(
        (attributes) => attributes.length,
      ),
    );
    for (let index = 0; index < morphTargetCount; index += 1) {
      morphTargetNames.add(`Morph Target ${index + 1}`);
    }
  });

  return {
    boneNames: [...boneNames],
    jointNames: [...jointNames],
    materialNames: [...materialNames],
    meshFaceGroupNames: [...meshFaceGroupNames],
    meshNames: [...meshNames],
    morphTargetNames: [...morphTargetNames],
  };
}

export async function importModelAsset(projectId: string, file: File) {
  const lowerName = file.name.toLowerCase();
  const isGlb = lowerName.endsWith(".glb");
  const isGltf = lowerName.endsWith(".gltf");
  if (!isGlb && !isGltf) {
    throw new Error("Choose a .glb or .gltf file.");
  }
  if (isGltf && file.size > MAX_MODEL_ASSET_BYTES) {
    throw new Error("glTF file exceeds the 100 MB project limit.");
  }
  const gltf = isGlb
    ? await parseGlb(await file.arrayBuffer())
    : await parseGltfJson(await file.text());
  const mimeType = isGlb ? "model/gltf-binary" : "model/gltf+json";
  const sceneMetadata = extractModelAssetSceneMetadata(gltf.scene);
  const metadata: Model3DAssetMetadata = {
    animationNames: gltf.animations.map(
      (animation, index) => animation.name || `Animation ${index + 1}`,
    ),
    boneNames: sceneMetadata.boneNames,
    byteLength: file.size,
    createdAt: Date.now(),
    fileName: file.name,
    id: createAssetId(),
    jointNames: sceneMetadata.jointNames,
    materialNames: sceneMetadata.materialNames,
    meshFaceGroupNames: sceneMetadata.meshFaceGroupNames,
    meshNames: sceneMetadata.meshNames,
    mimeType,
    morphTargetNames: sceneMetadata.morphTargetNames,
  };
  const record: StoredModel3DAsset = {
    blob: file.slice(0, file.size, mimeType),
    metadata,
    projectId,
  };
  const database = await openAmousDatabase();
  await database.put(
    MODEL_ASSET_STORE,
    record,
    assetKey(projectId, metadata.id),
  );
  cache.set(assetKey(projectId, metadata.id), Promise.resolve(gltf));
  return metadata;
}

export async function getModelAsset(projectId: string, assetId: string) {
  const database = await openAmousDatabase();
  const record = (await database.get(
    MODEL_ASSET_STORE,
    assetKey(projectId, assetId),
  )) as StoredModel3DAsset | undefined;
  if (!record) return undefined;
  return {
    ...record,
    metadata: {
      ...record.metadata,
      boneNames: record.metadata.boneNames ?? [],
      jointNames: record.metadata.jointNames ?? [],
      materialNames: record.metadata.materialNames ?? [],
      meshFaceGroupNames: record.metadata.meshFaceGroupNames ?? [],
      meshNames: record.metadata.meshNames ?? [],
      morphTargetNames: record.metadata.morphTargetNames ?? [],
    },
  };
}

/**
 * Writes a model that arrived from outside the upload flow (for example a
 * project file) back into this browser's asset store under its original id,
 * so scenes that reference the id can load it again.
 */
export async function storeModelAsset(
  projectId: string,
  metadata: Model3DAssetMetadata,
  blob: Blob,
) {
  const key = assetKey(projectId, metadata.id);
  const record: StoredModel3DAsset = {
    blob: blob.slice(0, blob.size, metadata.mimeType),
    metadata,
    projectId,
  };
  const database = await openAmousDatabase();
  await database.put(MODEL_ASSET_STORE, record, key);
  const loaded = await cache.get(key)?.catch(() => undefined);
  if (loaded) disposeObject3D(loaded.scene);
  cache.delete(key);
}

export async function deleteModelAsset(projectId: string, assetId: string) {
  const key = assetKey(projectId, assetId);
  const loaded = await cache.get(key)?.catch(() => undefined);
  if (loaded) disposeObject3D(loaded.scene);
  cache.delete(key);
  const database = await openAmousDatabase();
  await database.delete(MODEL_ASSET_STORE, key);
}

export async function loadModelAsset(projectId: string, assetId: string) {
  const key = assetKey(projectId, assetId);
  let pending = cache.get(key);
  if (!pending) {
    pending = (async () => {
      const record = await getModelAsset(projectId, assetId);
      if (!record) throw new Error(`3D asset ${assetId} is unavailable.`);
      return record.metadata.mimeType === "model/gltf+json"
        ? parseGltfJson(await record.blob.text())
        : parseGlb(await record.blob.arrayBuffer());
    })();
    cache.set(key, pending);
  }
  return pending;
}

export async function cloneModelAssetScene(projectId: string, assetId: string) {
  const gltf = await loadModelAsset(projectId, assetId);
  const scene = clone(gltf.scene);
  const textureClones = new Map<Texture, Texture>();

  const cloneMaterial = (source: Material) => {
    const material = source.clone();
    for (const [property, value] of Object.entries(material)) {
      if (!value || typeof value !== "object" || !("isTexture" in value)) {
        continue;
      }
      const texture = value as Texture;
      let textureClone = textureClones.get(texture);
      if (!textureClone) {
        textureClone = texture.clone();
        textureClone.needsUpdate = true;
        textureClones.set(texture, textureClone);
      }
      (material as unknown as Record<string, unknown>)[property] = textureClone;
    }
    return material;
  };

  scene.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry = mesh.geometry.clone();
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(cloneMaterial)
      : cloneMaterial(mesh.material);
  });
  return scene;
}

export async function clearModelAssetCache() {
  const loaded = await Promise.allSettled(cache.values());
  for (const result of loaded) {
    if (result.status === "fulfilled") disposeObject3D(result.value.scene);
  }
  cache.clear();
}
