import { afterEach, describe, expect, it, vi } from "vitest";

import {
  hydrateEditorDocument,
  serializeEditorDocument,
} from "@/core/project/editor-document";
import {
  decodeProjectFile,
  encodeProjectFile,
  ProjectFileError,
} from "@/core/project/project-file";
import { createDefaultInteraction } from "@/features/editor/lib/interaction-model";
import { createSceneLogicRule } from "@/features/editor/lib/scene-logic";
import type {
  ArtboardSettings,
  CanvasElement,
  EditorPage,
} from "@/features/editor/store/editor-store";
import {
  createPrimitiveObject3D,
  type Model3DAssetMetadata,
  type Object3DElement,
} from "@/features/editor/three/types";

import {
  createProjectFile,
  type ProjectLibrary,
  projectFileName,
  readProjectFile,
} from "./project-file";

const url = (name: string) => `blob:http://localhost:3000/${name}`;
const IMAGE = url("image");
const VIDEO = url("video");
const SOUND = url("sound");
const MUSIC = url("music");
const BACKDROP = url("backdrop");
const UNPLACED = url("unplaced");

const originalBlobs: Record<string, Blob> = {
  [BACKDROP]: new Blob(["backdrop"], { type: "image/jpeg" }),
  [IMAGE]: new Blob([new Uint8Array([137, 80, 78, 71, 0, 255])], {
    type: "image/png",
  }),
  [MUSIC]: new Blob(["music"], { type: "audio/mpeg" }),
  [SOUND]: new Blob(["tap sound"], { type: "audio/wav" }),
  [UNPLACED]: new Blob(["not on a scene yet"], { type: "image/webp" }),
  [VIDEO]: new Blob(["video frames"], { type: "video/mp4" }),
};

function modelMetadata(id: string, fileName: string): Model3DAssetMetadata {
  return {
    animationNames: ["Idle"],
    boneNames: [],
    byteLength: 12,
    createdAt: 1_790_000_000_000,
    fileName,
    id,
    jointNames: [],
    materialNames: ["Body"],
    meshFaceGroupNames: [],
    meshNames: ["Mesh"],
    mimeType: "model/gltf-binary",
    morphTargetNames: [],
  };
}

const robot = modelMetadata("robot", "robot.glb");
const spare = modelMetadata("spare", "spare.glb");
const modelBlobs: Record<string, Blob> = {
  robot: new Blob(["glTF robot..."], { type: "model/gltf-binary" }),
  spare: new Blob(["glTF spare..."], { type: "model/gltf-binary" }),
};

function element(overrides: Partial<CanvasElement>): CanvasElement {
  return {
    cornerRadius: 0,
    fill: "#ffffff",
    height: 100,
    id: "element",
    locked: false,
    name: "Element",
    opacity: 100,
    rotation: 0,
    stroke: "transparent",
    strokeWidth: 0,
    type: "rectangle",
    visible: true,
    width: 100,
    x: 10,
    y: 20,
    ...overrides,
  };
}

function robotObject(): Object3DElement {
  return {
    ...createPrimitiveObject3D({
      dimensions: { depth: 100, height: 100, width: 100 },
      id: "robot-1",
      name: "Robot",
      position: { x: 300, y: 200, z: 0 },
      primitive: "box",
    }),
    source: { assetId: "robot", kind: "asset" },
  };
}

function artwork() {
  const artboard: ArtboardSettings = {
    background: "#101010",
    backgroundImage: BACKDROP,
    backgroundType: "image",
    cornerRadius: 10,
    height: 1080,
    width: 1920,
  };
  const pages: EditorPage[] = [
    {
      backgroundMusic: {
        asset: {
          durationSeconds: 12,
          mimeType: "audio/mpeg",
          name: "theme.mp3",
          sizeBytes: 5,
          src: MUSIC,
        },
        delaySeconds: 0,
        fadeInSeconds: 1,
        fadeOutSeconds: 1,
        loop: true,
        startPlayback: "on-page-enter",
        volume: 80,
      },
      elements: [
        element({
          id: "photo",
          interactionSounds: [
            {
              assets: [
                {
                  durationSeconds: 0,
                  mimeType: "audio/wav",
                  name: "tap.wav",
                  sizeBytes: 9,
                  src: SOUND,
                },
              ],
              avoidRepeating: false,
              enabled: true,
              event: "click",
              fadeInSeconds: 0,
              fadeOutSeconds: 0,
              id: "photo-sound",
              playbackMode: "sequential",
              soundSource: "single",
              trigger: "click",
              volume: 70,
            },
          ],
          interactions: [
            createDefaultInteraction({
              id: "photo-drop",
              motion: "gravity",
              trigger: "click-tap",
            }),
          ],
          name: "photo.png",
          src: IMAGE,
          type: "image",
        }),
        element({ id: "clip", name: "clip.mp4", src: VIDEO, type: "video" }),
        element({ id: "title", name: "Title", text: "밤의 우체국", type: "text" }),
      ],
      id: "scene-1",
      logicRules: [
        createSceneLogicRule({
          id: "to-gallery",
          interactionId: "photo-drop",
          objectId: "photo",
          targetPageId: "scene-2",
        }),
      ],
      name: "Intro",
      objects3d: [robotObject()],
    },
    {
      elements: [element({ id: "photo-again", src: IMAGE, type: "image" })],
      id: "scene-2",
      name: "Gallery",
    },
  ];
  const library: ProjectLibrary = {
    media: [
      { kind: "image", name: "photo.png", src: IMAGE },
      { kind: "image", name: "unplaced.webp", src: UNPLACED },
    ],
    modelAssets: [robot, spare],
  };
  return { artboard, library, pages };
}

