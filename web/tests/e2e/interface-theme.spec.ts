import { expect, test } from "@playwright/test";

const storageKey = "amous-interface-theme";

test("follows the system dark theme until the user overrides it", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");

  const shell = page.locator(".editor-shell");
  await expect(shell).toHaveAttribute("data-theme", "dark");
  await expect(shell).toHaveAttribute("data-interface-ready", "true");
  await expect(page.locator(".tool-rail")).toHaveCSS(
    "background-color",
    "rgb(23, 25, 36)",
  );
  await expect(page.locator(".project-panel")).toHaveCSS(
    "background-color",
    "rgb(23, 25, 36)",
  );
  await expect(page.locator(".properties-panel")).toHaveCSS(
    "background-color",
    "rgb(23, 25, 36)",
  );
  await expect(page.locator(".editor-topbar")).toHaveCSS(
    "background-color",
    "rgb(23, 25, 36)",
  );
  await expect(page.locator(".view-controls")).toHaveCSS(
    "background-color",
    "rgb(254, 254, 254)",
  );
  await expect(page.locator('.tool-button[data-tool="hand"] img')).toHaveAttribute(
    "src",
    /hand-dark\.svg/,
  );
  await expect(page.locator(".editor-canvas")).toHaveCSS(
    "background-color",
    "rgb(254, 254, 254)",
  );
  await expect(page.locator(".artboard-background-layer").first()).toHaveCSS(
    "background-color",
    "rgb(217, 217, 217)",
  );

  await page.getByRole("button", { name: "Hand", exact: true }).click();
  await expect(page.locator('.tool-button[data-tool="hand"] img')).toHaveAttribute(
    "src",
    /hand-active-dark\.svg/,
  );

  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(shell).toHaveAttribute("data-theme", "light");
  await expect(
    page.getByRole("button", { name: "Switch to dark mode" }),
  ).toBeVisible();
  await expect(page.locator(".project-panel")).toHaveCSS(
    "background-color",
    "rgb(254, 254, 254)",
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBe("light");

  await page.reload();
  await expect(shell).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(shell).toHaveAttribute("data-theme", "dark");
});

test("tracks a live system theme change when no override is saved", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const shell = page.locator(".editor-shell");
  await expect(shell).toHaveAttribute("data-theme", "light");

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(shell).toHaveAttribute("data-theme", "dark");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBeNull();
});

test("uses dark artwork for the shape picker and restores the light artwork", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");

  await page.locator('.tool-button[data-tool="rectangle"]').click();
  const picker = page.getByRole("toolbar", { name: "Shape picker" });
  await expect(picker).toBeVisible();
  await expect(picker).toHaveCSS("background-image", /shape-picker-dark\.svg/);
  await expect(picker).toHaveCSS("background-color", "rgb(23, 25, 36)");
  await expect(picker.locator(".shape-picker-pen")).toHaveCSS(
    "background-color",
    "rgb(168, 172, 189)",
  );

  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(picker).toHaveCSS("background-image", /shape-picker\.svg/);
  await expect(picker).toHaveCSS("background-color", "rgb(255, 255, 255)");
});
