"use client";

/* Pointer gestures intentionally use refs for mutable, event-only state. */
/* eslint-disable react-hooks/refs */

import {
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Minus,
  Monitor,
  MoreVertical,
  Music2,
  Plus,
  Redo2,
  Search,
  Smartphone,
  Tablet,
  Undo2,
  Unlock,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import {
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
  useRef,
  useState,
} from "react";
import {
  INTERFACE_SCALE_OPTIONS,
  INTERFACE_SCALE_STORAGE_KEY,
  LEGACY_INTERFACE_SCALE_STORAGE_KEY,
  type InterfaceScaleMode,
  interfaceScaleFactor,
  migrateInterfaceScaleMode,
  resolveInterfaceScale,
} from "@/features/editor/lib/interface-scale";
import { extractEmbeddedAudioArtwork } from "@/features/editor/lib/audio-artwork";
import {
  type BackgroundMusicSettings,
  type BackgroundMusicAsset,
  type CanvasElement,
  type ArtboardSettings,
  type InteractionSoundEvent,
  type InteractionSoundSettings,
  type InteractionSoundTrigger,
  type PathfinderOperation,
  type ShapeType,
  type SoundAdvancedSettings,
  type SoundMixerSettings,
  type VectorPath,
  defaultBackgroundMusicSettings,
  defaultInteractionSoundSettings,
  defaultSoundAdvancedSettings,
  defaultSoundMixerSettings,
  useEditorStore,
} from "@/features/editor/store/editor-store";
import { assetPath } from "@/lib/asset-path";

import {
  backgroundMediaStyle,
  backgroundMediaType,
  gradientCssForArtboard,
  gradientCssFromStops,
  gradientStopsForArtboard,
  hasGradientBackground,
  hasSolidBackground,
  mediaObjectFit,
} from "@/features/editor/lib/artboard-style";
import {
  clearElementMovePreview,
  collectMovePreviewTargets,
  collectMultiResizePreviewTargets,
  collectResizePreviewTargets,
  dragPointerSample,
  elementAtClientPoint,
  guideAtClientPoint,
  isEditableTarget,
  localPointFromElement,
  previewArtboardPan,
  previewDistanceMeasurements,
  previewDrawDraft,
  previewElementMove,
  previewElementResize,
  previewMarquee,
  previewMultiElementResize,
  previewSmartGuides,
  selectionOutlineGeometry,
  type SelectionStrokePlacement,
} from "@/features/editor/lib/dom-preview";
import {
  designAssetDimensions,
  distancePreviewSlotCount,
  fontSizePresets,
  fontWeightOptions,
  pathfinderLayerAssets,
  rotationPresets,
  shapeNames,
  shapeOptions,
  toolIndicatorMetrics,
  tools,
} from "@/features/editor/lib/editor-constants";
import {
  type DistanceMeasurement,
  type DragPointerSample,
  type DrawDraft,
  type EditorGuide,
  type ElementRect,
  type Gesture,
  type GuideDrag,
  type HandleMirroring,
  type ImageResizeHandle,
  type NavigatorViewport,
  type PenAnchor,
  type PenDraft,
  type Point,
  type PropertyTab,
  type ResizeHandle,
  type VectorHandleRef,
  type VectorPointRef,
} from "@/features/editor/lib/editor-types";
import { createElementId } from "@/features/editor/lib/element-id";
import {
  colorInputValue,
  colorWithOpacity,
  strokeDasharrayForElement,
  textStyleForElement,
} from "@/features/editor/lib/element-style";
import {
  resizedBoundsFromCorner,
  resizeElementWithinSelection,
} from "@/features/editor/lib/element-transform";
import {
  boundsFromElements,
  boundsFromPointList,
  boundsFromPoints,
  calculateCanvasFitZoom,
  clamp,
  constrainAngle,
  elementLocalPoint,
  elementWorldPathPoint,
  elementWorldPoint,
  intersects,
  lineDraftGeometry,
  lineEndpoints,
  lineGeometry,
  offsetRect,
  rectFromElement,
  sourceCornerIndexForVisualPosition,
  visualFlipTransform,
} from "@/features/editor/lib/geometry";
import {
  fittedImageSize,
  imageCropForElement,
} from "@/features/editor/lib/image-crop";
import {
  pathfinderElement,
  ringWithoutClosingPoint,
  splitPathfinderElements,
} from "@/features/editor/lib/pathfinder";
import {
  polygonCornerIndicatorPaths,
  polygonCornerRadii,
  polygonCornerRadiusValues,
  polygonPointsForElement,
  polygonPointString,
  roundedPolygonPath,
  roundedRectanglePoints,
} from "@/features/editor/lib/polygon";
import {
  drawRuler,
  prepareRulerCanvas,
  rulerSize,
} from "@/features/editor/lib/rulers";
import {
  expandGroupedSelection,
  selectionIdsForElement,
} from "@/features/editor/lib/selection";
import {
  areDistanceMeasurementsEqual,
  buildDistanceMeasurements,
  buildDistanceMeasurementsFromGuide,
  buildGuideDistanceMeasurements,
  buildSmartSnap,
} from "@/features/editor/lib/smart-guides";
import {
  calculateInteractionSoundVolume,
  chooseInteractionSoundAsset,
  effectiveBackgroundMusicVolume,
  fadeInteractionSoundToSilence,
  type InteractionSoundPlaybackCursor,
  startInteractionSoundEnvelope,
} from "@/features/editor/lib/sound-playback";
import {
  backgroundMusicStartOptions,
  formatAudioSize,
  formatAudioTime,
  interactionSoundEvents,
  interactionSoundPlaybackOptions,
  interactionSoundTriggerOptions,
  isBackgroundMusicStartMode,
  isSoundOutputQuality,
  isSoundPreloadMode,
  normalizedInteractionSound,
  soundOutputBitrate,
  soundOutputQualityOptions,
  soundPreloadAttribute,
  soundPreloadOptions,
  supportsInteractionSounds,
} from "@/features/editor/lib/sound-settings";
import {
  clearOrphanedVectorHandles,
  cloneVectorPaths,
  mirroredHandle,
  nearestVectorPathPosition,
  pathData,
  penHandleLineStyle,
  splitVectorSegment,
  vectorElementGeometryUpdate,
  vectorHandleKey,
  vectorPathsForElement,
  vectorPointKey,
  vectorVisualGeometryPoints,
} from "@/features/editor/lib/vector-path";

function ArtboardBackground({
  artboard,
  playVideo = true,
}: {
  artboard: ArtboardSettings;
  playVideo?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaType = backgroundMediaType(artboard);
  const autoPlay = artboard.backgroundAutoPlay ?? true;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!autoPlay) {
      video.pause();
      return;
    }
    const playResult = video.play();
    playResult?.catch(() => {
      // Browsers can block unmuted autoplay; the selected mute state is preserved.
    });
  }, [autoPlay, artboard.backgroundVideo]);

  return (
    <div aria-hidden="true" className="artboard-background">
      {hasSolidBackground(artboard) ? (
        <span
          className="artboard-background-layer"
          style={{
            backgroundColor: colorWithOpacity(
              artboard.background,
              artboard.backgroundOpacity ?? 100,
            ),
          }}
        />
      ) : null}
      {hasGradientBackground(artboard) ? (
        <span
          className="artboard-background-layer"
          data-background-layer="gradient"
          style={{ backgroundImage: gradientCssForArtboard(artboard) }}
        />
      ) : null}
      {mediaType === "image" && artboard.backgroundImage ? (
        <span
          className="artboard-background-layer"
          data-background-layer="image"
          style={backgroundMediaStyle(artboard)}
        />
      ) : null}
      {mediaType === "video" && artboard.backgroundVideo && playVideo ? (
        <span
          className="artboard-background-layer"
          style={{ opacity: (artboard.backgroundImageOpacity ?? 100) / 100 }}
        >
          <video
            autoPlay={autoPlay}
            loop={artboard.backgroundLoop ?? true}
            muted={artboard.backgroundMute ?? true}
            playsInline
            ref={videoRef}
            src={artboard.backgroundVideo}
            style={{ objectFit: mediaObjectFit(artboard) }}
          />
        </span>
      ) : null}
    </div>
  );
}

