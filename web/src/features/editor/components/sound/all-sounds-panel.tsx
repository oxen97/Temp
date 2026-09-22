import { Box, Check, Music2, Search } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  SoundMoreButton,
  SoundPercentField,
  SoundPlayButton,
} from "@/features/editor/components/sound/sound-fields";
import { SoundAdvancedSettingsSection } from "@/features/editor/components/sound/sound-panel";
import {
  DesignDropdown,
  DesignRange,
} from "@/features/editor/components/ui/design-fields";
import { LayerSymbol } from "@/features/editor/components/ui/layer-symbol";
import { ModelAssetThumbnail } from "@/features/editor/components/ui/model-asset-thumbnail";
import { clamp } from "@/features/editor/lib/geometry";
import {
  backgroundMusicStartOptions,
  formatAudioSize,
  formatAudioTime,
  interactionSoundTriggerOptions,
  supportsInteractionSounds,
  type SoundTarget,
} from "@/features/editor/lib/sound-settings";
import {
  type BackgroundMusicAsset,
  type BackgroundMusicSettings,
  type InteractionSoundSettings,
  type InteractionSoundTrigger,
  type SoundAdvancedSettings,
  type SoundMixerSettings,
} from "@/features/editor/store/editor-store";

export type AllSoundsTriggerFilter = "all" | InteractionSoundTrigger;

export type AllSoundsObjectFilter = "all" | "shape" | "image";

export const allSoundsTriggerFilterOptions: {
  label: string;
  value: AllSoundsTriggerFilter;
}[] = [
  { label: "All Triggers", value: "all" },
  ...interactionSoundTriggerOptions,
];

export const allSoundsObjectFilterOptions: {
  label: string;
  value: AllSoundsObjectFilter;
}[] = [
  { label: "All Objects", value: "all" },
  { label: "Shapes", value: "shape" },
  { label: "Images", value: "image" },
];

export type AllSoundsEntry = {
  asset: BackgroundMusicAsset;
  assetIndex: number;
  element: SoundTarget;
  id: string;
  setting: InteractionSoundSettings;
  settingIndex: number;
};

export type AllSoundsGroup = {
  element: SoundTarget;
  entries: AllSoundsEntry[];
  id: string;
};