async function bytes(blob: Blob | undefined) {
  if (!blob) throw new Error("Missing blob");
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
}

function exportDeps(missing: { models?: string[]; urls?: string[] } = {}) {
  return {
    loadModelAsset: vi.fn(async (assetId: string) =>
      missing.models?.includes(assetId) || !modelBlobs[assetId]
        ? undefined
        : {
            blob: modelBlobs[assetId],
            metadata: assetId === "robot" ? robot : spare,
          },
    ),
    now: new Date(2026, 8, 26, 9, 5),
    resolveObjectUrl: vi.fn(async (source: string) => {
      const blob = originalBlobs[source];
      if (!blob || missing.urls?.includes(source)) {
        throw new Error("revoked");
      }
      return blob;
    }),
  };
}

function importDeps() {
  const created: Blob[] = [];
  const stored: { blob: Blob; metadata: Model3DAssetMetadata }[] = [];
  return {
    created,
    deps: {
      createObjectUrl: (blob: Blob) => {
        created.push(blob);
        return `blob:restored/${created.length}`;
      },
      storeModelAsset: vi.fn(async (metadata: Model3DAssetMetadata, blob: Blob) => {
        stored.push({ blob, metadata });
      }),
    },
    stored,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("project files", () => {
  it("names files after the moment they were saved", () => {
    expect(projectFileName(new Date(2026, 0, 3, 7, 4))).toBe(
      "AMOUS-20260103-0704.amous",
    );
  });

  it("carries every scene, setting and uploaded file to a new tab", async () => {
    const { artboard, library, pages } = artwork();
    const saved = await createProjectFile(
      { activePageId: "scene-2", artboard, pages },
      library,
      exportDeps(),
    );
    expect(saved.fileName).toBe("AMOUS-20260926-0905.amous");
    expect(saved.missingAssetCount).toBe(0);

    // Tab-only blob: URLs never end up in the file, only their bytes do.
    const { manifest } = await decodeProjectFile(saved.blob);
    expect(JSON.stringify(manifest.payload)).not.toContain("blob:");
    expect(manifest.assets.map((asset) => asset.id).sort()).toEqual([
      "media-1",
      "media-2",
      "media-3",
      "media-4",
      "media-5",
      "media-6",
      "model-1",
      "model-2",
    ]);

    const { created, deps, stored } = importDeps();
    const opened = await readProjectFile(saved.blob, deps);
    const [intro, gallery] = opened.snapshot.pages;
    const photo = intro.elements[0];
    const clip = intro.elements[1];

    expect(opened.snapshot.activePageId).toBe("scene-2");
    expect(opened.missingAssetCount).toBe(0);
    expect(opened.createdObjectUrls).toHaveLength(6);
    expect(created).toHaveLength(6);

    // One upload used twice still becomes one new URL.
    expect(photo.src).toMatch(/^blob:restored\//);
    expect(gallery.elements[0].src).toBe(photo.src);
    const restored = (source: string | undefined) =>
      created[Number(source?.split("/").pop()) - 1];
    expect(await bytes(restored(photo.src))).toEqual(
      await bytes(originalBlobs[IMAGE]),
    );
    expect(restored(photo.src)?.type).toBe("image/png");
    expect(await restored(clip.src)?.text()).toBe("video frames");
    expect(
      await restored(photo.interactionSounds?.[0].assets[0].src)?.text(),
    ).toBe("tap sound");
    expect(await restored(intro.backgroundMusic?.asset?.src)?.text()).toBe(
      "music",
    );
    expect(await restored(opened.snapshot.artboard?.backgroundImage)?.text()).toBe(
      "backdrop",
    );

    // Everything else comes back exactly as the document boundary keeps it.
    const urlByOriginal = new Map([
      [IMAGE, photo.src],
      [VIDEO, clip.src],
      [SOUND, photo.interactionSounds?.[0].assets[0].src],
      [MUSIC, intro.backgroundMusic?.asset?.src],
      [BACKDROP, opened.snapshot.artboard?.backgroundImage],
    ]);
    const withRestoredUrls = <T,>(value: T): T => {
      let text = JSON.stringify(value);
      for (const [from, to] of urlByOriginal) text = text.replaceAll(from, to ?? "");
      return JSON.parse(text) as T;
    };
    const expected = hydrateEditorDocument(
      serializeEditorDocument({
        artboard,
        assets: [robot, spare],
        id: "local-project",
        name: "AMOUS project",
        pages,
      }),
    );
    expect(opened.snapshot.pages).toEqual(withRestoredUrls(expected.pages));
    expect(opened.snapshot.artboard).toEqual(withRestoredUrls(artboard));
    expect(photo.interactions?.[0]).toMatchObject({
      id: "photo-drop",
      motion: "gravity",
    });
    expect(intro.logicRules?.[0]).toMatchObject({ id: "to-gallery" });
    expect(intro.objects3d?.[0].source).toEqual({
      assetId: "robot",
      kind: "asset",
    });

    // 3D models go back into this browser's model store under their ids.
    expect(stored.map((entry) => entry.metadata)).toEqual([robot, spare]);
    expect(await stored[0].blob.text()).toBe("glTF robot...");

    // The ASSETS panel gets its uploads back, placed on a scene or not.
    expect(
      opened.library.media.map(({ kind, name, src }) => ({ kind, name, src })),
    ).toEqual([
      { kind: "image", name: "photo.png", src: photo.src },
      {
        kind: "image",
        name: "unplaced.webp",
        src: expect.stringMatching(/^blob:restored\//),
      },
    ]);
    expect(await opened.library.media[1].blob.text()).toBe(
      "not on a scene yet",
    );
    expect(opened.library.modelAssets).toEqual([robot, spare]);
  });

  it("still saves when some files can no longer be read, and counts them", async () => {
    const { artboard, library, pages } = artwork();
    const saved = await createProjectFile(
      { activePageId: "scene-1", artboard, pages },
      library,
      exportDeps({ models: ["robot"], urls: [VIDEO] }),
    );
    expect(saved.missingAssetCount).toBe(2);

    const { deps, stored } = importDeps();
    const opened = await readProjectFile(saved.blob, deps);
    expect(opened.missingAssetCount).toBe(2);
    expect(opened.snapshot.pages[0].elements[1].src).toBe(VIDEO);
    expect(opened.snapshot.pages[0].elements[0].src).toMatch(/^blob:restored\//);
    expect(stored.map((entry) => entry.metadata.id)).toEqual(["spare"]);
  });

  it("saves and opens work that fails validation instead of losing it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { artboard, pages } = artwork();
    const flat = robotObject();
    flat.dimensions.width = 0;
    pages[1].objects3d = [flat];

    const saved = await createProjectFile(
      { activePageId: "scene-1", artboard, pages },
      { media: [], modelAssets: [] },
      exportDeps(),
    );
    const opened = await readProjectFile(saved.blob, importDeps().deps);

    expect(warn).toHaveBeenCalledTimes(2);
    expect(opened.snapshot.pages.map((page) => page.id)).toEqual([
      "scene-1",
      "scene-2",
    ]);
    expect(opened.snapshot.pages[1].objects3d?.[0].dimensions.width).toBe(0);
    expect(opened.snapshot.pages[0].elements[0].src).toMatch(
      /^blob:restored\//,
    );
  });

  it("explains files it cannot open", async () => {
    const { deps } = importDeps();
    await expect(
      readProjectFile(new Blob(["\u0089PNG not a project"]), deps),
    ).rejects.toThrow(new ProjectFileError("This is not an AMOUS project file."));

    const noScenes = encodeProjectFile(
      {
        activePageId: "scene-1",
        document: {
          assets: [],
          id: "local-project",
          name: "AMOUS project",
          scenes: [],
          schemaVersion: 2,
          updatedAt: "2026-09-26T00:00:00.000Z",
        },
        library: { media: [], modelAssetIds: [] },
        missingAssetCount: 0,
        modelAssets: {},
      },
      [],
    );
    await expect(readProjectFile(noScenes, deps)).rejects.toThrow(
      "This project file has no scenes.",
    );

    const noDocument = encodeProjectFile({ activePageId: "scene-1" }, []);
    await expect(readProjectFile(noDocument, deps)).rejects.toThrow(
      "This project file is incomplete or damaged.",
    );
  });
});
