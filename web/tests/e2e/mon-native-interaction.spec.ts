import { expect, test, type Locator } from "@playwright/test";

type PathPoint = {
  artX: number;
  artY: number;
  screenX: number;
  screenY: number;
  scaleX: number;
  scaleY: number;
};

async function pathPoint(path: Locator, fraction = 1): Promise<PathPoint> {
  return path.evaluate((node, at) => {
    const svgPath = node as SVGPathElement;
    const page = svgPath.closest(".viewer-preview-page") as HTMLElement | null;
    const matrix = svgPath.getScreenCTM();
    if (!page || !matrix) throw new Error("Cannot map strand path to artboard");
    const pageRect = page.getBoundingClientRect();
    const scaleX = pageRect.width / page.clientWidth;
    const scaleY = pageRect.height / page.clientHeight;
    const local = svgPath.getPointAtLength(svgPath.getTotalLength() * at);
    const screen = local.matrixTransform(matrix);
    return {
      artX: (screen.x - pageRect.left) / scaleX,
      artY: (screen.y - pageRect.top) / scaleY,
      screenX: screen.x,
      screenY: screen.y,
      scaleX,
      scaleY,
    };
  }, fraction);
}

async function pathPointNearestY(path: Locator, targetArtY: number): Promise<PathPoint> {
  return path.evaluate((node, targetY) => {
    const svgPath = node as SVGPathElement;
    const page = svgPath.closest(".viewer-preview-page") as HTMLElement | null;
    const matrix = svgPath.getScreenCTM();
    if (!page || !matrix) throw new Error("Cannot map strand path to artboard");
    const pageRect = page.getBoundingClientRect();
    const scaleX = pageRect.width / page.clientWidth;
    const scaleY = pageRect.height / page.clientHeight;
    const total = svgPath.getTotalLength();
    let nearest: PathPoint | null = null;
    for (let index = 0; index <= 80; index += 1) {
      const screen = svgPath.getPointAtLength((total * index) / 80).matrixTransform(matrix);
      const candidate = {
        artX: (screen.x - pageRect.left) / scaleX,
        artY: (screen.y - pageRect.top) / scaleY,
        screenX: screen.x,
        screenY: screen.y,
        scaleX,
        scaleY,
      };
      if (!nearest || Math.abs(candidate.artY - targetY) < Math.abs(nearest.artY - targetY))
        nearest = candidate;
    }
    if (!nearest) throw new Error("Strand path has no points");
    return nearest;
  }, targetArtY);
}

test("grabbed strand follows upward and downward pointer movement in artboard space", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1000, "Desktop preview only");
  await page.goto("/?interactionDemo=mon-native");
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  await expect(preview).toBeVisible();
  const path = preview.locator('[data-element-id="mon-demo-strand-5"] .pen-visible-path');
  const baseline = await pathPoint(path);
  const grabX = baseline.screenX;
  const grabY = baseline.screenY - 5 * baseline.scaleY;
  await page.mouse.move(grabX, grabY);
  await page.mouse.down();

  for (const deltaY of [60, -60]) {
    await page.mouse.move(grabX, grabY + deltaY * baseline.scaleY, { steps: 8 });
    await expect
      .poll(async () => Math.abs((await pathPoint(path)).artY - baseline.artY - deltaY))
      .toBeLessThan(15);
  }
  await page.mouse.up();
});

