import { expect, test } from "@playwright/test";

test("edits and plays a 3D object's interaction sound in the viewer", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) <= 960, "Desktop editor only");
  await page.goto("/?threeDemo=1");
  await page.getByLabel("Layers").getByRole("option", { name: /Demo Box/ }).click();
  await page.getByRole("tab", { name: "SOUND" }).click();

  const panel = page.getByRole("tabpanel", { name: "Sound settings" });
  await expect(panel.getByRole("region", { name: "Interaction Sounds" })).toBeVisible();
  await panel.getByRole("button", { name: "More Hover sound options" }).click();
  await panel.getByRole("menuitem", { name: "Event Settings" }).click();
  await panel.getByRole("button", { name: "Hover sound trigger" }).click();
  await page.getByRole("listbox", { name: "Hover sound trigger menu" })
    .getByRole("option", { name: "Click" }).click();
  const chooser = page.waitForEvent("filechooser");
  await panel.getByRole("button", { name: "Add Sound" }).click();
  await (await chooser).setFiles("public/figma/sound/test-interaction-click.wav");
  await expect(panel.getByLabel(/Click sound file name:/)).toContainText("test-interaction-click.wav");

  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  const scene = preview.getByLabel("3D scene");
  await expect(scene).toBeVisible();
  const interactionAudio = preview.locator(".viewer-interaction-sound");
  await interactionAudio.evaluate((audio: HTMLAudioElement) => {
    audio.play = async () => {
      audio.dataset.playRequested = "true";
    };
  });
  const bounds = await scene.boundingBox();
  expect(bounds).not.toBeNull();
  const clickX = bounds!.x + (770 / 1920) * bounds!.width;
  const clickY = bounds!.y + (540 / 1080) * bounds!.height;
  await expect.poll(async () => {
    await page.mouse.click(clickX, clickY);
    return interactionAudio.getAttribute("data-play-requested");
  }, { timeout: 10_000 }).toBe("true");
  await expect.poll(async () => interactionAudio.getAttribute("src")).toMatch(/^blob:/);
});

test("moves and resizes a selected 3D object on the artboard", async ({
  page,
}) => {
  test.skip((page.viewportSize()?.width ?? 0) <= 960, "Desktop editor only");
  await page.goto("/?threeDemo=1");
  const artboard = page.getByLabel("Artboard");
  await expect(page.getByLabel("3D scene")).toBeVisible();

  const frame = await artboard.boundingBox();
  expect(frame).not.toBeNull();
  const scale = frame!.width / 1920;
  const center = {
    x: frame!.x + (960 - 190) * scale,
    y: frame!.y + 540 * scale,
  };
  await page.mouse.click(center.x, center.y);
  const selection = page.getByLabel("3D selection Demo Box");
  await expect(selection).toBeVisible();
  const initial = await selection.boundingBox();
  expect(initial).not.toBeNull();

  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 50, center.y + 35, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await selection.boundingBox())?.x).toBeGreaterThan(
    initial!.x + 30,
  );
  const moved = await selection.boundingBox();
  expect(moved).not.toBeNull();

  const resize = page.getByRole("button", {
    name: "Resize 3D Demo Box se",
  });
  const handle = await resize.boundingBox();
  expect(handle).not.toBeNull();
  const handleX = handle!.x + handle!.width / 2;
  const handleY = handle!.y + handle!.height / 2;
  await page.mouse.move(handleX, handleY);
  await page.mouse.down();
  await page.mouse.move(handleX + 45, handleY + 30, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await selection.boundingBox())?.width).toBeGreaterThan(
    moved!.width + 20,
  );
  const rotationY = page.getByRole("spinbutton", { name: "Rotation Y" });
  await expect(rotationY).toBeVisible();
  await rotationY.fill("70");
  await rotationY.blur();
  await expect(rotationY).toHaveValue("70");
});

