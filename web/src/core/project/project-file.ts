/**
 * The `.amous` project file: one file that carries a JSON manifest and the
 * binary media it references, so a project can leave the browser tab and come
 * back later without re-uploading images, videos, sounds or 3D models.
 *
 * Layout (all integers little-endian):
 *   bytes 0-7    "AMOUSPRJ" magic
 *   bytes 8-11   container format version
 *   bytes 12-15  manifest length in bytes (N)
 *   bytes 16..   manifest (UTF-8 JSON, N bytes)
 *   then         asset bytes, back to back, at the offsets the manifest lists
 *
 * Media is stored as raw bytes rather than base64 text, so a large video does
 * not have to be held in memory as a string, and reading only slices the file.
 */

export const PROJECT_FILE_EXTENSION = ".amous";
export const PROJECT_FILE_MIME_TYPE = "application/x-amous-project";
export const PROJECT_FILE_FORMAT_VERSION = 1;

const MAGIC = "AMOUSPRJ";
const HEADER_BYTES = 16;

export type ProjectFileAssetEntry = {
  byteLength: number;
  id: string;
  mimeType: string;
  name?: string;
  /** Byte offset from the start of the asset section. */
  offset: number;
};

export type ProjectFileManifest<Payload> = {
  assets: ProjectFileAssetEntry[];
  exportedAt: string;
  format: "amous-project";
  formatVersion: number;
  payload: Payload;
};

export type ProjectFileAssetInput = {
  blob: Blob;
  id: string;
  mimeType?: string;
  name?: string;
};

export type DecodedProjectFile<Payload> = {
  assetBlob: (id: string) => Blob | undefined;
  manifest: ProjectFileManifest<Payload>;
};

export class ProjectFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectFileError";
  }
}

export function encodeProjectFile<Payload>(
  payload: Payload,
  assets: ProjectFileAssetInput[],
  exportedAt: Date = new Date(),
): Blob {
  const ids = new Set<string>();
  let offset = 0;
  const entries: ProjectFileAssetEntry[] = assets.map((asset) => {
    if (ids.has(asset.id)) {
      throw new ProjectFileError(`Duplicate project file asset id: ${asset.id}`);
    }
    ids.add(asset.id);
    const entry: ProjectFileAssetEntry = {
      byteLength: asset.blob.size,
      id: asset.id,
      mimeType: asset.mimeType || asset.blob.type || "application/octet-stream",
      ...(asset.name ? { name: asset.name } : {}),
      offset,
    };
    offset += asset.blob.size;
    return entry;
  });
  const manifest: ProjectFileManifest<Payload> = {
    assets: entries,
    exportedAt: exportedAt.toISOString(),
    format: "amous-project",
    formatVersion: PROJECT_FILE_FORMAT_VERSION,
    payload,
  };
  const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest));
  const header = new ArrayBuffer(HEADER_BYTES);
  const headerView = new DataView(header);
  for (let index = 0; index < MAGIC.length; index += 1) {
    headerView.setUint8(index, MAGIC.charCodeAt(index));
  }
  headerView.setUint32(8, PROJECT_FILE_FORMAT_VERSION, true);
  headerView.setUint32(12, manifestBytes.byteLength, true);
  return new Blob([header, manifestBytes, ...assets.map((asset) => asset.blob)], {
    type: PROJECT_FILE_MIME_TYPE,
  });
}

async function readBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === "function") {
    return new Uint8Array(await blob.arrayBuffer());
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

function isAssetEntry(value: unknown): value is ProjectFileAssetEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.mimeType === "string" &&
    Number.isSafeInteger(entry.offset) &&
    Number.isSafeInteger(entry.byteLength) &&
    (entry.offset as number) >= 0 &&
    (entry.byteLength as number) >= 0 &&
    (entry.name === undefined || typeof entry.name === "string")
  );
}

export async function decodeProjectFile<Payload>(
  file: Blob,
): Promise<DecodedProjectFile<Payload>> {
  const notAProjectFile = () =>
    new ProjectFileError("This is not an AMOUS project file.");
  if (file.size < HEADER_BYTES) throw notAProjectFile();

  const header = await readBytes(file.slice(0, HEADER_BYTES));
  const headerView = new DataView(
    header.buffer,
    header.byteOffset,
    header.byteLength,
  );
  for (let index = 0; index < MAGIC.length; index += 1) {
    if (headerView.getUint8(index) !== MAGIC.charCodeAt(index)) {
      throw notAProjectFile();
    }
  }
  const version = headerView.getUint32(8, true);
  if (version > PROJECT_FILE_FORMAT_VERSION) {
    throw new ProjectFileError(
      "This project file was saved by a newer version of AMOUS. Update the editor and try again.",
    );
  }
  const manifestLength = headerView.getUint32(12, true);
  const assetStart = HEADER_BYTES + manifestLength;
  if (assetStart > file.size) {
    throw new ProjectFileError("This project file is incomplete or damaged.");
  }

  let manifest: ProjectFileManifest<Payload>;
  try {
    const manifestBytes = await readBytes(file.slice(HEADER_BYTES, assetStart));
    manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
  } catch {
    throw new ProjectFileError("This project file is incomplete or damaged.");
  }
  if (
    !manifest ||
    typeof manifest !== "object" ||
    manifest.format !== "amous-project" ||
    !Array.isArray(manifest.assets) ||
    !manifest.assets.every(isAssetEntry)
  ) {
    throw new ProjectFileError("This project file is incomplete or damaged.");
  }

  const entries = new Map<string, ProjectFileAssetEntry>();
  for (const entry of manifest.assets) {
    if (assetStart + entry.offset + entry.byteLength > file.size) {
      throw new ProjectFileError("This project file is incomplete or damaged.");
    }
    entries.set(entry.id, entry);
  }

  return {
    assetBlob: (id) => {
      const entry = entries.get(id);
      if (!entry) return undefined;
      const start = assetStart + entry.offset;
      return file.slice(start, start + entry.byteLength, entry.mimeType);
    },
    manifest,
  };
}
