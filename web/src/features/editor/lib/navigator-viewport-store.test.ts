import { describe, expect, it, vi } from "vitest";

import { createNavigatorViewportStore } from "./navigator-viewport-store";

const initial = { height: 100, width: 200, x: 0, y: 0 };

describe("createNavigatorViewportStore", () => {
  it("starts with the initial viewport", () => {
    const store = createNavigatorViewportStore(initial);
    expect(store.getSnapshot()).toBe(initial);
  });

  it("stores a new viewport and notifies subscribers", () => {
    const store = createNavigatorViewportStore(initial);
    const listener = vi.fn();
    store.subscribe(listener);
    const next = { height: 50, width: 80, x: 10, y: 20 };
    store.update(() => next);
    expect(store.getSnapshot()).toBe(next);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("skips the update when the updater returns the current viewport", () => {
    const store = createNavigatorViewportStore(initial);
    const listener = vi.fn();
    store.subscribe(listener);
    store.update((current) => current);
    expect(store.getSnapshot()).toBe(initial);
    expect(listener).not.toHaveBeenCalled();
  });

  it("stops notifying after unsubscribe", () => {
    const store = createNavigatorViewportStore(initial);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.update(() => ({ ...initial, x: 5 }));
    expect(listener).not.toHaveBeenCalled();
  });
});
