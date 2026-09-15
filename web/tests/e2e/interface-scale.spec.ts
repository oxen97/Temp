import { expect, test } from "@playwright/test";

const storageKey = "amous.ui.interface-scale.v2";

test.describe("150% interface scale and 100% canvas zoom at 4K Windows 125%", () => {
  test.use({
    deviceScaleFactor: 1.25,
    viewport: { height: 1080, width: 1920 },
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window.screen, "width", {
        configurable: true,
        value: 3072,
      });
    });
    await page.goto("/");
    await page.getByLabel("Exhibition canvas").waitFor();
    await expect(page.locator(".editor-shell")).toHaveAttribute(
      "data-interface-scale",
      "150",
    );
  });

  test("Auto enlarges only the editor chrome and keeps canvas zoom independent", async ({
    page,
  }) => {
    const topbar = page.locator(".editor-topbar");
    const toolRail = page.locator(".tool-rail");
    const projectPanel = page.locator(".project-panel");
    const propertiesPanel = page.locator(".properties-panel");
    const canvas = page.getByLabel("Exhibition canvas");
    const artboard = page.getByLabel("Artboard");

    await expect(topbar).toHaveCSS("height", "66px");
    const autoGeometry = await Promise.all([
      topbar.boundingBox(),
      toolRail.boundingBox(),
      projectPanel.boundingBox(),
      propertiesPanel.boundingBox(),
      canvas.boundingBox(),
    ]);
    expect(autoGeometry[0]?.height).toBeCloseTo(99, 1);
    expect(autoGeometry[1]?.width).toBeCloseTo(105, 1);
    expect(autoGeometry[2]?.width).toBeCloseTo(417, 1);
    expect(autoGeometry[3]?.width).toBeCloseTo(517.5, 1);
    expect(autoGeometry[4]?.x).toBeCloseTo(522, 1);

    await expect
      .poll(() =>
        artboard.evaluate((node) =>
          Number.parseFloat(
            getComputedStyle(node).getPropertyValue("--artboard-scale"),
          ),
        ),
      )
      .toBeCloseTo(1, 5);
    const canvasZoomBefore = await artboard.evaluate((node) =>
      Number.parseFloat(
        getComputedStyle(node).getPropertyValue("--artboard-scale"),
      ),
    );
    expect(canvasZoomBefore).toBe(1);

    await page.getByRole("button", { name: "Rectangle", exact: true }).click();
    const pickerBox = await page
      .getByRole("toolbar", { name: "Shape picker" })
      .boundingBox();
    expect(pickerBox?.x).toBeCloseTo(
      (autoGeometry[1]?.x ?? 0) + (autoGeometry[1]?.width ?? 0) + 6,
      1,
    );
    expect(pickerBox?.width).toBeCloseTo(72, 1);
    await page.getByRole("button", { name: "Selection", exact: true }).click();

    await page.locator(".zoom-menu").click();
    await page.getByRole("menuitemradio", { name: "100%" }).click();
    await expect(page.locator(".editor-shell")).toHaveAttribute(
      "data-interface-scale",
      "100",
    );

    const canvasZoomAfter = await artboard.evaluate((node) =>
      Number.parseFloat(
        getComputedStyle(node).getPropertyValue("--artboard-scale"),
      ),
    );
    expect(canvasZoomAfter).toBeCloseTo(canvasZoomBefore, 5);
    expect(
      await page.evaluate((key) => localStorage.getItem(key), storageKey),
    ).toBe("100");

    await page.locator(".zoom-menu").click();
    await page.getByRole("menuitemradio", { name: "110%" }).click();
    await expect(page.locator(".editor-shell")).toHaveAttribute(
      "data-interface-scale",
      "110",
    );
    expect((await toolRail.boundingBox())?.width).toBeCloseTo(77, 1);
    expect(
      await artboard.evaluate((node) =>
        Number.parseFloat(
          getComputedStyle(node).getPropertyValue("--artboard-scale"),
        ),
      ),
    ).toBeCloseTo(canvasZoomBefore, 5);

    await page.reload();
    await expect(page.locator(".editor-shell")).toHaveAttribute(
      "data-interface-scale",
      "110",
    );
  });

  test("uses the same self-hosted Inter weights across every editor surface and property tab", async ({
    page,
  }) => {
    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.fonts].some(
            (font) =>
              font.family.includes("Inter Variable") &&
              font.status === "loaded",
          ),
        ),
      )
      .toBe(true);

    const scaledSurfaces = page.locator(".interface-scale-surface");
    await expect(scaledSurfaces).toHaveCount(5);
    for (const surface of await scaledSurfaces.all()) {
      await expect(surface).toHaveCSS("zoom", "1.5");
      await expect(surface).toHaveCSS("font-family", /Inter Variable/);
      await expect(surface).toHaveCSS("font-synthesis", "none");
    }

    const assertInter = async (selector: string, weight: string) => {
      const node = page.locator(selector).first();
      await expect(node).toBeVisible();
      await expect(node).toHaveCSS("font-family", /Inter Variable/);
      await expect(node).toHaveCSS("font-weight", weight);
    };

    await assertInter(".project-section-heading h2", "600");
    await assertInter('.panel-tabs [role="tab"]:nth-child(3)', "500");

    await page.getByRole("tab", { name: "SCENES" }).click();
    await assertInter(".scene-page-name-label", "500");

    await page.getByRole("tab", { name: "SOUND" }).click();
    await assertInter(".sound-properties h2", "700");

    await page.getByRole("button", { exact: true, name: "Preview" }).click();
    await expect(page.getByRole("button", { name: "Close preview" })).toHaveCSS(
      "zoom",
      "1.5",
    );
    await expect(page.locator(".viewer-preview-page")).toHaveCSS("zoom", "1");
  });

  test("keeps slider thumbs round and visually separate from their fill", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: "SOUND" }).click();

    const slider = page.locator(".sound-slider").first();
    const fill = slider.locator(".design-range-fill");
    const thumb = slider.locator(".design-range-thumb");
    const thumbBounds = await thumb.boundingBox();
    if (!thumbBounds)
      throw new Error("Sound slider thumb bounds are unavailable");

    expect(thumbBounds.width).toBeCloseTo(thumbBounds.height, 5);
    await expect(thumb).toHaveCSS("border-radius", "50%");
    await expect(thumb).toHaveCSS("z-index", "1");
    await expect(fill).toHaveCSS("clip-path", "inset(0px 1px 0px 0px)");
  });

  test("scales Interaction Sounds while keeping its divider one physical pixel", async ({
    page,
  }) => {
    const canvasBox = await page.getByLabel("Exhibition canvas").boundingBox();
    if (!canvasBox) throw new Error("Canvas bounds are unavailable");

    await page.getByRole("button", { name: "Rectangle", exact: true }).click();
    await page.mouse.move(canvasBox.x + 180, canvasBox.y + 180);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + 300, canvasBox.y + 260);
    await page.mouse.up();
    await page.getByRole("tab", { name: "SOUND" }).click();

    const panel = page.getByRole("tabpanel", { name: "Sound settings" });
    const row = panel.getByRole("group", {
      name: "Hover interaction sound",
    });
    expect((await row.boundingBox())?.height).toBeCloseTo(33, 1);
    await expect(row.locator(".sound-interaction-trigger")).toHaveCSS(
      "font-size",
      "10px",
    );

    await panel
      .getByRole("button", { name: "More Hover sound options" })
      .click();
    await panel.getByRole("menuitem", { name: "Event Settings" }).click();
    const divider = panel.locator(".sound-event-divider");
    expect((await divider.boundingBox())?.height).toBeCloseTo(1, 1);

    const lineColors = await panel.evaluate((node) => {
      const interactionRow = node.querySelector<HTMLElement>(
        ".sound-interaction-row",
      );
      const eventDivider = node.querySelector<HTMLElement>(
        ".sound-event-divider",
      );
      if (!interactionRow || !eventDivider) {
        throw new Error("Interaction sound border elements are unavailable");
      }

      return {
        row: getComputedStyle(interactionRow).borderTopColor,
        divider: getComputedStyle(eventDivider).borderTopColor,
      };
    });
    expect(lineColors.divider).toBe(lineColors.row);
  });

  test("Zoom to Fit uses the current canvas area and Shift+1 repeats it", async ({
    page,
  }) => {
    await page.locator(".zoom-menu").click();
    await page.getByRole("menuitemradio", { name: "100%" }).click();

    const canvas = page.getByLabel("Exhibition canvas");
    const artboard = page.getByLabel("Artboard");
    const expectedFitScale = await canvas.evaluate((node) => {
      const bounds = node.getBoundingClientRect();
      return Math.min((bounds.width - 36) / 1920, (bounds.height - 96) / 1080);
    });

    await page.locator(".zoom-menu").click();
    await page.getByRole("menuitem", { name: /Zoom to Fit/ }).click();
    await expect
      .poll(() =>
        artboard.evaluate((node) =>
          Number.parseFloat(
            getComputedStyle(node).getPropertyValue("--artboard-scale"),
          ),
        ),
      )
      .toBeCloseTo(expectedFitScale, 2);

    await page.locator(".zoom-menu").click();
    await page.getByRole("menuitem", { name: /Actual Size/ }).click();
    await expect
      .poll(() =>
        artboard.evaluate((node) =>
          Number.parseFloat(
            getComputedStyle(node).getPropertyValue("--artboard-scale"),
          ),
        ),
      )
      .toBeCloseTo(1, 5);

    await page.setViewportSize({ height: 700, width: 1600 });
    await expect
      .poll(() =>
        artboard.evaluate((node) =>
          Number.parseFloat(
            getComputedStyle(node).getPropertyValue("--artboard-scale"),
          ),
        ),
      )
      .toBeCloseTo(1, 5);
    const resizedFitScale = await canvas.evaluate((node) => {
      const bounds = node.getBoundingClientRect();
      return Math.min((bounds.width - 36) / 1920, (bounds.height - 96) / 1080);
    });

    await page.keyboard.press("Shift+Digit1");
    await expect
      .poll(() =>
        artboard.evaluate((node) =>
          Number.parseFloat(
            getComputedStyle(node).getPropertyValue("--artboard-scale"),
          ),
        ),
      )
      .toBeCloseTo(resizedFitScale, 2);
  });

  test("custom panel scrollbars track the pointer at 150%", async ({
    page,
  }) => {
    const viewport = page.locator(".asset-grid");
    const track = page.locator(".asset-grid-scroll-area .custom-scrollbar");
    const thumb = track.locator(".custom-scrollbar-thumb");
    await expect(thumb).toBeVisible();

    const [trackBox, thumbBox] = await Promise.all([
      track.boundingBox(),
      thumb.boundingBox(),
    ]);
    if (!trackBox || !thumbBox) {
      throw new Error("Asset scrollbar bounds are unavailable");
    }
    const viewportBox = await viewport.boundingBox();
    if (!viewportBox) throw new Error("Asset viewport bounds are unavailable");
    expect(viewportBox.height).toBeGreaterThan(60);
    expect(viewportBox.y + viewportBox.height).toBeLessThanOrEqual(1080);
    const physicalTravel = trackBox.height - thumbBox.height;
    await page.mouse.move(
      thumbBox.x + thumbBox.width / 2,
      thumbBox.y + thumbBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      thumbBox.x + thumbBox.width / 2,
      thumbBox.y + thumbBox.height / 2 + physicalTravel / 2,
    );
    await page.mouse.up();

    const scrollRatio = await viewport.evaluate(
      (node) => node.scrollTop / (node.scrollHeight - node.clientHeight),
    );
    expect(scrollRatio).toBeCloseTo(0.5, 1);
  });

  test("the canvas navigator follows interface scale, not canvas zoom", async ({
    page,
  }) => {
    await page.locator(".zoom-menu").click();
    await page.getByRole("menuitem", { name: /Zoom to Fit/ }).click();
    await page.locator(".zoom-menu").click();
    await page.getByRole("menuitem", { name: /Actual Size/ }).click();
    const navigator = page.getByLabel("Navigator");
    await expect(navigator).toHaveClass(/is-visible/);
    const scaledBox = await navigator.boundingBox();
    expect(scaledBox?.width).toBeCloseTo(307.5, 1);
    expect(scaledBox?.height).toBeCloseTo(265.5, 1);

    await page.locator(".zoom-menu").click();
    await page.getByRole("menuitemradio", { name: "100%" }).click();
    const baseBox = await navigator.boundingBox();
    expect(baseBox?.width).toBeCloseTo(205, 1);
    expect(baseBox?.height).toBeCloseTo(177, 1);
    expect(
      await page
        .getByLabel("Artboard")
        .evaluate((node) =>
          Number.parseFloat(
            getComputedStyle(node).getPropertyValue("--artboard-scale"),
          ),
        ),
    ).toBe(1);
  });

  test("scaled interfaces enter compact layout before panels crush the canvas", async ({
    page,
  }) => {
    await page.locator(".zoom-menu").click();
    await page
      .getByRole("menuitemradio", { exact: true, name: "150%" })
      .click();
    await page.setViewportSize({ height: 900, width: 1000 });

    const shell = page.locator(".editor-shell");
    await expect(shell).toHaveAttribute("data-interface-compact", "true");
    await expect(page.locator(".project-panel")).toBeHidden();
    await expect(page.locator(".properties-panel")).toBeHidden();
    const canvasBox = await page.getByLabel("Exhibition canvas").boundingBox();
    expect(canvasBox?.width).toBeGreaterThan(800);
  });
});

