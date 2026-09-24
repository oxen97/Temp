import { imageCropForElement } from "./image-crop";
import type { InteractionDefinition } from "./interaction-model";
import type {
  StrandAnchor,
  StrandBonePoint,
  StrandPose,
} from "./strand-bone-runtime";
import type { CanvasElement } from "../store/editor-store";

export const MEDIA_DEFORM_MAX_SEGMENTS = 48;
export const MEDIA_DEFORM_MAX_CANVAS_EDGE = 1024;
export const MEDIA_DEFORM_MAX_CANVAS_PIXELS = 524_288;

export type MediaDeformWave = {
  interaction: InteractionDefinition;
  localPointer: StrandBonePoint;
  normalizedPointer: StrandBonePoint;
  seconds: number;
  strength: number;
  elementIndex: number;
};

type SkinBinding = {
  segment: number;
  amount: number;
  offsetX: number;
  offsetY: number;
  tangentX: number;
  tangentY: number;
  restDistance: number;
};

export type MediaDeformMesh = {
  width: number;
  height: number;
  columns: number;
  rows: number;
  positions: Float32Array;
  local: Float32Array;
  uv: Float32Array;
  indices: Uint16Array;
  boundary: number[];
  flipX: boolean;
  flipY: boolean;
  bindings: SkinBinding[];
  boundRest: StrandBonePoint[] | null;
  restLength: number;
  tipLength: number;
};

export type MediaDeformBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

type MediaDeformOptions = { tipLength?: number; anchor?: StrandAnchor };

/** Keep a vertex on the tip/shaft boundary, so a triangle cannot stretch across
 * the protected cap. Vertex counts and UVs remain fixed during the gesture. */
function axisCoordinate(
  index: number,
  segments: number,
  extent: number,
  boundary?: number,
) {
  if (boundary === undefined) return (index / segments) * extent;
  const split = clamp(
    Math.round((boundary / extent) * segments),
    1,
    segments - 1,
  );
  return index <= split
    ? (index / split) * boundary
    : boundary + ((index - split) / (segments - split)) * (extent - boundary);
}

/** A fixed topology and UV buffer survive every animation frame. */
export function createMediaDeformMesh(
  element: CanvasElement,
  options: MediaDeformOptions = {},
): MediaDeformMesh {
  const width = Math.max(1, element.width);
  const height = Math.max(1, element.height);
  const columns = clamp(Math.ceil(width / 14), 8, MEDIA_DEFORM_MAX_SEGMENTS);
  const rows = clamp(Math.ceil(height / 14), 8, MEDIA_DEFORM_MAX_SEGMENTS);
  const count = (columns + 1) * (rows + 1);
  const positions = new Float32Array(count * 3);
  const local = new Float32Array(count * 2);
  const uv = new Float32Array(count * 2);
  const indices = new Uint16Array(columns * rows * 6);
  const crop = imageCropForElement(element);
  const tipLength = Number.isFinite(options.tipLength)
    ? Math.max(0, options.tipLength!)
    : 0;
  const horizontal = options.anchor === "left" || options.anchor === "right";
  const axisLength = horizontal ? width : height;
  const cap = Math.min(tipLength, axisLength / 2);
  const boundaryAt =
    options.anchor === "right" || options.anchor === "bottom"
      ? cap
      : axisLength - cap;
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      const index = row * (columns + 1) + column;
      const x = axisCoordinate(
        column,
        columns,
        width,
        cap > 0 && horizontal ? boundaryAt : undefined,
      );
      const y = axisCoordinate(
        row,
        rows,
        height,
        cap > 0 && !horizontal ? boundaryAt : undefined,
      );
      local[index * 2] = x;
      local[index * 2 + 1] = y;
      // CSS image crop: move the scaled source left/top inside the viewport.
      // Flips apply AFTER cropping, by mirroring positions, not the source UVs.
      uv[index * 2] = (x / crop.scaleX + crop.left) / crop.baseWidth;
      uv[index * 2 + 1] = 1 - (y / crop.scaleY + crop.top) / crop.baseHeight;
      if (row < rows && column < columns) {
        const start = (row * columns + column) * 6;
        const below = index + columns + 1;
        indices.set(
          [index, below, index + 1, index + 1, below, below + 1],
          start,
        );
      }
    }
  }
  const boundary: number[] = [];
  for (let column = 0; column <= columns; column += 1) boundary.push(column);
  for (let row = 1; row <= rows; row += 1)
    boundary.push(row * (columns + 1) + columns);
  for (let column = columns - 1; column >= 0; column -= 1)
    boundary.push(rows * (columns + 1) + column);
  for (let row = rows - 1; row > 0; row -= 1)
    boundary.push(row * (columns + 1));
  const mesh: MediaDeformMesh = {
    width,
    height,
    columns,
    rows,
    positions,
    local,
    uv,
    indices,
    boundary,
    flipX: element.flipX === true,
    flipY: element.flipY === true,
    bindings: [],
    boundRest: null,
    restLength: 0,
    tipLength,
  };
  updateMediaDeformMesh(mesh, null);
  return mesh;
}

