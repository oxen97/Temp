import { describe, expect, it } from "vitest";

import {
  decodeProjectFile,
  encodeProjectFile,
  PROJECT_FILE_FORMAT_VERSION,
  PROJECT_FILE_MIME_TYPE,
  ProjectFileError,
} from "./project-file";

async function bytesOf(blob: Blob | undefined) {
  if (!blob) throw new Error("Missing blob");
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
}

async function withHeader(file: Blob, patch: (view: DataView) => void) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  patch(new DataView(bytes.buffer));
  return new Blob([bytes]);
}

describe(".amous project file container", () => {
  it("round-trips the payload and every asset byte for byte", async () => {
    const image = new Blob([new Uint8Array([0, 1, 2, 250, 255])], {
      type: "image/png",
    });
    const sound = new Blob(["ID3 sound bytes"], { type: "audio/mpeg" });
    const payload = { pages: [{ id: "scene-1", name: "소개" }], version: 2 };
    const exportedAt = new Date("2026-09-26T01:02:03.000Z");

    const file = encodeProjectFile(
      payload,
      [
        { blob: image, id: "media-1", name: "poster.png" },
        { blob: sound, id: "media-2", mimeType: "audio/mpeg" },
      ],
      exportedAt,
    );
    expect(file.type).toBe(PROJECT_FILE_MIME_TYPE);

    const { assetBlob, manifest } = await decodeProjectFile<typeof payload>(
      file,
    );
    expect(manifest).toMatchObject({
      exportedAt: exportedAt.toISOString(),
      format: "amous-project",
      formatVersion: PROJECT_FILE_FORMAT_VERSION,
      payload,
    });
    expect(manifest.assets).toEqual([
      {
        byteLength: 5,
        id: "media-1",
        mimeType: "image/png",
        name: "poster.png",
        offset: 0,
      },
      { byteLength: 15, id: "media-2", mimeType: "audio/mpeg", offset: 5 },
    ]);
    expect(await bytesOf(assetBlob("media-1"))).toEqual([0, 1, 2, 250, 255]);
    expect(assetBlob("media-1")?.type).toBe("image/png");
    expect(await assetBlob("media-2")?.text()).toBe("ID3 sound bytes");
    expect(assetBlob("media-3")).toBeUndefined();
  });

  it("stores a project without any media", async () => {
    const file = encodeProjectFile({ empty: true }, []);
    const { manifest } = await decodeProjectFile<{ empty: boolean }>(file);
    expect(manifest.payload).toEqual({ empty: true });
    expect(manifest.assets).toEqual([]);
  });

  it("refuses two assets with the same id", () => {
    const blob = new Blob(["x"]);
    expect(() =>
      encodeProjectFile({}, [
        { blob, id: "media-1" },
        { blob, id: "media-1" },
      ]),
    ).toThrow(ProjectFileError);
  });

  it("explains that other files are not AMOUS projects", async () => {
    await expect(decodeProjectFile(new Blob(["short"]))).rejects.toThrow(
      "This is not an AMOUS project file.",
    );
    await expect(
      decodeProjectFile(new Blob(["PK\u0003\u0004 a zip file, not a project"])),
    ).rejects.toThrow("This is not an AMOUS project file.");
  });

  it("asks for a newer editor when the file format is newer", async () => {
    const newer = await withHeader(encodeProjectFile({}, []), (view) =>
      view.setUint32(8, PROJECT_FILE_FORMAT_VERSION + 1, true),
    );
    await expect(decodeProjectFile(newer)).rejects.toThrow(/newer version/);
  });

  it("reports a cut-off or damaged file instead of loading part of it", async () => {
    const file = encodeProjectFile({ ok: true }, [
      { blob: new Blob(["0123456789"]), id: "media-1" },
    ]);
    await expect(
      decodeProjectFile(file.slice(0, file.size - 4)),
    ).rejects.toThrow("This project file is incomplete or damaged.");

    const longManifest = await withHeader(file, (view) =>
      view.setUint32(12, file.size, true),
    );
    await expect(decodeProjectFile(longManifest)).rejects.toThrow(
      "This project file is incomplete or damaged.",
    );

    const bytes = new Uint8Array(await file.arrayBuffer());
    bytes[16] = "!".charCodeAt(0);
    await expect(decodeProjectFile(new Blob([bytes]))).rejects.toThrow(
      "This project file is incomplete or damaged.",
    );
  });
});
