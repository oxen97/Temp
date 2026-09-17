import polygonClipping, {
  type MultiPolygon,
  type Ring,
} from "polygon-clipping";

import { type Point } from "@/features/editor/lib/editor-types";
import { createElementId } from "@/features/editor/lib/element-id";
import {
  boundsFromPointList,
  worldPointForDesign,
} from "@/features/editor/lib/geometry";
import { imageCropForElement } from "@/features/editor/lib/image-crop";
import {
  outlinePathsForElement,
  pathData,
} from "@/features/editor/lib/vector-path";
import {
  type CanvasElement,
  type PathfinderOperation,
} from "@/features/editor/store/editor-store";

export function closedClippingRing(points: Point[]): Ring {
  const ring = points.map(({ x, y }) => [x, y] as [number, number]);
  const first = ring[0];
  const last = ring.at(-1);
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    ring.push([...first]);
  }
  return ring;
}

export function unionGeometries(geometries: MultiPolygon[]) {
  const first = geometries[0];
  if (!first) return [];
  return geometries.length === 1
    ? first
    : polygonClipping.union(first, ...geometries.slice(1));
}

export function intersectGeometries(geometries: MultiPolygon[]) {
  const first = geometries[0];
  if (!first) return [];
  return geometries.length === 1
    ? first
    : polygonClipping.intersection(first, ...geometries.slice(1));
}

export function subtractGeometries(
  subject: MultiPolygon,
  cutters: MultiPolygon[],
) {
  return cutters.length
    ? polygonClipping.difference(subject, ...cutters)
    : subject;
}

export function clippingGeometryForElement(
  element: CanvasElement,
): MultiPolygon {
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

export function clippingBounds(geometry: MultiPolygon) {
  const points = geometry
    .flatMap((polygon) => polygon.flatMap((ring) => ring))
    .map(([x, y]) => ({ x, y }));
  return points.length ? boundsFromPointList(points) : null;
}

export function ringWithoutClosingPoint(ring: Ring) {
  const first = ring[0];
  const last = ring.at(-1);
  return first && last && first[0] === last[0] && first[1] === last[1]
    ? ring.slice(0, -1)
    : ring;
}

export function pathfinderPiece(
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

export function pathfinderElement(
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

export function splitPolygons(geometry: MultiPolygon) {
  return geometry.map((polygon) => [polygon] as MultiPolygon);
}

export function splitPathfinderElements(
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
