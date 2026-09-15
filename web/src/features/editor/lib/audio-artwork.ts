export type EmbeddedAudioArtwork = {
  blob: Blob;
  mimeType: string;
};

type ArtworkCandidate = {
  bytes: Uint8Array<ArrayBuffer>;
  mimeType: string;
  pictureType: number;
};

type Atom = {
  end: number;
  payloadStart: number;
  type: string;
};

const MAX_ARTWORK_BYTES = 8 * 1024 * 1024;
const MAX_METADATA_BYTES = 32 * 1024 * 1024;
const MAX_CONTAINER_ITEMS = 4096;
const MAX_ATOM_DEPTH = 6;

function hasRange(offset: number, length: number, parentEnd: number): boolean {
  return (
    Number.isSafeInteger(offset) &&
    Number.isSafeInteger(length) &&
    Number.isSafeInteger(parentEnd) &&
    offset >= 0 &&
    length >= 0 &&
    offset <= parentEnd &&
    length <= parentEnd - offset
  );
}

async function readBytes(blob: Blob, offset: number, length: number) {
  if (!hasRange(offset, length, blob.size)) return null;
  const buffer = await blob.slice(offset, offset + length).arrayBuffer();
  return new Uint8Array(buffer);
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  if (!hasRange(offset, length, bytes.length)) return "";
  let value = "";
  for (let index = offset; index < offset + length; index += 1) {
    value += String.fromCharCode(bytes[index]);
  }
  return value;
}

function readUint24BE(bytes: Uint8Array, offset: number) {
  if (!hasRange(offset, 3, bytes.length)) return null;
  return bytes[offset] * 65_536 + bytes[offset + 1] * 256 + bytes[offset + 2];
}

function readUint32BE(bytes: Uint8Array, offset: number) {
  if (!hasRange(offset, 4, bytes.length)) return null;
  return (
    bytes[offset] * 16_777_216 +
    bytes[offset + 1] * 65_536 +
    bytes[offset + 2] * 256 +
    bytes[offset + 3]
  );
}

function readUint32LE(bytes: Uint8Array, offset: number) {
  if (!hasRange(offset, 4, bytes.length)) return null;
  return (
    bytes[offset] +
    bytes[offset + 1] * 256 +
    bytes[offset + 2] * 65_536 +
    bytes[offset + 3] * 16_777_216
  );
}

function readSyncSafe32(bytes: Uint8Array, offset: number) {
  if (!hasRange(offset, 4, bytes.length)) return null;
  const values = bytes.subarray(offset, offset + 4);
  if ([...values].some((value) => (value & 0x80) !== 0)) return null;
  return (
    values[0] * 2_097_152 + values[1] * 16_384 + values[2] * 128 + values[3]
  );
}

function removeUnsynchronization(bytes: Uint8Array) {
  const restored = new Uint8Array(bytes.length);
  let writeOffset = 0;
  for (let readOffset = 0; readOffset < bytes.length; readOffset += 1) {
    const value = bytes[readOffset];
    restored[writeOffset] = value;
    writeOffset += 1;
    if (
      value === 0xff &&
      bytes[readOffset + 1] === 0x00 &&
      readOffset + 1 < bytes.length
    ) {
      readOffset += 1;
    }
  }
  return restored.slice(0, writeOffset);
}

function detectImageMime(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    ascii(bytes, 1, 3) === "PNG" &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 6 &&
    (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a")
  ) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 4) === "WEBP"
  ) {
    return "image/webp";
  }
  if (bytes.length >= 2 && ascii(bytes, 0, 2) === "BM") {
    return "image/bmp";
  }
  return null;
}

function createCandidate(
  bytes: Uint8Array,
  pictureType: number,
): ArtworkCandidate | null {
  if (bytes.length === 0 || bytes.length > MAX_ARTWORK_BYTES) return null;
  const mimeType = detectImageMime(bytes);
  if (!mimeType) return null;
  return {
    bytes: new Uint8Array(bytes),
    mimeType,
    pictureType,
  };
}

function candidatePriority(candidate: ArtworkCandidate) {
  if (candidate.pictureType === 3) return 2;
  if (candidate.pictureType === 0) return 1;
  return 0;
}

function chooseCandidate(
  current: ArtworkCandidate | null,
  next: ArtworkCandidate | null,
) {
  if (!next) return current;
  if (!current || candidatePriority(next) > candidatePriority(current)) {
    return next;
  }
  return current;
}

