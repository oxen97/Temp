import { expect, test } from "@playwright/test";

async function waitForEditor(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByLabel("Exhibition canvas").waitFor();
  if ((page.viewportSize()?.width ?? 0) > 960) {
    await page.locator(".zoom-menu").click();
    await page.getByRole("menuitem", { name: /Zoom to Fit/ }).click();
  }
  await page.waitForTimeout(500);
}

test("starts with one page, no layers, and nine square assets", async ({
  page,
}) => {
  await waitForEditor(page);

  await expect(page.getByText("Preview")).toBeVisible();
  await expect(page.getByLabel("Exhibition canvas")).toBeVisible();

  if ((page.viewportSize()?.width ?? 0) <= 960) return;

  await expect(page.locator(".scene-item")).toHaveCount(1);
  await expect(page.getByLabel("Layers").getByRole("option")).toHaveCount(0);
  await expect(page.locator(".asset-placeholder")).toHaveCount(9);

  const assetLayout = await page.locator(".asset-grid").evaluate((grid) => {
    const cells = Array.from(grid.children);
    const rects = cells.map((cell) => cell.getBoundingClientRect());
    const firstRowTop = rects[0]?.top;
    const firstRowCells = rects.filter(
      (rect) => Math.abs(rect.top - (firstRowTop ?? 0)) < 1,
    );
    const scrollbar =
      grid.parentElement?.querySelector<HTMLElement>(".custom-scrollbar");
    const lastCellRight = Math.max(...rects.map((rect) => rect.right));
    const viewportBottom = grid.getBoundingClientRect().bottom;
    grid.scrollTop = grid.scrollHeight;
    const lastCellBottom =
      cells.at(-1)?.getBoundingClientRect().bottom ?? viewportBottom;
    return {
      bottomScrollGap: viewportBottom - lastCellBottom,
      columns: firstRowCells.length,
      lastColumnGap: scrollbar
        ? scrollbar.getBoundingClientRect().left - lastCellRight
        : -1,
      hasHorizontalOverflow: grid.scrollWidth > grid.clientWidth + 1,
      hasVerticalOverflow:
        grid.scrollHeight > grid.clientHeight + 1 && Boolean(scrollbar),
      squares: rects.every((rect) => Math.abs(rect.width - rect.height) < 1),
    };
  });

  expect(assetLayout.columns).toBe(3);
  expect(assetLayout.lastColumnGap).toBeGreaterThanOrEqual(5.5);
  expect(assetLayout.squares).toBe(true);
  expect(assetLayout.hasHorizontalOverflow).toBe(false);
  expect(assetLayout.hasVerticalOverflow).toBe(true);
  expect(assetLayout.bottomScrollGap).toBeGreaterThanOrEqual(9);

  await page.locator(".asset-grid").evaluate((grid) => {
    grid.scrollTop = grid.scrollHeight;
    grid.dispatchEvent(new Event("scroll"));
  });
  await page.waitForTimeout(50);
  const scrollbarLayout = await page.locator(".asset-grid").evaluate((grid) => {
    const track =
      grid.parentElement?.querySelector<HTMLElement>(".custom-scrollbar");
    const thumb = track?.querySelector<HTMLElement>(".custom-scrollbar-thumb");
    return {
      trackBottom: track?.getBoundingClientRect().bottom ?? 0,
      thumbBottom: thumb?.getBoundingClientRect().bottom ?? 0,
    };
  });
  expect(scrollbarLayout.thumbBottom).toBeLessThanOrEqual(
    scrollbarLayout.trackBottom + 0.5,
  );
});

test("offers equally spaced Image, Video, and 3D asset tabs and imports glTF files", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Asset panel is desktop-only",
  );
  await waitForEditor(page);

  const tabs = page.locator(".assets-section .asset-tabs");
  const imageTab = tabs.getByRole("tab", { name: "Image" });
  const videoTab = tabs.getByRole("tab", { name: "Video" });
  const modelTab = tabs.getByRole("tab", { name: "3D" });
  await expect(imageTab).toHaveAttribute("aria-selected", "true");
  await expect(videoTab).toBeVisible();
  await expect(modelTab).toBeVisible();

  const tabGaps = await tabs.evaluate((tabList) => {
    const [image, video, model] = Array.from(tabList.children).map((child) => {
      const text = document.createRange();
      text.selectNodeContents(child);
      return text.getBoundingClientRect();
    });
    return [video.left - image.right, model.left - video.right];
  });
  expect(tabGaps[0]).toBeGreaterThan(0);
  expect(tabGaps[1]).toBeCloseTo(tabGaps[0], 1);

  await videoTab.click();
  await expect(videoTab).toHaveAttribute("aria-selected", "true");
  await modelTab.click();
  await expect(modelTab).toHaveAttribute("aria-selected", "true");

  const uploadInput = page.locator(".assets-section .asset-upload input");
  await expect(uploadInput).toHaveAttribute("accept", /\.glb.*\.gltf/);

  const sceneJson = JSON.stringify({
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [] }],
  });
  const paddedJson = Buffer.from(
    sceneJson.padEnd(Math.ceil(sceneJson.length / 4) * 4, " "),
  );
  const glb = Buffer.alloc(20 + paddedJson.length);
  glb.write("glTF", 0, "ascii");
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(paddedJson.length, 12);
  glb.write("JSON", 16, "ascii");
  paddedJson.copy(glb, 20);

  await uploadInput.setInputFiles({
    name: "simple.glb",
    mimeType: "model/gltf-binary",
    buffer: glb,
  });
  await expect(
    page.getByRole("button", { name: "Add 3D model simple.glb" }),
  ).toBeVisible();

  await uploadInput.setInputFiles({
    name: "simple.gltf",
    mimeType: "model/gltf+json",
    buffer: Buffer.from(sceneJson),
  });
  await expect(
    page.getByRole("button", { name: "Add 3D model simple.gltf" }),
  ).toBeVisible();
  await expect(page.locator(".assets-section [role=alert]")).toHaveCount(0);

  await page.getByRole("button", { name: "Add 3D model simple.glb" }).click();
  await expect(page.getByLabel("3D scene")).toBeVisible();
  await page.getByRole("tab", { name: "INTERACTION" }).click();
  const interactionSettings = page.getByRole("tabpanel", {
    name: "Interaction settings",
  });
  await expect(
    interactionSettings.locator(".interaction-selected strong"),
  ).toHaveText("simple");
  await expect(interactionSettings.locator(".interaction-3d-badge")).toHaveText(
    "3D · asset",
  );
});

test("keeps the artboard unselected when its empty area is clicked", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Artboard selection is desktop-only",
  );
  await waitForEditor(page);

  const artboard = page.getByLabel("Artboard");
  const before = await artboard.boundingBox();
  const canvasBounds = await page.getByLabel("Exhibition canvas").boundingBox();
  if (!before || !canvasBounds) {
    throw new Error("Artboard bounds are unavailable");
  }
  expect(before.x - canvasBounds.x).toBeCloseTo(25, 0);
  expect(
    canvasBounds.x + canvasBounds.width - (before.x + before.width),
  ).toBeCloseTo(25, 0);
  const canvasGutters = await page
    .getByLabel("Exhibition canvas")
    .evaluate((canvas) => ({
      left: getComputedStyle(canvas, "::before").width,
      right: getComputedStyle(canvas, "::after").width,
    }));
  expect(canvasGutters).toEqual({ left: "25px", right: "25px" });

  await page.getByRole("button", { name: "Selection", exact: true }).click();
  await page.mouse.click(before.x + 20, before.y + 20);
  await expect(artboard).not.toHaveClass(/is-selected/);
  await expect(artboard.locator(".resize-handle")).toHaveCount(0);
  await expect(artboard.locator(".line-endpoint")).toHaveCount(0);

  await page.mouse.move(before.x + 20, before.y + 20);
  await page.mouse.down();
  await page.mouse.move(before.x + 120, before.y + 100, { steps: 3 });
  await page.mouse.up();
  const after = await artboard.boundingBox();
  expect(after?.x).toBeCloseTo(before.x, 1);
  expect(after?.y).toBeCloseTo(before.y, 1);
});

test("scrolls the layer list when it exceeds the panel", async ({ page }) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Layer panel is desktop-only",
  );
  await waitForEditor(page);

  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  const artboard = page.getByLabel("Artboard");
  const box = await artboard.boundingBox();
  if (!box) throw new Error("Artboard bounds are unavailable");

  for (let index = 0; index < 12; index += 1) {
    await page.locator('.tool-button[data-tool="rectangle"]').click();
    const x = box.x + 40 + (index % 4) * 130;
    const y = box.y + 40 + Math.floor(index / 4) * 130;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 60, y + 50, { steps: 2 });
    await page.mouse.up();
  }

  await expect(page.getByLabel("Layers").getByRole("option")).toHaveCount(12);
  const layerScroll = page.locator(".layer-list-scroll-area");
  await expect(layerScroll.locator(".custom-scrollbar")).toBeVisible();
  const metrics = await layerScroll
    .locator(".scroll-viewport")
    .evaluate((viewport) => ({
      clientHeight: viewport.clientHeight,
      scrollHeight: viewport.scrollHeight,
    }));
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
});

test("uses the provided panel icons and tints active tool icons", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Toolbar is desktop-only",
  );
  await waitForEditor(page);

  await expect(
    page.locator(".scenes-section .project-section-heading img"),
  ).toHaveAttribute("src", "/figma/plus.svg");
  await expect(
    page.locator(".layers-section .project-section-heading img"),
  ).toHaveAttribute("src", "/figma/plus.svg");
  await expect(
    page.locator(".assets-section .asset-heading-upload img"),
  ).toHaveAttribute("src", "/figma/plus.svg");
  await expect(page.locator(".asset-upload img")).toHaveAttribute(
    "src",
    "/figma/upload.svg",
  );

  for (const tool of ["Hand", "Text", "Zoom", "Setting"]) {
    const button = page.getByRole("button", { name: tool, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    if (tool === "Hand") {
      await expect(button.locator(".tool-asset")).toHaveAttribute(
        "src",
        "/figma/hand-active.svg?v=2",
      );
    } else {
      await expect(button.locator(".tool-asset")).toHaveCSS(
        "filter",
        /invert\(/,
      );
    }
  }

  const handButton = page.getByRole("button", { name: "Hand", exact: true });
  await handButton.click();
  await page.keyboard.press("Escape");
  await expect(handButton).toHaveAttribute("aria-pressed", "false");
  await expect(handButton).toHaveCSS("outline-style", "none");
});

test("draws the selected shape, updates layers, and supports undo and redo", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Project panel is desktop-only",
  );
  await waitForEditor(page);

  await page.getByRole("button", { name: "Rectangle" }).click();
  await expect(
    page.getByRole("toolbar", { name: "Shape picker" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Circle" }).click();

  const artboard = page.getByLabel("Artboard");
  const box = await artboard.boundingBox();
  if (!box) throw new Error("Artboard bounds are unavailable");

  await page.mouse.move(box.x + 120, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 280, box.y + 260, { steps: 6 });
  await page.mouse.up();

  const circle = page.getByLabel("Circle 1", { exact: true });
  await expect(circle).toBeVisible();
  await expect(circle.locator("ellipse")).toHaveAttribute("stroke", "none");
  await expect(circle.locator("ellipse")).toHaveAttribute("stroke-width", "0");
  await expect(page.getByLabel("Layers").getByText("Circle 1")).toBeVisible();
  await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();

  await page.keyboard.press("Control+z");
  await expect(page.getByLabel("Circle 1", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Layers").getByText("Circle 1")).toHaveCount(0);

  await page.keyboard.press("Control+Shift+z");
  await expect(page.getByLabel("Circle 1", { exact: true })).toBeVisible();
});

test("previews the selected shape while dragging", async ({ page }) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Shape drawing is desktop-only",
  );
  await waitForEditor(page);

  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await page
    .getByRole("toolbar", { name: "Shape picker" })
    .getByRole("button", { name: "Star", exact: true })
    .click();

  const artboard = page.getByLabel("Artboard");
  const box = await artboard.boundingBox();
  if (!box) throw new Error("Artboard bounds are unavailable");

  const start = { x: box.x + 140, y: box.y + 100 };
  const end = { x: start.x + 180, y: start.y + 120 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 5 });

  const preview = page.locator(".draw-draft-preview");
  await expect(preview).toBeVisible();
  await expect(preview.locator("polygon")).toBeVisible();
  await expect(preview.locator("polygon")).toHaveAttribute("stroke", "none");

  const previewBox = await preview.boundingBox();
  const outline = preview.locator(".draw-draft-outline");
  const outlineBox = await outline.boundingBox();
  const polygonBox = await preview.locator("polygon").boundingBox();
  if (!previewBox || !outlineBox || !polygonBox) {
    throw new Error("Shape preview bounds are unavailable");
  }
  expect(outlineBox.x).toBeCloseTo(previewBox.x, 2);
  expect(outlineBox.y).toBeCloseTo(previewBox.y, 2);
  expect(outlineBox.width).toBeCloseTo(previewBox.width, 2);
  expect(outlineBox.height).toBeCloseTo(previewBox.height, 2);
  const outlineScreenWidth = await outline.locator("rect").evaluate((rect) => {
    const artboard = rect.closest<HTMLElement>("#editor-artboard");
    const scale = Number.parseFloat(
      getComputedStyle(artboard!).getPropertyValue("--artboard-scale"),
    );
    return Number(rect.getAttribute("stroke-width")) * scale;
  });
  expect(outlineScreenWidth).toBeCloseTo(1, 2);
  expect(polygonBox.width).toBeGreaterThan(previewBox.width - 4);
  expect(polygonBox.height).toBeGreaterThan(previewBox.height - 4);

  await page.mouse.up();
});

test("shows live selection dimensions below a drawn shape", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Selection dimensions are desktop-only",
  );
  await waitForEditor(page);

  const artboard = page.getByLabel("Artboard");
  const box = await artboard.boundingBox();
  if (!box) throw new Error("Artboard bounds are unavailable");

  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  const start = { x: box.x + 140, y: box.y + 100 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 180, start.y + 120, { steps: 4 });
  await page.mouse.up();

  const dimensions = page.getByLabel("Selection dimensions");
  const rectangle = page.getByLabel("Rectangle 1", { exact: true });
  const rectangleBox = await rectangle.boundingBox();
  if (!rectangleBox) throw new Error("Rectangle bounds are unavailable");
  const initialNorthWestHandle = await rectangle
    .locator(".resize-handle.handle-nw")
    .boundingBox();
  if (!initialNorthWestHandle) {
    throw new Error("Rectangle resize handle bounds are unavailable");
  }
  expect(
    initialNorthWestHandle.x + initialNorthWestHandle.width / 2,
  ).toBeCloseTo(rectangleBox.x - 0.5, 1);
  expect(
    initialNorthWestHandle.y + initialNorthWestHandle.height / 2,
  ).toBeCloseTo(rectangleBox.y - 0.5, 1);

  await page.getByLabel("Stroke style").click();
  await page.getByRole("option", { name: "Solid" }).click();
  await page.getByLabel("Stroke width").fill("4");
  const strokedNorthWestHandle = await rectangle
    .locator(".resize-handle.handle-nw")
    .boundingBox();
  if (!strokedNorthWestHandle) {
    throw new Error("Stroked rectangle resize handle bounds are unavailable");
  }
  expect(
    strokedNorthWestHandle.x + strokedNorthWestHandle.width / 2,
  ).toBeCloseTo(rectangleBox.x - 2.5, 1);
  expect(
    strokedNorthWestHandle.y + strokedNorthWestHandle.height / 2,
  ).toBeCloseTo(rectangleBox.y - 2.5, 1);
  const scale = await artboard.evaluate((element) =>
    Number.parseFloat(
      getComputedStyle(element).getPropertyValue("--artboard-scale"),
    ),
  );
  await expect(dimensions).toHaveText(
    `W ${Math.round(rectangleBox.width / scale)} x H ${Math.round(rectangleBox.height / scale)}`,
  );
  await expect(dimensions).toHaveCSS("background-color", "rgb(43, 43, 43)");
});

test("updates the dimensions caption when selecting another shape after resize", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Selection dimensions are desktop-only",
  );
  await waitForEditor(page);

  const artboard = page.getByLabel("Artboard");
  const board = await artboard.boundingBox();
  if (!board) throw new Error("Artboard bounds are unavailable");

  const drawRectangle = async (
    start: { x: number; y: number },
    end: { x: number; y: number },
  ) => {
    await page.getByRole("button", { name: "Rectangle", exact: true }).click();
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 3 });
    await page.mouse.up();
  };

  await drawRectangle(
    { x: board.x + 100, y: board.y + 90 },
    { x: board.x + 200, y: board.y + 160 },
  );
  await drawRectangle(
    { x: board.x + 320, y: board.y + 170 },
    { x: board.x + 460, y: board.y + 260 },
  );

  const first = page.getByLabel("Rectangle 1", { exact: true });
  const second = page.getByLabel("Rectangle 2", { exact: true });
  const firstBox = await first.boundingBox();
  const secondBox = await second.boundingBox();
  if (!firstBox || !secondBox) {
    throw new Error("Rectangle bounds are unavailable");
  }

  await page.getByRole("button", { name: "Selection", exact: true }).click();
  await page.mouse.click(firstBox.x + 30, firstBox.y + 30);
  const resizeHandle = first.locator(".resize-handle.handle-se");
  const resizeHandleBox = await resizeHandle.boundingBox();
  if (!resizeHandleBox) throw new Error("Resize handle bounds are unavailable");
  const handleCenter = {
    x: resizeHandleBox.x + resizeHandleBox.width / 2,
    y: resizeHandleBox.y + resizeHandleBox.height / 2,
  };
  await page.mouse.move(handleCenter.x, handleCenter.y);
  await page.mouse.down();
  await page.mouse.move(handleCenter.x + 60, handleCenter.y + 42, { steps: 4 });
  await page.mouse.up();

  await page.mouse.click(secondBox.x + 30, secondBox.y + 30);
  const scale = await artboard.evaluate((element) =>
    Number.parseFloat(
      getComputedStyle(element).getPropertyValue("--artboard-scale"),
    ),
  );
  await expect(page.getByLabel("Selection dimensions")).toHaveText(
    `W ${Math.round(secondBox.width / scale)} x H ${Math.round(secondBox.height / scale)}`,
  );
});

