import type { VectorPath } from "@/features/editor/lib/vector-types";

export type StrandBonePoint = { x: number; y: number };
export type StrandAnchor = "top" | "bottom" | "left" | "right";

/** All coordinates are element-local artboard pixels; no authored points mutate. */
export type StrandPose = {
  rest: StrandBonePoint[];
  points: StrandBonePoint[];
  velocities: StrandBonePoint[];
  anchorIndex: number;
};

export type StrandAttractor = {
  point: StrandBonePoint;
  radius: number;
  /** 0..100 */
  strength: number;
};

export type StrandPoseStep = {
  dt: number;
  /** A hard constraint. Use pointerLocal - closestStrandBone.offset. */
  grab?: { index: number; target: StrandBonePoint };
  /** Preserve a smooth tangent through a neighboring strand's merge contact. */
  grabProfile?: "material" | "fluid";
  /** The furthest the free end of a fully rigid strand may leave its rest tip. */
  maxDisplacement?: number;
  pointerForce?: {
    pointer: StrandBonePoint;
    radius: number;
    strength: number;
  };
  /** Generic external attractors, e.g. from a nearby liquid-merge partner. */
  attractors?: StrandAttractor[];
  /** Normalized authored values, 0..1. */
  stiffness: number;
  damping: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const copy = (point: StrandBonePoint): StrandBonePoint => ({ ...point });

/** Transfer a passing pointer's horizontal momentum through a hanging strand.
 * Unlike a grab, this never pins a bone to the pointer or moves its anchor.
 */
export function applyStrandSwipeImpulse(
  pose: StrandPose,
  deltaX: number,
  strength: number,
): StrandPose {
  if (!pose.points.length || !Number.isFinite(deltaX) || strength <= 0)
    return pose;
  const impulse = clamp(deltaX, -70, 70) * 12 * clamp(strength, 0, 1);
  if (Math.abs(impulse) < 0.01) return pose;
  const lastIndex = Math.max(1, pose.points.length - 1);
  const points = pose.points.map(copy);
  const velocities = pose.velocities.map(copy);
  for (let index = 0; index < points.length; index += 1) {
    if (index === pose.anchorIndex) continue;
    const progress = Math.abs(index - pose.anchorIndex) / lastIndex;
    const weight = progress ** 2.2;
    velocities[index].x += impulse * weight;
    points[index].x += (impulse / 12) * weight * 0.18;
  }
  // Cap the connected motion together. Clipping individual bones makes the
  // fastest part of the free end flatten while the middle keeps bending.
  const maximumSpeed = Math.max(
    ...velocities.map((velocity) => Math.abs(velocity.x)),
  );
  if (maximumSpeed > 850) {
    const ratio = 850 / maximumSpeed;
    for (const velocity of velocities) velocity.x *= ratio;
  }
  return { ...pose, points, velocities };
}

/** Enforce authored reach, optionally preserving the connected swipe shape. */
export function limitStrandPoseDisplacement(
  pose: StrandPose,
  maxDisplacement: number,
  options: { preserveShape?: boolean } = {},
): StrandPose {
  const limit = Math.max(0, maxDisplacement);
  if (options.preserveShape) {
    const maximum = Math.max(
      0,
      ...pose.points.map((point, index) =>
        Math.hypot(point.x - pose.rest[index].x, point.y - pose.rest[index].y),
      ),
    );
    if (maximum <= limit) return pose;
    const ratio = limit / Math.max(0.0001, maximum);
    return {
      ...pose,
      points: pose.points.map((point, index) => ({
        x: pose.rest[index].x + (point.x - pose.rest[index].x) * ratio,
        y: pose.rest[index].y + (point.y - pose.rest[index].y) * ratio,
      })),
      velocities: pose.velocities.map((velocity) => ({
        x: velocity.x * ratio,
        y: velocity.y * ratio,
      })),
    };
  }
  const points = pose.points.map((point, index) => {
    const rest = pose.rest[index];
    const dx = point.x - rest.x;
    const dy = point.y - rest.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= limit) return point;
    const ratio = limit / Math.max(0.0001, distance);
    return { x: rest.x + dx * ratio, y: rest.y + dy * ratio };
  });
  if (points.every((point, index) => point === pose.points[index])) return pose;
  return {
    ...pose,
    points,
    velocities: pose.velocities.map((velocity, index) =>
      points[index] === pose.points[index] ? velocity : { x: 0, y: 0 },
    ),
  };
}