test("dragging a strand from its middle carries the lower strand and keeps its top anchored", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1000, "Desktop preview only");
  await page.goto("/?interactionDemo=mon-native");
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  await expect(preview).toBeVisible();
  const path = preview.locator('[data-element-id="mon-demo-strand-5"] .pen-visible-path');
  const topBefore = await pathPoint(path, 0);
  const middleBefore = await pathPoint(path, 0.5);
  const lowerBefore = await pathPoint(path, 0.8);
  const tipBefore = await pathPoint(path, 1);
  const dragX = middleBefore.screenX + 100 * middleBefore.scaleX;
  const dragY = middleBefore.screenY + 65 * middleBefore.scaleY;

  await page.mouse.move(middleBefore.screenX, middleBefore.screenY);
  await page.mouse.down();
  await page.mouse.move(dragX, dragY, { steps: 12 });

  await expect.poll(async () => (await pathPoint(path, 0.8)).artX - lowerBefore.artX).toBeGreaterThan(50);
  await expect.poll(async () => (await pathPoint(path, 1)).artX - tipBefore.artX).toBeGreaterThan(65);
  await expect.poll(async () => (await pathPoint(path, 1)).artY - tipBefore.artY).toBeGreaterThan(35);
  await expect.poll(async () => Math.hypot(
    (await pathPoint(path, 0)).artX - topBefore.artX,
    (await pathPoint(path, 0)).artY - topBefore.artY,
  )).toBeLessThan(2);

  await page.mouse.up();
  await expect.poll(async () => Math.hypot(
    (await pathPoint(path, 0.5)).artX - middleBefore.artX,
    (await pathPoint(path, 0.5)).artY - middleBefore.artY,
  )).toBeLessThan(2);
  await expect.poll(async () => Math.hypot(
    (await pathPoint(path, 1)).artX - tipBefore.artX,
    (await pathPoint(path, 1)).artY - tipBefore.artY,
  )).toBeLessThan(2);
});

test("a neighboring strand follows through its lower tip instead of forming a middle spike", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1000, "Desktop preview only");
  await page.goto("/?interactionDemo=mon-native");
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  await expect(preview).toBeVisible();
  const source = preview.locator('[data-element-id="mon-demo-strand-5"] .pen-visible-path');
  const neighbor = preview.locator('[data-element-id="mon-demo-strand-6"] .pen-visible-path');
  const grab = await pathPoint(source, 0.5);
  const topBefore = await pathPoint(neighbor, 0);
  const middleBefore = await pathPoint(neighbor, 0.5);
  const lowerBefore = await pathPoint(neighbor, 0.8);
  const tipBefore = await pathPoint(neighbor, 1);

  await page.mouse.move(grab.screenX, grab.screenY);
  await page.mouse.down();
  await page.mouse.move(grab.screenX + 30 * grab.scaleX, grab.screenY, { steps: 12 });

  await expect.poll(async () => Math.abs(middleBefore.artX - (await pathPoint(neighbor, 0.5)).artX))
    .toBeGreaterThan(8);
  await expect.poll(async () => Math.abs(lowerBefore.artX - (await pathPoint(neighbor, 0.8)).artX))
    .toBeGreaterThan(8);
  await expect.poll(async () => Math.abs(tipBefore.artX - (await pathPoint(neighbor, 1)).artX))
    .toBeGreaterThan(8);
  await expect.poll(async () => {
    const middleMovement = Math.abs(middleBefore.artX - (await pathPoint(neighbor, 0.5)).artX);
    const tipMovement = Math.abs(tipBefore.artX - (await pathPoint(neighbor, 1)).artX);
    return tipMovement / Math.max(1, middleMovement);
  }).toBeGreaterThan(0.75);
  await expect.poll(async () => Math.hypot(
    (await pathPoint(neighbor, 0)).artX - topBefore.artX,
    (await pathPoint(neighbor, 0)).artY - topBefore.artY,
  )).toBeLessThan(2);

  const tipAtContact = await pathPoint(neighbor, 1);
  await page.mouse.move(grab.screenX + 55 * grab.scaleX, grab.screenY, { steps: 12 });
  await expect(preview.locator(".viewer-liquid-merge").first()).toBeVisible();
  await expect.poll(async () => Math.abs(tipAtContact.artX - (await pathPoint(neighbor, 1)).artX))
    .toBeGreaterThan(5);

  await page.mouse.up();
  await expect.poll(async () => Math.hypot(
    (await pathPoint(neighbor, 0.5)).artX - middleBefore.artX,
    (await pathPoint(neighbor, 0.5)).artY - middleBefore.artY,
  )).toBeLessThan(2);
  await expect.poll(async () => Math.hypot(
    (await pathPoint(neighbor, 1)).artX - tipBefore.artX,
    (await pathPoint(neighbor, 1)).artY - tipBefore.artY,
  )).toBeLessThan(2);
});

