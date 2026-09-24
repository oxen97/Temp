import { expect, test, type Page } from "@playwright/test";

async function movie(page: Page) {
  return Buffer.from(
    await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 200;
      const context = canvas.getContext("2d")!;
      const stream = canvas.captureStream(20);
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      const chunks: Blob[] = [];
      const done = new Promise<Blob>((resolve) => {
        recorder.ondataavailable = (event) => chunks.push(event.data);
        recorder.onstop = () =>
          resolve(new Blob(chunks, { type: "video/webm" }));
      });
      recorder.start();
      for (let i = 0; i < 20; i++) {
        context.fillStyle = i < 10 ? "#30a2df" : "#eda321";
        context.fillRect(0, 0, 200, 200);
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
      }
      recorder.stop();
      const result = Array.from(
        new Uint8Array(await (await done).arrayBuffer()),
      );
      stream.getTracks().forEach((track) => track.stop());
      return result;
    }),
  );
}

async function liquid(page: Page, target: RegExp) {
  await page.getByRole("tab", { name: "INTERACTION", exact: true }).click();
  const panel = page.getByRole("tabpanel", { name: "Interaction settings" });
  await panel
    .getByRole("button", { name: "+ Add interaction", exact: true })
    .click();
  for (const [label, name] of [
    ["Trigger", "Near Target"],
    ["Effect", "Liquid Merge"],
  ]) {
    await panel.getByRole("button", { name: label, exact: true }).click();
    await page.getByRole("option", { name, exact: true }).click();
  }
  await panel
    .getByRole("button", { name: "Collision target element", exact: true })
    .click();
  await page
    .getByRole("listbox", { name: "Collision target element menu" })
    .getByRole("option", { name: target })
    .click();
  await panel.getByLabel("Join distance", { exact: true }).fill("100");
  await panel.getByLabel("Join distance", { exact: true }).press("Tab");
  return panel;
}

for (const sourceType of ["image", "video"]) {
  test(`uploaded ${sourceType} textures remain visible and gain a live connecting patch`, async ({
    page,
  }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1000, "Desktop authoring");
    await page.setViewportSize({ width: 1920, height: 1080 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("/");
    await expect(page.getByLabel("Exhibition canvas")).toBeVisible();
    const upload = page.locator(".assets-section .asset-upload input");
    for (const [index, color] of [
      [1, "#3ba5df"],
      [2, "#db5675"],
    ] as const) {
      const video = sourceType === "video" && index === 1;
      const imageIndex = sourceType === "video" ? 1 : index;
      if (video) {
        await upload.setInputFiles({
          name: "bridge.webm",
          mimeType: "video/webm",
          buffer: await movie(page),
        });
        await page
          .getByRole("button", {
            name: "Add uploaded video bridge.webm",
            exact: true,
          })
          .click({ force: true });
      } else {
        await upload.setInputFiles({
          name: `bridge-${index}.svg`,
          mimeType: "image/svg+xml",
          buffer: Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="${color}"/><path d="M0 0L200 200M200 0L0 200" stroke="#fddb34" stroke-width="24"/></svg>`,
          ),
        });
        await page
          .getByRole("button", { name: /^Add uploaded asset \d+$/ })
          .last()
          .click({ force: true });
      }
      await page
        .getByLabel("Layers")
        .getByRole("option", {
          name: video ? /^Video 1\b/ : new RegExp(`^Image ${imageIndex}\\b`),
        })
        .click();
      await page.getByRole("tab", { name: "DESIGN", exact: true }).click();
      for (const [label, value] of [
        ["x", index === 1 ? "700" : "930"],
        ["y", "400"],
        ["w", "200"],
        ["h", "200"],
      ]) {
        await page
          .getByRole("spinbutton", { name: label, exact: true })
          .fill(value);
        await page
          .getByRole("spinbutton", { name: label, exact: true })
          .press("Tab");
      }
    }
    await page
      .getByLabel("Layers")
      .getByRole("option", {
        name: sourceType === "video" ? /^Video 1\b/ : /^Image 1\b/,
      })
      .click();
    await liquid(page, sourceType === "video" ? /^Image 1 / : /^Image 2 /);
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    const preview = page.getByRole("dialog", { name: "Viewer preview" });
    await expect(
      preview.locator('[data-media-deform-status="ready"]'),
    ).toHaveCount(2);
    const bridge = preview.locator(".viewer-media-liquid-bridge");
    await expect(bridge).toHaveAttribute("data-media-liquid-status", "ready");
    expect(
      await bridge.evaluate((canvas: HTMLCanvasElement) => {
        const pixels = canvas
          .getContext("2d")!
          .getImageData(0, 0, canvas.width, canvas.height).data;
        let colored = 0;
        for (let i = 0; i < pixels.length; i += 4)
          if (
            pixels[i + 3] > 10 &&
            Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) -
              Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) >
              30
          )
            colored++;
        return colored;
      }),
    ).toBeGreaterThan(20);
    if (sourceType === "video") {
      const pixels = await bridge.evaluate((canvas: HTMLCanvasElement) =>
        canvas.toDataURL(),
      );
      await expect
        .poll(() =>
          bridge.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL()),
        )
        .not.toBe(pixels);
    }
    expect(errors).toEqual([]);
  });
}

test("3D liquid connects objects without replacing their original materials", async ({
  page,
}) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1000, "Desktop authoring");
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
  for (const label of ["Toggle Grow on hover", "Toggle Spin on click"])
    await panel.getByRole("button", { name: label, exact: true }).click();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await page.waitForTimeout(500);
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  const before = await preview.screenshot();
  await page
    .getByRole("button", { name: "Close preview", exact: true })
    .click();
  await liquid(page, /^Demo Sphere /);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect
    .poll(async () => (await preview.screenshot()).equals(before))
    .toBe(false);
  await page.waitForTimeout(700);
  expect(errors).toEqual([]);
});
