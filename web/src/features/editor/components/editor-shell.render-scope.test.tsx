import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type CanvasElement, useEditorStore } from "../store/editor-store";
import { EditorShell } from "./editor-shell";

// Every ShapeGraphic and LayerSymbol element the editor renders goes through
// these wrappers, so a call means a parent component actually re-rendered it.
const { shapeRender, symbolRender } = vi.hoisted(() => ({
  shapeRender: vi.fn(),
  symbolRender: vi.fn(),
}));

vi.mock(
  "@/features/editor/components/canvas/shape-graphic",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/features/editor/components/canvas/shape-graphic")
      >();
    return {
      ...actual,
      ShapeGraphic: (props: ComponentProps<typeof actual.ShapeGraphic>) => {
        const surface =
          props.playMedia === false
            ? props.imageScale !== undefined
              ? "navigator"
              : "thumbnail"
            : "canvas";
        shapeRender(surface, props.element.id);
        return <actual.ShapeGraphic {...props} />;
      },
    };
  },
);

vi.mock(
  "@/features/editor/components/ui/layer-symbol",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/features/editor/components/ui/layer-symbol")
      >();
    return {
      ...actual,
      LayerSymbol: (props: ComponentProps<typeof actual.LayerSymbol>) => {
        symbolRender(props.element.id);
        return <actual.LayerSymbol {...props} />;
      },
    };
  },
);

function rectangle(id: string, x: number): CanvasElement {
  return {
    cornerRadius: 0,
    fill: "#ffffff",
    height: 40,
    id,
    locked: false,
    name: id,
    opacity: 100,
    rotation: 0,
    stroke: "#000000",
    strokeWidth: 1,
    type: "rectangle",
    visible: true,
    width: 40,
    x,
    y: 40,
  };
}

const firstSceneShapes = Array.from({ length: 12 }, (_, index) =>
  rectangle(`shape-${index}`, 20 + index * 50),
);
const secondSceneShapes = Array.from({ length: 4 }, (_, index) =>
  rectangle(`other-${index}`, 20 + index * 50),
);

function renders(surface: string) {
  return shapeRender.mock.calls
    .filter(([called]) => called === surface)
    .map(([, id]) => id);
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  window.localStorage.clear();
  useEditorStore.setState({
    activePageId: "page-1",
    activeTool: "selection",
    artboard: {
      background: "#d9d9d9",
      cornerRadius: 10,
      height: 679,
      width: 1208,
    },
    clipboard: [],
    future: [],
    pages: [
      { elements: firstSceneShapes, id: "page-1", name: "Intro" },
      { elements: secondSceneShapes, id: "page-2", name: "Second" },
    ],
    past: [],
    selectedElementIds: [],
    selectedObject3DIds: [],
    selectedShape: "rectangle",
    zoom: 100,
  });
  render(<EditorShell />);
  shapeRender.mockClear();
  symbolRender.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("editor render scope", () => {
  it("re-renders only the newly selected element and its layer row", () => {
    act(() => {
      useEditorStore.getState().setSelectedElementIds(["shape-3"]);
    });

    expect(renders("canvas")).toEqual(["shape-3"]);
    expect(renders("navigator")).toEqual([]);
    expect(renders("thumbnail")).toEqual([]);
    expect(symbolRender.mock.calls.map(([id]) => id)).toEqual(["shape-3"]);
  });

  it("does not re-render shapes or layer rows for history-only changes", () => {
    act(() => {
      useEditorStore.getState().checkpoint();
    });

    expect(shapeRender).not.toHaveBeenCalled();
    expect(symbolRender).not.toHaveBeenCalled();
  });

  it("does not re-render shapes or layer rows when the tool changes", () => {
    act(() => {
      useEditorStore.getState().setActiveTool("text");
    });

    expect(shapeRender).not.toHaveBeenCalled();
    expect(symbolRender).not.toHaveBeenCalled();
  });

  it("re-renders an edited element without its unchanged siblings", () => {
    act(() => {
      useEditorStore.getState().updateElement("shape-3", { x: 400 });
    });

    expect(renders("canvas")).toEqual(["shape-3"]);
    expect(symbolRender.mock.calls.map(([id]) => id)).toEqual(["shape-3"]);
    // The other scene's thumbnail does not depend on the edited scene.
    expect(
      renders("thumbnail").filter((id) => String(id).startsWith("other-")),
    ).toEqual([]);
  });

  it("re-renders only the layer row being renamed while typing", () => {
    const layerName = screen
      .getAllByText("shape-5")
      .find((node) => node.classList.contains("layer-name"));
    expect(layerName).toBeDefined();
    fireEvent.doubleClick(layerName!);
    shapeRender.mockClear();
    symbolRender.mockClear();

    const input = screen.getByRole("textbox", { name: "Rename shape-5" });
    fireEvent.change(input, { target: { value: "shape-5 renamed" } });

    expect(shapeRender).not.toHaveBeenCalled();
    expect(symbolRender.mock.calls.map(([id]) => id)).toEqual(["shape-5"]);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(
      useEditorStore
        .getState()
        .pages[0].elements.find((element) => element.id === "shape-5")?.name,
    ).toBe("shape-5 renamed");
  });
});
