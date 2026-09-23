"use client";

import Link from "next/link";
import { useEffect } from "react";

const editorPath = "/?interactionDemo=night-post-office";

export function NightPostOfficeEditorEntry() {
  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    window.location.replace(`${basePath}${editorPath}`);
  }, []);

  return (
    <main>
      <p>별을 배달하는 우체국을 AMOUS 편집기에서 여는 중입니다.</p>
      <Link href={editorPath}>편집기 열기</Link>
    </main>
  );
}
