import { create } from "zustand";

import type { InteractionDefinition } from "@/features/editor/lib/interaction-model";
import type { PathPoint, VectorPath } from "@/features/editor/lib/vector-types";
import {
  cloneObject3D,
  createDefaultScene3DSettings,
  type Object3DElement,
  resolveScene3DSettings,
  type Scene3DSettings,
} from "@/features/editor/three/types";

export type { PathPoint, VectorPath } from "@/features/editor/lib/vector-types";

export type SaveStatus = "saved" | "saving" | "offline";
export type EditorTool =
  "selection" | "hand" | "rectangle" | "text" | "zoom" | "settings";
export type ShapeType =
  "rectangle" | "circle" | "triangle" | "star" | "line" | "pen";
export type CanvasElementType = ShapeType | "text" | "image";
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
  interactionSounds?: InteractionSoundSettings[];
  interactionSoundExpanded?: boolean;
  interactions?: InteractionDefinition[];
};

export type InteractionSoundTrigger =
  "hover" | "click" | "press" | "drag" | "scroll";
export type InteractionSoundEvent =
  | "enter"
  | "while-hovering"
  | "leave"
  | "click"
  | "double-click"
  | "press-start"
  | "while-pressing"
  | "release"
  | "drag-start"
  | "while-dragging"
  | "drop"
  | "while-scrolling"
  | "reach-point";
export type InteractionSoundSource = "single" | "multiple";
export type InteractionSoundPlaybackMode = "shuffle" | "sequential";

export type InteractionSoundSettings = {
  assets: BackgroundMusicAsset[];
  avoidRepeating: boolean;
  enabled: boolean;
  event: InteractionSoundEvent;
  fadeInSeconds: number;
  fadeOutSeconds: number;
  id: string;
  playbackMode: InteractionSoundPlaybackMode;
  soundSource: InteractionSoundSource;
  trigger: InteractionSoundTrigger;
  volume: number;
};

export type BackgroundMusicStartMode =
  "on-page-enter" | "after-delay" | "on-interaction" | "manual";

export type BackgroundMusicAsset = {
  artworkSrc?: string;
  durationSeconds: number;
  mimeType: string;
  name: string;
  sizeBytes: number;
  src: string;
};

export type BackgroundMusicSettings = {
  asset: BackgroundMusicAsset | null;
  delaySeconds: number;
  fadeInSeconds: number;
  fadeOutSeconds: number;
  loop: boolean;
  startPlayback: BackgroundMusicStartMode;
  volume: number;
};

export type SoundOutputQuality = "low" | "medium" | "high";
export type SoundPreloadMode = "auto" | "all" | "on-demand";

export type SoundAdvancedSettings = {
  autoNormalize: boolean;
  outputQuality: SoundOutputQuality;
  preloadSounds: SoundPreloadMode;
  spatialSound: boolean;
  unloadUnusedSounds: boolean;
};

export type SoundMixerSettings = {
  backgroundMusicVolume: number;
  interactionSoundVolume: number;
  masterVolume: number;
};

export const defaultInteractionSoundSettings: InteractionSoundSettings = {
  assets: [],
  avoidRepeating: true,
  enabled: true,
  event: "enter",
  fadeInSeconds: 0,
  fadeOutSeconds: 0,
  id: "interaction-sound-primary",
  playbackMode: "shuffle",
  soundSource: "single",
  trigger: "hover",
  volume: 100,
};

export const defaultBackgroundMusicSettings: BackgroundMusicSettings = {
  asset: null,
  delaySeconds: 1,
  fadeInSeconds: 0,
  fadeOutSeconds: 0,
  loop: true,
  startPlayback: "on-page-enter",
  volume: 100,
};

export const defaultSoundAdvancedSettings: SoundAdvancedSettings = {
  autoNormalize: true,
  outputQuality: "high",
  preloadSounds: "auto",
  spatialSound: true,
  unloadUnusedSounds: true,
};

