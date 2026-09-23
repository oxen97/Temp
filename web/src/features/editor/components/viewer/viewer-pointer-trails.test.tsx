import { act, cleanup, render } from "@testing-library/react";
import { createRef, Profiler } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ViewerTrailParticle } from "@/features/editor/lib/viewer-generated-effects";

import {
  ViewerPointerTrails,
  type ViewerPointerTrailsHandle,
} from "./viewer-pointer-trails";

let frameId = 0;
let frames = new Map<number, FrameRequestCallback>();

function advanceFrame(now: number) {
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((callback) => callback(now)));
}

function particle(
  id: number,
  overrides: Partial<ViewerTrailParticle> = {},
): ViewerTrailParticle {
  return {
    id,
    interactionId: "ink",
    createdAt: 0,
    lifespan: 2,
    x: 20,
    y: 30,
    size: 12,
    growth: 2,
    fade: 1,
    blur: 0,
    color: "#234567",
    blendMode: "normal",
    fadeOutDuration: 0.5,
    ...overrides,
  };
}

beforeEach(() => {
  frameId = 0;
  frames = new Map();
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      const id = ++frameId;
      frames.set(id, callback);
      return id;
    }),
  );
  vi.stubGlobal(
    "cancelAnimationFrame",
    vi.fn((id: number) => frames.delete(id)),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("isolated viewer pointer trails", () => {
  it("animates opacity and transform without React renders or layout dimension changes", () => {
    const ref = createRef<ViewerPointerTrailsHandle>();
    const onRender = vi.fn();
    const view = render(
      <Profiler id="trails" onRender={onRender}>
        <ViewerPointerTrails ref={ref} limits={new Map([["ink", 10]])} />
      </Profiler>,
    );
    const initialRenderCount = onRender.mock.calls.length;

    act(() => ref.current?.append([particle(1)], 0));
    const node = view.container.querySelector<HTMLElement>(
      ".viewer-pointer-particle",
    )!;
    expect(node.style.transform).toBe("translate(-50%, -50%) scale(1)");
    expect(node.style.filter).toBe("");
    expect(node.style.opacity).toBe("1");

    advanceFrame(1000);

    expect(node.style.transform).toBe("translate(-50%, -50%) scale(1.5)");
    expect(node.style.opacity).toBe("0.5");
    expect(node.style.width).toBe("12px");
    expect(node.style.height).toBe("12px");
    expect(node.style.left).toBe("20px");
    expect(node.style.top).toBe("30px");
    expect(node.style.filter).toBe("");
    expect(onRender).toHaveBeenCalledTimes(initialRenderCount);

    advanceFrame(2000);
    expect(node.isConnected).toBe(false);
    expect(frames.size).toBe(0);
    expect(onRender).toHaveBeenCalledTimes(initialRenderCount);
  });

  it("preserves authored blur in world pixels as the mark grows", () => {
    const ref = createRef<ViewerPointerTrailsHandle>();
    const view = render(
      <ViewerPointerTrails ref={ref} limits={new Map([["ink", 10]])} />,
    );
    act(() => ref.current?.append([particle(1, { blur: 10 })], 0));
    const node = view.container.querySelector<HTMLElement>(
      ".viewer-pointer-particle",
    )!;
    expect(node.style.filter).toBe("blur(4.5px)");

    advanceFrame(1000);
    expect(node.style.transform).toBe("translate(-50%, -50%) scale(1.5)");
    expect(node.style.filter).toBe("blur(3px)");
  });

  it("applies updated limits without recreating marks or resetting age", () => {
    const ref = createRef<ViewerPointerTrailsHandle>();
    const view = render(
      <ViewerPointerTrails ref={ref} limits={new Map([["ink", 2]])} />,
    );
    act(() => ref.current?.append([particle(1), particle(2)], 0));
    const [oldest, newest] = [
      ...view.container.querySelectorAll<HTMLElement>(
        ".viewer-pointer-particle",
      ),
    ];
    advanceFrame(1000);
    view.rerender(
      <ViewerPointerTrails ref={ref} limits={new Map([["ink", 1]])} />,
    );
    advanceFrame(1100);

    expect(oldest).toHaveAttribute("data-trail-retiring", "true");
    expect(newest).not.toHaveAttribute("data-trail-retiring");
    expect(Number(newest.style.opacity)).toBeCloseTo(0.45);
    expect(view.container.querySelectorAll(".viewer-pointer-particle")[1]).toBe(
      newest,
    );
    advanceFrame(1350);
    expect(Number(oldest.style.opacity)).toBeCloseTo(0.225);
    expect(Number(newest.style.opacity)).toBeCloseTo(0.325);
    advanceFrame(1600);
    expect(oldest.isConnected).toBe(false);
    expect(newest.isConnected).toBe(true);
    expect(Number(newest.style.opacity)).toBeCloseTo(0.2);
  });

  it("uses the authored retirement duration and stops its frame on unmount", () => {
    const ref = createRef<ViewerPointerTrailsHandle>();
    const view = render(
      <ViewerPointerTrails ref={ref} limits={new Map([["ink", 1]])} />,
    );
    act(() =>
      ref.current?.append(
        [
          particle(1, { lifespan: 10, fadeOutDuration: 2 }),
          particle(2, { lifespan: 10 }),
        ],
        0,
      ),
    );
    const oldest = view.container.querySelector<HTMLElement>(
      ".viewer-pointer-particle",
    )!;
    advanceFrame(1000);
    expect(oldest.isConnected).toBe(true);
    expect(Number(oldest.style.opacity)).toBeCloseTo(0.5);
    expect(frames.size).toBe(1);

    view.unmount();
    expect(cancelAnimationFrame).toHaveBeenCalled();
    expect(frames.size).toBe(0);
    expect(ref.current).toBeNull();
  });
});
