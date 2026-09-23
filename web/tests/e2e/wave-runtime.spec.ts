import { expect, test, type Locator, type Page } from "@playwright/test";

async function openTopographyEditor(page: Page) {
  await page.goto("/?interactionDemo=mon-art");
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  await preview.getByRole("button", { name: "Close preview" }).click();
  await page.locator(".scenes-section .scene-item").nth(3).click();
  return {
    panel: page.getByRole("tabpanel", { name: "Interaction settings" }),
    preview,
  };
}

async function setNumber(panel: Locator, label: string, value: number) {
  const input = panel.getByLabel(label, { exact: true });
  await input.fill(String(value));
  await input.press("Enter");
  await expect(input).toHaveValue(String(value));
}

async function startPreview(page: Page, preview: Locator) {
  await page
    .getByRole("button", { name: /Preview/ })
    .first()
    .click();
  await expect(preview).toBeVisible();
  const bounds = await preview.locator(".viewer-preview-page").boundingBox();
  if (!bounds) throw new Error("Preview has no artwork bounds");
  return bounds;
}

async function nextFrames(page: Page, count = 3) {
  await page.evaluate(async (frames) => {
    for (let index = 0; index < frames; index += 1) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
    }
  }, count);
}

test("editing Wave controls in INTERACTION persists and changes the common preview runtime", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 1000,
    "Desktop authoring panel",
  );
  const { panel, preview } = await openTopographyEditor(page);
  // Remove ambient motion so any geometry change must come from the authored
  // pointer influence, not elapsed time or a demo-specific animation.
  await setNumber(panel, "Wave amplitude", 0);
  await setNumber(panel, "Wave speed", 0);
  await setNumber(panel, "Wave pointer X influence", 0);
  await setNumber(panel, "Wave pointer Y influence", 0);
  const bounds = await startPreview(page, preview);
  const path = preview.locator(
    '[data-element-id="mon-art-4-wave-1"] .pen-visible-path',
  );
  await expect(path).toBeVisible();
  const resting = await path.getAttribute("d");
  await page.mouse.move(
    bounds.x + bounds.width * 0.85,
    bounds.y + bounds.height * 0.5,
  );
  await nextFrames(page);
  expect(await path.getAttribute("d")).toBe(resting);

  await preview.getByRole("button", { name: "Close preview" }).click();
  await setNumber(panel, "Wave pointer X influence", 240);
  const scenes = page.locator(".scenes-section .scene-item");
  await scenes.nth(0).click();
  await scenes.nth(3).click();
  await expect(
    panel.getByLabel("Wave pointer X influence", { exact: true }),
  ).toHaveValue("240");
  await expect(panel.getByLabel("Wave amplitude", { exact: true })).toHaveValue(
    "0",
  );
  await startPreview(page, preview);
  await page.mouse.move(
    bounds.x + bounds.width * 0.5,
    bounds.y + bounds.height * 0.5,
  );
  await nextFrames(page);
  const centered = await path.getAttribute("d");
  await page.mouse.move(
    bounds.x + bounds.width * 0.85,
    bounds.y + bounds.height * 0.5,
  );
  await expect.poll(() => path.getAttribute("d")).not.toBe(centered);
});

test("ambient waves animate without pointer input and reduced motion stops their clock", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 1000,
    "Desktop authoring panel",
  );
  const { panel, preview } = await openTopographyEditor(page);
  await setNumber(panel, "Wave speed", 0.4);
  await setNumber(panel, "Wave amplitude", 30);
  // Keep the pointer outside the preview so this exercises idle animation.
  await page.mouse.move(0, 0);
  await startPreview(page, preview);
  await page.mouse.move(0, 0);
  const path = preview.locator(
    '[data-element-id="mon-art-4-wave-1"] .pen-visible-path',
  );
  await expect(path).toBeVisible();
  const initial = await path.getAttribute("d");
  await expect.poll(() => path.getAttribute("d")).not.toBe(initial);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await nextFrames(page, 5);
  const reduced = await path.getAttribute("d");
  await nextFrames(page, 15);
  expect(await path.getAttribute("d")).toBe(reduced);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(() => path.getAttribute("d")).not.toBe(reduced);

  await preview.locator('[data-element-id="mon-art-4-next-hit"]').click();
  await expect(
    preview.locator('[data-element-id="mon-art-1-scene-title"]'),
  ).toContainText("BREEZE");
});

