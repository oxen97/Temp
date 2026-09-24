import { BoxGeometry, ConeGeometry, CylinderGeometry } from "three";

import { createGeometry3D } from "@/features/editor/three/geometry-factory";
import type { Object3DElement } from "@/features/editor/three/types";

/** Extra longitudinal vertices let low-poly primitives actually curve. */
export function createDeformableGeometry3D(
  object: Pick<Object3DElement, "dimensions" | "source">,
) {
  const {
    dimensions: { width, height, depth },
    source,
  } = object;
  if (source.kind !== "primitive") return createGeometry3D(object);
  const radial = Math.max(
    3,
    Math.min(256, Math.round(source.parameters.radialSegments ?? 32)),
  );
  switch (source.primitive) {
    case "box":
      return new BoxGeometry(width, height, depth, 16, 16, 2);
    case "cone":
      return new ConeGeometry(width / 2, height, radial, 24).scale(
        1,
        1,
        depth / width,
      );
    case "cylinder":
      return new CylinderGeometry(
        width / 2,
        width / 2,
        height,
        radial,
        24,
      ).scale(1, 1, depth / width);
    default:
      return createGeometry3D(object);
  }
}
