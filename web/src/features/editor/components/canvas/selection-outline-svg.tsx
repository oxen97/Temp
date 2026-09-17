import {
  selectionOutlineGeometry,
  type SelectionStrokePlacement,
} from "@/features/editor/lib/dom-preview";

export function SelectionOutlineSvg({
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
