"use client";

import {
  ChevronDown,
  ChevronRight,
  Copy,
  Diamond,
  Minus,
  Pause,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  type CSSProperties,
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";

import styles from "./keyframe-timeline-editor.module.css";

export type KeyframeEasing =
  "linear" | "ease-in" | "ease-out" | "ease-in-out" | "hold" | "custom";

export type KeyframeProperty =
  | "position-x"
  | "position-y"
  | "position-z"
  | "rotation-x"
  | "rotation-y"
  | "rotation-z"
  | "scale-x"
  | "scale-y"
  | "scale-z"
  | "opacity"
  | "material"
  | `morph:${string}`
  | `custom:${string}`;

export type KeyframeTimelineTrack = {
  defaultValue?: number;
  label: string;
  property: KeyframeProperty;
  unit?: string;
};

export type TimelineKeyframe = {
  customCurve?: string;
  easing: KeyframeEasing;
  id: string;
  objectId: string;
  property: KeyframeProperty;
  time: number;
  value: number | string;
};

export type KeyframeTimelineObject = {
  /** Effect-specific numeric tracks such as camera, lighting, or bone values. */
  additionalTracks?: readonly KeyframeTimelineTrack[];
  /** Use 3d to expose the complete XYZ transform track set. */
  dimension?: "2d" | "3d";
  id: string;
  /** Set false for virtual scene targets or model sub-parts. */
  includeBaseTracks?: boolean;
  /** A material track is added when at least one material name is supplied. */
  materialNames?: readonly string[];
  /** Each supplied morph target gets an independent weight track. */
  morphTargetNames?: readonly string[];
  name: string;
};

export type KeyframeTimelineEditorProps = {
  /** Uncontrolled starting value. Ignored when keyframes is supplied. */
  defaultKeyframes?: readonly TimelineKeyframe[];
  durationSeconds?: number;
  /** Optional controlled keyframe collection. */
  keyframes?: readonly TimelineKeyframe[];
  objects: readonly KeyframeTimelineObject[];
  onClose: () => void;
  onKeyframesChange?: (keyframes: TimelineKeyframe[]) => void;
  open: boolean;
  presentation?: "inline" | "modal";
  title?: string;
};

type TrackDefinition = {
  defaultValue?: number;
  label: string;
  object: KeyframeTimelineObject;
  property: KeyframeProperty;
  unit: string;
};

const easingOptions: { label: string; value: KeyframeEasing }[] = [
  { label: "Linear", value: "linear" },
  { label: "Ease In", value: "ease-in" },
  { label: "Ease Out", value: "ease-out" },
  { label: "Ease In Out", value: "ease-in-out" },
  { label: "Hold", value: "hold" },
  { label: "Custom Curve", value: "custom" },
];

const twoDimensionalTracks: Omit<TrackDefinition, "object">[] = [
  { label: "Position X", property: "position-x", unit: "px" },
  { label: "Position Y", property: "position-y", unit: "px" },
  { label: "Rotation Z", property: "rotation-z", unit: "°" },
  { label: "Scale X", property: "scale-x", unit: "%" },
  { label: "Scale Y", property: "scale-y", unit: "%" },
  { label: "Opacity", property: "opacity", unit: "%" },
];

const threeDimensionalTracks: Omit<TrackDefinition, "object">[] = [
  { label: "Position X", property: "position-x", unit: "px" },
  { label: "Position Y", property: "position-y", unit: "px" },
  { label: "Position Z", property: "position-z", unit: "px" },
  { label: "Rotation X", property: "rotation-x", unit: "°" },
  { label: "Rotation Y", property: "rotation-y", unit: "°" },
  { label: "Rotation Z", property: "rotation-z", unit: "°" },
  { label: "Scale X", property: "scale-x", unit: "%" },
  { label: "Scale Y", property: "scale-y", unit: "%" },
  { label: "Scale Z", property: "scale-z", unit: "%" },
  { label: "Opacity", property: "opacity", unit: "%" },
];

let generatedKeyframeId = 0;

function createKeyframeId() {
  generatedKeyframeId += 1;
  return `timeline-keyframe-${generatedKeyframeId}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function trackId(objectId: string, property: KeyframeProperty) {
  return `${objectId}::${property}`;
}

function buildTracks(objects: readonly KeyframeTimelineObject[]) {
  return objects.flatMap((object) => {
    const spatialTracks =
      object.includeBaseTracks === false
        ? []
        : object.dimension === "3d"
          ? threeDimensionalTracks
          : twoDimensionalTracks;
    const modelTracks: Omit<TrackDefinition, "object">[] = [];

    if (object.materialNames?.length) {
      modelTracks.push({
        label: "Material",
        property: "material",
        unit: "",
      });
    }

    for (const morphTarget of object.morphTargetNames ?? []) {
      modelTracks.push({
        label: `Morph · ${morphTarget}`,
        property: `morph:${morphTarget}`,
        unit: "%",
      });
    }

    return [
      ...spatialTracks,
      ...modelTracks,
      ...(object.additionalTracks ?? []),
    ].map((track) => ({
      ...track,
      object,
      unit: track.unit ?? "",
    }));
  });
}

function defaultValueForTrack(track: TrackDefinition) {
  if (track.defaultValue !== undefined) return track.defaultValue;
  if (track.property === "material") {
    return track.object.materialNames?.[0] ?? "Default";
  }
  if (track.property.startsWith("scale-")) return 100;
  if (track.property === "opacity") return 100;
  return 0;
}

function formatTime(time: number) {
  return `${time.toFixed(2)} s`;
}

function tickStep(duration: number) {
  if (duration <= 6) return 0.5;
  if (duration <= 16) return 1;
  if (duration <= 40) return 2;
  return 5;
}

export function KeyframeTimelineEditor({
  defaultKeyframes = [],
  durationSeconds = 5,
  keyframes,
  objects,
  onClose,
  onKeyframesChange,
  open,
  presentation = "modal",
  title = "Keyframe timeline",
}: KeyframeTimelineEditorProps) {
  const duration = Math.max(0.1, durationSeconds);
  const tracks = useMemo(() => buildTracks(objects), [objects]);
  const [localKeyframes, setLocalKeyframes] = useState<TimelineKeyframe[]>(() =>
    defaultKeyframes.map((keyframe) => ({ ...keyframe })),
  );
  const activeKeyframes = keyframes ?? localKeyframes;
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selectedTrackId, setSelectedTrackId] = useState(
    tracks[0] ? trackId(tracks[0].object.id, tracks[0].property) : "",
  );
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(
    null,
  );
  const [collapsedObjects, setCollapsedObjects] = useState<Set<string>>(
    () => new Set(),
  );

  const resolvedSelectedTrackId = tracks.some(
    (track) => trackId(track.object.id, track.property) === selectedTrackId,
  )
    ? selectedTrackId
    : tracks[0]
      ? trackId(tracks[0].object.id, tracks[0].property)
      : "";
  const selectedTrack =
    tracks.find(
      (track) =>
        trackId(track.object.id, track.property) === resolvedSelectedTrackId,
    ) ?? tracks[0];
  const selectedKeyframe =
    activeKeyframes.find((keyframe) => keyframe.id === selectedKeyframeId) ??
    null;

  const commitKeyframes = useCallback(
    (nextKeyframes: TimelineKeyframe[]) => {
      const sorted = [...nextKeyframes].sort((left, right) => {
        if (left.objectId !== right.objectId) {
          return left.objectId.localeCompare(right.objectId);
        }
        if (left.property !== right.property) {
          return left.property.localeCompare(right.property);
        }
        return left.time - right.time;
      });
      if (keyframes === undefined) setLocalKeyframes(sorted);
      onKeyframesChange?.(sorted);
    },
    [keyframes, onKeyframesChange],
  );

  const close = useCallback(() => {
    setPlaying(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

  useEffect(() => {
    if (!open || !playing) return;
    const timer = window.setInterval(() => {
      setPlayhead((current) => {
        const next = current + 0.05;
        return next > duration ? 0 : next;
      });
    }, 50);
    return () => window.clearInterval(timer);
  }, [duration, open, playing]);

  const addKeyframe = () => {
    if (!selectedTrack) return;
    const existing = activeKeyframes.find(
      (keyframe) =>
        keyframe.objectId === selectedTrack.object.id &&
        keyframe.property === selectedTrack.property &&
        Math.abs(keyframe.time - playhead) < 0.001,
    );
    if (existing) {
      setSelectedKeyframeId(existing.id);
      return;
    }

    const nextKeyframe: TimelineKeyframe = {
      easing: "ease-in-out",
      id: createKeyframeId(),
      objectId: selectedTrack.object.id,
      property: selectedTrack.property,
      time: Number(playhead.toFixed(2)),
      value: defaultValueForTrack(selectedTrack),
    };
    commitKeyframes([...activeKeyframes, nextKeyframe]);
    setSelectedKeyframeId(nextKeyframe.id);
  };

  const updateSelectedKeyframe = (patch: Partial<TimelineKeyframe>) => {
    if (!selectedKeyframe) return;
    commitKeyframes(
      activeKeyframes.map((keyframe) =>
        keyframe.id === selectedKeyframe.id
          ? { ...keyframe, ...patch }
          : keyframe,
      ),
    );
  };

  const deleteSelectedKeyframe = () => {
    if (!selectedKeyframe) return;
    commitKeyframes(
      activeKeyframes.filter((keyframe) => keyframe.id !== selectedKeyframe.id),
    );
    setSelectedKeyframeId(null);
  };

  const duplicateSelectedKeyframe = () => {
    if (!selectedKeyframe) return;
    const forwardTime = selectedKeyframe.time + 0.1;
    const duplicate: TimelineKeyframe = {
      ...selectedKeyframe,
      id: createKeyframeId(),
      time: Number(
        (forwardTime <= duration
          ? forwardTime
          : Math.max(0, selectedKeyframe.time - 0.1)
        ).toFixed(2),
      ),
    };
    commitKeyframes([...activeKeyframes, duplicate]);
    setSelectedKeyframeId(duplicate.id);
    setPlayhead(duplicate.time);
  };

  const toggleObject = (objectId: string) => {
    setCollapsedObjects((current) => {
      const next = new Set(current);
      if (next.has(objectId)) next.delete(objectId);
      else next.add(objectId);
      return next;
    });
  };

  const handlePlay = () => {
    if (!playing && playhead >= duration) setPlayhead(0);
    setPlaying((current) => !current);
  };

  if (!open) return null;

  const timelineWidth = clamp(Math.round(duration * 92 * zoom), 720, 12000);
  const step = tickStep(duration);
  const ticks = Array.from(
    { length: Math.floor(duration / step) + 1 },
    (_, index) => Number((index * step).toFixed(2)),
  );
  if (ticks.at(-1) !== duration) ticks.push(duration);

  const editor = (
    <section
      aria-label={title}
      aria-modal={presentation === "modal" || undefined}
      className={styles.editor}
      role="dialog"
      style={{ "--timeline-width": `${timelineWidth}px` } as CSSProperties}
    >
      <header className={styles.header}>
        <div>
          <h2>{title}</h2>
          <p>
            {objects.length} {objects.length === 1 ? "object" : "objects"} ·{" "}
            {duration.toFixed(2)} s
          </p>
        </div>
        <button
          aria-label="Close keyframe editor"
          className={styles.iconButton}
          onClick={close}
          title="Close"
          type="button"
        >
          <X aria-hidden="true" size={17} />
        </button>
      </header>

      <div aria-label="Timeline controls" className={styles.toolbar}>
        <button
          aria-label={playing ? "Pause timeline" : "Play timeline"}
          className={`${styles.iconButton} ${styles.playButton}`}
          onClick={handlePlay}
          type="button"
        >
          {playing ? (
            <Pause aria-hidden="true" size={15} fill="currentColor" />
          ) : (
            <Play aria-hidden="true" size={15} fill="currentColor" />
          )}
        </button>
        <label className={styles.timeField}>
          <span>Playhead</span>
          <input
            aria-label="Playhead time"
            max={duration}
            min={0}
            onChange={(event) =>
              setPlayhead(clamp(Number(event.target.value) || 0, 0, duration))
            }
            step={0.01}
            type="number"
            value={Number(playhead.toFixed(2))}
          />
          <span>s</span>
        </label>

        <span aria-hidden="true" className={styles.toolbarDivider} />

        <button
          aria-label="Add keyframe at playhead"
          className={styles.textButton}
          disabled={!selectedTrack}
          onClick={addKeyframe}
          type="button"
        >
          <Diamond aria-hidden="true" size={13} />
          Add keyframe
        </button>
        <button
          aria-label="Duplicate selected keyframe"
          className={styles.iconButton}
          disabled={!selectedKeyframe}
          onClick={duplicateSelectedKeyframe}
          title="Duplicate keyframe"
          type="button"
        >
          <Copy aria-hidden="true" size={14} />
        </button>
        <button
          aria-label="Delete selected keyframe"
          className={styles.iconButton}
          disabled={!selectedKeyframe}
          onClick={deleteSelectedKeyframe}
          title="Delete keyframe"
          type="button"
        >
          <Trash2 aria-hidden="true" size={14} />
        </button>

        <div className={styles.zoomControls}>
          <button
            aria-label="Zoom timeline out"
            className={styles.iconButton}
            disabled={zoom <= 0.5}
            onClick={() =>
              setZoom((current) => clamp(current - 0.25, 0.5, 2.5))
            }
            type="button"
          >
            <Minus aria-hidden="true" size={13} />
          </button>
          <output aria-label="Timeline zoom">{Math.round(zoom * 100)}%</output>
          <button
            aria-label="Zoom timeline in"
            className={styles.iconButton}
            disabled={zoom >= 2.5}
            onClick={() =>
              setZoom((current) => clamp(current + 0.25, 0.5, 2.5))
            }
            type="button"
          >
            <Plus aria-hidden="true" size={13} />
          </button>
        </div>
      </div>

      <div className={styles.workspace}>
        <div className={styles.timelinePane}>
          {objects.length === 0 ? (
            <div className={styles.emptyState}>
              Select one or more objects to edit their keyframes.
            </div>
          ) : (
            <div className={styles.timelineScroller}>
              <div className={styles.rulerRow}>
                <div className={styles.cornerCell}>PROPERTY</div>
                <div className={styles.ruler}>
                  {ticks.map((tick) => (
                    <span
                      className={styles.tick}
                      key={tick}
                      style={{ left: `${(tick / duration) * 100}%` }}
                    >
                      <span>{tick.toFixed(tick % 1 === 0 ? 0 : 1)}s</span>
                    </span>
                  ))}
                  <span
                    aria-hidden="true"
                    className={styles.rulerPlayhead}
                    style={{ left: `${(playhead / duration) * 100}%` }}
                  />
                </div>
              </div>

              {objects.map((object) => {
                const collapsed = collapsedObjects.has(object.id);
                const objectTracks = tracks.filter(
                  (track) => track.object.id === object.id,
                );
                return (
                  <div className={styles.objectGroup} key={object.id}>
                    <button
                      aria-expanded={!collapsed}
                      aria-label={`Toggle ${object.name} tracks`}
                      className={styles.objectHeader}
                      onClick={() => toggleObject(object.id)}
                      type="button"
                    >
                      {collapsed ? (
                        <ChevronRight aria-hidden="true" size={13} />
                      ) : (
                        <ChevronDown aria-hidden="true" size={13} />
                      )}
                      <span className={styles.objectDot} />
                      <strong>{object.name}</strong>
                      <span className={styles.dimensionBadge}>
                        {object.dimension === "3d" ? "3D" : "2D"}
                      </span>
                    </button>
                    {!collapsed
                      ? objectTracks.map((track) => {
                          const id = trackId(object.id, track.property);
                          const selected = id === resolvedSelectedTrackId;
                          const trackKeyframes = activeKeyframes.filter(
                            (keyframe) =>
                              keyframe.objectId === object.id &&
                              keyframe.property === track.property,
                          );
                          return (
                            <div
                              className={`${styles.trackRow} ${selected ? styles.selectedTrack : ""}`}
                              key={id}
                            >
                              <button
                                aria-label={`Select ${object.name} ${track.label} track`}
                                className={styles.trackLabel}
                                onClick={() => setSelectedTrackId(id)}
                                type="button"
                              >
                                <span>{track.label}</span>
                                {track.unit ? (
                                  <small>{track.unit}</small>
                                ) : null}
                              </button>
                              <div
                                aria-label={`${object.name} ${track.label} timeline`}
                                className={styles.trackLane}
                                onClick={(event) => {
                                  setSelectedTrackId(id);
                                  const bounds =
                                    event.currentTarget.getBoundingClientRect();
                                  if (bounds.width > 0) {
                                    setPlayhead(
                                      clamp(
                                        ((event.clientX - bounds.left) /
                                          bounds.width) *
                                          duration,
                                        0,
                                        duration,
                                      ),
                                    );
                                  }
                                }}
                              >
                                <span className={styles.trackCenterLine} />
                                <span
                                  aria-hidden="true"
                                  className={styles.trackPlayhead}
                                  style={{
                                    left: `${(playhead / duration) * 100}%`,
                                  }}
                                />
                                {trackKeyframes.map((keyframe) => (
                                  <button
                                    aria-label={`Keyframe ${object.name} ${track.label} at ${formatTime(keyframe.time)}`}
                                    aria-pressed={
                                      selectedKeyframeId === keyframe.id
                                    }
                                    className={styles.keyframe}
                                    key={keyframe.id}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedTrackId(id);
                                      setSelectedKeyframeId(keyframe.id);
                                      setPlayhead(keyframe.time);
                                    }}
                                    style={{
                                      left: `${(keyframe.time / duration) * 100}%`,
                                    }}
                                    title={`${formatTime(keyframe.time)} · ${keyframe.value}${track.unit}`}
                                    type="button"
                                  >
                                    <span />
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <aside aria-label="Keyframe inspector" className={styles.inspector}>
          <div className={styles.inspectorHeading}>
            <span>KEYFRAME</span>
            {selectedKeyframe ? (
              <span className={styles.selectedDiamond} aria-hidden="true" />
            ) : null}
          </div>
          {selectedKeyframe ? (
            <KeyframeInspector
              duration={duration}
              keyframe={selectedKeyframe}
              object={objects.find(
                (object) => object.id === selectedKeyframe.objectId,
              )}
              onChange={updateSelectedKeyframe}
              track={tracks.find(
                (track) =>
                  track.object.id === selectedKeyframe.objectId &&
                  track.property === selectedKeyframe.property,
              )}
            />
          ) : (
            <div className={styles.inspectorEmpty}>
              <Diamond aria-hidden="true" size={22} />
              <p>
                Select a keyframe diamond to edit its time, value, and easing.
              </p>
            </div>
          )}
        </aside>
      </div>

      <footer className={styles.footer}>
        <span>
          Click a track to move the playhead, then add a keyframe. Changes stay
          local until the parent handles them.
        </span>
        <button className={styles.doneButton} onClick={close} type="button">
          Done
        </button>
      </footer>
    </section>
  );

  if (presentation === "inline") {
    return <div className={styles.inlineHost}>{editor}</div>;
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) close();
      }}
    >
      {editor}
    </div>,
    document.body,
  );
}

function KeyframeInspector({
  duration,
  keyframe,
  object,
  onChange,
  track,
}: {
  duration: number;
  keyframe: TimelineKeyframe;
  object?: KeyframeTimelineObject;
  onChange: (patch: Partial<TimelineKeyframe>) => void;
  track?: TrackDefinition;
}) {
  const updateNumericValue = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (!Number.isNaN(value)) onChange({ value });
  };
  const materialOptions = object?.materialNames ?? [];

  return (
    <div className={styles.inspectorFields}>
      <div className={styles.selectionSummary}>
        <strong>{object?.name ?? keyframe.objectId}</strong>
        <span>{track?.label ?? keyframe.property}</span>
      </div>
      <label className={styles.field}>
        <span>Time</span>
        <span className={styles.inputWithUnit}>
          <input
            aria-label="Keyframe time"
            max={duration}
            min={0}
            onChange={(event) =>
              onChange({
                time: clamp(Number(event.target.value) || 0, 0, duration),
              })
            }
            step={0.01}
            type="number"
            value={keyframe.time}
          />
          <small>s</small>
        </span>
      </label>
      <label className={styles.field}>
        <span>Value</span>
        {keyframe.property === "material" ? (
          <select
            aria-label="Keyframe value"
            onChange={(event) => onChange({ value: event.target.value })}
            value={String(keyframe.value)}
          >
            {materialOptions.map((material) => (
              <option key={material} value={material}>
                {material}
              </option>
            ))}
          </select>
        ) : (
          <span className={styles.inputWithUnit}>
            <input
              aria-label="Keyframe value"
              onChange={updateNumericValue}
              step={0.01}
              type="number"
              value={Number(keyframe.value)}
            />
            {track?.unit ? <small>{track.unit}</small> : null}
          </span>
        )}
      </label>
      <label className={styles.field}>
        <span>Easing</span>
        <select
          aria-label="Keyframe easing"
          onChange={(event) =>
            onChange({ easing: event.target.value as KeyframeEasing })
          }
          value={keyframe.easing}
        >
          {easingOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {keyframe.easing === "custom" ? (
        <label className={styles.field}>
          <span>Curve</span>
          <input
            aria-label="Custom curve"
            onChange={(event) => onChange({ customCurve: event.target.value })}
            placeholder="0.25, 0.10, 0.25, 1"
            type="text"
            value={keyframe.customCurve ?? ""}
          />
        </label>
      ) : null}
      <div className={styles.curvePreview} data-easing={keyframe.easing}>
        <span />
        <small>
          {
            easingOptions.find((option) => option.value === keyframe.easing)
              ?.label
          }
        </small>
      </div>
    </div>
  );
}
