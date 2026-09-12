import { create } from "zustand";

export type SaveStatus = "saved" | "saving" | "offline";
export type EditorTool =
  "selection" | "hand" | "rectangle" | "text" | "zoom" | "settings";
export type ShapeType =
  "rectangle" | "circle" | "triangle" | "star" | "line" | "pen";
export type CanvasElementType = ShapeType | "text" | "image";
export type PathPoint = {
  x: number;
  y: number;
  handleIn?: { x: number; y: number };
  handleOut?: { x: number; y: number };
};
export type VectorPath = {
  points: PathPoint[];
  closed?: boolean;
};
export type ImageCrop = {
  baseHeight: number;
  baseWidth: number;
  bottom: number;
  left: number;
  right: number;
  scaleX: number;
  scaleY: number;
  top: number;
};

export type StrokeStyle = "none" | "solid" | "dashed" | "dotted";
export type TextResizeMode = "auto-width" | "fixed";
export type PathfinderOperation =
  | "union"
  | "subtract"
  | "intersect"
  | "exclude"
  | "flatten"
  | "outline"
  | "divide"
  | "trim";
export type PathfinderPolygon = [number, number][][];
export type PathfinderData = {
  imageFill?: {
    crop: ImageCrop;
    flipX: boolean;
    flipY: boolean;
    height: number;
    rotation: number;
    src: string;
    transformOrigin: number;
    width: number;
    x: number;
    y: number;
  };
  operation: PathfinderOperation;
  paths: string[];
  polygons?: PathfinderPolygon[];
};

export type CanvasElement = {
  id: string;
  name: string;
  type: CanvasElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
  cornerRadii?: [number, number, number, number];
  fillOpacity?: number;
  flipX?: boolean;
  flipY?: boolean;
  groupId?: string;
  pathfinder?: PathfinderData;
  polygonCornerRadii?: number[];
  polygonPoints?: number;
  strokeOpacity?: number;
  strokeStyle?: StrokeStyle;
  transformOrigin?: number;
  visible: boolean;
  locked: boolean;
  text?: string;
  textResizeMode?: TextResizeMode;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  letterSpacing?: number | "auto";
  lineHeight?: number | "auto";
  textAlign?: "left" | "center" | "right" | "justify";
  src?: string;
  imageCrop?: ImageCrop;
  points?: PathPoint[];
  closed?: boolean;
  vectorPaths?: VectorPath[];
};

export type EditorPage = {
  id: string;
  name: string;
  elements: CanvasElement[];
};

export type ArtboardSettings = {
  width: number;
  height: number;
  background: string;
  cornerRadius: number;
  pageAspectRatio?: "16:9" | "4:3" | "3:2" | "1:1" | "9:16";
  pageType?: "screen" | "scroll";
  viewportMode?: "fit" | "fill" | "stretch";
  backgroundType?: "solid" | "gradation" | "image" | "video";
  backgroundSolidEnabled?: boolean;
  backgroundGradientEnabled?: boolean;
  backgroundMediaType?: "image" | "video";
  backgroundOpacity?: number;
  gradientType?: "linear" | "radial" | "conic" | "rectangular" | "freeform";
  gradientAngle?: number;
  gradientStartColor?: string;
  gradientEndColor?: string;
  gradientStartOpacity?: number;
  gradientEndOpacity?: number;
  gradientStops?: {
    color: string;
    opacity: number;
    position: number;
  }[];
  backgroundImage?: string;
  backgroundVideo?: string;
  backgroundImageFit?: "cover" | "contain" | "original" | "stretch" | "fill";
  backgroundImageOpacity?: number;
  backgroundAutoPlay?: boolean;
  backgroundLoop?: boolean;
  backgroundMute?: boolean;
};

type EditorSnapshot = {
  pages: EditorPage[];
  activePageId: string;
  selectedElementIds: string[];
  artboard: ArtboardSettings;
};

