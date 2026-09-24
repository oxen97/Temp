import { expect, test, type Locator, type Page } from "@playwright/test";

async function choose(
  page: Page,
  panel: Locator,
  label: string,
  option: string,
) {
  await panel.getByRole("button", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function authorBend(page: Page) {
  await page.getByRole("tab", { name: "INTERACTION", exact: true }).click();
  const panel = page.getByRole("tabpanel", { name: "Interaction settings" });
  await panel
    .getByRole("button", { name: "+ Add interaction", exact: true })
    .click();
  await choose(page, panel, "Trigger", "Drag");
  await choose(page, panel, "Effect", "Strand Bend");
  await choose(page, panel, "Strand anchor", "Bottom");
  await panel.getByLabel("Strand max displacement").fill("95");
  await panel.getByLabel("Strand max displacement").press("Tab");
  // Remounting the panel must hydrate the stored object definition.
  await page.getByRole("tab", { name: "DESIGN", exact: true }).click();
  await page.getByRole("tab", { name: "INTERACTION", exact: true }).click();
  await panel
    .locator(".interaction-row-name", { hasText: "Strand Bend" })
    .click();
  await expect(panel.getByLabel("Strand max displacement")).toHaveValue("95");
  await expect(
    panel.getByRole("button", { name: "Strand anchor", exact: true }),
  ).toHaveText("Bottom");
  return panel;
}

async function changeToWave(page: Page, panel: Locator) {
  await choose(page, panel, "Trigger", "Pointer Move / Touch Move");
  await choose(page, panel, "Effect", "Wave / Curve Deform");
  await panel.getByLabel("Wave amplitude").fill("30");
  await panel.getByLabel("Wave amplitude").press("Tab");
  await page.getByRole("tab", { name: "DESIGN", exact: true }).click();
  await page.getByRole("tab", { name: "INTERACTION", exact: true }).click();
  await panel.locator(".interaction-row-name", { hasText: /Wave/ }).click();
  await expect(panel.getByLabel("Wave amplitude")).toHaveValue("30");
}

async function recordedVideo(page: Page) {
  return page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 320;
    const context = canvas.getContext("2d")!;
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks: Blob[] = [];
    const done = new Promise<Blob>((resolve) => {
      recorder.ondataavailable = (event) => chunks.push(event.data);
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    });
    recorder.start();
    for (let frame = 0; frame < 16; frame += 1) {
      context.fillStyle = frame % 2 ? "#ff715b" : "#4ac7dd";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#ffe7a2";
      context.fillRect(frame * 10, 20, 35, 260);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
    }
    recorder.stop();
    const blob = await done;
    stream.getTracks().forEach((track) => track.stop());
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
}

for (const type of ["image", "video"] as const) {
  test(`authors and previews bend and wave on an uploaded ${type}`, async ({
    page,
  }) => {
    page.setDefaultTimeout(15_000);
    test.skip((page.viewportSize()?.width ?? 0) < 1000, "Desktop authoring");
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");
    await expect(page.getByLabel("Exhibition canvas")).toBeVisible();
    const upload = page.locator(".assets-section .asset-upload input");
    if (type === "image") {
      await upload.setInputFiles({
        name: "deform.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="320"><rect width="240" height="320" fill="#4ac7dd"/><path d="M0 0L240 320M240 0L0 320" stroke="#ffe7a2" stroke-width="35"/></svg>',
        ),
      });
      await page
        .getByRole("button", { name: "Add uploaded asset 1", exact: true })
        .click({ force: true });
    } else {
      await upload.setInputFiles({
        name: "deform.webm",
        mimeType: "video/webm",
        buffer: Buffer.from(await recordedVideo(page)),
      });
      await page
        .getByRole("button", {
          name: "Add uploaded video deform.webm",
          exact: true,
        })
        .click({ force: true });
    }
    await page
      .getByLabel("Layers")
      .getByRole("option", {
        name: type === "image" ? /^Image 1\b/ : /^Video 1\b/,
      })
      .click();
    const panel = await authorBend(page);
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    const preview = page.getByRole("dialog", { name: "Viewer preview" });
    const media = preview.locator("[data-media-deform-id]");
    await expect(media).toHaveAttribute("data-media-deform-status", "ready");
    const hit = media.locator(".media-deform-hit-area");
    const before = await hit.getAttribute("d");
    const bounds = await hit.boundingBox();
    expect(bounds).not.toBeNull();
    await page.mouse.move(
      bounds!.x + bounds!.width / 2,
      bounds!.y + bounds!.height * 0.2,
    );
    await page.mouse.down();
    await page.mouse.move(
      bounds!.x + bounds!.width / 2 + 70,
      bounds!.y + bounds!.height * 0.2,
      { steps: 10 },
    );
    await expect.poll(() => hit.getAttribute("d")).not.toBe(before);
    await page.mouse.up();
    await page
      .getByRole("button", { name: "Close preview", exact: true })
      .click();
    await changeToWave(page, panel);
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(media).toHaveAttribute("data-media-deform-status", "ready");
    const waveBefore = await hit.getAttribute("d");
    await expect.poll(() => hit.getAttribute("d")).not.toBe(waveBefore);
    if (type === "video") {
      await expect
        .poll(() =>
          media
            .locator("video")
            .evaluate((video: HTMLVideoElement) => video.readyState),
        )
        .toBeGreaterThanOrEqual(2);
    }
  });
}

test("authors persistent 3D bend and wave and deforms the preview mesh", async ({
  page,
}) => {
  page.setDefaultTimeout(15_000);
  test.skip((page.viewportSize()?.width ?? 0) < 1000, "Desktop authoring");
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/?threeDemo=1");
  await page
    .getByLabel("Layers")
    .getByRole("option", { name: /^Demo Box\b/ })
    .click();
  await page.getByRole("tab", { name: "INTERACTION", exact: true }).click();
  const panel = page.getByRole("tabpanel", { name: "Interaction settings" });
  await panel
    .getByRole("button", { name: "Toggle Grow on hover", exact: true })
    .click();
  await panel
    .getByRole("button", { name: "Toggle Spin on click", exact: true })
    .click();
  await authorBend(page);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const scene = page
    .getByRole("dialog", { name: "Viewer preview" })
    .getByLabel("3D scene");
  await expect(scene).toBeVisible();
  const bounds = await scene.boundingBox();
  expect(bounds).not.toBeNull();
  const x = bounds!.x + bounds!.width * (770 / 1920);
  const y = bounds!.y + bounds!.height * (540 / 1080);
  await page.mouse.move(x, y);
  const before = await scene.screenshot();
  await page.mouse.down();
  await page.mouse.move(x + 70, y - 15, { steps: 12 });
  await expect
    .poll(async () => (await scene.screenshot()).equals(before))
    .toBe(false);
  await page.mouse.up();
  await page
    .getByRole("button", { name: "Close preview", exact: true })
    .click();
  await changeToWave(page, panel);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(scene).toBeVisible();
  const waveBefore = await scene.screenshot();
  await expect
    .poll(async () => (await scene.screenshot()).equals(waveBefore))
    .toBe(false);
});

function ribbonGlb() {
  const positions: number[] = [];
  const segments = 12;
  for (let row = 0; row < segments; row += 1) {
    for (let column = 0; column < segments; column += 1) {
      const x0 = -1 + (column * 2) / segments;
      const x1 = -1 + ((column + 1) * 2) / segments;
      const y0 = -1 + (row * 2) / segments;
      const y1 = -1 + ((row + 1) * 2) / segments;
      positions.push(
        x0,
        y0,
        0,
        x1,
        y0,
        0,
        x1,
        y1,
        0,
        x0,
        y0,
        0,
        x1,
        y1,
        0,
        x0,
        y1,
        0,
      );
    }
  }
  const binary = Buffer.alloc(positions.length * 4);
  positions.forEach((value, index) => binary.writeFloatLE(value, index * 4));
  const json = Buffer.from(
    JSON.stringify({
      asset: { version: "2.0" },
      buffers: [{ byteLength: binary.length }],
      bufferViews: [{ buffer: 0, byteLength: binary.length }],
      accessors: [
        {
          bufferView: 0,
          componentType: 5126,
          count: positions.length / 3,
          max: [1, 1, 0],
          min: [-1, -1, 0],
          type: "VEC3",
        },
      ],
      meshes: [
        { primitives: [{ attributes: { POSITION: 0 }, material: 0, mode: 4 }] },
      ],
      materials: [
        {
          doubleSided: true,
          pbrMetallicRoughness: { baseColorFactor: [0.15, 0.5, 0.95, 1] },
        },
      ],
      nodes: [{ mesh: 0, name: "Ribbon mesh" }],
      scenes: [{ nodes: [0] }],
      scene: 0,
    }),
  );
  const jsonLength = Math.ceil(json.length / 4) * 4;
  const glb = Buffer.alloc(12 + 8 + jsonLength + 8 + binary.length);
  glb.writeUInt32LE(0x46546c67, 0);
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(jsonLength, 12);
  glb.writeUInt32LE(0x4e4f534a, 16);
  glb.fill(0x20, 20, 20 + jsonLength);
  json.copy(glb, 20);
  glb.writeUInt32LE(binary.length, 20 + jsonLength);
  glb.writeUInt32LE(0x004e4942, 24 + jsonLength);
  binary.copy(glb, 28 + jsonLength);
  return glb;
}

test("authors bend and wave on an imported GLB and deforms the preview mesh", async ({
  page,
}) => {
  page.setDefaultTimeout(15_000);
  test.skip((page.viewportSize()?.width ?? 0) < 1000, "Desktop authoring");
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/");
  await expect(page.getByLabel("Exhibition canvas")).toBeVisible();
  await page.locator(".assets-section .asset-upload input").setInputFiles({
    name: "ribbon.glb",
    mimeType: "model/gltf-binary",
    buffer: ribbonGlb(),
  });
  const asset = page.getByRole("button", {
    name: "Add 3D model ribbon.glb",
    exact: true,
  });
  await expect(asset.locator(".uploaded-asset-thumbnail")).toHaveAttribute(
    "data-preview-state",
    "ready",
  );
  await asset.click();
  await page
    .getByLabel("Layers")
    .getByRole("option", { name: /^ribbon\b/ })
    .click();
  await expect(
    page.getByLabel("3D selection ribbon", { exact: true }),
  ).toBeVisible();
  const panel = await authorBend(page);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const scene = page
    .getByRole("dialog", { name: "Viewer preview" })
    .getByLabel("3D scene");
  await expect(scene).toBeVisible();
  const bounds = await scene.boundingBox();
  expect(bounds).not.toBeNull();
  const x = bounds!.x + bounds!.width / 2;
  const y = bounds!.y + bounds!.height / 2;
  await page.mouse.move(x, y);
  const before = await scene.screenshot();
  await page.mouse.down();
  await page.mouse.move(x + 70, y - 10, { steps: 12 });
  await expect
    .poll(async () => (await scene.screenshot()).equals(before))
    .toBe(false);
  await page.mouse.up();
  await page
    .getByRole("button", { name: "Close preview", exact: true })
    .click();
  await changeToWave(page, panel);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(scene).toBeVisible();
  const waveBefore = await scene.screenshot();
  await expect
    .poll(async () => (await scene.screenshot()).equals(waveBefore))
    .toBe(false);
  expect(errors).toEqual([]);
});
