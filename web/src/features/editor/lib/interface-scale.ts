export const INTERFACE_SCALE_STORAGE_KEY = "amous.ui.interface-scale.v2";
export const LEGACY_INTERFACE_SCALE_STORAGE_KEY = "amous.ui.interface-scale.v1";

export const INTERFACE_SCALE_OPTIONS = [
  { label: "Auto", value: "auto" },
  { label: "100%", value: "100" },
  { label: "110%", value: "110" },
  { label: "125%", value: "125" },
  { label: "150%", value: "150" },
] as const;

export type InterfaceScaleMode =
  (typeof INTERFACE_SCALE_OPTIONS)[number]["value"];

export type InterfaceScalePercent = 100 | 110 | 125 | 150;

const interfaceScaleModes = new Set<string>(
  INTERFACE_SCALE_OPTIONS.map(({ value }) => value),
);

const explicitScaleByMode: Record<
  Exclude<InterfaceScaleMode, "auto">,
  InterfaceScalePercent
> = {
  "100": 100,
  "110": 110,
  "125": 125,
  "150": 150,
};

export function isInterfaceScaleMode(
  value: unknown,
): value is InterfaceScaleMode {
  return typeof value === "string" && interfaceScaleModes.has(value);
}

export function parseInterfaceScaleMode(
  storedValue: unknown,
): InterfaceScaleMode {
  return isInterfaceScaleMode(storedValue) ? storedValue : "auto";
}

export function resolveInterfaceScale(
  mode: InterfaceScaleMode,
  screenWidthCss: number,
  devicePixelRatio = 1,
): InterfaceScalePercent {
  if (mode !== "auto") return explicitScaleByMode[mode];

  if (!Number.isFinite(screenWidthCss)) return 100;

  const normalizedPixelRatio =
    Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
      ? devicePixelRatio
      : 1;
  const nativeScreenWidth = screenWidthCss * normalizedPixelRatio;

  // Browsers expose the desktop size in CSS pixels, so a 4K display can look
  // like 3840, 3072, or 2560 px depending on the Windows display scale. Use
  // the estimated native width to recognize the same display and keep AMOUS
  // chrome at the preferred 150% scale on 100%-125% Windows display scales.
  // At higher operating-system scales, avoid applying the same enlargement a
  // second time. Canvas zoom remains independent.
  if (nativeScreenWidth >= 3600) {
    return normalizedPixelRatio < 1.375 ? 150 : 100;
  }

  if (screenWidthCss >= 3000) return 125;
  if (screenWidthCss >= 2400) return 110;
  return 100;
}

export function interfaceScaleFactor(scale: InterfaceScalePercent) {
  return scale / 100;
}

export function migrateInterfaceScaleMode(
  storedMode: unknown,
  legacyStoredMode: unknown,
  screenWidthCss: number,
  devicePixelRatio = 1,
): InterfaceScaleMode {
  if (storedMode !== null && storedMode !== undefined) {
    return parseInterfaceScaleMode(storedMode);
  }

  const legacyMode = parseInterfaceScaleMode(legacyStoredMode);
  const normalizedPixelRatio =
    Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
      ? devicePixelRatio
      : 1;
  const nativeScreenWidth = screenWidthCss * normalizedPixelRatio;
  return legacyMode === "125" && nativeScreenWidth >= 3600 ? "150" : legacyMode;
}