test("magnetic Liquid Merge visibly pulls its paired neighbor", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1000, "Desktop editor only");
  await page.goto("/?interactionDemo=mon-native");
  await page.getByRole("button", { name: "Close preview" }).click();
  await page.getByLabel("Layers").getByRole("option", { name: "MON strand 6" }).click();
  await page.getByRole("tab", { name: "INTERACTION" }).click();
  const panel = page.getByRole("tabpanel", { name: "Interaction settings" });
  await panel.getByText("Drag to bend strand").click();
  const neighborPull = panel.getByLabel("Strand neighbor pull");
  await neighborPull.focus();
  await neighborPull.press("Home");
  await expect(neighborPull).toHaveValue("0");

  await page.getByLabel("Layers").getByRole("option", { name: "MON strand 5" }).click();
  await panel.getByText("Merge with neighboring strand").click();
  const attraction = panel.getByLabel("Liquid attraction");
  await attraction.focus();
  await attraction.press("End");
  await expect(attraction).toHaveValue("100");

  await page.getByRole("button", { name: /Preview/ }).first().click();
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  await expect(preview).toBeVisible();
  const sourcePath = preview.locator('[data-element-id="mon-demo-strand-5"] .pen-visible-path');
  const neighborPath = preview.locator('[data-element-id="mon-demo-strand-6"] .pen-visible-path');
  const sourceTip = await pathPoint(sourcePath);
  const baselineNeighbor = await pathPointNearestY(neighborPath, sourceTip.artY);
  const grabY = sourceTip.screenY - 5 * sourceTip.scaleY;
  await page.mouse.move(sourceTip.screenX, grabY);
  await page.mouse.down();
  await page.mouse.move(sourceTip.screenX + 30 * sourceTip.scaleX, grabY, { steps: 10 });
  await expect(preview.locator(".viewer-liquid-merge").first()).toBeVisible();
  // At contact the paired strand keeps its original spacing on the source's
  // right, so it can initially travel right too. Pull back after latching to
  // prove that Liquid Merge, rather than neighbor pointer force, carries it.
  await page.mouse.move(sourceTip.screenX - 40 * sourceTip.scaleX, grabY, { steps: 16 });
  await expect
    .poll(async () => {
      const neighbor = await pathPointNearestY(neighborPath, sourceTip.artY);
      return baselineNeighbor.artX - neighbor.artX;
    })
    .toBeGreaterThan(12);
  await page.mouse.up();
});

test("joined strands stay latched and move together through a longer drag", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1000, "Desktop preview only");
  await page.goto("/?interactionDemo=mon-native");
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  await expect(preview).toBeVisible();
  const sourcePath = preview.locator('[data-element-id="mon-demo-strand-5"] .pen-visible-path');
  const neighborPath = preview.locator('[data-element-id="mon-demo-strand-6"] .pen-visible-path');
  const sourceTip = await pathPoint(sourcePath);
  const grabY = sourceTip.screenY - 5 * sourceTip.scaleY;
  await page.mouse.move(sourceTip.screenX, grabY);
  await page.mouse.down();
  await page.mouse.move(sourceTip.screenX + 30 * sourceTip.scaleX, grabY, { steps: 8 });
  await expect(preview.locator(".viewer-liquid-merge").first()).toBeVisible();
  const neighborAtJoin = await pathPointNearestY(neighborPath, sourceTip.artY);

  await page.mouse.move(sourceTip.screenX + 130 * sourceTip.scaleX, grabY, { steps: 16 });
  await expect(preview.locator(".viewer-liquid-merge").first()).toBeVisible();
  await expect
    .poll(async () => (await pathPointNearestY(neighborPath, sourceTip.artY)).artX - neighborAtJoin.artX)
    .toBeGreaterThan(25);
  await page.mouse.up();
  await expect(preview.locator(".viewer-liquid-merge")).toHaveCount(0);
});

