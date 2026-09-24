import type { CanvasElement } from "../store/editor-store";
import type { RuntimeVisual } from "./interaction-runtime";
import type { MediaDeformBounds, MediaDeformMesh } from "./media-deform";
import { polygonPointsForElement } from "./polygon";
import type { StrandPose } from "./strand-bone-runtime";
import { vectorPathsForElement } from "./vector-path";

export const MEDIA_LIQUID_MAX_PAIRS = 12;
export const MEDIA_LIQUID_BOUNDARY_SAMPLES = 64;
export const MEDIA_LIQUID_COLUMNS = 16;
export const MEDIA_LIQUID_ROWS = 12;

export type MediaLiquidPoint = { x: number; y: number; u: number; v: number };
export type MediaLiquidSurface = {
  boundary: MediaLiquidPoint[];
  center: MediaLiquidPoint;
  bounds: MediaDeformBounds;
  source: HTMLImageElement | HTMLVideoElement | null;
  color: string;
  opacity: number;
};
export type MediaLiquidGeometry = {
  positions: Float32Array;
  uvA: Float32Array;
  uvB: Float32Array;
  blend: Float32Array;
  indices: Uint16Array;
  bounds: MediaDeformBounds;
  gap: number;
};
type Snapshot = {
  mesh: MediaDeformMesh;
  source: HTMLImageElement | HTMLVideoElement;
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const mix = (
  a: MediaLiquidPoint,
  b: MediaLiquidPoint,
  t: number,
): MediaLiquidPoint => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  u: lerp(a.u, b.u, t),
  v: lerp(a.v, b.v, t),
});

function boundsOf(points: MediaLiquidPoint[]): MediaDeformBounds {
  const left = Math.min(...points.map((point) => point.x));
  const top = Math.min(...points.map((point) => point.y));
  return {
    left,
    top,
    width: Math.max(...points.map((point) => point.x)) - left,
    height: Math.max(...points.map((point) => point.y)) - top,
  };
}

function resample(points: MediaLiquidPoint[]): MediaLiquidPoint[] {
  if (points.length <= MEDIA_LIQUID_BOUNDARY_SAMPLES) return points;
  // Preserve source mesh corners by evenly sampling its bounded perimeter.
  return Array.from(
    { length: MEDIA_LIQUID_BOUNDARY_SAMPLES },
    (_, index) =>
      points[
        Math.floor((index * points.length) / MEDIA_LIQUID_BOUNDARY_SAMPLES)
      ],
  );
}

function roundedBoundary(element: CanvasElement): { x: number; y: number }[] {
  const radii = element.cornerRadii ?? [
    element.cornerRadius,
    element.cornerRadius,
    element.cornerRadius,
    element.cornerRadius,
  ];
  const points: { x: number; y: number }[] = [];
  for (let corner = 0; corner < 4; corner += 1) {
    const radius = clamp(
      radii[corner],
      0,
      Math.min(element.width, element.height) / 2,
    );
    const centerX =
      corner === 0 || corner === 3 ? radius : element.width - radius;
    const centerY = corner < 2 ? radius : element.height - radius;
    for (let step = 0; step <= 6; step += 1) {
      const angle =
        -Math.PI + (corner * Math.PI) / 2 + ((step / 6) * Math.PI) / 2;
      points.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    }
  }
  return points;
}

function meshPointAt(
  mesh: MediaDeformMesh,
  x: number,
  y: number,
): MediaLiquidPoint {
  const column = clamp((x / mesh.width) * mesh.columns, 0, mesh.columns);
  const row = clamp((y / mesh.height) * mesh.rows, 0, mesh.rows);
  const left = Math.min(mesh.columns - 1, Math.floor(column));
  const top = Math.min(mesh.rows - 1, Math.floor(row));
  const fx = column - left,
    fy = row - top;
  const index = top * (mesh.columns + 1) + left;
  const below = index + mesh.columns + 1;
  const vertices =
    fx + fy <= 1
      ? [
          [index, 1 - fx - fy],
          [below, fy],
          [index + 1, fx],
        ]
      : [
          [index + 1, 1 - fy],
          [below, 1 - fx],
          [below + 1, fx + fy - 1],
        ];
  return vertices.reduce(
    (point, [vertex, weight]) => ({
      x: point.x + mesh.positions[vertex * 3] * weight,
      y: point.y + mesh.positions[vertex * 3 + 1] * weight,
      u: point.u + mesh.uv[vertex * 2] * weight,
      v: point.v + mesh.uv[vertex * 2 + 1] * weight,
    }),
    { x: 0, y: 0, u: 0, v: 0 },
  );
}