test("shows individual and combined outlines for multiple selections", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Multiple selection outlines are desktop-only",
  );
  await waitForEditor(page);

  const artboard = page.getByLabel("Artboard");
  const board = await artboard.boundingBox();
  if (!board) throw new Error("Artboard bounds are unavailable");

  const drawRectangle = async (
    start: { x: number; y: number },
    end: { x: number; y: number },
  ) => {
    await page.getByRole("button", { name: "Rectangle", exact: true }).click();
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 3 });
    await page.mouse.up();
  };

  await drawRectangle(
    { x: board.x + 120, y: board.y + 100 },
    { x: board.x + 220, y: board.y + 170 },
  );
  await drawRectangle(
    { x: board.x + 360, y: board.y + 190 },
    { x: board.x + 480, y: board.y + 260 },
  );

  const first = page.getByLabel("Rectangle 1", { exact: true });
  const second = page.getByLabel("Rectangle 2", { exact: true });
  const firstBox = await first.boundingBox();
  const secondBox = await second.boundingBox();
  if (!firstBox || !secondBox) {
    throw new Error("Rectangle bounds are unavailable");
  }

  await page.getByRole("button", { name: "Selection", exact: true }).click();
  await page.mouse.click(firstBox.x + 30, firstBox.y + 30);
  await page.keyboard.down("Shift");
  await page.mouse.click(secondBox.x + 30, secondBox.y + 30);
  await page.keyboard.up("Shift");

  await expect(page.locator(".canvas-element.is-selected")).toHaveCount(2);
  const combinedOutline = page.getByLabel("Multiple selection");
  await expect(combinedOutline).toBeVisible();

  const outlineBox = await combinedOutline.boundingBox();
  if (!outlineBox) throw new Error("Combined selection bounds are unavailable");
  expect(outlineBox.x).toBeLessThanOrEqual(Math.min(firstBox.x, secondBox.x));
  expect(outlineBox.y).toBeLessThanOrEqual(Math.min(firstBox.y, secondBox.y));
  expect(outlineBox.x + outlineBox.width).toBeGreaterThanOrEqual(
    Math.max(firstBox.x + firstBox.width, secondBox.x + secondBox.width),
  );
  expect(outlineBox.y + outlineBox.height).toBeGreaterThanOrEqual(
    Math.max(firstBox.y + firstBox.height, secondBox.y + secondBox.height),
  );

  await page.keyboard.press("Shift+g");
  await expect(page.getByLabel("Group selection")).toBeVisible();
  await expect(page.locator(".canvas-element.is-selected")).toHaveCount(0);

  await page.keyboard.press("Shift+g");
  await expect(page.getByLabel("Multiple selection")).toBeVisible();
  await expect(page.locator(".canvas-element.is-selected")).toHaveCount(2);

  await expect(combinedOutline.locator(".multi-resize-handle")).toHaveCount(4);
  const beforeResizeOutline = await combinedOutline.boundingBox();
  const beforeResizeFirst = await first.boundingBox();
  const beforeResizeSecond = await second.boundingBox();
  const resizeHandle = page.getByRole("button", {
    name: "Resize selection se",
  });
  const resizeHandleBox = await resizeHandle.boundingBox();
  if (
    !beforeResizeOutline ||
    !beforeResizeFirst ||
    !beforeResizeSecond ||
    !resizeHandleBox
  ) {
    throw new Error("Multiple selection resize bounds are unavailable");
  }

  const handleCenter = {
    x: resizeHandleBox.x + resizeHandleBox.width / 2,
    y: resizeHandleBox.y + resizeHandleBox.height / 2,
  };
  await page.mouse.move(handleCenter.x, handleCenter.y);
  await page.mouse.down();
  await page.mouse.move(handleCenter.x + 90, handleCenter.y + 40, { steps: 4 });
  await page.mouse.up();

  const afterResizeOutline = await combinedOutline.boundingBox();
  const afterResizeFirst = await first.boundingBox();
  const afterResizeSecond = await second.boundingBox();
  if (!afterResizeOutline || !afterResizeFirst || !afterResizeSecond) {
    throw new Error("Resized multiple selection bounds are unavailable");
  }
  expect(afterResizeOutline.x).toBeCloseTo(beforeResizeOutline.x, 0);
  expect(afterResizeOutline.y).toBeCloseTo(beforeResizeOutline.y, 0);
  expect(afterResizeOutline.width).toBeGreaterThan(
    beforeResizeOutline.width + 80,
  );
  expect(afterResizeOutline.height).toBeGreaterThan(
    beforeResizeOutline.height + 30,
  );
  expect(afterResizeFirst.width / beforeResizeFirst.width).toBeCloseTo(
    afterResizeSecond.width / beforeResizeSecond.width,
    2,
  );
  expect(afterResizeSecond.x - afterResizeFirst.x).toBeGreaterThan(
    beforeResizeSecond.x - beforeResizeFirst.x,
  );
});

test("keeps proportional corner resizing continuous with Control", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Shape resizing is desktop-only",
  );
  await waitForEditor(page);

  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  const artboard = page.getByLabel("Artboard");
  const box = await artboard.boundingBox();
  if (!box) throw new Error("Artboard bounds are unavailable");

  await page.mouse.move(box.x + 180, box.y + 160);
  await page.mouse.down();
  await page.mouse.move(box.x + 380, box.y + 260, { steps: 3 });
  await page.mouse.up();

  const rectangle = page.getByLabel("Rectangle 1", { exact: true });
  const resizeHandle = rectangle.locator(".resize-handle.handle-se");
  const handleBox = await resizeHandle.boundingBox();
  if (!handleBox) throw new Error("Resize handle bounds are unavailable");
  const handleCenter = {
    x: handleBox.x + handleBox.width / 2,
    y: handleBox.y + handleBox.height / 2,
  };

  await page.keyboard.down("Control");
  await page.mouse.move(handleCenter.x, handleCenter.y);
  await page.mouse.down();
  await page.mouse.move(handleCenter.x + 30, handleCenter.y + 15);
  const first = await rectangle.boundingBox();
  await page.mouse.move(handleCenter.x + 30, handleCenter.y + 16);
  const second = await rectangle.boundingBox();
  await page.mouse.up();
  await page.keyboard.up("Control");

  if (!first || !second) {
    throw new Error("Resized rectangle bounds are unavailable");
  }
  expect(second.width).toBeGreaterThan(first.width + 0.5);
  expect(second.width / second.height).toBeCloseTo(2, 1);
});

test("keeps Pathfinder artwork scaled after resizing its selection", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Pathfinder resizing is desktop-only",
  );
  await waitForEditor(page);

  const artboard = page.getByLabel("Artboard");
  const board = await artboard.boundingBox();
  if (!board) throw new Error("Artboard bounds are unavailable");

  const drawRectangle = async (
    start: { x: number; y: number },
    end: { x: number; y: number },
  ) => {
    await page.getByRole("button", { name: "Rectangle", exact: true }).click();
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 3 });
    await page.mouse.up();
  };

  await drawRectangle(
    { x: board.x + 150, y: board.y + 120 },
    { x: board.x + 300, y: board.y + 240 },
  );
  await drawRectangle(
    { x: board.x + 240, y: board.y + 180 },
    { x: board.x + 390, y: board.y + 300 },
  );

  const first = page.getByLabel("Rectangle 1", { exact: true });
  const second = page.getByLabel("Rectangle 2", { exact: true });
  const firstBox = await first.boundingBox();
  const secondBox = await second.boundingBox();
  if (!firstBox || !secondBox) {
    throw new Error("Rectangle bounds are unavailable");
  }

  await page.getByRole("button", { name: "Selection", exact: true }).click();
  await page.mouse.click(firstBox.x + 30, firstBox.y + 30);
  await page.keyboard.down("Shift");
  await page.mouse.click(secondBox.x + 30, secondBox.y + 30);
  await page.keyboard.up("Shift");
  await page.getByRole("button", { name: "Union selection" }).click();

  const result = page.locator(".canvas-element.is-pathfinder");
  const artwork = result.locator(".vector-shape > path").first();
  const resultBefore = await result.boundingBox();
  const artworkBefore = await artwork.boundingBox();
  const resizeHandle = result.locator(".resize-handle.handle-se");
  const resizeHandleBox = await resizeHandle.boundingBox();
  if (!resultBefore || !artworkBefore || !resizeHandleBox) {
    throw new Error("Pathfinder resize bounds are unavailable");
  }

  const handleCenter = {
    x: resizeHandleBox.x + resizeHandleBox.width / 2,
    y: resizeHandleBox.y + resizeHandleBox.height / 2,
  };
  await page.mouse.move(handleCenter.x, handleCenter.y);
  await page.mouse.down();
  await page.mouse.move(handleCenter.x + 80, handleCenter.y + 60, { steps: 4 });
  await page.mouse.up();

  const resultAfter = await result.boundingBox();
  const artworkAfter = await artwork.boundingBox();
  if (!resultAfter || !artworkAfter) {
    throw new Error("Resized Pathfinder bounds are unavailable");
  }
  const selectionScale = resultAfter.width / resultBefore.width;
  const artworkScale = artworkAfter.width / artworkBefore.width;
  expect(resultAfter.width).toBeGreaterThan(resultBefore.width + 70);
  expect(artworkAfter.width).toBeGreaterThan(artworkBefore.width + 70);
  expect(artworkScale).toBeCloseTo(selectionScale, 1);
});

// Known timing sensitivity: after mouse.up the move gesture commits to the
// store while the DOM preview transform is cleared on the next animation
// frame (before paint, so it is never visible). A boundingBox() sampled in
// that window can capture doubled geometry, and the fixed-coordinate
// elementFromPoint poll below then misses forever. If this test fails
// without drag-related code changes, it is this race — not a regression.
test("draws a shape on the canvas outside the artboard", async ({ page }) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Canvas drawing is desktop-only",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await waitForEditor(page);

  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  const canvasBox = await page.getByLabel("Exhibition canvas").boundingBox();
  const artboardBox = await page.getByLabel("Artboard").boundingBox();
  if (!canvasBox || !artboardBox) {
    throw new Error("Canvas bounds are unavailable");
  }

  const start = {
    x: artboardBox.x + 260,
    y: Math.max(canvasBox.y + 12, artboardBox.y - 90),
  };
  const end = { x: start.x + 120, y: start.y + 60 };
  expect(start.y + 1).toBeLessThan(artboardBox.y);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 4 });
  await page.mouse.up();

  const rectangle = page.getByLabel("Rectangle 1", { exact: true });
  await expect(rectangle).toBeVisible();
  await expect(page.getByLabel("Artboard")).toHaveCSS("overflow", "visible");
  const rectangleBox = await rectangle.boundingBox();
  if (!rectangleBox)
    throw new Error("Outside rectangle bounds are unavailable");
  expect(rectangleBox.y + rectangleBox.height).toBeLessThan(artboardBox.y);
  await expect
    .poll(() =>
      page.evaluate(
        ({ x, y }) =>
          document
            .elementFromPoint(x, y)
            ?.closest<HTMLElement>("[data-element-id]")?.dataset.elementId ??
          null,
        {
          x: rectangleBox.x + rectangleBox.width / 2,
          y: rectangleBox.y + rectangleBox.height / 2,
        },
      ),
    )
    .not.toBeNull();

  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await page.mouse.move(artboardBox.x + 120, artboardBox.y + 100);
  await page.mouse.down();
  await page.mouse.move(artboardBox.x + 240, artboardBox.y + 180, {
    steps: 4,
  });
  await page.mouse.up();

  const movable = page.getByLabel("Rectangle 2", { exact: true });
  const movableBefore = await movable.boundingBox();
  if (!movableBefore)
    throw new Error("Movable rectangle bounds are unavailable");
  const movableCenter = {
    x: movableBefore.x + movableBefore.width / 2,
    y: movableBefore.y + movableBefore.height / 2,
  };
  await page.getByRole("button", { name: "Selection", exact: true }).click();
  await page.mouse.move(movableCenter.x, movableCenter.y);
  await page.mouse.down();
  await page.mouse.move(movableCenter.x, artboardBox.y - 50, { steps: 4 });
  await page.mouse.up();

  const movableAfter = await movable.boundingBox();
  if (!movableAfter) throw new Error("Moved rectangle bounds are unavailable");
  expect(movableAfter.y + movableAfter.height).toBeLessThan(artboardBox.y);
  await expect
    .poll(() =>
      page.evaluate(
        ({ x, y }) =>
          document
            .elementFromPoint(x, y)
            ?.closest<HTMLElement>("[data-element-id]")?.dataset.elementId ??
          null,
        {
          x: movableAfter.x + movableAfter.width / 2,
          y: movableAfter.y + movableAfter.height / 2,
        },
      ),
    )
    .not.toBeNull();
});

test("keeps the shape picker at the Figma dimensions", async ({ page }) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Shape picker is desktop-only",
  );
  await waitForEditor(page);

  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  const picker = page.getByRole("toolbar", { name: "Shape picker" });
  const pickerBox = await picker.boundingBox();
  if (!pickerBox) throw new Error("Shape picker bounds are unavailable");
  expect(pickerBox.width).toBeCloseTo(48, 0);
  expect(pickerBox.height).toBeCloseTo(219.2, 0);

  const shapeButtons = await picker.locator("button").evaluateAll((buttons) =>
    buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      return { height: rect.height, width: rect.width };
    }),
  );
  expect(shapeButtons).toHaveLength(6);
  expect(shapeButtons.every((rect) => Math.abs(rect.width - 40) < 1)).toBe(
    true,
  );
  expect(shapeButtons.every((rect) => Math.abs(rect.height - 35.2) < 1)).toBe(
    true,
  );
});

test("draws a pen path from the shape picker", async ({ page }) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Pen drawing is desktop-only",
  );
  await waitForEditor(page);

  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  const picker = page.getByRole("toolbar", { name: "Shape picker" });
  await picker.getByRole("button", { name: "Pen Tool", exact: true }).click();

  const artboard = page.getByLabel("Artboard");
  const box = await artboard.boundingBox();
  if (!box) throw new Error("Artboard bounds are unavailable");

  const points = [
    [box.x + 180, box.y + 160],
    [box.x + 220, box.y + 130],
    [box.x + 270, box.y + 180],
  ] as const;
  await page.mouse.click(points[0][0], points[0][1]);
  await expect(page.locator(".draft-pen")).toBeVisible();
  await page.mouse.move(points[1][0], points[1][1]);
  await page.mouse.click(points[1][0], points[1][1]);
  await page.mouse.dblclick(points.at(-1)?.[0] ?? 0, points.at(-1)?.[1] ?? 0);

  await expect(page.getByLabel("Pen 1", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Layers").getByText("Pen 1")).toBeVisible();
  await expect(
    page.locator(".layer-symbol.symbol-pen .pen-icon"),
  ).toBeVisible();
  await expect(
    page.getByLabel("Pen 1", { exact: true }).locator(".pen-visible-path"),
  ).toHaveAttribute("d", /L/);

  const pen = page.getByLabel("Pen 1", { exact: true });
  await expect(page.locator(".pen-node")).toHaveCount(3);

  const middleNode = page.getByRole("button", {
    name: "Move Pen 1 node 2",
  });
  const nodeBox = await middleNode.boundingBox();
  if (!nodeBox) throw new Error("Pen node bounds are unavailable");
  const nodeCenter = {
    x: nodeBox.x + nodeBox.width / 2,
    y: nodeBox.y + nodeBox.height / 2,
  };
  const beforeEdit = await pen.locator(".pen-visible-path").getAttribute("d");
  await page.mouse.move(nodeCenter.x, nodeCenter.y);
  await page.mouse.down();
  await page.mouse.move(nodeCenter.x + 24, nodeCenter.y + 16, { steps: 3 });
  await page.mouse.up();
  const movedNodeBox = await middleNode.boundingBox();
  if (!movedNodeBox) throw new Error("Moved pen node bounds are unavailable");
  expect(movedNodeBox.x + movedNodeBox.width / 2).toBeCloseTo(
    nodeCenter.x + 24,
    0,
  );
  expect(movedNodeBox.y + movedNodeBox.height / 2).toBeCloseTo(
    nodeCenter.y + 16,
    0,
  );
  expect(await pen.locator(".pen-visible-path").getAttribute("d")).not.toBe(
    beforeEdit,
  );

  await page.keyboard.press("Escape");
  await expect(page.locator(".pen-node")).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(page.locator(".pen-node")).toHaveCount(3);

  await pen
    .locator(".pen-hit-area")
    .click({ force: true, position: { x: 20, y: 15 } });
  await expect(page.locator(".pen-node")).toHaveCount(4);

  await page.getByRole("button", { name: "Move Pen 1 node 2" }).click();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Delete");
  await expect(page.locator(".pen-node")).toHaveCount(3);
});

test("keeps a new pen curve black with a one-pixel stroke", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Pen drawing is desktop-only",
  );
  await waitForEditor(page);

  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await page
    .getByRole("toolbar", { name: "Shape picker" })
    .getByRole("button", { name: "Pen Tool", exact: true })
    .click();

  const artboard = page.getByLabel("Artboard");
  const box = await artboard.boundingBox();
  if (!box) throw new Error("Artboard bounds are unavailable");
  await page.mouse.click(box.x + 180, box.y + 160);
  await page.mouse.click(box.x + 220, box.y + 130);
  await page.mouse.dblclick(box.x + 270, box.y + 180);

  const curve = page
    .getByLabel("Pen 1", { exact: true })
    .locator(".pen-visible-path");
  await expect(curve).toHaveAttribute("stroke", "#000000");
  await expect(curve).toHaveAttribute("stroke-width", "1");
});

test("uses the complete pen path as the preview hover target", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Pen interaction preview is desktop-only",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await waitForEditor(page);

  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await page
    .getByRole("toolbar", { name: "Shape picker" })
    .getByRole("button", { name: "Pen Tool", exact: true })
    .click();
  const artboardBox = await page.getByLabel("Artboard").boundingBox();
  if (!artboardBox) throw new Error("Artboard bounds are unavailable");
  await page.mouse.click(artboardBox.x + 180, artboardBox.y + 180);
  await page.mouse.click(artboardBox.x + 250, artboardBox.y + 120);
  await page.mouse.dblclick(artboardBox.x + 340, artboardBox.y + 190);

  await page.getByRole("tab", { name: "SOUND" }).click();
  const panel = page.getByRole("tabpanel", { name: "Sound settings" });
  await panel.getByRole("button", { name: "More Hover sound options" }).click();
  await panel.getByRole("menuitem", { name: "Event Settings" }).click();
  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    panel.getByRole("button", { name: "Add Sound" }).click(),
  ]);
  await fileChooser.setFiles("public/figma/sound/test-interaction-click.wav");

  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  const previewPen = preview.locator(".viewer-preview-element.element-pen");
  const hitPath = previewPen.locator(".pen-hit-area").first();
  await expect(previewPen).toHaveCSS("pointer-events", "none");
  await expect(hitPath).toHaveCSS("pointer-events", "stroke");

  const audio = preview.locator(".viewer-interaction-sound");
  await audio.evaluate((element) => {
    element.addEventListener("play", () => {
      const current = Number(element.getAttribute("data-play-count") ?? "0");
      element.setAttribute("data-play-count", String(current + 1));
    });
  });
  const pathPoints = await hitPath.evaluate((element) => {
    const path = element as SVGPathElement;
    const matrix = path.getScreenCTM();
    if (!matrix) throw new Error("Pen path matrix is unavailable");
    const length = path.getTotalLength();
    return [0.15, 0.85].map((amount) => {
      const point = path.getPointAtLength(length * amount);
      const screenPoint = new DOMPoint(point.x, point.y).matrixTransform(
        matrix,
      );
      return { x: screenPoint.x, y: screenPoint.y };
    });
  });
  const emptyPoint = await previewPen.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const candidates = [
      [0.1, 0.1],
      [0.9, 0.1],
      [0.1, 0.9],
      [0.9, 0.9],
      [0.5, 0.5],
    ];
    for (const [xAmount, yAmount] of candidates) {
      const x = bounds.left + bounds.width * xAmount;
      const y = bounds.top + bounds.height * yAmount;
      if (
        document.elementFromPoint(x, y)?.closest(".element-pen") !== element
      ) {
        return { x, y };
      }
    }
    throw new Error("An empty point inside the pen bounds was not found");
  });

  await page.mouse.move(1, 1);
  await page.mouse.move(pathPoints[0].x, pathPoints[0].y);
  await expect.poll(() => audio.getAttribute("data-play-count")).toBe("1");
  await page.mouse.move(emptyPoint.x, emptyPoint.y);
  await page.mouse.move(pathPoints[1].x, pathPoints[1].y);
  await expect.poll(() => audio.getAttribute("data-play-count")).toBe("2");
});

