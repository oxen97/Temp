import { expect, test, type Locator, type Page } from "@playwright/test";

async function choose(
  page: Page,
  panel: Locator,
  label: string,
  option: string,
) {
  await panel.getByRole("button", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test("authors an artwork-wide Drag → Camera Rotate that keeps the orbit", async ({
  page,
}) => {
  page.setDefaultTimeout(15_000);
  test.skip((page.viewportSize()?.width ?? 0) < 1000, "Desktop authoring");
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    // The dev server has no favicon; that request is unrelated to the scene.
    if (
      message.type() === "error" &&
      !message.location().url.endsWith("/favicon.ico")
    )
      errors.push(message.text());
  });
  await page.goto("/?threeDemo=1");
  await page
    .getByLabel("Layers")
    .getByRole("option", { name: /^Demo Box\b/ })
    .click();
  await page.getByRole("tab", { name: "INTERACTION", exact: true }).click();
  const panel = page.getByRole("tabpanel", { name: "Interaction settings" });
  for (const label of ["Toggle Grow on hover", "Toggle Spin on click"])
    await panel.getByRole("button", { name: label, exact: true }).click();
  await panel
    .getByRole("button", { name: "+ Add interaction", exact: true })
    .click();
  await choose(page, panel, "Trigger", "Drag");
  await choose(page, panel, "Trigger area", "Entire artwork");
  await choose(page, panel, "Effect", "Camera Rotate");
  await panel.getByLabel("Camera rotate Y", { exact: true }).fill("-180");
  await panel.getByLabel("Camera rotate Y", { exact: true }).press("Tab");
  await choose(page, panel, "Reset behavior", "Keep final state");
  await choose(page, panel, "Camera projection", "Perspective");

  // Remounting the panel hydrates the stored camera fields.
  await page.getByRole("tab", { name: "DESIGN", exact: true }).click();
  await page.getByRole("tab", { name: "INTERACTION", exact: true }).click();
  await panel
    .locator(".interaction-row-name", { hasText: "Camera Rotate" })
    .click();
  await expect(
    panel.getByLabel("Camera rotate Y", { exact: true }),
  ).toHaveValue("-180");
  await expect(
    panel.getByRole("button", { name: "Camera projection", exact: true }),
  ).toHaveText("Perspective");

  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  const scene = preview.getByLabel("3D scene");
  await expect(scene).toBeVisible();
  await expect(scene.locator("canvas")).toHaveJSProperty("width", 1920);
  await page.waitForTimeout(500);
  const bounds = (await scene.boundingBox())!;
  const scale = bounds.width / 1920;
  const front = await scene.screenshot();

  // Press on empty artwork, well away from every object and control.
  const x = bounds.x + 260 * scale;
  const y = bounds.y + 860 * scale;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 300 * scale, y, { steps: 15 });
  await expect
    .poll(async () => (await scene.screenshot()).equals(front))
    .toBe(false);
  await page.mouse.up();

  // Keep final state: the orbit stays after release and comes to rest.
  await page.waitForTimeout(700);
  const kept = await scene.screenshot();
  expect(kept.equals(front)).toBe(false);
  await page.waitForTimeout(300);
  expect((await scene.screenshot()).equals(kept)).toBe(true);

  // A new preview starts from the authored camera again.
  await preview
    .getByRole("button", { name: "Close preview", exact: true })
    .click();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(scene).toBeVisible();
  await expect(scene.locator("canvas")).toHaveJSProperty("width", 1920);
  await expect
    .poll(async () => (await scene.screenshot()).equals(front))
    .toBe(true);
  expect(errors).toEqual([]);
});
