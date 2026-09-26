import { useFrame, useThree } from "@react-three/fiber";
import { fireEvent, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { Group, Plane, Ray, Texture, Vector3 } from "three";
import { describe, expect, it, vi } from "vitest";

import {
  CameraRig,
  isPointerGestureClaimed,
} from "@/features/editor/lib/camera-rig";
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

vi.mock("@/features/editor/three/camera-sky", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/editor/three/camera-sky")>();
  return {
    ...actual,
    loadCameraSkyTexture: vi.fn(async () =>
      actual.prepareCameraSkyTexture(new Texture()),
    ),
  };
});

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

  it("lets a press through a locked object to the artboard, like a locked 2D element", () => {
    const object = createPrimitiveObject3D({
      dimensions: { depth: 6000, height: 6000, width: 6000 },
      id: "locked-sky",
      name: "Locked sky",
      position: { x: 600, y: 340, z: 0 },
      primitive: "sphere",
    });
    object.locked = true;
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

    fireEvent.pointerDown(container.querySelector('group[name="Locked sky"]')!);

    expect(onSelectObject).not.toHaveBeenCalled();
    expect(onArtboardPointerDown).toHaveBeenCalledOnce();
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

describe("Artboard3DScene camera rig", () => {
  // Runs the scene's frame callbacks; prioritized ones render and need WebGL.
  const runFrames = () => {
    for (const [callback, priority] of vi.mocked(useFrame).mock.calls)
      if (!priority)
        (callback as (state: unknown, delta: number) => void)(
          { clock: { elapsedTime: 0 } },
          1 / 60,
        );
  };
  const orbitBox = () =>
    createPrimitiveObject3D({
      dimensions: { depth: 200, height: 200, width: 200 },
      id: "orbit-box",
      name: "Orbit box",
      position: { x: 960, y: 540, z: 0 },
      primitive: "box",
    });
  const turn = (overrides = {}) =>
    createDefaultInteraction({
      cameraRotateY: 90,
      duration: 0,
      effect: "camera-rotate",
      id: "turn",
      motion: "direct",
      trigger: "click-tap",
      ...overrides,
    });
  const renderScene = (rig: CameraRig, object = orbitBox()) =>
    render(
      <Artboard3DScene
        artboardHeight={1080}
        artboardWidth={1920}
        cameraRig={rig}
        interactive
        objects={[object]}
        scene={{ enabled: true }}
      />,
    );

  it("orbits the preview camera around the scene target and rolls it", () => {
    vi.mocked(useFrame).mockClear();
    const rig = new CameraRig(() => 0);
    renderScene(rig);
    const { camera } = useThree();
    expect(camera.position.x).toBeCloseTo(960);
    expect(camera.position.z).toBeCloseTo(1000);

    rig.update("turn", turn(), { active: true, angles: { x: 0, y: 90, z: 0 } });
    runFrames();
    expect(camera.position.x).toBeCloseTo(1960);
    expect(camera.position.y).toBeCloseTo(-540);
    expect(camera.position.z).toBeCloseTo(0);
    expect(camera.getWorldDirection(new Vector3()).x).toBeCloseTo(-1);

    rig.update("turn", turn(), { active: true, angles: { x: 0, y: 0, z: 8 } });
    runFrames();
    expect(camera.position.x).toBeCloseTo(960);
    expect(camera.position.z).toBeCloseTo(1000);
    expect(camera.rotation.z).toBeCloseTo((8 * Math.PI) / 180);

    // The camera never tilts over the top of its target.
    rig.update("turn", turn(), {
      active: true,
      angles: { x: 120, y: 0, z: 0 },
    });
    expect(rig.target().x).toBeCloseTo(85);
  });

  it("turns the camera from a 3D object's click and back on the next click", () => {
    const rig = new CameraRig(() => 0);
    const object = orbitBox();
    object.interactions = [turn({ cameraRotateY: 45 })];
    const { container } = renderScene(rig, object);
    const group = container.querySelector('group[name="Orbit box"]')!;
    vi.mocked(useFrame).mockClear();
    fireEvent.click(group);
    runFrames();
    expect(rig.target().y).toBeCloseTo(45);
    vi.mocked(useFrame).mockClear();
    fireEvent.click(group);
    runFrames();
    expect(rig.target().y).toBeCloseTo(0);
  });

  it("turns the camera by dragging a 3D object in screen space", () => {
    const rig = new CameraRig(() => 0);
    const object = orbitBox();
    object.interactions = [
      turn({
        cameraRotateX: 0,
        cameraRotateY: -180,
        resetMode: "keep",
        trackDistance: 400,
        trigger: "drag",
      }),
    ];
    const { container } = renderScene(rig, object);
    const group = container.querySelector('group[name="Orbit box"]')!;
    Object.assign(group, {
      hasPointerCapture: () => true,
      releasePointerCapture: vi.fn(),
      setPointerCapture: vi.fn(),
    });
    fireEvent.pointerDown(group, { clientX: 100, clientY: 100, pointerId: 4 });
    fireEvent.pointerMove(group, { clientX: 300, clientY: 100, pointerId: 4 });
    expect(rig.target().y).toBeCloseTo(-90);
    fireEvent.pointerUp(group, { clientX: 300, clientY: 100, pointerId: 4 });
    expect(rig.target().y).toBeCloseTo(-90);
  });

  it("keeps artwork camera drags away from a 3D object's own buttons only", () => {
    const pressed = (interaction: ReturnType<typeof turn>) => {
      const object = orbitBox();
      object.interactions = [interaction];
      const { container, unmount } = renderScene(new CameraRig(), object);
      let claimed: boolean | null = null;
      const listener = (event: Event) => {
        claimed = isPointerGestureClaimed(event);
      };
      document.addEventListener("pointerdown", listener);
      fireEvent.pointerDown(
        container.querySelector('group[name="Orbit box"]')!,
        { pointerId: 5 },
      );
      document.removeEventListener("pointerdown", listener);
      unmount();
      return claimed;
    };
    expect(
      pressed(
        createDefaultInteraction({ effect: "scale", trigger: "click-tap" }),
      ),
    ).toBe(true);
    expect(
      pressed(turn({ trigger: "drag", triggerArea: "entire-artwork" })),
    ).toBe(false);
  });
});

describe("Artboard3DScene camera sky", () => {
  const sky = { fov: 40, opacity: 1, src: "blob:night-sky" };

  it("draws the Preview sky even on a scene without 3D objects", async () => {
    const { container } = render(
      <Artboard3DScene
        artboardHeight={1080}
        artboardWidth={1920}
        objects={[]}
        sky={sky}
      />,
    );
    expect(
      container.querySelector('[data-testid="three-canvas"]'),
    ).not.toBeNull();
    await waitFor(() =>
      expect(container.querySelector('mesh[name="Camera sky"]')).not.toBeNull(),
    );
  });

  it("leaves the sky out of the editor canvas and draws nothing without it", () => {
    const editor = render(
      <Artboard3DScene
        artboardHeight={1080}
        artboardWidth={1920}
        objects={[]}
        sky={sky}
        viewport={{ height: 1080, width: 1920, x: 0, y: 0 }}
      />,
    );
    expect(
      editor.container.querySelector('[data-testid="three-canvas"]'),
    ).toBeNull();
    editor.unmount();
    const empty = render(
      <Artboard3DScene
        artboardHeight={1080}
        artboardWidth={1920}
        objects={[]}
      />,
    );
    expect(
      empty.container.querySelector('[data-testid="three-canvas"]'),
    ).toBeNull();
  });
});