function DesignNumberField({
  ariaLabel,
  label,
  max,
  min,
  onChange,
  precision,
  unit = "px",
  value,
  disabled = false,
}: {
  ariaLabel?: string;
  label: string;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  precision?: number;
  unit?: string;
  value: number;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const displayValue =
    precision === undefined ? value : Number(value.toFixed(precision));

  return (
    <label
      className={[
        label ? "number-field" : "number-field number-field--bare",
        unit ? null : "number-field--unitless",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label ? <span className="number-prefix">{label}</span> : null}
      <input
        aria-label={ariaLabel ?? (label || unit)}
        disabled={disabled}
        max={max}
        min={min}
        onBlur={() => setDraft(null)}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setDraft(nextDraft);
          if (!nextDraft.trim()) return;
          const next = Number(nextDraft);
          if (!Number.isNaN(next)) onChange(next);
        }}
        onFocus={(event) => {
          setDraft(event.currentTarget.value);
          event.currentTarget.select();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        step={precision === undefined ? undefined : 10 ** -precision}
        type="number"
        value={draft ?? displayValue}
      />
      {unit ? (
        <span
          className={
            unit === "%" ? "number-unit number-unit--percent" : "number-unit"
          }
        >
          {unit}
        </span>
      ) : null}
    </label>
  );
}

function DesignDropdown({
  ariaLabel,
  className = "",
  disabled = false,
  noScroll = false,
  onChange,
  options,
  overlay = false,
  style,
  toggleIcon,
  value,
}: {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  noScroll?: boolean;
  onChange: (value: string) => void;
  options: readonly {
    label: string;
    strokePreview?: CanvasElement["strokeStyle"];
    value: string;
  }[];
  overlay?: boolean;
  style?: CSSProperties;
  toggleIcon?: ReactNode;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div
      className={[
        "design-dropdown",
        overlay ? "design-dropdown--overlay" : "",
        noScroll ? "is-no-scroll" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
      style={style}
    >
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="design-dropdown-toggle"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {!overlay ? (
          <span className="design-dropdown-value">
            {selectedOption?.label ?? value}
          </span>
        ) : null}
      </button>
      <span aria-hidden="true" className="design-dropdown-icon">
        {toggleIcon ?? <ChevronDown size={9} strokeWidth={1.25} />}
      </span>
      {open ? (
        <div
          aria-label={`${ariaLabel} menu`}
          className="design-dropdown-menu"
          role="listbox"
        >
          {options.map((option) => (
            <button
              aria-selected={option.value === value}
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              role="option"
              type="button"
            >
              {option.strokePreview ? (
                <>
                  <span
                    aria-hidden="true"
                    className={`design-dropdown-stroke-preview is-${option.strokePreview}`}
                  />
                  <span className="visually-hidden">{option.label}</span>
                </>
              ) : (
                option.label
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DesignRotationField({
  disabled = false,
  onChange,
  value,
}: {
  disabled?: boolean;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <div className="rotation-input">
      <input
        aria-label="Rotation"
        disabled={disabled}
        max={360}
        min={-360}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (!Number.isNaN(next)) onChange(next);
        }}
        style={
          {
            "--rotation-character-count": Math.max(1, String(value).length),
          } as CSSProperties
        }
        type="number"
        value={value}
      />
      <span aria-hidden="true" className="rotation-degree">
        °
      </span>
      <DesignDropdown
        disabled={disabled}
        ariaLabel="Rotation presets"
        noScroll
        onChange={(rotation) => onChange(Number(rotation))}
        options={rotationPresets.map((rotation) => ({
          label: `${rotation}°`,
          value: String(rotation),
        }))}
        overlay
        value={String(((Math.round(value) % 360) + 360) % 360)}
      />
    </div>
  );
}

function DesignRange({
  ariaLabel,
  className,
  disabled = false,
  max,
  min,
  onBegin,
  onChange,
  value,
}: {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  max: number;
  min: number;
  onBegin?: () => void;
  onChange: (value: number) => void;
  value: number;
}) {
  const progress = clamp((value - min) / Math.max(1, max - min), 0, 1);

  return (
    <label
      className={`design-range${className ? ` ${className}` : ""}`}
      style={{ "--design-range-progress": progress } as CSSProperties}
    >
      <span aria-hidden="true" className="design-range-track">
        <span className="design-range-fill" />
        <span className="design-range-thumb" />
      </span>
      <input
        aria-label={ariaLabel}
        disabled={disabled}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        onKeyDown={(event) => {
          if (
            [
              "ArrowDown",
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "End",
              "Home",
              "PageDown",
              "PageUp",
            ].includes(event.key)
          ) {
            onBegin?.();
          }
        }}
        onPointerDown={onBegin}
        type="range"
        value={value}
      />
    </label>
  );
}

function DesignColorField({
  disabled = false,
  label,
  onBegin,
  onChange,
  value,
}: {
  disabled?: boolean;
  label: string;
  onBegin?: () => void;
  onChange: (value: string) => void;
  value: string;
}) {
  const colorValue = colorInputValue(value);
  const pendingColor = useRef<string | null>(null);
  const colorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const flushColorChange = () => {
    if (colorTimer.current) {
      clearTimeout(colorTimer.current);
      colorTimer.current = null;
    }
    const nextColor = pendingColor.current;
    pendingColor.current = null;
    if (nextColor !== null) onChangeRef.current(nextColor);
  };

  const scheduleColorChange = (nextColor: string) => {
    pendingColor.current = nextColor;
    if (colorTimer.current) return;
    colorTimer.current = setTimeout(() => {
      colorTimer.current = null;
      const queuedColor = pendingColor.current;
      pendingColor.current = null;
      if (queuedColor !== null) onChangeRef.current(queuedColor);
    }, 40);
  };

  useEffect(
    () => () => {
      if (colorTimer.current) clearTimeout(colorTimer.current);
    },
    [],
  );

  return (
    <label className="color-field">
      <input
        aria-label={`${label} swatch`}
        disabled={disabled}
        onBlur={flushColorChange}
        onChange={(event) => scheduleColorChange(event.target.value)}
        onFocus={onBegin}
        type="color"
        value={colorValue}
      />
      <input
        aria-label={label}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onBegin}
        type="text"
        value={value}
      />
    </label>
  );
}

function DesignIconButton({
  asset,
  disabled = false,
  icon: Icon,
  label,
  onClick,
  pressed,
}: {
  asset?: string;
  disabled?: boolean;
  icon?: LucideIcon;
  label: string;
  onClick?: () => void;
  pressed?: boolean;
}) {
  const assetDimensions = asset
    ? (designAssetDimensions[asset] ?? { height: 18, width: 18 })
    : null;

  return (
    <button
      aria-label={label}
      aria-pressed={pressed}
      className="icon-control"
      data-asset={asset}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {asset ? (
        // The panel assets are intentionally rendered at the exact Figma bounds.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          aria-hidden="true"
          draggable={false}
          height={assetDimensions?.height ?? 18}
          src={assetPath(`/figma/design/${encodeURIComponent(asset)}`)}
          width={assetDimensions?.width ?? 18}
        />
      ) : Icon ? (
        <Icon aria-hidden="true" size={14} strokeWidth={1.25} />
      ) : null}
    </button>
  );
}

type SceneBackgroundType = "solid" | "gradation" | "image" | "video";

const sceneBackgroundTypes: {
  label: string;
  value: SceneBackgroundType;
}[] = [
  { label: "Solid", value: "solid" },
  { label: "Gradation", value: "gradation" },
  { label: "Image", value: "image" },
  { label: "Video", value: "video" },
];

function SceneModeTabs({
  active,
  ariaLabel,
  onToggle,
}: {
  active: SceneBackgroundType[];
  ariaLabel: string;
  onToggle: (type: SceneBackgroundType) => void;
}) {
  return (
    <div aria-label={ariaLabel} className="scene-mode-tabs" role="group">
      {sceneBackgroundTypes.map((type) => (
        <button
          aria-pressed={active.includes(type.value)}
          className={active.includes(type.value) ? "is-active" : ""}
          key={type.value}
          onClick={() => onToggle(type.value)}
          type="button"
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}

function SceneCheckbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="scene-checkbox">
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span aria-hidden="true" className="scene-checkbox-box">
        {/* The SVG remains mounted so checked and unchecked boxes have identical geometry. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          className={checked ? "" : "is-hidden"}
          draggable={false}
          src={assetPath("/figma/scenes-check.svg")}
        />
      </span>
      <span>{label}</span>
    </label>
  );
}

function SceneColorField({
  ariaLabel,
  onChange,
  value,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const pendingColor = useRef<string | null>(null);
  const colorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (colorTimer.current) clearTimeout(colorTimer.current);
    },
    [],
  );

  const queueColor = (nextColor: string) => {
    pendingColor.current = nextColor;
    if (colorTimer.current) return;
    colorTimer.current = setTimeout(() => {
      colorTimer.current = null;
      const queuedColor = pendingColor.current;
      pendingColor.current = null;
      if (queuedColor) onChange(queuedColor);
    }, 40);
  };

  return (
    <label className="scene-color-field">
      <input
        aria-label={`${ariaLabel} swatch`}
        className="scene-color-swatch"
        onBlur={() => {
          if (colorTimer.current) clearTimeout(colorTimer.current);
          colorTimer.current = null;
          if (pendingColor.current) onChange(pendingColor.current);
          pendingColor.current = null;
          setDraft(null);
        }}
        onChange={(event) => {
          setDraft(event.target.value.slice(1).toUpperCase());
          queueColor(event.target.value);
        }}
        type="color"
        value={colorInputValue(value)}
      />
      <span aria-hidden="true">#</span>
      <input
        aria-label={ariaLabel}
        className="scene-color-value"
        maxLength={6}
        onBlur={() => setDraft(null)}
        onChange={(event) => {
          const next = event.target.value
            .replace(/[^\da-f]/gi, "")
            .slice(0, 6)
            .toUpperCase();
          setDraft(next);
          if (next.length === 6) onChange(`#${next}`);
        }}
        value={draft ?? value.replace(/^#/, "").toUpperCase()}
      />
    </label>
  );
}

function ScenePercentField({
  ariaLabel,
  onChange,
  value,
  wide = false,
}: {
  ariaLabel: string;
  onChange: (value: number) => void;
  value: number;
  wide?: boolean;
}) {
  return (
    <label
      className={wide ? "scene-percent-field is-wide" : "scene-percent-field"}
    >
      <input
        aria-label={ariaLabel}
        max={100}
        min={0}
        onChange={(event) =>
          onChange(clamp(Number(event.target.value), 0, 100))
        }
        type="number"
        value={Math.round(value)}
      />
      <span>%</span>
    </label>
  );
}

function ScenePanel({
  activePageId,
  activePageName,
  artboard,
  onRenamePage,
  onUpdateArtboard,
}: {
  activePageId: string;
  activePageName: string;
  artboard: ArtboardSettings;
  onRenamePage: (pageId: string, name: string) => void;
  onUpdateArtboard: (updates: Partial<ArtboardSettings>) => void;
}) {
  const [pageNameDraft, setPageNameDraft] = useState<string | null>(null);
  const backgroundUploadRef = useRef<HTMLInputElement>(null);
  const pageName = pageNameDraft ?? activePageName;
  const pageAspectRatio = artboard.pageAspectRatio ?? "16:9";
  const pageType = artboard.pageType ?? "screen";
  const viewportMode = artboard.viewportMode ?? "fit";
  const solidBackgroundEnabled = hasSolidBackground(artboard);
  const gradientBackgroundEnabled = hasGradientBackground(artboard);
  const mediaBackgroundType = backgroundMediaType(artboard);
  const gradientStops = gradientStopsForArtboard(artboard);
  const isVideoBackground = mediaBackgroundType === "video";
  const isMediaBackground = Boolean(mediaBackgroundType);
  const backgroundMedia = isVideoBackground
    ? artboard.backgroundVideo
    : artboard.backgroundImage;
  const activeBackgroundTypes: SceneBackgroundType[] = [
    ...(solidBackgroundEnabled ? (["solid"] as const) : []),
    ...(gradientBackgroundEnabled ? (["gradation"] as const) : []),
    ...(mediaBackgroundType ? [mediaBackgroundType] : []),
  ];
  const solidControlTop = 289;
  const gradientControlTop = solidBackgroundEnabled
    ? solidControlTop + 39
    : solidControlTop;
  const mediaControlTop = gradientBackgroundEnabled
    ? gradientControlTop + 93 + gradientStops.length * 32
    : solidBackgroundEnabled
      ? solidControlTop + 39
      : solidControlTop;

  const commitPageName = () => {
    const nextName = pageName.trim();
    if (!nextName) {
      setPageNameDraft(null);
      return;
    }
    onRenamePage(activePageId, nextName);
    setPageNameDraft(null);
  };

  const updatePageWidth = (width: number) => {
    onUpdateArtboard({
      width: Number.isFinite(width) ? Math.max(0, width) : 0,
    });
  };

  const updatePageHeight = (height: number) => {
    onUpdateArtboard({
      height: Number.isFinite(height) ? Math.max(0, height) : 0,
    });
  };

  const toggleBackgroundType = (type: SceneBackgroundType) => {
    if (type === "solid") {
      onUpdateArtboard({
        backgroundSolidEnabled: !solidBackgroundEnabled,
        backgroundType: undefined,
      });
      return;
    }
    if (type === "gradation") {
      onUpdateArtboard({
        backgroundGradientEnabled: !gradientBackgroundEnabled,
        backgroundType: undefined,
      });
      return;
    }
    onUpdateArtboard({
      backgroundMediaType: mediaBackgroundType === type ? undefined : type,
      backgroundType: undefined,
    });
  };

  const updateGradientStop = (
    index: number,
    updates: Partial<(typeof gradientStops)[number]>,
  ) => {
    onUpdateArtboard({
      gradientStops: gradientStops
        .map((stop, stopIndex) =>
          stopIndex === index ? { ...stop, ...updates } : stop,
        )
        .sort((first, second) => first.position - second.position),
    });
  };

  const addGradientStop = () => {
    if (gradientStops.length >= 6) return;
    let insertAfter = 0;
    let widestGap = -1;
    for (let index = 0; index < gradientStops.length - 1; index += 1) {
      const gap =
        gradientStops[index + 1].position - gradientStops[index].position;
      if (gap > widestGap) {
        widestGap = gap;
        insertAfter = index;
      }
    }
    const left = gradientStops[insertAfter];
    const right = gradientStops[insertAfter + 1] ?? left;
    onUpdateArtboard({
      gradientStops: [
        ...gradientStops,
        {
          color: left.color,
          opacity: Math.round((left.opacity + right.opacity) / 2),
          position: Math.round((left.position + right.position) / 2),
        },
      ].sort((first, second) => first.position - second.position),
    });
  };

  const previewGradientStopPosition = (
    handle: HTMLElement,
    index: number,
    clientX: number,
  ) => {
    const preview = handle.parentElement;
    const bounds = preview?.getBoundingClientRect();
    if (!preview || !bounds?.width) return;
    const position = Math.round(
      clamp(((clientX - bounds.left) / bounds.width) * 100, 0, 100),
    );
    const nextStops = gradientStops
      .map((stop, stopIndex) =>
        stopIndex === index ? { ...stop, position } : stop,
      )
      .sort((first, second) => first.position - second.position);
    handle.dataset.dragPosition = String(position);
    handle.style.left = `calc(${position}% - 3.5px)`;
    const nextGradient = gradientCssFromStops(artboard, nextStops);
    preview.style.background = nextGradient;
    document
      .querySelectorAll<HTMLElement>('[data-background-layer="gradient"]')
      .forEach((layer) => {
        layer.style.backgroundImage = nextGradient;
      });
  };

  const commitGradientStopPosition = (handle: HTMLElement, index: number) => {
    const nextPosition = Number(handle.dataset.dragPosition);
    delete handle.dataset.dragPosition;
    if (!Number.isNaN(nextPosition)) {
      updateGradientStop(index, { position: nextPosition });
    }
  };

  return (
    <section
      aria-label="Scenes settings"
      className="properties-scroll scene-properties"
      role="tabpanel"
    >
      <label
        className="scene-label scene-page-name-label"
        htmlFor="scene-page-name"
      >
        Page Name
      </label>
      <input
        aria-label="Page Name"
        className="scene-input scene-page-name-input"
        id="scene-page-name"
        onBlur={commitPageName}
        onChange={(event) => setPageNameDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        value={pageName}
      />

      <span className="scene-label scene-page-size-label">Page Size</span>
      <label className="scene-dimension-field scene-width-field">
        <span>W</span>
        <input
          aria-label="Page Width"
          min={0}
          onChange={(event) => updatePageWidth(Number(event.target.value))}
          type="number"
          value={artboard.width}
        />
        <small>px</small>
      </label>
      <label className="scene-dimension-field scene-height-field">
        <span>H</span>
        <input
          aria-label="Page Height"
          min={0}
          onChange={(event) => updatePageHeight(Number(event.target.value))}
          type="number"
          value={artboard.height}
        />
        <small>px</small>
      </label>
      <DesignDropdown
        ariaLabel="Page aspect ratio"
        className="scene-dropdown scene-ratio-select"
        noScroll
        onChange={(value) => {
          const nextRatio = value as NonNullable<
            ArtboardSettings["pageAspectRatio"]
          >;
          const preset = {
            "1:1": { height: 1080, width: 1080 },
            "3:2": { height: 1080, width: 1620 },
            "4:3": { height: 1080, width: 1440 },
            "9:16": { height: 1920, width: 1080 },
            "16:9": { height: 1080, width: 1920 },
          }[nextRatio];
          onUpdateArtboard({ pageAspectRatio: nextRatio, ...preset });
        }}
        options={[
          { label: "16 : 9", value: "16:9" },
          { label: "4 : 3", value: "4:3" },
          { label: "3 : 2", value: "3:2" },
          { label: "1 : 1", value: "1:1" },
          { label: "9 : 16", value: "9:16" },
        ]}
        value={pageAspectRatio}
      />

      <span className="scene-label scene-page-type-label">Page Type</span>
      <div aria-label="Page Type" className="scene-page-type" role="group">
        <button
          aria-pressed={pageType === "screen"}
          className={pageType === "screen" ? "is-active" : ""}
          onClick={() => onUpdateArtboard({ pageType: "screen" })}
          type="button"
        >
          <span>Screen</span>
          <small>(Single Screen)</small>
        </button>
        <button
          aria-pressed={pageType === "scroll"}
          className={pageType === "scroll" ? "is-active" : ""}
          onClick={() => onUpdateArtboard({ pageType: "scroll" })}
          type="button"
        >
          <span>Scroll</span>
          <small>(Vertical)</small>
        </button>
      </div>

      <span aria-hidden="true" className="scene-divider scene-divider-one" />
      <span className="scene-label scene-viewport-label">Viewport</span>
      <div
        aria-label="Viewport"
        className="scene-viewport-options"
        role="group"
      >
        {(["fit", "fill", "stretch"] as const).map((mode) => (
          <button
            aria-pressed={viewportMode === mode}
            className={viewportMode === mode ? "is-active" : ""}
            key={mode}
            onClick={() => onUpdateArtboard({ viewportMode: mode })}
            type="button"
          >
            {mode[0].toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>
      <span aria-hidden="true" className="scene-divider scene-divider-two" />
      <span className="scene-label scene-solid-title">Background</span>
      <div className="scene-solid-tabs">
        <SceneModeTabs
          active={activeBackgroundTypes}
          ariaLabel="Background type"
          onToggle={toggleBackgroundType}
        />
      </div>
      {solidBackgroundEnabled ? (
        <>
          <span className="scene-label scene-solid-color-label">Color</span>
          <div className="scene-solid-color-field">
            <SceneColorField
              ariaLabel="Solid background color"
              onChange={(background) => onUpdateArtboard({ background })}
              value={artboard.background}
            />
          </div>
          <div className="scene-solid-opacity-field">
            <ScenePercentField
              ariaLabel="Solid background opacity"
              onChange={(backgroundOpacity) =>
                onUpdateArtboard({ backgroundOpacity })
              }
              value={artboard.backgroundOpacity ?? 100}
              wide
            />
          </div>
        </>
      ) : null}

      {gradientBackgroundEnabled ? (
        <>
          <span
            className="scene-label scene-gradient-type-label"
            style={{ top: gradientControlTop + 5 }}
          >
            Type
          </span>
          <DesignDropdown
            ariaLabel="Gradient Type"
            className="scene-dropdown scene-gradient-type-select"
            noScroll
            onChange={(value) =>
              onUpdateArtboard({
                gradientType: value as NonNullable<
                  ArtboardSettings["gradientType"]
                >,
              })
            }
            options={[
              { label: "Linear", value: "linear" },
              { label: "Radial", value: "radial" },
              { label: "Conic", value: "conic" },
              { label: "Rectangular", value: "rectangular" },
              { label: "Freeform", value: "freeform" },
            ]}
            style={{ top: gradientControlTop }}
            value={artboard.gradientType ?? "linear"}
          />
          <span
            className="scene-label scene-gradient-angle-label"
            style={{ top: gradientControlTop + 5 }}
          >
            Angle
          </span>
          <label
            className="scene-angle-field"
            style={{ top: gradientControlTop }}
          >
            <input
              aria-label="Gradient Angle"
              disabled={["radial", "freeform"].includes(
                artboard.gradientType ?? "linear",
              )}
              max={360}
              min={0}
              onChange={(event) =>
                onUpdateArtboard({ gradientAngle: Number(event.target.value) })
              }
              type="number"
              value={artboard.gradientAngle ?? 0}
            />
            <span>°</span>
          </label>
          <div
            aria-label="Gradient preview"
            className="scene-gradient-preview"
            style={{
              background: gradientCssForArtboard(artboard),
              top: gradientControlTop + 32,
            }}
          >
            {gradientStops.map((stop, index) => (
              <span
                aria-label={`Gradient stop ${index + 1} position`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={stop.position}
                className="scene-gradient-stop"
                key={`${stop.position}-${index}`}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
                    return;
                  }
                  event.preventDefault();
                  updateGradientStop(index, {
                    position: clamp(
                      stop.position + (event.key === "ArrowRight" ? 1 : -1),
                      0,
                      100,
                    ),
                  });
                }}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  previewGradientStopPosition(
                    event.currentTarget,
                    index,
                    event.clientX,
                  );
                }}
                onPointerMove={(event) => {
                  if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
                    return;
                  }
                  previewGradientStopPosition(
                    event.currentTarget,
                    index,
                    event.clientX,
                  );
                }}
                onPointerUp={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                  commitGradientStopPosition(event.currentTarget, index);
                }}
                role="slider"
                style={{
                  background: colorWithOpacity(stop.color, stop.opacity),
                  left: `calc(${stop.position}% - 3.5px)`,
                }}
                tabIndex={0}
              />
            ))}
          </div>
          {gradientStops.map((stop, index) => (
            <div
              className="scene-gradient-control-row"
              key={`${stop.position}-${index}`}
              style={{ top: gradientControlTop + 65 + index * 32 }}
            >
              <span>Color</span>
              <SceneColorField
                ariaLabel={`Gradient color ${index + 1}`}
                onChange={(color) => updateGradientStop(index, { color })}
                value={stop.color}
              />
              <ScenePercentField
                ariaLabel={`Gradient opacity ${index + 1}`}
                onChange={(opacity) => updateGradientStop(index, { opacity })}
                value={stop.opacity}
              />
            </div>
          ))}
          <button
            aria-label="Add gradient color"
            className="scene-gradient-add"
            disabled={gradientStops.length >= 6}
            onClick={addGradientStop}
            style={{ top: gradientControlTop + 57 + gradientStops.length * 32 }}
            type="button"
          >
            +
          </button>
        </>
      ) : null}

      {isMediaBackground ? (
        <>
          <input
            accept={isVideoBackground ? "video/*" : "image/*"}
            aria-label={
              isVideoBackground
                ? "Upload background video"
                : "Upload background image"
            }
            className="visually-hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const source = URL.createObjectURL(file);
              onUpdateArtboard(
                isVideoBackground
                  ? { backgroundVideo: source }
                  : { backgroundImage: source },
              );
              event.target.value = "";
            }}
            ref={backgroundUploadRef}
            type="file"
          />
          <button
            aria-label={
              backgroundMedia
                ? `Replace background ${isVideoBackground ? "video" : "image"}`
                : `Upload background ${isVideoBackground ? "video" : "image"}`
            }
            className="scene-upload"
            onClick={() => backgroundUploadRef.current?.click()}
            style={{ top: mediaControlTop + 3 }}
            type="button"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt=""
              aria-hidden="true"
              src={assetPath("/figma/upload.svg")}
            />
            <span>{backgroundMedia ? "Replace" : "Upload"}</span>
          </button>
          <span
            className="scene-label scene-image-fit-label"
            style={{ top: mediaControlTop + 138 }}
          >
            Fit
          </span>
          <DesignDropdown
            ariaLabel="Background media fit"
            className="scene-dropdown scene-image-fit-select"
            noScroll
            onChange={(value) =>
              onUpdateArtboard({
                backgroundImageFit: value as NonNullable<
                  ArtboardSettings["backgroundImageFit"]
                >,
              })
            }
            options={[
              { label: "Cover", value: "cover" },
              { label: "Contain", value: "contain" },
              { label: "Original", value: "original" },
              { label: "Stretch", value: "stretch" },
            ]}
            style={{ top: mediaControlTop + 133 }}
            value={artboard.backgroundImageFit ?? "cover"}
          />
          <span
            className="scene-label scene-image-opacity-label"
            style={{ top: mediaControlTop + 164 }}
          >
            Opacity
          </span>
          <div
            className="scene-image-opacity-range"
            style={{ top: mediaControlTop + 167 }}
          >
            <DesignRange
              ariaLabel="Background media opacity slider"
              max={100}
              min={0}
              onChange={(backgroundImageOpacity) =>
                onUpdateArtboard({ backgroundImageOpacity })
              }
              value={artboard.backgroundImageOpacity ?? 100}
            />
          </div>
          <div
            className="scene-image-opacity-field"
            style={{ top: mediaControlTop + 159 }}
          >
            <ScenePercentField
              ariaLabel="Background media opacity"
              onChange={(backgroundImageOpacity) =>
                onUpdateArtboard({ backgroundImageOpacity })
              }
              value={artboard.backgroundImageOpacity ?? 100}
            />
          </div>
          {isVideoBackground ? (
            <>
              <div
                className="scene-auto-play"
                style={{ top: mediaControlTop + 190 }}
              >
                <SceneCheckbox
                  checked={artboard.backgroundAutoPlay ?? true}
                  label="Auto Play"
                  onChange={(backgroundAutoPlay) =>
                    onUpdateArtboard({ backgroundAutoPlay })
                  }
                />
              </div>
              <div
                className="scene-loop"
                style={{ top: mediaControlTop + 211 }}
              >
                <SceneCheckbox
                  checked={artboard.backgroundLoop ?? true}
                  label="Loop"
                  onChange={(backgroundLoop) =>
                    onUpdateArtboard({ backgroundLoop })
                  }
                />
              </div>
              <div
                className="scene-mute"
                style={{ top: mediaControlTop + 232 }}
              >
                <SceneCheckbox
                  checked={artboard.backgroundMute ?? true}
                  label="Mute"
                  onChange={(backgroundMute) =>
                    onUpdateArtboard({ backgroundMute })
                  }
                />
              </div>
            </>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function SoundMoreButton({
  controls,
  expanded,
  label,
  onClick,
}: {
  controls?: string;
  expanded?: boolean;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      aria-controls={controls}
      aria-expanded={expanded}
      aria-haspopup="menu"
      aria-label={label}
      className="sound-more-button"
      onClick={onClick}
      type="button"
    >
      <Image
        alt=""
        aria-hidden="true"
        height={8}
        src={assetPath("/figma/sound/Group%20272.svg")}
        width={2}
      />
    </button>
  );
}

function SoundPlayButton({
  disabled,
  isPlaying,
  label,
  onClick,
}: {
  disabled?: boolean;
  isPlaying?: boolean;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="sound-play-button"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {isPlaying ? (
        <svg
          aria-hidden="true"
          className="sound-pause-icon"
          height="13"
          viewBox="0 0 13 13"
          width="13"
        >
          <circle cx="6.5" cy="6.5" fill="none" r="6" stroke="currentColor" />
          <rect fill="currentColor" height="5" width="1" x="5" y="4" />
          <rect fill="currentColor" height="5" width="1" x="7" y="4" />
        </svg>
      ) : (
        <Image
          alt=""
          aria-hidden="true"
          height={13}
          src={assetPath("/figma/sound/Group%20273.svg")}
          width={13}
        />
      )}
    </button>
  );
}

function SoundNumberInput({
  ariaLabel,
  max,
  min,
  onBegin,
  onChange,
  precision,
  value,
}: {
  ariaLabel: string;
  max?: number;
  min: number;
  onBegin: () => void;
  onChange: (value: number) => void;
  precision: number;
  value: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const cancelCommitRef = useRef(false);
  const normalize = (next: number) =>
    clamp(next, min, max === undefined ? Number.MAX_SAFE_INTEGER : max);

  const commit = (rawValue: string) => {
    const next = Number(rawValue);
    onChange(Number.isFinite(next) ? normalize(next) : min);
    setDraft(null);
  };

  return (
    <input
      aria-label={ariaLabel}
      max={max}
      min={min}
      onBlur={(event) => {
        if (cancelCommitRef.current) {
          cancelCommitRef.current = false;
          setDraft(null);
          return;
        }
        commit(event.currentTarget.value);
      }}
      onChange={(event) => {
        const nextDraft = event.currentTarget.value;
        setDraft(nextDraft);
        if (!nextDraft.trim()) return;
        const next = Number(nextDraft);
        if (Number.isFinite(next)) onChange(normalize(next));
      }}
      onFocus={(event) => {
        cancelCommitRef.current = false;
        onBegin();
        setDraft(event.currentTarget.value);
        event.currentTarget.select();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          cancelCommitRef.current = true;
          setDraft(null);
          event.currentTarget.blur();
        }
      }}
      step={10 ** -precision}
      type="number"
      value={draft ?? value.toFixed(precision)}
    />
  );
}

function SoundStepperField({
  ariaLabel,
  onBegin,
  onChange,
  value,
}: {
  ariaLabel: string;
  onBegin: () => void;
  onChange: (value: number) => void;
  value: number;
}) {
  const updateByStep = (delta: number) => {
    onBegin();
    onChange(Math.max(0, Math.round((value + delta) * 10) / 10));
  };

  return (
    <div className="sound-stepper-control">
      <span className="sound-stepper-field">
        <SoundNumberInput
          ariaLabel={ariaLabel}
          min={0}
          onBegin={onBegin}
          onChange={onChange}
          precision={1}
          value={value}
        />
        <span className="sound-stepper-buttons">
          <button
            aria-label={`Increase ${ariaLabel}`}
            onClick={() => updateByStep(0.1)}
            type="button"
          >
            <Image
              alt=""
              aria-hidden="true"
              height={4}
              src={assetPath("/figma/sound/stepper-up.svg")}
              width={5}
            />
          </button>
          <button
            aria-label={`Decrease ${ariaLabel}`}
            onClick={() => updateByStep(-0.1)}
            type="button"
          >
            <Image
              alt=""
              aria-hidden="true"
              height={4}
              src={assetPath("/figma/sound/stepper-down.svg")}
              width={5}
            />
          </button>
        </span>
      </span>
      <span className="sound-stepper-unit">s</span>
    </div>
  );
}

function SoundPercentField({
  ariaLabel = "Sound volume",
  onBegin,
  onChange,
  value,
}: {
  ariaLabel?: string;
  onBegin: () => void;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="sound-percent-field">
      <SoundNumberInput
        ariaLabel={ariaLabel}
        max={100}
        min={0}
        onBegin={onBegin}
        onChange={onChange}
        precision={0}
        value={value}
      />
      <span>%</span>
    </label>
  );
}

type AllSoundsTriggerFilter = "all" | InteractionSoundTrigger;

type AllSoundsObjectFilter = "all" | "shape" | "image";

const allSoundsTriggerFilterOptions: {
  label: string;
  value: AllSoundsTriggerFilter;
}[] = [
  { label: "All Triggers", value: "all" },
  ...interactionSoundTriggerOptions,
];

const allSoundsObjectFilterOptions: {
  label: string;
  value: AllSoundsObjectFilter;
}[] = [
  { label: "All Objects", value: "all" },
  { label: "Shapes", value: "shape" },
  { label: "Images", value: "image" },
];

type InteractionSoundUploadRequest =
  | { index: number; mode: "replace" }
  | { mode: "append" }
  | { mode: "apply-common" };

function InteractionSoundFileField({
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

function InteractionSoundDetails({
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

function InteractionSoundRow({
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

function InteractionSoundsSection({
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

function SoundAdvancedToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={checked}
      className={checked ? "sound-toggle is-active" : "sound-toggle"}
      onClick={onChange}
      type="button"
    >
      <span />
    </button>
  );
}

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

type AllSoundsEntry = {
  asset: BackgroundMusicAsset;
  assetIndex: number;
  element: CanvasElement;
  id: string;
  setting: InteractionSoundSettings;
  settingIndex: number;
};

type AllSoundsGroup = {
  element: CanvasElement;
  entries: AllSoundsEntry[];
  id: string;
};

function AllSoundsPanel({
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
}: {
  advancedSettings: SoundAdvancedSettings;
  backgroundMusic: BackgroundMusicSettings;
  elements: CanvasElement[];
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
                        className={`sound-all-object-thumbnail layer-symbol ${group.element.pathfinder ? "symbol-pathfinder" : `symbol-${group.element.type}`}`}
                      >
                        <LayerSymbol element={group.element} />
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

function SoundPanel({
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

function DesignPanel({
  artboard,
  lockRatio,
  onCheckpoint,
  onLockRatioChange,
  onReplaceElements,
  onUpdateElement,
  selectedElements,
}: {
  artboard: ArtboardSettings;
  lockRatio: boolean;
  onCheckpoint: () => void;
  onLockRatioChange: (locked: boolean) => void;
  onReplaceElements: (
    elementIds: string[],
    replacements: CanvasElement[],
  ) => void;
  onUpdateElement: (elementId: string, updates: Partial<CanvasElement>) => void;
  selectedElements: CanvasElement[];
}) {
  const selected = selectedElements[0];
  const [cornerRadiusLinked, setCornerRadiusLinked] = useState(false);
  const [selectedCorners, setSelectedCorners] = useState<number[]>([0]);
  const hasSelection = selectedElements.length > 0;
  const isEditable =
    hasSelection && selectedElements.every((element) => !element.locked);
  const selectedBounds = boundsFromElements(selectedElements);
  const supportsCornerRadius = selected?.type === "rectangle";
  const isPolygon = selected?.type === "triangle" || selected?.type === "star";
  const pathfinderReady =
    selectedElements.length >= 2 &&
    isEditable &&
    selectedElements.every((element) => element.type !== "text");
  const origin = selected?.transformOrigin ?? 4;
  const selectedCornerRadii = selected?.cornerRadii ?? [
    selected?.cornerRadius ?? 0,
    selected?.cornerRadius ?? 0,
    selected?.cornerRadius ?? 0,
    selected?.cornerRadius ?? 0,
  ];
  const selectedPolygonVertices =
    selected && isPolygon ? polygonPointsForElement(selected) : [];
  const selectedPolygonCornerRadii =
    selected && isPolygon
      ? polygonCornerRadiusValues(selected, selectedPolygonVertices)
      : [];
  const selectedRadiusValues = isPolygon
    ? selectedPolygonCornerRadii
    : selectedCornerRadii;
  const validSelectedCorners = selectedCorners.filter(
    (cornerIndex) => cornerIndex < selectedRadiusValues.length,
  );
  const displayedCornerRadius = cornerRadiusLinked
    ? (selected?.cornerRadius ?? 0)
    : (selectedRadiusValues[validSelectedCorners[0]] ??
      selected?.cornerRadius ??
      0);
  const cornerRadiusEditable =
    isEditable && (cornerRadiusLinked || validSelectedCorners.length > 0);
  const cornerPreviewScale =
    31.713867 /
    Math.max(1, Math.min(selected?.width ?? 1, selected?.height ?? 1));
  const cornerPreviewRadii = selectedCornerRadii.map((radius) =>
    clamp(radius * cornerPreviewScale, 0, 10.571289),
  );
  const polygonPreviewCornerPaths =
    selected && isPolygon
      ? polygonCornerIndicatorPaths(
          selectedPolygonVertices,
          polygonCornerRadii(selected, selectedPolygonVertices),
        )
      : [];
  const polygonCornerHitSize = clamp(
    24 - selectedPolygonVertices.length * 0.5,
    14,
    20,
  );
  const horizontallySorted = [...selectedElements].sort(
    (first, second) => first.x - second.x,
  );
  const verticallySorted = [...selectedElements].sort(
    (first, second) => first.y - second.y,
  );
  const horizontalSpacing = horizontallySorted[1]
    ? Math.max(
        0,
        horizontallySorted[1].x -
          horizontallySorted[0].x -
          horizontallySorted[0].width,
      )
    : 0;
  const verticalSpacing = verticallySorted[1]
    ? Math.max(
        0,
        verticallySorted[1].y -
          verticallySorted[0].y -
          verticallySorted[0].height,
      )
    : 0;

  const applyToSelection = (updates: Partial<CanvasElement>) => {
    if (!isEditable) return;
    onCheckpoint();
    selectedElements.forEach((element) => onUpdateElement(element.id, updates));
  };

  const updateSelection = (updates: Partial<CanvasElement>) => {
    if (!isEditable) return;
    selectedElements.forEach((element) => onUpdateElement(element.id, updates));
  };

  const beginSelectionUpdate = () => {
    if (isEditable) onCheckpoint();
  };

  const updateDimension = (key: "width" | "height", value: number) => {
    if (!selected || !isEditable) return;
    const nextValue = Math.max(8, value);
    if (!lockRatio || selectedElements.length !== 1) {
      applyToSelection({ [key]: nextValue });
      return;
    }
    const ratio = selected.width / Math.max(1, selected.height);
    applyToSelection(
      key === "width"
        ? { height: nextValue / ratio, width: nextValue }
        : { height: nextValue, width: nextValue * ratio },
    );
  };

  const alignSelection = (
    alignment:
      | "left"
      | "center-horizontal"
      | "right"
      | "top"
      | "center-vertical"
      | "bottom",
  ) => {
    if (!selectedBounds || !isEditable) return;
    const target =
      alignment === "left"
        ? 0
        : alignment === "center-horizontal"
          ? (artboard.width - selectedBounds.width) / 2
          : alignment === "right"
            ? artboard.width - selectedBounds.width
            : alignment === "top"
              ? 0
              : alignment === "center-vertical"
                ? (artboard.height - selectedBounds.height) / 2
                : artboard.height - selectedBounds.height;
    const isHorizontal = ["left", "center-horizontal", "right"].includes(
      alignment,
    );
    const delta = target - (isHorizontal ? selectedBounds.x : selectedBounds.y);
    onCheckpoint();
    selectedElements.forEach((element) =>
      onUpdateElement(
        element.id,
        isHorizontal ? { x: element.x + delta } : { y: element.y + delta },
      ),
    );
  };

  const distributeSelection = (axis: "horizontal" | "vertical") => {
    if (selectedElements.length < 3 || !isEditable) return;
    const sorted = [...selectedElements].sort((first, second) =>
      axis === "horizontal" ? first.x - second.x : first.y - second.y,
    );
    const first = sorted[0];
    const last = sorted.at(-1);
    if (!first || !last) return;
    const totalSize = sorted.reduce(
      (total, element) =>
        total + (axis === "horizontal" ? element.width : element.height),
      0,
    );
    const available =
      (axis === "horizontal"
        ? last.x + last.width - first.x
        : last.y + last.height - first.y) - totalSize;
    const gap = available / Math.max(1, sorted.length - 1);
    let cursor = axis === "horizontal" ? first.x : first.y;
    onCheckpoint();
    sorted.forEach((element) => {
      onUpdateElement(
        element.id,
        axis === "horizontal" ? { x: cursor } : { y: cursor },
      );
      cursor += (axis === "horizontal" ? element.width : element.height) + gap;
    });
  };

  const applySpacing = (axis: "horizontal" | "vertical", value: number) => {
    if (selectedElements.length < 2 || !isEditable) return;
    const gap = Math.max(0, value);
    const sorted = [...selectedElements].sort((first, second) =>
      axis === "horizontal" ? first.x - second.x : first.y - second.y,
    );
    let cursor = axis === "horizontal" ? sorted[0].x : sorted[0].y;
    onCheckpoint();
    sorted.forEach((element) => {
      onUpdateElement(
        element.id,
        axis === "horizontal" ? { x: cursor } : { y: cursor },
      );
      cursor += (axis === "horizontal" ? element.width : element.height) + gap;
    });
  };

  const applyPathfinder = (operation: PathfinderOperation | "trim") => {
    if (!pathfinderReady) return;
    const replacements =
      operation === "divide" || operation === "trim"
        ? splitPathfinderElements(selectedElements, operation)
        : [pathfinderElement(selectedElements, operation)].filter(
            (replacement): replacement is CanvasElement => replacement !== null,
          );
    if (!replacements.length) return;
    onCheckpoint();
    onReplaceElements(
      selectedElements.map((element) => element.id),
      replacements,
    );
  };

  const updateCornerRadius = (value: number) => {
    if (!selected) return;
    const maximum = Math.min(200, selected.width / 2, selected.height / 2);
    const radius = clamp(value, 0, maximum);
    if (cornerRadiusLinked) {
      applyToSelection(
        isPolygon
          ? {
              cornerRadius: radius,
              polygonCornerRadii: selectedPolygonVertices.map(() => radius),
            }
          : {
              cornerRadius: radius,
              cornerRadii: [radius, radius, radius, radius],
            },
      );
      return;
    }
    if (!validSelectedCorners.length) return;
    if (isPolygon) {
      const radii = [...selectedPolygonCornerRadii];
      validSelectedCorners.forEach((cornerIndex) => {
        radii[cornerIndex] = radius;
      });
      applyToSelection({ polygonCornerRadii: radii });
      return;
    }
    const radii = [...selectedCornerRadii] as [number, number, number, number];
    validSelectedCorners.forEach((cornerIndex) => {
      radii[cornerIndex] = radius;
    });
    applyToSelection({ cornerRadii: radii });
  };

  const toggleCornerSelection = (cornerIndex: number) => {
    setSelectedCorners((current) =>
      current.includes(cornerIndex)
        ? current.filter((index) => index !== cornerIndex)
        : [...current, cornerIndex].sort((first, second) => first - second),
    );
    setCornerRadiusLinked(false);
  };

  const updatePolygonPoints = (value: number) => {
    if (!selected || !isPolygon) return;
    const pointCount = Math.round(clamp(value, 3, 12));
    const nextVertices = polygonPointsForElement({
      ...selected,
      polygonPoints: pointCount,
    });
    applyToSelection({
      polygonCornerRadii: nextVertices.map(
        (_, index) =>
          selectedPolygonCornerRadii[index] ?? selected.cornerRadius,
      ),
      polygonPoints: pointCount,
    });
    setSelectedCorners((corners) =>
      corners.filter((cornerIndex) => cornerIndex < nextVertices.length),
    );
  };

  if (!selected) {
    return (
      <div className="properties-scroll">
        <p className="property-empty">Select a layer to edit its properties.</p>
      </div>
    );
  }

  return (
    <div className="properties-scroll design-properties">
      <section className="property-section">
        <h2 className="panel-heading">Transform</h2>
        <div className="transform-grid">
          <DesignNumberField
            disabled={!isEditable}
            label="x"
            onChange={(value) => applyToSelection({ x: value })}
            precision={1}
            value={selected.x}
          />
          <DesignNumberField
            disabled={!isEditable}
            label="y"
            onChange={(value) => applyToSelection({ y: value })}
            precision={1}
            value={selected.y}
          />
          <DesignNumberField
            disabled={!isEditable}
            label="w"
            onChange={(value) => updateDimension("width", value)}
            precision={1}
            value={selected.width}
          />
          <DesignNumberField
            disabled={!isEditable}
            label="h"
            onChange={(value) => updateDimension("height", value)}
            precision={1}
            value={selected.height}
          />
        </div>
        <div className="transform-secondary">
          <div className="origin-control">
            <span>Origin</span>
            <div className="origin-grid">
              {Array.from({ length: 9 }, (_, index) => (
                <button
                  aria-label={`Origin ${index + 1}`}
                  aria-checked={origin === index}
                  disabled={!isEditable}
                  key={index}
                  onClick={() => applyToSelection({ transformOrigin: index })}
                  role="radio"
                  type="button"
                />
              ))}
            </div>
          </div>
          <span aria-hidden="true" className="transform-divider" />
          <div className="rotation-control">
            <label className="toggle-row">
              <span>Lock Ratio</span>
              <input
                aria-label="Lock Ratio"
                checked={lockRatio}
                onChange={(event) => onLockRatioChange(event.target.checked)}
                type="checkbox"
              />
            </label>
            <span className="property-label">Rotation</span>
            <DesignRotationField
              disabled={!isEditable}
              onChange={(value) => applyToSelection({ rotation: value })}
              value={selected.rotation}
            />
            <div className="flip-controls">
              <DesignIconButton
                asset="Group 139.svg"
                disabled={!isEditable}
                label="Flip horizontal"
                onClick={() => applyToSelection({ flipX: !selected.flipX })}
                pressed={Boolean(selected.flipX)}
              />
              <DesignIconButton
                asset="Group 109.svg"
                disabled={!isEditable}
                label="Flip vertical"
                onClick={() => applyToSelection({ flipY: !selected.flipY })}
                pressed={Boolean(selected.flipY)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="property-section alignment-section">
        <h2 className="panel-heading">Align</h2>
        <div className="alignment-controls">
          <DesignIconButton
            asset="Group 92.svg"
            disabled={!isEditable}
            label="Align left"
            onClick={() => alignSelection("left")}
          />
          <DesignIconButton
            asset="Group 96.svg"
            disabled={!isEditable}
            label="Align horizontal center"
            onClick={() => alignSelection("center-horizontal")}
          />
          <DesignIconButton
            asset="Group 94.svg"
            disabled={!isEditable}
            label="Align right"
            onClick={() => alignSelection("right")}
          />
          <DesignIconButton
            asset="Group 93.svg"
            disabled={!isEditable}
            label="Align top"
            onClick={() => alignSelection("top")}
          />
          <DesignIconButton
            asset="Group 97.svg"
            disabled={!isEditable}
            label="Align vertical center"
            onClick={() => alignSelection("center-vertical")}
          />
          <DesignIconButton
            asset="Group 95.svg"
            disabled={!isEditable}
            label="Align bottom"
            onClick={() => alignSelection("bottom")}
          />
        </div>
        <div className="distribution-row">
          <div className="distribution-block">
            <span className="property-label">Distribute</span>
            <div>
              <DesignIconButton
                asset="Group 133.svg"
                disabled={selectedElements.length < 3 || !isEditable}
                label="Distribute horizontally"
                onClick={() => distributeSelection("horizontal")}
              />
              <DesignIconButton
                asset="Group 134.svg"
                disabled={selectedElements.length < 3 || !isEditable}
                label="Distribute vertically"
                onClick={() => distributeSelection("vertical")}
              />
            </div>
          </div>
          <div className="spacing-block">
            <span className="property-label">Spacing</span>
            <div className="spacing-controls">
              <DesignIconButton
                asset="Group 127.svg"
                disabled={selectedElements.length < 2 || !isEditable}
                label="Horizontal spacing"
                onClick={() => applySpacing("horizontal", horizontalSpacing)}
              />
              <DesignNumberField
                ariaLabel="Horizontal spacing value"
                disabled={selectedElements.length < 2 || !isEditable}
                label=""
                min={0}
                onChange={(value) => applySpacing("horizontal", value)}
                value={horizontalSpacing}
              />
              <DesignIconButton
                asset="Group 129.svg"
                disabled={selectedElements.length < 2 || !isEditable}
                label="Vertical spacing"
                onClick={() => applySpacing("vertical", verticalSpacing)}
              />
              <DesignNumberField
                ariaLabel="Vertical spacing value"
                disabled={selectedElements.length < 2 || !isEditable}
                label=""
                min={0}
                onChange={(value) => applySpacing("vertical", value)}
                value={verticalSpacing}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="property-section pathfinder-section">
        <h2 className="panel-heading">Pathfinder</h2>
        <div className="pathfinder-controls">
          <DesignIconButton
            asset="Group 153.svg"
            disabled={!pathfinderReady}
            label="Union selection"
            onClick={() => applyPathfinder("union")}
          />
          <DesignIconButton
            asset="Group 154.svg"
            disabled={!pathfinderReady}
            label="Subtract selection"
            onClick={() => applyPathfinder("subtract")}
          />
          <DesignIconButton
            asset="Group 155.svg"
            disabled={!pathfinderReady}
            label="Intersect selection"
            onClick={() => applyPathfinder("intersect")}
          />
          <DesignIconButton
            asset="Group 156.svg"
            disabled={!pathfinderReady}
            label="Exclude selection"
            onClick={() => applyPathfinder("exclude")}
          />
          <DesignIconButton
            asset="Group 158.svg"
            disabled={!pathfinderReady}
            label="Divide selection"
            onClick={() => applyPathfinder("divide")}
          />
          <DesignIconButton
            asset="Group 159.svg"
            disabled={!pathfinderReady}
            label="Trim selection"
            onClick={() => applyPathfinder("trim")}
          />
        </div>
      </section>

      {selected.type !== "text" ? (
        <section className="property-section appearance-section">
          <h2 className="panel-heading">SHAPE</h2>
          <div className="appearance-row opacity-row">
            <span className="property-label">Opacity</span>
            <DesignRange
              ariaLabel="Opacity"
              disabled={!isEditable}
              max={100}
              min={0}
              onChange={(value) => applyToSelection({ opacity: value })}
              value={selected.opacity}
            />
            <DesignNumberField
              ariaLabel="Opacity value"
              disabled={!isEditable}
              label=""
              max={100}
              min={0}
              onChange={(value) =>
                applyToSelection({ opacity: clamp(value, 0, 100) })
              }
              unit="%"
              value={selected.opacity}
            />
          </div>
          <div className="appearance-row paint-row">
            <span className="property-label">Fill</span>
            <div className="paint-control">
              <DesignColorField
                disabled={!isEditable}
                label="Fill"
                onBegin={beginSelectionUpdate}
                onChange={(value) => updateSelection({ fill: value })}
                value={selected.fill}
              />
              <DesignNumberField
                ariaLabel="Fill opacity"
                disabled={!isEditable}
                label=""
                max={100}
                min={0}
                onChange={(value) =>
                  applyToSelection({ fillOpacity: clamp(value, 0, 100) })
                }
                unit="%"
                value={selected.fillOpacity ?? 100}
              />
            </div>
          </div>
          <div className="appearance-row stroke-row">
            <span className="property-label">Stroke</span>
            <div className="stroke-paint-control">
              <DesignColorField
                disabled={!isEditable}
                label="Stroke"
                onBegin={beginSelectionUpdate}
                onChange={(value) => updateSelection({ stroke: value })}
                value={selected.stroke}
              />
              <DesignDropdown
                ariaLabel="Stroke style"
                className={`stroke-style-select is-${selected.strokeStyle ?? "solid"}`}
                disabled={!isEditable}
                onChange={(strokeStyle) =>
                  applyToSelection({
                    strokeStyle: strokeStyle as CanvasElement["strokeStyle"],
                  })
                }
                options={[
                  {
                    label: "None",
                    strokePreview: "none",
                    value: "none",
                  },
                  {
                    label: "Solid",
                    strokePreview: "solid",
                    value: "solid",
                  },
                  {
                    label: "Dashed",
                    strokePreview: "dashed",
                    value: "dashed",
                  },
                  {
                    label: "Dotted",
                    strokePreview: "dotted",
                    value: "dotted",
                  },
                ]}
                value={selected.strokeStyle ?? "solid"}
              />
            </div>
            <div className="stroke-metrics">
              <DesignNumberField
                ariaLabel="Stroke width"
                disabled={!isEditable}
                label=""
                max={20}
                min={0}
                onChange={(value) =>
                  applyToSelection({ strokeWidth: clamp(value, 0, 20) })
                }
                unit="px"
                value={selected.strokeWidth}
              />
              <DesignNumberField
                ariaLabel="Stroke opacity"
                disabled={!isEditable}
                label=""
                max={100}
                min={0}
                onChange={(value) =>
                  applyToSelection({ strokeOpacity: clamp(value, 0, 100) })
                }
                unit="%"
                value={selected.strokeOpacity ?? 100}
              />
            </div>
          </div>
          {supportsCornerRadius ? (
            <div className="corner-radius-row">
              <span className="property-label">Corner Radius</span>
              <DesignRange
                ariaLabel="Corner Radius slider"
                className="corner-radius-slider"
                disabled={!cornerRadiusEditable}
                max={Math.min(200, selected.width / 2, selected.height / 2)}
                min={0}
                onChange={(value) => updateCornerRadius(value)}
                value={displayedCornerRadius}
              />
              <div className="corner-radius-value">
                <DesignNumberField
                  ariaLabel="Corner radius value"
                  disabled={!cornerRadiusEditable}
                  label=""
                  max={Math.min(200, selected.width / 2, selected.height / 2)}
                  min={0}
                  onChange={updateCornerRadius}
                  value={displayedCornerRadius}
                />
                <button
                  aria-label="Link corner radius"
                  aria-pressed={cornerRadiusLinked}
                  className="radius-link"
                  disabled={!isEditable}
                  onClick={() => {
                    if (!cornerRadiusLinked) {
                      const radius =
                        selectedRadiusValues[validSelectedCorners[0]] ??
                        selected.cornerRadius;
                      applyToSelection(
                        isPolygon
                          ? {
                              cornerRadius: radius,
                              polygonCornerRadii: selectedPolygonVertices.map(
                                () => radius,
                              ),
                            }
                          : {
                              cornerRadius: radius,
                              cornerRadii: [radius, radius, radius, radius],
                            },
                      );
                    }
                    setCornerRadiusLinked((linked) => !linked);
                  }}
                  type="button"
                >
                  <Image
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    height={11.31}
                    src={assetPath("/figma/design/Group%20150.svg")}
                    unoptimized
                    width={11.31}
                  />
                </button>
              </div>
              <div
                aria-label="Corner selection"
                className={
                  isPolygon
                    ? "radius-preview radius-preview--polygon"
                    : "radius-preview"
                }
                role="group"
              >
                {isPolygon ? (
                  <>
                    <svg
                      aria-hidden="true"
                      className="radius-polygon-outline"
                      viewBox="0 0 100 100"
                    >
                      <g
                        transform={`translate(${selected?.flipX ? 100 : 0} ${selected?.flipY ? 100 : 0}) scale(${selected?.flipX ? -1 : 1} ${selected?.flipY ? -1 : 1})`}
                      >
                        <path
                          className="radius-polygon-base"
                          d={roundedPolygonPath(
                            selectedPolygonVertices,
                            selected
                              ? polygonCornerRadii(
                                  selected,
                                  selectedPolygonVertices,
                                )
                              : 0,
                          )}
                        />
                        {polygonPreviewCornerPaths.map(
                          (cornerPath, cornerIndex) => (
                            <path
                              className={
                                validSelectedCorners.includes(cornerIndex)
                                  ? "radius-polygon-corner-shape is-selected"
                                  : "radius-polygon-corner-shape"
                              }
                              d={cornerPath}
                              key={cornerIndex}
                            />
                          ),
                        )}
                      </g>
                    </svg>
                    {selectedPolygonVertices.map((point, cornerIndex) => {
                      const visualPoint = {
                        x: selected?.flipX ? 100 - point.x : point.x,
                        y: selected?.flipY ? 100 - point.y : point.y,
                      };
                      return (
                        <button
                          aria-label={`Corner ${cornerIndex + 1}`}
                          aria-pressed={validSelectedCorners.includes(
                            cornerIndex,
                          )}
                          className="radius-polygon-corner"
                          disabled={!isEditable}
                          key={cornerIndex}
                          onClick={() => toggleCornerSelection(cornerIndex)}
                          style={{
                            height: `${polygonCornerHitSize}px`,
                            left: `${3 + visualPoint.x * 0.31}px`,
                            top: `${3 + visualPoint.y * 0.31}px`,
                            width: `${polygonCornerHitSize}px`,
                          }}
                          type="button"
                        />
                      );
                    })}
                  </>
                ) : (
                  (
                    [
                      ["top-left", "Top left corner"],
                      ["top-right", "Top right corner"],
                      ["bottom-left", "Bottom left corner"],
                      ["bottom-right", "Bottom right corner"],
                    ] as const
                  ).map(([position, label]) => {
                    const cornerIndex = sourceCornerIndexForVisualPosition(
                      position,
                      selected,
                    );
                    return (
                      <button
                        aria-label={label}
                        aria-pressed={validSelectedCorners.includes(
                          cornerIndex,
                        )}
                        className={`radius-corner radius-corner--${position}`}
                        disabled={!isEditable}
                        key={position}
                        onClick={() => toggleCornerSelection(cornerIndex)}
                        style={
                          {
                            "--corner-preview-radius": `${cornerPreviewRadii[cornerIndex]}px`,
                          } as CSSProperties
                        }
                        type="button"
                      />
                    );
                  })
                )}
              </div>
            </div>
          ) : null}
          {isPolygon ? (
            <div className="appearance-row points-row">
              <span className="property-label">Points</span>
              <DesignNumberField
                ariaLabel="Polygon points"
                label=""
                disabled={!isEditable}
                max={12}
                min={3}
                onChange={updatePolygonPoints}
                unit=""
                value={
                  selected.polygonPoints ??
                  (selected.type === "triangle" ? 3 : 5)
                }
              />
            </div>
          ) : null}
        </section>
      ) : (
        <section className="property-section appearance-section text-properties">
          <h2 className="panel-heading">TEXT</h2>
          <div className="text-control-row text-font-row">
            <span className="property-label">Font</span>
            <DesignDropdown
              ariaLabel="Font"
              className="text-font-select"
              disabled={!isEditable}
              onChange={(fontFamily) => applyToSelection({ fontFamily })}
              options={[
                { label: "Inter", value: "Inter" },
                { label: "Arial", value: "Arial" },
                { label: "Georgia", value: "Georgia" },
                { label: "Times New Roman", value: "Times New Roman" },
              ]}
              value={selected.fontFamily ?? "Inter"}
            />
            <span className="property-label text-weight-label">Weight</span>
            <DesignDropdown
              ariaLabel="Font weight"
              className="text-weight-select"
              disabled={!isEditable}
              onChange={(fontWeight) => applyToSelection({ fontWeight })}
              options={fontWeightOptions.map(([weight, label]) => ({
                label,
                value: weight,
              }))}
              value={selected.fontWeight ?? "500"}
            />
          </div>
          <div className="text-control-row text-color-row">
            <span className="property-label">Color</span>
            <div className="paint-control">
              <DesignColorField
                disabled={!isEditable}
                label="Text color"
                onBegin={beginSelectionUpdate}
                onChange={(value) => updateSelection({ fill: value })}
                value={selected.fill}
              />
              <DesignNumberField
                ariaLabel="Text color opacity"
                disabled={!isEditable}
                label=""
                max={100}
                min={0}
                onChange={(value) =>
                  applyToSelection({ fillOpacity: clamp(value, 0, 100) })
                }
                unit="%"
                value={selected.fillOpacity ?? 100}
              />
            </div>
            <span className="property-label text-size-label">Size</span>
            <div className="text-size-select">
              <DesignNumberField
                ariaLabel="Font size"
                disabled={!isEditable}
                label=""
                max={512}
                min={1}
                onChange={(value) =>
                  applyToSelection({
                    fontSize: Math.round(clamp(value, 1, 512)),
                  })
                }
                unit=""
                value={selected.fontSize ?? 24}
              />
              <DesignDropdown
                disabled={!isEditable}
                ariaLabel="Font size presets"
                noScroll
                onChange={(fontSize) =>
                  applyToSelection({ fontSize: Number(fontSize) })
                }
                options={fontSizePresets.map((fontSize) => ({
                  label: String(fontSize),
                  value: String(fontSize),
                }))}
                overlay
                value={String(selected.fontSize ?? 24)}
              />
            </div>
          </div>
          <div className="text-alignment-row">
            <span className="property-label">Alignment</span>
            <div>
              {(
                [
                  ["left", "Group 194.svg", "Align text left"],
                  ["center", "Group 193.svg", "Align text center"],
                  ["right", "Group 191.svg", "Align text right"],
                  ["justify", "Group 192.svg", "Justify text"],
                ] as const
              ).map(([alignment, asset, label]) => (
                <DesignIconButton
                  asset={asset}
                  disabled={!isEditable}
                  key={alignment}
                  label={label}
                  onClick={() => applyToSelection({ textAlign: alignment })}
                />
              ))}
            </div>
          </div>
          <div className="text-spacing-row">
            <span className="property-label">Leading</span>
            <DesignDropdown
              ariaLabel="Leading"
              className="text-leading-select"
              disabled={!isEditable}
              onChange={(next) =>
                applyToSelection({
                  lineHeight: next === "auto" ? "auto" : Number(next),
                })
              }
              options={[
                { label: "Auto", value: "auto" },
                { label: "1", value: "1" },
                { label: "1.2", value: "1.2" },
                { label: "1.5", value: "1.5" },
              ]}
              toggleIcon={
                <Image
                  alt=""
                  aria-hidden="true"
                  className="text-stepper-icon"
                  draggable={false}
                  height={11}
                  src={assetPath("/figma/design/Group%20181.svg")}
                  unoptimized
                  width={6}
                />
              }
              value={String(selected.lineHeight ?? "auto")}
            />
            <span className="property-label text-tracking-label">Tracking</span>
            <DesignDropdown
              ariaLabel="Tracking"
              className="text-tracking-select"
              disabled={!isEditable}
              onChange={(next) =>
                applyToSelection({
                  letterSpacing: next === "auto" ? "auto" : Number(next),
                })
              }
              options={[
                { label: "Auto", value: "auto" },
                { label: "0", value: "0" },
                { label: "1", value: "1" },
                { label: "2", value: "2" },
              ]}
              toggleIcon={
                <Image
                  alt=""
                  aria-hidden="true"
                  className="text-stepper-icon"
                  draggable={false}
                  height={11}
                  src={assetPath("/figma/design/Group%20181.svg")}
                  unoptimized
                  width={6}
                />
              }
              value={String(selected.letterSpacing ?? "auto")}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function SelectionOutlineSvg({
  centerOutset,
  controlScale,
  height,
  lineWidth,
  showCornerHandles = false,
  strokePlacement = "center",
  width,
}: {
  centerOutset: number;
  controlScale: number;
  height: number;
  lineWidth: number;
  showCornerHandles?: boolean;
  strokePlacement?: SelectionStrokePlacement;
  width: number;
}) {
  const safeHeight = Math.max(0.001, height);
  const safeWidth = Math.max(0.001, width);
  const outlineGeometry = selectionOutlineGeometry(
    width,
    height,
    lineWidth,
    centerOutset,
    strokePlacement,
  );
  const handleSize = 8 * controlScale;
  const corners = [
    { corner: "nw", x: -centerOutset, y: -centerOutset },
    { corner: "ne", x: width + centerOutset, y: -centerOutset },
    {
      corner: "se",
      x: width + centerOutset,
      y: height + centerOutset,
    },
    { corner: "sw", x: -centerOutset, y: height + centerOutset },
  ] as const;
  return (
    <svg
      aria-hidden="true"
      className="selection-outline-svg"
      data-selection-base-line-width={lineWidth}
      data-selection-center-outset={centerOutset}
      data-selection-stroke-placement={strokePlacement}
      preserveAspectRatio="none"
      shapeRendering="geometricPrecision"
      viewBox={`0 0 ${safeWidth} ${safeHeight}`}
    >
      <rect
        data-selection-frame="true"
        fill="none"
        height={outlineGeometry.height}
        stroke="var(--accent)"
        strokeWidth={outlineGeometry.lineWidth}
        vectorEffect="non-scaling-stroke"
        width={outlineGeometry.width}
        x={outlineGeometry.x}
        y={outlineGeometry.y}
      />
      {showCornerHandles
        ? corners.map(({ corner, x, y }) => (
            <rect
              data-handle-size={handleSize}
              data-selection-corner={corner}
              fill="var(--accent)"
              height={handleSize}
              key={corner}
              shapeRendering="crispEdges"
              width={handleSize}
              x={x - handleSize / 2}
              y={y - handleSize / 2}
            />
          ))
        : null}
    </svg>
  );
}

function PenEditControls({
  element,
  onHandlePointerDown,
  onNodePointerDown,
  selectedHandles,
  selectedNodes,
}: {
  element: CanvasElement;
  onHandlePointerDown: (
    event: ReactPointerEvent<HTMLButtonElement>,
    element: CanvasElement,
    pathIndex: number,
    nodeIndex: number,
    handle: "in" | "out",
  ) => void;
  onNodePointerDown: (
    event: ReactPointerEvent<HTMLButtonElement>,
    element: CanvasElement,
    pathIndex: number,
    nodeIndex: number,
  ) => void;
  selectedHandles: VectorHandleRef[];
  selectedNodes: VectorPointRef[];
}) {
  const paths = vectorPathsForElement(element);
  return (
    <div
      aria-label={`Edit nodes for ${element.name}`}
      className="pen-edit-controls"
    >
      {paths.map((path, pathIndex) =>
        path.points.map((point, nodeIndex) => {
          const nodeRef = { pathIndex, nodeIndex };
          const nodeLabel =
            pathIndex === 0
              ? `node ${nodeIndex + 1}`
              : `path ${pathIndex + 1} node ${nodeIndex + 1}`;
          const nodeSelected = selectedNodes.some(
            (selected) => vectorPointKey(selected) === vectorPointKey(nodeRef),
          );
          return (
            <span
              className="pen-edit-node-group"
              key={`${element.id}-${pathIndex}-${nodeIndex}`}
            >
              {point.handleIn ? (
                <>
                  <span
                    aria-hidden="true"
                    className="pen-handle-line"
                    style={penHandleLineStyle(point, point.handleIn)}
                  />
                  <button
                    aria-label={`Adjust ${element.name} ${nodeLabel} incoming handle`}
                    className={`pen-handle ${selectedHandles.some((selected) => vectorHandleKey(selected) === vectorHandleKey({ ...nodeRef, handle: "in" })) ? "is-selected" : ""}`}
                    onPointerDown={(event) =>
                      onHandlePointerDown(
                        event,
                        element,
                        pathIndex,
                        nodeIndex,
                        "in",
                      )
                    }
                    style={{ left: point.handleIn.x, top: point.handleIn.y }}
                    type="button"
                  />
                </>
              ) : null}
              {point.handleOut ? (
                <>
                  <span
                    aria-hidden="true"
                    className="pen-handle-line"
                    style={penHandleLineStyle(point, point.handleOut)}
                  />
                  <button
                    aria-label={`Adjust ${element.name} ${nodeLabel} outgoing handle`}
                    className={`pen-handle ${selectedHandles.some((selected) => vectorHandleKey(selected) === vectorHandleKey({ ...nodeRef, handle: "out" })) ? "is-selected" : ""}`}
                    onPointerDown={(event) =>
                      onHandlePointerDown(
                        event,
                        element,
                        pathIndex,
                        nodeIndex,
                        "out",
                      )
                    }
                    style={{ left: point.handleOut.x, top: point.handleOut.y }}
                    type="button"
                  />
                </>
              ) : null}
              <button
                aria-label={`Move ${element.name} ${nodeLabel}`}
                className={`pen-node ${nodeSelected ? "is-selected" : ""}`}
                onPointerDown={(event) =>
                  onNodePointerDown(event, element, pathIndex, nodeIndex)
                }
                style={{ left: point.x, top: point.y }}
                type="button"
              />
            </span>
          );
        }),
      )}
    </div>
  );
}

function ShapeGraphic({
  element,
  imageScale = 1,
}: {
  element: CanvasElement;
  imageScale?: number;
}) {
  const fill = colorWithOpacity(element.fill, element.fillOpacity);
  const strokeVisible = element.strokeStyle !== "none";
  const stroke = strokeVisible
    ? colorWithOpacity(element.stroke, element.strokeOpacity)
    : "none";
  const visibleStrokeWidth = strokeVisible ? element.strokeWidth : 0;
  const innerTransform: CSSProperties = {
    transform: visualFlipTransform(element),
    transformOrigin: "center",
  };
  const common = {
    fill,
    stroke,
    strokeDasharray: strokeDasharrayForElement(element),
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: visibleStrokeWidth,
    vectorEffect: "non-scaling-stroke" as const,
  };

  if (element.pathfinder?.paths.length) {
    const { imageFill, operation, paths, polygons } = element.pathfinder;
    const polygonPaths = polygons?.length
      ? polygons.map((polygon) =>
          polygon
            .map((ring) =>
              pathData(
                ringWithoutClosingPoint(ring).map(([x, y]) => ({ x, y })),
                true,
              ),
            )
            .join(" "),
        )
      : [paths.join(" ")];
    const imageOrigin = imageFill
      ? {
          x: imageFill.width / 2,
          y: imageFill.height / 2,
        }
      : { x: 0, y: 0 };
    const cropEdgeInset = imageFill && operation === "exclude" ? 0.2 : 0;
    const imageViewport = imageFill
      ? {
          bottom:
            (imageFill.flipY ? imageFill.crop.top : imageFill.crop.bottom) > 0
              ? cropEdgeInset
              : 0,
          left:
            (imageFill.flipX ? imageFill.crop.right : imageFill.crop.left) > 0
              ? cropEdgeInset
              : 0,
          right:
            (imageFill.flipX ? imageFill.crop.left : imageFill.crop.right) > 0
              ? cropEdgeInset
              : 0,
          top:
            (imageFill.flipY ? imageFill.crop.bottom : imageFill.crop.top) > 0
              ? cropEdgeInset
              : 0,
        }
      : { bottom: 0, left: 0, right: 0, top: 0 };
    const imageViewportWidth = imageFill
      ? Math.max(
          0.001,
          imageFill.width - imageViewport.left - imageViewport.right,
        )
      : 1;
    const imageViewportHeight = imageFill
      ? Math.max(
          0.001,
          imageFill.height - imageViewport.top - imageViewport.bottom,
        )
      : 1;
    const safeElementId = element.id.replace(/[^a-zA-Z0-9_-]/g, "-");
    const clipId = `pathfinder-clip-${safeElementId}`;
    const baseMaskId = `pathfinder-base-mask-${safeElementId}`;
    return (
      <svg
        aria-hidden="true"
        className="vector-shape"
        preserveAspectRatio="none"
        shapeRendering="geometricPrecision"
        style={innerTransform}
        viewBox={`0 0 ${Math.max(1, element.width)} ${Math.max(1, element.height)}`}
      >
        {imageFill ? (
          <>
            <defs>
              <clipPath clipPathUnits="userSpaceOnUse" id={clipId}>
                {polygonPaths.map((path, index) => (
                  <path
                    clipRule="evenodd"
                    d={path}
                    fillRule="evenodd"
                    key={`clip-${index}`}
                  />
                ))}
              </clipPath>
              <mask
                height={Math.max(1, element.height)}
                id={baseMaskId}
                maskContentUnits="userSpaceOnUse"
                maskUnits="userSpaceOnUse"
                width={Math.max(1, element.width)}
                x={0}
                y={0}
              >
                <rect
                  fill="#000"
                  height={Math.max(1, element.height)}
                  width={Math.max(1, element.width)}
                  x={0}
                  y={0}
                />
                {polygonPaths.map((path, index) => (
                  <path
                    d={path}
                    fill="#fff"
                    fillRule="evenodd"
                    key={`base-${index}`}
                  />
                ))}
                <g transform={`translate(${imageFill.x} ${imageFill.y})`}>
                  <g
                    transform={`rotate(${imageFill.rotation} ${imageOrigin.x} ${imageOrigin.y})`}
                  >
                    <rect
                      fill="#000"
                      height={imageFill.height}
                      width={imageFill.width}
                      x={0}
                      y={0}
                    />
                  </g>
                </g>
              </mask>
            </defs>
            <g mask={`url(#${baseMaskId})`}>
              {polygonPaths.map((path, index) => (
                <path
                  clipRule="evenodd"
                  d={path}
                  fill={fill}
                  fillRule="evenodd"
                  key={`fill-${index}`}
                />
              ))}
            </g>
            <g clipPath={`url(#${clipId})`}>
              <g transform={`translate(${imageFill.x} ${imageFill.y})`}>
                <g
                  transform={`rotate(${imageFill.rotation} ${imageOrigin.x} ${imageOrigin.y})`}
                >
                  <svg
                    data-pathfinder-image-viewport="true"
                    height={imageViewportHeight}
                    overflow="hidden"
                    preserveAspectRatio="none"
                    viewBox={`${imageViewport.left} ${imageViewport.top} ${imageViewportWidth} ${imageViewportHeight}`}
                    width={imageViewportWidth}
                    x={imageViewport.left}
                    y={imageViewport.top}
                  >
                    <g
                      transform={`translate(${imageFill.width / 2} ${imageFill.height / 2}) scale(${imageFill.flipX ? -1 : 1} ${imageFill.flipY ? -1 : 1}) translate(${-imageFill.width / 2} ${-imageFill.height / 2})`}
                    >
                      <image
                        height={
                          imageFill.crop.baseHeight * imageFill.crop.scaleY
                        }
                        href={imageFill.src}
                        preserveAspectRatio="none"
                        width={imageFill.crop.baseWidth * imageFill.crop.scaleX}
                        x={-imageFill.crop.left * imageFill.crop.scaleX}
                        y={-imageFill.crop.top * imageFill.crop.scaleY}
                      />
                    </g>
                  </svg>
                </g>
              </g>
            </g>
            {polygonPaths.map((path, index) => (
              <path
                {...common}
                clipRule="evenodd"
                d={path}
                fill="none"
                fillRule="evenodd"
                key={`stroke-${index}`}
              />
            ))}
          </>
        ) : (
          polygonPaths.map((path, index) => (
            <path
              {...common}
              clipRule="evenodd"
              d={path}
              fillRule="evenodd"
              key={`path-${index}`}
            />
          ))
        )}
      </svg>
    );
  }

  if (element.type === "triangle") {
    const points = polygonPointsForElement(element);
    const radii = polygonCornerRadii(element, points);
    return (
      <svg
        aria-hidden="true"
        className="vector-shape"
        preserveAspectRatio="none"
        shapeRendering="geometricPrecision"
        style={innerTransform}
        viewBox="0 0 100 100"
      >
        {radii.some((radius) => radius > 0) ? (
          <path d={roundedPolygonPath(points, radii)} {...common} />
        ) : (
          <polygon points={polygonPointString(points)} {...common} />
        )}
      </svg>
    );
  }

  if (element.type === "star") {
    const points = polygonPointsForElement(element);
    const radii = polygonCornerRadii(element, points);
    return (
      <svg
        aria-hidden="true"
        className="vector-shape"
        preserveAspectRatio="none"
        shapeRendering="geometricPrecision"
        style={innerTransform}
        viewBox="0 0 100 100"
      >
        {radii.some((radius) => radius > 0) ? (
          <path d={roundedPolygonPath(points, radii)} {...common} />
        ) : (
          <polygon points={polygonPointString(points)} {...common} />
        )}
      </svg>
    );
  }

  if (element.type === "pen") {
    const paths = vectorPathsForElement(element).length
      ? vectorPathsForElement(element)
      : [
          {
            points: [
              { x: 0, y: 0 },
              { x: Math.max(1, element.width), y: Math.max(1, element.height) },
            ],
          },
        ];
    return (
      <svg
        aria-hidden="true"
        className="vector-shape"
        preserveAspectRatio="none"
        shapeRendering="geometricPrecision"
        style={innerTransform}
        viewBox={`0 0 ${Math.max(1, element.width)} ${Math.max(1, element.height)}`}
      >
        {paths.map((path, index) => (
          <path
            aria-hidden="true"
            className="pen-hit-area"
            d={pathData(path.points, path.closed)}
            fill="none"
            key={`hit-${index}`}
            pointerEvents="stroke"
            stroke="transparent"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={Math.max(10, visibleStrokeWidth + 8)}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {paths.map((path, index) => (
          <path
            className="pen-visible-path"
            d={pathData(path.points, path.closed)}
            key={`visible-${index}`}
            stroke={stroke}
            strokeDasharray={strokeDasharrayForElement(element)}
            strokeOpacity={(element.strokeOpacity ?? 100) / 100}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={visibleStrokeWidth}
            fill={path.closed ? fill : "none"}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    );
  }

  if (element.type === "line") {
    return (
      <svg
        aria-hidden="true"
        className="vector-shape line-shape"
        preserveAspectRatio="none"
        shapeRendering="geometricPrecision"
        style={innerTransform}
        viewBox="0 0 100 24"
      >
        <line
          stroke={stroke}
          strokeDasharray={strokeDasharrayForElement(element)}
          strokeLinecap="round"
          strokeWidth={visibleStrokeWidth}
          vectorEffect="non-scaling-stroke"
          x1="0"
          x2="100"
          y1="12"
          y2="12"
        />
      </svg>
    );
  }

  if (element.type === "image") {
    const crop = imageCropForElement(element);
    return (
      <span
        className="image-shape"
        style={{
          ...innerTransform,
          borderColor: stroke,
          borderRadius: (element.cornerRadii ?? [element.cornerRadius])
            .map((radius) => `${radius}px`)
            .join(" "),
          borderStyle:
            element.strokeStyle === "none"
              ? "none"
              : (element.strokeStyle ?? "solid"),
          borderWidth: strokeVisible ? element.strokeWidth : 0,
        }}
      >
        <span
          className="image-shape-content"
          style={{
            height: crop.baseHeight * crop.scaleY * imageScale,
            left: -crop.left * crop.scaleX * imageScale,
            top: -crop.top * crop.scaleY * imageScale,
            width: crop.baseWidth * crop.scaleX * imageScale,
          }}
        >
          <span
            className="image-shape-source"
            style={{
              backgroundImage: `url(${element.src})`,
              height: crop.baseHeight * imageScale,
              transform: `scale(${crop.scaleX}, ${crop.scaleY})`,
              transformOrigin: "top left",
              width: crop.baseWidth * imageScale,
            }}
          />
        </span>
      </span>
    );
  }

  const radii = element.cornerRadii ?? [
    element.cornerRadius,
    element.cornerRadius,
    element.cornerRadius,
    element.cornerRadius,
  ];
  const uniformRadius = radii.every((radius) => radius === radii[0]);

  return (
    <svg
      aria-hidden="true"
      className={`vector-shape shape-${element.type}`}
      preserveAspectRatio="none"
      shapeRendering="geometricPrecision"
      style={innerTransform}
      viewBox={`0 0 ${Math.max(1, element.width)} ${Math.max(1, element.height)}`}
    >
      {element.type === "circle" ? (
        <ellipse
          {...common}
          cx={element.width / 2}
          cy={element.height / 2}
          rx={element.width / 2}
          ry={element.height / 2}
        />
      ) : uniformRadius ? (
        <rect
          {...common}
          height={element.height}
          rx={clamp(
            radii[0],
            0,
            Math.min(element.width / 2, element.height / 2),
          )}
          width={element.width}
        />
      ) : (
        <path d={pathData(roundedRectanglePoints(element), true)} {...common} />
      )}
    </svg>
  );
}

function DrawDraftOutline({
  height,
  lineWidth,
  width,
}: {
  height: number;
  lineWidth: number;
  width: number;
}) {
  return (
    <svg
      aria-hidden="true"
      className="draw-draft-outline"
      preserveAspectRatio="none"
      shapeRendering="geometricPrecision"
      viewBox={`0 0 ${Math.max(1, width)} ${Math.max(1, height)}`}
    >
      <rect
        fill="none"
        height={Math.max(1, height)}
        stroke="var(--accent)"
        strokeDasharray={`${3 * lineWidth} ${3 * lineWidth}`}
        strokeWidth={lineWidth}
        vectorEffect="non-scaling-stroke"
        width={Math.max(1, width)}
        x="0"
        y="0"
      />
    </svg>
  );
}

function DrawDraftPreview({
  bounds,
  draft,
  outlineWidth,
}: {
  bounds: ElementRect;
  draft: DrawDraft;
  outlineWidth: number;
}) {
  const previewElement: CanvasElement = {
    id: "draw-draft",
    name: "Draft",
    type: draft.type,
    x: bounds.x,
    y: bounds.y,
    width: Math.max(1, bounds.width),
    height: Math.max(1, bounds.height),
    rotation: 0,
    opacity: 100,
    fill: "#ffffff",
    stroke: "#000000",
    strokeWidth: 1,
    strokeStyle: draft.type === "line" ? "solid" : "none",
    cornerRadius: 0,
    visible: true,
    locked: false,
    text: draft.type === "text" ? "Text" : undefined,
  };

  return (
    <div
      className={`draw-draft draw-draft-preview draft-${draft.type}`}
      style={{
        height: Math.max(1, bounds.height),
        left: bounds.x,
        top: bounds.y,
        width: Math.max(1, bounds.width),
      }}
    >
      {draft.type === "text" ? (
        <div className="text-shape draft-text-preview">Text</div>
      ) : (
        <ShapeGraphic element={previewElement} />
      )}
      <DrawDraftOutline
        height={Math.max(1, bounds.height)}
        lineWidth={outlineWidth}
        width={Math.max(1, bounds.width)}
      />
    </div>
  );
}

function ShapePicker({
  selected,
  onSelect,
}: {
  selected: ShapeType;
  onSelect: (shape: ShapeType) => void;
}) {
  return (
    <div aria-label="Shape picker" className="shape-picker" role="toolbar">
      {shapeOptions.map((shape) => (
        <button
          aria-label={shape.label}
          aria-pressed={selected === shape.id}
          key={shape.id}
          onClick={() => onSelect(shape.id)}
          title={shape.label}
          type="button"
        >
          {shape.id === "pen" ? (
            <span aria-hidden="true" className="shape-picker-pen" />
          ) : null}
        </button>
      ))}
    </div>
  );
}

function ScenePreview({
  artboard,
  elements,
}: {
  artboard: ArtboardSettings;
  elements: CanvasElement[];
}) {
  const previewSize = 49;
  const scale = Math.max(
    previewSize / artboard.width,
    previewSize / artboard.height,
  );
  const offsetX = (previewSize - artboard.width * scale) / 2;
  const offsetY = (previewSize - artboard.height * scale) / 2;

  return (
    <span className="scene-thumbnail">
      <span
        aria-hidden="true"
        className="scene-preview-world"
        style={{
          height: artboard.height,
          left: offsetX,
          top: offsetY,
          transform: `scale(${scale})`,
          width: artboard.width,
        }}
      >
        <ArtboardBackground artboard={artboard} playVideo={false} />
        {elements
          .filter((element) => element.visible)
          .map((element) => (
            <span
              className={`scene-preview-element preview-${element.type}`}
              key={element.id}
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
                <span
                  className="text-shape"
                  style={textStyleForElement(element)}
                >
                  {element.text}
                </span>
              ) : (
                <ShapeGraphic element={element} />
              )}
            </span>
          ))}
      </span>
    </span>
  );
}

function viewerPreviewLayout(
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

function ViewerBackgroundMusic({
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

type ViewerInteractionPointerSession = {
  dragging: boolean;
  elementId: string;
  startX: number;
  startY: number;
};

type ViewerInteractionAudioChannel = {
  audio: HTMLAudioElement;
  ended: boolean;
  envelopeCancel: (() => void) | null;
  fadeCancel: (() => void) | null;
};

type ViewerActiveInteractionSound = {
  channels: ViewerInteractionAudioChannel[];
  continuous: boolean;
  elementId: string;
  fadeOutSeconds: number;
  settingId: string;
  stopping: boolean;
  targetVolume: number;
  trigger: InteractionSoundTrigger;
};

type ViewerInteractionAudioGraph = {
  compressor: DynamicsCompressorNode;
  panner: StereoPannerNode | null;
};

function ViewerPreview({
  advancedSound,
  artboard,
  backgroundMusic,
  elements,
  mixer,
  onClose,
}: {
  advancedSound: SoundAdvancedSettings;
  artboard: ArtboardSettings;
  backgroundMusic: BackgroundMusicSettings;
  elements: CanvasElement[];
  mixer: SoundMixerSettings;
  onClose: () => void;
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

function LayerSymbol({ element }: { element: CanvasElement }) {
  const { pathfinder, type } = element;
  if (pathfinder) {
    const asset = pathfinderLayerAssets[pathfinder.operation];
    const dimensions = designAssetDimensions[asset] ?? {
      height: 17,
      width: 17,
    };
    return (
      <Image
        alt=""
        aria-hidden="true"
        className="layer-pathfinder-icon"
        height={dimensions.height}
        src={assetPath(`/figma/design/${encodeURIComponent(asset)}`)}
        width={dimensions.width}
      />
    );
  }

  if (type === "text") {
    return (
      <Image
        alt=""
        aria-hidden="true"
        className="layer-text-icon"
        height={17}
        src={assetPath("/figma/text.svg")}
        width={18}
      />
    );
  }

  if (type === "triangle") {
    return (
      <svg aria-hidden="true" viewBox="0 0 15 15">
        <polygon
          fill="none"
          points="7.5,1 14,13.5 1,13.5"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="0.8"
        />
      </svg>
    );
  }

  if (type === "star") {
    return (
      <svg aria-hidden="true" viewBox="0 0 15 15">
        <polygon
          fill="none"
          points="7.5,1 9.15,5.4 13.85,5.4 10.05,8.1 11.5,13 7.5,10.25 3.5,13 4.95,8.1 1.15,5.4 5.85,5.4"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="0.8"
        />
      </svg>
    );
  }

  if (type === "line") {
    return (
      <svg aria-hidden="true" viewBox="0 0 15 15">
        <line
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="0.8"
          x1="2"
          x2="13"
          y1="13"
          y2="2"
        />
      </svg>
    );
  }

  if (type === "pen") {
    return <span aria-hidden="true" className="pen-icon" />;
  }

  return null;
}

function ScrollArea({
  children,
  className,
}: {
  children: ReactNode;
  className: "asset-grid" | "layer-list" | "scene-list";
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    renderScale: number;
    startTop: number;
    startY: number;
    travel: number;
    scrollRange: number;
  } | null>(null);
  const [metrics, setMetrics] = useState({
    clientHeight: 0,
    scrollHeight: 0,
    scrollTop: 0,
  });

  const measure = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    setMetrics({
      clientHeight: viewport.clientHeight,
      scrollHeight: viewport.scrollHeight,
      scrollTop: viewport.scrollTop,
    });
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    measure();
    const handleScroll = () => measure();
    viewport.addEventListener("scroll", handleScroll, { passive: true });
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    resizeObserver?.observe(viewport);
    const mutationObserver =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(measure);
    mutationObserver?.observe(viewport, { childList: true, subtree: true });

    return () => {
      viewport.removeEventListener("scroll", handleScroll);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [children]);

  const hasOverflow = metrics.scrollHeight > metrics.clientHeight + 1;
  const hasInsetTrack =
    className === "asset-grid" || className === "scene-list";
  const compactScrollbarTrack = hasInsetTrack && metrics.clientHeight < 60;
  const scrollbarInset = hasInsetTrack && !compactScrollbarTrack ? 20 : 0;
  const scrollbarTrackHeight = Math.max(
    0,
    metrics.clientHeight - scrollbarInset,
  );
  const thumbHeight = hasOverflow
    ? scrollbarTrackHeight > 0
      ? Math.min(
          scrollbarTrackHeight,
          Math.max(
            28,
            (scrollbarTrackHeight * metrics.clientHeight) /
              metrics.scrollHeight,
          ),
        )
      : 0
    : scrollbarTrackHeight;
  const travel = Math.max(0, scrollbarTrackHeight - thumbHeight);
  const scrollRange = Math.max(1, metrics.scrollHeight - metrics.clientHeight);
  const thumbTop = hasOverflow ? travel * (metrics.scrollTop / scrollRange) : 0;

  const handleThumbPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport || !hasOverflow) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const renderedHeight = viewport.getBoundingClientRect().height;
    const renderScale =
      viewport.clientHeight > 0 && Number.isFinite(renderedHeight)
        ? renderedHeight / viewport.clientHeight
        : 1;
    dragRef.current = {
      pointerId: event.pointerId,
      renderScale: renderScale > 0 ? renderScale : 1,
      scrollRange,
      startTop: thumbTop,
      startY: event.clientY,
      travel,
    };
  };

  const handleThumbPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    if (!drag || !viewport || drag.pointerId !== event.pointerId) return;
    const nextTop = clamp(
      drag.startTop + (event.clientY - drag.startY) / drag.renderScale,
      0,
      drag.travel,
    );
    viewport.scrollTop =
      (nextTop / Math.max(1, drag.travel)) * drag.scrollRange;
  };

  const handleThumbPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  };

  return (
    <div className={`scroll-area ${className}-scroll-area`}>
      <div className={`scroll-viewport ${className}`} ref={viewportRef}>
        {children}
      </div>
      {hasOverflow ? (
        <div
          aria-hidden="true"
          className={
            compactScrollbarTrack
              ? "custom-scrollbar is-compact"
              : "custom-scrollbar"
          }
          data-scrollbar-for={className}
        >
          <div
            className="custom-scrollbar-thumb"
            onPointerCancel={handleThumbPointerUp}
            onPointerDown={handleThumbPointerDown}
            onPointerMove={handleThumbPointerMove}
            onPointerUp={handleThumbPointerUp}
            style={{
              height: thumbHeight,
              minHeight: thumbHeight,
              transform: `translateY(${thumbTop}px)`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function EditorShell() {
  const {
    activePageId,
    activeTool,
    addElement,
    addPage,
    artboard,
    checkpoint,
    clipboard,
    copySelected,
    future,
    pages,
    pasteClipboard,
    past,
    redo,
    removePage,
    removeSelected,
    replaceElements,
    renameElement,
    renamePage,
    selectedElementIds,
    selectedShape,
    setActivePageId,
    setActiveTool,
    setSelectedElementIds,
    setSelectedShape,
    setZoom,
    setBackgroundMusicArtwork,
    toggleElementLocked,
    toggleElementVisible,
    undo,
    updateArtboard,
    updateAdvancedSound,
    updateBackgroundMusic,
    updateElement,
    updateElements,
    updateSoundMixer,
    zoom,
  } = useEditorStore();
  const activePage = pages.find((page) => page.id === activePageId) ?? pages[0];
  const elements = useMemo(() => activePage?.elements ?? [], [activePage]);
  const backgroundMusicSettings: BackgroundMusicSettings = {
    ...defaultBackgroundMusicSettings,
    ...(activePage?.backgroundMusic ?? {}),
  };
  const advancedSoundSettings: SoundAdvancedSettings = {
    ...defaultSoundAdvancedSettings,
    ...(activePage?.advancedSound ?? {}),
  };
  const soundMixerSettings: SoundMixerSettings = {
    ...defaultSoundMixerSettings,
    ...(activePage?.soundMixer ?? {}),
  };
  const selectionToolActive =
    activeTool === "selection" || activeTool === "settings";
  const [assetTab, setAssetTab] = useState<"image" | "video">("image");
  const [propertyTab, setPropertyTab] = useState<PropertyTab>("design");
  const [uploadedAssets, setUploadedAssets] = useState<string[]>([]);
  const backgroundMusicObjectUrlsRef = useRef(new Set<string>());
  const editorMountedRef = useRef(true);
  const [lockRatio, setLockRatio] = useState(true);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [interfaceScaleMode, setInterfaceScaleMode] =
    useState<InterfaceScaleMode>("auto");
  const [screenWidthCss, setScreenWidthCss] = useState(0);
  const [viewportWidthCss, setViewportWidthCss] = useState(0);
  const [displayPixelRatio, setDisplayPixelRatio] = useState(1);
  const [interfaceScaleReady, setInterfaceScaleReady] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [navigatorVisible, setNavigatorVisible] = useState(false);
  const [navigatorViewport, setNavigatorViewport] = useState<NavigatorViewport>(
    {
      height: artboard.height,
      width: artboard.width,
      x: 0,
      y: 0,
    },
  );
  const [drawDraft, setDrawDraft] = useState<DrawDraft | null>(null);
  const [penDraft, setPenDraft] = useState<PenDraft | null>(null);
  const [pendingPenUndoId, setPendingPenUndoId] = useState<string | null>(null);
  const [nodeEditElementId, setNodeEditElementId] = useState<string | null>(
    null,
  );
  const [selectedPenNodes, setSelectedPenNodes] = useState<VectorPointRef[]>(
    [],
  );
  const [selectedPenHandles, setSelectedPenHandles] = useState<
    VectorHandleRef[]
  >([]);
  const [penHandleMirroring] = useState<HandleMirroring>("angle-length");
  const [distanceMeasurements, setDistanceMeasurements] = useState<
    DistanceMeasurement[]
  >([]);
  const [marquee, setMarquee] = useState<{
    start: Point;
    current: Point;
  } | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  const [rulersVisible, setRulersVisible] = useState(false);
  const [guidesByPage, setGuidesByPage] = useState<
    Record<string, EditorGuide[]>
  >({});
  const [guidePreview, setGuidePreview] = useState<{
    orientation: EditorGuide["orientation"];
    position: number;
  } | null>(null);
  const [selectedGuideIds, setSelectedGuideIds] = useState<string[]>([]);
  const [guideClipboard, setGuideClipboard] = useState<EditorGuide[]>([]);
  const [artboardSelected, setArtboardSelected] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [pageNameDraft, setPageNameDraft] = useState("");
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [elementNameDraft, setElementNameDraft] = useState("");
  const canvasRef = useRef<HTMLElement>(null);
  const horizontalRulerRef = useRef<HTMLCanvasElement>(null);
  const verticalRulerRef = useRef<HTMLCanvasElement>(null);
  const guideDragRef = useRef<GuideDrag | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const rawDragActiveRef = useRef(false);
  const renderDragPreviewRef = useRef<(sample: DragPointerSample) => void>(
    () => undefined,
  );
  const horizontalSmartGuideRef = useRef<HTMLDivElement>(null);
  const verticalSmartGuideRef = useRef<HTMLDivElement>(null);
  const distanceMeasurementRefs = useRef<Array<HTMLDivElement | null>>([]);
  const finishPenPathRef = useRef<(() => void) | null>(null);
  const navigatorTimerRef = useRef<number | null>(null);
  const previousZoomRef = useRef(zoom);
  const pointerPositionRef = useRef<Point | null>(null);
  const altPressedRef = useRef(false);
  const lastTextPointerDownRef = useRef<{
    elementId: string;
    time: number;
    x: number;
    y: number;
  } | null>(null);
  const lastPathfinderPointerDownRef = useRef<{
    elementId: string;
    time: number;
    x: number;
    y: number;
  } | null>(null);
  const textEditorRefs = useRef(new Map<string, HTMLDivElement>());
  const viewMenuRef = useRef<HTMLDivElement>(null);

  const resolvedInterfaceScale = resolveInterfaceScale(
    interfaceScaleMode,
    screenWidthCss,
    displayPixelRatio,
  );
  const totalScale = zoom / 100;
  const selectionUiScale = 100 / Math.max(5, zoom);
  const selectionControlScale = 1 / Math.max(Number.EPSILON, totalScale);
  const selectionOutlineWidth = selectionControlScale;
  const selectionCaptionGap = 8 * selectionUiScale;
  const selectionCaptionHeight = 20 * selectionUiScale;

  const applyZoomToFit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return false;

    const nextZoom = calculateCanvasFitZoom(
      bounds.width,
      bounds.height,
      artboard.width,
      artboard.height,
    );
    setPan((current) =>
      current.x === 0 && current.y === 0 ? current : { x: 0, y: 0 },
    );
    setZoom(nextZoom);
    return true;
  }, [artboard.height, artboard.width, setZoom]);

  const selectInterfaceScale = useCallback((mode: InterfaceScaleMode) => {
    setInterfaceScaleMode(mode);
    try {
      window.localStorage.setItem(INTERFACE_SCALE_STORAGE_KEY, mode);
    } catch {
      // The setting still applies for this session when storage is unavailable.
    }
    setViewMenuOpen(false);
  }, []);

  useEffect(() => {
    let resolutionQuery: MediaQueryList | null = null;
    const watchResolutionChanges = () => {
      resolutionQuery?.removeEventListener("change", updateDisplayMetrics);
      resolutionQuery =
        typeof window.matchMedia === "function"
          ? window.matchMedia(
              `(resolution: ${Math.max(1, window.devicePixelRatio || 1)}dppx)`,
            )
          : null;
      resolutionQuery?.addEventListener("change", updateDisplayMetrics);
    };
    const updateDisplayMetrics = () => {
      setScreenWidthCss(window.screen?.width || window.innerWidth);
      setViewportWidthCss(window.innerWidth);
      setDisplayPixelRatio(Math.max(1, window.devicePixelRatio || 1));
      watchResolutionChanges();
    };
    let disposed = false;
    let frame = 0;
    const initializeInterface = () => {
      if (disposed) return;
      try {
        const screenWidth = window.screen?.width || window.innerWidth;
        const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
        const mode = migrateInterfaceScaleMode(
          window.localStorage.getItem(INTERFACE_SCALE_STORAGE_KEY),
          window.localStorage.getItem(LEGACY_INTERFACE_SCALE_STORAGE_KEY),
          screenWidth,
          pixelRatio,
        );
        window.localStorage.setItem(INTERFACE_SCALE_STORAGE_KEY, mode);
        setInterfaceScaleMode(mode);
      } catch {
        setInterfaceScaleMode("auto");
      }
      updateDisplayMetrics();
      setInterfaceScaleReady(true);
    };
    const revealAfterFontLoad = () => {
      frame = window.requestAnimationFrame(initializeInterface);
    };
    const fontLoad = document.fonts?.load?.(
      '500 12px "Inter Variable"',
      "AMOUS",
    );
    if (fontLoad) {
      void fontLoad.then(revealAfterFontLoad, revealAfterFontLoad);
    } else {
      revealAfterFontLoad();
    }
    window.addEventListener("resize", updateDisplayMetrics);
    return () => {
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
      resolutionQuery?.removeEventListener("change", updateDisplayMetrics);
      window.removeEventListener("resize", updateDisplayMetrics);
    };
  }, []);

  useEffect(() => {
    if (!viewMenuOpen) return;
    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (!viewMenuRef.current?.contains(event.target as Node | null)) {
        setViewMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [viewMenuOpen]);

  useEffect(() => {
    if (previousZoomRef.current === zoom) return;
    previousZoomRef.current = zoom;
    setNavigatorVisible(true);
    if (navigatorTimerRef.current) {
      window.clearTimeout(navigatorTimerRef.current);
    }
    navigatorTimerRef.current = window.setTimeout(() => {
      setNavigatorVisible(false);
      navigatorTimerRef.current = null;
    }, 3000);
    return () => {
      if (navigatorTimerRef.current) {
        window.clearTimeout(navigatorTimerRef.current);
        navigatorTimerRef.current = null;
      }
    };
  }, [zoom]);

  useEffect(() => {
    if (!editingTextId) return;
    const editor = textEditorRefs.current.get(editingTextId);
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [editingTextId]);

  useLayoutEffect(() => {
    elements.forEach((element) => {
      if (
        element.type !== "text" ||
        element.textResizeMode !== "auto-width" ||
        editingTextId === element.id
      ) {
        return;
      }
      const editor = textEditorRefs.current.get(element.id);
      if (!editor || editor.scrollWidth <= 0) return;
      const fontSize = element.fontSize ?? 24;
      const lineHeight =
        typeof element.lineHeight === "number"
          ? element.lineHeight * fontSize
          : fontSize * 1.2;
      const width = Math.max(1, Math.ceil(editor.scrollWidth + 1));
      const height = Math.max(lineHeight, Math.ceil(editor.scrollHeight));
      if (
        Math.abs(width - element.width) < 0.5 &&
        Math.abs(height - element.height) < 0.5
      ) {
        return;
      }
      updateElement(element.id, { height, width });
    });
  }, [editingTextId, elements, updateElement]);

  const selectedElements = useMemo(
    () => elements.filter((element) => selectedElementIds.includes(element.id)),
    [elements, selectedElementIds],
  );
  const visiblePropertyTab = propertyTab;
  const guides = useMemo(
    () => guidesByPage[activePageId] ?? [],
    [activePageId, guidesByPage],
  );
  const updateGuides = useCallback(
    (updater: (current: EditorGuide[]) => EditorGuide[]) => {
      setGuidesByPage((current) => ({
        ...current,
        [activePageId]: updater(current[activePageId] ?? []),
      }));
    },
    [activePageId],
  );
  const setStableDistanceMeasurements = useCallback(
    (next: DistanceMeasurement[]) => {
      setDistanceMeasurements((current) =>
        areDistanceMeasurementsEqual(current, next) ? current : next,
      );
    },
    [],
  );
  const updateAltDistanceMeasurements = useCallback(
    (clientX: number, clientY: number) => {
      const pointerTarget = document.elementFromPoint(clientX, clientY);
      if (pointerTarget?.closest(".resize-handle, .line-endpoint")) {
        setStableDistanceMeasurements([]);
        return;
      }

      const selectedGuide =
        selectedElements.length === 0 && selectedGuideIds.length === 1
          ? guides.find((guide) => guide.id === selectedGuideIds[0])
          : undefined;
      const selectedBounds = boundsFromElements(selectedElements);
      if (!selectedBounds && !selectedGuide) {
        setStableDistanceMeasurements([]);
        return;
      }

      const hovered = elementAtClientPoint(clientX, clientY);
      const targetId = hovered?.dataset.elementId;
      const hoveredGuideNode = guideAtClientPoint(clientX, clientY);
      const targetGuide = guides.find(
        (guide) =>
          guide.id === hoveredGuideNode?.dataset.guideId &&
          guide.id !== selectedGuide?.id,
      );

      if (selectedGuide) {
        const target = elements.find((element) => element.id === targetId);
        setStableDistanceMeasurements(
          buildDistanceMeasurementsFromGuide(
            selectedGuide,
            artboard,
            target ? rectFromElement(target) : undefined,
            targetGuide,
          ),
        );
        return;
      }

      if (!selectedBounds) return;
      const selectedIds = new Set(
        selectedElements.map((element) => element.id),
      );
      const subject = selectedBounds;
      const target = elements.find(
        (element) => element.id === targetId && !selectedIds.has(element.id),
      );
      setStableDistanceMeasurements(
        targetGuide
          ? buildGuideDistanceMeasurements(subject, targetGuide)
          : buildDistanceMeasurements(
              subject,
              artboard,
              target ? rectFromElement(target) : undefined,
            ),
      );
    },
    [
      artboard,
      elements,
      guides,
      selectedGuideIds,
      selectedElements,
      setStableDistanceMeasurements,
    ],
  );

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const artboardNode = document.getElementById("editor-artboard");
    if (!canvas || !artboardNode) return;

    const updateNavigatorViewport = () => {
      const canvasBounds = canvas.getBoundingClientRect();
      const artboardBounds = artboardNode.getBoundingClientRect();
      const viewportWidth = canvas.clientWidth / Math.max(0.01, totalScale);
      const viewportHeight = canvas.clientHeight / Math.max(0.01, totalScale);
      const x =
        (canvasBounds.left - artboardBounds.left) / Math.max(0.01, totalScale);
      const y =
        (canvasBounds.top - artboardBounds.top) / Math.max(0.01, totalScale);
      setNavigatorViewport((current) => {
        const next = {
          height: viewportHeight,
          width: viewportWidth,
          x,
          y,
        };
        return Math.abs(current.x - next.x) < 0.1 &&
          Math.abs(current.y - next.y) < 0.1 &&
          Math.abs(current.width - next.width) < 0.1 &&
          Math.abs(current.height - next.height) < 0.1
          ? current
          : next;
      });
    };

    updateNavigatorViewport();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateNavigatorViewport);
      return () =>
        window.removeEventListener("resize", updateNavigatorViewport);
    }
    const observer = new ResizeObserver(updateNavigatorViewport);
    observer.observe(canvas);
    window.addEventListener("resize", updateNavigatorViewport);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateNavigatorViewport);
    };
  }, [artboard.height, artboard.width, pan.x, pan.y, totalScale]);

  useEffect(() => {
    if (!rulersVisible) return;
    const canvas = canvasRef.current;
    const horizontalRuler = horizontalRulerRef.current;
    const verticalRuler = verticalRulerRef.current;
    if (!canvas || !horizontalRuler || !verticalRuler) return;

    let frame = 0;
    const render = () => {
      frame = 0;
      const canvasBounds = canvas.getBoundingClientRect();
      const artboardNode = document.getElementById("editor-artboard");
      if (!artboardNode) return;
      const artboardBounds = artboardNode.getBoundingClientRect();
      const horizontalWidth = Math.max(1, canvas.clientWidth - rulerSize);
      const verticalHeight = Math.max(1, canvas.clientHeight - rulerSize);
      const horizontalOrigin =
        artboardBounds.left - canvasBounds.left - rulerSize;
      const verticalOrigin = artboardBounds.top - canvasBounds.top - rulerSize;
      const selectedNodes = selectedElementIds
        .map((id) =>
          canvas.querySelector<HTMLElement>(`[data-element-id="${id}"]`),
        )
        .filter((node): node is HTMLElement => Boolean(node));
      const highlightNodes = selectedNodes.length
        ? selectedNodes
        : [artboardNode];
      const horizontalRanges = highlightNodes.map((node) => {
        const bounds = node.getBoundingClientRect();
        return {
          end: bounds.right - canvasBounds.left - rulerSize,
          start: bounds.left - canvasBounds.left - rulerSize,
        };
      });
      const verticalRanges = highlightNodes.map((node) => {
        const bounds = node.getBoundingClientRect();
        return {
          end: bounds.bottom - canvasBounds.top - rulerSize,
          start: bounds.top - canvasBounds.top - rulerSize,
        };
      });
      const horizontalContext = prepareRulerCanvas(
        horizontalRuler,
        horizontalWidth,
        rulerSize,
      );
      const verticalContext = prepareRulerCanvas(
        verticalRuler,
        rulerSize,
        verticalHeight,
      );
      if (horizontalContext) {
        drawRuler(
          horizontalContext,
          "horizontal",
          horizontalWidth,
          rulerSize,
          horizontalOrigin,
          totalScale,
          horizontalRanges,
        );
      }
      if (verticalContext) {
        drawRuler(
          verticalContext,
          "vertical",
          rulerSize,
          verticalHeight,
          verticalOrigin,
          totalScale,
          verticalRanges,
        );
      }
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    schedule();
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(canvas);
    window.addEventListener("resize", schedule);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [
    artboard.height,
    artboard.width,
    elements,
    pan.x,
    pan.y,
    rulersVisible,
    selectedElementIds,
    totalScale,
    displayPixelRatio,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventBrowserZoom = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault();
    };
    canvas.addEventListener("wheel", preventBrowserZoom, { passive: false });
    return () => canvas.removeEventListener("wheel", preventBrowserZoom);
  }, []);

  const moveSelectedPenNodes = useCallback(
    (delta: Point) => {
      if (!nodeEditElementId || !selectedPenNodes.length) return false;
      const element = elements.find((item) => item.id === nodeEditElementId);
      if (!element || element.type !== "pen") return false;
      const selectedKeys = new Set(
        selectedPenNodes.map((nodeRef) => vectorPointKey(nodeRef)),
      );
      const paths = cloneVectorPaths(vectorPathsForElement(element)).map(
        (path, pathIndex) => ({
          ...path,
          points: path.points.map((point, nodeIndex) => {
            if (!selectedKeys.has(vectorPointKey({ pathIndex, nodeIndex }))) {
              return point;
            }
            return {
              ...point,
              x: point.x + delta.x,
              y: point.y + delta.y,
              handleIn: point.handleIn
                ? {
                    x: point.handleIn.x + delta.x,
                    y: point.handleIn.y + delta.y,
                  }
                : undefined,
              handleOut: point.handleOut
                ? {
                    x: point.handleOut.x + delta.x,
                    y: point.handleOut.y + delta.y,
                  }
                : undefined,
            };
          }),
        }),
      );
      checkpoint();
      updateElement(element.id, vectorElementGeometryUpdate(element, paths));
      return true;
    },
    [checkpoint, elements, nodeEditElementId, selectedPenNodes, updateElement],
  );

  const removeLastPenDraftPoint = useCallback(() => {
    if (!penDraft) return false;
    gestureRef.current = null;
    const points = penDraft.points.slice(0, -1);
    if (!points.length) {
      setPenDraft(null);
      return true;
    }
    const lastPoint = points.at(-1)!;
    setPenDraft({
      ...penDraft,
      current: { x: lastPoint.x, y: lastPoint.y },
      isDragging: false,
      points,
    });
    return true;
  }, [penDraft]);

  const removeLastPenNode = useCallback(
    (elementId: string) => {
      const element = elements.find((item) => item.id === elementId);
      if (!element || element.type !== "pen") return false;

      const paths = cloneVectorPaths(vectorPathsForElement(element));
      const lastPathIndex = paths.findLastIndex((path) => path.points.length);
      if (lastPathIndex < 0) return false;

      const nextPaths = clearOrphanedVectorHandles(
        paths
          .map((path, pathIndex) =>
            pathIndex === lastPathIndex
              ? { ...path, points: path.points.slice(0, -1) }
              : path,
          )
          .filter((path) => path.points.length > 0),
      );

      const remainingPointCount = nextPaths.reduce(
        (total, path) => total + path.points.length,
        0,
      );
      if (!nextPaths.length || remainingPointCount < 2) {
        setSelectedElementIds([elementId]);
        removeSelected();
        setPendingPenUndoId(null);
        setNodeEditElementId(null);
        setSelectedPenNodes([]);
        setSelectedPenHandles([]);
        return true;
      }

      checkpoint();
      updateElement(
        element.id,
        vectorElementGeometryUpdate(element, nextPaths),
      );
      setPendingPenUndoId(null);
      setSelectedPenNodes([]);
      setSelectedPenHandles([]);
      return true;
    },
    [
      checkpoint,
      elements,
      removeSelected,
      setSelectedElementIds,
      updateElement,
    ],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (previewVisible) {
        if (event.key === "Escape") {
          event.preventDefault();
          setPreviewVisible(false);
        }
        return;
      }
      if (event.code === "Space" && !isEditableTarget(event.target)) {
        event.preventDefault();
        const focusedElement = document.activeElement;
        if (
          focusedElement instanceof HTMLElement &&
          focusedElement.closest(".tool-rail")
        ) {
          focusedElement.blur();
        }
        setSpacePressed(true);
      }
      if (isEditableTarget(event.target)) return;

      if (
        event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        event.code === "Digit1"
      ) {
        event.preventDefault();
        setViewMenuOpen(false);
        applyZoomToFit();
        return;
      }

      if (event.key === "Alt") {
        event.preventDefault();
        altPressedRef.current = true;
        const pointerPosition = pointerPositionRef.current;
        if (pointerPosition && !gestureRef.current) {
          updateAltDistanceMeasurements(pointerPosition.x, pointerPosition.y);
        }
        return;
      }

      if (
        event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        event.key.toLowerCase() === "g"
      ) {
        event.preventDefault();
        if (
          !selectedElements.length ||
          selectedElements.some((element) => element.locked)
        ) {
          return;
        }
        const selectedGroupIds = new Set(
          selectedElements
            .map((element) => element.groupId)
            .filter((groupId): groupId is string => Boolean(groupId)),
        );
        const selectedGroupId =
          selectedGroupIds.size === 1 ? [...selectedGroupIds][0] : undefined;
        const shouldUngroup = Boolean(
          selectedGroupId &&
          selectedElements.every(
            (element) => element.groupId === selectedGroupId,
          ),
        );
        if (shouldUngroup && selectedGroupId) {
          const groupedElements = elements.filter(
            (element) => element.groupId === selectedGroupId,
          );
          checkpoint();
          groupedElements.forEach((element) =>
            updateElement(element.id, { groupId: undefined }),
          );
          setSelectedElementIds(groupedElements.map((element) => element.id));
          return;
        }
        if (selectedElements.length < 2) return;
        const groupId = createElementId("group");
        checkpoint();
        selectedElements.forEach((element) =>
          updateElement(element.id, { groupId }),
        );
        return;
      }

      if (!event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "t") {
        event.preventDefault();
        if (penDraft) finishPenPathRef.current?.();
        setPenDraft(null);
        setNodeEditElementId(null);
        setSelectedPenNodes([]);
        setSelectedPenHandles([]);
        setActiveTool("text");
        return;
      }

      if (!event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setSelectedShape("pen");
        setActiveTool("rectangle");
        return;
      }

      if (
        event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        event.key.toLowerCase() === "r"
      ) {
        event.preventDefault();
        setRulersVisible((visible) => !visible);
        setGuidePreview(null);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (penDraft) {
          if (!event.shiftKey) removeLastPenDraftPoint();
          return;
        }
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        if (artboardSelected) return;
        if (selectedGuideIds.length) {
          setGuideClipboard(
            guides
              .filter((guide) => selectedGuideIds.includes(guide.id))
              .map((guide) => ({ ...guide })),
          );
        } else {
          setGuideClipboard([]);
          copySelected();
        }
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
        event.preventDefault();
        if (guideClipboard.length) {
          const pastedGuides = guideClipboard.map((guide) => ({
            ...guide,
            id: createElementId("guide"),
            position: guide.position + 16,
          }));
          updateGuides((current) => [...current, ...pastedGuides]);
          setSelectedElementIds([]);
          setSelectedGuideIds(pastedGuides.map((guide) => guide.id));
        } else {
          pasteClipboard();
        }
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelectedElementIds(
          elements
            .filter((element) => element.visible)
            .map((element) => element.id),
        );
        setSelectedGuideIds([]);
        setArtboardSelected(false);
        return;
      }
      if (event.key === "Enter") {
        const selectedText =
          selectedElements.length === 1 && selectedElements[0].type === "text"
            ? selectedElements[0]
            : null;
        if (selectedText) {
          event.preventDefault();
          setEditingTextId(selectedText.id);
          return;
        }
        const selectedPen =
          selectedElements.length === 1 && selectedElements[0].type === "pen"
            ? selectedElements[0]
            : null;
        if (selectedPen) {
          event.preventDefault();
          setNodeEditElementId(selectedPen.id);
          setSelectedPenNodes([]);
          setSelectedPenHandles([]);
          return;
        }
      }
      if (
        nodeEditElementId &&
        selectedPenNodes.length &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        event.preventDefault();
        const amount = event.shiftKey ? 10 : 1;
        const delta = {
          x:
            event.key === "ArrowLeft"
              ? -amount
              : event.key === "ArrowRight"
                ? amount
                : 0,
          y:
            event.key === "ArrowUp"
              ? -amount
              : event.key === "ArrowDown"
                ? amount
                : 0,
        };
        moveSelectedPenNodes(delta);
        return;
      }
      if (
        !nodeEditElementId &&
        selectedElementIds.length &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        const movableIds = selectedElementIds.filter((id) =>
          elements.some((element) => element.id === id && !element.locked),
        );
        if (!movableIds.length) return;

        event.preventDefault();
        const amount = event.shiftKey ? 10 : 1;
        const delta = {
          x:
            event.key === "ArrowLeft"
              ? -amount
              : event.key === "ArrowRight"
                ? amount
                : 0,
          y:
            event.key === "ArrowUp"
              ? -amount
              : event.key === "ArrowDown"
                ? amount
                : 0,
        };
        checkpoint();
        updateElements(movableIds, delta.x, delta.y);
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        if (penDraft) {
          removeLastPenDraftPoint();
          return;
        }
        if (
          !nodeEditElementId &&
          pendingPenUndoId &&
          selectedElementIds.length === 1 &&
          selectedElementIds[0] === pendingPenUndoId &&
          removeLastPenNode(pendingPenUndoId)
        ) {
          return;
        }
        if (
          nodeEditElementId &&
          !selectedPenNodes.length &&
          !selectedPenHandles.length &&
          removeLastPenNode(nodeEditElementId)
        ) {
          return;
        }
        if (
          nodeEditElementId &&
          (selectedPenNodes.length || selectedPenHandles.length)
        ) {
          const element = elements.find(
            (item) => item.id === nodeEditElementId,
          );
          if (element?.type === "pen") {
            const paths = cloneVectorPaths(vectorPathsForElement(element));
            const selectedNodeKeys = new Set(
              selectedPenNodes.map((nodeRef) => vectorPointKey(nodeRef)),
            );
            const selectedHandleKeys = new Set(
              selectedPenHandles.map((handleRef) => vectorHandleKey(handleRef)),
            );
            const nextPaths = clearOrphanedVectorHandles(
              paths
                .map((path, pathIndex) => ({
                  ...path,
                  points: path.points
                    .map((point, nodeIndex) => ({ point, nodeIndex }))
                    .filter(
                      ({ nodeIndex }) =>
                        !selectedNodeKeys.has(
                          vectorPointKey({ pathIndex, nodeIndex }),
                        ),
                    )
                    .map(({ point, nodeIndex }) => ({
                      ...point,
                      handleIn: selectedHandleKeys.has(
                        vectorHandleKey({ pathIndex, nodeIndex, handle: "in" }),
                      )
                        ? undefined
                        : point.handleIn,
                      handleOut: selectedHandleKeys.has(
                        vectorHandleKey({
                          pathIndex,
                          nodeIndex,
                          handle: "out",
                        }),
                      )
                        ? undefined
                        : point.handleOut,
                    })),
                }))
                .filter((path) => path.points.length > 0),
            );
            checkpoint();
            const remainingPointCount = nextPaths.reduce(
              (total, path) => total + path.points.length,
              0,
            );
            if (!nextPaths.length || remainingPointCount < 2) {
              setSelectedElementIds([element.id]);
              removeSelected();
              setNodeEditElementId(null);
              setSelectedPenNodes([]);
              setSelectedPenHandles([]);
            } else {
              updateElement(
                element.id,
                vectorElementGeometryUpdate(element, nextPaths),
              );
              setSelectedPenNodes([]);
              setSelectedPenHandles([]);
            }
          }
          return;
        }
        if (nodeEditElementId) return;
        if (artboardSelected) {
          removePage();
          setArtboardSelected(false);
          return;
        }
        const hasElementSelection = selectedElementIds.length > 0;
        const hasGuideSelection = selectedGuideIds.length > 0;
        if (hasElementSelection) removeSelected();
        if (hasGuideSelection) {
          updateGuides((current) =>
            current.filter((guide) => !selectedGuideIds.includes(guide.id)),
          );
          setSelectedGuideIds([]);
        }
        if (!hasElementSelection && !hasGuideSelection) removePage();
        return;
      }
      if (event.key === "Escape") {
        if (penDraft) {
          finishPenPathRef.current?.();
          gestureRef.current = null;
          setActiveTool("selection");
          return;
        }
        if (nodeEditElementId) {
          setNodeEditElementId(null);
          setSelectedPenNodes([]);
          setSelectedPenHandles([]);
          return;
        }
        setEditingTextId(null);
        setPenDraft(null);
        setSelectedElementIds([]);
        setSelectedGuideIds([]);
        setArtboardSelected(false);
        setActiveTool("selection");
        previewSmartGuides(
          {
            horizontal: horizontalSmartGuideRef.current,
            vertical: verticalSmartGuideRef.current,
          },
          [],
        );
        previewDistanceMeasurements(distanceMeasurementRefs.current, []);
        setStableDistanceMeasurements([]);
        (document.activeElement as HTMLElement | null)?.blur();
        return;
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpacePressed(false);
      if (event.key === "Alt") {
        altPressedRef.current = false;
        previewDistanceMeasurements(distanceMeasurementRefs.current, []);
        setStableDistanceMeasurements([]);
      }
    };
    const clearTransientModifierState = () => {
      altPressedRef.current = false;
      setSpacePressed(false);
      previewDistanceMeasurements(distanceMeasurementRefs.current, []);
      setStableDistanceMeasurements([]);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearTransientModifierState();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearTransientModifierState);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearTransientModifierState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    applyZoomToFit,
    artboardSelected,
    checkpoint,
    copySelected,
    elements,
    guideClipboard,
    guides,
    pasteClipboard,
    redo,
    removePage,
    removeSelected,
    removeLastPenDraftPoint,
    removeLastPenNode,
    moveSelectedPenNodes,
    nodeEditElementId,
    pendingPenUndoId,
    penDraft,
    previewVisible,
    selectedElements,
    selectedGuideIds,
    selectedElementIds,
    selectedPenHandles,
    selectedPenNodes,
    setStableDistanceMeasurements,
    setSelectedPenHandles,
    setSelectedPenNodes,
    setSelectedShape,
    setActiveTool,
    setSelectedElementIds,
    undo,
    updateAltDistanceMeasurements,
    updateElement,
    updateElements,
    updateGuides,
  ]);

  const getLocalPoint = (clientX: number, clientY: number): Point => {
    return localPointFromElement(
      document.getElementById("editor-artboard"),
      clientX,
      clientY,
      totalScale,
    );
  };

  const zoomAtClientPoint = (
    requestedZoom: number,
    clientX: number,
    clientY: number,
  ) => {
    const nextZoom = clamp(requestedZoom, 5, 500);
    if (nextZoom === zoom) return;
    const artboardNode = document.getElementById("editor-artboard");
    if (!artboardNode) {
      setZoom(nextZoom);
      return;
    }
    const bounds = artboardNode.getBoundingClientRect();
    const currentCenter = {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    };
    const nextScale = nextZoom / 100;
    const scaleRatio = nextScale / Math.max(0.01, totalScale);
    setPan((current) => ({
      x: current.x + (clientX - currentCenter.x) * (1 - scaleRatio),
      y: current.y + (clientY - currentCenter.y) * (1 - scaleRatio),
    }));
    setZoom(nextZoom);
  };

  const zoomAtCanvasCenter = (requestedZoom: number) => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) {
      setZoom(requestedZoom);
      return;
    }
    zoomAtClientPoint(
      requestedZoom,
      bounds.left + bounds.width / 2,
      bounds.top + bounds.height / 2,
    );
  };

  const getCanvasGuidePosition = (
    orientation: EditorGuide["orientation"],
    clientX: number,
    clientY: number,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const bounds = canvas.getBoundingClientRect();
    return orientation === "horizontal"
      ? clientY - bounds.top
      : clientX - bounds.left;
  };

  const getWorldGuidePosition = (
    orientation: EditorGuide["orientation"],
    clientX: number,
    clientY: number,
  ) => {
    const artboardNode = document.getElementById("editor-artboard");
    if (!artboardNode) return 0;
    const bounds = artboardNode.getBoundingClientRect();
    return orientation === "horizontal"
      ? (clientY - bounds.top) / totalScale
      : (clientX - bounds.left) / totalScale;
  };

  const snapGuidePosition = (
    orientation: EditorGuide["orientation"],
    position: number,
  ) => {
    const elementEdges = elements
      .filter((element) => element.visible)
      .flatMap((element) =>
        orientation === "horizontal"
          ? [element.y, element.y + element.height]
          : [element.x, element.x + element.width],
      );
    const candidates = [
      0,
      orientation === "horizontal" ? artboard.height : artboard.width,
      ...elementEdges,
    ];
    const threshold = 8 / Math.max(totalScale, 0.01);
    const nearest = candidates.reduce((current, candidate) =>
      Math.abs(candidate - position) < Math.abs(current - position)
        ? candidate
        : current,
    );
    return Math.abs(nearest - position) <= threshold ? nearest : position;
  };

  const getCanvasPositionForWorldGuide = (
    orientation: EditorGuide["orientation"],
    position: number,
  ) => {
    const canvas = canvasRef.current;
    const artboardNode = document.getElementById("editor-artboard");
    if (!canvas || !artboardNode) return 0;
    const canvasBounds = canvas.getBoundingClientRect();
    const artboardBounds = artboardNode.getBoundingClientRect();
    return orientation === "horizontal"
      ? artboardBounds.top - canvasBounds.top + position * totalScale
      : artboardBounds.left - canvasBounds.left + position * totalScale;
  };

  const previewGuideBoardDistance = (
    orientation: EditorGuide["orientation"],
    position: number,
  ) => {
    setStableDistanceMeasurements(
      buildDistanceMeasurementsFromGuide(
        { id: "guide-drag-preview", orientation, position },
        artboard,
      ),
    );
  };

  const handleRulerPointerDown = (
    event: ReactPointerEvent<HTMLCanvasElement>,
    orientation: EditorGuide["orientation"],
  ) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    guideDragRef.current = {
      orientation,
      pointerId: event.pointerId,
      source: "ruler",
    };
    setSelectedGuideIds([]);
    previewDistanceMeasurements(distanceMeasurementRefs.current, []);
    setStableDistanceMeasurements([]);
    setGuidePreview({
      orientation,
      position: getCanvasGuidePosition(
        orientation,
        event.clientX,
        event.clientY,
      ),
    });
  };

  const handleGuidePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    guide: EditorGuide,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedElementIds([]);
    setSelectedGuideIds([guide.id]);
    event.currentTarget.setPointerCapture(event.pointerId);
    guideDragRef.current = {
      guideId: guide.id,
      orientation: guide.orientation,
      pointerId: event.pointerId,
      source: "guide",
    };
    previewGuideBoardDistance(guide.orientation, guide.position);
  };

  const handleGuidePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = guideDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const position = snapGuidePosition(
      drag.orientation,
      getWorldGuidePosition(drag.orientation, event.clientX, event.clientY),
    );
    if (drag.source === "ruler") {
      setGuidePreview({
        orientation: drag.orientation,
        position: getCanvasPositionForWorldGuide(drag.orientation, position),
      });
      previewGuideBoardDistance(drag.orientation, position);
      return;
    }

    updateGuides((current) =>
      current.map((guide) =>
        guide.id === drag.guideId ? { ...guide, position } : guide,
      ),
    );
    previewGuideBoardDistance(drag.orientation, position);
  };

  const handleGuidePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = guideDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const canvas = canvasRef.current;
    const canvasBounds = canvas?.getBoundingClientRect();
    const returnedToRuler = canvasBounds
      ? drag.orientation === "horizontal"
        ? event.clientY <= canvasBounds.top + rulerSize
        : event.clientX <= canvasBounds.left + rulerSize
      : false;

    if (drag.source === "ruler") {
      const insideCanvas = canvasBounds
        ? event.clientX >= canvasBounds.left &&
          event.clientX <= canvasBounds.right &&
          event.clientY >= canvasBounds.top &&
          event.clientY <= canvasBounds.bottom
        : false;
      if (insideCanvas && !returnedToRuler) {
        const guideId = createElementId("guide");
        updateGuides((current) => [
          ...current,
          {
            id: guideId,
            orientation: drag.orientation,
            position: snapGuidePosition(
              drag.orientation,
              getWorldGuidePosition(
                drag.orientation,
                event.clientX,
                event.clientY,
              ),
            ),
          },
        ]);
        setSelectedElementIds([]);
        setSelectedGuideIds([guideId]);
      }
      setGuidePreview(null);
    } else if (returnedToRuler) {
      updateGuides((current) =>
        current.filter((guide) => guide.id !== drag.guideId),
      );
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    previewDistanceMeasurements(distanceMeasurementRefs.current, []);
    setStableDistanceMeasurements([]);
    guideDragRef.current = null;
  };

  const beginPenPath = (event: ReactPointerEvent<HTMLElement>) => {
    const rawPoint = getLocalPoint(event.clientX, event.clientY);
    const branchElement = penDraft?.branchElementId
      ? elements.find((element) => element.id === penDraft.branchElementId)
      : undefined;
    const localPoint = branchElement
      ? elementLocalPoint(branchElement, rawPoint)
      : rawPoint;
    const previousPoint = penDraft?.points.at(-1);
    const point =
      event.shiftKey && previousPoint
        ? constrainAngle(localPoint, previousPoint)
        : localPoint;
    const firstPoint = penDraft?.points[0];
    const closesPath =
      firstPoint &&
      penDraft.points.length >= 2 &&
      Math.hypot(point.x - firstPoint.x, point.y - firstPoint.y) <= 8;
    if (closesPath && penDraft) {
      createElementFromPenDraft({
        ...penDraft,
        closed: true,
        current: firstPoint,
        isDragging: false,
      });
      setPenDraft(null);
      gestureRef.current = null;
      return;
    }

    const anchor: PenAnchor = { x: point.x, y: point.y };
    const points = penDraft ? [...penDraft.points, anchor] : [anchor];
    setPenDraft({ current: point, isDragging: false, points });
    gestureRef.current = {
      kind: "pen",
      pointerId: event.pointerId,
      anchorIndex: points.length - 1,
      start: point,
    };
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const beginDrawing = (event: ReactPointerEvent<HTMLElement>) => {
    if (activeTool !== "text" && selectedShape === "pen") {
      beginPenPath(event);
      return;
    }

    const point = getLocalPoint(event.clientX, event.clientY);
    const draft: DrawDraft = {
      current: point,
      start: point,
      type:
        activeTool === "text"
          ? "text"
          : (selectedShape as Exclude<ShapeType, "pen">),
    };
    rawDragActiveRef.current = false;
    gestureRef.current = {
      kind: "draw",
      pointerId: event.pointerId,
      draft,
      scale: totalScale,
      startClient: { x: event.clientX, y: event.clientY },
    };
    setDrawDraft(draft);
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const createElementFromDraft = (draft: DrawDraft) => {
    let bounds = boundsFromPoints(draft.start, draft.current);
    const isClick = bounds.width < 4 && bounds.height < 4;
    if (isClick) {
      const defaults =
        draft.type === "text"
          ? { width: 1, height: 29 }
          : draft.type === "line"
            ? { width: 120, height: 40 }
            : { width: 100, height: 100 };
      bounds = {
        x: draft.start.x,
        y: draft.start.y,
        ...defaults,
      };
    }

    const type = draft.type;
    const line =
      type === "line"
        ? lineGeometry(
            draft.start,
            isClick
              ? { x: draft.start.x + 120, y: draft.start.y }
              : draft.current,
          )
        : null;
    const baseName = type === "text" ? "Text" : shapeNames[type];
    const count =
      elements.filter((element) => element.type === type).length + 1;
    const id = createElementId(type);
    setPendingPenUndoId(null);
    addElement({
      id,
      name: `${baseName} ${count}`,
      type,
      x: Math.round(line?.x ?? bounds.x),
      y: Math.round(line?.y ?? bounds.y),
      width: Math.round(line?.width ?? Math.max(8, bounds.width)),
      height: Math.round(line?.height ?? Math.max(8, bounds.height)),
      rotation: line?.rotation ?? 0,
      opacity: 100,
      fill: type === "text" ? "#000000" : "#ffffff",
      stroke: type === "text" ? "transparent" : "#000000",
      strokeWidth: type === "text" ? 0 : 1,
      strokeStyle: type === "line" ? "solid" : "none",
      cornerRadius: 0,
      visible: true,
      locked: false,
      text: type === "text" ? "" : undefined,
      textResizeMode:
        type === "text" ? (isClick ? "auto-width" : "fixed") : undefined,
    });
    if (type === "text") setEditingTextId(id);
    setArtboardSelected(false);
  };

  const seedPenCreationHistory = (
    element: CanvasElement,
    paths: VectorPath[],
    appendedPathIndex: number,
  ) => {
    const appendedPath = paths[appendedPathIndex];
    if (!appendedPath || appendedPath.points.length < 2) return;

    for (
      let pointCount = 2;
      pointCount < appendedPath.points.length;
      pointCount += 1
    ) {
      const partialPaths = paths.map((path, pathIndex) =>
        pathIndex === appendedPathIndex
          ? { ...path, closed: false, points: path.points.slice(0, pointCount) }
          : path,
      );
      updateElement(
        element.id,
        vectorElementGeometryUpdate(element, partialPaths),
      );
      checkpoint();
    }
    updateElement(element.id, vectorElementGeometryUpdate(element, paths));
  };

  const createElementFromPenDraft = (draft: PenDraft) => {
    const points = draft.points.filter(
      (point, index) =>
        index === 0 ||
        point.x !== draft.points[index - 1].x ||
        point.y !== draft.points[index - 1].y,
    );
    if (points.length < 2) return;
    if (draft.branchElementId) {
      const target = elements.find(
        (element) => element.id === draft.branchElementId,
      );
      if (target?.type === "pen") {
        const paths = [
          ...cloneVectorPaths(vectorPathsForElement(target)),
          { points, closed: draft.closed },
        ];
        checkpoint();
        seedPenCreationHistory(target, paths, paths.length - 1);
        setSelectedElementIds([target.id]);
        setNodeEditElementId(target.id);
        setSelectedPenNodes([]);
        setSelectedPenHandles([]);
        setPendingPenUndoId(target.id);
        return;
      }
    }
    const bounds = boundsFromPointList(
      vectorVisualGeometryPoints([{ points, closed: draft.closed }]),
    );
    const localPoints = points.map((point) => ({
      x: point.x - bounds.x,
      y: point.y - bounds.y,
      handleIn: point.handleIn
        ? {
            x: point.handleIn.x - bounds.x,
            y: point.handleIn.y - bounds.y,
          }
        : undefined,
      handleOut: point.handleOut
        ? {
            x: point.handleOut.x - bounds.x,
            y: point.handleOut.y - bounds.y,
          }
        : undefined,
    }));
    const count =
      elements.filter((element) => element.type === "pen").length + 1;
    const id = createElementId("pen");
    const fullPaths = [{ points: localPoints, closed: draft.closed }];
    const createdElement: CanvasElement = {
      id,
      name: `Pen ${count}`,
      type: "pen",
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.max(8, Math.round(bounds.width)),
      height: Math.max(8, Math.round(bounds.height)),
      rotation: 0,
      opacity: 100,
      fill: "transparent",
      stroke: "#000000",
      strokeWidth: 1,
      strokeStyle: "solid",
      cornerRadius: 0,
      visible: true,
      locked: false,
      points: localPoints,
      closed: draft.closed,
      vectorPaths: fullPaths,
    };
    addElement(createdElement);
    seedPenCreationHistory(createdElement, fullPaths, 0);
    setPendingPenUndoId(id);
    setNodeEditElementId(id);
    setSelectedPenNodes([]);
    setSelectedPenHandles([]);
    setArtboardSelected(false);
  };

  function finishPenPath() {
    if (!penDraft) return;
    createElementFromPenDraft(penDraft);
    setPenDraft(null);
  }

  finishPenPathRef.current = finishPenPath;

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    const usingHand = activeTool === "hand" || spacePressed;
    if (usingHand) {
      rawDragActiveRef.current = false;
      gestureRef.current = {
        currentPan: pan,
        kind: "pan",
        pointerId: event.pointerId,
        startClient: { x: event.clientX, y: event.clientY },
        startPan: pan,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (activeTool === "zoom") {
      zoomAtClientPoint(
        zoom + (event.button === 2 ? -10 : 10),
        event.clientX,
        event.clientY,
      );
      return;
    }
    if (activeTool === "rectangle" || activeTool === "text") {
      if (
        event.target instanceof Element &&
        event.target.closest(".navigator")
      ) {
        return;
      }
      setArtboardSelected(false);
      beginDrawing(event);
      return;
    }
    if (event.target === event.currentTarget && selectionToolActive) {
      setSelectedElementIds([]);
      setSelectedGuideIds([]);
      setNodeEditElementId(null);
      setArtboardSelected(false);
    }
  };

  const handlePenPathPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    element: CanvasElement,
  ) => {
    const paths = vectorPathsForElement(element);
    const localPoint = elementLocalPoint(
      element,
      getLocalPoint(event.clientX, event.clientY),
    );
    const insertion = nearestVectorPathPosition(paths, localPoint);
    if (!insertion || insertion.distance > 14 / Math.max(0.08, totalScale)) {
      return false;
    }
    const nextPaths = cloneVectorPaths(paths);
    const nextPath = splitVectorSegment(
      nextPaths[insertion.pathIndex],
      insertion.segmentIndex,
      clamp(insertion.t, 0.05, 0.95),
    );
    nextPaths[insertion.pathIndex] = nextPath;
    const insertedNodeIndex =
      nextPath.points.length === paths[insertion.pathIndex].points.length + 1
        ? insertion.segmentIndex + 1
        : nextPath.points.length - 1;
    checkpoint();
    updateElement(element.id, vectorElementGeometryUpdate(element, nextPaths));
    setSelectedPenNodes([
      { pathIndex: insertion.pathIndex, nodeIndex: insertedNodeIndex },
    ]);
    setSelectedPenHandles([]);
    event.preventDefault();
    event.stopPropagation();
    return true;
  };

  const handleArtboardPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (spacePressed) return;
    if (activeTool === "rectangle" || activeTool === "text") {
      event.stopPropagation();
      setArtboardSelected(false);
      beginDrawing(event);
      return;
    }
    if (!selectionToolActive || spacePressed) return;

    event.stopPropagation();
    setSelectedGuideIds([]);
    setNodeEditElementId(null);
    setArtboardSelected(false);
    const point = getLocalPoint(event.clientX, event.clientY);
    rawDragActiveRef.current = false;
    gestureRef.current = {
      kind: "marquee",
      pointerId: event.pointerId,
      start: point,
      current: point,
      additive: event.shiftKey,
      scale: totalScale,
      startClient: { x: event.clientX, y: event.clientY },
    };
    setMarquee({ start: point, current: point });
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const handleElementPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    element: CanvasElement,
  ) => {
    const penToolActive = activeTool === "rectangle" && selectedShape === "pen";
    if (editingTextId === element.id) {
      event.stopPropagation();
      return;
    }
    if (selectionToolActive && element.type === "text") {
      const previous = lastTextPointerDownRef.current;
      const now = event.timeStamp;
      const isDoubleClick = Boolean(
        previous &&
        previous.elementId === element.id &&
        now - previous.time <= 400 &&
        Math.hypot(event.clientX - previous.x, event.clientY - previous.y) <= 6,
      );
      lastTextPointerDownRef.current = {
        elementId: element.id,
        time: now,
        x: event.clientX,
        y: event.clientY,
      };
      if (isDoubleClick && !element.locked) {
        event.preventDefault();
        event.stopPropagation();
        gestureRef.current = null;
        setSelectedElementIds([element.id]);
        setSelectedGuideIds([]);
        setNodeEditElementId(null);
        setArtboardSelected(false);
        setEditingTextId(element.id);
        return;
      }
    }
    if (activeTool === "text" && element.type === "text" && !element.locked) {
      event.stopPropagation();
      setSelectedElementIds([element.id]);
      setSelectedGuideIds([]);
      setEditingTextId(element.id);
      setNodeEditElementId(null);
      setArtboardSelected(false);
      return;
    }
    if ((!selectionToolActive && !penToolActive) || spacePressed) {
      return;
    }
    if (
      selectionToolActive &&
      element.type === "pen" &&
      element.pathfinder &&
      nodeEditElementId !== element.id
    ) {
      const previous = lastPathfinderPointerDownRef.current;
      const now = event.timeStamp;
      const isDoubleClick = Boolean(
        previous &&
        previous.elementId === element.id &&
        now - previous.time <= 400 &&
        Math.hypot(event.clientX - previous.x, event.clientY - previous.y) <= 6,
      );
      lastPathfinderPointerDownRef.current = isDoubleClick
        ? null
        : {
            elementId: element.id,
            time: now,
            x: event.clientX,
            y: event.clientY,
          };
      if (isDoubleClick && !element.locked) {
        event.preventDefault();
        event.stopPropagation();
        gestureRef.current = null;
        setSelectedElementIds([element.id]);
        setSelectedGuideIds([]);
        setNodeEditElementId(element.id);
        setSelectedPenNodes([]);
        setSelectedPenHandles([]);
        setArtboardSelected(false);
        return;
      }
    }
    event.stopPropagation();
    if (penToolActive && element.type === "pen") {
      if (!nodeEditElementId) {
        setNodeEditElementId(element.id);
        setSelectedElementIds([element.id]);
        setSelectedPenNodes([]);
        setSelectedPenHandles([]);
      }
      if (event.target instanceof SVGPathElement) {
        handlePenPathPointerDown(event, element);
      }
      return;
    }
    if (
      element.type === "pen" &&
      nodeEditElementId === element.id &&
      event.target instanceof SVGPathElement
    ) {
      handlePenPathPointerDown(event, element);
      return;
    }
    if (element.type === "pen" && !element.pathfinder && !event.shiftKey) {
      setNodeEditElementId(element.id);
      setSelectedPenNodes([]);
      setSelectedPenHandles([]);
    } else if (nodeEditElementId !== element.id) {
      setNodeEditElementId(null);
      setSelectedPenNodes([]);
      setSelectedPenHandles([]);
    }
    setSelectedGuideIds([]);
    setArtboardSelected(false);

    const targetSelectionIds = selectionIdsForElement(elements, element);
    const targetSelectionSet = new Set(targetSelectionIds);
    let nextSelection = selectedElementIds;
    if (event.shiftKey) {
      const allSelected = targetSelectionIds.every((id) =>
        selectedElementIds.includes(id),
      );
      nextSelection = allSelected
        ? selectedElementIds.filter((id) => !targetSelectionSet.has(id))
        : [...new Set([...selectedElementIds, ...targetSelectionIds])];
      setSelectedElementIds(nextSelection);
    } else if (
      !targetSelectionIds.every((id) => selectedElementIds.includes(id))
    ) {
      nextSelection = targetSelectionIds;
      setSelectedElementIds(nextSelection);
    }

    if (element.locked || !nextSelection.includes(element.id)) return;
    const movableSelection = nextSelection.filter(
      (id) => !elements.find((item) => item.id === id)?.locked,
    );
    const initialElements = elements.filter((item) =>
      movableSelection.includes(item.id),
    );
    if (!initialElements.length) return;
    const fixedElements = elements.filter(
      (item) => !movableSelection.includes(item.id),
    );
    setStableDistanceMeasurements([]);
    checkpoint();
    rawDragActiveRef.current = false;
    gestureRef.current = {
      appliedDelta: { x: 0, y: 0 },
      fixedElements,
      fixedRects: fixedElements
        .filter((item) => item.visible)
        .map(rectFromElement),
      kind: "move",
      initialElements,
      pointerId: event.pointerId,
      previewTargets: collectMovePreviewTargets(initialElements),
      selectionBounds: boundsFromElements(initialElements),
      selectionIds: movableSelection,
      startClient: { x: event.clientX, y: event.clientY },
    };
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const handleResizePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    element: CanvasElement,
    handle: ResizeHandle,
  ) => {
    event.stopPropagation();
    checkpoint();
    rawDragActiveRef.current = false;
    gestureRef.current = {
      appliedUpdates: {
        height: element.height,
        width: element.width,
        x: element.x,
        y: element.y,
      },
      kind: "resize",
      pointerId: event.pointerId,
      elementId: element.id,
      handle,
      initial: { ...element },
      previewTargets: collectResizePreviewTargets(element.id),
      scale: totalScale,
      startClient: { x: event.clientX, y: event.clientY },
    };
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const handleMultiResizePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    handle: ResizeHandle,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (
      selectedElements.length < 2 ||
      selectedElements.some((element) => element.locked)
    ) {
      return;
    }
    const initialBounds = boundsFromElements(selectedElements);
    if (!initialBounds) return;
    checkpoint();
    rawDragActiveRef.current = false;
    gestureRef.current = {
      appliedElements: selectedElements,
      handle,
      initialBounds,
      initialElements: selectedElements,
      kind: "multi-resize",
      pointerId: event.pointerId,
      previewTargets: collectMultiResizePreviewTargets(
        selectedElements.map((element) => element.id),
      ),
      scale: totalScale,
      startClient: { x: event.clientX, y: event.clientY },
    };
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const handleImageCropPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    element: CanvasElement,
    handle: ImageResizeHandle,
  ) => {
    if (element.locked) return;
    event.preventDefault();
    event.stopPropagation();
    checkpoint();
    gestureRef.current = {
      kind: "image-crop-resize",
      pointerId: event.pointerId,
      elementId: element.id,
      handle,
      startLocal: getLocalPoint(event.clientX, event.clientY),
      initial: { ...element },
    };
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePenNodePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    element: CanvasElement,
    pathIndex: number,
    nodeIndex: number,
  ) => {
    const paths = vectorPathsForElement(element);
    if (element.locked || !paths[pathIndex]?.points[nodeIndex]) return;
    event.preventDefault();
    event.stopPropagation();
    if (
      activeTool === "rectangle" &&
      selectedShape === "pen" &&
      nodeEditElementId === element.id
    ) {
      const anchor = paths[pathIndex].points[nodeIndex];
      setPenDraft({
        branchElementId: element.id,
        current: { x: anchor.x, y: anchor.y },
        isDragging: false,
        points: [{ x: anchor.x, y: anchor.y }],
      });
      gestureRef.current = {
        kind: "pen",
        pointerId: event.pointerId,
        anchorIndex: 0,
        start: { x: anchor.x, y: anchor.y },
      };
      canvasRef.current?.setPointerCapture(event.pointerId);
      return;
    }
    setPendingPenUndoId(null);
    const nodeRef = { pathIndex, nodeIndex };
    const isAlreadySelected = selectedPenNodes.some(
      (selected) => vectorPointKey(selected) === vectorPointKey(nodeRef),
    );
    const nodeRefs = event.shiftKey
      ? isAlreadySelected
        ? selectedPenNodes.filter(
            (selected) => vectorPointKey(selected) !== vectorPointKey(nodeRef),
          )
        : [...selectedPenNodes, nodeRef]
      : isAlreadySelected
        ? selectedPenNodes
        : [nodeRef];
    setSelectedPenNodes(nodeRefs);
    setSelectedPenHandles([]);
    gestureRef.current = {
      historyRecorded: false,
      kind: "pen-node",
      pointerId: event.pointerId,
      elementId: element.id,
      nodeRefs,
      initial: {
        ...element,
        points: paths[0]?.points,
        vectorPaths: cloneVectorPaths(paths),
      },
      startLocal: elementLocalPoint(
        element,
        getLocalPoint(event.clientX, event.clientY),
      ),
    };
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePenHandlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    element: CanvasElement,
    pathIndex: number,
    nodeIndex: number,
    handle: "in" | "out",
  ) => {
    const paths = vectorPathsForElement(element);
    const anchor = paths[pathIndex]?.points[nodeIndex];
    if (element.locked || !anchor) return;
    event.preventDefault();
    event.stopPropagation();
    setPendingPenUndoId(null);
    const handleRef = { pathIndex, nodeIndex, handle };
    const isAlreadySelected = selectedPenHandles.some(
      (selected) => vectorHandleKey(selected) === vectorHandleKey(handleRef),
    );
    const handleRefs = event.shiftKey
      ? isAlreadySelected
        ? selectedPenHandles.filter(
            (selected) =>
              vectorHandleKey(selected) !== vectorHandleKey(handleRef),
          )
        : [...selectedPenHandles, handleRef]
      : isAlreadySelected
        ? selectedPenHandles
        : [handleRef];
    setSelectedPenHandles(handleRefs);
    setSelectedPenNodes([]);
    gestureRef.current = {
      historyRecorded: false,
      kind: "pen-handle",
      pointerId: event.pointerId,
      elementId: element.id,
      handleRefs,
      initial: {
        ...element,
        points: paths[0]?.points,
        vectorPaths: cloneVectorPaths(paths),
      },
      startLocal: elementLocalPoint(
        element,
        getLocalPoint(event.clientX, event.clientY),
      ),
    };
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const handleLineEndpointPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    element: CanvasElement,
    endpoint: "start" | "end",
  ) => {
    event.stopPropagation();
    const endpoints = lineEndpoints(element);
    checkpoint();
    gestureRef.current = {
      kind: "line-endpoint",
      pointerId: event.pointerId,
      elementId: element.id,
      endpoint,
      fixedPoint: endpoints[endpoint === "start" ? "end" : "start"],
    };
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  renderDragPreviewRef.current = (sample) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== sample.pointerId) return;

    if (gesture.kind === "pan") {
      const currentPan = {
        x: gesture.startPan.x + sample.x - gesture.startClient.x,
        y: gesture.startPan.y + sample.y - gesture.startClient.y,
      };
      previewArtboardPan(currentPan);
      gestureRef.current = { ...gesture, currentPan };
      return;
    }

    if (gesture.kind === "draw") {
      let point = {
        x:
          gesture.draft.start.x +
          (sample.x - gesture.startClient.x) / gesture.scale,
        y:
          gesture.draft.start.y +
          (sample.y - gesture.startClient.y) / gesture.scale,
      };
      const angleConstraint =
        sample.ctrlKey || sample.metaKey || sample.shiftKey;
      if (angleConstraint && gesture.draft.type === "line") {
        point = constrainAngle(point, gesture.draft.start);
      } else if (sample.ctrlKey || sample.shiftKey) {
        const deltaX = point.x - gesture.draft.start.x;
        const deltaY = point.y - gesture.draft.start.y;
        const size = Math.max(Math.abs(deltaX), Math.abs(deltaY));
        point = {
          x: gesture.draft.start.x + Math.sign(deltaX || 1) * size,
          y: gesture.draft.start.y + Math.sign(deltaY || 1) * size,
        };
      }
      const draft = { ...gesture.draft, current: point };
      gestureRef.current = { ...gesture, draft };
      previewDrawDraft(draft);
      return;
    }

    if (gesture.kind === "move") {
      const rawDelta = {
        x: (sample.x - gesture.startClient.x) / totalScale,
        y: (sample.y - gesture.startClient.y) / totalScale,
      };
      const constrained = sample.shiftKey
        ? Math.abs(rawDelta.x) >= Math.abs(rawDelta.y)
          ? { x: rawDelta.x, y: 0 }
          : { x: 0, y: rawDelta.y }
        : rawDelta;
      const snap = buildSmartSnap(
        gesture.selectionBounds,
        gesture.fixedRects,
        constrained,
        artboard,
        gesture.initialElements.length === 1,
      );
      previewElementMove(gesture.previewTargets, snap.delta);
      previewSmartGuides(
        {
          horizontal: horizontalSmartGuideRef.current,
          vertical: verticalSmartGuideRef.current,
        },
        snap.guides,
      );
      const spacingMeasurements = snap.spacingMeasurements;
      if (sample.altKey || altPressedRef.current) {
        const selectionBounds = gesture.selectionBounds;
        const hovered = elementAtClientPoint(sample.x, sample.y);
        const targetId = hovered?.dataset.elementId;
        const target = gesture.fixedElements.find(
          (element) => element.id === targetId,
        );
        const hoveredGuideNode = guideAtClientPoint(sample.x, sample.y);
        const targetGuide = guides.find(
          (guide) => guide.id === hoveredGuideNode?.dataset.guideId,
        );
        if (selectionBounds) {
          previewDistanceMeasurements(
            distanceMeasurementRefs.current,
            spacingMeasurements.concat(
              targetGuide
                ? buildGuideDistanceMeasurements(
                    offsetRect(selectionBounds, snap.delta),
                    targetGuide,
                  )
                : buildDistanceMeasurements(
                    offsetRect(selectionBounds, snap.delta),
                    artboard,
                    target ? rectFromElement(target) : undefined,
                  ),
            ),
          );
        }
      } else {
        previewDistanceMeasurements(
          distanceMeasurementRefs.current,
          spacingMeasurements,
        );
      }
      gestureRef.current = { ...gesture, appliedDelta: snap.delta };
      return;
    }

    if (gesture.kind === "resize") {
      const deltaX = (sample.x - gesture.startClient.x) / gesture.scale;
      const deltaY = (sample.y - gesture.startClient.y) / gesture.scale;
      const { handle, initial } = gesture;
      const minimumSize = 8;
      let x = initial.x;
      let y = initial.y;
      let width = initial.width;
      let height = initial.height;

      if (handle.includes("e")) width = initial.width + deltaX;
      if (handle.includes("s")) height = initial.height + deltaY;
      if (handle.includes("w")) {
        width = initial.width - deltaX;
        x = initial.x + deltaX;
      }
      if (handle.includes("n")) {
        height = initial.height - deltaY;
        y = initial.y + deltaY;
      }

      const rawWidth = width;
      const rawHeight = height;
      if (lockRatio || sample.ctrlKey || sample.shiftKey) {
        const ratio = initial.width / Math.max(1, initial.height);
        const hasHorizontalHandle =
          handle.includes("e") || handle.includes("w");
        const hasVerticalHandle = handle.includes("n") || handle.includes("s");
        if (hasHorizontalHandle && hasVerticalHandle) {
          const widthScale =
            Math.max(minimumSize, rawWidth) / Math.max(1, initial.width);
          const heightScale =
            Math.max(minimumSize, rawHeight) / Math.max(1, initial.height);
          const scale =
            Math.abs(widthScale - 1) >= Math.abs(heightScale - 1)
              ? widthScale
              : heightScale;
          width = initial.width * scale;
          height = initial.height * scale;
        } else if (hasHorizontalHandle) {
          width = Math.max(minimumSize, rawWidth);
          height = width / ratio;
        } else {
          height = Math.max(minimumSize, rawHeight);
          width = height * ratio;
        }
        if (handle.includes("w")) x = initial.x + initial.width - width;
        if (handle.includes("n")) y = initial.y + initial.height - height;
      } else {
        width = Math.max(minimumSize, width);
        height = Math.max(minimumSize, height);
        if (handle.includes("w")) x = initial.x + initial.width - width;
        if (handle.includes("n")) y = initial.y + initial.height - height;
      }

      const resizedWidth = Math.max(minimumSize, width);
      const resizedHeight = Math.max(minimumSize, height);
      const resizedBounds = {
        height: resizedHeight,
        width: resizedWidth,
        x,
        y,
      };
      const resizeUpdates = resizeElementWithinSelection(
        initial,
        rectFromElement(initial),
        resizedBounds,
      );
      previewElementResize(
        gesture.previewTargets,
        resizeUpdates,
        artboard.height,
        selectionCaptionGap,
        selectionCaptionHeight,
      );
      gestureRef.current = { ...gesture, appliedUpdates: resizeUpdates };
      return;
    }

    if (gesture.kind === "multi-resize") {
      const resizedBounds = resizedBoundsFromCorner(
        gesture.initialBounds,
        gesture.handle,
        (sample.x - gesture.startClient.x) / gesture.scale,
        (sample.y - gesture.startClient.y) / gesture.scale,
        lockRatio || sample.ctrlKey || sample.shiftKey,
      );
      const resizedElements = gesture.initialElements.map((element) =>
        resizeElementWithinSelection(
          element,
          gesture.initialBounds,
          resizedBounds,
        ),
      );
      previewMultiElementResize(
        gesture.previewTargets,
        resizedElements,
        resizedBounds,
        artboard.height,
        selectionCaptionGap,
        selectionCaptionHeight,
      );
      gestureRef.current = {
        ...gesture,
        appliedElements: resizedElements,
      };
      return;
    }

    if (gesture.kind === "marquee") {
      const point = {
        x: gesture.start.x + (sample.x - gesture.startClient.x) / gesture.scale,
        y: gesture.start.y + (sample.y - gesture.startClient.y) / gesture.scale,
      };
      gestureRef.current = { ...gesture, current: point };
      previewMarquee(gesture.start, point);
    }
  };

  const handleCanvasPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    pointerPositionRef.current = { x: event.clientX, y: event.clientY };
    const gesture = gestureRef.current;
    if (!gesture) {
      if (penDraft) {
        const rawPoint = getLocalPoint(event.clientX, event.clientY);
        const branchElement = penDraft.branchElementId
          ? elements.find((element) => element.id === penDraft.branchElementId)
          : undefined;
        const point = branchElement
          ? elementLocalPoint(branchElement, rawPoint)
          : rawPoint;
        setPenDraft((current) =>
          current ? { ...current, current: point } : current,
        );
        return;
      }
      if (!event.altKey && !altPressedRef.current) {
        setStableDistanceMeasurements([]);
        return;
      }
      updateAltDistanceMeasurements(event.clientX, event.clientY);
      return;
    }
    if (gesture.pointerId !== event.pointerId) return;

    if (
      gesture.kind === "pan" ||
      gesture.kind === "draw" ||
      gesture.kind === "move" ||
      gesture.kind === "resize" ||
      gesture.kind === "multi-resize" ||
      gesture.kind === "marquee"
    ) {
      if (!rawDragActiveRef.current) {
        renderDragPreviewRef.current(dragPointerSample(event.nativeEvent));
      }
      return;
    }

    if (gesture.kind === "pen") {
      const rawPoint = getLocalPoint(event.clientX, event.clientY);
      const branchElement = penDraft?.branchElementId
        ? elements.find((element) => element.id === penDraft.branchElementId)
        : undefined;
      const localPoint = branchElement
        ? elementLocalPoint(branchElement, rawPoint)
        : rawPoint;
      setPenDraft((current) => {
        if (!current) return current;
        const anchor = current.points[gesture.anchorIndex];
        if (!anchor) return current;
        const point = event.shiftKey
          ? constrainAngle(localPoint, anchor)
          : localPoint;
        const moved =
          Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y) > 3;
        if (!moved) return { ...current, current: point };
        const points = current.points.map((item, index) =>
          index === gesture.anchorIndex
            ? {
                ...item,
                handleIn: {
                  x: anchor.x * 2 - point.x,
                  y: anchor.y * 2 - point.y,
                },
                handleOut: point,
              }
            : item,
        );
        return { ...current, current: point, isDragging: true, points };
      });
      return;
    }

    if (gesture.kind === "pen-node") {
      const initialPaths = vectorPathsForElement(gesture.initial);
      if (!initialPaths.length) return;
      const point = elementLocalPoint(
        gesture.initial,
        getLocalPoint(event.clientX, event.clientY),
      );
      const delta = {
        x: point.x - gesture.startLocal.x,
        y: point.y - gesture.startLocal.y,
      };
      if (Math.hypot(delta.x, delta.y) < 0.001) return;
      const nextGesture = gesture.historyRecorded
        ? gesture
        : { ...gesture, historyRecorded: true };
      if (!gesture.historyRecorded) checkpoint();
      const selectedKeys = new Set(
        gesture.nodeRefs.map((nodeRef) => vectorPointKey(nodeRef)),
      );
      const movedPaths = cloneVectorPaths(initialPaths).map(
        (path, pathIndex) => ({
          ...path,
          points: path.points.map((item, nodeIndex) => {
            if (!selectedKeys.has(vectorPointKey({ pathIndex, nodeIndex }))) {
              return item;
            }
            return {
              ...item,
              x: item.x + delta.x,
              y: item.y + delta.y,
              handleIn: item.handleIn
                ? { x: item.handleIn.x + delta.x, y: item.handleIn.y + delta.y }
                : undefined,
              handleOut: item.handleOut
                ? {
                    x: item.handleOut.x + delta.x,
                    y: item.handleOut.y + delta.y,
                  }
                : undefined,
            };
          }),
        }),
      );
      updateElement(
        gesture.elementId,
        vectorElementGeometryUpdate(gesture.initial, movedPaths),
      );
      gestureRef.current = nextGesture;
      return;
    }

    if (gesture.kind === "pen-handle") {
      const initialPaths = vectorPathsForElement(gesture.initial);
      const point = elementLocalPoint(
        gesture.initial,
        getLocalPoint(event.clientX, event.clientY),
      );
      const activeRef = gesture.handleRefs[0];
      const activePoint =
        initialPaths[activeRef.pathIndex]?.points[activeRef.nodeIndex];
      if (!activePoint) return;
      const initialHandle =
        activeRef.handle === "in"
          ? activePoint.handleIn
          : activePoint.handleOut;
      if (!initialHandle) return;
      const nextHandle = event.shiftKey
        ? constrainAngle(point, activePoint)
        : point;
      const multiHandleDelta = {
        x: nextHandle.x - initialHandle.x,
        y: nextHandle.y - initialHandle.y,
      };
      if (Math.hypot(multiHandleDelta.x, multiHandleDelta.y) < 0.001) return;
      const nextGesture = gesture.historyRecorded
        ? gesture
        : { ...gesture, historyRecorded: true };
      if (!gesture.historyRecorded) checkpoint();
      const selectedKeys = new Set(
        gesture.handleRefs.map((handleRef) => vectorHandleKey(handleRef)),
      );
      const nextPaths = cloneVectorPaths(initialPaths).map(
        (path, pathIndex) => ({
          ...path,
          points: path.points.map((item, nodeIndex) => {
            const matchingRefs = (["in", "out"] as const).filter((handle) =>
              selectedKeys.has(
                vectorHandleKey({ pathIndex, nodeIndex, handle }),
              ),
            );
            if (!matchingRefs.length) return item;
            const nextItem = { ...item };
            for (const handle of matchingRefs) {
              const currentHandle =
                handle === "in" ? item.handleIn : item.handleOut;
              if (!currentHandle) continue;
              const movedHandle =
                gesture.handleRefs.length > 1
                  ? {
                      x: currentHandle.x + multiHandleDelta.x,
                      y: currentHandle.y + multiHandleDelta.y,
                    }
                  : nextHandle;
              if (handle === "in") nextItem.handleIn = movedHandle;
              else nextItem.handleOut = movedHandle;
              if (gesture.handleRefs.length === 1) {
                const opposite =
                  handle === "in" ? item.handleOut : item.handleIn;
                const mirrored = mirroredHandle(
                  item,
                  movedHandle,
                  opposite,
                  event.altKey ? "none" : penHandleMirroring,
                );
                if (handle === "in") nextItem.handleOut = mirrored;
                else nextItem.handleIn = mirrored;
              }
            }
            return nextItem;
          }),
        }),
      );
      updateElement(
        gesture.elementId,
        vectorElementGeometryUpdate(gesture.initial, nextPaths),
      );
      gestureRef.current = nextGesture;
      return;
    }

    if (gesture.kind === "image-crop-resize") {
      const point = getLocalPoint(event.clientX, event.clientY);
      const deltaX = point.x - gesture.startLocal.x;
      const deltaY = point.y - gesture.startLocal.y;
      const { handle, initial } = gesture;
      const minimumSize = 8;
      const initialCrop = imageCropForElement(initial);
      const crop = { ...initialCrop };
      const scaleX = initialCrop.scaleX;
      const scaleY = initialCrop.scaleY;
      let x = initial.x;
      let y = initial.y;
      let width = initial.width;
      let height = initial.height;

      if (handle === "e") {
        const maxWidth = Math.max(
          minimumSize,
          (initialCrop.baseWidth - initialCrop.left) * scaleX,
        );
        width = Math.min(
          maxWidth,
          Math.max(minimumSize, initial.width + deltaX),
        );
        crop.right = Math.max(
          0,
          initialCrop.baseWidth - initialCrop.left - width / scaleX,
        );
      } else if (handle === "w") {
        const maxWidth = Math.max(
          minimumSize,
          (initialCrop.baseWidth - initialCrop.right) * scaleX,
        );
        width = Math.min(
          maxWidth,
          Math.max(minimumSize, initial.width - deltaX),
        );
        x = initial.x + initial.width - width;
        crop.left = Math.max(
          0,
          initialCrop.baseWidth - initialCrop.right - width / scaleX,
        );
      } else if (handle === "s") {
        const maxHeight = Math.max(
          minimumSize,
          (initialCrop.baseHeight - initialCrop.top) * scaleY,
        );
        height = Math.min(
          maxHeight,
          Math.max(minimumSize, initial.height + deltaY),
        );
        crop.bottom = Math.max(
          0,
          initialCrop.baseHeight - initialCrop.top - height / scaleY,
        );
      } else {
        const maxHeight = Math.max(
          minimumSize,
          (initialCrop.baseHeight - initialCrop.bottom) * scaleY,
        );
        height = Math.min(
          maxHeight,
          Math.max(minimumSize, initial.height - deltaY),
        );
        y = initial.y + initial.height - height;
        crop.top = Math.max(
          0,
          initialCrop.baseHeight - initialCrop.bottom - height / scaleY,
        );
      }

      updateElement(gesture.elementId, {
        height,
        imageCrop: crop,
        width,
        x,
        y,
      });
      return;
    }

    if (gesture.kind === "line-endpoint") {
      const rawPoint = getLocalPoint(event.clientX, event.clientY);
      const point =
        event.ctrlKey || event.metaKey || event.shiftKey
          ? constrainAngle(rawPoint, gesture.fixedPoint)
          : rawPoint;
      const geometry =
        gesture.endpoint === "start"
          ? lineGeometry(point, gesture.fixedPoint)
          : lineGeometry(gesture.fixedPoint, point);
      updateElement(gesture.elementId, {
        height: geometry.height,
        rotation: geometry.rotation,
        width: geometry.width,
        x: Math.round(geometry.x),
        y: Math.round(geometry.y),
      });
      return;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleRawDrag = (rawEvent: Event) => {
      if (!(rawEvent instanceof PointerEvent)) return;
      const gesture = gestureRef.current;
      if (
        !gesture ||
        gesture.pointerId !== rawEvent.pointerId ||
        !(
          gesture.kind === "pan" ||
          gesture.kind === "draw" ||
          gesture.kind === "move" ||
          gesture.kind === "resize" ||
          gesture.kind === "multi-resize" ||
          gesture.kind === "marquee"
        )
      ) {
        return;
      }
      rawDragActiveRef.current = true;
      pointerPositionRef.current = {
        x: rawEvent.clientX,
        y: rawEvent.clientY,
      };
      renderDragPreviewRef.current(dragPointerSample(rawEvent));
    };

    canvas.addEventListener("pointerrawupdate", handleRawDrag, {
      passive: true,
    });
    return () => canvas.removeEventListener("pointerrawupdate", handleRawDrag);
  }, []);

  const handleCanvasPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const pendingGesture = gestureRef.current;
    if (
      pendingGesture?.pointerId === event.pointerId &&
      (pendingGesture.kind === "pan" ||
        pendingGesture.kind === "draw" ||
        pendingGesture.kind === "move" ||
        pendingGesture.kind === "resize" ||
        pendingGesture.kind === "multi-resize" ||
        pendingGesture.kind === "marquee")
    ) {
      renderDragPreviewRef.current(dragPointerSample(event.nativeEvent));
    }
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    if (gesture.kind === "draw") {
      createElementFromDraft(gesture.draft);
      setDrawDraft(null);
    } else if (gesture.kind === "pen") {
      setPenDraft((current) =>
        current
          ? {
              ...current,
              current: current.points.at(-1) ?? current.current,
              isDragging: false,
            }
          : current,
      );
    } else if (gesture.kind === "pan") {
      setPan(gesture.currentPan);
    } else if (gesture.kind === "move") {
      if (gesture.appliedDelta.x || gesture.appliedDelta.y) {
        updateElements(
          gesture.selectionIds,
          gesture.appliedDelta.x,
          gesture.appliedDelta.y,
        );
      }
      const previewTargets = gesture.previewTargets;
      window.requestAnimationFrame(() =>
        clearElementMovePreview(previewTargets),
      );
    } else if (gesture.kind === "resize") {
      updateElement(gesture.elementId, gesture.appliedUpdates);
      gesture.previewTargets.element?.classList.remove("is-resize-preview");
    } else if (gesture.kind === "multi-resize") {
      gesture.appliedElements.forEach((element) =>
        updateElement(element.id, element),
      );
      gesture.previewTargets.elements.forEach((element) =>
        element.classList.remove("is-resize-preview"),
      );
    } else if (gesture.kind === "marquee") {
      const selectionBounds = boundsFromPoints(gesture.start, gesture.current);
      const hitIds = elements
        .filter(
          (element) =>
            element.visible &&
            intersects(selectionBounds, {
              x: element.x,
              y: element.y,
              width: element.width,
              height: element.height,
            }),
        )
        .map((element) => element.id);
      const expandedHitIds = expandGroupedSelection(elements, hitIds);
      setSelectedElementIds(
        gesture.additive
          ? [...new Set([...selectedElementIds, ...expandedHitIds])]
          : expandedHitIds,
      );
      setSelectedGuideIds([]);
      setArtboardSelected(false);
      setMarquee(null);
    }

    previewSmartGuides(
      {
        horizontal: horizontalSmartGuideRef.current,
        vertical: verticalSmartGuideRef.current,
      },
      [],
    );
    previewDistanceMeasurements(distanceMeasurementRefs.current, []);
    setStableDistanceMeasurements([]);
    gestureRef.current = null;
    rawDragActiveRef.current = false;
    document
      .getElementById("editor-artboard")
      ?.classList.remove("is-pan-preview");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleCanvasDoubleClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (!penDraft || activeTool !== "rectangle" || selectedShape !== "pen") {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    createElementFromPenDraft(penDraft);
    setPenDraft(null);
    gestureRef.current = null;
  };

  const handleWheel = (event: ReactWheelEvent<HTMLElement>) => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      zoomAtClientPoint(
        zoom + (event.deltaY < 0 ? 10 : -10),
        event.clientX,
        event.clientY,
      );
      return;
    }
    setPan((current) => ({
      x: current.x - event.deltaX,
      y: current.y - event.deltaY,
    }));
  };

  const createBackgroundMusicObjectUrl = useCallback((file: Blob) => {
    const source = URL.createObjectURL(file);
    backgroundMusicObjectUrlsRef.current.add(source);
    return source;
  }, []);

  const updateInteractionSoundForElements = useCallback(
    (elementIds: string[], settings: InteractionSoundSettings) => {
      const currentElements = useEditorStore
        .getState()
        .pages.flatMap((page) => page.elements);
      elementIds.forEach((elementId) => {
        const existingSettings = currentElements.find(
          (element) => element.id === elementId,
        )?.interactionSounds;
        updateElement(elementId, {
          interactionSounds: [
            {
              ...settings,
              assets: settings.assets.map((asset) => ({ ...asset })),
            },
            ...(existingSettings?.slice(1).map((sound) => ({
              ...sound,
              assets: sound.assets.map((asset) => ({ ...asset })),
            })) ?? []),
          ],
        });
      });
    },
    [updateElement],
  );

  const appendInteractionSoundAssetsForElements = useCallback(
    (elementIds: string[], assets: BackgroundMusicAsset[]) => {
      elementIds.forEach((elementId) => {
        const currentElement = useEditorStore
          .getState()
          .pages.flatMap((page) => page.elements)
          .find((element) => element.id === elementId);
        const existingSettings = currentElement?.interactionSounds;
        const primarySettings = normalizedInteractionSound(
          existingSettings?.[0],
        );
        updateElement(elementId, {
          interactionSounds: [
            {
              ...primarySettings,
              soundSource: "multiple",
              assets: [
                ...primarySettings.assets.map((asset) => ({ ...asset })),
                ...assets.map((asset) => ({ ...asset })),
              ],
            },
            ...(existingSettings?.slice(1).map((sound) => ({
              ...sound,
              assets: sound.assets.map((asset) => ({ ...asset })),
            })) ?? []),
          ],
        });
      });
    },
    [updateElement],
  );

  const applyCommonInteractionSoundAssetForElements = useCallback(
    (elementIds: string[], asset: BackgroundMusicAsset) => {
      elementIds.forEach((elementId) => {
        const currentElement = useEditorStore
          .getState()
          .pages.flatMap((page) => page.elements)
          .find((element) => element.id === elementId);
        const existingSettings = currentElement?.interactionSounds;
        const primarySettings = normalizedInteractionSound(
          existingSettings?.[0],
        );
        updateElement(elementId, {
          interactionSounds: [
            {
              ...primarySettings,
              assets:
                primarySettings.soundSource === "multiple"
                  ? [
                      ...primarySettings.assets.map((existingAsset) => ({
                        ...existingAsset,
                      })),
                      { ...asset },
                    ]
                  : [{ ...asset }],
            },
            ...(existingSettings?.slice(1).map((sound) => ({
              ...sound,
              assets: sound.assets.map((existingAsset) => ({
                ...existingAsset,
              })),
            })) ?? []),
          ],
        });
      });
    },
    [updateElement],
  );

  const clearInteractionSoundAssetsForElements = useCallback(
    (elementIds: string[]) => {
      elementIds.forEach((elementId) => {
        const currentElement = useEditorStore
          .getState()
          .pages.flatMap((page) => page.elements)
          .find((element) => element.id === elementId);
        const existingSettings = currentElement?.interactionSounds;
        updateElement(elementId, {
          interactionSounds: (existingSettings?.length
            ? existingSettings
            : [defaultInteractionSoundSettings]
          ).map((sound) => ({
            ...sound,
            assets: [],
          })),
        });
      });
    },
    [updateElement],
  );

  const deleteInteractionSoundAsset = useCallback(
    (elementId: string, settingIndex: number, assetIndex: number) => {
      const currentElement = useEditorStore
        .getState()
        .pages.flatMap((page) => page.elements)
        .find((element) => element.id === elementId);
      if (!currentElement?.interactionSounds?.[settingIndex]) return;
      updateElement(elementId, {
        interactionSounds: currentElement.interactionSounds.map(
          (sound, currentSettingIndex) => ({
            ...sound,
            assets: sound.assets
              .filter(
                (_, currentAssetIndex) =>
                  currentSettingIndex !== settingIndex ||
                  currentAssetIndex !== assetIndex,
              )
              .map((asset) => ({ ...asset })),
          }),
        ),
      });
    },
    [updateElement],
  );

  const replaceInteractionSoundsForElement = useCallback(
    (elementId: string, interactionSounds: InteractionSoundSettings[]) => {
      updateElement(elementId, {
        interactionSounds: interactionSounds.map((sound) => ({
          ...sound,
          assets: sound.assets.map((asset) => ({ ...asset })),
        })),
      });
    },
    [updateElement],
  );

  const updateInteractionExpandedForElements = useCallback(
    (elementIds: string[], interactionSoundExpanded: boolean) => {
      elementIds.forEach((elementId) =>
        updateElement(elementId, { interactionSoundExpanded }),
      );
    },
    [updateElement],
  );

  const attachBackgroundMusicArtwork = useCallback(
    (pageId: string, assetSrc: string, artwork: Blob) => {
      if (!editorMountedRef.current) return;
      const state = useEditorStore.getState();
      const snapshots = [...state.past, ...state.future];
      const referencedAssets = [
        ...state.pages,
        ...snapshots.flatMap((snapshot) => snapshot.pages),
      ]
        .filter((page) => page.id === pageId)
        .map((page) => page.backgroundMusic?.asset)
        .filter((asset) => asset?.src === assetSrc);
      if (referencedAssets.length === 0) return;
      const existingArtworkSrc = referencedAssets.find(
        (asset) => asset?.artworkSrc,
      )?.artworkSrc;
      if (existingArtworkSrc) {
        setBackgroundMusicArtwork(pageId, assetSrc, existingArtworkSrc);
        return;
      }
      const artworkSrc = createBackgroundMusicObjectUrl(artwork);
      setBackgroundMusicArtwork(pageId, assetSrc, artworkSrc);
    },
    [createBackgroundMusicObjectUrl, setBackgroundMusicArtwork],
  );

  useEffect(() => {
    const referencedSources = new Set<string>();
    const collectSources = (sourcePages: typeof pages) => {
      sourcePages.forEach((page) => {
        const asset = page.backgroundMusic?.asset;
        if (asset) {
          referencedSources.add(asset.src);
          if (asset.artworkSrc) referencedSources.add(asset.artworkSrc);
        }
        page.elements.forEach((element) => {
          element.interactionSounds?.forEach((sound) => {
            sound.assets.forEach((soundAsset) =>
              referencedSources.add(soundAsset.src),
            );
          });
        });
      });
    };
    collectSources(useEditorStore.getState().pages);
    past.forEach((snapshot) => collectSources(snapshot.pages));
    future.forEach((snapshot) => collectSources(snapshot.pages));
    useEditorStore.getState().clipboard.forEach((element) => {
      element.interactionSounds?.forEach((sound) => {
        sound.assets.forEach((soundAsset) =>
          referencedSources.add(soundAsset.src),
        );
      });
    });
    const ownedSources = backgroundMusicObjectUrlsRef.current;
    ownedSources.forEach((source) => {
      if (referencedSources.has(source)) return;
      URL.revokeObjectURL(source);
      ownedSources.delete(source);
    });
  }, [clipboard, future, pages, past]);

  useEffect(() => {
    editorMountedRef.current = true;
    const ownedSources = backgroundMusicObjectUrlsRef.current;
    return () => {
      editorMountedRef.current = false;
      ownedSources.forEach((source) => URL.revokeObjectURL(source));
      ownedSources.clear();
    };
  }, []);

  const handleAssetUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setUploadedAssets((current) => [
      ...files.map((file) => URL.createObjectURL(file)),
      ...current,
    ]);
    event.target.value = "";
  };

  const addAssetToPage = (src: string) => {
    const count =
      elements.filter((element) => element.type === "image").length + 1;
    const addImage = (width: number, height: number) => {
      addElement({
        id: createElementId("image"),
        name: `Image ${count}`,
        type: "image",
        x: artboard.width / 2 - width / 2,
        y: artboard.height / 2 - height / 2,
        width,
        height,
        rotation: 0,
        opacity: 100,
        fill: "#ffffff",
        stroke: "transparent",
        strokeWidth: 0,
        strokeStyle: "none",
        cornerRadius: 0,
        visible: true,
        locked: false,
        src,
      });
      setArtboardSelected(false);
      setActiveTool("selection");
    };

    const image = new window.Image();
    image.onload = () => {
      const size = fittedImageSize(image.naturalWidth, image.naturalHeight);
      addImage(size.width, size.height);
    };
    image.onerror = () => addImage(280, 200);
    image.src = src;
  };

  const artboardStyle = {
    "--artboard-height": `${artboard.height}px`,
    "--artboard-width": `${artboard.width}px`,
    "--artboard-scale": totalScale,
    "--artboard-x": `${pan.x}px`,
    "--artboard-y": `${pan.y}px`,
    "--selection-control-scale": selectionControlScale,
    "--selection-caption-font-size": `${10 * selectionUiScale}px`,
    "--selection-caption-height": `${selectionCaptionHeight}px`,
    "--selection-caption-padding": `${6 * selectionUiScale}px`,
    "--selection-caption-radius": `${2 * selectionUiScale}px`,
    "--selection-outline-width": `${selectionOutlineWidth}px`,
    backgroundColor: "transparent",
    borderRadius: `${artboard.cornerRadius}px`,
    overflow: "visible",
  } as CSSProperties;
  const interfaceScale = interfaceScaleFactor(resolvedInterfaceScale);
  const propertiesBaseWidth = viewportWidthCss >= 1600 ? 345 : 340;
  const interfaceCompact =
    interfaceScaleReady && viewportWidthCss <= 960 * interfaceScale;
  const editorShellStyle = {
    "--interface-scale": interfaceScale,
    "--interface-zoom-pixel": `${1 / interfaceScale}px`,
    ...(interfaceScaleReady
      ? {
          "--project-panel-width": `${278 * interfaceScale}px`,
          "--properties-width": `${propertiesBaseWidth * interfaceScale}px`,
          "--tool-rail-width": `${70 * interfaceScale}px`,
          "--topbar-height": `${66 * interfaceScale}px`,
        }
      : {}),
  } as CSSProperties;
  const activeToolbarIndex = Math.max(
    0,
    tools.findIndex(({ id }) => id === (spacePressed ? "hand" : activeTool)),
  );
  const activeToolIndicator =
    toolIndicatorMetrics[activeToolbarIndex] ?? toolIndicatorMetrics[0];

  const draftBounds = drawDraft
    ? boundsFromPoints(drawDraft.start, drawDraft.current)
    : null;
  const penDraftLocalPoints: PenAnchor[] = penDraft
    ? penDraft.isDragging
      ? penDraft.points
      : [...penDraft.points, { ...penDraft.current }]
    : [];
  const penDraftBranchElement = penDraft?.branchElementId
    ? elements.find((element) => element.id === penDraft.branchElementId)
    : undefined;
  const penDraftPoints = penDraftLocalPoints.map((point) =>
    penDraftBranchElement
      ? elementWorldPathPoint(penDraftBranchElement, point)
      : point,
  );
  const penDraftCurrent =
    penDraft && penDraftBranchElement
      ? elementWorldPoint(penDraftBranchElement, penDraft.current)
      : penDraft?.current;
  const penDraftBounds = penDraft
    ? (() => {
        const geometryPoints = penDraftPoints.flatMap((point) => [
          { x: point.x, y: point.y },
          ...(point.handleIn ? [{ ...point.handleIn }] : []),
          ...(point.handleOut ? [{ ...point.handleOut }] : []),
        ]);
        if (penDraftCurrent) geometryPoints.push(penDraftCurrent);
        const bounds = boundsFromPointList(geometryPoints);
        return {
          height: Math.max(8, bounds.height + 8),
          width: Math.max(8, bounds.width + 8),
          x: bounds.x - 4,
          y: bounds.y - 4,
        };
      })()
    : null;
  const draftLine =
    drawDraft?.type === "line"
      ? lineDraftGeometry(drawDraft.start, drawDraft.current)
      : null;
  const groupedSelectionId =
    selectedElements.length > 1 &&
    selectedElements[0].groupId &&
    selectedElements.every(
      (element) => element.groupId === selectedElements[0].groupId,
    )
      ? selectedElements[0].groupId
      : undefined;
  const groupedSelectionBounds = groupedSelectionId
    ? boundsFromElements(selectedElements)
    : null;
  const selectionDimensionsBounds =
    !artboardSelected && selectedElements.length
      ? boundsFromElements(selectedElements)
      : null;
  const combinedSelectionBounds =
    selectedElements.length > 1 ? selectionDimensionsBounds : null;
  const combinedSelectionResizable =
    Boolean(combinedSelectionBounds) &&
    selectedElements.every((element) => !element.locked);
  const selectionDimensionsPlacement = selectionDimensionsBounds
    ? selectionDimensionsBounds.y +
        selectionDimensionsBounds.height +
        selectionCaptionGap +
        selectionCaptionHeight <=
      artboard.height
      ? {
          className: "",
          top:
            selectionDimensionsBounds.y +
            selectionDimensionsBounds.height +
            selectionCaptionGap,
        }
      : {
          className: "is-above",
          top: selectionDimensionsBounds.y - selectionCaptionGap,
        }
    : null;
  const selectionDimensionsValue = selectionDimensionsBounds
    ? selectedElements.length === 1 && selectedElements[0].type === "line"
      ? {
          height: Math.max(1, Math.round(selectedElements[0].strokeWidth)),
          width: Math.round(selectionDimensionsBounds.width),
        }
      : {
          height: Math.round(selectionDimensionsBounds.height),
          width: Math.round(selectionDimensionsBounds.width),
        }
    : null;
  const marqueeBounds = marquee
    ? boundsFromPoints(marquee.start, marquee.current)
    : null;
  const navigatorPreviewSize = { height: 104, width: 184 };
  const navigatorWorldBounds = {
    bottom: Math.max(
      artboard.height,
      navigatorViewport.y + navigatorViewport.height,
    ),
    left: Math.min(0, navigatorViewport.x),
    right: Math.max(
      artboard.width,
      navigatorViewport.x + navigatorViewport.width,
    ),
    top: Math.min(0, navigatorViewport.y),
  };
  const navigatorWorldSize = {
    height: Math.max(1, navigatorWorldBounds.bottom - navigatorWorldBounds.top),
    width: Math.max(1, navigatorWorldBounds.right - navigatorWorldBounds.left),
  };
  const navigatorScale = Math.min(
    navigatorPreviewSize.width / navigatorWorldSize.width,
    navigatorPreviewSize.height / navigatorWorldSize.height,
  );
  const navigatorMap = {
    height: navigatorWorldSize.height * navigatorScale,
    left:
      (navigatorPreviewSize.width - navigatorWorldSize.width * navigatorScale) /
      2,
    top:
      (navigatorPreviewSize.height -
        navigatorWorldSize.height * navigatorScale) /
      2,
    width: navigatorWorldSize.width * navigatorScale,
  };
  const navigatorBoard = {
    height: artboard.height * navigatorScale,
    left: -navigatorWorldBounds.left * navigatorScale,
    top: -navigatorWorldBounds.top * navigatorScale,
    width: artboard.width * navigatorScale,
  };
  const navigatorViewportStyle = {
    height: navigatorViewport.height * navigatorScale,
    left: (navigatorViewport.x - navigatorWorldBounds.left) * navigatorScale,
    top: (navigatorViewport.y - navigatorWorldBounds.top) * navigatorScale,
    width: navigatorViewport.width * navigatorScale,
  };

  return (
    <main
      className={`editor-shell ${interfaceCompact ? "is-interface-compact" : ""}`}
      data-interface-compact={interfaceCompact}
      data-interface-ready={interfaceScaleReady}
      data-interface-scale={resolvedInterfaceScale}
      data-interface-scale-mode={interfaceScaleMode}
      style={editorShellStyle}
    >
      <header className="editor-topbar interface-scale-surface">
        <div aria-label="AMOUS" className="topbar-brand">
          <span aria-hidden="true" className="brand-placeholder" />
          <span className="visually-hidden">AMOUS</span>
        </div>

        <div className="view-controls">
          <button
            aria-haspopup="dialog"
            className="preview-control"
            onClick={() => setPreviewVisible(true)}
            type="button"
          >
            <Eye aria-hidden="true" size={14} strokeWidth={1.4} /> Preview
          </button>
          <span className="topbar-divider" />
          <div aria-label="Viewport" className="viewport-controls">
            <button aria-label="Desktop viewport" type="button">
              <Monitor size={17} />
            </button>
            <button aria-label="Tablet viewport" type="button">
              <Tablet size={17} />
            </button>
            <button aria-label="Mobile viewport" type="button">
              <Smartphone size={17} />
            </button>
          </div>
          <span className="topbar-divider" />
          <div
            className="zoom-control"
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              event.stopPropagation();
              setViewMenuOpen(false);
            }}
            ref={viewMenuRef}
          >
            <button
              aria-expanded={viewMenuOpen}
              aria-haspopup="menu"
              className="zoom-menu"
              onClick={() => setViewMenuOpen((open) => !open)}
              type="button"
            >
              {Math.round(zoom)} % <ChevronDown aria-hidden="true" size={10} />
            </button>
            {viewMenuOpen ? (
              <div
                aria-label="View and interface scale"
                className="view-menu-popover"
                role="menu"
              >
                <span className="view-menu-heading">CANVAS</span>
                <button
                  className="view-menu-item"
                  onClick={() => {
                    applyZoomToFit();
                    setViewMenuOpen(false);
                  }}
                  role="menuitem"
                  type="button"
                >
                  <span className="view-menu-check" />
                  <span>Zoom to Fit</span>
                  <span className="view-menu-shortcut">Shift 1</span>
                </button>
                <button
                  className="view-menu-item"
                  onClick={() => {
                    zoomAtCanvasCenter(100);
                    setViewMenuOpen(false);
                  }}
                  role="menuitem"
                  type="button"
                >
                  <span className="view-menu-check" />
                  <span>Actual Size</span>
                  <span className="view-menu-meta">100%</span>
                </button>
                <div className="view-menu-divider" />
                <span className="view-menu-heading">INTERFACE SCALE</span>
                {INTERFACE_SCALE_OPTIONS.map((option) => {
                  const selected = option.value === interfaceScaleMode;
                  return (
                    <button
                      aria-checked={selected}
                      aria-label={
                        option.value === "auto"
                          ? `Auto (${resolvedInterfaceScale}%)`
                          : option.label
                      }
                      className="view-menu-item"
                      key={option.value}
                      onClick={() => selectInterfaceScale(option.value)}
                      role="menuitemradio"
                      type="button"
                    >
                      <span className="view-menu-check">
                        {selected ? (
                          <Check aria-hidden="true" size={12} strokeWidth={2} />
                        ) : null}
                      </span>
                      <span>{option.label}</span>
                      <span className="view-menu-meta">
                        {option.value === "auto"
                          ? `${resolvedInterfaceScale}%`
                          : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          <span className="topbar-divider" />
          <div aria-label="History" className="history-controls">
            <button
              aria-label="Undo"
              disabled={!past.length}
              onClick={undo}
              type="button"
            >
              <Undo2 size={17} />
            </button>
            <button
              aria-label="Redo"
              disabled={!future.length}
              onClick={redo}
              type="button"
            >
              <Redo2 size={17} />
            </button>
          </div>
        </div>

        <div className="publish-controls">
          <button className="share-button" type="button">
            SHARE
          </button>
          <button className="send-button" type="button">
            SEND
          </button>
          <button aria-label="More" className="more-button" type="button">
            <MoreVertical size={15} />
          </button>
        </div>
      </header>

      <aside
        aria-label="Creation tools"
        className="tool-rail interface-scale-surface"
      >
        <span
          aria-hidden="true"
          className="tool-active-indicator"
          style={{
            height: `${activeToolIndicator.height}px`,
            transform: `translateY(${activeToolIndicator.offset}px)`,
          }}
        />
        {tools.map(({ id, icon: Icon, label, asset }) => {
          const isActive = (spacePressed ? "hand" : activeTool) === id;
          return (
            <button
              aria-label={label}
              aria-pressed={isActive}
              className="tool-button"
              data-tool={id}
              key={id}
              onClick={() => {
                setNodeEditElementId(null);
                if (id !== "rectangle") finishPenPath();
                setActiveTool(id);
              }}
              onPointerDown={() => {
                if (id === "rectangle") setActiveTool("rectangle");
              }}
              title={label}
              type="button"
            >
              {asset ? (
                <Image
                  alt=""
                  aria-hidden="true"
                  className="tool-asset"
                  data-tool-icon={id}
                  draggable={false}
                  height={asset.height}
                  src={
                    isActive && asset.activeSrc ? asset.activeSrc : asset.src
                  }
                  width={asset.width}
                />
              ) : Icon ? (
                <Icon
                  aria-hidden="true"
                  fill={id === "selection" && isActive ? "#AB51F0" : "none"}
                  size={id === "selection" ? 25 : 22}
                  strokeWidth={1.25}
                />
              ) : null}
              <span>{label}</span>
            </button>
          );
        })}
        {activeTool === "rectangle" && !spacePressed ? (
          <ShapePicker
            onSelect={(shape) => {
              setNodeEditElementId(null);
              if (shape !== "pen") finishPenPath();
              setSelectedShape(shape);
              setActiveTool("rectangle");
            }}
            selected={selectedShape}
          />
        ) : null}
      </aside>

      <aside
        aria-label="Project panels"
        className="project-panel interface-scale-surface"
      >
        <section className="project-section scenes-section">
          <div className="project-section-heading">
            <h2>SCENES</h2>
            <button
              aria-label="Add scene"
              onClick={() => {
                finishPenPath();
                addPage();
                setNodeEditElementId(null);
                setSelectedGuideIds([]);
                setArtboardSelected(false);
              }}
              type="button"
            >
              <Image
                alt=""
                aria-hidden="true"
                height={11}
                src={assetPath("/figma/plus.svg")}
                width={11}
              />
            </button>
          </div>
          <ScrollArea className="scene-list">
            <div className="scene-list-content">
              {pages.length > 1 ? (
                <span aria-hidden="true" className="scene-rail" />
              ) : null}
              {pages.map((page, index) => (
                <div
                  aria-pressed={activePageId === page.id}
                  className="scene-item"
                  key={page.id}
                  onClick={() => {
                    finishPenPath();
                    setActivePageId(page.id);
                    setNodeEditElementId(null);
                    setSelectedGuideIds([]);
                    setArtboardSelected(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      finishPenPath();
                      setActivePageId(page.id);
                      setNodeEditElementId(null);
                      setSelectedGuideIds([]);
                      setArtboardSelected(false);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="scene-node" />
                  <ScenePreview artboard={artboard} elements={page.elements} />
                  <span className="scene-copy">
                    <strong>{String(index + 1).padStart(2, "0")}</strong>
                    {editingPageId === page.id ? (
                      <input
                        aria-label={`Rename ${page.name}`}
                        autoFocus
                        className="inline-name-input"
                        data-cancel="false"
                        onBlur={(event) => {
                          if (event.currentTarget.dataset.cancel === "true") {
                            setEditingPageId(null);
                            return;
                          }
                          renamePage(page.id, pageNameDraft);
                          setEditingPageId(null);
                        }}
                        onChange={(event) =>
                          setPageNameDraft(event.target.value)
                        }
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            event.currentTarget.dataset.cancel = "true";
                            event.currentTarget.blur();
                          }
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        type="text"
                        value={pageNameDraft}
                      />
                    ) : (
                      <span
                        onDoubleClick={(event) => {
                          event.stopPropagation();
                          setEditingPageId(page.id);
                          setPageNameDraft(page.name);
                        }}
                      >
                        {page.name}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </section>

        <section className="project-section layers-section">
          <div className="project-section-heading">
            <h2>LAYERS</h2>
            <button
              aria-label="Add layer"
              onClick={() => setActiveTool("rectangle")}
              type="button"
            >
              <Image
                alt=""
                aria-hidden="true"
                height={11}
                src={assetPath("/figma/plus.svg")}
                width={11}
              />
            </button>
          </div>
          <ScrollArea className="layer-list">
            <div
              aria-label="Layers"
              className="layer-list-content"
              role="listbox"
            >
              {[...elements].reverse().map((element) => {
                const selected = selectedElementIds.includes(element.id);
                const hasSound =
                  element.interactionSounds?.some(
                    (sound) => sound.assets.length > 0,
                  ) ?? false;
                return (
                  <div
                    aria-selected={selected}
                    className="layer-row"
                    key={element.id}
                    onClick={(event) => {
                      const targetIds = selectionIdsForElement(
                        elements,
                        element,
                      );
                      const targetSet = new Set(targetIds);
                      if (event.shiftKey) {
                        const allSelected = targetIds.every((id) =>
                          selectedElementIds.includes(id),
                        );
                        setSelectedElementIds(
                          allSelected
                            ? selectedElementIds.filter(
                                (id) => !targetSet.has(id),
                              )
                            : [
                                ...new Set([
                                  ...selectedElementIds,
                                  ...targetIds,
                                ]),
                              ],
                        );
                        return;
                      }
                      setSelectedElementIds(targetIds);
                    }}
                    role="option"
                    tabIndex={0}
                  >
                    <span
                      className={`layer-symbol ${element.pathfinder ? "symbol-pathfinder" : `symbol-${element.type}`}`}
                      data-pathfinder-operation={
                        element.pathfinder?.operation ?? undefined
                      }
                    >
                      <LayerSymbol element={element} />
                      {element.type === "image" && element.src ? (
                        <span
                          aria-hidden="true"
                          className="layer-image-preview"
                          style={{ backgroundImage: `url(${element.src})` }}
                        />
                      ) : null}
                    </span>
                    {editingElementId === element.id ? (
                      <input
                        aria-label={`Rename ${element.name}`}
                        autoFocus
                        className="inline-name-input"
                        data-cancel="false"
                        onBlur={(event) => {
                          if (event.currentTarget.dataset.cancel === "true") {
                            setEditingElementId(null);
                            return;
                          }
                          renameElement(element.id, elementNameDraft);
                          setEditingElementId(null);
                        }}
                        onChange={(event) =>
                          setElementNameDraft(event.target.value)
                        }
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            event.currentTarget.dataset.cancel = "true";
                            event.currentTarget.blur();
                          }
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        type="text"
                        value={elementNameDraft}
                      />
                    ) : (
                      <span
                        className="layer-name"
                        onDoubleClick={(event) => {
                          event.stopPropagation();
                          setEditingElementId(element.id);
                          setElementNameDraft(element.name);
                        }}
                      >
                        {element.name}
                      </span>
                    )}
                    <span className="layer-controls">
                      {hasSound ? (
                        <Image
                          alt=""
                          aria-hidden="true"
                          className="layer-sound-indicator"
                          height={10}
                          src={assetPath("/figma/sound/layer-sound.svg")}
                          width={8}
                        />
                      ) : null}
                      <button
                        aria-label={`${element.locked ? "Unlock" : "Lock"} ${element.name}`}
                        className={`layer-action ${element.locked ? "is-persistent" : ""}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleElementLocked(element.id);
                        }}
                        type="button"
                      >
                        {element.locked ? (
                          <Lock size={11} />
                        ) : (
                          <Unlock size={11} />
                        )}
                      </button>
                      <button
                        aria-label={`${element.visible ? "Hide" : "Show"} ${element.name}`}
                        className={`layer-action ${!element.visible ? "is-persistent" : ""}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleElementVisible(element.id);
                        }}
                        type="button"
                      >
                        {element.visible ? (
                          <Eye size={12} />
                        ) : (
                          <EyeOff size={12} />
                        )}
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </section>

        <section className="project-section assets-section">
          <div className="project-section-heading">
            <h2>ASSETS</h2>
            <label className="asset-heading-upload">
              <Image
                alt=""
                aria-hidden="true"
                height={11}
                src={assetPath("/figma/plus.svg")}
                width={11}
              />
              <input
                accept="image/*,video/*"
                multiple
                onChange={handleAssetUpload}
                type="file"
              />
            </label>
          </div>
          <label className="asset-upload">
            <Image
              alt=""
              aria-hidden="true"
              height={15}
              src={assetPath("/figma/upload.svg")}
              width={18}
            />
            <span>Upload</span>
            <input
              accept="image/*,video/*"
              multiple
              onChange={handleAssetUpload}
              type="file"
            />
          </label>
          <div className="asset-tabs" role="tablist">
            <button
              aria-selected={assetTab === "image"}
              onClick={() => setAssetTab("image")}
              role="tab"
              type="button"
            >
              Image
            </button>
            <button
              aria-selected={assetTab === "video"}
              onClick={() => setAssetTab("video")}
              role="tab"
              type="button"
            >
              Video
            </button>
          </div>
          <ScrollArea className="asset-grid">
            {uploadedAssets.map((asset, index) => (
              <button
                aria-label={`Add uploaded asset ${index + 1}`}
                className="uploaded-asset"
                key={asset}
                onClick={() => addAssetToPage(asset)}
                style={{ backgroundImage: `url(${asset})` }}
                type="button"
              />
            ))}
            {Array.from({ length: Math.max(9 - uploadedAssets.length, 0) }).map(
              (_, index) => (
                <span
                  aria-hidden="true"
                  className="asset-placeholder"
                  key={`placeholder-${index}`}
                />
              ),
            )}
          </ScrollArea>
        </section>
      </aside>

      <section
        aria-label="Exhibition canvas"
        className={`editor-canvas tool-${spacePressed ? "hand" : activeTool}`}
        onContextMenu={(event) => event.preventDefault()}
        onDoubleClick={handleCanvasDoubleClick}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerLeave={() => {
          if (!gestureRef.current && !altPressedRef.current) {
            setStableDistanceMeasurements([]);
          }
        }}
        onWheelCapture={handleWheel}
        ref={canvasRef}
      >
        <div
          aria-hidden={!rulersVisible}
          className={`ruler-overlay ${rulersVisible ? "" : "is-hidden"}`}
        >
          <div className="ruler-corner" />
          <canvas
            aria-label="Horizontal ruler"
            className="ruler ruler-horizontal"
            onPointerCancel={handleGuidePointerUp}
            onPointerDown={(event) =>
              handleRulerPointerDown(event, "horizontal")
            }
            onPointerMove={handleGuidePointerMove}
            onPointerUp={handleGuidePointerUp}
            ref={horizontalRulerRef}
          />
          <canvas
            aria-label="Vertical ruler"
            className="ruler ruler-vertical"
            onPointerCancel={handleGuidePointerUp}
            onPointerDown={(event) => handleRulerPointerDown(event, "vertical")}
            onPointerMove={handleGuidePointerMove}
            onPointerUp={handleGuidePointerUp}
            ref={verticalRulerRef}
          />
        </div>
        <div
          aria-label="Artboard"
          className={`artboard ${artboardSelected ? "is-selected" : ""}`}
          data-selected={artboardSelected}
          id="editor-artboard"
          onPointerDown={handleArtboardPointerDown}
          role="application"
          style={artboardStyle}
        >
          <ArtboardBackground artboard={artboard} />
          {elements.map((element) => {
            if (!element.visible) return null;
            const selected = selectedElementIds.includes(element.id);
            const selectionLineWidth = selectionOutlineWidth;
            const vectorStrokeOutset =
              element.type !== "image" &&
              element.type !== "text" &&
              element.type !== "line" &&
              element.strokeStyle !== "none" &&
              element.stroke !== "transparent" &&
              element.strokeWidth > 0 &&
              (element.strokeOpacity ?? 100) > 0
                ? (element.strokeWidth * selectionControlScale) / 2
                : 0;
            const selectionHandleOutset =
              element.type === "image"
                ? 0
                : vectorStrokeOutset + selectionLineWidth / 2;
            const elementStyle = {
              height: `${element.height}px`,
              left: `${element.x}px`,
              opacity: element.opacity / 100,
              top: `${element.y}px`,
              transform: `rotate(${element.rotation}deg)`,
              transformOrigin: "center",
              width: `${element.width}px`,
              "--selection-handle-outset": `${selectionHandleOutset}px`,
              "--selection-outline-width": `${selectionLineWidth}px`,
            };
            return (
              <div
                aria-label={element.name}
                className={`canvas-element element-${element.type} ${element.pathfinder ? "is-pathfinder" : ""} ${selected && !groupedSelectionBounds ? "is-selected" : ""} ${element.locked ? "is-locked" : ""}`}
                data-element-id={element.id}
                key={element.id}
                onDoubleClick={(event) => {
                  if (element.locked) return;
                  event.stopPropagation();
                  if (element.type === "pen") {
                    setNodeEditElementId(element.id);
                    setSelectedPenNodes([]);
                    setSelectedPenHandles([]);
                    return;
                  }
                  if (element.type !== "text") return;
                  event.preventDefault();
                  gestureRef.current = null;
                  setSelectedElementIds([element.id]);
                  setSelectedGuideIds([]);
                  setNodeEditElementId(null);
                  setArtboardSelected(false);
                  setEditingTextId(element.id);
                }}
                onClick={(event) => {
                  if (
                    element.locked ||
                    element.type !== "pen" ||
                    element.pathfinder ||
                    !selectionToolActive
                  ) {
                    return;
                  }
                  event.stopPropagation();
                  setNodeEditElementId(element.id);
                  setSelectedPenNodes([]);
                  setSelectedPenHandles([]);
                }}
                onPointerDown={(event) =>
                  handleElementPointerDown(event, element)
                }
                style={elementStyle}
              >
                {element.type === "text" ? (
                  <div
                    className="text-shape"
                    contentEditable={editingTextId === element.id}
                    data-text-resize-mode={element.textResizeMode ?? "fixed"}
                    onBlur={(event) => {
                      const editor = event.currentTarget;
                      const text = editor.innerText ?? editor.textContent ?? "";
                      const parent =
                        editor.closest<HTMLElement>(".canvas-element");
                      const sizeUpdates =
                        element.textResizeMode === "auto-width" && parent
                          ? {
                              height: Math.max(
                                1,
                                Number.parseFloat(parent.style.height) ||
                                  element.height,
                              ),
                              width: Math.max(
                                1,
                                Number.parseFloat(parent.style.width) ||
                                  element.width,
                              ),
                            }
                          : {};
                      checkpoint();
                      updateElement(element.id, { text, ...sizeUpdates });
                      setEditingTextId(null);
                    }}
                    onInput={(event) => {
                      if (element.textResizeMode !== "auto-width") return;
                      const editor = event.currentTarget;
                      const parent =
                        editor.closest<HTMLElement>(".canvas-element");
                      if (!parent) return;
                      const fontSize = element.fontSize ?? 24;
                      const lineHeight =
                        typeof element.lineHeight === "number"
                          ? element.lineHeight * fontSize
                          : fontSize * 1.2;
                      parent.style.width = `${Math.max(1, Math.ceil(editor.scrollWidth + 1))}px`;
                      parent.style.height = `${Math.max(lineHeight, Math.ceil(editor.scrollHeight))}px`;
                    }}
                    onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
                      if (event.key === "Escape") event.currentTarget.blur();
                    }}
                    ref={(node) => {
                      if (node) textEditorRefs.current.set(element.id, node);
                      else textEditorRefs.current.delete(element.id);
                    }}
                    style={textStyleForElement(element)}
                    suppressContentEditableWarning
                  >
                    {element.text}
                  </div>
                ) : (
                  <ShapeGraphic element={element} />
                )}

                {selected &&
                !groupedSelectionBounds &&
                element.type !== "line" ? (
                  <SelectionOutlineSvg
                    centerOutset={selectionHandleOutset}
                    controlScale={selectionControlScale}
                    height={element.height}
                    lineWidth={selectionLineWidth}
                    showCornerHandles={
                      nodeEditElementId !== element.id &&
                      selectedElements.length === 1 &&
                      !element.locked
                    }
                    strokePlacement={
                      element.type === "image" ? "inside" : "center"
                    }
                    width={element.width}
                  />
                ) : null}

                {nodeEditElementId === element.id && element.type === "pen" ? (
                  <PenEditControls
                    element={element}
                    onHandlePointerDown={handlePenHandlePointerDown}
                    onNodePointerDown={handlePenNodePointerDown}
                    selectedHandles={selectedPenHandles}
                    selectedNodes={selectedPenNodes}
                  />
                ) : null}

                {nodeEditElementId !== element.id &&
                selectedElements.length === 1 &&
                selected &&
                !element.locked ? (
                  <>
                    {element.type === "line" ? (
                      (["start", "end"] as const).map((endpoint) => (
                        <button
                          aria-label={`Adjust ${element.name} ${endpoint}`}
                          className={`line-endpoint endpoint-${endpoint}`}
                          key={endpoint}
                          onPointerDown={(event) =>
                            handleLineEndpointPointerDown(
                              event,
                              element,
                              endpoint,
                            )
                          }
                          type="button"
                        />
                      ))
                    ) : (
                      <>
                        {(["nw", "ne", "se", "sw"] as ResizeHandle[]).map(
                          (handle) => (
                            <button
                              aria-label={`Resize ${handle}`}
                              className={`resize-handle handle-${handle}`}
                              key={handle}
                              onPointerDown={(event) =>
                                handleResizePointerDown(event, element, handle)
                              }
                              type="button"
                            />
                          ),
                        )}
                        {element.type === "image"
                          ? (["n", "e", "s", "w"] as ImageResizeHandle[]).map(
                              (handle) => (
                                <button
                                  aria-label={`Crop image ${handle}`}
                                  className={`resize-handle image-edge-handle image-edge-handle-${handle}`}
                                  key={handle}
                                  onPointerDown={(event) =>
                                    handleImageCropPointerDown(
                                      event,
                                      element,
                                      handle,
                                    )
                                  }
                                  type="button"
                                />
                              ),
                            )
                          : null}
                      </>
                    )}
                  </>
                ) : null}
              </div>
            );
          })}

          {combinedSelectionBounds ? (
            <div
              aria-label={
                groupedSelectionId ? "Group selection" : "Multiple selection"
              }
              className={`group-selection-outline ${groupedSelectionId ? "is-group" : "is-multiple"}`}
              style={
                {
                  height: combinedSelectionBounds.height,
                  left: combinedSelectionBounds.x,
                  top: combinedSelectionBounds.y,
                  width: combinedSelectionBounds.width,
                  "--selection-handle-outset": `${selectionOutlineWidth / 2}px`,
                  "--selection-outline-width": `${selectionOutlineWidth}px`,
                } as CSSProperties
              }
            >
              <SelectionOutlineSvg
                centerOutset={selectionOutlineWidth / 2}
                controlScale={selectionControlScale}
                height={combinedSelectionBounds.height}
                lineWidth={selectionOutlineWidth}
                showCornerHandles={combinedSelectionResizable}
                width={combinedSelectionBounds.width}
              />
              {combinedSelectionResizable
                ? (["nw", "ne", "se", "sw"] as ResizeHandle[]).map((handle) => (
                    <button
                      aria-label={`Resize selection ${handle}`}
                      className={`resize-handle multi-resize-handle handle-${handle}`}
                      key={handle}
                      onPointerDown={(event) =>
                        handleMultiResizePointerDown(event, handle)
                      }
                      type="button"
                    />
                  ))
                : null}
            </div>
          ) : null}

          {selectionDimensionsBounds &&
          selectionDimensionsPlacement &&
          selectionDimensionsValue ? (
            <output
              aria-label="Selection dimensions"
              className={`selection-dimensions ${selectionDimensionsPlacement.className}`}
              key={`selection-dimensions-${selectedElementIds.join("-")}`}
              style={{
                left:
                  selectionDimensionsBounds.x +
                  selectionDimensionsBounds.width / 2,
                top: selectionDimensionsPlacement.top,
              }}
            >
              W {selectionDimensionsValue.width} x H{" "}
              {selectionDimensionsValue.height}
            </output>
          ) : null}

          {rulersVisible
            ? guides.map((guide) => {
                const horizontal = guide.orientation === "horizontal";
                const selected = selectedGuideIds.includes(guide.id);
                return (
                  <div
                    aria-label={`${horizontal ? "Horizontal" : "Vertical"} guide at ${Math.round(guide.position)} pixels`}
                    aria-selected={selected}
                    className={`editor-guide ${horizontal ? "is-horizontal" : "is-vertical"} ${selected ? "is-selected" : ""}`}
                    data-guide-id={guide.id}
                    key={guide.id}
                    onPointerCancel={handleGuidePointerUp}
                    onPointerDown={(event) =>
                      handleGuidePointerDown(event, guide)
                    }
                    onPointerMove={handleGuidePointerMove}
                    onPointerUp={handleGuidePointerUp}
                    role="option"
                    style={
                      horizontal
                        ? {
                            left: -10000,
                            top: guide.position,
                            width: 20000,
                          }
                        : {
                            height: 20000,
                            left: guide.position,
                            top: -10000,
                          }
                    }
                  />
                );
              })
            : null}

          <div
            className="smart-guide is-horizontal"
            hidden
            ref={horizontalSmartGuideRef}
          />
          <div
            className="smart-guide is-vertical"
            hidden
            ref={verticalSmartGuideRef}
          />

          {Array.from({ length: distancePreviewSlotCount }, (_, index) => (
            <div
              className="distance-preview-slot"
              hidden
              key={`distance-preview-${index}`}
              ref={(node) => {
                distanceMeasurementRefs.current[index] = node;
              }}
            >
              <span className="distance-preview-label" />
            </div>
          ))}

          {distanceMeasurements.map((measurement, index) => {
            const horizontal = measurement.axis === "horizontal";
            return (
              <div
                className={[
                  "distance-measurement",
                  horizontal ? "is-horizontal" : "is-vertical",
                  measurement.hideMinArrow ? "hide-min-arrow" : "",
                  measurement.hideMaxArrow ? "hide-max-arrow" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={`distance-${measurement.axis}-${index}`}
                style={
                  horizontal
                    ? {
                        left: Math.min(measurement.from, measurement.to),
                        top: measurement.cross,
                        width: Math.max(
                          1,
                          Math.abs(measurement.to - measurement.from),
                        ),
                      }
                    : {
                        height: Math.max(
                          1,
                          Math.abs(measurement.to - measurement.from),
                        ),
                        left: measurement.cross,
                        top: Math.min(measurement.from, measurement.to),
                      }
                }
              >
                <span className="distance-label">{measurement.value} px</span>
              </div>
            );
          })}

          {penDraftBounds ? (
            <svg
              aria-hidden="true"
              className="draw-draft draft-pen"
              preserveAspectRatio="none"
              shapeRendering="geometricPrecision"
              style={{
                height: Math.max(8, penDraftBounds.height),
                left: penDraftBounds.x,
                top: penDraftBounds.y,
                width: Math.max(8, penDraftBounds.width),
              }}
              viewBox={`0 0 ${Math.max(8, penDraftBounds.width)} ${Math.max(8, penDraftBounds.height)}`}
            >
              {penDraftPoints.map((point, index) => (
                <g key={`pen-draft-helper-${index}`}>
                  {point.handleIn ? (
                    <line
                      stroke="#ab51f0"
                      strokeLinecap="round"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                      x1={point.x - penDraftBounds.x}
                      x2={point.handleIn.x - penDraftBounds.x}
                      y1={point.y - penDraftBounds.y}
                      y2={point.handleIn.y - penDraftBounds.y}
                    />
                  ) : null}
                  {point.handleOut ? (
                    <line
                      stroke="#ab51f0"
                      strokeLinecap="round"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                      x1={point.x - penDraftBounds.x}
                      x2={point.handleOut.x - penDraftBounds.x}
                      y1={point.y - penDraftBounds.y}
                      y2={point.handleOut.y - penDraftBounds.y}
                    />
                  ) : null}
                </g>
              ))}
              <path
                d={pathData(
                  penDraftPoints.map((point) => ({
                    ...point,
                    x: point.x - penDraftBounds.x,
                    y: point.y - penDraftBounds.y,
                    handleIn: point.handleIn
                      ? {
                          x: point.handleIn.x - penDraftBounds.x,
                          y: point.handleIn.y - penDraftBounds.y,
                        }
                      : undefined,
                    handleOut: point.handleOut
                      ? {
                          x: point.handleOut.x - penDraftBounds.x,
                          y: point.handleOut.y - penDraftBounds.y,
                        }
                      : undefined,
                  })),
                )}
                fill="none"
                stroke="#000000"
                strokeLinecap="round"
                strokeLinejoin="round"
                shapeRendering="geometricPrecision"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              {penDraft && !penDraft.isDragging && penDraftPoints.length ? (
                <line
                  stroke="#ab51f0"
                  strokeDasharray="3 3"
                  strokeLinecap="round"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                  x1={penDraftPoints.at(-1)!.x - penDraftBounds.x}
                  x2={penDraftCurrent!.x - penDraftBounds.x}
                  y1={penDraftPoints.at(-1)!.y - penDraftBounds.y}
                  y2={penDraftCurrent!.y - penDraftBounds.y}
                />
              ) : null}
              {penDraftPoints.map((point, index) => (
                <g key={`pen-draft-points-${index}`}>
                  {point.handleIn ? (
                    <circle
                      cx={point.handleIn.x - penDraftBounds.x}
                      cy={point.handleIn.y - penDraftBounds.y}
                      fill="#ffffff"
                      r="3"
                      stroke="#ab51f0"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}
                  {point.handleOut ? (
                    <circle
                      cx={point.handleOut.x - penDraftBounds.x}
                      cy={point.handleOut.y - penDraftBounds.y}
                      fill="#ffffff"
                      r="3"
                      stroke="#ab51f0"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}
                  <circle
                    cx={point.x - penDraftBounds.x}
                    cy={point.y - penDraftBounds.y}
                    fill="#ffffff"
                    r="3"
                    stroke="#ab51f0"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              ))}
            </svg>
          ) : draftLine ? (
            <svg
              aria-hidden="true"
              className="draw-draft draft-line"
              preserveAspectRatio="none"
              shapeRendering="geometricPrecision"
              style={{
                height: draftLine.height,
                left: draftLine.x,
                top: draftLine.y,
                width: draftLine.width,
                background: "transparent",
              }}
              viewBox={`0 0 ${draftLine.width} ${draftLine.height}`}
            >
              <rect
                fill="rgb(171 81 240 / 10%)"
                height={Math.max(1, draftLine.height - 1)}
                stroke="#ab51f0"
                strokeDasharray="3 3"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                width={Math.max(1, draftLine.width - 1)}
                x="0.5"
                y="0.5"
              />
              <line
                stroke="#000000"
                strokeLinecap="round"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                x1={draftLine.startX}
                x2={draftLine.endX}
                y1={draftLine.startY}
                y2={draftLine.endY}
              />
            </svg>
          ) : draftBounds ? (
            <DrawDraftPreview
              bounds={draftBounds}
              draft={drawDraft!}
              outlineWidth={selectionOutlineWidth}
            />
          ) : null}
          {marqueeBounds ? (
            <div
              className="selection-marquee"
              style={{
                height: marqueeBounds.height,
                left: marqueeBounds.x,
                top: marqueeBounds.y,
                width: marqueeBounds.width,
              }}
            />
          ) : null}
        </div>

        {rulersVisible && guidePreview ? (
          <div
            className={`editor-guide-preview ${guidePreview.orientation === "horizontal" ? "is-horizontal" : "is-vertical"}`}
            style={
              guidePreview.orientation === "horizontal"
                ? { top: guidePreview.position }
                : { left: guidePreview.position }
            }
          />
        ) : null}

        <aside
          aria-label="Navigator"
          className={`navigator interface-scale-surface ${navigatorVisible ? "is-visible" : ""}`}
        >
          <span className="navigator-title">Navigator</span>
          <div className="navigator-preview">
            <div
              className="navigator-map"
              style={{
                height: navigatorMap.height,
                left: navigatorMap.left,
                top: navigatorMap.top,
                width: navigatorMap.width,
              }}
            >
              <div
                className="navigator-artboard"
                style={{
                  background: "transparent",
                  height: navigatorBoard.height,
                  left: navigatorBoard.left,
                  top: navigatorBoard.top,
                  width: navigatorBoard.width,
                }}
              >
                <ArtboardBackground artboard={artboard} playVideo={false} />
                {elements.map((element) => {
                  if (!element.visible) return null;
                  return (
                    <div
                      className="navigator-element"
                      key={element.id}
                      style={{
                        height: element.height * navigatorScale,
                        left: element.x * navigatorScale,
                        opacity: element.opacity / 100,
                        top: element.y * navigatorScale,
                        transform: `rotate(${element.rotation}deg)`,
                        transformOrigin: "center",
                        width: element.width * navigatorScale,
                      }}
                    >
                      {element.type === "text" ? (
                        <span className="navigator-text">{element.text}</span>
                      ) : (
                        <ShapeGraphic
                          element={element}
                          imageScale={navigatorScale}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <span
                aria-hidden="true"
                className="navigator-viewport"
                style={navigatorViewportStyle}
              />
            </div>
          </div>
          <div className="navigator-zoom">
            <button
              aria-label="Zoom out"
              onClick={() => zoomAtCanvasCenter(zoom - 10)}
              type="button"
            >
              <Minus size={13} />
            </button>
            <strong>{Math.round(zoom)} %</strong>
            <button
              aria-label="Zoom in"
              onClick={() => zoomAtCanvasCenter(zoom + 10)}
              type="button"
            >
              <Plus size={13} />
            </button>
          </div>
        </aside>
      </section>

      <aside
        aria-label="Properties"
        className="properties-panel interface-scale-surface"
      >
        <div
          aria-label="Property sections"
          className="panel-tabs"
          data-active-tab={visiblePropertyTab}
          role="tablist"
        >
          <button
            aria-label="INTERACTION"
            aria-selected="false"
            data-label="INTERACTION"
            disabled
            role="tab"
            type="button"
          >
            INTERACTION
          </button>
          <button
            aria-label="SCENES"
            aria-selected={visiblePropertyTab === "scenes"}
            data-label="SCENES"
            onClick={() => setPropertyTab("scenes")}
            role="tab"
            type="button"
          >
            SCENES
          </button>
          <button
            aria-label="DESIGN"
            aria-selected={visiblePropertyTab === "design"}
            data-label="DESIGN"
            onClick={() => setPropertyTab("design")}
            role="tab"
            type="button"
          >
            DESIGN
          </button>
          <button
            aria-label="SOUND"
            aria-selected={visiblePropertyTab === "sound"}
            data-label="SOUND"
            onClick={() => setPropertyTab("sound")}
            role="tab"
            type="button"
          >
            SOUND
          </button>
          <button
            aria-label="LOGIC"
            aria-selected="false"
            data-label="LOGIC"
            disabled
            role="tab"
            type="button"
          >
            LOGIC
          </button>
        </div>
        {visiblePropertyTab === "scenes" ? (
          <ScenePanel
            activePageId={activePageId}
            activePageName={activePage?.name ?? "Page"}
            artboard={artboard}
            key={activePageId}
            onRenamePage={renamePage}
            onUpdateArtboard={updateArtboard}
          />
        ) : visiblePropertyTab === "sound" ? (
          <SoundPanel
            advancedSettings={advancedSoundSettings}
            elements={elements}
            mixer={soundMixerSettings}
            onAttachArtwork={attachBackgroundMusicArtwork}
            onAppendInteractionSoundAssets={
              appendInteractionSoundAssetsForElements
            }
            onApplyCommonInteractionSoundAsset={
              applyCommonInteractionSoundAssetForElements
            }
            onCheckpoint={checkpoint}
            onClearInteractionSoundAssets={
              clearInteractionSoundAssetsForElements
            }
            onCreateObjectUrl={createBackgroundMusicObjectUrl}
            onDeleteInteractionAsset={deleteInteractionSoundAsset}
            onReplaceInteractionSounds={replaceInteractionSoundsForElement}
            onSelectElement={(elementId) => {
              setSelectedElementIds([elementId]);
              setSelectedGuideIds([]);
              setSelectedPenNodes([]);
              setSelectedPenHandles([]);
            }}
            onUpdate={updateBackgroundMusic}
            onUpdateAdvanced={updateAdvancedSound}
            onUpdateInteractionExpanded={updateInteractionExpandedForElements}
            onUpdateInteractionSound={updateInteractionSoundForElements}
            onUpdateMixer={updateSoundMixer}
            pageId={activePageId}
            selectedElements={selectedElements}
            settings={backgroundMusicSettings}
          />
        ) : (
          <DesignPanel
            artboard={artboard}
            lockRatio={lockRatio}
            onCheckpoint={checkpoint}
            onLockRatioChange={setLockRatio}
            onReplaceElements={replaceElements}
            onUpdateElement={updateElement}
            selectedElements={selectedElements}
          />
        )}
        <output className="visually-hidden">
          {selectedElementIds.length
            ? `${selectedElementIds.length} selected`
            : clipboard.length
              ? `${clipboard.length} copied`
              : ""}
        </output>
      </aside>
      {previewVisible ? (
        <ViewerPreview
          advancedSound={advancedSoundSettings}
          artboard={artboard}
          backgroundMusic={backgroundMusicSettings}
          elements={elements}
          mixer={soundMixerSettings}
          onClose={() => setPreviewVisible(false)}
        />
      ) : null}
    </main>
  );
}