export function AllSoundsPanel({
  advancedSettings,
  backgroundMusic,
  elements,
  mixer,
  onDeleteBackgroundMusic,
  onDeleteInteractionAsset,
  onGoToElement,
  onReplaceInteractionSounds,
  onUpdateAdvanced,
  onUpdateMixer,
  onCheckpoint,
  projectId,
}: {
  advancedSettings: SoundAdvancedSettings;
  backgroundMusic: BackgroundMusicSettings;
  elements: SoundTarget[];
  mixer: SoundMixerSettings;
  onDeleteBackgroundMusic: () => void;
  onDeleteInteractionAsset: (
    elementId: string,
    settingIndex: number,
    assetIndex: number,
  ) => void;
  onGoToElement: (elementId: string) => void;
  onReplaceInteractionSounds: (
    elementId: string,
    settings: InteractionSoundSettings[],
  ) => void;
  onUpdateAdvanced: (updates: Partial<SoundAdvancedSettings>) => void;
  onUpdateMixer: (updates: Partial<SoundMixerSettings>) => void;
  onCheckpoint: () => void;
  projectId: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [triggerFilter, setTriggerFilter] =
    useState<AllSoundsTriggerFilter>("all");
  const [objectFilter, setObjectFilter] =
    useState<AllSoundsObjectFilter>("all");
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [backgroundMenuOpen, setBackgroundMenuOpen] = useState(false);
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [bulkVolumeOpen, setBulkVolumeOpen] = useState(false);
  const [rowMenuId, setRowMenuId] = useState<string | null>(null);
  const [playingEntryId, setPlayingEntryId] = useState<string | null>(null);
  const bulkActionsRef = useRef<HTMLSpanElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const backgroundAsset = backgroundMusic.asset;

  const allEntries = useMemo(
    () =>
      elements.flatMap((element) =>
        supportsInteractionSounds(element)
          ? (element.interactionSounds ?? []).flatMap((setting, settingIndex) =>
              setting.assets.map((asset, assetIndex) => ({
                asset,
                assetIndex,
                element,
                id: `${element.id}:${setting.id}:${assetIndex}:${asset.src}`,
                setting,
                settingIndex,
              })),
            )
          : [],
      ),
    [elements],
  );
  const visibleEntries = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase();
    return allEntries.filter((entry) => {
      if (
        query &&
        !entry.element.name.toLocaleLowerCase().includes(query) &&
        !entry.asset.name.toLocaleLowerCase().includes(query)
      ) {
        return false;
      }
      if (triggerFilter !== "all" && entry.setting.trigger !== triggerFilter) {
        return false;
      }
      if (objectFilter === "image" && entry.element.type !== "image") {
        return false;
      }
      if (objectFilter === "shape" && entry.element.type === "image") {
        return false;
      }
      return true;
    });
  }, [allEntries, objectFilter, searchTerm, triggerFilter]);
  const visibleEntryIds = visibleEntries.map((entry) => entry.id);
  const visibleGroups = useMemo(
    () =>
      visibleEntries.reduce<AllSoundsGroup[]>((groups, entry) => {
        const id = `${entry.element.id}:${entry.setting.id}`;
        const current = groups.at(-1);
        if (current?.id === id) {
          current.entries.push(entry);
        } else {
          groups.push({ element: entry.element, entries: [entry], id });
        }
        return groups;
      }, []),
    [visibleEntries],
  );
  const allVisibleSelected =
    visibleEntryIds.length > 0 &&
    visibleEntryIds.every((id) => selectedEntryIds.includes(id));
  const selectedEntryIdSet = useMemo(
    () => new Set(selectedEntryIds),
    [selectedEntryIds],
  );
  const selectedEntries = useMemo(
    () => allEntries.filter((entry) => selectedEntryIdSet.has(entry.id)),
    [allEntries, selectedEntryIdSet],
  );
  const selectedVolume = selectedEntries[0]?.setting.volume ?? 100;
  const backgroundStartLabel =
    backgroundMusicStartOptions.find(
      (option) => option.value === backgroundMusic.startPlayback,
    )?.label ?? "On Page Enter";

  const stopPreview = useCallback(() => {
    const audio = previewAudioRef.current;
    if (audio) {
      if (!audio.paused) audio.pause();
      audio.currentTime = 0;
    }
    setPlayingEntryId(null);
  }, []);

  useEffect(() => {
    if (!bulkMenuOpen) return;

    const closeBulkMenuOnOutsidePointerDown = (event: PointerEvent) => {
      if (!bulkActionsRef.current?.contains(event.target as Node | null)) {
        setBulkMenuOpen(false);
        setBulkVolumeOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeBulkMenuOnOutsidePointerDown);
    return () => {
      document.removeEventListener(
        "pointerdown",
        closeBulkMenuOnOutsidePointerDown,
      );
    };
  }, [bulkMenuOpen]);

  const togglePreview = useCallback(
    async (entry: AllSoundsEntry) => {
      const audio = previewAudioRef.current;
      if (!audio || entry.setting.enabled === false) return;
      if (playingEntryId === entry.id && !audio.paused) {
        stopPreview();
        return;
      }
      stopPreview();
      audio.src = entry.asset.src;
      audio.volume = clamp(
        (entry.setting.volume / 100) *
          (mixer.interactionSoundVolume / 100) *
          (mixer.masterVolume / 100),
        0,
        1,
      );
      try {
        const playResult = audio.play();
        if (playResult) await playResult;
        setPlayingEntryId(entry.id);
      } catch {
        setPlayingEntryId(null);
      }
    },
    [
      mixer.interactionSoundVolume,
      mixer.masterVolume,
      playingEntryId,
      stopPreview,
    ],
  );

  const updateSelectedSettings = useCallback(
    (updates: Partial<InteractionSoundSettings>, checkpoint = true) => {
      if (!selectedEntries.length) return;
      if (checkpoint) onCheckpoint();
      const selectedSettingsByElement = new Map<string, Set<number>>();
      selectedEntries.forEach((entry) => {
        const indices =
          selectedSettingsByElement.get(entry.element.id) ?? new Set<number>();
        indices.add(entry.settingIndex);
        selectedSettingsByElement.set(entry.element.id, indices);
      });
      selectedSettingsByElement.forEach((settingIndices, elementId) => {
        const element = elements.find(
          (candidate) => candidate.id === elementId,
        );
        if (!element?.interactionSounds) return;
        onReplaceInteractionSounds(
          elementId,
          element.interactionSounds.map((setting, settingIndex) => ({
            ...setting,
            ...(settingIndices.has(settingIndex) ? updates : {}),
            assets: setting.assets.map((asset) => ({ ...asset })),
          })),
        );
      });
    },
    [elements, onCheckpoint, onReplaceInteractionSounds, selectedEntries],
  );

  const deleteSelectedAssets = useCallback(() => {
    if (!selectedEntries.length) return;
    onCheckpoint();
    if (
      playingEntryId &&
      selectedEntries.some((entry) => entry.id === playingEntryId)
    ) {
      stopPreview();
    }
    const selectedAssetsByElement = new Map<string, Set<string>>();
    selectedEntries.forEach((entry) => {
      const keys =
        selectedAssetsByElement.get(entry.element.id) ?? new Set<string>();
      keys.add(`${entry.settingIndex}:${entry.assetIndex}`);
      selectedAssetsByElement.set(entry.element.id, keys);
    });
    selectedAssetsByElement.forEach((assetKeys, elementId) => {
      const element = elements.find((candidate) => candidate.id === elementId);
      if (!element?.interactionSounds) return;
      onReplaceInteractionSounds(
        elementId,
        element.interactionSounds.map((setting, settingIndex) => ({
          ...setting,
          assets: setting.assets
            .filter(
              (_, assetIndex) =>
                !assetKeys.has(`${settingIndex}:${assetIndex}`),
            )
            .map((asset) => ({ ...asset })),
        })),
      );
    });
    setSelectedEntryIds([]);
    setBulkMenuOpen(false);
    setBulkVolumeOpen(false);
  }, [
    elements,
    onCheckpoint,
    onReplaceInteractionSounds,
    playingEntryId,
    selectedEntries,
    stopPreview,
  ]);

  useEffect(
    () => () => {
      const audio = previewAudioRef.current;
      if (!audio) return;
      if (!audio.paused) audio.pause();
      audio.removeAttribute("src");
    },
    [],
  );

  return (
    <div className="sound-all-panel">
      {backgroundAsset ? (
        <section
          aria-label="All Sounds background music"
          className="sound-all-bgm-section"
        >
          <h2>Background Music (BGM)</h2>
          <div className="sound-all-bgm-card">
            <span aria-hidden="true" className="sound-all-bgm-thumbnail">
              {backgroundAsset.artworkSrc ? (
                <Image
                  alt=""
                  fill
                  sizes="33px"
                  src={backgroundAsset.artworkSrc}
                  unoptimized
                />
              ) : (
                <Music2 size={16} strokeWidth={1.5} />
              )}
            </span>
            <span className="sound-all-bgm-copy">
              <strong title={backgroundAsset.name}>
                {backgroundAsset.name}
              </strong>
              <span className="sound-all-bgm-meta-row">
                <small>
                  {formatAudioTime(backgroundAsset.durationSeconds)} /{" "}
                  {formatAudioSize(backgroundAsset.sizeBytes)}
                </small>
                <span className="sound-all-bgm-tags">
                  <span>{backgroundStartLabel.replace(/^On /, "")}</span>
                  {backgroundMusic.loop ? <span>Loop</span> : null}
                </span>
              </span>
            </span>
            <span
              className="sound-all-bgm-actions"
              onBlur={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node | null,
                  )
                ) {
                  setBackgroundMenuOpen(false);
                }
              }}
            >
              <SoundMoreButton
                controls="all-sounds-background-menu"
                expanded={backgroundMenuOpen}
                label="All Sounds background music options"
                onClick={() => setBackgroundMenuOpen((open) => !open)}
              />
              {backgroundMenuOpen ? (
                <span
                  aria-label="All Sounds background music options menu"
                  className="sound-file-menu sound-all-bgm-menu"
                  id="all-sounds-background-menu"
                  role="menu"
                >
                  <button
                    onClick={() => {
                      setBackgroundMenuOpen(false);
                      onCheckpoint();
                      onDeleteBackgroundMusic();
                    }}
                    role="menuitem"
                    type="button"
                  >
                    Delete Sound
                  </button>
                </span>
              ) : null}
            </span>
          </div>
        </section>
      ) : null}

      <section
        aria-label="All Sounds interaction sounds"
        className="sound-all-interaction-section"
      >
        <h2>Interaction Sounds</h2>
        <div className="sound-all-filters">
          <label className="sound-all-search">
            <Search aria-hidden="true" size={9} strokeWidth={1.4} />
            <input
              aria-label="Search objects or sounds"
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              placeholder="Search objects or sounds"
              type="search"
              value={searchTerm}
            />
          </label>
          <DesignDropdown
            ariaLabel="Filter sounds by trigger"
            className="sound-all-filter-dropdown"
            noScroll
            onChange={(value) => {
              if (
                allSoundsTriggerFilterOptions.some(
                  (option) => option.value === value,
                )
              ) {
                setTriggerFilter(value as AllSoundsTriggerFilter);
              }
            }}
            options={allSoundsTriggerFilterOptions}
            value={triggerFilter}
          />
          <DesignDropdown
            ariaLabel="Filter sounds by object type"
            className="sound-all-filter-dropdown"
            noScroll
            onChange={(value) => {
              if (
                allSoundsObjectFilterOptions.some(
                  (option) => option.value === value,
                )
              ) {
                setObjectFilter(value as AllSoundsObjectFilter);
              }
            }}
            options={allSoundsObjectFilterOptions}
            value={objectFilter}
          />
        </div>

        <div className="sound-all-table">
          <div className="sound-all-table-header">
            <label className="sound-all-checkbox">
              <input
                aria-label="Select all visible sounds"
                checked={allVisibleSelected}
                onChange={() =>
                  setSelectedEntryIds((current) =>
                    allVisibleSelected
                      ? current.filter((id) => !visibleEntryIds.includes(id))
                      : [...new Set([...current, ...visibleEntryIds])],
                  )
                }
                type="checkbox"
              />
              <span aria-hidden="true">
                <Check size={11} strokeWidth={2} />
              </span>
            </label>
            <span>Object</span>
            <span>Trigger</span>
            <span>Sound</span>
            <span
              className="sound-all-header-actions"
              onBlur={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node | null,
                  )
                ) {
                  setBulkMenuOpen(false);
                  setBulkVolumeOpen(false);
                }
              }}
              ref={bulkActionsRef}
            >
              <SoundMoreButton
                controls="all-sounds-bulk-menu"
                expanded={bulkMenuOpen}
                label="Edit selected sounds"
                onClick={() => {
                  setBulkMenuOpen((open) => !open);
                  setBulkVolumeOpen(false);
                }}
              />
              {bulkMenuOpen && bulkVolumeOpen && selectedEntries.length ? (
                <span
                  aria-label="Selected sounds volume control"
                  className="sound-file-menu sound-all-bulk-menu is-volume"
                  id="all-sounds-bulk-menu"
                  role="group"
                >
                  <span className="sound-all-bulk-volume">
                    <DesignRange
                      ariaLabel="Selected sounds volume"
                      className="sound-all-bulk-slider"
                      max={100}
                      min={0}
                      onBegin={onCheckpoint}
                      onChange={(volume) =>
                        updateSelectedSettings(
                          { volume: Math.round(volume) },
                          false,
                        )
                      }
                      value={selectedVolume}
                    />
                    <SoundPercentField
                      ariaLabel="Selected sounds volume value"
                      onBegin={onCheckpoint}
                      onChange={(volume) =>
                        updateSelectedSettings({ volume }, false)
                      }
                      value={selectedVolume}
                    />
                  </span>
                </span>
              ) : bulkMenuOpen ? (
                <span
                  aria-label="Selected sounds options menu"
                  className="sound-file-menu sound-all-bulk-menu"
                  id="all-sounds-bulk-menu"
                  role="menu"
                >
                  <button
                    disabled={!selectedEntries.length}
                    onClick={deleteSelectedAssets}
                    role="menuitem"
                    type="button"
                  >
                    Delete
                  </button>
                  <button
                    disabled={!selectedEntries.length}
                    onClick={() => setBulkVolumeOpen((open) => !open)}
                    role="menuitem"
                    type="button"
                  >
                    Change Volume
                  </button>
                  <button
                    disabled={!selectedEntries.length}
                    onClick={() => {
                      updateSelectedSettings({ enabled: true });
                      setBulkMenuOpen(false);
                    }}
                    role="menuitem"
                    type="button"
                  >
                    Enable
                  </button>
                  <button
                    disabled={!selectedEntries.length}
                    onClick={() => {
                      updateSelectedSettings({ enabled: false });
                      setBulkMenuOpen(false);
                    }}
                    role="menuitem"
                    type="button"
                  >
                    Disable
                  </button>
                </span>
              ) : null}
            </span>
          </div>
          <div className="sound-all-table-body">
            {visibleGroups.length ? (
              visibleGroups.map((group) => {
                const groupEntryIds = group.entries.map((entry) => entry.id);
                const groupSelected = groupEntryIds.every((id) =>
                  selectedEntryIds.includes(id),
                );
                return (
                  <div
                    className="sound-all-table-row"
                    data-disabled={group.entries.every(
                      (entry) => entry.setting.enabled === false,
                    )}
                    key={group.id}
                    style={{
                      minHeight: Math.max(37, group.entries.length * 25 + 3),
                    }}
                  >
                    <label className="sound-all-checkbox">
                      <input
                        aria-label={`Select ${group.element.name} sounds`}
                        checked={groupSelected}
                        onChange={() =>
                          setSelectedEntryIds((current) =>
                            groupSelected
                              ? current.filter(
                                  (id) => !groupEntryIds.includes(id),
                                )
                              : [...new Set([...current, ...groupEntryIds])],
                          )
                        }
                        type="checkbox"
                      />
                      <span aria-hidden="true">
                        <Check size={11} strokeWidth={2} />
                      </span>
                    </label>
                    <span className="sound-all-object-cell">
                      <span
                        aria-hidden="true"
                        className={`sound-all-object-thumbnail layer-symbol ${group.element.type !== "object3d" && group.element.pathfinder ? "symbol-pathfinder" : `symbol-${group.element.type}`}`}
                      >
                        {group.element.type === "object3d" ? (
                          group.element.source.kind === "asset" ? (
                            <ModelAssetThumbnail
                              assetId={group.element.source.assetId}
                              projectId={projectId}
                            />
                          ) : (
                            <Box aria-hidden="true" size={15} strokeWidth={1} />
                          )
                        ) : (
                          <LayerSymbol element={group.element} />
                        )}
                        {group.element.type === "image" && group.element.src ? (
                          <span
                            className="layer-image-preview"
                            style={{
                              backgroundImage: `url(${group.element.src})`,
                            }}
                          />
                        ) : null}
                      </span>
                      <span title={group.element.name}>
                        {group.element.name}
                      </span>
                    </span>
                    <div className="sound-all-group-lines">
                      {group.entries.map((entry) => {
                        const triggerLabel =
                          interactionSoundTriggerOptions.find(
                            (option) => option.value === entry.setting.trigger,
                          )?.label ?? entry.setting.trigger;
                        const menuOpen = rowMenuId === entry.id;
                        return (
                          <div className="sound-all-table-line" key={entry.id}>
                            <span className="sound-all-trigger-cell">
                              {triggerLabel}
                            </span>
                            <span className="sound-all-sound-cell">
                              <SoundPlayButton
                                disabled={entry.setting.enabled === false}
                                isPlaying={playingEntryId === entry.id}
                                label={
                                  playingEntryId === entry.id
                                    ? `Pause ${entry.asset.name}`
                                    : `Play ${entry.asset.name}`
                                }
                                onClick={() => void togglePreview(entry)}
                              />
                              <span title={entry.asset.name}>
                                {entry.asset.name}
                              </span>
                            </span>
                            <span
                              className="sound-all-row-actions"
                              onBlur={(event) => {
                                if (
                                  !event.currentTarget.contains(
                                    event.relatedTarget as Node | null,
                                  )
                                ) {
                                  setRowMenuId(null);
                                }
                              }}
                            >
                              <SoundMoreButton
                                controls={`all-sound-row-menu-${entry.id}`}
                                expanded={menuOpen}
                                label={`More options for ${entry.asset.name}`}
                                onClick={() =>
                                  setRowMenuId((current) =>
                                    current === entry.id ? null : entry.id,
                                  )
                                }
                              />
                              {menuOpen ? (
                                <span
                                  aria-label={`${entry.asset.name} options menu`}
                                  className="sound-file-menu sound-all-row-menu"
                                  id={`all-sound-row-menu-${entry.id}`}
                                  role="menu"
                                >
                                  <button
                                    onClick={() => {
                                      setRowMenuId(null);
                                      if (playingEntryId === entry.id)
                                        stopPreview();
                                      onCheckpoint();
                                      onDeleteInteractionAsset(
                                        entry.element.id,
                                        entry.settingIndex,
                                        entry.assetIndex,
                                      );
                                    }}
                                    role="menuitem"
                                    type="button"
                                  >
                                    Delete Sound
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRowMenuId(null);
                                      onGoToElement(entry.element.id);
                                    }}
                                    role="menuitem"
                                    type="button"
                                  >
                                    Go to Layer
                                  </button>
                                </span>
                              ) : null}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="sound-all-empty">No interaction sounds</p>
            )}
          </div>
        </div>
      </section>

      <section aria-label="Master Volume" className="sound-all-master-section">
        <h2>Master Volume</h2>
        <div className="sound-all-master-row">
          <span>Master</span>
          <DesignRange
            ariaLabel="Master sound volume"
            className="sound-all-master-slider"
            max={100}
            min={0}
            onBegin={onCheckpoint}
            onChange={(masterVolume) =>
              onUpdateMixer({
                masterVolume: clamp(Math.round(masterVolume), 0, 100),
              })
            }
            value={mixer.masterVolume}
          />
          <SoundPercentField
            ariaLabel="Master sound volume value"
            onBegin={onCheckpoint}
            onChange={(masterVolume) => onUpdateMixer({ masterVolume })}
            value={mixer.masterVolume}
          />
        </div>
        <div className="sound-all-master-row">
          <span>Background Music</span>
          <DesignRange
            ariaLabel="All Sounds background music volume"
            className="sound-all-master-slider"
            max={100}
            min={0}
            onBegin={onCheckpoint}
            onChange={(backgroundMusicVolume) =>
              onUpdateMixer({
                backgroundMusicVolume: clamp(
                  Math.round(backgroundMusicVolume),
                  0,
                  100,
                ),
              })
            }
            value={mixer.backgroundMusicVolume}
          />
          <SoundPercentField
            ariaLabel="All Sounds background music volume value"
            onBegin={onCheckpoint}
            onChange={(backgroundMusicVolume) =>
              onUpdateMixer({ backgroundMusicVolume })
            }
            value={mixer.backgroundMusicVolume}
          />
        </div>
        <div className="sound-all-master-row">
          <span>Interaction Sound</span>
          <DesignRange
            ariaLabel="All Sounds interaction sound volume"
            className="sound-all-master-slider"
            max={100}
            min={0}
            onBegin={onCheckpoint}
            onChange={(interactionSoundVolume) =>
              onUpdateMixer({
                interactionSoundVolume: clamp(
                  Math.round(interactionSoundVolume),
                  0,
                  100,
                ),
              })
            }
            value={mixer.interactionSoundVolume}
          />
          <SoundPercentField
            ariaLabel="All Sounds interaction sound volume value"
            onBegin={onCheckpoint}
            onChange={(interactionSoundVolume) =>
              onUpdateMixer({ interactionSoundVolume })
            }
            value={mixer.interactionSoundVolume}
          />
        </div>
      </section>

      <SoundAdvancedSettingsSection
        onChange={onUpdateAdvanced}
        onCheckpoint={onCheckpoint}
        settings={advancedSettings}
      />
      <audio
        aria-hidden="true"
        className="sound-all-preview-audio"
        onEnded={() => setPlayingEntryId(null)}
        preload="metadata"
        ref={previewAudioRef}
      />
    </div>
  );
}
