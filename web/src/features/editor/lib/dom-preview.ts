import {
  type DistanceMeasurement,
  type DragPointerSample,
  type DrawDraft,
  type ElementRect,
  type MovePreviewTargets,
  type MultiResizePreviewTargets,
  type Point,
  type ResizePreviewTargets,
  type SmartGuide,
  type SmartGuidePreviewTargets,
} from "@/features/editor/lib/editor-types";
import {
  boundsFromPoints,
  lineDraftGeometry,
} from "@/features/editor/lib/geometry";
import { imageCropForElement } from "@/features/editor/lib/image-crop";
import { type CanvasElement } from "@/features/editor/store/editor-store";

export function dragPointerSample(event: {
  altKey: boolean;
  clientX: number;
  clientY: number;
  ctrlKey: boolean;
  metaKey: boolean;
  pointerId: number;
  shiftKey: boolean;
}): DragPointerSample {
  return {
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    pointerId: event.pointerId,
    shiftKey: event.shiftKey,
    x: event.clientX,
    y: event.clientY,
  };
}

export function collectMovePreviewTargets(
  initialElements: CanvasElement[],
): MovePreviewTargets {
  const artboardNode = document.getElementById("editor-artboard");
  if (!artboardNode) return { elements: [], overlays: [] };
  const selectedIds = new Set(initialElements.map((element) => element.id));
  const targets = {
    elements: [
      ...artboardNode.querySelectorAll<HTMLElement>(
        ".canvas-element[data-element-id]",
      ),
    ].filter((node) => selectedIds.has(node.dataset.elementId ?? "")),
    overlays: [
      ...artboardNode.querySelectorAll<HTMLElement>(
        ".group-selection-outline, .selection-dimensions",
      ),
    ],
  };
  targets.elements.forEach((node) => node.classList.add("is-drag-preview"));
  return targets;
}

export function previewElementMove(targets: MovePreviewTargets, delta: Point) {
  targets.elements.forEach((node) => {
    node.style.translate = `${delta.x}px ${delta.y}px`;
  });

  const connectedOverlays = targets.overlays.filter((node) => node.isConnected);
  if (
    connectedOverlays.length === 0 ||
    connectedOverlays.length !== targets.overlays.length
  ) {
    const artboardNode = document.getElementById("editor-artboard");
    targets.overlays = artboardNode
      ? [
          ...artboardNode.querySelectorAll<HTMLElement>(
            ".group-selection-outline, .selection-dimensions",
          ),
        ]
      : [];
  }

  targets.overlays.forEach((node) => {
    node.style.translate = `${delta.x}px ${delta.y}px`;
  });
}

export function clearElementMovePreview(targets: MovePreviewTargets) {
  targets.elements.forEach((node) => {
    node.classList.remove("is-drag-preview");
    node.style.removeProperty("translate");
  });
  targets.overlays.forEach((node) => {
    node.style.removeProperty("translate");
  });
}

export function collectResizePreviewTargets(
  elementId: string,
): ResizePreviewTargets {
  const artboardNode = document.getElementById("editor-artboard");
  return {
    dimensions:
      artboardNode?.querySelector<HTMLOutputElement>(".selection-dimensions") ??
      null,
    element:
      artboardNode?.querySelector<HTMLElement>(
        `.canvas-element[data-element-id="${elementId}"]`,
      ) ?? null,
  };
}

export type SelectionStrokePlacement = "center" | "inside";

export function selectionOutlineGeometry(
  width: number,
  height: number,
  lineWidth: number,
  centerOutset: number,
  strokePlacement: SelectionStrokePlacement,
) {
  const safeWidth = Math.max(0.001, width);
  const safeHeight = Math.max(0.001, height);
  const effectiveLineWidth =
    strokePlacement === "inside"
      ? Math.min(lineWidth, safeWidth / 2, safeHeight / 2)
      : lineWidth;
  const inset =
    strokePlacement === "inside" ? effectiveLineWidth / 2 : -centerOutset;

  return {
    height: safeHeight - inset * 2,
    lineWidth: effectiveLineWidth,
    width: safeWidth - inset * 2,
    x: inset,
    y: inset,
  };
}

