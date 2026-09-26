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

function collectErrors(page: Page) {
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
  return errors;
}

test("keeps a background per scene and applies one to every scene", async ({
  page,
}) => {
  page.setDefaultTimeout(15_000);
  test.skip((page.viewportSize()?.width ?? 0) < 1000, "Desktop authoring");
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors = collectErrors(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Add scene", exact: true }).click();
  await page.getByRole("tab", { name: "SCENES", exact: true }).click();
  const panel = page.getByRole("tabpanel", { name: "Scenes settings" });
  const applyAll = panel.getByRole("button", {
    name: "Apply to All Scenes",
    exact: true,
  });
  await expect(applyAll).toBeDisabled();

  await panel
    .getByLabel("Solid background color", { exact: true })
    .fill("112233");
  const thumbnail = (index: number) =>
    page
      .locator(".scene-item")
      .nth(index)
      .locator(".artboard-background-layer")
      .first()
      .evaluate((layer) => getComputedStyle(layer).backgroundColor);
  await expect.poll(() => thumbnail(1)).toBe("rgb(17, 34, 51)");
  expect(await thumbnail(0)).toBe("rgb(217, 217, 217)");

  await applyAll.click();
  await expect.poll(() => thumbnail(0)).toBe("rgb(17, 34, 51)");
  await expect(applyAll).toBeDisabled();

  // One undo brings the first scene's own look back.
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(() => thumbnail(0)).toBe("rgb(217, 217, 217)");
  await expect.poll(() => thumbnail(1)).toBe("rgb(17, 34, 51)");
  expect(errors).toEqual([]);
});

test("turns a panorama background with the camera in Preview", async ({
  page,
}) => {
  page.setDefaultTimeout(15_000);
  test.skip((page.viewportSize()?.width ?? 0) < 1000, "Desktop authoring");
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors = collectErrors(page);
  await page.goto("/?threeDemo=1");

  // Camera Rotate on the scene: drag anywhere to orbit.
  await page
    .getByLabel("Layers")
    .getByRole("option", { name: /^Demo Box\b/ })
    .click();
  await page.getByRole("tab", { name: "INTERACTION", exact: true }).click();
  const interactions = page.getByRole("tabpanel", {
    name: "Interaction settings",
  });
  for (const label of ["Toggle Grow on hover", "Toggle Spin on click"])
    await interactions
      .getByRole("button", { name: label, exact: true })
      .click();
  await interactions
    .getByRole("button", { name: "+ Add interaction", exact: true })
    .click();
  await choose(page, interactions, "Trigger", "Drag");
  await choose(page, interactions, "Trigger area", "Entire artwork");
  await choose(page, interactions, "Effect", "Camera Rotate");
  await interactions
    .getByLabel("Camera rotate Y", { exact: true })
    .fill("-180");
  await interactions
    .getByLabel("Camera rotate Y", { exact: true })
    .press("Tab");
  await choose(page, interactions, "Reset behavior", "Keep final state");
  await choose(page, interactions, "Camera projection", "Perspective");

  // A 2:1 panorama in four 90° bands; straight ahead is the green | blue
  // seam in the middle of the image.
  const panorama = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext("2d")!;
    ["#d23c3c", "#3cb45a", "#325adc", "#f0c828"].forEach((color, band) => {
      context.fillStyle = color;
      context.fillRect(band * 128, 0, 128, 256);
    });
    return canvas.toDataURL("image/png").split(",")[1];
  });

  await page.getByRole("tab", { name: "SCENES", exact: true }).click();
  const scenes = page.getByRole("tabpanel", { name: "Scenes settings" });
  await scenes.getByRole("button", { name: "Image", exact: true }).click();
  await scenes
    .locator('input[type="file"][aria-label="Upload background image"]')
    .setInputFiles({
      buffer: Buffer.from(panorama, "base64"),
      mimeType: "image/png",
      name: "panorama.png",
    });
  const rotate = scenes.getByLabel("Rotate with Camera", { exact: true });
  await expect(rotate).not.toBeChecked();
  await rotate.check();
  await expect(
    scenes.getByRole("button", { name: "Background media fit", exact: true }),
  ).toBeDisabled();

  // The canvas shows the camera's first view: the seam between the halves,
  // straight ahead, instead of the whole panorama.
  const canvasImage = page.locator(
    '#editor-artboard [data-background-layer="image"]',
  );
  await expect
    .poll(() =>
      canvasImage.evaluate((layer) => getComputedStyle(layer).backgroundImage),
    )
    .toContain("data:image/");

  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  const scene = preview.getByLabel("3D scene");
  await expect(scene).toBeVisible();
  // The flat copy is left out: the 3D layer draws the sky.
  await expect(preview.locator('[data-background-layer="image"]')).toHaveCount(
    0,
  );
  const bounds = (await scene.boundingBox())!;
  const scale = bounds.width / 1920;
  const sample = async (x: number) => {
    const shot = await page.screenshot({
      clip: {
        height: 4,
        width: 4,
        x: bounds.x + x * scale,
        y: bounds.y + 120 * scale,
      },
    });
    return shot.toString("base64");
  };
  // Left of center is the green band, right of center the blue one.
  await expect.poll(() => sample(1440)).not.toBe(await sample(480));
  const ahead = await sample(1440);

  // A drag of half the Track distance turns the camera 90°: another band.
  const x = bounds.x + 260 * scale;
  const y = bounds.y + 860 * scale;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 150 * scale, y, { steps: 10 });
  await page.mouse.up();
  await expect.poll(() => sample(1440)).not.toBe(ahead);
  expect(errors).toEqual([]);
});