/** Preserve texture UVs while transforming the live deformed boundary to stage
 * coordinates. Vector partners use their authored fill or stroke material. */
export function mediaLiquidSurface(
  element: CanvasElement,
  visual: RuntimeVisual,
  snapshot?: Snapshot | null,
  pose?: StrandPose,
): MediaLiquidSurface | null {
  const media = element.type === "image" || element.type === "video";
  if (media && !snapshot) return null;
  const local = (x: number, y: number): MediaLiquidPoint => ({
    x,
    y,
    u: x / Math.max(1, element.width),
    v: 1 - y / Math.max(1, element.height),
  });
  let points: MediaLiquidPoint[];
  let stroke = false;
  if (snapshot && media) {
    const rounded = (element.cornerRadii ?? [element.cornerRadius]).some(
      (radius) => radius > 0,
    );
    points = rounded
      ? roundedBoundary(element).map((point) =>
          meshPointAt(snapshot.mesh, point.x, point.y),
        )
      : snapshot.mesh.boundary.map((index) => ({
          x: snapshot.mesh.positions[index * 3],
          y: snapshot.mesh.positions[index * 3 + 1],
          u: snapshot.mesh.uv[index * 2],
          v: snapshot.mesh.uv[index * 2 + 1],
        }));
  } else if (element.type === "circle") {
    points = Array.from({ length: 48 }, (_, index) => {
      const angle = (index / 48) * Math.PI * 2;
      return local(
        ((1 + Math.cos(angle)) * element.width) / 2,
        ((1 + Math.sin(angle)) * element.height) / 2,
      );
    });
  } else if (element.type === "triangle" || element.type === "star") {
    points = polygonPointsForElement(element).map((point) =>
      local((point.x * element.width) / 100, (point.y * element.height) / 100),
    );
  } else if (element.type === "line" || element.type === "pen") {
    const path = vectorPathsForElement(element)[0];
    const centerline =
      pose?.points ??
      (element.type === "line"
        ? [
            { x: 0, y: element.height / 2 },
            { x: element.width, y: element.height / 2 },
          ]
        : path?.points);
    if (!centerline || centerline.length < 2) return null;
    if (
      path?.closed &&
      element.fill !== "none" &&
      element.fill !== "transparent"
    ) {
      points = centerline.map((point) => local(point.x, point.y));
    } else {
      stroke = true;
      const side = (sign: number) =>
        centerline.map((point, index) => {
          const before = centerline[Math.max(0, index - 1)];
          const after = centerline[Math.min(centerline.length - 1, index + 1)];
          const length = Math.max(
            0.001,
            Math.hypot(after.x - before.x, after.y - before.y),
          );
          return local(
            point.x -
              ((((after.y - before.y) / length) * element.strokeWidth) / 2) *
                sign,
            point.y +
              ((((after.x - before.x) / length) * element.strokeWidth) / 2) *
                sign,
          );
        });
      points = [...side(1), ...side(-1).reverse()];
    }
  } else if (element.type === "rectangle") {
    points = roundedBoundary(element).map((point) => local(point.x, point.y));
  } else return null;

  const radians = ((element.rotation + visual.rotate) * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const skewX = Math.tan((visual.skewX * Math.PI) / 180);
  const skewY = Math.tan((visual.skewY * Math.PI) / 180);
  points = resample(points).map((point) => {
    // Media meshes already include the authored flips.
    const rawX =
      (point.x - element.width / 2) * (!media && element.flipX ? -1 : 1);
    const rawY =
      (point.y - element.height / 2) * (!media && element.flipY ? -1 : 1);
    const x = (rawX + skewX * rawY) * visual.scaleX;
    const y = (skewY * rawX + rawY) * visual.scaleY;
    return {
      ...point,
      x: element.x + element.width / 2 + visual.tx + x * cos - y * sin,
      y: element.y + element.height / 2 + visual.ty + x * sin + y * cos,
    };
  });
  const center = points.reduce(
    (sum, point) => ({
      x: sum.x + point.x / points.length,
      y: sum.y + point.y / points.length,
      u: sum.u + point.u / points.length,
      v: sum.v + point.v / points.length,
    }),
    { x: 0, y: 0, u: 0, v: 0 },
  );
  return {
    boundary: points,
    center,
    bounds: boundsOf(points),
    source: snapshot?.source ?? null,
    color: stroke ? element.stroke : element.fill,
    opacity:
      (visual.opacity ?? element.opacity / 100) *
      (media
        ? 1
        : (stroke
            ? (element.strokeOpacity ?? 100)
            : (element.fillOpacity ?? 100)) / 100),
  };
}

type Contact = {
  a: MediaLiquidPoint;
  b: MediaLiquidPoint;
  edgeA: number;
  edgeB: number;
  amountA: number;
  amountB: number;
  distance: number;
};
function projection(
  point: MediaLiquidPoint,
  a: MediaLiquidPoint,
  b: MediaLiquidPoint,
) {
  return clamp(
    ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) /
      Math.max(0.000001, (b.x - a.x) ** 2 + (b.y - a.y) ** 2),
    0,
    1,
  );
}

