import type { Metadata } from "next";
import type { CSSProperties } from "react";

import { assetPath } from "@/lib/asset-path";

import "@fontsource-variable/inter/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "AMOUS",
  description: "Interactive exhibition editor and viewer",
};

const shapePickerAsset = assetPath("/figma/shape-picker.svg");
const assetStyles = {
  "--figma-pen": `url("${assetPath("/figma/pen.svg")}")`,
  "--figma-shape-picker": `url("${shapePickerAsset}")`,
} as CSSProperties;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <head>
        <link
          as="image"
          fetchPriority="high"
          href={shapePickerAsset}
          rel="preload"
          type="image/svg+xml"
        />
      </head>
      <body style={assetStyles}>{children}</body>
    </html>
  );
}
