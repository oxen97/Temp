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
  type ScreenPointToWorld3D,
} from "./artboard-3d-scene";

vi.mock("@react-three/fiber", async () => {
  const { OrthographicCamera } = await import("three");
  const projectionCamera = new OrthographicCamera();
  return {
    Canvas: ({
      camera,
      children,
      dpr,
    }: {
      camera?: { manual?: boolean };
      children: ReactNode;
      dpr?: number | [number, number];
    }) => (
      <div
        data-camera-manual={camera?.manual}
        data-dpr={dpr}
        data-testid="three-canvas"
      >
        {children}
      </div>
    ),
    useFrame: vi.fn(),
    useThree: () => ({
      camera: projectionCamera,
      invalidate: vi.fn(),
      size: { height: 679, width: 1208 },
    }),
  };
});

describe("Artboard3DScene selection", () => {
  it("publishes the camera conversion bridge and clears it on unmount", () => {
    const object = createPrimitiveObject3D({
      dimensions: { depth: 20, height: 20, width: 20 },
      id: "camera-bridge",
      name: "Camera bridge",
      position: { x: 240, y: 180, z: 15 },
      primitive: "box",
    });
    const bridge = { current: null as ScreenPointToWorld3D | null };
    const { unmount } = render(
      <Artboard3DScene
        artboardHeight={600}
        artboardWidth={800}
        objects={[object]}
        screenPointToWorldRef={bridge}
        scene={{ enabled: true }}
      />,
    );
    expect(bridge.current).not.toBeNull();
    const position = bridge.current!({ x: 240, y: 180 }, -40);
    expect(position?.x).toBeCloseTo(240, 6);
    expect(position?.y).toBeCloseTo(180, 6);
    unmount();
    expect(bridge.current).toBeNull();
  });
  it("bridges authored object events in artboard coordinates only during preview", () => {
    const object = createPrimitiveObject3D({
      dimensions: { depth: 20, height: 80, width: 20 },
      id: "authored-event-object",
      name: "Event object",
      position: { x: 240, y: 180, z: 15 },
      primitive: "cylinder",
    });
    const interaction = createDefaultInteraction({
      effect: "emit-event",
      trigger: "click-tap",
    });
    object.interactions = [interaction];
    const onRuntimeInteraction = vi.fn();
    const props = {
      artboardHeight: 600,
      artboardWidth: 800,
      objects: [object],
      onRuntimeInteraction,
      scene: { enabled: true },
    };
    const { container, rerender, unmount } = render(
      <Artboard3DScene {...props} />,
    );
    fireEvent.click(container.querySelector('group[name="Event object"]')!);
    expect(onRuntimeInteraction).not.toHaveBeenCalled();
    rerender(<Artboard3DScene {...props} interactive />);
    fireEvent.click(container.querySelector('group[name="Event object"]')!);
    expect(onRuntimeInteraction).toHaveBeenCalledWith(object.id, interaction, {
      phase: "activate",
      point: { x: 240, y: 180 },
    });
    unmount();
  });

  it("runs authored delay events once and clears timers on unmount", () => {
    vi.useFakeTimers();
    try {
      const object = createPrimitiveObject3D({
        dimensions: { depth: 20, height: 20, width: 20 },
        id: "delayed",
        name: "Delayed",
        position: { x: 10, y: 20, z: 0 },
        primitive: "box",
      });
      const interaction = createDefaultInteraction({
        effect: "spawn-object",
        trigger: "after-delay",
        timeSeconds: 0.5,
      });
      object.interactions = [interaction];
      const onRuntimeInteraction = vi.fn();
      const { unmount } = render(
        <Artboard3DScene
          artboardHeight={600}
          artboardWidth={800}
          interactive
          objects={[object]}
          onRuntimeInteraction={onRuntimeInteraction}
          scene={{ enabled: true }}
        />,
      );
      vi.advanceTimersByTime(499);
      expect(onRuntimeInteraction).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(onRuntimeInteraction).toHaveBeenCalledWith(
        object.id,
        interaction,
        {
          phase: "activate",
          point: { x: expect.closeTo(10, 6), y: expect.closeTo(20, 6) },
        },
      );
      unmount();
      vi.advanceTimersByTime(2000);
      expect(onRuntimeInteraction).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps camera projection authored and uses the native display density", () => {
    const object = createPrimitiveObject3D({
      dimensions: { depth: 100, height: 100, width: 100 },
      id: "zoom-cube",
      name: "Zoom cube",
      position: { x: 200, y: 200, z: 0 },
      primitive: "box",
    });
    const { getByTestId } = render(
      <Artboard3DScene
        artboardHeight={1080}
        artboardWidth={1920}
        objects={[object]}
        scene={{ enabled: true }}
      />,
    );
    const canvas = getByTestId("three-canvas");
    expect(canvas.dataset.cameraManual).toBe("true");
    expect(canvas.dataset.dpr).toBe("1,2");
  });

  it("uses a continuous editor viewport and preserves preview bounds", () => {
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
    expect(editorViewport).toEqual({
      x: -300,
      y: -100,
      width: 2600,
      height: 1400,
    });
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
