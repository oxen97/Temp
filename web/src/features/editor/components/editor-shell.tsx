"use client";

/* Pointer gestures intentionally use refs for mutable, event-only state. */
/* eslint-disable react-hooks/refs */

import {
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Minus,
  Monitor,
  MoreVertical,
  MousePointer2,
  Plus,
  Redo2,
  Smartphone,
  Square,
  Tablet,
  Undo2,
  Unlock,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import polygonClipping, {
  type MultiPolygon,
  type Ring,
} from "polygon-clipping";
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
  type CanvasElement,
  type EditorTool,
  type ArtboardSettings,
  type ImageCrop,
  type PathfinderData,
  type PathfinderOperation,
  type PathPoint,
  type ShapeType,
  type VectorPath,
  useEditorStore,
} from "@/features/editor/store/editor-store";
import { assetPath } from "@/lib/asset-path";

type ToolDefinition = {
  id: EditorTool;
  label: string;
  icon?: LucideIcon;
  asset?: {
    activeSrc?: string;
    height: number;
    src: string;
    width: number;
  };
};

const tools: ToolDefinition[] = [
  { id: "selection", label: "Selection", icon: MousePointer2 },
  {
    id: "hand",
    label: "Hand",
    asset: {
      activeSrc: assetPath("/figma/hand-active.svg?v=2"),
      height: 27,
      src: assetPath("/figma/hand.svg"),
      width: 21,
    },
  },
  { id: "rectangle", label: "Rectangle", icon: Square },
  {
    id: "text",
    label: "Text",
    asset: { height: 17, src: assetPath("/figma/text.svg"), width: 18 },
  },
  {
    id: "zoom",
    label: "Zoom",
    asset: { height: 15, src: assetPath("/figma/zoom.svg"), width: 15 },
  },
  {
    id: "settings",
    label: "Setting",
    asset: { height: 24, src: assetPath("/figma/settings.svg"), width: 24 },
  },
];

const designAssetDimensions: Record<string, { height: number; width: number }> =
  {
    "Group 109.svg": { height: 12.14, width: 8.57 },
    "Group 127.svg": { height: 11, width: 17 },
    "Group 129.svg": { height: 17, width: 11 },
    "Group 133.svg": { height: 12, width: 16.99 },
    "Group 134.svg": { height: 16.99, width: 12.01 },
    "Group 139.svg": { height: 8.57, width: 12 },
    "Group 150.svg": { height: 11.31, width: 11.31 },
    "Group 153.svg": { height: 17, width: 17 },
    "Group 154.svg": { height: 17, width: 17 },
    "Group 155.svg": { height: 17, width: 17 },
    "Group 156.svg": { height: 17, width: 17 },
    "Group 158.svg": { height: 17, width: 17 },
    "Group 159.svg": { height: 17, width: 17 },
    "Group 181.svg": { height: 11, width: 6 },
    "Group 191.svg": { height: 10, width: 18 },
    "Group 192.svg": { height: 10, width: 18 },
    "Group 193.svg": { height: 10, width: 18 },
    "Group 194.svg": { height: 10, width: 18 },
    "Group 92.svg": { height: 16.99, width: 14.16 },
    "Group 93.svg": { height: 15.1, width: 16.99 },
    "Group 94.svg": { height: 16.99, width: 13.21 },
    "Group 95.svg": { height: 14.09, width: 16.99 },
    "Group 96.svg": { height: 16.99, width: 12.27 },
    "Group 97.svg": { height: 13.09, width: 16.99 },
  };

const pathfinderLayerAssets: Record<PathfinderOperation, string> = {
  divide: "Group 158.svg",
  exclude: "Group 156.svg",
  flatten: "Group 158.svg",
  intersect: "Group 155.svg",
  outline: "Group 159.svg",
  subtract: "Group 154.svg",
  trim: "Group 159.svg",
  union: "Group 153.svg",
};

const rotationPresets = Array.from({ length: 12 }, (_, index) => index * 30);
const fontSizePresets = [
  8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96, 120, 144,
];
const fontWeightOptions = [
  ["100", "Thin"],
  ["200", "Extra Light"],
  ["300", "Light"],
  ["400", "Regular"],
  ["500", "Medium"],
  ["600", "Semi Bold"],
  ["700", "Bold"],
  ["800", "Extra Bold"],
  ["900", "Black"],
] as const;

const fontFamilyStacks: Record<string, string> = {
  Arial: "Arial, Helvetica, sans-serif",
  Georgia: 'Georgia, "Times New Roman", serif',
  Inter: 'var(--design-inter), Inter, "Segoe UI", Arial, sans-serif',
  "Times New Roman": '"Times New Roman", Times, serif',
};

const shapeOptions: { id: ShapeType; label: string }[] = [
  { id: "rectangle", label: "Rectangle" },
  { id: "circle", label: "Circle" },
  { id: "triangle", label: "Triangle" },
  { id: "star", label: "Star" },
  { id: "line", label: "Line" },
  { id: "pen", label: "Pen Tool" },
];

const shapeNames: Record<ShapeType, string> = {
  rectangle: "Rectangle",
  circle: "Circle",
  triangle: "Triangle",
  star: "Star",
  line: "Line",
  pen: "Pen",
};

