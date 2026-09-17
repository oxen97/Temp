import { type CSSProperties } from "react";

import { fontFamilyStacks } from "@/features/editor/lib/editor-constants";
import { clamp, visualFlipTransform } from "@/features/editor/lib/geometry";
import { type CanvasElement } from "@/features/editor/store/editor-store";

export function colorWithOpacity(color: string, opacity = 100) {
  const amount = clamp(opacity, 0, 100);
  if (amount === 100 || color === "transparent") return color;
  const hex = color.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  if (hex) {
    return `rgb(${Number.parseInt(hex[1], 16)} ${Number.parseInt(hex[2], 16)} ${Number.parseInt(hex[3], 16)} / ${amount}%)`;
  }
  return `color-mix(in srgb, ${color} ${amount}%, transparent)`;
}

export function colorInputValue(color: string) {
  const longHex = color.match(/^#[\da-f]{6}$/i);
  if (longHex) return color;
  const shortHex = color.match(/^#([\da-f])([\da-f])([\da-f])$/i);
  if (shortHex) {
    return `#${shortHex[1]}${shortHex[1]}${shortHex[2]}${shortHex[2]}${shortHex[3]}${shortHex[3]}`;
  }
  const rgb = color.match(
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*[\d.]+%?)?\s*\)$/i,
  );
  if (!rgb) return "#ffffff";
  return `#${rgb
    .slice(1, 4)
    .map((channel) =>
      Math.round(clamp(Number(channel), 0, 255))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

export function strokeDasharrayForElement(element: CanvasElement) {
  const width = Math.max(1, element.strokeWidth);
  if (element.strokeStyle === "dashed") return `${width * 4} ${width * 3}`;
  if (element.strokeStyle === "dotted") return `${width} ${width * 2}`;
  return undefined;
}

export function textStyleForElement(element: CanvasElement): CSSProperties {
  const fontFamily = element.fontFamily ?? "Inter";
  return {
    color: colorWithOpacity(element.fill, element.fillOpacity),
    fontFamily: fontFamilyStacks[fontFamily] ?? fontFamily,
    fontSize: `${element.fontSize ?? 24}px`,
    fontWeight: element.fontWeight ?? "500",
    letterSpacing:
      element.letterSpacing && element.letterSpacing !== "auto"
        ? `${element.letterSpacing}px`
        : undefined,
    lineHeight:
      element.lineHeight && element.lineHeight !== "auto"
        ? element.lineHeight
        : undefined,
    textAlign: element.textAlign ?? "left",
    transform: visualFlipTransform(element),
    transformOrigin: "center",
    whiteSpace: element.textResizeMode === "auto-width" ? "pre" : "pre-wrap",
  };
}
