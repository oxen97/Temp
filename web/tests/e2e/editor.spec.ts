import { expect, test } from "@playwright/test";

async function waitForEditor(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByLabel("Exhibition canvas").waitFor();
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
  if (!before) throw new Error("Artboard bounds are unavailable");

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

  await expect(page.getByLabel("Circle 1", { exact: true })).toBeVisible();
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

  const previewBox = await preview.boundingBox();
  const polygonBox = await preview.locator("polygon").boundingBox();
  if (!previewBox || !polygonBox) {
    throw new Error("Shape preview bounds are unavailable");
  }
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

test("draws a shape on the canvas outside the artboard", async ({ page }) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Canvas drawing is desktop-only",
  );
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

  await expect(page.getByLabel("Rectangle 1", { exact: true })).toBeVisible();
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

  await page.getByRole("button", { name: "Zoom", exact: true }).click();
  await page.mouse.click(box.x + 300, box.y + 250);
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
  await page.mouse.move(first.x + 50, first.y + 30, { steps: 3 });
  await page.mouse.down();
  await expect(stableDistanceMeasurements).toHaveCount(0);
  await page.mouse.move(first.x + 80, first.y + 50, { steps: 3 });
  await expect(stableDistanceMeasurements).toHaveCount(0);
  await page.mouse.up();
  await page.keyboard.up("Alt");
  await expect(page.locator(".distance-measurement")).toHaveCount(0);
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
  const zoomButton = page.getByRole("button", { name: "Zoom", exact: true });
  await zoomButton.click();

  const artboard = page.getByLabel("Artboard");
  const box = await artboard.boundingBox();
  if (!box) throw new Error("Artboard bounds are unavailable");

  await page.mouse.click(box.x + 240, box.y + 200);
  await expect(page.getByRole("button", { name: "110 %" })).toBeVisible();

  await page.mouse.click(box.x + 240, box.y + 200, { button: "right" });
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
  await expect(propertyTabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(propertyTabs.nth(2)).toHaveAttribute("aria-selected", "false");

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
  await rectangleTool.click();
  await expect(rectangleTool).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.down("Space");
  await expect(rectangleTool).not.toBeFocused();
  await expect(
    page.getByRole("button", { name: "Hand", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.up("Space");

  await expect(rectangleTool).toHaveAttribute("aria-pressed", "true");

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
  ).toBeCloseTo(2.5, 0);
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
  expect(
    await line.evaluate(
      (element) => getComputedStyle(element, "::after").display,
    ),
  ).toBe("none");
  await expect(page.getByLabel("Selection dimensions")).toHaveText(
    /W \d+ x H 1/,
  );
  await expect(line).not.toHaveAttribute("style", /rotate\(0deg\)/);
  await expect(line.locator("line")).toHaveAttribute("y1", "12");
  await expect(line.locator("line")).toHaveAttribute("y2", "12");
  await expect(line.locator("line")).toHaveAttribute("stroke-width", "1");
  await expect(
    page.locator(".scene-preview-element.preview-line"),
  ).toBeVisible();

  const endHandle = page.getByRole("button", { name: "Adjust Line 1 end" });
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
