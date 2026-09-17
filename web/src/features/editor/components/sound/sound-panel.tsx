/* Audio playback intentionally keeps the latest props in refs. */
/* eslint-disable react-hooks/refs */

import { Music2 } from "lucide-react";
import Image from "next/image";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { AllSoundsPanel } from "@/features/editor/components/sound/all-sounds-panel";
import { InteractionSoundsSection } from "@/features/editor/components/sound/interaction-sounds";
import {
  SoundAdvancedToggle,
  SoundMoreButton,
  SoundPercentField,
  SoundPlayButton,
  SoundStepperField,
} from "@/features/editor/components/sound/sound-fields";
import {
  DesignDropdown,
  DesignRange,
} from "@/features/editor/components/ui/design-fields";
import { extractEmbeddedAudioArtwork } from "@/features/editor/lib/audio-artwork";
import { clamp } from "@/features/editor/lib/geometry";
import { effectiveBackgroundMusicVolume } from "@/features/editor/lib/sound-playback";
import {
  backgroundMusicStartOptions,
  formatAudioSize,
  formatAudioTime,
  isBackgroundMusicStartMode,
  isSoundOutputQuality,
  isSoundPreloadMode,
  normalizedInteractionSound,
  soundOutputQualityOptions,
  soundPreloadOptions,
  supportsInteractionSounds,
} from "@/features/editor/lib/sound-settings";
import {
  type BackgroundMusicAsset,
  type BackgroundMusicSettings,
  type CanvasElement,
  type InteractionSoundSettings,
  type SoundAdvancedSettings,
  type SoundMixerSettings,
} from "@/features/editor/store/editor-store";
import { assetPath } from "@/lib/asset-path";

export function SoundAdvancedSettingsSection({
  onChange,
  onCheckpoint,
  settings,
}: {
  onChange: (updates: Partial<SoundAdvancedSettings>) => void;
  onCheckpoint: () => void;
  settings: SoundAdvancedSettings;
}) {
  const update = (updates: Partial<SoundAdvancedSettings>) => {
    onCheckpoint();
    onChange(updates);
  };

  return (
    <div className="sound-advanced-wrapper">
      <div aria-hidden="true" className="sound-advanced-divider" />
      <section
        aria-label="Advanced Settings"
        className="sound-advanced-section"
      >
        <h2>Advanced Settings</h2>

        <div className="sound-advanced-row sound-advanced-quality-row">
          <span className="sound-advanced-label">Output Quality</span>
          <DesignDropdown
            ariaLabel="Output quality"
            className="sound-advanced-dropdown"
            noScroll
            onChange={(value) => {
              if (isSoundOutputQuality(value)) update({ outputQuality: value });
            }}
            options={soundOutputQualityOptions}
            value={settings.outputQuality}
          />
        </div>

        <div className="sound-advanced-row sound-advanced-detail-row">
          <span className="sound-advanced-label">Spatial Sound</span>
          <span className="sound-advanced-description">
            Apply positional sound based on object location.
          </span>
          <SoundAdvancedToggle
            checked={settings.spatialSound}
            label="Spatial Sound"
            onChange={() => update({ spatialSound: !settings.spatialSound })}
          />
        </div>

        <div className="sound-advanced-row sound-advanced-detail-row">
          <span className="sound-advanced-label">Auto Normalize</span>
          <span className="sound-advanced-description">
            Automatically balance volume levels between sounds.
          </span>
          <SoundAdvancedToggle
            checked={settings.autoNormalize}
            label="Auto Normalize"
            onChange={() => update({ autoNormalize: !settings.autoNormalize })}
          />
        </div>

        <div className="sound-advanced-row">
          <span className="sound-advanced-label">Preload Sounds</span>
          <DesignDropdown
            ariaLabel="Preload sounds"
            className="sound-advanced-dropdown"
            noScroll
            onChange={(value) => {
              if (isSoundPreloadMode(value)) update({ preloadSounds: value });
            }}
            options={soundPreloadOptions}
            value={settings.preloadSounds}
          />
        </div>

        <div className="sound-advanced-row sound-advanced-detail-row">
          <span className="sound-advanced-label">Unload Unused Sounds</span>
          <span className="sound-advanced-description">
            Free up memory for better performance
          </span>
          <SoundAdvancedToggle
            checked={settings.unloadUnusedSounds}
            label="Unload Unused Sounds"
            onChange={() =>
              update({ unloadUnusedSounds: !settings.unloadUnusedSounds })
            }
          />
        </div>
      </section>
    </div>
  );
}

