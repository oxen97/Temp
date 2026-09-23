import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ViewerWaveClock } from "./viewer-wave-clock";

let frames: Map<number, FrameRequestCallback>;
let nextId: number;

function tick(now: number) {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach((callback) => callback(now));
}

beforeEach(() => {
  frames = new Map();
  nextId = 0;
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      const id = ++nextId;
      frames.set(id, callback);
      return id;
    }),
  );
  vi.stubGlobal(
    "cancelAnimationFrame",
    vi.fn((id: number) => frames.delete(id)),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("ViewerWaveClock", () => {
  it("delivers raw pointer changes immediately without scheduling frames or leaking listeners", () => {
    const clock = new ViewerWaveClock();
    const listener = vi.fn();
    const unsubscribe = clock.subscribePointer(listener);
    expect(listener).toHaveBeenLastCalledWith(null);
    clock.setPointer({ x: 40, y: 20 });
    expect(listener).toHaveBeenLastCalledWith({ x: 40, y: 20 });
    expect(frames.size).toBe(0);
    clock.setPointer(null);
    expect(listener).toHaveBeenLastCalledWith(null);
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
    clock.setPointer({ x: 80, y: 50 });
    expect(listener).toHaveBeenCalledTimes(3);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("shares a single RAF across many paths and stops after the final unsubscribe", () => {
    const clock = new ViewerWaveClock();
    const listeners = Array.from({ length: 28 }, () => vi.fn());
    const unsubscribes = listeners.map((listener) => clock.subscribe(listener));
    expect(frames.size).toBe(1);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    clock.setPointer({ x: 60, y: 20 });
    clock.setPointer({ x: 80, y: 30 });
    expect(frames.size).toBe(1);
    tick(100);
    expect(frames.size).toBe(1);
    for (const listener of listeners) {
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener.mock.calls[1][0]).toEqual({
        pointer: { x: 80, y: 30 },
        seconds: 0.1,
        strength: 0.16,
      });
      expect(listener.mock.calls[1][0]).toBe(listeners[0].mock.calls[1][0]);
    }
    unsubscribes.slice(0, -1).forEach((unsubscribe) => unsubscribe());
    expect(frames.size).toBe(1);
    unsubscribes.at(-1)!();
    expect(frames.size).toBe(0);
    tick(116);
    expect(listeners[0]).toHaveBeenCalledTimes(2);
  });

  it("responds to pointer movement with reduced motion but schedules no ambient RAF", () => {
    const clock = new ViewerWaveClock();
    clock.setReducedMotion(true);
    const listener = vi.fn();
    const unsubscribe = clock.subscribe(listener);
    expect(frames.size).toBe(0);
    clock.setPointer({ x: 40, y: 15 });
    expect(listener).toHaveBeenLastCalledWith({
      pointer: { x: 40, y: 15 },
      seconds: 0,
      strength: 1,
    });
    clock.setPointer(null);
    expect(listener).toHaveBeenLastCalledWith({
      pointer: null,
      seconds: 0,
      strength: 0,
    });
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    clock.setReducedMotion(false);
    expect(frames.size).toBe(1);
    tick(120);
    clock.setReducedMotion(true);
    expect(frames.size).toBe(0);
    unsubscribe();
  });

  it("eases pointer leave toward zero without losing the final pointer location", () => {
    const clock = new ViewerWaveClock();
    const listener = vi.fn();
    const unsubscribe = clock.subscribe(listener);
    clock.setPointer({ x: 60, y: 20 });
    tick(100);
    tick(150);
    const activeStrength = listener.mock.lastCall![0].strength as number;
    clock.setPointer(null);
    tick(200);
    expect(listener.mock.lastCall![0].strength).toBeLessThan(activeStrength);
    expect(listener.mock.lastCall![0].pointer).toEqual({ x: 60, y: 20 });
    for (let time = 250; time <= 750; time += 50) tick(time);
    expect(listener.mock.lastCall![0].strength).toBe(0);
    unsubscribe();
  });
});
