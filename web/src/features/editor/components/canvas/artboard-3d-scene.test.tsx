import { fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { createPrimitiveObject3D } from "@/features/editor/three/types";

import { Artboard3DScene } from "./artboard-3d-scene";

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: ReactNode }) => (
    <div data-testid="three-canvas">{children}</div>
  ),
  useFrame: vi.fn(),
  useThree: () => ({
    camera: {
      lookAt: vi.fn(),
      position: { set: vi.fn() },
      updateProjectionMatrix: vi.fn(),
    },
    invalidate: vi.fn(),
    size: { height: 679, width: 1208 },
  }),
}));

describe("Artboard3DScene selection", () => {
  it("selects an unlocked object on pointer down without starting an artboard gesture", () => {
    const object = createPrimitiveObject3D({
      dimensions: { depth: 100, height: 100, width: 100 },
      id: "selectable-object",
      name: "Selectable object",
      position: { x: 200, y: 200, z: 0 },
      primitive: "box",
    });
    const onArtboardPointerDown = vi.fn();
    const onSelectObject = vi.fn();
    const { container } = render(
      <div onPointerDown={onArtboardPointerDown}>
        <Artboard3DScene
          artboardHeight={679}
          artboardWidth={1208}
          objects={[object]}
          onSelectObject={onSelectObject}
          scene={{ enabled: true }}
        />
      </div>,
    );

    const objectGroup = container.querySelector(
      'group[name="Selectable object"]',
    );
    expect(objectGroup).not.toBeNull();

    fireEvent.pointerDown(objectGroup!);

    expect(onSelectObject).toHaveBeenCalledWith("selectable-object");
    expect(onArtboardPointerDown).not.toHaveBeenCalled();
  });

  it("does not select a locked object", () => {
    const object = createPrimitiveObject3D({
      dimensions: { depth: 100, height: 100, width: 100 },
      id: "locked-object",
      name: "Locked object",
      position: { x: 200, y: 200, z: 0 },
      primitive: "sphere",
    });
    object.locked = true;
    const onSelectObject = vi.fn();
    const { container } = render(
      <Artboard3DScene
        artboardHeight={679}
        artboardWidth={1208}
        objects={[object]}
        onSelectObject={onSelectObject}
        scene={{ enabled: true }}
      />,
    );

    fireEvent.pointerDown(
      container.querySelector('group[name="Locked object"]')!,
    );

    expect(onSelectObject).not.toHaveBeenCalled();
  });
});
