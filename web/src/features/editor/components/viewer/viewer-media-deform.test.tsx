import { act, cleanup, render } from "@testing-library/react";
import { createRef, StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultInteraction } from "@/features/editor/lib/interaction-model";
import { IDENTITY_VISUAL } from "@/features/editor/lib/interaction-runtime";
import type { StrandPose } from "@/features/editor/lib/strand-bone-runtime";
import { ViewerWaveClock } from "@/features/editor/lib/viewer-wave-clock";
import type { CanvasElement } from "@/features/editor/store/editor-store";
import {
  ViewerMediaDeform,
  type ViewerMediaDeformHandle,
} from "./viewer-media-deform";

const fake = vi.hoisted(() => ({
  create: vi.fn(),
  draw: vi.fn(),
  dispose: vi.fn(),
  shapeRender: vi.fn(),
}));
vi.mock("@/features/editor/lib/media-deform-renderer", () => ({
  createMediaDeformRenderer: fake.create,
  markMediaDeformVideoFrame: vi.fn(),
}));
vi.mock("@/features/editor/components/canvas/shape-graphic", () => ({
  ShapeGraphic: () => {
    fake.shapeRender();
    return <span className="ordinary-media" />;
  },
}));
const element: CanvasElement = {
  id: "generic-upload",
  name: "Generic upload",
  type: "image",
  src: "/my-upload.png",
  x: 0,
  y: 0,
  width: 112,
  height: 112,
  rotation: 0,
  opacity: 100,
  fill: "none",
  stroke: "none",
  strokeWidth: 0,
  cornerRadius: 0,
  visible: true,
  locked: false,
};
const base = {
  element,
  visual: IDENTITY_VISUAL,
  artboardWidth: 400,
  artboardHeight: 300,
  elementIndex: 0,
};
let frames: Map<number, FrameRequestCallback>;
let loadedImages: HTMLImageElement[];
let decodedFrames: Map<number, VideoFrameRequestCallback>;

beforeEach(() => {
  vi.clearAllMocks();
  frames = new Map();
  decodedFrames = new Map();
  loadedImages = [];
  let id = 0;
  fake.create.mockImplementation(() => ({
    render: fake.draw,
    dispose: fake.dispose,
  }));
  vi.stubGlobal("Image", function () {
    const image = document.createElement("img");
    loadedImages.push(image);
    return image;
  });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (frameId: number) =>
    frames.delete(frameId),
  );
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  Object.defineProperty(
    HTMLVideoElement.prototype,
    "requestVideoFrameCallback",
    {
      configurable: true,
      value: (callback: VideoFrameRequestCallback) => {
        decodedFrames.set(++id, callback);
        return id;
      },
    },
  );
  Object.defineProperty(
    HTMLVideoElement.prototype,
    "cancelVideoFrameCallback",
    {
      configurable: true,
      value: (frameId: number) => decodedFrames.delete(frameId),
    },
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(
    HTMLVideoElement.prototype,
    "requestVideoFrameCallback",
  );
  Reflect.deleteProperty(
    HTMLVideoElement.prototype,
    "cancelVideoFrameCallback",
  );
});

const loadImage = () =>
  act(() => loadedImages.at(-1)?.dispatchEvent(new Event("load")));
function tick(time: number) {
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((frame) => frame(time)));
}