export const defaultSoundMixerSettings: SoundMixerSettings = {
  backgroundMusicVolume: 100,
  interactionSoundVolume: 100,
  masterVolume: 100,
};

export type EditorPage = {
  id: string;
  name: string;
  elements: CanvasElement[];
  objects3d?: Object3DElement[];
  scene3d?: Scene3DSettings;
  backgroundMusic?: BackgroundMusicSettings;
  advancedSound?: SoundAdvancedSettings;
  soundMixer?: SoundMixerSettings;
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
  selectedObject3DIds: string[];
  artboard: ArtboardSettings;
};

type EditorState = {
  saveStatus: SaveStatus;
  activeTool: EditorTool;
  selectedShape: ShapeType;
  pages: EditorPage[];
  activePageId: string;
  selectedElementIds: string[];
  selectedObject3DIds: string[];
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
  setSelectedObject3DIds: (ids: string[]) => void;
  setSelectedItems: (elementIds: string[], object3DIds: string[]) => void;
  setZoom: (zoom: number) => void;
  updateArtboard: (updates: Partial<ArtboardSettings>) => void;
  updateBackgroundMusic: (updates: Partial<BackgroundMusicSettings>) => void;
  updateAdvancedSound: (updates: Partial<SoundAdvancedSettings>) => void;
  updateSoundMixer: (updates: Partial<SoundMixerSettings>) => void;
  setBackgroundMusicArtwork: (
    pageId: string,
    assetSrc: string,
    artworkSrc: string,
  ) => void;
  addPage: () => void;
  removePage: () => void;
  renamePage: (pageId: string, name: string) => void;
  addElement: (element: CanvasElement) => void;
  addObject3D: (object: Object3DElement) => void;
  checkpoint: () => void;
  updateElement: (elementId: string, updates: Partial<CanvasElement>) => void;
  addInteraction: (
    elementId: string,
    interaction: InteractionDefinition,
  ) => void;
  updateInteraction: (
    elementId: string,
    interactionId: string,
    updates: Partial<InteractionDefinition>,
  ) => void;
  removeInteraction: (elementId: string, interactionId: string) => void;
  setInteractions: (
    elementId: string,
    interactions: InteractionDefinition[],
  ) => void;
  updateObject3D: (objectId: string, updates: Partial<Object3DElement>) => void;
  updateScene3D: (updates: Partial<Scene3DSettings>) => void;
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
  background: "#d9d9d9",
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
  {
    id: "page-1",
    name: "Intro",
    elements: [],
    objects3d: [],
    scene3d: createDefaultScene3DSettings(),
  },
];

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clonePages(pages: EditorPage[]) {
  return pages.map((page) => ({
    ...page,
    objects3d: page.objects3d?.map(cloneObject3D),
    scene3d: page.scene3d ? resolveScene3DSettings(page.scene3d) : undefined,
    backgroundMusic: page.backgroundMusic
      ? {
          ...page.backgroundMusic,
          asset: page.backgroundMusic.asset
            ? { ...page.backgroundMusic.asset }
            : null,
        }
      : undefined,
    advancedSound: page.advancedSound ? { ...page.advancedSound } : undefined,
    soundMixer: page.soundMixer ? { ...page.soundMixer } : undefined,
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
      interactionSounds: element.interactionSounds?.map((sound) => ({
        ...sound,
        assets: sound.assets.map((asset) => ({ ...asset })),
      })),
    })),
  }));
}

