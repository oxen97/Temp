import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CameraRig } from "@/features/editor/lib/camera-rig";
import {
  createDefaultInteraction,
  type InteractionDefinition,
} from "@/features/editor/lib/interaction-model";
import {
  type ArtboardSettings,
  defaultBackgroundMusicSettings,
  defaultInteractionSoundSettings,
  defaultSoundAdvancedSettings,
  defaultSoundMixerSettings,
  type CanvasElement,
} from "@/features/editor/store/editor-store";
import type { CameraSky } from "@/features/editor/three/camera-sky";
import type { Scene3DSettings } from "@/features/editor/three/types";

import { ViewerPreview } from "./viewer-preview";

const scene3DProps = vi.hoisted(() => ({
  current: null as null | {
    cameraRig?: CameraRig | null;
    scene?: Partial<Scene3DSettings>;
    sky?: CameraSky | null;
  },
}));
const backgroundProps = vi.hoisted(() => ({
  current: null as null | { artboard: ArtboardSettings },
}));

vi.mock("@/features/editor/components/canvas/artboard-3d-scene", () => ({
  Artboard3DScene: (props: {
    cameraRig?: CameraRig | null;
    scene?: Partial<Scene3DSettings>;
    sky?: CameraSky | null;
  }) => {
    scene3DProps.current = props;
    return <div data-testid="artboard-3d-scene" />;
  },
}));
vi.mock("@/features/editor/components/canvas/artboard-background", () => ({
  ArtboardBackground: (props: { artboard: ArtboardSettings }) => {
    backgroundProps.current = props;
    return null;
  },
}));
vi.mock("@/features/editor/components/canvas/shape-graphic", () => ({
  ShapeGraphic: ({ element }: { element: CanvasElement }) => (
    <span>{element.name}</span>
  ),
}));
vi.mock("@/features/editor/components/viewer/viewer-background-music", () => ({
  ViewerBackgroundMusic: () => null,
}));

function shape(overrides: Partial<CanvasElement>): CanvasElement {
  return {
    id: "shape",
    name: "Shape",
    type: "rectangle",
    x: 0,
    y: 0,
    width: 20,
    height: 20,
    rotation: 0,
    opacity: 100,
    fill: "#fff",
    stroke: "#000",
    strokeWidth: 0,
    cornerRadius: 0,
    visible: true,
    locked: false,
    ...overrides,
  };
}

function cameraRotate(overrides: Partial<InteractionDefinition>) {
  return createDefaultInteraction({
    cameraRotateX: 60,
    cameraRotateY: -180,
    effect: "camera-rotate",
    motion: "direct",
    resetMode: "keep",
    smoothing: 0,
    trackDistance: 100,
    trigger: "drag",
    triggerArea: "entire-artwork",
    ...overrides,
  });
}

const commonProps = {
  advancedSound: defaultSoundAdvancedSettings,
  artboard: {
    background: "#000",
    cornerRadius: 0,
    height: 100,
    width: 200,
  },
  backgroundMusic: defaultBackgroundMusicSettings,
  mixer: defaultSoundMixerSettings,
  objects3d: [],
  onClose: vi.fn(),
  projectId: "preview-camera-test",
};

