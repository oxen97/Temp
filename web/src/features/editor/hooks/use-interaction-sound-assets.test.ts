import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useEditorStore } from "../store/editor-store";
import { useInteractionSoundAssets } from "./use-interaction-sound-assets";

function musicAsset(src: string) {
  return {
    durationSeconds: 0,
    mimeType: "audio/mpeg",
    name: "music.mp3",
    sizeBytes: 1,
    src,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  let created = 0;
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => `blob:sound-${++created}`),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  useEditorStore.setState({
    activePageId: "page-1",
    clipboard: [],
    future: [],
    pages: [{ id: "page-1", name: "Intro", elements: [] }],
    past: [],
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useInteractionSoundAssets object URL cleanup", () => {
  it("revokes an owned URL once nothing references it any more", () => {
    const { result, unmount } = renderHook(() => useInteractionSoundAssets());
    let src = "";
    act(() => {
      src = result.current.createBackgroundMusicObjectUrl(new Blob(["a"]));
      useEditorStore
        .getState()
        .updateBackgroundMusic({ asset: musicAsset(src) });
    });
    act(() => {
      vi.runOnlyPendingTimers();
    });
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(src);

    act(() => {
      useEditorStore.getState().updateBackgroundMusic({ asset: null });
    });
    act(() => {
      vi.runOnlyPendingTimers();
    });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(src);
    unmount();
  });

  it("keeps a URL that an undo snapshot still references", () => {
    const { result, unmount } = renderHook(() => useInteractionSoundAssets());
    let src = "";
    act(() => {
      src = result.current.createBackgroundMusicObjectUrl(new Blob(["a"]));
      useEditorStore
        .getState()
        .updateBackgroundMusic({ asset: musicAsset(src) });
      useEditorStore.getState().checkpoint();
      useEditorStore.getState().updateBackgroundMusic({ asset: null });
    });
    act(() => {
      vi.runOnlyPendingTimers();
    });
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(src);
    unmount();
  });

  it("revokes every owned URL on unmount", () => {
    const { result, unmount } = renderHook(() => useInteractionSoundAssets());
    let src = "";
    act(() => {
      src = result.current.createBackgroundMusicObjectUrl(new Blob(["a"]));
      useEditorStore
        .getState()
        .updateBackgroundMusic({ asset: musicAsset(src) });
    });
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(src);
  });
});
