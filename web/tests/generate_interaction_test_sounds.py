"""Generate deterministic interaction-sound fixtures without dependencies."""

from __future__ import annotations

import math
import struct
import wave
from pathlib import Path


SAMPLE_RATE = 44_100
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "public" / "figma" / "sound"


def attack_release(time: float, duration: float, attack: float, release: float) -> float:
    attack_gain = math.sin(math.pi * 0.5 * min(time / attack, 1.0)) ** 2
    release_gain = math.sin(
        math.pi * 0.5 * min(max(duration - time, 0.0) / release, 1.0)
    ) ** 2
    return attack_gain * release_gain


def bell_partial(time: float, frequency: float) -> float:
    phase = 2.0 * math.pi * frequency * time
    return (
        math.sin(phase)
        + 0.25 * math.sin(2.01 * phase + 0.2)
        + 0.10 * math.sin(3.97 * phase + 0.5)
    ) / 1.35


def make_chime() -> list[float]:
    total_duration = 0.88
    notes = (
        (0.0, 0.52, 1_318.510, 0.48),
        (0.14, 0.68, 1_760.0, 0.42),
    )
    samples: list[float] = []
    for index in range(round(total_duration * SAMPLE_RATE)):
        time = index / SAMPLE_RATE
        value = 0.0
        for start, duration, frequency, amplitude in notes:
            local_time = time - start
            if 0.0 <= local_time < duration:
                envelope = attack_release(local_time, duration, 0.004, 0.060)
                envelope *= math.exp(-local_time / 0.32)
                value += (
                    amplitude * envelope * bell_partial(local_time, frequency)
                )
        samples.append(value)
    return samples


def xorshift32(state: int) -> int:
    state ^= (state << 13) & 0xFFFFFFFF
    state ^= state >> 17
    state ^= (state << 5) & 0xFFFFFFFF
    return state & 0xFFFFFFFF


def make_click() -> list[float]:
    duration = 0.10
    state = 0x54414B31
    previous_noise = 0.0
    samples: list[float] = []
    chirp_rate = (500.0 - 1_800.0) / duration
    for index in range(round(duration * SAMPLE_RATE)):
        time = index / SAMPLE_RATE
        state = xorshift32(state)
        noise = (state / 0xFFFFFFFF) * 2.0 - 1.0
        high_noise = (noise - previous_noise) * 0.5
        previous_noise = noise
        phase = 2.0 * math.pi * (1_800.0 * time + 0.5 * chirp_rate * time**2)
        envelope = attack_release(time, duration, 0.0008, 0.012)
        value = envelope * (
            0.48 * math.exp(-time / 0.007) * high_noise
            + 0.42 * math.exp(-time / 0.026) * math.sin(phase)
            + 0.10 * math.exp(-time / 0.012) * math.sin(2.0 * math.pi * 3_200 * time)
        )
        samples.append(value)
    return samples


def write_wave(path: Path, samples: list[float]) -> None:
    peak = max((abs(sample) for sample in samples), default=1.0)
    gain = 0.78 / max(peak, 1e-12)
    pcm = b"".join(
        struct.pack(
            "<h",
            round(max(-0.999, min(0.999, sample * gain)) * 32_767),
        )
        for sample in samples
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(pcm)


def main() -> None:
    write_wave(OUTPUT_DIR / "test-interaction-chime.wav", make_chime())
    write_wave(OUTPUT_DIR / "test-interaction-click.wav", make_click())


if __name__ == "__main__":
    main()
