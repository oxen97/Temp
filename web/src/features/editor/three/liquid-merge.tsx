"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Box3,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Material,
  Mesh,
  Object3D,
  Raycaster,
  Texture,
  Vector3,
} from "three";

import type { InteractionDefinition } from "@/features/editor/lib/interaction-model";
import { isLiquidPairActive } from "@/features/editor/lib/liquid-merge-runtime";
import type { Object3DElement } from "@/features/editor/three/types";

export const MAX_LIQUID_BRIDGES_3D = 32;
const RADIAL_SEGMENTS = 16;
const LENGTH_SEGMENTS = 20;
const PULL_KEY = "amousLiquidPull";
type SurfaceMaterial = Material & {
  color?: Color;
  map?: Texture | null;
  roughness?: number;
  metalness?: number;
};

/** Three-dimensional edge gap; separation in Z is meaningful here. */
export function liquidGap3D(a: Box3, b: Box3): number {
  return Math.hypot(
    ...(["x", "y", "z"] as const).map((axis) =>
      Math.max(a.min[axis] - b.max[axis], b.min[axis] - a.max[axis], 0),
    ),
  );
}

/** Per-instance transient pull. It never writes authored transforms or a store. */
export function readLiquidPull3D(root: Object3D, output: Vector3): Vector3 {
  const value = root.userData[PULL_KEY];
  return value instanceof Vector3 ? output.copy(value) : output.set(0, 0, 0);
}

function bridgeMaterial(source: SurfaceMaterial, target: SurfaceMaterial) {
  const material = source.clone() as SurfaceMaterial;
  const targetColor = { value: target.color?.clone() ?? new Color("white") };
  const targetOpacity = { value: target.opacity };
  const targetMap = { value: target.map ?? null };
  const targetRoughness = { value: target.roughness ?? source.roughness ?? 1 };
  const targetMetalness = { value: target.metalness ?? source.metalness ?? 0 };
  const hasTargetMap = !!target.map;
  const sourceCompile = source.onBeforeCompile;
  material.transparent = source.transparent || target.transparent;
  material.onBeforeCompile = (shader, renderer) => {
    sourceCompile.call(material, shader, renderer);
    Object.assign(shader.uniforms, {
      amousTargetColor: targetColor,
      amousTargetOpacity: targetOpacity,
      amousTargetMap: targetMap,
      amousTargetRoughness: targetRoughness,
      amousTargetMetalness: targetMetalness,
    });
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float amousBridgeMix;\nvarying float vAmousBridgeMix;\nvarying vec2 vAmousBridgeUv;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvAmousBridgeMix = amousBridgeMix;\nvAmousBridgeUv = uv;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>\nvarying float vAmousBridgeMix;\nvarying vec2 vAmousBridgeUv;\nuniform vec3 amousTargetColor;\nuniform float amousTargetOpacity;\nuniform float amousTargetRoughness;\nuniform float amousTargetMetalness;\n${hasTargetMap ? "uniform sampler2D amousTargetMap;" : ""}`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>\nvec4 amousOtherColor = vec4(amousTargetColor, amousTargetOpacity);\n${hasTargetMap ? "amousOtherColor *= texture2D(amousTargetMap, vAmousBridgeUv);" : ""}\ndiffuseColor = mix(diffuseColor, amousOtherColor, smoothstep(0.2, 0.8, vAmousBridgeMix));`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, amousTargetRoughness, smoothstep(0.2, 0.8, vAmousBridgeMix));",
      )
      .replace(
        "#include <metalnessmap_fragment>",
        "#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, amousTargetMetalness, smoothstep(0.2, 0.8, vAmousBridgeMix));",
      );
  };
  material.customProgramCacheKey = () =>
    `amous-liquid-bridge:${source.type}:${hasTargetMap}`;
  return {
    material,
    update() {
      material.opacity = source.opacity;
      material.color?.copy(source.color ?? new Color("white"));
      targetColor.value.copy(target.color ?? new Color("white"));
      targetOpacity.value = target.opacity;
    },
  };
}