test("Direct pointer tracking does not inherit the event animation transform transition", async ({
  page,
}) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1000, "Desktop pointer input");
  const { preview } = await openTopographyEditor(page);
  const bounds = await startPreview(page, preview);
  const summit = preview.locator('[data-element-id="field-topography-center"]');
  await expect(summit).toBeVisible();
  await page.mouse.move(
    bounds.x + bounds.width * 0.2,
    bounds.y + bounds.height * 0.5,
  );
  await nextFrames(page);
  const firstTransform = await summit.evaluate(
    (node) => (node as HTMLElement).style.transform,
  );
  await page.mouse.move(
    bounds.x + bounds.width * 0.8,
    bounds.y + bounds.height * 0.5,
  );
  await expect
    .poll(() =>
      summit.evaluate((node) => (node as HTMLElement).style.transform),
    )
    .not.toBe(firstTransform);
  const transformTransitionDuration = await summit.evaluate((node) => {
    const style = getComputedStyle(node);
    const properties = style.transitionProperty
      .split(",")
      .map((value) => value.trim());
    const durations = style.transitionDuration
      .split(",")
      .map((value) => parseFloat(value));
    return Math.max(
      0,
      ...properties.map((property, index) =>
        property === "transform" || property === "all"
          ? durations[index % durations.length]
          : 0,
      ),
    );
  });
  expect(transformTransitionDuration).toBe(0);
});

test("TIMING Smoothing controls pointer catch-up without changing an event Duration", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 1000,
    "Desktop authoring panel",
  );
  const { panel, preview } = await openTopographyEditor(page);
  await page
    .getByLabel("Layers")
    .getByRole("option", { name: /^Terracotta summit/ })
    .click();
  await setNumber(panel, "Smoothing", 0.4);
  await startPreview(page, preview);
  const summit = preview.locator('[data-element-id="field-topography-center"]');
  await expect(summit).toHaveCSS("transition-duration", "0.4s, 0.3s, 0.3s");
  await preview.getByRole("button", { name: "Close preview" }).click();
  const smoothing = panel.getByLabel("Smoothing", { exact: true });
  await smoothing.fill("0");
  await smoothing.press("Enter");
  await expect(smoothing).toHaveValue("0.0");
  await startPreview(page, preview);
  await expect(summit).toHaveCSS("transition-duration", "0s, 0.3s, 0.3s");
});

test("adding a Click opacity effect keeps both it and existing Pointer Move behavior working", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 1000,
    "Desktop authoring panel",
  );
  const { panel, preview } = await openTopographyEditor(page);
  await page
    .getByLabel("Layers")
    .getByRole("option", { name: /^Terracotta summit/ })
    .click();
  await panel
    .getByRole("button", { name: "+ Add interaction", exact: true })
    .click();
  await panel.getByRole("button", { name: "Effect", exact: true }).click();
  await panel
    .getByRole("listbox", { name: "Effect menu" })
    .getByRole("option", { name: "Opacity", exact: true })
    .click();
  const bounds = await startPreview(page, preview);
  const summit = preview.locator('[data-element-id="field-topography-center"]');
  await summit.click();
  await expect(summit).toHaveCSS("opacity", "0.4");
  const afterClick = await summit.evaluate(
    (node) => (node as HTMLElement).style.transform,
  );
  await page.mouse.move(
    bounds.x + bounds.width * 0.8,
    bounds.y + bounds.height * 0.5,
  );
  await expect
    .poll(() =>
      summit.evaluate((node) => (node as HTMLElement).style.transform),
    )
    .not.toBe(afterClick);
  await expect(summit).toHaveCSS("opacity", "0.4");
});