export function previewSelectionOutline(
  target: HTMLElement,
  width: number,
  height: number,
) {
  const selectionOutline = target.querySelector<SVGSVGElement>(
    ".selection-outline-svg",
  );
  const selectionRect = selectionOutline?.querySelector<SVGRectElement>(
    "rect[data-selection-frame]",
  );
  if (!selectionOutline || !selectionRect) return;

  const centerOutset = Number.parseFloat(
    selectionOutline.dataset.selectionCenterOutset ?? "0",
  );
  const lineWidth = Number.parseFloat(
    selectionOutline.dataset.selectionBaseLineWidth ?? "0",
  );
  const strokePlacement =
    selectionOutline.dataset.selectionStrokePlacement === "inside"
      ? "inside"
      : "center";
  const geometry = selectionOutlineGeometry(
    width,
    height,
    lineWidth,
    centerOutset,
    strokePlacement,
  );
  selectionOutline.setAttribute(
    "viewBox",
    `0 0 ${Math.max(0.001, width)} ${Math.max(0.001, height)}`,
  );
  selectionRect.setAttribute("x", `${geometry.x}`);
  selectionRect.setAttribute("y", `${geometry.y}`);
  selectionRect.setAttribute("width", `${geometry.width}`);
  selectionRect.setAttribute("height", `${geometry.height}`);
  selectionRect.setAttribute("stroke-width", `${geometry.lineWidth}`);

  selectionOutline
    .querySelectorAll<SVGRectElement>("[data-selection-corner]")
    .forEach((handle) => {
      const handleSize = Number.parseFloat(
        handle.getAttribute("data-handle-size") ?? "0",
      );
      const corner = handle.getAttribute("data-selection-corner");
      const centerX = corner?.includes("e")
        ? width + centerOutset
        : -centerOutset;
      const centerY = corner?.includes("s")
        ? height + centerOutset
        : -centerOutset;
      handle.setAttribute("x", `${centerX - handleSize / 2}`);
      handle.setAttribute("y", `${centerY - handleSize / 2}`);
    });
}

export function previewImageGraphic(
  target: HTMLElement,
  geometry: CanvasElement,
) {
  if (geometry.type !== "image") return;
  const crop = imageCropForElement(geometry);
  const imageContent = target.querySelector<HTMLElement>(
    ".image-shape-content",
  );
  const imageSource = target.querySelector<HTMLElement>(".image-shape-source");
  if (imageContent) {
    imageContent.style.height = `${crop.baseHeight * crop.scaleY}px`;
    imageContent.style.left = `${-crop.left * crop.scaleX}px`;
    imageContent.style.top = `${-crop.top * crop.scaleY}px`;
    imageContent.style.width = `${crop.baseWidth * crop.scaleX}px`;
  }
  if (imageSource) {
    imageSource.style.height = `${crop.baseHeight}px`;
    imageSource.style.transform = `scale(${crop.scaleX}, ${crop.scaleY})`;
    imageSource.style.width = `${crop.baseWidth}px`;
  }
}

export function previewElementResize(
  targets: ResizePreviewTargets,
  geometry: CanvasElement,
  artboardHeight: number,
  captionGap: number,
  captionHeight: number,
) {
  const { element, dimensions } = targets;
  if (element) {
    element.classList.add("is-resize-preview");
    element.style.height = `${geometry.height}px`;
    element.style.left = `${geometry.x}px`;
    element.style.top = `${geometry.y}px`;
    element.style.width = `${geometry.width}px`;

    previewSelectionOutline(element, geometry.width, geometry.height);
    previewImageGraphic(element, geometry);
  }

  if (!dimensions) return;
  const placeBelow =
    geometry.y + geometry.height + captionGap + captionHeight <= artboardHeight;
  dimensions.classList.toggle("is-above", !placeBelow);
  dimensions.style.left = `${geometry.x + geometry.width / 2}px`;
  dimensions.style.top = `${placeBelow ? geometry.y + geometry.height + captionGap : geometry.y - captionGap}px`;
  dimensions.textContent = `W ${Math.round(geometry.width)} x H ${Math.round(geometry.height)}`;
}

