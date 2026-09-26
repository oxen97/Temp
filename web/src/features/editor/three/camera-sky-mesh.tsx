"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { Texture } from "three";

import {
  type CameraSky,
  createCameraSkyMaterial,
  loadCameraSkyTexture,
  setCameraSkyView,
} from "@/features/editor/three/camera-sky";

// The sky never takes a pointer: presses reach the objects and the page.
const NO_RAYCAST = () => undefined;

/**
 * Preview: the background image drawn as a 360° sky behind every 3D object.
 * It reads the live camera when it renders, so it turns in the same frame as
 * a Camera Rotate orbit.
 */
export function CameraSkyMesh({
  artboardHeight,
  artboardWidth,
  sky,
}: {
  artboardHeight: number;
  artboardWidth: number;
  sky: CameraSky;
}) {
  const { invalidate } = useThree();
  const [loaded, setLoaded] = useState<{
    src: string;
    texture: Texture;
  } | null>(null);
  const texture = loaded?.src === sky.src ? loaded.texture : null;

  useEffect(() => {
    let active = true;
    let texture: Texture | null = null;
    loadCameraSkyTexture(sky.src).then(
      (next) => {
        if (!active) {
          next.dispose();
          return;
        }
        texture = next;
        setLoaded({ src: sky.src, texture: next });
      },
      () => undefined,
    );
    return () => {
      active = false;
      texture?.dispose();
    };
  }, [sky.src]);

  const material = useMemo(
    () => (texture ? createCameraSkyMaterial(texture) : null),
    [texture],
  );
  useEffect(() => () => material?.dispose(), [material]);
  useLayoutEffect(() => {
    if (!material) return;
    setCameraSkyView(material, {
      aspect: artboardWidth / Math.max(1, artboardHeight),
      fov: sky.fov,
      opacity: sky.opacity,
    });
    invalidate();
  }, [
    artboardHeight,
    artboardWidth,
    invalidate,
    material,
    sky.fov,
    sky.opacity,
  ]);

  if (!material) return null;
  return (
    <mesh
      frustumCulled={false}
      material={material}
      name="Camera sky"
      raycast={NO_RAYCAST}
      // First among blended layers, after the solid objects it sits behind.
      renderOrder={-1_000_000}
    >
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}
