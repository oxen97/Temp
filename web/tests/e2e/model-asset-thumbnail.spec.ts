import { expect, test } from "@playwright/test";

test("shows the uploaded model geometry in its asset tile", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) <= 960,
    "Asset panel is desktop-only",
  );
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.goto("/");
  await page.getByLabel("Exhibition canvas").waitFor();
  await page.getByRole("tab", { name: "3D" }).click();

  const vertices = Buffer.alloc(36);
  [-1, -1, 0, 1, -1, 0, 0, 1, 0].forEach((value, index) =>
    vertices.writeFloatLE(value, index * 4),
  );
  const gltf = {
    asset: { version: "2.0" },
    buffers: [
      {
        byteLength: vertices.length,
        uri: `data:application/octet-stream;base64,${vertices.toString("base64")}`,
      },
    ],
    bufferViews: [{ buffer: 0, byteLength: vertices.length }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        max: [1, 1, 0],
        min: [-1, -1, 0],
        type: "VEC3",
      },
    ],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0 },
            material: 0,
            mode: 4,
          },
        ],
      },
    ],
    materials: [
      {
        doubleSided: true,
        pbrMetallicRoughness: { baseColorFactor: [0.2, 0.4, 1, 1] },
      },
    ],
    nodes: [{ mesh: 0 }],
    scenes: [{ nodes: [0] }],
    scene: 0,
  };
  await page.locator(".assets-section .asset-upload input").setInputFiles({
    buffer: Buffer.from(JSON.stringify(gltf)),
    mimeType: "model/gltf+json",
    name: "blue-triangle.gltf",
  });

  const tile = page.getByRole("button", {
    name: "Add 3D model blue-triangle.gltf",
  });
  await expect(tile).toBeVisible();
  await expect(tile.locator(".uploaded-asset-thumbnail")).toHaveAttribute(
    "data-preview-state",
    "ready",
  );
  await expect(tile.locator(".uploaded-asset-thumbnail")).toHaveCSS(
    "background-image",
    /data:image\/png;base64/,
  );
  const visiblePixels = await tile
    .locator(".uploaded-asset-thumbnail")
    .evaluate(async (thumbnail) => {
      const url = (thumbnail as HTMLElement).style.backgroundImage.match(
        /data:image\/png;base64,[^"')]+/,
      )?.[0];
      if (!url) return 0;
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      context?.drawImage(image, 0, 0);
      const pixels = context?.getImageData(
        0,
        0,
        image.width,
        image.height,
      ).data;
      if (!pixels) return 0;
      let visible = 0;
      for (let index = 3; index < pixels.length; index += 4) {
        if (pixels[index] > 50) visible += 1;
      }
      return visible;
    });
  expect(visiblePixels).toBeGreaterThan(100);
  await expect(tile.locator(".uploaded-asset-label")).toHaveText(
    "blue-triangle.gltf",
  );

  await tile.click();
  const layer = page.getByLabel("Layers").getByRole("option", {
    name: /blue-triangle/,
  });
  await expect(layer).toBeVisible();
  await expect(layer.locator(".uploaded-asset-thumbnail")).toHaveAttribute(
    "data-preview-state",
    "ready",
  );
  expect(
    await layer.locator(".uploaded-asset-thumbnail").evaluate((node) =>
      (node as HTMLElement).style.backgroundImage,
    ),
  ).toBe(
    await tile.locator(".uploaded-asset-thumbnail").evaluate((node) =>
      (node as HTMLElement).style.backgroundImage,
    ),
  );
  await layer.click();
  await expect(layer).toHaveAttribute("aria-selected", "true");
  const materialToggle = page.getByRole("checkbox", {
    name: "Use Model Materials",
  });
  await expect(materialToggle).toBeChecked();
  const toggleTextHeight = await page
    .locator(".design-3d-source-material span")
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(toggleTextHeight).toBeLessThanOrEqual(12);
  await materialToggle.uncheck();
  const colorInput = page.getByRole("textbox", {
    name: "3D Color",
    exact: true,
  });
  await colorInput.fill("#12AB34");
  await expect(colorInput).toHaveValue("#12AB34");
  const selection = page.getByLabel("3D selection blue-triangle.gltf");
  await expect(selection).toBeVisible();
  const resizeHandle = await selection.locator(".handle-se").boundingBox();
  expect(resizeHandle).not.toBeNull();
  const resizeX = resizeHandle!.x + resizeHandle!.width / 2;
  const resizeY = resizeHandle!.y + resizeHandle!.height / 2;
  await page.mouse.move(resizeX, resizeY);
  await page.mouse.down();
  await page.mouse.move(resizeX + 30, resizeY + 25, { steps: 100 });
  await page.mouse.up();
  expect(runtimeErrors.filter((message) => /Maximum update depth exceeded/i.test(message))).toEqual([]);
  await layer.hover();
  await page.getByRole("button", { name: "Hide blue-triangle" }).click();
  await expect(page.getByRole("button", { name: "Show blue-triangle" })).toBeVisible();
});