export function collectMultiResizePreviewTargets(
  elementIds: string[],
): MultiResizePreviewTargets {
  const artboardNode = document.getElementById("editor-artboard");
  const selectedIds = new Set(elementIds);
  return {
    dimensions:
      artboardNode?.querySelector<HTMLOutputElement>(".selection-dimensions") ??
      null,
    elements: artboardNode
      ? [
          ...artboardNode.querySelectorAll<HTMLElement>(
            ".canvas-element[data-element-id]",
          ),
        ].filter((node) => selectedIds.has(node.dataset.elementId ?? ""))
      : [],
    outline:
      artboardNode?.querySelector<HTMLElement>(".group-selection-outline") ??
      null,
  };
}

export function previewMultiElementResize(
  targets: MultiResizePreviewTargets,
  elements: CanvasElement[],
  bounds: ElementRect,
  artboardHeight: number,
  captionGap: number,
  captionHeight: number,
) {
  const geometries = new Map(elements.map((element) => [element.id, element]));
  targets.elements.forEach((node) => {
    const element = geometries.get(node.dataset.elementId ?? "");
    if (!element) return;
    node.classList.add("is-resize-preview");
    node.style.height = `${element.height}px`;
    node.style.left = `${element.x}px`;
    node.style.top = `${element.y}px`;
    node.style.width = `${element.width}px`;

    previewSelectionOutline(node, element.width, element.height);
    previewImageGraphic(node, element);
  });

  if (targets.outline) {
    targets.outline.style.height = `${bounds.height}px`;
    targets.outline.style.left = `${bounds.x}px`;
    targets.outline.style.top = `${bounds.y}px`;
    targets.outline.style.width = `${bounds.width}px`;
    previewSelectionOutline(targets.outline, bounds.width, bounds.height);
  }

  const dimensions = targets.dimensions;
  if (!dimensions) return;
  const placeBelow =
    bounds.y + bounds.height + captionGap + captionHeight <= artboardHeight;
  dimensions.classList.toggle("is-above", !placeBelow);
  dimensions.style.left = `${bounds.x + bounds.width / 2}px`;
  dimensions.style.top = `${placeBelow ? bounds.y + bounds.height + captionGap : bounds.y - captionGap}px`;
  dimensions.textContent = `W ${Math.round(bounds.width)} x H ${Math.round(bounds.height)}`;
}

export function previewArtboardPan(currentPan: Point) {
  const artboardNode = document.getElementById("editor-artboard");
  artboardNode?.classList.add("is-pan-preview");
  artboardNode?.style.setProperty("--artboard-x", `${currentPan.x}px`);
  artboardNode?.style.setProperty("--artboard-y", `${currentPan.y}px`);
}

export function previewDrawDraft(draft: DrawDraft) {
  const artboardNode = document.getElementById("editor-artboard");
  if (!artboardNode) return;

  if (draft.type === "line") {
    const geometry = lineDraftGeometry(draft.start, draft.current);
    const preview = artboardNode.querySelector<SVGSVGElement>(
      ".draw-draft.draft-line",
    );
    if (!preview) return;
    preview.style.height = `${geometry.height}px`;
    preview.style.left = `${geometry.x}px`;
    preview.style.top = `${geometry.y}px`;
    preview.style.width = `${geometry.width}px`;
    preview.setAttribute("viewBox", `0 0 ${geometry.width} ${geometry.height}`);
    const bounds = preview.querySelector("rect");
    bounds?.setAttribute("height", String(Math.max(1, geometry.height - 1)));
    bounds?.setAttribute("width", String(Math.max(1, geometry.width - 1)));
    const line = preview.querySelector("line");
    line?.setAttribute("x1", String(geometry.startX));
    line?.setAttribute("x2", String(geometry.endX));
    line?.setAttribute("y1", String(geometry.startY));
    line?.setAttribute("y2", String(geometry.endY));
    return;
  }

  const bounds = boundsFromPoints(draft.start, draft.current);
  const preview = artboardNode.querySelector<HTMLElement>(
    ".draw-draft.draw-draft-preview",
  );
  if (!preview) return;
  preview.style.height = `${Math.max(1, bounds.height)}px`;
  preview.style.left = `${bounds.x}px`;
  preview.style.top = `${bounds.y}px`;
  preview.style.width = `${Math.max(1, bounds.width)}px`;
  const outline = preview.querySelector<SVGSVGElement>(".draw-draft-outline");
  const outlineRect = outline?.querySelector<SVGRectElement>("rect");
  const safeWidth = Math.max(1, bounds.width);
  const safeHeight = Math.max(1, bounds.height);
  outline?.setAttribute("viewBox", `0 0 ${safeWidth} ${safeHeight}`);
  outlineRect?.setAttribute("width", `${safeWidth}`);
  outlineRect?.setAttribute("height", `${safeHeight}`);
}

