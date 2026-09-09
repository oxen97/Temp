import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { CSSProperties } from "react";

import { assetPath } from "@/lib/asset-path";

import "./globals.css";

const designInter = Inter({
  display: "swap",
  subsets: ["latin"],
  variable: "--design-inter",
});

export const metadata: Metadata = {
  title: "AMOUS",
  description: "Interactive exhibition editor and viewer",
};

const assetStyles = {
  "--figma-pen": `url("${assetPath("/figma/pen.svg")}")`,
  "--figma-shape-picker": `url("${assetPath("/figma/shape-picker.svg")}")`,
} as CSSProperties;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body className={designInter.variable} style={assetStyles}>
        {children}
      </body>
    </html>
  );
}
