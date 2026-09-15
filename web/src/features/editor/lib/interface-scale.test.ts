import { describe, expect, it } from "vitest";

import {
  INTERFACE_SCALE_OPTIONS,
  INTERFACE_SCALE_STORAGE_KEY,
  LEGACY_INTERFACE_SCALE_STORAGE_KEY,
  interfaceScaleFactor,
  isInterfaceScaleMode,
  migrateInterfaceScaleMode,
  parseInterfaceScaleMode,
  resolveInterfaceScale,
} from "./interface-scale";

describe("interface scale preferences", () => {
  it("exposes the supported scale choices in display order", () => {
    expect(INTERFACE_SCALE_OPTIONS).toEqual([
      { label: "Auto", value: "auto" },
      { label: "100%", value: "100" },
      { label: "110%", value: "110" },
      { label: "125%", value: "125" },
      { label: "150%", value: "150" },
    ]);
    expect(INTERFACE_SCALE_STORAGE_KEY).toBe("amous.ui.interface-scale.v2");
    expect(LEGACY_INTERFACE_SCALE_STORAGE_KEY).toBe(
      "amous.ui.interface-scale.v1",
    );
  });

  it.each(["auto", "100", "110", "125", "150"])(
    "accepts the valid mode %s",
    (mode) => {
      expect(isInterfaceScaleMode(mode)).toBe(true);
      expect(parseInterfaceScaleMode(mode)).toBe(mode);
    },
  );

  it.each([null, undefined, "", "90", "125%", "automatic", 125])(
    "falls back to auto for invalid stored value %s",
    (value) => {
      expect(isInterfaceScaleMode(value)).toBe(false);
      expect(parseInterfaceScaleMode(value)).toBe("auto");
    },
  );

  it("keeps Auto at 100% on an FHD screen", () => {
    expect(resolveInterfaceScale("auto", 1920, 1)).toBe(100);
    expect(resolveInterfaceScale("auto", 2399, 1)).toBe(100);
  });

  it("resolves Auto to 110% on a QHD CSS-width screen", () => {
    expect(resolveInterfaceScale("auto", 2560, 1)).toBe(110);
    expect(resolveInterfaceScale("auto", 2400, 1)).toBe(110);
    expect(resolveInterfaceScale("auto", 2999, 1)).toBe(110);
  });

  it.each([
    { expected: 150, pixelRatio: 1, screenWidth: 3840 },
    { expected: 150, pixelRatio: 1.25, screenWidth: 3072 },
    { expected: 100, pixelRatio: 1.5, screenWidth: 2560 },
  ] as const)(
    "resolves 4K at $pixelRatio device scale to $expected%",
    ({ expected, pixelRatio, screenWidth }) => {
      expect(resolveInterfaceScale("auto", screenWidth, pixelRatio)).toBe(
        expected,
      );
    },
  );

  it("keeps the existing ultrawide fallback below the UHD threshold", () => {
    expect(resolveInterfaceScale("auto", 3440, 1)).toBe(125);
    expect(resolveInterfaceScale("auto", 3000, 1)).toBe(125);
  });

  it("uses stable UHD and display-scale boundaries", () => {
    expect(resolveInterfaceScale("auto", 3599, 1)).toBe(125);
    expect(resolveInterfaceScale("auto", 3600, 1)).toBe(150);
    expect(resolveInterfaceScale("auto", 3200, 1.125)).toBe(150);
    expect(resolveInterfaceScale("auto", 2880, 1.25)).toBe(150);
    expect(resolveInterfaceScale("auto", 2880, 1.375)).toBe(100);
  });

  it("falls back safely when display metrics are invalid", () => {
    expect(resolveInterfaceScale("auto", Number.NaN, 1)).toBe(100);
    expect(resolveInterfaceScale("auto", 2560, Number.NaN)).toBe(110);
    expect(resolveInterfaceScale("auto", 3840, 0)).toBe(150);
  });

  it("keeps explicit choices independent of display metrics", () => {
    expect(resolveInterfaceScale("110", 1920, 1)).toBe(110);
    expect(resolveInterfaceScale("150", 3840, 2)).toBe(150);
  });

  it("migrates the previous 4K 125% preference to 150% once", () => {
    expect(migrateInterfaceScaleMode(null, "125", 3072, 1.25)).toBe("150");
    expect(migrateInterfaceScaleMode(null, "125", 2560, 1)).toBe("125");
    expect(migrateInterfaceScaleMode("125", "150", 3072, 1.25)).toBe("125");
    expect(migrateInterfaceScaleMode(null, "110", 3072, 1.25)).toBe("110");
  });

  it("converts a resolved percentage to a CSS scale factor", () => {
    expect(interfaceScaleFactor(100)).toBe(1);
    expect(interfaceScaleFactor(125)).toBe(1.25);
    expect(interfaceScaleFactor(150)).toBe(1.5);
  });
});
