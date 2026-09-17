/* Audio playback intentionally keeps the latest props in refs. */
/* eslint-disable react-hooks/refs */

import { Check, X } from "lucide-react";
import {
  type ChangeEvent,
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  SoundMoreButton,
  SoundPlayButton,
  SoundStepperField,
} from "@/features/editor/components/sound/sound-fields";
import {
  DesignDropdown,
  DesignRange,
} from "@/features/editor/components/ui/design-fields";
import { clamp } from "@/features/editor/lib/geometry";
import {
  calculateInteractionSoundVolume,
  fadeInteractionSoundToSilence,
  startInteractionSoundEnvelope,
} from "@/features/editor/lib/sound-playback";
import {
  formatAudioSize,
  formatAudioTime,
  interactionSoundEvents,
  interactionSoundPlaybackOptions,
  interactionSoundTriggerOptions,
} from "@/features/editor/lib/sound-settings";
import {
  type BackgroundMusicAsset,
  type InteractionSoundSettings,
  type SoundMixerSettings,
} from "@/features/editor/store/editor-store";

export type InteractionSoundUploadRequest =
  | { index: number; mode: "replace" }
  | { mode: "append" }
  | { mode: "apply-common" };

export function InteractionSoundFileField({
  asset,
  isPlaying,
  label,
  onPreview,
  onRemove,
}: {
  asset: BackgroundMusicAsset | null;
  isPlaying: boolean;
  label: string;
  onPreview: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      aria-label={
        asset ? `${label}: ${asset.name}` : `${label}: no file selected`
      }
      className={
        asset ? "sound-event-file-control" : "sound-event-file-control is-empty"
      }
    >
      <SoundPlayButton
        disabled={!asset}
        isPlaying={isPlaying}
        label={isPlaying ? `Pause ${label}` : `Preview ${label}`}
        onClick={onPreview}
      />
      <span className="sound-event-file-name" title={asset?.name}>
        {asset?.name ?? ""}
      </span>
      <span className="sound-event-file-meta">
        {asset
          ? `${formatAudioTime(asset.durationSeconds)}/${formatAudioSize(asset.sizeBytes)}`
          : "00:00/0.0MB"}
      </span>
      {asset ? (
        <button
          aria-label={`Remove ${label}`}
          className="sound-event-file-remove"
          onClick={onRemove}
          type="button"
        >
          <X aria-hidden="true" size={9} strokeWidth={1.25} />
        </button>
      ) : null}
    </div>
  );
}

