import { describe, expect, it } from "vitest";

import { migrateProject, projectSchema } from "./schema";

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

  it("migrates a version 1 project without altering its 2D scene data", () => {
    const source = {
      schemaVersion: 1 as const,
      id: "project-1",
      name: "Untitled exhibition",
      scenes: [
        {
          id: "scene-1",
          name: "Intro",
          elements: [{ id: "shape-1", type: "rectangle" }],
          backgroundMusic: { loop: true },
        },
      ],
      updatedAt: "2026-08-29T00:00:00.000Z",
    };

    const migrated = migrateProject(source);

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.assets).toEqual([]);
    expect(migrated.scenes[0]).toMatchObject({
      backgroundMusic: { loop: true },
      elements: source.scenes[0].elements,
      objects3d: [],
      scene3d: { enabled: false, projection: "orthographic" },
    });
  });

  it("fills new model metadata fields when reading an older version 2 project", () => {
    const migrated = migrateProject({
      assets: [
        {
          animationNames: ["Idle"],
          byteLength: 1024,
          createdAt: 1_790_000_000_000,
          fileName: "legacy.glb",
          id: "legacy-asset",
          mimeType: "model/gltf-binary",
        },
      ],
      id: "project-v2",
      name: "Older V2",
      scenes: [],
      schemaVersion: 2,
      updatedAt: "2026-09-20T00:00:00.000Z",
    });

    expect(migrated.assets[0]).toMatchObject({
      animationNames: ["Idle"],
      materialNames: [],
      morphTargetNames: [],
    });
  });
});
