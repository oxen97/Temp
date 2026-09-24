import {
  Box3,
  BufferAttribute,
  type BufferGeometry,
  DynamicDrawUsage,
  Matrix4,
  type Mesh,
  type Object3D,
  Vector3,
} from "three";

import type { InteractionDefinition } from "@/features/editor/lib/interaction-model";
import { subdivideDeformableGeometry } from "@/features/editor/three/subdivide-deformable-geometry";

/** All inputs and bounds are in the authored object's local, Y-up space. */
export type StrandPose3D = {
  displacement: Vector3;
  velocity: Vector3;
  target: Vector3;
};

export function createStrandPose3D(): StrandPose3D {
  return {
    displacement: new Vector3(),
    velocity: new Vector3(),
    target: new Vector3(),
  };
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Fixed substeps keep spring motion finite after tab suspension or slow frames. */
export function stepStrandPose3D(
  pose: StrandPose3D,
  interaction: InteractionDefinition,
  seconds: number,
): boolean {
  const limit = Math.max(0, interaction.strandMaxDisplacement);
  pose.target.clampLength(0, limit);
  if (interaction.motion === "direct") {
    pose.displacement.copy(pose.target);
    pose.velocity.set(0, 0, 0);
    return false;
  }
  const duration = clamp(seconds, 0, 1 / 15);
  const count = Math.max(1, Math.ceil(duration / (1 / 120)));
  const dt = duration / count;
  const omega = 5 + clamp(interaction.strandStiffness, 0, 1) * 20;
  const damping = 0.15 + clamp(interaction.strandDamping, 0, 1) * 1.1;
  for (let step = 0; step < count; step += 1) {
    for (const axis of ["x", "y", "z"] as const) {
      pose.velocity[axis] +=
        (omega * omega * (pose.target[axis] - pose.displacement[axis]) -
          2 * damping * omega * pose.velocity[axis]) *
        dt;
      pose.displacement[axis] += pose.velocity[axis] * dt;
    }
    pose.displacement.clampLength(0, limit);
  }
  if (
    pose.displacement.distanceToSquared(pose.target) < 0.00001 &&
    pose.velocity.lengthSq() < 0.0001
  ) {
    pose.displacement.copy(pose.target);
    pose.velocity.set(0, 0, 0);
    return false;
  }
  return true;
}

/** The complete anchor face is fixed, including under nested GLB transforms. */
export function bendPoint3D(
  point: Vector3,
  bounds: Box3,
  displacement: Vector3,
  interaction: InteractionDefinition,
): void {
  const horizontal =
    interaction.strandAnchor === "left" || interaction.strandAnchor === "right";
  const axis = horizontal ? "x" : "y";
  const length = Math.max(0.0001, bounds.max[axis] - bounds.min[axis]);
  const highAnchor =
    interaction.strandAnchor === "top" || interaction.strandAnchor === "right";
  const fraction = clamp((point[axis] - bounds.min[axis]) / length, 0, 1);
  const progress = highAnchor ? 1 - fraction : fraction;
  const radius = Math.max(1, interaction.strandInfluenceRadius);
  const anchorFalloff = Math.exp(-length / radius);
  const localized =
    (Math.exp(-((1 - progress) * length) / radius) - anchorFalloff) /
    Math.max(1e-8, 1 - anchorFalloff);
  const weight = Math.pow(
    clamp(localized, 0, 1),
    1 + (1 - clamp(interaction.strandStiffness, 0, 1)) * 1.5,
  );
  point.addScaledVector(displacement, weight);
}

/** Shared field for generated geometry and every mesh in an imported asset. */
export function wavePoint3D(
  point: Vector3,
  bounds: Box3,
  interaction: InteractionDefinition,
  seconds: number,
  pointer: Vector3 | null,
  strength = 1,
): void {
  const centerX = (bounds.min.x + bounds.max.x) / 2;
  const centerY = (bounds.min.y + bounds.max.y) / 2;
  const reach = Math.max(1, interaction.waveFalloff);
  const distance = pointer
    ? Math.hypot(point.x - pointer.x, point.y - pointer.y)
    : 0;
  const influence = pointer ? Math.exp(-distance / reach) : 1;
  const phase =
    ((point.y - bounds.min.y) / Math.max(1, interaction.waveLength)) *
      Math.PI *
      2 -
    seconds * interaction.waveSpeed * Math.PI * 2 +
    (interaction.wavePhaseSpread * Math.PI) / 180;
  const amount =
    Math.sin(phase) * interaction.waveAmplitude * strength * influence;
  const nx = pointer ? clamp((pointer.x - centerX) / reach, -1, 1) : 0;
  const ny = pointer ? clamp((pointer.y - centerY) / reach, -1, 1) : 0;
  point.x += amount + nx * interaction.wavePointerX * influence * strength;
  point.y += ny * interaction.wavePointerY * influence * strength;
}

type DeformedMesh = {
  mesh: Mesh;
  original: BufferGeometry;
  geometry: BufferGeometry;
  positions: BufferAttribute;
  sourcePositions: Float32Array;
  sourceNormals: ReturnType<BufferGeometry["getAttribute"]> | undefined;
  toRoot: Matrix4;
  fromRoot: Matrix4;
};

/**
 * Runtime-owned clones leave cached GLBs, siblings, materials, UVs, skin weights,
 * morph targets, and authored transforms intact. CPU positions also make normal
 * Three raycasts and selection bounds follow the visible deformation.
 */
export class MeshDeformation3D {
  readonly bounds = new Box3();
  private readonly meshes: DeformedMesh[] = [];
  private readonly rootInverse = new Matrix4();
  private readonly point = new Vector3();
  private changed = false;

  constructor(private readonly root: Object3D) {
    root.updateWorldMatrix(true, true);
    this.rootInverse.copy(root.matrixWorld).invert();
    root.traverse((child) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh || !mesh.geometry?.getAttribute("position")) return;
      const original = mesh.geometry;
      const geometry =
        "isSkinnedMesh" in mesh && mesh.isSkinnedMesh
          ? original.clone()
          : subdivideDeformableGeometry(original);
      const source = geometry.getAttribute("position");
      const sourceNormals = geometry.getAttribute("normal")?.clone();
      const sourcePositions = new Float32Array(source.count * 3);
      for (let index = 0; index < source.count; index += 1) {
        sourcePositions[index * 3] = source.getX(index);
        sourcePositions[index * 3 + 1] = source.getY(index);
        sourcePositions[index * 3 + 2] = source.getZ(index);
      }
      const positions = new BufferAttribute(
        sourcePositions.slice(),
        3,
      ).setUsage(DynamicDrawUsage);
      geometry.setAttribute("position", positions);
      mesh.geometry = geometry;
      const toRoot = new Matrix4().multiplyMatrices(
        this.rootInverse,
        mesh.matrixWorld,
      );
      for (let index = 0; index < source.count; index += 1) {
        this.point.fromArray(sourcePositions, index * 3).applyMatrix4(toRoot);
        this.bounds.expandByPoint(this.point);
      }
      this.meshes.push({
        mesh,
        original,
        geometry,
        positions,
        sourcePositions,
        sourceNormals,
        toRoot,
        fromRoot: toRoot.clone().invert(),
      });
    });
  }

  apply(deform: (point: Vector3, bounds: Box3) => void): void {
    this.root.updateWorldMatrix(true, true);
    this.rootInverse.copy(this.root.matrixWorld).invert();
    for (const entry of this.meshes) {
      const { mesh, geometry, positions, sourcePositions, toRoot, fromRoot } =
        entry;
      toRoot.multiplyMatrices(this.rootInverse, mesh.matrixWorld);
      fromRoot.copy(toRoot).invert();
      for (let index = 0; index < positions.count; index += 1) {
        this.point.fromArray(sourcePositions, index * 3).applyMatrix4(toRoot);
        deform(this.point, this.bounds);
        this.point.applyMatrix4(fromRoot);
        positions.setXYZ(index, this.point.x, this.point.y, this.point.z);
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      // SkinnedMesh keeps additional object-level raycast bounds.
      if (
        "computeBoundingBox" in mesh &&
        typeof mesh.computeBoundingBox === "function"
      )
        mesh.computeBoundingBox();
      if (
        "computeBoundingSphere" in mesh &&
        typeof mesh.computeBoundingSphere === "function"
      )
        mesh.computeBoundingSphere();
    }
    this.changed = true;
  }

  restore(): void {
    if (!this.changed) return;
    for (const { geometry, positions, sourcePositions, sourceNormals } of this
      .meshes) {
      positions.array.set(sourcePositions);
      positions.needsUpdate = true;
      if (sourceNormals) geometry.setAttribute("normal", sourceNormals.clone());
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
    }
    this.changed = false;
  }

  dispose(): void {
    for (const { mesh, original, geometry } of this.meshes) {
      if (mesh.geometry === geometry) mesh.geometry = original;
      geometry.dispose();
    }
    this.meshes.length = 0;
  }
}
