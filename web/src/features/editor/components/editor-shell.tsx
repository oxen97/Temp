"use client";

/* Pointer gestures intentionally use refs for mutable, event-only state. */
/* eslint-disable react-hooks/refs */

import {
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Minus,
  Monitor,
  MoreVertical,
  Plus,
  Redo2,
  Smartphone,
  Tablet,
  Undo2,
  Unlock,
} from "lucide-react";
import Image from "next/image";
import {
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ArtboardBackground } from "@/features/editor/components/canvas/artboard-background";
import { DrawDraftPreview } from "@/features/editor/components/canvas/draw-draft";
import { PenEditControls } from "@/features/editor/components/canvas/pen-edit-controls";
import { SelectionOutlineSvg } from "@/features/editor/components/canvas/selection-outline-svg";
import { ShapeGraphic } from "@/features/editor/components/canvas/shape-graphic";
import { DesignPanel } from "@/features/editor/components/panels/design-panel";
import { InteractionPanel } from "@/features/editor/components/panels/interaction-panel";
import { ScenePanel } from "@/features/editor/components/panels/scene-panel";
import { SoundPanel } from "@/features/editor/components/sound/sound-panel";
import { LayerSymbol } from "@/features/editor/components/ui/layer-symbol";
import { ScrollArea } from "@/features/editor/components/ui/scroll-area";
import { ShapePicker } from "@/features/editor/components/ui/shape-picker";
import { ScenePreview } from "@/features/editor/components/viewer/scene-preview";
import { ViewerPreview } from "@/features/editor/components/viewer/viewer-preview";
import {
  clearElementMovePreview,
  collectMovePreviewTargets,
  collectMultiResizePreviewTargets,
  collectResizePreviewTargets,
  dragPointerSample,
  elementAtClientPoint,
  guideAtClientPoint,
  isEditableTarget,
  localPointFromElement,
  previewArtboardPan,
  previewDistanceMeasurements,
  previewDrawDraft,
  previewElementMove,
  previewElementResize,
  previewMarquee,
  previewMultiElementResize,
  previewSmartGuides,
} from "@/features/editor/lib/dom-preview";
import {
  distancePreviewSlotCount,
  shapeNames,
  toolIndicatorMetrics,
  tools,
} from "@/features/editor/lib/editor-constants";
import {
  type DistanceMeasurement,
  type DragPointerSample,
  type DrawDraft,
  type EditorGuide,
  type Gesture,
  type GuideDrag,
  type HandleMirroring,
  type ImageResizeHandle,
  type NavigatorViewport,
  type PenAnchor,
  type PenDraft,
  type Point,
  type PropertyTab,
  type ResizeHandle,
  type VectorHandleRef,
  type VectorPointRef,
} from "@/features/editor/lib/editor-types";
import { createElementId } from "@/features/editor/lib/element-id";
import { textStyleForElement } from "@/features/editor/lib/element-style";
import {
  resizedBoundsFromCorner,
  resizeElementWithinSelection,
} from "@/features/editor/lib/element-transform";
import {
  boundsFromElements,
  boundsFromPointList,
  boundsFromPoints,
  calculateCanvasFitZoom,
  clamp,
  constrainAngle,
  elementLocalPoint,
  elementWorldPathPoint,
  elementWorldPoint,
  intersects,
  lineDraftGeometry,
  lineEndpoints,
  lineGeometry,
  offsetRect,
  rectFromElement,
} from "@/features/editor/lib/geometry";
import {
  fittedImageSize,
  imageCropForElement,
} from "@/features/editor/lib/image-crop";
import {
  INTERFACE_SCALE_OPTIONS,
  interfaceScaleFactor,
} from "@/features/editor/lib/interface-scale";
import { useInterfaceScale } from "@/features/editor/hooks/use-interface-scale";
import {
  drawRuler,
  prepareRulerCanvas,
  rulerSize,
} from "@/features/editor/lib/rulers";
import {
  expandGroupedSelection,
  selectionIdsForElement,
} from "@/features/editor/lib/selection";
import {
  areDistanceMeasurementsEqual,
  buildDistanceMeasurements,
  buildDistanceMeasurementsFromGuide,
  buildGuideDistanceMeasurements,
  buildSmartSnap,
} from "@/features/editor/lib/smart-guides";
import { useInteractionSoundAssets } from "@/features/editor/hooks/use-interaction-sound-assets";
import {
  clearOrphanedVectorHandles,
  cloneVectorPaths,
  mirroredHandle,
  nearestVectorPathPosition,
  pathData,
  splitVectorSegment,
  vectorElementGeometryUpdate,
  vectorHandleKey,
  vectorPathsForElement,
  vectorPointKey,
  vectorVisualGeometryPoints,
} from "@/features/editor/lib/vector-path";
import {
  type BackgroundMusicSettings,
  type CanvasElement,
  defaultBackgroundMusicSettings,
  defaultSoundAdvancedSettings,
  defaultSoundMixerSettings,
  type ShapeType,
  type SoundAdvancedSettings,
  type SoundMixerSettings,
  useEditorStore,
  type VectorPath,
} from "@/features/editor/store/editor-store";
import { assetPath } from "@/lib/asset-path";

