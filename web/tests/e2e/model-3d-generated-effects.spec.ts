import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  recordedTrailMarks,
  recordTrailMarks,
  trailMarks,
} from "./trail-marks";

async function choose(
  page: Page,
  panel: Locator,
  label: string,
  option: string | RegExp,
) {
  await panel.getByRole("button", { name: label, exact: true }).click();
  await page
    .getByRole("listbox", { name: `${label} menu`, exact: true })
    .getByRole("option", { name: option, exact: typeof option === "string" })
    .click();
}

async function startAuthoring(page: Page) {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/?threeDemo=1");
  await page
    .getByLabel("Layers")
    .getByRole("option", { name: /^Demo Box\b/ })
    .click();
  await page.getByRole("tab", { name: "INTERACTION", exact: true }).click();
  const panel = page.getByRole("tabpanel", { name: "Interaction settings" });
  for (const name of ["Toggle Grow on hover", "Toggle Spin on click"])
    await panel.getByRole("button", { name, exact: true }).click();
  await panel
    .getByRole("button", { name: "+ Add interaction", exact: true })
    .click();
  return panel;
}

async function showPreview(page: Page) {
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  const scene = preview.getByLabel("3D scene");
  await expect(scene).toBeVisible();
  await expect(scene.locator("canvas")).toHaveJSProperty("width", 1920);
  await page.waitForTimeout(300);
  const bounds = (await scene.boundingBox())!;
  const scale = bounds.width / 1920;
  return {
    preview,
    scene,
    bounds,
    scale,
    box: { x: bounds.x + 770 * scale, y: bounds.y + 540 * scale },
  };
}

test.beforeEach(({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1000, "Desktop authoring");
  page.setDefaultTimeout(15_000);
});

for (const area of ["Selected object", "Entire artwork"] as const) {
  test(`a 3D object's ${area} click spawns a visible 3D template instance`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const panel = await startAuthoring(page);
    await choose(page, panel, "Effect", "Spawn Instance");
    await choose(page, panel, "Spawn source template", /^Demo Sphere\b/);
    await choose(page, panel, "Trigger area", area);
    for (const label of ["Spawn minimum size", "Spawn maximum size"]) {
      await panel.getByLabel(label, { exact: true }).fill("180");
      await panel.getByLabel(label, { exact: true }).press("Tab");
    }
    await page.getByRole("tab", { name: "DESIGN", exact: true }).click();
    await page.getByRole("tab", { name: "INTERACTION", exact: true }).click();
    await panel
      .locator(".interaction-row-name", { hasText: "Spawn Instance" })
      .click();
    await expect(
      panel.getByRole("button", { name: "Spawn source template", exact: true }),
    ).toContainText("Demo Sphere");
    const { scene, bounds, scale, box } = await showPreview(page);
    const at =
      area === "Selected object"
        ? box
        : { x: bounds.x + 350 * scale, y: bounds.y + 250 * scale };
    const clip = {
      x: at.x - 180 * scale,
      y: at.y - 190 * scale,
      width: 370 * scale,
      height: 370 * scale,
    };
    const before = await page.screenshot({ clip });
    await page.mouse.click(at.x, at.y);
    await page.mouse.move(bounds.x + 20, bounds.y + 20);
    await expect
      .poll(async () => (await page.screenshot({ clip })).equals(before))
      .toBe(false);
    // Closing removes runtime instances; the authored scene is unchanged.
    await page
      .getByRole("button", { name: "Close preview", exact: true })
      .click();
    await showPreview(page);
    await expect
      .poll(async () => (await page.screenshot({ clip })).equals(before))
      .toBe(true);
    await expect(scene).toBeVisible();
    expect(errors).toEqual([]);
  });

  test(`a 3D object's ${area} drag emits authored pointer marks which expire after release`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const panel = await startAuthoring(page);
    await choose(page, panel, "Trigger", "Drag");
    await choose(page, panel, "Effect", "Emit Pointer Trail");
    await choose(page, panel, "Trigger area", area);
    await panel.getByLabel("Pointer trail spacing", { exact: true }).fill("8");
    await panel
      .getByLabel("Pointer trail lifespan", { exact: true })
      .fill("1.2");
    await panel
      .getByLabel("Pointer trail lifespan", { exact: true })
      .press("Tab");
    await panel
      .getByLabel("Pointer trail colors", { exact: true })
      .fill("#ff715b");
    const { preview, box, bounds, scale } = await showPreview(page);
    const at =
      area === "Selected object"
        ? box
        : { x: bounds.x + 350 * scale, y: bounds.y + 250 * scale };
    expect(await trailMarks(preview)).toHaveLength(0);
    // Marks live only 1.2 s; sample them in the page on every frame.
    await recordTrailMarks(preview);
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x + 160 * scale, at.y + 50 * scale, { steps: 12 });
    await expect
      .poll(
        async () =>
          (await recordedTrailMarks(page)).filter(
            (mark) => mark.color.toLowerCase() === "#ff715b",
          ).length,
      )
      .toBeGreaterThan(4);
    await expect(
      preview.locator(".viewer-pointer-trail-canvas").first(),
    ).toHaveCSS("pointer-events", "none");
    await page.mouse.up();
    await expect
      .poll(async () => (await trailMarks(preview)).length, { timeout: 5000 })
      .toBe(0);
    expect(errors).toEqual([]);
  });
}

