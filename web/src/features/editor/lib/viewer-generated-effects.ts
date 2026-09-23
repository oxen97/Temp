import type { InteractionDefinition } from "@/features/editor/lib/interaction-model";
import { vectorPathsForElement } from "@/features/editor/lib/vector-path";
import type {
  CanvasElement,
  VectorPath,
} from "@/features/editor/store/editor-store";

export type ViewerPoint = { x: number; y: number };

export type ViewerTrailParticle = ViewerPoint & {
  id: number;
  interactionId: string;
  createdAt: number;
  lifespan: number;
  size: number;
  growth: number;
  fade: number;
  blur: number;
  color: string;
  blendMode: string;
  fadeOutDuration: number;
  retiringAt?: number;
  retiringOpacity?: number;
};

/** Capacity eviction uses a short fade from the particle's current opacity. */
export function trailParticleOpacity(
  particle: ViewerTrailParticle,
  now: number,
): number {
  const progress = Math.max(
    0,
    Math.min(1, (now - particle.createdAt) / (particle.lifespan * 1000)),
  );
  const opacity = Math.max(0, 1 - progress * particle.fade);
  if (particle.retiringAt === undefined) return opacity;
  const duration = particle.fadeOutDuration * 1000;
  const retirement =
    duration <= 0
      ? 1
      : Math.max(0, Math.min(1, (now - particle.retiringAt) / duration));
  const eased = retirement * retirement * (3 - 2 * retirement);
  return Math.min(opacity, (particle.retiringOpacity ?? opacity) * (1 - eased));
}

export type ViewerSpawnInstance = {
  id: string;
  interactionId: string;
  elements: CanvasElement[];
  scale: number;
};

/** Samples a continuous pointer segment at a fixed artboard-pixel interval. */
export function sampleTrailSegment(
  lastEmission: ViewerPoint,
  pointer: ViewerPoint,
  spacing: number,
): ViewerPoint[] {
  const step = Math.max(1, spacing);
  const distance = Math.hypot(
    pointer.x - lastEmission.x,
    pointer.y - lastEmission.y,
  );
  if (distance < step) return [];
  const count = Math.min(500, Math.floor(distance / step));
  const dx = (pointer.x - lastEmission.x) / distance;
  const dy = (pointer.y - lastEmission.y) / distance;
  return Array.from({ length: count }, (_, index) => ({
    x: lastEmission.x + dx * step * (index + 1),
    y: lastEmission.y + dy * step * (index + 1),
  }));
}

export function createTrailParticles(
  interaction: InteractionDefinition,
  points: ViewerPoint[],
  now: number,
  firstId: number,
): ViewerTrailParticle[] {
  const colors = interaction.trailColors
    .split(",")
    .map((color) => color.trim())
    .filter(Boolean);
  const minSize = Math.max(
    1,
    Math.min(interaction.trailSizeMin, interaction.trailSizeMax),
  );
  const maxSize = Math.max(minSize, interaction.trailSizeMax);
  return points.map((point, index) => {
    // Stable variation prevents every particle from looking stamped, and also
    // makes an authored trail reproducible from the same pointer path.
    const variation = ((firstId + index) * 0.61803398875) % 1;
    return {
      ...point,
      id: firstId + index,
      interactionId: interaction.id,
      createdAt: now,
      lifespan: Math.max(0.05, interaction.trailLifespan),
      size: minSize + (maxSize - minSize) * variation,
      growth: Math.max(0, interaction.trailGrowth) / 100,
      fade: Math.max(0, Math.min(100, interaction.trailFade)) / 100,
      blur: Math.max(0, interaction.trailBlur),
      color: colors[(firstId + index) % colors.length] ?? "#fff3c5",
      blendMode: interaction.trailBlendMode,
      fadeOutDuration: Number.isFinite(interaction.trailFadeOutDuration)
        ? Math.max(0, interaction.trailFadeOutDuration)
        : 0.5,
    };
  });
}

export function trimTrailParticles(
  particles: ViewerTrailParticle[],
  now: number,
  limits: Map<string, number>,
): ViewerTrailParticle[] {
  const live = particles.filter(
    (particle) =>
      now - particle.createdAt < particle.lifespan * 1000 &&
      (particle.retiringAt === undefined ||
        now - particle.retiringAt < particle.fadeOutDuration * 1000),
  );
  const seen = new Map<string, number>();
  const retiring = new Map<string, number>();
  const kept: ViewerTrailParticle[] = [];
  for (let index = live.length - 1; index >= 0; index -= 1) {
    const particle = live[index];
    const limit = Math.max(1, limits.get(particle.interactionId) ?? 200);
    const count = seen.get(particle.interactionId) ?? 0;
    if (particle.retiringAt !== undefined || count >= limit) {
      const retiringCount = retiring.get(particle.interactionId) ?? 0;
      // Keep a bounded exit tail in addition to the authored live-particle cap.
      // 500 covers the maximum samples from a single pointer event; repeated
      // events must not accumulate an unbounded number of fading DOM nodes.
      if (
        particle.fade <= 0 ||
        particle.fadeOutDuration <= 0 ||
        retiringCount >= Math.max(limit, 500)
      )
        continue;
      retiring.set(particle.interactionId, retiringCount + 1);
      kept.push(
        particle.retiringAt === undefined
          ? {
              ...particle,
              retiringAt: now,
              retiringOpacity: trailParticleOpacity(particle, now),
            }
          : particle,
      );
      continue;
    }
    seen.set(particle.interactionId, count + 1);
    kept.push(particle);
  }
  return kept.reverse();
}

