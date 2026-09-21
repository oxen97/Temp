/** Applied around origin, then rotated, then translated (all artboard units). */
export type MetaballTransform = {
  translateX?: number;
  translateY?: number;
  rotationDegrees?: number;
  scaleX?: number;
  scaleY?: number;
  originX?: number;
  originY?: number;
};

/** Sources are expressed in artboard coordinates, before viewer scaling. */
export type MetaballSource = {
  id: string;
  transform?: MetaballTransform;
  /** Positive value draws a closed shape as an outline instead of a fill. */
  strokeWidth?: number;
} & (
  | {
      kind: "circle";
      x: number;
      y: number;
      radius: number;
    }
  | {
      kind: "ellipse";
      x: number;
      y: number;
      radiusX: number;
      radiusY: number;
    }
  | {
      kind: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      cornerRadius?: number;
    }
  | {
      kind: "polygon";
      points: readonly { x: number; y: number }[];
    }
  | {
      kind: "path";
      d: string;
      /** Conservative local bounding box of the SVG path. */
      bounds: MetaballBounds;
      fillRule?: "nonzero" | "evenodd";
    }
  | {
      kind: "stroke";
      points: readonly { x: number; y: number }[];
      width: number;
    }
);

export type MetaballBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function isRenderableMetaballSource(source: MetaballSource): boolean {
  if (
    source.strokeWidth !== undefined &&
    (!Number.isFinite(source.strokeWidth) || source.strokeWidth < 0)
  ) {
    return false;
  }
  if (
    source.transform &&
    Object.values(source.transform).some(
      (value) => value !== undefined && !Number.isFinite(value),
    )
  ) {
    return false;
  }
  if (source.kind === "circle") {
    return (
      Number.isFinite(source.x) &&
      Number.isFinite(source.y) &&
      Number.isFinite(source.radius) &&
      source.radius > 0
    );
  }

  if (source.kind === "ellipse") {
    return (
      Number.isFinite(source.x) &&
      Number.isFinite(source.y) &&
      Number.isFinite(source.radiusX) &&
      Number.isFinite(source.radiusY) &&
      source.radiusX > 0 &&
      source.radiusY > 0
    );
  }

  if (source.kind === "rect") {
    return (
      Number.isFinite(source.x) &&
      Number.isFinite(source.y) &&
      Number.isFinite(source.width) &&
      Number.isFinite(source.height) &&
      source.width > 0 &&
      source.height > 0 &&
      (source.cornerRadius === undefined ||
        (Number.isFinite(source.cornerRadius) && source.cornerRadius >= 0))
    );
  }

  if (source.kind === "path") {
    return (
      source.d.trim().length > 0 &&
      Number.isFinite(source.bounds.x) &&
      Number.isFinite(source.bounds.y) &&
      Number.isFinite(source.bounds.width) &&
      Number.isFinite(source.bounds.height) &&
      source.bounds.width > 0 &&
      source.bounds.height > 0
    );
  }

  if (source.kind === "polygon") {
    return (
      source.points.length >= 3 &&
      source.points.every(
        (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
      )
    );
  }

  return (
    Number.isFinite(source.width) &&
    source.width > 0 &&
    source.points.length > 0 &&
    source.points.every(
      (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
    )
  );
}

export function metaballTransformAttribute(
  transform: MetaballTransform | undefined,
): string | undefined {
  if (!transform) return undefined;
  const {
    translateX = 0,
    translateY = 0,
    rotationDegrees = 0,
    scaleX = 1,
    scaleY = 1,
    originX = 0,
    originY = 0,
  } = transform;
  return `translate(${translateX} ${translateY}) translate(${originX} ${originY}) rotate(${rotationDegrees}) scale(${scaleX} ${scaleY}) translate(${-originX} ${-originY})`;
}

function transformedPoint(
  point: { x: number; y: number },
  transform: MetaballTransform | undefined,
): { x: number; y: number } {
  if (!transform) return point;
  const {
    translateX = 0,
    translateY = 0,
    rotationDegrees = 0,
    scaleX = 1,
    scaleY = 1,
    originX = 0,
    originY = 0,
  } = transform;
  const radians = (rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const x = (point.x - originX) * scaleX;
  const y = (point.y - originY) * scaleY;
  return {
    x: originX + translateX + x * cos - y * sin,
    y: originY + translateY + x * sin + y * cos,
  };
}

/** A stroke is deliberately a polyline; round SVG caps/joins make it continuous. */
export function metaballStrokePath(
  points: readonly { x: number; y: number }[],
): string {
  if (points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

/**
 * The SVG filter uses userSpaceOnUse. An explicit padded region prevents a
 * growing bridge from being cut off at a source's original bounding box.
 */
export function metaballFilterBounds(
  sources: readonly MetaballSource[],
  bridgeWidth: number,
  includeFilterPadding = true,
): MetaballBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const source of sources) {
    if (!isRenderableMetaballSource(source)) continue;
    let sourceBounds: MetaballBounds;
    if (source.kind === "circle") {
      sourceBounds = {
        x: source.x - source.radius,
        y: source.y - source.radius,
        width: source.radius * 2,
        height: source.radius * 2,
      };
    } else if (source.kind === "ellipse") {
      sourceBounds = {
        x: source.x - source.radiusX,
        y: source.y - source.radiusY,
        width: source.radiusX * 2,
        height: source.radiusY * 2,
      };
    } else if (source.kind === "rect") {
      sourceBounds = {
        x: source.x,
        y: source.y,
        width: source.width,
        height: source.height,
      };
    } else if (source.kind === "path") {
      sourceBounds = source.bounds;
    } else {
      const radius = source.kind === "stroke" ? source.width / 2 : 0;
      let localMinX = Infinity;
      let localMinY = Infinity;
      let localMaxX = -Infinity;
      let localMaxY = -Infinity;
      for (const point of source.points) {
        localMinX = Math.min(localMinX, point.x - radius);
        localMinY = Math.min(localMinY, point.y - radius);
        localMaxX = Math.max(localMaxX, point.x + radius);
        localMaxY = Math.max(localMaxY, point.y + radius);
      }
      sourceBounds = {
        x: localMinX,
        y: localMinY,
        width: localMaxX - localMinX,
        height: localMaxY - localMinY,
      };
    }

    if (source.kind !== "stroke" && source.strokeWidth) {
      const radius = source.strokeWidth / 2;
      sourceBounds = {
        x: sourceBounds.x - radius,
        y: sourceBounds.y - radius,
        width: sourceBounds.width + radius * 2,
        height: sourceBounds.height + radius * 2,
      };
    }

    const corners = [
      { x: sourceBounds.x, y: sourceBounds.y },
      { x: sourceBounds.x + sourceBounds.width, y: sourceBounds.y },
      { x: sourceBounds.x, y: sourceBounds.y + sourceBounds.height },
      {
        x: sourceBounds.x + sourceBounds.width,
        y: sourceBounds.y + sourceBounds.height,
      },
    ];
    for (const corner of corners) {
      const point = transformedPoint(corner, source.transform);
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }

  if (!Number.isFinite(minX)) return { x: 0, y: 0, width: 1, height: 1 };

  // Include the dilation radius and three standard deviations of blur.
  const bridge = Math.max(0, bridgeWidth);
  const padding = includeFilterPadding
    ? Math.max(2, bridge / 2 + (bridge / 5) * 3)
    : 0;
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

/** Smoothness is an authored 0..1 control over edge softness. */
export function metaballAlphaMatrix(smoothness: number): string {
  const normalized = Math.min(1, Math.max(0, smoothness));
  const transition = 0.015 + normalized * 0.2;
  const slope = 1 / transition;
  const offset = -0.39 * slope;
  return `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${slope} ${offset}`;
}
