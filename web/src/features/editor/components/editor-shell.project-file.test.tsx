import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { saveMock } = vi.hoisted(() => ({ saveMock: vi.fn() }));

vi.mock("@/features/editor/lib/save-project-file", () => ({
  saveEditorProjectToFile: saveMock,
}));

import { createProjectFile } from "../lib/project-file";
import { useEditorStore } from "../store/editor-store";
import { EditorShell } from "./editor-shell";

const artboard = {
  background: "#d9d9d9",
  cornerRadius: 10,
  height: 679,
  width: 1208,
};

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:project-file-test"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  window.localStorage.clear();
  saveMock.mockReset();
  saveMock.mockResolvedValue({ missingAssetCount: 0 });
  useEditorStore.setState({
    activePageId: "page-1",
    activeTool: "selection",
    artboard,
    clipboard: [],
    future: [],
    pages: [
      {
        elements: [
          {
            cornerRadius: 0,
            fill: "#ffffff",
            height: 80,
            id: "shape-1",
            locked: false,
            name: "Rectangle 1",
            opacity: 100,
            rotation: 0,
            stroke: "transparent",
            strokeWidth: 0,
            type: "rectangle",
            visible: true,
            width: 80,
            x: 40,
            y: 40,
          },
        ],
        id: "page-1",
        name: "Intro",
      },
    ],
    past: [],
    selectedElementIds: [],
    selectedShape: "rectangle",
    zoom: 100,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function projectFile() {
  const { blob } = await createProjectFile(
    {
      activePageId: "opened-2",
      artboard: { ...artboard, background: "#202020" },
      pages: [
        { elements: [], id: "opened-1", name: "Opening" },
        { elements: [], id: "opened-2", name: "Ending" },
      ],
    },
    { media: [], modelAssets: [] },
    { loadModelAsset: async () => undefined },
  );
  return new File([blob], "work.amous");
}

function chooseFile(file: File) {
  const input = screen.getByLabelText("Open project file");
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [file],
  });
  fireEvent.change(input);
}

const pageIds = () => useEditorStore.getState().pages.map((page) => page.id);

describe("project file menu", () => {
  it("saves from the ⋮ menu and with Ctrl/⌘ + S", async () => {
    render(<EditorShell />);
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("menu", { name: "Project file" })).toBeVisible();
    fireEvent.click(screen.getByRole("menuitem", { name: /Save to file/ }));
    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
    expect(saveMock).toHaveBeenCalledWith("local-project", {
      media: [],
      modelAssets: [],
    });
    expect(screen.queryByRole("menu", { name: "Project file" })).toBeNull();

    // The browser's own "Save page" dialog must not open.
    expect(fireEvent.keyDown(window, { ctrlKey: true, key: "s" })).toBe(false);
    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(2));
    fireEvent.keyDown(window, { key: "s", metaKey: true, repeat: true });
    fireEvent.keyDown(window, { key: "s", metaKey: true });
    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(3));

    // Korean input reports the jamo, but the physical S key still saves.
    fireEvent.keyDown(window, { code: "KeyS", ctrlKey: true, key: "ㄴ" });
    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(4));
    // On other layouts the typed letter wins over the physical key.
    const click = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => undefined);
    fireEvent.keyDown(window, { code: "KeyS", ctrlKey: true, key: "o" });
    expect(click).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledTimes(4);
  });

  it("opens the file picker with Ctrl/⌘ + O", () => {
    const click = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => undefined);
    render(<EditorShell />);
    expect(fireEvent.keyDown(window, { ctrlKey: true, key: "o" })).toBe(false);
    expect(click).toHaveBeenCalledTimes(1);
    expect(click.mock.contexts[0]).toBe(screen.getByLabelText("Open project file"));
  });

  it("asks before replacing work, then opens the file as one undo step", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<EditorShell />);
    chooseFile(await projectFile());

    await waitFor(() => expect(pageIds()).toEqual(["opened-1", "opened-2"]));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(useEditorStore.getState().activePageId).toBe("opened-2");
    expect(useEditorStore.getState().artboard.background).toBe("#202020");
    expect(screen.getByText("Ending")).toBeInTheDocument();

    useEditorStore.getState().undo();
    expect(pageIds()).toEqual(["page-1"]);
    expect(useEditorStore.getState().pages[0].elements).toHaveLength(1);
  });

  it("keeps the current work when opening is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<EditorShell />);
    chooseFile(await projectFile());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(pageIds()).toEqual(["page-1"]);
  });

  it("explains why a file cannot be opened", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    render(<EditorShell />);
    chooseFile(new File(["just some text"], "notes.amous"));
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith("This is not an AMOUS project file."),
    );
    expect(pageIds()).toEqual(["page-1"]);
  });
});
