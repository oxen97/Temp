import { describe, expect, it } from "vitest";

import {
  createMonArtSceneElements,
  createMonArtSceneLogicRules,
  MON_ART_SCENES,
} from "./mon-demo-elements";

const width = 1920;
const height = 1080;

describe("AMOUS authored scenes", () => {
  it("uses original native artwork and AMOUS branding across all four scenes", () => {
    expect(MON_ART_SCENES.map((scene) => scene.name)).toEqual([
      "BREEZE",
      "INK",
      "BLOOM",
      "TOPOGRAPHY",
    ]);
    MON_ART_SCENES.forEach((scene, index) => {
      const elements = createMonArtSceneElements(index, width, height);
      const labels = elements
        .flatMap((element) => [
          element.name,
          element.text ?? "",
          ...(element.interactions ?? []).map(
            (interaction) => interaction.name,
          ),
        ])
        .join("\n");
      expect(
        elements.find(
          (element) => element.id === `mon-art-${index + 1}-scene-title`,
        )?.text,
      ).toBe(scene.name);
      expect(labels).toMatch(/\bAMOUS\b/);
      expect(labels).not.toMatch(
        /\bMON\b|M[•·]N|Kim Jongmin|\b(?:pendulum|afterimage|gaze|resonance|eyes?|iris|pupil|red)\b/i,
      );
      expect(
        elements.some(
          (element) => element.type === "image" || element.type === "video",
        ),
      ).toBe(false);
      expect(new Set(elements.map((element) => element.id)).size).toBe(
        elements.length,
      );
    });
  });

  it("connects every visible next-scene control through a persisted Logic rule", () => {
    MON_ART_SCENES.forEach((scene, index) => {
      const elements = createMonArtSceneElements(index, width, height);
      const next = elements.find(
        (element) => element.id === `mon-art-${index + 1}-next-hit`,
      );
      const route = createMonArtSceneLogicRules(index)[0];
      expect(next?.interactions?.[0]).toMatchObject({
        id: `mon-art-${index + 1}-next-click`,
        trigger: "click-tap",
        effect: "emit-event",
      });
      expect(next?.name).toBe("Next scene · Logic trigger");
      expect(route).toMatchObject({
        objectId: next?.id,
        interactionId: next?.interactions?.[0].id,
        targetPageId: MON_ART_SCENES[(index + 1) % 4].id,
      });
      expect(createMonArtSceneLogicRules(index)[1]).toMatchObject({
        action: "end-artwork",
        objectId: `mon-art-${index + 1}-close`,
        interactionId: `mon-art-${index + 1}-close-click`,
      });
      expect(scene.id).toBe(`mon-art-scene-${index + 1}`);
    });
  });

  it("authors BREEZE as 19 editable reeds anchored at the bottom", () => {
    const breeze = createMonArtSceneElements(0, width, height);
    const reeds = breeze.filter((element) =>
      /^mon-art-1-bar-\d+$/.test(element.id),
    );
    expect(reeds).toHaveLength(19);
    reeds.forEach((reed, index) => {
      expect(reed).toMatchObject({
        id: `mon-art-1-bar-${index + 1}`,
        type: "pen",
        locked: false,
      });
      expect(reed.vectorPaths?.[0].points.length).toBeGreaterThanOrEqual(2);
      expect(reed.interactions?.[0]).toMatchObject({
        effect: "strand-bend",
        trigger: "drag",
        strandDragMode: "swipe",
        strandAnchor: "bottom",
      });
      expect(reed.interactions?.[0].strandNeighborRadius).toBeGreaterThan(0);
      expect(reed.interactions?.[0].strandNeighborStrength).toBeGreaterThan(0);
    });
  });

  it("authors an INK drag trail and a BLOOM click-spawned flower group", () => {
    const ink = createMonArtSceneElements(1, width, height);
    const bloom = createMonArtSceneElements(2, width, height);
    expect(
      ink.find((element) => element.id === "mon-art-2-trail-emitter")
        ?.interactions?.[0],
    ).toMatchObject({
      effect: "pointer-trail",
      trigger: "drag",
      triggerArea: "entire-artwork",
    });
    expect(
      bloom.find((element) => element.id === "mon-art-3-spawn-emitter")
        ?.interactions?.[0],
    ).toMatchObject({
      effect: "spawn-instance",
      trigger: "click-tap",
      triggerArea: "entire-artwork",
      spawnSourceId: "mon-art-3-flower-1",
    });
    const flower = bloom.filter(
      (element) => element.groupId === "mon-art-3-flower-1",
    );
    expect(flower.length).toBeGreaterThan(2);
    expect(flower.every((element) => !element.locked)).toBe(true);
    expect(flower.some((element) => /petal/i.test(element.name))).toBe(true);
    expect(bloom.some((element) => /eye|iris|pupil/.test(element.id))).toBe(
      false,
    );
  });

  it("authors TOPOGRAPHY as 28 editable pointer-responsive contour paths", () => {
    const topography = createMonArtSceneElements(3, width, height);
    const contours = topography.filter((element) =>
      /^mon-art-4-wave-\d+$/.test(element.id),
    );
    expect(contours).toHaveLength(28);
    contours.forEach((contour, index) => {
      expect(contour).toMatchObject({
        id: `mon-art-4-wave-${index + 1}`,
        name: `Contour path ${index + 1}`,
        type: "pen",
        locked: false,
      });
      expect(contour.vectorPaths?.[0].points.length).toBeGreaterThanOrEqual(2);
      expect(contour.interactions?.[0]).toMatchObject({
        name: "Pointer-responsive contour field",
        effect: "wave-deform",
        trigger: "pointer-move",
        triggerArea: "entire-artwork",
      });
    });
  });
});