test("shows pen helper lines while drawing and after completion", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Pen drawing is desktop-only",
  );
  await waitForEditor(page);

  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await page
    .getByRole("toolbar", { name: "Shape picker" })
    .getByRole("button", { name: "Pen Tool", exact: true })
    .click();

  const artboard = page.getByLabel("Artboard");
  const box = await artboard.boundingBox();
  if (!box) throw new Error("Artboard bounds are unavailable");

  const first = { x: box.x + 170, y: box.y + 170 };
  const second = { x: box.x + 240, y: box.y + 210 };
  const third = { x: box.x + 320, y: box.y + 160 };
  await page.mouse.click(first.x, first.y);
  await page.mouse.move(second.x, second.y);
  await page.mouse.down();
  await page.mouse.move(second.x + 42, second.y - 32, { steps: 3 });

  const draftHelpers = page.locator('.draft-pen line[stroke-dasharray="3 3"]');
  await expect(draftHelpers).toHaveCount(2);
  await expect(page.locator('.draft-pen circle[stroke="#ab51f0"]')).toHaveCount(
    4,
  );
  await page.mouse.up();

  await page.mouse.dblclick(third.x, third.y);
  await expect(page.getByLabel("Pen 1", { exact: true })).toBeVisible();
  await expect(page.locator(".pen-node")).toHaveCount(3);
  await expect(page.locator(".pen-handle-line")).toHaveCount(2);

  const expectStablePenControls = async () => {
    const nodeBounds = await page.locator(".pen-node").evaluateAll((nodes) =>
      nodes.map((node) => {
        const bounds = node.getBoundingClientRect();
        return {
          border: getComputedStyle(node).borderTopWidth,
          height: bounds.height,
          width: bounds.width,
        };
      }),
    );
    expect(nodeBounds).toHaveLength(3);
    for (const bounds of nodeBounds) {
      expect(bounds.width).toBeCloseTo(8, 1);
      expect(bounds.height).toBeCloseTo(8, 1);
      expect(bounds.border).toBe("0px");
    }
    const handleBounds = await page
      .locator(".pen-handle")
      .evaluateAll((handles) =>
        handles.map((handle) => {
          const bounds = handle.getBoundingClientRect();
          return { height: bounds.height, width: bounds.width };
        }),
      );
    expect(handleBounds).toHaveLength(2);
    for (const bounds of handleBounds) {
      expect(bounds.width).toBeCloseTo(7, 1);
      expect(bounds.height).toBeCloseTo(7, 1);
    }
  };
  await expectStablePenControls();

  const canvas = page.getByLabel("Exhibition canvas");
  await page.locator(".zoom-menu").click();
  await page.getByRole("menuitem", { name: /Actual Size/ }).click();
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error("Canvas bounds are unavailable");
  for (let step = 0; step < 40; step += 1) {
    await canvas.dispatchEvent("wheel", {
      clientX: canvasBox.x + canvasBox.width / 2,
      clientY: canvasBox.y + canvasBox.height / 2,
      ctrlKey: true,
      deltaX: 0,
      deltaY: -100,
    });
  }
  await expect(page.getByRole("button", { name: "500 %" })).toBeVisible();
  await expectStablePenControls();

  await page.keyboard.press("Delete");
  await expect(page.locator(".pen-node")).toHaveCount(2);
  await page.keyboard.press("Delete");
  await expect(page.getByLabel("Pen 1", { exact: true })).toHaveCount(0);
  await expect(page.locator(".pen-handle-line")).toHaveCount(0);
});

test("undoes pen node edits before removing the last node", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Pen editing is desktop-only",
  );
  await waitForEditor(page);

  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await page
    .getByRole("toolbar", { name: "Shape picker" })
    .getByRole("button", { name: "Pen Tool", exact: true })
    .click();

  const artboard = page.getByLabel("Artboard");
  const box = await artboard.boundingBox();
  if (!box) throw new Error("Artboard bounds are unavailable");
  const points = [
    [box.x + 180, box.y + 160],
    [box.x + 240, box.y + 220],
    [box.x + 320, box.y + 150],
  ] as const;
  for (const [x, y] of points) await page.mouse.click(x, y);
  await page.mouse.dblclick(points.at(-1)?.[0] ?? 0, points.at(-1)?.[1] ?? 0);

  const pen = page.getByLabel("Pen 1", { exact: true });
  const middleNode = page.getByRole("button", {
    name: "Move Pen 1 node 2",
  });
  const nodeBox = await middleNode.boundingBox();
  if (!nodeBox) throw new Error("Pen node bounds are unavailable");
  const nodeCenter = {
    x: nodeBox.x + nodeBox.width / 2,
    y: nodeBox.y + nodeBox.height / 2,
  };
  const beforeEdit = await pen.locator(".pen-visible-path").getAttribute("d");
  await page.mouse.move(nodeCenter.x, nodeCenter.y);
  await page.mouse.down();
  await page.mouse.move(nodeCenter.x + 24, nodeCenter.y + 16, { steps: 3 });
  await page.mouse.up();
  await expect(pen.locator(".pen-visible-path")).not.toHaveAttribute(
    "d",
    beforeEdit ?? "",
  );

  await page.keyboard.press("Control+z");
  await expect(pen.locator(".pen-visible-path")).toHaveAttribute(
    "d",
    beforeEdit ?? "",
  );
  await expect(page.locator(".pen-node")).toHaveCount(3);

  await page.keyboard.press("Control+z");
  await expect(page.locator(".pen-node")).toHaveCount(2);
  await page.keyboard.press("Control+z");
  await expect(page.getByLabel("Pen 1", { exact: true })).toHaveCount(0);
});

test("undoes pen draft nodes one at a time", async ({ page }) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Pen drawing is desktop-only",
  );
  await waitForEditor(page);

  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await page
    .getByRole("toolbar", { name: "Shape picker" })
    .getByRole("button", { name: "Pen Tool", exact: true })
    .click();

  const artboard = page.getByLabel("Artboard");
  const box = await artboard.boundingBox();
  if (!box) throw new Error("Artboard bounds are unavailable");

  const points = [
    [box.x + 180, box.y + 160],
    [box.x + 240, box.y + 220],
    [box.x + 320, box.y + 150],
  ] as const;
  for (const [x, y] of points) await page.mouse.click(x, y);

  const draftNodes = page.locator(".draft-pen circle");
  await expect(draftNodes).toHaveCount(4);

  await page.keyboard.press("Control+z");
  await expect(draftNodes).toHaveCount(3);
  await page.keyboard.press("Control+z");
  await expect(draftNodes).toHaveCount(2);
  await page.keyboard.press("Delete");
  await expect(page.locator(".draft-pen")).toHaveCount(0);
  await expect(page.getByLabel("Layers").getByRole("option")).toHaveCount(0);
});

test("removes completed pen nodes without a prior node edit", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Pen editing is desktop-only",
  );
  await waitForEditor(page);

  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  const picker = page.getByRole("toolbar", { name: "Shape picker" });
  await picker.getByRole("button", { name: "Pen Tool", exact: true }).click();

  const artboard = page.getByLabel("Artboard");
  const box = await artboard.boundingBox();
  if (!box) throw new Error("Artboard bounds are unavailable");
  const points = [
    [box.x + 180, box.y + 160],
    [box.x + 240, box.y + 220],
    [box.x + 320, box.y + 150],
  ] as const;
  for (const [x, y] of points) await page.mouse.click(x, y);
  await page.mouse.dblclick(points.at(-1)?.[0] ?? 0, points.at(-1)?.[1] ?? 0);

  const pen = page.getByLabel("Pen 1", { exact: true });
  await pen.waitFor();
  const path = pen.locator(".pen-visible-path");
  const initialPath = await path.getAttribute("d");
  await expect(page.locator(".pen-node")).toHaveCount(3);

  await page.keyboard.press("Delete");
  await expect(pen).toBeVisible();
  const afterDelete = await path.getAttribute("d");
  expect(afterDelete).not.toBe(initialPath);

  await page.keyboard.press("Control+z");
  await expect(pen).toBeVisible();
  const afterUndo = await path.getAttribute("d");
  expect(afterUndo).not.toBe(afterDelete);

  await page.keyboard.press("Delete");
  await expect(page.locator(".pen-node")).toHaveCount(2);
});

test("text, zoom, page creation, and delete are functional", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Project panel is desktop-only",
  );
  await waitForEditor(page);

  const artboard = page.getByLabel("Artboard");
  const box = await artboard.boundingBox();
  if (!box) throw new Error("Artboard bounds are unavailable");

  await page.getByRole("button", { name: "Text" }).click();
  await page.mouse.click(box.x + 180, box.y + 160);
  await expect(page.getByLabel("Text 1", { exact: true })).toBeVisible();

  await page.keyboard.press("Delete");
  await expect(page.getByLabel("Text 1", { exact: true })).toHaveCount(0);

  await page.locator(".zoom-menu").click();
  await page.getByRole("menuitem", { name: /Actual Size/ }).click();
  await page.getByRole("button", { name: "Zoom", exact: true }).click();
  const canvasBox = await page.getByLabel("Exhibition canvas").boundingBox();
  if (!canvasBox) throw new Error("Canvas bounds are unavailable");
  await page.mouse.click(
    canvasBox.x + canvasBox.width / 2,
    canvasBox.y + canvasBox.height / 2,
  );
  await expect(page.getByRole("button", { name: /110 %/ })).toBeVisible();

  await page.getByRole("button", { name: "Add scene" }).click();
  await expect(page.locator(".scene-item")).toHaveCount(2);
  await expect(page.getByLabel("Layers").getByRole("option")).toHaveCount(0);
});

test("selection moves elements and the hand tool pans the board", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Canvas movement is desktop-only",
  );
  await waitForEditor(page);

  const artboard = page.getByLabel("Artboard");
  const boardBeforeDrawing = await artboard.boundingBox();
  if (!boardBeforeDrawing) throw new Error("Artboard bounds are unavailable");

  await page.getByRole("button", { name: "Rectangle" }).click();
  await page.mouse.move(boardBeforeDrawing.x + 120, boardBeforeDrawing.y + 100);
  await page.mouse.down();
  await page.mouse.move(boardBeforeDrawing.x + 240, boardBeforeDrawing.y + 200);
  await page.mouse.up();

  const rectangle = page.getByLabel("Rectangle 1", { exact: true });
  const dimensions = page.getByLabel("Selection dimensions");
  const elementBeforeMove = await rectangle.boundingBox();
  const dimensionsBeforeMove = await dimensions.boundingBox();
  if (!elementBeforeMove || !dimensionsBeforeMove) {
    throw new Error("Rectangle or dimensions bounds are unavailable");
  }
  const dimensionsCenterOffsetBefore =
    dimensionsBeforeMove.x +
    dimensionsBeforeMove.width / 2 -
    (elementBeforeMove.x + elementBeforeMove.width / 2);

  await page.mouse.click(boardBeforeDrawing.x + 20, boardBeforeDrawing.y + 20);
  await expect(dimensions).toHaveCount(0);

  await page.mouse.move(elementBeforeMove.x + 40, elementBeforeMove.y + 40);
  await page.mouse.down();
  await page.mouse.move(elementBeforeMove.x + 100, elementBeforeMove.y + 80, {
    steps: 4,
  });
  const elementDuringMove = await rectangle.boundingBox();
  const dimensionsDuringMove = await dimensions.boundingBox();
  expect(elementDuringMove?.x).toBeGreaterThan(elementBeforeMove.x + 40);
  expect(elementDuringMove?.y).toBeGreaterThan(elementBeforeMove.y + 20);
  expect(dimensionsDuringMove).not.toBeNull();
  if (elementDuringMove && dimensionsDuringMove) {
    const dimensionsCenterOffsetDuring =
      dimensionsDuringMove.x +
      dimensionsDuringMove.width / 2 -
      (elementDuringMove.x + elementDuringMove.width / 2);
    expect(dimensionsCenterOffsetDuring).toBeCloseTo(
      dimensionsCenterOffsetBefore,
      1,
    );
  }
  await page.mouse.up();

  const elementAfterMove = await rectangle.boundingBox();
  expect(elementAfterMove?.x).toBeGreaterThan(elementBeforeMove.x + 40);
  expect(elementAfterMove?.y).toBeGreaterThan(elementBeforeMove.y + 20);

  await page.keyboard.press("Control+z");
  const elementAfterUndo = await rectangle.boundingBox();
  expect(elementAfterUndo?.x).toBeCloseTo(elementBeforeMove.x, 0);
  expect(elementAfterUndo?.y).toBeCloseTo(elementBeforeMove.y, 0);

  await page.getByRole("button", { name: "Hand" }).click();
  const boardBeforePan = await artboard.boundingBox();
  if (!boardBeforePan) throw new Error("Artboard bounds are unavailable");
  await page.mouse.move(boardBeforePan.x + 500, boardBeforePan.y + 300);
  await page.mouse.down();
  await page.mouse.move(boardBeforePan.x + 570, boardBeforePan.y + 350, {
    steps: 4,
  });
  const boardDuringPan = await artboard.boundingBox();
  expect(boardDuringPan?.x).toBeGreaterThan(boardBeforePan.x + 50);
  expect(boardDuringPan?.y).toBeGreaterThan(boardBeforePan.y + 30);
  await page.mouse.up();

  const boardAfterPan = await artboard.boundingBox();
  expect(boardAfterPan?.x).toBeGreaterThan(boardBeforePan.x + 50);
  expect(boardAfterPan?.y).toBeGreaterThan(boardBeforePan.y + 30);
});

test("snaps equal spacing and shows Alt distance measurements", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Smart guides are desktop-only",
  );
  await waitForEditor(page);

  const artboard = page.getByLabel("Artboard");
  const box = await artboard.boundingBox();
  if (!box) throw new Error("Artboard bounds are unavailable");

  const drawRectangle = async (x: number, y: number) => {
    await page.locator('.tool-button[data-tool="rectangle"]').click();
    await page.mouse.move(box.x + x, box.y + y);
    await page.mouse.down();
    await page.mouse.move(box.x + x + 100, box.y + y + 60, { steps: 2 });
    await page.mouse.up();
  };

  await drawRectangle(100, 200);
  await drawRectangle(350, 200);
  await drawRectangle(220, 200);

  const third = page.getByLabel("Rectangle 3", { exact: true });
  const thirdBox = await third.boundingBox();
  if (!thirdBox) throw new Error("Third rectangle bounds are unavailable");

  await page.getByRole("button", { name: "Selection", exact: true }).click();
  await page.mouse.move(thirdBox.x + 50, thirdBox.y + 30);
  await page.mouse.down();
  await page.mouse.move(thirdBox.x + 55, thirdBox.y + 30, { steps: 3 });
  await expect(page.locator(".smart-guide-label")).toHaveCount(0);
  await expect(page.locator(".distance-measurement")).toHaveCount(2);
  const snappedThirdBox = await third.boundingBox();
  const snappedGuides = await page
    .locator(".smart-guide")
    .evaluateAll((guides) =>
      guides.map((guide) => {
        const rect = guide.getBoundingClientRect();
        return {
          height: rect.height,
          left: rect.left,
          top: rect.top,
          width: rect.width,
        };
      }),
    );
  await page.mouse.move(thirdBox.x + 57, thirdBox.y + 30, { steps: 2 });
  const stableThirdBox = await third.boundingBox();
  const stableGuides = await page
    .locator(".smart-guide")
    .evaluateAll((guides) =>
      guides.map((guide) => {
        const rect = guide.getBoundingClientRect();
        return {
          height: rect.height,
          left: rect.left,
          top: rect.top,
          width: rect.width,
        };
      }),
    );
  expect(stableThirdBox?.x).toBeCloseTo(snappedThirdBox?.x ?? 0, 1);
  expect(stableThirdBox?.y).toBeCloseTo(snappedThirdBox?.y ?? 0, 1);
  expect(stableGuides).toEqual(snappedGuides);
  await page.mouse.up();

  const first = await page
    .getByLabel("Rectangle 1", { exact: true })
    .boundingBox();
  const second = await page
    .getByLabel("Rectangle 2", { exact: true })
    .boundingBox();
  if (!first || !second) throw new Error("Rectangle bounds are unavailable");

  await page.mouse.click(first.x + 50, first.y + 30);
  await page.keyboard.down("Alt");
  await page.mouse.move(second.x + 50, second.y + 30, { steps: 3 });
  await expect(page.locator(".distance-label")).toHaveText(/\d+ px/);
  await page.mouse.move(box.x + 600, box.y + 500, { steps: 3 });
  await expect(page.locator(".distance-measurement")).toHaveCount(4);
  const stableDistanceMeasurements = page.locator(
    ".distance-measurement:not(.distance-preview-slot)",
  );
  await expect(stableDistanceMeasurements).toHaveCount(4);
  const resizeHandle = page
    .getByLabel("Rectangle 1", { exact: true })
    .locator(".resize-handle.handle-nw");
  const resizeHandleBox = await resizeHandle.boundingBox();
  if (!resizeHandleBox) throw new Error("Resize handle bounds are unavailable");
  await page.mouse.move(
    resizeHandleBox.x + resizeHandleBox.width / 2,
    resizeHandleBox.y + resizeHandleBox.height / 2,
  );
  await expect(stableDistanceMeasurements).toHaveCount(0);
  await page.mouse.move(first.x + 50, first.y + 30, { steps: 3 });
  await page.mouse.down();
  await expect(stableDistanceMeasurements).toHaveCount(0);
  await page.mouse.move(first.x + 80, first.y + 50, { steps: 3 });
  await expect(stableDistanceMeasurements).toHaveCount(0);
  await page.mouse.up();
  await page.keyboard.up("Alt");
  await expect(page.locator(".distance-measurement")).toHaveCount(0);
});

test("clears Alt distance measurements when the window loses focus", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Distance measurements are desktop-only",
  );
  await waitForEditor(page);

  const artboard = page.getByLabel("Artboard");
  const box = await artboard.boundingBox();
  if (!box) throw new Error("Artboard bounds are unavailable");
  const drawRectangle = async (x: number) => {
    await page.locator('.tool-button[data-tool="rectangle"]').click();
    await page.mouse.move(box.x + x, box.y + 180);
    await page.mouse.down();
    await page.mouse.move(box.x + x + 100, box.y + 240, { steps: 2 });
    await page.mouse.up();
  };
  await drawRectangle(120);
  await drawRectangle(360);

  const first = await page
    .getByLabel("Rectangle 1", { exact: true })
    .boundingBox();
  const second = await page
    .getByLabel("Rectangle 2", { exact: true })
    .boundingBox();
  if (!first || !second) throw new Error("Rectangle bounds are unavailable");

  await page.getByRole("button", { name: "Selection", exact: true }).click();
  await page.mouse.click(first.x + first.width / 2, first.y + first.height / 2);
  await page.keyboard.down("Alt");
  await page.mouse.move(
    second.x + second.width / 2,
    second.y + second.height / 2,
  );
  await expect(page.locator(".distance-measurement")).not.toHaveCount(0);

  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.locator(".distance-measurement")).toHaveCount(0);
  await page.keyboard.up("Alt");
});