function renderPreview(
  elements: CanvasElement[],
  artboard: Partial<ArtboardSettings> = {},
) {
  const view = render(
    <ViewerPreview
      {...commonProps}
      artboard={{ ...commonProps.artboard, ...artboard }}
      elements={elements}
    />,
  );
  const page = view.container.querySelector<HTMLElement>(
    ".viewer-preview-page",
  )!;
  const scale = Number(/scale\(([\d.]+)/.exec(page.style.transform)?.[1] ?? 1);
  const rig = scene3DProps.current?.cameraRig;
  if (!rig) throw new Error("The preview did not pass a camera rig");
  return { page, rig, scale, view };
}

const pointer = (clientX: number, clientY: number, pointerId = 1) => ({
  button: 0,
  clientX,
  clientY,
  isPrimary: true,
  pointerId,
  pointerType: "mouse",
});

describe("viewer Camera Rotate", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    backgroundProps.current = null;
    scene3DProps.current = null;
  });

  it("turns the camera while the artwork is dragged and keeps it after release", () => {
    const { page, rig, scale } = renderPreview([
      shape({
        id: "caption",
        interactions: [cameraRotate({ id: "orbit" })],
        x: 150,
        y: 80,
      }),
    ]);
    expect(page.style.cursor).toBe("grab");
    expect(page.style.touchAction).toBe("none");

    fireEvent.pointerDown(page, pointer(20, 20));
    expect(page.style.cursor).toBe("grabbing");
    fireEvent.pointerMove(window, pointer(20 + 50 * scale, 20 + 25 * scale));
    // Half a Track distance right and a quarter down.
    expect(rig.target().y).toBeCloseTo(-90);
    expect(rig.target().x).toBeCloseTo(15);

    fireEvent.pointerUp(window, pointer(20 + 50 * scale, 20 + 25 * scale));
    expect(page.style.cursor).toBe("grab");
    expect(rig.target().y).toBeCloseTo(-90);

    // The next drag continues from where the camera was left.
    fireEvent.pointerDown(page, pointer(40, 40));
    fireEvent.pointerMove(window, pointer(40 + 50 * scale, 40));
    fireEvent.pointerUp(window, pointer(40 + 50 * scale, 40));
    expect(rig.target().y).toBeCloseTo(-180);
    expect(rig.target().x).toBeCloseTo(15);
  });

  it("starts from the caption that hosts it but not from buttons or an element's own drag", () => {
    const { rig, scale, view } = renderPreview([
      shape({
        id: "caption",
        interactions: [cameraRotate({ id: "orbit" })],
        x: 150,
        y: 80,
      }),
      shape({
        id: "button",
        interactions: [
          createDefaultInteraction({ effect: "opacity", trigger: "click-tap" }),
        ],
        x: 10,
      }),
      shape({
        id: "handle",
        interactions: [
          createDefaultInteraction({ effect: "move", trigger: "drag" }),
        ],
        x: 60,
      }),
    ]);
    const element = (id: string) =>
      view.container.querySelector<HTMLElement>(`[data-element-id="${id}"]`)!;
    expect(element("caption").classList.contains("is-draggable")).toBe(false);
    expect(element("button").style.cursor).toBe("default");

    for (const id of ["button", "handle"]) {
      fireEvent.pointerDown(element(id), pointer(15, 10, 2));
      fireEvent.pointerMove(window, pointer(15 + 50 * scale, 10, 2));
      fireEvent.pointerUp(window, pointer(15 + 50 * scale, 10, 2));
      expect(rig.target().y).toBeCloseTo(0);
    }

    fireEvent.pointerDown(element("caption"), pointer(160, 90, 3));
    fireEvent.pointerMove(window, pointer(160 + 50 * scale, 90, 3));
    expect(rig.target().y).toBeCloseTo(-90);
    fireEvent.pointerUp(window, pointer(160 + 50 * scale, 90, 3));
  });

  it("follows Pointer Move from the artwork center and lets go when the pointer leaves", () => {
    const { page, rig, scale } = renderPreview([
      shape({
        id: "look",
        interactions: [
          cameraRotate({
            cameraRotateX: 10,
            cameraRotateY: 30,
            id: "look",
            resetMode: "contextual",
            trigger: "pointer-move",
          }),
        ],
      }),
    ]);
    // jsdom lays the page out at the viewport origin.
    fireEvent.pointerMove(page, pointer(150 * scale, 25 * scale));
    expect(rig.target().y).toBeCloseTo(15);
    expect(rig.target().x).toBeCloseTo(-2.5);
    fireEvent.pointerLeave(page, pointer(150 * scale, 25 * scale));
    expect(rig.target().y).toBeCloseTo(0);
    expect(rig.target().x).toBeCloseTo(0);
  });

  it("turns to the authored angles on click and back on the next click", () => {
    const { rig, view } = renderPreview([
      shape({
        id: "button",
        interactions: [
          cameraRotate({
            cameraRotateX: 0,
            cameraRotateY: 90,
            id: "turn",
            resetMode: "contextual",
            trigger: "click-tap",
            triggerArea: "selected-object",
          }),
        ],
      }),
    ]);
    const button = view.container.querySelector<HTMLElement>(
      '[data-element-id="button"]',
    )!;
    fireEvent.click(button);
    expect(rig.target().y).toBeCloseTo(90);
    fireEvent.click(button);
    expect(rig.target().y).toBeCloseTo(0);
  });

  it("leaves the authored camera alone on pages without Camera Rotate", () => {
    const view = render(
      <ViewerPreview
        {...commonProps}
        elements={[
          shape({
            id: "button",
            interactions: [
              createDefaultInteraction({
                effect: "move",
                trigger: "click-tap",
              }),
            ],
          }),
        ]}
      />,
    );
    expect(scene3DProps.current?.cameraRig).toBeNull();
    const page = view.container.querySelector<HTMLElement>(
      ".viewer-preview-page",
    )!;
    expect(page.style.cursor).toBe("");
    expect(page.style.touchAction).toBe("");
  });

  it("draws a Rotate with Camera image as a sky that turns with the camera", () => {
    const skyBackground: Partial<ArtboardSettings> = {
      backgroundImage: "blob:night-sky",
      backgroundImageOpacity: 90,
      backgroundMediaType: "image",
      backgroundRotateWithCamera: true,
    };
    renderPreview(
      [
        shape({
          id: "caption",
          interactions: [
            cameraRotate({
              cameraFov: 40,
              cameraProjection: "perspective",
              id: "orbit",
            }),
          ],
        }),
      ],
      skyBackground,
    );
    expect(scene3DProps.current?.sky).toEqual({
      fov: 40,
      opacity: 0.9,
      src: "blob:night-sky",
    });
    // The flat copy is left out; the solid color still shows beneath.
    expect(backgroundProps.current?.artboard.backgroundImage).toBeUndefined();
    expect(backgroundProps.current?.artboard.background).toBe("#000");
    cleanup();

    // Without Camera Rotate the same background is drawn flat.
    render(
      <ViewerPreview
        {...commonProps}
        artboard={{ ...commonProps.artboard, ...skyBackground }}
        elements={[shape({ id: "plain" })]}
      />,
    );
    expect(scene3DProps.current?.sky).toBeNull();
    expect(backgroundProps.current?.artboard.backgroundImage).toBe(
      "blob:night-sky",
    );
  });

  it("plays the host's Drag sounds for a drag that starts anywhere", () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
    const { page, scale, view } = renderPreview([
      shape({
        id: "caption",
        interactionSounds: [
          {
            ...defaultInteractionSoundSettings,
            assets: [
              {
                durationSeconds: 1,
                mimeType: "audio/wav",
                name: "swoosh.wav",
                sizeBytes: 64,
                src: "blob:swoosh",
              },
            ],
            event: "while-dragging",
            id: "caption-swoosh",
            trigger: "drag",
          },
        ],
        interactions: [cameraRotate({ id: "orbit" })],
        x: 150,
        y: 80,
      }),
    ]);
    const audio = view.container.querySelector<HTMLAudioElement>(
      ".viewer-interaction-sound",
    )!;
    fireEvent.pointerDown(page, pointer(20, 20));
    expect(play).not.toHaveBeenCalled();
    fireEvent.pointerMove(window, pointer(20 + 40 * scale, 20));
    expect(audio.src).toBe("blob:swoosh");
    expect(audio.loop).toBe(true);
    expect(play).toHaveBeenCalledTimes(1);
    // Still dragging: the loop keeps playing instead of restarting.
    fireEvent.pointerMove(window, pointer(20 + 60 * scale, 20));
    expect(play).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(window, pointer(20 + 60 * scale, 20));
  });

  it("renders the 3D layer with the camera effect's Projection and Field of view", () => {
    renderPreview([
      shape({
        id: "caption",
        interactions: [
          cameraRotate({
            cameraFov: 42,
            cameraProjection: "perspective",
            id: "orbit",
          }),
        ],
      }),
    ]);
    expect(scene3DProps.current?.scene).toMatchObject({
      perspective: 42,
      projection: "perspective",
    });
  });
});
