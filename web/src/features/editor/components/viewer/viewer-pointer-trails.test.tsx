import { act, cleanup, render } from "@testing-library/react";
import { createRef, Profiler } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ViewerTrailParticle } from "@/features/editor/lib/viewer-generated-effects";

import {
  TRAIL_BLUR_SCALE,
  trailBlurLevel,
  trailBlurRatio,
  trailSpriteExtent,
} from "@/features/editor/lib/viewer-trail-sprites";

/** Drawn edge, in artboard pixels, of a mark with this authored blur. */
const trailSpriteExtentFor = (blur: number, diameter: number) =>
  trailSpriteExtent(diameter, trailBlurLevel(blur * TRAIL_BLUR_SCALE, diameter));

import {
  ViewerPointerTrails,
  type ViewerPointerTrailsElement,
  type ViewerPointerTrailsHandle,
} from "./viewer-pointer-trails";

let frameId = 0;
let frames = new Map<number, FrameRequestCallback>();

type DrawCall = {
  canvas: HTMLCanvasElement;
  alpha: number;
  composite: string;
  x: number;
  y: number;
  size: number;
};
let draws: DrawCall[] = [];
let clears: HTMLCanvasElement[] = [];

/** Records what the trail layer draws; jsdom has no 2D canvas of its own. */
function fakeContext(canvas: HTMLCanvasElement) {
  const context = {
    canvas,
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    fillStyle: "#000",
    setTransform: vi.fn(),
    clearRect: vi.fn(() => clears.push(canvas)),
    fillRect: vi.fn(),
    putImageData: vi.fn(),
    createImageData: (width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
      height,
      width,
    }),
    drawImage: vi.fn(
      (_source: unknown, x: number, y: number, width: number) => {
        if (canvas.classList.contains("viewer-pointer-trail-canvas"))
          draws.push({
            alpha: context.globalAlpha,
            canvas,
            composite: context.globalCompositeOperation,
            size: width,
            x,
            y,
          });
      },
    ),
  };
  return context;
}

