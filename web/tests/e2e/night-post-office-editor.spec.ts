import { expect, test } from "@playwright/test";

const firstStarId = "night-post-office-star-memory";
const firstSlotId = "night-post-office-slot-1";

test("the public demo opens an authored editor preview and closing reveals its artboard and interactions", async ({ page }) => {
  await page.goto("/demos/night-post-office/");
  await expect(page).toHaveURL(/\?interactionDemo=night-post-office$/);

  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  await expect(preview).toBeVisible();
  await expect(preview.locator(`[data-element-id="${firstStarId}"]`)).toBeVisible();
  await preview.getByRole("button", { name: "Close preview" }).click();

  await expect(page.locator('[role="tab"][aria-label="INTERACTION"]')).toHaveAttribute(
    "aria-selected",
    "true",
  );
  const panel = page.locator('[role="tabpanel"][aria-label="Interaction settings"]');
  await expect(panel.locator(".interaction-selected strong")).toHaveText(
    "그리움 · 별 편지",
  );
  await expect(panel.locator(".interaction-row")).toHaveCount(3);
  await expect(panel.locator(".interaction-row-name")).toHaveText([
    "그리움 → 별자리 1번 자리",
    "그리움 → 별자리 2번 자리",
    "그리움 → 별자리 3번 자리",
  ]);

  const canvas = page.getByRole("region", { name: "Exhibition canvas" });
  const artboard = page.getByRole("application", { name: "Artboard" });
  await expect(artboard).toBeVisible();
  if ((page.viewportSize()?.width ?? 0) >= 1000) {
    await expect.poll(async () => {
      const canvasBox = await canvas.boundingBox();
      const artboardBox = await artboard.boundingBox();
      if (!canvasBox || !artboardBox) return false;
      return (
        artboardBox.x >= canvasBox.x - 2 &&
        artboardBox.y >= canvasBox.y - 2 &&
        artboardBox.x + artboardBox.width <=
          canvasBox.x + canvasBox.width + 2 &&
        artboardBox.y + artboardBox.height <=
          canvasBox.y + canvasBox.height + 2
      );
    }).toBe(true);
  }
});

test("stars snap to any vacant place and cannot occupy the same place", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1000, "Desktop drag gesture");
  await page.goto("/?interactionDemo=night-post-office");
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  const star = preview.locator(`[data-element-id="${firstStarId}"]`);
  const slot = preview.locator(`[data-element-id="${firstSlotId}"]`);
  await expect(star).toBeVisible();
  const start = await star.boundingBox();
  const destination = await slot.boundingBox();
  expect(start).not.toBeNull();
  expect(destination).not.toBeNull();
  if (!start || !destination) return;

  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    destination.x + destination.width / 2,
    destination.y + destination.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();

  await expect.poll(async () => {
    const moved = await star.boundingBox();
    const target = await slot.boundingBox();
    if (!moved || !target) return Infinity;
    return Math.hypot(
      moved.x + moved.width / 2 - (target.x + target.width / 2),
      moved.y + moved.height / 2 - (target.y + target.height / 2),
    );
  }).toBeLessThan(12);

  const secondStar = preview.locator(
    '[data-element-id="night-post-office-star-hello"]',
  );
  const secondStart = await secondStar.boundingBox();
  expect(secondStart).not.toBeNull();
  if (!secondStart) return;
  await page.mouse.move(
    secondStart.x + secondStart.width / 2,
    secondStart.y + secondStart.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    destination.x + destination.width / 2,
    destination.y + destination.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  await expect.poll(async () => {
    const rejected = await secondStar.boundingBox();
    if (!rejected) return Infinity;
    return Math.hypot(rejected.x - secondStart.x, rejected.y - secondStart.y);
  }).toBeLessThan(12);

  const secondSlot = preview.locator(
    '[data-element-id="night-post-office-slot-2"]',
  );
  const vacant = await secondSlot.boundingBox();
  expect(vacant).not.toBeNull();
  if (!vacant) return;
  await page.mouse.move(
    secondStart.x + secondStart.width / 2,
    secondStart.y + secondStart.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(vacant.x + vacant.width / 2, vacant.y + vacant.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
  await expect.poll(async () => {
    const moved = await secondStar.boundingBox();
    const target = await secondSlot.boundingBox();
    if (!moved || !target) return Infinity;
    return Math.hypot(
      moved.x + moved.width / 2 - (target.x + target.width / 2),
      moved.y + moved.height / 2 - (target.y + target.height / 2),
    );
  }).toBeLessThan(12);
});

test("the envelope opens an accessible letter on mobile", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 1000, "Mobile touch gesture");
  await page.goto("/?interactionDemo=night-post-office");
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  await preview
    .locator('[data-element-id="night-post-office-letter-opener"]')
    .tap();
  const letter = preview.getByRole("dialog", { name: "오늘의 편지" });
  await expect(letter).toBeVisible();
  await expect(letter).toContainText("잘 지내고 있나요?");
  await preview
    .locator('[data-element-id="night-post-office-letter-close"]')
    .tap();
  await expect(letter).toBeHidden();
});
