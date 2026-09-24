import { expect, test, type Locator } from "@playwright/test";

type NosePoint = {
  artX: number;
  artY: number;
  screenX: number;
  screenY: number;
  scaleX: number;
  scaleY: number;
};

async function nosePoint(path: Locator, fraction: number): Promise<NosePoint> {
  return path.evaluate((node, at) => {
    const svgPath = node as SVGPathElement;
    const page = svgPath.closest(".viewer-preview-page") as HTMLElement | null;
    const matrix = svgPath.getScreenCTM();
    if (!page || !matrix)
      throw new Error("Cannot map Pinocchio's nose to the artboard");
    const pageRect = page.getBoundingClientRect();
    const scaleX = pageRect.width / page.clientWidth;
    const scaleY = pageRect.height / page.clientHeight;
    // The texture's hit path is its perimeter, so path-length 0/1 both point
    // at the same corner. The midpoint of each short edge is the bone anchor
    // or tip, including when those edges rotate with the material.
    const viewport = svgPath.ownerSVGElement!.viewBox.baseVal;
    const columns = Math.min(48, Math.max(8, Math.ceil(viewport.width / 14)));
    const rows = Math.min(48, Math.max(8, Math.ceil(viewport.height / 14)));
    const coordinates = (
      svgPath.getAttribute("d")!.match(/-?\d+(?:\.\d+)?/g) ?? []
    ).map(Number);
    const top = at === 0 ? 0 : columns;
    const bottom = at === 0 ? 2 * columns + rows : columns + rows;
    const local = new DOMPoint(
      (coordinates[top * 2] + coordinates[bottom * 2]) / 2,
      (coordinates[top * 2 + 1] + coordinates[bottom * 2 + 1]) / 2,
    );
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

test("Pinocchio and his nose appear in the separate native viewer demo", async ({
  page,
}) => {
  await page.goto("/?interactionDemo=pinocchio-native");
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  await expect(preview).toBeVisible();
  await expect(
    preview.locator('[data-element-id="pinocchio-demo-backdrop"]'),
  ).toBeVisible();
  const nose = preview.locator(
    '[data-element-id="pinocchio-demo-nose"] .media-deform-hit-area',
  );
  await expect(nose).toHaveCount(1);
  await expect(
    preview.locator('[data-media-deform-id="pinocchio-demo-nose"]'),
  ).toHaveAttribute("data-media-deform-status", "ready");
  await expect(
    preview.locator(
      '[data-element-id="pinocchio-demo-nose"] .media-deform-canvas',
    ),
  ).toBeVisible();
  await expect(
    preview.locator(
      '[data-element-id="pinocchio-demo-nose"] .pen-visible-path',
    ),
  ).toHaveCount(0);
  const base = await nosePoint(nose, 0);
  const tip = await nosePoint(nose, 1);
  expect(tip.artX).toBeGreaterThan(base.artX + 50);
});

test("pulling the nose lengthens it, then it springs back and briefly overshoots", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 1000,
    "Desktop pointer precision required",
  );
  await page.goto("/?interactionDemo=pinocchio-native");
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  await expect(preview).toBeVisible();
  const nose = preview.locator(
    '[data-element-id="pinocchio-demo-nose"] .media-deform-hit-area',
  );
  await expect(nose).toHaveCount(1);
  await expect(
    preview.locator('[data-media-deform-id="pinocchio-demo-nose"]'),
  ).toHaveAttribute("data-media-deform-status", "ready");
  const base = await nosePoint(nose, 0);
  const rest = await nosePoint(nose, 1);
  const restLength = rest.artX - base.artX;

  await page.mouse.move(rest.screenX - 5 * rest.scaleX, rest.screenY);
  await page.mouse.down();
  await page.mouse.move(rest.screenX + 200 * rest.scaleX, rest.screenY, {
    steps: 16,
  });
  await expect
    .poll(
      async () =>
        (await nosePoint(nose, 1)).artX - (await nosePoint(nose, 0)).artX,
    )
    .toBeGreaterThan(restLength + 100);

  await page.mouse.up();
  const offsets = await nose.evaluate(async (node, restX) => {
    const svgPath = node as SVGPathElement;
    const page = svgPath.closest(".viewer-preview-page") as HTMLElement;
    const positions: number[] = [];
    for (let frame = 0; frame < 120; frame += 1) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      const matrix = svgPath.getScreenCTM();
      if (!matrix) throw new Error("Nose path detached while springing");
      const rect = page.getBoundingClientRect();
      const scaleX = rect.width / page.clientWidth;
      const viewport = svgPath.ownerSVGElement!.viewBox.baseVal;
      const columns = Math.min(48, Math.max(8, Math.ceil(viewport.width / 14)));
      const rows = Math.min(48, Math.max(8, Math.ceil(viewport.height / 14)));
      const coordinates = (
        svgPath.getAttribute("d")!.match(/-?\d+(?:\.\d+)?/g) ?? []
      ).map(Number);
      const localTip = new DOMPoint(
        (coordinates[columns * 2] + coordinates[(columns + rows) * 2]) / 2,
        (coordinates[columns * 2 + 1] + coordinates[(columns + rows) * 2 + 1]) /
          2,
      );
      const screenTip = localTip.matrixTransform(matrix);
      positions.push((screenTip.x - rect.left) / scaleX - restX);
    }
    return positions;
  }, rest.artX);

  expect(Math.min(...offsets)).toBeLessThan(-2);
  await expect
    .poll(async () => Math.abs((await nosePoint(nose, 1)).artX - rest.artX))
    .toBeLessThan(18);
});