test("one dragged strand gathers at least four authored neighbors into a moving bundle", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1000, "Desktop preview only");
  await page.goto("/?interactionDemo=mon-native");
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  await expect(preview).toBeVisible();
  const source = preview.locator('[data-element-id="mon-demo-strand-5"] .pen-visible-path');
  const neighbors = [6, 7, 8, 9].map((index) =>
    preview.locator(`[data-element-id="mon-demo-strand-${index}"] .pen-visible-path`),
  );
  const sourceTip = await pathPoint(source);
  const before = await Promise.all(neighbors.map((neighbor) => pathPointNearestY(neighbor, sourceTip.artY)));
  const grabY = sourceTip.screenY - 5 * sourceTip.scaleY;

  await page.mouse.move(sourceTip.screenX, grabY);
  await page.mouse.down();
  await page.mouse.move(sourceTip.screenX + 165 * sourceTip.scaleX, grabY, { steps: 28 });
  await expect(preview.locator(".viewer-liquid-merge").first()).toBeVisible();
  await expect.poll(async () => {
    const current = await Promise.all(neighbors.map((neighbor) => pathPointNearestY(neighbor, sourceTip.artY)));
    return current.filter((point, index) => Math.abs(point.artX - before[index].artX) > 10).length;
  }).toBe(4);
  await page.mouse.up();
});

test("authored MON strand bends and merges in the ordinary viewer", async ({
  page,
}) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1000, "Desktop preview only");
  await page.goto("/?interactionDemo=mon-native");
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  await expect(preview).toBeVisible();
  await expect(preview.locator(".viewer-preview-element.element-pen")).toHaveCount(45);

  const strand = preview.locator('[data-element-id="mon-demo-strand-5"]');
  const path = strand.locator(".pen-visible-path");
  const originalPath = await path.getAttribute("d");
  const neighborPath = preview
    .locator('[data-element-id="mon-demo-strand-6"]')
    .locator(".pen-visible-path");
  const originalNeighborPath = await neighborPath.getAttribute("d");
  const originalNeighborPoint = await pathPointNearestY(neighborPath, (await pathPoint(path)).artY);
  const otherNeighborPath = preview
    .locator('[data-element-id="mon-demo-strand-7"]')
    .locator(".pen-visible-path");
  const originalOtherNeighborPath = await otherNeighborPath.getAttribute("d");
  const originalSourcePoint = await pathPoint(path);
  const originalOtherNeighborPoint = await pathPointNearestY(otherNeighborPath, originalSourcePoint.artY);
  const bounds = await strand.boundingBox();
  if (!bounds) throw new Error("Seeded strand has no visible bounds");

  const startX = bounds.x + bounds.width / 2;
  const startY = bounds.y + bounds.height * 0.73;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 90, startY, { steps: 8 });

  await expect.poll(() => path.getAttribute("d")).not.toBe(originalPath);
  await expect.poll(() => neighborPath.getAttribute("d")).not.toBe(originalNeighborPath);
  await expect.poll(() => otherNeighborPath.getAttribute("d")).not.toBe(originalOtherNeighborPath);
  await expect
    .poll(async () => Math.abs((await pathPointNearestY(neighborPath, originalNeighborPoint.artY)).artX - originalNeighborPoint.artX))
    .toBeGreaterThan(8);
  await expect(preview.locator(".viewer-liquid-merge").first()).toBeVisible();
  await page.mouse.up();
  await expect(path).not.toHaveAttribute("d", originalPath ?? "");
  await expect.poll(async () => Math.hypot(
    (await pathPoint(path)).artX - originalSourcePoint.artX,
    (await pathPoint(path)).artY - originalSourcePoint.artY,
  )).toBeLessThan(2);
  await expect.poll(async () => Math.abs(
    (await pathPointNearestY(neighborPath, originalNeighborPoint.artY)).artX - originalNeighborPoint.artX,
  )).toBeLessThan(2);
  await expect.poll(async () => Math.abs(
    (await pathPointNearestY(otherNeighborPath, originalOtherNeighborPoint.artY)).artX - originalOtherNeighborPoint.artX,
  )).toBeLessThan(2);
  await expect(preview.locator(".viewer-liquid-merge")).toHaveCount(0);
});

