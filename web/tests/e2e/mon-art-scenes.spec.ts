import { expect, test, type Locator } from "@playwright/test";

import { trailMarks } from "./trail-marks";

const sceneNames = ["BREEZE", "INK", "BLOOM", "TOPOGRAPHY"] as const;

function nextSceneButton(preview: Locator, index: number) {
  return preview.locator(`[data-element-id="mon-art-${index + 1}-next-hit"]`);
}

async function interiorCubicControlX(path: Locator) {
  return path.evaluate((node) => {
    // The first segment starts at the anchored edge; the second segment's
    // outgoing handle lies inside the contour and responds to the pointer.
    const match = [
      ...(node.getAttribute("d") ?? "").matchAll(/C\s*([-+\d.eE]+)/g),
    ][1];
    if (!match)
      throw new Error("Expected a contour with an interior cubic segment");
    return Number(match[1]);
  });
}

test("authored Click/Tap and Logic rules route all four AMOUS preview scenes", async ({
  page,
}) => {
  await page.goto("/?interactionDemo=mon-art");
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  await expect(preview).toBeVisible();
  await expect(preview.locator(".viewer-preview-page")).toBeVisible();

  for (let index = 0; index < sceneNames.length; index += 1) {
    await expect(
      preview.locator(`[data-element-id="mon-art-${index + 1}-scene-title"]`),
    ).toContainText(sceneNames[index]);
    await expect(preview).toContainText("AMOUS");
    await expect(preview).not.toContainText(/\bMON\b|M[•·]N|Kim Jongmin/);
    const button = nextSceneButton(preview, index);
    await expect(button).toHaveAttribute("role", "button");
    await button.click();
  }

  await expect(
    preview.locator('[data-element-id="mon-art-1-scene-title"]'),
  ).toContainText("BREEZE");
});

test("BREEZE bends editable reeds and their neighbors during a swipe", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 1000,
    "Desktop pointer gestures only",
  );
  await page.goto("/?interactionDemo=mon-art");
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  const strand = preview.locator('[data-element-id="mon-art-1-bar-11"]');
  const path = strand.locator(".pen-visible-path");
  const neighbor = preview.locator('[data-element-id="mon-art-1-bar-12"]');
  const neighborPath = neighbor.locator(".pen-visible-path");
  await expect(strand).toBeVisible();
  await expect(path).toHaveAttribute("d", /M /);
  const restingPath = await path.getAttribute("d");
  const neighboringRestPath = await neighborPath.getAttribute("d");
  const restingTransform = await strand.evaluate(
    (node) => (node as HTMLElement).style.transform,
  );
  const bounds = await strand.boundingBox();
  if (!bounds) throw new Error("Native strand has no hit area");
  const { x, y } = await path.evaluate((node) => {
    const curve = node as SVGPathElement;
    const matrix = curve.getScreenCTM();
    if (!matrix) throw new Error("Native reed has no screen transform");
    const point = curve.getPointAtLength(curve.getTotalLength() * 0.42);
    const screenPoint = new DOMPoint(point.x, point.y).matrixTransform(matrix);
    return { x: screenPoint.x, y: screenPoint.y };
  });
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + Math.max(60, bounds.width * 1.8), y + 25, {
    steps: 10,
  });
  await expect.poll(() => path.getAttribute("d")).not.toBe(restingPath);
  await expect
    .poll(() => neighborPath.getAttribute("d"))
    .not.toBe(neighboringRestPath);
  expect(
    await strand.evaluate((node) => (node as HTMLElement).style.transform),
  ).toBe(restingTransform);
  const verticalCoordinates = () => path.evaluate((node) =>
    (node.getAttribute("d")?.match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [])
      // Check the actual bones (M / C endpoints), not tangent handles whose
      // lengths also change slightly as horizontal curvature changes.
      .map(Number).filter((_, index) => index % 6 === 1),
  );
  const beforeVerticalMove = await verticalCoordinates();
  // A vertical/stationary sample in a horizontal swipe must never switch to
  // pinning the material point under the pointer and buckle the reed.
  await page.mouse.move(x + Math.max(60, bounds.width * 1.8), y + 100, { steps: 3 });
  await page.evaluate(() => new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  ));
  expect(await verticalCoordinates()).toEqual(beforeVerticalMove);
  await page.mouse.up();
});