/** Exact nearest segment projections, bounded by 64 samples per source. */
export function closestMediaLiquidContact(
  a: MediaLiquidSurface,
  b: MediaLiquidSurface,
): Contact {
  let best: Contact = {
    a: a.boundary[0],
    b: b.boundary[0],
    edgeA: 0,
    edgeB: 0,
    amountA: 0,
    amountB: 0,
    distance: Infinity,
  };
  const consider = (
    edgeA: number,
    edgeB: number,
    amountA: number,
    amountB: number,
  ) => {
    const pa = mix(
      a.boundary[edgeA],
      a.boundary[(edgeA + 1) % a.boundary.length],
      amountA,
    );
    const pb = mix(
      b.boundary[edgeB],
      b.boundary[(edgeB + 1) % b.boundary.length],
      amountB,
    );
    const distance = Math.hypot(pa.x - pb.x, pa.y - pb.y);
    // Prefer the middle of the facing edges for parallel rectangles; first
    // corner wins would attach every ordinary image bridge at its top corner.
    const central =
      Math.hypot(pa.x - a.center.x, pa.y - a.center.y) +
      Math.hypot(pb.x - b.center.x, pb.y - b.center.y);
    const oldCentral =
      Math.hypot(best.a.x - a.center.x, best.a.y - a.center.y) +
      Math.hypot(best.b.x - b.center.x, best.b.y - b.center.y);
    if (
      distance < best.distance - 0.001 ||
      (Math.abs(distance - best.distance) < 0.001 && central < oldCentral)
    )
      best = { a: pa, b: pb, edgeA, edgeB, amountA, amountB, distance };
  };
  for (let i = 0; i < a.boundary.length; i += 1) {
    const aa = a.boundary[i],
      ab = a.boundary[(i + 1) % a.boundary.length];
    for (let j = 0; j < b.boundary.length; j += 1) {
      const ba = b.boundary[j],
        bb = b.boundary[(j + 1) % b.boundary.length];
      for (const t of [0, 0.5, 1]) {
        consider(i, j, t, projection(mix(aa, ab, t), ba, bb));
        consider(i, j, projection(mix(ba, bb, t), aa, ab), t);
      }
      const dx = ab.x - aa.x,
        dy = ab.y - aa.y;
      const ex = bb.x - ba.x,
        ey = bb.y - ba.y;
      const determinant = dx * ey - dy * ex;
      if (Math.abs(determinant) > 0.000001) {
        const ta = ((ba.x - aa.x) * ey - (ba.y - aa.y) * ex) / determinant;
        const tb = ((ba.x - aa.x) * dy - (ba.y - aa.y) * dx) / determinant;
        if (ta >= 0 && ta <= 1 && tb >= 0 && tb <= 1) consider(i, j, ta, tb);
      }
    }
  }
  return best;
}

function alongBoundary(
  surface: MediaLiquidSurface,
  edge: number,
  amount: number,
  offset: number,
) {
  const points = surface.boundary;
  const perimeter = points.reduce(
    (length, point, index) =>
      length +
      Math.hypot(
        point.x - points[(index + 1) % points.length].x,
        point.y - points[(index + 1) % points.length].y,
      ),
    0,
  );
  let remaining = Math.abs(offset) % Math.max(0.0001, perimeter);
  let index = edge;
  let at = amount;
  const direction = offset < 0 ? -1 : 1;
  for (let count = 0; count <= points.length; count += 1) {
    const a = points[index],
      b = points[(index + 1) % points.length];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const available = length * (direction > 0 ? 1 - at : at);
    if (remaining <= available && length > 0.0001)
      return mix(a, b, at + (remaining / length) * direction);
    remaining -= available;
    index = (index + direction + points.length) % points.length;
    at = direction > 0 ? 0 : 1;
  }
  return mix(points[edge], points[(edge + 1) % points.length], amount);
}