test("pulling the nose upward and downward moves its tip while the root stays attached", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 1000,
    "Desktop pointer precision required",
  );
  await page.goto("/?interactionDemo=pinocchio-native");
  const nose = page
    .getByRole("dialog", { name: "Viewer preview" })
    .locator('[data-element-id="pinocchio-demo-nose"] .media-deform-hit-area');
  await expect(nose).toHaveCount(1);
  await expect(
    page.locator('[data-media-deform-id="pinocchio-demo-nose"]'),
  ).toHaveAttribute("data-media-deform-status", "ready");
  const restRoot = await nosePoint(nose, 0);
  const restTip = await nosePoint(nose, 1);

  for (const direction of [-1, 1]) {
    const tip = await nosePoint(nose, 1);
    await page.mouse.move(tip.screenX - 5 * tip.scaleX, tip.screenY);
    await page.mouse.down();
    await page.mouse.move(
      tip.screenX,
      tip.screenY + direction * 110 * tip.scaleY,
      {
        steps: 16,
      },
    );

    await expect
      .poll(
        async () =>
          direction * ((await nosePoint(nose, 1)).artY - restTip.artY),
      )
      .toBeGreaterThan(30);
    const root = await nosePoint(nose, 0);
    expect(Math.abs(root.artX - restRoot.artX)).toBeLessThan(3);
    expect(Math.abs(root.artY - restRoot.artY)).toBeLessThan(3);

    await page.mouse.up();
    await expect
      .poll(async () =>
        Math.abs((await nosePoint(nose, 1)).artY - restTip.artY),
      )
      .toBeLessThan(18);
  }
});

test("the stretched nose keeps a rounded cap instead of a magnified pointed tip", async ({
  page,
}, testInfo) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 1000,
    "Desktop pointer precision required",
  );
  await page.goto("/?interactionDemo=pinocchio-native");
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  const media = preview.locator('[data-media-deform-id="pinocchio-demo-nose"]');
  await expect(media).toHaveAttribute("data-media-deform-status", "ready");
  const nose = media.locator(".media-deform-hit-area");
  const rest = await nosePoint(nose, 1);
  await page.mouse.move(rest.screenX - 5 * rest.scaleX, rest.screenY);
  await page.mouse.down();
  await page.mouse.move(rest.screenX + 570 * rest.scaleX, rest.screenY, {
    steps: 20,
  });
  await expect
    .poll(async () => (await nosePoint(nose, 1)).artX - rest.artX)
    .toBeGreaterThan(450);

  const canvas = media.locator(".media-deform-canvas");
  const capDepth = await canvas.evaluate((node) => {
    const canvas = node as HTMLCanvasElement;
    const pixels = canvas
      .getContext("2d")!
      .getImageData(0, 0, canvas.width, canvas.height).data;
    const scaleX = canvas.width / parseFloat(canvas.style.width);
    const scaleY = canvas.height / parseFloat(canvas.style.height);
    const top = parseFloat(canvas.style.top);
    const rightEdge = (localY: number) => {
      const row = Math.round((localY - top) * scaleY);
      for (let x = canvas.width - 1; x >= 0; x -= 1)
        if (pixels[(row * canvas.width + x) * 4 + 3] > 150) return x;
      throw new Error("Missing opaque nose pixels");
    };
    return (rightEdge(26) - rightEdge(9)) / scaleX;
  });
  expect(capDepth).toBeGreaterThan(3);
  expect(capDepth).toBeLessThan(16);
  await testInfo.attach("rounded-nose-at-maximum-extension", {
    body: await canvas.screenshot({ path: testInfo.outputPath("rounded-nose.png") }),
    contentType: "image/png",
  });
  await page.mouse.up();
});
