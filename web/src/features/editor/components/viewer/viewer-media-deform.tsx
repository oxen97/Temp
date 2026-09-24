import {
  forwardRef,
  memo,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";

import { ShapeGraphic } from "@/features/editor/components/canvas/shape-graphic";
import {
  colorWithOpacity,
  strokeDasharrayForElement,
} from "@/features/editor/lib/element-style";
import type { InteractionDefinition } from "@/features/editor/lib/interaction-model";
import type { RuntimeVisual } from "@/features/editor/lib/interaction-runtime";
import {
  createMediaDeformMesh,
  mediaDeformHitPath,
  updateMediaDeformMesh,
  type MediaDeformMesh,
} from "@/features/editor/lib/media-deform";
import {
  createMediaDeformRenderer,
  markMediaDeformVideoFrame,
  type MediaDeformRenderer,
} from "@/features/editor/lib/media-deform-renderer";
import type { StrandPose } from "@/features/editor/lib/strand-bone-runtime";
import { viewerPointToElementLocal } from "@/features/editor/lib/viewer-generated-effects";
import type {
  ViewerWaveClock,
  ViewerWaveFrame,
} from "@/features/editor/lib/viewer-wave-clock";
import type { CanvasElement } from "@/features/editor/store/editor-store";

export type ViewerMediaDeformHandle = {
  updatePose(pose: StrandPose | null): void;
  getVideo(): HTMLVideoElement | null;
  getSnapshot(): ViewerMediaDeformSnapshot | null;
  subscribeFrame(listener: () => void): () => void;
};

export type ViewerMediaDeformSnapshot = {
  mesh: MediaDeformMesh;
  source: HTMLImageElement | HTMLVideoElement;
};

export type ViewerMediaDeformProps = {
  element: CanvasElement;
  waveClock: ViewerWaveClock;
  waveInteraction?: InteractionDefinition;
  strandInteraction?: InteractionDefinition;
  visual: RuntimeVisual;
  artboardWidth: number;
  artboardHeight: number;
  elementIndex: number;
};

/** Media uses a real texture mesh. Frames update buffers/canvas/SVG imperatively;
 * neither the editor store nor React participates in animation ticks. */
export const ViewerMediaDeform = memo(
  forwardRef<ViewerMediaDeformHandle, ViewerMediaDeformProps>(
    function ViewerMediaDeform(props, ref) {
      const { element, waveClock, waveInteraction, strandInteraction } = props;
      const rootRef = useRef<HTMLSpanElement>(null);
      const canvasRef = useRef<HTMLCanvasElement>(null);
      const fallbackRef = useRef<HTMLSpanElement>(null);
      const videoRef = useRef<HTMLVideoElement>(null);
      const hitRef = useRef<SVGPathElement>(null);
      const strokeRef = useRef<SVGPathElement>(null);
      const poseRef = useRef<StrandPose | null>(null);
      const propsRef = useRef(props);
      const drawRef = useRef<(() => void) | null>(null);
      const snapshotRef = useRef<ViewerMediaDeformSnapshot | null>(null);
      const frameListenersRef = useRef(new Set<() => void>());

      useImperativeHandle(
        ref,
        () => ({
          updatePose(pose) {
            poseRef.current = pose;
            drawRef.current?.();
          },
          getVideo: () => videoRef.current,
          getSnapshot: () => snapshotRef.current,
          subscribeFrame(listener) {
            frameListenersRef.current.add(listener);
            return () => {
              frameListenersRef.current.delete(listener);
            };
          },
        }),
        [],
      );

      useLayoutEffect(() => {
        propsRef.current = props;
        drawRef.current?.();
      }, [props]);

      useLayoutEffect(() => {
        const root = rootRef.current;
        const canvas = canvasRef.current;
        const fallback = fallbackRef.current;
        const hit = hitRef.current;
        const stroke = strokeRef.current;
        if (!root || !canvas || !fallback || !hit) return;
        const mesh = createMediaDeformMesh(element, {
          tipLength: strandInteraction?.strandTipLength,
          anchor: strandInteraction?.strandAnchor,
        });
        let renderer: MediaDeformRenderer | null = null;
        let stopped = false;
        let failed = false;
        let lastVideoTime = -1;
        let lastFrame: ViewerWaveFrame = {
          pointer: null,
          seconds: 0,
          strength: 0,
        };
        let lastPath = "";
        let videoFrameId: number | null = null;
        const video = videoRef.current;
        const image = element.type === "image" ? new Image() : null;
        const source = video ?? image;
        const restPath = mediaDeformHitPath(mesh);
        root.dataset.mediaDeformStatus = "loading";
        root.dataset.mediaDeformVertices = String(mesh.positions.length / 3);
        canvas.style.visibility = "hidden";
        fallback.style.visibility = "visible";
        hit.setAttribute("d", restPath);
        stroke?.setAttribute("d", restPath);

        const fail = () => {
          if (stopped) return;
          failed = true;
          snapshotRef.current = null;
          renderer?.dispose();
          renderer = null;
          root.dataset.mediaDeformStatus = "fallback";
          canvas.style.visibility = "hidden";
          fallback.style.visibility = "visible";
          hit.setAttribute("d", restPath);
          if (stroke) stroke.style.visibility = "hidden";
          if (videoFrameId !== null) {
            video?.cancelVideoFrameCallback?.(videoFrameId);
            videoFrameId = null;
          }
          for (const listener of frameListenersRef.current) listener();
        };

        const draw = () => {
          if (stopped || failed || !renderer) return;
          if (video && video.readyState < 2) return;
          const current = propsRef.current;
          const pointer = lastFrame.pointer ?? {
            x: current.artboardWidth / 2,
            y: current.artboardHeight / 2,
          };
          const bounds = updateMediaDeformMesh(
            mesh,
            poseRef.current,
            current.waveInteraction
              ? {
                  interaction: current.waveInteraction,
                  localPointer: viewerPointToElementLocal(
                    pointer,
                    element,
                    current.visual,
                  ),
                  normalizedPointer: {
                    x:
                      (pointer.x / Math.max(1, current.artboardWidth) - 0.5) *
                      2,
                    y:
                      (pointer.y / Math.max(1, current.artboardHeight) - 0.5) *
                      2,
                  },
                  seconds: lastFrame.seconds,
                  strength: lastFrame.strength,
                  elementIndex: current.elementIndex,
                }
              : undefined,
          );
          try {
            const sourceChanged =
              video !== null && video.currentTime !== lastVideoTime;
            renderer.render(bounds, sourceChanged);
            if (video) lastVideoTime = video.currentTime;
            const path = mediaDeformHitPath(mesh);
            if (path !== lastPath) {
              hit.setAttribute("d", path);
              stroke?.setAttribute("d", path);
              lastPath = path;
            }
            root.dataset.mediaDeformStatus = "ready";
            canvas.style.visibility = "visible";
            fallback.style.visibility = "hidden";
            if (stroke) stroke.style.visibility = "visible";
            if (source) snapshotRef.current = { mesh, source };
            for (const listener of frameListenersRef.current) listener();
          } catch {
            // A tainted cross-origin source or lost context must not erase media.
            fail();
          }
        };
        drawRef.current = draw;
        const ready = () => {
          if (stopped || failed || !source) return;
          if (!renderer)
            renderer = createMediaDeformRenderer(canvas, mesh, element, source);
          if (!renderer) {
            fail();
            return;
          }
          draw();
        };
        const onVideoFrame = () => {
          videoFrameId = null;
          if (stopped || failed || !video) return;
          markMediaDeformVideoFrame(video);
          ready();
          if (!stopped && !failed)
            videoFrameId = video.requestVideoFrameCallback(onVideoFrame);
        };
        // Decode callbacks keep moving footage live even when reduced-motion
        // disables the wave clock. Older browsers use the shared clock instead.
        const decodedFrames =
          !!video && typeof video.requestVideoFrameCallback === "function";
        const onVideoReady = () => {
          if (video && decodedFrames) markMediaDeformVideoFrame(video);
          ready();
        };
        const unsubscribe =
          waveInteraction || (video && !decodedFrames)
            ? waveClock.subscribe((frame) => {
                lastFrame = frame;
                if (
                  waveInteraction ||
                  (video && video.currentTime !== lastVideoTime)
                )
                  draw();
              })
            : () => {};

        if (image) {
          image.crossOrigin = "anonymous";
          image.onload = ready;
          image.onerror = fail;
          if (element.src) image.src = element.src;
          else fail();
        }
        if (video) {
          video.addEventListener("loadeddata", onVideoReady);
          video.addEventListener("seeked", onVideoReady);
          video.addEventListener("error", fail);
          video.addEventListener("timeupdate", draw);
          if (video.readyState >= 2) ready();
          if (decodedFrames && !failed)
            videoFrameId = video.requestVideoFrameCallback(onVideoFrame);
          const playback = video.play();
          playback?.catch(() => {
            /* The native element remains available for user playback. */
          });
        }

        return () => {
          stopped = true;
          snapshotRef.current = null;
          drawRef.current = null;
          unsubscribe();
          if (image) {
            image.onload = null;
            image.onerror = null;
            image.removeAttribute("src");
          }
          if (video) {
            if (videoFrameId !== null)
              video.cancelVideoFrameCallback?.(videoFrameId);
            video.removeEventListener("loadeddata", onVideoReady);
            video.removeEventListener("seeked", onVideoReady);
            video.removeEventListener("error", fail);
            video.removeEventListener("timeupdate", draw);
            video.pause();
          }
          renderer?.dispose();
        };
      }, [element, waveClock, waveInteraction, strandInteraction]);

      const initialPath = `M0 0 H${element.width} V${element.height} H0 Z`;
      return (
        <span
          ref={rootRef}
          data-media-deform-id={element.id}
          style={{
            position: "absolute",
            inset: 0,
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          <span
            ref={fallbackRef}
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            {element.type === "video" ? (
              <video
                ref={videoRef}
                aria-hidden="true"
                autoPlay
                className="video-shape"
                crossOrigin="anonymous"
                loop
                muted
                playsInline
                preload="auto"
                src={element.src}
                style={{
                  transform: `scale(${element.flipX ? -1 : 1}, ${element.flipY ? -1 : 1})`,
                }}
              />
            ) : (
              <ShapeGraphic element={element} />
            )}
          </span>
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="media-deform-canvas"
            style={{
              position: "absolute",
              pointerEvents: "none",
              visibility: "hidden",
            }}
          />
          <svg
            aria-hidden="true"
            className="media-deform-hit-surface"
            width="100%"
            height="100%"
            viewBox={`0 0 ${Math.max(1, element.width)} ${Math.max(1, element.height)}`}
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              inset: 0,
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            <path
              ref={hitRef}
              className="media-deform-hit-area"
              d={initialPath}
              fill="transparent"
              pointerEvents="all"
            />
            <path
              ref={strokeRef}
              className="media-deform-stroke"
              d={initialPath}
              fill="none"
              stroke={
                element.strokeStyle === "none"
                  ? "none"
                  : colorWithOpacity(element.stroke, element.strokeOpacity)
              }
              strokeWidth={element.strokeWidth}
              strokeDasharray={strokeDasharrayForElement(element)}
              pointerEvents="none"
              style={{ visibility: "hidden" }}
            />
          </svg>
        </span>
      );
    },
  ),
);