test("the artwork close label ends preview through its Logic rule", async ({
  page,
}) => {
  await page.goto("/?interactionDemo=mon-art");
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  await expect(preview).toBeVisible();
  await preview.locator('[data-element-id="mon-art-1-close"]').click();
  await expect(preview).toBeHidden();
});

test("wave effect remains visible when editing a Pointer Move pen path", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 1000,
    "Desktop editor panel only",
  );
  await page.goto("/?interactionDemo=mon-art");
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  await preview.getByRole("button", { name: "Close preview" }).click();
  await page.locator(".scenes-section .scene-item").nth(3).click();
  const interactionPanel = page.getByRole("tabpanel", {
    name: "Interaction settings",
  });
  await interactionPanel
    .getByRole("button", { name: "Effect", exact: true })
    .click();
  await expect(
    interactionPanel
      .getByRole("listbox", { name: "Effect menu" })
      .getByRole("option", { name: "Wave / Curve Deform" }),
  ).toBeVisible();
  await interactionPanel
    .getByRole("button", { name: "Effect", exact: true })
    .click();
  await interactionPanel
    .getByRole("button", { name: "+ Add interaction" })
    .click();
  await interactionPanel
    .getByRole("button", { name: "Trigger", exact: true })
    .click();
  await interactionPanel
    .getByRole("listbox", { name: "Trigger menu" })
    .getByRole("option", { name: "Pointer Move / Touch Move" })
    .click();
  await interactionPanel
    .getByRole("button", { name: "Effect", exact: true })
    .click();
  await expect(
    interactionPanel
      .getByRole("listbox", { name: "Effect menu" })
      .getByRole("option", { name: "Wave / Curve Deform" }),
  ).toBeVisible();
});

test("TOPOGRAPHY settings keep contour names and additional paths in separate rows", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 1000,
    "Desktop editor panel only",
  );
  await page.goto("/?interactionDemo=mon-art");
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  await preview.getByRole("button", { name: "Close preview" }).click();
  await page.locator(".scenes-section .scene-item").nth(3).click();
  const panel = page.getByRole("tabpanel", { name: "Interaction settings" });
  const row = panel.locator(".interaction-row").first();
  const name = row.locator(".interaction-row-name");
  await expect(name).toHaveText("Pointer-responsive contour field");
  const rowBox = await row.boundingBox();
  const nameBox = await name.boundingBox();
  if (!rowBox || !nameBox) throw new Error("Interaction row is not laid out");
  expect(rowBox.height).toBeGreaterThanOrEqual(24);
  expect(nameBox.y).toBeGreaterThanOrEqual(rowBox.y);
  expect(nameBox.y + nameBox.height).toBeLessThanOrEqual(
    rowBox.y + rowBox.height + 1,
  );

  const firstPath = panel.getByRole("button", {
    name: "Wave target: Contour path 2",
    exact: true,
  });
  const secondPath = panel.getByRole("button", {
    name: "Wave target: Contour path 3",
    exact: true,
  });
  await firstPath.scrollIntoViewIfNeeded();
  const firstBox = await firstPath.boundingBox();
  const secondBox = await secondPath.boundingBox();
  if (!firstBox || !secondBox)
    throw new Error("Wave path options are not laid out");
  expect(firstBox.y + firstBox.height).toBeLessThanOrEqual(secondBox.y + 1);
});

test("native preview navigation updates the selected editor scene and reopens there", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 1000,
    "Desktop editor panels only",
  );
  await page.goto("/?interactionDemo=mon-art");
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  await expect(preview).toBeVisible();
  for (let index = 0; index < sceneNames.length - 1; index += 1) {
    await nextSceneButton(preview, index).click();
  }
  await expect(
    preview.locator('[data-element-id="mon-art-4-scene-title"]'),
  ).toContainText("TOPOGRAPHY");
  await preview.getByRole("button", { name: "Close preview" }).click();
  await expect(preview).toBeHidden();

  const scenes = page.locator(".scenes-section .scene-item");
  await expect(scenes).toHaveCount(sceneNames.length);
  for (const [index, name] of sceneNames.entries()) {
    await expect(scenes.nth(index)).toContainText(name);
  }
  await expect(scenes.nth(3)).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("tab", { name: "INTERACTION" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  const selectedElement = page
    .getByRole("application", { name: "Artboard" })
    .locator(".canvas-element.is-selected")
    .first();
  await expect(selectedElement).toBeVisible();
  const selectedName = page
    .getByRole("tabpanel", { name: "Interaction settings" })
    .locator(".interaction-selected strong");
  await expect(selectedName).not.toHaveText("No selection");
  await expect(selectedElement).toHaveAttribute(
    "aria-label",
    await selectedName.innerText(),
  );

  await scenes.nth(1).click();
  await expect(scenes.nth(1)).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: /Preview/ })
    .first()
    .click();
  await expect(preview).toBeVisible();
  await expect(
    preview.locator('[data-element-id="mon-art-2-scene-title"]'),
  ).toContainText("INK");
});

