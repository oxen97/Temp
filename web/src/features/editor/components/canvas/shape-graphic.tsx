import { useId, type CSSProperties } from "react";

import {
  colorWithOpacity,
  strokeDasharrayForElement,
} from "@/features/editor/lib/element-style";
import { clamp, visualFlipTransform } from "@/features/editor/lib/geometry";
import { imageCropForElement } from "@/features/editor/lib/image-crop";
import { ringWithoutClosingPoint } from "@/features/editor/lib/pathfinder";
import {
  bendOpenPath,
  type StrandBendVisual,
} from "@/features/editor/lib/strand-bend";
import {
  polygonCornerRadii,
  polygonPointsForElement,
  polygonPointString,
  roundedPolygonPath,
  roundedRectanglePoints,
} from "@/features/editor/lib/polygon";
import {
  pathData,
  vectorPathsForElement,
} from "@/features/editor/lib/vector-path";
import { type CanvasElement } from "@/features/editor/store/editor-store";

export function ShapeGraphic({
  element,
  imageScale = 1,
  strandBend,
  strandPathData,
  strandRibbonPathData,
}: {
  element: CanvasElement;
  imageScale?: number;
  strandBend?: StrandBendVisual;
  strandPathData?: string;
  strandRibbonPathData?: string;
}) {
  const ribbonGradientId = useId().replaceAll(":", "");
  const fill = colorWithOpacity(element.fill, element.fillOpacity);
  const strokeVisible = element.strokeStyle !== "none";
  const stroke = strokeVisible
    ? colorWithOpacity(element.stroke, element.strokeOpacity)
    : "none";
  const visibleStrokeWidth = strokeVisible ? element.strokeWidth : 0;
  const ribbonOpacity = Math.max(0, Math.min(1, (element.strokeOpacity ?? 100) / 100));
  const pinocchioNose = element.id === "pinocchio-demo-nose";
  const ribbonGradient = strandRibbonPathData ? (
    <defs>
      <linearGradient
        id={ribbonGradientId}
        x1="0%"
        x2={pinocchioNose ? "0%" : "100%"}
        y1="0%"
        y2={pinocchioNose ? "100%" : "0%"}
      >
        {pinocchioNose ? (
          <>
            <stop offset="0%" stopColor="#ffe0aa" />
            <stop offset="30%" stopColor="#f4b57e" />
            <stop offset="72%" stopColor="#dc9164" />
            <stop offset="100%" stopColor="#aa5e49" />
          </>
        ) : (
          <>
            <stop offset="0%" stopColor={element.stroke} stopOpacity={ribbonOpacity * 0.84} />
            <stop offset="30%" stopColor={element.stroke} stopOpacity={ribbonOpacity} />
            <stop offset="70%" stopColor={element.stroke} stopOpacity={ribbonOpacity * 0.98} />
            <stop offset="100%" stopColor={element.stroke} stopOpacity={ribbonOpacity * 0.87} />
          </>
        )}
      </linearGradient>
      {pinocchioNose ? (
        <radialGradient id={`${ribbonGradientId}-root`}>
          <stop offset="0%" stopColor="#f7c58f" />
          <stop offset="58%" stopColor="#eeb07d" stopOpacity=".94" />
          <stop offset="100%" stopColor="#e4a071" stopOpacity="0" />
        </radialGradient>
      ) : null}
    </defs>
  ) : null;
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
    const renderedPaths = strandBend && !strandPathData
      ? paths.map((path) => bendOpenPath(path, strandBend))
      : paths;
    return (
      <svg
        aria-hidden="true"
        className="vector-shape"
        preserveAspectRatio="none"
        shapeRendering="geometricPrecision"
        style={innerTransform}
        viewBox={`0 0 ${Math.max(1, element.width)} ${Math.max(1, element.height)}`}
      >
        {ribbonGradient}
        {renderedPaths.map((path, index) => (
          <path
            aria-hidden="true"
            className="pen-hit-area"
            d={index === 0 && strandPathData ? strandPathData : pathData(path.points, path.closed)}
            fill="none"
            key={`hit-${index}`}
            pointerEvents="stroke"
            stroke="transparent"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={
              (strandBend || strandPathData) && !path.closed
                ? Math.max(24, visibleStrokeWidth + 16)
                : Math.max(10, visibleStrokeWidth + 8)
            }
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {renderedPaths.map((path, index) => (
          <path
            className="pen-visible-path"
            d={index === 0 && strandPathData ? strandPathData : pathData(path.points, path.closed)}
            key={`visible-${index}`}
            stroke={index === 0 && strandRibbonPathData ? "none" : stroke}
            strokeDasharray={strokeDasharrayForElement(element)}
            strokeOpacity={(element.strokeOpacity ?? 100) / 100}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={visibleStrokeWidth}
            fill={path.closed ? fill : "none"}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {strandRibbonPathData ? (
          <>
            <path
              className="strand-ribbon"
              d={strandRibbonPathData}
              fill={`url(#${ribbonGradientId})`}
              pointerEvents="none"
              stroke={pinocchioNose ? "#9b604b" : undefined}
              strokeWidth={pinocchioNose ? 3.5 : undefined}
            />
            {pinocchioNose ? (
              <ellipse
                cx={0}
                cy={element.height / 2}
                fill={`url(#${ribbonGradientId}-root)`}
                pointerEvents="none"
                rx={element.strokeWidth * 0.95}
                ry={element.strokeWidth * 0.78}
              />
            ) : null}
          </>
        ) : null}
      </svg>
    );
  }

  if (element.type === "line") {
    const bentPath = strandPathData ?? (strandBend
      ? pathData(
          bendOpenPath(
            {
              points: [
                { x: 0, y: element.height / 2 },
                { x: element.width, y: element.height / 2 },
              ],
            },
            strandBend,
          ).points,
        )
      : null);
    return (
      <svg
        aria-hidden="true"
        className="vector-shape line-shape"
        preserveAspectRatio="none"
        shapeRendering="geometricPrecision"
        style={innerTransform}
        viewBox={
          bentPath
            ? `0 0 ${Math.max(1, element.width)} ${Math.max(1, element.height)}`
            : "0 0 100 24"
        }
      >
        {ribbonGradient}
        {bentPath ? (
          <>
            <path
              className="strand-hit-area"
              d={bentPath}
              fill="none"
              pointerEvents="stroke"
              stroke="transparent"
              strokeLinecap="round"
              strokeWidth={Math.max(24, visibleStrokeWidth + 16)}
              vectorEffect="non-scaling-stroke"
            />
            <path
              className="strand-visible-path"
              d={bentPath}
              fill="none"
              pointerEvents="none"
              stroke={strandRibbonPathData ? "none" : stroke}
              strokeDasharray={strokeDasharrayForElement(element)}
              strokeLinecap="round"
              strokeWidth={visibleStrokeWidth}
              vectorEffect="non-scaling-stroke"
            />
            {strandRibbonPathData ? (
              <path
                className="strand-ribbon"
                d={strandRibbonPathData}
                fill={`url(#${ribbonGradientId})`}
                pointerEvents="none"
              />
            ) : null}
          </>
        ) : (
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
        )}
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