test("measures from the combined bounds of a multiple selection with Alt", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Distance measurements are desktop-only",
  );
  await waitForEditor(page);

  const artboard = page.getByLabel("Artboard");
  const box = await artboard.boundingBox();
  if (!box) throw new Error("Artboard bounds are unavailable");
  const drawRectangle = async (x: number) => {
    await page.locator('.tool-button[data-tool="rectangle"]').click();
    await page.mouse.move(box.x + x, box.y + 180);
    await page.mouse.down();
    await page.mouse.move(box.x + x + 100, box.y + 240, { steps: 2 });
    await page.mouse.up();
  };
  await drawRectangle(100);
  await drawRectangle(300);
  await drawRectangle(520);

  const first = page.getByLabel("Rectangle 1", { exact: true });
  const second = page.getByLabel("Rectangle 2", { exact: true });
  const third = page.getByLabel("Rectangle 3", { exact: true });
  const [firstBox, secondBox, thirdBox] = await Promise.all([
    first.boundingBox(),
    second.boundingBox(),
    third.boundingBox(),
  ]);
  if (!firstBox || !secondBox || !thirdBox) {
    throw new Error("Rectangle bounds are unavailable");
  }

  await page.getByRole("button", { name: "Selection", exact: true }).click();
  await page.mouse.click(
    firstBox.x + firstBox.width / 2,
    firstBox.y + firstBox.height / 2,
  );
  await page.keyboard.down("Shift");
  await page.mouse.click(
    secondBox.x + secondBox.width / 2,
    secondBox.y + secondBox.height / 2,
  );
  await page.keyboard.up("Shift");
  await expect(page.getByLabel("Multiple selection")).toBeVisible();

  const expectedDistance = await third.evaluate((target) => {
    const selected = Array.from(
      document.querySelectorAll<HTMLElement>(".canvas-element.is-selected"),
    );
    if (!selected.length) return null;
    const selectedRight = Math.max(
      ...selected.map(
        (element) =>
          Number.parseFloat(element.style.left) +
          Number.parseFloat(element.style.width),
      ),
    );
    return Math.round(Number.parseFloat(target.style.left) - selectedRight);
  });

  await page.keyboard.down("Alt");
  await page.mouse.move(
    thirdBox.x + thirdBox.width / 2,
    thirdBox.y + thirdBox.height / 2,
  );
  const measurements = page.locator(
    ".distance-measurement:not(.distance-preview-slot)",
  );
  await expect(measurements).toHaveCount(1);
  await expect(measurements.locator(".distance-label")).toHaveText(
    `${expectedDistance} px`,
  );
  await page.keyboard.up("Alt");
  await expect(measurements).toHaveCount(0);
});

test("canvas zoom uses Ctrl-wheel and Zoom tool mouse buttons", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Canvas controls are desktop-only",
  );
  await waitForEditor(page);

  const canvas = page.getByLabel("Exhibition canvas");
  await page.locator(".zoom-menu").click();
  await page.getByRole("menuitem", { name: /Actual Size/ }).click();
  const zoomButton = page.getByRole("button", { name: "Zoom", exact: true });
  await zoomButton.click();

  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas bounds are unavailable");

  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByRole("button", { name: "110 %" })).toBeVisible();

  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
    button: "right",
  });
  await expect(page.getByRole("button", { name: "100 %" })).toBeVisible();

  await canvas.dispatchEvent("wheel", {
    ctrlKey: true,
    deltaY: -100,
    deltaX: 0,
  });
  await expect(page.getByRole("button", { name: "110 %" })).toBeVisible();
  const navigator = page.getByLabel("Navigator");
  await expect(navigator).toHaveClass(/is-visible/);
  await expect(navigator.locator(".navigator-viewport")).toBeVisible();
  await page.waitForTimeout(3100);
  await expect(navigator).not.toHaveClass(/is-visible/);
});

test("keeps selection and image crop controls at a stable screen size while zooming", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Selection controls are desktop-only",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await waitForEditor(page);

  await page
    .locator(".asset-upload input")
    .setInputFiles("public/figma/shape-picker.svg");
  await page.getByRole("button", { name: "Add uploaded asset 1" }).click({
    force: true,
  });

  await page.locator(".zoom-menu").click();
  await page.getByRole("menuitem", { name: /Actual Size/ }).click();

  const artboard = page.getByLabel("Artboard");
  const canvas = page.getByLabel("Exhibition canvas");
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error("Canvas bounds are unavailable");
  const image = page.getByLabel("Image 1", { exact: true });
  const corner = image.locator(".resize-handle.handle-se");
  const cropBar = image.locator(".image-edge-handle-e");
  const caption = page.getByLabel("Selection dimensions");
  const expectControlsAnchoredToImage = async (imageBox: {
    height: number;
    width: number;
    x: number;
    y: number;
  }) => {
    const selectionLineCenterOutset = 0;
    const selectionOutline = image.locator(".selection-outline-svg");
    const selectionRect = selectionOutline.locator(
      "rect[data-selection-frame]",
    );
    await expect(selectionOutline).toHaveCSS("overflow", "visible");
    await expect(selectionOutline).toHaveAttribute(
      "data-selection-stroke-placement",
      "inside",
    );
    await expect(selectionRect).toHaveAttribute("fill", "none");
    await expect(selectionRect).toHaveAttribute(
      "vector-effect",
      "non-scaling-stroke",
    );
    const screenStrokeWidth = await selectionRect.evaluate((rect) => {
      const artboard = rect.closest<HTMLElement>("#editor-artboard");
      const scale = Number.parseFloat(
        getComputedStyle(artboard!).getPropertyValue("--artboard-scale"),
      );
      return Number(rect.getAttribute("stroke-width")) * scale;
    });
    expect(screenStrokeWidth).toBeCloseTo(
      Math.min(1, imageBox.width / 2, imageBox.height / 2),
      2,
    );
    const outlineBox = await selectionRect.evaluate((rect) => {
      const svg = (rect as SVGRectElement).ownerSVGElement!;
      const bounds = svg.getBoundingClientRect();
      const viewBox = svg.viewBox.baseVal;
      const scaleX = bounds.width / viewBox.width;
      const scaleY = bounds.height / viewBox.height;
      const x = Number(rect.getAttribute("x"));
      const y = Number(rect.getAttribute("y"));
      const width = Number(rect.getAttribute("width"));
      const height = Number(rect.getAttribute("height"));
      const strokeWidth = Number(rect.getAttribute("stroke-width"));
      return {
        bottom:
          bounds.top + (y + height + strokeWidth / 2 - viewBox.y) * scaleY,
        heightInvariant: Math.abs(y * 2 + height - viewBox.height),
        left: bounds.left + (x - strokeWidth / 2 - viewBox.x) * scaleX,
        right: bounds.left + (x + width + strokeWidth / 2 - viewBox.x) * scaleX,
        top: bounds.top + (y - strokeWidth / 2 - viewBox.y) * scaleY,
        widthInvariant: Math.abs(x * 2 + width - viewBox.width),
        xInsetError: Math.abs(x - strokeWidth / 2),
        yInsetError: Math.abs(y - strokeWidth / 2),
      };
    });
    expect(outlineBox.widthInvariant).toBeLessThan(0.0001);
    expect(outlineBox.heightInvariant).toBeLessThan(0.0001);
    expect(outlineBox.xInsetError).toBeLessThan(0.0001);
    expect(outlineBox.yInsetError).toBeLessThan(0.0001);
    expect(
      Math.abs(outlineBox.left - (imageBox.x - selectionLineCenterOutset)),
    ).toBeLessThan(0.2);
    expect(
      Math.abs(outlineBox.top - (imageBox.y - selectionLineCenterOutset)),
    ).toBeLessThan(0.2);
    expect(
      Math.abs(
        outlineBox.right -
          (imageBox.x + imageBox.width + selectionLineCenterOutset),
      ),
    ).toBeLessThan(0.2);
    expect(
      Math.abs(
        outlineBox.bottom -
          (imageBox.y + imageBox.height + selectionLineCenterOutset),
      ),
    ).toBeLessThan(0.2);
    const cornerTargets = {
      nw: {
        x: imageBox.x - selectionLineCenterOutset,
        y: imageBox.y - selectionLineCenterOutset,
      },
      ne: {
        x: imageBox.x + imageBox.width + selectionLineCenterOutset,
        y: imageBox.y - selectionLineCenterOutset,
      },
      se: {
        x: imageBox.x + imageBox.width + selectionLineCenterOutset,
        y: imageBox.y + imageBox.height + selectionLineCenterOutset,
      },
      sw: {
        x: imageBox.x - selectionLineCenterOutset,
        y: imageBox.y + imageBox.height + selectionLineCenterOutset,
      },
    };
    for (const [handle, target] of Object.entries(cornerTargets)) {
      const visualBox = await selectionOutline
        .locator(`[data-selection-corner="${handle}"]`)
        .boundingBox();
      const box = await image
        .locator(`.resize-handle.handle-${handle}`)
        .boundingBox();
      if (!box || !visualBox)
        throw new Error(`Image ${handle} handle bounds are unavailable`);
      expect(visualBox.width).toBeCloseTo(8, 1);
      expect(visualBox.height).toBeCloseTo(8, 1);
      expect(visualBox.width).toBeCloseTo(visualBox.height, 2);
      expect(visualBox.x + visualBox.width / 2).toBeCloseTo(target.x, 1);
      expect(visualBox.y + visualBox.height / 2).toBeCloseTo(target.y, 1);
      expect(box.width).toBeCloseTo(9, 1);
      expect(box.height).toBeCloseTo(9, 1);
      expect(box.width).toBeCloseTo(box.height, 2);
      expect(box.x + box.width / 2).toBeCloseTo(target.x, 1);
      expect(box.y + box.height / 2).toBeCloseTo(target.y, 1);
    }

    const edgeTargets = {
      n: {
        x: imageBox.x + imageBox.width / 2,
        y: imageBox.y - selectionLineCenterOutset,
      },
      e: {
        x: imageBox.x + imageBox.width + selectionLineCenterOutset,
        y: imageBox.y + imageBox.height / 2,
      },
      s: {
        x: imageBox.x + imageBox.width / 2,
        y: imageBox.y + imageBox.height + selectionLineCenterOutset,
      },
      w: {
        x: imageBox.x - selectionLineCenterOutset,
        y: imageBox.y + imageBox.height / 2,
      },
    };
    for (const [handle, target] of Object.entries(edgeTargets)) {
      const box = await image
        .locator(`.image-edge-handle-${handle}`)
        .boundingBox();
      if (!box) throw new Error(`Image ${handle} crop handle is unavailable`);
      const horizontal = handle === "n" || handle === "s";
      expect(box.width).toBeCloseTo(horizontal ? 18 : 7, 1);
      expect(box.height).toBeCloseTo(horizontal ? 7 : 18, 1);
      expect(box.x + box.width / 2).toBeCloseTo(target.x, 1);
      expect(box.y + box.height / 2).toBeCloseTo(target.y, 1);
    }
  };
  const initialImage = await image.boundingBox();
  if (!initialImage) throw new Error("Image bounds are unavailable");
  await page.mouse.move(
    initialImage.x + initialImage.width / 2,
    initialImage.y + initialImage.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    initialImage.x + initialImage.width / 2 - 180.35,
    initialImage.y + initialImage.height / 2 + 7.65,
    { steps: 3 },
  );
  const movingImage = await image.boundingBox();
  if (!movingImage) throw new Error("Moving image bounds are unavailable");
  await expectControlsAnchoredToImage(movingImage);
  await page.mouse.up();

  const beforeCorner = await corner.boundingBox();
  const beforeCropBar = await cropBar.boundingBox();
  const beforeCaption = await caption.boundingBox();
  const beforeImage = await image.boundingBox();
  if (!beforeCorner || !beforeCropBar || !beforeCaption || !beforeImage) {
    throw new Error("Selection control bounds are unavailable");
  }
  expect(beforeCorner.width).toBeCloseTo(9, 1);
  expect(beforeCorner.height).toBeCloseTo(9, 1);
  expect(beforeCropBar.width).toBeCloseTo(7, 1);
  expect(beforeCropBar.height).toBeCloseTo(18, 1);
  await expect(corner).toHaveCSS("border-top-width", "0px");
  await expect(corner).toHaveCSS("border-radius", "0px");
  await expect(cropBar).toHaveCSS("border-top-width", "0px");
  await expectControlsAnchoredToImage(beforeImage);

  await page.getByRole("button", { name: "Zoom", exact: true }).click();
  const zoomAnchor = {
    x: beforeImage.x + beforeImage.width / 2,
    y: beforeImage.y + beforeImage.height / 2,
  };
  for (let step = 0; step < 15; step += 1) {
    await page.mouse.click(zoomAnchor.x, zoomAnchor.y);
  }
  await expect(page.getByRole("button", { name: "250 %" })).toBeVisible();
  const middleImage = await image.boundingBox();
  if (!middleImage) throw new Error("Mid-zoom image bounds are unavailable");
  await expectControlsAnchoredToImage(middleImage);

  for (let step = 0; step < 25; step += 1) {
    await page.mouse.click(zoomAnchor.x, zoomAnchor.y);
  }
  await expect(page.getByRole("button", { name: "500 %" })).toBeVisible();
  await expect(corner).toBeVisible();
  await expect(cropBar).toBeVisible();

  const afterCorner = await corner.boundingBox();
  const afterCropBar = await cropBar.boundingBox();
  const afterCaption = await caption.boundingBox();
  const afterImage = await image.boundingBox();
  if (!afterCorner || !afterCropBar || !afterCaption || !afterImage) {
    throw new Error("Zoomed selection control bounds are unavailable");
  }
  expect(afterCorner.width).toBeCloseTo(beforeCorner.width, 1);
  expect(afterCorner.height).toBeCloseTo(beforeCorner.height, 1);
  expect(afterCropBar.width).toBeCloseTo(beforeCropBar.width, 1);
  expect(afterCropBar.height).toBeCloseTo(beforeCropBar.height, 1);
  expect(afterCaption.height).toBeCloseTo(beforeCaption.height, 1);
  expect(afterImage.x + afterImage.width / 2).toBeCloseTo(zoomAnchor.x, 0);
  expect(afterImage.y + afterImage.height / 2).toBeCloseTo(zoomAnchor.y, 0);
  await expectControlsAnchoredToImage(afterImage);

  const zoomOutAnchor = { x: canvasBox.x + 30, y: canvasBox.y + 30 };
  for (let expectedZoom = 490; expectedZoom >= 10; expectedZoom -= 10) {
    await page.mouse.click(zoomOutAnchor.x, zoomOutAnchor.y, {
      button: "right",
    });
    await expect(
      page.getByRole("button", { name: `${expectedZoom} %` }),
    ).toBeVisible();
  }
  const zoomedOutImage = await image.boundingBox();
  if (!zoomedOutImage) {
    throw new Error("Zoomed-out image bounds are unavailable");
  }
  await expect(corner).toBeVisible();
  await expect(cropBar).toBeVisible();
  await expectControlsAnchoredToImage(zoomedOutImage);

  await page.setViewportSize({ width: 1000, height: 250 });
  await expect
    .poll(() =>
      artboard.evaluate((element) =>
        Number.parseFloat(
          getComputedStyle(element).getPropertyValue("--artboard-scale"),
        ),
      ),
    )
    .toBeCloseTo(0.1, 2);
  await expect
    .poll(async () => (await corner.boundingBox())?.width ?? 0)
    .toBeCloseTo(9, 1);
  const compactZoomedOutImage = await image.boundingBox();
  if (!compactZoomedOutImage) {
    throw new Error("Compact zoomed-out image bounds are unavailable");
  }
  await expectControlsAnchoredToImage(compactZoomedOutImage);
});

test("shows scene before design and renders design controls", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Properties panel is desktop-only",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await waitForEditor(page);

  const propertyTabs = page
    .getByRole("tablist", { name: "Property sections" })
    .getByRole("tab");
  await expect(propertyTabs).toHaveText([
    "INTERACTION",
    "SCENES",
    "DESIGN",
    "SOUND",
    "LOGIC",
  ]);
  await expect(propertyTabs.nth(2)).toHaveAttribute("aria-selected", "true");

  await page.getByRole("button", { name: "Setting", exact: true }).click();
  await expect(propertyTabs.nth(1)).toHaveAttribute("aria-selected", "false");
  await expect(propertyTabs.nth(2)).toHaveAttribute("aria-selected", "true");

  await propertyTabs.nth(2).click();
  const artboard = page.getByLabel("Artboard");
  const box = await artboard.boundingBox();
  if (!box) throw new Error("Artboard bounds are unavailable");
  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await page.mouse.move(box.x + 100, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 260, box.y + 220, { steps: 3 });
  await page.mouse.up();

  await expect(page.locator(".design-properties")).toContainText("Transform");
  await expect(page.locator(".design-properties")).toContainText("Pathfinder");
  await expect(page.locator(".design-properties")).toContainText(
    "Corner Radius",
  );
  const transformHeadingBox = await page
    .locator(
      ".design-properties > .property-section:first-child > .panel-heading",
    )
    .boundingBox();
  const shapeHeadingBox = await page
    .locator(".design-properties .appearance-section > .panel-heading")
    .boundingBox();
  if (!transformHeadingBox || !shapeHeadingBox) {
    throw new Error("Design section heading bounds are unavailable");
  }
  expect(shapeHeadingBox.x).toBeCloseTo(transformHeadingBox.x, 0);
});

function createTestWavBuffer() {
  const sampleRate = 8_000;
  const durationSeconds = 2;
  const sampleCount = sampleRate * durationSeconds;
  const bytesPerSample = 2;
  const dataSize = sampleCount * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * bytesPerSample, 28);
  buffer.writeUInt16LE(bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < sampleCount; index += 1) {
    const sample = Math.sin((index / sampleRate) * Math.PI * 2 * 440);
    buffer.writeInt16LE(
      Math.round(sample * 8_000),
      44 + index * bytesPerSample,
    );
  }

  return buffer;
}

function createTestMp3WithCoverBuffer() {
  const image = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  const payload = Buffer.concat([
    Buffer.from([0]),
    Buffer.from("image/png\0", "ascii"),
    Buffer.from([3, 0]),
    image,
  ]);
  const frameHeader = Buffer.alloc(10);
  frameHeader.write("APIC", 0, "ascii");
  frameHeader.writeUInt32BE(payload.length, 4);
  const frame = Buffer.concat([frameHeader, payload]);
  const tagHeader = Buffer.alloc(10);
  tagHeader.write("ID3", 0, "ascii");
  tagHeader[3] = 3;
  tagHeader[6] = (frame.length >>> 21) & 0x7f;
  tagHeader[7] = (frame.length >>> 14) & 0x7f;
  tagHeader[8] = (frame.length >>> 7) & 0x7f;
  tagHeader[9] = frame.length & 0x7f;
  return Buffer.concat([tagHeader, frame]);
}

