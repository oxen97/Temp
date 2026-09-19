/* Audio playback intentionally keeps the latest props in refs. */
/* eslint-disable react-hooks/refs */

import { X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { ArtboardBackground } from "@/features/editor/components/canvas/artboard-background";
import { Artboard3DScene } from "@/features/editor/components/canvas/artboard-3d-scene";
import { ShapeGraphic } from "@/features/editor/components/canvas/shape-graphic";
import { ViewerBackgroundMusic } from "@/features/editor/components/viewer/viewer-background-music";
import { textStyleForElement } from "@/features/editor/lib/element-style";
import { clamp } from "@/features/editor/lib/geometry";
import {
  calculateInteractionSoundVolume,
  chooseInteractionSoundAsset,
  fadeInteractionSoundToSilence,
  type InteractionSoundPlaybackCursor,
  startInteractionSoundEnvelope,
} from "@/features/editor/lib/sound-playback";
import {
  soundOutputBitrate,
  soundPreloadAttribute,
} from "@/features/editor/lib/sound-settings";
import {
  type ArtboardSettings,
  type BackgroundMusicSettings,
  type CanvasElement,
  type InteractionSoundEvent,
  type InteractionSoundTrigger,
  type SoundAdvancedSettings,
  type SoundMixerSettings,
} from "@/features/editor/store/editor-store";
import type {
  Object3DElement,
  Scene3DSettings,
} from "@/features/editor/three/types";

export function viewerPreviewLayout(
  artboard: ArtboardSettings,
  viewport: { height: number; width: number },
) {
  const viewportWidth = Math.max(1, viewport.width);
  const viewportHeight = Math.max(1, viewport.height);
  const pageWidth = Math.max(1, artboard.width);
  const pageHeight = Math.max(1, artboard.height);
  const widthRatio = viewportWidth / pageWidth;
  const heightRatio = viewportHeight / pageHeight;
  const viewportMode = artboard.viewportMode ?? "fit";
  const scale =
    viewportMode === "fill"
      ? Math.max(widthRatio, heightRatio)
      : Math.min(widthRatio, heightRatio);
  const scaleX = viewportMode === "stretch" ? widthRatio : scale;
  const scaleY = viewportMode === "stretch" ? heightRatio : scale;

  return {
    height: pageHeight * scaleY,
    scaleX,
    scaleY,
    width: pageWidth * scaleX,
  };
}

export type ViewerInteractionPointerSession = {
  dragging: boolean;
  elementId: string;
  startX: number;
  startY: number;
};

export type ViewerInteractionAudioChannel = {
  audio: HTMLAudioElement;
  ended: boolean;
  envelopeCancel: (() => void) | null;
  fadeCancel: (() => void) | null;
};

export type ViewerActiveInteractionSound = {
  channels: ViewerInteractionAudioChannel[];
  continuous: boolean;
  elementId: string;
  fadeOutSeconds: number;
  settingId: string;
  stopping: boolean;
  targetVolume: number;
  trigger: InteractionSoundTrigger;
};

export type ViewerInteractionAudioGraph = {
  compressor: DynamicsCompressorNode;
  panner: StereoPannerNode | null;
};

export function ViewerPreview({
  advancedSound,
  artboard,
  backgroundMusic,
  elements,
  mixer,
  objects3d,
  onClose,
  projectId,
  scene3d,
}: {
  advancedSound: SoundAdvancedSettings;
  artboard: ArtboardSettings;
  backgroundMusic: BackgroundMusicSettings;
  elements: CanvasElement[];
  mixer: SoundMixerSettings;
  objects3d: Object3DElement[];
  onClose: () => void;
  projectId: string;
  scene3d?: Partial<Scene3DSettings>;
}) {
  const [viewport, setViewport] = useState(() => ({
    height:
      typeof window === "undefined" ? artboard.height : window.innerHeight,
    width: typeof window === "undefined" ? artboard.width : window.innerWidth,
  }));
  const [backgroundMusicDucked, setBackgroundMusicDucked] = useState(false);
  const interactionAudioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const activeInteractionRef = useRef<ViewerActiveInteractionSound | null>(
    null,
  );
  const interactionPlaybackCursorsRef = useRef(
    new Map<string, InteractionSoundPlaybackCursor>(),
  );
  const interactionAudioContextRef = useRef<AudioContext | null>(null);
  const interactionAudioGraphsRef = useRef(
    new Map<HTMLAudioElement, ViewerInteractionAudioGraph>(),
  );
  const advancedSoundRef = useRef(advancedSound);
  advancedSoundRef.current = advancedSound;
  const mixerRef = useRef(mixer);
  mixerRef.current = mixer;
  const pointerSessionsRef = useRef(
    new Map<number, ViewerInteractionPointerSession>(),
  );
  const scrollStopTimersRef = useRef(new Map<string, number>());

  const unloadInteractionAudio = useCallback((audio: HTMLAudioElement) => {
    if (advancedSoundRef.current.unloadUnusedSounds) {
      audio.removeAttribute("src");
    }
  }, []);

  const configureInteractionAudio = useCallback(
    (audio: HTMLAudioElement, element: CanvasElement) => {
      const currentSettings = advancedSoundRef.current;
      if (!currentSettings.spatialSound && !currentSettings.autoNormalize) {
        return;
      }

      const AudioContextConstructor =
        window.AudioContext ??
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;
      if (!AudioContextConstructor) return;

      try {
        let context = interactionAudioContextRef.current;
        if (!context) {
          context = new AudioContextConstructor();
          interactionAudioContextRef.current = context;
        }

        let graph = interactionAudioGraphsRef.current.get(audio);
        if (!graph) {
          const sourceNode = context.createMediaElementSource(audio);
          const compressor = context.createDynamicsCompressor();
          const panner = context.createStereoPanner
            ? context.createStereoPanner()
            : null;
          if (panner) {
            sourceNode.connect(panner);
            panner.connect(compressor);
          } else {
            sourceNode.connect(compressor);
          }
          compressor.connect(context.destination);
          graph = { compressor, panner };
          interactionAudioGraphsRef.current.set(audio, graph);
        }

        const now = context.currentTime;
        const centerX = element.x + element.width / 2;
        const pan = currentSettings.spatialSound
          ? clamp((centerX / Math.max(1, artboard.width)) * 2 - 1, -1, 1)
          : 0;
        graph.panner?.pan.setValueAtTime(pan, now);

        graph.compressor.threshold.setValueAtTime(
          currentSettings.autoNormalize ? -24 : 0,
          now,
        );
        graph.compressor.knee.setValueAtTime(
          currentSettings.autoNormalize ? 30 : 0,
          now,
        );
        graph.compressor.ratio.setValueAtTime(
          currentSettings.autoNormalize ? 4 : 1,
          now,
        );
        graph.compressor.attack.setValueAtTime(
          currentSettings.autoNormalize ? 0.003 : 0,
          now,
        );
        graph.compressor.release.setValueAtTime(
          currentSettings.autoNormalize ? 0.25 : 0,
          now,
        );
        if (context.state === "suspended") {
          void context.resume().catch(() => undefined);
        }
      } catch {
        // Keep native HTML audio playback when Web Audio is unavailable.
      }
    },
    [artboard.width],
  );

  const cancelInteractionAnimations = useCallback(
    (active = activeInteractionRef.current) => {
      active?.channels.forEach((channel) => {
        channel.envelopeCancel?.();
        channel.fadeCancel?.();
        channel.envelopeCancel = null;
        channel.fadeCancel = null;
      });
    },
    [],
  );

  const stopInteractionPlaybackImmediately = useCallback(
    (active = activeInteractionRef.current, restoreBackgroundMusic = true) => {
      if (!active) return;
      cancelInteractionAnimations(active);
      active.channels.forEach(({ audio }) => {
        if (!audio.paused) audio.pause();
        audio.currentTime = 0;
        audio.loop = false;
        unloadInteractionAudio(audio);
      });
      if (activeInteractionRef.current === active) {
        activeInteractionRef.current = null;
      }
      if (restoreBackgroundMusic) setBackgroundMusicDucked(false);
    },
    [cancelInteractionAnimations, unloadInteractionAudio],
  );

  const handleInteractionChannelEnded = useCallback(
    (audio: HTMLAudioElement) => {
      const active = activeInteractionRef.current;
      const channel = active?.channels.find(
        (candidate) => candidate.audio === audio,
      );
      if (!active || !channel || channel.ended) return;
      channel.envelopeCancel?.();
      channel.fadeCancel?.();
      channel.envelopeCancel = null;
      channel.fadeCancel = null;
      channel.ended = true;
      audio.loop = false;
      unloadInteractionAudio(audio);
      if (active.channels.every((candidate) => candidate.ended)) {
        activeInteractionRef.current = null;
        setBackgroundMusicDucked(false);
      }
    },
    [unloadInteractionAudio],
  );

  const markInteractionChannelFailed = useCallback(
    (
      active: ViewerActiveInteractionSound,
      channel: ViewerInteractionAudioChannel,
    ) => {
      if (activeInteractionRef.current !== active || channel.ended) return;
      channel.envelopeCancel?.();
      channel.fadeCancel?.();
      channel.envelopeCancel = null;
      channel.fadeCancel = null;
      channel.ended = true;
      channel.audio.loop = false;
      unloadInteractionAudio(channel.audio);
      if (active.channels.every((candidate) => candidate.ended)) {
        activeInteractionRef.current = null;
        setBackgroundMusicDucked(false);
      }
    },
    [unloadInteractionAudio],
  );

  const playInteractionEvent = useCallback(
    (
      element: CanvasElement,
      trigger: InteractionSoundTrigger,
      interactionEvent: InteractionSoundEvent,
      continuous = false,
    ) => {
      const setting = element.interactionSounds?.find(
        (sound) =>
          sound.enabled !== false &&
          sound.trigger === trigger &&
          sound.event === interactionEvent &&
          sound.assets.length > 0,
      );
      if (!setting) return false;

      const mixerGain =
        (mixerRef.current.interactionSoundVolume / 100) *
        (mixerRef.current.masterVolume / 100);

      const active = activeInteractionRef.current;
      if (
        continuous &&
        active?.continuous &&
        active.elementId === element.id &&
        active.settingId === setting.id
      ) {
        if (active.stopping) {
          active.channels.forEach((channel) => {
            channel.fadeCancel?.();
            channel.fadeCancel = null;
            channel.audio.volume = clamp(
              (setting.volume / 100) * mixerGain,
              0,
              1,
            );
          });
          active.targetVolume = clamp((setting.volume / 100) * mixerGain, 0, 1);
          active.stopping = false;
        }
        return true;
      }

      const cursorKey = `${element.id}:${setting.id}`;
      let cursor = interactionPlaybackCursorsRef.current.get(cursorKey);
      if (!cursor) {
        cursor = { lastSource: null, sequentialIndex: 0 };
        interactionPlaybackCursorsRef.current.set(cursorKey, cursor);
      }
      const asset = chooseInteractionSoundAsset(setting, cursor);
      const audio = interactionAudioRefs.current[0];
      if (!asset || !audio) return false;

      stopInteractionPlaybackImmediately(active);
      audio.loop = continuous;
      audio.src = asset.src;
      audio.volume = calculateInteractionSoundVolume(
        { ...setting, volume: setting.volume * mixerGain },
        0,
        0,
        Number.NaN,
        continuous,
      );
      configureInteractionAudio(audio, element);
      const channels: ViewerInteractionAudioChannel[] = [
        {
          audio,
          ended: false,
          envelopeCancel: null,
          fadeCancel: null,
        },
      ];
      const nextActive: ViewerActiveInteractionSound = {
        channels,
        continuous,
        elementId: element.id,
        fadeOutSeconds: setting.fadeOutSeconds,
        settingId: setting.id,
        stopping: false,
        targetVolume: clamp((setting.volume / 100) * mixerGain, 0, 1),
        trigger,
      };
      activeInteractionRef.current = nextActive;
      setBackgroundMusicDucked(true);

      channels.forEach((channel) => {
        const beginEnvelope = () => {
          if (activeInteractionRef.current !== nextActive || channel.ended) {
            return;
          }
          channel.envelopeCancel = startInteractionSoundEnvelope(
            channel.audio,
            () => ({
              ...setting,
              volume:
                setting.volume *
                (mixerRef.current.interactionSoundVolume / 100) *
                (mixerRef.current.masterVolume / 100),
            }),
            continuous,
          );
        };
        try {
          const playResult = channel.audio.play();
          if (playResult) {
            void playResult
              .then(beginEnvelope)
              .catch(() => markInteractionChannelFailed(nextActive, channel));
          } else {
            beginEnvelope();
          }
        } catch {
          markInteractionChannelFailed(nextActive, channel);
        }
      });
      return true;
    },
    [
      configureInteractionAudio,
      markInteractionChannelFailed,
      stopInteractionPlaybackImmediately,
    ],
  );

  const stopContinuousInteraction = useCallback(
    (elementId: string, trigger?: InteractionSoundTrigger) => {
      const active = activeInteractionRef.current;
      if (
        !active?.continuous ||
        active.elementId !== elementId ||
        (trigger && active.trigger !== trigger) ||
        active.stopping
      ) {
        return;
      }
      active.stopping = true;
      const completedChannels = new Set<ViewerInteractionAudioChannel>();
      const finishChannel = (channel: ViewerInteractionAudioChannel) => {
        if (
          activeInteractionRef.current !== active ||
          completedChannels.has(channel)
        ) {
          return;
        }
        completedChannels.add(channel);
        channel.fadeCancel = null;
        channel.audio.pause();
        channel.audio.currentTime = 0;
        channel.audio.loop = false;
        channel.ended = true;
        unloadInteractionAudio(channel.audio);
        if (completedChannels.size === active.channels.length) {
          activeInteractionRef.current = null;
          setBackgroundMusicDucked(false);
        }
      };
      active.channels.forEach((channel) => {
        channel.envelopeCancel?.();
        channel.envelopeCancel = null;
        if (active.fadeOutSeconds > 0 && !channel.audio.paused) {
          channel.fadeCancel = fadeInteractionSoundToSilence(
            channel.audio,
            active.fadeOutSeconds,
            () => finishChannel(channel),
          );
        } else {
          finishChannel(channel);
        }
      });
    },
    [unloadInteractionAudio],
  );

  const endPointerInteraction = useCallback(
    (element: CanvasElement, pointerId: number) => {
      const session = pointerSessionsRef.current.get(pointerId);
      pointerSessionsRef.current.delete(pointerId);
      if (!session || session.elementId !== element.id) return;
      stopContinuousInteraction(element.id, "press");
      stopContinuousInteraction(element.id, "drag");
      playInteractionEvent(element, "press", "release");
      if (session.dragging) {
        playInteractionEvent(element, "drag", "drop");
      }
    },
    [playInteractionEvent, stopContinuousInteraction],
  );

  useEffect(() => {
    const timers = scrollStopTimersRef.current;
    const audioElements = [...interactionAudioRefs.current];
    const playbackCursors = interactionPlaybackCursorsRef.current;
    const audioGraphs = interactionAudioGraphsRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      stopInteractionPlaybackImmediately(undefined, false);
      audioElements.forEach((audio) => {
        if (!audio) return;
        if (!audio.paused) audio.pause();
        audio.currentTime = 0;
        audio.loop = false;
        audio.removeAttribute("src");
      });
      playbackCursors.clear();
      audioGraphs.clear();
      const audioContext = interactionAudioContextRef.current;
      interactionAudioContextRef.current = null;
      if (audioContext && audioContext.state !== "closed") {
        void audioContext.close().catch(() => undefined);
      }
      activeInteractionRef.current = null;
    };
  }, [stopInteractionPlaybackImmediately]);

  useLayoutEffect(() => {
    const measure = () => {
      const root = document.documentElement;
      setViewport({
        height: Math.max(1, root.clientHeight || window.innerHeight),
        width: Math.max(1, root.clientWidth || window.innerWidth),
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, []);

  const pageType = artboard.pageType ?? "screen";
  const viewportMode = artboard.viewportMode ?? "fit";
  const layout = viewerPreviewLayout(artboard, viewport);
  const stageTop =
    pageType === "scroll"
      ? Math.max(0, (viewport.height - layout.height) / 2)
      : (viewport.height - layout.height) / 2;
  return (
    <section
      aria-label="Viewer preview"
      aria-modal="true"
      className="viewer-preview"
      data-output-kbps={soundOutputBitrate(advancedSound.outputQuality)}
      data-output-quality={advancedSound.outputQuality}
      role="dialog"
    >
      <ViewerBackgroundMusic
        advancedSettings={advancedSound}
        ducked={backgroundMusicDucked}
        mixer={mixer}
        settings={backgroundMusic}
      />
      <audio
        aria-hidden="true"
        className="viewer-interaction-sound"
        data-channel-index={0}
        onEnded={(event) => handleInteractionChannelEnded(event.currentTarget)}
        preload={soundPreloadAttribute(advancedSound.preloadSounds)}
        ref={(audio) => {
          interactionAudioRefs.current[0] = audio;
        }}
      />
      {advancedSound.preloadSounds !== "on-demand"
        ? Array.from(
            new Map(
              elements.flatMap((element) =>
                (element.interactionSounds ?? []).flatMap((setting) =>
                  setting.assets.map((asset) => [asset.src, asset] as const),
                ),
              ),
            ).values(),
          ).map((asset) => (
            <audio
              aria-hidden="true"
              className="viewer-sound-preload"
              key={asset.src}
              preload={soundPreloadAttribute(advancedSound.preloadSounds)}
              src={asset.src}
            />
          ))
        : null}
      <button
        aria-label="Close preview"
        className="viewer-preview-close interface-scale-surface"
        onClick={onClose}
        type="button"
      >
        <X aria-hidden="true" size={18} strokeWidth={1.5} />
      </button>
      <div
        className={`viewer-preview-viewport is-${pageType}`}
        data-page-type={pageType}
        data-viewport-mode={viewportMode}
      >
        <div
          className="viewer-preview-scroll-space"
          style={{
            height:
              pageType === "scroll"
                ? Math.max(viewport.height, stageTop + layout.height)
                : viewport.height,
          }}
        >
          <div
            className="viewer-preview-stage"
            style={{
              height: layout.height,
              left: (viewport.width - layout.width) / 2,
              top: stageTop,
              width: layout.width,
            }}
          >
            <div
              className="viewer-preview-page"
              style={{
                borderRadius: artboard.cornerRadius,
                height: artboard.height,
                transform: `scale(${layout.scaleX}, ${layout.scaleY})`,
                width: artboard.width,
              }}
            >
              <ArtboardBackground artboard={artboard} />
              <Artboard3DScene
                artboardHeight={artboard.height}
                artboardWidth={artboard.width}
                objects={objects3d}
                projectId={projectId}
                scene={scene3d}
              />
              {elements
                .filter((element) => element.visible)
                .map((element) => (
                  <div
                    className={`viewer-preview-element element-${element.type}`}
                    data-element-id={element.id}
                    key={element.id}
                    onClick={() =>
                      playInteractionEvent(element, "click", "click")
                    }
                    onDoubleClick={() =>
                      playInteractionEvent(element, "click", "double-click")
                    }
                    onPointerCancel={(event) => {
                      const session = pointerSessionsRef.current.get(
                        event.pointerId,
                      );
                      pointerSessionsRef.current.delete(event.pointerId);
                      if (session?.elementId === element.id) {
                        stopContinuousInteraction(element.id, "press");
                        stopContinuousInteraction(element.id, "drag");
                      }
                    }}
                    onPointerDown={(event) => {
                      pointerSessionsRef.current.set(event.pointerId, {
                        dragging: false,
                        elementId: element.id,
                        startX: event.clientX,
                        startY: event.clientY,
                      });
                      event.currentTarget.setPointerCapture?.(event.pointerId);
                      playInteractionEvent(element, "press", "press-start");
                      playInteractionEvent(
                        element,
                        "press",
                        "while-pressing",
                        true,
                      );
                    }}
                    onPointerEnter={() => {
                      playInteractionEvent(element, "hover", "enter");
                      playInteractionEvent(
                        element,
                        "hover",
                        "while-hovering",
                        true,
                      );
                    }}
                    onPointerLeave={() => {
                      stopContinuousInteraction(element.id, "hover");
                      playInteractionEvent(element, "hover", "leave");
                    }}
                    onPointerMove={(event) => {
                      const session = pointerSessionsRef.current.get(
                        event.pointerId,
                      );
                      if (!session || session.elementId !== element.id) return;
                      if (!session.dragging) {
                        const distance = Math.hypot(
                          event.clientX - session.startX,
                          event.clientY - session.startY,
                        );
                        if (distance < 3) return;
                        session.dragging = true;
                        playInteractionEvent(element, "drag", "drag-start");
                      }
                      playInteractionEvent(
                        element,
                        "drag",
                        "while-dragging",
                        true,
                      );
                    }}
                    onPointerUp={(event) => {
                      if (
                        event.currentTarget.hasPointerCapture?.(event.pointerId)
                      ) {
                        event.currentTarget.releasePointerCapture?.(
                          event.pointerId,
                        );
                      }
                      endPointerInteraction(element, event.pointerId);
                    }}
                    onWheel={() => {
                      playInteractionEvent(
                        element,
                        "scroll",
                        "while-scrolling",
                        true,
                      );
                      const previousTimer = scrollStopTimersRef.current.get(
                        element.id,
                      );
                      if (previousTimer) window.clearTimeout(previousTimer);
                      const timer = window.setTimeout(() => {
                        scrollStopTimersRef.current.delete(element.id);
                        stopContinuousInteraction(element.id, "scroll");
                      }, 150);
                      scrollStopTimersRef.current.set(element.id, timer);
                    }}
                    style={{
                      height: element.height,
                      left: element.x,
                      opacity: element.opacity / 100,
                      top: element.y,
                      transform: `rotate(${element.rotation}deg)`,
                      transformOrigin: "center",
                      width: element.width,
                    }}
                  >
                    {element.type === "text" ? (
                      <div
                        className="text-shape"
                        style={textStyleForElement(element)}
                      >
                        {element.text}
                      </div>
                    ) : (
                      <ShapeGraphic element={element} />
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
