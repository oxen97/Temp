import type { InteractionDefinition } from "@/features/editor/lib/interaction-model";
import type { VectorPath } from "@/features/editor/lib/vector-types";

export type Vector3Value = {
  x: number;
  y: number;
  z: number;
};

export type SpatialTransform3D = {
  /** Position is the pivot point in artboard pixels; Y grows down on screen. */
  position: Vector3Value;
  /** Authoring values are degrees. The renderer converts them to radians. */
  rotation: Vector3Value;
  scale: Vector3Value;
  pivot: "center" | "origin";
};

export type Object3DDimensions = {
  width: number;
  height: number;
  depth: number;
};

export type Primitive3DKind = "box" | "sphere" | "cylinder" | "cone" | "torus";

export type Primitive3DParameters = {
  radialSegments?: number;
  tubularSegments?: number;
};

export type VectorShapeSnapshot = {
  /** Immutable element-local paths. Handles use absolute local coordinates. */
  paths: VectorPath[];
  /** Each group is [outerPathIndex, ...holePathIndexes]. */
  shapeGroups: number[][];
  width: number;
  height: number;
};

export type PlaneGeometry3DParameters = {
  curveSegments: number;
  mode: "plane";
};

export type ExtrudeGeometry3DParameters = {
  bevelEnabled: boolean;
  bevelSegments: number;
  bevelSize: number;
  bevelThickness: number;
  curveSegments: number;
  mode: "extrude";
  steps: number;
};

export type RevolveGeometry3DParameters = {
  angleDegrees: number;
  curveSegments: number;
  mode: "revolve";
  segments: number;
};

export type InflateGeometry3DParameters = {
  amount: number;
  mode: "inflate";
};

export type VectorGeometry3DParameters =
  | PlaneGeometry3DParameters
  | ExtrudeGeometry3DParameters
  | RevolveGeometry3DParameters
  | InflateGeometry3DParameters;

export type Object3DSource =
  | {
      assetId: string;
      kind: "asset";
    }
  | {
      kind: "primitive";
      parameters: Primitive3DParameters;
      primitive: Primitive3DKind;
    }
  | {
      kind: "vector";
      parameters: VectorGeometry3DParameters;
      snapshot: VectorShapeSnapshot;
    };

export type Material3DSettings = {
  color: string;
  doubleSided: boolean;
  metalness: number;
  opacity: number;
  roughness: number;
  useSourceMaterial: boolean;
};

export type Object3DElement = {
  castShadow: boolean;
  compositeLayer: "behind-2d" | "front-of-2d";
  dimensions: Object3DDimensions;
  id: string;
  interactions?: InteractionDefinition[];
  locked: boolean;
  material: Material3DSettings;
  name: string;
  receiveShadow: boolean;
  source: Object3DSource;
  transform: SpatialTransform3D;
  type: "object3d";
  visible: boolean;
};

export type Scene3DSettings = {
  ambientLight: number;
  cameraPosition: Vector3Value;
  cameraTarget: Vector3Value;
  enabled: boolean;
  perspective: number;
  projection: "orthographic" | "perspective";
};

export type Model3DAssetMetadata = {
  animationNames: string[];
  boneNames: string[];
  byteLength: number;
  createdAt: number;
  fileName: string;
  id: string;
  jointNames: string[];
  materialNames: string[];
  meshFaceGroupNames: string[];
  meshNames: string[];
  mimeType: "model/gltf-binary";
  morphTargetNames: string[];
};

export function createDefaultScene3DSettings(): Scene3DSettings {
  return {
    ambientLight: 1,
    cameraPosition: { x: 0, y: 0, z: 1000 },
    cameraTarget: { x: 0, y: 0, z: 0 },
    enabled: false,
    perspective: 35,
    projection: "orthographic",
  };
}

export function resolveScene3DSettings(
  settings?: Partial<Scene3DSettings>,
): Scene3DSettings {
  const defaults = createDefaultScene3DSettings();
  return {
    ...defaults,
    ...settings,
    cameraPosition: {
      ...defaults.cameraPosition,
      ...settings?.cameraPosition,
    },
    cameraTarget: { ...defaults.cameraTarget, ...settings?.cameraTarget },
  };
}

export function createDefaultSpatialTransform3D(
  position: Partial<Vector3Value> = {},
): SpatialTransform3D {
  return {
    pivot: "center",
    position: { x: 0, y: 0, z: 0, ...position },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  };
}

export function createDefaultMaterial3DSettings(): Material3DSettings {
  return {
    color: "#d9d9d9",
    doubleSided: false,
    metalness: 0,
    opacity: 100,
    roughness: 0.65,
    useSourceMaterial: true,
  };
}

export function cloneObject3D(object: Object3DElement): Object3DElement {
  return structuredClone(object);
}

export function createPrimitiveObject3D({
  dimensions,
  id,
  name,
  position,
  primitive,
}: {
  dimensions: Object3DDimensions;
  id: string;
  name: string;
  position: Vector3Value;
  primitive: Primitive3DKind;
}): Object3DElement {
  return {
    castShadow: true,
    compositeLayer: "behind-2d",
    dimensions: { ...dimensions },
    id,
    locked: false,
    material: {
      ...createDefaultMaterial3DSettings(),
      useSourceMaterial: false,
    },
    name,
    receiveShadow: true,
    source: { kind: "primitive", parameters: {}, primitive },
    transform: createDefaultSpatialTransform3D(position),
    type: "object3d",
    visible: true,
  };
}