test.describe("automatic QHD interface scale", () => {
  test.use({ viewport: { height: 1440, width: 2560 } });

  test("uses 110% while leaving the canvas scale independent", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window.screen, "width", {
        configurable: true,
        value: 2560,
      });
    });
    await page.goto("/");

    const shell = page.locator(".editor-shell");
    await expect(shell).toHaveAttribute("data-interface-scale", "110");
    await expect(page.locator(".editor-topbar")).toHaveCSS("zoom", "1.1");
    await expect(page.getByLabel("Exhibition canvas")).toHaveCSS("zoom", "1");
  });
});

test.describe("automatic 4K display-scale detection", () => {
  test.use({ viewport: { height: 1080, width: 1920 } });

  test("migrates the previous 4K 125% preference to 150%", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("amous.ui.interface-scale.v1", "125");
      Object.defineProperty(window.screen, "width", {
        configurable: true,
        value: 3072,
      });
      Object.defineProperty(window, "devicePixelRatio", {
        configurable: true,
        value: 1.25,
      });
    });
    await page.goto("/");

    const shell = page.locator(".editor-shell");
    await expect(shell).toHaveAttribute("data-interface-scale-mode", "150");
    await expect(shell).toHaveAttribute("data-interface-scale", "150");
    expect(
      await page.evaluate((key) => localStorage.getItem(key), storageKey),
    ).toBe("150");
  });

  test("uses 150% on a 4K display at Windows 100%", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window.screen, "width", {
        configurable: true,
        value: 3840,
      });
      Object.defineProperty(window, "devicePixelRatio", {
        configurable: true,
        value: 1,
      });
    });
    await page.goto("/");

    const shell = page.locator(".editor-shell");
    await expect(shell).toHaveAttribute("data-interface-scale", "150");
    await expect(page.locator(".editor-topbar")).toHaveCSS("zoom", "1.5");
    await expect(page.getByLabel("Exhibition canvas")).toHaveCSS("zoom", "1");
  });

  test("uses the Windows scale without adding another scale at 150%", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window.screen, "width", {
        configurable: true,
        value: 2560,
      });
      Object.defineProperty(window, "devicePixelRatio", {
        configurable: true,
        value: 1.5,
      });
    });
    await page.goto("/");

    const shell = page.locator(".editor-shell");
    await expect(shell).toHaveAttribute("data-interface-scale", "100");
    await expect(page.locator(".editor-topbar")).toHaveCSS("zoom", "1");
    await expect(page.getByLabel("Exhibition canvas")).toHaveCSS("zoom", "1");
  });
});

test.describe("compact-height desktop layout", () => {
  test.use({ viewport: { height: 720, width: 1280 } });

  test("keeps every left panel section accessible at FHD Auto 100%", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window.screen, "width", {
        configurable: true,
        value: 1920,
      });
    });
    await page.goto("/");

    await expect(page.locator(".editor-shell")).toHaveAttribute(
      "data-interface-scale",
      "100",
    );
    const assetSection = page.locator(".assets-section");
    await expect(assetSection).toBeVisible();
    await expect(
      assetSection.getByText("ASSETS", { exact: true }),
    ).toBeVisible();
    await expect(
      assetSection.getByText("Upload", { exact: true }),
    ).toBeVisible();
    const assetBounds = await assetSection.boundingBox();
    expect(assetBounds?.height).toBeGreaterThan(100);
    expect(
      (assetBounds?.y ?? 720) + (assetBounds?.height ?? 0),
    ).toBeLessThanOrEqual(720);
  });
});