export function InteractionSoundDetails({
  onChange,
  onCheckpoint,
  onPreview,
  onRequestUpload,
  playingSource,
  settings,
}: {
  onChange: (updates: Partial<InteractionSoundSettings>) => void;
  onCheckpoint: () => void;
  onPreview: (asset: BackgroundMusicAsset) => void;
  onRequestUpload: (request: InteractionSoundUploadRequest) => void;
  playingSource: string | null;
  settings: InteractionSoundSettings;
}) {
  const eventOptions = interactionSoundEvents[settings.trigger];
  const multiple = settings.soundSource === "multiple";
  const displayedAssets: (BackgroundMusicAsset | null)[] = settings.assets
    .length
    ? multiple
      ? settings.assets
      : [settings.assets[0]]
    : [null];
  const extraFileRows = multiple ? Math.max(0, displayedAssets.length - 1) : 0;
  const detailsHeight = multiple ? 280 + extraFileRows * 25 : 234;
  const label =
    interactionSoundTriggerOptions.find(
      (option) => option.value === settings.trigger,
    )?.label ?? settings.trigger;

  return (
    <div
      aria-label={`${label} sound details`}
      className={
        multiple ? "sound-event-settings is-multiple" : "sound-event-settings"
      }
      role="group"
      style={
        {
          "--sound-event-file-offset": `${extraFileRows * 25}px`,
          height: `${detailsHeight}px`,
        } as CSSProperties
      }
    >
      <h3>Event Settings</h3>

      <div className="sound-event-field sound-event-trigger-field">
        <span>Trigger</span>
        <DesignDropdown
          ariaLabel={`${label} sound trigger`}
          className="sound-event-select"
          noScroll
          onChange={(value) => {
            const trigger = interactionSoundTriggerOptions.find(
              (option) => option.value === value,
            )?.value;
            if (!trigger) return;
            onCheckpoint();
            onChange({
              event: interactionSoundEvents[trigger][0].value,
              trigger,
            });
          }}
          options={interactionSoundTriggerOptions}
          value={settings.trigger}
        />
      </div>

      <div className="sound-event-field sound-event-event-field">
        <span>Event</span>
        <DesignDropdown
          ariaLabel={`${label} sound event`}
          className="sound-event-select"
          noScroll
          onChange={(value) => {
            const event = eventOptions.find(
              (option) => option.value === value,
            )?.value;
            if (!event) return;
            onCheckpoint();
            onChange({ event });
          }}
          options={eventOptions}
          value={settings.event}
        />
      </div>

      <span aria-hidden="true" className="sound-event-divider" />

      <div
        aria-label={`${label} sound source`}
        className="sound-event-source"
        role="radiogroup"
      >
        <span>Sound Source</span>
        <button
          aria-checked={settings.soundSource === "single"}
          className="sound-event-radio"
          onClick={() => {
            onCheckpoint();
            onChange({
              assets: settings.assets.slice(0, 1),
              soundSource: "single",
            });
          }}
          role="radio"
          type="button"
        >
          <span aria-hidden="true" />
          Single Sound
        </button>
        <button
          aria-checked={settings.soundSource === "multiple"}
          className="sound-event-radio"
          onClick={() => {
            onCheckpoint();
            onChange({ soundSource: "multiple" });
          }}
          role="radio"
          type="button"
        >
          <span aria-hidden="true" />
          Multiple Sounds
        </button>
      </div>

      <span className="sound-event-file-label">Sound File</span>
      <div className="sound-event-files">
        {displayedAssets.map((asset, index) => (
          <InteractionSoundFileField
            asset={asset}
            isPlaying={Boolean(asset && playingSource === asset.src)}
            key={`${asset?.src ?? "empty"}-${index}`}
            label={`${label} sound file ${index + 1}`}
            onPreview={() => {
              if (asset) onPreview(asset);
            }}
            onRemove={() => {
              onCheckpoint();
              onChange({
                assets: settings.assets.filter(
                  (_asset, assetIndex) => assetIndex !== index,
                ),
              });
            }}
          />
        ))}
      </div>

      {!multiple ? (
        <button
          className="sound-event-action sound-event-change"
          onClick={() => onRequestUpload({ index: 0, mode: "replace" })}
          type="button"
        >
          {settings.assets[0] ? "Change Sound" : "Add Sound"}
        </button>
      ) : null}

      {multiple ? (
        <>
          <button
            className="sound-event-action sound-event-add"
            onClick={() => onRequestUpload({ mode: "append" })}
            type="button"
          >
            Add Sound
          </button>
          <div className="sound-event-field sound-event-playback-field">
            <span>Playback Mode</span>
            <DesignDropdown
              ariaLabel={`${label} sound playback mode`}
              className="sound-event-select"
              noScroll
              onChange={(value) => {
                const playbackMode = interactionSoundPlaybackOptions.find(
                  (option) => option.value === value,
                )?.value;
                if (!playbackMode) return;
                onCheckpoint();
                onChange({ playbackMode });
              }}
              options={interactionSoundPlaybackOptions}
              value={settings.playbackMode}
            />
          </div>
          <label className="sound-event-checkbox">
            <input
              checked={settings.avoidRepeating}
              onChange={(changeEvent) => {
                onCheckpoint();
                onChange({ avoidRepeating: changeEvent.target.checked });
              }}
              type="checkbox"
            />
            <span aria-hidden="true">
              <Check size={11} strokeWidth={2} />
            </span>
            Avoid repeating the same sound
          </label>
        </>
      ) : null}

      <div className="sound-event-volume-row">
        <span>Volume</span>
        <DesignRange
          ariaLabel={`${label} sound detail volume`}
          className="sound-event-volume-slider"
          disabled={!settings.assets.length}
          max={100}
          min={0}
          onBegin={onCheckpoint}
          onChange={(volume) =>
            onChange({ volume: clamp(Math.round(volume), 0, 100) })
          }
          value={settings.volume}
        />
        <span className="sound-event-volume-value">{settings.volume} %</span>
      </div>

      <div className="sound-event-field sound-event-fade-in-field">
        <span>Fade In</span>
        <SoundStepperField
          ariaLabel={`${label} sound fade in duration`}
          onBegin={onCheckpoint}
          onChange={(fadeInSeconds) => onChange({ fadeInSeconds })}
          value={settings.fadeInSeconds}
        />
      </div>

      <div className="sound-event-field sound-event-fade-out-field">
        <span>Fade Out</span>
        <SoundStepperField
          ariaLabel={`${label} sound fade out duration`}
          onBegin={onCheckpoint}
          onChange={(fadeOutSeconds) => onChange({ fadeOutSeconds })}
          value={settings.fadeOutSeconds}
        />
      </div>
    </div>
  );
}

