"use client";

import { Download, FolderOpen, MoreVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function modifierLabel() {
  // Rendered only after a click, so reading the platform here cannot cause a
  // server/client markup mismatch.
  return typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.platform)
    ? "⌘"
    : "Ctrl";
}

/**
 * The ⋮ button in the top bar. It opens a small menu for saving the project
 * to a `.amous` file and opening one again.
 */
export function ProjectFileMenu({
  busy,
  onOpen,
  onSave,
}: {
  busy: boolean;
  onOpen: () => void;
  onSave: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node | null)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [open]);

  return (
    <div
      className="project-file-control"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }}
      ref={containerRef}
    >
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="More"
        className="more-button"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <MoreVertical size={15} />
      </button>
      {open ? (
        <div
          aria-label="Project file"
          className="view-menu-popover project-file-popover"
          role="menu"
        >
          <span className="view-menu-heading">PROJECT FILE</span>
          <button
            className="view-menu-item"
            disabled={busy}
            onClick={() => {
              setOpen(false);
              onSave();
            }}
            role="menuitem"
            type="button"
          >
            <span className="view-menu-check">
              <Download aria-hidden="true" size={12} strokeWidth={1.8} />
            </span>
            <span>Save to file</span>
            <span className="view-menu-shortcut">{modifierLabel()} S</span>
          </button>
          <button
            className="view-menu-item"
            disabled={busy}
            onClick={() => {
              setOpen(false);
              onOpen();
            }}
            role="menuitem"
            type="button"
          >
            <span className="view-menu-check">
              <FolderOpen aria-hidden="true" size={12} strokeWidth={1.8} />
            </span>
            <span>Open file…</span>
            <span className="view-menu-shortcut">{modifierLabel()} O</span>
          </button>
          <div className="view-menu-divider" />
          <p className="project-file-note">
            Saves every scene with its images, videos, sounds and 3D models in
            one .amous file.
          </p>
        </div>
      ) : null}
    </div>
  );
}
