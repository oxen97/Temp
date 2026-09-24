import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";

const weights = [
  [1, 0, 0],
  [0.5, 0.5, 0],
  [0.5, 0, 0.5],
  [0.5, 0.5, 0],
  [0, 1, 0],
  [0, 0.5, 0.5],
  [0.5, 0, 0.5],
  [0, 0.5, 0.5],
  [0, 0, 1],
  [0.5, 0.5, 0],
  [0, 0.5, 0.5],
  [0.5, 0, 0.5],
];

/** Refine sparse static meshes, retaining material groups, UVs and morph data. */
export function subdivideDeformableGeometry(
  source: BufferGeometry,
): BufferGeometry {
  const count =
    (source.index?.count ?? source.getAttribute("position").count) / 3;
  if (count > 512 || source.hasAttribute("skinIndex")) return source.clone();
  let geometry = source.index ? source.toNonIndexed() : source.clone();
  geometry.computeBoundingBox();
  const threshold =
    (geometry.boundingBox?.getSize(new Vector3()).length() ?? 0) / 12;
  const a = new Vector3();
  const b = new Vector3();
  for (let pass = 0; pass < 4; pass += 1) {
    const position = geometry.getAttribute("position");
    if ((position.count / 3) * 4 > 4096) break;
    let longest = 0;
    for (let index = 0; index < position.count; index += 3) {
      for (let edge = 0; edge < 3; edge += 1) {
        a.fromBufferAttribute(position, index + edge);
        b.fromBufferAttribute(position, index + ((edge + 1) % 3));
        longest = Math.max(longest, a.distanceTo(b));
      }
    }
    if (longest <= threshold || longest === 0) break;
    const interpolate = (
      attribute: ReturnType<BufferGeometry["getAttribute"]>,
    ) => {
      const result = new Float32BufferAttribute(
        new Float32Array(attribute.count * 4 * attribute.itemSize),
        attribute.itemSize,
      );
      for (let triangle = 0; triangle < attribute.count / 3; triangle += 1) {
        for (let vertex = 0; vertex < weights.length; vertex += 1) {
          for (
            let component = 0;
            component < attribute.itemSize;
            component += 1
          ) {
            result.setComponent(
              triangle * 12 + vertex,
              component,
              attribute.getComponent(triangle * 3, component) *
                weights[vertex][0] +
                attribute.getComponent(triangle * 3 + 1, component) *
                  weights[vertex][1] +
                attribute.getComponent(triangle * 3 + 2, component) *
                  weights[vertex][2],
            );
          }
        }
      }
      return result;
    };
    const next = geometry.clone();
    for (const [name, attribute] of Object.entries(geometry.attributes))
      next.setAttribute(name, interpolate(attribute));
    for (const [name, attributes] of Object.entries(geometry.morphAttributes))
      next.morphAttributes[name as keyof typeof next.morphAttributes] =
        attributes.map(interpolate);
    next.clearGroups();
    for (const group of geometry.groups)
      next.addGroup(group.start * 4, group.count * 4, group.materialIndex);
    next.setDrawRange(
      geometry.drawRange.start * 4,
      geometry.drawRange.count * 4,
    );
    geometry.dispose();
    geometry = next;
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