type EditorState = {
  saveStatus: SaveStatus;
  activeTool: EditorTool;
  selectedShape: ShapeType;
  pages: EditorPage[];
  activePageId: string;
  selectedElementIds: string[];
  zoom: number;
  artboard: ArtboardSettings;
  clipboard: CanvasElement[];
  past: EditorSnapshot[];
  future: EditorSnapshot[];
  setSaveStatus: (status: SaveStatus) => void;
  setActiveTool: (tool: EditorTool) => void;
  setSelectedShape: (shape: ShapeType) => void;
  setActivePageId: (pageId: string) => void;
  setSelectedElementIds: (ids: string[]) => void;
  setZoom: (zoom: number) => void;
  updateArtboard: (updates: Partial<ArtboardSettings>) => void;
  addPage: () => void;
  removePage: () => void;
  renamePage: (pageId: string, name: string) => void;
  addElement: (element: CanvasElement) => void;
  checkpoint: () => void;
  updateElement: (elementId: string, updates: Partial<CanvasElement>) => void;
  replaceElements: (
    elementIds: string[],
    replacements: CanvasElement[],
  ) => void;
  renameElement: (elementId: string, name: string) => void;
  updateElements: (
    elementIds: string[],
    deltaX: number,
    deltaY: number,
  ) => void;
  removeSelected: () => void;
  toggleElementLocked: (elementId: string) => void;
  toggleElementVisible: (elementId: string) => void;
  copySelected: () => void;
  pasteClipboard: () => void;
  undo: () => void;
  redo: () => void;
};

const initialArtboard: ArtboardSettings = {
  width: 1920,
  height: 1080,
  background: "#ffffff",
  cornerRadius: 10,
  pageAspectRatio: "16:9",
  pageType: "screen",
  viewportMode: "fit",
  backgroundType: "solid",
  backgroundSolidEnabled: true,
  backgroundGradientEnabled: false,
  backgroundOpacity: 100,
  gradientType: "linear",
  gradientAngle: 0,
  gradientStartColor: "#d9d9d9",
  gradientEndColor: "#737373",
  gradientStartOpacity: 100,
  gradientEndOpacity: 100,
  gradientStops: [
    { color: "#d9d9d9", opacity: 100, position: 0 },
    { color: "#737373", opacity: 100, position: 100 },
  ],
  backgroundImageFit: "cover",
  backgroundImageOpacity: 100,
  backgroundAutoPlay: true,
  backgroundLoop: true,
  backgroundMute: true,
};

const initialPages: EditorPage[] = [
  { id: "page-1", name: "Intro", elements: [] },
];

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clonePages(pages: EditorPage[]) {
  return pages.map((page) => ({
    ...page,
    elements: page.elements.map((element) => ({
      ...element,
      points: element.points?.map((point) => ({
        ...point,
        handleIn: point.handleIn ? { ...point.handleIn } : undefined,
        handleOut: point.handleOut ? { ...point.handleOut } : undefined,
      })),
      vectorPaths: element.vectorPaths?.map((path) => ({
        ...path,
        points: path.points.map((point) => ({
          ...point,
          handleIn: point.handleIn ? { ...point.handleIn } : undefined,
          handleOut: point.handleOut ? { ...point.handleOut } : undefined,
        })),
      })),
      imageCrop: element.imageCrop ? { ...element.imageCrop } : undefined,
      cornerRadii: element.cornerRadii
        ? ([...element.cornerRadii] as [number, number, number, number])
        : undefined,
      polygonCornerRadii: element.polygonCornerRadii
        ? [...element.polygonCornerRadii]
        : undefined,
      pathfinder: element.pathfinder
        ? {
            ...element.pathfinder,
            paths: [...element.pathfinder.paths],
            polygons: element.pathfinder.polygons?.map((polygon) =>
              polygon.map((ring) =>
                ring.map(([x, y]) => [x, y] as [number, number]),
              ),
            ),
          }
        : undefined,
    })),
  }));
}

function cloneArtboard(artboard: ArtboardSettings): ArtboardSettings {
  return {
    ...artboard,
    gradientStops: artboard.gradientStops?.map((stop) => ({ ...stop })),
  };
}

function createSnapshot(state: EditorState): EditorSnapshot {
  return {
    pages: clonePages(state.pages),
    activePageId: state.activePageId,
    selectedElementIds: [...state.selectedElementIds],
    artboard: cloneArtboard(state.artboard),
  };
}

function pushHistory(state: EditorState) {
  return [...state.past.slice(-99), createSnapshot(state)];
}

