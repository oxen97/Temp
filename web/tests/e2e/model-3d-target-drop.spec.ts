import { expect, test, type Page } from "@playwright/test";

async function choose(page: Page, label: string, option: string | RegExp) {
  await page
    .getByRole("tabpanel", { name: "Interaction settings" })
    .getByRole("button", { name: label, exact: true })
    .click();
  await page
    .getByRole("listbox", { name: `${label} menu`, exact: true })
    .getByRole("option", { name: option, exact: typeof option === "string" })
    .click();
}

for (const target of ["Demo Sphere", "Hybrid Platform"] as const) {
  test(`authored 3D snap lands consistently on ${target} from different drop points`, async ({
    page,
  }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1000, "Desktop authoring");
    test.setTimeout(90000);
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
    for (const name of ["Toggle Grow on hover", "Toggle Spin on click"])
      await panel.getByRole("button", { name, exact: true }).click();
    await panel
      .getByRole("button", { name: "+ Add interaction", exact: true })
      .click();
    await choose(page, "Trigger", /Drop [Oo]n Target/);
    await choose(page, "Effect", "Snap to Target");
    await choose(page, "Collision target element", new RegExp(`^${target}\\b`));
    const preview = page.getByRole("dialog", { name: "Viewer preview" });
    const scene = preview.getByLabel("3D scene");
    const takeDrop = async (offset: number) => {
      await page.getByRole("button", { name: "Preview", exact: true }).click();
      await expect(scene).toBeVisible();
      const bounds = (await scene.boundingBox())!;
      const scale = bounds.width / 1920;
      await page.waitForTimeout(350);
      const before = await scene.screenshot();
      await page.mouse.move(bounds.x + 770 * scale, bounds.y + 540 * scale);
      await page.mouse.down();
      await page.mouse.move(
        bounds.x + (960 + offset) * scale,
        bounds.y + (target === "Demo Sphere" ? 540 : 810) * scale,
        { steps: 12 },
      );
      await page.mouse.up();
      await page.mouse.move(bounds.x + 20, bounds.y + 20);
      await expect
        .poll(async () => (await scene.screenshot()).equals(before))
        .toBe(false);
      await page.waitForTimeout(200);
      const after = await scene.screenshot();
      await page
        .getByRole("button", { name: "Close preview", exact: true })
        .click();
      return after;
    };
    const first = await takeDrop(-35);
    const second = await takeDrop(35);
    expect(second.equals(first)).toBe(true);
    expect(errors).toEqual([]);
  });
}