test("changing a scene destination in INTERACTION changes the native preview route", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 1000,
    "Desktop editor panels only",
  );
  await page.goto("/?interactionDemo=mon-art");
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  await preview.getByRole("button", { name: "Close preview" }).click();

  await page
    .getByLabel("Layers")
    .getByRole("option", { name: "Next scene · Logic trigger" })
    .click();
  await page.getByRole("tab", { name: "INTERACTION" }).click();
  const interactionPanel = page.getByRole("tabpanel", {
    name: "Interaction settings",
  });
  await expect(
    interactionPanel.getByText("Next Scene", { exact: true }).first(),
  ).toBeVisible();
  await interactionPanel
    .getByRole("button", { name: "Interaction target scene" })
    .click();
  await interactionPanel
    .getByRole("listbox", { name: "Interaction target scene menu" })
    .getByRole("option", { name: "BLOOM" })
    .click();
  await expect(
    interactionPanel.getByRole("button", { name: "Interaction target scene" }),
  ).toContainText("BLOOM");

  await page.getByRole("tab", { name: "LOGIC" }).click();
  const logicPanel = page.getByRole("tabpanel", { name: "Logic settings" });
  await expect(
    logicPanel.getByRole("combobox", { name: "Target Scene" }),
  ).toHaveValue("mon-art-scene-3");

  await page
    .getByRole("button", { name: /Preview/ })
    .first()
    .click();
  await expect(preview).toBeVisible();
  await nextSceneButton(preview, 0).click();
  await expect(
    preview.locator('[data-element-id="mon-art-3-scene-title"]'),
  ).toContainText("BLOOM");
});

test("native pages produce ink trails, click-spawned flowers, and pointer-responsive contours", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 1000,
    "Desktop pointer gestures only",
  );
  await page.goto("/?interactionDemo=mon-art");
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  await nextSceneButton(preview, 0).click();
  await expect(
    preview.locator('[data-element-id="mon-art-2-scene-title"]'),
  ).toContainText("INK");

  const pageBounds = await preview
    .locator(".viewer-preview-page")
    .boundingBox();
  if (!pageBounds) throw new Error("Native preview has no page bounds");
  const x = pageBounds.x + pageBounds.width * 0.43;
  const y = pageBounds.y + pageBounds.height * 0.37;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(
    x + pageBounds.width * 0.14,
    y + pageBounds.height * 0.05,
    {
      steps: 12,
    },
  );
  await expect
    .poll(async () => (await trailMarks(preview)).length)
    .toBeGreaterThan(0);
  await expect(
    preview.locator(".viewer-pointer-trail-canvas").first(),
  ).toBeVisible();
  await page.mouse.up();

  await nextSceneButton(preview, 1).click();
  await expect(
    preview.locator('[data-element-id="mon-art-3-scene-title"]'),
  ).toContainText("BLOOM");
  const spawned = preview.locator("[data-spawn-instance-id]");
  await expect(spawned).toHaveCount(0);
  await page.mouse.click(x, y);
  await expect(spawned.first()).toBeVisible();

  await nextSceneButton(preview, 2).click();
  await expect(
    preview.locator('[data-element-id="mon-art-4-scene-title"]'),
  ).toContainText("TOPOGRAPHY");
  const wavePath = preview.locator(
    '[data-element-id="mon-art-4-wave-19"] .pen-visible-path',
  );
  await expect(wavePath).toBeVisible();
  await page.mouse.move(
    pageBounds.x + pageBounds.width * 0.5,
    pageBounds.y + pageBounds.height * 0.5,
  );
  await expect.poll(() => interiorCubicControlX(wavePath)).toBeGreaterThan(0);
  const centeredX = await interiorCubicControlX(wavePath);
  await page.mouse.move(
    pageBounds.x + pageBounds.width * 0.86,
    pageBounds.y + pageBounds.height * 0.5,
    { steps: 8 },
  );
  await expect
    .poll(async () => (await interiorCubicControlX(wavePath)) - centeredX)
    .toBeGreaterThan(5);
});
