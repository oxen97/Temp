import { fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { Group, Plane, Ray, Vector3 } from "three";
import { describe, expect, it, vi } from "vitest";

import { createDefaultInteraction } from "@/features/editor/lib/interaction-model";
import { defaultInteractionSoundSettings } from "@/features/editor/store/editor-store";
import { createPrimitiveObject3D } from "@/features/editor/three/types";

import {
  Artboard3DScene,
  pointerRemainsOver3DObject,
  positionOnObjectDragPlane,
  sceneRenderViewport,
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
  it("extends the editor render surface beyond the artboard but preserves preview bounds", () => {
    expect(sceneRenderViewport(1920, 1080)).toEqual({
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
    });
    const editorViewport = sceneRenderViewport(1920, 1080, {
      x: -300,
      y: -100,
      width: 2600,
      height: 1400,
    });
    expect(editorViewport.x).toBeLessThan(-300);
    expect(editorViewport.y).toBeLessThan(-100);
    expect(editorViewport.x + editorViewport.width).toBeGreaterThan(2300);
    expect(editorViewport.y + editorViewport.height).toBeGreaterThan(1300);
  });

  it("keeps hover active when the pointer crosses meshes within one 3D object", () => {
    const object = new Group();
    const otherObject = new Group();

    expect(pointerRemainsOver3DObject(object, [{ eventObject: object }])).toBe(
      true,
    );
    expect(
      pointerRemainsOver3DObject(object, [{ eventObject: otherObject }]),
    ).toBe(false);
    expect(pointerRemainsOver3DObject(object, [])).toBe(false);
  });

  it("emits 3D sound events only in the interactive preview", () => {
    const object = createPrimitiveObject3D({
      dimensions: { depth: 100, height: 100, width: 100 },
      id: "sound-cube",
      name: "Sound cube",
      position: { x: 200, y: 200, z: 0 },
      primitive: "box",
    });
    object.interactionSounds = [
      {
        ...defaultInteractionSoundSettings,
        assets: [
          {
            durationSeconds: 1,
            mimeType: "audio/wav",
            name: "cube.wav",
            sizeBytes: 128,
            src: "blob:cube",
          },
        ],
      },
    ];
    const onSoundEvent = vi.fn();
    const onSoundStop = vi.fn();
    const props = {
      artboardHeight: 679,
      artboardWidth: 1208,
      objects: [object],
      onSoundEvent,
      onSoundStop,
      scene: { enabled: true },
    };
    const { container, rerender } = render(<Artboard3DScene {...props} />);
    const group = container.querySelector('group[name="Sound cube"]')!;
    fireEvent.click(group);
    expect(onSoundEvent).not.toHaveBeenCalled();

    rerender(<Artboard3DScene {...props} interactive />);
    fireEvent.click(group);
    expect(onSoundEvent).toHaveBeenCalledWith("sound-cube", "click", "click");
    fireEvent.pointerOver(group);
    expect(onSoundEvent).toHaveBeenCalledWith("sound-cube", "hover", "enter");
    fireEvent.pointerOut(group);
    expect(onSoundStop).toHaveBeenCalledWith("sound-cube", "hover");
  });

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

  it("does not select a locked object on click", () => {
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

  it("applies click and hover interactions only in the interactive viewer", () => {
    const object = createPrimitiveObject3D({
      dimensions: { depth: 100, height: 100, width: 100 },
      id: "interactive-object",
      name: "Interactive object",
      position: { x: 200, y: 200, z: 0 },
      primitive: "box",
    });
    object.interactions = [
      createDefaultInteraction({
        effect: "move",
        id: "click-move",
        moveX: 80,
        trigger: "click-tap",
      }),
      createDefaultInteraction({
        effect: "scale",
        id: "hover-scale",
        scaleX: 130,
        scaleY: 130,
        trigger: "hover",
      }),
    ];
    const props = {
      artboardHeight: 679,
      artboardWidth: 1208,
      objects: [object],
      scene: { enabled: true },
    };
    const { container, rerender } = render(<Artboard3DScene {...props} />);
    let objectGroup = container.querySelector(
      'group[name="Interactive object"]',
    )!;
    expect(objectGroup.querySelector("group")).toBeNull();

    rerender(<Artboard3DScene {...props} interactive />);
    objectGroup = container.querySelector('group[name="Interactive object"]')!;
    const visualGroup = objectGroup.querySelector("group")!;
    expect(visualGroup.getAttribute("position")).toBe("0,0,0");

    fireEvent.click(objectGroup);
    expect(visualGroup.getAttribute("position")).toBe("80,0,0");

    fireEvent.pointerOver(objectGroup);
    expect(visualGroup.getAttribute("scale")).toBe("1.3,1.3,1.3");
  });
});
