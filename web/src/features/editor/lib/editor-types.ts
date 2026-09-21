import { type LucideIcon } from "lucide-react";

import {
  type CanvasElement,
  type EditorTool,
  type PathPoint,
  type ShapeType,
} from "@/features/editor/store/editor-store";
import type { Object3DElement } from "@/features/editor/three/types";

export type ToolDefinition = {
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

export type PropertyTab =
  "design" | "interaction" | "logic" | "scenes" | "sound";

export type Point = { x: number; y: number };

export type DragPointerSample = Point & {
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  pointerId: number;
  shiftKey: boolean;
};

export type MovePreviewTargets = {
  elements: HTMLElement[];
  overlays: HTMLElement[];
};

export type ResizePreviewTargets = {
  dimensions: HTMLOutputElement | null;
  element: HTMLElement | null;
};

export type MultiResizePreviewTargets = {
  dimensions: HTMLOutputElement | null;
  elements: HTMLElement[];
  outline: HTMLElement | null;
};

export type SmartGuidePreviewTargets = {
  horizontal: HTMLDivElement | null;
  vertical: HTMLDivElement | null;
};

export type PenAnchor = PathPoint;

export type VectorPointRef = {
  nodeIndex: number;
  pathIndex: number;
};

export type VectorHandleRef = VectorPointRef & {
  handle: "in" | "out";
};

export type HandleMirroring = "none" | "angle" | "angle-length";

export type DrawDraft = {
  type: Exclude<ShapeType, "pen"> | "text";
  start: Point;
  current: Point;
};

export type PenDraft = {
  branchElementId?: string;
  current: Point;
  points: PenAnchor[];
  closed?: boolean;
  isDragging?: boolean;
};

export type ResizeHandle = "nw" | "ne" | "se" | "sw";

export type ImageResizeHandle = "n" | "e" | "s" | "w";

export type ElementRect = {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SmartGuide = {
  anchor?: ElementRect;
  axis: "horizontal" | "vertical";
  coordinate: number;
  end: number;
  label?: string;
  start: number;
};

export type DistanceMeasurement = {
  axis: "horizontal" | "vertical";
  cross: number;
  from: number;
  hideMaxArrow?: boolean;
  hideMinArrow?: boolean;
  to: number;
  value: number;
};

export type NavigatorViewport = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type RulerRange = {
  end: number;
  start: number;
};

export type EditorGuide = {
  id: string;
  orientation: "horizontal" | "vertical";
  position: number;
};

export type GuideDrag = {
  guideId?: string;
  orientation: EditorGuide["orientation"];
  pointerId: number;
  source: "guide" | "ruler";
};

export type SnapOption = {
  adjust: number;
  guide: SmartGuide;
  spacingPair?: [ElementRect, ElementRect];
};

export type Gesture =
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
      initialObjects3D: Object3DElement[];
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
      kind: "resize-3d";
      pointerId: number;
      handle: ResizeHandle;
      initial: Object3DElement;
      initialBounds: ElementRect;
      lastSample?: DragPointerSample;
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
      initialObjects3D: Object3DElement[];
      initialObjectBounds: Record<string, ElementRect>;
      lastSample?: DragPointerSample;
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

export type CornerPosition =
  "top-left" | "top-right" | "bottom-left" | "bottom-right";
