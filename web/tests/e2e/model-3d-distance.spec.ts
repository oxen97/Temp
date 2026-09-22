import { expect, test } from "@playwright/test";

test("measures a selected 3D object against the artboard, 2D and 3D neighbors", async ({
  page,
}) => {
  test.skip((page.viewportSize()?.width ?? 0) <= 960, "Desktop editor only");
  await page.goto("/?threeDemo=1");
  await expect(page.getByLabel("3D scene")).toBeVisible();
  await page
    .getByLabel("Layers")
    .getByRole("option", { name: /Demo Box/ })
    .click();
  const selection = page.getByLabel("3D selection Demo Box");
  await expect(selection).toBeVisible();

  const artboard = await page.getByLabel("Artboard").boundingBox();
  const canvas = await page.getByLabel("Exhibition canvas").boundingBox();
  const platform = await page
    .locator('[data-element-id="three-demo-platform"]')
    .boundingBox();
  const box = await selection.boundingBox();
  if (!artboard || !canvas || !platform || !box)
    throw new Error("Distance targets did not render");
  const scale = artboard.width / 1920;
  const measurements = page.locator(
    ".distance-measurement:not(.distance-preview-slot)",
  );

  await page.keyboard.down("Alt");
  await page.mouse.move(canvas.x + 40, canvas.y + 100);
  await expect(measurements).toHaveCount(4);

  await page.mouse.move(
    platform.x + platform.width / 2,
    platform.y + platform.height / 2,
  );
  await expect(measurements).toHaveCount(1);
  const platformGap = Math.round((platform.y - box.y - box.height) / scale);
  await expect(measurements.locator(".distance-label")).toHaveText(
    `${platformGap} px`,
  );

  await page.mouse.move(artboard.x + 960 * scale, artboard.y + 540 * scale);
  await expect(measurements).toHaveCount(1);
  const sphereGap = Number(
    (await measurements.locator(".distance-label").textContent())?.match(
      /\d+/,
    )?.[0],
  );
  expect(sphereGap).toBeGreaterThan(0);
  expect(sphereGap).toBeLessThan(200);
  await page.keyboard.up("Alt");
  await expect(measurements).toHaveCount(0);
});

test("measures between a selected 3D object and a canvas guide", async ({
  page,
}) => {
  test.skip((page.viewportSize()?.width ?? 0) <= 960, "Desktop editor only");
  await page.goto("/?threeDemo=1");
  await expect(page.getByLabel("3D scene")).toBeVisible();
  await page.keyboard.press("Shift+r");
  const artboard = await page.getByLabel("Artboard").boundingBox();
  const ruler = await page.getByLabel("Vertical ruler").boundingBox();
  if (!artboard || !ruler)
    throw new Error("Guide creation area did not render");
  const scale = artboard.width / 1920;
  const guideX = artboard.x + 1200 * scale;
  await page.mouse.move(ruler.x + 10, ruler.y + 150);
  await page.mouse.down();
  await page.mouse.move(guideX, artboard.y + 300 * scale, { steps: 4 });
  await page.mouse.up();
  const guide = page.locator(".editor-guide");
  await expect(guide).toBeVisible();

  await page
    .getByLabel("Layers")
    .getByRole("option", { name: /Demo Box/ })
    .click();
  await expect(page.getByLabel("3D selection Demo Box")).toBeVisible();
  const guideBounds = await guide.boundingBox();
  if (!guideBounds) throw new Error("Guide bounds are unavailable");
  await page.keyboard.down("Alt");
  await page.mouse.move(
    guideBounds.x + guideBounds.width / 2,
    artboard.y + 500 * scale,
  );
  const measurements = page.locator(
    ".distance-measurement:not(.distance-preview-slot)",
  );
  await expect(measurements).toHaveCount(1);
  await expect(measurements.locator(".distance-label")).toHaveText(/\d+ px/);
  await page.keyboard.up("Alt");
});
