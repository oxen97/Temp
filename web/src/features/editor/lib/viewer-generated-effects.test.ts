import { describe, expect, it } from "vitest";

import { createDefaultInteraction } from "@/features/editor/lib/interaction-model";
import type { CanvasElement } from "@/features/editor/store/editor-store";

import {
  createSpawnInstance,
  createTrailParticles,
  sampleTrailSegment,
  trailParticleOpacity,
  trimTrailParticles,
  waveDeformedPaths,
} from "./viewer-generated-effects";

function shape(
  id: string,
  overrides: Partial<CanvasElement> = {},
): CanvasElement {
  return {
    id,
    name: id,
    type: "circle",
    x: 0,
    y: 0,
    width: 20,
    height: 20,
    rotation: 0,
    opacity: 100,
    fill: "#fff",
    stroke: "none",
    strokeWidth: 0,
    cornerRadius: 0,
    visible: true,
    locked: false,
    ...overrides,
  };
}

describe("viewer generated effects", () => {
  it("samples long pointer moves at consistent spacing and caps aged particles", () => {
    const interaction = createDefaultInteraction({
      id: "trail",
      effect: "pointer-trail",
      trailSpacing: 10,
      trailMaxCount: 2,
      trailLifespan: 1,
      trailFade: 0,
    });
    const points = sampleTrailSegment({ x: 0, y: 0 }, { x: 35, y: 0 }, 10);
    expect(points).toEqual([
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 0 },
    ]);
    const particles = createTrailParticles(interaction, points, 100, 1);
    expect(
      trimTrailParticles(particles, 100, new Map([["trail", 2]])).map(
        (p) => p.x,
      ),
    ).toEqual([20, 30]);
    expect(
      trimTrailParticles(particles, 1100, new Map([["trail", 2]])),
    ).toEqual([]);
  });

  it("ages each mark from when the pointer passed it", () => {
    const interaction = createDefaultInteraction({
      id: "trail",
      effect: "pointer-trail",
      trailSpacing: 10,
    });
    // One frame's move from x 0 (t 1000) to x 40 (t 1016).
    const points = sampleTrailSegment(
      { x: 0, y: 0, time: 1000 },
      { x: 40, y: 0, time: 1016 },
      10,
    );
    expect(points).toEqual([
      { x: 10, y: 0, time: 1004 },
      { x: 20, y: 0, time: 1008 },
      { x: 30, y: 0, time: 1012 },
      { x: 40, y: 0, time: 1016 },
    ]);
    const particles = createTrailParticles(interaction, points, 1020, 1);
    expect(particles.map((particle) => particle.createdAt)).toEqual([
      1004, 1008, 1012, 1016,
    ]);
    expect(particles[0]).not.toHaveProperty("time");
    // Untimed samples (and any time after processing) use the frame time.
    expect(
      createTrailParticles(
        interaction,
        [
          { x: 1, y: 1 },
          { x: 2, y: 2, time: 2000 },
        ],
        1020,
        9,
      ).map((particle) => particle.createdAt),
    ).toEqual([1020, 1020]);
    expect(
      sampleTrailSegment({ x: 0, y: 0 }, { x: 20, y: 0, time: 5 }, 10)[0],
    ).toEqual({ x: 10, y: 0 });
  });

  it("fades over its authored lifespan and reaches zero before removal", () => {
    const interaction = createDefaultInteraction({
      trailLifespan: 8,
      trailFade: 100,
    });
    const [particle] = createTrailParticles(
      interaction,
      [{ x: 0, y: 0 }],
      100,
      1,
    );
    expect(trailParticleOpacity(particle, 100)).toBe(1);
    expect(trailParticleOpacity(particle, 4100)).toBe(0.5);
    expect(trailParticleOpacity(particle, 8099)).toBeLessThan(0.001);
    expect(trimTrailParticles([particle], 8100, new Map())).toEqual([]);
  });

  it("fades capacity-evicted ink from its current opacity, without restarting its fade", () => {
    const interaction = createDefaultInteraction({
      id: "ink",
      trailLifespan: 8,
      trailFade: 100,
    });
    const particles = createTrailParticles(
      interaction,
      [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 10, y: 0 },
      ],
      0,
      1,
    );
    const limits = new Map([["ink", 2]]);
    const trimmed = trimTrailParticles(particles, 1000, limits);
    expect(trimmed).toHaveLength(3);
    expect(
      trimmed.filter((particle) => particle.retiringAt === undefined),
    ).toHaveLength(2);
    const fading = trimmed[0];
    expect(trailParticleOpacity(fading, 1000)).toBe(
      trailParticleOpacity(particles[0], 1000),
    );
    expect(trailParticleOpacity(fading, 1250)).toBeCloseTo(0.4375);
    expect(trailParticleOpacity(fading, 1499)).toBeLessThan(0.001);
    expect(trimTrailParticles(trimmed, 1250, limits)[0].retiringAt).toBe(1000);
    expect(
      trimTrailParticles(trimmed, 1500, limits).map((particle) => particle.id),
    ).toEqual([2, 3]);
  });

  it("bounds retiring particles during rapid strokes and keeps interaction limits independent", () => {
    const ink = createDefaultInteraction({
      id: "ink",
      trailLifespan: 8,
      trailFade: 100,
    });
    const other = createDefaultInteraction({ id: "other", trailFade: 100 });
    const points = Array.from({ length: 1000 }, (_, x) => ({ x, y: 0 }));
    const particles = [
      ...createTrailParticles(ink, points, 0, 1),
      ...createTrailParticles(other, [{ x: 0, y: 10 }], 0, 1001),
    ];
    const trimmed = trimTrailParticles(
      particles,
      100,
      new Map([
        ["ink", 2],
        ["other", 1],
      ]),
    );
    expect(trimmed).toHaveLength(503);
    expect(
      trimmed
        .filter((particle) => particle.retiringAt === undefined)
        .map((particle) => particle.id),
    ).toEqual([999, 1000, 1001]);
  });

  it("uses the authored replacement fade duration and supports immediate removal", () => {
    const interaction = createDefaultInteraction({
      id: "slow-ink",
      trailLifespan: 8,
      trailFade: 100,
      trailFadeOutDuration: 2,
    });
    const points = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
    ];
    const limits = new Map([[interaction.id, 1]]);
    const particles = createTrailParticles(interaction, points, 0, 1);
    const retired = trimTrailParticles(particles, 1000, limits);
    expect(retired[0].fadeOutDuration).toBe(2);
    expect(trailParticleOpacity(retired[0], 2000)).toBeCloseTo(0.4375);
    expect(trimTrailParticles(retired, 2999, limits)).toHaveLength(2);
    expect(trimTrailParticles(retired, 3000, limits).map((p) => p.id)).toEqual([
      2,
    ]);

    const immediate = createTrailParticles(
      { ...interaction, trailFadeOutDuration: 0 },
      points,
      0,
      1,
    );
    expect(
      trimTrailParticles(immediate, 1000, limits).map((p) => p.id),
    ).toEqual([2]);
  });

  it("spawns a complete group around a pointer and preserves inherited rules", () => {
    const gaze = createDefaultInteraction({
      id: "gaze",
      trigger: "pointer-move",
    });
    const eye = [
      shape("socket", { groupId: "eye", x: 100, interactions: [gaze] }),
      shape("iris", { groupId: "eye", x: 110, width: 8, height: 8 }),
    ];
    const interaction = createDefaultInteraction({
      effect: "spawn-instance",
      spawnSourceId: "eye",
      spawnSizeMin: 100,
      spawnSizeMax: 100,
      spawnRotationMin: 0,
      spawnRotationMax: 0,
      spawnInheritInteractions: true,
    });
    const instance = createSpawnInstance(
      eye,
      interaction,
      { x: 50, y: 40 },
      "copy-1",
      () => 0,
    )!;
    expect(instance.elements.map((element) => element.id)).toEqual([
      "copy-1:socket",
      "copy-1:iris",
    ]);
    expect(instance.elements[0].groupId).toBe("copy-1:group");
    expect(instance.elements[0].interactions?.[0].id).toBe("gaze");
    expect(instance.elements[0].x).toBeLessThan(50);
    expect(instance.elements[1].x).toBeGreaterThan(instance.elements[0].x);
  });

  it("bends path handles while keeping endpoints anchored", () => {
    const pen = shape("wave", {
      type: "pen",
      width: 100,
      height: 50,
      vectorPaths: [
        {
          points: [
            { x: 0, y: 25, handleOut: { x: 50, y: 25 } },
            { x: 100, y: 25, handleIn: { x: 50, y: 25 } },
          ],
        },
      ],
    });
    const interaction = createDefaultInteraction({
      effect: "wave-deform",
      waveAmplitude: 20,
      waveLength: 200,
      waveSpeed: 0,
      waveFalloff: 200,
      wavePointerX: 30,
      wavePointerY: 0,
    });
    const path = waveDeformedPaths(
      pen,
      interaction,
      { x: 50, y: 25 },
      { x: 1, y: 0 },
      0,
      1,
      0,
    )[0];
    expect(path.points[0].x).toBeCloseTo(0);
    expect(path.points[1].x).toBeCloseTo(100);
    expect(path.points[0].handleOut?.x).toBeGreaterThan(50);
    expect(path.points[1].handleIn?.y).toBeGreaterThan(25);
  });

  it("deforms an ordinary line between fixed endpoints without rewriting the authored line", () => {
    const line = shape("authored-line", {
      type: "line",
      width: 200,
      height: 20,
    });
    const interaction = createDefaultInteraction({
      effect: "wave-deform",
      waveAmplitude: 30,
      waveLength: 200,
      waveSpeed: 1,
    });
    const first = waveDeformedPaths(
      line,
      interaction,
      { x: 100, y: 10 },
      { x: 0, y: 0 },
      0,
      1,
      0,
    )[0];
    const later = waveDeformedPaths(
      line,
      interaction,
      { x: 100, y: 10 },
      { x: 0, y: 0 },
      0.25,
      1,
      0,
    )[0];
    expect(first.points.length).toBeGreaterThan(2);
    expect(first.points[0].y).toBe(10);
    expect(first.points.at(-1)?.y).toBeCloseTo(10);
    expect(first.points.some((point) => Math.abs(point.y - 10) > 5)).toBe(true);
    expect(later.points).not.toEqual(first.points);
    expect(line.vectorPaths).toBeUndefined();
  });
});