function tangent(points: StrandBonePoint[], index: number) {
  const before = points[Math.max(0, index - 1)];
  const after = points[Math.min(points.length - 1, index + 1)];
  const length = Math.hypot(after.x - before.x, after.y - before.y);
  return length > 0.00001
    ? { x: (after.x - before.x) / length, y: (after.y - before.y) / length }
    : { x: 0, y: 1 };
}

function blendedTangent(
  points: StrandBonePoint[],
  index: number,
  amount: number,
) {
  const a = tangent(points, index);
  const b = tangent(points, index + 1);
  const x = a.x + (b.x - a.x) * amount;
  const y = a.y + (b.y - a.y) * amount;
  const length = Math.hypot(x, y);
  return length > 0.00001 ? { x: x / length, y: y / length } : a;
}

function bind(mesh: MediaDeformMesh, rest: StrandBonePoint[]) {
  mesh.boundRest = rest;
  mesh.bindings = [];
  const distances = cumulativeDistances(rest);
  mesh.restLength = distances[distances.length - 1];
  for (let index = 0; index < mesh.local.length; index += 2) {
    const x = mesh.local[index];
    const y = mesh.local[index + 1];
    let nearest = Infinity;
    let binding: SkinBinding = {
      segment: 0,
      amount: 0,
      offsetX: 0,
      offsetY: 0,
      tangentX: 0,
      tangentY: 1,
      restDistance: 0,
    };
    for (let segment = 0; segment < rest.length - 1; segment += 1) {
      const a = rest[segment];
      const b = rest[segment + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const amount = clamp(
        ((x - a.x) * dx + (y - a.y) * dy) /
          Math.max(0.00001, dx * dx + dy * dy),
        0,
        1,
      );
      const offsetX = x - (a.x + dx * amount);
      const offsetY = y - (a.y + dy * amount);
      const distance = offsetX * offsetX + offsetY * offsetY;
      if (distance < nearest) {
        nearest = distance;
        const direction = blendedTangent(rest, segment, amount);
        binding = {
          segment,
          amount,
          offsetX,
          offsetY,
          tangentX: direction.x,
          tangentY: direction.y,
          restDistance:
            distances[segment] +
            (distances[segment + 1] - distances[segment]) * amount,
        };
      }
    }
    mesh.bindings.push(binding);
  }
}

function cumulativeDistances(points: StrandBonePoint[]) {
  const distances = [0];
  for (let index = 1; index < points.length; index += 1) {
    distances.push(
      distances[index - 1] +
        Math.hypot(
          points[index].x - points[index - 1].x,
          points[index].y - points[index - 1].y,
        ),
    );
  }
  return distances;
}

/** Nine-slice-like longitudinal mapping: only the shaft stretches, while the
 * free cap retains its authored depth and rotates with the deformed centerline.
 * Under extreme compression shrink the cap safely instead of folding it. */
function tipPreservingBinding(
  mesh: MediaDeformMesh,
  pose: StrandPose,
  binding: SkinBinding,
  distances: number[],
) {
  const length = distances[distances.length - 1];
  const reverse = pose.anchorIndex !== 0;
  const fromAnchor = reverse
    ? mesh.restLength - binding.restDistance
    : binding.restDistance;
  const restCap = Math.min(mesh.tipLength, mesh.restLength / 2);
  const cap = Math.min(restCap, length / 2);
  const shaft = mesh.restLength - restCap;
  const mapped =
    fromAnchor <= shaft
      ? (fromAnchor / shaft) * (length - cap)
      : length - ((mesh.restLength - fromAnchor) / restCap) * cap;
  const target = reverse ? length - mapped : mapped;
  let low = 0;
  let high = distances.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (distances[middle] <= target) low = middle;
    else high = middle;
  }
  return {
    segment: low,
    amount: clamp(
      (target - distances[low]) /
        Math.max(0.00001, distances[high] - distances[low]),
      0,
      1,
    ),
  };
}

