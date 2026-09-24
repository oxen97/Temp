import { memo, useLayoutEffect, useRef } from "react";

import type { InteractionDefinition } from "@/features/editor/lib/interaction-model";
import type { RuntimeVisual } from "@/features/editor/lib/interaction-runtime";
import {
  isLiquidPairActive,
  liquidBoundsGap,
} from "@/features/editor/lib/liquid-merge-runtime";
import {
  buildMediaLiquidBridge,
  mediaLiquidSurface,
} from "@/features/editor/lib/media-deform-bridge";
import {
  createMediaLiquidRenderer,
  type MediaLiquidRenderer,
} from "@/features/editor/lib/media-deform-bridge-renderer";
import type { StrandPose } from "@/features/editor/lib/strand-bone-runtime";
import type { ViewerWaveClock } from "@/features/editor/lib/viewer-wave-clock";
import type { CanvasElement } from "@/features/editor/store/editor-store";
import type {
  ViewerMediaDeformHandle,
  ViewerMediaDeformSnapshot,
} from "./viewer-media-deform";

export type ViewerMediaLiquidBridgeProps = {
  source: CanvasElement;
  target: CanvasElement;
  sourceVisual: RuntimeVisual;
  targetVisual: RuntimeVisual;
  sourcePose?: StrandPose;
  targetPose?: StrandPose;
  interaction: InteractionDefinition;
  waveClock: ViewerWaveClock;
  getMediaHandle(id: string): ViewerMediaDeformHandle | null | undefined;
  artboardWidth: number;
  artboardHeight: number;
};

/** Adds only the connector. Original media, live playback, materials, stacking,
 * hit targets and editing remain owned by the ordinary source elements. */
export const ViewerMediaLiquidBridge = memo(function ViewerMediaLiquidBridge(
  props: ViewerMediaLiquidBridgeProps,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  const refreshRef = useRef<(() => void) | null>(null);
  const { waveClock, source, target } = props;
  useLayoutEffect(() => {
    propsRef.current = props;
    refreshRef.current?.();
  }, [props]);
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: MediaLiquidRenderer | null = null;
    let active = false;
    let failed = false;
    let stopped = false;
    let retryAfter = 0;
    let previousProps: ViewerMediaLiquidBridgeProps | null = null;
    let previousA: ViewerMediaDeformSnapshot | null = null;
    let previousB: ViewerMediaDeformSnapshot | null = null;
    let handleA: ViewerMediaDeformHandle | null | undefined;
    let handleB: ViewerMediaDeformHandle | null | undefined;
    let unsubscribeA = () => {};
    let unsubscribeB = () => {};
    const hide = (status: string) => {
      canvas.style.visibility = "hidden";
      canvas.dataset.mediaLiquidStatus = status;
    };
    const draw = () => {
      if (stopped || failed) return;
      if (performance.now() < retryAfter) return;
      const current = propsRef.current;
      const nextA = current.getMediaHandle(current.source.id);
      const nextB = current.getMediaHandle(current.target.id);
      if (nextA !== handleA) {
        unsubscribeA();
        handleA = nextA;
        unsubscribeA = handleA?.subscribeFrame(draw) ?? (() => {});
      }
      if (nextB !== handleB) {
        unsubscribeB();
        handleB = nextB;
        unsubscribeB = handleB?.subscribeFrame(draw) ?? (() => {});
      }
      const snapshotA = handleA?.getSnapshot() ?? null;
      const snapshotB = handleB?.getSnapshot() ?? null;
      if (
        current === previousProps &&
        snapshotA === previousA &&
        snapshotB === previousB
      )
        return;
      previousProps = current;
      previousA = snapshotA;
      previousB = snapshotB;
      const interaction = current.interaction;
      if (
        interaction.enabled === false ||
        interaction.effect !== "liquid-merge" ||
        !current.source.visible ||
        !current.target.visible
      ) {
        active = false;
        hide("inactive");
        return;
      }
      const a = mediaLiquidSurface(
        current.source,
        current.sourceVisual,
        snapshotA,
        current.sourcePose,
      );
      const b = mediaLiquidSurface(
        current.target,
        current.targetVisual,
        snapshotB,
        current.targetPose,
      );
      if (!a || !b) {
        renderer?.dispose();
        renderer = null;
        hide("loading");
        return;
      }
      const boundsGap = liquidBoundsGap(
        {
          x: a.bounds.left,
          y: a.bounds.top,
          width: a.bounds.width,
          height: a.bounds.height,
        },
        {
          x: b.bounds.left,
          y: b.bounds.top,
          width: b.bounds.width,
          height: b.bounds.height,
        },
      );
      if (!isLiquidPairActive(interaction, boundsGap, active)) {
        active = false;
        renderer?.dispose();
        renderer = null;
        hide("separated");
        return;
      }
      const bridge = buildMediaLiquidBridge(
        a,
        b,
        interaction.bridgeWidth,
        interaction.liquidSmoothness / 100,
      );
      if (!bridge) {
        active = true;
        hide("overlapping");
        return;
      }
      active = isLiquidPairActive(interaction, bridge.gap, active);
      if (!active) {
        hide("separated");
        return;
      }
      try {
        if (!renderer) renderer = createMediaLiquidRenderer(canvas);
        if (!renderer) {
          // The finite pair budget can become available after another pair
          // separates. Retry through the existing clock, without a new loop.
          retryAfter = performance.now() + 1000;
          previousProps = null;
          hide("unavailable");
          return;
        }
        renderer.render(bridge, a, b, interaction.liquidSmoothness / 100);
        canvas.dataset.mediaLiquidStatus = "ready";
        canvas.style.visibility = "visible";
      } catch {
        failed = true;
        renderer?.dispose();
        renderer = null;
        hide("unavailable");
      }
    };
    refreshRef.current = draw;
    // The shared clock discovers newly mounted handles. Native media frame
    // subscriptions also update live bridges while reduced-motion is enabled.
    const unsubscribeClock = waveClock.subscribe(draw);
    draw();
    return () => {
      stopped = true;
      refreshRef.current = null;
      unsubscribeClock();
      unsubscribeA();
      unsubscribeB();
      renderer?.dispose();
    };
  }, [waveClock, source.id, target.id]);
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="viewer-media-liquid-bridge"
      data-media-liquid-source={source.id}
      data-media-liquid-target={target.id}
      style={{
        position: "absolute",
        pointerEvents: "none",
        visibility: "hidden",
      }}
    />
  );
});
