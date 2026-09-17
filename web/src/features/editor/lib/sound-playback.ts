import { clamp } from "@/features/editor/lib/geometry";
import {
  type BackgroundMusicSettings,
  type InteractionSoundSettings,
} from "@/features/editor/store/editor-store";

export function effectiveBackgroundMusicVolume(
  settings: BackgroundMusicSettings,
  currentTime: number,
  duration: number,
) {
  let envelope = 1;
  if (settings.fadeInSeconds > 0) {
    envelope = Math.min(envelope, currentTime / settings.fadeInSeconds);
  }
  if (settings.fadeOutSeconds > 0 && Number.isFinite(duration)) {
    envelope = Math.min(
      envelope,
      Math.max(0, duration - currentTime) / settings.fadeOutSeconds,
    );
  }
  return clamp((settings.volume / 100) * envelope, 0, 1);
}

export type InteractionSoundEnvelopeSettings = Pick<
  InteractionSoundSettings,
  "fadeInSeconds" | "fadeOutSeconds" | "volume"
>;

export function calculateInteractionSoundVolume(
  settings: InteractionSoundEnvelopeSettings,
  elapsedSeconds: number,
  currentTime: number,
  duration: number,
  continuous: boolean,
) {
  let envelope = 1;
  if (settings.fadeInSeconds > 0) {
    envelope = Math.min(
      envelope,
      Math.max(0, elapsedSeconds) / settings.fadeInSeconds,
    );
  }
  if (
    !continuous &&
    settings.fadeOutSeconds > 0 &&
    Number.isFinite(duration) &&
    duration > 0
  ) {
    envelope = Math.min(
      envelope,
      Math.max(0, duration - currentTime) / settings.fadeOutSeconds,
    );
  }
  return clamp((settings.volume / 100) * envelope, 0, 1);
}

export type InteractionSoundPlaybackCursor = {
  lastSource: string | null;
  sequentialIndex: number;
};

export function chooseInteractionSoundAsset(
  settings: InteractionSoundSettings,
  cursor: InteractionSoundPlaybackCursor,
  random: () => number = Math.random,
) {
  const assets = settings.assets;
  if (assets.length === 0) return null;
  if (settings.soundSource === "single" || assets.length === 1) {
    cursor.lastSource = assets[0].src;
    return assets[0];
  }

  let index = 0;
  if (settings.playbackMode === "sequential") {
    index = cursor.sequentialIndex % assets.length;
    cursor.sequentialIndex = (index + 1) % assets.length;
  } else {
    const normalizedRandom = clamp(random(), 0, 0.9999999999999999);
    index = Math.floor(normalizedRandom * assets.length);
    if (
      settings.avoidRepeating &&
      assets.length > 1 &&
      assets[index].src === cursor.lastSource
    ) {
      const alternativeOffset =
        1 +
        Math.floor(
          clamp(random(), 0, 0.9999999999999999) * (assets.length - 1),
        );
      index = (index + alternativeOffset) % assets.length;
    }
  }

  cursor.lastSource = assets[index].src;
  return assets[index];
}

export function startInteractionSoundEnvelope(
  audio: HTMLAudioElement,
  getSettings: () => InteractionSoundEnvelopeSettings,
  continuous: boolean,
) {
  let animationFrame = 0;
  let cancelled = false;
  const startedAt = window.performance.now();

  const render = (timestamp: number) => {
    if (cancelled) return;
    audio.volume = calculateInteractionSoundVolume(
      getSettings(),
      (timestamp - startedAt) / 1000,
      audio.currentTime,
      audio.duration,
      continuous,
    );
    if (!audio.paused && !audio.ended) {
      animationFrame = window.requestAnimationFrame(render);
    }
  };

  animationFrame = window.requestAnimationFrame(render);
  return () => {
    cancelled = true;
    window.cancelAnimationFrame(animationFrame);
  };
}

export function fadeInteractionSoundToSilence(
  audio: HTMLAudioElement,
  durationSeconds: number,
  onComplete: () => void,
) {
  if (durationSeconds <= 0) {
    onComplete();
    return () => {};
  }

  let animationFrame = 0;
  let cancelled = false;
  const initialVolume = audio.volume;
  const startedAt = window.performance.now();
  const render = (timestamp: number) => {
    if (cancelled) return;
    const progress = clamp(
      (timestamp - startedAt) / (durationSeconds * 1000),
      0,
      1,
    );
    audio.volume = initialVolume * (1 - progress);
    if (progress >= 1) {
      onComplete();
      return;
    }
    animationFrame = window.requestAnimationFrame(render);
  };
  animationFrame = window.requestAnimationFrame(render);
  return () => {
    cancelled = true;
    window.cancelAnimationFrame(animationFrame);
  };
}
