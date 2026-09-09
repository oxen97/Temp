import { describe, expect, it } from "vitest";

import { projectSchema } from "./schema";

describe("projectSchema", () => {
  it("accepts a versioned exhibition project", () => {
    const result = projectSchema.safeParse({
      schemaVersion: 1,
      id: "project-1",
      name: "Untitled exhibition",
      scenes: [],
      updatedAt: "2026-08-29T00:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });
});
