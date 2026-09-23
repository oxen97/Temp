import { expect, test } from "@playwright/test";

test("BLOOM stays borderless with pointer and keyboard input while controls retain keyboard focus", async ({
  page,
  isMobile,
}) => {
  await page.goto("/?interactionDemo=mon-art");
  const preview = page.getByRole("dialog", { name: "Viewer preview" });
  for (const scene of [1, 2]) {
    const next = preview.locator(
      `[data-element-id="mon-art-${scene}-next-hit"]`,
    );
    if (isMobile) await next.tap();
    else await next.click();
  }
  const field = preview.locator('[data-element-id="mon-art-3-spawn-emitter"]');
  if (isMobile) await field.tap({ position: { x: 40, y: 40 } });
  else await field.click({ position: { x: 40, y: 40 } });
  await expect(
    preview.locator("[data-spawn-instance-id]").first(),
  ).toBeVisible();
  await expect(field).not.toHaveCSS("outline-style", "auto");
  await expect(field).toHaveCSS("outline-style", "none");

  if (isMobile) return;
  await expect(field).toBeFocused();
  await expect(field).toHaveAttribute("data-interaction-area", "entire-artwork");
  await page.keyboard.press("a");
  await expect(field).toHaveCSS("outline-style", "none");
  await page.keyboard.press("Tab");
  const focusedControl = preview.locator(".viewer-preview-element:focus");
  await expect(focusedControl).not.toHaveAttribute(
    "data-interaction-area",
    "entire-artwork",
  );
  await expect(focusedControl).toHaveAttribute("role", "button");
  await expect(focusedControl).toHaveCSS("outline-style", "solid");
  await expect(focusedControl).toHaveCSS("outline-width", "2px");
  await page.keyboard.press("Shift+Tab");
  await expect(field).toBeFocused();
  expect(await field.evaluate((node) => node.matches(":focus-visible"))).toBe(
    true,
  );
  await expect(field).toHaveCSS("outline-style", "none");
  const previousCount = await preview
    .locator("[data-spawn-instance-id]")
    .count();
  await page.keyboard.press("Enter");
  await expect
    .poll(() => preview.locator("[data-spawn-instance-id]").count())
    .toBeGreaterThan(previousCount);
  await expect(field).toHaveCSS("outline-style", "none");
});
