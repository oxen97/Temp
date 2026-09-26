import { describe, expect, it } from "vitest";

import {
  type ArtboardSettings,
  useEditorStore,
} from "@/features/editor/store/editor-store";

import {
  artboardForScene,
  effectiveSceneBackground,
  isSceneBackgroundKey,
  normalizeSceneBackground,
  SCENE_BACKGROUND_KEYS,
} from "./scene-background";

const common: ArtboardSettings = {
  background: "#d9d9d9",
  backgroundImage: "blob:common-image",
  backgroundMediaType: "image",
  backgroundSolidEnabled: true,
  cornerRadius: 10,
  height: 1080,
  pageType: "screen",
  viewportMode: "fit",
  width: 1920,
};

describe("scene backgrounds", () => {
  it("lists every background field of the artboard and none of its page settings", () => {
    const pageSettings = [
      "cornerRadius",
      "height",
      "pageAspectRatio",
      "pageType",
      "viewportMode",
      "width",
    ];
    for (const key of Object.keys(useEditorStore.getState().artboard)) {
      expect(isSceneBackgroundKey(key), key).toBe(!pageSettings.includes(key));
    }
    expect(SCENE_BACKGROUND_KEYS).toContain("backgroundRotateWithCamera");
  });

  it("shows the common background until a scene has its own", () => {
    expect(artboardForScene(common, { background: undefined })).toBe(common);
    expect(artboardForScene(common, null)).toBe(common);
    expect(effectiveSceneBackground(common, undefined)).toEqual({
      background: "#d9d9d9",
      backgroundImage: "blob:common-image",
      backgroundMediaType: "image",
      backgroundSolidEnabled: true,
    });
  });

  it("replaces every background field and keeps the page settings", () => {
    const page = {
      background: {
        background: "#112233",
        backgroundGradientEnabled: true,
        gradientStops: [
          { color: "#ff0000", opacity: 100, position: 0 },
          { color: "#0000ff", opacity: 50, position: 100 },
        ],
      },
    };
    const scene = artboardForScene(common, page);
    expect(scene).toMatchObject({
      background: "#112233",
      backgroundGradientEnabled: true,
      cornerRadius: 10,
      height: 1080,
      pageType: "screen",
      width: 1920,
    });
    // Unset in the scene means unset, not "the common value".
    expect(scene.backgroundImage).toBeUndefined();
    expect(scene.backgroundMediaType).toBeUndefined();
    // The same inputs give the same object, so memoized views stay put.
    expect(artboardForScene(common, page)).toBe(scene);
    expect(artboardForScene({ ...common }, page)).not.toBe(scene);
  });

  it("reads a saved scene background and drops anything malformed", () => {
    expect(normalizeSceneBackground(undefined)).toBeUndefined();
    expect(normalizeSceneBackground("#fff")).toBeUndefined();
    expect(normalizeSceneBackground([])).toBeUndefined();
    expect(normalizeSceneBackground({ backgroundImage: "x" })).toBeUndefined();
    expect(
      normalizeSceneBackground({
        background: "#000000",
        backgroundImage: "amous-asset:media-1",
        backgroundRotateWithCamera: true,
        gradientStops: [{ color: "#fff" }],
        unknownField: 3,
        width: 10,
      }),
    ).toEqual({
      background: "#000000",
      backgroundImage: "amous-asset:media-1",
      backgroundRotateWithCamera: true,
    });
    const stops = [{ color: "#fff", opacity: 100, position: 0 }];
    const read = normalizeSceneBackground({
      background: "#000000",
      gradientStops: stops,
    });
    expect(read?.gradientStops).toEqual(stops);
    expect(read?.gradientStops?.[0]).not.toBe(stops[0]);
  });
});