test("a locked 3D object cannot be selected or dragged on the canvas", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) <= 960, "Desktop editor only");
  await page.goto("/?threeDemo=1");
  const layer = page.getByLabel("Layers").getByRole("option", { name: /Demo Box/ });
  await layer.click();
  const selection = page.getByLabel("3D selection Demo Box");
  const objectBounds = await selection.boundingBox();
  expect(objectBounds).not.toBeNull();
  await page.getByRole("button", { name: "Lock Demo Box" }).click();
  await expect(selection).toHaveCount(0);

  const centerX = objectBounds!.x + objectBounds!.width / 2;
  const centerY = objectBounds!.y + objectBounds!.height / 2;
  await page.mouse.click(centerX, centerY);
  await expect(selection).toHaveCount(0);
  await page.keyboard.down("Shift");
  await page.mouse.click(centerX, centerY);
  await page.keyboard.up("Shift");
  await expect(selection).toHaveCount(0);

  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX + 40, centerY + 30, { steps: 5 });
  await page.mouse.up();
  await expect(selection).toHaveCount(0);
  await layer.click();
  await expect(selection).toHaveCount(0);

  await page.getByRole("button", { name: "Unlock Demo Box" }).click();
  await layer.click();
  const afterDrag = await selection.boundingBox();
  expect(afterDrag).not.toBeNull();
  expect(afterDrag!.x).toBeCloseTo(objectBounds!.x, 0);
  expect(afterDrag!.y).toBeCloseTo(objectBounds!.y, 0);
});

for (const interfaceScale of ["100%", "150%"] as const) {
  test(`layer lock and visibility icons stay in place at ${interfaceScale}`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/?threeDemo=1");
    await page.locator(".zoom-menu").click();
    await page.getByRole("menuitemradio", { name: interfaceScale, exact: true }).click();
    const layer = page.getByLabel("Layers").getByRole("option", { name: /Demo Box/ });
    await layer.click();
    const lockBefore = await page.getByRole("button", { name: "Lock Demo Box" }).boundingBox();
    const eyeBefore = await page.getByRole("button", { name: "Hide Demo Box" }).boundingBox();
    const eyeIconBefore = await page.getByRole("button", { name: "Hide Demo Box" }).locator("svg").boundingBox();
    expect(lockBefore).not.toBeNull();
    expect(eyeBefore).not.toBeNull();
    expect(eyeIconBefore).not.toBeNull();

    await page.getByRole("button", { name: "Lock Demo Box" }).click();
    await expect(layer).toHaveAttribute("aria-selected", "false");
    const lockAfter = await page.getByRole("button", { name: "Unlock Demo Box" }).boundingBox();
    const eyeAfter = await page.getByRole("button", { name: "Hide Demo Box" }).boundingBox();
    const eyeIconAfter = await page.getByRole("button", { name: "Hide Demo Box" }).locator("svg").boundingBox();
    expect(lockAfter).not.toBeNull();
    expect(eyeAfter).not.toBeNull();
    expect(eyeIconAfter).not.toBeNull();
    expect(Math.abs(lockAfter!.x - lockBefore!.x)).toBeLessThan(0.5);
    expect(Math.abs(lockAfter!.y - lockBefore!.y)).toBeLessThan(0.5);
    expect(Math.abs(eyeAfter!.x - eyeBefore!.x)).toBeLessThan(0.5);
    expect(Math.abs(eyeAfter!.y - eyeBefore!.y)).toBeLessThan(0.5);
    expect(Math.abs(eyeIconAfter!.x - eyeIconBefore!.x)).toBeLessThan(0.5);
    expect(Math.abs(eyeIconAfter!.y - eyeIconBefore!.y)).toBeLessThan(0.5);
  });
}

test("hiding a mixed 2D and 3D selection clears its canvas outlines and caption", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) <= 960, "Desktop editor only");
  await page.goto("/?threeDemo=1");
  const layers = page.getByLabel("Layers");
  await layers.getByRole("option", { name: /Demo Box/ }).click();
  await layers.getByRole("option", { name: /Hybrid Platform/ }).click({ modifiers: ["Shift"] });
  await expect(page.getByLabel("Multiple selection")).toBeVisible();
  await expect(page.getByLabel("Selection dimensions")).toBeVisible();

  await page.getByRole("button", { name: "Hide Hybrid Platform" }).click();
  await expect(page.getByLabel("Multiple selection")).toHaveCount(0);
  await expect(page.getByLabel("3D selection Demo Box")).toHaveCount(0);
  await expect(page.getByLabel("Selection dimensions")).toHaveCount(0);

  await page.getByRole("button", { name: "Show Hybrid Platform" }).click();
  await expect(page.getByLabel("Multiple selection")).toBeVisible();
  await expect(page.getByLabel("Selection dimensions")).toBeVisible();
});

