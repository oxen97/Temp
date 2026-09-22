import { expect, test } from "@playwright/test";

test("3D projection remains aligned with the artboard while zooming", async ({
  page,
}) => {
  test.skip((page.viewportSize()?.width ?? 0) <= 960, "Desktop editor only");
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.goto("/?threeDemo=1");
  await page
    .getByLabel("Layers")
    .getByRole("option", { name: /Demo Box/ })
    .click();

  const artboard = page.getByLabel("Artboard");
  const selection = page.getByLabel("3D selection Demo Box");
  await expect(selection).toBeVisible();
  const sizeRatio = async () => {
    const board = await artboard.boundingBox();
    const box = await selection.boundingBox();
    if (!board || !box) throw new Error("3D projection is unavailable");
    return box.width / board.width;
  };
  const initialRatio = await sizeRatio();
  const scene = page.getByLabel("3D scene");
  const sceneMetrics = async () => {
    const bounds = await scene.boundingBox();
    if (!bounds) throw new Error("3D scene bounds are unavailable");
    const backing = await scene
      .locator("canvas")
      .evaluate((element: HTMLCanvasElement) => ({
        height: element.height,
        width: element.width,
      }));
    return { backing, bounds };
  };
  const canvas = await page.getByLabel("Exhibition canvas").boundingBox();
  if (!canvas) throw new Error("Editor canvas is unavailable");
  await page.mouse.move(
    canvas.x + canvas.width / 2,
    canvas.y + canvas.height / 2,
  );
  await page.keyboard.down("Control");

  for (let step = 0; step < 5; step += 1) {
    await page.mouse.wheel(0, -120);
  }
  await expect(page.locator(".zoom-menu")).toContainText("150 %");
  const baselineScene = await sceneMetrics();

  for (const zoom of [140, 130, 120, 110, 100, 90, 80, 70, 60, 50]) {
    await page.mouse.wheel(0, 120);
    await expect(page.locator(".zoom-menu")).toContainText(`${zoom} %`);
    await expect
      .poll(async () => {
        const current = await sceneMetrics();
        return Math.max(
          Math.abs(current.bounds.width - baselineScene.bounds.width),
          Math.abs(current.bounds.height - baselineScene.bounds.height),
        );
      })
      .toBeLessThan(1);
    const current = await sceneMetrics();
    expect(current.backing.width / current.bounds.width).toBeGreaterThan(0.95);
    expect(current.backing.height / current.bounds.height).toBeGreaterThan(
      0.95,
    );
  }
  await expect.poll(sizeRatio).toBeGreaterThan(initialRatio * 0.98);
  await expect.poll(sizeRatio).toBeLessThan(initialRatio * 1.02);

  for (let step = 0; step < 5; step += 1) {
    await page.mouse.wheel(0, 120);
  }
  await expect(page.locator(".zoom-menu")).toContainText("5 %");
  const distantScene = await sceneMetrics();
  expect(distantScene.backing.width).toBeLessThan(4096);
  expect(distantScene.backing.width / distantScene.bounds.width).toBeGreaterThan(
    0.95,
  );

  for (let step = 0; step < 10; step += 1) {
    await page.mouse.wheel(0, -120);
  }
  await page.keyboard.up("Control");
  await expect(page.locator(".zoom-menu")).toContainText("105 %");
  await expect.poll(sizeRatio).toBeGreaterThan(initialRatio * 0.98);
  await expect.poll(sizeRatio).toBeLessThan(initialRatio * 1.02);
});
