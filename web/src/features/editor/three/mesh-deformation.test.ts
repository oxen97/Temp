import {
  Box3,
  BoxGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  Raycaster,
  Vector3,
} from "three";
import { describe, expect, it, vi } from "vitest";

import { createDefaultInteraction } from "@/features/editor/lib/interaction-model";
import { createDeformableGeometry3D } from "./deformable-geometry";
import {
  bendPoint3D,
  createStrandPose3D,
  MeshDeformation3D,
  stepStrandPose3D,
  wavePoint3D,
} from "./mesh-deformation";

const interaction = createDefaultInteraction({
  effect: "strand-bend",
  trigger: "drag",
  strandAnchor: "top",
  strandStiffness: 0.4,
  strandMaxDisplacement: 40,
});

describe("instance-local 3D mesh deformation", () => {
  it.each(["top", "bottom", "left", "right"] as const)(
    "keeps the %s anchor face fixed while bending the free end",
    (anchor) => {
      const bounds = new Box3(
        new Vector3(-10, -30, -5),
        new Vector3(10, 30, 5),
      );
      const anchored = new Vector3(
        anchor === "left" ? -10 : anchor === "right" ? 10 : 0,
        anchor === "top" ? 30 : anchor === "bottom" ? -30 : 0,
        4,
      );
      const free = anchored.clone().negate();
      const original = anchored.clone();
      const freeOriginal = free.clone();
      const displacement = new Vector3(7, 2, 6);
      bendPoint3D(anchored, bounds, displacement, {
        ...interaction,
        strandAnchor: anchor,
      });
      bendPoint3D(free, bounds, displacement, {
        ...interaction,
        strandAnchor: anchor,
      });
      expect(anchored.distanceTo(original)).toBeLessThan(1e-6);
      expect(free.distanceTo(freeOriginal.add(displacement))).toBeLessThan(
        1e-6,
      );
    },
  );

  it("preserves nested model transforms, source geometry/materials and restores owned resources", () => {
    const source = new BoxGeometry(2, 6, 2, 1, 12, 1);
    source.setAttribute(
      "skinWeight",
      new Float32BufferAttribute(
        new Float32Array(source.getAttribute("position").count * 4),
        4,
      ),
    );
    source.morphAttributes.position = [source.getAttribute("position").clone()];
    const originalPositions = Array.from(source.getAttribute("position").array);
    const material = new MeshStandardMaterial({ color: "red" });
    const root = new Group();
    root.position.set(50, 80, -10);
    root.rotation.z = 0.7;
    root.scale.set(2, 1.5, 3);
    const nested = new Group();
    nested.position.set(5, 2, 1);
    nested.scale.set(2, 3, 2);
    const mesh = new Mesh(source, material);
    nested.add(mesh);
    root.add(nested);
    const transform = nested.matrix.clone();
    const deformation = new MeshDeformation3D(root);
    const clone = mesh.geometry;
    const restingPositions = Array.from(clone.getAttribute("position").array);
    const dispose = vi.spyOn(clone, "dispose");
    const sourceDispose = vi.spyOn(source, "dispose");
    deformation.apply((point, bounds) =>
      bendPoint3D(point, bounds, new Vector3(20, 0, 0), interaction),
    );
    expect(mesh.geometry).not.toBe(source);
    expect(mesh.material).toBe(material);
    expect(Array.from(source.getAttribute("position").array)).toEqual(
      originalPositions,
    );
    expect(clone.getAttribute("skinWeight")).toBeDefined();
    expect(clone.morphAttributes.position).toHaveLength(1);
    expect(nested.position.toArray()).toEqual([5, 2, 1]);
    expect(nested.scale.toArray()).toEqual([2, 3, 2]);
    expect(transform).toBeDefined();
    expect(clone.boundingBox!.max.x).toBeGreaterThan(
      source.parameters.width / 2,
    );
    deformation.restore();
    expect(Array.from(clone.getAttribute("position").array)).toEqual(
      restingPositions,
    );
    deformation.dispose();
    expect(mesh.geometry).toBe(source);
    expect(dispose).toHaveBeenCalledOnce();
    expect(sourceDispose).not.toHaveBeenCalled();
  });

  it("refreshes raycast bounds for a displaced free end", () => {
    const root = new Group();
    const mesh = new Mesh(
      new BoxGeometry(10, 100, 10, 1, 32, 1),
      new MeshStandardMaterial(),
    );
    root.add(mesh);
    const deformation = new MeshDeformation3D(root);
    deformation.apply((point, bounds) =>
      bendPoint3D(point, bounds, new Vector3(80, 0, 0), interaction),
    );
    root.updateMatrixWorld(true);
    const hit = new Raycaster(
      new Vector3(74, -48, 100),
      new Vector3(0, 0, -1),
    ).intersectObject(root, true);
    expect(hit.length).toBeGreaterThan(0);
    deformation.dispose();
  });

  it("subdivides primitive strands so intermediate vertices curve", () => {
    const geometry = createDeformableGeometry3D({
      dimensions: { width: 10, height: 100, depth: 10 },
      source: { kind: "primitive", primitive: "cylinder", parameters: {} },
    });
    const positions = geometry.getAttribute("position");
    const ys = new Set(
      Array.from({ length: positions.count }, (_, index) =>
        positions.getY(index),
      ),
    );
    expect(ys.size).toBeGreaterThan(15);
    geometry.dispose();
  });

  it("bounds spring motion, settles at release, and honors direct motion", () => {
    const pose = createStrandPose3D();
    pose.target.set(500, 200, -300);
    for (let index = 0; index < 150; index += 1) {
      stepStrandPose3D(pose, interaction, index === 10 ? 400 : 1 / 60);
      expect(pose.displacement.length()).toBeLessThanOrEqual(40.00001);
    }
    pose.target.set(0, 0, 0);
    for (let index = 0; index < 600; index += 1)
      stepStrandPose3D(pose, interaction, 1 / 60);
    expect(pose.displacement.length()).toBe(0);
    pose.target.set(12, 4, 3);
    expect(
      stepStrandPose3D(pose, { ...interaction, motion: "direct" }, 1 / 60),
    ).toBe(false);
    expect(pose.displacement.toArray()).toEqual([12, 4, 3]);
  });

  it("waves use authored amplitude, wavelength, speed and pointer influence on meshes", () => {
    const bounds = new Box3(
      new Vector3(-10, -50, -10),
      new Vector3(10, 50, 10),
    );
    const wave = createDefaultInteraction({
      effect: "wave-deform",
      waveAmplitude: 20,
      waveLength: 80,
      waveSpeed: 1,
      wavePhaseSpread: 0,
      wavePointerX: 0,
      wavePointerY: 0,
    });
    const start = new Vector3(0, -30, 0);
    const next = start.clone();
    wavePoint3D(start, bounds, wave, 0, null);
    wavePoint3D(next, bounds, wave, 0.5, null);
    expect(start.x).toBeCloseTo(20);
    expect(next.x).toBeCloseTo(-20);
  });
});
