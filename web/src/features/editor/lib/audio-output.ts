import type { SoundOutputQuality } from "@/features/editor/store/editor-store";

const TARGET_RMS_DB = -18;
const PEAK_CEILING_DB = -1;
const MAX_NORMALIZATION_GAIN = 8;

export type NormalizedPcm = {
  channels: Float32Array[];
  gain: number;
  peak: number;
  rms: number;
};

export type ProcessedAudioOutput = {
  bitrateKbps: number;
  blob: Blob;
  durationSeconds: number;
  normalizationGain: number;
};

export function audioOutputBitrate(quality: SoundOutputQuality) {
  if (quality === "high") return 320;
  if (quality === "medium") return 192;
  return 128;
}

export function normalizePcmForOutput(
  sourceChannels: readonly Float32Array[],
): NormalizedPcm {
  if (sourceChannels.length === 0) {
    return { channels: [], gain: 1, peak: 0, rms: 0 };
  }

  let peak = 0;
  let squaredSum = 0;
  let sampleCount = 0;
  sourceChannels.forEach((channel) => {
    for (let index = 0; index < channel.length; index += 1) {
      const sample = Number.isFinite(channel[index]) ? channel[index] : 0;
      const magnitude = Math.abs(sample);
      peak = Math.max(peak, magnitude);
      squaredSum += sample * sample;
      sampleCount += 1;
    }
  });

  const rms = sampleCount > 0 ? Math.sqrt(squaredSum / sampleCount) : 0;
  if (rms < 1e-8 || peak < 1e-8) {
    return {
      channels: sourceChannels.map((channel) => new Float32Array(channel)),
      gain: 1,
      peak,
      rms,
    };
  }

  const targetRms = 10 ** (TARGET_RMS_DB / 20);
  const peakCeiling = 10 ** (PEAK_CEILING_DB / 20);
  const gain = Math.max(
    0,
    Math.min(MAX_NORMALIZATION_GAIN, targetRms / rms, peakCeiling / peak),
  );
  const channels = sourceChannels.map((channel) => {
    const normalized = new Float32Array(channel.length);
    for (let index = 0; index < channel.length; index += 1) {
      normalized[index] = Math.max(-1, Math.min(1, channel[index] * gain));
    }
    return normalized;
  });
  return { channels, gain, peak, rms };
}

export async function encodePcmToMp3(
  sourceChannels: readonly Float32Array[],
  sampleRate: number,
  quality: SoundOutputQuality,
) {
  if (sourceChannels.length === 0 || sourceChannels[0].length === 0) {
    throw new Error("Audio output requires at least one PCM channel.");
  }
  const channels = sourceChannels
    .slice(0, 2)
    .map((channel) => new Float32Array(channel));
  const frameLength = Math.min(...channels.map((channel) => channel.length));
  const alignedChannels = channels.map((channel) =>
    channel.length === frameLength ? channel : channel.subarray(0, frameLength),
  );
  const { default: createMp3Encoder } = await import("@audio/encode-mp3");
  const encoder = await createMp3Encoder({
    bitrate: audioOutputBitrate(quality),
    channels: alignedChannels.length,
    sampleRate,
  });

  try {
    const body = encoder.encode(alignedChannels);
    const tail = encoder.flush();
    const encoded = new Uint8Array(body.length + tail.length);
    encoded.set(body, 0);
    encoded.set(tail, body.length);
    return encoded;
  } finally {
    encoder.free();
  }
}

export async function processAudioOutput(
  source: Blob,
  options: {
    autoNormalize: boolean;
    quality: SoundOutputQuality;
  },
): Promise<ProcessedAudioOutput> {
  const AudioContextConstructor =
    window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
  if (!AudioContextConstructor) {
    throw new Error(
      "Audio output processing is not supported in this browser.",
    );
  }

  const context = new AudioContextConstructor();
  try {
    const decoded = await context.decodeAudioData(await source.arrayBuffer());
    const decodedChannels = Array.from(
      { length: Math.min(2, decoded.numberOfChannels) },
      (_, index) => new Float32Array(decoded.getChannelData(index)),
    );
    const normalized = options.autoNormalize
      ? normalizePcmForOutput(decodedChannels)
      : {
          channels: decodedChannels,
          gain: 1,
          peak: 0,
          rms: 0,
        };
    const encoded = await encodePcmToMp3(
      normalized.channels,
      decoded.sampleRate,
      options.quality,
    );
    const ownedBuffer = new Uint8Array(encoded.length);
    ownedBuffer.set(encoded);
    return {
      bitrateKbps: audioOutputBitrate(options.quality),
      blob: new Blob([ownedBuffer.buffer], { type: "audio/mpeg" }),
      durationSeconds: decoded.duration,
      normalizationGain: normalized.gain,
    };
  } finally {
    if (context.state !== "closed") await context.close();
  }
}