test("matches the Figma sound-panel geometry", async ({ page }) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Properties panel is desktop-only",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await waitForEditor(page);
  await page.getByRole("tab", { name: "SOUND" }).click();

  const panel = page.getByRole("tabpanel", { name: "Sound settings" });
  const panelBox = await panel.boundingBox();
  if (!panelBox) throw new Error("Sound panel bounds are unavailable");

  const expectBounds = async (
    selector: string,
    expected: { height: number; width: number; x: number; y: number },
    index = 0,
  ) => {
    const box = await panel.locator(selector).nth(index).boundingBox();
    if (!box)
      throw new Error(`Sound control bounds are unavailable: ${selector}`);
    expect(box.x - panelBox.x).toBeCloseTo(expected.x, 0);
    expect(box.y - panelBox.y).toBeCloseTo(expected.y, 0);
    expect(box.width).toBeCloseTo(expected.width, 0);
    expect(box.height).toBeCloseTo(expected.height, 0);
  };

  await expectBounds(".sound-scope-tabs", {
    height: 22,
    width: 308,
    x: 16,
    y: 9,
  });
  await expectBounds(".sound-upload-card", {
    height: 48,
    width: 308,
    x: 16,
    y: 70,
  });
  await expectBounds(".sound-file-thumbnail", {
    height: 33,
    width: 33,
    x: 22,
    y: 78,
  });
  await expectBounds(".sound-preview-row", {
    height: 13,
    width: 183,
    x: 121,
    y: 85,
  });
  await expectBounds(".sound-preview-track", {
    height: 13,
    width: 163,
    x: 141,
    y: 85,
  });
  await expectBounds(".sound-upload-copy > span", {
    height: 10,
    width: 55,
    x: 61,
    y: 98,
  });
  await expectBounds(".sound-preview-time", {
    height: 10,
    width: 54,
    x: 263,
    y: 98,
  });
  const [cardBounds, trackBounds, metadataBounds, timeBounds] =
    await Promise.all([
      panel.locator(".sound-upload-card").boundingBox(),
      panel.locator(".sound-preview-track").boundingBox(),
      panel.locator(".sound-upload-copy > span").boundingBox(),
      panel.locator(".sound-preview-time").boundingBox(),
    ]);
  if (!cardBounds || !trackBounds || !metadataBounds || !timeBounds) {
    throw new Error("Background music card bounds are unavailable");
  }
  expect(
    cardBounds.x + cardBounds.width - trackBounds.x - trackBounds.width,
  ).toBeCloseTo(20, 1);
  expect(
    timeBounds.y - (trackBounds.y + Math.floor(trackBounds.height / 2) + 1),
  ).toBeCloseTo(6, 1);
  expect(
    cardBounds.y + cardBounds.height - metadataBounds.y - metadataBounds.height,
  ).toBeCloseTo(10, 1);
  expect(
    cardBounds.y + cardBounds.height - timeBounds.y - timeBounds.height,
  ).toBeCloseTo(10, 1);
  await expectBounds(".sound-slider", {
    height: 7,
    width: 164,
    x: 83,
    y: 132,
  });
  await expectBounds(".sound-percent-field", {
    height: 22,
    width: 47,
    x: 262,
    y: 124,
  });
  await expectBounds(".sound-stepper-field", {
    height: 22,
    width: 80,
    x: 111,
    y: 151,
  });
  await expectBounds(".sound-stepper-unit", {
    height: 7,
    width: 4,
    x: 195,
    y: 158.5,
  });
  await expectBounds(".sound-playback-select", {
    height: 22,
    width: 105,
    x: 111,
    y: 232,
  });
  await expect(panel.locator(".sound-preview-waveform")).toHaveCount(1);
  await expect(panel.locator(".sound-bgm-collapse")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(panel.locator(".sound-stepper-unit").first()).toHaveCSS(
    "font-size",
    "6px",
  );
  await expect(
    page.getByRole("spinbutton", { name: "Fade in duration" }),
  ).toHaveCSS("text-align", "left");
  await expect(page.getByLabel("Sound volume")).toHaveCSS("text-align", "left");
  await expect(panel).not.toContainText("Interaction Sounds");
});

test("matches the Figma All Sounds layout and opens its layer", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Properties panel is desktop-only",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await waitForEditor(page);

  const artboardBox = await page.getByLabel("Artboard").boundingBox();
  if (!artboardBox) throw new Error("Artboard bounds are unavailable");
  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await page.mouse.move(artboardBox.x + 100, artboardBox.y + 100);
  await page.mouse.down();
  await page.mouse.move(artboardBox.x + 220, artboardBox.y + 190, {
    steps: 2,
  });
  await page.mouse.up();
  await page.getByRole("tab", { name: "SOUND" }).click();

  const panel = page.getByRole("tabpanel", { name: "Sound settings" });
  await panel.getByLabel("Choose background music file").setInputFiles({
    buffer: createTestWavBuffer(),
    mimeType: "audio/wav",
    name: "gallery-background.wav",
  });
  await panel.getByRole("button", { name: "More Hover sound options" }).click();
  await panel.getByRole("menuitem", { name: "Event Settings" }).click();
  const [soundChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    panel.getByRole("button", { name: "Add Sound" }).click(),
  ]);
  await soundChooser.setFiles("public/figma/sound/test-interaction-click.wav");
  await panel.getByRole("button", { name: "All Sounds" }).click();

  const panelBox = await panel.boundingBox();
  if (!panelBox) throw new Error("Sound panel bounds are unavailable");
  const relativeBounds = async (selector: string) => {
    const bounds = await panel.locator(selector).boundingBox();
    if (!bounds) throw new Error(`All Sounds bounds unavailable: ${selector}`);
    return {
      height: bounds.height,
      width: bounds.width,
      x: bounds.x - panelBox.x,
      y: bounds.y - panelBox.y,
    };
  };

  await expect(panel.getByText("Background Music (BGM)")).toBeVisible();
  await expect(panel.getByText("Rectangle 1", { exact: true })).toBeVisible();
  await expect(panel.getByText("test-interaction-click.wav")).toBeVisible();
  expect(await relativeBounds(".sound-all-bgm-section")).toMatchObject({
    width: 308,
    x: 16,
    y: 44,
  });
  expect(await relativeBounds(".sound-all-bgm-card")).toMatchObject({
    height: 48,
    width: 308,
    x: 16,
  });
  const bgmCardBox = await panel.locator(".sound-all-bgm-card").boundingBox();
  const bgmHeadingBox = await panel
    .getByRole("heading", { name: "Background Music (BGM)" })
    .boundingBox();
  const bgmOptionsIconBox = await panel
    .getByRole("button", { name: "All Sounds background music options" })
    .locator("img")
    .boundingBox();
  if (!bgmCardBox || !bgmHeadingBox || !bgmOptionsIconBox) {
    throw new Error("Background music action bounds are unavailable");
  }
  expect(bgmCardBox.y - (bgmHeadingBox.y + bgmHeadingBox.height)).toBeCloseTo(
    11,
    0,
  );
  expect(bgmOptionsIconBox.y - bgmCardBox.y).toBeCloseTo(6, 0);
  expect(
    bgmCardBox.x +
      bgmCardBox.width -
      (bgmOptionsIconBox.x + bgmOptionsIconBox.width),
  ).toBeCloseTo(7, 0);
  await panel
    .getByRole("button", { name: "All Sounds background music options" })
    .click();
  const bgmMenuBox = await panel
    .getByRole("menu", { name: "All Sounds background music options menu" })
    .boundingBox();
  if (!bgmMenuBox)
    throw new Error("Background music menu bounds are unavailable");
  expect(bgmMenuBox.y + bgmMenuBox.height).toBeLessThanOrEqual(bgmCardBox.y);
  await panel
    .getByRole("button", { name: "All Sounds background music options" })
    .click();
  const metadataBox = await panel
    .locator(".sound-all-bgm-copy small")
    .boundingBox();
  const tagsBox = await panel.locator(".sound-all-bgm-tags").boundingBox();
  if (!metadataBox || !tagsBox) {
    throw new Error("Background music metadata bounds are unavailable");
  }
  expect(tagsBox.x - (metadataBox.x + metadataBox.width)).toBeCloseTo(9, 0);
  expect(
    tagsBox.y + tagsBox.height / 2 - (metadataBox.y + metadataBox.height / 2),
  ).toBeCloseTo(0, 0);
  await expect(panel.locator(".sound-all-bgm-tags > span").first()).toHaveCSS(
    "border-color",
    "rgb(171, 81, 240)",
  );
  const backgroundDivider = await panel
    .locator(".sound-all-bgm-section")
    .evaluate((element) => {
      const style = getComputedStyle(element, "::after");
      return { left: style.left, width: style.width };
    });
  expect(backgroundDivider).toEqual({ left: "-16px", width: "340px" });
  expect(await relativeBounds(".sound-all-filters")).toMatchObject({
    height: 22,
    width: 339,
    x: 0,
  });
  expect(await relativeBounds(".sound-all-search")).toMatchObject({
    height: 22,
    width: 168,
    x: 0,
  });
  expect(
    await relativeBounds(".sound-all-filter-dropdown:nth-child(2)"),
  ).toMatchObject({
    height: 22,
    width: 82,
    x: 172,
  });
  expect(
    await relativeBounds(".sound-all-filter-dropdown:nth-child(3)"),
  ).toMatchObject({
    height: 22,
    width: 81,
    x: 258,
  });
  expect(await relativeBounds(".sound-all-table")).toMatchObject({
    width: 339,
    x: 0,
  });
  const filterBox = await panel.locator(".sound-all-filters").boundingBox();
  const tableBox = await panel.locator(".sound-all-table").boundingBox();
  if (!filterBox || !tableBox) {
    throw new Error("All Sounds list bounds are unavailable");
  }
  expect(panelBox.x + panelBox.width - (filterBox.x + filterBox.width)).toBe(6);
  expect(panelBox.x + panelBox.width - (tableBox.x + tableBox.width)).toBe(6);
  expect(await relativeBounds(".sound-all-master-section")).toMatchObject({
    width: 340,
    x: 0,
  });
  await expect(panel.locator(".sound-all-table-header")).toHaveCSS(
    "background-color",
    "rgba(186, 186, 186, 0.2)",
  );
  await expect(panel.locator(".sound-all-object-thumbnail")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(panel).toHaveCSS("scrollbar-width", "none");
  expect(
    await relativeBounds(".sound-all-object-thumbnail.symbol-rectangle"),
  ).toMatchObject({ height: 15, width: 15 });
  await expect(
    panel.locator(".sound-all-object-thumbnail.symbol-rectangle"),
  ).toHaveCSS("border-radius", "0px");
  expect(
    await panel
      .locator(".sound-all-object-thumbnail.symbol-rectangle")
      .evaluate((element) => {
        const style = getComputedStyle(element, "::before");
        return { height: style.height, width: style.width };
      }),
  ).toEqual({ height: "14px", width: "14px" });
  await expect(panel.locator(".sound-all-object-cell")).toHaveCSS("gap", "4px");
  await expect(panel.locator(".sound-all-trigger-cell")).toHaveCSS(
    "color",
    "rgb(0, 0, 0)",
  );
  await expect(panel.getByLabel("Master sound volume value")).toHaveValue(
    "100",
  );
  const masterTrackHeights = await panel
    .locator(".sound-all-master-slider .design-range-fill")
    .evaluateAll((tracks) =>
      tracks.map((track) => getComputedStyle(track).height),
    );
  expect(new Set(masterTrackHeights).size).toBe(1);
  await expect(panel.locator(".sound-all-table-header")).toHaveCSS(
    "font-size",
    "10px",
  );
  await expect(panel.locator(".sound-all-table-row")).toHaveCSS(
    "font-size",
    "10px",
  );

  await panel.getByLabel("Select Rectangle 1 sounds").check({ force: true });
  await panel.getByRole("button", { name: "Edit selected sounds" }).click();
  const bulkMenu = panel.getByRole("menu", {
    name: "Selected sounds options menu",
  });
  await expect(bulkMenu.getByRole("menuitem")).toHaveText([
    "Delete",
    "Change Volume",
    "Enable",
    "Disable",
  ]);
  await bulkMenu.getByRole("menuitem", { name: "Change Volume" }).click();
  const bulkVolume = panel.getByRole("group", {
    name: "Selected sounds volume control",
  });
  const [bulkVolumeBox, bulkSliderBox, bulkFieldBox] = await Promise.all([
    bulkVolume.boundingBox(),
    bulkVolume
      .getByRole("slider", { name: "Selected sounds volume", exact: true })
      .boundingBox(),
    bulkVolume.locator(".sound-percent-field").boundingBox(),
  ]);
  if (!bulkVolumeBox || !bulkSliderBox || !bulkFieldBox) {
    throw new Error("Selected sounds volume bounds are unavailable");
  }
  expect(bulkFieldBox.x - (bulkSliderBox.x + bulkSliderBox.width)).toBeCloseTo(
    3,
    0,
  );
  expect(
    bulkVolumeBox.x +
      bulkVolumeBox.width -
      (bulkFieldBox.x + bulkFieldBox.width),
  ).toBeGreaterThanOrEqual(5);
  await panel.getByRole("heading", { name: "Interaction Sounds" }).click();
  await expect(bulkVolume).toHaveCount(0);
  await panel.getByRole("button", { name: "Edit selected sounds" }).click();
  await panel
    .getByRole("menu", { name: "Selected sounds options menu" })
    .getByRole("menuitem", { name: "Disable" })
    .click();
  await expect(
    panel.getByRole("button", { name: "Play test-interaction-click.wav" }),
  ).toBeDisabled();
  const disabledRow = panel.locator(
    ".sound-all-table-row[data-disabled='true']",
  );
  const disabledTrigger = disabledRow.locator(".sound-all-trigger-cell");
  const disabledPlay = disabledRow.getByRole("button", {
    name: "Play test-interaction-click.wav",
  });
  const disabledDots = disabledRow.getByRole("button", {
    name: "More options for test-interaction-click.wav",
  });
  const [disabledTriggerBox, disabledPlayBox, disabledDotsBox] =
    await Promise.all([
      disabledTrigger.boundingBox(),
      disabledPlay.boundingBox(),
      disabledDots.boundingBox(),
    ]);
  if (!disabledTriggerBox || !disabledPlayBox || !disabledDotsBox) {
    throw new Error("Disabled All Sounds row bounds are unavailable");
  }
  const triggerCenter = disabledTriggerBox.y + disabledTriggerBox.height / 2;
  expect(disabledPlayBox.y + disabledPlayBox.height / 2).toBeCloseTo(
    triggerCenter,
    0,
  );
  expect(disabledDotsBox.y + disabledDotsBox.height / 2).toBeCloseTo(
    triggerCenter,
    0,
  );
  await expect(disabledRow.locator(".sound-all-object-cell")).toHaveCSS(
    "opacity",
    "0.45",
  );
  await expect(disabledTrigger).toHaveCSS("opacity", "0.45");
  await expect(disabledRow.locator(".sound-all-sound-cell")).toHaveCSS(
    "opacity",
    "0.45",
  );
  await disabledDots.click();
  await panel
    .getByRole("menu", {
      name: "test-interaction-click.wav options menu",
    })
    .getByRole("menuitem", { name: "Go to Layer" })
    .click();
  const disabledSelectedRow = panel.getByRole("group", {
    name: "Hover interaction sound",
  });
  if (
    await disabledSelectedRow.evaluate((row) =>
      row.classList.contains("is-expanded"),
    )
  ) {
    await panel
      .getByRole("button", { name: "More Hover sound options" })
      .click();
    await panel.getByRole("menuitem", { name: "Event Settings" }).click();
  }
  await expect(disabledSelectedRow).toHaveAttribute("data-disabled", "true");
  await expect(
    disabledSelectedRow.getByRole("button", {
      exact: true,
      name: "Preview Hover sound",
    }),
  ).toBeDisabled();
  await expect(
    disabledSelectedRow.getByLabel("Hover sound volume", { exact: true }),
  ).toBeDisabled();
  for (const selector of [
    ".sound-interaction-trigger",
    ".sound-play-button",
    ".sound-interaction-name",
    ".sound-interaction-volume",
    ".sound-mini-slider",
  ]) {
    await expect(disabledSelectedRow.locator(selector)).toHaveCSS(
      "opacity",
      "0.45",
    );
  }
  await panel.getByRole("button", { name: "More Hover sound options" }).click();
  await panel.getByRole("menuitem", { name: "Event Settings" }).click();
  await expect(disabledSelectedRow).toHaveClass(/is-expanded/);
  for (const selector of [
    ".sound-interaction-name",
    ".sound-interaction-volume",
    ".sound-event-file-name",
    ".sound-event-volume-value",
  ]) {
    await expect(disabledSelectedRow.locator(selector)).toHaveCSS(
      "opacity",
      "0.45",
    );
  }
  await panel.getByRole("button", { name: "All Sounds" }).click();
  await panel.getByLabel("Select Rectangle 1 sounds").check({ force: true });
  await panel.getByRole("button", { name: "Edit selected sounds" }).click();
  await panel
    .getByRole("menu", { name: "Selected sounds options menu" })
    .getByRole("menuitem", { name: "Enable" })
    .click();
  await expect(
    panel.getByRole("button", { name: "Play test-interaction-click.wav" }),
  ).toBeEnabled();

  await page.locator(".zoom-control").click();
  await page.getByRole("menuitemradio", { name: "150%" }).click();
  const scaledTrackHeights = await panel
    .locator(".sound-all-master-slider .design-range-fill")
    .evaluateAll((tracks) =>
      tracks.map((track) => track.getBoundingClientRect().height),
    );
  expect(new Set(scaledTrackHeights).size).toBe(1);

  await panel
    .getByRole("button", {
      name: "More options for test-interaction-click.wav",
    })
    .click();
  const rowMenu = panel.getByRole("menu", {
    name: "test-interaction-click.wav options menu",
  });
  await expect(rowMenu.getByRole("menuitem")).toHaveText([
    "Delete Sound",
    "Go to Layer",
  ]);
  await rowMenu.getByRole("menuitem", { name: "Go to Layer" }).click();
  await expect(
    panel.getByRole("button", { name: "Selected Object" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    panel.getByRole("region", { name: "Interaction Sounds" }),
  ).toBeVisible();
});

test("keeps topbar publish labels at twelve pixels", async ({ page }) => {
  await waitForEditor(page);
  await expect(page.getByRole("button", { name: "SHARE" })).toHaveCSS(
    "font-size",
    "12px",
  );
  await expect(page.getByRole("button", { name: "SEND" })).toHaveCSS(
    "font-size",
    "12px",
  );
});

test("shows and expands Interaction Sounds for a selected shape", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Properties panel is desktop-only",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await waitForEditor(page);

  const artboard = page.getByLabel("Artboard");
  const artboardBox = await artboard.boundingBox();
  if (!artboardBox) throw new Error("Artboard bounds are unavailable");
  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await page.mouse.move(artboardBox.x + 100, artboardBox.y + 100);
  await page.mouse.down();
  await page.mouse.move(artboardBox.x + 220, artboardBox.y + 190, {
    steps: 2,
  });
  await page.mouse.up();
  await page.getByRole("tab", { name: "SOUND" }).click();

  const panel = page.getByRole("tabpanel", { name: "Sound settings" });
  const interaction = panel.getByRole("region", {
    name: "Interaction Sounds",
  });
  await expect(interaction).toBeVisible();
  await expect(panel.getByRole("button", { name: /^Add$/ })).toHaveCount(0);

  const playback = panel.locator(".sound-playback-select");
  const divider = panel.locator(".sound-interaction-divider");
  const heading = interaction.getByRole("heading", {
    name: "Interaction Sounds",
  });
  const [playbackBox, dividerBox, headingBox] = await Promise.all([
    playback.boundingBox(),
    divider.boundingBox(),
    heading.boundingBox(),
  ]);
  if (!playbackBox || !dividerBox || !headingBox) {
    throw new Error("Interaction sound spacing bounds are unavailable");
  }
  expect(dividerBox.y - (playbackBox.y + playbackBox.height)).toBeCloseTo(
    13,
    0,
  );
  expect(headingBox.y - dividerBox.y).toBeCloseTo(13, 0);

  await expect(
    panel.getByRole("region", { name: "Advanced Settings" }),
  ).toHaveCount(0);
  await expect(panel.locator(".sound-advanced-divider")).toHaveCount(0);

  const hoverRow = panel.getByRole("group", {
    name: "Hover interaction sound",
  });
  await expect(
    panel.getByRole("group", { name: "Click interaction sound" }),
  ).toHaveCount(0);
  await expect(hoverRow).toHaveClass(/is-empty/);
  await expect(
    panel.getByRole("button", { name: "Preview Hover sound" }),
  ).toBeDisabled();
  await expect(panel.getByLabel("Hover sound volume")).toBeDisabled();
  await expect(panel.getByLabel("Hover sound file name: empty")).toBeEmpty();
  await expect(hoverRow).toHaveCSS("height", "22px");

  await panel.getByRole("button", { name: "More Hover sound options" }).click();
  await panel.getByRole("menuitem", { name: "Event Settings" }).click();
  const details = panel.getByRole("group", { name: "Hover sound details" });
  await expect(details).toBeVisible();
  await expect(hoverRow).toHaveCSS("height", "261px");
  await expect(details).toHaveCSS("width", "300px");
  await expect(details).toHaveCSS("height", "234px");
  const eventDivider = details.locator(".sound-event-divider");
  expect((await eventDivider.boundingBox())?.height).toBeCloseTo(1, 1);
  await expect(eventDivider).toHaveCSS("border-top-style", "solid");
  await expect(details.getByText("00:00/0.0MB", { exact: true })).toHaveCSS(
    "white-space",
    "nowrap",
  );
  await expect(
    details.getByRole("button", { name: "Remove Hover sound file 1" }),
  ).toHaveCount(0);
  await expect(
    details.getByRole("button", { name: "Add Sound" }),
  ).toBeVisible();
  await expect(details.getByRole("button", { name: "Add Sound" })).toHaveCSS(
    "cursor",
    "pointer",
  );

  await details.getByRole("radio", { name: "Multiple Sounds" }).click();
  await expect(hoverRow).toHaveCSS("height", "306px");
  await expect(details).toHaveCSS("height", "280px");
  await expect(details.locator(".sound-event-file-control")).toHaveCount(1);
  await expect(
    details.getByRole("button", { name: "Add Sound" }),
  ).toBeVisible();
  await details
    .getByRole("button", { name: "Hover sound playback mode" })
    .click();
  const playbackModeMenu = page.getByRole("listbox", {
    name: "Hover sound playback mode menu",
  });
  await expect(playbackModeMenu.getByRole("option")).toHaveText([
    "Shuffle",
    "Sequential",
  ]);
  await expect(
    playbackModeMenu.getByText("Random", { exact: true }),
  ).toHaveCount(0);
});

