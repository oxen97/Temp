/* Color fields intentionally keep the latest onChange in a ref. */
/* eslint-disable react-hooks/refs */

import { ChevronDown, type LucideIcon } from "lucide-react";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  designAssetDimensions,
  rotationPresets,
} from "@/features/editor/lib/editor-constants";
import { colorInputValue } from "@/features/editor/lib/element-style";
import { clamp } from "@/features/editor/lib/geometry";
import { type CanvasElement } from "@/features/editor/store/editor-store";
import { assetPath } from "@/lib/asset-path";

export function DesignNumberField({
  ariaLabel,
  label,
  max,
  min,
  onChange,
  precision,
  unit = "px",
  value,
  disabled = false,
}: {
  ariaLabel?: string;
  label: string;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  precision?: number;
  unit?: string;
  value: number;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const displayValue =
    precision === undefined ? value : Number(value.toFixed(precision));

  return (
    <label
      className={[
        label ? "number-field" : "number-field number-field--bare",
        unit ? null : "number-field--unitless",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label ? <span className="number-prefix">{label}</span> : null}
      <input
        aria-label={ariaLabel ?? (label || unit)}
        disabled={disabled}
        max={max}
        min={min}
        onBlur={() => setDraft(null)}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setDraft(nextDraft);
          if (!nextDraft.trim()) return;
          const next = Number(nextDraft);
          if (!Number.isNaN(next)) onChange(next);
        }}
        onFocus={(event) => {
          setDraft(event.currentTarget.value);
          event.currentTarget.select();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        step={precision === undefined ? undefined : 10 ** -precision}
        type="number"
        value={draft ?? displayValue}
      />
      {unit ? (
        <span
          className={
            unit === "%" ? "number-unit number-unit--percent" : "number-unit"
          }
        >
          {unit}
        </span>
      ) : null}
    </label>
  );
}

export function DesignDropdown({
  ariaLabel,
  className = "",
  disabled = false,
  noScroll = false,
  onChange,
  options,
  overlay = false,
  style,
  toggleIcon,
  value,
}: {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  noScroll?: boolean;
  onChange: (value: string) => void;
  options: readonly {
    label: string;
    strokePreview?: CanvasElement["strokeStyle"];
    value: string;
  }[];
  overlay?: boolean;
  style?: CSSProperties;
  toggleIcon?: ReactNode;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div
      className={[
        "design-dropdown",
        overlay ? "design-dropdown--overlay" : "",
        noScroll ? "is-no-scroll" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
      style={style}
    >
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="design-dropdown-toggle"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {!overlay ? (
          <span className="design-dropdown-value">
            {selectedOption?.label ?? value}
          </span>
        ) : null}
      </button>
      <span aria-hidden="true" className="design-dropdown-icon">
        {toggleIcon ?? <ChevronDown size={9} strokeWidth={1.25} />}
      </span>
      {open ? (
        <div
          aria-label={`${ariaLabel} menu`}
          className="design-dropdown-menu"
          role="listbox"
        >
          {options.map((option) => (
            <button
              aria-selected={option.value === value}
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              role="option"
              type="button"
            >
              {option.strokePreview ? (
                <>
                  <span
                    aria-hidden="true"
                    className={`design-dropdown-stroke-preview is-${option.strokePreview}`}
                  />
                  <span className="visually-hidden">{option.label}</span>
                </>
              ) : (
                option.label
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DesignRotationField({
  disabled = false,
  onChange,
  value,
}: {
  disabled?: boolean;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <div className="rotation-input">
      <input
        aria-label="Rotation"
        disabled={disabled}
        max={360}
        min={-360}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (!Number.isNaN(next)) onChange(next);
        }}
        style={
          {
            "--rotation-character-count": Math.max(1, String(value).length),
          } as CSSProperties
        }
        type="number"
        value={value}
      />
      <span aria-hidden="true" className="rotation-degree">
        °
      </span>
      <DesignDropdown
        disabled={disabled}
        ariaLabel="Rotation presets"
        noScroll
        onChange={(rotation) => onChange(Number(rotation))}
        options={rotationPresets.map((rotation) => ({
          label: `${rotation}°`,
          value: String(rotation),
        }))}
        overlay
        value={String(((Math.round(value) % 360) + 360) % 360)}
      />
    </div>
  );
}

export function DesignRange({
  ariaLabel,
  className,
  disabled = false,
  max,
  min,
  onBegin,
  onChange,
  value,
}: {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  max: number;
  min: number;
  onBegin?: () => void;
  onChange: (value: number) => void;
  value: number;
}) {
  const progress = clamp((value - min) / Math.max(1, max - min), 0, 1);

  return (
    <label
      className={`design-range${className ? ` ${className}` : ""}`}
      style={{ "--design-range-progress": progress } as CSSProperties}
    >
      <span aria-hidden="true" className="design-range-track">
        <span className="design-range-fill" />
        <span className="design-range-thumb" />
      </span>
      <input
        aria-label={ariaLabel}
        disabled={disabled}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        onKeyDown={(event) => {
          if (
            [
              "ArrowDown",
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "End",
              "Home",
              "PageDown",
              "PageUp",
            ].includes(event.key)
          ) {
            onBegin?.();
          }
        }}
        onPointerDown={onBegin}
        type="range"
        value={value}
      />
    </label>
  );
}

export function DesignColorField({
  disabled = false,
  label,
  onBegin,
  onChange,
  value,
}: {
  disabled?: boolean;
  label: string;
  onBegin?: () => void;
  onChange: (value: string) => void;
  value: string;
}) {
  const colorValue = colorInputValue(value);
  const pendingColor = useRef<string | null>(null);
  const colorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const flushColorChange = () => {
    if (colorTimer.current) {
      clearTimeout(colorTimer.current);
      colorTimer.current = null;
    }
    const nextColor = pendingColor.current;
    pendingColor.current = null;
    if (nextColor !== null) onChangeRef.current(nextColor);
  };

  const scheduleColorChange = (nextColor: string) => {
    pendingColor.current = nextColor;
    if (colorTimer.current) return;
    colorTimer.current = setTimeout(() => {
      colorTimer.current = null;
      const queuedColor = pendingColor.current;
      pendingColor.current = null;
      if (queuedColor !== null) onChangeRef.current(queuedColor);
    }, 40);
  };

  useEffect(
    () => () => {
      if (colorTimer.current) clearTimeout(colorTimer.current);
    },
    [],
  );

  return (
    <label className="color-field">
      <input
        aria-label={`${label} swatch`}
        disabled={disabled}
        onBlur={flushColorChange}
        onChange={(event) => scheduleColorChange(event.target.value)}
        onFocus={onBegin}
        type="color"
        value={colorValue}
      />
      <input
        aria-label={label}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onBegin}
        type="text"
        value={value}
      />
    </label>
  );
}

export function DesignIconButton({
  asset,
  disabled = false,
  icon: Icon,
  label,
  onClick,
  pressed,
}: {
  asset?: string;
  disabled?: boolean;
  icon?: LucideIcon;
  label: string;
  onClick?: () => void;
  pressed?: boolean;
}) {
  const assetDimensions = asset
    ? (designAssetDimensions[asset] ?? { height: 18, width: 18 })
    : null;

  return (
    <button
      aria-label={label}
      aria-pressed={pressed}
      className="icon-control"
      data-asset={asset}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {asset ? (
        // The panel assets are intentionally rendered at the exact Figma bounds.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          aria-hidden="true"
          draggable={false}
          height={assetDimensions?.height ?? 18}
          src={assetPath(`/figma/design/${encodeURIComponent(asset)}`)}
          width={assetDimensions?.width ?? 18}
        />
      ) : Icon ? (
        <Icon aria-hidden="true" size={14} strokeWidth={1.25} />
      ) : null}
    </button>
  );
}
