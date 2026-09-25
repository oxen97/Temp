import {
  hydrateEditorDocument,
  serializeEditorDocument,
} from "@/core/project/editor-document";
import {
  decodeProjectFile,
  encodeProjectFile,
  PROJECT_FILE_EXTENSION,
  ProjectFileError,
  type ProjectFileAssetInput,
} from "@/core/project/project-file";
import type {
  ArtboardSettings,
  EditorPage,
} from "@/features/editor/store/editor-store";
import type { Model3DAssetMetadata } from "@/features/editor/three/types";

/** The part of the editor state that makes up the artwork itself. */
export type ProjectDocumentSnapshot = {
  activePageId: string;
  artboard: ArtboardSettings;
  pages: EditorPage[];
};

/** Uploads shown in the ASSETS panel, including ones not placed on a scene. */
export type ProjectLibraryMedia = {
  kind: "image" | "video";
  name: string;
  src: string;
};

export type ProjectLibrary = {
  media: ProjectLibraryMedia[];
  modelAssets: Model3DAssetMetadata[];
};

type ProjectFilePayload = {
  activePageId: string;
  /** V2 project document; media URLs are replaced by asset tokens. */
  document: unknown;
  library: {
    media: ProjectLibraryMedia[];
    modelAssetIds: string[];
  };
  /** Media or models that could not be read when the file was saved. */
  missingAssetCount: number;
  /** 3D model asset id → id of its bytes inside the file. */
  modelAssets: Record<string, string>;
};

export type ProjectFileExportDeps = {
  loadModelAsset: (
    assetId: string,
  ) => Promise<{ blob: Blob; metadata: Model3DAssetMetadata } | undefined>;
  now?: Date;
  resolveObjectUrl?: (url: string) => Promise<Blob>;
};

export type ProjectFileExportResult = {
  blob: Blob;
  fileName: string;
  missingAssetCount: number;
};

export type ProjectFileImportDeps = {
  createObjectUrl?: (blob: Blob) => string;
  storeModelAsset: (
    metadata: Model3DAssetMetadata,
    blob: Blob,
  ) => Promise<void>;
};

export type ImportedProjectDocument = Omit<
  ProjectDocumentSnapshot,
  "artboard"
> & {
  /** Missing only in documents that never stored an artboard. */
  artboard?: ArtboardSettings;
};

/** A library upload restored from a file, with its bytes for thumbnails. */
export type ImportedLibraryMedia = ProjectLibraryMedia & { blob: Blob };

export type ProjectFileImportResult = {
  createdObjectUrls: string[];
  library: {
    media: ImportedLibraryMedia[];
    modelAssets: Model3DAssetMetadata[];
  };
  missingAssetCount: number;
  snapshot: ImportedProjectDocument;
};

const ASSET_TOKEN_PREFIX = "amous-asset:";
// Browser object URLs look like blob:https://host/uuid. They only live as long
// as the tab, so every one of them has to travel inside the file.
const OBJECT_URL_PATTERN = /blob:[^\s"'()<>]+/g;
const ASSET_TOKEN_PATTERN = /amous-asset:([A-Za-z0-9_-]+)/g;
const DOCUMENT_ID = "local-project";
const DOCUMENT_NAME = "AMOUS project";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function walkStrings(value: unknown, visit: (text: string) => void) {
  if (typeof value === "string") {
    visit(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walkStrings(item, visit);
    return;
  }
  if (isPlainObject(value)) {
    for (const item of Object.values(value)) walkStrings(item, visit);
  }
}

/** Returns a copy of plain data with every string passed through `replace`. */
function mapStrings<T>(value: T, replace: (text: string) => string): T {
  if (typeof value === "string") return replace(value) as T;
  if (Array.isArray(value)) {
    return value.map((item) => mapStrings(item, replace)) as T;
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        mapStrings(item, replace),
      ]),
    ) as T;
  }
  return value;
}

function collectObjectUrls(values: unknown[]) {
  const urls = new Set<string>();
  for (const value of values) {
    walkStrings(value, (text) => {
      for (const match of text.matchAll(OBJECT_URL_PATTERN)) urls.add(match[0]);
    });
  }
  return urls;
}

/** Finds a readable file name for each URL from any `{ name, src }` record. */
function collectSourceNames(values: unknown[]) {
  const names = new Map<string, string>();
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!isPlainObject(value)) return;
    if (
      typeof value.src === "string" &&
      typeof value.name === "string" &&
      value.name &&
      !names.has(value.src)
    ) {
      names.set(value.src, value.name);
    }
    Object.values(value).forEach(visit);
  };
  values.forEach(visit);
  return names;
}