test("plays Multiple Sounds one at a time in sequential order", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Properties panel is desktop-only",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await waitForEditor(page);

  const artboard = page.getByLabel("Artboard");
  const artboardBox = await artboard.boundingBox();
  if (!artboardBox) throw new Error("Artboard bounds are unavailable");
  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await page.mouse.move(artboardBox.x + 100, artboardBox.y + 100);
  await page.mouse.down();
  await page.mouse.move(artboardBox.x + 220, artboardBox.y + 190, {
    steps: 2,
  });
  await page.mouse.up();
  await page.getByRole("tab", { name: "SOUND" }).click();

  const panel = page.getByRole("tabpanel", { name: "Sound settings" });
  await panel.getByRole("button", { name: "More Hover sound options" }).click();
  await panel.getByRole("menuitem", { name: "Event Settings" }).click();
  let details = panel.getByRole("group", { name: "Hover sound details" });
  await details.getByRole("radio", { name: "Multiple Sounds" }).click();
  await details
    .getByRole("button", { name: "Hover sound playback mode" })
    .click();
  await page
    .getByRole("listbox", { name: "Hover sound playback mode menu" })
    .getByRole("option", { name: "Sequential" })
    .click();

  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    details.getByRole("button", { name: "Add Sound" }).click(),
  ]);
  await fileChooser.setFiles([
    "public/figma/sound/test-interaction-chime.wav",
    "public/figma/sound/test-interaction-click.wav",
  ]);
  await expect(details.locator(".sound-event-file-control")).toHaveCount(2);

  await details.getByRole("button", { name: "Hover sound trigger" }).click();
  await page
    .getByRole("listbox", { name: "Hover sound trigger menu" })
    .getByRole("option", { name: "Click" })
    .click();
  details = panel.getByRole("group", { name: "Click sound details" });
  await expect(
    details.getByRole("button", { name: "Click sound event" }),
  ).toHaveText("Click");

  await panel.getByRole("button", { name: "More Click sound options" }).click();
  await panel.getByRole("menuitem", { name: "Event Settings" }).click();
  const collapsedRow = panel.getByRole("group", {
    name: "Click interaction sound",
  });
  const collapsedName = collapsedRow.locator(".sound-interaction-name");
  await expect(collapsedName).toHaveCSS("text-overflow", "ellipsis");
  await expect(collapsedName).toHaveCSS("padding-right", "8px");
  expect(
    await collapsedName.evaluate((name) => name.scrollWidth > name.clientWidth),
  ).toBe(true);
  const [rowBox, playButtonBox] = await Promise.all([
    collapsedRow.boundingBox(),
    collapsedRow
      .getByRole("button", { name: "Preview Click sound", exact: true })
      .boundingBox(),
  ]);
  if (!rowBox || !playButtonBox) {
    throw new Error("Collapsed interaction sound row bounds are unavailable");
  }
  expect(
    playButtonBox.y + playButtonBox.height / 2 - (rowBox.y + rowBox.height / 2),
  ).toBeCloseTo(1, 0);

  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  const audioChannels = preview.locator(".viewer-interaction-sound");
  await expect(audioChannels).toHaveCount(1);
  await audioChannels.evaluateAll((audios) => {
    audios[0].addEventListener("play", () => {
      const playedSources = JSON.parse(
        audios[0].getAttribute("data-played-sources") ?? "[]",
      ) as string[];
      playedSources.push(audios[0].getAttribute("src") ?? "");
      audios[0].setAttribute(
        "data-played-sources",
        JSON.stringify(playedSources),
      );
    });
  });

  const previewElement = preview.locator(".viewer-preview-element");
  await previewElement.click();
  await previewElement.click();
  await previewElement.click();
  await expect
    .poll(() =>
      audioChannels.evaluateAll(
        (audios) =>
          JSON.parse(
            audios[0].getAttribute("data-played-sources") ?? "[]",
          ) as string[],
      ),
    )
    .toHaveLength(3);
  const playedSources = await audioChannels.evaluateAll(
    (audios) =>
      JSON.parse(
        audios[0].getAttribute("data-played-sources") ?? "[]",
      ) as string[],
  );
  expect(playedSources[0]).not.toBe(playedSources[1]);
  expect(playedSources[2]).toBe(playedSources[0]);
});

test("manages background music files and playback settings", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Properties panel is desktop-only",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await waitForEditor(page);
  await page.getByRole("tab", { name: "SOUND" }).click();

  const panel = page.getByRole("tabpanel", { name: "Sound settings" });
  const content = panel.locator(".sound-bgm-content");
  const collapseButton = panel.getByRole("button", {
    name: "Collapse background music",
  });

  await expect(panel.getByText("No file", { exact: true })).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Upload background music" }),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Play background music preview" }),
  ).toBeDisabled();
  await expect(panel.locator(".sound-file-thumbnail-icon")).toHaveCount(0);

  await collapseButton.click();
  await expect(content).toBeHidden();
  const expandButton = panel.getByRole("button", {
    name: "Expand background music",
  });
  await expect(expandButton).toHaveAttribute("aria-expanded", "false");
  await expandButton.click();
  await expect(content).toBeVisible();
  await expect(collapseButton).toHaveAttribute("aria-expanded", "true");

  const volumeSlider = panel.getByRole("slider", {
    name: "Background music volume",
  });
  const volumeInput = panel.getByLabel("Sound volume");
  await volumeSlider.fill("63");
  await expect(volumeInput).toHaveValue("63");
  await volumeInput.fill("27");
  await volumeInput.press("Enter");
  await expect(volumeSlider).toHaveValue("27");

  const fadeIn = panel.getByRole("spinbutton", { name: "Fade in duration" });
  const fadeOut = panel.getByRole("spinbutton", { name: "Fade out duration" });
  await fadeIn.fill("1.2");
  await fadeIn.press("Enter");
  await fadeOut.fill("2.4");
  await fadeOut.press("Enter");
  await expect(fadeIn).toHaveValue("1.2");
  await expect(fadeOut).toHaveValue("2.4");

  const loopButton = panel.getByRole("button", { name: "Loop" });
  await expect(loopButton).toHaveAttribute("aria-pressed", "true");
  await loopButton.click();
  await expect(loopButton).toHaveAttribute("aria-pressed", "false");

  const startPlayback = panel.getByRole("button", {
    name: "Start playback",
  });
  await expect(startPlayback).toContainText("On Page Enter");
  await startPlayback.click();
  const playbackMenu = panel.getByRole("listbox", {
    name: "Start playback menu",
  });
  await expect(playbackMenu.getByRole("option")).toHaveText([
    "On Page Enter",
    "After Delay",
    "On Interaction",
    "Manual",
  ]);
  await playbackMenu.getByRole("option", { name: "After Delay" }).click();
  const playbackDelay = panel.getByRole("spinbutton", {
    name: "Playback delay",
  });
  await expect(playbackDelay).toBeVisible();
  await playbackDelay.fill("1.5");
  await playbackDelay.press("Enter");
  await expect(playbackDelay).toHaveValue("1.5");
  await startPlayback.click();
  await panel
    .getByRole("listbox", { name: "Start playback menu" })
    .getByRole("option", { name: "Manual" })
    .click();
  await expect(
    panel.getByRole("spinbutton", { name: "Playback delay" }),
  ).toHaveCount(0);

  const fileInput = panel.getByLabel("Choose background music file");
  await fileInput.setInputFiles({
    buffer: createTestWavBuffer(),
    mimeType: "audio/wav",
    name: "gallery-ambient.wav",
  });

  await expect(
    panel.getByText("gallery-ambient.wav", { exact: true }),
  ).toBeVisible();
  await expect(panel.getByText("No file", { exact: true })).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Play background music preview" }),
  ).toBeEnabled();
  await expect(panel.locator(".sound-file-thumbnail-icon")).toBeVisible();
  await expect(panel.locator(".sound-file-thumbnail-artwork")).toHaveCount(0);
  const [loadedCardBounds, loadedTrackBounds] = await Promise.all([
    panel.locator(".sound-upload-card").boundingBox(),
    panel.locator(".sound-preview-track").boundingBox(),
  ]);
  if (!loadedCardBounds || !loadedTrackBounds) {
    throw new Error("Loaded background music card bounds are unavailable");
  }
  expect(
    loadedCardBounds.x +
      loadedCardBounds.width -
      loadedTrackBounds.x -
      loadedTrackBounds.width,
  ).toBeCloseTo(20, 1);
  const playPreview = panel.getByRole("button", {
    name: "Play background music preview",
  });
  const playIconBounds = await playPreview.locator("img").boundingBox();
  if (!playIconBounds) throw new Error("Play icon bounds are unavailable");
  await playPreview.click();
  const pausePreview = panel.getByRole("button", {
    name: "Pause background music preview",
  });
  await expect(pausePreview).toBeVisible();
  const pauseIcon = pausePreview.locator(".sound-pause-icon");
  await expect(pauseIcon).toHaveAttribute("viewBox", "0 0 13 13");
  const pauseIconBounds = await pauseIcon.boundingBox();
  if (!pauseIconBounds) throw new Error("Pause icon bounds are unavailable");
  expect(pauseIconBounds.width).toBeCloseTo(playIconBounds.width, 1);
  expect(pauseIconBounds.height).toBeCloseTo(playIconBounds.height, 1);
  await expect
    .poll(async () =>
      panel.locator(".sound-preview-waveform").evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        const context = canvas.getContext("2d");
        if (!context) return 0;
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        const center = Math.floor(canvas.height / 2);
        let activePixels = 0;
        for (let y = 0; y < canvas.height; y += 1) {
          if (Math.abs(y - center) <= 1) continue;
          for (let x = 0; x < canvas.width; x += 1) {
            if (pixels.data[(y * canvas.width + x) * 4 + 3] > 0) {
              activePixels += 1;
            }
          }
        }
        return activePixels;
      }),
    )
    .toBeGreaterThan(0);
  await pausePreview.click();
  await expect(
    panel.getByRole("button", { name: "Play background music preview" }),
  ).toBeVisible();
  const fileOptions = panel.getByRole("button", {
    name: "Background music file options",
  });
  await fileOptions.click();
  const fileMenu = panel.getByRole("menu", {
    name: "Background music file options menu",
  });
  await expect(fileMenu.getByRole("menuitem")).toHaveText([
    "Change File",
    "Delete File",
  ]);
  await fileMenu.getByRole("menuitem", { name: "Delete File" }).click();

  await expect(panel.getByText("No file", { exact: true })).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Upload background music" }),
  ).toBeVisible();
  await expect(fileOptions).toHaveCount(0);
});

test("plays background music on page entry in the audience preview", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Properties panel is desktop-only",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await waitForEditor(page);
  await page.getByRole("tab", { name: "SOUND" }).click();

  const panel = page.getByRole("tabpanel", { name: "Sound settings" });
  await panel.getByLabel("Choose background music file").setInputFiles({
    buffer: createTestWavBuffer(),
    mimeType: "audio/wav",
    name: "page-entry-background.wav",
  });
  await expect(
    panel.getByRole("button", { name: "Start playback" }),
  ).toContainText("On Page Enter");

  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const backgroundMusic = page
    .getByRole("dialog", { name: "Viewer preview" })
    .locator(".viewer-background-music");
  await expect(backgroundMusic).toHaveAttribute("src", /^blob:/);
  await expect
    .poll(() =>
      backgroundMusic.evaluate((audio) => (audio as HTMLAudioElement).paused),
    )
    .toBe(false);
});

test("shows embedded audio cover art and uses an icon when no cover exists", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Properties panel is desktop-only",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await waitForEditor(page);
  await page.getByRole("tab", { name: "SOUND" }).click();

  const panel = page.getByRole("tabpanel", { name: "Sound settings" });
  const fileInput = panel.getByLabel("Choose background music file");
  await fileInput.setInputFiles({
    buffer: createTestMp3WithCoverBuffer(),
    mimeType: "audio/mpeg",
    name: "music-with-cover.mp3",
  });

  const artwork = panel.locator(".sound-file-thumbnail-artwork");
  await expect(artwork).toBeVisible();
  await expect
    .poll(() =>
      artwork.evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBe(1);
  await expect(panel.locator(".sound-file-thumbnail-icon")).toHaveCount(0);

  await fileInput.setInputFiles({
    buffer: createTestWavBuffer(),
    mimeType: "audio/wav",
    name: "music-without-cover.wav",
  });
  await expect(panel.locator(".sound-file-thumbnail-icon")).toBeVisible();
  await expect(artwork).toHaveCount(0);
});

test("applies page type and viewport sizing in the audience preview", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Properties panel is desktop-only",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await waitForEditor(page);

  await page.getByRole("button", { name: "Setting", exact: true }).click();
  const pageType = page.getByRole("group", { name: "Page Type" });
  const viewportOptions = page.getByRole("group", { name: "Viewport" });

  await pageType.getByRole("button", { name: /Scroll/ }).click();
  await viewportOptions.getByRole("button", { name: "Fill" }).click();
  await page.getByRole("button", { name: "Preview" }).click();

  let audienceViewport = page.locator(".viewer-preview-viewport");
  await expect(audienceViewport).toHaveAttribute("data-page-type", "scroll");
  await expect(audienceViewport).toHaveAttribute("data-viewport-mode", "fill");
  await expect(audienceViewport).toHaveCSS("overflow-y", "auto");
  let previewPage = page.locator(".viewer-preview-page");
  let previewBox = await previewPage.boundingBox();
  expect(previewBox?.height).toBeCloseTo(900, 0);
  expect(previewBox?.width ?? 0).toBeGreaterThan(1440);

  await page.getByRole("button", { name: "Close preview" }).click();
  await pageType.getByRole("button", { name: /Screen/ }).click();
  await viewportOptions.getByRole("button", { name: "Fit" }).click();
  await page.getByRole("button", { name: "Preview" }).click();

  audienceViewport = page.locator(".viewer-preview-viewport");
  await expect(audienceViewport).toHaveCSS("overflow-y", "hidden");
  previewPage = page.locator(".viewer-preview-page");
  previewBox = await previewPage.boundingBox();
  expect(previewBox?.width).toBeCloseTo(1440, 0);
  expect(previewBox?.height ?? 0).toBeLessThan(900);

  await page.getByRole("button", { name: "Close preview" }).click();
  await viewportOptions.getByRole("button", { name: "Stretch" }).click();
  await page.getByRole("button", { name: "Preview" }).click();
  previewBox = await page.locator(".viewer-preview-page").boundingBox();
  expect(previewBox?.width).toBeCloseTo(1440, 0);
  expect(previewBox?.height).toBeCloseTo(900, 0);
});

