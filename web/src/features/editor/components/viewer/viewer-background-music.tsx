/* Audio playback intentionally keeps the latest props in refs. */
/* eslint-disable react-hooks/refs */

import { useEffect, useRef } from "react";

import { clamp } from "@/features/editor/lib/geometry";
import { effectiveBackgroundMusicVolume } from "@/features/editor/lib/sound-playback";
import { soundPreloadAttribute } from "@/features/editor/lib/sound-settings";
import {
  type BackgroundMusicSettings,
  type SoundAdvancedSettings,
  type SoundMixerSettings,
} from "@/features/editor/store/editor-store";

export function ViewerBackgroundMusic({
  advancedSettings,
  ducked,
  mixer,
  settings,
}: {
  advancedSettings: SoundAdvancedSettings;
  ducked: boolean;
  mixer: SoundMixerSettings;
  settings: BackgroundMusicSettings;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const advancedSettingsRef = useRef(advancedSettings);
  advancedSettingsRef.current = advancedSettings;
  const mixerRef = useRef(mixer);
  mixerRef.current = mixer;
  const duckGainRef = useRef(ducked ? 0.25 : 1);
  const source = settings.asset?.src;

  useEffect(() => {
    const audio = audioRef.current;
    const startGain = duckGainRef.current;
    const targetGain = ducked ? 0.25 : 1;
    const duration = ducked ? 120 : 240;
    const startedAt = performance.now();
    let animationTimer = 0;

    const renderDucking = () => {
      const now = performance.now();
      const progress = clamp((now - startedAt) / duration, 0, 1);
      duckGainRef.current =
        startGain + (targetGain - startGain) * (1 - (1 - progress) ** 3);
      if (audio) {
        audio.volume = clamp(
          effectiveBackgroundMusicVolume(
            settingsRef.current,
            audio.currentTime,
            audio.duration,
          ) *
            (mixerRef.current.backgroundMusicVolume / 100) *
            (mixerRef.current.masterVolume / 100) *
            duckGainRef.current,
          0,
          1,
        );
      }
      if (progress >= 1 && animationTimer) {
        window.clearInterval(animationTimer);
        animationTimer = 0;
      }
    };

    renderDucking();
    animationTimer = window.setInterval(renderDucking, 16);
    return () => window.clearInterval(animationTimer);
  }, [ducked]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !source) return;
    let animationFrame = 0;
    let delayTimer = 0;
    let started = false;
    let interactionListenersActive = false;
    let disposed = false;
    const interactionTarget = document.querySelector(
      ".viewer-preview-viewport",
    );
    if (audio.getAttribute("src") !== source) audio.src = source;

    const updateVolume = () => {
      const currentSettings = settingsRef.current;
      audio.volume =
        effectiveBackgroundMusicVolume(
          currentSettings,
          audio.currentTime,
          audio.duration,
        ) *
        (mixerRef.current.backgroundMusicVolume / 100) *
        (mixerRef.current.masterVolume / 100) *
        duckGainRef.current;
    };

    const render = () => {
      updateVolume();
      if (!audio.paused && !audio.ended) {
        animationFrame = window.requestAnimationFrame(render);
      }
    };

    const removeInteractionListeners = () => {
      interactionTarget?.removeEventListener("pointerdown", startFromEvent);
      window.removeEventListener("keydown", startFromEvent);
      interactionListenersActive = false;
    };

    const addInteractionListeners = () => {
      if (interactionListenersActive || disposed) return;
      interactionTarget?.addEventListener("pointerdown", startFromEvent);
      window.addEventListener("keydown", startFromEvent);
      interactionListenersActive = true;
    };

    const startPlayback = () => {
      if (started) return;
      started = true;
      removeInteractionListeners();
      audio.currentTime = 0;
      audio.loop = settingsRef.current.loop;
      updateVolume();
      const playResult = audio.play();
      const beginRendering = () => {
        if (disposed) return;
        window.cancelAnimationFrame(animationFrame);
        animationFrame = window.requestAnimationFrame(render);
      };
      if (playResult) {
        void playResult.then(beginRendering).catch(() => {
          started = false;
          window.cancelAnimationFrame(animationFrame);
          addInteractionListeners();
        });
      } else {
        beginRendering();
      }
    };

    function startFromEvent() {
      startPlayback();
    }

    switch (settings.startPlayback) {
      case "on-page-enter":
        startPlayback();
        break;
      case "after-delay":
        delayTimer = window.setTimeout(
          startPlayback,
          Math.max(0, settings.delaySeconds) * 1000,
        );
        break;
      case "on-interaction":
        addInteractionListeners();
        break;
      case "manual":
        break;
    }

    return () => {
      disposed = true;
      removeInteractionListeners();
      window.clearTimeout(delayTimer);
      window.cancelAnimationFrame(animationFrame);
      if (!audio.paused) audio.pause();
      audio.currentTime = 0;
    };
  }, [settings.delaySeconds, settings.startPlayback, source]);

  if (!source) return null;
  return (
    <audio
      aria-hidden="true"
      className="viewer-background-music"
      data-ducked={ducked}
      loop={settings.loop}
      onEnded={(event) => {
        if (advancedSettingsRef.current.unloadUnusedSounds) {
          event.currentTarget.removeAttribute("src");
        }
      }}
      preload={soundPreloadAttribute(advancedSettings.preloadSounds)}
      ref={audioRef}
      src={source}
    />
  );
}