/** Copies one source element or its whole authored group around the pointer. */
export function createSpawnInstance(
  authoredElements: CanvasElement[],
  interaction: InteractionDefinition,
  point: ViewerPoint,
  instanceId: string,
  random = Math.random,
): ViewerSpawnInstance | null {
  const source = authoredElements.find(
    (element) => element.id === interaction.spawnSourceId,
  );
  const groupId =
    source?.groupId ??
    (authoredElements.some(
      (element) => element.groupId === interaction.spawnSourceId,
    )
      ? interaction.spawnSourceId
      : undefined);
  const members = groupId
    ? authoredElements.filter((element) => element.groupId === groupId)
    : source
      ? [source]
      : [];
  if (!members.length) return null;

  const minScale =
    Math.max(1, Math.min(interaction.spawnSizeMin, interaction.spawnSizeMax)) /
    100;
  const maxScale = Math.max(minScale, interaction.spawnSizeMax / 100);
  const scale = minScale + (maxScale - minScale) * random();
  const minRotation = Math.min(
    interaction.spawnRotationMin,
    interaction.spawnRotationMax,
  );
  const maxRotation = Math.max(
    interaction.spawnRotationMin,
    interaction.spawnRotationMax,
  );
  const rotation = minRotation + (maxRotation - minRotation) * random();
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const left = Math.min(...members.map((element) => element.x));
  const right = Math.max(
    ...members.map((element) => element.x + element.width),
  );
  const top = Math.min(...members.map((element) => element.y));
  const bottom = Math.max(
    ...members.map((element) => element.y + element.height),
  );
  const center = { x: (left + right) / 2, y: (top + bottom) / 2 };

  return {
    id: instanceId,
    interactionId: interaction.id,
    scale,
    elements: members.map((element) => {
      const offsetX = (element.x + element.width / 2 - center.x) * scale;
      const offsetY = (element.y + element.height / 2 - center.y) * scale;
      return {
        ...element,
        id: `${instanceId}:${element.id}`,
        groupId: `${instanceId}:group`,
        visible: true,
        x: point.x + offsetX * cos - offsetY * sin - element.width / 2,
        y: point.y + offsetX * sin + offsetY * cos - element.height / 2,
        rotation: element.rotation + rotation,
        interactions: interaction.spawnInheritInteractions
          ? element.interactions?.map((entry) => ({ ...entry }))
          : [],
      };
    }),
  };
}

/** Deforms pen/line geometry in local coordinates from a world-space pointer. */
export function waveDeformedPaths(
  element: CanvasElement,
  interaction: InteractionDefinition,
  localPointer: ViewerPoint,
  normalizedPointer: ViewerPoint,
  seconds: number,
  strength: number,
  elementIndex: number,
): VectorPath[] {
  const paths =
    element.type === "line"
      ? [
          {
            points: [
              { x: 0, y: element.height / 2 },
              { x: element.width, y: element.height / 2 },
            ],
          },
        ]
      : vectorPathsForElement(element);
  const wavelength = Math.max(1, interaction.waveLength);
  const falloff = Math.max(1, interaction.waveFalloff);
  const phaseOffset =
    (elementIndex * interaction.wavePhaseSpread * Math.PI) / 180;
  const mapPoint = (point: ViewerPoint): ViewerPoint => {
    const distance = Math.hypot(
      point.x - localPointer.x,
      point.y - localPointer.y,
    );
    const influence = Math.exp(-0.5 * (distance / falloff) ** 2) * strength;
    // Keep path ends anchored while the middle and its Bezier handles move.
    const middleWeight = Math.max(
      0,
      Math.sin(
        Math.PI *
          Math.max(0, Math.min(1, point.x / Math.max(1, element.width))),
      ),
    );
    const phase =
      (point.x / wavelength - seconds * interaction.waveSpeed) * Math.PI * 2 +
      phaseOffset;
    return {
      x:
        point.x +
        normalizedPointer.x *
          interaction.wavePointerX *
          influence *
          middleWeight,
      y:
        point.y +
        (Math.sin(phase) *
          interaction.waveAmplitude *
          (0.35 + 0.65 * influence) +
          normalizedPointer.y * interaction.wavePointerY * influence) *
          middleWeight,
    };
  };
  return paths.map((path) => ({
    ...path,
    points: path.points.map((point) => ({
      ...point,
      ...mapPoint(point),
      handleIn: point.handleIn ? mapPoint(point.handleIn) : undefined,
      handleOut: point.handleOut ? mapPoint(point.handleOut) : undefined,
    })),
  }));
}