export function EditorShell() {
  const {
    activePageId,
    activeTool,
    addElement,
    addPage,
    artboard,
    checkpoint,
    clipboard,
    copySelected,
    future,
    pages,
    pasteClipboard,
    past,
    redo,
    removePage,
    removeSelected,
    replaceElements,
    renameElement,
    renamePage,
    selectedElementIds,
    selectedShape,
    setActivePageId,
    setActiveTool,
    setSelectedElementIds,
    setSelectedShape,
    setZoom,
    toggleElementLocked,
    toggleElementVisible,
    undo,
    updateArtboard,
    updateAdvancedSound,
    updateBackgroundMusic,
    updateElement,
    updateElements,
    updateSoundMixer,
    zoom,
  } = useEditorStore();
  const activePage = pages.find((page) => page.id === activePageId) ?? pages[0];
  const elements = useMemo(() => activePage?.elements ?? [], [activePage]);
  const backgroundMusicSettings: BackgroundMusicSettings = {
    ...defaultBackgroundMusicSettings,
    ...(activePage?.backgroundMusic ?? {}),
  };
  const advancedSoundSettings: SoundAdvancedSettings = {
    ...defaultSoundAdvancedSettings,
    ...(activePage?.advancedSound ?? {}),
  };
  const soundMixerSettings: SoundMixerSettings = {
    ...defaultSoundMixerSettings,
    ...(activePage?.soundMixer ?? {}),
  };
  const selectionToolActive =
    activeTool === "selection" || activeTool === "settings";
  const [assetTab, setAssetTab] = useState<"image" | "video">("image");
  const [propertyTab, setPropertyTab] = useState<PropertyTab>("design");
  const [uploadedAssets, setUploadedAssets] = useState<string[]>([]);
  const [lockRatio, setLockRatio] = useState(true);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const {
    displayPixelRatio,
    interfaceScaleMode,
    interfaceScaleReady,
    resolvedInterfaceScale,
    selectInterfaceScale,
    viewportWidthCss,
  } = useInterfaceScale();
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [navigatorVisible, setNavigatorVisible] = useState(false);
  const [navigatorViewport, setNavigatorViewport] = useState<NavigatorViewport>(
    {
      height: artboard.height,
      width: artboard.width,
      x: 0,
      y: 0,
    },
  );
  const [drawDraft, setDrawDraft] = useState<DrawDraft | null>(null);
  const [penDraft, setPenDraft] = useState<PenDraft | null>(null);
  const [pendingPenUndoId, setPendingPenUndoId] = useState<string | null>(null);
  const [nodeEditElementId, setNodeEditElementId] = useState<string | null>(
    null,
  );
  const [selectedPenNodes, setSelectedPenNodes] = useState<VectorPointRef[]>(
    [],
  );
  const [selectedPenHandles, setSelectedPenHandles] = useState<
    VectorHandleRef[]
  >([]);
  const [penHandleMirroring] = useState<HandleMirroring>("angle-length");
  const [distanceMeasurements, setDistanceMeasurements] = useState<
    DistanceMeasurement[]
  >([]);
  const [marquee, setMarquee] = useState<{
    start: Point;
    current: Point;
  } | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  const [rulersVisible, setRulersVisible] = useState(false);
  const [guidesByPage, setGuidesByPage] = useState<
    Record<string, EditorGuide[]>
  >({});
  const [guidePreview, setGuidePreview] = useState<{
    orientation: EditorGuide["orientation"];
    position: number;
  } | null>(null);
  const [selectedGuideIds, setSelectedGuideIds] = useState<string[]>([]);
  const [guideClipboard, setGuideClipboard] = useState<EditorGuide[]>([]);
  const [artboardSelected, setArtboardSelected] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [pageNameDraft, setPageNameDraft] = useState("");
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [elementNameDraft, setElementNameDraft] = useState("");
  const canvasRef = useRef<HTMLElement>(null);
  const horizontalRulerRef = useRef<HTMLCanvasElement>(null);
  const verticalRulerRef = useRef<HTMLCanvasElement>(null);
  const guideDragRef = useRef<GuideDrag | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const rawDragActiveRef = useRef(false);
  const renderDragPreviewRef = useRef<(sample: DragPointerSample) => void>(
    () => undefined,
  );
  const horizontalSmartGuideRef = useRef<HTMLDivElement>(null);
  const verticalSmartGuideRef = useRef<HTMLDivElement>(null);
  const distanceMeasurementRefs = useRef<Array<HTMLDivElement | null>>([]);
  const finishPenPathRef = useRef<(() => void) | null>(null);
  const navigatorTimerRef = useRef<number | null>(null);
  const previousZoomRef = useRef(zoom);
  const pointerPositionRef = useRef<Point | null>(null);
  const altPressedRef = useRef(false);
  const lastTextPointerDownRef = useRef<{
    elementId: string;
    time: number;
    x: number;
    y: number;
  } | null>(null);
  const lastPathfinderPointerDownRef = useRef<{
    elementId: string;
    time: number;
    x: number;
    y: number;
  } | null>(null);
  const textEditorRefs = useRef(new Map<string, HTMLDivElement>());
  const viewMenuRef = useRef<HTMLDivElement>(null);

  const totalScale = zoom / 100;
  const selectionUiScale = 100 / Math.max(5, zoom);
  const selectionControlScale = 1 / Math.max(Number.EPSILON, totalScale);
  const selectionOutlineWidth = selectionControlScale;
  const selectionCaptionGap = 8 * selectionUiScale;
  const selectionCaptionHeight = 20 * selectionUiScale;

  const applyZoomToFit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return false;

    const nextZoom = calculateCanvasFitZoom(
      bounds.width,
      bounds.height,
      artboard.width,
      artboard.height,
    );
    setPan((current) =>
      current.x === 0 && current.y === 0 ? current : { x: 0, y: 0 },
    );
    setZoom(nextZoom);
    return true;
  }, [artboard.height, artboard.width, setZoom]);

  useEffect(() => {
    if (!viewMenuOpen) return;
    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (!viewMenuRef.current?.contains(event.target as Node | null)) {
        setViewMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [viewMenuOpen]);

  useEffect(() => {
    if (previousZoomRef.current === zoom) return;
    previousZoomRef.current = zoom;
    setNavigatorVisible(true);
    if (navigatorTimerRef.current) {
      window.clearTimeout(navigatorTimerRef.current);
    }
    navigatorTimerRef.current = window.setTimeout(() => {
      setNavigatorVisible(false);
      navigatorTimerRef.current = null;
    }, 3000);
    return () => {
      if (navigatorTimerRef.current) {
        window.clearTimeout(navigatorTimerRef.current);
        navigatorTimerRef.current = null;
      }
    };
  }, [zoom]);

  useEffect(() => {
    if (!editingTextId) return;
    const editor = textEditorRefs.current.get(editingTextId);
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [editingTextId]);

  useLayoutEffect(() => {
    elements.forEach((element) => {
      if (
        element.type !== "text" ||
        element.textResizeMode !== "auto-width" ||
        editingTextId === element.id
      ) {
        return;
      }
      const editor = textEditorRefs.current.get(element.id);
      if (!editor || editor.scrollWidth <= 0) return;
      const fontSize = element.fontSize ?? 24;
      const lineHeight =
        typeof element.lineHeight === "number"
          ? element.lineHeight * fontSize
          : fontSize * 1.2;
      const width = Math.max(1, Math.ceil(editor.scrollWidth + 1));
      const height = Math.max(lineHeight, Math.ceil(editor.scrollHeight));
      if (
        Math.abs(width - element.width) < 0.5 &&
        Math.abs(height - element.height) < 0.5
      ) {
        return;
      }
      updateElement(element.id, { height, width });
    });
  }, [editingTextId, elements, updateElement]);

  const selectedElements = useMemo(
    () => elements.filter((element) => selectedElementIds.includes(element.id)),
    [elements, selectedElementIds],
  );
  const visiblePropertyTab = propertyTab;
  const guides = useMemo(
    () => guidesByPage[activePageId] ?? [],
    [activePageId, guidesByPage],
  );
  const updateGuides = useCallback(
    (updater: (current: EditorGuide[]) => EditorGuide[]) => {
      setGuidesByPage((current) => ({
        ...current,
        [activePageId]: updater(current[activePageId] ?? []),
      }));
    },
    [activePageId],
  );
  const setStableDistanceMeasurements = useCallback(
    (next: DistanceMeasurement[]) => {
      setDistanceMeasurements((current) =>
        areDistanceMeasurementsEqual(current, next) ? current : next,
      );
    },
    [],
  );
  const updateAltDistanceMeasurements = useCallback(
    (clientX: number, clientY: number) => {
      const pointerTarget = document.elementFromPoint(clientX, clientY);
      if (pointerTarget?.closest(".resize-handle, .line-endpoint")) {
        setStableDistanceMeasurements([]);
        return;
      }

      const selectedGuide =
        selectedElements.length === 0 && selectedGuideIds.length === 1
          ? guides.find((guide) => guide.id === selectedGuideIds[0])
          : undefined;
      const selectedBounds = boundsFromElements(selectedElements);
      if (!selectedBounds && !selectedGuide) {
        setStableDistanceMeasurements([]);
        return;
      }

      const hovered = elementAtClientPoint(clientX, clientY);
      const targetId = hovered?.dataset.elementId;
      const hoveredGuideNode = guideAtClientPoint(clientX, clientY);
      const targetGuide = guides.find(
        (guide) =>
          guide.id === hoveredGuideNode?.dataset.guideId &&
          guide.id !== selectedGuide?.id,
      );

      if (selectedGuide) {
        const target = elements.find((element) => element.id === targetId);
        setStableDistanceMeasurements(
          buildDistanceMeasurementsFromGuide(
            selectedGuide,
            artboard,
            target ? rectFromElement(target) : undefined,
            targetGuide,
          ),
        );
        return;
      }

      if (!selectedBounds) return;
      const selectedIds = new Set(
        selectedElements.map((element) => element.id),
      );
      const subject = selectedBounds;
      const target = elements.find(
        (element) => element.id === targetId && !selectedIds.has(element.id),
      );
      setStableDistanceMeasurements(
        targetGuide
          ? buildGuideDistanceMeasurements(subject, targetGuide)
          : buildDistanceMeasurements(
              subject,
              artboard,
              target ? rectFromElement(target) : undefined,
            ),
      );
    },
    [
      artboard,
      elements,
      guides,
      selectedGuideIds,
      selectedElements,
      setStableDistanceMeasurements,
    ],
  );

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const artboardNode = document.getElementById("editor-artboard");
    if (!canvas || !artboardNode) return;

    const updateNavigatorViewport = () => {
      const canvasBounds = canvas.getBoundingClientRect();
      const artboardBounds = artboardNode.getBoundingClientRect();
      const viewportWidth = canvas.clientWidth / Math.max(0.01, totalScale);
      const viewportHeight = canvas.clientHeight / Math.max(0.01, totalScale);
      const x =
        (canvasBounds.left - artboardBounds.left) / Math.max(0.01, totalScale);
      const y =
        (canvasBounds.top - artboardBounds.top) / Math.max(0.01, totalScale);
      setNavigatorViewport((current) => {
        const next = {
          height: viewportHeight,
          width: viewportWidth,
          x,
          y,
        };
        return Math.abs(current.x - next.x) < 0.1 &&
          Math.abs(current.y - next.y) < 0.1 &&
          Math.abs(current.width - next.width) < 0.1 &&
          Math.abs(current.height - next.height) < 0.1
          ? current
          : next;
      });
    };

    updateNavigatorViewport();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateNavigatorViewport);
      return () =>
        window.removeEventListener("resize", updateNavigatorViewport);
    }
    const observer = new ResizeObserver(updateNavigatorViewport);
    observer.observe(canvas);
    window.addEventListener("resize", updateNavigatorViewport);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateNavigatorViewport);
    };
  }, [artboard.height, artboard.width, pan.x, pan.y, totalScale]);

  useEffect(() => {
    if (!rulersVisible) return;
    const canvas = canvasRef.current;
    const horizontalRuler = horizontalRulerRef.current;
    const verticalRuler = verticalRulerRef.current;
    if (!canvas || !horizontalRuler || !verticalRuler) return;

    let frame = 0;
    const render = () => {
      frame = 0;
      const canvasBounds = canvas.getBoundingClientRect();
      const artboardNode = document.getElementById("editor-artboard");
      if (!artboardNode) return;
      const artboardBounds = artboardNode.getBoundingClientRect();
      const horizontalWidth = Math.max(1, canvas.clientWidth - rulerSize);
      const verticalHeight = Math.max(1, canvas.clientHeight - rulerSize);
      const horizontalOrigin =
        artboardBounds.left - canvasBounds.left - rulerSize;
      const verticalOrigin = artboardBounds.top - canvasBounds.top - rulerSize;
      const selectedNodes = selectedElementIds
        .map((id) =>
          canvas.querySelector<HTMLElement>(`[data-element-id="${id}"]`),
        )
        .filter((node): node is HTMLElement => Boolean(node));
      const highlightNodes = selectedNodes.length
        ? selectedNodes
        : [artboardNode];
      const horizontalRanges = highlightNodes.map((node) => {
        const bounds = node.getBoundingClientRect();
        return {
          end: bounds.right - canvasBounds.left - rulerSize,
          start: bounds.left - canvasBounds.left - rulerSize,
        };
      });
      const verticalRanges = highlightNodes.map((node) => {
        const bounds = node.getBoundingClientRect();
        return {
          end: bounds.bottom - canvasBounds.top - rulerSize,
          start: bounds.top - canvasBounds.top - rulerSize,
        };
      });
      const horizontalContext = prepareRulerCanvas(
        horizontalRuler,
        horizontalWidth,
        rulerSize,
      );
      const verticalContext = prepareRulerCanvas(
        verticalRuler,
        rulerSize,
        verticalHeight,
      );
      if (horizontalContext) {
        drawRuler(
          horizontalContext,
          "horizontal",
          horizontalWidth,
          rulerSize,
          horizontalOrigin,
          totalScale,
          horizontalRanges,
        );
      }
      if (verticalContext) {
        drawRuler(
          verticalContext,
          "vertical",
          rulerSize,
          verticalHeight,
          verticalOrigin,
          totalScale,
          verticalRanges,
        );
      }
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    schedule();
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(canvas);
    window.addEventListener("resize", schedule);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [
    artboard.height,
    artboard.width,
    elements,
    pan.x,
    pan.y,
    rulersVisible,
    selectedElementIds,
    totalScale,
    displayPixelRatio,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventBrowserZoom = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault();
    };
    canvas.addEventListener("wheel", preventBrowserZoom, { passive: false });
    return () => canvas.removeEventListener("wheel", preventBrowserZoom);
  }, []);

  const moveSelectedPenNodes = useCallback(
    (delta: Point) => {
      if (!nodeEditElementId || !selectedPenNodes.length) return false;
      const element = elements.find((item) => item.id === nodeEditElementId);
      if (!element || element.type !== "pen") return false;
      const selectedKeys = new Set(
        selectedPenNodes.map((nodeRef) => vectorPointKey(nodeRef)),
      );
      const paths = cloneVectorPaths(vectorPathsForElement(element)).map(
        (path, pathIndex) => ({
          ...path,
          points: path.points.map((point, nodeIndex) => {
            if (!selectedKeys.has(vectorPointKey({ pathIndex, nodeIndex }))) {
              return point;
            }
            return {
              ...point,
              x: point.x + delta.x,
              y: point.y + delta.y,
              handleIn: point.handleIn
                ? {
                    x: point.handleIn.x + delta.x,
                    y: point.handleIn.y + delta.y,
                  }
                : undefined,
              handleOut: point.handleOut
                ? {
                    x: point.handleOut.x + delta.x,
                    y: point.handleOut.y + delta.y,
                  }
                : undefined,
            };
          }),
        }),
      );
      checkpoint();
      updateElement(element.id, vectorElementGeometryUpdate(element, paths));
      return true;
    },
    [checkpoint, elements, nodeEditElementId, selectedPenNodes, updateElement],
  );

  const removeLastPenDraftPoint = useCallback(() => {
    if (!penDraft) return false;
    gestureRef.current = null;
    const points = penDraft.points.slice(0, -1);
    if (!points.length) {
      setPenDraft(null);
      return true;
    }
    const lastPoint = points.at(-1)!;
    setPenDraft({
      ...penDraft,
      current: { x: lastPoint.x, y: lastPoint.y },
      isDragging: false,
      points,
    });
    return true;
  }, [penDraft]);

  const removeLastPenNode = useCallback(
    (elementId: string) => {
      const element = elements.find((item) => item.id === elementId);
      if (!element || element.type !== "pen") return false;

      const paths = cloneVectorPaths(vectorPathsForElement(element));
      const lastPathIndex = paths.findLastIndex((path) => path.points.length);
      if (lastPathIndex < 0) return false;

      const nextPaths = clearOrphanedVectorHandles(
        paths
          .map((path, pathIndex) =>
            pathIndex === lastPathIndex
              ? { ...path, points: path.points.slice(0, -1) }
              : path,
          )
          .filter((path) => path.points.length > 0),
      );

      const remainingPointCount = nextPaths.reduce(
        (total, path) => total + path.points.length,
        0,
      );
      if (!nextPaths.length || remainingPointCount < 2) {
        setSelectedElementIds([elementId]);
        removeSelected();
        setPendingPenUndoId(null);
        setNodeEditElementId(null);
        setSelectedPenNodes([]);
        setSelectedPenHandles([]);
        return true;
      }

      checkpoint();
      updateElement(
        element.id,
        vectorElementGeometryUpdate(element, nextPaths),
      );
      setPendingPenUndoId(null);
      setSelectedPenNodes([]);
      setSelectedPenHandles([]);
      return true;
    },
    [
      checkpoint,
      elements,
      removeSelected,
      setSelectedElementIds,
      updateElement,
    ],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (previewVisible) {
        if (event.key === "Escape") {
          event.preventDefault();
          setPreviewVisible(false);
        }
        return;
      }
      if (event.code === "Space" && !isEditableTarget(event.target)) {
        event.preventDefault();
        const focusedElement = document.activeElement;
        if (
          focusedElement instanceof HTMLElement &&
          focusedElement.closest(".tool-rail")
        ) {
          focusedElement.blur();
        }
        setSpacePressed(true);
      }
      if (isEditableTarget(event.target)) return;

      if (
        event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        event.code === "Digit1"
      ) {
        event.preventDefault();
        setViewMenuOpen(false);
        applyZoomToFit();
        return;
      }

      if (event.key === "Alt") {
        event.preventDefault();
        altPressedRef.current = true;
        const pointerPosition = pointerPositionRef.current;
        if (pointerPosition && !gestureRef.current) {
          updateAltDistanceMeasurements(pointerPosition.x, pointerPosition.y);
        }
        return;
      }

      if (
        event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        event.key.toLowerCase() === "g"
      ) {
        event.preventDefault();
        if (
          !selectedElements.length ||
          selectedElements.some((element) => element.locked)
        ) {
          return;
        }
        const selectedGroupIds = new Set(
          selectedElements
            .map((element) => element.groupId)
            .filter((groupId): groupId is string => Boolean(groupId)),
        );
        const selectedGroupId =
          selectedGroupIds.size === 1 ? [...selectedGroupIds][0] : undefined;
        const shouldUngroup = Boolean(
          selectedGroupId &&
          selectedElements.every(
            (element) => element.groupId === selectedGroupId,
          ),
        );
        if (shouldUngroup && selectedGroupId) {
          const groupedElements = elements.filter(
            (element) => element.groupId === selectedGroupId,
          );
          checkpoint();
          groupedElements.forEach((element) =>
            updateElement(element.id, { groupId: undefined }),
          );
          setSelectedElementIds(groupedElements.map((element) => element.id));
          return;
        }
        if (selectedElements.length < 2) return;
        const groupId = createElementId("group");
        checkpoint();
        selectedElements.forEach((element) =>
          updateElement(element.id, { groupId }),
        );
        return;
      }

      if (!event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "t") {
        event.preventDefault();
        if (penDraft) finishPenPathRef.current?.();
        setPenDraft(null);
        setNodeEditElementId(null);
        setSelectedPenNodes([]);
        setSelectedPenHandles([]);
        setActiveTool("text");
        return;
      }

      if (!event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setSelectedShape("pen");
        setActiveTool("rectangle");
        return;
      }

      if (
        event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        event.key.toLowerCase() === "r"
      ) {
        event.preventDefault();
        setRulersVisible((visible) => !visible);
        setGuidePreview(null);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (penDraft) {
          if (!event.shiftKey) removeLastPenDraftPoint();
          return;
        }
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        if (artboardSelected) return;
        if (selectedGuideIds.length) {
          setGuideClipboard(
            guides
              .filter((guide) => selectedGuideIds.includes(guide.id))
              .map((guide) => ({ ...guide })),
          );
        } else {
          setGuideClipboard([]);
          copySelected();
        }
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
        event.preventDefault();
        if (guideClipboard.length) {
          const pastedGuides = guideClipboard.map((guide) => ({
            ...guide,
            id: createElementId("guide"),
            position: guide.position + 16,
          }));
          updateGuides((current) => [...current, ...pastedGuides]);
          setSelectedElementIds([]);
          setSelectedGuideIds(pastedGuides.map((guide) => guide.id));
        } else {
          pasteClipboard();
        }
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelectedElementIds(
          elements
            .filter((element) => element.visible)
            .map((element) => element.id),
        );
        setSelectedGuideIds([]);
        setArtboardSelected(false);
        return;
      }
      if (event.key === "Enter") {
        const selectedText =
          selectedElements.length === 1 && selectedElements[0].type === "text"
            ? selectedElements[0]
            : null;
        if (selectedText) {
          event.preventDefault();
          setEditingTextId(selectedText.id);
          return;
        }
        const selectedPen =
          selectedElements.length === 1 && selectedElements[0].type === "pen"
            ? selectedElements[0]
            : null;
        if (selectedPen) {
          event.preventDefault();
          setNodeEditElementId(selectedPen.id);
          setSelectedPenNodes([]);
          setSelectedPenHandles([]);
          return;
        }
      }
      if (
        nodeEditElementId &&
        selectedPenNodes.length &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        event.preventDefault();
        const amount = event.shiftKey ? 10 : 1;
        const delta = {
          x:
            event.key === "ArrowLeft"
              ? -amount
              : event.key === "ArrowRight"
                ? amount
                : 0,
          y:
            event.key === "ArrowUp"
              ? -amount
              : event.key === "ArrowDown"
                ? amount
                : 0,
        };
        moveSelectedPenNodes(delta);
        return;
      }
      if (
        !nodeEditElementId &&
        selectedElementIds.length &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        const movableIds = selectedElementIds.filter((id) =>
          elements.some((element) => element.id === id && !element.locked),
        );
        if (!movableIds.length) return;

        event.preventDefault();
        const amount = event.shiftKey ? 10 : 1;
        const delta = {
          x:
            event.key === "ArrowLeft"
              ? -amount
              : event.key === "ArrowRight"
                ? amount
                : 0,
          y:
            event.key === "ArrowUp"
              ? -amount
              : event.key === "ArrowDown"
                ? amount
                : 0,
        };
        checkpoint();
        updateElements(movableIds, delta.x, delta.y);
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        if (penDraft) {
          removeLastPenDraftPoint();
          return;
        }
        if (
          !nodeEditElementId &&
          pendingPenUndoId &&
          selectedElementIds.length === 1 &&
          selectedElementIds[0] === pendingPenUndoId &&
          removeLastPenNode(pendingPenUndoId)
        ) {
          return;
        }
        if (
          nodeEditElementId &&
          !selectedPenNodes.length &&
          !selectedPenHandles.length &&
          removeLastPenNode(nodeEditElementId)
        ) {
          return;
        }
        if (
          nodeEditElementId &&
          (selectedPenNodes.length || selectedPenHandles.length)
        ) {
          const element = elements.find(
            (item) => item.id === nodeEditElementId,
          );
          if (element?.type === "pen") {
            const paths = cloneVectorPaths(vectorPathsForElement(element));
            const selectedNodeKeys = new Set(
              selectedPenNodes.map((nodeRef) => vectorPointKey(nodeRef)),
            );
            const selectedHandleKeys = new Set(
              selectedPenHandles.map((handleRef) => vectorHandleKey(handleRef)),
            );
            const nextPaths = clearOrphanedVectorHandles(
              paths
                .map((path, pathIndex) => ({
                  ...path,
                  points: path.points
                    .map((point, nodeIndex) => ({ point, nodeIndex }))
                    .filter(
                      ({ nodeIndex }) =>
                        !selectedNodeKeys.has(
                          vectorPointKey({ pathIndex, nodeIndex }),
                        ),
                    )
                    .map(({ point, nodeIndex }) => ({
                      ...point,
                      handleIn: selectedHandleKeys.has(
                        vectorHandleKey({ pathIndex, nodeIndex, handle: "in" }),
                      )
                        ? undefined
                        : point.handleIn,
                      handleOut: selectedHandleKeys.has(
                        vectorHandleKey({
                          pathIndex,
                          nodeIndex,
                          handle: "out",
                        }),
                      )
                        ? undefined
                        : point.handleOut,
                    })),
                }))
                .filter((path) => path.points.length > 0),
            );
            checkpoint();
            const remainingPointCount = nextPaths.reduce(
              (total, path) => total + path.points.length,
              0,
            );
            if (!nextPaths.length || remainingPointCount < 2) {
              setSelectedElementIds([element.id]);
              removeSelected();
              setNodeEditElementId(null);
              setSelectedPenNodes([]);
              setSelectedPenHandles([]);
            } else {
              updateElement(
                element.id,
                vectorElementGeometryUpdate(element, nextPaths),
              );
              setSelectedPenNodes([]);
              setSelectedPenHandles([]);
            }
          }
          return;
        }
        if (nodeEditElementId) return;
        if (artboardSelected) {
          removePage();
          setArtboardSelected(false);
          return;
        }
        const hasElementSelection = selectedElementIds.length > 0;
        const hasGuideSelection = selectedGuideIds.length > 0;
        if (hasElementSelection) removeSelected();
        if (hasGuideSelection) {
          updateGuides((current) =>
            current.filter((guide) => !selectedGuideIds.includes(guide.id)),
          );
          setSelectedGuideIds([]);
        }
        if (!hasElementSelection && !hasGuideSelection) removePage();
        return;
      }
      if (event.key === "Escape") {
        if (penDraft) {
          finishPenPathRef.current?.();
          gestureRef.current = null;
          setActiveTool("selection");
          return;
        }
        if (nodeEditElementId) {
          setNodeEditElementId(null);
          setSelectedPenNodes([]);
          setSelectedPenHandles([]);
          return;
        }
        setEditingTextId(null);
        setPenDraft(null);
        setSelectedElementIds([]);
        setSelectedGuideIds([]);
        setArtboardSelected(false);
        setActiveTool("selection");
        previewSmartGuides(
          {
            horizontal: horizontalSmartGuideRef.current,
            vertical: verticalSmartGuideRef.current,
          },
          [],
        );
        previewDistanceMeasurements(distanceMeasurementRefs.current, []);
        setStableDistanceMeasurements([]);
        (document.activeElement as HTMLElement | null)?.blur();
        return;
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpacePressed(false);
      if (event.key === "Alt") {
        altPressedRef.current = false;
        previewDistanceMeasurements(distanceMeasurementRefs.current, []);
        setStableDistanceMeasurements([]);
      }
    };
    const clearTransientModifierState = () => {
      altPressedRef.current = false;
      setSpacePressed(false);
      previewDistanceMeasurements(distanceMeasurementRefs.current, []);
      setStableDistanceMeasurements([]);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearTransientModifierState();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearTransientModifierState);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearTransientModifierState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    applyZoomToFit,
    artboardSelected,
    checkpoint,
    copySelected,
    elements,
    guideClipboard,
    guides,
    pasteClipboard,
    redo,
    removePage,
    removeSelected,
    removeLastPenDraftPoint,
    removeLastPenNode,
    moveSelectedPenNodes,
    nodeEditElementId,
    pendingPenUndoId,
    penDraft,
    previewVisible,
    selectedElements,
    selectedGuideIds,
    selectedElementIds,
    selectedPenHandles,
    selectedPenNodes,
    setStableDistanceMeasurements,
    setSelectedPenHandles,
    setSelectedPenNodes,
    setSelectedShape,
    setActiveTool,
    setSelectedElementIds,
    undo,
    updateAltDistanceMeasurements,
    updateElement,
    updateElements,
    updateGuides,
  ]);

  const getLocalPoint = (clientX: number, clientY: number): Point => {
    return localPointFromElement(
      document.getElementById("editor-artboard"),
      clientX,
      clientY,
      totalScale,
    );
  };

  const zoomAtClientPoint = (
    requestedZoom: number,
    clientX: number,
    clientY: number,
  ) => {
    const nextZoom = clamp(requestedZoom, 5, 500);
    if (nextZoom === zoom) return;
    const artboardNode = document.getElementById("editor-artboard");
    if (!artboardNode) {
      setZoom(nextZoom);
      return;
    }
    const bounds = artboardNode.getBoundingClientRect();
    const currentCenter = {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    };
    const nextScale = nextZoom / 100;
    const scaleRatio = nextScale / Math.max(0.01, totalScale);
    setPan((current) => ({
      x: current.x + (clientX - currentCenter.x) * (1 - scaleRatio),
      y: current.y + (clientY - currentCenter.y) * (1 - scaleRatio),
    }));
    setZoom(nextZoom);
  };

  const zoomAtCanvasCenter = (requestedZoom: number) => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) {
      setZoom(requestedZoom);
      return;
    }
    zoomAtClientPoint(
      requestedZoom,
      bounds.left + bounds.width / 2,
      bounds.top + bounds.height / 2,
    );
  };

  const getCanvasGuidePosition = (
    orientation: EditorGuide["orientation"],
    clientX: number,
    clientY: number,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const bounds = canvas.getBoundingClientRect();
    return orientation === "horizontal"
      ? clientY - bounds.top
      : clientX - bounds.left;
  };

  const getWorldGuidePosition = (
    orientation: EditorGuide["orientation"],
    clientX: number,
    clientY: number,
  ) => {
    const artboardNode = document.getElementById("editor-artboard");
    if (!artboardNode) return 0;
    const bounds = artboardNode.getBoundingClientRect();
    return orientation === "horizontal"
      ? (clientY - bounds.top) / totalScale
      : (clientX - bounds.left) / totalScale;
  };

  const snapGuidePosition = (
    orientation: EditorGuide["orientation"],
    position: number,
  ) => {
    const elementEdges = elements
      .filter((element) => element.visible)
      .flatMap((element) =>
        orientation === "horizontal"
          ? [element.y, element.y + element.height]
          : [element.x, element.x + element.width],
      );
    const candidates = [
      0,
      orientation === "horizontal" ? artboard.height : artboard.width,
      ...elementEdges,
    ];
    const threshold = 8 / Math.max(totalScale, 0.01);
    const nearest = candidates.reduce((current, candidate) =>
      Math.abs(candidate - position) < Math.abs(current - position)
        ? candidate
        : current,
    );
    return Math.abs(nearest - position) <= threshold ? nearest : position;
  };

  const getCanvasPositionForWorldGuide = (
    orientation: EditorGuide["orientation"],
    position: number,
  ) => {
    const canvas = canvasRef.current;
    const artboardNode = document.getElementById("editor-artboard");
    if (!canvas || !artboardNode) return 0;
    const canvasBounds = canvas.getBoundingClientRect();
    const artboardBounds = artboardNode.getBoundingClientRect();
    return orientation === "horizontal"
      ? artboardBounds.top - canvasBounds.top + position * totalScale
      : artboardBounds.left - canvasBounds.left + position * totalScale;
  };

  const previewGuideBoardDistance = (
    orientation: EditorGuide["orientation"],
    position: number,
  ) => {
    setStableDistanceMeasurements(
      buildDistanceMeasurementsFromGuide(
        { id: "guide-drag-preview", orientation, position },
        artboard,
      ),
    );
  };

  const handleRulerPointerDown = (
    event: ReactPointerEvent<HTMLCanvasElement>,
    orientation: EditorGuide["orientation"],
  ) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    guideDragRef.current = {
      orientation,
      pointerId: event.pointerId,
      source: "ruler",
    };
    setSelectedGuideIds([]);
    previewDistanceMeasurements(distanceMeasurementRefs.current, []);
    setStableDistanceMeasurements([]);
    setGuidePreview({
      orientation,
      position: getCanvasGuidePosition(
        orientation,
        event.clientX,
        event.clientY,
      ),
    });
  };

  const handleGuidePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    guide: EditorGuide,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedElementIds([]);
    setSelectedGuideIds([guide.id]);
    event.currentTarget.setPointerCapture(event.pointerId);
    guideDragRef.current = {
      guideId: guide.id,
      orientation: guide.orientation,
      pointerId: event.pointerId,
      source: "guide",
    };
    previewGuideBoardDistance(guide.orientation, guide.position);
  };

  const handleGuidePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = guideDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const position = snapGuidePosition(
      drag.orientation,
      getWorldGuidePosition(drag.orientation, event.clientX, event.clientY),
    );
    if (drag.source === "ruler") {
      setGuidePreview({
        orientation: drag.orientation,
        position: getCanvasPositionForWorldGuide(drag.orientation, position),
      });
      previewGuideBoardDistance(drag.orientation, position);
      return;
    }

    updateGuides((current) =>
      current.map((guide) =>
        guide.id === drag.guideId ? { ...guide, position } : guide,
      ),
    );
    previewGuideBoardDistance(drag.orientation, position);
  };

  const handleGuidePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = guideDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const canvas = canvasRef.current;
    const canvasBounds = canvas?.getBoundingClientRect();
    const returnedToRuler = canvasBounds
      ? drag.orientation === "horizontal"
        ? event.clientY <= canvasBounds.top + rulerSize
        : event.clientX <= canvasBounds.left + rulerSize
      : false;

    if (drag.source === "ruler") {
      const insideCanvas = canvasBounds
        ? event.clientX >= canvasBounds.left &&
          event.clientX <= canvasBounds.right &&
          event.clientY >= canvasBounds.top &&
          event.clientY <= canvasBounds.bottom
        : false;
      if (insideCanvas && !returnedToRuler) {
        const guideId = createElementId("guide");
        updateGuides((current) => [
          ...current,
          {
            id: guideId,
            orientation: drag.orientation,
            position: snapGuidePosition(
              drag.orientation,
              getWorldGuidePosition(
                drag.orientation,
                event.clientX,
                event.clientY,
              ),
            ),
          },
        ]);
        setSelectedElementIds([]);
        setSelectedGuideIds([guideId]);
      }
      setGuidePreview(null);
    } else if (returnedToRuler) {
      updateGuides((current) =>
        current.filter((guide) => guide.id !== drag.guideId),
      );
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    previewDistanceMeasurements(distanceMeasurementRefs.current, []);
    setStableDistanceMeasurements([]);
    guideDragRef.current = null;
  };

  const beginPenPath = (event: ReactPointerEvent<HTMLElement>) => {
    const rawPoint = getLocalPoint(event.clientX, event.clientY);
    const branchElement = penDraft?.branchElementId
      ? elements.find((element) => element.id === penDraft.branchElementId)
      : undefined;
    const localPoint = branchElement
      ? elementLocalPoint(branchElement, rawPoint)
      : rawPoint;
    const previousPoint = penDraft?.points.at(-1);
    const point =
      event.shiftKey && previousPoint
        ? constrainAngle(localPoint, previousPoint)
        : localPoint;
    const firstPoint = penDraft?.points[0];
    const closesPath =
      firstPoint &&
      penDraft.points.length >= 2 &&
      Math.hypot(point.x - firstPoint.x, point.y - firstPoint.y) <= 8;
    if (closesPath && penDraft) {
      createElementFromPenDraft({
        ...penDraft,
        closed: true,
        current: firstPoint,
        isDragging: false,
      });
      setPenDraft(null);
      gestureRef.current = null;
      return;
    }

    const anchor: PenAnchor = { x: point.x, y: point.y };
    const points = penDraft ? [...penDraft.points, anchor] : [anchor];
    setPenDraft({ current: point, isDragging: false, points });
    gestureRef.current = {
      kind: "pen",
      pointerId: event.pointerId,
      anchorIndex: points.length - 1,
      start: point,
    };
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const beginDrawing = (event: ReactPointerEvent<HTMLElement>) => {
    if (activeTool !== "text" && selectedShape === "pen") {
      beginPenPath(event);
      return;
    }

    const point = getLocalPoint(event.clientX, event.clientY);
    const draft: DrawDraft = {
      current: point,
      start: point,
      type:
        activeTool === "text"
          ? "text"
          : (selectedShape as Exclude<ShapeType, "pen">),
    };
    rawDragActiveRef.current = false;
    gestureRef.current = {
      kind: "draw",
      pointerId: event.pointerId,
      draft,
      scale: totalScale,
      startClient: { x: event.clientX, y: event.clientY },
    };
    setDrawDraft(draft);
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const createElementFromDraft = (draft: DrawDraft) => {
    let bounds = boundsFromPoints(draft.start, draft.current);
    const isClick = bounds.width < 4 && bounds.height < 4;
    if (isClick) {
      const defaults =
        draft.type === "text"
          ? { width: 1, height: 29 }
          : draft.type === "line"
            ? { width: 120, height: 40 }
            : { width: 100, height: 100 };
      bounds = {
        x: draft.start.x,
        y: draft.start.y,
        ...defaults,
      };
    }

    const type = draft.type;
    const line =
      type === "line"
        ? lineGeometry(
            draft.start,
            isClick
              ? { x: draft.start.x + 120, y: draft.start.y }
              : draft.current,
          )
        : null;
    const baseName = type === "text" ? "Text" : shapeNames[type];
    const count =
      elements.filter((element) => element.type === type).length + 1;
    const id = createElementId(type);
    setPendingPenUndoId(null);
    addElement({
      id,
      name: `${baseName} ${count}`,
      type,
      x: Math.round(line?.x ?? bounds.x),
      y: Math.round(line?.y ?? bounds.y),
      width: Math.round(line?.width ?? Math.max(8, bounds.width)),
      height: Math.round(line?.height ?? Math.max(8, bounds.height)),
      rotation: line?.rotation ?? 0,
      opacity: 100,
      fill: type === "text" ? "#000000" : "#ffffff",
      stroke: type === "text" ? "transparent" : "#000000",
      strokeWidth: type === "text" ? 0 : 1,
      strokeStyle: type === "line" ? "solid" : "none",
      cornerRadius: 0,
      visible: true,
      locked: false,
      text: type === "text" ? "" : undefined,
      textResizeMode:
        type === "text" ? (isClick ? "auto-width" : "fixed") : undefined,
    });
    if (type === "text") setEditingTextId(id);
    setArtboardSelected(false);
  };

  const seedPenCreationHistory = (
    element: CanvasElement,
    paths: VectorPath[],
    appendedPathIndex: number,
  ) => {
    const appendedPath = paths[appendedPathIndex];
    if (!appendedPath || appendedPath.points.length < 2) return;

    for (
      let pointCount = 2;
      pointCount < appendedPath.points.length;
      pointCount += 1
    ) {
      const partialPaths = paths.map((path, pathIndex) =>
        pathIndex === appendedPathIndex
          ? { ...path, closed: false, points: path.points.slice(0, pointCount) }
          : path,
      );
      updateElement(
        element.id,
        vectorElementGeometryUpdate(element, partialPaths),
      );
      checkpoint();
    }
    updateElement(element.id, vectorElementGeometryUpdate(element, paths));
  };

  const createElementFromPenDraft = (draft: PenDraft) => {
    const points = draft.points.filter(
      (point, index) =>
        index === 0 ||
        point.x !== draft.points[index - 1].x ||
        point.y !== draft.points[index - 1].y,
    );
    if (points.length < 2) return;
    if (draft.branchElementId) {
      const target = elements.find(
        (element) => element.id === draft.branchElementId,
      );
      if (target?.type === "pen") {
        const paths = [
          ...cloneVectorPaths(vectorPathsForElement(target)),
          { points, closed: draft.closed },
        ];
        checkpoint();
        seedPenCreationHistory(target, paths, paths.length - 1);
        setSelectedElementIds([target.id]);
        setNodeEditElementId(target.id);
        setSelectedPenNodes([]);
        setSelectedPenHandles([]);
        setPendingPenUndoId(target.id);
        return;
      }
    }
    const bounds = boundsFromPointList(
      vectorVisualGeometryPoints([{ points, closed: draft.closed }]),
    );
    const localPoints = points.map((point) => ({
      x: point.x - bounds.x,
      y: point.y - bounds.y,
      handleIn: point.handleIn
        ? {
            x: point.handleIn.x - bounds.x,
            y: point.handleIn.y - bounds.y,
          }
        : undefined,
      handleOut: point.handleOut
        ? {
            x: point.handleOut.x - bounds.x,
            y: point.handleOut.y - bounds.y,
          }
        : undefined,
    }));
    const count =
      elements.filter((element) => element.type === "pen").length + 1;
    const id = createElementId("pen");
    const fullPaths = [{ points: localPoints, closed: draft.closed }];
    const createdElement: CanvasElement = {
      id,
      name: `Pen ${count}`,
      type: "pen",
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.max(8, Math.round(bounds.width)),
      height: Math.max(8, Math.round(bounds.height)),
      rotation: 0,
      opacity: 100,
      fill: "transparent",
      stroke: "#000000",
      strokeWidth: 1,
      strokeStyle: "solid",
      cornerRadius: 0,
      visible: true,
      locked: false,
      points: localPoints,
      closed: draft.closed,
      vectorPaths: fullPaths,
    };
    addElement(createdElement);
    seedPenCreationHistory(createdElement, fullPaths, 0);
    setPendingPenUndoId(id);
    setNodeEditElementId(id);
    setSelectedPenNodes([]);
    setSelectedPenHandles([]);
    setArtboardSelected(false);
  };

  function finishPenPath() {
    if (!penDraft) return;
    createElementFromPenDraft(penDraft);
    setPenDraft(null);
  }

  finishPenPathRef.current = finishPenPath;

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    const usingHand = activeTool === "hand" || spacePressed;
    if (usingHand) {
      rawDragActiveRef.current = false;
      gestureRef.current = {
        currentPan: pan,
        kind: "pan",
        pointerId: event.pointerId,
        startClient: { x: event.clientX, y: event.clientY },
        startPan: pan,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (activeTool === "zoom") {
      zoomAtClientPoint(
        zoom + (event.button === 2 ? -10 : 10),
        event.clientX,
        event.clientY,
      );
      return;
    }
    if (activeTool === "rectangle" || activeTool === "text") {
      if (
        event.target instanceof Element &&
        event.target.closest(".navigator")
      ) {
        return;
      }
      setArtboardSelected(false);
      beginDrawing(event);
      return;
    }
    if (event.target === event.currentTarget && selectionToolActive) {
      setSelectedElementIds([]);
      setSelectedGuideIds([]);
      setNodeEditElementId(null);
      setArtboardSelected(false);
    }
  };

  const handlePenPathPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    element: CanvasElement,
  ) => {
    const paths = vectorPathsForElement(element);
    const localPoint = elementLocalPoint(
      element,
      getLocalPoint(event.clientX, event.clientY),
    );
    const insertion = nearestVectorPathPosition(paths, localPoint);
    if (!insertion || insertion.distance > 14 / Math.max(0.08, totalScale)) {
      return false;
    }
    const nextPaths = cloneVectorPaths(paths);
    const nextPath = splitVectorSegment(
      nextPaths[insertion.pathIndex],
      insertion.segmentIndex,
      clamp(insertion.t, 0.05, 0.95),
    );
    nextPaths[insertion.pathIndex] = nextPath;
    const insertedNodeIndex =
      nextPath.points.length === paths[insertion.pathIndex].points.length + 1
        ? insertion.segmentIndex + 1
        : nextPath.points.length - 1;
    checkpoint();
    updateElement(element.id, vectorElementGeometryUpdate(element, nextPaths));
    setSelectedPenNodes([
      { pathIndex: insertion.pathIndex, nodeIndex: insertedNodeIndex },
    ]);
    setSelectedPenHandles([]);
    event.preventDefault();
    event.stopPropagation();
    return true;
  };

  const handleArtboardPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (spacePressed) return;
    if (activeTool === "rectangle" || activeTool === "text") {
      event.stopPropagation();
      setArtboardSelected(false);
      beginDrawing(event);
      return;
    }
    if (!selectionToolActive || spacePressed) return;

    event.stopPropagation();
    setSelectedGuideIds([]);
    setNodeEditElementId(null);
    setArtboardSelected(false);
    const point = getLocalPoint(event.clientX, event.clientY);
    rawDragActiveRef.current = false;
    gestureRef.current = {
      kind: "marquee",
      pointerId: event.pointerId,
      start: point,
      current: point,
      additive: event.shiftKey,
      scale: totalScale,
      startClient: { x: event.clientX, y: event.clientY },
    };
    setMarquee({ start: point, current: point });
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const handleElementPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    element: CanvasElement,
  ) => {
    const penToolActive = activeTool === "rectangle" && selectedShape === "pen";
    if (editingTextId === element.id) {
      event.stopPropagation();
      return;
    }
    if (selectionToolActive && element.type === "text") {
      const previous = lastTextPointerDownRef.current;
      const now = event.timeStamp;
      const isDoubleClick = Boolean(
        previous &&
        previous.elementId === element.id &&
        now - previous.time <= 400 &&
        Math.hypot(event.clientX - previous.x, event.clientY - previous.y) <= 6,
      );
      lastTextPointerDownRef.current = {
        elementId: element.id,
        time: now,
        x: event.clientX,
        y: event.clientY,
      };
      if (isDoubleClick && !element.locked) {
        event.preventDefault();
        event.stopPropagation();
        gestureRef.current = null;
        setSelectedElementIds([element.id]);
        setSelectedGuideIds([]);
        setNodeEditElementId(null);
        setArtboardSelected(false);
        setEditingTextId(element.id);
        return;
      }
    }
    if (activeTool === "text" && element.type === "text" && !element.locked) {
      event.stopPropagation();
      setSelectedElementIds([element.id]);
      setSelectedGuideIds([]);
      setEditingTextId(element.id);
      setNodeEditElementId(null);
      setArtboardSelected(false);
      return;
    }
    if ((!selectionToolActive && !penToolActive) || spacePressed) {
      return;
    }
    if (
      selectionToolActive &&
      element.type === "pen" &&
      element.pathfinder &&
      nodeEditElementId !== element.id
    ) {
      const previous = lastPathfinderPointerDownRef.current;
      const now = event.timeStamp;
      const isDoubleClick = Boolean(
        previous &&
        previous.elementId === element.id &&
        now - previous.time <= 400 &&
        Math.hypot(event.clientX - previous.x, event.clientY - previous.y) <= 6,
      );
      lastPathfinderPointerDownRef.current = isDoubleClick
        ? null
        : {
            elementId: element.id,
            time: now,
            x: event.clientX,
            y: event.clientY,
          };
      if (isDoubleClick && !element.locked) {
        event.preventDefault();
        event.stopPropagation();
        gestureRef.current = null;
        setSelectedElementIds([element.id]);
        setSelectedGuideIds([]);
        setNodeEditElementId(element.id);
        setSelectedPenNodes([]);
        setSelectedPenHandles([]);
        setArtboardSelected(false);
        return;
      }
    }
    event.stopPropagation();
    if (penToolActive && element.type === "pen") {
      if (!nodeEditElementId) {
        setNodeEditElementId(element.id);
        setSelectedElementIds([element.id]);
        setSelectedPenNodes([]);
        setSelectedPenHandles([]);
      }
      if (event.target instanceof SVGPathElement) {
        handlePenPathPointerDown(event, element);
      }
      return;
    }
    if (
      element.type === "pen" &&
      nodeEditElementId === element.id &&
      event.target instanceof SVGPathElement
    ) {
      handlePenPathPointerDown(event, element);
      return;
    }
    if (element.type === "pen" && !element.pathfinder && !event.shiftKey) {
      setNodeEditElementId(element.id);
      setSelectedPenNodes([]);
      setSelectedPenHandles([]);
    } else if (nodeEditElementId !== element.id) {
      setNodeEditElementId(null);
      setSelectedPenNodes([]);
      setSelectedPenHandles([]);
    }
    setSelectedGuideIds([]);
    setArtboardSelected(false);

    const targetSelectionIds = selectionIdsForElement(elements, element);
    const targetSelectionSet = new Set(targetSelectionIds);
    let nextSelection = selectedElementIds;
    if (event.shiftKey) {
      const allSelected = targetSelectionIds.every((id) =>
        selectedElementIds.includes(id),
      );
      nextSelection = allSelected
        ? selectedElementIds.filter((id) => !targetSelectionSet.has(id))
        : [...new Set([...selectedElementIds, ...targetSelectionIds])];
      setSelectedElementIds(nextSelection);
    } else if (
      !targetSelectionIds.every((id) => selectedElementIds.includes(id))
    ) {
      nextSelection = targetSelectionIds;
      setSelectedElementIds(nextSelection);
    }

    if (element.locked || !nextSelection.includes(element.id)) return;
    const movableSelection = nextSelection.filter(
      (id) => !elements.find((item) => item.id === id)?.locked,
    );
    const initialElements = elements.filter((item) =>
      movableSelection.includes(item.id),
    );
    if (!initialElements.length) return;
    const fixedElements = elements.filter(
      (item) => !movableSelection.includes(item.id),
    );
    setStableDistanceMeasurements([]);
    checkpoint();
    rawDragActiveRef.current = false;
    gestureRef.current = {
      appliedDelta: { x: 0, y: 0 },
      fixedElements,
      fixedRects: fixedElements
        .filter((item) => item.visible)
        .map(rectFromElement),
      kind: "move",
      initialElements,
      pointerId: event.pointerId,
      previewTargets: collectMovePreviewTargets(initialElements),
      selectionBounds: boundsFromElements(initialElements),
      selectionIds: movableSelection,
      startClient: { x: event.clientX, y: event.clientY },
    };
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const handleResizePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    element: CanvasElement,
    handle: ResizeHandle,
  ) => {
    event.stopPropagation();
    checkpoint();
    rawDragActiveRef.current = false;
    gestureRef.current = {
      appliedUpdates: {
        height: element.height,
        width: element.width,
        x: element.x,
        y: element.y,
      },
      kind: "resize",
      pointerId: event.pointerId,
      elementId: element.id,
      handle,
      initial: { ...element },
      previewTargets: collectResizePreviewTargets(element.id),
      scale: totalScale,
      startClient: { x: event.clientX, y: event.clientY },
    };
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const handleMultiResizePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    handle: ResizeHandle,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (
      selectedElements.length < 2 ||
      selectedElements.some((element) => element.locked)
    ) {
      return;
    }
    const initialBounds = boundsFromElements(selectedElements);
    if (!initialBounds) return;
    checkpoint();
    rawDragActiveRef.current = false;
    gestureRef.current = {
      appliedElements: selectedElements,
      handle,
      initialBounds,
      initialElements: selectedElements,
      kind: "multi-resize",
      pointerId: event.pointerId,
      previewTargets: collectMultiResizePreviewTargets(
        selectedElements.map((element) => element.id),
      ),
      scale: totalScale,
      startClient: { x: event.clientX, y: event.clientY },
    };
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const handleImageCropPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    element: CanvasElement,
    handle: ImageResizeHandle,
  ) => {
    if (element.locked) return;
    event.preventDefault();
    event.stopPropagation();
    checkpoint();
    gestureRef.current = {
      kind: "image-crop-resize",
      pointerId: event.pointerId,
      elementId: element.id,
      handle,
      startLocal: getLocalPoint(event.clientX, event.clientY),
      initial: { ...element },
    };
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePenNodePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    element: CanvasElement,
    pathIndex: number,
    nodeIndex: number,
  ) => {
    const paths = vectorPathsForElement(element);
    if (element.locked || !paths[pathIndex]?.points[nodeIndex]) return;
    event.preventDefault();
    event.stopPropagation();
    if (
      activeTool === "rectangle" &&
      selectedShape === "pen" &&
      nodeEditElementId === element.id
    ) {
      const anchor = paths[pathIndex].points[nodeIndex];
      setPenDraft({
        branchElementId: element.id,
        current: { x: anchor.x, y: anchor.y },
        isDragging: false,
        points: [{ x: anchor.x, y: anchor.y }],
      });
      gestureRef.current = {
        kind: "pen",
        pointerId: event.pointerId,
        anchorIndex: 0,
        start: { x: anchor.x, y: anchor.y },
      };
      canvasRef.current?.setPointerCapture(event.pointerId);
      return;
    }
    setPendingPenUndoId(null);
    const nodeRef = { pathIndex, nodeIndex };
    const isAlreadySelected = selectedPenNodes.some(
      (selected) => vectorPointKey(selected) === vectorPointKey(nodeRef),
    );
    const nodeRefs = event.shiftKey
      ? isAlreadySelected
        ? selectedPenNodes.filter(
            (selected) => vectorPointKey(selected) !== vectorPointKey(nodeRef),
          )
        : [...selectedPenNodes, nodeRef]
      : isAlreadySelected
        ? selectedPenNodes
        : [nodeRef];
    setSelectedPenNodes(nodeRefs);
    setSelectedPenHandles([]);
    gestureRef.current = {
      historyRecorded: false,
      kind: "pen-node",
      pointerId: event.pointerId,
      elementId: element.id,
      nodeRefs,
      initial: {
        ...element,
        points: paths[0]?.points,
        vectorPaths: cloneVectorPaths(paths),
      },
      startLocal: elementLocalPoint(
        element,
        getLocalPoint(event.clientX, event.clientY),
      ),
    };
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePenHandlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    element: CanvasElement,
    pathIndex: number,
    nodeIndex: number,
    handle: "in" | "out",
  ) => {
    const paths = vectorPathsForElement(element);
    const anchor = paths[pathIndex]?.points[nodeIndex];
    if (element.locked || !anchor) return;
    event.preventDefault();
    event.stopPropagation();
    setPendingPenUndoId(null);
    const handleRef = { pathIndex, nodeIndex, handle };
    const isAlreadySelected = selectedPenHandles.some(
      (selected) => vectorHandleKey(selected) === vectorHandleKey(handleRef),
    );
    const handleRefs = event.shiftKey
      ? isAlreadySelected
        ? selectedPenHandles.filter(
            (selected) =>
              vectorHandleKey(selected) !== vectorHandleKey(handleRef),
          )
        : [...selectedPenHandles, handleRef]
      : isAlreadySelected
        ? selectedPenHandles
        : [handleRef];
    setSelectedPenHandles(handleRefs);
    setSelectedPenNodes([]);
    gestureRef.current = {
      historyRecorded: false,
      kind: "pen-handle",
      pointerId: event.pointerId,
      elementId: element.id,
      handleRefs,
      initial: {
        ...element,
        points: paths[0]?.points,
        vectorPaths: cloneVectorPaths(paths),
      },
      startLocal: elementLocalPoint(
        element,
        getLocalPoint(event.clientX, event.clientY),
      ),
    };
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const handleLineEndpointPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    element: CanvasElement,
    endpoint: "start" | "end",
  ) => {
    event.stopPropagation();
    const endpoints = lineEndpoints(element);
    checkpoint();
    gestureRef.current = {
      kind: "line-endpoint",
      pointerId: event.pointerId,
      elementId: element.id,
      endpoint,
      fixedPoint: endpoints[endpoint === "start" ? "end" : "start"],
    };
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  renderDragPreviewRef.current = (sample) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== sample.pointerId) return;

    if (gesture.kind === "pan") {
      const currentPan = {
        x: gesture.startPan.x + sample.x - gesture.startClient.x,
        y: gesture.startPan.y + sample.y - gesture.startClient.y,
      };
      previewArtboardPan(currentPan);
      gestureRef.current = { ...gesture, currentPan };
      return;
    }

    if (gesture.kind === "draw") {
      let point = {
        x:
          gesture.draft.start.x +
          (sample.x - gesture.startClient.x) / gesture.scale,
        y:
          gesture.draft.start.y +
          (sample.y - gesture.startClient.y) / gesture.scale,
      };
      const angleConstraint =
        sample.ctrlKey || sample.metaKey || sample.shiftKey;
      if (angleConstraint && gesture.draft.type === "line") {
        point = constrainAngle(point, gesture.draft.start);
      } else if (sample.ctrlKey || sample.shiftKey) {
        const deltaX = point.x - gesture.draft.start.x;
        const deltaY = point.y - gesture.draft.start.y;
        const size = Math.max(Math.abs(deltaX), Math.abs(deltaY));
        point = {
          x: gesture.draft.start.x + Math.sign(deltaX || 1) * size,
          y: gesture.draft.start.y + Math.sign(deltaY || 1) * size,
        };
      }
      const draft = { ...gesture.draft, current: point };
      gestureRef.current = { ...gesture, draft };
      previewDrawDraft(draft);
      return;
    }

    if (gesture.kind === "move") {
      const rawDelta = {
        x: (sample.x - gesture.startClient.x) / totalScale,
        y: (sample.y - gesture.startClient.y) / totalScale,
      };
      const constrained = sample.shiftKey
        ? Math.abs(rawDelta.x) >= Math.abs(rawDelta.y)
          ? { x: rawDelta.x, y: 0 }
          : { x: 0, y: rawDelta.y }
        : rawDelta;
      const snap = buildSmartSnap(
        gesture.selectionBounds,
        gesture.fixedRects,
        constrained,
        artboard,
        gesture.initialElements.length === 1,
      );
      previewElementMove(gesture.previewTargets, snap.delta);
      previewSmartGuides(
        {
          horizontal: horizontalSmartGuideRef.current,
          vertical: verticalSmartGuideRef.current,
        },
        snap.guides,
      );
      const spacingMeasurements = snap.spacingMeasurements;
      if (sample.altKey || altPressedRef.current) {
        const selectionBounds = gesture.selectionBounds;
        const hovered = elementAtClientPoint(sample.x, sample.y);
        const targetId = hovered?.dataset.elementId;
        const target = gesture.fixedElements.find(
          (element) => element.id === targetId,
        );
        const hoveredGuideNode = guideAtClientPoint(sample.x, sample.y);
        const targetGuide = guides.find(
          (guide) => guide.id === hoveredGuideNode?.dataset.guideId,
        );
        if (selectionBounds) {
          previewDistanceMeasurements(
            distanceMeasurementRefs.current,
            spacingMeasurements.concat(
              targetGuide
                ? buildGuideDistanceMeasurements(
                    offsetRect(selectionBounds, snap.delta),
                    targetGuide,
                  )
                : buildDistanceMeasurements(
                    offsetRect(selectionBounds, snap.delta),
                    artboard,
                    target ? rectFromElement(target) : undefined,
                  ),
            ),
          );
        }
      } else {
        previewDistanceMeasurements(
          distanceMeasurementRefs.current,
          spacingMeasurements,
        );
      }
      gestureRef.current = { ...gesture, appliedDelta: snap.delta };
      return;
    }

    if (gesture.kind === "resize") {
      const deltaX = (sample.x - gesture.startClient.x) / gesture.scale;
      const deltaY = (sample.y - gesture.startClient.y) / gesture.scale;
      const { handle, initial } = gesture;
      const minimumSize = 8;
      let x = initial.x;
      let y = initial.y;
      let width = initial.width;
      let height = initial.height;

      if (handle.includes("e")) width = initial.width + deltaX;
      if (handle.includes("s")) height = initial.height + deltaY;
      if (handle.includes("w")) {
        width = initial.width - deltaX;
        x = initial.x + deltaX;
      }
      if (handle.includes("n")) {
        height = initial.height - deltaY;
        y = initial.y + deltaY;
      }

      const rawWidth = width;
      const rawHeight = height;
      if (lockRatio || sample.ctrlKey || sample.shiftKey) {
        const ratio = initial.width / Math.max(1, initial.height);
        const hasHorizontalHandle =
          handle.includes("e") || handle.includes("w");
        const hasVerticalHandle = handle.includes("n") || handle.includes("s");
        if (hasHorizontalHandle && hasVerticalHandle) {
          const widthScale =
            Math.max(minimumSize, rawWidth) / Math.max(1, initial.width);
          const heightScale =
            Math.max(minimumSize, rawHeight) / Math.max(1, initial.height);
          const scale =
            Math.abs(widthScale - 1) >= Math.abs(heightScale - 1)
              ? widthScale
              : heightScale;
          width = initial.width * scale;
          height = initial.height * scale;
        } else if (hasHorizontalHandle) {
          width = Math.max(minimumSize, rawWidth);
          height = width / ratio;
        } else {
          height = Math.max(minimumSize, rawHeight);
          width = height * ratio;
        }
        if (handle.includes("w")) x = initial.x + initial.width - width;
        if (handle.includes("n")) y = initial.y + initial.height - height;
      } else {
        width = Math.max(minimumSize, width);
        height = Math.max(minimumSize, height);
        if (handle.includes("w")) x = initial.x + initial.width - width;
        if (handle.includes("n")) y = initial.y + initial.height - height;
      }

      const resizedWidth = Math.max(minimumSize, width);
      const resizedHeight = Math.max(minimumSize, height);
      const resizedBounds = {
        height: resizedHeight,
        width: resizedWidth,
        x,
        y,
      };
      const resizeUpdates = resizeElementWithinSelection(
        initial,
        rectFromElement(initial),
        resizedBounds,
      );
      previewElementResize(
        gesture.previewTargets,
        resizeUpdates,
        artboard.height,
        selectionCaptionGap,
        selectionCaptionHeight,
      );
      gestureRef.current = { ...gesture, appliedUpdates: resizeUpdates };
      return;
    }

    if (gesture.kind === "multi-resize") {
      const resizedBounds = resizedBoundsFromCorner(
        gesture.initialBounds,
        gesture.handle,
        (sample.x - gesture.startClient.x) / gesture.scale,
        (sample.y - gesture.startClient.y) / gesture.scale,
        lockRatio || sample.ctrlKey || sample.shiftKey,
      );
      const resizedElements = gesture.initialElements.map((element) =>
        resizeElementWithinSelection(
          element,
          gesture.initialBounds,
          resizedBounds,
        ),
      );
      previewMultiElementResize(
        gesture.previewTargets,
        resizedElements,
        resizedBounds,
        artboard.height,
        selectionCaptionGap,
        selectionCaptionHeight,
      );
      gestureRef.current = {
        ...gesture,
        appliedElements: resizedElements,
      };
      return;
    }

    if (gesture.kind === "marquee") {
      const point = {
        x: gesture.start.x + (sample.x - gesture.startClient.x) / gesture.scale,
        y: gesture.start.y + (sample.y - gesture.startClient.y) / gesture.scale,
      };
      gestureRef.current = { ...gesture, current: point };
      previewMarquee(gesture.start, point);
    }
  };

  const handleCanvasPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    pointerPositionRef.current = { x: event.clientX, y: event.clientY };
    const gesture = gestureRef.current;
    if (!gesture) {
      if (penDraft) {
        const rawPoint = getLocalPoint(event.clientX, event.clientY);
        const branchElement = penDraft.branchElementId
          ? elements.find((element) => element.id === penDraft.branchElementId)
          : undefined;
        const point = branchElement
          ? elementLocalPoint(branchElement, rawPoint)
          : rawPoint;
        setPenDraft((current) =>
          current ? { ...current, current: point } : current,
        );
        return;
      }
      if (!event.altKey && !altPressedRef.current) {
        setStableDistanceMeasurements([]);
        return;
      }
      updateAltDistanceMeasurements(event.clientX, event.clientY);
      return;
    }
    if (gesture.pointerId !== event.pointerId) return;

    if (
      gesture.kind === "pan" ||
      gesture.kind === "draw" ||
      gesture.kind === "move" ||
      gesture.kind === "resize" ||
      gesture.kind === "multi-resize" ||
      gesture.kind === "marquee"
    ) {
      if (!rawDragActiveRef.current) {
        renderDragPreviewRef.current(dragPointerSample(event.nativeEvent));
      }
      return;
    }

    if (gesture.kind === "pen") {
      const rawPoint = getLocalPoint(event.clientX, event.clientY);
      const branchElement = penDraft?.branchElementId
        ? elements.find((element) => element.id === penDraft.branchElementId)
        : undefined;
      const localPoint = branchElement
        ? elementLocalPoint(branchElement, rawPoint)
        : rawPoint;
      setPenDraft((current) => {
        if (!current) return current;
        const anchor = current.points[gesture.anchorIndex];
        if (!anchor) return current;
        const point = event.shiftKey
          ? constrainAngle(localPoint, anchor)
          : localPoint;
        const moved =
          Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y) > 3;
        if (!moved) return { ...current, current: point };
        const points = current.points.map((item, index) =>
          index === gesture.anchorIndex
            ? {
                ...item,
                handleIn: {
                  x: anchor.x * 2 - point.x,
                  y: anchor.y * 2 - point.y,
                },
                handleOut: point,
              }
            : item,
        );
        return { ...current, current: point, isDragging: true, points };
      });
      return;
    }

    if (gesture.kind === "pen-node") {
      const initialPaths = vectorPathsForElement(gesture.initial);
      if (!initialPaths.length) return;
      const point = elementLocalPoint(
        gesture.initial,
        getLocalPoint(event.clientX, event.clientY),
      );
      const delta = {
        x: point.x - gesture.startLocal.x,
        y: point.y - gesture.startLocal.y,
      };
      if (Math.hypot(delta.x, delta.y) < 0.001) return;
      const nextGesture = gesture.historyRecorded
        ? gesture
        : { ...gesture, historyRecorded: true };
      if (!gesture.historyRecorded) checkpoint();
      const selectedKeys = new Set(
        gesture.nodeRefs.map((nodeRef) => vectorPointKey(nodeRef)),
      );
      const movedPaths = cloneVectorPaths(initialPaths).map(
        (path, pathIndex) => ({
          ...path,
          points: path.points.map((item, nodeIndex) => {
            if (!selectedKeys.has(vectorPointKey({ pathIndex, nodeIndex }))) {
              return item;
            }
            return {
              ...item,
              x: item.x + delta.x,
              y: item.y + delta.y,
              handleIn: item.handleIn
                ? { x: item.handleIn.x + delta.x, y: item.handleIn.y + delta.y }
                : undefined,
              handleOut: item.handleOut
                ? {
                    x: item.handleOut.x + delta.x,
                    y: item.handleOut.y + delta.y,
                  }
                : undefined,
            };
          }),
        }),
      );
      updateElement(
        gesture.elementId,
        vectorElementGeometryUpdate(gesture.initial, movedPaths),
      );
      gestureRef.current = nextGesture;
      return;
    }

    if (gesture.kind === "pen-handle") {
      const initialPaths = vectorPathsForElement(gesture.initial);
      const point = elementLocalPoint(
        gesture.initial,
        getLocalPoint(event.clientX, event.clientY),
      );
      const activeRef = gesture.handleRefs[0];
      const activePoint =
        initialPaths[activeRef.pathIndex]?.points[activeRef.nodeIndex];
      if (!activePoint) return;
      const initialHandle =
        activeRef.handle === "in"
          ? activePoint.handleIn
          : activePoint.handleOut;
      if (!initialHandle) return;
      const nextHandle = event.shiftKey
        ? constrainAngle(point, activePoint)
        : point;
      const multiHandleDelta = {
        x: nextHandle.x - initialHandle.x,
        y: nextHandle.y - initialHandle.y,
      };
      if (Math.hypot(multiHandleDelta.x, multiHandleDelta.y) < 0.001) return;
      const nextGesture = gesture.historyRecorded
        ? gesture
        : { ...gesture, historyRecorded: true };
      if (!gesture.historyRecorded) checkpoint();
      const selectedKeys = new Set(
        gesture.handleRefs.map((handleRef) => vectorHandleKey(handleRef)),
      );
      const nextPaths = cloneVectorPaths(initialPaths).map(
        (path, pathIndex) => ({
          ...path,
          points: path.points.map((item, nodeIndex) => {
            const matchingRefs = (["in", "out"] as const).filter((handle) =>
              selectedKeys.has(
                vectorHandleKey({ pathIndex, nodeIndex, handle }),
              ),
            );
            if (!matchingRefs.length) return item;
            const nextItem = { ...item };
            for (const handle of matchingRefs) {
              const currentHandle =
                handle === "in" ? item.handleIn : item.handleOut;
              if (!currentHandle) continue;
              const movedHandle =
                gesture.handleRefs.length > 1
                  ? {
                      x: currentHandle.x + multiHandleDelta.x,
                      y: currentHandle.y + multiHandleDelta.y,
                    }
                  : nextHandle;
              if (handle === "in") nextItem.handleIn = movedHandle;
              else nextItem.handleOut = movedHandle;
              if (gesture.handleRefs.length === 1) {
                const opposite =
                  handle === "in" ? item.handleOut : item.handleIn;
                const mirrored = mirroredHandle(
                  item,
                  movedHandle,
                  opposite,
                  event.altKey ? "none" : penHandleMirroring,
                );
                if (handle === "in") nextItem.handleOut = mirrored;
                else nextItem.handleIn = mirrored;
              }
            }
            return nextItem;
          }),
        }),
      );
      updateElement(
        gesture.elementId,
        vectorElementGeometryUpdate(gesture.initial, nextPaths),
      );
      gestureRef.current = nextGesture;
      return;
    }

    if (gesture.kind === "image-crop-resize") {
      const point = getLocalPoint(event.clientX, event.clientY);
      const deltaX = point.x - gesture.startLocal.x;
      const deltaY = point.y - gesture.startLocal.y;
      const { handle, initial } = gesture;
      const minimumSize = 8;
      const initialCrop = imageCropForElement(initial);
      const crop = { ...initialCrop };
      const scaleX = initialCrop.scaleX;
      const scaleY = initialCrop.scaleY;
      let x = initial.x;
      let y = initial.y;
      let width = initial.width;
      let height = initial.height;

      if (handle === "e") {
        const maxWidth = Math.max(
          minimumSize,
          (initialCrop.baseWidth - initialCrop.left) * scaleX,
        );
        width = Math.min(
          maxWidth,
          Math.max(minimumSize, initial.width + deltaX),
        );
        crop.right = Math.max(
          0,
          initialCrop.baseWidth - initialCrop.left - width / scaleX,
        );
      } else if (handle === "w") {
        const maxWidth = Math.max(
          minimumSize,
          (initialCrop.baseWidth - initialCrop.right) * scaleX,
        );
        width = Math.min(
          maxWidth,
          Math.max(minimumSize, initial.width - deltaX),
        );
        x = initial.x + initial.width - width;
        crop.left = Math.max(
          0,
          initialCrop.baseWidth - initialCrop.right - width / scaleX,
        );
      } else if (handle === "s") {
        const maxHeight = Math.max(
          minimumSize,
          (initialCrop.baseHeight - initialCrop.top) * scaleY,
        );
        height = Math.min(
          maxHeight,
          Math.max(minimumSize, initial.height + deltaY),
        );
        crop.bottom = Math.max(
          0,
          initialCrop.baseHeight - initialCrop.top - height / scaleY,
        );
      } else {
        const maxHeight = Math.max(
          minimumSize,
          (initialCrop.baseHeight - initialCrop.bottom) * scaleY,
        );
        height = Math.min(
          maxHeight,
          Math.max(minimumSize, initial.height - deltaY),
        );
        y = initial.y + initial.height - height;
        crop.top = Math.max(
          0,
          initialCrop.baseHeight - initialCrop.bottom - height / scaleY,
        );
      }

      updateElement(gesture.elementId, {
        height,
        imageCrop: crop,
        width,
        x,
        y,
      });
      return;
    }

    if (gesture.kind === "line-endpoint") {
      const rawPoint = getLocalPoint(event.clientX, event.clientY);
      const point =
        event.ctrlKey || event.metaKey || event.shiftKey
          ? constrainAngle(rawPoint, gesture.fixedPoint)
          : rawPoint;
      const geometry =
        gesture.endpoint === "start"
          ? lineGeometry(point, gesture.fixedPoint)
          : lineGeometry(gesture.fixedPoint, point);
      updateElement(gesture.elementId, {
        height: geometry.height,
        rotation: geometry.rotation,
        width: geometry.width,
        x: Math.round(geometry.x),
        y: Math.round(geometry.y),
      });
      return;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleRawDrag = (rawEvent: Event) => {
      if (!(rawEvent instanceof PointerEvent)) return;
      const gesture = gestureRef.current;
      if (
        !gesture ||
        gesture.pointerId !== rawEvent.pointerId ||
        !(
          gesture.kind === "pan" ||
          gesture.kind === "draw" ||
          gesture.kind === "move" ||
          gesture.kind === "resize" ||
          gesture.kind === "multi-resize" ||
          gesture.kind === "marquee"
        )
      ) {
        return;
      }
      rawDragActiveRef.current = true;
      pointerPositionRef.current = {
        x: rawEvent.clientX,
        y: rawEvent.clientY,
      };
      renderDragPreviewRef.current(dragPointerSample(rawEvent));
    };

    canvas.addEventListener("pointerrawupdate", handleRawDrag, {
      passive: true,
    });
    return () => canvas.removeEventListener("pointerrawupdate", handleRawDrag);
  }, []);

  const handleCanvasPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const pendingGesture = gestureRef.current;
    if (
      pendingGesture?.pointerId === event.pointerId &&
      (pendingGesture.kind === "pan" ||
        pendingGesture.kind === "draw" ||
        pendingGesture.kind === "move" ||
        pendingGesture.kind === "resize" ||
        pendingGesture.kind === "multi-resize" ||
        pendingGesture.kind === "marquee")
    ) {
      renderDragPreviewRef.current(dragPointerSample(event.nativeEvent));
    }
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    if (gesture.kind === "draw") {
      createElementFromDraft(gesture.draft);
      setDrawDraft(null);
    } else if (gesture.kind === "pen") {
      setPenDraft((current) =>
        current
          ? {
              ...current,
              current: current.points.at(-1) ?? current.current,
              isDragging: false,
            }
          : current,
      );
    } else if (gesture.kind === "pan") {
      setPan(gesture.currentPan);
    } else if (gesture.kind === "move") {
      if (gesture.appliedDelta.x || gesture.appliedDelta.y) {
        updateElements(
          gesture.selectionIds,
          gesture.appliedDelta.x,
          gesture.appliedDelta.y,
        );
      }
      const previewTargets = gesture.previewTargets;
      window.requestAnimationFrame(() =>
        clearElementMovePreview(previewTargets),
      );
    } else if (gesture.kind === "resize") {
      updateElement(gesture.elementId, gesture.appliedUpdates);
      gesture.previewTargets.element?.classList.remove("is-resize-preview");
    } else if (gesture.kind === "multi-resize") {
      gesture.appliedElements.forEach((element) =>
        updateElement(element.id, element),
      );
      gesture.previewTargets.elements.forEach((element) =>
        element.classList.remove("is-resize-preview"),
      );
    } else if (gesture.kind === "marquee") {
      const selectionBounds = boundsFromPoints(gesture.start, gesture.current);
      const hitIds = elements
        .filter(
          (element) =>
            element.visible &&
            intersects(selectionBounds, {
              x: element.x,
              y: element.y,
              width: element.width,
              height: element.height,
            }),
        )
        .map((element) => element.id);
      const expandedHitIds = expandGroupedSelection(elements, hitIds);
      setSelectedElementIds(
        gesture.additive
          ? [...new Set([...selectedElementIds, ...expandedHitIds])]
          : expandedHitIds,
      );
      setSelectedGuideIds([]);
      setArtboardSelected(false);
      setMarquee(null);
    }

    previewSmartGuides(
      {
        horizontal: horizontalSmartGuideRef.current,
        vertical: verticalSmartGuideRef.current,
      },
      [],
    );
    previewDistanceMeasurements(distanceMeasurementRefs.current, []);
    setStableDistanceMeasurements([]);
    gestureRef.current = null;
    rawDragActiveRef.current = false;
    document
      .getElementById("editor-artboard")
      ?.classList.remove("is-pan-preview");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleCanvasDoubleClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (!penDraft || activeTool !== "rectangle" || selectedShape !== "pen") {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    createElementFromPenDraft(penDraft);
    setPenDraft(null);
    gestureRef.current = null;
  };

  const handleWheel = (event: ReactWheelEvent<HTMLElement>) => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      zoomAtClientPoint(
        zoom + (event.deltaY < 0 ? 10 : -10),
        event.clientX,
        event.clientY,
      );
      return;
    }
    setPan((current) => ({
      x: current.x - event.deltaX,
      y: current.y - event.deltaY,
    }));
  };

  const {
    appendInteractionSoundAssetsForElements,
    applyCommonInteractionSoundAssetForElements,
    attachBackgroundMusicArtwork,
    clearInteractionSoundAssetsForElements,
    createBackgroundMusicObjectUrl,
    deleteInteractionSoundAsset,
    replaceInteractionSoundsForElement,
    updateInteractionExpandedForElements,
    updateInteractionSoundForElements,
  } = useInteractionSoundAssets();

  const handleAssetUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setUploadedAssets((current) => [
      ...files.map((file) => URL.createObjectURL(file)),
      ...current,
    ]);
    event.target.value = "";
  };

  const addAssetToPage = (src: string) => {
    const count =
      elements.filter((element) => element.type === "image").length + 1;
    const addImage = (width: number, height: number) => {
      addElement({
        id: createElementId("image"),
        name: `Image ${count}`,
        type: "image",
        x: artboard.width / 2 - width / 2,
        y: artboard.height / 2 - height / 2,
        width,
        height,
        rotation: 0,
        opacity: 100,
        fill: "#ffffff",
        stroke: "transparent",
        strokeWidth: 0,
        strokeStyle: "none",
        cornerRadius: 0,
        visible: true,
        locked: false,
        src,
      });
      setArtboardSelected(false);
      setActiveTool("selection");
    };

    const image = new window.Image();
    image.onload = () => {
      const size = fittedImageSize(image.naturalWidth, image.naturalHeight);
      addImage(size.width, size.height);
    };
    image.onerror = () => addImage(280, 200);
    image.src = src;
  };

  const artboardStyle = {
    "--artboard-height": `${artboard.height}px`,
    "--artboard-width": `${artboard.width}px`,
    "--artboard-scale": totalScale,
    "--artboard-x": `${pan.x}px`,
    "--artboard-y": `${pan.y}px`,
    "--selection-control-scale": selectionControlScale,
    "--selection-caption-font-size": `${10 * selectionUiScale}px`,
    "--selection-caption-height": `${selectionCaptionHeight}px`,
    "--selection-caption-padding": `${6 * selectionUiScale}px`,
    "--selection-caption-radius": `${2 * selectionUiScale}px`,
    "--selection-outline-width": `${selectionOutlineWidth}px`,
    backgroundColor: "transparent",
    borderRadius: `${artboard.cornerRadius}px`,
    overflow: "visible",
  } as CSSProperties;
  const interfaceScale = interfaceScaleFactor(resolvedInterfaceScale);
  const propertiesBaseWidth = viewportWidthCss >= 1600 ? 345 : 340;
  const interfaceCompact =
    interfaceScaleReady && viewportWidthCss <= 960 * interfaceScale;
  const editorShellStyle = {
    "--interface-scale": interfaceScale,
    "--interface-zoom-pixel": `${1 / interfaceScale}px`,
    ...(interfaceScaleReady
      ? {
          "--project-panel-width": `${278 * interfaceScale}px`,
          "--properties-width": `${propertiesBaseWidth * interfaceScale}px`,
          "--tool-rail-width": `${70 * interfaceScale}px`,
          "--topbar-height": `${66 * interfaceScale}px`,
        }
      : {}),
  } as CSSProperties;
  const activeToolbarIndex = Math.max(
    0,
    tools.findIndex(({ id }) => id === (spacePressed ? "hand" : activeTool)),
  );
  const activeToolIndicator =
    toolIndicatorMetrics[activeToolbarIndex] ?? toolIndicatorMetrics[0];

  const draftBounds = drawDraft
    ? boundsFromPoints(drawDraft.start, drawDraft.current)
    : null;
  const penDraftLocalPoints: PenAnchor[] = penDraft
    ? penDraft.isDragging
      ? penDraft.points
      : [...penDraft.points, { ...penDraft.current }]
    : [];
  const penDraftBranchElement = penDraft?.branchElementId
    ? elements.find((element) => element.id === penDraft.branchElementId)
    : undefined;
  const penDraftPoints = penDraftLocalPoints.map((point) =>
    penDraftBranchElement
      ? elementWorldPathPoint(penDraftBranchElement, point)
      : point,
  );
  const penDraftCurrent =
    penDraft && penDraftBranchElement
      ? elementWorldPoint(penDraftBranchElement, penDraft.current)
      : penDraft?.current;
  const penDraftBounds = penDraft
    ? (() => {
        const geometryPoints = penDraftPoints.flatMap((point) => [
          { x: point.x, y: point.y },
          ...(point.handleIn ? [{ ...point.handleIn }] : []),
          ...(point.handleOut ? [{ ...point.handleOut }] : []),
        ]);
        if (penDraftCurrent) geometryPoints.push(penDraftCurrent);
        const bounds = boundsFromPointList(geometryPoints);
        return {
          height: Math.max(8, bounds.height + 8),
          width: Math.max(8, bounds.width + 8),
          x: bounds.x - 4,
          y: bounds.y - 4,
        };
      })()
    : null;
  const draftLine =
    drawDraft?.type === "line"
      ? lineDraftGeometry(drawDraft.start, drawDraft.current)
      : null;
  const groupedSelectionId =
    selectedElements.length > 1 &&
    selectedElements[0].groupId &&
    selectedElements.every(
      (element) => element.groupId === selectedElements[0].groupId,
    )
      ? selectedElements[0].groupId
      : undefined;
  const groupedSelectionBounds = groupedSelectionId
    ? boundsFromElements(selectedElements)
    : null;
  const selectionDimensionsBounds =
    !artboardSelected && selectedElements.length
      ? boundsFromElements(selectedElements)
      : null;
  const combinedSelectionBounds =
    selectedElements.length > 1 ? selectionDimensionsBounds : null;
  const combinedSelectionResizable =
    Boolean(combinedSelectionBounds) &&
    selectedElements.every((element) => !element.locked);
  const selectionDimensionsPlacement = selectionDimensionsBounds
    ? selectionDimensionsBounds.y +
        selectionDimensionsBounds.height +
        selectionCaptionGap +
        selectionCaptionHeight <=
      artboard.height
      ? {
          className: "",
          top:
            selectionDimensionsBounds.y +
            selectionDimensionsBounds.height +
            selectionCaptionGap,
        }
      : {
          className: "is-above",
          top: selectionDimensionsBounds.y - selectionCaptionGap,
        }
    : null;
  const selectionDimensionsValue = selectionDimensionsBounds
    ? selectedElements.length === 1 && selectedElements[0].type === "line"
      ? {
          height: Math.max(1, Math.round(selectedElements[0].strokeWidth)),
          width: Math.round(selectionDimensionsBounds.width),
        }
      : {
          height: Math.round(selectionDimensionsBounds.height),
          width: Math.round(selectionDimensionsBounds.width),
        }
    : null;
  const marqueeBounds = marquee
    ? boundsFromPoints(marquee.start, marquee.current)
    : null;
  const navigatorPreviewSize = { height: 104, width: 184 };
  const navigatorWorldBounds = {
    bottom: Math.max(
      artboard.height,
      navigatorViewport.y + navigatorViewport.height,
    ),
    left: Math.min(0, navigatorViewport.x),
    right: Math.max(
      artboard.width,
      navigatorViewport.x + navigatorViewport.width,
    ),
    top: Math.min(0, navigatorViewport.y),
  };
  const navigatorWorldSize = {
    height: Math.max(1, navigatorWorldBounds.bottom - navigatorWorldBounds.top),
    width: Math.max(1, navigatorWorldBounds.right - navigatorWorldBounds.left),
  };
  const navigatorScale = Math.min(
    navigatorPreviewSize.width / navigatorWorldSize.width,
    navigatorPreviewSize.height / navigatorWorldSize.height,
  );
  const navigatorMap = {
    height: navigatorWorldSize.height * navigatorScale,
    left:
      (navigatorPreviewSize.width - navigatorWorldSize.width * navigatorScale) /
      2,
    top:
      (navigatorPreviewSize.height -
        navigatorWorldSize.height * navigatorScale) /
      2,
    width: navigatorWorldSize.width * navigatorScale,
  };
  const navigatorBoard = {
    height: artboard.height * navigatorScale,
    left: -navigatorWorldBounds.left * navigatorScale,
    top: -navigatorWorldBounds.top * navigatorScale,
    width: artboard.width * navigatorScale,
  };
  const navigatorViewportStyle = {
    height: navigatorViewport.height * navigatorScale,
    left: (navigatorViewport.x - navigatorWorldBounds.left) * navigatorScale,
    top: (navigatorViewport.y - navigatorWorldBounds.top) * navigatorScale,
    width: navigatorViewport.width * navigatorScale,
  };

  return (
    <main
      className={`editor-shell ${interfaceCompact ? "is-interface-compact" : ""}`}
      data-interface-compact={interfaceCompact}
      data-interface-ready={interfaceScaleReady}
      data-interface-scale={resolvedInterfaceScale}
      data-interface-scale-mode={interfaceScaleMode}
      style={editorShellStyle}
    >
      <header className="editor-topbar interface-scale-surface">
        <div aria-label="AMOUS" className="topbar-brand">
          <span aria-hidden="true" className="brand-placeholder" />
          <span className="visually-hidden">AMOUS</span>
        </div>

        <div className="view-controls">
          <button
            aria-haspopup="dialog"
            className="preview-control"
            onClick={() => setPreviewVisible(true)}
            type="button"
          >
            <Eye aria-hidden="true" size={14} strokeWidth={1.4} /> Preview
          </button>
          <span className="topbar-divider" />
          <div aria-label="Viewport" className="viewport-controls">
            <button aria-label="Desktop viewport" type="button">
              <Monitor size={17} />
            </button>
            <button aria-label="Tablet viewport" type="button">
              <Tablet size={17} />
            </button>
            <button aria-label="Mobile viewport" type="button">
              <Smartphone size={17} />
            </button>
          </div>
          <span className="topbar-divider" />
          <div
            className="zoom-control"
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              event.stopPropagation();
              setViewMenuOpen(false);
            }}
            ref={viewMenuRef}
          >
            <button
              aria-expanded={viewMenuOpen}
              aria-haspopup="menu"
              className="zoom-menu"
              onClick={() => setViewMenuOpen((open) => !open)}
              type="button"
            >
              {Math.round(zoom)} % <ChevronDown aria-hidden="true" size={10} />
            </button>
            {viewMenuOpen ? (
              <div
                aria-label="View and interface scale"
                className="view-menu-popover"
                role="menu"
              >
                <span className="view-menu-heading">CANVAS</span>
                <button
                  className="view-menu-item"
                  onClick={() => {
                    applyZoomToFit();
                    setViewMenuOpen(false);
                  }}
                  role="menuitem"
                  type="button"
                >
                  <span className="view-menu-check" />
                  <span>Zoom to Fit</span>
                  <span className="view-menu-shortcut">Shift 1</span>
                </button>
                <button
                  className="view-menu-item"
                  onClick={() => {
                    zoomAtCanvasCenter(100);
                    setViewMenuOpen(false);
                  }}
                  role="menuitem"
                  type="button"
                >
                  <span className="view-menu-check" />
                  <span>Actual Size</span>
                  <span className="view-menu-meta">100%</span>
                </button>
                <div className="view-menu-divider" />
                <span className="view-menu-heading">INTERFACE SCALE</span>
                {INTERFACE_SCALE_OPTIONS.map((option) => {
                  const selected = option.value === interfaceScaleMode;
                  return (
                    <button
                      aria-checked={selected}
                      aria-label={
                        option.value === "auto"
                          ? `Auto (${resolvedInterfaceScale}%)`
                          : option.label
                      }
                      className="view-menu-item"
                      key={option.value}
                      onClick={() => {
                        selectInterfaceScale(option.value);
                        setViewMenuOpen(false);
                      }}
                      role="menuitemradio"
                      type="button"
                    >
                      <span className="view-menu-check">
                        {selected ? (
                          <Check aria-hidden="true" size={12} strokeWidth={2} />
                        ) : null}
                      </span>
                      <span>{option.label}</span>
                      <span className="view-menu-meta">
                        {option.value === "auto"
                          ? `${resolvedInterfaceScale}%`
                          : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          <span className="topbar-divider" />
          <div aria-label="History" className="history-controls">
            <button
              aria-label="Undo"
              disabled={!past.length}
              onClick={undo}
              type="button"
            >
              <Undo2 size={17} />
            </button>
            <button
              aria-label="Redo"
              disabled={!future.length}
              onClick={redo}
              type="button"
            >
              <Redo2 size={17} />
            </button>
          </div>
        </div>

        <div className="publish-controls">
          <button className="share-button" type="button">
            SHARE
          </button>
          <button className="send-button" type="button">
            SEND
          </button>
          <button aria-label="More" className="more-button" type="button">
            <MoreVertical size={15} />
          </button>
        </div>
      </header>

      <aside
        aria-label="Creation tools"
        className="tool-rail interface-scale-surface"
      >
        <span
          aria-hidden="true"
          className="tool-active-indicator"
          style={{
            height: `${activeToolIndicator.height}px`,
            transform: `translateY(${activeToolIndicator.offset}px)`,
          }}
        />
        {tools.map(({ id, icon: Icon, label, asset }) => {
          const isActive = (spacePressed ? "hand" : activeTool) === id;
          return (
            <button
              aria-label={label}
              aria-pressed={isActive}
              className="tool-button"
              data-tool={id}
              key={id}
              onClick={() => {
                setNodeEditElementId(null);
                if (id !== "rectangle") finishPenPath();
                setActiveTool(id);
              }}
              onPointerDown={() => {
                if (id === "rectangle") setActiveTool("rectangle");
              }}
              title={label}
              type="button"
            >
              {asset ? (
                <Image
                  alt=""
                  aria-hidden="true"
                  className="tool-asset"
                  data-tool-icon={id}
                  draggable={false}
                  height={asset.height}
                  src={
                    isActive && asset.activeSrc ? asset.activeSrc : asset.src
                  }
                  width={asset.width}
                />
              ) : Icon ? (
                <Icon
                  aria-hidden="true"
                  fill={id === "selection" && isActive ? "#AB51F0" : "none"}
                  size={id === "selection" ? 25 : 22}
                  strokeWidth={1.25}
                />
              ) : null}
              <span>{label}</span>
            </button>
          );
        })}
        {activeTool === "rectangle" && !spacePressed ? (
          <ShapePicker
            onSelect={(shape) => {
              setNodeEditElementId(null);
              if (shape !== "pen") finishPenPath();
              setSelectedShape(shape);
              setActiveTool("rectangle");
            }}
            selected={selectedShape}
          />
        ) : null}
      </aside>

      <aside
        aria-label="Project panels"
        className="project-panel interface-scale-surface"
      >
        <section className="project-section scenes-section">
          <div className="project-section-heading">
            <h2>SCENES</h2>
            <button
              aria-label="Add scene"
              onClick={() => {
                finishPenPath();
                addPage();
                setNodeEditElementId(null);
                setSelectedGuideIds([]);
                setArtboardSelected(false);
              }}
              type="button"
            >
              <Image
                alt=""
                aria-hidden="true"
                height={11}
                src={assetPath("/figma/plus.svg")}
                width={11}
              />
            </button>
          </div>
          <ScrollArea className="scene-list">
            <div className="scene-list-content">
              {pages.length > 1 ? (
                <span aria-hidden="true" className="scene-rail" />
              ) : null}
              {pages.map((page, index) => (
                <div
                  aria-pressed={activePageId === page.id}
                  className="scene-item"
                  key={page.id}
                  onClick={() => {
                    finishPenPath();
                    setActivePageId(page.id);
                    setNodeEditElementId(null);
                    setSelectedGuideIds([]);
                    setArtboardSelected(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      finishPenPath();
                      setActivePageId(page.id);
                      setNodeEditElementId(null);
                      setSelectedGuideIds([]);
                      setArtboardSelected(false);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="scene-node" />
                  <ScenePreview artboard={artboard} elements={page.elements} />
                  <span className="scene-copy">
                    <strong>{String(index + 1).padStart(2, "0")}</strong>
                    {editingPageId === page.id ? (
                      <input
                        aria-label={`Rename ${page.name}`}
                        autoFocus
                        className="inline-name-input"
                        data-cancel="false"
                        onBlur={(event) => {
                          if (event.currentTarget.dataset.cancel === "true") {
                            setEditingPageId(null);
                            return;
                          }
                          renamePage(page.id, pageNameDraft);
                          setEditingPageId(null);
                        }}
                        onChange={(event) =>
                          setPageNameDraft(event.target.value)
                        }
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            event.currentTarget.dataset.cancel = "true";
                            event.currentTarget.blur();
                          }
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        type="text"
                        value={pageNameDraft}
                      />
                    ) : (
                      <span
                        onDoubleClick={(event) => {
                          event.stopPropagation();
                          setEditingPageId(page.id);
                          setPageNameDraft(page.name);
                        }}
                      >
                        {page.name}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </section>

        <section className="project-section layers-section">
          <div className="project-section-heading">
            <h2>LAYERS</h2>
            <button
              aria-label="Add layer"
              onClick={() => setActiveTool("rectangle")}
              type="button"
            >
              <Image
                alt=""
                aria-hidden="true"
                height={11}
                src={assetPath("/figma/plus.svg")}
                width={11}
              />
            </button>
          </div>
          <ScrollArea className="layer-list">
            <div
              aria-label="Layers"
              className="layer-list-content"
              role="listbox"
            >
              {[...elements].reverse().map((element) => {
                const selected = selectedElementIds.includes(element.id);
                const hasSound =
                  element.interactionSounds?.some(
                    (sound) => sound.assets.length > 0,
                  ) ?? false;
                return (
                  <div
                    aria-selected={selected}
                    className="layer-row"
                    key={element.id}
                    onClick={(event) => {
                      const targetIds = selectionIdsForElement(
                        elements,
                        element,
                      );
                      const targetSet = new Set(targetIds);
                      if (event.shiftKey) {
                        const allSelected = targetIds.every((id) =>
                          selectedElementIds.includes(id),
                        );
                        setSelectedElementIds(
                          allSelected
                            ? selectedElementIds.filter(
                                (id) => !targetSet.has(id),
                              )
                            : [
                                ...new Set([
                                  ...selectedElementIds,
                                  ...targetIds,
                                ]),
                              ],
                        );
                        return;
                      }
                      setSelectedElementIds(targetIds);
                    }}
                    role="option"
                    tabIndex={0}
                  >
                    <span
                      className={`layer-symbol ${element.pathfinder ? "symbol-pathfinder" : `symbol-${element.type}`}`}
                      data-pathfinder-operation={
                        element.pathfinder?.operation ?? undefined
                      }
                    >
                      <LayerSymbol element={element} />
                      {element.type === "image" && element.src ? (
                        <span
                          aria-hidden="true"
                          className="layer-image-preview"
                          style={{ backgroundImage: `url(${element.src})` }}
                        />
                      ) : null}
                    </span>
                    {editingElementId === element.id ? (
                      <input
                        aria-label={`Rename ${element.name}`}
                        autoFocus
                        className="inline-name-input"
                        data-cancel="false"
                        onBlur={(event) => {
                          if (event.currentTarget.dataset.cancel === "true") {
                            setEditingElementId(null);
                            return;
                          }
                          renameElement(element.id, elementNameDraft);
                          setEditingElementId(null);
                        }}
                        onChange={(event) =>
                          setElementNameDraft(event.target.value)
                        }
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            event.currentTarget.dataset.cancel = "true";
                            event.currentTarget.blur();
                          }
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        type="text"
                        value={elementNameDraft}
                      />
                    ) : (
                      <span
                        className="layer-name"
                        onDoubleClick={(event) => {
                          event.stopPropagation();
                          setEditingElementId(element.id);
                          setElementNameDraft(element.name);
                        }}
                      >
                        {element.name}
                      </span>
                    )}
                    <span className="layer-controls">
                      {hasSound ? (
                        <Image
                          alt=""
                          aria-hidden="true"
                          className="layer-sound-indicator"
                          height={10}
                          src={assetPath("/figma/sound/layer-sound.svg")}
                          width={8}
                        />
                      ) : null}
                      <button
                        aria-label={`${element.locked ? "Unlock" : "Lock"} ${element.name}`}
                        className={`layer-action ${element.locked ? "is-persistent" : ""}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleElementLocked(element.id);
                        }}
                        type="button"
                      >
                        {element.locked ? (
                          <Lock size={11} />
                        ) : (
                          <Unlock size={11} />
                        )}
                      </button>
                      <button
                        aria-label={`${element.visible ? "Hide" : "Show"} ${element.name}`}
                        className={`layer-action ${!element.visible ? "is-persistent" : ""}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleElementVisible(element.id);
                        }}
                        type="button"
                      >
                        {element.visible ? (
                          <Eye size={12} />
                        ) : (
                          <EyeOff size={12} />
                        )}
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </section>

        <section className="project-section assets-section">
          <div className="project-section-heading">
            <h2>ASSETS</h2>
            <label className="asset-heading-upload">
              <Image
                alt=""
                aria-hidden="true"
                height={11}
                src={assetPath("/figma/plus.svg")}
                width={11}
              />
              <input
                accept="image/*,video/*"
                multiple
                onChange={handleAssetUpload}
                type="file"
              />
            </label>
          </div>
          <label className="asset-upload">
            <Image
              alt=""
              aria-hidden="true"
              height={15}
              src={assetPath("/figma/upload.svg")}
              width={18}
            />
            <span>Upload</span>
            <input
              accept="image/*,video/*"
              multiple
              onChange={handleAssetUpload}
              type="file"
            />
          </label>
          <div className="asset-tabs" role="tablist">
            <button
              aria-selected={assetTab === "image"}
              onClick={() => setAssetTab("image")}
              role="tab"
              type="button"
            >
              Image
            </button>
            <button
              aria-selected={assetTab === "video"}
              onClick={() => setAssetTab("video")}
              role="tab"
              type="button"
            >
              Video
            </button>
          </div>
          <ScrollArea className="asset-grid">
            {uploadedAssets.map((asset, index) => (
              <button
                aria-label={`Add uploaded asset ${index + 1}`}
                className="uploaded-asset"
                key={asset}
                onClick={() => addAssetToPage(asset)}
                style={{ backgroundImage: `url(${asset})` }}
                type="button"
              />
            ))}
            {Array.from({ length: Math.max(9 - uploadedAssets.length, 0) }).map(
              (_, index) => (
                <span
                  aria-hidden="true"
                  className="asset-placeholder"
                  key={`placeholder-${index}`}
                />
              ),
            )}
          </ScrollArea>
        </section>
      </aside>

      <section
        aria-label="Exhibition canvas"
        className={`editor-canvas tool-${spacePressed ? "hand" : activeTool}`}
        onContextMenu={(event) => event.preventDefault()}
        onDoubleClick={handleCanvasDoubleClick}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerLeave={() => {
          if (!gestureRef.current && !altPressedRef.current) {
            setStableDistanceMeasurements([]);
          }
        }}
        onWheelCapture={handleWheel}
        ref={canvasRef}
      >
        <div
          aria-hidden={!rulersVisible}
          className={`ruler-overlay ${rulersVisible ? "" : "is-hidden"}`}
        >
          <div className="ruler-corner" />
          <canvas
            aria-label="Horizontal ruler"
            className="ruler ruler-horizontal"
            onPointerCancel={handleGuidePointerUp}
            onPointerDown={(event) =>
              handleRulerPointerDown(event, "horizontal")
            }
            onPointerMove={handleGuidePointerMove}
            onPointerUp={handleGuidePointerUp}
            ref={horizontalRulerRef}
          />
          <canvas
            aria-label="Vertical ruler"
            className="ruler ruler-vertical"
            onPointerCancel={handleGuidePointerUp}
            onPointerDown={(event) => handleRulerPointerDown(event, "vertical")}
            onPointerMove={handleGuidePointerMove}
            onPointerUp={handleGuidePointerUp}
            ref={verticalRulerRef}
          />
        </div>
        <div
          aria-label="Artboard"
          className={`artboard ${artboardSelected ? "is-selected" : ""}`}
          data-selected={artboardSelected}
          id="editor-artboard"
          onPointerDown={handleArtboardPointerDown}
          role="application"
          style={artboardStyle}
        >
          <ArtboardBackground artboard={artboard} />
          {elements.map((element) => {
            if (!element.visible) return null;
            const selected = selectedElementIds.includes(element.id);
            const selectionLineWidth = selectionOutlineWidth;
            const vectorStrokeOutset =
              element.type !== "image" &&
              element.type !== "text" &&
              element.type !== "line" &&
              element.strokeStyle !== "none" &&
              element.stroke !== "transparent" &&
              element.strokeWidth > 0 &&
              (element.strokeOpacity ?? 100) > 0
                ? (element.strokeWidth * selectionControlScale) / 2
                : 0;
            const selectionHandleOutset =
              element.type === "image"
                ? 0
                : vectorStrokeOutset + selectionLineWidth / 2;
            const elementStyle = {
              height: `${element.height}px`,
              left: `${element.x}px`,
              opacity: element.opacity / 100,
              top: `${element.y}px`,
              transform: `rotate(${element.rotation}deg)`,
              transformOrigin: "center",
              width: `${element.width}px`,
              "--selection-handle-outset": `${selectionHandleOutset}px`,
              "--selection-outline-width": `${selectionLineWidth}px`,
            };
            return (
              <div
                aria-label={element.name}
                className={`canvas-element element-${element.type} ${element.pathfinder ? "is-pathfinder" : ""} ${selected && !groupedSelectionBounds ? "is-selected" : ""} ${element.locked ? "is-locked" : ""}`}
                data-element-id={element.id}
                key={element.id}
                onDoubleClick={(event) => {
                  if (element.locked) return;
                  event.stopPropagation();
                  if (element.type === "pen") {
                    setNodeEditElementId(element.id);
                    setSelectedPenNodes([]);
                    setSelectedPenHandles([]);
                    return;
                  }
                  if (element.type !== "text") return;
                  event.preventDefault();
                  gestureRef.current = null;
                  setSelectedElementIds([element.id]);
                  setSelectedGuideIds([]);
                  setNodeEditElementId(null);
                  setArtboardSelected(false);
                  setEditingTextId(element.id);
                }}
                onClick={(event) => {
                  if (
                    element.locked ||
                    element.type !== "pen" ||
                    element.pathfinder ||
                    !selectionToolActive
                  ) {
                    return;
                  }
                  event.stopPropagation();
                  setNodeEditElementId(element.id);
                  setSelectedPenNodes([]);
                  setSelectedPenHandles([]);
                }}
                onPointerDown={(event) =>
                  handleElementPointerDown(event, element)
                }
                style={elementStyle}
              >
                {element.type === "text" ? (
                  <div
                    className="text-shape"
                    contentEditable={editingTextId === element.id}
                    data-text-resize-mode={element.textResizeMode ?? "fixed"}
                    onBlur={(event) => {
                      const editor = event.currentTarget;
                      const text = editor.innerText ?? editor.textContent ?? "";
                      const parent =
                        editor.closest<HTMLElement>(".canvas-element");
                      const sizeUpdates =
                        element.textResizeMode === "auto-width" && parent
                          ? {
                              height: Math.max(
                                1,
                                Number.parseFloat(parent.style.height) ||
                                  element.height,
                              ),
                              width: Math.max(
                                1,
                                Number.parseFloat(parent.style.width) ||
                                  element.width,
                              ),
                            }
                          : {};
                      checkpoint();
                      updateElement(element.id, { text, ...sizeUpdates });
                      setEditingTextId(null);
                    }}
                    onInput={(event) => {
                      if (element.textResizeMode !== "auto-width") return;
                      const editor = event.currentTarget;
                      const parent =
                        editor.closest<HTMLElement>(".canvas-element");
                      if (!parent) return;
                      const fontSize = element.fontSize ?? 24;
                      const lineHeight =
                        typeof element.lineHeight === "number"
                          ? element.lineHeight * fontSize
                          : fontSize * 1.2;
                      parent.style.width = `${Math.max(1, Math.ceil(editor.scrollWidth + 1))}px`;
                      parent.style.height = `${Math.max(lineHeight, Math.ceil(editor.scrollHeight))}px`;
                    }}
                    onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
                      if (event.key === "Escape") event.currentTarget.blur();
                    }}
                    ref={(node) => {
                      if (node) textEditorRefs.current.set(element.id, node);
                      else textEditorRefs.current.delete(element.id);
                    }}
                    style={textStyleForElement(element)}
                    suppressContentEditableWarning
                  >
                    {element.text}
                  </div>
                ) : (
                  <ShapeGraphic element={element} />
                )}

                {selected &&
                !groupedSelectionBounds &&
                element.type !== "line" ? (
                  <SelectionOutlineSvg
                    centerOutset={selectionHandleOutset}
                    controlScale={selectionControlScale}
                    height={element.height}
                    lineWidth={selectionLineWidth}
                    showCornerHandles={
                      nodeEditElementId !== element.id &&
                      selectedElements.length === 1 &&
                      !element.locked
                    }
                    strokePlacement={
                      element.type === "image" ? "inside" : "center"
                    }
                    width={element.width}
                  />
                ) : null}

                {nodeEditElementId === element.id && element.type === "pen" ? (
                  <PenEditControls
                    element={element}
                    onHandlePointerDown={handlePenHandlePointerDown}
                    onNodePointerDown={handlePenNodePointerDown}
                    selectedHandles={selectedPenHandles}
                    selectedNodes={selectedPenNodes}
                  />
                ) : null}

                {nodeEditElementId !== element.id &&
                selectedElements.length === 1 &&
                selected &&
                !element.locked ? (
                  <>
                    {element.type === "line" ? (
                      (["start", "end"] as const).map((endpoint) => (
                        <button
                          aria-label={`Adjust ${element.name} ${endpoint}`}
                          className={`line-endpoint endpoint-${endpoint}`}
                          key={endpoint}
                          onPointerDown={(event) =>
                            handleLineEndpointPointerDown(
                              event,
                              element,
                              endpoint,
                            )
                          }
                          type="button"
                        />
                      ))
                    ) : (
                      <>
                        {(["nw", "ne", "se", "sw"] as ResizeHandle[]).map(
                          (handle) => (
                            <button
                              aria-label={`Resize ${handle}`}
                              className={`resize-handle handle-${handle}`}
                              key={handle}
                              onPointerDown={(event) =>
                                handleResizePointerDown(event, element, handle)
                              }
                              type="button"
                            />
                          ),
                        )}
                        {element.type === "image"
                          ? (["n", "e", "s", "w"] as ImageResizeHandle[]).map(
                              (handle) => (
                                <button
                                  aria-label={`Crop image ${handle}`}
                                  className={`resize-handle image-edge-handle image-edge-handle-${handle}`}
                                  key={handle}
                                  onPointerDown={(event) =>
                                    handleImageCropPointerDown(
                                      event,
                                      element,
                                      handle,
                                    )
                                  }
                                  type="button"
                                />
                              ),
                            )
                          : null}
                      </>
                    )}
                  </>
                ) : null}
              </div>
            );
          })}

          {combinedSelectionBounds ? (
            <div
              aria-label={
                groupedSelectionId ? "Group selection" : "Multiple selection"
              }
              className={`group-selection-outline ${groupedSelectionId ? "is-group" : "is-multiple"}`}
              style={
                {
                  height: combinedSelectionBounds.height,
                  left: combinedSelectionBounds.x,
                  top: combinedSelectionBounds.y,
                  width: combinedSelectionBounds.width,
                  "--selection-handle-outset": `${selectionOutlineWidth / 2}px`,
                  "--selection-outline-width": `${selectionOutlineWidth}px`,
                } as CSSProperties
              }
            >
              <SelectionOutlineSvg
                centerOutset={selectionOutlineWidth / 2}
                controlScale={selectionControlScale}
                height={combinedSelectionBounds.height}
                lineWidth={selectionOutlineWidth}
                showCornerHandles={combinedSelectionResizable}
                width={combinedSelectionBounds.width}
              />
              {combinedSelectionResizable
                ? (["nw", "ne", "se", "sw"] as ResizeHandle[]).map((handle) => (
                    <button
                      aria-label={`Resize selection ${handle}`}
                      className={`resize-handle multi-resize-handle handle-${handle}`}
                      key={handle}
                      onPointerDown={(event) =>
                        handleMultiResizePointerDown(event, handle)
                      }
                      type="button"
                    />
                  ))
                : null}
            </div>
          ) : null}

          {selectionDimensionsBounds &&
          selectionDimensionsPlacement &&
          selectionDimensionsValue ? (
            <output
              aria-label="Selection dimensions"
              className={`selection-dimensions ${selectionDimensionsPlacement.className}`}
              key={`selection-dimensions-${selectedElementIds.join("-")}`}
              style={{
                left:
                  selectionDimensionsBounds.x +
                  selectionDimensionsBounds.width / 2,
                top: selectionDimensionsPlacement.top,
              }}
            >
              W {selectionDimensionsValue.width} x H{" "}
              {selectionDimensionsValue.height}
            </output>
          ) : null}

          {rulersVisible
            ? guides.map((guide) => {
                const horizontal = guide.orientation === "horizontal";
                const selected = selectedGuideIds.includes(guide.id);
                return (
                  <div
                    aria-label={`${horizontal ? "Horizontal" : "Vertical"} guide at ${Math.round(guide.position)} pixels`}
                    aria-selected={selected}
                    className={`editor-guide ${horizontal ? "is-horizontal" : "is-vertical"} ${selected ? "is-selected" : ""}`}
                    data-guide-id={guide.id}
                    key={guide.id}
                    onPointerCancel={handleGuidePointerUp}
                    onPointerDown={(event) =>
                      handleGuidePointerDown(event, guide)
                    }
                    onPointerMove={handleGuidePointerMove}
                    onPointerUp={handleGuidePointerUp}
                    role="option"
                    style={
                      horizontal
                        ? {
                            left: -10000,
                            top: guide.position,
                            width: 20000,
                          }
                        : {
                            height: 20000,
                            left: guide.position,
                            top: -10000,
                          }
                    }
                  />
                );
              })
            : null}

          <div
            className="smart-guide is-horizontal"
            hidden
            ref={horizontalSmartGuideRef}
          />
          <div
            className="smart-guide is-vertical"
            hidden
            ref={verticalSmartGuideRef}
          />

          {Array.from({ length: distancePreviewSlotCount }, (_, index) => (
            <div
              className="distance-preview-slot"
              hidden
              key={`distance-preview-${index}`}
              ref={(node) => {
                distanceMeasurementRefs.current[index] = node;
              }}
            >
              <span className="distance-preview-label" />
            </div>
          ))}

          {distanceMeasurements.map((measurement, index) => {
            const horizontal = measurement.axis === "horizontal";
            return (
              <div
                className={[
                  "distance-measurement",
                  horizontal ? "is-horizontal" : "is-vertical",
                  measurement.hideMinArrow ? "hide-min-arrow" : "",
                  measurement.hideMaxArrow ? "hide-max-arrow" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={`distance-${measurement.axis}-${index}`}
                style={
                  horizontal
                    ? {
                        left: Math.min(measurement.from, measurement.to),
                        top: measurement.cross,
                        width: Math.max(
                          1,
                          Math.abs(measurement.to - measurement.from),
                        ),
                      }
                    : {
                        height: Math.max(
                          1,
                          Math.abs(measurement.to - measurement.from),
                        ),
                        left: measurement.cross,
                        top: Math.min(measurement.from, measurement.to),
                      }
                }
              >
                <span className="distance-label">{measurement.value} px</span>
              </div>
            );
          })}

          {penDraftBounds ? (
            <svg
              aria-hidden="true"
              className="draw-draft draft-pen"
              preserveAspectRatio="none"
              shapeRendering="geometricPrecision"
              style={{
                height: Math.max(8, penDraftBounds.height),
                left: penDraftBounds.x,
                top: penDraftBounds.y,
                width: Math.max(8, penDraftBounds.width),
              }}
              viewBox={`0 0 ${Math.max(8, penDraftBounds.width)} ${Math.max(8, penDraftBounds.height)}`}
            >
              {penDraftPoints.map((point, index) => (
                <g key={`pen-draft-helper-${index}`}>
                  {point.handleIn ? (
                    <line
                      stroke="#ab51f0"
                      strokeLinecap="round"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                      x1={point.x - penDraftBounds.x}
                      x2={point.handleIn.x - penDraftBounds.x}
                      y1={point.y - penDraftBounds.y}
                      y2={point.handleIn.y - penDraftBounds.y}
                    />
                  ) : null}
                  {point.handleOut ? (
                    <line
                      stroke="#ab51f0"
                      strokeLinecap="round"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                      x1={point.x - penDraftBounds.x}
                      x2={point.handleOut.x - penDraftBounds.x}
                      y1={point.y - penDraftBounds.y}
                      y2={point.handleOut.y - penDraftBounds.y}
                    />
                  ) : null}
                </g>
              ))}
              <path
                d={pathData(
                  penDraftPoints.map((point) => ({
                    ...point,
                    x: point.x - penDraftBounds.x,
                    y: point.y - penDraftBounds.y,
                    handleIn: point.handleIn
                      ? {
                          x: point.handleIn.x - penDraftBounds.x,
                          y: point.handleIn.y - penDraftBounds.y,
                        }
                      : undefined,
                    handleOut: point.handleOut
                      ? {
                          x: point.handleOut.x - penDraftBounds.x,
                          y: point.handleOut.y - penDraftBounds.y,
                        }
                      : undefined,
                  })),
                )}
                fill="none"
                stroke="#000000"
                strokeLinecap="round"
                strokeLinejoin="round"
                shapeRendering="geometricPrecision"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              {penDraft && !penDraft.isDragging && penDraftPoints.length ? (
                <line
                  stroke="#ab51f0"
                  strokeDasharray="3 3"
                  strokeLinecap="round"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                  x1={penDraftPoints.at(-1)!.x - penDraftBounds.x}
                  x2={penDraftCurrent!.x - penDraftBounds.x}
                  y1={penDraftPoints.at(-1)!.y - penDraftBounds.y}
                  y2={penDraftCurrent!.y - penDraftBounds.y}
                />
              ) : null}
              {penDraftPoints.map((point, index) => (
                <g key={`pen-draft-points-${index}`}>
                  {point.handleIn ? (
                    <circle
                      cx={point.handleIn.x - penDraftBounds.x}
                      cy={point.handleIn.y - penDraftBounds.y}
                      fill="#ffffff"
                      r="3"
                      stroke="#ab51f0"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}
                  {point.handleOut ? (
                    <circle
                      cx={point.handleOut.x - penDraftBounds.x}
                      cy={point.handleOut.y - penDraftBounds.y}
                      fill="#ffffff"
                      r="3"
                      stroke="#ab51f0"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}
                  <circle
                    cx={point.x - penDraftBounds.x}
                    cy={point.y - penDraftBounds.y}
                    fill="#ffffff"
                    r="3"
                    stroke="#ab51f0"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              ))}
            </svg>
          ) : draftLine ? (
            <svg
              aria-hidden="true"
              className="draw-draft draft-line"
              preserveAspectRatio="none"
              shapeRendering="geometricPrecision"
              style={{
                height: draftLine.height,
                left: draftLine.x,
                top: draftLine.y,
                width: draftLine.width,
                background: "transparent",
              }}
              viewBox={`0 0 ${draftLine.width} ${draftLine.height}`}
            >
              <rect
                fill="rgb(171 81 240 / 10%)"
                height={Math.max(1, draftLine.height - 1)}
                stroke="#ab51f0"
                strokeDasharray="3 3"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                width={Math.max(1, draftLine.width - 1)}
                x="0.5"
                y="0.5"
              />
              <line
                stroke="#000000"
                strokeLinecap="round"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                x1={draftLine.startX}
                x2={draftLine.endX}
                y1={draftLine.startY}
                y2={draftLine.endY}
              />
            </svg>
          ) : draftBounds ? (
            <DrawDraftPreview
              bounds={draftBounds}
              draft={drawDraft!}
              outlineWidth={selectionOutlineWidth}
            />
          ) : null}
          {marqueeBounds ? (
            <div
              className="selection-marquee"
              style={{
                height: marqueeBounds.height,
                left: marqueeBounds.x,
                top: marqueeBounds.y,
                width: marqueeBounds.width,
              }}
            />
          ) : null}
        </div>

        {rulersVisible && guidePreview ? (
          <div
            className={`editor-guide-preview ${guidePreview.orientation === "horizontal" ? "is-horizontal" : "is-vertical"}`}
            style={
              guidePreview.orientation === "horizontal"
                ? { top: guidePreview.position }
                : { left: guidePreview.position }
            }
          />
        ) : null}

        <aside
          aria-label="Navigator"
          className={`navigator interface-scale-surface ${navigatorVisible ? "is-visible" : ""}`}
        >
          <span className="navigator-title">Navigator</span>
          <div className="navigator-preview">
            <div
              className="navigator-map"
              style={{
                height: navigatorMap.height,
                left: navigatorMap.left,
                top: navigatorMap.top,
                width: navigatorMap.width,
              }}
            >
              <div
                className="navigator-artboard"
                style={{
                  background: "transparent",
                  height: navigatorBoard.height,
                  left: navigatorBoard.left,
                  top: navigatorBoard.top,
                  width: navigatorBoard.width,
                }}
              >
                <ArtboardBackground artboard={artboard} playVideo={false} />
                {elements.map((element) => {
                  if (!element.visible) return null;
                  return (
                    <div
                      className="navigator-element"
                      key={element.id}
                      style={{
                        height: element.height * navigatorScale,
                        left: element.x * navigatorScale,
                        opacity: element.opacity / 100,
                        top: element.y * navigatorScale,
                        transform: `rotate(${element.rotation}deg)`,
                        transformOrigin: "center",
                        width: element.width * navigatorScale,
                      }}
                    >
                      {element.type === "text" ? (
                        <span className="navigator-text">{element.text}</span>
                      ) : (
                        <ShapeGraphic
                          element={element}
                          imageScale={navigatorScale}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <span
                aria-hidden="true"
                className="navigator-viewport"
                style={navigatorViewportStyle}
              />
            </div>
          </div>
          <div className="navigator-zoom">
            <button
              aria-label="Zoom out"
              onClick={() => zoomAtCanvasCenter(zoom - 10)}
              type="button"
            >
              <Minus size={13} />
            </button>
            <strong>{Math.round(zoom)} %</strong>
            <button
              aria-label="Zoom in"
              onClick={() => zoomAtCanvasCenter(zoom + 10)}
              type="button"
            >
              <Plus size={13} />
            </button>
          </div>
        </aside>
      </section>

      <aside
        aria-label="Properties"
        className="properties-panel interface-scale-surface"
      >
        <div
          aria-label="Property sections"
          className="panel-tabs"
          data-active-tab={visiblePropertyTab}
          role="tablist"
        >
          <button
            aria-label="INTERACTION"
            aria-selected={visiblePropertyTab === "interaction"}
            data-label="INTERACTION"
            onClick={() => setPropertyTab("interaction")}
            role="tab"
            type="button"
          >
            INTERACTION
          </button>
          <button
            aria-label="SCENES"
            aria-selected={visiblePropertyTab === "scenes"}
            data-label="SCENES"
            onClick={() => setPropertyTab("scenes")}
            role="tab"
            type="button"
          >
            SCENES
          </button>
          <button
            aria-label="DESIGN"
            aria-selected={visiblePropertyTab === "design"}
            data-label="DESIGN"
            onClick={() => setPropertyTab("design")}
            role="tab"
            type="button"
          >
            DESIGN
          </button>
          <button
            aria-label="SOUND"
            aria-selected={visiblePropertyTab === "sound"}
            data-label="SOUND"
            onClick={() => setPropertyTab("sound")}
            role="tab"
            type="button"
          >
            SOUND
          </button>
          <button
            aria-label="LOGIC"
            aria-selected="false"
            data-label="LOGIC"
            disabled
            role="tab"
            type="button"
          >
            LOGIC
          </button>
        </div>
        {visiblePropertyTab === "interaction" ? (
          <InteractionPanel selectedName={selectedElements[0]?.name ?? null} />
        ) : null}
        {visiblePropertyTab === "scenes" ? (
          <ScenePanel
            activePageId={activePageId}
            activePageName={activePage?.name ?? "Page"}
            artboard={artboard}
            key={activePageId}
            onRenamePage={renamePage}
            onUpdateArtboard={updateArtboard}
          />
        ) : visiblePropertyTab === "sound" ? (
          <SoundPanel
            advancedSettings={advancedSoundSettings}
            elements={elements}
            mixer={soundMixerSettings}
            onAttachArtwork={attachBackgroundMusicArtwork}
            onAppendInteractionSoundAssets={
              appendInteractionSoundAssetsForElements
            }
            onApplyCommonInteractionSoundAsset={
              applyCommonInteractionSoundAssetForElements
            }
            onCheckpoint={checkpoint}
            onClearInteractionSoundAssets={
              clearInteractionSoundAssetsForElements
            }
            onCreateObjectUrl={createBackgroundMusicObjectUrl}
            onDeleteInteractionAsset={deleteInteractionSoundAsset}
            onReplaceInteractionSounds={replaceInteractionSoundsForElement}
            onSelectElement={(elementId) => {
              setSelectedElementIds([elementId]);
              setSelectedGuideIds([]);
              setSelectedPenNodes([]);
              setSelectedPenHandles([]);
            }}
            onUpdate={updateBackgroundMusic}
            onUpdateAdvanced={updateAdvancedSound}
            onUpdateInteractionExpanded={updateInteractionExpandedForElements}
            onUpdateInteractionSound={updateInteractionSoundForElements}
            onUpdateMixer={updateSoundMixer}
            pageId={activePageId}
            selectedElements={selectedElements}
            settings={backgroundMusicSettings}
          />
        ) : visiblePropertyTab === "design" ? (
          <DesignPanel
            artboard={artboard}
            lockRatio={lockRatio}
            onCheckpoint={checkpoint}
            onLockRatioChange={setLockRatio}
            onReplaceElements={replaceElements}
            onUpdateElement={updateElement}
            selectedElements={selectedElements}
          />
        ) : null}
        <output className="visually-hidden">
          {selectedElementIds.length
            ? `${selectedElementIds.length} selected`
            : clipboard.length
              ? `${clipboard.length} copied`
              : ""}
        </output>
      </aside>
      {previewVisible ? (
        <ViewerPreview
          advancedSound={advancedSoundSettings}
          artboard={artboard}
          backgroundMusic={backgroundMusicSettings}
          elements={elements}
          mixer={soundMixerSettings}
          onClose={() => setPreviewVisible(false)}
        />
      ) : null}
    </main>
  );
}