function descriptionEnd(bytes: Uint8Array, start: number, encoding: number) {
  if (encoding === 0 || encoding === 3) {
    const terminator = bytes.indexOf(0, start);
    return terminator < 0 ? null : terminator + 1;
  }
  for (let offset = start; offset + 1 < bytes.length; offset += 2) {
    if (bytes[offset] === 0 && bytes[offset + 1] === 0) return offset + 2;
  }
  return null;
}

function parseId3PicturePayload(payload: Uint8Array, version: number) {
  if (payload.length < (version === 2 ? 6 : 5)) return null;
  const encoding = payload[0];
  if (encoding > 3 || (version < 4 && encoding > 1)) return null;
  let pictureTypeOffset = 0;
  let descriptionStart = 0;

  if (version === 2) {
    const format = ascii(payload, 1, 3).toUpperCase();
    if (format === "-->") return null;
    pictureTypeOffset = 4;
    descriptionStart = 5;
  } else {
    const mimeEnd = payload.indexOf(0, 1);
    if (mimeEnd < 0 || mimeEnd + 1 >= payload.length) return null;
    const declaredMime = ascii(payload, 1, mimeEnd - 1).toLowerCase();
    if (declaredMime === "-->") return null;
    pictureTypeOffset = mimeEnd + 1;
    descriptionStart = pictureTypeOffset + 1;
  }

  const imageStart = descriptionEnd(payload, descriptionStart, encoding);
  if (imageStart === null || imageStart >= payload.length) return null;
  return createCandidate(
    payload.subarray(imageStart),
    payload[pictureTypeOffset],
  );
}

function isFrameIdentifier(identifier: string, length: number) {
  return (
    identifier.length === length &&
    [...identifier].every((character) => /[A-Z0-9]/.test(character))
  );
}

function parseId3Tag(tag: Uint8Array): ArtworkCandidate | null {
  if (
    tag.length < 10 ||
    ascii(tag, 0, 3) !== "ID3" ||
    ![2, 3, 4].includes(tag[3])
  ) {
    return null;
  }
  const version = tag[3];
  const flags = tag[5];
  if (version === 2 && (flags & 0x40) !== 0) return null;
  const tagSize = readSyncSafe32(tag, 6);
  if (
    tagSize === null ||
    tagSize > MAX_METADATA_BYTES ||
    !hasRange(10, tagSize, tag.length)
  ) {
    return null;
  }

  const rawBody = tag.subarray(10, 10 + tagSize);
  const body =
    version < 4 && (flags & 0x80) !== 0
      ? removeUnsynchronization(rawBody)
      : rawBody;
  let offset = 0;
  if ((flags & 0x40) !== 0 && version >= 3) {
    const extendedSize =
      version === 3 ? readUint32BE(body, 0) : readSyncSafe32(body, 0);
    if (extendedSize === null) return null;
    offset = version === 3 ? extendedSize + 4 : extendedSize;
    if (!hasRange(offset, 0, body.length)) return null;
  }

  let best: ArtworkCandidate | null = null;
  for (let frameCount = 0; frameCount < MAX_CONTAINER_ITEMS; frameCount += 1) {
    const headerSize = version === 2 ? 6 : 10;
    if (!hasRange(offset, headerSize, body.length)) break;
    const identifierLength = version === 2 ? 3 : 4;
    const identifier = ascii(body, offset, identifierLength);
    if (!isFrameIdentifier(identifier, identifierLength)) break;
    const frameSize =
      version === 2
        ? readUint24BE(body, offset + 3)
        : version === 3
          ? readUint32BE(body, offset + 4)
          : readSyncSafe32(body, offset + 4);
    if (frameSize === null || frameSize === 0) break;
    const payloadStart = offset + headerSize;
    if (!hasRange(payloadStart, frameSize, body.length)) break;

    const isPictureFrame =
      (version === 2 && identifier === "PIC") ||
      (version >= 3 && identifier === "APIC");
    if (isPictureFrame) {
      const formatFlags = version === 2 ? 0 : body[offset + 9];
      const compressedOrEncrypted =
        version === 3
          ? (formatFlags & 0xc0) !== 0
          : version === 4
            ? (formatFlags & 0x0c) !== 0
            : false;
      if (!compressedOrEncrypted) {
        let payload = body.subarray(payloadStart, payloadStart + frameSize);
        if (version === 3 && (formatFlags & 0x20) !== 0) {
          if (payload.length < 1) return best;
          payload = payload.subarray(1);
        }
        if (version === 4) {
          if ((flags & 0x80) !== 0 || (formatFlags & 0x02) !== 0) {
            payload = removeUnsynchronization(payload);
          }
          if ((formatFlags & 0x40) !== 0) {
            if (payload.length < 1) return best;
            payload = payload.subarray(1);
          }
          if ((formatFlags & 0x01) !== 0) {
            if (payload.length < 4 || readSyncSafe32(payload, 0) === null) {
              return best;
            }
            payload = payload.subarray(4);
          }
        }
        best = chooseCandidate(best, parseId3PicturePayload(payload, version));
        if (best && candidatePriority(best) === 2) return best;
      }
    }
    offset = payloadStart + frameSize;
  }
  return best;
}