test("keeps 3D corner handles the same size throughout a resize", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) <= 960, "Desktop editor only");
  await page.goto("/?threeDemo=1");
  await page.getByLabel("Layers").getByRole("option", { name: /Demo Box/ }).click();
  const selection = page.getByLabel("3D selection Demo Box");
  await expect(selection).toBeVisible();
  const corner = selection.locator('[data-selection-corner="se"]');
  const initialCorner = await corner.boundingBox();
  const initialSelection = await selection.boundingBox();
  const handle = page.getByRole("button", { name: "Resize 3D Demo Box se" });
  const handleBounds = await handle.boundingBox();
  expect(initialCorner).not.toBeNull();
  expect(initialSelection).not.toBeNull();
  expect(handleBounds).not.toBeNull();
  const startX = handleBounds!.x + handleBounds!.width / 2;
  const startY = handleBounds!.y + handleBounds!.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (const offset of [15, 30, 45, 20, -10]) {
    await page.mouse.move(startX + offset, startY + offset);
    const current = await corner.boundingBox();
    expect(current).not.toBeNull();
    expect(Math.abs(current!.width - initialCorner!.width)).toBeLessThan(1);
    expect(Math.abs(current!.height - initialCorner!.height)).toBeLessThan(1);
  }
  await page.mouse.up();
  const finalSelection = await selection.boundingBox();
  expect(Math.abs(finalSelection!.width - initialSelection!.width)).toBeGreaterThan(5);
});

test("shrinks and grows a rotated 3D object smoothly through its depth", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) <= 960, "Desktop editor only");
  await page.goto("/?threeDemo=1");
  await page.getByLabel("Layers").getByRole("option", { name: /Demo Box/ }).click();
  const selection = page.getByLabel("3D selection Demo Box");
  const initial = await selection.boundingBox();
  const handle = await page.getByRole("button", {
    name: "Resize 3D Demo Box se",
  }).boundingBox();
  expect(initial).not.toBeNull();
  expect(handle).not.toBeNull();
  const startX = handle!.x + handle!.width / 2;
  const startY = handle!.y + handle!.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  let previousWidth = initial!.width;
  for (let step = 1; step <= 8; step += 1) {
    await page.mouse.move(
      startX - initial!.width * 0.65 * (step / 8),
      startY - initial!.height * 0.65 * (step / 8),
    );
    await page.waitForTimeout(20);
    const current = await selection.boundingBox();
    expect(current).not.toBeNull();
    expect(current!.width).toBeLessThan(previousWidth + 1);
    previousWidth = current!.width;
  }
  expect(previousWidth).toBeLessThan(initial!.width * 0.5);
  for (let step = 7; step >= 0; step -= 1) {
    await page.mouse.move(
      startX - initial!.width * 0.65 * (step / 8),
      startY - initial!.height * 0.65 * (step / 8),
    );
    await page.waitForTimeout(20);
    const current = await selection.boundingBox();
    expect(current).not.toBeNull();
    expect(current!.width).toBeGreaterThan(previousWidth - 1);
    previousWidth = current!.width;
  }
  await page.mouse.up();
  const final = await selection.boundingBox();
  expect(Math.abs(final!.width - initial!.width)).toBeLessThan(3);
  expect(Math.abs(final!.height - initial!.height)).toBeLessThan(3);
});

