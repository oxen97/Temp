import type { CanvasElement } from "@/features/editor/store/editor-store";
import {
  createDefaultMaterial3DSettings,
  createDefaultSpatialTransform3D,
  type Model3DAssetMetadata,
  type Object3DElement,
  type VectorGeometry3DParameters,
} from "@/features/editor/three/types";
import { vectorShapeSnapshotForElement } from "@/features/editor/three/vector-shape-adapter";

export type VectorObject3DMode = VectorGeometry3DParameters["mode"];

function defaultVectorParameters(
  mode: VectorObject3DMode,
): VectorGeometry3DParameters {
  switch (mode) {
    case "plane":
      return { curveSegments: 12, mode };
    case "extrude":
      return {
        bevelEnabled: false,
        bevelSegments: 2,
        bevelSize: 0,
        bevelThickness: 0,
        curveSegments: 12,
        mode,
        steps: 1,
      };
    case "revolve":
      return { angleDegrees: 360, curveSegments: 12, mode, segments: 32 };
    case "inflate":
      return { amount: 0.5, mode };
  }
}

/**
 * Captures a 2D vector as immutable authoring data for a future 3D operation.
 * The original CanvasElement remains unchanged and can continue through the 2D
 * renderer/pathfinder pipeline independently.
 */
export function createVectorObject3DFromElement({
  depth = 40,
  element,
  id,
  mode = "extrude",
  name = `${element.name} 3D`,
}: {
  depth?: number;
  element: CanvasElement;
  id: string;
  mode?: VectorObject3DMode;
  name?: string;
}): Object3DElement {
  const material = createDefaultMaterial3DSettings();
  material.color = element.fill === "transparent" ? "#d9d9d9" : element.fill;
  material.opacity = element.opacity;
  material.useSourceMaterial = false;

  const transform = createDefaultSpatialTransform3D({
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
    z: 0,
  });
  transform.rotation.z = element.rotation;
  transform.scale.x = element.flipX ? -1 : 1;
  transform.scale.y = element.flipY ? -1 : 1;

  return {
    castShadow: true,
    compositeLayer: "behind-2d",
    dimensions: {
      depth: Math.max(1, depth),
      height: Math.max(1, element.height),
      width: Math.max(1, element.width),
    },
    id,
    locked: false,
    material,
    name,
    receiveShadow: true,
    source: {
      kind: "vector",
      parameters: defaultVectorParameters(mode),
      snapshot: vectorShapeSnapshotForElement(element),
    },
    transform,
    type: "object3d",
    visible: true,
  };
}

export function createAssetObject3D({
  asset,
  dimensions = { depth: 160, height: 160, width: 160 },
  id,
  position,
}: {
  asset: Model3DAssetMetadata;
  dimensions?: { depth: number; height: number; width: number };
  id: string;
  position: { x: number; y: number; z: number };
}): Object3DElement {
  return {
    castShadow: true,
    compositeLayer: "behind-2d",
    dimensions: { ...dimensions },
    id,
    locked: false,
    material: createDefaultMaterial3DSettings(),
    name: asset.fileName.replace(/\.glb$/i, "") || "3D Model",
    receiveShadow: true,
    source: { assetId: asset.id, kind: "asset" },
    transform: createDefaultSpatialTransform3D(position),
    type: "object3d",
    visible: true,
  };
}
