import { describe, expect, it } from "vitest";

import {
  audioOutputBitrate,
  encodePcmToMp3,
  normalizePcmForOutput,
} from "./audio-output";

describe("audio output processing", () => {
  it("maps each output quality to its real MP3 bitrate", () => {
    expect(audioOutputBitrate("low")).toBe(128);
    expect(audioOutputBitrate("medium")).toBe(192);
    expect(audioOutputBitrate("high")).toBe(320);
  });

  it("normalizes average level while keeping peaks below the ceiling", () => {
    const quiet = new Float32Array(4_410).fill(0.02);
    const normalized = normalizePcmForOutput([quiet]);
    const peak = Math.max(...normalized.channels[0].map(Math.abs));
    const rms = Math.sqrt(
      normalized.channels[0].reduce((sum, sample) => sum + sample * sample, 0) /
        normalized.channels[0].length,
    );

    expect(normalized.gain).toBeGreaterThan(1);
    expect(20 * Math.log10(rms)).toBeCloseTo(-18, 1);
    expect(peak).toBeLessThanOrEqual(10 ** (-1 / 20));
  });

  it("encodes PCM into a non-empty MP3 at the selected quality", async () => {
    const sampleRate = 44_100;
    const pcm = Float32Array.from(
      { length: sampleRate / 10 },
      (_, index) => Math.sin((index / sampleRate) * Math.PI * 2 * 440) * 0.2,
    );

    const encoded = await encodePcmToMp3([pcm], sampleRate, "low");
    expect(encoded.byteLength).toBeGreaterThan(100);
    expect(encoded.some((byte) => byte !== 0)).toBe(true);
  });
});
