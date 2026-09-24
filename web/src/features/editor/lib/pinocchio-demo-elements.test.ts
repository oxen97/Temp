import { describe, expect, it } from "vitest";

import { createPinocchioDemoElements } from "./pinocchio-demo-elements";
import { createMediaDeformMesh, updateMediaDeformMesh } from "./media-deform";
import { createStrandPose, stepStrandPose } from "./strand-bone-runtime";

describe("ordinary authored Pinocchio media", () => {
  it("serializes the nose as an image with a normal Strand Bend interaction", () => {
    const elements = createPinocchioDemoElements(1920, 1080);
    const restored = JSON.parse(JSON.stringify(elements)) as typeof elements;
    expect(restored).toEqual(elements);
    const nose = restored.find(
      (element) => element.id === "pinocchio-demo-nose",
    )!;
    expect(nose.type).toBe("image");
    expect(nose.src).toMatch(/^data:image\/svg\+xml/);
    expect(nose.points).toBeUndefined();
    expect(nose.vectorPaths).toBeUndefined();
    expect(nose.interactions).toHaveLength(1);
    expect(nose.interactions?.[0]).toMatchObject({
      trigger: "drag",
      effect: "strand-bend",
      strandAnchor: "left",
      motion: "spring",
      strandTipLength: 28,
    });
  });

  it("keeps a renamed serialized image anchored while its texture stretches and bends", () => {
    const authored = createPinocchioDemoElements(1920, 1080)[1];
    const nose = {
      ...JSON.parse(JSON.stringify(authored)),
      id: "ordinary-user-image",
      name: "My uploaded asset",
    } as typeof authored;
    const pose = createStrandPose(
      {
        points: [
          { x: 0, y: nose.height / 2 },
          { x: nose.width, y: nose.height / 2 },
        ],
      },
      { anchor: "left" },
    );
    const settings = nose.interactions![0];
    const bent = stepStrandPose(pose, {
      dt: 0,
      grab: {
        index: pose.points.length - 1,
        target: { x: nose.width + 180, y: nose.height / 2 - 100 },
      },
      stiffness: settings.strandStiffness,
      damping: settings.strandDamping,
      maxDisplacement: settings.strandMaxDisplacement,
    });
    const mesh = createMediaDeformMesh(nose, {
      tipLength: settings.strandTipLength,
      anchor: settings.strandAnchor,
    });
    updateMediaDeformMesh(mesh, bent);
    const bottomLeft = mesh.rows * (mesh.columns + 1) * 3;
    expect((mesh.positions[0] + mesh.positions[bottomLeft]) / 2).toBeCloseTo(
      0,
      3,
    );
    expect(
      (mesh.positions[1] + mesh.positions[bottomLeft + 1]) / 2,
    ).toBeCloseTo(nose.height / 2, 3);
    const topRight = mesh.columns * 3;
    const bottomRight = mesh.positions.length - 3;
    expect(
      (mesh.positions[topRight] + mesh.positions[bottomRight]) / 2,
    ).toBeCloseTo(nose.width + 180, 3);
    expect(
      (mesh.positions[topRight + 1] + mesh.positions[bottomRight + 1]) / 2,
    ).toBeCloseTo(nose.height / 2 - 100, 3);
  });
});
