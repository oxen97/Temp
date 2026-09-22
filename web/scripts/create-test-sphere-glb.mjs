import { writeFileSync } from "node:fs";

const outputPath = process.argv[2];
if (!outputPath) {
  throw new Error("Usage: node scripts/create-test-sphere-glb.mjs <output.glb>");
}

const longitude = 32;
const latitude = 20;
const positions = [];
const normals = [];
const indices = [];

for (let row = 0; row <= latitude; row += 1) {
  const polar = (Math.PI * row) / latitude;
  for (let column = 0; column <= longitude; column += 1) {
    const azimuth = (2 * Math.PI * column) / longitude;
    const x = Math.sin(polar) * Math.cos(azimuth);
    const y = Math.cos(polar);
    const z = Math.sin(polar) * Math.sin(azimuth);
    positions.push(x, y, z);
    normals.push(x, y, z);
  }
}

for (let row = 0; row < latitude; row += 1) {
  for (let column = 0; column < longitude; column += 1) {
    const a = row * (longitude + 1) + column;
    const b = a + longitude + 1;
    indices.push(a, b + 1, b, a, a + 1, b + 1);
  }
}

const positionBytes = Buffer.from(new Float32Array(positions).buffer);
const normalBytes = Buffer.from(new Float32Array(normals).buffer);
const indexBytes = Buffer.from(new Uint16Array(indices).buffer);
const binarySize = positionBytes.length + normalBytes.length + indexBytes.length;
const binaryPadding = (4 - (binarySize % 4)) % 4;
const binary = Buffer.concat([
  positionBytes,
  normalBytes,
  indexBytes,
  Buffer.alloc(binaryPadding),
]);

const document = {
  asset: { generator: "AMOUS test sphere", version: "2.0" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: "Test Sphere" }],
  meshes: [{
    name: "Test Sphere",
    primitives: [{
      attributes: { POSITION: 0, NORMAL: 1 },
      indices: 2,
      material: 0,
      mode: 4,
    }],
  }],
  materials: [{
    name: "Purple ceramic",
    pbrMetallicRoughness: {
      baseColorFactor: [0.64, 0.31, 0.91, 1],
      metallicFactor: 0.08,
      roughnessFactor: 0.42,
    },
    doubleSided: true,
  }],
  accessors: [
    {
      bufferView: 0,
      componentType: 5126,
      count: positions.length / 3,
      max: [1, 1, 1],
      min: [-1, -1, -1],
      type: "VEC3",
    },
    {
      bufferView: 1,
      componentType: 5126,
      count: normals.length / 3,
      type: "VEC3",
    },
    {
      bufferView: 2,
      componentType: 5123,
      count: indices.length,
      type: "SCALAR",
    },
  ],
  bufferViews: [
    { buffer: 0, byteLength: positionBytes.length, byteOffset: 0, target: 34962 },
    {
      buffer: 0,
      byteLength: normalBytes.length,
      byteOffset: positionBytes.length,
      target: 34962,
    },
    {
      buffer: 0,
      byteLength: indexBytes.length,
      byteOffset: positionBytes.length + normalBytes.length,
      target: 34963,
    },
  ],
  buffers: [{ byteLength: binary.length }],
};

const json = Buffer.from(JSON.stringify(document), "utf8");
const jsonPadding = (4 - (json.length % 4)) % 4;
const jsonChunk = Buffer.concat([json, Buffer.alloc(jsonPadding, 0x20)]);
const totalLength = 12 + 8 + jsonChunk.length + 8 + binary.length;
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(totalLength, 8);
const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(jsonChunk.length, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4);
const binaryHeader = Buffer.alloc(8);
binaryHeader.writeUInt32LE(binary.length, 0);
binaryHeader.writeUInt32LE(0x004e4942, 4);

writeFileSync(
  outputPath,
  Buffer.concat([header, jsonHeader, jsonChunk, binaryHeader, binary]),
);
process.stdout.write(`${outputPath}\n`);