async function extractId3Artwork(blob: Blob) {
  const header = await readBytes(blob, 0, Math.min(10, blob.size));
  if (!header || header.length < 10 || ascii(header, 0, 3) !== "ID3") {
    return null;
  }
  const tagSize = readSyncSafe32(header, 6);
  if (
    tagSize === null ||
    tagSize > MAX_METADATA_BYTES ||
    !hasRange(0, 10 + tagSize, blob.size)
  ) {
    return null;
  }
  const tag = await readBytes(blob, 0, 10 + tagSize);
  return tag ? parseId3Tag(tag) : null;
}

function parseFlacPicture(block: Uint8Array) {
  let offset = 0;
  const takeUint32 = () => {
    const value = readUint32BE(block, offset);
    if (value !== null) offset += 4;
    return value;
  };
  const pictureType = takeUint32();
  const mimeLength = takeUint32();
  if (
    pictureType === null ||
    mimeLength === null ||
    !hasRange(offset, mimeLength, block.length)
  ) {
    return null;
  }
  const declaredMime = ascii(block, offset, mimeLength).toLowerCase();
  if (declaredMime === "-->") return null;
  offset += mimeLength;
  const descriptionLength = takeUint32();
  if (
    descriptionLength === null ||
    !hasRange(offset, descriptionLength, block.length)
  ) {
    return null;
  }
  offset += descriptionLength;
  if (!hasRange(offset, 16, block.length)) return null;
  offset += 16;
  const imageLength = takeUint32();
  if (
    imageLength === null ||
    imageLength > MAX_ARTWORK_BYTES ||
    !hasRange(offset, imageLength, block.length) ||
    offset + imageLength !== block.length
  ) {
    return null;
  }
  return createCandidate(
    block.subarray(offset, offset + imageLength),
    pictureType,
  );
}

async function extractFlacArtwork(blob: Blob) {
  const signature = await readBytes(blob, 0, Math.min(4, blob.size));
  if (!signature || ascii(signature, 0, 4) !== "fLaC") return null;
  let offset = 4;
  let metadataBytes = 0;
  let best: ArtworkCandidate | null = null;
  for (let blockCount = 0; blockCount < MAX_CONTAINER_ITEMS; blockCount += 1) {
    const header = await readBytes(blob, offset, 4);
    if (!header || header.length < 4) return best;
    const isLast = (header[0] & 0x80) !== 0;
    const blockType = header[0] & 0x7f;
    const blockLength = readUint24BE(header, 1);
    if (
      blockLength === null ||
      !hasRange(offset + 4, blockLength, blob.size) ||
      metadataBytes + 4 + blockLength > MAX_METADATA_BYTES
    ) {
      return best;
    }
    if (blockCount === 0 && (blockType !== 0 || blockLength !== 34))
      return null;
    if (blockType === 6 && blockLength <= MAX_ARTWORK_BYTES + 4096) {
      const block = await readBytes(blob, offset + 4, blockLength);
      best = chooseCandidate(best, block ? parseFlacPicture(block) : null);
      if (best && candidatePriority(best) === 2) return best;
    }
    offset += 4 + blockLength;
    metadataBytes += 4 + blockLength;
    if (isLast) break;
  }
  return best;
}

async function readAtom(
  blob: Blob,
  offset: number,
  parentEnd: number,
  topLevel: boolean,
): Promise<Atom | null> {
  if (!hasRange(offset, 8, parentEnd)) return null;
  const header = await readBytes(blob, offset, 8);
  if (!header) return null;
  const size32 = readUint32BE(header, 0);
  if (size32 === null) return null;
  const type = ascii(header, 4, 4);
  let headerSize = 8;
  let atomSize = size32;
  if (size32 === 1) {
    if (!hasRange(offset, 16, parentEnd)) return null;
    const extendedSize = await readBytes(blob, offset + 8, 8);
    if (!extendedSize) return null;
    const high = readUint32BE(extendedSize, 0);
    const low = readUint32BE(extendedSize, 4);
    if (high === null || low === null) return null;
    atomSize = high * 4_294_967_296 + low;
    headerSize = 16;
  } else if (size32 === 0) {
    if (!topLevel) return null;
    atomSize = parentEnd - offset;
  }
  if (
    !Number.isSafeInteger(atomSize) ||
    atomSize < headerSize ||
    !hasRange(offset, atomSize, parentEnd)
  ) {
    return null;
  }
  return {
    end: offset + atomSize,
    payloadStart: offset + headerSize,
    type,
  };
}

