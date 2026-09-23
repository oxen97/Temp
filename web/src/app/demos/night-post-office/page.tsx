import type { Metadata } from "next";

import { NightPostOfficeExperience } from "./night-post-office-experience";

export const metadata: Metadata = {
  title: "별을 배달하는 우체국 · AMOUS",
  description: "별을 모아 편지를 배달하는 작은 인터랙티브 장면",
};

export default function NightPostOfficePage() {
  return <NightPostOfficeExperience />;
}
