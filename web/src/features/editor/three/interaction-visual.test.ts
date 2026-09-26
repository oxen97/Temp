import { Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { IDENTITY_VISUAL } from "@/features/editor/lib/interaction-runtime";
import {
  applyInteractionVisual3D,
  InteractionOpacity3D,
} from "./interaction-visual";

describe("universal 3D interaction visuals", () => {
  it("composes local transforms without changing the authored parent pose", () => {
    const parent = new Group();
    parent.position.set(70, -80, 3);
    parent.rotation.y = 0.4;
    const content = new Group();
    parent.add(content);
    applyInteractionVisual3D(
      content,
      { ...IDENTITY_VISUAL, tx: 10, ty: 20, rotate: 90, scaleX: 2, scaleY: 2 },
      0,
    );
    expect(new Vector3(1, 0, 0).applyMatrix4(content.matrix).toArray()).toEqual(
      [10, -18, 0],
    );
    expect(parent.position.toArray()).toEqual([70, -80, 3]);
    expect(parent.rotation.y).toBe(0.4);
    applyInteractionVisual3D(content, { ...IDENTITY_VISUAL, skewX: 45 }, 0);
    expect(new Vector3(0, 1, 0).applyMatrix4(content.matrix).x).toBeCloseTo(-1);
  });

  it("rotates about X, Y and Z", () => {
    const content = new Group();
    applyInteractionVisual3D(
      content,
      { ...IDENTITY_VISUAL, rotateX: 90, rotateY: 0, rotate: 0 },
      0,
    );
    const up = new Vector3(0, 1, 0).applyMatrix4(content.matrix);
    expect(up.y).toBeCloseTo(0);
    expect(up.z).toBeCloseTo(1);
    applyInteractionVisual3D(
      content,
      { ...IDENTITY_VISUAL, rotateX: 0, rotateY: 90, rotate: 0 },
      0,
    );
    const right = new Vector3(1, 0, 0).applyMatrix4(content.matrix);
    expect(right.x).toBeCloseTo(0);
    expect(right.z).toBeCloseTo(-1);
    expect(content.rotation.toArray().slice(0, 3)).toEqual([
      0,
      Math.PI / 2,
      0,
    ]);
  });

  it("multiplies source material alpha and restores it when playback ends", () => {
    const material = new MeshStandardMaterial({
      opacity: 0.4,
      transparent: true,
    });
    const root = new Group();
    root.add(new Mesh(undefined, material));
    const opacity = new InteractionOpacity3D(root);
    opacity.apply(0.5);
    expect(material.opacity).toBeCloseTo(0.2);
    opacity.apply(0);
    expect(material.opacity).toBe(0);
    opacity.dispose();
    expect(material.opacity).toBe(0.4);
    expect(material.transparent).toBe(true);
  });
});