test("a 3D click opens a 2D modal and Escape restores scene interaction", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const panel = await startAuthoring(page);
  await choose(page, panel, "Effect", "Open Modal");
  await choose(page, panel, "Modal target", /^Hybrid Platform\b/);
  const { preview, box } = await showPreview(page);
  const modal = preview.getByRole("dialog", {
    name: "Hybrid Platform",
    exact: true,
  });
  await expect(modal).toHaveCount(0);
  await page.mouse.click(box.x, box.y);
  await expect(modal).toBeVisible();
  await expect(modal).toHaveAttribute("aria-modal", "true");
  await expect(preview.locator("[data-viewer-3d-layer]")).toHaveAttribute(
    "inert",
    "",
  );
  await page.keyboard.press("Escape");
  await expect(modal).toHaveCount(0);
  await expect(preview).toBeVisible();
  await expect(preview.locator("[data-viewer-3d-layer]")).not.toHaveAttribute(
    "inert",
    "",
  );
  await page.mouse.click(box.x, box.y);
  await expect(modal).toBeVisible();
  expect(errors).toEqual([]);
});

test("3D hover opens a backdrop-free modal and a second 3D object closes it", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const panel = await startAuthoring(page);
  await choose(page, panel, "Trigger", "Hover");
  await choose(page, panel, "Effect", "Open Modal");
  await choose(page, panel, "Modal target", /^Hybrid Platform\b/);
  const backdrop = panel.getByRole("button", { name: "Backdrop", exact: true });
  if ((await backdrop.getAttribute("aria-pressed")) === "true")
    await backdrop.click();
  await expect(backdrop).toHaveAttribute("aria-pressed", "false");
  await page
    .getByLabel("Layers")
    .getByRole("option", { name: /^Demo Sphere\b/ })
    .click();
  await panel
    .getByRole("button", { name: "Toggle Drop on click", exact: true })
    .click();
  await panel
    .getByRole("button", { name: "+ Add interaction", exact: true })
    .click();
  await choose(page, panel, "Effect", "Close Modal");
  await choose(page, panel, "Modal target", /^Hybrid Platform\b/);
  const { preview, box, bounds, scale } = await showPreview(page);
  const modal = preview.getByRole("dialog", {
    name: "Hybrid Platform",
    exact: true,
  });
  await page.mouse.move(bounds.x + 20, bounds.y + 20);
  await expect(modal).toHaveCount(0);
  await page.mouse.move(box.x, box.y);
  await expect(modal).toBeVisible();
  await expect(preview.locator("[data-viewer-3d-layer]")).not.toHaveAttribute(
    "inert",
    "",
  );
  await page.mouse.click(bounds.x + 960 * scale, bounds.y + 540 * scale);
  await expect(modal).toHaveCount(0);
  await expect(preview).toBeVisible();
  expect(errors).toEqual([]);
});