test("resizes a mixed 2D and 3D selection continuously without a release jump", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) <= 960, "Desktop editor only");
  await page.goto("/?threeDemo=1");
  const layers = page.getByLabel("Layers");
  await layers.getByRole("option", { name: /Demo Box/ }).click();
  await layers.getByRole("option", { name: /Hybrid Platform/ }).click({ modifiers: ["Shift"] });
  const selection = page.getByLabel("Multiple selection");
  const box = page.getByLabel("3D selection Demo Box");
  const platform = page.locator('.canvas-element[data-element-id="three-demo-platform"]');
  await expect(selection).toBeVisible();
  const initialSelection = await selection.boundingBox();
  const initialBox = await box.boundingBox();
  const initialPlatform = await platform.boundingBox();
  const handle = page.getByRole("button", { name: "Resize selection se" });
  const handleBounds = await handle.boundingBox();
  expect(initialSelection).not.toBeNull();
  expect(initialBox).not.toBeNull();
  expect(initialPlatform).not.toBeNull();
  expect(handleBounds).not.toBeNull();
  const startX = handleBounds!.x + handleBounds!.width / 2;
  const startY = handleBounds!.y + handleBounds!.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  let previousWidth = initialSelection!.width;
  for (let step = 1; step <= 8; step += 1) {
    await page.mouse.move(startX - step * 10, startY - step * 7);
    const current = await selection.boundingBox();
    expect(current).not.toBeNull();
    expect(current!.width).toBeLessThan(previousWidth + 2);
    expect(previousWidth - current!.width).toBeLessThan(18);
    previousWidth = current!.width;
  }
  const duringResize = await selection.boundingBox();
  await page.mouse.up();
  const afterResize = await selection.boundingBox();
  const smallerBox = await box.boundingBox();
  const smallerPlatform = await platform.boundingBox();
  expect(Math.abs(afterResize!.width - duringResize!.width)).toBeLessThan(3);
  expect(Math.abs(afterResize!.height - duringResize!.height)).toBeLessThan(3);
  expect(smallerBox!.width).toBeLessThan(initialBox!.width - 5);
  expect(smallerPlatform!.width).toBeLessThan(initialPlatform!.width - 5);

  const nextHandle = await handle.boundingBox();
  expect(nextHandle).not.toBeNull();
  const growX = nextHandle!.x + nextHandle!.width / 2;
  const growY = nextHandle!.y + nextHandle!.height / 2;
  await page.mouse.move(growX, growY);
  await page.mouse.down();
  await page.mouse.move(growX + 60, growY + 42, { steps: 6 });
  await page.mouse.up();
  expect((await selection.boundingBox())!.width).toBeGreaterThan(afterResize!.width + 40);
});

test("dragging a newly selected 2D object does not move the previous 3D selection", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) <= 960, "Desktop editor only");
  await page.goto("/?threeDemo=1");
  const layers = page.getByLabel("Layers");
  const boxLayer = layers.getByRole("option", { name: /Demo Box/ });
  const platformLayer = layers.getByRole("option", { name: /Hybrid Platform/ });
  await boxLayer.click();
  const boxSelection = page.getByLabel("3D selection Demo Box");
  const originalBox = await boxSelection.boundingBox();
  expect(originalBox).not.toBeNull();

  const platform = page.locator('.canvas-element[data-element-id="three-demo-platform"]');
  const originalPlatform = await platform.boundingBox();
  expect(originalPlatform).not.toBeNull();
  const startX = originalPlatform!.x + originalPlatform!.width / 2;
  const startY = originalPlatform!.y + originalPlatform!.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 60, startY + 35, { steps: 5 });
  await page.mouse.up();
  await expect(boxLayer).toHaveAttribute("aria-selected", "false");
  await expect(platformLayer).toHaveAttribute("aria-selected", "true");
  expect((await platform.boundingBox())!.x).toBeGreaterThan(originalPlatform!.x + 40);

  await boxLayer.click();
  const unmovedBox = await boxSelection.boundingBox();
  expect(Math.abs(unmovedBox!.x - originalBox!.x)).toBeLessThan(2);
  expect(Math.abs(unmovedBox!.y - originalBox!.y)).toBeLessThan(2);
});