type Point = { x: number; y: number };
type DragPointerSample = Point & {
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  pointerId: number;
  shiftKey: boolean;
};
type MovePreviewTargets = {
  elements: HTMLElement[];
  overlays: HTMLElement[];
};
type ResizePreviewTargets = {
  dimensions: HTMLOutputElement | null;
  element: HTMLElement | null;
};
type MultiResizePreviewTargets = {
  dimensions: HTMLOutputElement | null;
  elements: HTMLElement[];
  outline: HTMLElement | null;
};
type SmartGuidePreviewTargets = {
  horizontal: HTMLDivElement | null;
  vertical: HTMLDivElement | null;
};
const distancePreviewSlotCount = 12;
type PenAnchor = PathPoint;
type VectorPointRef = {
  nodeIndex: number;
  pathIndex: number;
};
type VectorHandleRef = VectorPointRef & {
  handle: "in" | "out";
};
type HandleMirroring = "none" | "angle" | "angle-length";
type DrawDraft = {
  type: Exclude<ShapeType, "pen"> | "text";
  start: Point;
  current: Point;
};
type PenDraft = {
  branchElementId?: string;
  current: Point;
  points: PenAnchor[];
  closed?: boolean;
  isDragging?: boolean;
};
type ResizeHandle = "nw" | "ne" | "se" | "sw";
type ImageResizeHandle = "n" | "e" | "s" | "w";
type ElementRect = {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
type SmartGuide = {
  anchor?: ElementRect;
  axis: "horizontal" | "vertical";
  coordinate: number;
  end: number;
  label?: string;
  start: number;
};
type DistanceMeasurement = {
  axis: "horizontal" | "vertical";
  cross: number;
  from: number;
  to: number;
  value: number;
};
type NavigatorViewport = {
  height: number;
  width: number;
  x: number;
  y: number;
};
type RulerRange = {
  end: number;
  start: number;
};
type EditorGuide = {
  id: string;
  orientation: "horizontal" | "vertical";
  position: number;
};
type GuideDrag = {
  guideId?: string;
  orientation: EditorGuide["orientation"];
  pointerId: number;
  source: "guide" | "ruler";
};
type SnapOption = {
  adjust: number;
  guide: SmartGuide;
  spacingPair?: [ElementRect, ElementRect];
};
type Gesture =
  | {
      kind: "pan";
      pointerId: number;
      currentPan: Point;
      startClient: Point;
      startPan: Point;
    }
  | {
      kind: "draw";
      pointerId: number;
      draft: DrawDraft;
      scale: number;
      startClient: Point;
    }
  | {
      kind: "pen";
      pointerId: number;
      anchorIndex: number;
      start: Point;
    }
  | {
      kind: "pen-node";
      pointerId: number;
      elementId: string;
      historyRecorded: boolean;
      nodeRefs: VectorPointRef[];
      initial: CanvasElement;
      startLocal: Point;
    }
  | {
      kind: "pen-handle";
      pointerId: number;
      elementId: string;
      handleRefs: VectorHandleRef[];
      historyRecorded: boolean;
      initial: CanvasElement;
      startLocal: Point;
    }
  | {
      kind: "move";
      pointerId: number;
      appliedDelta: Point;
      fixedElements: CanvasElement[];
      fixedRects: ElementRect[];
      initialElements: CanvasElement[];
      previewTargets: MovePreviewTargets;
      selectionBounds: ElementRect | null;
      selectionIds: string[];
      startClient: Point;
    }
  | {
      kind: "resize";
      pointerId: number;
      elementId: string;
      handle: ResizeHandle;
      initial: CanvasElement;
      appliedUpdates: Partial<CanvasElement>;
      previewTargets: ResizePreviewTargets;
      scale: number;
      startClient: Point;
    }
  | {
      kind: "multi-resize";
      pointerId: number;
      appliedElements: CanvasElement[];
      handle: ResizeHandle;
      initialBounds: ElementRect;
      initialElements: CanvasElement[];
      previewTargets: MultiResizePreviewTargets;
      scale: number;
      startClient: Point;
    }
  | {
      kind: "image-crop-resize";
      pointerId: number;
      elementId: string;
      handle: ImageResizeHandle;
      startLocal: Point;
      initial: CanvasElement;
    }
  | {
      kind: "line-endpoint";
      pointerId: number;
      elementId: string;
      endpoint: "start" | "end";
      fixedPoint: Point;
    }
  | {
      kind: "marquee";
      pointerId: number;
      start: Point;
      current: Point;
      additive: boolean;
      scale: number;
      startClient: Point;
    };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function dragPointerSample(event: {
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

function collectMovePreviewTargets(
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

function previewElementMove(targets: MovePreviewTargets, delta: Point) {
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

function clearElementMovePreview(targets: MovePreviewTargets) {
  targets.elements.forEach((node) => {
    node.classList.remove("is-drag-preview");
    node.style.removeProperty("translate");
  });
  targets.overlays.forEach((node) => {
    node.style.removeProperty("translate");
  });
}

function collectResizePreviewTargets(elementId: string): ResizePreviewTargets {
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

function previewElementResize(
  targets: ResizePreviewTargets,
  geometry: Pick<CanvasElement, "height" | "width" | "x" | "y">,
  artboardHeight: number,
) {
  const { element, dimensions } = targets;
  if (element) {
    element.classList.add("is-resize-preview");
    element.style.height = `${geometry.height}px`;
    element.style.left = `${geometry.x}px`;
    element.style.top = `${geometry.y}px`;
    element.style.width = `${geometry.width}px`;
  }

  if (!dimensions) return;
  const placeBelow = geometry.y + geometry.height + 28 <= artboardHeight;
  dimensions.classList.toggle("is-above", !placeBelow);
  dimensions.style.left = `${geometry.x + geometry.width / 2}px`;
  dimensions.style.top = `${placeBelow ? geometry.y + geometry.height + 8 : geometry.y - 8}px`;
  dimensions.textContent = `W ${Math.round(geometry.width)} x H ${Math.round(geometry.height)}`;
}

function collectMultiResizePreviewTargets(
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

function resizedBoundsFromCorner(
  initial: ElementRect,
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number,
  preserveRatio: boolean,
) {
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

  if (preserveRatio) {
    const widthScale =
      Math.max(minimumSize, width) / Math.max(1, initial.width);
    const heightScale =
      Math.max(minimumSize, height) / Math.max(1, initial.height);
    const uniformScale =
      Math.abs(widthScale - 1) >= Math.abs(heightScale - 1)
        ? widthScale
        : heightScale;
    width = initial.width * uniformScale;
    height = initial.height * uniformScale;
  } else {
    width = Math.max(minimumSize, width);
    height = Math.max(minimumSize, height);
  }

  if (handle.includes("w")) x = initial.x + initial.width - width;
  if (handle.includes("n")) y = initial.y + initial.height - height;
  return { height, width, x, y };
}

function scaleVectorPaths(paths: VectorPath[], scaleX: number, scaleY: number) {
  const scalePoint = (point: Point) => ({
    x: point.x * scaleX,
    y: point.y * scaleY,
  });
  return paths.map((path) => ({
    ...path,
    points: path.points.map((point) => ({
      ...point,
      ...scalePoint(point),
      handleIn: point.handleIn ? scalePoint(point.handleIn) : undefined,
      handleOut: point.handleOut ? scalePoint(point.handleOut) : undefined,
    })),
  }));
}

function resizeElementWithinSelection(
  element: CanvasElement,
  initialBounds: ElementRect,
  resizedBounds: ElementRect,
) {
  const scaleX = resizedBounds.width / Math.max(1, initialBounds.width);
  const scaleY = resizedBounds.height / Math.max(1, initialBounds.height);
  const resized: CanvasElement = {
    ...element,
    height: Math.max(0.1, element.height * scaleY),
    width: Math.max(0.1, element.width * scaleX),
    x: resizedBounds.x + (element.x - initialBounds.x) * scaleX,
    y: resizedBounds.y + (element.y - initialBounds.y) * scaleY,
  };

  if (element.type === "image" && element.imageCrop) {
    resized.imageCrop = scaleImageCrop(
      imageCropForElement(element),
      scaleX,
      scaleY,
    );
  }

  const paths = vectorPathsForElement(element);
  if (element.type === "pen" && paths.length) {
    const scaledPaths = scaleVectorPaths(paths, scaleX, scaleY);
    Object.assign(resized, vectorPathUpdates(scaledPaths));
    if (element.pathfinder) {
      resized.pathfinder = {
        ...element.pathfinder,
        imageFill: element.pathfinder.imageFill
          ? {
              ...element.pathfinder.imageFill,
              crop: scaleImageCrop(
                element.pathfinder.imageFill.crop,
                scaleX,
                scaleY,
              ),
              height: element.pathfinder.imageFill.height * scaleY,
              width: element.pathfinder.imageFill.width * scaleX,
              x: element.pathfinder.imageFill.x * scaleX,
              y: element.pathfinder.imageFill.y * scaleY,
            }
          : undefined,
        paths: scaledPaths.map((path) => pathData(path.points, path.closed)),
        polygons: element.pathfinder.polygons?.map((polygon) =>
          polygon.map((ring) =>
            ring.map(([x, y]) => [x * scaleX, y * scaleY] as [number, number]),
          ),
        ),
      };
    }
  }

  return resized;
}

function previewMultiElementResize(
  targets: MultiResizePreviewTargets,
  elements: CanvasElement[],
  bounds: ElementRect,
  artboardHeight: number,
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
  });

  if (targets.outline) {
    targets.outline.style.height = `${bounds.height + 6}px`;
    targets.outline.style.left = `${bounds.x - 3}px`;
    targets.outline.style.top = `${bounds.y - 3}px`;
    targets.outline.style.width = `${bounds.width + 6}px`;
  }

  const dimensions = targets.dimensions;
  if (!dimensions) return;
  const placeBelow = bounds.y + bounds.height + 28 <= artboardHeight;
  dimensions.classList.toggle("is-above", !placeBelow);
  dimensions.style.left = `${bounds.x + bounds.width / 2}px`;
  dimensions.style.top = `${placeBelow ? bounds.y + bounds.height + 8 : bounds.y - 8}px`;
  dimensions.textContent = `W ${Math.round(bounds.width)} x H ${Math.round(bounds.height)}`;
}

function previewArtboardPan(currentPan: Point) {
  const artboardNode = document.getElementById("editor-artboard");
  artboardNode?.style.setProperty("--artboard-x", `${currentPan.x}px`);
  artboardNode?.style.setProperty("--artboard-y", `${currentPan.y}px`);
}

function previewDrawDraft(draft: DrawDraft) {
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
}

function previewMarquee(start: Point, current: Point) {
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

function previewSmartGuides(
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

function previewDistanceMeasurements(
  slots: Array<HTMLDivElement | null>,
  measurements: DistanceMeasurement[],
) {
  slots.forEach((node, index) => {
    if (!node) return;
    const measurement = measurements[index];
    node.hidden = !measurement;
    node.className = measurement
      ? `distance-preview-slot distance-measurement ${measurement.axis === "horizontal" ? "is-horizontal" : "is-vertical"}`
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

function createElementId(type: string) {
  return `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function boundsFromPoints(start: Point, current: Point) {
  return {
    x: Math.min(start.x, current.x),
    y: Math.min(start.y, current.y),
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y),
  };
}

function boundsFromPointList(points: Point[]) {
  if (!points.length) return { height: 0, width: 0, x: 0, y: 0 };
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    height: Math.max(...ys) - y,
    width: Math.max(...xs) - x,
    x,
    y,
  };
}

function vectorPathsForElement(element: CanvasElement): VectorPath[] {
  if (element.vectorPaths?.length) return element.vectorPaths;
  return element.points?.length
    ? [{ points: element.points, closed: element.closed }]
    : [];
}

function cloneVectorPaths(paths: VectorPath[]): VectorPath[] {
  return paths.map((path) => ({
    closed: path.closed,
    points: path.points.map((point) => ({
      ...point,
      handleIn: point.handleIn ? { ...point.handleIn } : undefined,
      handleOut: point.handleOut ? { ...point.handleOut } : undefined,
    })),
  }));
}

function clearOrphanedVectorHandles(paths: VectorPath[]): VectorPath[] {
  return paths.map((path) => {
    if (path.points.length !== 1) return path;
    return {
      ...path,
      closed: false,
      points: path.points.map((point) => ({
        ...point,
        handleIn: undefined,
        handleOut: undefined,
      })),
    };
  });
}

function vectorPathUpdates(paths: VectorPath[]): Partial<CanvasElement> {
  const first = paths[0];
  return {
    closed: first?.closed,
    points: first?.points,
    vectorPaths: paths,
  };
}

function vectorPointKey(point: VectorPointRef) {
  return `${point.pathIndex}:${point.nodeIndex}`;
}

function vectorHandleKey(handle: VectorHandleRef) {
  return `${handle.pathIndex}:${handle.nodeIndex}:${handle.handle}`;
}

function imageCropForElement(element: CanvasElement): ImageCrop {
  const crop = element.imageCrop;
  const baseWidth = Math.max(
    8,
    crop?.baseWidth ?? element.width + (crop?.left ?? 0) + (crop?.right ?? 0),
  );
  const baseHeight = Math.max(
    8,
    crop?.baseHeight ?? element.height + (crop?.top ?? 0) + (crop?.bottom ?? 0),
  );
  return {
    baseHeight,
    baseWidth,
    bottom: Math.max(0, crop?.bottom ?? 0),
    left: Math.max(0, crop?.left ?? 0),
    right: Math.max(0, crop?.right ?? 0),
    scaleX: Math.max(0.001, crop?.scaleX ?? 1),
    scaleY: Math.max(0.001, crop?.scaleY ?? 1),
    top: Math.max(0, crop?.top ?? 0),
  };
}

function fittedImageSize(naturalWidth: number, naturalHeight: number) {
  const maxWidth = 280;
  const maxHeight = 200;
  const scale = Math.min(
    maxWidth / Math.max(1, naturalWidth),
    maxHeight / Math.max(1, naturalHeight),
    1,
  );
  return {
    height: Math.max(1, naturalHeight * scale),
    width: Math.max(1, naturalWidth * scale),
  };
}

function scaleImageCrop(
  crop: ImageCrop,
  widthScale: number,
  heightScale: number,
): ImageCrop {
  return {
    ...crop,
    scaleX: (crop.scaleX ?? 1) * widthScale,
    scaleY: (crop.scaleY ?? 1) * heightScale,
  };
}

function vectorVisualGeometryPoints(paths: VectorPath[]) {
  return paths.flatMap((path) => {
    if (!path.points.length) return [];

    const points: Point[] = path.points.map((point) => ({
      x: point.x,
      y: point.y,
    }));
    const segmentCount = path.closed
      ? path.points.length
      : Math.max(0, path.points.length - 1);

    for (let index = 0; index < segmentCount; index += 1) {
      const from = path.points[index];
      const to = path.points[(index + 1) % path.points.length];
      const controlOne = from.handleOut ?? from;
      const controlTwo = to.handleIn ?? to;
      if (!from.handleOut && !to.handleIn) continue;

      for (let sample = 1; sample <= 32; sample += 1) {
        points.push(cubicPoint(from, controlOne, controlTwo, to, sample / 32));
      }
    }

    return points;
  });
}

function pathData(points: PenAnchor[], closed = false) {
  if (!points.length) return "";
  const first = points[0];
  let data = `M ${first.x} ${first.y}`;

  const appendSegment = (from: PenAnchor, to: PenAnchor) => {
    const controlOne = from.handleOut;
    const controlTwo = to.handleIn;
    if (controlOne || controlTwo) {
      const firstControl = controlOne ?? from;
      const secondControl = controlTwo ?? to;
      return ` C ${firstControl.x} ${firstControl.y} ${secondControl.x} ${secondControl.y} ${to.x} ${to.y}`;
    }
    return ` L ${to.x} ${to.y}`;
  };

  for (let index = 1; index < points.length; index += 1) {
    data += appendSegment(points[index - 1], points[index]);
  }
  if (closed && points.length > 1) {
    data += appendSegment(points[points.length - 1], first);
    data += " Z";
  }
  return data;
}

function pathfinderDataForVectorPaths(
  element: CanvasElement,
  paths: VectorPath[],
  originOffset: Point,
): PathfinderData | undefined {
  const pathfinder = element.pathfinder;
  if (!pathfinder) return undefined;

  const ringCounts = pathfinder.polygons?.map((polygon) => polygon.length);
  const preservesPolygonGroups =
    Boolean(ringCounts?.length) &&
    ringCounts!.reduce((total, count) => total + count, 0) === paths.length;
  let pathIndex = 0;
  const polygons = preservesPolygonGroups
    ? ringCounts!.map((ringCount) =>
        Array.from({ length: ringCount }, () => {
          const path = paths[pathIndex++];
          const ring = path.points.map(
            (point) => [point.x, point.y] as [number, number],
          );
          const first = ring[0];
          const last = ring.at(-1);
          if (
            path.closed &&
            first &&
            (!last || first[0] !== last[0] || first[1] !== last[1])
          ) {
            ring.push([first[0], first[1]]);
          }
          return ring;
        }),
      )
    : undefined;

  return {
    ...pathfinder,
    imageFill: pathfinder.imageFill
      ? {
          ...pathfinder.imageFill,
          x: pathfinder.imageFill.x - originOffset.x,
          y: pathfinder.imageFill.y - originOffset.y,
        }
      : undefined,
    paths: paths.map((path) => pathData(path.points, path.closed)),
    polygons,
  };
}

function penHandleLineStyle(from: Point, to: Point): CSSProperties {
  const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  return {
    left: from.x,
    top: from.y,
    transform: `rotate(${angle}deg)`,
    transformOrigin: "0 50%",
    width: Math.hypot(to.x - from.x, to.y - from.y),
  };
}

function interpolatePoint(a: Point, b: Point, amount: number): Point {
  return {
    x: a.x + (b.x - a.x) * amount,
    y: a.y + (b.y - a.y) * amount,
  };
}

function cubicPoint(
  start: Point,
  controlOne: Point,
  controlTwo: Point,
  end: Point,
  amount: number,
) {
  const first = interpolatePoint(start, controlOne, amount);
  const second = interpolatePoint(controlOne, controlTwo, amount);
  const third = interpolatePoint(controlTwo, end, amount);
  return interpolatePoint(
    interpolatePoint(first, second, amount),
    interpolatePoint(second, third, amount),
    amount,
  );
}

function elementLocalPoint(element: CanvasElement, point: Point): Point {
  const center = {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  };
  const radians = (-element.rotation * Math.PI) / 180;
  const translated = { x: point.x - center.x, y: point.y - center.y };
  return {
    x:
      translated.x * Math.cos(radians) -
      translated.y * Math.sin(radians) +
      element.width / 2,
    y:
      translated.x * Math.sin(radians) +
      translated.y * Math.cos(radians) +
      element.height / 2,
  };
}

function elementWorldPoint(element: CanvasElement, point: Point): Point {
  const center = {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  };
  const offset = rotatePoint(
    {
      x: point.x - element.width / 2,
      y: point.y - element.height / 2,
    },
    element.rotation,
  );
  return { x: center.x + offset.x, y: center.y + offset.y };
}

function elementWorldPathPoint(
  element: CanvasElement,
  point: PenAnchor,
): PenAnchor {
  return {
    ...elementWorldPoint(element, point),
    handleIn: point.handleIn
      ? elementWorldPoint(element, point.handleIn)
      : undefined,
    handleOut: point.handleOut
      ? elementWorldPoint(element, point.handleOut)
      : undefined,
  };
}

function constrainAngle(point: Point, origin: Point, step = 45): Point {
  const deltaX = point.x - origin.x;
  const deltaY = point.y - origin.y;
  const distance = Math.hypot(deltaX, deltaY);
  if (!distance) return origin;
  const angle = Math.atan2(deltaY, deltaX);
  const increment = (step * Math.PI) / 180;
  const snappedAngle = Math.round(angle / increment) * increment;
  return {
    x: origin.x + Math.cos(snappedAngle) * distance,
    y: origin.y + Math.sin(snappedAngle) * distance,
  };
}

type PathInsertion = {
  distance: number;
  pathIndex: number;
  segmentIndex: number;
  t: number;
};

function nearestVectorPathPosition(
  paths: VectorPath[],
  point: Point,
): PathInsertion | null {
  let nearest: PathInsertion | null = null;
  paths.forEach((path, pathIndex) => {
    if (path.points.length < 2) return;
    const segmentCount = path.closed
      ? path.points.length
      : path.points.length - 1;
    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
      const start = path.points[segmentIndex];
      const end = path.points[(segmentIndex + 1) % path.points.length];
      const controlOne = start.handleOut ?? start;
      const controlTwo = end.handleIn ?? end;
      const curved = Boolean(start.handleOut || end.handleIn);
      const samples = curved ? 32 : 1;
      let previous = { x: start.x, y: start.y };
      for (let sample = 1; sample <= samples; sample += 1) {
        const t = sample / samples;
        const current = curved
          ? cubicPoint(start, controlOne, controlTwo, end, t)
          : {
              x: start.x + (end.x - start.x) * t,
              y: start.y + (end.y - start.y) * t,
            };
        const segmentX = current.x - previous.x;
        const segmentY = current.y - previous.y;
        const lengthSquared = segmentX * segmentX + segmentY * segmentY;
        const amount = lengthSquared
          ? Math.max(
              0,
              Math.min(
                1,
                ((point.x - previous.x) * segmentX +
                  (point.y - previous.y) * segmentY) /
                  lengthSquared,
              ),
            )
          : 0;
        const closest = {
          x: previous.x + segmentX * amount,
          y: previous.y + segmentY * amount,
        };
        const distance = Math.hypot(point.x - closest.x, point.y - closest.y);
        if (!nearest || distance < nearest.distance) {
          nearest = {
            distance,
            pathIndex,
            segmentIndex,
            t: (sample - 1 + amount) / samples,
          };
        }
        previous = current;
      }
    }
  });
  return nearest;
}

function splitVectorSegment(
  path: VectorPath,
  segmentIndex: number,
  amount: number,
): VectorPath {
  const points: PathPoint[] = path.points.map((point) => ({
    ...point,
    handleIn: point.handleIn ? { ...point.handleIn } : undefined,
    handleOut: point.handleOut ? { ...point.handleOut } : undefined,
  }));
  const nextIndex = (segmentIndex + 1) % points.length;
  const start = points[segmentIndex];
  const end = points[nextIndex];
  const curved = Boolean(start.handleOut || end.handleIn);
  if (!curved) {
    const inserted = interpolatePoint(start, end, amount);
    if (nextIndex === 0 && path.closed) points.push(inserted);
    else points.splice(segmentIndex + 1, 0, inserted);
    return { ...path, points };
  }

  const controlOne = start.handleOut ?? start;
  const controlTwo = end.handleIn ?? end;
  const first = interpolatePoint(start, controlOne, amount);
  const second = interpolatePoint(controlOne, controlTwo, amount);
  const third = interpolatePoint(controlTwo, end, amount);
  const left = interpolatePoint(first, second, amount);
  const right = interpolatePoint(second, third, amount);
  const middle = interpolatePoint(left, right, amount);
  const updatedStart = { ...start, handleOut: first };
  const updatedEnd = { ...end, handleIn: third };
  const inserted: PathPoint = {
    x: middle.x,
    y: middle.y,
    handleIn: left,
    handleOut: right,
  };
  points[segmentIndex] = updatedStart;
  points[nextIndex] = updatedEnd;
  if (nextIndex === 0 && path.closed) points.push(inserted);
  else points.splice(segmentIndex + 1, 0, inserted);
  return { ...path, points };
}

function rotatePoint(point: Point, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: point.x * Math.cos(radians) - point.y * Math.sin(radians),
    y: point.x * Math.sin(radians) + point.y * Math.cos(radians),
  };
}

function vectorElementGeometryUpdate(
  element: CanvasElement,
  paths: VectorPath[],
): Partial<CanvasElement> {
  const bounds = boundsFromPointList(vectorVisualGeometryPoints(paths));
  const width = Math.max(8, bounds.width);
  const height = Math.max(8, bounds.height);
  const normalizedPaths = paths.map((path) => ({
    ...path,
    points: path.points.map((point) => ({
      ...point,
      x: point.x - bounds.x,
      y: point.y - bounds.y,
      handleIn: point.handleIn
        ? { x: point.handleIn.x - bounds.x, y: point.handleIn.y - bounds.y }
        : undefined,
      handleOut: point.handleOut
        ? { x: point.handleOut.x - bounds.x, y: point.handleOut.y - bounds.y }
        : undefined,
    })),
  }));
  const oldCenter = {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  };
  const centerOffset = rotatePoint(
    {
      x: bounds.x + width / 2 - element.width / 2,
      y: bounds.y + height / 2 - element.height / 2,
    },
    element.rotation,
  );
  const nextCenter = {
    x: oldCenter.x + centerOffset.x,
    y: oldCenter.y + centerOffset.y,
  };
  return {
    ...vectorPathUpdates(normalizedPaths),
    height,
    pathfinder: pathfinderDataForVectorPaths(element, normalizedPaths, bounds),
    width,
    x: Math.round(nextCenter.x - width / 2),
    y: Math.round(nextCenter.y - height / 2),
  };
}

function mirroredHandle(
  anchor: Point,
  nextHandle: Point,
  oppositeHandle: Point | undefined,
  mode: HandleMirroring,
) {
  if (mode === "none") return oppositeHandle;
  if (mode === "angle-length" || !oppositeHandle) {
    return {
      x: anchor.x * 2 - nextHandle.x,
      y: anchor.y * 2 - nextHandle.y,
    };
  }
  const nextVector = {
    x: nextHandle.x - anchor.x,
    y: nextHandle.y - anchor.y,
  };
  const length = Math.hypot(nextVector.x, nextVector.y);
  const oppositeLength = Math.hypot(
    oppositeHandle.x - anchor.x,
    oppositeHandle.y - anchor.y,
  );
  if (!length) return oppositeHandle;
  return {
    x: anchor.x - (nextVector.x / length) * oppositeLength,
    y: anchor.y - (nextVector.y / length) * oppositeLength,
  };
}

function rectFromElement(element: CanvasElement): ElementRect {
  return {
    id: element.id,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };
}

function boundsFromElements(elements: CanvasElement[]): ElementRect | null {
  if (!elements.length) return null;
  const rects = elements.map(rectFromElement);
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function visualFlipTransform(element: CanvasElement) {
  return `scale(${element.flipX ? -1 : 1}, ${element.flipY ? -1 : 1})`;
}

type CornerPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

function sourceCornerIndexForVisualPosition(
  position: CornerPosition,
  element: CanvasElement,
) {
  let row = position.startsWith("bottom") ? 1 : 0;
  let column = position.endsWith("right") ? 1 : 0;
  if (element.flipX) column = 1 - column;
  if (element.flipY) row = 1 - row;
  return [
    [0, 1],
    [3, 2],
  ][row][column];
}

function colorWithOpacity(color: string, opacity = 100) {
  const amount = clamp(opacity, 0, 100);
  if (amount === 100 || color === "transparent") return color;
  const hex = color.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  if (hex) {
    return `rgb(${Number.parseInt(hex[1], 16)} ${Number.parseInt(hex[2], 16)} ${Number.parseInt(hex[3], 16)} / ${amount}%)`;
  }
  return `color-mix(in srgb, ${color} ${amount}%, transparent)`;
}

function colorInputValue(color: string) {
  const longHex = color.match(/^#[\da-f]{6}$/i);
  if (longHex) return color;
  const shortHex = color.match(/^#([\da-f])([\da-f])([\da-f])$/i);
  if (shortHex) {
    return `#${shortHex[1]}${shortHex[1]}${shortHex[2]}${shortHex[2]}${shortHex[3]}${shortHex[3]}`;
  }
  const rgb = color.match(
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*[\d.]+%?)?\s*\)$/i,
  );
  if (!rgb) return "#ffffff";
  return `#${rgb
    .slice(1, 4)
    .map((channel) =>
      Math.round(clamp(Number(channel), 0, 255))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function gradientStopsForArtboard(artboard: ArtboardSettings) {
  if (artboard.gradientStops?.length) {
    return [...artboard.gradientStops].sort(
      (left, right) => left.position - right.position,
    );
  }
  return [
    {
      color: artboard.gradientStartColor ?? "#d9d9d9",
      opacity: artboard.gradientStartOpacity ?? 100,
      position: 0,
    },
    {
      color: artboard.gradientEndColor ?? "#737373",
      opacity: artboard.gradientEndOpacity ?? 100,
      position: 100,
    },
  ];
}

function gradientCssFromStops(
  artboard: ArtboardSettings,
  gradientStops: ReturnType<typeof gradientStopsForArtboard>,
) {
  const normalizedStops = gradientStops.map((stop) => ({
    ...stop,
    position: clamp(stop.position, 0, 100),
  }));
  const stops = normalizedStops
    .map(
      (stop) =>
        `${colorWithOpacity(stop.color, stop.opacity)} ${stop.position}%`,
    )
    .join(", ");
  const type = artboard.gradientType ?? "linear";
  const angle = artboard.gradientAngle ?? 0;

  if (type === "radial") {
    return `radial-gradient(circle at center, ${stops})`;
  }
  if (type === "conic") {
    return `conic-gradient(from ${angle}deg at center, ${stops})`;
  }
  if (type === "rectangular") {
    return `radial-gradient(closest-side at center, ${stops})`;
  }
  if (type === "freeform") {
    const layers = normalizedStops
      .map((stop, index) => {
        const y = clamp(
          50 + Math.sin(((stop.position + index * 31) * Math.PI) / 100) * 32,
          12,
          88,
        );
        return `radial-gradient(circle at ${stop.position}% ${Math.round(y)}%, ${colorWithOpacity(stop.color, stop.opacity)} 0%, transparent 55%)`;
      })
      .reverse();
    return layers.join(", ");
  }
  return `linear-gradient(${90 + angle}deg, ${stops})`;
}

function gradientCssForArtboard(artboard: ArtboardSettings) {
  return gradientCssFromStops(artboard, gradientStopsForArtboard(artboard));
}

function mediaObjectFit(artboard: ArtboardSettings) {
  const fit = artboard.backgroundImageFit ?? "cover";
  if (fit === "stretch" || fit === "fill") return "fill";
  if (fit === "original") return "none";
  return fit;
}

function mediaBackgroundSize(artboard: ArtboardSettings) {
  const fit = artboard.backgroundImageFit ?? "cover";
  if (fit === "stretch" || fit === "fill") return "100% 100%";
  if (fit === "original") return "auto";
  return fit;
}

function hasSolidBackground(artboard: ArtboardSettings) {
  return (
    artboard.backgroundSolidEnabled ??
    (artboard.backgroundType ?? "solid") === "solid"
  );
}

function hasGradientBackground(artboard: ArtboardSettings) {
  return (
    artboard.backgroundGradientEnabled ??
    artboard.backgroundType === "gradation"
  );
}

function backgroundMediaType(artboard: ArtboardSettings) {
  return (
    artboard.backgroundMediaType ??
    (artboard.backgroundType === "image" || artboard.backgroundType === "video"
      ? artboard.backgroundType
      : undefined)
  );
}

function backgroundMediaStyle(artboard: ArtboardSettings) {
  return {
    backgroundImage: artboard.backgroundImage
      ? `url(${artboard.backgroundImage})`
      : undefined,
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: mediaBackgroundSize(artboard),
    opacity: (artboard.backgroundImageOpacity ?? 100) / 100,
  };
}

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

function strokeDasharrayForElement(element: CanvasElement, renderScale = 1) {
  const width = Math.max(renderScale, element.strokeWidth * renderScale);
  if (element.strokeStyle === "dashed") return `${width * 4} ${width * 3}`;
  if (element.strokeStyle === "dotted") return `${width} ${width * 2}`;
  return undefined;
}

function regularPolygonPoints(count: number, innerRatio?: number) {
  const points: Point[] = [];
  const total = innerRatio ? count * 2 : count;
  for (let index = 0; index < total; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / total;
    const radius = innerRatio && index % 2 ? 50 * innerRatio : 49;
    points.push({
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
    });
  }
  return points;
}

function polygonPointsForElement(element: CanvasElement) {
  if (element.type === "triangle") {
    return (element.polygonPoints ?? 3) === 3
      ? [
          { x: 50, y: 1 },
          { x: 99, y: 99 },
          { x: 1, y: 99 },
        ]
      : regularPolygonPoints(clamp(element.polygonPoints ?? 3, 3, 12));
  }
  if (element.type === "star") {
    const pointCount = clamp(element.polygonPoints ?? 5, 3, 12);
    return pointCount === 5
      ? [
          { x: 50, y: 0 },
          { x: 61, y: 38 },
          { x: 100, y: 38 },
          { x: 69, y: 60 },
          { x: 80, y: 100 },
          { x: 50, y: 76 },
          { x: 20, y: 100 },
          { x: 31, y: 60 },
          { x: 0, y: 38 },
          { x: 39, y: 38 },
        ]
      : regularPolygonPoints(pointCount, 0.4);
  }
  return [];
}

function polygonPointString(points: Point[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function roundedPolygonCorners(
  points: Point[],
  radius: number | readonly number[],
) {
  return points.map((point, index) => {
    const amount = Math.max(
      0,
      typeof radius === "number" ? radius : (radius[index] ?? 0),
    );
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const previousLength = Math.hypot(
      point.x - previous.x,
      point.y - previous.y,
    );
    const nextLength = Math.hypot(next.x - point.x, next.y - point.y);
    const distance = Math.min(amount, previousLength / 2, nextLength / 2);
    return {
      end: interpolatePoint(point, next, distance / Math.max(1, nextLength)),
      point,
      start: interpolatePoint(
        point,
        previous,
        distance / Math.max(1, previousLength),
      ),
    };
  });
}

function roundedPolygonPath(
  points: Point[],
  radius: number | readonly number[],
) {
  if (!points.length) return "";
  const corners = roundedPolygonCorners(points, radius);
  let data = `M ${corners[0].start.x} ${corners[0].start.y}`;
  corners.forEach((corner, index) => {
    data += ` Q ${corner.point.x} ${corner.point.y} ${corner.end.x} ${corner.end.y}`;
    const nextCorner = corners[(index + 1) % corners.length];
    data += ` L ${nextCorner.start.x} ${nextCorner.start.y}`;
  });
  return `${data} Z`;
}

function roundedPolygonSamples(
  points: Point[],
  radius: number | readonly number[],
) {
  const hasRoundedCorner =
    typeof radius === "number"
      ? radius > 0
      : radius.some((cornerRadius) => cornerRadius > 0);
  if (!points.length || !hasRoundedCorner) return points;
  const corners = roundedPolygonCorners(points, radius);
  const samples: Point[] = [];
  corners.forEach((corner, index) => {
    samples.push(corner.start);
    for (let sample = 1; sample <= 8; sample += 1) {
      const amount = sample / 8;
      const inverse = 1 - amount;
      samples.push({
        x:
          inverse * inverse * corner.start.x +
          2 * inverse * amount * corner.point.x +
          amount * amount * corner.end.x,
        y:
          inverse * inverse * corner.start.y +
          2 * inverse * amount * corner.point.y +
          amount * amount * corner.end.y,
      });
    }
    samples.push(corners[(index + 1) % corners.length].start);
  });
  return samples;
}

function polygonCornerIndicatorPaths(
  points: Point[],
  radii: readonly number[],
) {
  const corners = roundedPolygonCorners(points, radii);
  return corners.map((corner, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const previousLength = Math.hypot(
      corner.point.x - previous.x,
      corner.point.y - previous.y,
    );
    const nextLength = Math.hypot(
      next.x - corner.point.x,
      next.y - corner.point.y,
    );
    const visibleLength = 20;
    const startDistance = Math.hypot(
      corner.start.x - corner.point.x,
      corner.start.y - corner.point.y,
    );
    const endDistance = Math.hypot(
      corner.end.x - corner.point.x,
      corner.end.y - corner.point.y,
    );
    const visibleStart = interpolatePoint(
      corner.point,
      previous,
      Math.min(Math.max(visibleLength, startDistance), previousLength / 2) /
        Math.max(1, previousLength),
    );
    const visibleEnd = interpolatePoint(
      corner.point,
      next,
      Math.min(Math.max(visibleLength, endDistance), nextLength / 2) /
        Math.max(1, nextLength),
    );
    return `M ${visibleStart.x} ${visibleStart.y} L ${corner.start.x} ${corner.start.y} Q ${corner.point.x} ${corner.point.y} ${corner.end.x} ${corner.end.y} L ${visibleEnd.x} ${visibleEnd.y}`;
  });
}

function polygonCornerRadiusValues(element: CanvasElement, points: Point[]) {
  return points.map(
    (_, index) => element.polygonCornerRadii?.[index] ?? element.cornerRadius,
  );
}

function polygonCornerRadii(element: CanvasElement, points: Point[]) {
  const radii = polygonCornerRadiusValues(element, points);
  const scale = 100 / Math.max(1, Math.min(element.width, element.height));
  return radii.map((radius) => radius * scale);
}

function roundedRectanglePoints(element: CanvasElement) {
  const radii = (
    element.cornerRadii ?? [
      element.cornerRadius,
      element.cornerRadius,
      element.cornerRadius,
      element.cornerRadius,
    ]
  ).map((radius) =>
    clamp(radius, 0, Math.min(element.width / 2, element.height / 2)),
  );
  if (radii.every((radius) => radius === 0)) {
    return [
      { x: 0, y: 0 },
      { x: element.width, y: 0 },
      { x: element.width, y: element.height },
      { x: 0, y: element.height },
    ];
  }
  const centers = [
    { x: radii[0], y: radii[0], start: -Math.PI, end: -Math.PI / 2 },
    {
      x: element.width - radii[1],
      y: radii[1],
      start: -Math.PI / 2,
      end: 0,
    },
    {
      x: element.width - radii[2],
      y: element.height - radii[2],
      start: 0,
      end: Math.PI / 2,
    },
    {
      x: radii[3],
      y: element.height - radii[3],
      start: Math.PI / 2,
      end: Math.PI,
    },
  ];
  return centers.flatMap((center, cornerIndex) =>
    Array.from({ length: 9 }, (_, sample) => {
      const angle = center.start + ((center.end - center.start) * sample) / 8;
      const radius = radii[cornerIndex];
      return {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
      };
    }),
  );
}

function sampledVectorPaths(element: CanvasElement): Point[][] {
  return vectorPathsForElement(element).map((path) => {
    if (!path.points.length) return [];
    const sampled: Point[] = [{ x: path.points[0].x, y: path.points[0].y }];
    const segmentCount = path.closed
      ? path.points.length
      : Math.max(0, path.points.length - 1);
    for (let index = 0; index < segmentCount; index += 1) {
      const from = path.points[index];
      const to = path.points[(index + 1) % path.points.length];
      const curved = Boolean(from.handleOut || to.handleIn);
      const samples = curved ? 24 : 1;
      for (let sample = 1; sample <= samples; sample += 1) {
        sampled.push(
          curved
            ? cubicPoint(
                from,
                from.handleOut ?? from,
                to.handleIn ?? to,
                to,
                sample / samples,
              )
            : { x: to.x, y: to.y },
        );
      }
    }
    return sampled;
  });
}

function outlinePathsForElement(element: CanvasElement): Point[][] {
  if (element.type === "circle") {
    return [
      Array.from({ length: 48 }, (_, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / 48;
        return {
          x: element.width / 2 + Math.cos(angle) * (element.width / 2),
          y: element.height / 2 + Math.sin(angle) * (element.height / 2),
        };
      }),
    ];
  }
  if (element.type === "triangle" || element.type === "star") {
    const polygonPoints = polygonPointsForElement(element);
    const points = roundedPolygonSamples(
      polygonPoints,
      polygonCornerRadii(element, polygonPoints),
    );
    return [
      points.map((point) => ({
        x: (point.x / 100) * element.width,
        y: (point.y / 100) * element.height,
      })),
    ];
  }
  if (element.type === "pen") return sampledVectorPaths(element);
  if (element.type === "line") {
    return [
      [
        { x: 0, y: element.height / 2 },
        { x: element.width, y: element.height / 2 },
      ],
    ];
  }
  return [[...roundedRectanglePoints(element)]];
}

function worldPointForDesign(element: CanvasElement, point: Point): Point {
  const origin = {
    x: element.width / 2,
    y: element.height / 2,
  };
  const flipped = {
    x: element.flipX ? element.width - point.x : point.x,
    y: element.flipY ? element.height - point.y : point.y,
  };
  const rotated = rotatePoint(
    { x: flipped.x - origin.x, y: flipped.y - origin.y },
    element.rotation,
  );
  return {
    x: element.x + origin.x + rotated.x,
    y: element.y + origin.y + rotated.y,
  };
}

function closedClippingRing(points: Point[]): Ring {
  const ring = points.map(({ x, y }) => [x, y] as [number, number]);
  const first = ring[0];
  const last = ring.at(-1);
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    ring.push([...first]);
  }
  return ring;
}

function unionGeometries(geometries: MultiPolygon[]) {
  const first = geometries[0];
  if (!first) return [];
  return geometries.length === 1
    ? first
    : polygonClipping.union(first, ...geometries.slice(1));
}

function intersectGeometries(geometries: MultiPolygon[]) {
  const first = geometries[0];
  if (!first) return [];
  return geometries.length === 1
    ? first
    : polygonClipping.intersection(first, ...geometries.slice(1));
}

function subtractGeometries(subject: MultiPolygon, cutters: MultiPolygon[]) {
  return cutters.length
    ? polygonClipping.difference(subject, ...cutters)
    : subject;
}

function clippingGeometryForElement(element: CanvasElement): MultiPolygon {
  if (element.pathfinder?.polygons?.length) {
    return element.pathfinder.polygons.map((polygon) =>
      polygon.map((ring) =>
        ring.map(([x, y]) => {
          const point = worldPointForDesign(element, { x, y });
          return [point.x, point.y] as [number, number];
        }),
      ),
    );
  }
  const geometry: MultiPolygon = outlinePathsForElement(element)
    .filter((path) => path.length >= 3)
    .map((path) => [
      closedClippingRing(
        path.map((point) => worldPointForDesign(element, point)),
      ),
    ]);
  return unionGeometries(geometry.map((polygon) => [polygon]));
}

function clippingBounds(geometry: MultiPolygon) {
  const points = geometry
    .flatMap((polygon) => polygon.flatMap((ring) => ring))
    .map(([x, y]) => ({ x, y }));
  return points.length ? boundsFromPointList(points) : null;
}

function ringWithoutClosingPoint(ring: Ring) {
  const first = ring[0];
  const last = ring.at(-1);
  return first && last && first[0] === last[0] && first[1] === last[1]
    ? ring.slice(0, -1)
    : ring;
}

function pathfinderPiece(
  source: CanvasElement,
  geometry: MultiPolygon,
  operation: PathfinderOperation,
  name: string,
  removeStroke = false,
  imageFillSource?: CanvasElement,
): CanvasElement | null {
  const bounds = clippingBounds(geometry);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;
  const polygons = geometry.map((polygon) =>
    polygon.map((ring) =>
      ring.map(
        ([x, y]) =>
          [
            Number((x - bounds.x).toFixed(3)),
            Number((y - bounds.y).toFixed(3)),
          ] as [number, number],
      ),
    ),
  );
  const paths = polygons.flatMap((polygon) =>
    polygon.map((ring) =>
      pathData(
        ringWithoutClosingPoint(ring).map(([x, y]) => ({ x, y })),
        true,
      ),
    ),
  );
  const vectorPaths = polygons.flatMap((polygon) =>
    polygon.map((ring) => ({
      closed: true,
      points: ringWithoutClosingPoint(ring).map(([x, y]) => ({ x, y })),
    })),
  );
  const imageSource = imageFillSource ?? source;
  const existingImageFill = imageSource.pathfinder?.imageFill;
  const imageFill = existingImageFill
    ? {
        ...existingImageFill,
        x: imageSource.x + existingImageFill.x - bounds.x,
        y: imageSource.y + existingImageFill.y - bounds.y,
      }
    : imageSource.type === "image" && imageSource.src
      ? {
          crop: imageCropForElement(imageSource),
          flipX: Boolean(imageSource.flipX),
          flipY: Boolean(imageSource.flipY),
          height: imageSource.height,
          rotation: imageSource.rotation,
          src: imageSource.src,
          transformOrigin: 4,
          width: imageSource.width,
          x: imageSource.x - bounds.x,
          y: imageSource.y - bounds.y,
        }
      : undefined;
  return {
    ...source,
    id: createElementId("path"),
    name,
    type: "pen" as const,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    rotation: 0,
    flipX: false,
    flipY: false,
    transformOrigin: source.transformOrigin ?? 4,
    points: undefined,
    vectorPaths,
    stroke: removeStroke ? "transparent" : source.stroke,
    strokeWidth: removeStroke ? 0 : source.strokeWidth,
    pathfinder: { imageFill, operation, paths, polygons },
  };
}

function pathfinderElement(
  elements: CanvasElement[],
  operation: PathfinderOperation,
): CanvasElement | null {
  const entries = elements
    .map((source) => ({
      geometry: clippingGeometryForElement(source),
      source,
    }))
    .filter((entry) => entry.geometry.length);
  const first = entries[0];
  const front = entries.at(-1);
  if (!first || !front || entries.length < 2) return null;
  const geometries = entries.map((entry) => entry.geometry);
  const imageFillSource = entries.findLast(({ source }) =>
    Boolean(
      (source.type === "image" && source.src) || source.pathfinder?.imageFill,
    ),
  )?.source;
  const geometry =
    operation === "subtract"
      ? subtractGeometries(front.geometry, geometries.slice(0, -1))
      : operation === "intersect"
        ? intersectGeometries(geometries)
        : operation === "exclude"
          ? polygonClipping.xor(geometries[0], ...geometries.slice(1))
          : unionGeometries(geometries);
  const source = front.source;
  return pathfinderPiece(
    source,
    geometry,
    operation,
    `${source.name} ${operation}`,
    false,
    imageFillSource,
  );
}

function splitPolygons(geometry: MultiPolygon) {
  return geometry.map((polygon) => [polygon] as MultiPolygon);
}

function splitPathfinderElements(
  elements: CanvasElement[],
  operation: "divide" | "trim",
) {
  const entries = elements
    .map((source) => ({
      geometry: clippingGeometryForElement(source),
      source,
    }))
    .filter((entry) => entry.geometry.length);
  const first = entries[0];
  if (!first || entries.length < 2) return [];
  const imageFillSource = entries.findLast(({ source }) =>
    Boolean(
      (source.type === "image" && source.src) || source.pathfinder?.imageFill,
    ),
  )?.source;

  if (operation === "trim") {
    const pieces: CanvasElement[] = [];
    entries.forEach((entry, index) => {
      const geometry = subtractGeometries(
        entry.geometry,
        entries.slice(index + 1).map((item) => item.geometry),
      );
      splitPolygons(geometry).forEach((polygon) => {
        const piece = pathfinderPiece(
          entry.source,
          polygon,
          "trim",
          `${entry.source.name} Trim ${pieces.length + 1}`,
          true,
          imageFillSource,
        );
        if (piece) pieces.push(piece);
      });
    });
    return pieces;
  }

  let regions = splitPolygons(first.geometry).map((geometry) => ({
    geometry,
    source: first.source,
  }));
  let covered = first.geometry;
  entries.slice(1).forEach((entry) => {
    const nextRegions: typeof regions = [];
    regions.forEach((region) => {
      splitPolygons(
        subtractGeometries(region.geometry, [entry.geometry]),
      ).forEach((geometry) => nextRegions.push({ ...region, geometry }));
      splitPolygons(
        intersectGeometries([region.geometry, entry.geometry]),
      ).forEach((geometry) =>
        nextRegions.push({ geometry, source: entry.source }),
      );
    });
    splitPolygons(subtractGeometries(entry.geometry, [covered])).forEach(
      (geometry) => nextRegions.push({ geometry, source: entry.source }),
    );
    covered = unionGeometries([covered, entry.geometry]);
    regions = nextRegions;
  });

  const pieces: CanvasElement[] = [];
  regions.forEach((region) => {
    const piece = pathfinderPiece(
      region.source,
      region.geometry,
      "divide",
      `${region.source.name} Divide ${pieces.length + 1}`,
      false,
      imageFillSource,
    );
    if (piece) pieces.push(piece);
  });
  return pieces;
}

function offsetRect(rect: ElementRect, delta: Point): ElementRect {
  return { ...rect, x: rect.x + delta.x, y: rect.y + delta.y };
}

function centerOf(rect: ElementRect, axis: "x" | "y") {
  return axis === "x" ? rect.x + rect.width / 2 : rect.y + rect.height / 2;
}

const rulerSize = 24;

function rulerMajorInterval(scale: number) {
  const targetUnits = 80 / Math.max(0.08, scale);
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(0.0001, targetUnits)));
  const normalized = targetUnits / magnitude;
  const step =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function prepareRulerCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
) {
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const pixelWidth = Math.max(1, Math.round(width * ratio));
  const pixelHeight = Math.max(1, Math.round(height * ratio));
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = "rgba(255, 255, 255, 0.97)";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#8c8c8c";
  context.fillStyle = "#666666";
  context.lineWidth = 1;
  context.font = '9px Inter, "Segoe UI", Arial, sans-serif';
  return context;
}

function drawRuler(
  context: CanvasRenderingContext2D,
  orientation: "horizontal" | "vertical",
  width: number,
  height: number,
  origin: number,
  scale: number,
  ranges: RulerRange[],
) {
  const major = rulerMajorInterval(scale);
  const minor = major / 10;
  const span = orientation === "horizontal" ? width : height;
  const worldStart = (0 - origin) / scale;
  const worldEnd = (span - origin) / scale;
  const first = Math.floor(worldStart / minor) * minor;

  context.save();
  context.beginPath();
  context.rect(0, 0, width, height);
  context.clip();
  context.fillStyle = "rgba(171, 81, 240, 0.14)";
  for (const range of ranges) {
    const start = Math.max(0, range.start);
    const end = Math.min(span, range.end);
    if (end <= start) continue;
    if (orientation === "horizontal") {
      context.fillRect(start, 0, end - start, height);
      context.fillStyle = "#ab51f0";
      context.fillRect(start, height - 2, end - start, 2);
      context.fillStyle = "rgba(171, 81, 240, 0.14)";
    } else {
      context.fillRect(0, start, width, end - start);
      context.fillStyle = "#ab51f0";
      context.fillRect(width - 2, start, 2, end - start);
      context.fillStyle = "rgba(171, 81, 240, 0.14)";
    }
  }

  context.strokeStyle = "#8c8c8c";
  context.fillStyle = "#666666";
  context.textBaseline = "top";
  for (let value = first; value <= worldEnd + minor; value += minor) {
    const position = origin + value * scale;
    const isMajor =
      Math.abs(value / major - Math.round(value / major)) < 0.0001;
    const roundedPosition = Math.round(position) + 0.5;
    context.beginPath();
    if (orientation === "horizontal") {
      context.moveTo(roundedPosition, isMajor ? 12 : 18);
      context.lineTo(roundedPosition, height);
    } else {
      context.moveTo(isMajor ? 12 : 18, roundedPosition);
      context.lineTo(width, roundedPosition);
    }
    context.stroke();

    if (isMajor) {
      const label = Math.abs(value) < 0.0001 ? "0" : String(Math.round(value));
      if (orientation === "horizontal") {
        context.fillText(label, Math.round(position) + 3, 1);
      } else {
        context.save();
        context.translate(13, Math.round(position) - 3);
        context.rotate(-Math.PI / 2);
        context.fillText(label, 0, 0);
        context.restore();
      }
    }
  }
  context.restore();
}

function chooseSnapOption(options: SnapOption[], threshold = 8) {
  return options
    .filter((option) => Math.abs(option.adjust) <= threshold)
    .sort((a, b) => Math.abs(a.adjust) - Math.abs(b.adjust))[0];
}

function alignmentOptions(
  axis: "x" | "y",
  proposed: ElementRect,
  fixed: ElementRect[],
  artboard: { width: number; height: number },
): SnapOption[] {
  const isX = axis === "x";
  const size = isX ? proposed.width : proposed.height;
  const start = isX ? proposed.x : proposed.y;
  const anchors = [start, start + size / 2, start + size];
  const boardSize = isX ? artboard.width : artboard.height;
  const boardRect: ElementRect = {
    x: 0,
    y: 0,
    width: artboard.width,
    height: artboard.height,
  };
  const targets = [0, boardSize / 2, boardSize].map((value) => ({
    rect: boardRect,
    value,
  }));
  for (const rect of fixed) {
    const rectStart = isX ? rect.x : rect.y;
    const rectSize = isX ? rect.width : rect.height;
    targets.push(
      { rect, value: rectStart },
      { rect, value: rectStart + rectSize / 2 },
      { rect, value: rectStart + rectSize },
    );
  }

  return targets.flatMap(({ rect, value: target }) =>
    anchors.map((source, index) => {
      const guide: SmartGuide = isX
        ? {
            axis: "vertical",
            coordinate: target,
            end:
              rect === boardRect
                ? artboard.height
                : Math.max(proposed.y + proposed.height, rect.y + rect.height) +
                  12,
            start: rect === boardRect ? 0 : Math.min(proposed.y, rect.y) - 12,
            anchor: rect === boardRect ? undefined : rect,
          }
        : {
            axis: "horizontal",
            coordinate: target,
            end:
              rect === boardRect
                ? artboard.width
                : Math.max(proposed.x + proposed.width, rect.x + rect.width) +
                  12,
            start: rect === boardRect ? 0 : Math.min(proposed.x, rect.x) - 12,
            anchor: rect === boardRect ? undefined : rect,
          };
      return {
        adjust: target - source,
        guide,
        sourceIndex: index,
      };
    }),
  );
}

function rebaseGuide(guide: SmartGuide, subject: ElementRect): SmartGuide {
  if (!guide.anchor) return guide;
  if (guide.axis === "vertical") {
    return {
      ...guide,
      end:
        Math.max(
          subject.y + subject.height,
          guide.anchor.y + guide.anchor.height,
        ) + 12,
      start: Math.min(subject.y, guide.anchor.y) - 12,
    };
  }
  return {
    ...guide,
    end:
      Math.max(subject.x + subject.width, guide.anchor.x + guide.anchor.width) +
      12,
    start: Math.min(subject.x, guide.anchor.x) - 12,
  };
}

function spacingOptions(
  axis: "x" | "y",
  proposed: ElementRect,
  fixed: ElementRect[],
): SnapOption[] {
  if (fixed.length < 2) return [];
  const isX = axis === "x";
  const aligned = fixed
    .filter((rect) =>
      isX
        ? Math.abs(centerOf(rect, "y") - centerOf(proposed, "y")) <= 8
        : Math.abs(centerOf(rect, "x") - centerOf(proposed, "x")) <= 8,
    )
    .sort((a, b) => (isX ? a.x - b.x : a.y - b.y));
  const options: SnapOption[] = [];

  for (let index = 0; index < aligned.length - 1; index += 1) {
    const first = aligned[index];
    const second = aligned[index + 1];
    const firstEnd = isX ? first.x + first.width : first.y + first.height;
    const secondStart = isX ? second.x : second.y;
    const gap = secondStart - firstEnd;
    if (gap < 0) continue;
    const size = isX ? proposed.width : proposed.height;
    const between = firstEnd + (gap - size) / 2;
    const before = (isX ? first.x : first.y) - gap - size;
    const after =
      (isX ? second.x + second.width : second.y + second.height) + gap;
    const positions = [before, ...(gap >= size ? [between] : []), after];
    for (const position of positions) {
      const guide: SmartGuide = isX
        ? {
            axis: "horizontal",
            coordinate: centerOf(proposed, "y"),
            end: second.x + second.width,
            start: first.x,
          }
        : {
            axis: "vertical",
            coordinate: centerOf(proposed, "x"),
            end: second.y + second.height,
            start: first.y,
          };
      options.push({
        adjust: position - (isX ? proposed.x : proposed.y),
        guide,
        spacingPair: [first, second],
      });
    }
  }
  return options;
}

function buildSpacingMeasurements(
  axis: "x" | "y",
  rects: ElementRect[],
): DistanceMeasurement[] {
  if (rects.length < 2) return [];
  const isX = axis === "x";
  const sorted = [...rects].sort((a, b) => (isX ? a.x - b.x : a.y - b.y));
  const cross =
    sorted.reduce((total, rect) => total + centerOf(rect, isX ? "y" : "x"), 0) /
    sorted.length;
  const measurements: DistanceMeasurement[] = [];

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const first = sorted[index];
    const second = sorted[index + 1];
    const firstEnd = isX ? first.x + first.width : first.y + first.height;
    const secondStart = isX ? second.x : second.y;
    pushDistance(
      measurements,
      isX ? "horizontal" : "vertical",
      firstEnd,
      secondStart,
      cross,
    );
  }

  return measurements;
}

function buildSmartSnap(
  selectionBounds: ElementRect | null,
  fixedRects: ElementRect[],
  rawDelta: Point,
  artboard: { width: number; height: number },
  enableSpacing: boolean,
) {
  if (!selectionBounds) {
    return {
      delta: rawDelta,
      guides: [] as SmartGuide[],
      spacingMeasurements: [] as DistanceMeasurement[],
    };
  }
  const proposed = offsetRect(selectionBounds, rawDelta);
  const xAlignment = alignmentOptions("x", proposed, fixedRects, artboard);
  const yAlignment = alignmentOptions("y", proposed, fixedRects, artboard);
  const xOption = chooseSnapOption([
    ...xAlignment,
    ...(enableSpacing ? spacingOptions("x", proposed, fixedRects) : []),
  ]);
  const yOption = chooseSnapOption([
    ...yAlignment,
    ...(enableSpacing ? spacingOptions("y", proposed, fixedRects) : []),
  ]);
  const delta = {
    x: rawDelta.x + (xOption?.adjust ?? 0),
    y: rawDelta.y + (yOption?.adjust ?? 0),
  };
  const snappedBounds = offsetRect(selectionBounds, delta);
  const spacingMeasurements = [
    ...(xOption?.spacingPair
      ? buildSpacingMeasurements("x", [
          xOption.spacingPair[0],
          xOption.spacingPair[1],
          snappedBounds,
        ])
      : []),
    ...(yOption?.spacingPair
      ? buildSpacingMeasurements("y", [
          yOption.spacingPair[0],
          yOption.spacingPair[1],
          snappedBounds,
        ])
      : []),
  ];
  const guides = [xOption, yOption]
    .filter((option): option is SnapOption => Boolean(option))
    .map((option) => {
      const guide = rebaseGuide(option.guide, snappedBounds);
      if (!option.spacingPair) return guide;
      return {
        ...guide,
        coordinate:
          guide.axis === "horizontal"
            ? centerOf(snappedBounds, "y")
            : centerOf(snappedBounds, "x"),
      };
    });
  return {
    delta,
    guides,
    spacingMeasurements,
  };
}

function pushDistance(
  measurements: DistanceMeasurement[],
  axis: "horizontal" | "vertical",
  from: number,
  to: number,
  cross: number,
) {
  if (Math.abs(to - from) < 1) return;
  measurements.push({
    axis,
    cross,
    from,
    to,
    value: Math.round(Math.abs(to - from)),
  });
}

function buildDistanceMeasurements(
  subject: ElementRect,
  artboard: { width: number; height: number },
  target?: ElementRect,
) {
  const measurements: DistanceMeasurement[] = [];
  if (target) {
    const horizontal =
      target.x + target.width <= subject.x
        ? {
            from: target.x + target.width,
            to: subject.x,
            cross: (centerOf(subject, "y") + centerOf(target, "y")) / 2,
          }
        : subject.x + subject.width <= target.x
          ? {
              from: subject.x + subject.width,
              to: target.x,
              cross: (centerOf(subject, "y") + centerOf(target, "y")) / 2,
            }
          : null;
    const vertical =
      target.y + target.height <= subject.y
        ? {
            from: target.y + target.height,
            to: subject.y,
            cross: (centerOf(subject, "x") + centerOf(target, "x")) / 2,
          }
        : subject.y + subject.height <= target.y
          ? {
              from: subject.y + subject.height,
              to: target.y,
              cross: (centerOf(subject, "x") + centerOf(target, "x")) / 2,
            }
          : null;

    if (horizontal && vertical) {
      const targetIsAbove = target.y + target.height <= subject.y;
      const subjectIsRight = target.x + target.width <= subject.x;
      horizontal.cross = targetIsAbove ? target.y + target.height : target.y;
      vertical.cross = subjectIsRight ? subject.x : subject.x + subject.width;
    }

    if (horizontal) {
      pushDistance(
        measurements,
        "horizontal",
        horizontal.from,
        horizontal.to,
        horizontal.cross,
      );
    }
    if (vertical) {
      pushDistance(
        measurements,
        "vertical",
        vertical.from,
        vertical.to,
        vertical.cross,
      );
    }
  } else {
    if (subject.x > 0) {
      pushDistance(
        measurements,
        "horizontal",
        0,
        subject.x,
        centerOf(subject, "y"),
      );
    }
    if (subject.x + subject.width < artboard.width) {
      pushDistance(
        measurements,
        "horizontal",
        subject.x + subject.width,
        artboard.width,
        centerOf(subject, "y"),
      );
    }
    if (subject.y > 0) {
      pushDistance(
        measurements,
        "vertical",
        0,
        subject.y,
        centerOf(subject, "x"),
      );
    }
    if (subject.y + subject.height < artboard.height) {
      pushDistance(
        measurements,
        "vertical",
        subject.y + subject.height,
        artboard.height,
        centerOf(subject, "x"),
      );
    }
  }
  return measurements;
}

function areDistanceMeasurementsEqual(
  first: DistanceMeasurement[],
  second: DistanceMeasurement[],
) {
  return (
    first.length === second.length &&
    first.every((measurement, index) => {
      const other = second[index];
      return (
        measurement.axis === other.axis &&
        measurement.cross === other.cross &&
        measurement.from === other.from &&
        measurement.to === other.to &&
        measurement.value === other.value
      );
    })
  );
}

function buildGuideDistanceMeasurements(
  subject: ElementRect,
  guide: EditorGuide,
) {
  const measurements: DistanceMeasurement[] = [];
  if (guide.orientation === "horizontal") {
    if (guide.position < subject.y) {
      pushDistance(
        measurements,
        "vertical",
        guide.position,
        subject.y,
        centerOf(subject, "x"),
      );
    } else if (guide.position > subject.y + subject.height) {
      pushDistance(
        measurements,
        "vertical",
        subject.y + subject.height,
        guide.position,
        centerOf(subject, "x"),
      );
    }
  } else if (guide.position < subject.x) {
    pushDistance(
      measurements,
      "horizontal",
      guide.position,
      subject.x,
      centerOf(subject, "y"),
    );
  } else if (guide.position > subject.x + subject.width) {
    pushDistance(
      measurements,
      "horizontal",
      subject.x + subject.width,
      guide.position,
      centerOf(subject, "y"),
    );
  }
  return measurements;
}

function buildDistanceMeasurementsFromGuide(
  subject: EditorGuide,
  artboard: { width: number; height: number },
  target?: ElementRect,
  targetGuide?: EditorGuide,
) {
  const measurements: DistanceMeasurement[] = [];
  const horizontal = subject.orientation === "horizontal";
  const axis = horizontal ? "vertical" : "horizontal";
  const artboardExtent = horizontal ? artboard.height : artboard.width;
  const fallbackCross = horizontal ? artboard.width / 2 : artboard.height / 2;

  if (targetGuide) {
    if (
      targetGuide.id !== subject.id &&
      targetGuide.orientation === subject.orientation
    ) {
      pushDistance(
        measurements,
        axis,
        subject.position,
        targetGuide.position,
        fallbackCross,
      );
    }
    return measurements;
  }

  if (target) {
    const targetStart = horizontal ? target.y : target.x;
    const targetEnd = targetStart + (horizontal ? target.height : target.width);
    const targetCross = horizontal
      ? centerOf(target, "x")
      : centerOf(target, "y");

    if (subject.position < targetStart) {
      pushDistance(
        measurements,
        axis,
        subject.position,
        targetStart,
        targetCross,
      );
    } else if (subject.position > targetEnd) {
      pushDistance(
        measurements,
        axis,
        targetEnd,
        subject.position,
        targetCross,
      );
    }
    return measurements;
  }

  if (subject.position > 0) {
    pushDistance(measurements, axis, 0, subject.position, fallbackCross);
  }
  if (subject.position < artboardExtent) {
    pushDistance(
      measurements,
      axis,
      subject.position,
      artboardExtent,
      fallbackCross,
    );
  }
  return measurements;
}

function lineGeometry(start: Point, current: Point) {
  const deltaX = current.x - start.x;
  const deltaY = current.y - start.y;
  const length = Math.max(24, Math.hypot(deltaX, deltaY));
  const centerX = (start.x + current.x) / 2;
  const centerY = (start.y + current.y) / 2;
  return {
    height: 24,
    rotation: Math.atan2(deltaY, deltaX) * (180 / Math.PI),
    width: length,
    x: centerX - length / 2,
    y: centerY - 12,
  };
}

function lineDraftGeometry(start: Point, current: Point) {
  const padding = 6;
  const x = Math.min(start.x, current.x) - padding;
  const y = Math.min(start.y, current.y) - padding;
  const width = Math.max(24, Math.abs(current.x - start.x) + padding * 2);
  const height = Math.max(24, Math.abs(current.y - start.y) + padding * 2);
  return {
    height,
    startX: start.x - x,
    startY: start.y - y,
    endX: current.x - x,
    endY: current.y - y,
    width,
    x,
    y,
  };
}

function lineEndpoints(element: CanvasElement) {
  const radians = element.rotation * (Math.PI / 180);
  const halfWidth = element.width / 2;
  const center = {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  };
  const direction = {
    x: Math.cos(radians) * halfWidth,
    y: Math.sin(radians) * halfWidth,
  };
  return {
    end: { x: center.x + direction.x, y: center.y + direction.y },
    start: { x: center.x - direction.x, y: center.y - direction.y },
  };
}

function intersects(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return (
    a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y
  );
}

function selectionIdsForElement(
  elements: CanvasElement[],
  element: CanvasElement,
) {
  return element.groupId
    ? elements
        .filter((candidate) => candidate.groupId === element.groupId)
        .map((candidate) => candidate.id)
    : [element.id];
}

function expandGroupedSelection(elements: CanvasElement[], ids: string[]) {
  const selectedIds = new Set(ids);
  const selectedGroupIds = new Set(
    elements
      .filter((element) => selectedIds.has(element.id) && element.groupId)
      .map((element) => element.groupId as string),
  );
  return elements
    .filter(
      (element) =>
        selectedIds.has(element.id) ||
        Boolean(element.groupId && selectedGroupIds.has(element.groupId)),
    )
    .map((element) => element.id);
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.matches("input, textarea, select, [contenteditable='true']")
  );
}

function localPointFromElement(
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

function elementAtClientPoint(clientX: number, clientY: number) {
  const element = document.elementFromPoint(clientX, clientY);
  return element?.closest<HTMLElement>("[data-element-id]") ?? null;
}

function guideAtClientPoint(clientX: number, clientY: number) {
  const element = document.elementFromPoint(clientX, clientY);
  return element?.closest<HTMLElement>("[data-guide-id]") ?? null;
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
  onChange,
  value,
}: {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  max: number;
  min: number;
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
    const nextWidth = clamp(width, 320, 2400);
    const ratio = {
      "1:1": 1,
      "3:2": 3 / 2,
      "4:3": 4 / 3,
      "9:16": 9 / 16,
      "16:9": 16 / 9,
    }[pageAspectRatio];
    onUpdateArtboard({
      width: nextWidth,
      height: Math.round(nextWidth / ratio),
    });
  };

  const updatePageHeight = (height: number) => {
    const nextHeight = clamp(height, 240, 4096);
    const ratio = {
      "1:1": 1,
      "3:2": 3 / 2,
      "4:3": 4 / 3,
      "9:16": 9 / 16,
      "16:9": 16 / 9,
    }[pageAspectRatio];
    onUpdateArtboard({
      height: nextHeight,
      width: Math.round(nextHeight * ratio),
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
          max={2400}
          min={320}
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
          max={4096}
          min={240}
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
  renderScale = 1,
}: {
  element: CanvasElement;
  imageScale?: number;
  renderScale?: number;
}) {
  const fill = colorWithOpacity(element.fill, element.fillOpacity);
  const stroke = colorWithOpacity(element.stroke, element.strokeOpacity);
  const visibleStrokeWidth = element.strokeWidth * renderScale;
  const innerTransform: CSSProperties = {
    transform: visualFlipTransform(element),
    transformOrigin: "center",
  };
  const common = {
    fill,
    stroke,
    strokeDasharray: strokeDasharrayForElement(element, renderScale),
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: visibleStrokeWidth,
    vectorEffect: "non-scaling-stroke" as const,
  };

  if (element.pathfinder?.paths.length) {
    const { imageFill, paths, polygons } = element.pathfinder;
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
    const safeElementId = element.id.replace(/[^a-zA-Z0-9_-]/g, "-");
    const clipId = `pathfinder-clip-${safeElementId}`;
    const baseMaskId = `pathfinder-base-mask-${safeElementId}`;
    return (
      <svg
        aria-hidden="true"
        className="vector-shape"
        preserveAspectRatio="none"
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
                  <g
                    transform={`translate(${imageFill.width / 2} ${imageFill.height / 2}) scale(${imageFill.flipX ? -1 : 1} ${imageFill.flipY ? -1 : 1}) translate(${-imageFill.width / 2} ${-imageFill.height / 2})`}
                  >
                    <image
                      height={imageFill.crop.baseHeight * imageFill.crop.scaleY}
                      href={imageFill.src}
                      preserveAspectRatio="none"
                      width={imageFill.crop.baseWidth * imageFill.crop.scaleX}
                      x={-imageFill.crop.left * imageFill.crop.scaleX}
                      y={-imageFill.crop.top * imageFill.crop.scaleY}
                    />
                  </g>
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
            stroke={element.stroke}
            strokeDasharray={strokeDasharrayForElement(element, renderScale)}
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
        style={innerTransform}
        viewBox="0 0 100 24"
      >
        <line
          stroke={stroke}
          strokeDasharray={strokeDasharrayForElement(element, renderScale)}
          strokeLinecap="round"
          strokeWidth={visibleStrokeWidth}
          vectorEffect="non-scaling-stroke"
          x1="1"
          x2="99"
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
          borderStyle: element.strokeStyle ?? "solid",
          borderWidth: element.strokeWidth,
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

function DrawDraftPreview({
  bounds,
  draft,
  renderScale,
}: {
  bounds: ElementRect;
  draft: DrawDraft;
  renderScale: number;
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
        <ShapeGraphic element={previewElement} renderScale={renderScale} />
      )}
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

function textStyleForElement(element: CanvasElement): CSSProperties {
  const fontFamily = element.fontFamily ?? "Inter";
  return {
    color: colorWithOpacity(element.fill, element.fillOpacity),
    fontFamily: fontFamilyStacks[fontFamily] ?? fontFamily,
    fontSize: `${element.fontSize ?? 24}px`,
    fontWeight: element.fontWeight ?? "500",
    letterSpacing:
      element.letterSpacing && element.letterSpacing !== "auto"
        ? `${element.letterSpacing}px`
        : undefined,
    lineHeight:
      element.lineHeight && element.lineHeight !== "auto"
        ? element.lineHeight
        : undefined,
    textAlign: element.textAlign ?? "left",
    transform: visualFlipTransform(element),
    transformOrigin: "center",
    whiteSpace: element.textResizeMode === "auto-width" ? "pre" : "pre-wrap",
  };
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

function ViewerPreview({
  artboard,
  elements,
  onClose,
}: {
  artboard: ArtboardSettings;
  elements: CanvasElement[];
  onClose: () => void;
}) {
  const [viewport, setViewport] = useState(() => ({
    height:
      typeof window === "undefined" ? artboard.height : window.innerHeight,
    width: typeof window === "undefined" ? artboard.width : window.innerWidth,
  }));

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
  const renderScale = Math.max(0.01, Math.min(layout.scaleX, layout.scaleY));

  return (
    <section
      aria-label="Viewer preview"
      aria-modal="true"
      className="viewer-preview"
      role="dialog"
    >
      <button
        aria-label="Close preview"
        className="viewer-preview-close"
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
                      <div
                        className="text-shape"
                        style={textStyleForElement(element)}
                      >
                        {element.text}
                      </div>
                    ) : (
                      <ShapeGraphic
                        element={element}
                        renderScale={renderScale}
                      />
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
  const scrollbarInset =
    className === "asset-grid" || className === "scene-list" ? 20 : 0;
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
    dragRef.current = {
      pointerId: event.pointerId,
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
      drag.startTop + event.clientY - drag.startY,
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
          className="custom-scrollbar"
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
    toggleElementLocked,
    toggleElementVisible,
    undo,
    updateArtboard,
    updateElement,
    updateElements,
    zoom,
  } = useEditorStore();
  const activePage = pages.find((page) => page.id === activePageId) ?? pages[0];
  const elements = useMemo(() => activePage?.elements ?? [], [activePage]);
  const selectionToolActive =
    activeTool === "selection" || activeTool === "settings";
  const [assetTab, setAssetTab] = useState<"image" | "video">("image");
  const [uploadedAssets, setUploadedAssets] = useState<string[]>([]);
  const [lockRatio, setLockRatio] = useState(true);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [fitScale, setFitScale] = useState(1);
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

  const totalScale = fitScale * (zoom / 100);

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
      const selectedGuide =
        selectedElements.length === 0 && selectedGuideIds.length === 1
          ? guides.find((guide) => guide.id === selectedGuideIds[0])
          : undefined;
      if (selectedElements.length !== 1 && !selectedGuide) {
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

      const subject = rectFromElement(selectedElements[0]);
      const target = elements.find(
        (element) => element.id === targetId && element.id !== subject.id,
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateScale = () => {
      const bounds = canvas.getBoundingClientRect();
      setFitScale(
        Math.min(
          1,
          Math.max(0.08, (bounds.width - 16) / artboard.width),
          Math.max(0.08, (bounds.height - 96) / artboard.height),
        ),
      );
    };

    updateScale();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateScale);
      return () => window.removeEventListener("resize", updateScale);
    }
    const observer = new ResizeObserver(updateScale);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [artboard.height, artboard.width]);

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
        setStableDistanceMeasurements([]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
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
    const selected = selectedGuideIds.includes(guide.id);
    setSelectedElementIds([]);
    setSelectedGuideIds(
      event.shiftKey
        ? selected
          ? selectedGuideIds.filter((id) => id !== guide.id)
          : [...selectedGuideIds, guide.id]
        : [guide.id],
    );
    event.currentTarget.setPointerCapture(event.pointerId);
    guideDragRef.current = {
      guideId: guide.id,
      orientation: guide.orientation,
      pointerId: event.pointerId,
      source: "guide",
    };
  };

  const handleGuidePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = guideDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    if (drag.source === "ruler") {
      setGuidePreview({
        orientation: drag.orientation,
        position: getCanvasGuidePosition(
          drag.orientation,
          event.clientX,
          event.clientY,
        ),
      });
      return;
    }

    const position = getWorldGuidePosition(
      drag.orientation,
      event.clientX,
      event.clientY,
    );
    updateGuides((current) =>
      current.map((guide) =>
        guide.id === drag.guideId ? { ...guide, position } : guide,
      ),
    );
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
            position: getWorldGuidePosition(
              drag.orientation,
              event.clientX,
              event.clientY,
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
      setZoom(zoom + (event.button === 2 ? -10 : 10));
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
        resizedBounds,
        artboard.height,
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
      setZoom(zoom + (event.deltaY < 0 ? 10 : -10));
      return;
    }
    setPan((current) => ({
      x: current.x - event.deltaX,
      y: current.y - event.deltaY,
    }));
  };

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
    backgroundColor: "transparent",
    borderRadius: `${artboard.cornerRadius}px`,
    overflow: "hidden",
  } as CSSProperties;

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
    ? selectionDimensionsBounds.y + selectionDimensionsBounds.height + 28 <=
      artboard.height
      ? {
          className: "",
          top:
            selectionDimensionsBounds.y + selectionDimensionsBounds.height + 8,
        }
      : {
          className: "is-above",
          top: selectionDimensionsBounds.y - 8,
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
    <main className="editor-shell">
      <header className="editor-topbar">
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
          <button className="zoom-menu" type="button">
            {zoom} % <ChevronDown aria-hidden="true" size={10} />
          </button>
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

      <aside aria-label="Creation tools" className="tool-rail">
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

      <aside aria-label="Project panels" className="project-panel">
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
            const elementStyle = {
              height: `${element.height}px`,
              left: `${element.x}px`,
              opacity: element.opacity / 100,
              top: `${element.y}px`,
              transform: `rotate(${element.rotation}deg)`,
              transformOrigin: "center",
              width: `${element.width}px`,
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
                  <ShapeGraphic element={element} renderScale={totalScale} />
                )}

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
              style={{
                height: combinedSelectionBounds.height + 6,
                left: combinedSelectionBounds.x - 3,
                top: combinedSelectionBounds.y - 3,
                width: combinedSelectionBounds.width + 6,
              }}
            >
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
                className={`distance-measurement ${horizontal ? "is-horizontal" : "is-vertical"}`}
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
              renderScale={totalScale}
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
          className={`navigator ${navigatorVisible ? "is-visible" : ""}`}
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
              onClick={() => setZoom(zoom - 10)}
              type="button"
            >
              <Minus size={13} />
            </button>
            <strong>{zoom} %</strong>
            <button
              aria-label="Zoom in"
              onClick={() => setZoom(zoom + 10)}
              type="button"
            >
              <Plus size={13} />
            </button>
          </div>
        </aside>
      </section>

      <aside aria-label="Properties" className="properties-panel">
        <div
          aria-label="Property sections"
          className="panel-tabs"
          data-active-tab={activeTool === "settings" ? "scenes" : "design"}
          role="tablist"
        >
          <button aria-selected="false" disabled role="tab" type="button">
            INTERACTION
          </button>
          <button
            aria-selected={activeTool === "settings"}
            onClick={() => setActiveTool("settings")}
            role="tab"
            type="button"
          >
            SCENES
          </button>
          <button
            aria-selected={activeTool !== "settings"}
            onClick={() => {
              if (activeTool === "settings") setActiveTool("selection");
            }}
            role="tab"
            type="button"
          >
            DESIGN
          </button>
          <button aria-selected="false" disabled role="tab" type="button">
            SOUND
          </button>
          <button aria-selected="false" disabled role="tab" type="button">
            LOGIC
          </button>
        </div>
        {activeTool === "settings" ? (
          <ScenePanel
            activePageId={activePageId}
            activePageName={activePage?.name ?? "Page"}
            artboard={artboard}
            key={activePageId}
            onRenamePage={renamePage}
            onUpdateArtboard={updateArtboard}
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
          artboard={artboard}
          elements={elements}
          onClose={() => setPreviewVisible(false)}
        />
      ) : null}
    </main>
  );
}
