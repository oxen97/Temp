import { describe, expect, it, vi } from "vitest";

import { createDefaultInteraction } from "@/features/editor/lib/interaction-model";
import { DropTargets3D } from "./drop-targets";

describe("3D preview target registry", () => {
  it("reads external 2D target bounds live and prefers its own live 3D target", () => {
    const registry = new DropTargets3D();
    const target = {
      id: "target",
      type: "image",
      bounds: { x: 10, y: 20, width: 80, height: 40 },
    };
    registry.setExternal(() => [target]);
    expect(registry.read("target")).toBe(target);
    target.bounds.x = 50;
    expect(registry.read("target")?.bounds.x).toBe(50);
    const unregister = registry.register(
      "target",
      () => ({ ...target, type: "object3d" }),
      vi.fn(),
    );
    expect(registry.read("target")?.type).toBe("object3d");
    unregister();
    expect(registry.read("target")?.type).toBe("image");
  });

  it("enforces capacity and replace semantics, clearing evicted attachments", () => {
    const registry = new DropTargets3D();
    const reset = vi.fn();
    registry.register("one", () => null, reset);
    const interaction = createDefaultInteraction({
      targetCapacity: 1,
      occupiedBehavior: "reject",
    });
    expect(registry.reserve("one", "target", interaction)).toBe(true);
    expect(registry.reserve("two", "target", interaction)).toBe(false);
    expect(
      registry.reserve("two", "target", {
        ...interaction,
        occupiedBehavior: "replace",
      }),
    ).toBe(true);
    expect(reset).toHaveBeenCalledOnce();
  });

  it("rejects attachment cycles and resets dependents when a target disappears", () => {
    const registry = new DropTargets3D();
    const reset = vi.fn();
    registry.register("a", () => null, reset);
    const unregister = registry.register("b", () => null, vi.fn());
    expect(registry.attach("a", "b")).toBe(true);
    expect(registry.attach("b", "a")).toBe(false);
    unregister();
    expect(reset).toHaveBeenCalledOnce();
  });
});
