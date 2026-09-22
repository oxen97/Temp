const DEFAULT_MAX_POSTER_SIDE = 512;
const MEDIA_LOAD_TIMEOUT_MS = 8_000;

export type MediaPosterKind = "image" | "video";

export type MediaPosterOptions = {
  kind?: MediaPosterKind;
  maxSide?: number;
};

type CloseableCanvasSource = CanvasImageSource & {
  close?: () => void;
};

type WebCodecsImageDecoder = {
  close: () => void;
  decode: (options: { frameIndex: number }) => Promise<{
    image: CloseableCanvasSource & {
      codedHeight?: number;
      codedWidth?: number;
      displayHeight?: number;
      displayWidth?: number;
    };
  }>;
};

type WebCodecsImageDecoderConstructor = new (options: {
  data: ArrayBuffer;
  type: string;
}) => WebCodecsImageDecoder;

function normalizeMaxSide(maxSide?: number) {
  return Number.isFinite(maxSide) && (maxSide ?? 0) > 0
    ? Math.max(1, Math.floor(maxSide!))
    : DEFAULT_MAX_POSTER_SIDE;
}

function inferMediaKind(file: File): MediaPosterKind | undefined {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";

  if (/\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name)) return "video";
  if (/\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(file.name)) return "image";
  return undefined;
}

function isGif(file: File) {
  return file.type.toLowerCase() === "image/gif" || /\.gif$/i.test(file.name);
}

function getPosterDimensions(width: number, height: number, maxSide: number) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return undefined;
  }

  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function drawPoster(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxSide: number,
) {
  const dimensions = getPosterDimensions(sourceWidth, sourceHeight, maxSide);
  if (!dimensions) return undefined;

  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const context = canvas.getContext("2d");
  if (!context) return undefined;

  context.drawImage(source, 0, 0, dimensions.width, dimensions.height);
  const poster = canvas.toDataURL("image/png");
  return poster.startsWith("data:image/png") ? poster : undefined;
}

function waitForImage(sourceUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Timed out while decoding the image thumbnail."));
    }, MEDIA_LOAD_TIMEOUT_MS);

    const cleanup = () => {
      window.clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
    };

    image.decoding = "async";
    image.onload = () => {
      cleanup();
      resolve(image);
    };
    image.onerror = () => {
      cleanup();
      reject(new Error("Unable to decode the image thumbnail."));
    };
    image.src = sourceUrl;
  });
}

async function captureGifPoster(
  file: File,
  sourceUrl: string,
  maxSide: number,
) {
  const ImageDecoderClass = (
    globalThis as typeof globalThis & {
      ImageDecoder?: WebCodecsImageDecoderConstructor;
    }
  ).ImageDecoder;

  if (ImageDecoderClass) {
    let decoder: WebCodecsImageDecoder | undefined;
    let frame:
      | (CloseableCanvasSource & {
          codedHeight?: number;
          codedWidth?: number;
          displayHeight?: number;
          displayWidth?: number;
        })
      | undefined;

    try {
      decoder = new ImageDecoderClass({
        data: await file.arrayBuffer(),
        type: file.type || "image/gif",
      });
      frame = (await decoder.decode({ frameIndex: 0 })).image;
      const width = frame.displayWidth ?? frame.codedWidth ?? 0;
      const height = frame.displayHeight ?? frame.codedHeight ?? 0;
      return drawPoster(frame, width, height, maxSide);
    } catch {
      // Fall through to createImageBitmap/HTMLImageElement for browsers that
      // expose ImageDecoder but cannot decode this particular GIF.
    } finally {
      frame?.close?.();
      decoder?.close();
    }
  }

  if (typeof createImageBitmap === "function") {
    let bitmap: ImageBitmap | undefined;
    try {
      bitmap = await createImageBitmap(file);
      return drawPoster(bitmap, bitmap.width, bitmap.height, maxSide);
    } catch {
      // The image element fallback covers browsers without GIF ImageBitmap.
    } finally {
      bitmap?.close();
    }
  }

  const image = await waitForImage(sourceUrl);
  return drawPoster(image, image.naturalWidth, image.naturalHeight, maxSide);
}

function waitForVideoFrame(sourceUrl: string) {
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    const video = document.createElement("video");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Timed out while decoding the video thumbnail."));
    }, MEDIA_LOAD_TIMEOUT_MS);

    const cleanup = () => {
      window.clearTimeout(timeout);
      video.onloadeddata = null;
      video.onerror = null;
    };

    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadeddata = () => {
      cleanup();
      resolve(video);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Unable to decode the video thumbnail."));
    };
    video.src = sourceUrl;
    video.load();
  });
}

async function captureVideoPoster(sourceUrl: string, maxSide: number) {
  const video = await waitForVideoFrame(sourceUrl);
  try {
    return drawPoster(video, video.videoWidth, video.videoHeight, maxSide);
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
}

/**
 * Creates a static thumbnail for an uploaded image or video.
 *
 * Static images reuse their object URL. Animated GIFs and videos are decoded
 * at their first frame and returned as a bounded PNG data URL. The caller owns
 * the object URL and remains responsible for revoking it.
 */
export async function createMediaPoster(
  file: File,
  sourceUrl: string,
  options: MediaPosterOptions = {},
): Promise<string | undefined> {
  try {
    if (!file || !sourceUrl) return undefined;

    const kind = options.kind ?? inferMediaKind(file);
    if (!kind) return undefined;
    if (kind === "image" && !isGif(file)) return sourceUrl;

    const maxSide = normalizeMaxSide(options.maxSide);
    return kind === "video"
      ? await captureVideoPoster(sourceUrl, maxSide)
      : await captureGifPoster(file, sourceUrl, maxSide);
  } catch {
    return undefined;
  }
}