test("the interaction panel edits the same strand definition used by preview", async ({
  page,
}) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1000, "Desktop editor only");
  await page.goto("/?interactionDemo=mon-native");
  await page.getByRole("button", { name: "Close preview" }).click();
  await page
    .getByLabel("Layers")
    .getByRole("option", { name: "MON strand 5" })
    .click();
  await page.getByRole("tab", { name: "INTERACTION" }).click();
  const panel = page.getByRole("tabpanel", { name: "Interaction settings" });
  await expect(panel.getByText("Drag to bend strand")).toBeVisible();
  await expect(panel.getByText("Merge with neighboring strand")).toBeVisible();
  await panel.getByText("Drag to bend strand").click();
  await expect.poll(async () => Number(await panel.getByLabel("Strand max displacement").inputValue())).toBeGreaterThan(800);
  await panel.getByLabel("Strand max displacement").fill("0");
  await panel.getByLabel("Strand max displacement").press("Tab");

  await page.getByRole("button", { name: /Preview/ }).first().click();
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  const strand = preview.locator('[data-element-id="mon-demo-strand-5"]');
  const path = strand.locator(".pen-visible-path");
  const originalPath = await path.getAttribute("d");
  const bounds = await strand.boundingBox();
  if (!bounds) throw new Error("Seeded strand has no visible bounds");
  const startX = bounds.x + bounds.width / 2;
  const startY = bounds.y + bounds.height * 0.73;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 90, startY, { steps: 8 });
  await expect(path).toHaveAttribute("d", originalPath ?? "");
  await page.mouse.up();
});

test("neighbor pull can be disabled for one strand in the Interaction panel", async ({
  page,
}) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1000, "Desktop editor only");
  await page.goto("/?interactionDemo=mon-native");
  await page.getByRole("button", { name: "Close preview" }).click();
  await page
    .getByLabel("Layers")
    .getByRole("option", { name: "MON strand 6" })
    .click();
  await page.getByRole("tab", { name: "INTERACTION" }).click();
  const panel = page.getByRole("tabpanel", { name: "Interaction settings" });
  await panel.getByText("Drag to bend strand").click();
  const strength = panel.getByLabel("Strand neighbor pull");
  await strength.focus();
  await strength.press("Home");
  await expect(strength).toHaveValue("0");

  await page.getByLabel("Layers").getByRole("option", { name: "MON strand 5" }).click();
  await panel.getByText("Merge with neighboring strand").click();
  const attraction = panel.getByLabel("Liquid attraction");
  await attraction.focus();
  await attraction.press("Home");
  await expect(attraction).toHaveValue("0");

  await page.getByRole("button", { name: /Preview/ }).first().click();
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  const dragged = preview.locator('[data-element-id="mon-demo-strand-5"]');
  const neighbor = preview
    .locator('[data-element-id="mon-demo-strand-6"]')
    .locator(".pen-visible-path");
  const originalNeighbor = await neighbor.getAttribute("d");
  const bounds = await dragged.boundingBox();
  if (!bounds) throw new Error("Seeded strand has no visible bounds");
  const startX = bounds.x + bounds.width / 2;
  const startY = bounds.y + bounds.height * 0.73;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 90, startY, { steps: 8 });
  await expect(preview.locator(".viewer-liquid-merge").first()).toBeVisible();
  await expect(neighbor).toHaveAttribute("d", originalNeighbor ?? "");
  await page.mouse.up();
});
