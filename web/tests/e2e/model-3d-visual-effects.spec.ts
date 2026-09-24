import { expect, test } from "@playwright/test";

for (const effect of ["Blur", "Shadow"]) {
  test(`authored 3D ${effect} is isolated and clears without shader errors`, async ({
    page,
  }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1000, "Desktop authoring");
    await page.setViewportSize({ width: 1920, height: 1080 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
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
    await panel.getByRole("button", { name: "Effect", exact: true }).click();
    await page.getByRole("option", { name: effect, exact: true }).click();
    if (effect === "Blur") {
      await panel.getByLabel("Blur amount", { exact: true }).fill("20");
      await panel.getByLabel("Blur amount", { exact: true }).press("Tab");
    } else {
      await panel.getByLabel("Shadow X", { exact: true }).fill("20");
      await panel.getByLabel("Shadow X", { exact: true }).press("Tab");
      await panel
        .getByLabel("Shadow color", { exact: true })
        .fill("rgba(0, 0, 0, 0.8)");
      await panel.getByLabel("Shadow color", { exact: true }).press("Tab");
    }
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    const scene = page
      .getByRole("dialog", { name: "Viewer preview" })
      .getByLabel("3D scene");
    await expect(scene).toBeVisible();
    const bounds = (await scene.boundingBox())!;
    const scale = bounds.width / 1920;
    const clip = (x: number, y: number, width: number, height: number) => ({
      x: bounds.x + x * scale,
      y: bounds.y + y * scale,
      width: width * scale,
      height: height * scale,
    });
    // Rendering is asynchronous; wait for a non-empty, stable preview first.
    await expect(scene.locator("canvas")).toHaveJSProperty("width", 1920);
    await page.waitForTimeout(500);
    const targetClip = clip(650, 410, 230, 255);
    const peerClip = clip(1090, 470, 100, 120);
    const before = await page.screenshot({ clip: targetClip });
    const peerBefore = await page.screenshot({ clip: peerClip });
    await page.mouse.click(bounds.x + 770 * scale, bounds.y + 540 * scale);
    await expect
      .poll(async () =>
        (await page.screenshot({ clip: targetClip })).equals(before),
      )
      .toBe(false);
    expect((await page.screenshot({ clip: peerClip })).equals(peerBefore)).toBe(
      true,
    );
    await page.mouse.click(bounds.x + 770 * scale, bounds.y + 540 * scale);
    await expect
      .poll(async () =>
        (await page.screenshot({ clip: targetClip })).equals(before),
      )
      .toBe(true);
    expect(errors).toEqual([]);
  });
}
