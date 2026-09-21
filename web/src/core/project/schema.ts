import { z } from "zod";

const vector3Schema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
});

const pathPointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  handleIn: z
    .object({ x: z.number().finite(), y: z.number().finite() })
    .optional(),
  handleOut: z
    .object({ x: z.number().finite(), y: z.number().finite() })
    .optional(),
});

const vectorPathSchema = z.object({
  closed: z.boolean().optional(),
  points: z.array(pathPointSchema),
});

const primitiveSourceSchema = z.object({
  kind: z.literal("primitive"),
  primitive: z.enum(["box", "sphere", "cylinder", "cone", "torus"]),
  parameters: z.object({
    radialSegments: z.number().int().positive().optional(),
    tubularSegments: z.number().int().positive().optional(),
  }),
});

const vectorSnapshotSchema = z.object({
  paths: z.array(vectorPathSchema),
  shapeGroups: z.array(z.array(z.number().int().nonnegative()).min(1)),
  width: z.number().positive(),
  height: z.number().positive(),
});

const vectorParametersSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("plane"),
    curveSegments: z.number().int().positive(),
  }),
  z.object({
    mode: z.literal("extrude"),
    bevelEnabled: z.boolean(),
    bevelSegments: z.number().int().positive(),
    bevelSize: z.number().nonnegative(),
    bevelThickness: z.number().nonnegative(),
    curveSegments: z.number().int().positive(),
    steps: z.number().int().positive(),
  }),
  z.object({
    mode: z.literal("revolve"),
    angleDegrees: z.number().positive().max(360),
    curveSegments: z.number().int().positive(),
    segments: z.number().int().min(3),
  }),
  z.object({ mode: z.literal("inflate"), amount: z.number().finite() }),
]);

const object3DSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("asset"), assetId: z.string().min(1) }),
  primitiveSourceSchema,
  z.object({
    kind: z.literal("vector"),
    parameters: vectorParametersSchema,
    snapshot: vectorSnapshotSchema,
  }),
]);

export const object3DElementSchema = z.object({
  castShadow: z.boolean(),
  compositeLayer: z.enum(["behind-2d", "front-of-2d"]),
  dimensions: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    depth: z.number().positive(),
  }),
  id: z.string().min(1),
  interactions: z.array(z.unknown()).optional(),
  locked: z.boolean(),
  material: z.object({
    color: z.string().min(1),
    doubleSided: z.boolean(),
    metalness: z.number().min(0).max(1),
    opacity: z.number().min(0).max(100),
    roughness: z.number().min(0).max(1),
    useSourceMaterial: z.boolean(),
  }),
  name: z.string().min(1),
  receiveShadow: z.boolean(),
  source: object3DSourceSchema,
  transform: z.object({
    pivot: z.enum(["center", "origin"]),
    position: vector3Schema,
    rotation: vector3Schema,
    scale: vector3Schema,
  }),
  type: z.literal("object3d"),
  visible: z.boolean(),
});

export const scene3DSettingsSchema = z.object({
  ambientLight: z.number().nonnegative(),
  cameraPosition: vector3Schema,
  cameraTarget: vector3Schema,
  enabled: z.boolean(),
  perspective: z.number().min(1).max(160),
  projection: z.enum(["orthographic", "perspective"]),
});

const projectSceneV1Schema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    elements: z.array(z.unknown()),
  })
  .passthrough();

const projectV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    name: z.string().min(1),
    scenes: z.array(projectSceneV1Schema),
    updatedAt: z.iso.datetime(),
  })
  .passthrough();

export const projectSceneSchema = projectSceneV1Schema.extend({
  objects3d: z.array(object3DElementSchema),
  scene3d: scene3DSettingsSchema,
});

const modelAssetMetadataSchema = z.object({
  animationNames: z.array(z.string()),
  boneNames: z.array(z.string()).default([]),
  byteLength: z.number().int().nonnegative(),
  createdAt: z.number().int().nonnegative(),
  fileName: z.string().min(1),
  id: z.string().min(1),
  jointNames: z.array(z.string()).default([]),
  materialNames: z.array(z.string()).default([]),
  meshFaceGroupNames: z.array(z.string()).default([]),
  meshNames: z.array(z.string()).default([]),
  mimeType: z.literal("model/gltf-binary"),
  morphTargetNames: z.array(z.string()).default([]),
});

export const currentProjectSchema = z
  .object({
    schemaVersion: z.literal(2),
    id: z.string().min(1),
    name: z.string().min(1),
    scenes: z.array(projectSceneSchema),
    artboard: z.unknown().optional(),
    assets: z.array(modelAssetMetadataSchema),
    updatedAt: z.iso.datetime(),
  })
  .passthrough();

export const projectSchema = z.union([projectV1Schema, currentProjectSchema]);

export type ExhibitionProject = z.infer<typeof projectSchema>;
export type CurrentExhibitionProject = z.infer<typeof currentProjectSchema>;

const defaultScene3D = () => ({
  ambientLight: 1,
  cameraPosition: { x: 0, y: 0, z: 1000 },
  cameraTarget: { x: 0, y: 0, z: 0 },
  enabled: false,
  perspective: 35,
  projection: "orthographic" as const,
});

export function migrateProject(input: unknown): CurrentExhibitionProject {
  const parsed = projectSchema.parse(input);
  if (parsed.schemaVersion === 2) return currentProjectSchema.parse(parsed);
  return currentProjectSchema.parse({
    ...parsed,
    assets: [],
    schemaVersion: 2,
    scenes: parsed.scenes.map((scene) => ({
      ...scene,
      objects3d: [],
      scene3d: defaultScene3D(),
    })),
  });
}