async function scanMp4Atoms(
  blob: Blob,
  start: number,
  end: number,
  depth: number,
  insideCover: boolean,
  counter: { value: number },
  topLevel = false,
): Promise<ArtworkCandidate | null> {
  if (depth > MAX_ATOM_DEPTH) return null;
  let offset = start;
  while (hasRange(offset, 8, end) && counter.value < MAX_CONTAINER_ITEMS) {
    counter.value += 1;
    const atom = await readAtom(blob, offset, end, topLevel);
    if (!atom || atom.end <= offset) return null;
    if (insideCover && atom.type === "data") {
      const imageStart = atom.payloadStart + 8;
      const imageLength = atom.end - imageStart;
      if (
        imageLength > 0 &&
        imageLength <= MAX_ARTWORK_BYTES &&
        hasRange(imageStart, imageLength, atom.end)
      ) {
        const image = await readBytes(blob, imageStart, imageLength);
        const candidate = image ? createCandidate(image, 3) : null;
        if (candidate) return candidate;
      }
    }
    const isContainer = ["moov", "udta", "meta", "ilst", "covr"].includes(
      atom.type,
    );
    if (isContainer) {
      const childStart = atom.payloadStart + (atom.type === "meta" ? 4 : 0);
      if (hasRange(childStart, 0, atom.end)) {
        const candidate = await scanMp4Atoms(
          blob,
          childStart,
          atom.end,
          depth + 1,
          insideCover || atom.type === "covr",
          counter,
        );
        if (candidate) return candidate;
      }
    }
    offset = atom.end;
  }
  return null;
}

async function extractMp4Artwork(blob: Blob) {
  const firstAtom = await readAtom(blob, 0, blob.size, true);
  if (!firstAtom || firstAtom.type !== "ftyp") return null;
  return scanMp4Atoms(blob, 0, blob.size, 0, false, { value: 0 }, true);
}

async function extractWaveArtwork(blob: Blob) {
  const signature = await readBytes(blob, 0, Math.min(12, blob.size));
  if (
    !signature ||
    signature.length < 12 ||
    ascii(signature, 0, 4) !== "RIFF" ||
    ascii(signature, 8, 4) !== "WAVE"
  ) {
    return null;
  }
  let offset = 12;
  for (let chunkCount = 0; chunkCount < MAX_CONTAINER_ITEMS; chunkCount += 1) {
    const header = await readBytes(blob, offset, 8);
    if (!header || header.length < 8) break;
    const chunkType = ascii(header, 0, 4);
    const chunkSize = readUint32LE(header, 4);
    if (chunkSize === null || !hasRange(offset + 8, chunkSize, blob.size)) {
      break;
    }
    if (
      (chunkType === "ID3 " || chunkType === "id3 ") &&
      chunkSize <= MAX_METADATA_BYTES
    ) {
      const tag = await readBytes(blob, offset + 8, chunkSize);
      const candidate = tag ? parseId3Tag(tag) : null;
      if (candidate) return candidate;
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  return null;
}

function toArtwork(candidate: ArtworkCandidate | null) {
  if (!candidate) return null;
  return {
    blob: new Blob([candidate.bytes], { type: candidate.mimeType }),
    mimeType: candidate.mimeType,
  } satisfies EmbeddedAudioArtwork;
}

export async function extractEmbeddedAudioArtwork(
  file: Blob,
): Promise<EmbeddedAudioArtwork | null> {
  try {
    const signature = await readBytes(file, 0, Math.min(12, file.size));
    if (!signature) return null;
    if (ascii(signature, 0, 3) === "ID3") {
      return toArtwork(await extractId3Artwork(file));
    }
    if (ascii(signature, 0, 4) === "fLaC") {
      return toArtwork(await extractFlacArtwork(file));
    }
    if (
      ascii(signature, 0, 4) === "RIFF" &&
      ascii(signature, 8, 4) === "WAVE"
    ) {
      return toArtwork(await extractWaveArtwork(file));
    }
    if (ascii(signature, 4, 4) === "ftyp") {
      return toArtwork(await extractMp4Artwork(file));
    }
    return null;
  } catch {
    return null;
  }
}