function collectModelAssetIds(pages: EditorPage[]) {
  const ids: string[] = [];
  for (const page of pages) {
    for (const object of page.objects3d ?? []) {
      if (object.source.kind === "asset" && !ids.includes(object.source.assetId)) {
        ids.push(object.source.assetId);
      }
    }
  }
  return ids;
}

async function fetchObjectUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not read ${url}`);
  return response.blob();
}

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}

export function projectFileName(date: Date) {
  return `AMOUS-${date.getFullYear()}${twoDigits(date.getMonth() + 1)}${twoDigits(
    date.getDate(),
  )}-${twoDigits(date.getHours())}${twoDigits(date.getMinutes())}${PROJECT_FILE_EXTENSION}`;
}

function serializeDocument(
  pages: EditorPage[],
  artboard: ArtboardSettings,
  assets: Model3DAssetMetadata[],
  now: Date,
) {
  const input = {
    artboard,
    assets,
    id: DOCUMENT_ID,
    name: DOCUMENT_NAME,
    pages,
    updatedAt: now.toISOString(),
  };
  try {
    return serializeEditorDocument(input);
  } catch (error) {
    // Saving must never be blocked by validation: the file is the artist's
    // only copy of their work. Keep the same document shape unvalidated.
    console.warn("Saving the project without schema validation.", error);
    return {
      artboard,
      assets,
      id: DOCUMENT_ID,
      name: DOCUMENT_NAME,
      scenes: pages,
      schemaVersion: 2,
      updatedAt: input.updatedAt,
    };
  }
}

/**
 * Packs the current scenes, the artboard and every uploaded file they use
 * (images, videos, sounds, 3D models) into one `.amous` file.
 */
export async function createProjectFile(
  snapshot: ProjectDocumentSnapshot,
  library: ProjectLibrary,
  deps: ProjectFileExportDeps,
): Promise<ProjectFileExportResult> {
  const now = deps.now ?? new Date();
  const resolveObjectUrl = deps.resolveObjectUrl ?? fetchObjectUrl;
  const sources = [library.media, snapshot.pages, snapshot.artboard];
  const names = collectSourceNames(sources);
  const assets: ProjectFileAssetInput[] = [];
  const tokens = new Map<string, string>();
  let missingAssetCount = 0;

  for (const url of collectObjectUrls(sources)) {
    try {
      const blob = await resolveObjectUrl(url);
      const id = `media-${tokens.size + 1}`;
      assets.push({ blob, id, mimeType: blob.type, name: names.get(url) });
      tokens.set(url, `${ASSET_TOKEN_PREFIX}${id}`);
    } catch {
      missingAssetCount += 1;
    }
  }

  const modelMetadata: Model3DAssetMetadata[] = [];
  const modelAssets: Record<string, string> = {};
  const modelAssetIds = [
    ...collectModelAssetIds(snapshot.pages),
    ...library.modelAssets.map((asset) => asset.id),
  ].filter((id, index, ids) => ids.indexOf(id) === index);
  for (const assetId of modelAssetIds) {
    const record = await deps.loadModelAsset(assetId).catch(() => undefined);
    if (!record) {
      missingAssetCount += 1;
      continue;
    }
    const id = `model-${modelMetadata.length + 1}`;
    assets.push({
      blob: record.blob,
      id,
      mimeType: record.metadata.mimeType,
      name: record.metadata.fileName,
    });
    modelMetadata.push(record.metadata);
    modelAssets[assetId] = id;
  }

  const tokenize = <T>(value: T) =>
    mapStrings(value, (text) =>
      text.replace(OBJECT_URL_PATTERN, (url) => tokens.get(url) ?? url),
    );
  const payload: ProjectFilePayload = {
    activePageId: snapshot.activePageId,
    document: serializeDocument(
      tokenize(snapshot.pages),
      tokenize(snapshot.artboard),
      modelMetadata,
      now,
    ),
    library: {
      media: tokenize(library.media),
      modelAssetIds: library.modelAssets
        .map((asset) => asset.id)
        .filter((id) => modelAssets[id]),
    },
    missingAssetCount,
    modelAssets,
  };

  return {
    blob: encodeProjectFile(payload, assets, now),
    fileName: projectFileName(now),
    missingAssetCount,
  };
}

function isRawPage(value: unknown): value is EditorPage {
  return (
    isPlainObject(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    Array.isArray(value.elements)
  );
}

function hydrateDocument(document: unknown) {
  try {
    const hydrated = hydrateEditorDocument(document);
    return {
      artboard: hydrated.artboard,
      assets: hydrated.assets,
      pages: hydrated.pages,
    };
  } catch (error) {
    // Files are written by this editor, so a document that no longer passes
    // validation is still the artist's work: load it as saved.
    const raw = document as {
      artboard?: unknown;
      assets?: unknown;
      scenes?: unknown;
    } | null;
    if (!raw || !Array.isArray(raw.scenes) || !raw.scenes.every(isRawPage)) {
      throw new ProjectFileError("This project file is incomplete or damaged.");
    }
    console.warn("Opening the project without schema validation.", error);
    return {
      artboard: isPlainObject(raw.artboard)
        ? (raw.artboard as ArtboardSettings)
        : undefined,
      assets: Array.isArray(raw.assets)
        ? (raw.assets as Model3DAssetMetadata[])
        : [],
      pages: raw.scenes as EditorPage[],
    };
  }
}

/** Reads a `.amous` file back into editor state with fresh object URLs. */
export async function readProjectFile(
  file: Blob,
  deps: ProjectFileImportDeps,
): Promise<ProjectFileImportResult> {
  const { assetBlob, manifest } =
    await decodeProjectFile<ProjectFilePayload>(file);
  const payload = manifest.payload;
  if (!isPlainObject(payload) || !isPlainObject(payload.document)) {
    throw new ProjectFileError("This project file is incomplete or damaged.");
  }

  const createObjectUrl =
    deps.createObjectUrl ?? ((blob: Blob) => URL.createObjectURL(blob));
  const modelAssets = isPlainObject(payload.modelAssets)
    ? (payload.modelAssets as Record<string, string>)
    : {};
  const modelFileIds = new Set(Object.values(modelAssets));
  const objectUrls = new Map<string, string>();
  const blobsByUrl = new Map<string, Blob>();
  const createdObjectUrls: string[] = [];
  const objectUrlFor = (id: string) => {
    const existing = objectUrls.get(id);
    if (existing) return existing;
    if (modelFileIds.has(id)) return undefined;
    const blob = assetBlob(id);
    if (!blob) return undefined;
    const url = createObjectUrl(blob);
    objectUrls.set(id, url);
    blobsByUrl.set(url, blob);
    createdObjectUrls.push(url);
    return url;
  };
  const restoreUrls = <T>(value: T) =>
    mapStrings(value, (text) =>
      text.replace(ASSET_TOKEN_PATTERN, (token, id: string) =>
        objectUrlFor(id) ?? token,
      ),
    );

  const { artboard, assets, pages } = hydrateDocument(
    restoreUrls(payload.document),
  );
  if (!pages.length) {
    throw new ProjectFileError("This project file has no scenes.");
  }

  const storedModels: Model3DAssetMetadata[] = [];
  for (const metadata of assets) {
    const fileId = modelAssets[metadata.id];
    const blob = fileId ? assetBlob(fileId) : undefined;
    if (!blob) continue;
    await deps.storeModelAsset(metadata, blob);
    storedModels.push(metadata);
  }

  const libraryPayload = isPlainObject(payload.library)
    ? (payload.library as ProjectFilePayload["library"])
    : { media: [], modelAssetIds: [] };
  const libraryMedia: ImportedLibraryMedia[] = [];
  for (const item of Array.isArray(libraryPayload.media)
    ? restoreUrls(libraryPayload.media)
    : []) {
    if (
      !isPlainObject(item) ||
      (item.kind !== "image" && item.kind !== "video") ||
      typeof item.name !== "string" ||
      typeof item.src !== "string"
    ) {
      continue;
    }
    const blob = blobsByUrl.get(item.src);
    if (!blob) continue;
    libraryMedia.push({ blob, kind: item.kind, name: item.name, src: item.src });
  }
  const libraryModelIds = new Set(
    Array.isArray(libraryPayload.modelAssetIds)
      ? libraryPayload.modelAssetIds
      : [],
  );

  const activePageId =
    typeof payload.activePageId === "string" &&
    pages.some((page) => page.id === payload.activePageId)
      ? payload.activePageId
      : pages[0].id;

  return {
    createdObjectUrls,
    library: {
      media: libraryMedia,
      modelAssets: storedModels.filter((metadata) =>
        libraryModelIds.has(metadata.id),
      ),
    },
    missingAssetCount:
      typeof payload.missingAssetCount === "number"
        ? payload.missingAssetCount
        : 0,
    snapshot: { activePageId, artboard, pages },
  };
}

/** Starts a browser download for a file made in the page. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking right away can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