export function previewMarquee(start: Point, current: Point) {
  const marquee = document
    .getElementById("editor-artboard")
    ?.querySelector<HTMLElement>(".selection-marquee");
  if (!marquee) return;
  const bounds = boundsFromPoints(start, current);
  marquee.style.height = `${bounds.height}px`;
  marquee.style.left = `${bounds.x}px`;
  marquee.style.top = `${bounds.y}px`;
  marquee.style.width = `${bounds.width}px`;
}

export function previewSmartGuides(
  targets: SmartGuidePreviewTargets,
  guides: SmartGuide[],
) {
  (["horizontal", "vertical"] as const).forEach((axis) => {
    const node = targets[axis];
    if (!node) return;
    const guide = guides.find((item) => item.axis === axis);
    node.hidden = !guide;
    if (!guide) return;
    if (axis === "vertical") {
      node.style.height = `${Math.max(1, guide.end - guide.start)}px`;
      node.style.left = `${guide.coordinate}px`;
      node.style.top = `${guide.start}px`;
      node.style.removeProperty("width");
    } else {
      node.style.left = `${guide.start}px`;
      node.style.top = `${guide.coordinate}px`;
      node.style.width = `${Math.max(1, guide.end - guide.start)}px`;
      node.style.removeProperty("height");
    }
  });
}

export function previewDistanceMeasurements(
  slots: Array<HTMLDivElement | null>,
  measurements: DistanceMeasurement[],
) {
  slots.forEach((node, index) => {
    if (!node) return;
    const measurement = measurements[index];
    node.hidden = !measurement;
    node.className = measurement
      ? [
          "distance-preview-slot",
          "distance-measurement",
          measurement.axis === "horizontal" ? "is-horizontal" : "is-vertical",
          measurement.hideMinArrow ? "hide-min-arrow" : "",
          measurement.hideMaxArrow ? "hide-max-arrow" : "",
        ]
          .filter(Boolean)
          .join(" ")
      : "distance-preview-slot";
    const label = node.querySelector<HTMLElement>(".distance-preview-label");
    if (label) {
      label.className = measurement
        ? "distance-preview-label distance-label"
        : "distance-preview-label";
      label.textContent = measurement ? `${measurement.value} px` : "";
    }
    if (!measurement) return;
    if (measurement.axis === "horizontal") {
      node.style.left = `${Math.min(measurement.from, measurement.to)}px`;
      node.style.top = `${measurement.cross}px`;
      node.style.width = `${Math.max(1, Math.abs(measurement.to - measurement.from))}px`;
      node.style.removeProperty("height");
    } else {
      node.style.height = `${Math.max(1, Math.abs(measurement.to - measurement.from))}px`;
      node.style.left = `${measurement.cross}px`;
      node.style.top = `${Math.min(measurement.from, measurement.to)}px`;
      node.style.removeProperty("width");
    }
  });
}

export function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.matches("input, textarea, select, [contenteditable='true']")
  );
}

export function localPointFromElement(
  element: HTMLElement | null,
  clientX: number,
  clientY: number,
  scale: number,
): Point {
  const bounds = element?.getBoundingClientRect();
  if (!bounds) return { x: 0, y: 0 };
  return {
    x: (clientX - bounds.left) / scale,
    y: (clientY - bounds.top) / scale,
  };
}

export function elementAtClientPoint(clientX: number, clientY: number) {
  const element = document.elementFromPoint(clientX, clientY);
  return element?.closest<HTMLElement>("[data-element-id]") ?? null;
}

export function guideAtClientPoint(clientX: number, clientY: number) {
  const element = document.elementFromPoint(clientX, clientY);
  return element?.closest<HTMLElement>("[data-guide-id]") ?? null;
}
