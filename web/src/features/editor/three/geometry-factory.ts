import {
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  MathUtils,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from "three";

import type {
  Object3DElement,
  Object3DSource,
  Primitive3DKind,
  VectorShapeSnapshot,
} from "@/features/editor/three/types";
import { vectorSnapshotToShapes } from "@/features/editor/three/vector-shape-adapter";

const finitePositive = (value: number, fallback: number) =>
  Number.isFinite(value) && value > 0 ? value : fallback;

const segmentCount = (
  value: number | undefined,
  fallback: number,
  min: number,
) => Math.max(min, Math.min(256, Math.round(value ?? fallback)));

type Geometry3DDescriptor = Pick<Object3DElement, "dimensions" | "source">;

function primitiveGeometry(
  primitive: Primitive3DKind,
  object: Geometry3DDescriptor,
) {
  const { width, height, depth } = object.dimensions;
  const parameters =
    object.source.kind === "primitive" ? object.source.parameters : {};
  const radialSegments = segmentCount(parameters.radialSegments, 32, 3);
  switch (primitive) {
    case "box":
      return new BoxGeometry(width, height, depth);
    case "sphere":
      return new SphereGeometry(
        0.5,
        radialSegments,
        Math.max(8, Math.floor(radialSegments / 2)),
      ).scale(width, height, depth);
    case "cylinder":
      return new CylinderGeometry(
        width / 2,
        width / 2,
        height,
        radialSegments,
      ).scale(1, 1, depth / width);
    case "cone":
      return new ConeGeometry(width / 2, height, radialSegments).scale(
        1,
        1,
        depth / width,
      );
    case "torus": {
      const tubularSegments = segmentCount(parameters.tubularSegments, 48, 3);
      return new TorusGeometry(
        0.35,
        0.15,
        radialSegments,
        tubularSegments,
      ).scale(width, height, depth / 0.3);
    }
  }
}

function sampleRevolveProfile(
  snapshot: VectorShapeSnapshot,
  curveSegments: number,
) {
  const source = snapshot.paths[0];
  if (!source || source.points.length < 2) {
    throw new Error("Revolve needs one profile path with at least 2 points.");
  }
  const points: Vector2[] = [];
  const append = (point: { x: number; y: number }) => {
    points.push(
      new Vector2(Math.max(0.0001, point.x), snapshot.height / 2 - point.y),
    );
  };
  append(source.points[0]);
  const segmentTotal = source.closed
    ? source.points.length
    : source.points.length - 1;
  for (let index = 0; index < segmentTotal; index += 1) {
    const from = source.points[index];
    const to = source.points[(index + 1) % source.points.length];
    const curved = Boolean(from.handleOut || to.handleIn);
    const samples = curved ? curveSegments : 1;
    for (let sample = 1; sample <= samples; sample += 1) {
      const amount = sample / samples;
      if (!curved) {
        append(to);
        continue;
      }
      const firstControl = from.handleOut ?? from;
      const secondControl = to.handleIn ?? to;
      const inverse = 1 - amount;
      append({
        x:
          inverse ** 3 * from.x +
          3 * inverse ** 2 * amount * firstControl.x +
          3 * inverse * amount ** 2 * secondControl.x +
          amount ** 3 * to.x,
        y:
          inverse ** 3 * from.y +
          3 * inverse ** 2 * amount * firstControl.y +
          3 * inverse * amount ** 2 * secondControl.y +
          amount ** 3 * to.y,
      });
    }
  }
  return points;
}

function fitGeometryToDimensions(
  geometry: BufferGeometry,
  object: Geometry3DDescriptor,
  preserveRevolveAxis = false,
) {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) return geometry;
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  geometry.translate(
    preserveRevolveAxis ? 0 : -center.x,
    -center.y,
    preserveRevolveAxis ? 0 : -center.z,
  );
  const target = object.dimensions;
  geometry.scale(
    target.width / finitePositive(size.x, target.width),
    target.height / finitePositive(size.y, target.height),
    target.depth / finitePositive(size.z, target.depth),
  );
  return geometry;
}

function vectorGeometry(object: Geometry3DDescriptor) {
  if (object.source.kind !== "vector") {
    throw new Error("Vector geometry requires a vector source.");
  }
  const { parameters, snapshot } = object.source;
  if (parameters.mode === "revolve") {
    const geometry = new LatheGeometry(
      sampleRevolveProfile(
        snapshot,
        segmentCount(parameters.curveSegments, 16, 2),
      ),
      segmentCount(parameters.segments, 32, 3),
      0,
      MathUtils.degToRad(Math.max(0.1, Math.min(360, parameters.angleDegrees))),
    );
    return fitGeometryToDimensions(geometry, object, true);
  }

  const shapes = vectorSnapshotToShapes(snapshot);
  if (!shapes.length) throw new Error("Vector source has no closed shape.");
  if (parameters.mode === "plane") {
    return fitGeometryToDimensions(
      new ShapeGeometry(shapes, segmentCount(parameters.curveSegments, 12, 1)),
      object,
    );
  }

  const depth = finitePositive(object.dimensions.depth, 1);
  if (parameters.mode === "inflate") {
    const amount = Math.max(0, Math.min(1, parameters.amount));
    const bevelThickness = Math.min(depth * 0.48, depth * 0.4 * amount);
    const bevelSize =
      Math.min(object.dimensions.width, object.dimensions.height) *
      0.18 *
      amount;
    return fitGeometryToDimensions(
      new ExtrudeGeometry(shapes, {
        bevelEnabled: amount > 0,
        bevelSegments: 6,
        bevelSize,
        bevelThickness,
        curveSegments: 16,
        depth: Math.max(0.001, depth - bevelThickness * 2),
        steps: 1,
      }),
      object,
    );
  }

  const geometry = new ExtrudeGeometry(shapes, {
    bevelEnabled: parameters.bevelEnabled,
    bevelSegments: segmentCount(parameters.bevelSegments, 2, 1),
    bevelSize: Math.max(0, Math.min(parameters.bevelSize, depth / 2)),
    bevelThickness: Math.max(0, Math.min(parameters.bevelThickness, depth / 2)),
    curveSegments: segmentCount(parameters.curveSegments, 12, 1),
    depth,
    steps: segmentCount(parameters.steps, 1, 1),
  });
  return fitGeometryToDimensions(geometry, object);
}

export function createGeometry3D(object: {
  dimensions: Object3DElement["dimensions"];
  source: Object3DSource;
}): BufferGeometry {
  for (const value of Object.values(object.dimensions)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error("3D object dimensions must be finite and positive.");
    }
  }
  if (object.source.kind === "asset") {
    throw new Error(
      "Asset geometry is loaded through GLTFLoader, not the factory.",
    );
  }
  const geometry =
    object.source.kind === "primitive"
      ? primitiveGeometry(object.source.primitive, object)
      : vectorGeometry(object);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
