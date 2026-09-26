import { Texture, Vector2 } from "three";
import { describe, expect, it } from "vitest";

import { createDefaultInteraction } from "@/features/editor/lib/interaction-model";
import type { ArtboardSettings } from "@/features/editor/store/editor-store";

import {
  cameraSkyForScene,
  cameraSkyViewKey,
  cameraSkyViewRequest,
  createCameraSkyMaterial,
  prepareCameraSkyTexture,
  sceneUsesCameraRotate,
  setCameraSkyView,
} from "./camera-sky";

const skyArtboard: ArtboardSettings = {
  background: "#000000",
  backgroundImage: "blob:night-sky",
  backgroundImageOpacity: 80,
  backgroundMediaType: "image",
  backgroundRotateWithCamera: true,
  cornerRadius: 0,
  height: 1080,
  width: 1920,
};

const orbit = (overrides = {}) => ({
  interactions: [
    createDefaultInteraction({
      effect: "camera-rotate",
      trigger: "drag",
      triggerArea: "entire-artwork",
      ...overrides,
    }),
  ],
  visible: true,
});

describe("Rotate with Camera sky", () => {
  it("is a sky only for an image background on a scene that turns the camera", () => {
    expect(cameraSkyForScene(skyArtboard, [orbit()])).toEqual({
      // Orthographic cameras see the sky with the scene's Perspective value.
      fov: 35,
      opacity: 0.8,
      src: "blob:night-sky",
    });
    expect(
      cameraSkyForScene(skyArtboard, [
        orbit({ cameraFov: 40, cameraProjection: "perspective" }),
      ])?.fov,
    ).toBe(40);

    const off = { ...skyArtboard, backgroundRotateWithCamera: false };
    const video = {
      ...skyArtboard,
      backgroundMediaType: "video" as const,
      backgroundVideo: "blob:clip",
    };
    const noImage = { ...skyArtboard, backgroundImage: undefined };
    expect(cameraSkyForScene(off, [orbit()])).toBeNull();
    expect(cameraSkyForScene(video, [orbit()])).toBeNull();
    expect(cameraSkyForScene(noImage, [orbit()])).toBeNull();
    expect(cameraSkyForScene(skyArtboard, [])).toBeNull();
    expect(
      cameraSkyForScene(skyArtboard, [{ ...orbit(), visible: false }]),
    ).toBeNull();
    expect(
      cameraSkyForScene(skyArtboard, [orbit({ enabled: false })]),
    ).toBeNull();
    expect(sceneUsesCameraRotate([orbit({ effect: "opacity" })])).toBe(false);
  });

  it("renders the still at the artboard's shape, at most 2048 px wide", () => {
    const request = cameraSkyViewRequest(
      { fov: 40, src: "blob:night-sky" },
      3840,
      2160,
    );
    expect(request).toEqual({
      fov: 40,
      height: 1152,
      src: "blob:night-sky",
      width: 2048,
    });
    expect(
      cameraSkyViewRequest({ fov: 40, src: "x" }, 1080, 1920),
    ).toMatchObject({ height: 1920, width: 1080 });
    expect(cameraSkyViewKey(request)).not.toBe(
      cameraSkyViewKey({ ...request, fov: 41 }),
    );
    expect(cameraSkyViewKey(request)).not.toBe(
      cameraSkyViewKey({ ...request, src: "blob:other-sky" }),
    );
  });

  it("sizes the sky to the field of view and fades it with the media opacity", () => {
    const texture = prepareCameraSkyTexture(new Texture());
    // No mipmaps: the image wraps behind the camera without a seam.
    expect(texture.generateMipmaps).toBe(false);
    const material = createCameraSkyMaterial(texture);
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    setCameraSkyView(material, { aspect: 16 / 9, fov: 40, opacity: 0.5 });
    const half = Math.tan((20 * Math.PI) / 180);
    const extent = material.uniforms.halfExtent.value as Vector2;
    expect(extent.y).toBeCloseTo(half);
    expect(extent.x).toBeCloseTo((half * 16) / 9);
    expect(material.uniforms.opacity.value).toBe(0.5);
    expect(material.uniforms.map.value).toBe(texture);
    material.dispose();
  });
});
