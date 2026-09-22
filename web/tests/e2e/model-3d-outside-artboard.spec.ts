import { expect, test } from "@playwright/test";

test("3D models stay visible and selectable outside the editor artboard", async ({
  page,
}) => {
  test.skip((page.viewportSize()?.width ?? 0) <= 960, "Desktop editor only");
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.goto("/?threeDemo=1");
  await page.locator(".zoom-menu").click();
  await page.getByRole("menuitem", { name: /Zoom to Fit/ }).click();
  const canvas = page.getByLabel("Exhibition canvas");
  const canvasBounds = await canvas.boundingBox();
  expect(canvasBounds).not.toBeNull();
  await page.mouse.move(
    canvasBounds!.x + canvasBounds!.width / 2,
    canvasBounds!.y + canvasBounds!.height / 2,
  );
  await page.keyboard.down("Control");
  for (let index = 0; index < 3; index += 1) await page.mouse.wheel(0, 120);
  await page.keyboard.up("Control");

  await page
    .getByLabel("Layers")
    .getByRole("option", { name: /Demo Box/ })
    .click();
  await page.getByRole("spinbutton", { name: "Position X" }).fill("-150");
  await page.getByRole("spinbutton", { name: "Position X" }).blur();

  const artboard = await page.getByLabel("Artboard").boundingBox();
  const selection = page.getByLabel("3D selection Demo Box");
  await expect(selection).toBeVisible();
  const bounds = await selection.boundingBox();
  expect(artboard).not.toBeNull();
  expect(bounds).not.toBeNull();
  expect(bounds!.x + bounds!.width).toBeLessThan(artboard!.x);
  expect(bounds!.x).toBeGreaterThan(canvasBounds!.x);

  const scene = page.getByLabel("3D scene");
  const sceneBounds = await scene.boundingBox();
  expect(sceneBounds).not.toBeNull();
  expect(sceneBounds!.x).toBeLessThan(bounds!.x);
  expect(sceneBounds!.x + sceneBounds!.width).toBeGreaterThan(
    bounds!.x + bounds!.width,
  );

  // Read actual rendered pixels, not only the DOM selection rectangle.
  const sample = {
    x: Math.floor(bounds!.x + bounds!.width * 0.2),
    y: Math.floor(bounds!.y + bounds!.height * 0.2),
    width: Math.max(1, Math.floor(bounds!.width * 0.6)),
    height: Math.max(1, Math.floor(bounds!.height * 0.6)),
  };
  const before = await page.screenshot({ clip: sample });
  await page.getByRole("button", { name: "Hide Demo Box" }).click();
  const after = await page.screenshot({ clip: sample });
  const changedPixels = await page.evaluate(
    async ({ beforeImage, afterImage }) => {
      const decode = async (base64: string) => {
        const image = new Image();
        image.src = `data:image/png;base64,${base64}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height).data;
      };
      const first = await decode(beforeImage);
      const second = await decode(afterImage);
      let changed = 0;
      for (let index = 0; index < first.length; index += 4) {
        const difference =
          Math.abs(first[index] - second[index]) +
          Math.abs(first[index + 1] - second[index + 1]) +
          Math.abs(first[index + 2] - second[index + 2]);
        if (difference > 90) changed += 1;
      }
      return changed;
    },
    {
      beforeImage: before.toString("base64"),
      afterImage: after.toString("base64"),
    },
  );
  expect(changedPixels).toBeGreaterThan(300);

  await page.getByRole("button", { name: "Show Demo Box" }).click();
  const restored = await selection.boundingBox();
  expect(restored).not.toBeNull();
  const layers = page.getByLabel("Layers");
  await layers.getByRole("option", { name: /Demo Sphere/ }).click();
  await expect(selection).toHaveCount(0);
  await page.mouse.click(
    restored!.x + restored!.width / 2,
    restored!.y + restored!.height / 2,
  );
  await expect(selection).toBeVisible();

  // The expanded transparent WebGL surface must not steal clicks from 2D
  // artwork that also sits outside the page.
  await layers.getByRole("option", { name: /Hybrid Platform/ }).click();
  await page.getByRole("spinbutton", { name: "x", exact: true }).fill("2000");
  await page.getByRole("spinbutton", { name: "x", exact: true }).blur();
  const platform = page.locator('[data-element-id="three-demo-platform"]');
  const platformBounds = await platform.boundingBox();
  expect(platformBounds).not.toBeNull();
  expect(platformBounds!.x).toBeGreaterThan(artboard!.x + artboard!.width);
  await layers.getByRole("option", { name: /Demo Sphere/ }).click();
  await page.mouse.click(
    platformBounds!.x + Math.min(70, platformBounds!.width / 3),
    platformBounds!.y + platformBounds!.height / 2,
  );
  await expect(platform).toHaveClass(/is-selected/);

  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  const previewPage = preview.locator(".viewer-preview-page");
  const previewScene = preview.getByLabel("3D scene");
  await expect(previewScene).toBeVisible();
  const previewPageBounds = await previewPage.boundingBox();
  const previewSceneBounds = await previewScene.boundingBox();
  expect(previewPageBounds).not.toBeNull();
  expect(previewSceneBounds).not.toBeNull();
  expect(
    Math.abs(previewPageBounds!.width - previewSceneBounds!.width),
  ).toBeLessThan(1);
  expect(
    Math.abs(previewPageBounds!.height - previewSceneBounds!.height),
  ).toBeLessThan(1);
});