/** A bounded volumetric loft; original meshes/materials are never replaced. */
export class LiquidBridge3D {
  readonly mesh: Mesh;
  private readonly positions: Float32BufferAttribute;
  private readonly appearance: ReturnType<typeof bridgeMaterial>;
  private readonly axis = new Vector3();
  private readonly tangent = new Vector3();
  private readonly normal = new Vector3();
  private readonly center = new Vector3();
  private readonly point = new Vector3();

  constructor(source: SurfaceMaterial, target: SurfaceMaterial) {
    const geometry = new BufferGeometry();
    const count = (RADIAL_SEGMENTS + 1) * (LENGTH_SEGMENTS + 1);
    this.positions = new Float32BufferAttribute(
      new Float32Array(count * 3),
      3,
    ).setUsage(DynamicDrawUsage);
    const uv = new Float32BufferAttribute(new Float32Array(count * 2), 2);
    const blend = new Float32BufferAttribute(new Float32Array(count), 1);
    const indices: number[] = [];
    for (let ring = 0; ring <= LENGTH_SEGMENTS; ring += 1) {
      for (let side = 0; side <= RADIAL_SEGMENTS; side += 1) {
        const index = ring * (RADIAL_SEGMENTS + 1) + side;
        uv.setXY(index, side / RADIAL_SEGMENTS, ring / LENGTH_SEGMENTS);
        blend.setX(index, ring / LENGTH_SEGMENTS);
        if (ring < LENGTH_SEGMENTS && side < RADIAL_SEGMENTS) {
          const next = index + RADIAL_SEGMENTS + 1;
          indices.push(index, next, index + 1, next, next + 1, index + 1);
        }
      }
    }
    geometry.setAttribute("position", this.positions);
    geometry.setAttribute("uv", uv);
    geometry.setAttribute("amousBridgeMix", blend);
    geometry.setIndex(indices);
    this.appearance = bridgeMaterial(source, target);
    this.mesh = new Mesh(geometry, this.appearance.material);
    this.mesh.name = "Interaction liquid bridge";
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    // Connectors belong to an interaction, never intercept source gestures.
    this.mesh.raycast = () => {};
    this.mesh.visible = false;
  }

  update(
    from: Vector3,
    to: Vector3,
    radius: number,
    smoothness: number,
    strength: number,
  ): void {
    this.axis.copy(to).sub(from);
    const length = this.axis.length();
    this.mesh.visible = length > 0.0001 && radius > 0 && strength > 0.001;
    if (!this.mesh.visible) return;
    this.axis.divideScalar(length);
    this.normal.set(
      Math.abs(this.axis.y) < 0.9 ? 0 : 1,
      Math.abs(this.axis.y) < 0.9 ? 1 : 0,
      0,
    );
    this.tangent.crossVectors(this.axis, this.normal).normalize();
    this.normal.crossVectors(this.tangent, this.axis).normalize();
    const softness = Math.min(1, Math.max(0, smoothness));
    const penetration = radius * 0.45;
    for (let ring = 0; ring <= LENGTH_SEGMENTS; ring += 1) {
      const t = ring / LENGTH_SEGMENTS;
      this.center
        .copy(from)
        .addScaledVector(
          this.axis,
          -penetration + t * (length + penetration * 2),
        );
      const waist = 1 - Math.sin(t * Math.PI) * (0.65 - softness * 0.45);
      const ringRadius = radius * waist * strength;
      for (let side = 0; side <= RADIAL_SEGMENTS; side += 1) {
        const angle = (side / RADIAL_SEGMENTS) * Math.PI * 2;
        this.point
          .copy(this.center)
          .addScaledVector(this.tangent, Math.cos(angle) * ringRadius)
          .addScaledVector(this.normal, Math.sin(angle) * ringRadius);
        this.positions.setXYZ(
          ring * (RADIAL_SEGMENTS + 1) + side,
          this.point.x,
          this.point.y,
          this.point.z,
        );
      }
    }
    this.positions.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
    this.mesh.geometry.computeBoundingBox();
    this.mesh.geometry.computeBoundingSphere();
    this.appearance.update();
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.appearance.material.dispose();
  }
}