test("matches the Figma design-panel geometry for shape and text layers", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Properties panel is desktop-only",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await waitForEditor(page);

  const artboard = page.getByLabel("Artboard");
  const artboardBox = await artboard.boundingBox();
  if (!artboardBox) throw new Error("Artboard bounds are unavailable");

  await page.locator('.tool-button[data-tool="rectangle"]').click();
  await page
    .getByRole("toolbar", { name: "Shape picker" })
    .getByRole("button", { name: "Triangle", exact: true })
    .click();
  await page.mouse.move(artboardBox.x + 100, artboardBox.y + 100);
  await page.mouse.down();
  await page.mouse.move(artboardBox.x + 260, artboardBox.y + 220, {
    steps: 3,
  });
  await page.mouse.up();

  const designPanel = page.locator(".design-properties");
  const panelBox = await designPanel.boundingBox();
  if (!panelBox) throw new Error("Design panel bounds are unavailable");

  const propertiesBox = await page.locator(".properties-panel").boundingBox();
  const tabsBox = await page.locator(".panel-tabs").boundingBox();
  if (!propertiesBox || !tabsBox) {
    throw new Error("Properties panel chrome bounds are unavailable");
  }
  expect(propertiesBox).toMatchObject({
    height: 1014,
    width: 345,
    x: 1575,
    y: 66,
  });
  expect(tabsBox).toMatchObject({ height: 37, width: 334, x: 1578, y: 67 });
  expect(panelBox).toMatchObject({
    height: 976,
    width: 340,
    x: 1575,
    y: 104,
  });
  await expect(page.locator(".panel-tabs button").first()).toHaveCSS(
    "font-size",
    "9px",
  );
  expect(
    await designPanel.evaluate(
      (panel) => panel.scrollWidth <= panel.clientWidth,
    ),
  ).toBe(true);

  const expectBounds = async (
    locator: import("@playwright/test").Locator,
    expected: { height?: number; width?: number; x: number; y: number },
  ) => {
    const box = await locator.boundingBox();
    if (!box) throw new Error("Design control bounds are unavailable");
    expect(box.x - panelBox.x).toBeCloseTo(expected.x, 1);
    expect(box.y - panelBox.y).toBeCloseTo(expected.y, 1);
    if (expected.width !== undefined) {
      expect(box.width).toBeCloseTo(expected.width, 1);
    }
    if (expected.height !== undefined) {
      expect(box.height).toBeCloseTo(expected.height, 1);
    }
  };

  const sections = designPanel.locator(".property-section");
  await expectBounds(sections.nth(0), { height: 179, width: 340, x: 0, y: 0 });
  await expectBounds(sections.nth(1), {
    height: 108,
    width: 340,
    x: 0,
    y: 179,
  });
  await expectBounds(sections.nth(2), { height: 66, width: 340, x: 0, y: 287 });
  await expectBounds(sections.nth(3), {
    height: 213,
    width: 340,
    x: 0,
    y: 353,
  });
  await expect(sections.nth(1)).toHaveCSS(
    "border-bottom-color",
    "rgba(0, 0, 0, 0)",
  );

  await expectBounds(
    designPanel.locator(".transform-grid .number-field").first(),
    {
      height: 22,
      width: 126,
      x: 43,
      y: 22,
    },
  );
  await expectBounds(designPanel.locator(".origin-grid"), {
    height: 69,
    width: 69,
    x: 67,
    y: 93,
  });
  await expectBounds(designPanel.locator(".pathfinder-controls"), {
    height: 17,
    width: 262,
    x: 39,
    y: 319,
  });
  await expectBounds(designPanel.locator(".design-range").first(), {
    height: 7,
    width: 164,
    x: 77,
    y: 395,
  });
  await expectBounds(designPanel.locator(".design-range-fill").first(), {
    height: 1,
    width: 157,
    x: 77,
    y: 399,
  });
  await expectBounds(designPanel.locator(".design-range-thumb").first(), {
    height: 7,
    width: 7,
    x: 234,
    y: 395,
  });
  await expectBounds(designPanel.locator(".corner-radius-slider"), {
    height: 7,
    width: 102,
    x: 135,
    y: 484,
  });
  await expectBounds(
    designPanel.locator(".corner-radius-slider .design-range-thumb"),
    { height: 7, width: 7, x: 135, y: 484 },
  );
  await expectBounds(designPanel.locator(".points-row"), {
    height: 22,
    x: 18,
    y: 533,
  });

  await page.keyboard.press("Delete");
  await page.locator('.tool-button[data-tool="text"]').click();
  await page.mouse.click(artboardBox.x + 180, artboardBox.y + 160);

  const textSection = designPanel.locator(".text-properties");
  await expect(
    textSection.getByRole("heading", { name: "TEXT", exact: true }),
  ).toBeVisible();
  await expectBounds(textSection, { height: 143, width: 340, x: 0, y: 353 });
  await expect(textSection).toHaveCSS("border-bottom-width", "0px");
  await expectBounds(textSection.locator(".text-font-select"), {
    height: 22,
    width: 136,
    x: 64,
    y: 387,
  });
  await expectBounds(textSection.locator(".text-alignment-row > div"), {
    height: 10,
    width: 93,
    x: 74,
    y: 451,
  });
  await expectBounds(textSection.locator(".text-spacing-row"), {
    height: 22,
    x: 18,
    y: 474,
  });
});

test("shows uploaded images in the navigator", async ({ page }) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Navigator is desktop-only",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await waitForEditor(page);

  await page
    .locator(".asset-upload input")
    .setInputFiles("public/figma/shape-picker.svg");
  await page.getByRole("button", { name: "Add uploaded asset 1" }).click({
    force: true,
  });

  await page
    .getByLabel("Exhibition canvas")
    .dispatchEvent("wheel", { ctrlKey: true, deltaY: -100, deltaX: 0 });

  const navigator = page.getByLabel("Navigator");
  await expect(navigator).toHaveClass(/is-visible/);
  const navigatorElement = navigator.locator(".navigator-element").first();
  const navigatorSource = navigatorElement.locator(".image-shape-source");
  await expect(navigatorSource).toBeVisible();
  await expect(navigatorSource).toHaveCSS("background-image", /url\(/);

  const elementBox = await navigatorElement.boundingBox();
  const sourceBox = await navigatorSource.boundingBox();
  if (!elementBox || !sourceBox) {
    throw new Error("Navigator image bounds are unavailable");
  }
  expect(sourceBox.width).toBeCloseTo(elementBox.width, 1);
  expect(sourceBox.height).toBeCloseTo(elementBox.height, 1);
});

test("toggles canvas rulers and guides with Shift+R", async ({ page }) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Rulers are desktop-only",
  );
  await waitForEditor(page);

  const overlay = page.locator(".ruler-overlay");
  await expect(overlay).toHaveClass(/is-hidden/);

  await page.keyboard.press("Shift+r");
  await expect(overlay).not.toHaveClass(/is-hidden/);
  await expect(page.getByLabel("Horizontal ruler")).toBeVisible();
  await expect(page.getByLabel("Vertical ruler")).toBeVisible();
  await expect(page.getByLabel("Horizontal ruler")).toHaveCSS(
    "cursor",
    "ns-resize",
  );
  await expect(page.getByLabel("Vertical ruler")).toHaveCSS(
    "cursor",
    "ew-resize",
  );

  const rulerHasMarks = await page
    .getByLabel("Horizontal ruler")
    .evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const context = canvas.getContext("2d");
      if (!context) return false;
      const pixels = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;
      return Array.from(pixels).some(
        (value, index) => index % 4 < 3 && value < 200,
      );
    });
  expect(rulerHasMarks).toBe(true);

  const canvas = page.getByLabel("Exhibition canvas");
  const canvasBox = await canvas.boundingBox();
  const horizontalRulerBox = await page
    .getByLabel("Horizontal ruler")
    .boundingBox();
  const verticalRulerBox = await page
    .getByLabel("Vertical ruler")
    .boundingBox();
  if (!canvasBox || !horizontalRulerBox || !verticalRulerBox) {
    throw new Error("Ruler bounds are unavailable");
  }

  await page.mouse.move(horizontalRulerBox.x + 100, horizontalRulerBox.y + 12);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + 500, canvasBox.y + 220, { steps: 4 });
  await page.mouse.up();

  await page.mouse.move(verticalRulerBox.x + 12, verticalRulerBox.y + 100);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + 520, canvasBox.y + 260, { steps: 4 });
  await page.mouse.up();
  await expect(page.locator(".editor-guide")).toHaveCount(2);

  const guideBox = await page.locator(".editor-guide").first().boundingBox();
  if (!guideBox) throw new Error("Guide bounds are unavailable");
  await page.mouse.click(canvasBox.x + 300, guideBox.y + guideBox.height / 2);
  await expect(page.locator(".editor-guide").first()).toHaveClass(
    /is-selected/,
  );
  await page.keyboard.press("Control+c");
  await page.keyboard.press("Control+v");
  await expect(page.locator(".editor-guide")).toHaveCount(3);
  await page.keyboard.press("Delete");
  await expect(page.locator(".editor-guide")).toHaveCount(2);

  await page.keyboard.press("Shift+r");
  await expect(overlay).toHaveClass(/is-hidden/);
  await expect(page.locator(".editor-guide")).toHaveCount(0);
});

test("snaps a moving guide to a shape edge and shows its board distance", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Guide snapping is desktop-only",
  );
  await waitForEditor(page);

  const artboard = page.getByLabel("Artboard");
  const board = await artboard.boundingBox();
  if (!board) throw new Error("Artboard bounds are unavailable");

  await page.locator('.tool-button[data-tool="rectangle"]').click();
  await page.mouse.move(board.x + 150, board.y + 160);
  await page.mouse.down();
  await page.mouse.move(board.x + 300, board.y + 260);
  await page.mouse.up();
  await page.getByRole("button", { name: "Selection", exact: true }).click();
  await page.keyboard.press("Shift+r");

  const horizontalRuler = await page
    .getByLabel("Horizontal ruler")
    .boundingBox();
  const rectangle = page.getByLabel("Rectangle 1", { exact: true });
  const rectangleBox = await rectangle.boundingBox();
  if (!horizontalRuler || !rectangleBox) {
    throw new Error("Guide snapping bounds are unavailable");
  }

  await page.mouse.move(horizontalRuler.x + 100, horizontalRuler.y + 12);
  await page.mouse.down();
  await page.mouse.move(rectangleBox.x + 20, rectangleBox.y + 5);
  await page.mouse.up();

  const guide = page.locator(".editor-guide");
  const guideBox = await guide.boundingBox();
  if (!guideBox) throw new Error("Guide bounds are unavailable");
  await page.mouse.move(board.x + 100, guideBox.y + guideBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    rectangleBox.x + 20,
    rectangleBox.y + rectangleBox.height - 5,
  );

  await expect(page.locator(".distance-measurement")).toHaveCount(2);
  await expect(page.locator(".distance-label")).toHaveText([
    /\d+ px/,
    /\d+ px/,
  ]);
  await page.mouse.up();

  const [guidePosition, rectangleBottom] = await Promise.all([
    guide.evaluate((element) => Number.parseFloat(element.style.top)),
    rectangle.evaluate(
      (element) =>
        Number.parseFloat(element.style.top) +
        Number.parseFloat(element.style.height),
    ),
  ]);
  expect(guidePosition).toBeCloseTo(rectangleBottom, 5);
  await expect(page.locator(".distance-measurement")).toHaveCount(0);
});

test("shows Alt distance from a selected layer to a guide", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Guide measurements are desktop-only",
  );
  await waitForEditor(page);

  const artboard = page.getByLabel("Artboard");
  const board = await artboard.boundingBox();
  if (!board) throw new Error("Artboard bounds are unavailable");

  await page.locator('.tool-button[data-tool="rectangle"]').click();
  await page.mouse.move(board.x + 180, board.y + 280);
  await page.mouse.down();
  await page.mouse.move(board.x + 280, board.y + 340, { steps: 2 });
  await page.mouse.up();

  await page.getByRole("button", { name: "Selection", exact: true }).click();
  await page.keyboard.press("Shift+r");

  const horizontalRuler = await page
    .getByLabel("Horizontal ruler")
    .boundingBox();
  if (!horizontalRuler)
    throw new Error("Horizontal ruler bounds are unavailable");
  await page.mouse.move(horizontalRuler.x + 100, horizontalRuler.y + 12);
  await page.mouse.down();
  await page.mouse.move(board.x + 240, board.y + 140, { steps: 4 });
  await page.mouse.up();

  const guide = page.locator(".editor-guide");
  await expect(guide).toHaveClass(/is-selected/);

  const rectangle = page.getByLabel("Rectangle 1", { exact: true });
  const rectangleBox = await rectangle.boundingBox();
  if (!rectangleBox) throw new Error("Rectangle bounds are unavailable");

  await page.keyboard.down("Alt");
  await page.mouse.move(rectangleBox.x + 40, rectangleBox.y + 30, { steps: 3 });
  await expect(page.locator(".distance-measurement")).toHaveCount(1);
  await expect(page.locator(".distance-label")).toHaveText(/\d+ px/);
  await page.keyboard.up("Alt");
  await expect(page.locator(".distance-measurement")).toHaveCount(0);

  await page.mouse.click(rectangleBox.x + 40, rectangleBox.y + 30);
  await page.keyboard.down("Alt");
  await page.mouse.move(board.x + 240, board.y + 140, { steps: 3 });
  await expect(page.locator(".distance-label")).toHaveText(/\d+ px/);
  await page.keyboard.up("Alt");
  await expect(page.locator(".distance-measurement")).toHaveCount(0);
});

test("deletes the active page while preserving the final page", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Scene controls are desktop-only",
  );
  await waitForEditor(page);

  await page.getByRole("button", { name: "Add scene" }).click();
  await expect(page.locator(".scene-item")).toHaveCount(2);
  await page.keyboard.press("Delete");
  await expect(page.locator(".scene-item")).toHaveCount(1);

  await page.keyboard.press("Delete");
  await expect(page.locator(".scene-item")).toHaveCount(1);
});

test("renames scenes and layers with a double click", async ({ page }) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Project panel is desktop-only",
  );
  await waitForEditor(page);

  await page.getByText("Intro", { exact: true }).dblclick();
  const sceneNameInput = page.getByRole("textbox", { name: "Rename Intro" });
  await sceneNameInput.fill("Opening");
  await sceneNameInput.press("Enter");
  await expect(page.getByText("Opening", { exact: true })).toBeVisible();

  const artboard = page.getByLabel("Artboard");
  const box = await artboard.boundingBox();
  if (!box) throw new Error("Artboard bounds are unavailable");
  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await page.mouse.move(box.x + 120, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 240, box.y + 200);
  await page.mouse.up();

  await page
    .getByLabel("Layers")
    .getByText("Rectangle 1", { exact: true })
    .dblclick();
  const layerNameInput = page.getByRole("textbox", {
    name: "Rename Rectangle 1",
  });
  await layerNameInput.fill("Frame");
  await layerNameInput.press("Enter");
  await expect(
    page.getByLabel("Layers").getByText("Frame", { exact: true }),
  ).toBeVisible();
});

test("keeps the scene rail centered and connected across long lists", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Project panel is desktop-only",
  );
  await waitForEditor(page);

  for (let index = 0; index < 7; index += 1) {
    await page.getByRole("button", { name: "Add scene" }).click();
  }

  const geometry = await page.evaluate(() => {
    const list = document.querySelector<HTMLElement>(".scene-list");
    const content = document.querySelector<HTMLElement>(".scene-list-content");
    const rail = document.querySelector<HTMLElement>(".scene-rail");
    const firstItem = document.querySelector<HTMLElement>(".scene-item");
    const lastItem = document
      .querySelectorAll<HTMLElement>(".scene-item")
      .item(7);
    const lastNode = lastItem?.querySelector<HTMLElement>(".scene-node");
    const railBounds = rail?.getBoundingClientRect();
    const firstBounds = firstItem?.getBoundingClientRect();
    const lastNodeBounds = lastNode?.getBoundingClientRect();
    return {
      firstTop: firstBounds?.top ?? 0,
      lastItemBottom: lastItem?.getBoundingClientRect().bottom ?? 0,
      lastNodeCenter:
        (lastNodeBounds?.top ?? 0) + (lastNodeBounds?.height ?? 0) / 2,
      railBottom: railBounds?.bottom ?? 0,
      railTop: railBounds?.top ?? 0,
      listClientHeight: list?.clientHeight ?? 0,
      listScrollHeight: list?.scrollHeight ?? 0,
      contentScrollHeight: content?.scrollHeight ?? 0,
    };
  });

  expect(geometry.listScrollHeight).toBeGreaterThan(geometry.listClientHeight);
  expect(geometry.contentScrollHeight).toBeGreaterThan(
    geometry.listClientHeight,
  );
  expect(geometry.railTop).toBeCloseTo(geometry.firstTop - 4, 0);
  expect(geometry.railBottom).toBeCloseTo(geometry.lastItemBottom - 8, 0);
});

test("Space temporarily activates Hand and restores the previous tool", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Toolbar interaction is desktop-only",
  );
  await waitForEditor(page);

  const tools = page.getByLabel("Creation tools");
  const rectangleTool = tools.locator(
    "button.tool-button[aria-label='Rectangle']",
  );
  const indicatorMarginError = async (toolId: string) =>
    page.evaluate((id) => {
      const indicator = document.querySelector<HTMLElement>(
        ".tool-active-indicator",
      );
      const tool = document.querySelector<HTMLElement>(
        `.tool-button[data-tool="${id}"]`,
      );
      if (!indicator || !tool) return 100;
      const content = Array.from(
        tool.querySelectorAll<HTMLElement>(
          ":scope > svg, :scope > img, :scope > span",
        ),
      ).map((element) => element.getBoundingClientRect());
      const indicatorBox = indicator.getBoundingClientRect();
      const top = Math.min(...content.map((bounds) => bounds.top));
      const bottom = Math.max(...content.map((bounds) => bounds.bottom));
      return Math.max(
        Math.abs(top - indicatorBox.top - 12),
        Math.abs(indicatorBox.bottom - bottom - 11.5),
      );
    }, toolId);
  const toolHeights = await tools
    .locator(".tool-button")
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getBoundingClientRect().height),
    );
  expect(new Set(toolHeights)).toEqual(new Set([55]));
  await rectangleTool.click();
  await expect(rectangleTool).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => indicatorMarginError("rectangle")).toBeLessThan(0.2);

  await page.keyboard.down("Space");
  await expect(rectangleTool).not.toBeFocused();
  const handTool = page.getByRole("button", { name: "Hand", exact: true });
  await expect(handTool).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => indicatorMarginError("hand")).toBeLessThan(0.2);
  await page.keyboard.up("Space");

  await expect(rectangleTool).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => indicatorMarginError("rectangle")).toBeLessThan(0.2);

  const artboard = page.getByLabel("Artboard");
  const beforePan = await artboard.boundingBox();
  if (!beforePan) throw new Error("Artboard bounds are unavailable");
  await page.keyboard.down("Space");
  await page.mouse.move(beforePan.x + 300, beforePan.y + 200);
  await page.mouse.down();
  await page.mouse.move(beforePan.x + 360, beforePan.y + 240, { steps: 3 });
  await page.mouse.up();
  await page.keyboard.up("Space");

  await expect(page.getByLabel("Layers").getByRole("option")).toHaveCount(0);
  const afterPan = await artboard.boundingBox();
  expect(afterPan?.x).toBeGreaterThan(beforePan.x + 40);
  expect(afterPan?.y).toBeGreaterThan(beforePan.y + 20);
});

test("uploaded images use an image icon in the layer list", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Asset panel is desktop-only",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await waitForEditor(page);

  await page
    .locator(".asset-upload input")
    .setInputFiles("public/figma/shape-picker.svg");
  const asset = page.getByRole("button", { name: "Add uploaded asset 1" });
  await expect(asset).toBeVisible();
  const assetBox = await asset.boundingBox();
  if (!assetBox) throw new Error("Uploaded asset bounds are unavailable");
  await asset.click({ force: true });
  await page.waitForTimeout(250);

  await expect(page.getByLabel("Layers").getByText("Image 1")).toBeVisible();
  await expect(
    page.locator(".layer-symbol.symbol-image .layer-image-preview"),
  ).toBeVisible();

  const image = page.getByLabel("Image 1", { exact: true });
  const imageBox = await image.boundingBox();
  if (!imageBox) throw new Error("Uploaded image bounds are unavailable");
  expect(imageBox.width / imageBox.height).toBeCloseTo(48 / 219.2, 2);
});

