import { ShapeGraphic } from "@/features/editor/components/canvas/shape-graphic";
import {
  type DrawDraft,
  type ElementRect,
} from "@/features/editor/lib/editor-types";
import { type CanvasElement } from "@/features/editor/store/editor-store";

export function DrawDraftOutline({
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

export function DrawDraftPreview({
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