function materialAt(
  root: Object3D,
  raycaster: Raycaster,
  origin: Vector3,
  direction: Vector3,
) {
  raycaster.set(origin, direction);
  for (const hit of raycaster.intersectObject(root, true)) {
    const mesh = hit.object as Mesh;
    if (!mesh.isMesh) continue;
    const material = Array.isArray(mesh.material)
      ? mesh.material[hit.face?.materialIndex ?? 0]
      : mesh.material;
    if (material)
      return { point: hit.point, material: material as SurfaceMaterial };
  }
  return null;
}

type Pair = {
  sourceId: string;
  targetId: string;
  interaction: InteractionDefinition;
  active: boolean;
  strength: number;
  bridge: LiquidBridge3D | null;
  materials: Material[];
};

export class LiquidMerge3DRuntime {
  private readonly pairs: Pair[];
  private readonly ownedPulls = new Set<Object3D>();
  private readonly previousPulls = new Map<Object3D, Vector3>();
  private readonly sourceBox = new Box3();
  private readonly targetBox = new Box3();
  private readonly sourceCenter = new Vector3();
  private readonly targetCenter = new Vector3();
  private readonly direction = new Vector3();
  private readonly origin = new Vector3();
  private readonly size = new Vector3();
  private readonly raycaster = new Raycaster();

  constructor(
    private readonly scene: Object3D,
    objects: readonly Object3DElement[],
    private readonly reducedMotion = false,
  ) {
    this.pairs = objects
      .flatMap((source) =>
        (source.interactions ?? [])
          .filter(
            (interaction) =>
              interaction.enabled !== false &&
              interaction.effect === "liquid-merge" &&
              interaction.collisionTarget &&
              interaction.collisionTarget !== source.id,
          )
          .map((interaction) => ({
            sourceId: source.id,
            targetId: interaction.collisionTarget,
            interaction,
            active: false,
            strength: 0,
            bridge: null,
            materials: [],
          })),
      )
      .slice(0, MAX_LIQUID_BRIDGES_3D);
  }