test("previews uploaded image corner resizing before pointer release", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Image resizing is desktop-only",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await waitForEditor(page);

  await page
    .locator(".asset-upload input")
    .setInputFiles("public/figma/shape-picker.svg");
  await page.getByRole("button", { name: "Add uploaded asset 1" }).click({
    force: true,
  });

  const image = page.getByLabel("Image 1", { exact: true });
  await expect(image.locator(".image-shape")).toHaveCSS("box-shadow", /inset/);
  const imageContent = image.locator(".image-shape-content");
  const imageSource = image.locator(".image-shape-source");
  await expect(imageSource).toHaveCSS("background-size", "100% 100%");
  const cornerHandle = image.locator(".resize-handle.handle-se");
  const expectImageOutlineAligned = async () => {
    const alignment = await image.evaluate((node) => {
      const frame = node.getBoundingClientRect();
      const svg = node.querySelector<SVGSVGElement>(".selection-outline-svg")!;
      const rect = svg.querySelector<SVGRectElement>(
        "rect[data-selection-frame]",
      )!;
      const svgBounds = svg.getBoundingClientRect();
      const viewBox = svg.viewBox.baseVal;
      const scaleX = svgBounds.width / viewBox.width;
      const scaleY = svgBounds.height / viewBox.height;
      const strokeWidth = Number(rect.getAttribute("stroke-width"));
      const x = Number(rect.getAttribute("x"));
      const y = Number(rect.getAttribute("y"));
      const width = Number(rect.getAttribute("width"));
      const height = Number(rect.getAttribute("height"));
      return {
        bottom:
          svgBounds.top + (y + height + strokeWidth / 2 - viewBox.y) * scaleY,
        frameBottom: frame.bottom,
        frameLeft: frame.left,
        frameRight: frame.right,
        frameTop: frame.top,
        left: svgBounds.left + (x - strokeWidth / 2 - viewBox.x) * scaleX,
        placement: svg.dataset.selectionStrokePlacement,
        right:
          svgBounds.left + (x + width + strokeWidth / 2 - viewBox.x) * scaleX,
        top: svgBounds.top + (y - strokeWidth / 2 - viewBox.y) * scaleY,
      };
    });
    expect(alignment.placement).toBe("inside");
    expect(alignment.left).toBeCloseTo(alignment.frameLeft, 1);
    expect(alignment.top).toBeCloseTo(alignment.frameTop, 1);
    expect(alignment.right).toBeCloseTo(alignment.frameRight, 1);
    expect(alignment.bottom).toBeCloseTo(alignment.frameBottom, 1);
  };
  const [beforeFrame, beforeContent, beforeSource, cornerHandleBox] =
    await Promise.all([
      image.boundingBox(),
      imageContent.boundingBox(),
      imageSource.boundingBox(),
      cornerHandle.boundingBox(),
    ]);
  if (!beforeFrame || !beforeContent || !beforeSource || !cornerHandleBox) {
    throw new Error("Image corner resize bounds are unavailable");
  }

  await page.mouse.move(
    cornerHandleBox.x + cornerHandleBox.width / 2,
    cornerHandleBox.y + cornerHandleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    cornerHandleBox.x + cornerHandleBox.width / 2 - 13.25,
    cornerHandleBox.y + cornerHandleBox.height / 2 - 22.75,
  );

  await expect
    .poll(async () => (await image.boundingBox())?.width ?? 0)
    .toBeLessThan(beforeFrame.width - 5);
  const [duringContent, duringSource] = await Promise.all([
    imageContent.boundingBox(),
    imageSource.boundingBox(),
  ]);
  if (!duringContent || !duringSource) {
    throw new Error("Live image pixel bounds are unavailable");
  }
  expect(duringContent.width).toBeLessThan(beforeContent.width - 5);
  expect(duringSource.width).toBeLessThan(beforeSource.width - 5);
  await expectImageOutlineAligned();
  await page.mouse.up();
  await expectImageOutlineAligned();
});

test("crops uploaded images with edge handles", async ({ page }) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Image cropping is desktop-only",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await waitForEditor(page);

  await page
    .locator(".asset-upload input")
    .setInputFiles("public/figma/shape-picker.svg");
  await page.getByRole("button", { name: "Add uploaded asset 1" }).click({
    force: true,
  });

  const image = page.getByLabel("Image 1", { exact: true });
  const imageShape = image.locator(".image-shape");
  const imageContent = image.locator(".image-shape-content");
  await expect(image).toBeVisible();
  await expect(image.locator(".image-edge-handle")).toHaveCount(4);
  await expect(imageShape).toHaveCSS("overflow", "hidden");

  const before = await image.boundingBox();
  const contentBefore = await imageContent.boundingBox();
  const rightHandle = image.locator(".image-edge-handle-e");
  const rightHandleBox = await rightHandle.boundingBox();
  if (!before || !contentBefore || !rightHandleBox) {
    throw new Error("Image crop bounds are unavailable");
  }

  await page.mouse.move(
    rightHandleBox.x + rightHandleBox.width / 2,
    rightHandleBox.y + rightHandleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    rightHandleBox.x + rightHandleBox.width / 2 - 45,
    rightHandleBox.y + rightHandleBox.height / 2,
    { steps: 4 },
  );
  await page.mouse.up();

  const afterRight = await image.boundingBox();
  const contentAfterRight = await imageContent.boundingBox();
  if (!afterRight || !contentAfterRight) {
    throw new Error("Cropped image bounds are unavailable");
  }
  expect(afterRight.width).toBeLessThan(before.width - 10);
  expect(afterRight.height).toBeCloseTo(before.height, 1);
  expect(contentAfterRight.width).toBeCloseTo(contentBefore.width, 1);
  expect(rightHandleBox.height).toBeGreaterThan(rightHandleBox.width);
  expect(
    Math.abs(
      rightHandleBox.x + rightHandleBox.width / 2 - (before.x + before.width),
    ),
  ).toBeCloseTo(0, 0);
  expect(
    Math.abs(
      rightHandleBox.y +
        rightHandleBox.height / 2 -
        (before.y + before.height / 2),
    ),
  ).toBeLessThan(1);

  const baseContentHeight = await imageContent.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  const bottomHandle = image.locator(".image-edge-handle-s");
  const bottomHandleBox = await bottomHandle.boundingBox();
  if (!bottomHandleBox)
    throw new Error("Image bottom crop handle is unavailable");
  await page.mouse.move(
    bottomHandleBox.x + bottomHandleBox.width / 2,
    bottomHandleBox.y + bottomHandleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bottomHandleBox.x + bottomHandleBox.width / 2,
    bottomHandleBox.y + bottomHandleBox.height / 2 - 30,
    { steps: 4 },
  );
  await page.mouse.up();

  const afterBottomCrop = await image.boundingBox();
  if (!afterBottomCrop) {
    throw new Error("Bottom-cropped image bounds are unavailable");
  }
  expect(afterBottomCrop.height).toBeLessThan(afterRight.height - 10);

  const expandedBottomHandle = image.locator(".image-edge-handle-s");
  const expandedBottomHandleBox = await expandedBottomHandle.boundingBox();
  if (!expandedBottomHandleBox) {
    throw new Error("Image bottom expansion handle is unavailable");
  }
  await page.mouse.move(
    expandedBottomHandleBox.x + expandedBottomHandleBox.width / 2,
    expandedBottomHandleBox.y + expandedBottomHandleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    expandedBottomHandleBox.x + expandedBottomHandleBox.width / 2,
    expandedBottomHandleBox.y + expandedBottomHandleBox.height / 2 + 80,
    { steps: 4 },
  );
  await page.mouse.up();

  const afterBottomExpansion = await image.boundingBox();
  const contentAfterBottomExpansion = await imageContent.boundingBox();
  if (!afterBottomExpansion || !contentAfterBottomExpansion) {
    throw new Error("Bottom-expanded image bounds are unavailable");
  }
  expect(afterBottomExpansion.height).toBeCloseTo(afterRight.height, 1);
  expect(contentAfterBottomExpansion.height).toBeCloseTo(baseContentHeight, 1);

  const beforeCorner = await image.boundingBox();
  const contentBeforeCorner = await imageContent.boundingBox();
  const cornerHandle = image.locator(".resize-handle.handle-se");
  const cornerHandleBox = await cornerHandle.boundingBox();
  if (!beforeCorner || !contentBeforeCorner || !cornerHandleBox) {
    throw new Error("Image corner resize bounds are unavailable");
  }
  await page.mouse.move(
    cornerHandleBox.x + cornerHandleBox.width / 2,
    cornerHandleBox.y + cornerHandleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    cornerHandleBox.x + cornerHandleBox.width / 2 + 35,
    cornerHandleBox.y + cornerHandleBox.height / 2 + 25,
    { steps: 4 },
  );
  await page.mouse.up();

  const afterCorner = await image.boundingBox();
  const contentAfterCorner = await imageContent.boundingBox();
  if (!afterCorner || !contentAfterCorner) {
    throw new Error("Resized image bounds are unavailable");
  }
  expect(afterCorner.width).toBeGreaterThan(beforeCorner.width + 10);
  expect(afterCorner.height).toBeGreaterThan(beforeCorner.height + 10);
  expect(contentAfterCorner.width).toBeGreaterThan(
    contentBeforeCorner.width + 10,
  );
  await expect(image.locator(".image-shape-source")).toHaveAttribute(
    "style",
    /transform: scale\(/,
  );
});

test("keeps a cropped image visible through Pathfinder boolean operations", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Image Pathfinder is desktop-only",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await waitForEditor(page);

  await page
    .locator(".asset-upload input")
    .setInputFiles("public/figma/shape-picker.svg");
  await page.getByRole("button", { name: "Add uploaded asset 1" }).click({
    force: true,
  });

  const image = page.getByLabel("Image 1", { exact: true });
  const cropHandle = image.locator(".image-edge-handle-e");
  const cropHandleBox = await cropHandle.boundingBox();
  if (!cropHandleBox) throw new Error("Image crop handle is unavailable");
  const cropX = cropHandleBox.x + cropHandleBox.width / 2;
  const cropY = cropHandleBox.y + cropHandleBox.height / 2;
  await page.mouse.move(cropX, cropY);
  await page.mouse.down();
  await page.mouse.move(cropX - 8, cropY, { steps: 3 });
  await page.mouse.up();

  const imageBox = await image.boundingBox();
  if (!imageBox) throw new Error("Cropped image bounds are unavailable");
  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await page.mouse.move(imageBox.x + imageBox.width / 2, imageBox.y + 25);
  await page.mouse.down();
  await page.mouse.move(imageBox.x + imageBox.width + 45, imageBox.y + 75, {
    steps: 3,
  });
  await page.mouse.up();

  const layers = page.getByLabel("Layers");
  await layers.getByRole("option", { name: "Image 1" }).click();
  await layers
    .getByRole("option", { name: "Rectangle 1" })
    .click({ modifiers: ["Shift"] });
  await page.getByRole("button", { name: "Union selection" }).click();

  const result = page.locator(".canvas-element.is-pathfinder");
  await expect(result).toBeVisible();
  await expect(
    result.locator('[data-pathfinder-image-viewport="true"]'),
  ).toBeVisible();
  await expect(result.locator("image")).toBeVisible();
  const renderedImage = await result.locator("image").boundingBox();
  expect(renderedImage?.width).toBeGreaterThan(0);
  expect(renderedImage?.height).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Undo" }).click();
  await page.getByRole("button", { name: "Exclude selection" }).click();
  const excluded = page.locator(".canvas-element.is-pathfinder");
  const excludedViewport = excluded.locator(
    '[data-pathfinder-image-viewport="true"]',
  );
  await expect(excludedViewport).toBeVisible();
  await expect(excluded.locator("image")).toBeVisible();
  const [viewportWidth, sourceWidth] = await Promise.all([
    excludedViewport.evaluate((element) =>
      Number.parseFloat(element.getAttribute("width") ?? "0"),
    ),
    excluded
      .locator("mask rect")
      .last()
      .evaluate((element) =>
        Number.parseFloat(element.getAttribute("width") ?? "0"),
      ),
  ]);
  expect(sourceWidth - viewportWidth).toBeCloseTo(0.2, 3);
});

test("draws a line along the drag direction and shows it in the scene preview", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Canvas controls are desktop-only",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await waitForEditor(page);

  const artboard = page.getByLabel("Artboard");
  const box = await artboard.boundingBox();
  if (!box) throw new Error("Artboard bounds are unavailable");

  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await page
    .getByRole("toolbar", { name: "Shape picker" })
    .getByRole("button", { name: "Line" })
    .click();
  await page.mouse.move(box.x + 180, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(box.x + 460, box.y + 360, { steps: 5 });
  await page.mouse.up();

  const line = page.getByLabel("Line 1", { exact: true });
  await expect(line).toBeVisible();
  await expect(line).toHaveClass(/element-line/);
  await expect(line.locator("line")).toHaveCSS("stroke", "rgb(171, 81, 240)");
  await expect(line.locator(".selection-outline-svg")).toHaveCount(0);
  await expect(page.getByLabel("Selection dimensions")).toHaveText(
    /W \d+ x H 1/,
  );
  await expect(line).not.toHaveAttribute("style", /rotate\(0deg\)/);
  await expect(line.locator("line")).toHaveAttribute("y1", "12");
  await expect(line.locator("line")).toHaveAttribute("y2", "12");
  await expect(line.locator("line")).toHaveAttribute("x1", "0");
  await expect(line.locator("line")).toHaveAttribute("x2", "100");
  await expect(line.locator("line")).toHaveAttribute("stroke", "#000000");
  await expect(line.locator("line")).toHaveAttribute("stroke-width", "1");
  await expect(
    page.locator(".scene-preview-element.preview-line"),
  ).toBeVisible();

  const endHandle = page.getByRole("button", { name: "Adjust Line 1 end" });
  const startHandle = page.getByRole("button", { name: "Adjust Line 1 start" });
  const expectLineEndpointsAligned = async () => {
    for (const handle of [startHandle, endHandle]) {
      const visualSize = await handle.evaluate((element) => {
        const style = getComputedStyle(element);
        const transform = new DOMMatrix(style.transform);
        const artboard = element.closest<HTMLElement>("#editor-artboard");
        const artboardScale = Number.parseFloat(
          getComputedStyle(artboard!).getPropertyValue("--artboard-scale"),
        );
        const controlScale = Math.hypot(transform.a, transform.b);
        return {
          height:
            Number.parseFloat(style.height) * controlScale * artboardScale,
          width: Number.parseFloat(style.width) * controlScale * artboardScale,
        };
      });
      expect(visualSize.width).toBeCloseTo(9, 1);
      expect(visualSize.height).toBeCloseTo(9, 1);
      await expect(handle).toHaveCSS("border-top-width", "0px");
    }
    const endpointAlignment = await line.evaluate((element) => {
      const segment = element.querySelector("line");
      const start = element.querySelector<HTMLElement>(".endpoint-start");
      const end = element.querySelector<HTMLElement>(".endpoint-end");
      const matrix = segment?.getScreenCTM();
      if (!segment || !start || !end || !matrix) return null;
      const startTarget = new DOMPoint(
        Number(segment.getAttribute("x1")),
        Number(segment.getAttribute("y1")),
      ).matrixTransform(matrix);
      const endTarget = new DOMPoint(
        Number(segment.getAttribute("x2")),
        Number(segment.getAttribute("y2")),
      ).matrixTransform(matrix);
      const startBounds = start.getBoundingClientRect();
      const endBounds = end.getBoundingClientRect();
      return {
        end: {
          x: endBounds.x + endBounds.width / 2,
          y: endBounds.y + endBounds.height / 2,
        },
        endTarget: { x: endTarget.x, y: endTarget.y },
        start: {
          x: startBounds.x + startBounds.width / 2,
          y: startBounds.y + startBounds.height / 2,
        },
        startTarget: { x: startTarget.x, y: startTarget.y },
      };
    });
    if (!endpointAlignment) {
      throw new Error("Line endpoint alignment is unavailable");
    }
    expect(endpointAlignment.start.x).toBeCloseTo(
      endpointAlignment.startTarget.x,
      0,
    );
    expect(endpointAlignment.start.y).toBeCloseTo(
      endpointAlignment.startTarget.y,
      0,
    );
    expect(endpointAlignment.end.x).toBeCloseTo(
      endpointAlignment.endTarget.x,
      0,
    );
    expect(endpointAlignment.end.y).toBeCloseTo(
      endpointAlignment.endTarget.y,
      0,
    );
  };
  await expectLineEndpointsAligned();

  await page.locator(".zoom-menu").click();
  await page.getByRole("menuitem", { name: /Actual Size/ }).click();
  const zoomAnchorBox = await endHandle.boundingBox();
  if (!zoomAnchorBox) throw new Error("Line end handle bounds are unavailable");
  const canvas = page.getByLabel("Exhibition canvas");
  for (let step = 0; step < 40; step += 1) {
    await canvas.dispatchEvent("wheel", {
      clientX: zoomAnchorBox.x + zoomAnchorBox.width / 2,
      clientY: zoomAnchorBox.y + zoomAnchorBox.height / 2,
      ctrlKey: true,
      deltaX: 0,
      deltaY: -100,
    });
  }
  await expect(page.getByRole("button", { name: "500 %" })).toBeVisible();
  await expectLineEndpointsAligned();
  await expect(endHandle).toBeVisible();
  const initialStyle = await line.getAttribute("style");
  const handleBox = await endHandle.boundingBox();
  if (!handleBox) throw new Error("Line endpoint bounds are unavailable");
  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handleBox.x + handleBox.width / 2 + 50,
    handleBox.y + handleBox.height / 2 - 70,
    { steps: 4 },
  );
  await page.mouse.up();
  expect(await line.getAttribute("style")).not.toBe(initialStyle);
});

test("snaps line drawing and endpoint edits to the nearest 45-degree angle", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Canvas controls are desktop-only",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await waitForEditor(page);

  const artboard = page.getByLabel("Artboard");
  const box = await artboard.boundingBox();
  if (!box) throw new Error("Artboard bounds are unavailable");

  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await page
    .getByRole("toolbar", { name: "Shape picker" })
    .getByRole("button", { name: "Line", exact: true })
    .click();

  const start = { x: box.x + 220, y: box.y + 220 };
  await page.mouse.move(start.x, start.y);
  await page.keyboard.down("Shift");
  await page.mouse.down();
  await page.mouse.move(start.x + 140, start.y + 40, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up("Shift");

  const line = page.getByLabel("Line 1", { exact: true });
  await expect(line).toHaveAttribute("style", /rotate\(0deg\)/);

  const endHandle = page.getByRole("button", { name: "Adjust Line 1 end" });
  const handleBox = await endHandle.boundingBox();
  if (!handleBox) throw new Error("Line endpoint bounds are unavailable");
  await page.keyboard.down("Control");
  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(start.x, start.y - 80, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up("Control");

  await expect(line).toHaveAttribute("style", /rotate\(-90deg\)/);
});

test("uses the matching symbol for every provided shape in layers", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Layer panel is desktop-only",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await waitForEditor(page);

  const artboard = page.getByLabel("Artboard");
  const box = await artboard.boundingBox();
  if (!box) throw new Error("Artboard bounds are unavailable");

  const shapes = ["Rectangle", "Circle", "Triangle", "Star", "Line"];
  for (const [index, shape] of shapes.entries()) {
    await page
      .getByLabel("Creation tools")
      .locator('button.tool-button[data-tool="rectangle"]')
      .click();
    await page
      .getByRole("toolbar", { name: "Shape picker" })
      .getByRole("button", { name: shape, exact: true })
      .click();

    const x = box.x + 100 + (index % 3) * 180;
    const y = box.y + 100 + Math.floor(index / 3) * 150;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 80, y + 60, { steps: 3 });
    await page.mouse.up();
  }

  for (const shape of shapes) {
    const symbol = page.locator(`.layer-symbol.symbol-${shape.toLowerCase()}`);
    await expect(symbol).toBeVisible();
    if (["Triangle", "Star", "Line"].includes(shape)) {
      await expect(symbol.locator("svg")).toBeVisible();
    }
  }
});
