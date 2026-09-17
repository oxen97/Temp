import { useEffect, useRef, useState } from "react";

import { colorInputValue } from "@/features/editor/lib/element-style";
import { clamp } from "@/features/editor/lib/geometry";
import { assetPath } from "@/lib/asset-path";

export type SceneBackgroundType = "solid" | "gradation" | "image" | "video";

export const sceneBackgroundTypes: {
  label: string;
  value: SceneBackgroundType;
}[] = [
  { label: "Solid", value: "solid" },
  { label: "Gradation", value: "gradation" },
  { label: "Image", value: "image" },
  { label: "Video", value: "video" },
];

export function SceneModeTabs({
  active,
  ariaLabel,
  onToggle,
}: {
  active: SceneBackgroundType[];
  ariaLabel: string;
  onToggle: (type: SceneBackgroundType) => void;
}) {
  return (
    <div aria-label={ariaLabel} className="scene-mode-tabs" role="group">
      {sceneBackgroundTypes.map((type) => (
        <button
          aria-pressed={active.includes(type.value)}
          className={active.includes(type.value) ? "is-active" : ""}
          key={type.value}
          onClick={() => onToggle(type.value)}
          type="button"
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}

export function SceneCheckbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="scene-checkbox">
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span aria-hidden="true" className="scene-checkbox-box">
        {/* The SVG remains mounted so checked and unchecked boxes have identical geometry. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          className={checked ? "" : "is-hidden"}
          draggable={false}
          src={assetPath("/figma/scenes-check.svg")}
        />
      </span>
      <span>{label}</span>
    </label>
  );
}

export function SceneColorField({
  ariaLabel,
  onChange,
  value,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const pendingColor = useRef<string | null>(null);
  const colorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (colorTimer.current) clearTimeout(colorTimer.current);
    },
    [],
  );

  const queueColor = (nextColor: string) => {
    pendingColor.current = nextColor;
    if (colorTimer.current) return;
    colorTimer.current = setTimeout(() => {
      colorTimer.current = null;
      const queuedColor = pendingColor.current;
      pendingColor.current = null;
      if (queuedColor) onChange(queuedColor);
    }, 40);
  };

  return (
    <label className="scene-color-field">
      <input
        aria-label={`${ariaLabel} swatch`}
        className="scene-color-swatch"
        onBlur={() => {
          if (colorTimer.current) clearTimeout(colorTimer.current);
          colorTimer.current = null;
          if (pendingColor.current) onChange(pendingColor.current);
          pendingColor.current = null;
          setDraft(null);
        }}
        onChange={(event) => {
          setDraft(event.target.value.slice(1).toUpperCase());
          queueColor(event.target.value);
        }}
        type="color"
        value={colorInputValue(value)}
      />
      <span aria-hidden="true">#</span>
      <input
        aria-label={ariaLabel}
        className="scene-color-value"
        maxLength={6}
        onBlur={() => setDraft(null)}
        onChange={(event) => {
          const next = event.target.value
            .replace(/[^\da-f]/gi, "")
            .slice(0, 6)
            .toUpperCase();
          setDraft(next);
          if (next.length === 6) onChange(`#${next}`);
        }}
        value={draft ?? value.replace(/^#/, "").toUpperCase()}
      />
    </label>
  );
}

export function ScenePercentField({
  ariaLabel,
  onChange,
  value,
  wide = false,
}: {
  ariaLabel: string;
  onChange: (value: number) => void;
  value: number;
  wide?: boolean;
}) {
  return (
    <label
      className={wide ? "scene-percent-field is-wide" : "scene-percent-field"}
    >
      <input
        aria-label={ariaLabel}
        max={100}
        min={0}
        onChange={(event) =>
          onChange(clamp(Number(event.target.value), 0, 100))
        }
        type="number"
        value={Math.round(value)}
      />
      <span>%</span>
    </label>
  );
}