function advanceFrame(now: number) {
  const pending = [...frames.values()];
  frames.clear();
  draws = [];
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
  draws = [];
  clears = [];
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
  const contexts = new WeakMap<HTMLCanvasElement, ReturnType<typeof fakeContext>>();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    function (this: HTMLCanvasElement) {
      let context = contexts.get(this);
      if (!context) {
        context = fakeContext(this);
        contexts.set(this, context);
      }
      return context as unknown as CanvasRenderingContext2D;
    } as unknown as HTMLCanvasElement["getContext"],
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("isolated viewer pointer trails", () => {
  it("draws aging marks on one canvas without DOM marks or React renders", () => {
    const ref = createRef<ViewerPointerTrailsHandle>();
    const onRender = vi.fn();
    const view = render(
      <Profiler id="trails" onRender={onRender}>
        <ViewerPointerTrails ref={ref} limits={new Map([["ink", 10]])} />
      </Profiler>,
    );
    const initialRenderCount = onRender.mock.calls.length;

    act(() => ref.current?.append([particle(1)], 0));
    expect(ref.current?.snapshot(0)).toMatchObject([
      { diameter: 12, opacity: 1, scale: 1, x: 20, y: 30, blur: 0 },
    ]);
    advanceFrame(0);
    expect(draws).toHaveLength(1);
    expect(draws[0]).toMatchObject({ alpha: 1, size: 12, x: 14, y: 24 });

    advanceFrame(1000);
    expect(ref.current?.snapshot(1000)).toMatchObject([
      { diameter: 18, opacity: 0.5, scale: 1.5, x: 20, y: 30, blur: 0 },
    ]);
    expect(draws).toHaveLength(1);
    expect(draws[0]).toMatchObject({ alpha: 0.5, size: 18, x: 11, y: 21 });
    const trails = view.container.querySelector<ViewerPointerTrailsElement>(
      ".viewer-pointer-trails",
    )!;
    expect(trails.querySelectorAll("canvas")).toHaveLength(1);
    expect(trails.querySelector(".viewer-pointer-particle")).toBeNull();
    expect(trails.dataset.trailLive).toBe("1");
    expect(onRender).toHaveBeenCalledTimes(initialRenderCount);

    advanceFrame(2000);
    expect(ref.current?.snapshot(2000)).toEqual([]);
    expect(draws).toHaveLength(0);
    expect(trails.dataset.trailLive).toBe("0");
    expect(frames.size).toBe(0);
    // The idle layer releases its backing store.
    expect(trails.querySelector("canvas")?.width).toBe(0);
    expect(onRender).toHaveBeenCalledTimes(initialRenderCount);
  });

  it("keeps authored blur in world pixels as the mark grows", () => {
    const ref = createRef<ViewerPointerTrailsHandle>();
    render(<ViewerPointerTrails ref={ref} limits={new Map([["ink", 10]])} />);
    act(() => ref.current?.append([particle(1, { blur: 10 })], 0));
    expect(ref.current?.snapshot(0)[0]).toMatchObject({
      blur: 4.5,
      diameter: 12,
    });
    advanceFrame(0);
    // 4.5 / 12 is ~0.38: the drawn square includes 3σ of glow. A glow this
    // soft is drawn on a half-resolution canvas.
    const early = trailBlurRatio(trailBlurLevel(4.5, 12));
    expect(early).toBeCloseTo(0.375, 1);
    expect(draws[0].size).toBeCloseTo(12 * (1 + 6 * early) * 0.5);

    advanceFrame(1000);
    expect(ref.current?.snapshot(1000)[0]).toMatchObject({
      blur: 4.5,
      diameter: 18,
      scale: 1.5,
    });
    // 4.5 / 18 = 0.25: a finer sprite for the grown mark.
    const later = trailBlurRatio(trailBlurLevel(4.5, 18));
    expect(later).toBeCloseTo(0.25, 1);
    expect(draws[0].size).toBeCloseTo(18 * (1 + 6 * later) * 0.5);
  });

  it("draws soft glows at half resolution until a sharp mark joins the layer", () => {
    const ref = createRef<ViewerPointerTrailsHandle>();
    render(<ViewerPointerTrails ref={ref} limits={new Map([["ink", 10]])} />);
    act(() => ref.current?.append([particle(1, { blur: 10, x: 40, y: 60 })], 0));
    advanceFrame(0);
    const soft = trailSpriteExtentFor(10, 12);
    expect(draws[0]).toMatchObject({ x: 20 - soft / 4, y: 30 - soft / 4 });
    expect(draws[0].size).toBeCloseTo(soft / 2);

    act(() => ref.current?.append([particle(2, { blur: 0, x: 40, y: 60 })], 10));
    advanceFrame(10);
    // Full resolution again: both marks at their artboard size. Both were
    // born at 0; 10 ms into a 2 s life with growth 2 they are 12.06 across.
    expect(draws).toHaveLength(2);
    expect(draws[1]).toMatchObject({
      size: expect.closeTo(12.06),
      x: expect.closeTo(33.97),
      y: expect.closeTo(53.97),
    });
    expect(draws[0].size).toBeCloseTo(trailSpriteExtentFor(10, 12.06));
  });

  it("gives each blend mode its own canvas and composite operation", () => {
    const ref = createRef<ViewerPointerTrailsHandle>();
    const view = render(
      <ViewerPointerTrails
        ref={ref}
        limits={
          new Map([
            ["ink", 10],
            ["glow", 10],
          ])
        }
      />,
    );
    act(() =>
      ref.current?.append(
        [
          particle(1),
          particle(2, { interactionId: "glow", blendMode: "screen" }),
          particle(3, { interactionId: "glow", blendMode: "lighter" }),
        ],
        0,
      ),
    );
    advanceFrame(0);
    const canvases = [
      ...view.container.querySelectorAll<HTMLCanvasElement>("canvas"),
    ];
    expect(canvases.map((canvas) => canvas.dataset.trailBlend)).toEqual([
      "normal",
      "screen",
      "lighter",
    ]);
    expect(canvases.map((canvas) => canvas.style.mixBlendMode)).toEqual([
      "normal",
      "screen",
      "plus-lighter",
    ]);
    expect(draws.map((call) => call.composite)).toEqual([
      "source-over",
      "screen",
      "lighter",
    ]);
  });

  it("applies updated limits without recreating marks or resetting age", () => {
    const ref = createRef<ViewerPointerTrailsHandle>();
    const view = render(
      <ViewerPointerTrails ref={ref} limits={new Map([["ink", 2]])} />,
    );
    act(() => ref.current?.append([particle(1), particle(2)], 0));
    advanceFrame(1000);
    view.rerender(
      <ViewerPointerTrails ref={ref} limits={new Map([["ink", 1]])} />,
    );
    advanceFrame(1100);

    const [oldest, newest] = ref.current!.snapshot(1100);
    expect(oldest).toMatchObject({ id: 1, retiring: true });
    expect(newest).toMatchObject({ id: 2, retiring: false });
    expect(newest.opacity).toBeCloseTo(0.45);
    const trails = view.container.querySelector<HTMLElement>(
      ".viewer-pointer-trails",
    )!;
    expect(trails.dataset.trailLive).toBe("1");
    expect(trails.dataset.trailRetiring).toBe("1");

    advanceFrame(1350);
    const [fading, current] = ref.current!.snapshot(1350);
    expect(fading.opacity).toBeCloseTo(0.225);
    expect(current.opacity).toBeCloseTo(0.325);
    expect(draws.map((call) => call.alpha)).toEqual([
      expect.closeTo(0.225),
      expect.closeTo(0.325),
    ]);

    advanceFrame(1600);
    const remaining = ref.current!.snapshot(1600);
    expect(remaining.map((mark) => mark.id)).toEqual([2]);
    expect(remaining[0].opacity).toBeCloseTo(0.2);
    expect(trails.dataset.trailRetiring).toBe("0");
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
    advanceFrame(1000);
    const oldest = ref.current!.snapshot(1000)[0];
    expect(oldest).toMatchObject({ id: 1, retiring: true });
    expect(oldest.opacity).toBeCloseTo(0.5);
    expect(frames.size).toBe(1);
    const trails = view.container.querySelector<ViewerPointerTrailsElement>(
      ".viewer-pointer-trails",
    )!;
    expect(trails.amousTrails?.snapshot(1000)).toHaveLength(2);

    view.unmount();
    expect(cancelAnimationFrame).toHaveBeenCalled();
    expect(frames.size).toBe(0);
    expect(ref.current).toBeNull();
    expect(trails.amousTrails).toBeUndefined();
  });
});