  update(seconds: number): boolean {
    for (const root of this.ownedPulls) {
      const previous = this.previousPulls.get(root) ?? new Vector3();
      previous.copy(root.userData[PULL_KEY] as Vector3);
      this.previousPulls.set(root, previous);
      (root.userData[PULL_KEY] as Vector3).set(0, 0, 0);
    }
    const objects = new Map<string, Object3D>();
    this.scene.traverse((child) => {
      if (typeof child.userData.amousObjectId === "string")
        objects.set(child.userData.amousObjectId, child);
    });
    let animating = false;
    for (const pair of this.pairs) {
      const source = objects.get(pair.sourceId);
      const target = objects.get(pair.targetId);
      if (!source || !target) {
        if (pair.bridge) pair.bridge.mesh.visible = false;
        continue;
      }
      source.updateWorldMatrix(true, true);
      target.updateWorldMatrix(true, true);
      this.sourceBox.setFromObject(source);
      this.targetBox.setFromObject(target);
      if (this.sourceBox.isEmpty() || this.targetBox.isEmpty()) continue;
      const gap = liquidGap3D(this.sourceBox, this.targetBox);
      pair.active = isLiquidPairActive(pair.interaction, gap, pair.active);
      const desired = pair.active ? 1 : 0;
      pair.strength =
        this.reducedMotion || pair.interaction.motion === "direct"
          ? desired
          : pair.strength +
            (desired - pair.strength) *
              (1 - Math.exp(-Math.min(1 / 15, Math.max(0, seconds)) * 16));
      if (Math.abs(pair.strength - desired) < 0.001) pair.strength = desired;
      else animating = true;
      if (pair.strength <= 0.001) {
        if (pair.bridge) pair.bridge.mesh.visible = false;
        continue;
      }
      this.sourceBox.getCenter(this.sourceCenter);
      this.targetBox.getCenter(this.targetCenter);
      this.direction.copy(this.targetCenter).sub(this.sourceCenter).normalize();
      if (this.direction.lengthSq() === 0) continue;
      const radiusA =
        this.sourceBox.getSize(this.size).length() +
        this.sourceCenter.distanceTo(this.targetCenter);
      this.origin
        .copy(this.sourceCenter)
        .addScaledVector(this.direction, radiusA);
      const sourceHit = materialAt(
        source,
        this.raycaster,
        this.origin,
        this.direction.clone().negate(),
      );
      const radiusB =
        this.targetBox.getSize(this.size).length() +
        this.sourceCenter.distanceTo(this.targetCenter);
      this.origin
        .copy(this.targetCenter)
        .addScaledVector(this.direction, -radiusB);
      const targetHit = materialAt(
        target,
        this.raycaster,
        this.origin,
        this.direction,
      );
      if (!sourceHit || !targetHit) {
        if (pair.bridge) pair.bridge.mesh.visible = false;
        continue;
      }
      if (
        pair.materials[0] !== sourceHit.material ||
        pair.materials[1] !== targetHit.material
      ) {
        pair.bridge?.dispose();
        pair.bridge = new LiquidBridge3D(
          sourceHit.material,
          targetHit.material,
        );
        pair.materials = [sourceHit.material, targetHit.material];
        this.scene.add(pair.bridge.mesh);
      }
      const sourceSize = this.sourceBox
        .getSize(this.size)
        .toArray()
        .filter((value) => value > 0.001);
      const targetSize = this.targetBox
        .getSize(this.size)
        .toArray()
        .filter((value) => value > 0.001);
      const radius = Math.min(
        pair.interaction.bridgeWidth / 2,
        Math.min(...sourceSize, ...targetSize) * 0.48,
      );
      pair.bridge?.update(
        sourceHit.point,
        targetHit.point,
        radius,
        pair.interaction.liquidSmoothness / 100,
        pair.strength,
      );
      const attraction = Math.max(
        0,
        Math.min(1, pair.interaction.liquidAttraction / 100),
      );
      if (attraction > 0 && pair.active && !this.reducedMotion) {
        const pull =
          Math.min(gap * 0.25, Math.max(1, pair.interaction.releaseDistance)) *
          attraction *
          pair.strength;
        for (const [root, sign] of [
          [source, 1],
          [target, -1],
        ] as const) {
          if (!(root.userData[PULL_KEY] instanceof Vector3))
            root.userData[PULL_KEY] = new Vector3();
          (root.userData[PULL_KEY] as Vector3).addScaledVector(
            this.direction,
            pull * sign,
          );
          this.ownedPulls.add(root);
        }
      }
    }
    // Demand rendering sleeps once attraction reaches equilibrium. A pointer,
    // physics or authored-animation update wakes it again through R3F.
    for (const root of this.ownedPulls) {
      const current = root.userData[PULL_KEY] as Vector3;
      const previous = this.previousPulls.get(root);
      if (
        previous
          ? current.distanceToSquared(previous) > 0.0001
          : current.lengthSq() > 0.0001
      )
        animating = true;
    }
    return animating;
  }

  dispose(): void {
    for (const pair of this.pairs) pair.bridge?.dispose();
    for (const root of this.ownedPulls) delete root.userData[PULL_KEY];
    this.ownedPulls.clear();
    this.previousPulls.clear();
  }
}

export function LiquidMerge3D({
  objects,
  enabled,
}: {
  objects: readonly Object3DElement[];
  enabled: boolean;
}) {
  const { scene, invalidate } = useThree();
  const runtime = useRef<LiquidMerge3DRuntime | null>(null);
  useEffect(() => {
    if (!enabled || !scene?.isObject3D) return;
    const next = new LiquidMerge3DRuntime(
      scene,
      objects,
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
    );
    runtime.current = next;
    invalidate();
    return () => {
      next.dispose();
      runtime.current = null;
    };
  }, [enabled, invalidate, objects, scene]);
  useFrame((_state, dt) => {
    if (runtime.current?.update(dt)) invalidate();
  });
  return null;
}
