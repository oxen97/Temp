import { act, cleanup, render } from "@testing-library/react";
import { Profiler } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultInteraction } from "@/features/editor/lib/interaction-model";
import { IDENTITY_VISUAL } from "@/features/editor/lib/interaction-runtime";
import {
  createMediaDeformMesh,
  updateMediaDeformMesh,
} from "@/features/editor/lib/media-deform";
import { ViewerWaveClock } from "@/features/editor/lib/viewer-wave-clock";
import type { CanvasElement } from "@/features/editor/store/editor-store";
import type {
  ViewerMediaDeformHandle,
  ViewerMediaDeformSnapshot,
} from "./viewer-media-deform";
import { ViewerMediaLiquidBridge } from "./viewer-media-liquid-bridge";

const gpu = vi.hoisted(() => ({
  create: vi.fn(),
  render: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock("@/features/editor/lib/media-deform-bridge-renderer", () => ({
  createMediaLiquidRenderer: gpu.create,
}));
const source: CanvasElement = {
  id: "source",
  name: "photo",
  type: "image",
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
const target: CanvasElement = {
  ...source,
  id: "target",
  name: "color",
  type: "rectangle",
  x: 140,
  fill: "#1177ff",
};
const interaction = createDefaultInteraction({
  id: "join",
  effect: "liquid-merge",
  trigger: "near-target",
  collisionTarget: "target",
  joinDistance: 40,
  releaseDistance: 80,
  bridgeWidth: 32,
});
let snapshot: ViewerMediaDeformSnapshot;
let listeners: Set<() => void>;
let handle: ViewerMediaDeformHandle;
let clock: ViewerWaveClock;
beforeEach(() => {
  vi.clearAllMocks();
  gpu.create.mockImplementation(() => ({
    render: gpu.render,
    dispose: gpu.dispose,
  }));
  snapshot = {
    mesh: createMediaDeformMesh(source),
    source: document.createElement("img"),
  };
  listeners = new Set();
  handle = {
    updatePose: vi.fn(),
    getVideo: () => null,
    getSnapshot: () => snapshot,
    subscribeFrame(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  clock = new ViewerWaveClock();
  clock.setReducedMotion(true);
});
afterEach(cleanup);
const getHandle = (id: string) => (id === source.id ? handle : null);
const props = () => ({
  source,
  target,
  sourceVisual: IDENTITY_VISUAL,
  targetVisual: IDENTITY_VISUAL,
  interaction,
  waveClock: clock,
  getMediaHandle: getHandle,
  artboardWidth: 500,
  artboardHeight: 400,
});

describe("texture-preserving media liquid bridge", () => {
  it("updates only the connector on imperative media frames, even with reduced motion", () => {
    const reactRender = vi.fn();
    const view = render(
      <Profiler id="bridge" onRender={reactRender}>
        <ViewerMediaLiquidBridge {...props()} />
      </Profiler>,
    );
    const canvas = view.container.querySelector("canvas")!;
    expect(canvas).toHaveAttribute("data-media-liquid-status", "ready");
    expect(gpu.render).toHaveBeenCalledTimes(1);
    expect(gpu.render.mock.calls[0][1].source).toBe(snapshot.source);
    expect(gpu.render.mock.calls[0][2].color).toBe("#1177ff");
    const rest = [
      { x: 0, y: 56 },
      { x: 112, y: 56 },
    ];
    updateMediaDeformMesh(snapshot.mesh, {
      rest,
      points: [
        { x: 0, y: 56 },
        { x: 120, y: 66 },
      ],
      velocities: rest.map(() => ({ x: 0, y: 0 })),
      anchorIndex: 0,
    });
    const previousBounds = gpu.render.mock.calls[0][0].bounds;
    snapshot = { ...snapshot };
    act(() => listeners.forEach((listener) => listener()));
    expect(gpu.render).toHaveBeenCalledTimes(2);
    expect(gpu.render.mock.calls[1][0].bounds).not.toEqual(previousBounds);
    expect(reactRender).toHaveBeenCalledTimes(1);
    expect(view.container.querySelectorAll("img,video")).toHaveLength(0);
    view.unmount();
    expect(listeners.size).toBe(0);
    expect(gpu.dispose).toHaveBeenCalledTimes(1);
  });

  it("uses join/release hysteresis and hides an already overlapping pair", () => {
    const view = render(<ViewerMediaLiquidBridge {...props()} />);
    const canvas = view.container.querySelector("canvas")!;
    expect(canvas).toHaveAttribute("data-media-liquid-status", "ready");
    view.rerender(
      <ViewerMediaLiquidBridge {...props()} target={{ ...target, x: 170 }} />,
    );
    expect(canvas).toHaveAttribute("data-media-liquid-status", "ready");
    view.rerender(
      <ViewerMediaLiquidBridge {...props()} target={{ ...target, x: 220 }} />,
    );
    expect(canvas).toHaveAttribute("data-media-liquid-status", "separated");
    view.rerender(
      <ViewerMediaLiquidBridge {...props()} target={{ ...target, x: 170 }} />,
    );
    expect(canvas).toHaveAttribute("data-media-liquid-status", "separated");
    view.rerender(<ViewerMediaLiquidBridge {...props()} />);
    expect(canvas).toHaveAttribute("data-media-liquid-status", "ready");
    view.rerender(
      <ViewerMediaLiquidBridge
        {...props()}
        target={{ ...target, x: 25, y: 25, width: 50, height: 50 }}
      />,
    );
    expect(canvas).toHaveAttribute("data-media-liquid-status", "overlapping");
    expect(canvas).toHaveStyle({ visibility: "hidden" });
  });

  it("never changes source rendering when a bridge cannot get GPU resources", () => {
    gpu.create.mockReturnValueOnce(null);
    const view = render(<ViewerMediaLiquidBridge {...props()} />);
    expect(view.container.querySelector("canvas")).toHaveAttribute(
      "data-media-liquid-status",
      "unavailable",
    );
    expect(snapshot.source.src).toBe("");
    expect(gpu.render).not.toHaveBeenCalled();
    view.unmount();
    expect(gpu.dispose).not.toHaveBeenCalled();
    expect(listeners.size).toBe(0);
  });
});
