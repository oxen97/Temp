import { expect, test } from "@playwright/test";

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
  const retiring = preview.locator(
    '.viewer-pointer-particle[data-trail-retiring="true"]',
  );
  await expect(retiring.first()).toBeAttached();
  const mark = await retiring.first().elementHandle();
  if (!mark) throw new Error("Missing retiring mark");
  await page.clock.runFor(1000);
  expect(await mark.evaluate((node) => node.isConnected)).toBe(true);
  const opacity = await mark.evaluate((node) =>
    Number((node as HTMLElement).style.opacity),
  );
  expect(opacity).toBeGreaterThan(0.4);
  expect(opacity).toBeLessThan(0.6);
  await page.clock.runFor(1050);
  expect(await mark.evaluate((node) => node.isConnected)).toBe(false);
  await expect(preview.locator(".viewer-pointer-particle")).toHaveCount(2);
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

  const retiring = preview.locator(
    '.viewer-pointer-particle[data-trail-retiring="true"]',
  );
  await expect(retiring.first()).toBeAttached();
  const segment = await retiring.first().elementHandle();
  if (!segment) throw new Error("Missing fading segment");
  expect(
    await segment.evaluate((node) =>
      Number((node as HTMLElement).style.opacity),
    ),
  ).toBe(1);
  await page.clock.runFor(250);
  const halfwayOpacity = await segment.evaluate((node) =>
    Number((node as HTMLElement).style.opacity),
  );
  expect(halfwayOpacity).toBeGreaterThan(0.3);
  expect(halfwayOpacity).toBeLessThan(0.7);
  await page.clock.runFor(300);
  expect(await segment.evaluate((node) => node.isConnected)).toBe(false);
  await expect(retiring).toHaveCount(0);
  await expect(preview.locator(".viewer-pointer-particle")).toHaveCount(430);
  await page.clock.runFor(7600);
  await expect(preview.locator(".viewer-pointer-particle")).toHaveCount(0);
});
