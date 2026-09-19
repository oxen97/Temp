import { describe, expect, it } from "vitest";

import type {
  ArtboardSettings,
  EditorPage,
} from "@/features/editor/store/editor-store";
import { createPrimitiveObject3D } from "@/features/editor/three/types";

import {
  hydrateEditorDocument,
  serializeEditorDocument,
} from "./editor-document";

const artboard: ArtboardSettings = {
  background: "#d9d9d9",
  cornerRadius: 10,
  gradientStops: [
    { color: "#111111", opacity: 80, position: 0 },
    { color: "#eeeeee", opacity: 100, position: 100 },
  ],
  height: 1080,
  width: 1920,
};

describe("editor document serialization", () => {
  it("writes a V2 project while retaining 2D and sound page fields", () => {
    const pages: EditorPage[] = [
      {
        id: "scene-1",
        name: "Intro",
        elements: [
          {
            fill: "#ffffff",
            height: 100,
            id: "shape-1",
            interactionSounds: [
              {
                assets: [
                  {
                    durationSeconds: 1.25,
                    mimeType: "audio/wav",
                    name: "click.wav",
                    sizeBytes: 1200,
                    src: "blob:click",
                  },
                ],
                avoidRepeating: true,
                enabled: true,
                event: "click",
                fadeInSeconds: 0,
                fadeOutSeconds: 0.2,
                id: "sound-1",
                playbackMode: "shuffle",
                soundSource: "single",
                trigger: "click",
                volume: 75,
              },
            ],
            locked: false,
            name: "Rectangle 1",
            opacity: 100,
            rotation: 0,
            stroke: "#000000",
            strokeWidth: 0,
            type: "rectangle",
            visible: true,
            width: 100,
            x: 20,
            y: 30,
            cornerRadius: 0,
          },
        ],
        backgroundMusic: {
          asset: null,
          delaySeconds: 1,
          fadeInSeconds: 0.4,
          fadeOutSeconds: 0.5,
          loop: true,
          startPlayback: "on-page-enter",
          volume: 60,
        },
      },
    ];

    const document = serializeEditorDocument({
      artboard,
      id: "project-1",
      name: "Exhibition",
      pages,
      updatedAt: "2026-09-20T00:00:00.000Z",
    });

    expect(document.schemaVersion).toBe(2);
    expect(document.artboard).toEqual(artboard);
    expect(document.scenes[0]).toMatchObject({
      backgroundMusic: pages[0].backgroundMusic,
      elements: pages[0].elements,
      objects3d: [],
      scene3d: { enabled: false, projection: "orthographic" },
    });

    document.scenes[0].elements[0] = { id: "changed" };
    expect(pages[0].elements[0].id).toBe("shape-1");
  });

  it("round-trips current 3D scene and asset metadata", () => {
    const cube = createPrimitiveObject3D({
      dimensions: { depth: 80, height: 100, width: 120 },
      id: "cube-1",
      name: "Cube 1",
      position: { x: 500, y: 320, z: 25 },
      primitive: "box",
    });
    const document = serializeEditorDocument({
      artboard,
      assets: [
        {
          animationNames: ["Idle"],
          boneNames: ["Spine"],
          byteLength: 4096,
          createdAt: 1_790_000_000_000,
          fileName: "model.glb",
          id: "asset-1",
          jointNames: ["Shoulder"],
          materialNames: ["Body", "Glass"],
          meshFaceGroupNames: ["BodyMesh · Face Group 1"],
          meshNames: ["BodyMesh"],
          mimeType: "model/gltf-binary",
          morphTargetNames: ["Smile", "Blink"],
        },
      ],
      id: "project-3d",
      name: "3D Exhibition",
      pages: [
        {
          elements: [],
          id: "scene-3d",
          name: "3D Scene",
          objects3d: [cube],
          scene3d: {
            ambientLight: 0.75,
            cameraPosition: { x: 0, y: 0, z: 900 },
            cameraTarget: { x: 0, y: 0, z: 0 },
            enabled: true,
            perspective: 45,
            projection: "perspective",
          },
        },
      ],
      updatedAt: "2026-09-20T00:00:00.000Z",
    });

    const restored = hydrateEditorDocument(document);

    expect(restored.assets[0]).toMatchObject({
      animationNames: ["Idle"],
      boneNames: ["Spine"],
      fileName: "model.glb",
      jointNames: ["Shoulder"],
      materialNames: ["Body", "Glass"],
      meshFaceGroupNames: ["BodyMesh · Face Group 1"],
      meshNames: ["BodyMesh"],
      morphTargetNames: ["Smile", "Blink"],
    });
    expect(restored.pages[0].objects3d).toEqual([cube]);
    expect(restored.pages[0].scene3d).toMatchObject({
      enabled: true,
      perspective: 45,
      projection: "perspective",
    });
  });

  it("hydrates legacy V2 asset metadata with empty material and morph names", () => {
    const restored = hydrateEditorDocument({
      artboard,
      assets: [
        {
          animationNames: ["Idle"],
          byteLength: 2048,
          createdAt: 1_790_000_000_000,
          fileName: "legacy.glb",
          id: "legacy-asset",
          mimeType: "model/gltf-binary",
        },
      ],
      id: "legacy-v2-project",
      name: "Legacy V2",
      scenes: [
        {
          elements: [],
          id: "scene-1",
          name: "Scene 1",
          objects3d: [],
          scene3d: {
            ambientLight: 1,
            cameraPosition: { x: 0, y: 0, z: 1000 },
            cameraTarget: { x: 0, y: 0, z: 0 },
            enabled: false,
            perspective: 35,
            projection: "orthographic",
          },
        },
      ],
      schemaVersion: 2,
      updatedAt: "2026-09-20T00:00:00.000Z",
    });

    expect(restored.assets[0]).toMatchObject({
      animationNames: ["Idle"],
      boneNames: [],
      jointNames: [],
      materialNames: [],
      meshFaceGroupNames: [],
      meshNames: [],
      morphTargetNames: [],
    });
  });

  it("hydrates a V1 project without dropping legacy scene or sound data", () => {
    const source = {
      artboard: {
        ...artboard,
        customViewportFlag: "keep-me",
      },
      id: "legacy-project",
      name: "Legacy",
      scenes: [
        {
          advancedSound: {
            autoNormalize: true,
            outputQuality: "high",
            preloadSounds: "auto",
            spatialSound: true,
            unloadUnusedSounds: false,
          },
          elements: [
            {
              id: "legacy-image",
              src: "data:image/png;base64,abc",
              type: "image",
            },
          ],
          id: "legacy-scene",
          name: "Legacy Scene",
          soundMixer: {
            backgroundMusicVolume: 55,
            interactionSoundVolume: 65,
            masterVolume: 75,
          },
        },
      ],
      schemaVersion: 1 as const,
      updatedAt: "2026-09-19T00:00:00.000Z",
    };

    const restored = hydrateEditorDocument(source);

    expect(restored.artboard).toMatchObject({
      customViewportFlag: "keep-me",
      width: 1920,
    });
    expect(restored.pages[0]).toMatchObject({
      advancedSound: source.scenes[0].advancedSound,
      elements: source.scenes[0].elements,
      objects3d: [],
      scene3d: { enabled: false, projection: "orthographic" },
      soundMixer: source.scenes[0].soundMixer,
    });
  });
});
