/** Pure artboard-space proximity and relaxation for authored strand interactions. */

export type StrandPoint = { x: number; y: number };

export type StrandNeighborCandidate = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  anchor: "top" | "bottom" | "left" | "right";
  /** Artboard-space points along the original centerline, when available. */
  centerline?: StrandPoint[];
  /** Proximity radius in artboard pixels. */
  radius: number;
  /** Authored neighbor pull strength, 0..100. */
  strength: number;
};

export type StrandSpringState = {
  dx: number;
  dy: number;
  vx: number;
  vy: number;
};

export type StrandSpringSettings = {
  stiffness: number;
  damping: number;
  maxDisplacement: number;
};

export const RESTING_STRAND_SPRING: StrandSpringState = {
  dx: 0,
  dy: 0,
  vx: 0,
  vy: 0,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function rotate(point: StrandPoint, angle: number): StrandPoint {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: point.x * cosine - point.y * sine,
    y: point.x * sine + point.y * cosine,
  };
}

function inferredCenterline(candidate: StrandNeighborCandidate): StrandPoint[] {
  const center = {
    x: candidate.x + candidate.width / 2,
    y: candidate.y + candidate.height / 2,
  };
  const local =
    candidate.anchor === "left" || candidate.anchor === "right"
      ? [
          { x: -candidate.width / 2, y: 0 },
          { x: candidate.width / 2, y: 0 },
        ]
      : [
          { x: 0, y: -candidate.height / 2 },
          { x: 0, y: candidate.height / 2 },
        ];
  const angle = ((candidate.rotation ?? 0) * Math.PI) / 180;
  return local.map((point) => {
    const rotated = rotate(point, angle);
    return { x: center.x + rotated.x, y: center.y + rotated.y };
  });
}

function anchorCoordinate(
  point: StrandPoint,
  anchor: StrandNeighborCandidate["anchor"],
): number {
  switch (anchor) {
    case "top":
      return point.y;
    case "bottom":
      return -point.y;
    case "left":
      return point.x;
    case "right":
      return -point.x;
  }
}

/**
 * Returns desired local-pixel bend offsets for nearby strands. The actively
 * dragged source is omitted; off-radius strands receive a zero target so the
 * spring step can bring them back to rest. `centerline` is already in artboard
 * coordinates if supplied, while x/y/width/height/rotation are used otherwise.
 */
export function strandNeighborTargets(
  pointer: StrandPoint | null,
  source: { id: string } | null,
  candidates: StrandNeighborCandidate[],
): Map<string, StrandPoint> {
  const targets = new Map<string, StrandPoint>();
  for (const candidate of candidates) {
    if (candidate.id === source?.id) continue;
    const zero = { x: 0, y: 0 };
    if (!pointer || candidate.radius <= 0 || candidate.strength <= 0) {
      targets.set(candidate.id, zero);
      continue;
    }
    const line =
      candidate.centerline && candidate.centerline.length >= 2
        ? candidate.centerline
        : inferredCenterline(candidate);
    const lengths: number[] = [];
    let totalLength = 0;
    for (let index = 1; index < line.length; index += 1) {
      const length = Math.hypot(
        line[index].x - line[index - 1].x,
        line[index].y - line[index - 1].y,
      );
      lengths.push(length);
      totalLength += length;
    }
    if (totalLength < 0.0001) {
      targets.set(candidate.id, zero);
      continue;
    }

    let nearestDistance = Infinity;
    let nearest: StrandPoint = line[0];
    for (let index = 1; index < line.length; index += 1) {
      const from = line[index - 1];
      const to = line[index];
      const segmentLength = lengths[index - 1];
      if (segmentLength < 0.0001) continue;
      const vx = to.x - from.x;
      const vy = to.y - from.y;
      const fraction = clamp(
        ((pointer.x - from.x) * vx + (pointer.y - from.y) * vy) /
          (segmentLength * segmentLength),
        0,
        1,
      );
      const point = {
        x: from.x + vx * fraction,
        y: from.y + vy * fraction,
      };
      const distance = Math.hypot(pointer.x - point.x, pointer.y - point.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = point;
      }
    }
    if (nearestDistance >= candidate.radius) {
      targets.set(candidate.id, zero);
      continue;
    }

    const angle = -((candidate.rotation ?? 0) * Math.PI) / 180;
    const center = {
      x: candidate.x + candidate.width / 2,
      y: candidate.y + candidate.height / 2,
    };
    const localEndpoint = (point: StrandPoint) =>
      rotate({ x: point.x - center.x, y: point.y - center.y }, angle);
    const startIsAnchor =
      anchorCoordinate(localEndpoint(line[0]), candidate.anchor) <=
      anchorCoordinate(localEndpoint(line[line.length - 1]), candidate.anchor);
    const anchor = startIsAnchor ? line[0] : line[line.length - 1];
    const free = startIsAnchor ? line[line.length - 1] : line[0];
    const tangent = {
      x: (free.x - anchor.x) / Math.hypot(free.x - anchor.x, free.y - anchor.y),
      y: (free.y - anchor.y) / Math.hypot(free.x - anchor.x, free.y - anchor.y),
    };
    const normal = { x: -tangent.y, y: tangent.x };
    const lateral =
      (pointer.x - nearest.x) * normal.x + (pointer.y - nearest.y) * normal.y;
    const proximity = 1 - nearestDistance / candidate.radius;
    const smoothProximity = proximity * proximity * (3 - 2 * proximity);
    const magnitude =
      lateral * smoothProximity * clamp(candidate.strength / 100, 0, 1);
    const worldOffset = { x: normal.x * magnitude, y: normal.y * magnitude };
    // ShapeGraphic bends in element-local coordinates. CSS rotation happens
    // later, so undo the candidate's rotation here.
    targets.set(
      candidate.id,
      rotate(worldOffset, -((candidate.rotation ?? 0) * Math.PI) / 180),
    );
  }
  return targets;
}

/** Semi-implicit damped spring, with a bounded frame step for tab wake-ups. */
export function stepStrandSpring(
  state: StrandSpringState,
  target: StrandPoint,
  dtSeconds: number,
  settings: StrandSpringSettings,
): StrandSpringState {
  const dt = clamp(dtSeconds, 0, 1 / 30);
  if (dt === 0) return state;
  const omega = 5 + clamp(settings.stiffness, 0, 1) * 13;
  const dampingRatio = 0.28 + clamp(settings.damping, 0, 1) * 0.92;
  const next = { ...state };
  next.vx +=
    (omega * omega * (target.x - next.dx) -
      2 * dampingRatio * omega * next.vx) *
    dt;
  next.vy +=
    (omega * omega * (target.y - next.dy) -
      2 * dampingRatio * omega * next.vy) *
    dt;
  next.dx += next.vx * dt;
  next.dy += next.vy * dt;
  const length = Math.hypot(next.dx, next.dy);
  const limit = Math.max(0, settings.maxDisplacement);
  if (length > limit) {
    const scale = limit / length;
    next.dx *= scale;
    next.dy *= scale;
    next.vx *= scale;
    next.vy *= scale;
  }
  if (
    Math.hypot(target.x, target.y) < 0.001 &&
    Math.hypot(next.dx, next.dy) < 0.01 &&
    Math.hypot(next.vx, next.vy) < 0.01
  ) {
    return RESTING_STRAND_SPRING;
  }
  return next;
}