function interpolate(
  from: StrandBonePoint,
  to: StrandBonePoint,
  amount: number,
): StrandBonePoint {
  return {
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount,
  };
}

function cubic(
  a: StrandBonePoint,
  b: StrandBonePoint,
  c: StrandBonePoint,
  d: StrandBonePoint,
  amount: number,
): StrandBonePoint {
  const inverse = 1 - amount;
  return {
    x:
      inverse ** 3 * a.x +
      3 * inverse ** 2 * amount * b.x +
      3 * inverse * amount ** 2 * c.x +
      amount ** 3 * d.x,
    y:
      inverse ** 3 * a.y +
      3 * inverse ** 2 * amount * b.y +
      3 * inverse * amount ** 2 * c.y +
      amount ** 3 * d.y,
  };
}

function anchorCoordinate(point: StrandBonePoint, anchor: StrandAnchor) {
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

/** Sample an authored open path at near-uniform arc-length spacing. */
export function createStrandPose(
  path: VectorPath,
  options: { anchor: StrandAnchor; spacing?: number },
): StrandPose {
  const empty: StrandPose = {
    rest: [],
    points: [],
    velocities: [],
    anchorIndex: -1,
  };
  if (path.closed || path.points.length < 2) return empty;
  const spacing = clamp(options.spacing ?? 12, 4, 48);
  const dense: StrandBonePoint[] = [copy(path.points[0])];
  for (let index = 1; index < path.points.length; index += 1) {
    const from = path.points[index - 1];
    const to = path.points[index];
    const first = from.handleOut ?? interpolate(from, to, 1 / 3);
    const second = to.handleIn ?? interpolate(from, to, 2 / 3);
    const controlLength =
      Math.hypot(first.x - from.x, first.y - from.y) +
      Math.hypot(second.x - first.x, second.y - first.y) +
      Math.hypot(to.x - second.x, to.y - second.y);
    const samples = clamp(Math.ceil(controlLength / (spacing / 3)), 1, 512);
    for (let step = 1; step <= samples; step += 1) {
      dense.push(cubic(from, first, second, to, step / samples));
    }
  }

  const cumulative = [0];
  for (let index = 1; index < dense.length; index += 1) {
    cumulative.push(
      cumulative[index - 1] +
        Math.hypot(
          dense[index].x - dense[index - 1].x,
          dense[index].y - dense[index - 1].y,
        ),
    );
  }
  const total = cumulative[cumulative.length - 1];
  if (total < 0.0001) return empty;
  const count = Math.max(1, Math.ceil(total / spacing));
  const rest: StrandBonePoint[] = [];
  let segment = 1;
  for (let index = 0; index <= count; index += 1) {
    const distance = (total * index) / count;
    while (segment < cumulative.length - 1 && cumulative[segment] < distance) {
      segment += 1;
    }
    const before = cumulative[segment - 1];
    const after = cumulative[segment];
    rest.push(
      interpolate(
        dense[segment - 1],
        dense[segment],
        after > before ? (distance - before) / (after - before) : 0,
      ),
    );
  }
  const anchorIndex =
    anchorCoordinate(rest[0], options.anchor) <=
    anchorCoordinate(rest[rest.length - 1], options.anchor)
      ? 0
      : rest.length - 1;
  return {
    rest,
    points: rest.map(copy),
    velocities: rest.map(() => ({ x: 0, y: 0 })),
    anchorIndex,
  };
}

/** Nearest movable bone and the initial pointer-to-bone offset. */
export function closestStrandBone(
  pose: StrandPose,
  localPoint: StrandBonePoint,
): { index: number; offset: StrandBonePoint } {
  let index = -1;
  let distance = Infinity;
  pose.points.forEach((point, candidate) => {
    if (candidate === pose.anchorIndex) return;
    const next = Math.hypot(localPoint.x - point.x, localPoint.y - point.y);
    if (next < distance) {
      distance = next;
      index = candidate;
    }
  });
  return {
    index,
    offset:
      index < 0
        ? { x: 0, y: 0 }
        : {
            x: localPoint.x - pose.points[index].x,
            y: localPoint.y - pose.points[index].y,
          },
  };
}

function lateralPull(
  points: StrandBonePoint[],
  index: number,
  attractor: StrandAttractor,
): StrandBonePoint {
  if (attractor.radius <= 0 || attractor.strength <= 0) return { x: 0, y: 0 };
  const point = points[index];
  const distance = Math.hypot(
    attractor.point.x - point.x,
    attractor.point.y - point.y,
  );
  if (distance >= attractor.radius) return { x: 0, y: 0 };
  const before = points[Math.max(0, index - 1)];
  const after = points[Math.min(points.length - 1, index + 1)];
  const tangentLength = Math.hypot(after.x - before.x, after.y - before.y);
  if (tangentLength < 0.0001) return { x: 0, y: 0 };
  const normal = {
    x: -(after.y - before.y) / tangentLength,
    y: (after.x - before.x) / tangentLength,
  };
  const signed =
    (attractor.point.x - point.x) * normal.x +
    (attractor.point.y - point.y) * normal.y;
  const proximity = 1 - distance / attractor.radius;
  const weight =
    proximity *
    proximity *
    (3 - 2 * proximity) *
    clamp(attractor.strength / 100, 0, 1);
  return { x: normal.x * signed * weight, y: normal.y * signed * weight };
}

/**
 * A grab is a material point on a connected strand, not an isolated vertex.
 * The segment below the grab inherits its displacement, while the segment
 * between the fixed anchor and the grab bends gradually. Arc length (rather
 * than node index) keeps the bend even on non-uniform authored paths.
 */
function grabInfluence(
  rest: StrandBonePoint[],
  anchorIndex: number,
  grabbedIndex: number,
  profile: "material" | "fluid" = "material",
): number[] {
  const direction = grabbedIndex > anchorIndex ? 1 : -1;
  const distanceToGrab = rest.slice(
    Math.min(anchorIndex, grabbedIndex),
    Math.max(anchorIndex, grabbedIndex) + 1,
  );
  let anchorToGrab = 0;
  for (let index = 1; index < distanceToGrab.length; index += 1) {
    anchorToGrab += Math.hypot(
      distanceToGrab[index].x - distanceToGrab[index - 1].x,
      distanceToGrab[index].y - distanceToGrab[index - 1].y,
    );
  }
  if (anchorToGrab < 0.0001) {
    anchorToGrab = Math.abs(grabbedIndex - anchorIndex);
  }
  let totalLength = 0;
  for (let index = anchorIndex + direction; index >= 0 && index < rest.length; index += direction) {
    totalLength += Math.hypot(
      rest[index].x - rest[index - direction].x,
      rest[index].y - rest[index - direction].y,
    );
  }
  const contactProgress = clamp(anchorToGrab / Math.max(totalLength, 0.0001), 0.0001, 1);
  const freeEndInfluence = 1.28;
  const contactSlope = Math.min(
    2 / contactProgress,
    (3 * (freeEndInfluence - 1)) / Math.max(0.0001, 1 - contactProgress),
  );
  const hermite = (
    amount: number,
    start: number,
    end: number,
    startSlope: number,
    endSlope: number,
    span: number,
  ) => {
    const t2 = amount * amount;
    const t3 = t2 * amount;
    return (
      (2 * t3 - 3 * t2 + 1) * start +
      (t3 - 2 * t2 + amount) * span * startSlope +
      (-2 * t3 + 3 * t2) * end +
      (t3 - t2) * span * endSlope
    );
  };
  let distance = 0;
  const influence = rest.map(() => 0);
  for (
    let index = anchorIndex + direction;
    index >= 0 && index < rest.length;
    index += direction
  ) {
    const before = rest[index - direction];
    distance += Math.hypot(
      rest[index].x - before.x,
      rest[index].y - before.y,
    );
    if (profile === "fluid" && contactProgress < 0.9999) {
      const progress = clamp(distance / Math.max(totalLength, 0.0001), 0, 1);
      influence[index] = progress <= contactProgress
        ? hermite(progress / contactProgress, 0, 1, 0, contactSlope, contactProgress)
        : hermite(
            (progress - contactProgress) / (1 - contactProgress),
            1,
            freeEndInfluence,
            contactSlope,
            0,
            1 - contactProgress,
          );
    } else {
      const progress = clamp(distance / anchorToGrab, 0, 1);
      // Match the tangent of the anchored and freely translated portions at
      // both ends. A linear profile made the material grab a visible corner.
      influence[index] = progress * progress * (3 - 2 * progress);
    }
  }
  return influence;
}

/**
 * A neighboring strand is a connected ribbon, not a collection of unrelated
 * particles. Find where an external field pulls hardest, then carry that
 * lateral displacement along the free end just as a material grab would.
 * This avoids the narrow bulge produced by applying the field bone by bone.
 */
function distributedAttraction(
  pose: StrandPose,
  points: StrandBonePoint[],
  attractors: StrandAttractor[],
): { displacement: StrandBonePoint[]; active: boolean } {
  const displacement = points.map(() => ({ x: 0, y: 0 }));
  let active = false;
  for (const attractor of attractors) {
    let strongestIndex = -1;
    let strongest = { x: 0, y: 0 };
    let strongestLength = 0;
    for (let index = 0; index < points.length; index += 1) {
      if (index === pose.anchorIndex) continue;
      const pull = lateralPull(points, index, attractor);
      const length = Math.hypot(pull.x, pull.y);
      if (length > strongestLength) {
        strongestIndex = index;
        strongest = pull;
        strongestLength = length;
      }
    }
    if (strongestIndex < 0 || strongestLength < 0.0001) continue;
    active = true;
    const influence = grabInfluence(
      pose.rest,
      pose.anchorIndex,
      strongestIndex,
    );
    for (let index = 0; index < points.length; index += 1) {
      const amount = influence[index];
      displacement[index].x += strongest.x * amount;
      displacement[index].y += strongest.y * amount;
    }
  }
  // Several nearby strands may pull this one at once. Keep their forces
  // additive at ordinary distances, but saturate the combined displacement
  // before it can fold one part of the ribbon through its neighbors.
  if (attractors.length > 1) {
    const maximum = Math.max(
      16,
      Math.min(90, Math.max(...attractors.map((attractor) => attractor.radius)) * 0.7),
    );
    for (const delta of displacement) {
      const length = Math.hypot(delta.x, delta.y);
      if (length > maximum) {
        delta.x = (delta.x / length) * maximum;
        delta.y = (delta.y / length) * maximum;
      }
    }
  }
  return { displacement, active };
}

/** At full authored stiffness, a straight strand behaves like one hinged rod. */
function stepRigidLinePose(pose: StrandPose, step: StrandPoseStep, dt: number): StrandPose {
  const anchor = pose.anchorIndex;
  const free = anchor === 0 ? pose.rest.length - 1 : 0;
  const root = pose.rest[anchor];
  const restTip = pose.rest[free];
  const length = Math.hypot(restTip.x - root.x, restTip.y - root.y);
  if (length < 0.0001) return pose;
  const fractions = pose.rest.map((point) =>
    clamp(Math.hypot(point.x - root.x, point.y - root.y) / length, 0, 1),
  );
  const currentTip = pose.points[free];
  const velocity = copy(pose.velocities[free]);
  let tip = copy(currentTip);
  if (step.grab && step.grab.index !== anchor && fractions[step.grab.index] > 0.0001) {
    const fraction = fractions[step.grab.index];
    const desired = {
      x: root.x + (step.grab.target.x - root.x) / fraction,
      y: root.y + (step.grab.target.y - root.y) / fraction,
    };
    const axis = {
      x: (restTip.x - root.x) / length,
      y: (restTip.y - root.y) / length,
    };
    const axial = (desired.x - root.x) * axis.x + (desired.y - root.y) * axis.y;
    if (axial < length * 0.25) {
      desired.x += axis.x * (length * 0.25 - axial);
      desired.y += axis.y * (length * 0.25 - axial);
    }
    const max = step.maxDisplacement ?? Infinity;
    const dx = desired.x - restTip.x;
    const dy = desired.y - restTip.y;
    const distance = Math.hypot(dx, dy);
    if (distance > max) {
      desired.x = restTip.x + (dx / distance) * max;
      desired.y = restTip.y + (dy / distance) * max;
    }
    if (dt > 0) {
      const moveX = desired.x - currentTip.x;
      const moveY = desired.y - currentTip.y;
      const speed = Math.hypot(moveX, moveY) / dt;
      if (speed > 0.1) {
        const capped = Math.min(speed, 1400);
        velocity.x = (moveX / Math.hypot(moveX, moveY)) * capped;
        velocity.y = (moveY / Math.hypot(moveX, moveY)) * capped;
      } else {
        const decay = Math.exp(-dt * 16);
        velocity.x *= decay;
        velocity.y *= decay;
      }
    }
    tip = desired;
  } else if (dt > 0) {
    const omega = 10 + clamp(step.stiffness, 0, 1) * 15;
    const dampingRatio = 0.2 + clamp(step.damping, 0, 1) * 0.85;
    const friction = 2 * dampingRatio * omega;
    velocity.x += (-omega * omega * (tip.x - restTip.x) - friction * velocity.x) * dt;
    velocity.y += (-omega * omega * (tip.y - restTip.y) - friction * velocity.y) * dt;
    tip.x += velocity.x * dt;
    tip.y += velocity.y * dt;
    if (
      Math.hypot(tip.x - restTip.x, tip.y - restTip.y) < 0.01 &&
      Math.hypot(velocity.x, velocity.y) < 0.01
    ) {
      tip = copy(restTip);
      velocity.x = 0;
      velocity.y = 0;
    }
  }
  return {
    ...pose,
    points: fractions.map((fraction) => ({
      x: root.x + (tip.x - root.x) * fraction,
      y: root.y + (tip.y - root.y) * fraction,
    })),
    velocities: fractions.map((fraction) => ({
      x: velocity.x * fraction,
      y: velocity.y * fraction,
    })),
  };
}

/**
 * Step a deformable strand. The anchor and grabbed bone are hard constraints;
 * every other bone has a damped rest spring plus neighbor coupling. External
 * attraction is lateral to the strand, preventing neighboring lines from
 * collapsing lengthwise toward a pointer or a liquid-merge partner.
 */
export function stepStrandPose(
  pose: StrandPose,
  step: StrandPoseStep,
): StrandPose {
  if (pose.points.length === 0) return pose;
  const dt = clamp(step.dt, 0, 1 / 30);
  if (
    step.stiffness >= 0.98 &&
    step.grabProfile !== "fluid" &&
    !step.pointerForce &&
    !step.attractors?.length &&
    pose.anchorIndex >= 0 &&
    pose.rest.length > 1
  ) {
    const anchor = pose.rest[pose.anchorIndex];
    const free = pose.rest[pose.anchorIndex === 0 ? pose.rest.length - 1 : 0];
    const dx = free.x - anchor.x;
    const dy = free.y - anchor.y;
    const length = Math.hypot(dx, dy);
    if (
      length > 0.0001 &&
      pose.rest.every((point) =>
        Math.abs((point.x - anchor.x) * dy - (point.y - anchor.y) * dx) / length < 0.5,
      )
    ) {
      return stepRigidLinePose(pose, step, dt);
    }
  }
  const points = pose.points.map(copy);
  const velocities = pose.velocities.map(copy);
  const anchorIndex = pose.anchorIndex;
  const grabbedIndex =
    step.grab &&
    step.grab.index >= 0 &&
    step.grab.index < points.length &&
    step.grab.index !== anchorIndex
      ? step.grab.index
      : -1;
  const influence =
    grabbedIndex >= 0
      ? grabInfluence(pose.rest, anchorIndex, grabbedIndex, step.grabProfile)
      : undefined;
  const grabDisplacement =
    grabbedIndex >= 0 && step.grab
      ? {
          x: step.grab.target.x - pose.rest[grabbedIndex].x,
          y: step.grab.target.y - pose.rest[grabbedIndex].y,
        }
      : { x: 0, y: 0 };
  // A hard-pinned bone still carries the velocity of the hand. Keeping that
  // velocity gives the free end a short, damped follow-through on release.
  // An unchanged pointer should gradually lose momentum, not erase it on the
  // next animation frame (pointer events and rAF may both step this pose).
  if (grabbedIndex >= 0 && step.grab && dt > 0) {
    const dx = step.grab.target.x - points[grabbedIndex].x;
    const dy = step.grab.target.y - points[grabbedIndex].y;
    const speed = Math.hypot(dx, dy) / dt;
    if (speed > 0.1) {
      const capped = Math.min(speed, 900);
      velocities[grabbedIndex] = {
        x: (dx / Math.hypot(dx, dy)) * capped,
        y: (dy / Math.hypot(dx, dy)) * capped,
      };
    } else {
      const decay = Math.exp(-dt * 10);
      velocities[grabbedIndex].x *= decay;
      velocities[grabbedIndex].y *= decay;
    }
  }
  if (influence && step.grab) {
    const deltaX = step.grab.target.x - points[grabbedIndex].x;
    const deltaY = step.grab.target.y - points[grabbedIndex].y;
    for (let index = 0; index < points.length; index += 1) {
      if (index === anchorIndex || index === grabbedIndex) continue;
      points[index].x += deltaX * influence[index];
      points[index].y += deltaY * influence[index];
    }
  }
  if (anchorIndex >= 0) {
    points[anchorIndex] = copy(pose.rest[anchorIndex]);
    velocities[anchorIndex] = { x: 0, y: 0 };
  }
  if (grabbedIndex >= 0 && step.grab) {
    points[grabbedIndex] = copy(step.grab.target);
  }
  if (dt === 0) return { ...pose, points, velocities };

  const stiffness = clamp(step.stiffness, 0, 1);
  const damping = clamp(step.damping, 0, 1);
  const omega = 5 + stiffness * 13;
  const spring = omega * omega;
  // The authored damping still slows the strand, but ordinary values retain
  // a little underdamped sway instead of making every release overdamped.
  const dampingFactor = 2 * (0.12 + damping * 0.82) * omega;
  const attractors: StrandAttractor[] = [
    ...(step.pointerForce
      ? [{ ...step.pointerForce, point: step.pointerForce.pointer }]
      : []),
    ...(step.attractors ?? []),
  ];
  const attraction = distributedAttraction(pose, points, attractors);
  const nextPoints = points.map(copy);
  for (let index = 0; index < points.length; index += 1) {
    if (index === anchorIndex || index === grabbedIndex) continue;
    const point = points[index];
    const rest = pose.rest[index];
    const beforeIndex = Math.max(0, index - 1);
    const afterIndex = Math.min(points.length - 1, index + 1);
    const neighborDx =
      (points[beforeIndex].x -
        pose.rest[beforeIndex].x +
        (points[afterIndex].x - pose.rest[afterIndex].x)) /
      2;
    const neighborDy =
      (points[beforeIndex].y -
        pose.rest[beforeIndex].y +
        (points[afterIndex].y - pose.rest[afterIndex].y)) /
      2;
    const guidedX = grabDisplacement.x * (influence?.[index] ?? 0);
    const guidedY = grabDisplacement.y * (influence?.[index] ?? 0);
    const fluidGrab = step.grabProfile === "fluid" && influence !== undefined;
    const targetX =
      rest.x +
      guidedX * (fluidGrab ? 1 : 0.28) +
      neighborDx * (fluidGrab ? 0 : 0.72) +
      attraction.displacement[index].x;
    const targetY =
      rest.y +
      guidedY * (fluidGrab ? 1 : 0.28) +
      neighborDy * (fluidGrab ? 0 : 0.72) +
      attraction.displacement[index].y;
    const velocity = velocities[index];
    velocity.x +=
      (spring * (targetX - point.x) - dampingFactor * velocity.x) * dt;
    velocity.y +=
      (spring * (targetY - point.y) - dampingFactor * velocity.y) * dt;
    nextPoints[index] = {
      x: point.x + velocity.x * dt,
      y: point.y + velocity.y * dt,
    };
  }
  if (anchorIndex >= 0) nextPoints[anchorIndex] = copy(pose.rest[anchorIndex]);
  if (grabbedIndex >= 0 && step.grab) {
    nextPoints[grabbedIndex] = copy(step.grab.target);
  }

  if (grabbedIndex < 0 && !attraction.active) {
    const settled = nextPoints.every(
      (point, index) =>
        Math.hypot(point.x - pose.rest[index].x, point.y - pose.rest[index].y) <
          0.01 && Math.hypot(velocities[index].x, velocities[index].y) < 0.01,
    );
    if (settled) {
      return {
        ...pose,
        points: pose.rest.map(copy),
        velocities: pose.rest.map(() => ({ x: 0, y: 0 })),
      };
    }
  }
  return { ...pose, points: nextPoints, velocities };
}

const coordinate = (value: number) => String(Math.round(value * 1000) / 1000);

function smoothSegments(points: StrandBonePoint[]): string {
  let path = "";
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const current = points[index];
    const next = points[index + 1];
    const following = points[Math.min(points.length - 1, index + 2)];
    const chordX = next.x - current.x;
    const chordY = next.y - current.y;
    const chordLength = Math.hypot(chordX, chordY);
    const safeHandle = (x: number, y: number): StrandBonePoint => {
      if (chordLength < 0.0001) return { x: 0, y: 0 };
      // The unconstrained Catmull-Rom handle can be longer than the current
      // bone interval at a sudden bend. Bound it to this interval and reject
      // backward-facing tangents so a cubic cannot overshoot into a loop.
      const along = x * chordX + y * chordY;
      if (along < 0) return { x: 0, y: 0 };
      const length = Math.hypot(x, y);
      const maximum = chordLength * 0.32;
      const scale = length > maximum ? maximum / length : 1;
      return { x: x * scale, y: y * scale };
    };
    const firstHandle = safeHandle(
      (next.x - previous.x) / 6,
      (next.y - previous.y) / 6,
    );
    const secondHandle = safeHandle(
      (following.x - current.x) / 6,
      (following.y - current.y) / 6,
    );
    const first = {
      x: current.x + firstHandle.x,
      y: current.y + firstHandle.y,
    };
    const second = {
      x: next.x - secondHandle.x,
      y: next.y - secondHandle.y,
    };
    path += ` C ${coordinate(first.x)} ${coordinate(first.y)} ${coordinate(second.x)} ${coordinate(second.y)} ${coordinate(next.x)} ${coordinate(next.y)}`;
  }
  return path;
}

