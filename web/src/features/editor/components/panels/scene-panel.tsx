import { useRef, useState } from "react";

import {
  DesignDropdown,
  DesignRange,
} from "@/features/editor/components/ui/design-fields";
import {
  type SceneBackgroundType,
  SceneCheckbox,
  SceneColorField,
  SceneModeTabs,
  ScenePercentField,
} from "@/features/editor/components/ui/scene-fields";
import {
  backgroundMediaType,
  gradientCssForArtboard,
  gradientCssFromStops,
  gradientStopsForArtboard,
  hasGradientBackground,
  hasSolidBackground,
} from "@/features/editor/lib/artboard-style";
import { colorWithOpacity } from "@/features/editor/lib/element-style";
import { clamp } from "@/features/editor/lib/geometry";
import { createMediaPoster } from "@/features/editor/lib/media-poster";
import { type ArtboardSettings } from "@/features/editor/store/editor-store";
import { assetPath } from "@/lib/asset-path";

export function ScenePanel({
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
              const kind = isVideoBackground ? "video" : "image";
              const requiresPoster =
                kind === "video" ||
                file.type.toLowerCase() === "image/gif" ||
                /\.gif$/i.test(file.name);
              onUpdateArtboard(
                isVideoBackground
                  ? {
                      backgroundMediaPreview: requiresPoster ? "" : source,
                      backgroundMediaPreviewSource: source,
                      backgroundVideo: source,
                    }
                  : {
                      backgroundImage: source,
                      backgroundMediaPreview: requiresPoster ? "" : source,
                      backgroundMediaPreviewSource: source,
                    },
              );
              if (requiresPoster) {
                void createMediaPoster(file, source, { kind }).then(
                  (preview) => {
                    onUpdateArtboard({
                      backgroundMediaPreview: preview ?? "",
                      backgroundMediaPreviewSource: source,
                    });
                  },
                );
              }
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
