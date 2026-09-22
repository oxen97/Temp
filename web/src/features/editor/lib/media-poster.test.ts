import { describe, expect, it } from "vitest";

import { createMediaPoster } from "./media-poster";

describe("createMediaPoster", () => {
  it("reuses the object URL for a non-animated image", async () => {
    const file = new File(["image"], "still.png", { type: "image/png" });

    await expect(createMediaPoster(file, "blob:still.png")).resolves.toBe(
      "blob:still.png",
    );
  });

  it("infers a static image from its extension when MIME metadata is absent", async () => {
    const file = new File(["image"], "still.webp");

    await expect(createMediaPoster(file, "blob:still.webp")).resolves.toBe(
      "blob:still.webp",
    );
  });

  it("fails safely for missing URLs and unsupported files", async () => {
    const image = new File(["image"], "still.png", { type: "image/png" });
    const unknown = new File(["unknown"], "asset.bin");

    await expect(createMediaPoster(image, "")).resolves.toBeUndefined();
    await expect(
      createMediaPoster(unknown, "blob:asset.bin"),
    ).resolves.toBeUndefined();
  });
});
