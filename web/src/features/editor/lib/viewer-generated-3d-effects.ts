import type { InteractionDefinition } from "@/features/editor/lib/interaction-model";
import type { ViewerPoint } from "@/features/editor/lib/viewer-generated-effects";
import {
  cloneObject3D,
  type Object3DElement,
} from "@/features/editor/three/types";

export type ViewerSpawn3DInstance = {
  id: string;
  interactionId: string;
  objects: Object3DElement[];
};

/** Creates an independent runtime object at the artboard pointer, retaining depth. */
export function createSpawn3DInstance(
  authoredObjects: Object3DElement[],
  interaction: InteractionDefinition,
  point: ViewerPoint,
  instanceId: string,
  random = Math.random,
): ViewerSpawn3DInstance | null {
  const source = authoredObjects.find(
    (object) => object.id === interaction.spawnSourceId,
  );
  if (!source) return null;
  const minScale =
    Math.max(1, Math.min(interaction.spawnSizeMin, interaction.spawnSizeMax)) /
    100;
  const maxScale = Math.max(
    minScale,
    Math.max(interaction.spawnSizeMin, interaction.spawnSizeMax) / 100,
  );
  const scale = minScale + (maxScale - minScale) * random();
  const minRotation = Math.min(
    interaction.spawnRotationMin,
    interaction.spawnRotationMax,
  );
  const maxRotation = Math.max(
    interaction.spawnRotationMin,
    interaction.spawnRotationMax,
  );
  const rotation = minRotation + (maxRotation - minRotation) * random();
  const object = cloneObject3D(source);
  object.id = `${instanceId}:${source.id}`;
  object.visible = true;
  object.transform.position.x = point.x;
  object.transform.position.y = point.y;
  object.transform.rotation.z += rotation;
  object.transform.scale.x *= scale;
  object.transform.scale.y *= scale;
  object.transform.scale.z *= scale;
  if (!interaction.spawnInheritInteractions) object.interactions = [];
  return { id: instanceId, interactionId: interaction.id, objects: [object] };
}
