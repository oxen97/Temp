import { describe, expect, it } from "vitest";

import { extractEmbeddedAudioArtwork } from "./audio-artwork";

const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function asciiBytes(value: string) {
  return Uint8Array.from(value, (character) => character.charCodeAt(0));
}

function base64Bytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function concatBytes(...parts: Uint8Array[]) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
}

function uint24BE(value: number) {
  return Uint8Array.of(
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  );
}

function uint32BE(value: number) {
  return Uint8Array.of(
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  );
}

function uint32LE(value: number) {
  return Uint8Array.of(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
}

function syncSafe32(value: number) {
  return Uint8Array.of(
    (value >>> 21) & 0x7f,
    (value >>> 14) & 0x7f,
    (value >>> 7) & 0x7f,
    value & 0x7f,
  );
}

function id3PicturePayload(
  version: 2 | 3 | 4,
  pictureType: number,
  image: Uint8Array,
) {
  return version === 2
    ? concatBytes(
        Uint8Array.of(0),
        asciiBytes("PNG"),
        Uint8Array.of(pictureType, 0),
        image,
      )
    : concatBytes(
        Uint8Array.of(0),
        asciiBytes("image/jpeg"),
        Uint8Array.of(0, pictureType, 0),
        image,
      );
}

function id3PictureFrame(
  version: 2 | 3 | 4,
  pictureType: number,
  image: Uint8Array,
) {
  const payload = id3PicturePayload(version, pictureType, image);
  if (version === 2) {
    return concatBytes(asciiBytes("PIC"), uint24BE(payload.length), payload);
  }
  return concatBytes(
    asciiBytes("APIC"),
    version === 4 ? syncSafe32(payload.length) : uint32BE(payload.length),
    Uint8Array.of(0, 0),
    payload,
  );
}

function id3Tag(version: 2 | 3 | 4, ...frames: Uint8Array[]) {
  const body = concatBytes(...frames);
  return concatBytes(
    asciiBytes("ID3"),
    Uint8Array.of(version, 0, 0),
    syncSafe32(body.length),
    body,
  );
}

function mp4Atom(type: string, ...payload: Uint8Array[]) {
  const body = concatBytes(...payload);
  return concatBytes(uint32BE(body.length + 8), asciiBytes(type), body);
}

function flacMetadataBlock(type: number, last: boolean, payload: Uint8Array) {
  return concatBytes(
    Uint8Array.of(type | (last ? 0x80 : 0)),
    uint24BE(payload.length),
    payload,
  );
}

function flacPicture(pictureType: number, image: Uint8Array) {
  const mime = asciiBytes("image/png");
  return concatBytes(
    uint32BE(pictureType),
    uint32BE(mime.length),
    mime,
    uint32BE(0),
    uint32BE(1),
    uint32BE(1),
    uint32BE(32),
    uint32BE(0),
    uint32BE(image.length),
    image,
  );
}

async function expectPngArtwork(file: Blob, expected: Uint8Array) {
  const artwork = await extractEmbeddedAudioArtwork(file);
  expect(artwork?.mimeType).toBe("image/png");
  expect(artwork?.blob.type).toBe("image/png");
  expect(
    artwork ? new Uint8Array(await artwork.blob.arrayBuffer()) : null,
  ).toEqual(expected);
}

describe("extractEmbeddedAudioArtwork", () => {
  const png = base64Bytes(PNG_BASE64);

  it.each([2, 3, 4] as const)(
    "extracts an ID3v2.%i embedded picture and trusts its image signature",
    async (version) => {
      const tag = id3Tag(version, id3PictureFrame(version, 3, png));
      await expectPngArtwork(new Blob([tag], { type: "audio/mpeg" }), png);
    },
  );

  it("prefers the front cover when an ID3 tag contains multiple pictures", async () => {
    const otherPicture = concatBytes(png, Uint8Array.of(1));
    const tag = id3Tag(
      3,
      id3PictureFrame(3, 4, otherPicture),
      id3PictureFrame(3, 3, png),
    );
    await expectPngArtwork(new Blob([tag], { type: "audio/mpeg" }), png);
  });

  it("extracts a grouped ID3v2.3 picture frame", async () => {
    const payload = concatBytes(Uint8Array.of(7), id3PicturePayload(3, 3, png));
    const frame = concatBytes(
      asciiBytes("APIC"),
      uint32BE(payload.length),
      Uint8Array.of(0, 0x20),
      payload,
    );
    await expectPngArtwork(
      new Blob([id3Tag(3, frame)], { type: "audio/mpeg" }),
      png,
    );
  });

  it("extracts a FLAC PICTURE metadata block", async () => {
    const file = concatBytes(
      asciiBytes("fLaC"),
      flacMetadataBlock(0, false, new Uint8Array(34)),
      flacMetadataBlock(6, true, flacPicture(3, png)),
    );
    await expectPngArtwork(new Blob([file], { type: "audio/flac" }), png);
  });

  it("extracts an M4A covr data atom", async () => {
    const data = mp4Atom("data", new Uint8Array(8), png);
    const cover = mp4Atom("covr", data);
    const itemList = mp4Atom("ilst", cover);
    const metadata = mp4Atom("meta", new Uint8Array(4), itemList);
    const userData = mp4Atom("udta", metadata);
    const movie = mp4Atom("moov", userData);
    const file = concatBytes(mp4Atom("ftyp"), movie);

    await expectPngArtwork(new Blob([file], { type: "audio/mp4" }), png);
  });

  it("extracts an ID3 picture stored in a WAV ID3 chunk", async () => {
    const tag = id3Tag(3, id3PictureFrame(3, 3, png));
    const paddedTag =
      tag.length % 2 === 0 ? tag : concatBytes(tag, Uint8Array.of(0));
    const chunks = concatBytes(
      asciiBytes("ID3 "),
      uint32LE(tag.length),
      paddedTag,
    );
    const wave = concatBytes(
      asciiBytes("RIFF"),
      uint32LE(4 + chunks.length),
      asciiBytes("WAVE"),
      chunks,
    );

    await expectPngArtwork(new Blob([wave], { type: "audio/wav" }), png);
  });

  it("returns null for audio without artwork and for malformed metadata", async () => {
    const waveWithoutArtwork = concatBytes(
      asciiBytes("RIFF"),
      uint32LE(4),
      asciiBytes("WAVE"),
    );
    const truncatedId3 = concatBytes(
      asciiBytes("ID3"),
      Uint8Array.of(3, 0, 0),
      syncSafe32(256),
    );
    const urlPayload = concatBytes(
      Uint8Array.of(0),
      asciiBytes("-->"),
      Uint8Array.of(0, 3, 0),
      asciiBytes("https://example.com/cover.png"),
    );
    const urlFrame = concatBytes(
      asciiBytes("APIC"),
      uint32BE(urlPayload.length),
      Uint8Array.of(0, 0),
      urlPayload,
    );
    const invalidEncodingPayload = concatBytes(
      Uint8Array.of(5),
      asciiBytes("image/png"),
      Uint8Array.of(0, 3, 0, 0),
      png,
    );
    const invalidEncodingFrame = concatBytes(
      asciiBytes("APIC"),
      uint32BE(invalidEncodingPayload.length),
      Uint8Array.of(0, 0),
      invalidEncodingPayload,
    );

    await expect(
      extractEmbeddedAudioArtwork(new Blob([waveWithoutArtwork])),
    ).resolves.toBeNull();
    await expect(
      extractEmbeddedAudioArtwork(new Blob([truncatedId3])),
    ).resolves.toBeNull();
    await expect(
      extractEmbeddedAudioArtwork(new Blob([id3Tag(3, urlFrame)])),
    ).resolves.toBeNull();
    await expect(
      extractEmbeddedAudioArtwork(new Blob([id3Tag(3, invalidEncodingFrame)])),
    ).resolves.toBeNull();
    await expect(
      extractEmbeddedAudioArtwork(new Blob([asciiBytes("not audio metadata")])),
    ).resolves.toBeNull();
  });
});
