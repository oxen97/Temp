import { expect, test } from "@playwright/test";

const sceneNames = ["PENDULUM", "AFTERIMAGE", "GAZE", "RESONANCE"] as const;

test("MON art preview presents four scenes in order and loops to the first", async ({
  page,
}) => {
  await page.goto("/?interactionDemo=mon-art");

  const preview = page.getByRole("region", {
    name: "MON 영감 2D 인터랙션 데모",
  });
  await expect(preview).toBeVisible();

  for (let index = 0; index < sceneNames.length; index += 1) {
    const current = sceneNames[index];
    const next = sceneNames[(index + 1) % sceneNames.length];
    await expect(preview.locator("canvas")).toHaveAttribute(
      "aria-label",
      `${current} 인터랙션 화면`,
    );
    await expect(preview.getByText(current, { exact: true })).toBeVisible();
    await preview
      .getByRole("button", { name: `다음 장면으로 이동: ${next}` })
      .click();
  }

  await expect(preview.locator("canvas")).toHaveAttribute(
    "aria-label",
    "PENDULUM 인터랙션 화면",
  );
});

test("MON art scene navigation selects the matching editor scene and preview reopens there", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 1000,
    "Desktop editor panels only",
  );
  await page.goto("/?interactionDemo=mon-art");

  const preview = page.getByRole("region", {
    name: "MON 영감 2D 인터랙션 데모",
  });
  await expect(preview).toBeVisible();
  for (const next of sceneNames.slice(1)) {
    await preview
      .getByRole("button", { name: `다음 장면으로 이동: ${next}` })
      .click();
  }
  await expect(preview.locator("canvas")).toHaveAttribute(
    "aria-label",
    "RESONANCE 인터랙션 화면",
  );
  await preview.getByRole("button", { name: "데모 닫기" }).click();
  await expect(preview).toBeHidden();

  const scenes = page.locator(".scenes-section .scene-item");
  await expect(scenes).toHaveCount(sceneNames.length);
  for (const [index, name] of sceneNames.entries()) {
    await expect(scenes.nth(index)).toContainText(name);
  }
  await expect(scenes.nth(3)).toHaveAttribute("aria-pressed", "true");

  const artboard = page.getByRole("application", { name: "Artboard" });
  await expect(artboard).toBeVisible();
  await expect(artboard.locator(".canvas-element").first()).toBeVisible();
  const selectedElement = artboard
    .locator(".canvas-element.is-selected")
    .first();
  await expect(selectedElement).toBeVisible();
  await expect(page.getByRole("tab", { name: "INTERACTION" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  const selectedName = page
    .getByRole("tabpanel", { name: "Interaction settings" })
    .locator(".interaction-selected strong");
  await expect(selectedName).not.toHaveText("No selection");
  await expect(selectedElement).toHaveAttribute(
    "aria-label",
    await selectedName.innerText(),
  );

  await scenes.nth(1).click();
  await expect(scenes.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(selectedName).toHaveText("Interactive ember");
  await page
    .getByRole("button", { name: /Preview/ })
    .first()
    .click();
  await expect(preview).toBeVisible();
  await expect(preview.locator("canvas")).toHaveAttribute(
    "aria-label",
    "AFTERIMAGE 인터랙션 화면",
  );
});
