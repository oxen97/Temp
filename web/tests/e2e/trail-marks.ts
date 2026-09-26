import type { Locator, Page } from "@playwright/test";

export type TrailMark = {
  id: number;
  opacity: number;
  retiring: boolean;
  color: string;
  diameter: number;
};

type TrailLayerElement = HTMLElement & {
  amousTrails?: { snapshot: () => TrailMark[] };
};

/** Marks the viewer's canvas trail layer is currently drawing. */
export async function trailMarks(preview: Locator): Promise<TrailMark[]> {
  const layer = preview.locator(".viewer-pointer-trails");
  if (!(await layer.count())) return [];
  return layer.evaluate(
    (node) => (node as TrailLayerElement).amousTrails?.snapshot() ?? [],
  );
}

/**
 * Samples the trail layer on every display frame from now on, so a check does
 * not depend on how quickly the test can read short-lived marks.
 */
export async function recordTrailMarks(preview: Locator) {
  await preview.locator(".viewer-pointer-trails").evaluate((node) => {
    const seen = new Map<number, TrailMark>();
    (window as unknown as { amousTrailSeen: Map<number, TrailMark> }).amousTrailSeen =
      seen;
    const sample = () => {
      for (const mark of (node as TrailLayerElement).amousTrails?.snapshot() ??
        [])
        seen.set(mark.id, mark);
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

export async function recordedTrailMarks(page: Page): Promise<TrailMark[]> {
  return page.evaluate(() => [
    ...((
      window as unknown as { amousTrailSeen?: Map<number, TrailMark> }
    ).amousTrailSeen?.values() ?? []),
  ]);
}
