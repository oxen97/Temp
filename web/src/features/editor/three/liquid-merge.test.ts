import {
  Box3,
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Texture,
  Vector3,
  type Material,
} from "three";
import { describe, expect, it, vi } from "vitest";

import { createDefaultInteraction } from "@/features/editor/lib/interaction-model";
import { createPrimitiveObject3D } from "@/features/editor/three/types";
import {
  LiquidBridge3D,
  LiquidMerge3DRuntime,
  liquidGap3D,
  readLiquidPull3D,
} from "./liquid-merge";

describe("3D source-preserving liquid connections", () => {
  it("measures world separation on all three axes", () => {
    const first = new Box3(new Vector3(0, 0, 0), new Vector3(10, 10, 10));
    const behind = new Box3(new Vector3(0, 0, 40), new Vector3(10, 10, 50));
    expect(liquidGap3D(first, behind)).toBe(30);
    expect(liquidGap3D(first, first)).toBe(0);
  });

  it("keeps source textures/materials and blends endpoint material values on the bridge only", () => {
    const firstMap = new Texture();
    const secondMap = new Texture();
    const first = new MeshStandardMaterial({
      color: "red",
      map: firstMap,
      roughness: 0.1,
      metalness: 0.7,
    });
    const second = new MeshStandardMaterial({
      color: "blue",
      map: secondMap,
      roughness: 0.8,
    });
    const firstDispose = vi.spyOn(first, "dispose");
    const secondDispose = vi.spyOn(second, "dispose");
    const textureDispose = vi.spyOn(firstMap, "dispose");
    const bridge = new LiquidBridge3D(first, second);
    expect(bridge.mesh.material).not.toBe(first);
    expect((bridge.mesh.material as MeshStandardMaterial).map).toBe(firstMap);
    const shader = {
      uniforms: {},
      vertexShader: "#include <common>\n#include <begin_vertex>",
      fragmentShader:
        "#include <common>\n#include <map_fragment>\n#include <roughnessmap_fragment>\n#include <metalnessmap_fragment>",
    } as Parameters<Material["onBeforeCompile"]>[0];
    (bridge.mesh.material as Material).onBeforeCompile(shader, null as never);
    expect(shader.uniforms.amousTargetMap.value).toBe(secondMap);
    expect(shader.fragmentShader).toContain(
      "smoothstep(0.2, 0.8, vAmousBridgeMix)",
    );
    bridge.update(new Vector3(0, 0, 0), new Vector3(30, 10, 20), 8, 0.7, 1);
    expect(bridge.mesh.visible).toBe(true);
    expect(bridge.mesh.geometry.getAttribute("position").count).toBeLessThan(
      400,
    );
    expect(bridge.mesh.geometry.boundingSphere?.radius).toBeGreaterThan(0);
    expect(
      Array.from(bridge.mesh.geometry.getAttribute("position").array).every(
        Number.isFinite,
      ),
    ).toBe(true);
    const geometryDispose = vi.spyOn(bridge.mesh.geometry, "dispose");
    bridge.dispose();
    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(firstDispose).not.toHaveBeenCalled();
    expect(secondDispose).not.toHaveBeenCalled();
    expect(textureDispose).not.toHaveBeenCalled();
  });

  it("connects actual source surfaces within join distance, attracts transiently, and releases without changing the originals", () => {
    const sourceDefinition = createPrimitiveObject3D({
      id: "source",
      name: "Source",
      primitive: "box",
      position: { x: 0, y: 0, z: 0 },
      dimensions: { width: 20, height: 20, depth: 20 },
    });
    const targetDefinition = createPrimitiveObject3D({
      id: "target",
      name: "Target",
      primitive: "box",
      position: { x: 35, y: 0, z: 0 },
      dimensions: { width: 20, height: 20, depth: 20 },
    });
    sourceDefinition.interactions = [
      createDefaultInteraction({
        effect: "liquid-merge",
        trigger: "near-target",
        collisionTarget: "target",
        joinDistance: 20,
        releaseDistance: 30,
        liquidAttraction: 50,
        motion: "direct",
      }),
    ];
    const scene = new Group();
    const source = new Group();
    source.userData.amousObjectId = "source";
    const target = new Group();
    target.userData.amousObjectId = "target";
    target.position.x = 35;
    const geometry = new BoxGeometry(20, 20, 20);
    const material = new MeshStandardMaterial({ color: "purple" });
    const originalPositions = Array.from(
      geometry.getAttribute("position").array,
    );
    source.add(new Mesh(geometry, material));
    target.add(
      new Mesh(
        new BoxGeometry(20, 20, 20),
        new MeshStandardMaterial({ color: "orange" }),
      ),
    );
    scene.add(source, target);
    const runtime = new LiquidMerge3DRuntime(scene, [
      sourceDefinition,
      targetDefinition,
    ]);
    expect(runtime.update(1 / 60)).toBe(true);
    const bridge = scene.children.find(
      (child) => child.name === "Interaction liquid bridge",
    )!;
    expect(bridge.visible).toBe(true);
    expect(readLiquidPull3D(source, new Vector3()).x).toBeGreaterThan(0);
    expect(readLiquidPull3D(target, new Vector3()).x).toBeLessThan(0);
    expect(runtime.update(1 / 60)).toBe(false);
    expect(source.position.x).toBe(0);
    expect((source.children[0] as Mesh).material).toBe(material);
    expect(Array.from(geometry.getAttribute("position").array)).toEqual(
      originalPositions,
    );
    target.position.x = 100;
    runtime.update(1 / 60);
    expect(bridge.visible).toBe(false);
    expect(readLiquidPull3D(source, new Vector3()).length()).toBe(0);
    runtime.dispose();
    expect(scene.children).toHaveLength(2);
    expect(source.userData.amousLiquidPull).toBeUndefined();
  });
});