/** A narrow textured neck links facing surfaces without repainting originals.
 * The connector carries each source's own UVs; pixels are blended only inside
 * the new material between them. No raster readback or silhouette extraction. */
export function buildMediaLiquidBridge(
  a: MediaLiquidSurface,
  b: MediaLiquidSurface,
  width: number,
  smoothness: number,
): MediaLiquidGeometry | null {
  const inside = (point: MediaLiquidPoint, polygon: MediaLiquidPoint[]) => {
    let contained = false;
    for (
      let index = 0, before = polygon.length - 1;
      index < polygon.length;
      before = index, index += 1
    ) {
      const a = polygon[index],
        b = polygon[before];
      if (
        a.y > point.y !== b.y > point.y &&
        point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
      )
        contained = !contained;
    }
    return contained;
  };
  // One shape can fully contain the other without boundary intersections.
  // They already connect visually; a bridge inside them would repaint art.
  if (inside(a.boundary[0], b.boundary) || inside(b.boundary[0], a.boundary))
    return null;
  const contact = closestMediaLiquidContact(a, b);
  if (
    !Number.isFinite(contact.distance) ||
    contact.distance < 0.2 ||
    width <= 0
  )
    return null;
  const halfWidth = clamp(width / 2, 1, 160);
  const aBefore = alongBoundary(a, contact.edgeA, contact.amountA, -halfWidth);
  const aAfter = alongBoundary(a, contact.edgeA, contact.amountA, halfWidth);
  const bBefore = alongBoundary(b, contact.edgeB, contact.amountB, -halfWidth);
  const bAfter = alongBoundary(b, contact.edgeB, contact.amountB, halfWidth);
  const alignment =
    (aAfter.x - aBefore.x) * (bAfter.x - bBefore.x) +
      (aAfter.y - aBefore.y) * (bAfter.y - bBefore.y) <
    0
      ? -1
      : 1;
  const count = (MEDIA_LIQUID_COLUMNS + 1) * (MEDIA_LIQUID_ROWS + 1);
  const positions = new Float32Array(count * 3);
  const uvA = new Float32Array(count * 2),
    uvB = new Float32Array(count * 2),
    blend = new Float32Array(count * 2);
  const indices = new Uint16Array(MEDIA_LIQUID_COLUMNS * MEDIA_LIQUID_ROWS * 6);
  const all: MediaLiquidPoint[] = [];
  for (let row = 0; row <= MEDIA_LIQUID_ROWS; row += 1) {
    const s = row / MEDIA_LIQUID_ROWS;
    const offset = (s * 2 - 1) * halfWidth;
    const pa = alongBoundary(a, contact.edgeA, contact.amountA, offset);
    const pb = alongBoundary(
      b,
      contact.edgeB,
      contact.amountB,
      offset * alignment,
    );
    for (let column = 0; column <= MEDIA_LIQUID_COLUMNS; column += 1) {
      const index = row * (MEDIA_LIQUID_COLUMNS + 1) + column;
      const t = column / MEDIA_LIQUID_COLUMNS;
      const center = mix(contact.a, contact.b, t);
      const point = mix(pa, pb, t);
      const neck =
        1 - (0.25 + clamp(smoothness, 0, 1) * 0.4) * Math.sin(Math.PI * t);
      point.x = center.x + (point.x - center.x) * neck;
      point.y = center.y + (point.y - center.y) * neck;
      positions.set([point.x, point.y, 0], index * 3);
      // Draw from a thin interior strip instead of clamping to a potentially
      // transparent border texel, while preserving the sampled source alpha.
      uvA.set(
        [
          lerp(pa.u, a.center.u, 0.035 + t * 0.12),
          lerp(pa.v, a.center.v, 0.035 + t * 0.12),
        ],
        index * 2,
      );
      uvB.set(
        [
          lerp(pb.u, b.center.u, 0.035 + (1 - t) * 0.12),
          lerp(pb.v, b.center.v, 0.035 + (1 - t) * 0.12),
        ],
        index * 2,
      );
      blend.set([t, s], index * 2);
      all.push(point);
      if (row < MEDIA_LIQUID_ROWS && column < MEDIA_LIQUID_COLUMNS) {
        const below = index + MEDIA_LIQUID_COLUMNS + 1;
        indices.set(
          [index, below, index + 1, index + 1, below, below + 1],
          (row * MEDIA_LIQUID_COLUMNS + column) * 6,
        );
      }
    }
  }
  return {
    positions,
    uvA,
    uvB,
    blend,
    indices,
    bounds: boundsOf(all),
    gap: contact.distance,
  };
}
