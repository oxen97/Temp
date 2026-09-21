import { expect, test } from "@playwright/test";

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