/** Bind a rectangular texture to the same centerline the strand solver moves.
 * Cross-sections rotate with that line, preserving material width through a bend.
 * Wave displacement is additive, so both authored effects remain visible. */
export function updateMediaDeformMesh(
  mesh: MediaDeformMesh,
  pose: StrandPose | null,
  wave?: MediaDeformWave,
): MediaDeformBounds {
  const usablePose =
    pose &&
    pose.rest.length >= 2 &&
    pose.points.length === pose.rest.length &&
    pose.points.every(
      (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
    )
      ? pose
      : null;
  if (usablePose && usablePose.rest !== mesh.boundRest)
    bind(mesh, usablePose.rest);
  const directions = usablePose
    ? usablePose.points.map((_, index) => tangent(usablePose.points, index))
    : [];
  const tipDistances =
    usablePose &&
    mesh.tipLength > 0 &&
    mesh.restLength > 0.00001 &&
    (usablePose.anchorIndex === 0 ||
      usablePose.anchorIndex === usablePose.rest.length - 1)
      ? cumulativeDistances(usablePose.points)
      : null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let index = 0; index < mesh.local.length / 2; index += 1) {
    const restX = mesh.local[index * 2];
    const restY = mesh.local[index * 2 + 1];
    let x = restX;
    let y = restY;
    if (usablePose) {
      const binding = mesh.bindings[index];
      const { segment, amount } = tipDistances
        ? tipPreservingBinding(mesh, usablePose, binding, tipDistances)
        : binding;
      const a = usablePose.points[segment];
      const b = usablePose.points[segment + 1];
      const ta = directions[segment];
      const tb = directions[segment + 1];
      const tx = ta.x + (tb.x - ta.x) * amount;
      const ty = ta.y + (tb.y - ta.y) * amount;
      const length = Math.max(0.00001, Math.hypot(tx, ty));
      const cos = (tx * binding.tangentX + ty * binding.tangentY) / length;
      const sin = (ty * binding.tangentX - tx * binding.tangentY) / length;
      x =
        a.x +
        (b.x - a.x) * amount +
        binding.offsetX * cos -
        binding.offsetY * sin;
      y =
        a.y +
        (b.y - a.y) * amount +
        binding.offsetX * sin +
        binding.offsetY * cos;
    }
    if (wave) {
      const settings = wave.interaction;
      const distance = Math.hypot(
        restX - wave.localPointer.x,
        restY - wave.localPointer.y,
      );
      const influence =
        Math.exp(-0.5 * (distance / Math.max(1, settings.waveFalloff)) ** 2) *
        wave.strength;
      const weight = Math.max(0, Math.sin((Math.PI * restX) / mesh.width));
      const phase =
        (restX / Math.max(1, settings.waveLength) -
          wave.seconds * settings.waveSpeed) *
          Math.PI *
          2 +
        (wave.elementIndex * settings.wavePhaseSpread * Math.PI) / 180;
      x +=
        wave.normalizedPointer.x * settings.wavePointerX * influence * weight;
      y +=
        (Math.sin(phase) * settings.waveAmplitude * (0.35 + 0.65 * influence) +
          wave.normalizedPointer.y * settings.wavePointerY * influence) *
        weight;
    }
    if (mesh.flipX) x = mesh.width - x;
    if (mesh.flipY) y = mesh.height - y;
    mesh.positions[index * 3] = x;
    mesh.positions[index * 3 + 1] = y;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
}

export function mediaDeformHitPath(mesh: MediaDeformMesh): string {
  return (
    mesh.boundary
      .map(
        (index, order) =>
          `${order ? "L" : "M"}${Math.round(mesh.positions[index * 3] * 100) / 100} ${Math.round(mesh.positions[index * 3 + 1] * 100) / 100}`,
      )
      .join(" ") + " Z"
  );
}

/** Both per-object copies and the single shared GPU surface have hard budgets. */
export function mediaDeformCanvasSize(
  bounds: MediaDeformBounds,
  pixelRatio: number,
) {
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);
  const ratio = Math.min(
    clamp(pixelRatio, 1, 2),
    MEDIA_DEFORM_MAX_CANVAS_EDGE / width,
    MEDIA_DEFORM_MAX_CANVAS_EDGE / height,
    Math.sqrt(MEDIA_DEFORM_MAX_CANVAS_PIXELS / (width * height)),
  );
  return {
    width: Math.max(1, Math.floor(width * ratio)),
    height: Math.max(1, Math.floor(height * ratio)),
  };
}