export function SoundPanel({
  advancedSettings,
  elements,
  mixer,
  onAttachArtwork,
  onAppendInteractionSoundAssets,
  onApplyCommonInteractionSoundAsset,
  onCheckpoint,
  onClearInteractionSoundAssets,
  onCreateObjectUrl,
  onDeleteInteractionAsset,
  onReplaceInteractionSounds,
  onSelectElement,
  onUpdate,
  onUpdateAdvanced,
  onUpdateInteractionExpanded,
  onUpdateInteractionSound,
  onUpdateMixer,
  pageId,
  selectedElements,
  settings,
}: {
  advancedSettings: SoundAdvancedSettings;
  elements: CanvasElement[];
  mixer: SoundMixerSettings;
  onAttachArtwork: (pageId: string, assetSrc: string, artwork: Blob) => void;
  onAppendInteractionSoundAssets: (
    elementIds: string[],
    assets: BackgroundMusicAsset[],
  ) => void;
  onApplyCommonInteractionSoundAsset: (
    elementIds: string[],
    asset: BackgroundMusicAsset,
  ) => void;
  onCheckpoint: () => void;
  onClearInteractionSoundAssets: (elementIds: string[]) => void;
  onCreateObjectUrl: (file: Blob) => string;
  onDeleteInteractionAsset: (
    elementId: string,
    settingIndex: number,
    assetIndex: number,
  ) => void;
  onReplaceInteractionSounds: (
    elementId: string,
    settings: InteractionSoundSettings[],
  ) => void;
  onSelectElement: (elementId: string) => void;
  onUpdate: (updates: Partial<BackgroundMusicSettings>) => void;
  onUpdateAdvanced: (updates: Partial<SoundAdvancedSettings>) => void;
  onUpdateInteractionExpanded: (
    elementIds: string[],
    expanded: boolean,
  ) => void;
  onUpdateInteractionSound: (
    elementIds: string[],
    settings: InteractionSoundSettings,
  ) => void;
  onUpdateMixer: (updates: Partial<SoundMixerSettings>) => void;
  pageId: string;
  selectedElements: CanvasElement[];
  settings: BackgroundMusicSettings;
}) {
  const [soundScope, setSoundScope] = useState<"selected" | "all">("selected");
  const [expanded, setExpanded] = useState(true);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [failedArtworkSource, setFailedArtworkSource] = useState<string | null>(
    null,
  );
  const [audioErrorState, setAudioErrorState] = useState<{
    message: string;
    source: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const lastTimeRenderRef = useRef(0);
  const previewRequestRef = useRef(0);
  const asset = settings.asset;
  const audioError =
    audioErrorState && audioErrorState.source === asset?.src
      ? audioErrorState.message
      : null;
  const assetSourceRef = useRef(asset?.src);
  assetSourceRef.current = asset?.src;
  const visibleArtworkSource =
    asset?.artworkSrc && asset.artworkSrc !== failedArtworkSource
      ? asset.artworkSrc
      : null;
  const hasInteractionSoundSelection =
    selectedElements.length > 0 &&
    selectedElements.every(supportsInteractionSounds);
  const selectedSoundElementKey = selectedElements
    .map((element) => element.id)
    .sort()
    .join(":");
  const interactionSoundSettings = normalizedInteractionSound(
    selectedElements[0]?.interactionSounds?.[0],
  );
  const interactionSignature = `${interactionSoundSettings.trigger}:${interactionSoundSettings.event}`;
  const hasCommonInteraction = selectedElements.every((element) => {
    const sound = normalizedInteractionSound(element.interactionSounds?.[0]);
    return `${sound.trigger}:${sound.event}` === interactionSignature;
  });
  const canDeleteAllSounds = selectedElements.some((element) =>
    element.interactionSounds?.some((sound) => sound.assets.length > 0),
  );
  const updateInteractionSound = (
    updates: Partial<InteractionSoundSettings>,
  ) => {
    onUpdateInteractionSound(
      selectedElements.map((element) => element.id),
      { ...interactionSoundSettings, ...updates },
    );
  };

  const drawWaveform = useCallback((frequencyData?: Uint8Array) => {
    const canvas = waveformRef.current;
    if (!canvas) return;
    const width = Math.max(1, canvas.clientWidth || 163);
    const height = Math.max(1, canvas.clientHeight || 13);
    const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
    const renderWidth = Math.round(width * pixelRatio);
    const renderHeight = Math.round(height * pixelRatio);
    if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
      canvas.width = renderWidth;
      canvas.height = renderHeight;
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#ab51f0";

    if (!frequencyData?.length) {
      context.fillRect(0, Math.floor(height / 2), width, 1);
      return;
    }

    const barCount = Math.max(1, Math.floor(width / 3));
    const centerY = height / 2;
    for (let index = 0; index < barCount; index += 1) {
      const sourceIndex = Math.min(
        frequencyData.length - 1,
        Math.floor((index / barCount) ** 1.7 * frequencyData.length),
      );
      const strength = frequencyData[sourceIndex] / 255;
      const barHeight = Math.max(1, Math.round(strength * height));
      const x = Math.round((index / Math.max(1, barCount - 1)) * (width - 1));
      context.globalAlpha = 0.42 + strength * 0.58;
      context.fillRect(x, Math.round(centerY - barHeight / 2), 1, barHeight);
    }
    context.globalAlpha = 1;
  }, []);

  const applyPreviewVolume = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const volume =
      effectiveBackgroundMusicVolume(
        settings,
        audio.currentTime,
        audio.duration,
      ) *
      (mixer.backgroundMusicVolume / 100) *
      (mixer.masterVolume / 100);
    if (gainNodeRef.current) {
      audio.volume = 1;
      gainNodeRef.current.gain.value = volume;
    } else {
      audio.volume = volume;
    }
  }, [mixer.backgroundMusicVolume, mixer.masterVolume, settings]);

  const prepareAudioGraph = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    const AudioContextConstructor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextConstructor) return;

    if (!audioContextRef.current) {
      const context = new AudioContextConstructor();
      const source = context.createMediaElementSource(audio);
      const analyser = context.createAnalyser();
      const gain = context.createGain();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyser.connect(gain);
      gain.connect(context.destination);
      audioContextRef.current = context;
      audioSourceRef.current = source;
      analyserRef.current = analyser;
      gainNodeRef.current = gain;
    }
    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }
  }, []);

  const suspendAudioGraph = useCallback(() => {
    const context = audioContextRef.current;
    if (context?.state === "running") {
      void context.suspend().catch(() => {
        // The context may already be closing while the panel unmounts.
      });
    }
  }, []);

  const stopPreview = useCallback(
    (reset = false) => {
      previewRequestRef.current += 1;
      const audio = audioRef.current;
      if (!audio) return;
      if (!audio.paused) audio.pause();
      if (reset) audio.currentTime = 0;
      setCurrentTime(reset ? 0 : audio.currentTime);
      setIsPlaying(false);
      suspendAudioGraph();
    },
    [suspendAudioGraph],
  );

  const togglePreview = async () => {
    const audio = audioRef.current;
    if (!audio || !asset) return;
    if (!audio.paused && !audio.ended) {
      stopPreview();
      return;
    }
    if (audio.ended) audio.currentTime = 0;
    const source = asset.src;
    const request = previewRequestRef.current + 1;
    previewRequestRef.current = request;
    try {
      await prepareAudioGraph();
      if (
        previewRequestRef.current !== request ||
        audioRef.current !== audio ||
        assetSourceRef.current !== source
      ) {
        suspendAudioGraph();
        return;
      }
      applyPreviewVolume();
      const playResult = audio.play();
      if (playResult) await playResult;
      if (
        previewRequestRef.current !== request ||
        audioRef.current !== audio ||
        assetSourceRef.current !== source
      ) {
        if (!audio.paused) audio.pause();
        suspendAudioGraph();
        return;
      }
      setAudioErrorState(null);
      setIsPlaying(true);
    } catch {
      if (previewRequestRef.current === request) {
        setAudioErrorState({
          message: "Unable to play audio",
          source,
        });
        setIsPlaying(false);
        suspendAudioGraph();
      }
    }
  };

  useEffect(() => {
    stopPreview(true);
    drawWaveform();
  }, [asset?.src, drawWaveform, stopPreview]);

  useEffect(() => {
    applyPreviewVolume();
  }, [applyPreviewVolume]);

  useEffect(() => {
    if (!fileMenuOpen) return;
    const animationFrame = window.requestAnimationFrame(() => {
      fileMenuRef.current?.querySelector("button")?.focus();
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [fileMenuOpen]);

  useEffect(() => {
    if (!isPlaying) {
      drawWaveform();
      return;
    }
    const analyser = analyserRef.current;
    const frequencyData = analyser
      ? new Uint8Array(analyser.frequencyBinCount)
      : undefined;
    let animationFrame = 0;
    const render = (timestamp: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (analyser && frequencyData) {
        analyser.getByteFrequencyData(frequencyData);
        drawWaveform(frequencyData);
      } else {
        drawWaveform();
      }
      applyPreviewVolume();
      if (timestamp - lastTimeRenderRef.current >= 100) {
        lastTimeRenderRef.current = timestamp;
        setCurrentTime(audio.currentTime);
      }
      animationFrame = window.requestAnimationFrame(render);
    };
    animationFrame = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [applyPreviewVolume, drawWaveform, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      previewRequestRef.current += 1;
      if (audio && !audio.paused) audio.pause();
      if (audio) audio.currentTime = 0;
      audioSourceRef.current?.disconnect();
      analyserRef.current?.disconnect();
      gainNodeRef.current?.disconnect();
      void audioContextRef.current?.close();
    };
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const src = onCreateObjectUrl(file);
    setAudioErrorState(null);
    stopPreview(true);
    onCheckpoint();
    onUpdate({
      asset: {
        durationSeconds: 0,
        mimeType: file.type,
        name: file.name,
        sizeBytes: file.size,
        src,
      },
    });
    setFileMenuOpen(false);
    void extractEmbeddedAudioArtwork(file).then((artwork) => {
      if (artwork) onAttachArtwork(pageId, src, artwork.blob);
    });
  };

  const updateVolume = (volume: number) =>
    onUpdate({ volume: clamp(Math.round(volume), 0, 100) });

  return (
    <section
      aria-label="Sound settings"
      className={
        soundScope === "all"
          ? "sound-properties is-all-sounds"
          : "sound-properties"
      }
      role="tabpanel"
    >
      <div aria-label="Sound scope" className="sound-scope-tabs" role="group">
        <button
          aria-pressed={soundScope === "selected"}
          className={soundScope === "selected" ? "is-active" : undefined}
          onClick={() => setSoundScope("selected")}
          type="button"
        >
          Selected Object
        </button>
        <button
          aria-pressed={soundScope === "all"}
          className={soundScope === "all" ? "is-active" : undefined}
          onClick={() => {
            stopPreview(true);
            setSoundScope("all");
          }}
          type="button"
        >
          All Sounds
        </button>
      </div>

      {soundScope === "selected" ? (
        <>
          <section className="sound-bgm-section">
            <div className="sound-section-heading">
              <h2>Background Music (BGM)</h2>
              <button
                aria-expanded={expanded}
                aria-label={
                  expanded
                    ? "Collapse background music"
                    : "Expand background music"
                }
                className={
                  expanded
                    ? "sound-bgm-collapse is-expanded"
                    : "sound-bgm-collapse"
                }
                onClick={() => setExpanded((current) => !current)}
                type="button"
              >
                <Image
                  alt=""
                  aria-hidden="true"
                  height={9}
                  src={assetPath("/figma/sound/Group%20263.svg")}
                  width={9}
                />
              </button>
            </div>

            <div className="sound-bgm-content" hidden={!expanded}>
              <div className="sound-upload-card">
                <div aria-hidden="true" className="sound-file-thumbnail">
                  {asset ? (
                    visibleArtworkSource ? (
                      <Image
                        alt=""
                        className="sound-file-thumbnail-artwork"
                        fill
                        onError={() =>
                          setFailedArtworkSource(visibleArtworkSource)
                        }
                        sizes="33px"
                        src={visibleArtworkSource}
                        unoptimized
                      />
                    ) : (
                      <Music2
                        aria-hidden="true"
                        className="sound-file-thumbnail-icon"
                        size={16}
                        strokeWidth={1.5}
                      />
                    )
                  ) : null}
                </div>
                <div className="sound-upload-copy">
                  <strong title={asset?.name}>
                    {asset?.name ?? "No file"}
                  </strong>
                  <span
                    aria-live="polite"
                    className={audioError ? "is-error" : undefined}
                  >
                    {audioError ?? (
                      <>
                        {formatAudioTime(asset?.durationSeconds ?? 0)} /{" "}
                        {formatAudioSize(asset?.sizeBytes ?? 0)}
                      </>
                    )}
                  </span>
                </div>
                <div className="sound-preview-row">
                  <SoundPlayButton
                    disabled={!asset || Boolean(audioError)}
                    isPlaying={isPlaying}
                    label={
                      isPlaying
                        ? "Pause background music preview"
                        : "Play background music preview"
                    }
                    onClick={() => void togglePreview()}
                  />
                  <span aria-hidden="true" className="sound-preview-track">
                    <canvas
                      className="sound-preview-waveform"
                      ref={waveformRef}
                    />
                  </span>
                </div>
                <span className="sound-preview-time">
                  {formatAudioTime(currentTime)} /{" "}
                  {formatAudioTime(asset?.durationSeconds ?? 0)}
                </span>
                <div
                  className="sound-file-actions"
                  onBlur={(event) => {
                    if (
                      !event.currentTarget.contains(
                        event.relatedTarget as Node | null,
                      )
                    ) {
                      setFileMenuOpen(false);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setFileMenuOpen(false);
                  }}
                >
                  <input
                    accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
                    aria-label="Choose background music file"
                    className="sound-file-input"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    type="file"
                  />
                  {asset ? (
                    <SoundMoreButton
                      controls="background-music-file-menu"
                      expanded={fileMenuOpen}
                      label="Background music file options"
                      onClick={() => setFileMenuOpen((current) => !current)}
                    />
                  ) : (
                    <button
                      aria-label="Upload background music"
                      className="sound-upload-button"
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                    >
                      <Image
                        alt=""
                        aria-hidden="true"
                        height={15}
                        src={assetPath("/figma/upload.svg")}
                        width={18}
                      />
                    </button>
                  )}
                  {asset && fileMenuOpen ? (
                    <div
                      aria-label="Background music file options menu"
                      className="sound-file-menu"
                      id="background-music-file-menu"
                      onKeyDown={(event) => {
                        if (
                          event.key !== "ArrowDown" &&
                          event.key !== "ArrowUp"
                        ) {
                          return;
                        }
                        event.preventDefault();
                        const items = Array.from(
                          event.currentTarget.querySelectorAll("button"),
                        );
                        const currentIndex = items.indexOf(
                          document.activeElement as HTMLButtonElement,
                        );
                        const direction = event.key === "ArrowDown" ? 1 : -1;
                        const nextIndex =
                          (currentIndex + direction + items.length) %
                          items.length;
                        items[nextIndex]?.focus();
                      }}
                      ref={fileMenuRef}
                      role="menu"
                    >
                      <button
                        onClick={() => {
                          setFileMenuOpen(false);
                          fileInputRef.current?.click();
                        }}
                        role="menuitem"
                        type="button"
                      >
                        Change File
                      </button>
                      <button
                        onClick={() => {
                          stopPreview(true);
                          onCheckpoint();
                          onUpdate({ asset: null });
                          setFileMenuOpen(false);
                        }}
                        role="menuitem"
                        type="button"
                      >
                        Delete File
                      </button>
                    </div>
                  ) : null}
                </div>
                <audio
                  loop={settings.loop}
                  onEnded={() => {
                    setCurrentTime(audioRef.current?.duration ?? 0);
                    setIsPlaying(false);
                    suspendAudioGraph();
                  }}
                  onCanPlay={() => setAudioErrorState(null)}
                  onError={() => {
                    stopPreview(true);
                    if (asset) {
                      setAudioErrorState({
                        message: "Unsupported audio",
                        source: asset.src,
                      });
                    }
                  }}
                  onLoadedMetadata={(event) => {
                    if (!asset) return;
                    setAudioErrorState(null);
                    const durationSeconds = Number.isFinite(
                      event.currentTarget.duration,
                    )
                      ? event.currentTarget.duration
                      : 0;
                    if (
                      Math.abs(durationSeconds - asset.durationSeconds) > 0.01
                    ) {
                      onUpdate({ asset: { ...asset, durationSeconds } });
                    }
                  }}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={(event) => {
                    setCurrentTime(event.currentTarget.currentTime);
                    applyPreviewVolume();
                  }}
                  preload="metadata"
                  ref={audioRef}
                  src={asset?.src}
                />
              </div>

              <div className="sound-control-row sound-volume-row">
                <span className="sound-control-label">Volume</span>
                <DesignRange
                  ariaLabel="Background music volume"
                  className="sound-slider"
                  max={100}
                  min={0}
                  onBegin={onCheckpoint}
                  onChange={updateVolume}
                  value={settings.volume}
                />
                <SoundPercentField
                  onBegin={onCheckpoint}
                  onChange={updateVolume}
                  value={settings.volume}
                />
              </div>

              <div className="sound-control-row">
                <span className="sound-control-label">Fade In</span>
                <SoundStepperField
                  ariaLabel="Fade in duration"
                  onBegin={onCheckpoint}
                  onChange={(fadeInSeconds) => onUpdate({ fadeInSeconds })}
                  value={settings.fadeInSeconds}
                />
              </div>

              <div className="sound-control-row">
                <span className="sound-control-label">Fade Out</span>
                <SoundStepperField
                  ariaLabel="Fade out duration"
                  onBegin={onCheckpoint}
                  onChange={(fadeOutSeconds) => onUpdate({ fadeOutSeconds })}
                  value={settings.fadeOutSeconds}
                />
              </div>

              <div className="sound-control-row">
                <span className="sound-control-label">Loop</span>
                <button
                  aria-label="Loop"
                  aria-pressed={settings.loop}
                  className={
                    settings.loop ? "sound-toggle is-active" : "sound-toggle"
                  }
                  onClick={() => {
                    onCheckpoint();
                    onUpdate({ loop: !settings.loop });
                  }}
                  type="button"
                >
                  <span />
                </button>
              </div>

              <div className="sound-control-row">
                <span className="sound-control-label">Start Playback</span>
                <DesignDropdown
                  ariaLabel="Start playback"
                  className="sound-playback-select"
                  noScroll
                  onChange={(startPlayback) => {
                    if (!isBackgroundMusicStartMode(startPlayback)) return;
                    onCheckpoint();
                    onUpdate({ startPlayback });
                  }}
                  options={backgroundMusicStartOptions}
                  value={settings.startPlayback}
                />
              </div>

              {settings.startPlayback === "after-delay" ? (
                <div className="sound-control-row sound-delay-row">
                  <span className="sound-control-label">Delay</span>
                  <SoundStepperField
                    ariaLabel="Playback delay"
                    onBegin={onCheckpoint}
                    onChange={(delaySeconds) => onUpdate({ delaySeconds })}
                    value={settings.delaySeconds}
                  />
                </div>
              ) : null}
            </div>
          </section>
          {hasInteractionSoundSelection ? (
            <InteractionSoundsSection
              canDeleteAllSounds={canDeleteAllSounds}
              expanded={selectedElements[0]?.interactionSoundExpanded ?? false}
              key={selectedSoundElementKey}
              mixer={mixer}
              onAppendAssets={(assets) =>
                onAppendInteractionSoundAssets(
                  selectedElements.map((element) => element.id),
                  assets,
                )
              }
              onApplyCommonAsset={(asset) =>
                onApplyCommonInteractionSoundAsset(
                  selectedElements.map((element) => element.id),
                  asset,
                )
              }
              onChange={updateInteractionSound}
              onCheckpoint={onCheckpoint}
              onCreateObjectUrl={onCreateObjectUrl}
              onDeleteAllSounds={() =>
                onClearInteractionSoundAssets(
                  selectedElements.map((element) => element.id),
                )
              }
              onExpandedChange={(nextExpanded) =>
                onUpdateInteractionExpanded(
                  selectedElements.map((element) => element.id),
                  nextExpanded,
                )
              }
              settings={interactionSoundSettings}
              showAdd={selectedElements.length > 1 && hasCommonInteraction}
            />
          ) : null}
        </>
      ) : (
        <AllSoundsPanel
          advancedSettings={advancedSettings}
          backgroundMusic={settings}
          elements={elements}
          mixer={mixer}
          onCheckpoint={onCheckpoint}
          onDeleteBackgroundMusic={() => onUpdate({ asset: null })}
          onDeleteInteractionAsset={onDeleteInteractionAsset}
          onGoToElement={(elementId) => {
            onSelectElement(elementId);
            setSoundScope("selected");
          }}
          onReplaceInteractionSounds={onReplaceInteractionSounds}
          onUpdateAdvanced={onUpdateAdvanced}
          onUpdateMixer={onUpdateMixer}
        />
      )}
    </section>
  );
}
