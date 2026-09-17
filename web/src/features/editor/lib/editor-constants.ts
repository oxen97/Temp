import { MousePointer2, Square } from "lucide-react";

import { type ToolDefinition } from "@/features/editor/lib/editor-types";
import {
  type PathfinderOperation,
  type ShapeType,
} from "@/features/editor/store/editor-store";
import { assetPath } from "@/lib/asset-path";

export const tools: ToolDefinition[] = [
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

export const toolIndicatorMetrics = [
  { height: 68, offset: 0 },
  { height: 65, offset: 67.5 },
  { height: 65, offset: 132 },
  { height: 61.5, offset: 196.5 },
  { height: 59.5, offset: 257.5 },
  { height: 68.5, offset: 316.4 },
] as const;

export const designAssetDimensions: Record<
  string,
  { height: number; width: number }
> = {
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

export const pathfinderLayerAssets: Record<PathfinderOperation, string> = {
  divide: "Group 158.svg",
  exclude: "Group 156.svg",
  flatten: "Group 158.svg",
  intersect: "Group 155.svg",
  outline: "Group 159.svg",
  subtract: "Group 154.svg",
  trim: "Group 159.svg",
  union: "Group 153.svg",
};

export const rotationPresets = Array.from(
  { length: 12 },
  (_, index) => index * 30,
);

export const fontSizePresets = [
  8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96, 120, 144,
];

export const fontWeightOptions = [
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

export const fontFamilyStacks: Record<string, string> = {
  Arial: "Arial, Helvetica, sans-serif",
  Georgia: 'Georgia, "Times New Roman", serif',
  Inter:
    'var(--design-inter), "Malgun Gothic", "Apple SD Gothic Neo", "Segoe UI", Arial, sans-serif',
  "Times New Roman": '"Times New Roman", Times, serif',
};

export const shapeOptions: { id: ShapeType; label: string }[] = [
  { id: "rectangle", label: "Rectangle" },
  { id: "circle", label: "Circle" },
  { id: "triangle", label: "Triangle" },
  { id: "star", label: "Star" },
  { id: "line", label: "Line" },
  { id: "pen", label: "Pen Tool" },
];

export const shapeNames: Record<ShapeType, string> = {
  rectangle: "Rectangle",
  circle: "Circle",
  triangle: "Triangle",
  star: "Star",
  line: "Line",
  pen: "Pen",
};

export const distancePreviewSlotCount = 12;

export const ARTBOARD_TOOLBAR_GUTTER = 25;
