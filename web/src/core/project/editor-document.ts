import {
  currentProjectSchema,
  migrateProject,
  type CurrentExhibitionProject,
} from "@/core/project/schema";
import { normalizeInteractions } from "@/features/editor/lib/interaction-model";
import { normalizeSceneBackground } from "@/features/editor/lib/scene-background";
import { normalizeSceneLogicRules } from "@/features/editor/lib/scene-logic";
import type {
  ArtboardSettings,
  CanvasElement,
  EditorPage,
} from "@/features/editor/store/editor-store";
import {
  createDefaultScene3DSettings,
  type Model3DAssetMetadata,
  type Object3DElement,
  resolveScene3DSettings,
} from "@/features/editor/three/types";

export type SerializeEditorDocumentInput = {
  artboard: ArtboardSettings;
  assets?: Model3DAssetMetadata[];
  id: string;
  name: string;
  pages: EditorPage[];
  updatedAt?: string;
};

export type HydratedEditorDocument = {
  artboard?: ArtboardSettings;
  assets: Model3DAssetMetadata[];
  id: string;
  name: string;
  pages: EditorPage[];
  updatedAt: string;
};

function cloneSerializable<T>(value: T): T {
  return structuredClone(value);
}

function serializePage(page: EditorPage) {
  const cloned = cloneSerializable(page);
  return {
    ...cloned,
    objects3d: cloned.objects3d ?? [],
    scene3d: cloned.scene3d
      ? resolveScene3DSettings(cloned.scene3d)
      : createDefaultScene3DSettings(),
  };
}

/**
 * Converts the editor's serializable state into the current project document.
 * Runtime-only values such as selection, undo history and Three.js objects are
 * intentionally not part of this boundary.
 */
export function serializeEditorDocument({
  artboard,
  assets = [],
  id,
  name,
  pages,
  updatedAt = new Date().toISOString(),
}: SerializeEditorDocumentInput): CurrentExhibitionProject {
  return currentProjectSchema.parse({
    artboard: cloneSerializable(artboard),
    assets: cloneSerializable(assets),
    id,
    name,
    scenes: pages.map(serializePage),
    schemaVersion: 2,
    updatedAt,
  });
}

function hydratePage(
  scene: CurrentExhibitionProject["scenes"][number],
): EditorPage {
  const { background: rawBackground, ...page } = cloneSerializable(
    scene,
  ) as unknown as EditorPage & { background?: unknown };
  // A malformed scene background falls back to the common one.
  const background = normalizeSceneBackground(rawBackground);
  return {
    ...page,
    ...(background ? { background } : {}),
    logicRules: normalizeSceneLogicRules(scene.logicRules),
    elements: cloneSerializable(scene.elements).map((rawElement) => {
      const element = rawElement as CanvasElement;
      return element && typeof element === "object" && "interactions" in element
        ? {
            ...element,
            interactions: normalizeInteractions(element.interactions),
          }
        : element;
    }),
    objects3d: cloneSerializable(scene.objects3d).map((object) =>
      object.interactions === undefined
        ? object
        : {
            ...object,
            interactions: normalizeInteractions(object.interactions),
          },
    ) as Object3DElement[],
    scene3d: resolveScene3DSettings(scene.scene3d),
  };
}

/**
 * Accepts either a legacy V1 document or the current V2 document and returns
 * editor-ready serializable state. Unknown scene fields are retained so that
 * existing 2D, sound and interaction settings survive the round trip.
 */
export function hydrateEditorDocument(input: unknown): HydratedEditorDocument {
  const project = migrateProject(input);
  return {
    artboard:
      project.artboard === undefined
        ? undefined
        : (cloneSerializable(project.artboard) as ArtboardSettings),
    assets: cloneSerializable(project.assets) as Model3DAssetMetadata[],
    id: project.id,
    name: project.name,
    pages: project.scenes.map(hydratePage),
    updatedAt: project.updatedAt,
  };
}