/** Smooth Catmull-Rom cubic path through every bone, including the grab knot. */
export function strandPosePath(pose: StrandPose): string {
  const points = pose.points;
  if (points.length === 0) return "";
  return `M ${coordinate(points[0].x)} ${coordinate(points[0].y)}${smoothSegments(points)}`;
}

/**
 * Closed, filled ribbon around the current centerline. `width` is the authored
 * Stroke width in element-local pixels. A subtle end taper and movement bulge
 * make the strand feel soft without changing the authored stroke setting.
 */
export function strandPoseRibbonPath(pose: StrandPose, width: number): string {
  const points = pose.points;
  if (
    points.length < 2 ||
    !Number.isFinite(width) ||
    width <= 0 ||
    points.some(
      (point) => !Number.isFinite(point.x) || !Number.isFinite(point.y),
    )
  ) {
    return "";
  }
  const pathLength = points.reduce(
    (length, point, index) =>
      index === 0
        ? length
        : length +
          Math.hypot(
            point.x - points[index - 1].x,
            point.y - points[index - 1].y,
          ),
    0,
  );
  if (pathLength < 0.0001) return "";

  const tangents: StrandBonePoint[] = points.map((point, index) => {
    let before = Math.max(0, index - 1);
    let after = Math.min(points.length - 1, index + 1);
    while (
      before > 0 &&
      Math.hypot(point.x - points[before].x, point.y - points[before].y) <
        0.0001
    ) {
      before -= 1;
    }
    while (
      after < points.length - 1 &&
      Math.hypot(points[after].x - point.x, points[after].y - point.y) < 0.0001
    ) {
      after += 1;
    }
    const dx = points[after].x - points[before].x;
    const dy = points[after].y - points[before].y;
    const length = Math.hypot(dx, dy);
    return length > 0.0001
      ? { x: dx / length, y: dy / length }
      : { x: 0, y: 1 };
  });
  const radii = points.map((point, index) => {
    const amount = index / (points.length - 1);
    const middle = Math.sin(Math.PI * amount);
    const rest = pose.rest[index] ?? point;
    const movement = Math.hypot(point.x - rest.x, point.y - rest.y);
    const bulge = Math.min(0.06, movement / Math.max(1, width * 12));
    return (width / 2) * (0.9 + middle * (0.1 + bulge));
  });
  const left = points.map((point, index) => ({
    x: point.x - tangents[index].y * radii[index],
    y: point.y + tangents[index].x * radii[index],
  }));
  const right = points.map((point, index) => ({
    x: point.x + tangents[index].y * radii[index],
    y: point.y - tangents[index].x * radii[index],
  }));
  const last = points.length - 1;
  const endCap = (4 / 3) * radii[last];
  const startCap = (4 / 3) * radii[0];
  const endFirst = {
    x: left[last].x + tangents[last].x * endCap,
    y: left[last].y + tangents[last].y * endCap,
  };
  const endSecond = {
    x: right[last].x + tangents[last].x * endCap,
    y: right[last].y + tangents[last].y * endCap,
  };
  const startFirst = {
    x: right[0].x - tangents[0].x * startCap,
    y: right[0].y - tangents[0].y * startCap,
  };
  const startSecond = {
    x: left[0].x - tangents[0].x * startCap,
    y: left[0].y - tangents[0].y * startCap,
  };
  return [
    `M ${coordinate(left[0].x)} ${coordinate(left[0].y)}`,
    smoothSegments(left),
    ` C ${coordinate(endFirst.x)} ${coordinate(endFirst.y)} ${coordinate(endSecond.x)} ${coordinate(endSecond.y)} ${coordinate(right[last].x)} ${coordinate(right[last].y)}`,
    smoothSegments([...right].reverse()),
    ` C ${coordinate(startFirst.x)} ${coordinate(startFirst.y)} ${coordinate(startSecond.x)} ${coordinate(startSecond.y)} ${coordinate(left[0].x)} ${coordinate(left[0].y)} Z`,
  ].join("");
}
