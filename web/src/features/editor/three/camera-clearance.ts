import { Vector3 } from "three";

import type { Object3DElement, Scene3DSettings } from "@/features/editor/three/types";

type WorldPose = {
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
};

/**
 * An orthographic camera can move along its viewing ray without changing the
 * apparent size of the artwork. Keep it in front of the whole 3D scene so a
 * large model never crosses the near plane and appears hollow or cut away.
 */
export function orthographicCameraPlacement({
  artboardHeight,
  artboardWidth,
  objects,
  override,
  scene,
}: {
  artboardHeight: number;
  artboardWidth: number;
  objects: readonly Object3DElement[];
  override?: { objectId: string; pose: WorldPose };
  scene: Scene3DSettings;
}) {
  const target = new Vector3(
    artboardWidth / 2 + scene.cameraTarget.x,
    -artboardHeight / 2 - scene.cameraTarget.y,
    scene.cameraTarget.z,
  );
  const nominalPosition = new Vector3(
    artboardWidth / 2 + scene.cameraPosition.x,
    -artboardHeight / 2 - scene.cameraPosition.y,
    Math.max(1, scene.cameraPosition.z),
  );
  const direction = nominalPosition.clone().sub(target);
  const nominalDistance = Math.max(1, direction.length());
  if (direction.lengthSq() < 0.0001) direction.set(0, 0, 1);
  direction.normalize();
  const margin = Math.max(100, artboardHeight * 0.1);
  let distance = nominalDistance;
  let farthestBack = 0;

  for (const object of objects) {
    const pose = override?.objectId === object.id ? override.pose : null;
    const position = pose
      ? new Vector3(...pose.position)
      : new Vector3(
          object.transform.position.x,
          -object.transform.position.y,
          object.transform.position.z,
        );
    const scale = pose?.scale ?? [
      object.transform.scale.x,
      object.transform.scale.y,
      object.transform.scale.z,
    ];
    // A bounding sphere remains conservative even when the object rotates.
    const radius = Math.hypot(
      object.dimensions.width * scale[0],
      object.dimensions.height * scale[1],
      object.dimensions.depth * scale[2],
    ) / 2;
    const projectedCenter = position.sub(target).dot(direction);
    distance = Math.max(distance, projectedCenter + radius + margin);
    farthestBack = Math.max(farthestBack, -projectedCenter + radius);
  }

  return {
    distance,
    far: Math.max(100000, distance + farthestBack + margin),
    position: target.clone().addScaledVector(direction, distance),
    target,
  };
}

/**
 * Camera Rotate orbits the camera around its target. An orthographic camera
 * can stand farther back without changing the picture, so it waits outside a
 * sphere around the target that holds every object: no orbit angle can bring
 * an object across the near plane or past the far plane.
 */
export function orthographicOrbitPlacement(
  input: Parameters<typeof orthographicCameraPlacement>[0],
) {
  const placement = orthographicCameraPlacement(input);
  const margin = Math.max(100, input.artboardHeight * 0.1);
  let reach = 0;
  for (const object of input.objects) {
    const center = new Vector3(
      object.transform.position.x,
      -object.transform.position.y,
      object.transform.position.z,
    );
    const radius =
      Math.hypot(
        object.dimensions.width * object.transform.scale.x,
        object.dimensions.height * object.transform.scale.y,
        object.dimensions.depth * object.transform.scale.z,
      ) / 2;
    reach = Math.max(reach, center.distanceTo(placement.target) + radius);
  }
  const distance = Math.max(placement.distance, reach + margin);
  const direction = placement.position.clone().sub(placement.target).normalize();
  return {
    distance,
    far: Math.max(placement.far, distance + reach + margin),
    position: placement.target.clone().addScaledVector(direction, distance),
    target: placement.target,
  };
}
