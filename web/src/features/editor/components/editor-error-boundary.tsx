"use client";

import { catchError, type ErrorInfo } from "next/error";
import { useState } from "react";

import { saveEditorProjectToFile } from "@/features/editor/lib/save-project-file";
import { LOCAL_PROJECT_ID } from "@/features/editor/three/model-assets";

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message || error.name;
  return String(error);
}

function EditorCrashScreen({
  error,
  onRetry,
  projectId,
}: {
  error: unknown;
  onRetry: () => void;
  projectId: string;
}) {
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "failed"
  >("idle");

  const save = async () => {
    setSaveState("saving");
    try {
      await saveEditorProjectToFile(projectId);
      setSaveState("saved");
    } catch {
      setSaveState("failed");
    }
  };

  return (
    <main className="crash-screen">
      <section aria-labelledby="editor-crash-title" className="crash-card" role="alert">
        <h1 id="editor-crash-title">Something went wrong</h1>
        <p>
          The editor stopped because of an error. Your work is still in this
          tab, so save it to a file before you reload.
        </p>
        <div className="crash-actions">
          <button
            className="crash-button crash-button--primary"
            disabled={saveState === "saving"}
            onClick={() => void save()}
            type="button"
          >
            {saveState === "saving" ? "Saving…" : "Save to file"}
          </button>
          <button className="crash-button" onClick={onRetry} type="button">
            Try again
          </button>
          <button
            className="crash-button"
            onClick={() => window.location.reload()}
            type="button"
          >
            Reload
          </button>
        </div>
        {saveState === "saved" ? (
          <p className="crash-status">
            Saved. After reloading, open it from ⋮ → Open file.
          </p>
        ) : null}
        {saveState === "failed" ? (
          <p className="crash-status">The file could not be saved.</p>
        ) : null}
        <details className="crash-details">
          <summary>Error details</summary>
          <pre>{errorMessage(error)}</pre>
        </details>
      </section>
    </main>
  );
}

function EditorCrashFallback(
  props: { projectId?: string },
  { error, reset }: ErrorInfo,
) {
  // The editor renders entirely in the browser, so re-rendering is enough.
  // retry() would also ask the router to refresh the page from the server,
  // which this static, client-only page does not need.
  return (
    <EditorCrashScreen
      error={error}
      onRetry={reset}
      projectId={props.projectId ?? LOCAL_PROJECT_ID}
    />
  );
}

/**
 * Catches errors anywhere in the editor so one broken value shows a recovery
 * screen (with Save to file) instead of a blank page.
 */
export const EditorErrorBoundary = catchError(EditorCrashFallback);

function PreviewCrashFallback(props: { onClose: () => void }) {
  return (
    <div
      aria-label="Preview error"
      aria-modal="true"
      className="preview-crash"
      role="dialog"
    >
      <section className="crash-card" role="alert">
        <h2>Preview stopped</h2>
        <p>
          Something in this scene caused an error while it was playing. The
          editor and your work are not affected.
        </p>
        <div className="crash-actions">
          <button
            className="crash-button crash-button--primary"
            onClick={props.onClose}
            type="button"
          >
            Close preview
          </button>
        </div>
      </section>
    </div>
  );
}

/** Keeps a Preview crash inside the Preview overlay. */
export const PreviewErrorBoundary = catchError(PreviewCrashFallback);