describe("ViewerMediaDeform", () => {
  it("cancels decoder callbacks on effect replacement and StrictMode unmount", () => {
    const clock = new ViewerWaveClock();
    const clip = { ...element, type: "video" as const, src: "/clip.mp4" };
    const view = render(
      <StrictMode>
        <ViewerMediaDeform {...base} element={clip} waveClock={clock} />
      </StrictMode>,
    );
    const video = view.container.querySelector("video")!;
    expect(decodedFrames.size).toBe(1);
    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: 2,
    });
    act(() => video.dispatchEvent(new Event("loadeddata")));
    expect(fake.create).toHaveBeenCalledTimes(1);
    const obsoleteCallback = [...decodedFrames.values()][0];
    view.rerender(
      <StrictMode>
        <ViewerMediaDeform
          {...base}
          element={{ ...clip, width: 140 }}
          waveClock={clock}
        />
      </StrictMode>,
    );
    expect(view.container.querySelector("video")).toBe(video);
    expect(fake.dispose).toHaveBeenCalledTimes(1);
    expect(decodedFrames.size).toBe(1);
    act(() => obsoleteCallback(300, {} as VideoFrameCallbackMetadata));
    expect(decodedFrames.size).toBe(1);
    view.unmount();
    expect(decodedFrames.size).toBe(0);
    expect(fake.dispose).toHaveBeenCalledTimes(2);
  });

  it("animates texture and matching hit geometry without React/store frame updates", () => {
    const clock = new ViewerWaveClock();
    const wave = createDefaultInteraction({
      effect: "wave-deform",
      waveAmplitude: 45,
      waveLength: 160,
      waveSpeed: 0.3,
    });
    const ref = createRef<ViewerMediaDeformHandle>();
    const view = render(
      <ViewerMediaDeform
        {...base}
        ref={ref}
        waveClock={clock}
        waveInteraction={wave}
      />,
    );
    loadImage();
    const hit = view.container.querySelector(".media-deform-hit-area")!;
    const before = hit.getAttribute("d");
    clock.setPointer({ x: 200, y: 150 });
    tick(100);
    tick(116);
    expect(hit.getAttribute("d")).not.toBe(before);
    expect(hit).toHaveAttribute("pointer-events", "all");
    expect(fake.shapeRender).toHaveBeenCalledTimes(1);
    expect(fake.draw.mock.calls.length).toBeGreaterThan(2);
    expect(
      view.container.querySelector("[data-media-deform-status]"),
    ).toHaveAttribute("data-media-deform-status", "ready");
    const rest = [
      { x: 56, y: 0 },
      { x: 56, y: 112 },
    ];
    const pose: StrandPose = {
      rest,
      points: rest.map((point) => ({ ...point, x: point.x + 250 })),
      velocities: rest.map(() => ({ x: 0, y: 0 })),
      anchorIndex: 0,
    };
    act(() => ref.current!.updatePose(pose));
    expect(hit.getAttribute("d")).toMatch(/^M250 0 /);
    expect(fake.shapeRender).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(frames.size).toBe(0);
    expect(fake.dispose).toHaveBeenCalledTimes(1);
    expect(loadedImages[0].onload).toBeNull();
    expect(loadedImages[0].onerror).toBeNull();
  });

  it("keeps actual video playback and updates decoded frames under reduced motion", () => {
    const clock = new ViewerWaveClock();
    clock.setReducedMotion(true);
    const ref = createRef<ViewerMediaDeformHandle>();
    const view = render(
      <ViewerMediaDeform
        {...base}
        element={{ ...element, type: "video", src: "/clip.mp4" }}
        ref={ref}
        waveClock={clock}
      />,
    );
    const video = view.container.querySelector("video")!;
    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: 2,
    });
    act(() => video.dispatchEvent(new Event("loadeddata")));
    expect(ref.current?.getVideo()).toBe(video);
    expect(video).toHaveAttribute("autoplay");
    expect(video).toHaveAttribute("loop");
    expect(video.muted).toBe(true);
    expect(fake.create.mock.calls[0][3]).toBe(video);
    const callback = [...decodedFrames.values()][0];
    decodedFrames.clear();
    video.currentTime = 0.2;
    act(() => callback(200, {} as VideoFrameCallbackMetadata));
    expect(fake.draw).toHaveBeenLastCalledWith(expect.any(Object), true);
    expect(decodedFrames.size).toBe(1);
    expect(frames.size).toBe(0);
    view.unmount();
    expect(decodedFrames.size).toBe(0);
    expect(video.pause).toHaveBeenCalled();
    expect(fake.dispose).toHaveBeenCalledTimes(1);
  });

  it("falls back on unavailable WebGL and on source errors without leaking resources", () => {
    fake.create.mockReturnValueOnce(null);
    const view = render(
      <ViewerMediaDeform {...base} waveClock={new ViewerWaveClock()} />,
    );
    loadImage();
    expect(
      view.container.querySelector("[data-media-deform-status]"),
    ).toHaveAttribute("data-media-deform-status", "fallback");
    expect(view.container.querySelector("canvas")).toHaveStyle({
      visibility: "hidden",
    });
    expect(
      view.container.querySelector(".ordinary-media")!.parentElement,
    ).toHaveStyle({ visibility: "visible" });
    view.unmount();
    const other = render(
      <ViewerMediaDeform {...base} waveClock={new ViewerWaveClock()} />,
    );
    act(() => loadedImages.at(-1)?.dispatchEvent(new Event("error")));
    expect(
      other.container.querySelector("[data-media-deform-status]"),
    ).toHaveAttribute("data-media-deform-status", "fallback");
    expect(fake.dispose).not.toHaveBeenCalled();
  });

  it("draws a clock-driven video once per display frame, not again per decoded frame", () => {
    const clock = new ViewerWaveClock();
    const wave = createDefaultInteraction({ effect: "wave-deform" });
    const view = render(
      <ViewerMediaDeform
        {...base}
        element={{ ...element, type: "video", src: "/clip.mp4" }}
        waveClock={clock}
        waveInteraction={wave}
      />,
    );
    const video = view.container.querySelector("video")!;
    Object.defineProperty(video, "readyState", { configurable: true, value: 2 });
    act(() => video.dispatchEvent(new Event("loadeddata")));
    fake.draw.mockClear();
    const callback = [...decodedFrames.values()][0];
    decodedFrames.clear();
    act(() => callback(200, {} as VideoFrameCallbackMetadata));
    expect(fake.draw).not.toHaveBeenCalled();
    expect(decodedFrames.size).toBe(1);
    tick(216);
    expect(fake.draw).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it("pauses hidden or covered footage and freezes its mesh until shown again", () => {
    const clock = new ViewerWaveClock();
    const wave = createDefaultInteraction({ effect: "wave-deform" });
    const clip = { ...element, type: "video" as const, src: "/clip.mp4" };
    const view = render(
      <ViewerMediaDeform {...base} element={clip} waveClock={clock} waveInteraction={wave} />,
    );
    const video = view.container.querySelector("video")!;
    Object.defineProperty(video, "readyState", { configurable: true, value: 2 });
    act(() => video.dispatchEvent(new Event("loadeddata")));
    tick(100);
    // The footage is playing in a browser; jsdom never starts it.
    Object.defineProperty(video, "paused", { configurable: true, value: false });
    const pause = vi.mocked(HTMLMediaElement.prototype.pause);
    pause.mockClear();
    view.rerender(
      <ViewerMediaDeform {...base} element={clip} paused waveClock={clock} waveInteraction={wave} />,
    );
    expect(pause).toHaveBeenCalled();
    expect(video).toHaveAttribute("data-playback", "paused");
    fake.draw.mockClear();
    tick(116);
    tick(132);
    expect(fake.draw).not.toHaveBeenCalled();
    const play = vi.mocked(HTMLMediaElement.prototype.play);
    play.mockClear();
    view.rerender(
      <ViewerMediaDeform {...base} element={clip} waveClock={clock} waveInteraction={wave} />,
    );
    expect(play).toHaveBeenCalled();
    tick(148);
    expect(fake.draw).toHaveBeenCalled();
    view.unmount();
  });
});