for (const grip of ["2D", "3D"] as const) {
  test(`keeps mixed-selection bounds stable while dragging from the ${grip} object`, async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) <= 960, "Desktop editor only");
    await page.goto("/?threeDemo=1");
    const layers = page.getByLabel("Layers");
    await layers.getByRole("option", { name: /Demo Box/ }).click();
    await layers.getByRole("option", { name: /Hybrid Platform/ }).click({ modifiers: ["Shift"] });
    const selection = page.getByLabel("Multiple selection");
    const boxSelection = page.getByLabel("3D selection Demo Box");
    const platform = page.locator('.canvas-element[data-element-id="three-demo-platform"]');
    await expect(selection).toBeVisible();
    const originalSelection = await selection.boundingBox();
    const originalBox = await boxSelection.boundingBox();
    const originalPlatform = await platform.boundingBox();
    expect(originalSelection).not.toBeNull();
    expect(originalBox).not.toBeNull();
    expect(originalPlatform).not.toBeNull();

    const artboard = await page.getByLabel("Artboard").boundingBox();
    expect(artboard).not.toBeNull();
    const start = grip === "2D"
      ? {
          x: originalPlatform!.x + originalPlatform!.width / 2,
          y: originalPlatform!.y + originalPlatform!.height / 2,
        }
      : {
          x: artboard!.x + (770 / 1920) * artboard!.width,
          y: artboard!.y + (540 / 1080) * artboard!.height,
        };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (let step = 1; step <= 5; step += 1) {
      await page.mouse.move(start.x + step * 12, start.y + step * 7);
      const current = await selection.boundingBox();
      expect(current).not.toBeNull();
      expect(Math.abs(current!.width - originalSelection!.width)).toBeLessThan(3);
      expect(Math.abs(current!.height - originalSelection!.height)).toBeLessThan(3);
    }
    await page.mouse.up();
    const movedSelection = await selection.boundingBox();
    const movedBox = await boxSelection.boundingBox();
    const movedPlatform = await platform.boundingBox();
    expect(movedSelection!.x - originalSelection!.x).toBeGreaterThan(40);
    expect(movedBox!.x - originalBox!.x).toBeGreaterThan(40);
    expect(movedPlatform!.x - originalPlatform!.x).toBeGreaterThan(40);
    expect(Math.abs(movedSelection!.width - originalSelection!.width)).toBeLessThan(3);
    expect(Math.abs(movedSelection!.height - originalSelection!.height)).toBeLessThan(3);
  });
}

test("selects 2D and 3D layers together and deletes only those objects", async ({
  page,
}) => {
  test.skip((page.viewportSize()?.width ?? 0) <= 960, "Desktop editor only");
  await page.goto("/?threeDemo=1");
  const layers = page.getByLabel("Layers");
  const box = layers.getByRole("option", { name: /Demo Box/ });
  const sphere = layers.getByRole("option", { name: /Demo Sphere/ });
  const platform = layers.getByRole("option", { name: /Hybrid Platform/ });
  await expect(platform).toBeVisible();

  await box.click();
  await sphere.click({ modifiers: ["Shift"] });
  await expect(box).toHaveAttribute("aria-selected", "true");
  await expect(sphere).toHaveAttribute("aria-selected", "true");
  const selection = page.getByLabel("Multiple selection");
  await expect(selection).toBeVisible();
  const beforeResize = await selection.boundingBox();
  const resize = page.getByRole("button", { name: "Resize selection se" });
  const handle = await resize.boundingBox();
  expect(beforeResize).not.toBeNull();
  expect(handle).not.toBeNull();
  const handleX = handle!.x + handle!.width / 2;
  const handleY = handle!.y + handle!.height / 2;
  await page.mouse.move(handleX, handleY);
  await page.mouse.down();
  await page.mouse.move(handleX + 35, handleY + 25, { steps: 4 });
  await page.mouse.up();
  await expect.poll(async () => (await selection.boundingBox())?.width).toBeGreaterThan(
    beforeResize!.width + 15,
  );

  await platform.click({ modifiers: ["Shift"] });
  await expect(platform).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("3 2D / 3D objects selected")).toBeVisible();
  await page.keyboard.press("Delete");
  await expect(box).toHaveCount(0);
  await expect(sphere).toHaveCount(0);
  await expect(platform).toHaveCount(0);
  await expect(layers.getByRole("option", { name: /Demo Torus/ })).toBeVisible();
});

