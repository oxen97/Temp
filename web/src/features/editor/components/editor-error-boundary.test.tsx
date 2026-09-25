import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { saveMock } = vi.hoisted(() => ({ saveMock: vi.fn() }));

vi.mock("@/features/editor/lib/save-project-file", () => ({
  saveEditorProjectToFile: saveMock,
}));

import {
  EditorErrorBoundary,
  PreviewErrorBoundary,
} from "./editor-error-boundary";

let broken = true;

function Editor() {
  if (broken) throw new Error("Broken value in a panel");
  return <p>Editor is back</p>;
}

beforeEach(() => {
  broken = true;
  saveMock.mockReset();
  // React reports every caught render error to console.error.
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("EditorErrorBoundary", () => {
  it("renders the editor when nothing fails", () => {
    broken = false;
    render(
      <EditorErrorBoundary>
        <Editor />
      </EditorErrorBoundary>,
    );
    expect(screen.getByText("Editor is back")).toBeInTheDocument();
  });

  it("shows a recovery screen instead of a blank page", () => {
    render(
      <EditorErrorBoundary>
        <Editor />
      </EditorErrorBoundary>,
    );
    expect(
      screen.getByRole("heading", { name: "Something went wrong" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save to file" })).toBeEnabled();
    expect(screen.getByText("Broken value in a panel")).toBeInTheDocument();
  });

  it("saves the work in the store to a file from the recovery screen", async () => {
    saveMock.mockResolvedValue({ missingAssetCount: 0 });
    render(
      <EditorErrorBoundary>
        <Editor />
      </EditorErrorBoundary>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save to file" }));
    expect(
      await screen.findByText(/Saved\. After reloading, open it/),
    ).toBeInTheDocument();
    expect(saveMock).toHaveBeenCalledWith("local-project");
  });

  it("says so when the file cannot be saved", async () => {
    saveMock.mockRejectedValue(new Error("disk full"));
    render(
      <EditorErrorBoundary>
        <Editor />
      </EditorErrorBoundary>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save to file" }));
    expect(
      await screen.findByText("The file could not be saved."),
    ).toBeInTheDocument();
  });

  it("renders the editor again after Try again", () => {
    render(
      <EditorErrorBoundary>
        <Editor />
      </EditorErrorBoundary>,
    );
    broken = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("Editor is back")).toBeInTheDocument();
  });
});

describe("PreviewErrorBoundary", () => {
  it("keeps a Preview error inside the Preview overlay", () => {
    const onClose = vi.fn();
    render(
      <main>
        <p>Scenes panel</p>
        <PreviewErrorBoundary onClose={onClose}>
          <Editor />
        </PreviewErrorBoundary>
      </main>,
    );
    expect(screen.getByText("Scenes panel")).toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Preview error" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