export function InteractionSoundRow({
  canDeleteAllSounds,
  expanded,
  menuOpen,
  onChange,
  onCheckpoint,
  onDeleteAllSounds,
  onExpandedChange,
  onMenuOpenChange,
  onPreview,
  onRequestUpload,
  playingSource,
  settings,
}: {
  canDeleteAllSounds: boolean;
  expanded: boolean;
  menuOpen: boolean;
  onChange: (updates: Partial<InteractionSoundSettings>) => void;
  onCheckpoint: () => void;
  onDeleteAllSounds: () => void;
  onExpandedChange: (expanded: boolean) => void;
  onMenuOpenChange: (open: boolean) => void;
  onPreview: (asset: BackgroundMusicAsset) => void;
  onRequestUpload: (request: InteractionSoundUploadRequest) => void;
  playingSource: string | null;
  settings: InteractionSoundSettings;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const label =
    interactionSoundTriggerOptions.find(
      (option) => option.value === settings.trigger,
    )?.label ?? settings.trigger;
  const rowId = settings.id;
  const menuId = `${rowId}-menu`;
  const primaryAsset = settings.assets[0] ?? null;
  const extraFileRows =
    settings.soundSource === "multiple"
      ? Math.max(0, settings.assets.length - 1)
      : 0;
  const expandedHeight =
    settings.soundSource === "multiple" ? 306 + extraFileRows * 25 : 261;

  useEffect(() => {
    if (!menuOpen) return;
    const frame = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector("button")?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [menuOpen]);

  return (
    <div
      className={
        menuOpen
          ? "sound-interaction-item is-menu-open"
          : "sound-interaction-item"
      }
      onBlur={(blurEvent) => {
        if (
          !blurEvent.currentTarget.contains(
            blurEvent.relatedTarget as Node | null,
          )
        ) {
          onMenuOpenChange(false);
        }
      }}
      onKeyDown={(keyEvent) => {
        if (keyEvent.key === "Escape") onMenuOpenChange(false);
      }}
    >
      <div
        aria-label={`${label} interaction sound`}
        className={[
          "sound-interaction-row",
          primaryAsset ? "" : "is-empty",
          expanded ? "is-expanded" : "",
          expanded && settings.soundSource === "multiple" ? "is-multiple" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        data-disabled={settings.enabled === false}
        role="group"
        style={expanded ? { height: `${expandedHeight}px` } : undefined}
      >
        <div className="sound-interaction-row-header">
          <span className="sound-interaction-trigger">{label}</span>
          <SoundPlayButton
            disabled={!primaryAsset || settings.enabled === false}
            isPlaying={Boolean(
              primaryAsset && playingSource === primaryAsset.src,
            )}
            label={
              playingSource === primaryAsset?.src
                ? `Pause ${label} sound`
                : `Preview ${label} sound`
            }
            onClick={() => {
              if (primaryAsset && settings.enabled !== false) {
                onPreview(primaryAsset);
              }
            }}
          />
          <span
            aria-label={
              primaryAsset
                ? `${label} sound file name: ${primaryAsset.name}`
                : `${label} sound file name: empty`
            }
            className="sound-interaction-name"
            title={primaryAsset?.name}
          >
            {primaryAsset?.name ?? ""}
          </span>
          <span className="sound-interaction-volume">{settings.volume} %</span>
          <DesignRange
            ariaLabel={`${label} sound volume`}
            className="sound-mini-slider"
            disabled={!primaryAsset || settings.enabled === false}
            max={100}
            min={0}
            onBegin={onCheckpoint}
            onChange={(volume) =>
              onChange({ volume: clamp(Math.round(volume), 0, 100) })
            }
            value={settings.volume}
          />
          <SoundMoreButton
            controls={menuId}
            expanded={menuOpen}
            label={`More ${label} sound options`}
            onClick={() => onMenuOpenChange(!menuOpen)}
          />
        </div>

        {expanded ? (
          <InteractionSoundDetails
            onChange={onChange}
            onCheckpoint={onCheckpoint}
            onPreview={onPreview}
            onRequestUpload={onRequestUpload}
            playingSource={playingSource}
            settings={settings}
          />
        ) : null}
      </div>

      {menuOpen ? (
        <div
          aria-label={`${label} sound options menu`}
          className="sound-file-menu sound-interaction-menu"
          id={menuId}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              const items = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  "button:not(:disabled)",
                ),
              );
              const currentIndex = items.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              const direction = event.key === "ArrowDown" ? 1 : -1;
              const nextIndex =
                (currentIndex + direction + items.length) % items.length;
              items[nextIndex]?.focus();
            }
          }}
          ref={menuRef}
          role="menu"
        >
          <button
            onClick={() => {
              onMenuOpenChange(false);
              onExpandedChange(!expanded);
            }}
            role="menuitem"
            type="button"
          >
            Event Settings
          </button>
          <button
            disabled={!canDeleteAllSounds}
            onClick={() => {
              if (!canDeleteAllSounds) return;
              onMenuOpenChange(false);
              onDeleteAllSounds();
            }}
            role="menuitem"
            type="button"
          >
            Delete Sound
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function InteractionSoundsSection({
  canDeleteAllSounds,
  expanded,
  mixer,
  onAppendAssets,
  onApplyCommonAsset,
  onChange,
  onCheckpoint,
  onCreateObjectUrl,
  onDeleteAllSounds,
  onExpandedChange,
  settings,
  showAdd,
}: {
  canDeleteAllSounds: boolean;
  expanded: boolean;
  mixer: SoundMixerSettings;
  onAppendAssets: (assets: BackgroundMusicAsset[]) => void;
  onApplyCommonAsset: (asset: BackgroundMusicAsset) => void;
  onChange: (updates: Partial<InteractionSoundSettings>) => void;
  onCheckpoint: () => void;
  onCreateObjectUrl: (file: Blob) => string;
  onDeleteAllSounds: () => void;
  onExpandedChange: (expanded: boolean) => void;
  settings: InteractionSoundSettings;
  showAdd: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [playingSource, setPlayingSource] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const previewActiveRef = useRef<{
    assetSrc: string;
    fadeOutSeconds: number;
    stopping: boolean;
  } | null>(null);
  const previewEnvelopeCancelRef = useRef<(() => void) | null>(null);
  const previewFadeCancelRef = useRef<(() => void) | null>(null);
  const previewRequestRef = useRef(0);
  const previewSettingsRef = useRef(settings);
  const mixerRef = useRef(mixer);
  const uploadRequestRef = useRef<InteractionSoundUploadRequest | null>(null);
  previewSettingsRef.current = settings;
  mixerRef.current = mixer;

  const requestUpload = (request: InteractionSoundUploadRequest) => {
    uploadRequestRef.current = request;
    fileInputRef.current?.click();
  };

  const cancelPreviewAnimations = useCallback(() => {
    previewEnvelopeCancelRef.current?.();
    previewFadeCancelRef.current?.();
    previewEnvelopeCancelRef.current = null;
    previewFadeCancelRef.current = null;
  }, []);

  const finishPreviewStop = useCallback(() => {
    cancelPreviewAnimations();
    const audio = previewAudioRef.current;
    if (audio) {
      if (!audio.paused) audio.pause();
      audio.currentTime = 0;
      audio.loop = false;
    }
    previewActiveRef.current = null;
    setPlayingSource(null);
  }, [cancelPreviewAnimations]);

  const stopPreview = useCallback(
    (withFadeOut: boolean) => {
      previewRequestRef.current += 1;
      previewEnvelopeCancelRef.current?.();
      previewEnvelopeCancelRef.current = null;
      const audio = previewAudioRef.current;
      const active = previewActiveRef.current;
      if (!audio || !active || active.stopping) {
        finishPreviewStop();
        return;
      }
      previewFadeCancelRef.current?.();
      previewFadeCancelRef.current = null;
      if (withFadeOut && active.fadeOutSeconds > 0 && !audio.paused) {
        active.stopping = true;
        const expectedActive = active;
        previewFadeCancelRef.current = fadeInteractionSoundToSilence(
          audio,
          active.fadeOutSeconds,
          () => {
            previewFadeCancelRef.current = null;
            if (previewActiveRef.current !== expectedActive) return;
            if (!audio.paused) audio.pause();
            audio.currentTime = 0;
            audio.loop = false;
            previewActiveRef.current = null;
            setPlayingSource(null);
          },
        );
        return;
      }
      finishPreviewStop();
    },
    [finishPreviewStop],
  );

  const togglePreview = useCallback(
    async (asset: BackgroundMusicAsset) => {
      const audio = previewAudioRef.current;
      if (!audio) return;
      if (previewActiveRef.current?.assetSrc === asset.src) {
        stopPreview(true);
        return;
      }
      stopPreview(false);
      const request = ++previewRequestRef.current;
      const currentSettings = previewSettingsRef.current;
      const mixerGain =
        (mixerRef.current.interactionSoundVolume / 100) *
        (mixerRef.current.masterVolume / 100);
      const active = {
        assetSrc: asset.src,
        fadeOutSeconds: currentSettings.fadeOutSeconds,
        stopping: false,
      };
      previewActiveRef.current = active;
      audio.src = asset.src;
      audio.loop = false;
      audio.volume = calculateInteractionSoundVolume(
        { ...currentSettings, volume: currentSettings.volume * mixerGain },
        0,
        0,
        Number.NaN,
        false,
      );
      try {
        const playResult = audio.play();
        if (playResult) await playResult;
        if (
          previewRequestRef.current !== request ||
          previewActiveRef.current !== active
        ) {
          return;
        }
        setPlayingSource(asset.src);
        previewEnvelopeCancelRef.current = startInteractionSoundEnvelope(
          audio,
          () => ({
            ...previewSettingsRef.current,
            volume:
              previewSettingsRef.current.volume *
              (mixerRef.current.interactionSoundVolume / 100) *
              (mixerRef.current.masterVolume / 100),
          }),
          false,
        );
      } catch {
        if (previewActiveRef.current !== active) return;
        previewActiveRef.current = null;
        setPlayingSource(null);
      }
    },
    [stopPreview],
  );

  useEffect(() => {
    const audio = previewAudioRef.current;
    if (audio && !previewActiveRef.current) {
      audio.volume = clamp(
        (settings.volume / 100) *
          (mixer.interactionSoundVolume / 100) *
          (mixer.masterVolume / 100),
        0,
        1,
      );
    }
  }, [mixer.interactionSoundVolume, mixer.masterVolume, settings.volume]);

  useEffect(
    () => () => {
      previewRequestRef.current += 1;
      cancelPreviewAnimations();
      const audio = previewAudioRef.current;
      if (audio && !audio.paused) audio.pause();
      previewActiveRef.current = null;
    },
    [cancelPreviewAnimations],
  );

  const handlePreviewEnded = () => {
    cancelPreviewAnimations();
    previewActiveRef.current = null;
    setPlayingSource(null);
  };

  const updateSettings = (updates: Partial<InteractionSoundSettings>) => {
    const activeSource = previewActiveRef.current?.assetSrc;
    if (
      updates.assets &&
      activeSource &&
      !updates.assets.some((asset) => asset.src === activeSource)
    ) {
      stopPreview(false);
    }
    onChange(updates);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const request = uploadRequestRef.current;
    const selectedFiles = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    uploadRequestRef.current = null;
    if (!request || selectedFiles.length === 0) return;

    const files =
      request.mode === "append" ? selectedFiles : selectedFiles.slice(0, 1);
    const assets = files.map((file) => ({
      durationSeconds: 0,
      mimeType: file.type,
      name: file.name,
      sizeBytes: file.size,
      src: onCreateObjectUrl(file),
    }));
    onCheckpoint();
    if (request.mode === "append") {
      onAppendAssets(assets);
      return;
    }
    if (request.mode === "apply-common") {
      onApplyCommonAsset(assets[0]);
      return;
    }
    const nextAssets = [...settings.assets];
    nextAssets[request.index] = assets[0];
    onChange({ assets: nextAssets });
  };

  return (
    <>
      <div aria-hidden="true" className="sound-interaction-divider" />
      <section
        aria-label="Interaction Sounds"
        className="sound-interaction-section"
      >
        <div className="sound-section-heading">
          <h2>Interaction Sounds</h2>
          {showAdd ? (
            <button
              className="sound-add-button"
              onClick={() => requestUpload({ mode: "apply-common" })}
              type="button"
            >
              <span aria-hidden="true">+</span> Add
            </button>
          ) : null}
        </div>

        <input
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
          aria-label="Choose interaction sound file"
          className="sound-file-input"
          multiple
          onChange={handleFileChange}
          ref={fileInputRef}
          type="file"
        />
        <InteractionSoundRow
          canDeleteAllSounds={canDeleteAllSounds}
          expanded={expanded}
          menuOpen={menuOpen}
          onChange={updateSettings}
          onCheckpoint={onCheckpoint}
          onDeleteAllSounds={() => {
            stopPreview(false);
            onCheckpoint();
            onDeleteAllSounds();
          }}
          onExpandedChange={onExpandedChange}
          onMenuOpenChange={setMenuOpen}
          onPreview={(asset) => void togglePreview(asset)}
          onRequestUpload={requestUpload}
          playingSource={playingSource}
          settings={settings}
        />
        <audio
          aria-hidden="true"
          className="sound-interaction-preview"
          onEnded={handlePreviewEnded}
          preload="metadata"
          ref={previewAudioRef}
        />
      </section>
    </>
  );
}
