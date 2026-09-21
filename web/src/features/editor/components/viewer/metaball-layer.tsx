"use client";

import { useId, type CSSProperties } from "react";

import {
  isRenderableMetaballSource,
  metaballAlphaMatrix,
  metaballFilterBounds,
  metaballStrokePath,
  metaballTransformAttribute,
  type MetaballSource,
} from "@/features/editor/lib/metaball";

export type MetaballLayerProps = {
  /** Artboard size. Place this component at (0, 0) inside the artboard. */
  width: number;
  height: number;
  /** Dynamic circle/stroke geometry in unscaled artboard coordinates. */
  sources: readonly MetaballSource[];
  color: string;
  /** Approximate bridge reach in artboard pixels; shape geometry also matters. */
  bridgeWidth?: number;
  /** 0 = crisp goo edge; 1 = soft edge. */
  smoothness?: number;
  opacity?: number;
  className?: string;
  style?: CSSProperties;
};

function sourceGraphic(source: MetaballSource, color: string) {
  switch (source.kind) {
    case "circle":
      return <circle cx={source.x} cy={source.y} r={source.radius} />;
    case "ellipse":
      return (
        <ellipse
          cx={source.x}
          cy={source.y}
          rx={source.radiusX}
          ry={source.radiusY}
        />
      );
    case "rect":
      return (
        <rect
          height={source.height}
          rx={Math.min(
            source.cornerRadius ?? 0,
            source.width / 2,
            source.height / 2,
          )}
          width={source.width}
          x={source.x}
          y={source.y}
        />
      );
    case "polygon":
      return (
        <polygon
          points={source.points
            .map((point) => `${point.x},${point.y}`)
            .join(" ")}
        />
      );
    case "path":
      return <path d={source.d} fillRule={source.fillRule ?? "nonzero"} />;
    case "stroke":
      return source.points.length === 1 ? (
        <circle
          cx={source.points[0].x}
          cy={source.points[0].y}
          r={source.width / 2}
        />
      ) : (
        <path
          d={metaballStrokePath(source.points)}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={source.width}
        />
      );
  }
}

/**
 * A renderer-only primitive: hit testing and dragging remain the caller's job.
 * Use a single layer for sources that should merge; use separate layers when
 * colors or merge groups must stay independent.
 */
export function MetaballLayer({
  width,
  height,
  sources,
  color,
  bridgeWidth = 24,
  smoothness = 0.2,
  opacity = 1,
  className,
  style,
}: MetaballLayerProps) {
  const id = useId().replaceAll(":", "");
  const validSources = sources.filter(isRenderableMetaballSource);
  const bridge = Math.max(0, Number.isFinite(bridgeWidth) ? bridgeWidth : 0);
  const filterBounds = metaballFilterBounds(validSources, bridge);
  const filtered = bridge > 0;

  return (
    <svg
      aria-hidden="true"
      className={className}
      height={height}
      style={{ pointerEvents: "none", overflow: "visible", ...style }}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      {filtered && (
        <defs>
          <filter
            colorInterpolationFilters="sRGB"
            filterUnits="userSpaceOnUse"
            height={filterBounds.height}
            id={id}
            primitiveUnits="userSpaceOnUse"
            width={filterBounds.width}
            x={filterBounds.x}
            y={filterBounds.y}
          >
            <feMorphology
              in="SourceAlpha"
              operator="dilate"
              radius={bridge / 2}
              result="expanded"
            />
            <feGaussianBlur
              in="expanded"
              result="field"
              stdDeviation={bridge / 5}
            />
            <feColorMatrix
              in="field"
              result="mask"
              type="matrix"
              values={metaballAlphaMatrix(
                Number.isFinite(smoothness) ? smoothness : 0.2,
              )}
            />
            <feMorphology
              in="mask"
              operator="erode"
              radius={bridge * 0.42}
              result="bridge"
            />
            <feComposite
              in="SourceAlpha"
              in2="bridge"
              operator="over"
              result="merged"
            />
            <feFlood floodColor={color} result="color" />
            <feComposite in="color" in2="merged" operator="in" />
          </filter>
        </defs>
      )}
      <g
        fill={color}
        filter={filtered ? `url(#${id})` : undefined}
        opacity={opacity}
      >
        {validSources.map((source) => (
          <g
            fill={source.strokeWidth ? "none" : color}
            key={source.id}
            stroke={source.strokeWidth ? color : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={source.strokeWidth}
            transform={metaballTransformAttribute(source.transform)}
          >
            {sourceGraphic(source, color)}
          </g>
        ))}
      </g>
    </svg>
  );
}
