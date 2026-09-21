import { fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { Plane, Ray, Vector3 } from "three";
import { describe, expect, it, vi } from "vitest";

import { createPrimitiveObject3D } from "@/features/editor/three/types";

import {
  Artboard3DScene,
  positionOnObjectDragPlane,
} from "./artboard-3d-scene";

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
  it("maps a captured pointer ray to editor coordinates without changing depth", () => {
    const plane = new Plane().setFromNormalAndCoplanarPoint(
      new Vector3(0, 0, 1),
      new Vector3(200, -150, 20),
    );
    const grabOffset = new Vector3(-15, 10, 0);
    const ray = new Ray(new Vector3(255, -200, 1000), new Vector3(0, 0, -1));

    expect(positionOnObjectDragPlane(ray, plane, grabOffset, 20)).toEqual({
      x: 240,
      y: 190,
      z: 20,
    });
  });

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
          editable
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
        editable
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

  it("does not select or consume pointer down when editing is disabled", () => {
    const object = createPrimitiveObject3D({
      dimensions: { depth: 100, height: 100, width: 100 },
      id: "viewer-object",
      name: "Viewer object",
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

    fireEvent.pointerDown(
      container.querySelector('group[name="Viewer object"]')!,
    );

    expect(onSelectObject).not.toHaveBeenCalled();
    expect(onArtboardPointerDown).toHaveBeenCalledOnce();
  });
});