test("keeps the opposite corner fixed when resizing a rotated 3D object", async ({
  page,
}) => {
  test.skip((page.viewportSize()?.width ?? 0) <= 960, "Desktop editor only");
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  await page.goto("/?threeDemo=1");
  await page.getByLabel("Layers").getByRole("option", { name: /Demo Box/ }).click();
  const positionX = page.getByRole("spinbutton", { name: "Position X" });
  await positionX.fill("960");
  await positionX.blur();

  const selection = page.getByLabel("3D selection Demo Box");
  const before = await selection.boundingBox();
  const handle = await page
    .getByRole("button", { name: "Resize 3D Demo Box sw" })
    .boundingBox();
  expect(before).not.toBeNull();
  expect(handle).not.toBeNull();
  const centerX = handle!.x + handle!.width / 2;
  const centerY = handle!.y + handle!.height / 2;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX - 45, centerY + 40, { steps: 100 });
  await page.mouse.up();

  await expect.poll(async () => (await selection.boundingBox())?.width).toBeGreaterThan(
    before!.width + 25,
  );
  const after = await selection.boundingBox();
  expect(after).not.toBeNull();
  expect(after!.x + after!.width).toBeCloseTo(before!.x + before!.width, 0);
  expect(after!.y).toBeCloseTo(before!.y, 0);

  await page.getByRole("checkbox", { name: "Lock Ratio" }).uncheck();
  const unlockedHandle = await page
    .getByRole("button", { name: "Resize 3D Demo Box sw" })
    .boundingBox();
  expect(unlockedHandle).not.toBeNull();
  const unlockedX = unlockedHandle!.x + unlockedHandle!.width / 2;
  const unlockedY = unlockedHandle!.y + unlockedHandle!.height / 2;
  await page.mouse.move(unlockedX, unlockedY);
  await page.mouse.down();
  await page.mouse.move(unlockedX - 35, unlockedY + 20, { steps: 100 });
  await page.mouse.up();
  const freelyResized = await selection.boundingBox();
  expect(freelyResized).not.toBeNull();
  expect(freelyResized!.x + freelyResized!.width).toBeCloseTo(
    after!.x + after!.width,
    0,
  );
  expect(freelyResized!.y).toBeCloseTo(after!.y, 0);

  const colorLabel = page.locator(".design-3d-material .paint-row > .property-label");
  const colorInput = page.getByRole("textbox", {
    name: "3D Color",
    exact: true,
  });
  const labelBounds = await colorLabel.boundingBox();
  const inputBounds = await colorInput.boundingBox();
  expect(labelBounds).not.toBeNull();
  expect(inputBounds).not.toBeNull();
  expect(inputBounds!.x).toBeGreaterThan(labelBounds!.x + labelBounds!.width);
  expect(runtimeErrors.filter((message) => /Maximum update depth exceeded/i.test(message))).toEqual([]);
});

for (const pair of ["3D and 3D", "2D and 3D"] as const) {
  test(`tracks the pointer throughout a deep multi-resize for ${pair}`, async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) <= 960, "Desktop editor only");
    await page.goto("/?threeDemo=1");
    const layers = page.getByLabel("Layers");
    await layers.getByRole("option", { name: /Demo Box/ }).click();
    await layers.getByRole("option", {
      name: pair === "3D and 3D" ? /Demo Sphere/ : /Hybrid Platform/,
    }).click({ modifiers: ["Shift"] });
    const selection = page.getByLabel("Multiple selection");
    const initial = await selection.boundingBox();
    const handle = await page.getByRole("button", {
      name: "Resize selection se",
    }).boundingBox();
    expect(initial).not.toBeNull();
    expect(handle).not.toBeNull();
    const startX = handle!.x + handle!.width / 2;
    const startY = handle!.y + handle!.height / 2;
    const shrinkX = initial!.width * 0.85;
    const shrinkY = initial!.height * 0.85;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    let previousWidth = initial!.width;
    for (let step = 1; step <= 17; step += 1) {
      await page.mouse.move(
        startX - shrinkX * (step / 17),
        startY - shrinkY * (step / 17),
      );
      const current = await selection.boundingBox();
      expect(current).not.toBeNull();
      expect(current!.width).toBeLessThan(previousWidth - 3);
      previousWidth = current!.width;
    }
    for (let step = 16; step >= 0; step -= 1) {
      await page.mouse.move(
        startX - shrinkX * (step / 17),
        startY - shrinkY * (step / 17),
      );
      const current = await selection.boundingBox();
      expect(current).not.toBeNull();
      expect(current!.width).toBeGreaterThan(previousWidth + 3);
      previousWidth = current!.width;
    }
    for (let step = 1; step <= 20; step += 1) {
      await page.mouse.move(
        startX + initial!.width * 6 * (step / 20),
        startY + initial!.height * 6 * (step / 20),
      );
      const current = await selection.boundingBox();
      expect(current).not.toBeNull();
      expect(current!.width).toBeGreaterThan(previousWidth + 3);
      previousWidth = current!.width;
    }
    await page.mouse.up();
    const final = await selection.boundingBox();
    expect(final).not.toBeNull();
    expect(Math.abs(final!.width - previousWidth)).toBeLessThan(3);
  });
}
