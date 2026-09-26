import { expect, test } from "@playwright/test";

import { trailMarks } from "./trail-marks";

test("the authored fade-out time persists and controls replacement fading", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 1000,
    "Desktop authoring panel",
  );
  await page.goto("/?interactionDemo=mon-art");
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  await preview.getByRole("button", { name: "Close preview" }).click();
  const scenes = page.locator(".scenes-section .scene-item");
  await scenes.nth(1).click();
  const panel = page.getByRole("tabpanel", { name: "Interaction settings" });
  const duration = panel.getByLabel("Pointer trail fade-out duration", {
    exact: true,
  });
  await expect(duration).toHaveValue("0.5");
  await duration.fill("2");
  await duration.press("Enter");
  const limit = panel.getByLabel("Pointer trail maximum marks", {
    exact: true,
  });
  await limit.fill("2");
  await limit.press("Enter");
  await scenes.nth(2).click();
  await scenes.nth(1).click();
  await expect(duration).toHaveValue("2");
  await page
    .getByRole("button", { name: /Preview/ })
    .first()
    .click();
  const bounds = await preview.locator(".viewer-preview-page").boundingBox();
  if (!bounds) throw new Error("Preview has no bounds");
  const now = new Date();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now);
  await page.mouse.move(
    bounds.x + bounds.width * 0.3,
    bounds.y + bounds.height * 0.5,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.4,
    bounds.y + bounds.height * 0.5,
  );
  await page.mouse.up();
  await expect
    .poll(async () => (await trailMarks(preview)).some((mark) => mark.retiring))
    .toBe(true);
  const markId = (await trailMarks(preview)).find((mark) => mark.retiring)!.id;
  await page.clock.runFor(1000);
  const mark = (await trailMarks(preview)).find(({ id }) => id === markId);
  expect(mark).toBeDefined();
  expect(mark!.opacity).toBeGreaterThan(0.4);
  expect(mark!.opacity).toBeLessThan(0.6);
  await page.clock.runFor(1050);
  expect((await trailMarks(preview)).some(({ id }) => id === markId)).toBe(
    false,
  );
  await expect.poll(async () => (await trailMarks(preview)).length).toBe(2);
});

test("INK fades old strokes even when dragging exceeds the particle limit", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 1000,
    "Desktop continuous drag",
  );
  await page.goto("/?interactionDemo=mon-art");
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  await preview.locator('[data-element-id="mon-art-1-next-hit"]').click();
  await expect(
    preview.locator('[data-element-id="mon-art-2-scene-title"]'),
  ).toContainText("INK");
  const bounds = await preview.locator(".viewer-preview-page").boundingBox();
  if (!bounds) throw new Error("Preview has no bounds");

  // Freeze the lifetime clock so reaching the cap, rather than normal aging,
  // is the only reason the oldest segment starts to disappear.
  const now = new Date();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now);
  const left = bounds.x + bounds.width * 0.15;
  const right = bounds.x + bounds.width * 0.85;
  const y = bounds.y + bounds.height * 0.55;
  await page.mouse.move(left, y);
  await page.mouse.down();
  await page.mouse.move(right, y, { steps: 24 });
  await page.mouse.move(left, y + 10, { steps: 24 });
  await page.mouse.move(right, y + 20, { steps: 24 });
  await page.mouse.up();

  await expect
    .poll(async () => (await trailMarks(preview)).some((mark) => mark.retiring))
    .toBe(true);
  const segment = (await trailMarks(preview)).find((mark) => mark.retiring)!;
  expect(segment.opacity).toBe(1);
  await page.clock.runFor(250);
  const halfway = (await trailMarks(preview)).find(
    ({ id }) => id === segment.id,
  );
  expect(halfway!.opacity).toBeGreaterThan(0.3);
  expect(halfway!.opacity).toBeLessThan(0.7);
  await page.clock.runFor(300);
  const settled = await trailMarks(preview);
  expect(settled.some(({ id }) => id === segment.id)).toBe(false);
  expect(settled.filter((mark) => mark.retiring)).toHaveLength(0);
  expect(settled).toHaveLength(430);
  await page.clock.runFor(7600);
  await expect.poll(async () => (await trailMarks(preview)).length).toBe(0);
});