function updateActivePage(
  state: EditorState,
  updater: (elements: CanvasElement[]) => CanvasElement[],
) {
  return state.pages.map((page) =>
    page.id === state.activePageId
      ? { ...page, elements: updater(page.elements) }
      : page,
  );
}

function responsiveOriginFactors(origin = 4) {
  const index = Math.min(8, Math.max(0, Math.round(origin)));
  return {
    x: (index % 3) / 2,
    y: Math.floor(index / 3) / 2,
  };
}

export const useEditorStore = create<EditorState>((set) => ({
  saveStatus: "saved",
  activeTool: "selection",
  selectedShape: "rectangle",
  pages: initialPages,
  activePageId: "page-1",
  selectedElementIds: [],
  zoom: 100,
  artboard: initialArtboard,
  clipboard: [],
  past: [],
  future: [],
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setSelectedShape: (selectedShape) => set({ selectedShape }),
  setActivePageId: (activePageId) =>
    set({ activePageId, selectedElementIds: [] }),
  setSelectedElementIds: (selectedElementIds) => set({ selectedElementIds }),
  setZoom: (zoom) => set({ zoom: Math.min(500, Math.max(5, zoom)) }),
  updateArtboard: (updates) =>
    set((state) => {
      const artboard = { ...state.artboard, ...updates };
      const widthDelta = artboard.width - state.artboard.width;
      const heightDelta = artboard.height - state.artboard.height;
      const pages =
        widthDelta || heightDelta
          ? state.pages.map((page) => ({
              ...page,
              elements: page.elements.map((element) => {
                const origin = responsiveOriginFactors(element.transformOrigin);
                return {
                  ...element,
                  x: element.x + widthDelta * origin.x,
                  y: element.y + heightDelta * origin.y,
                };
              }),
            }))
          : state.pages;
      return {
        artboard,
        pages,
        past: pushHistory(state),
        future: [],
      };
    }),
  addPage: () =>
    set((state) => {
      const pageNumber = state.pages.length + 1;
      const page = {
        id: createId("page"),
        name: `Page ${pageNumber}`,
        elements: [],
      };
      return {
        pages: [...state.pages, page],
        activePageId: page.id,
        selectedElementIds: [],
        past: pushHistory(state),
        future: [],
      };
    }),
  removePage: () =>
    set((state) => {
      if (state.pages.length <= 1) return state;
      const currentIndex = state.pages.findIndex(
        (page) => page.id === state.activePageId,
      );
      const pages = state.pages.filter(
        (page) => page.id !== state.activePageId,
      );
      const fallback = pages[Math.max(0, currentIndex - 1)] ?? pages[0];
      return {
        pages,
        activePageId: fallback.id,
        selectedElementIds: [],
        past: pushHistory(state),
        future: [],
      };
    }),
  renamePage: (pageId, name) =>
    set((state) => {
      const nextName = name.trim();
      if (!nextName) return state;
      const page = state.pages.find((item) => item.id === pageId);
      if (!page || page.name === nextName) return state;
      return {
        pages: state.pages.map((item) =>
          item.id === pageId ? { ...item, name: nextName } : item,
        ),
        past: pushHistory(state),
        future: [],
      };
    }),
  addElement: (element) =>
    set((state) => ({
      pages: updateActivePage(state, (elements) => [...elements, element]),
      selectedElementIds: [element.id],
      activeTool: "selection",
      past: pushHistory(state),
      future: [],
    })),
  checkpoint: () => set((state) => ({ past: pushHistory(state), future: [] })),
  updateElement: (elementId, updates) =>
    set((state) => ({
      pages: updateActivePage(state, (elements) =>
        elements.map((element) =>
          element.id === elementId ? { ...element, ...updates } : element,
        ),
      ),
    })),
  replaceElements: (elementIds, replacements) =>
    set((state) => ({
      pages: updateActivePage(state, (elements) => {
        const firstIndex = elements.findIndex((element) =>
          elementIds.includes(element.id),
        );
        const remaining = elements.filter(
          (element) => !elementIds.includes(element.id),
        );
        remaining.splice(Math.max(0, firstIndex), 0, ...replacements);
        return remaining;
      }),
      selectedElementIds: replacements.map((replacement) => replacement.id),
    })),
  renameElement: (elementId, name) =>
    set((state) => {
      const nextName = name.trim();
      if (!nextName) return state;
      const page = state.pages.find((item) => item.id === state.activePageId);
      const element = page?.elements.find((item) => item.id === elementId);
      if (!element || element.name === nextName) return state;
      return {
        pages: updateActivePage(state, (elements) =>
          elements.map((item) =>
            item.id === elementId ? { ...item, name: nextName } : item,
          ),
        ),
        past: pushHistory(state),
        future: [],
      };
    }),
  updateElements: (elementIds, deltaX, deltaY) =>
    set((state) => ({
      pages: updateActivePage(state, (elements) =>
        elements.map((element) =>
          elementIds.includes(element.id) && !element.locked
            ? { ...element, x: element.x + deltaX, y: element.y + deltaY }
            : element,
        ),
      ),
    })),
  removeSelected: () =>
    set((state) => {
      if (!state.selectedElementIds.length) return state;
      return {
        pages: updateActivePage(state, (elements) =>
          elements.filter(
            (element) =>
              !state.selectedElementIds.includes(element.id) || element.locked,
          ),
        ),
        selectedElementIds: [],
        past: pushHistory(state),
        future: [],
      };
    }),
  toggleElementLocked: (elementId) =>
    set((state) => {
      const page = state.pages.find((item) => item.id === state.activePageId);
      const target = page?.elements.find((element) => element.id === elementId);
      if (!target) return state;

      const elementIds =
        state.selectedElementIds.length > 1 &&
        state.selectedElementIds.includes(elementId)
          ? state.selectedElementIds
          : [elementId];

      return {
        pages: updateActivePage(state, (elements) =>
          elements.map((element) =>
            elementIds.includes(element.id)
              ? { ...element, locked: !target.locked }
              : element,
          ),
        ),
        past: pushHistory(state),
        future: [],
      };
    }),
  toggleElementVisible: (elementId) =>
    set((state) => {
      const page = state.pages.find((item) => item.id === state.activePageId);
      const target = page?.elements.find((element) => element.id === elementId);
      if (!target) return state;

      const elementIds =
        state.selectedElementIds.length > 1 &&
        state.selectedElementIds.includes(elementId)
          ? state.selectedElementIds
          : [elementId];

      return {
        pages: updateActivePage(state, (elements) =>
          elements.map((element) =>
            elementIds.includes(element.id)
              ? { ...element, visible: !target.visible }
              : element,
          ),
        ),
        past: pushHistory(state),
        future: [],
      };
    }),
  copySelected: () =>
    set((state) => {
      const page = state.pages.find((item) => item.id === state.activePageId);
      return {
        clipboard:
          page?.elements
            .filter((element) => state.selectedElementIds.includes(element.id))
            .map((element) => ({ ...element })) ?? [],
      };
    }),
  pasteClipboard: () =>
    set((state) => {
      if (!state.clipboard.length) return state;
      const pastedGroupIds = new Map<string, string>();
      const pasted = state.clipboard.map((element) => {
        let groupId: string | undefined;
        if (element.groupId) {
          groupId = pastedGroupIds.get(element.groupId);
          if (!groupId) {
            groupId = createId("group");
            pastedGroupIds.set(element.groupId, groupId);
          }
        }
        return {
          ...element,
          groupId,
          id: createId(element.type),
          name: `${element.name} copy`,
          x: element.x + 16,
          y: element.y + 16,
          locked: false,
        };
      });
      return {
        pages: updateActivePage(state, (elements) => [...elements, ...pasted]),
        selectedElementIds: pasted.map((element) => element.id),
        past: pushHistory(state),
        future: [],
      };
    }),
  undo: () =>
    set((state) => {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        ...previous,
        pages: clonePages(previous.pages),
        artboard: cloneArtboard(previous.artboard),
        past: state.past.slice(0, -1),
        future: [createSnapshot(state), ...state.future].slice(0, 100),
      };
    }),
  redo: () =>
    set((state) => {
      const next = state.future[0];
      if (!next) return state;
      return {
        ...next,
        pages: clonePages(next.pages),
        artboard: cloneArtboard(next.artboard),
        past: [...state.past, createSnapshot(state)].slice(-100),
        future: state.future.slice(1),
      };
    }),
}));
