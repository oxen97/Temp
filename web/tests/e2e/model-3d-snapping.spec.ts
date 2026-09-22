import { expect, test } from "@playwright/test";

test.describe("3D drag magnetic guides", () => {
  test.beforeEach(async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) <= 960, "Desktop editor only");
    await page.goto("/?threeDemo=1");
    await expect(page.getByLabel("3D scene")).toBeVisible();
  });

  test("snaps a 3D object's projected center to the artboard center", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Hide Demo Sphere" }).click();
    await page.getByRole("button", { name: "Hide Demo Torus" }).click();
    await page
      .getByLabel("Layers")
      .getByRole("option", { name: /Demo Box/ })
      .click();
    const artboard = await page.getByLabel("Artboard").boundingBox();
    const selection = page.getByLabel("3D selection Demo Box");
    const initial = await selection.boundingBox();
    expect(artboard).not.toBeNull();
    expect(initial).not.toBeNull();
    const origin = {
      x: artboard!.x + (770 / 1920) * artboard!.width,
      y: artboard!.y + (540 / 1080) * artboard!.height,
    };
    const targetX =
      origin.x +
      artboard!.x +
      artboard!.width / 2 -
      (initial!.x + initial!.width / 2) +
      5;

    await page.mouse.move(origin.x, origin.y);
    await page.mouse.down();
    await page.mouse.move(targetX, origin.y, { steps: 8 });
    await expect
      .poll(async () =>
        page.locator(".smart-guide.is-vertical").evaluate((node) => ({
          hidden: (node as HTMLElement).hidden,
          left: (node as HTMLElement).style.left,
        })),
      )
      .toEqual({ hidden: false, left: "960px" });
    await page.mouse.up();

    const moved = await selection.boundingBox();
    expect(moved).not.toBeNull();
    expect(
      Math.abs(
        moved!.x + moved!.width / 2 - (artboard!.x + artboard!.width / 2),
      ),
    ).toBeLessThan(2);
    await expect(page.locator(".smart-guide.is-vertical")).toBeHidden();
  });

  test("snaps a 3D object to equal spacing between two other 3D objects", async ({
    page,
  }) => {
    const layers = page.getByLabel("Layers");
    await layers.getByRole("option", { name: /Demo Box/ }).click();
    const left = await page.getByLabel("3D selection Demo Box").boundingBox();
    await layers.getByRole("option", { name: /Demo Torus/ }).click();
    const right = await page
      .getByLabel("3D selection Demo Torus")
      .boundingBox();
    await layers.getByRole("option", { name: /Demo Sphere/ }).click();
    const sphere = page.getByLabel("3D selection Demo Sphere");
    const middle = await sphere.boundingBox();
    expect(left).not.toBeNull();
    expect(right).not.toBeNull();
    expect(middle).not.toBeNull();
    const desiredLeft = (left!.x + left!.width + right!.x - middle!.width) / 2;
    const origin = {
      x: middle!.x + middle!.width / 2,
      y: middle!.y + middle!.height / 2,
    };

    await page.mouse.move(origin.x, origin.y);
    await page.mouse.down();
    await page.mouse.move(origin.x - 60, origin.y, { steps: 5 });
    await page.mouse.move(origin.x + desiredLeft - middle!.x + 4, origin.y, {
      steps: 8,
    });
    await expect(
      page.locator(".distance-preview-slot:not([hidden])"),
    ).not.toHaveCount(0);
    await page.mouse.up();

    const placed = await sphere.boundingBox();
    expect(placed).not.toBeNull();
    const gapLeft = placed!.x - (left!.x + left!.width);
    const gapRight = right!.x - (placed!.x + placed!.width);
    expect(Math.abs(gapLeft - gapRight)).toBeLessThan(2);
  });

  test("snaps a 3D object to a fixed 2D shape edge", async ({ page }) => {
    await page.getByRole("button", { name: "Hide Demo Sphere" }).click();
    await page.getByRole("button", { name: "Hide Demo Torus" }).click();
    await page
      .getByLabel("Layers")
      .getByRole("option", { name: /Demo Box/ })
      .click();
    const artboard = await page.getByLabel("Artboard").boundingBox();
    const platform = await page
      .locator('[data-element-id="three-demo-platform"]')
      .boundingBox();
    const selection = page.getByLabel("3D selection Demo Box");
    const initial = await selection.boundingBox();
    expect(artboard).not.toBeNull();
    expect(platform).not.toBeNull();
    expect(initial).not.toBeNull();
    const scale = artboard!.width / 1920;
    const origin = {
      x: artboard!.x + 770 * scale,
      y: artboard!.y + 540 * scale,
    };
    const targetY = origin.y + platform!.y - initial!.y + 4;

    await page.mouse.move(origin.x, origin.y);
    await page.mouse.down();
    await page.mouse.move(origin.x, targetY, { steps: 10 });
    await expect
      .poll(() =>
        page.locator(".smart-guide.is-horizontal").evaluate((node) => ({
          hidden: (node as HTMLElement).hidden,
          top: (node as HTMLElement).style.top,
        })),
      )
      .toEqual({ hidden: false, top: "790px" });
    await page.mouse.up();
    const placed = await selection.boundingBox();
    expect(placed).not.toBeNull();
    expect(Math.abs(placed!.y - platform!.y)).toBeLessThan(2);
  });
});
