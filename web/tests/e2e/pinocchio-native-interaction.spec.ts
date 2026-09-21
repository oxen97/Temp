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
    '[data-element-id="pinocchio-demo-nose"] .pen-visible-path',
  );
  await expect(nose).toHaveCount(1);
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
    '[data-element-id="pinocchio-demo-nose"] .pen-visible-path',
  );
  await expect(nose).toHaveCount(1);
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
      const localTip = svgPath.getPointAtLength(svgPath.getTotalLength());
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
    .locator('[data-element-id="pinocchio-demo-nose"] .pen-visible-path');
  await expect(nose).toHaveCount(1);
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
