import Image from "next/image";
import { useRef, useState } from "react";

import { clamp } from "@/features/editor/lib/geometry";
import { assetPath } from "@/lib/asset-path";

export function SoundMoreButton({
  controls,
  expanded,
  label,
  onClick,
}: {
  controls?: string;
  expanded?: boolean;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      aria-controls={controls}
      aria-expanded={expanded}
      aria-haspopup="menu"
      aria-label={label}
      className="sound-more-button"
      onClick={onClick}
      type="button"
    >
      <Image
        alt=""
        aria-hidden="true"
        height={8}
        src={assetPath("/figma/sound/Group%20272.svg")}
        width={2}
      />
    </button>
  );
}

export function SoundPlayButton({
  disabled,
  isPlaying,
  label,
  onClick,
}: {
  disabled?: boolean;
  isPlaying?: boolean;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="sound-play-button"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {isPlaying ? (
        <svg
          aria-hidden="true"
          className="sound-pause-icon"
          height="13"
          viewBox="0 0 13 13"
          width="13"
        >
          <circle cx="6.5" cy="6.5" fill="none" r="6" stroke="currentColor" />
          <rect fill="currentColor" height="5" width="1" x="5" y="4" />
          <rect fill="currentColor" height="5" width="1" x="7" y="4" />
        </svg>
      ) : (
        <Image
          alt=""
          aria-hidden="true"
          height={13}
          src={assetPath("/figma/sound/Group%20273.svg")}
          width={13}
        />
      )}
    </button>
  );
}

export function SoundNumberInput({
  ariaLabel,
  max,
  min,
  onBegin,
  onChange,
  precision,
  value,
}: {
  ariaLabel: string;
  max?: number;
  min: number;
  onBegin: () => void;
  onChange: (value: number) => void;
  precision: number;
  value: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const cancelCommitRef = useRef(false);
  const normalize = (next: number) =>
    clamp(next, min, max === undefined ? Number.MAX_SAFE_INTEGER : max);

  const commit = (rawValue: string) => {
    const next = Number(rawValue);
    onChange(Number.isFinite(next) ? normalize(next) : min);
    setDraft(null);
  };

  return (
    <input
      aria-label={ariaLabel}
      max={max}
      min={min}
      onBlur={(event) => {
        if (cancelCommitRef.current) {
          cancelCommitRef.current = false;
          setDraft(null);
          return;
        }
        commit(event.currentTarget.value);
      }}
      onChange={(event) => {
        const nextDraft = event.currentTarget.value;
        setDraft(nextDraft);
        if (!nextDraft.trim()) return;
        const next = Number(nextDraft);
        if (Number.isFinite(next)) onChange(normalize(next));
      }}
      onFocus={(event) => {
        cancelCommitRef.current = false;
        onBegin();
        setDraft(event.currentTarget.value);
        event.currentTarget.select();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          cancelCommitRef.current = true;
          setDraft(null);
          event.currentTarget.blur();
        }
      }}
      step={10 ** -precision}
      type="number"
      value={draft ?? value.toFixed(precision)}
    />
  );
}

export function SoundStepperField({
  ariaLabel,
  onBegin,
  onChange,
  value,
}: {
  ariaLabel: string;
  onBegin: () => void;
  onChange: (value: number) => void;
  value: number;
}) {
  const updateByStep = (delta: number) => {
    onBegin();
    onChange(Math.max(0, Math.round((value + delta) * 10) / 10));
  };

  return (
    <div className="sound-stepper-control">
      <span className="sound-stepper-field">
        <SoundNumberInput
          ariaLabel={ariaLabel}
          min={0}
          onBegin={onBegin}
          onChange={onChange}
          precision={1}
          value={value}
        />
        <span className="sound-stepper-buttons">
          <button
            aria-label={`Increase ${ariaLabel}`}
            onClick={() => updateByStep(0.1)}
            type="button"
          >
            <Image
              alt=""
              aria-hidden="true"
              height={4}
              src={assetPath("/figma/sound/stepper-up.svg")}
              width={5}
            />
          </button>
          <button
            aria-label={`Decrease ${ariaLabel}`}
            onClick={() => updateByStep(-0.1)}
            type="button"
          >
            <Image
              alt=""
              aria-hidden="true"
              height={4}
              src={assetPath("/figma/sound/stepper-down.svg")}
              width={5}
            />
          </button>
        </span>
      </span>
      <span className="sound-stepper-unit">s</span>
    </div>
  );
}

export function SoundPercentField({
  ariaLabel = "Sound volume",
  onBegin,
  onChange,
  value,
}: {
  ariaLabel?: string;
  onBegin: () => void;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="sound-percent-field">
      <SoundNumberInput
        ariaLabel={ariaLabel}
        max={100}
        min={0}
        onBegin={onBegin}
        onChange={onChange}
        precision={0}
        value={value}
      />
      <span>%</span>
    </label>
  );
}

export function SoundAdvancedToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={checked}
      className={checked ? "sound-toggle is-active" : "sound-toggle"}
      onClick={onChange}
      type="button"
    >
      <span />
    </button>
  );
}