function addBackgroundMusicArtwork(
  pages: EditorPage[],
  pageId: string,
  assetSrc: string,
  artworkSrc: string,
) {
  let changed = false;
  const updatedPages = pages.map((page) => {
    const backgroundMusic = page.backgroundMusic;
    const asset = backgroundMusic?.asset;
    if (
      !backgroundMusic ||
      page.id !== pageId ||
      asset?.src !== assetSrc ||
      asset.artworkSrc === artworkSrc
    ) {
      return page;
    }
    changed = true;
    return {
      ...page,
      backgroundMusic: {
        ...backgroundMusic,
        asset: {
          ...asset,
          artworkSrc,
        },
      },
    };
  });
  return changed ? updatedPages : pages;
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
    selectedObject3DIds: [...state.selectedObject3DIds],
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

function updateActivePageObjects3D(
  state: EditorState,
  updater: (objects: Object3DElement[]) => Object3DElement[],
) {
  return state.pages.map((page) =>
    page.id === state.activePageId
      ? { ...page, objects3d: updater(page.objects3d ?? []) }
      : page,
  );
}

function applyObject3DUpdates(
  object: Object3DElement,
  updates: Partial<Object3DElement>,
) {
  // Clone only the changed branches. Keeping source/dimensions identities stable
  // prevents expensive geometry and GLB rebuilds during position/rotation drags.
  return { ...object, ...structuredClone(updates) } as Object3DElement;
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
  selectedObject3DIds: [],
  zoom: 100,
  artboard: initialArtboard,
  clipboard: [],
  past: [],
  future: [],
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setSelectedShape: (selectedShape) => set({ selectedShape }),
  setActivePageId: (activePageId) =>
    set({ activePageId, selectedElementIds: [], selectedObject3DIds: [] }),
  setSelectedElementIds: (selectedElementIds) =>
    set({ selectedElementIds, selectedObject3DIds: [] }),
  setSelectedObject3DIds: (selectedObject3DIds) =>
    set({ selectedElementIds: [], selectedObject3DIds }),
  setSelectedItems: (selectedElementIds, selectedObject3DIds) =>
    set({ selectedElementIds, selectedObject3DIds }),
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
              objects3d: page.objects3d?.map((object) => ({
                ...object,
                transform: {
                  ...object.transform,
                  position: {
                    ...object.transform.position,
                    x: object.transform.position.x + widthDelta / 2,
                    y: object.transform.position.y + heightDelta / 2,
                  },
                },
              })),
            }))
          : state.pages;
      return {
        artboard,
        pages,
        past: pushHistory(state),
        future: [],
      };
    }),
  updateBackgroundMusic: (updates) =>
    set((state) => ({
      pages: state.pages.map((page) =>
        page.id === state.activePageId
          ? {
              ...page,
              backgroundMusic: {
                ...defaultBackgroundMusicSettings,
                ...page.backgroundMusic,
                ...updates,
              },
            }
          : page,
      ),
    })),
  updateAdvancedSound: (updates) =>
    set((state) => ({
      pages: state.pages.map((page) =>
        page.id === state.activePageId
          ? {
              ...page,
              advancedSound: {
                ...defaultSoundAdvancedSettings,
                ...page.advancedSound,
                ...updates,
              },
            }
          : page,
      ),
    })),
  updateSoundMixer: (updates) =>
    set((state) => ({
      pages: state.pages.map((page) =>
        page.id === state.activePageId
          ? {
              ...page,
              soundMixer: {
                ...defaultSoundMixerSettings,
                ...page.soundMixer,
                ...updates,
              },
            }
          : page,
      ),
    })),
  setBackgroundMusicArtwork: (pageId, assetSrc, artworkSrc) =>
    set((state) => ({
      pages: addBackgroundMusicArtwork(
        state.pages,
        pageId,
        assetSrc,
        artworkSrc,
      ),
      past: state.past.map((snapshot) => {
        const pages = addBackgroundMusicArtwork(
          snapshot.pages,
          pageId,
          assetSrc,
          artworkSrc,
        );
        return pages === snapshot.pages ? snapshot : { ...snapshot, pages };
      }),
      future: state.future.map((snapshot) => {
        const pages = addBackgroundMusicArtwork(
          snapshot.pages,
          pageId,
          assetSrc,
          artworkSrc,
        );
        return pages === snapshot.pages ? snapshot : { ...snapshot, pages };
      }),
    })),
  addPage: () =>
    set((state) => {
      const pageNumber = state.pages.length + 1;
      const page = {
        id: createId("page"),
        name: `Page ${pageNumber}`,
        elements: [],
        objects3d: [],
        scene3d: createDefaultScene3DSettings(),
      };
      return {
        pages: [...state.pages, page],
        activePageId: page.id,
        selectedElementIds: [],
        selectedObject3DIds: [],
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
        selectedObject3DIds: [],
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
      selectedObject3DIds: [],
      activeTool: "selection",
      past: pushHistory(state),
      future: [],
    })),
  addObject3D: (object) =>
    set((state) => ({
      pages: state.pages.map((page) =>
        page.id === state.activePageId
          ? {
              ...page,
              objects3d: [...(page.objects3d ?? []), cloneObject3D(object)],
              scene3d: resolveScene3DSettings({
                ...page.scene3d,
                enabled: true,
              }),
            }
          : page,
      ),
      selectedElementIds: [],
      selectedObject3DIds: [object.id],
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
  addInteraction: (elementId, interaction) =>
    set((state) => ({
      pages: updateActivePage(state, (elements) =>
        elements.map((element) =>
          element.id === elementId
            ? {
                ...element,
                interactions: [...(element.interactions ?? []), interaction],
              }
            : element,
        ),
      ),
      past: pushHistory(state),
      future: [],
    })),
  updateInteraction: (elementId, interactionId, updates) =>
    set((state) => ({
      pages: updateActivePage(state, (elements) =>
        elements.map((element) =>
          element.id === elementId
            ? {
                ...element,
                interactions: (element.interactions ?? []).map((interaction) =>
                  interaction.id === interactionId
                    ? { ...interaction, ...updates }
                    : interaction,
                ),
              }
            : element,
        ),
      ),
    })),
  removeInteraction: (elementId, interactionId) =>
    set((state) => ({
      pages: updateActivePage(state, (elements) =>
        elements.map((element) =>
          element.id === elementId
            ? {
                ...element,
                interactions: (element.interactions ?? []).filter(
                  (interaction) => interaction.id !== interactionId,
                ),
              }
            : element,
        ),
      ),
      past: pushHistory(state),
      future: [],
    })),
  setInteractions: (elementId, interactions) =>
    set((state) => ({
      pages: updateActivePage(state, (elements) =>
        elements.map((element) =>
          element.id === elementId ? { ...element, interactions } : element,
        ),
      ),
      past: pushHistory(state),
      future: [],
    })),
  updateObject3D: (objectId, updates) =>
    set((state) => ({
      pages: updateActivePageObjects3D(state, (objects) =>
        objects.map((object) =>
          object.id === objectId
            ? applyObject3DUpdates(object, updates)
            : object,
        ),
      ),
    })),
  updateScene3D: (updates) =>
    set((state) => ({
      pages: state.pages.map((page) =>
        page.id === state.activePageId
          ? {
              ...page,
              scene3d: resolveScene3DSettings({
                ...page.scene3d,
                ...updates,
              }),
            }
          : page,
      ),
      past: pushHistory(state),
      future: [],
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
      selectedObject3DIds: [],
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
      if (
        !state.selectedElementIds.length &&
        !state.selectedObject3DIds.length
      ) {
        return state;
      }
      return {
        pages: state.pages.map((page) =>
          page.id === state.activePageId
            ? {
                ...page,
                elements: page.elements.filter(
                  (element) =>
                    !state.selectedElementIds.includes(element.id) ||
                    element.locked,
                ),
                objects3d: (page.objects3d ?? []).filter(
                  (object) =>
                    !state.selectedObject3DIds.includes(object.id) ||
                    object.locked,
                ),
              }
            : page,
        ),
        selectedElementIds: [],
        selectedObject3DIds: [],
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
        selectedObject3DIds: [],
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
