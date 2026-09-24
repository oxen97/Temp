import { describe, expect, it } from "vitest";

import { createDefaultInteraction } from "./interaction-model";
import { createSpawn3DInstance } from "./viewer-generated-3d-effects";
import { createPrimitiveObject3D } from "@/features/editor/three/types";

function sourceObject() {
  const source = createPrimitiveObject3D({
    dimensions: { width: 120, height: 80, depth: 40 },
    id: "template",
    name: "Cube",
    position: { x: 40, y: 50, z: 60 },
    primitive: "box",
  });
  source.transform.rotation = { x: 10, y: 20, z: 30 };
  source.transform.scale = { x: -2, y: 3, z: 4 };
  source.interactions = [
    createDefaultInteraction({ id: "bend", waveTargetIds: ["path"] }),
  ];
  return source;
}

describe("3D spawn instances", () => {
  it("places a scaled and rotated independent object at the pointer and preserves source depth", () => {
    const source = sourceObject();
    const original = structuredClone(source);
    const interaction = createDefaultInteraction({
      id: "spawn",
      spawnSourceId: source.id,
      spawnSizeMin: 50,
      spawnSizeMax: 150,
      spawnRotationMin: -20,
      spawnRotationMax: 60,
      spawnInheritInteractions: true,
    });
    const instance = createSpawn3DInstance(
      [source],
      interaction,
      { x: 240, y: 310 },
      "copy-1",
      () => 0.25,
    )!;
    expect(instance).toMatchObject({ id: "copy-1", interactionId: "spawn" });
    expect(instance.objects).toHaveLength(1);
    const copy = instance.objects[0];
    expect(copy.id).toBe("copy-1:template");
    expect(copy.transform).toMatchObject({
      position: { x: 240, y: 310, z: 60 },
      rotation: { x: 10, y: 20, z: 30 },
      scale: { x: -1.5, y: 2.25, z: 3 },
    });
    expect(copy.source).toEqual(source.source);
    expect(copy.material).toEqual(source.material);
    expect(copy.source).not.toBe(source.source);
    expect(copy.material).not.toBe(source.material);
    copy.interactions![0].waveTargetIds.push("another");
    copy.material.color = "#ff0000";
    expect(source).toEqual(original);
    const second = createSpawn3DInstance(
      [source],
      interaction,
      { x: 0, y: 0 },
      "copy-2",
      () => 0,
    )!;
    expect(second.objects[0].id).not.toBe(copy.id);
  });

  it("can omit inherited interactions and resolves reversed authoring ranges", () => {
    const source = sourceObject();
    source.visible = false;
    const instance = createSpawn3DInstance(
      [source],
      createDefaultInteraction({
        spawnSourceId: source.id,
        spawnInheritInteractions: false,
        spawnSizeMin: 150,
        spawnSizeMax: 50,
        spawnRotationMin: 80,
        spawnRotationMax: 20,
      }),
      { x: 10, y: 20 },
      "copy",
      () => 1,
    )!;
    expect(instance.objects[0]).toMatchObject({
      visible: true,
      interactions: [],
    });
    expect(instance.objects[0].transform.scale).toEqual({
      x: -3,
      y: 4.5,
      z: 6,
    });
    expect(instance.objects[0].transform.rotation.z).toBe(110);
    expect(source.visible).toBe(false);
    expect(source.interactions).toHaveLength(1);
  });

  it("returns null for a missing 3D template so 2D templates can use their own runtime", () => {
    expect(
      createSpawn3DInstance(
        [sourceObject()],
        createDefaultInteraction({ spawnSourceId: "2d-image" }),
        { x: 0, y: 0 },
        "copy",
      ),
    ).toBeNull();
  });
});
