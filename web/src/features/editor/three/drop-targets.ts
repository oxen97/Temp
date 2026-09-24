import {
  resolveDropOccupancy,
  type DropRuntimeElement,
} from "@/features/editor/lib/interaction-drop-runtime";
import type { InteractionDefinition } from "@/features/editor/lib/interaction-model";
import type { ProjectedBounds } from "@/features/editor/three/coordinate-system";

export type Object3DDropTarget = DropRuntimeElement & {
  bounds: ProjectedBounds;
};

/** Per-preview registry; targets expose current rendered bounds on demand. */
export class DropTargets3D {
  private readonly targets = new Map<
    string,
    { read: () => Object3DDropTarget | null; reset: () => void }
  >();
  private readonly occupants = new Map<string, string[]>();
  private readonly attachments = new Map<string, string>();
  private external: (() => readonly Object3DDropTarget[]) | undefined;

  setExternal(read: (() => readonly Object3DDropTarget[]) | undefined): void {
    this.external = read;
  }

  register(
    id: string,
    read: () => Object3DDropTarget | null,
    reset: () => void,
  ): () => void {
    const entry = { read, reset };
    this.targets.set(id, entry);
    return () => {
      if (this.targets.get(id) !== entry) return;
      this.targets.delete(id);
      this.release(id);
      for (const [sourceId, targetId] of this.attachments) {
        if (targetId === id) {
          this.attachments.delete(sourceId);
          this.targets.get(sourceId)?.reset();
        }
      }
      this.occupants.delete(id);
    };
  }

  read(id: string): Object3DDropTarget | null {
    return (
      this.targets.get(id)?.read() ??
      this.external?.().find((target) => target.id === id) ??
      null
    );
  }

  release(sourceId: string): void {
    for (const [targetId, occupants] of this.occupants) {
      if (occupants.includes(sourceId))
        this.occupants.set(
          targetId,
          occupants.filter((id) => id !== sourceId),
        );
    }
    this.attachments.delete(sourceId);
  }

  reserve(
    sourceId: string,
    targetId: string,
    interaction: InteractionDefinition,
  ): boolean {
    const result = resolveDropOccupancy({
      behavior: interaction.occupiedBehavior,
      capacity: interaction.targetCapacity,
      occupants: this.occupants.get(targetId) ?? [],
      sourceId,
    });
    if (!result.accepted) return false;
    this.release(sourceId);
    for (const id of result.evicted) {
      this.release(id);
      this.targets.get(id)?.reset();
    }
    this.occupants.set(targetId, result.occupants);
    return true;
  }

  attach(sourceId: string, targetId: string): boolean {
    const visited = new Set<string>();
    let ancestor: string | undefined = targetId;
    while (ancestor && !visited.has(ancestor)) {
      if (ancestor === sourceId) return false;
      visited.add(ancestor);
      ancestor = this.attachments.get(ancestor);
    }
    this.attachments.set(sourceId, targetId);
    return true;
  }
}
