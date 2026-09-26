import {
  Matrix4,
  type Group,
  type Material,
  type Mesh,
  type Object3D,
  type Vector3,
} from "three";

import type { RuntimeVisual } from "@/features/editor/lib/interaction-runtime";

const shear = new Matrix4();

/** Three equivalents of the universal authored screen-plane transforms. */
export function applyInteractionVisual3D(
  group: Group,
  visual: RuntimeVisual,
  seconds: number,
  translation?: Vector3,
): void {
  const shakeX = visual.shake ? Math.sin(seconds * 51) * 3 : 0;
  const shakeY = visual.shake ? Math.sin(seconds * 67) * 2 : 0;
  group.position.set(
    (translation?.x ?? visual.tx) + shakeX,
    (translation?.y ?? -visual.ty) + shakeY,
    translation?.z ?? 0,
  );
  group.rotation.set(
    ((visual.rotateX ?? 0) * Math.PI) / 180,
    ((visual.rotateY ?? 0) * Math.PI) / 180,
    (visual.rotate * Math.PI) / 180,
  );
  group.scale.set(
    visual.scaleX,
    visual.scaleY,
    (visual.scaleX + visual.scaleY) / 2,
  );
  group.updateMatrix();
  if (visual.skewX || visual.skewY) {
    const tangent = (degrees: number) =>
      Math.tan((Math.max(-85, Math.min(85, degrees)) * Math.PI) / 180);
    shear.set(
      1,
      -tangent(visual.skewX),
      0,
      0,
      -tangent(visual.skewY),
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
    );
    group.matrix.multiply(shear);
  }
  group.matrixAutoUpdate = false;
  group.matrixWorldNeedsUpdate = true;
}

/** Imported materials are already instance-owned; retain their authored alpha. */
export class InteractionOpacity3D {
  private readonly originals = new Map<
    Material,
    { opacity: number; transparent: boolean }
  >();
  private lastOpacity: number | null = null;

  constructor(root: Object3D, authoredOpacity?: number) {
    root.traverse((child) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      for (const material of Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material]) {
        if (!this.originals.has(material))
          this.originals.set(material, {
            opacity: authoredOpacity ?? material.opacity,
            transparent:
              authoredOpacity === undefined
                ? material.transparent
                : authoredOpacity < 1,
          });
      }
    });
  }

  apply(opacity: number | null): void {
    if (this.lastOpacity === opacity) return;
    this.lastOpacity = opacity;
    for (const [material, original] of this.originals) {
      material.opacity = original.opacity * (opacity ?? 1);
      const transparent = original.transparent || material.opacity < 1;
      if (material.transparent !== transparent) {
        material.transparent = transparent;
        material.needsUpdate = true;
      }
    }
  }

  dispose(): void {
    for (const [material, original] of this.originals) {
      material.opacity = original.opacity;
      if (material.transparent !== original.transparent) {
        material.transparent = original.transparent;
        material.needsUpdate = true;
      }
    }
    this.originals.clear();
  }
}
