import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PlaybackVideo } from "./playback-video";

let observers: {
  callback: IntersectionObserverCallback;
  disconnect: ReturnType<typeof vi.fn>;
}[] = [];

beforeEach(() => {
  observers = [];
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (
    this: HTMLMediaElement,
  ) {
    Object.defineProperty(this, "paused", { configurable: true, value: true });
  });
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      disconnect = vi.fn();
      constructor(callback: IntersectionObserverCallback) {
        observers.push({ callback, disconnect: this.disconnect });
      }
      observe() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function setIntersecting(isIntersecting: boolean) {
  act(() =>
    observers[0].callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ),
  );
}

describe("PlaybackVideo", () => {
  it("autoplays visible footage and never starts a hidden one", () => {
    const shown = render(<PlaybackVideo src="/a.webm" />);
    const video = shown.container.querySelector("video")!;
    expect(video).toHaveAttribute("autoplay");
    expect(video).toHaveAttribute("loop");
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute("data-playback", "playing");
    const hidden = render(<PlaybackVideo paused src="/b.webm" />);
    const idle = hidden.container.querySelector("video")!;
    expect(idle).not.toHaveAttribute("autoplay");
    expect(idle).toHaveAttribute("preload", "auto");
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it("pauses while covered and resumes where it stopped", () => {
    const view = render(<PlaybackVideo src="/a.webm" />);
    const video = view.container.querySelector("video")!;
    Object.defineProperty(video, "paused", { configurable: true, value: false });
    view.rerender(<PlaybackVideo paused src="/a.webm" />);
    expect(video.pause).toHaveBeenCalledTimes(1);
    expect(video).toHaveAttribute("data-playback", "paused");
    view.rerender(<PlaybackVideo src="/a.webm" />);
    expect(video.play).toHaveBeenCalledTimes(1);
    expect(video).toHaveAttribute("data-playback", "playing");
  });

  it("stops decoding while it has no visible box and disconnects on unmount", () => {
    const view = render(<PlaybackVideo src="/a.webm" />);
    const video = view.container.querySelector("video")!;
    Object.defineProperty(video, "paused", { configurable: true, value: false });
    setIntersecting(false);
    expect(video.pause).toHaveBeenCalledTimes(1);
    setIntersecting(true);
    expect(video.play).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(observers[0].disconnect).toHaveBeenCalled();
  });
});
