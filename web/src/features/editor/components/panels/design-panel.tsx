import Image from "next/image";
import { type CSSProperties, useState } from "react";

import {
  DesignColorField,
  DesignDropdown,
  DesignIconButton,
  DesignNumberField,
  DesignRange,
  DesignRotationField,
} from "@/features/editor/components/ui/design-fields";
import {
  fontSizePresets,
  fontWeightOptions,
} from "@/features/editor/lib/editor-constants";
import {
  boundsFromElements,
  clamp,
  sourceCornerIndexForVisualPosition,
} from "@/features/editor/lib/geometry";
import {
  pathfinderElement,
  splitPathfinderElements,
} from "@/features/editor/lib/pathfinder";
import {
  polygonCornerIndicatorPaths,
  polygonCornerRadii,
  polygonCornerRadiusValues,
  polygonPointsForElement,
  roundedPolygonPath,
} from "@/features/editor/lib/polygon";
import {
  type ArtboardSettings,
  type CanvasElement,
  type PathfinderOperation,
} from "@/features/editor/store/editor-store";
import { assetPath } from "@/lib/asset-path";

export function DesignPanel({
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
    selectedElements.every(
      (element) => element.type !== "text" && element.type !== "video",
    );
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
