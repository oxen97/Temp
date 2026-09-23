/* Audio playback intentionally keeps the latest props in refs. */
/* eslint-disable react-hooks/refs */

import { X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ArtboardBackground } from "@/features/editor/components/canvas/artboard-background";
import { Artboard3DScene } from "@/features/editor/components/canvas/artboard-3d-scene";
import { ShapeGraphic } from "@/features/editor/components/canvas/shape-graphic";
import { MetaballLayer } from "@/features/editor/components/viewer/metaball-layer";
import { ViewerBackgroundMusic } from "@/features/editor/components/viewer/viewer-background-music";
import {
  ViewerPointerTrails,
  type ViewerPointerTrailsHandle,
} from "@/features/editor/components/viewer/viewer-pointer-trails";
import { textStyleForElement } from "@/features/editor/lib/element-style";
import { clamp } from "@/features/editor/lib/geometry";
import {
  isLiquidPairActive,
  liquidBoundsGap,
} from "@/features/editor/lib/liquid-merge-runtime";
import {
  metaballFilterBounds,
  type MetaballSource,
} from "@/features/editor/lib/metaball";
import { polygonPointsForElement } from "@/features/editor/lib/polygon";
import {
  bendOpenPath,
  type StrandBendVisual,
} from "@/features/editor/lib/strand-bend";
import {
  applyStrandSwipeImpulse,
  closestStrandBone,
  createStrandPose,
  limitStrandPoseDisplacement,
  stepStrandPose,
  strandPosePath,
  strandPoseRibbonPath,
  type StrandBonePoint,
  type StrandPose,
} from "@/features/editor/lib/strand-bone-runtime";
import {
  pathData,
  vectorPathsForElement,
} from "@/features/editor/lib/vector-path";
import {
  createSpawnInstance,
  createTrailParticles,
  sampleTrailSegment,
  waveDeformedPaths,
  type ViewerPoint,
  type ViewerSpawnInstance,
} from "@/features/editor/lib/viewer-generated-effects";
import type { SceneLogicEvent } from "@/features/editor/lib/scene-logic";
import {
  InteractionPhysicsWorld,
  loadRapier,
} from "@/features/editor/lib/interaction-physics";
import {
  constrainDragDelta,
  hasTargetDragGesture,
  isDropTargetHit,
  isTargetDragTrigger,
  matchesDropRule,
  resolveDropOccupancy,
  snapOffsetForTarget,
  type RuntimeRect,
} from "@/features/editor/lib/interaction-drop-runtime";
import {
  activeTransition,
  composeFilter,
  composeTransform,
  type ElementRuntimeState,
  type RuntimeVisual,
  hasRuntimeInteractions,
  IDLE_RUNTIME_STATE,
  isRuntimeInteractionActive,
  runtimeVisualForElement,
} from "@/features/editor/lib/interaction-runtime";
import {
  calculateInteractionSoundVolume,
  chooseInteractionSoundAsset,
  fadeInteractionSoundToSilence,
  type InteractionSoundPlaybackCursor,
  startInteractionSoundEnvelope,
} from "@/features/editor/lib/sound-playback";
import {
  soundOutputBitrate,
  soundPreloadAttribute,
  type SoundTarget,
} from "@/features/editor/lib/sound-settings";
import {
  type ArtboardSettings,
  type BackgroundMusicSettings,
  type CanvasElement,
  type InteractionSoundEvent,
  type InteractionSoundTrigger,
  type SoundAdvancedSettings,
  type SoundMixerSettings,
} from "@/features/editor/store/editor-store";
import type {
  Object3DElement,
  Scene3DSettings,
} from "@/features/editor/three/types";
import type { InteractionDefinition } from "@/features/editor/lib/interaction-model";

function liquidSourceForElement(
  element: CanvasElement,
  visual: RuntimeVisual,
  strandBend: StrandBendVisual | undefined,
  strandPose?: StrandPose,
): MetaballSource | null {
  const transform = {
    translateX: element.x + visual.tx,
    translateY: element.y + visual.ty,
    originX: element.width / 2,
    originY: element.height / 2,
    rotationDegrees: element.rotation + visual.rotate,
    scaleX: visual.scaleX * (element.flipX ? -1 : 1),
    scaleY: visual.scaleY * (element.flipY ? -1 : 1),
  };
  const strokeWidth =
    element.fill === "transparent" || element.fill === "none"
      ? element.strokeStyle === "none"
        ? 0
        : element.strokeWidth
      : 0;
  if (element.type === "circle") {
    return {
      id: element.id,
      kind: "ellipse",
      x: element.width / 2,
      y: element.height / 2,
      radiusX: element.width / 2,
      radiusY: element.height / 2,
      strokeWidth,
      transform,
    };
  }
  if (element.type === "rectangle") {
    return {
      id: element.id,
      kind: "rect",
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      cornerRadius: element.cornerRadius,
      strokeWidth,
      transform,
    };
  }
  if (element.type === "triangle" || element.type === "star") {
    return {
      id: element.id,
      kind: "polygon",
      points: polygonPointsForElement(element).map((point) => ({
        x: (point.x / 100) * element.width,
        y: (point.y / 100) * element.height,
      })),
      strokeWidth,
      transform,
    };
  }
  if (element.type === "pen" || element.type === "line") {
    if (strandPose?.points.length) {
      const minX = Math.min(...strandPose.points.map((point) => point.x));
      const minY = Math.min(...strandPose.points.map((point) => point.y));
      const maxX = Math.max(...strandPose.points.map((point) => point.x));
      const maxY = Math.max(...strandPose.points.map((point) => point.y));
      return {
        id: element.id,
        kind: "path",
        d: strandPosePath(strandPose),
        bounds: {
          x: minX,
          y: minY,
          width: Math.max(1, maxX - minX),
          height: Math.max(1, maxY - minY),
        },
        strokeWidth: Math.max(1, element.strokeWidth),
        transform,
      };
    }
    const paths =
      element.type === "line"
        ? [
            {
              points: [
                { x: 0, y: element.height / 2 },
                { x: element.width, y: element.height / 2 },
              ],
            },
          ]
        : vectorPathsForElement(element);
    const renderedPaths = strandBend
      ? paths.map((path) => bendOpenPath(path, strandBend))
      : paths;
    const d = renderedPaths
      .map((path) => pathData(path.points, path.closed))
      .join(" ");
    if (!d) return null;
    const allPoints = renderedPaths.flatMap((path) =>
      path.points.flatMap((point) => [
        point,
        ...(point.handleIn ? [point.handleIn] : []),
        ...(point.handleOut ? [point.handleOut] : []),
      ]),
    );
    const minX = Math.min(...allPoints.map((point) => point.x));
    const minY = Math.min(...allPoints.map((point) => point.y));
    const maxX = Math.max(...allPoints.map((point) => point.x));
    const maxY = Math.max(...allPoints.map((point) => point.y));
    return {
      id: element.id,
      kind: "path",
      d,
      bounds: {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
      },
      strokeWidth: Math.max(1, element.strokeWidth),
      transform,
    };
  }
  return null;
}

function strandInteractionForElement(
  element: CanvasElement,
): InteractionDefinition | undefined {
  if (element.type !== "pen" && element.type !== "line") return undefined;
  return (element.interactions ?? []).find(
    (interaction) =>
      interaction.enabled !== false &&
      interaction.effect === "strand-bend" &&
      (interaction.trigger === "drag" ||
        interaction.trigger === "pointer-move"),
  );
}

function strandPathForElement(element: CanvasElement) {
  return element.type === "line"
    ? {
        points: [
          { x: 0, y: element.height / 2 },
          { x: element.width, y: element.height / 2 },
        ],
      }
    : vectorPathsForElement(element).find((path) => !path.closed);
}

function strandSampleSpacing(element: CanvasElement) {
  // A modest number of connected bones bends like a strand rather than a
  // chain of tiny independent vertices. Thin authored paths remain precise.
  return Math.max(10, Math.min(26, element.strokeWidth * 0.65));
}

function strandWorldPoint(
  point: StrandBonePoint,
  element: CanvasElement,
  visual: RuntimeVisual,
): StrandBonePoint {
  const centerX = element.width / 2;
  const centerY = element.height / 2;
  const x = (point.x - centerX) * visual.scaleX * (element.flipX ? -1 : 1);
  const y = (point.y - centerY) * visual.scaleY * (element.flipY ? -1 : 1);
  const angle = ((element.rotation + visual.rotate) * Math.PI) / 180;
  return {
    x:
      element.x +
      visual.tx +
      centerX +
      x * Math.cos(angle) -
      y * Math.sin(angle),
    y:
      element.y +
      visual.ty +
      centerY +
      x * Math.sin(angle) +
      y * Math.cos(angle),
  };
}

function strandLocalPoint(
  point: StrandBonePoint,
  element: CanvasElement,
  visual: RuntimeVisual,
): StrandBonePoint {
  const centerX = element.width / 2;
  const centerY = element.height / 2;
  const x = point.x - element.x - visual.tx - centerX;
  const y = point.y - element.y - visual.ty - centerY;
  const angle = ((element.rotation + visual.rotate) * Math.PI) / 180;
  return {
    x:
      centerX +
      (x * Math.cos(angle) + y * Math.sin(angle)) /
        (Math.max(0.0001, Math.abs(visual.scaleX)) * (element.flipX ? -1 : 1)),
    y:
      centerY +
      (-x * Math.sin(angle) + y * Math.cos(angle)) /
        (Math.max(0.0001, Math.abs(visual.scaleY)) * (element.flipY ? -1 : 1)),
  };
}

function constrainedStrandGrab(
  pose: StrandPose,
  grab: { index: number; target: StrandBonePoint },
  maxDisplacement: number,
) {
  const rest = pose.rest[grab.index];
  if (!rest) return grab;
  const dx = grab.target.x - rest.x;
  const dy = grab.target.y - rest.y;
  const distance = Math.hypot(dx, dy);
  const scale =
    distance > maxDisplacement
      ? Math.max(0, maxDisplacement) / Math.max(0.0001, distance)
      : 1;
  return {
    index: grab.index,
    target: { x: rest.x + dx * scale, y: rest.y + dy * scale },
  };
}

function strandBendForElement(
  element: CanvasElement,
  runtime: ElementRuntimeState,
  pointer: { x: number; y: number } | null,
  neighborBend: { x: number; y: number } | undefined,
  focusPointer: { x: number; y: number } | null,
): StrandBendVisual | undefined {
  const interaction = (element.interactions ?? []).find(
    (entry) =>
      entry.enabled !== false &&
      (entry.trigger === "drag" || entry.trigger === "pointer-move") &&
      entry.effect === "strand-bend",
  );
  if (!interaction) return undefined;
  const radians = (element.rotation * Math.PI) / 180;
  const focusX = focusPointer
    ? focusPointer.x - (element.x + element.width / 2)
    : 0;
  const focusY = focusPointer
    ? focusPointer.y - (element.y + element.height / 2)
    : 0;
  const pointerDistance = pointer
    ? Math.hypot(
        pointer.x -
          Math.min(element.x + element.width, Math.max(element.x, pointer.x)),
        pointer.y -
          Math.min(element.y + element.height, Math.max(element.y, pointer.y)),
      )
    : Infinity;
  const pointerInfluence = Math.max(
    0,
    1 - pointerDistance / Math.max(1, interaction.trackDistance),
  );
  const drag =
    interaction.trigger === "pointer-move" && pointer
      ? {
          dx: (pointer.x - (element.x + element.width / 2)) * pointerInfluence,
          dy: (pointer.y - (element.y + element.height / 2)) * pointerInfluence,
        }
      : (runtime.drag ?? { dx: 0, dy: 0 });
  return {
    dx:
      drag.dx * Math.cos(radians) +
      drag.dy * Math.sin(radians) +
      (neighborBend?.x ?? 0),
    dy:
      -drag.dx * Math.sin(radians) +
      drag.dy * Math.cos(radians) +
      (neighborBend?.y ?? 0),
    anchor: interaction.strandAnchor,
    stiffness: interaction.strandStiffness,
    damping: interaction.strandDamping,
    influenceRadius: interaction.strandInfluenceRadius,
    maxDisplacement: interaction.strandMaxDisplacement,
    focusY: focusPointer
      ? element.height / 2 -
        focusX * Math.sin(radians) +
        focusY * Math.cos(radians)
      : undefined,
  };
}

export function viewerPreviewLayout(
  artboard: ArtboardSettings,
  viewport: { height: number; width: number },
) {
  const viewportWidth = Math.max(1, viewport.width);
  const viewportHeight = Math.max(1, viewport.height);
  const pageWidth = Math.max(1, artboard.width);
  const pageHeight = Math.max(1, artboard.height);
  const widthRatio = viewportWidth / pageWidth;
  const heightRatio = viewportHeight / pageHeight;
  const viewportMode = artboard.viewportMode ?? "fit";
  const scale =
    viewportMode === "fill"
      ? Math.max(widthRatio, heightRatio)
      : Math.min(widthRatio, heightRatio);
  const scaleX = viewportMode === "stretch" ? widthRatio : scale;
  const scaleY = viewportMode === "stretch" ? heightRatio : scale;

  return {
    height: pageHeight * scaleY,
    scaleX,
    scaleY,
    width: pageWidth * scaleX,
  };
}

export type ViewerInteractionPointerSession = {
  currentX: number;
  currentY: number;
  dragging: boolean;
  elementId: string;
  startX: number;
  startY: number;
  targetHits: Set<string>;
  strandGrab?: { index: number; offset: StrandBonePoint };
};

type ViewerDropPlacement = {
  effect: "attach-to-target" | "snap-to-target";
  targetId: string;
  /** Target translation when attached; used to follow later target motion. */
  targetXAtAttach: number;
  targetYAtAttach: number;
};

type ViewerModalState = {
  backdrop: boolean;
  closeOnBackdrop: boolean;
  closeOnEscape: boolean;
  restoreFocus: boolean;
  targetId: string;
  trapFocus: boolean;
};

function runtimeRectForElement(
  element: CanvasElement,
  visual: RuntimeVisual,
): RuntimeRect {
  const radians = ((element.rotation + visual.rotate) * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const skewX = Math.tan((visual.skewX * Math.PI) / 180);
  const skewY = Math.tan((visual.skewY * Math.PI) / 180);
  const centerX = element.x + element.width / 2 + visual.tx;
  const centerY = element.y + element.height / 2 + visual.ty;
  const corners = [
    [-element.width / 2, -element.height / 2],
    [element.width / 2, -element.height / 2],
    [element.width / 2, element.height / 2],
    [-element.width / 2, element.height / 2],
  ].map(([rawX, rawY]) => {
    const x = (rawX + skewX * rawY) * visual.scaleX;
    const y = (skewY * rawX + rawY) * visual.scaleY;
    return {
      x: centerX + x * cos - y * sin,
      y: centerY + x * sin + y * cos,
    };
  });
  const minX = Math.min(...corners.map((point) => point.x));
  const maxX = Math.max(...corners.map((point) => point.x));
  const minY = Math.min(...corners.map((point) => point.y));
  const maxY = Math.max(...corners.map((point) => point.y));
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function authoredRectForElement(element: CanvasElement): RuntimeRect {
  return {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };
}

export type ViewerInteractionAudioChannel = {
  audio: HTMLAudioElement;
  ended: boolean;
  envelopeCancel: (() => void) | null;
  fadeCancel: (() => void) | null;
};

export type ViewerActiveInteractionSound = {
  channels: ViewerInteractionAudioChannel[];
  continuous: boolean;
  elementId: string;
  fadeOutSeconds: number;
  settingId: string;
  stopping: boolean;
  targetVolume: number;
  trigger: InteractionSoundTrigger;
};

export type ViewerInteractionAudioGraph = {
  compressor: DynamicsCompressorNode;
  panner: StereoPannerNode | null;
};

export function ViewerPreview({
  advancedSound,
  artboard,
  backgroundMusic,
  elements,
  mixer,
  objects3d,
  onClose,
  onInteractionEvent,
  projectId,
  scene3d,
}: {
  advancedSound: SoundAdvancedSettings;
  artboard: ArtboardSettings;
  backgroundMusic: BackgroundMusicSettings;
  elements: CanvasElement[];
  mixer: SoundMixerSettings;
  objects3d: Object3DElement[];
  onClose: () => void;
  onInteractionEvent?: (event: SceneLogicEvent) => void;
  projectId: string;
  scene3d?: Partial<Scene3DSettings>;
}) {
  const [viewport, setViewport] = useState(() => ({
    height:
      typeof window === "undefined" ? artboard.height : window.innerHeight,
    width: typeof window === "undefined" ? artboard.width : window.innerWidth,
  }));
  const [backgroundMusicDucked, setBackgroundMusicDucked] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  const interactionAudioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const activeInteractionRef = useRef<ViewerActiveInteractionSound | null>(
    null,
  );
  const interactionPlaybackCursorsRef = useRef(
    new Map<string, InteractionSoundPlaybackCursor>(),
  );
  const interactionAudioContextRef = useRef<AudioContext | null>(null);
  const interactionAudioGraphsRef = useRef(
    new Map<HTMLAudioElement, ViewerInteractionAudioGraph>(),
  );
  const advancedSoundRef = useRef(advancedSound);
  advancedSoundRef.current = advancedSound;
  const mixerRef = useRef(mixer);
  mixerRef.current = mixer;
  const pointerSessionsRef = useRef(
    new Map<number, ViewerInteractionPointerSession>(),
  );
  const directTargetEffectRef = useRef<
    (source: CanvasElement, trigger: string, interactionId?: string) => void
  >(() => undefined);
  const suppressDragClickRef = useRef(new Set<string>());
  const scrollStopTimersRef = useRef(new Map<string, number>());
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const trailSessionsRef = useRef(new Map<number, Map<string, ViewerPoint>>());
  const nextParticleIdRef = useRef(1);
  const trailLayerRef = useRef<ViewerPointerTrailsHandle>(null);
  const nextSpawnIdRef = useRef(1);
  const [spawnInstances, setSpawnInstances] = useState<ViewerSpawnInstance[]>(
    [],
  );
  const [waveFrame, setWaveFrame] = useState<{
    pointer: ViewerPoint | null;
    seconds: number;
    strength: number;
  }>({ pointer: null, seconds: 0, strength: 0 });
  const waveFrameRef = useRef(waveFrame);
  const waveTargetPointerRef = useRef<ViewerPoint | null>(null);
  const [pagePointer, setPagePointer] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const physicsWorldRef = useRef<InteractionPhysicsWorld | null>(null);
  const physicsFrameRef = useRef<number | null>(null);
  const releasedRef = useRef<Set<string>>(new Set());
  const activeLiquidPairsRef = useRef<Set<string>>(new Set());
  const lastStrandFrameRef = useRef<number | null>(null);
  const strandPosesRef = useRef(new Map<string, StrandPose>());
  const [strandPoses, setStrandPoses] = useState(
    () => new Map<string, StrandPose>(),
  );
  const activeStrandPointerRef = useRef<{
    elementId: string;
    x: number;
    y: number;
    grab: { index: number; target: StrandBonePoint };
  } | null>(null);
  const strandFrameInputsRef = useRef(
    new Map<
      string,
      {
        element: CanvasElement;
        interaction: InteractionDefinition;
        visual: RuntimeVisual;
      }
    >(),
  );
  const strandPagePointerRef = useRef<StrandBonePoint | null>(null);
  const latchedStrandsRef = useRef(
    new Map<
      string,
      {
        sourceId: string;
        sourceIndex: number;
        targetIndex: number;
        offset: StrandBonePoint;
      }
    >(),
  );
  const targetOccupantsRef = useRef(new Map<string, string[]>());
  const occupancyTargetByElementRef = useRef(new Map<string, string>());
  const dropPlacementsRef = useRef(new Map<string, ViewerDropPlacement>());
  const [dropPlacements, setDropPlacements] = useState(
    () => new Map<string, ViewerDropPlacement>(),
  );
  const placementResetTimersRef = useRef(new Map<string, number>());
  const targetEffectResetTimersRef = useRef(new Map<string, number>());
  const targetCommandTimersRef = useRef(new Set<number>());
  const modalRestoreFocusRef = useRef<HTMLElement | null>(null);
  const [activeModal, setActiveModal] = useState<ViewerModalState | null>(null);
  const activeModalRef = useRef<ViewerModalState | null>(null);
  activeModalRef.current = activeModal;

  const [runtimeState, setRuntimeState] = useState<
    Map<string, ElementRuntimeState>
  >(() => new Map());
  const runtimeStateRef = useRef(new Map<string, ElementRuntimeState>());
  const mutateRuntimeState = useCallback(
    (
      elementId: string,
      updater: (state: ElementRuntimeState) => ElementRuntimeState,
    ) => {
      const next = new Map(runtimeStateRef.current);
      next.set(elementId, updater(next.get(elementId) ?? IDLE_RUNTIME_STATE));
      runtimeStateRef.current = next;
      setRuntimeState(next);
    },
    [],
  );
  const updateDropPlacements = useCallback(
    (
      updater: (
        current: Map<string, ViewerDropPlacement>,
      ) => Map<string, ViewerDropPlacement>,
    ) => {
      const next = updater(dropPlacementsRef.current);
      dropPlacementsRef.current = next;
      setDropPlacements(next);
    },
    [],
  );
  const closeRuntimeModal = useCallback((targetId?: string) => {
    setActiveModal((current) => {
      if (!current || (targetId && targetId !== current.targetId))
        return current;
      const restoreTarget = current.restoreFocus
        ? modalRestoreFocusRef.current
        : null;
      modalRestoreFocusRef.current = null;
      if (restoreTarget) {
        window.requestAnimationFrame(() => {
          if (restoreTarget.isConnected)
            restoreTarget.focus({ preventScroll: true });
        });
      }
      return null;
    });
  }, []);
  const openRuntimeModal = useCallback((interaction: InteractionDefinition) => {
    if (!interaction.modalTarget) return;
    if (interaction.modalRestoreFocus) {
      modalRestoreFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    }
    setActiveModal({
      backdrop: interaction.modalBackdrop,
      closeOnBackdrop: interaction.modalCloseOnBackdrop,
      closeOnEscape: interaction.modalCloseOnEscape,
      restoreFocus: interaction.modalRestoreFocus,
      targetId: interaction.modalTarget,
      trapFocus: interaction.modalTrapFocus,
    });
  }, []);
  const fireInteractionClick = useCallback(
    (element: CanvasElement) => {
      if (!hasRuntimeInteractions(element.interactions)) return;
      mutateRuntimeState(element.id, (state) => ({
        ...state,
        toggled: !state.toggled,
      }));
    },
    [mutateRuntimeState],
  );
  const setInteractionHover = useCallback(
    (element: CanvasElement, hovering: boolean) => {
      if (!hasRuntimeInteractions(element.interactions)) return;
      mutateRuntimeState(element.id, (state) => ({ ...state, hovering }));
    },
    [mutateRuntimeState],
  );
  const setInteractionDrag = useCallback(
    (element: CanvasElement, drag: ElementRuntimeState["drag"]) => {
      if (!hasRuntimeInteractions(element.interactions)) return;
      mutateRuntimeState(element.id, (state) => ({ ...state, drag }));
    },
    [mutateRuntimeState],
  );
  const commitInteractionDrag = useCallback(
    (element: CanvasElement) => {
      if (!hasRuntimeInteractions(element.interactions)) return;
      mutateRuntimeState(element.id, (state) => ({
        ...state,
        drag: null,
        dragOffset: state.drag
          ? {
              x: state.dragOffset.x + state.drag.dx,
              y: state.dragOffset.y + state.drag.dy,
            }
          : state.dragOffset,
      }));
    },
    [mutateRuntimeState],
  );

  const startPhysicsLoop = useCallback(() => {
    if (physicsFrameRef.current !== null) return;
    const tick = () => {
      const world = physicsWorldRef.current;
      if (!world || releasedRef.current.size === 0) {
        physicsFrameRef.current = null;
        return;
      }
      world.step();
      for (const id of releasedRef.current) {
        const readout = world.read(id);
        if (readout) {
          mutateRuntimeState(id, (state) => ({ ...state, physics: readout }));
        }
      }
      physicsFrameRef.current = requestAnimationFrame(tick);
    };
    physicsFrameRef.current = requestAnimationFrame(tick);
  }, [mutateRuntimeState]);

  const releaseToPhysics = useCallback(
    (element: CanvasElement) => {
      if (releasedRef.current.has(element.id)) return;
      const gravity = (element.interactions ?? []).find(
        (interaction) =>
          interaction.enabled !== false && interaction.motion === "gravity",
      );
      if (!gravity) return;
      releasedRef.current.add(element.id);
      void loadRapier().then((rapier) => {
        if (!releasedRef.current.has(element.id)) return;
        if (!physicsWorldRef.current) {
          physicsWorldRef.current = new InteractionPhysicsWorld(rapier, {
            width: artboard.width,
            height: artboard.height,
          });
        }
        physicsWorldRef.current.addBody({
          id: element.id,
          centerX: element.x + element.width / 2,
          centerY: element.y + element.height / 2,
          width: element.width,
          height: element.height,
          bounciness: gravity.bounciness / 100,
        });
        startPhysicsLoop();
      });
    },
    [artboard.width, artboard.height, startPhysicsLoop],
  );

  const unloadInteractionAudio = useCallback((audio: HTMLAudioElement) => {
    if (advancedSoundRef.current.unloadUnusedSounds) {
      audio.removeAttribute("src");
    }
  }, []);

  const configureInteractionAudio = useCallback(
    (audio: HTMLAudioElement, element: SoundTarget) => {
      const currentSettings = advancedSoundRef.current;
      if (!currentSettings.spatialSound && !currentSettings.autoNormalize) {
        return;
      }

      const AudioContextConstructor =
        window.AudioContext ??
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;
      if (!AudioContextConstructor) return;

      try {
        let context = interactionAudioContextRef.current;
        if (!context) {
          context = new AudioContextConstructor();
          interactionAudioContextRef.current = context;
        }

        let graph = interactionAudioGraphsRef.current.get(audio);
        if (!graph) {
          const sourceNode = context.createMediaElementSource(audio);
          const compressor = context.createDynamicsCompressor();
          const panner = context.createStereoPanner
            ? context.createStereoPanner()
            : null;
          if (panner) {
            sourceNode.connect(panner);
            panner.connect(compressor);
          } else {
            sourceNode.connect(compressor);
          }
          compressor.connect(context.destination);
          graph = { compressor, panner };
          interactionAudioGraphsRef.current.set(audio, graph);
        }

        const now = context.currentTime;
        const centerX =
          element.type === "object3d"
            ? element.transform.position.x
            : element.x + element.width / 2;
        const pan = currentSettings.spatialSound
          ? clamp((centerX / Math.max(1, artboard.width)) * 2 - 1, -1, 1)
          : 0;
        graph.panner?.pan.setValueAtTime(pan, now);

        graph.compressor.threshold.setValueAtTime(
          currentSettings.autoNormalize ? -24 : 0,
          now,
        );
        graph.compressor.knee.setValueAtTime(
          currentSettings.autoNormalize ? 30 : 0,
          now,
        );
        graph.compressor.ratio.setValueAtTime(
          currentSettings.autoNormalize ? 4 : 1,
          now,
        );
        graph.compressor.attack.setValueAtTime(
          currentSettings.autoNormalize ? 0.003 : 0,
          now,
        );
        graph.compressor.release.setValueAtTime(
          currentSettings.autoNormalize ? 0.25 : 0,
          now,
        );
        if (context.state === "suspended") {
          void context.resume().catch(() => undefined);
        }
      } catch {
        // Keep native HTML audio playback when Web Audio is unavailable.
      }
    },
    [artboard.width],
  );

  const cancelInteractionAnimations = useCallback(
    (active = activeInteractionRef.current) => {
      active?.channels.forEach((channel) => {
        channel.envelopeCancel?.();
        channel.fadeCancel?.();
        channel.envelopeCancel = null;
        channel.fadeCancel = null;
      });
    },
    [],
  );

  const stopInteractionPlaybackImmediately = useCallback(
    (active = activeInteractionRef.current, restoreBackgroundMusic = true) => {
      if (!active) return;
      cancelInteractionAnimations(active);
      active.channels.forEach(({ audio }) => {
        if (!audio.paused) audio.pause();
        audio.currentTime = 0;
        audio.loop = false;
        unloadInteractionAudio(audio);
      });
      if (activeInteractionRef.current === active) {
        activeInteractionRef.current = null;
      }
      if (restoreBackgroundMusic) setBackgroundMusicDucked(false);
    },
    [cancelInteractionAnimations, unloadInteractionAudio],
  );

  const handleInteractionChannelEnded = useCallback(
    (audio: HTMLAudioElement) => {
      const active = activeInteractionRef.current;
      const channel = active?.channels.find(
        (candidate) => candidate.audio === audio,
      );
      if (!active || !channel || channel.ended) return;
      channel.envelopeCancel?.();
      channel.fadeCancel?.();
      channel.envelopeCancel = null;
      channel.fadeCancel = null;
      channel.ended = true;
      audio.loop = false;
      unloadInteractionAudio(audio);
      if (active.channels.every((candidate) => candidate.ended)) {
        activeInteractionRef.current = null;
        setBackgroundMusicDucked(false);
      }
    },
    [unloadInteractionAudio],
  );

  const markInteractionChannelFailed = useCallback(
    (
      active: ViewerActiveInteractionSound,
      channel: ViewerInteractionAudioChannel,
    ) => {
      if (activeInteractionRef.current !== active || channel.ended) return;
      channel.envelopeCancel?.();
      channel.fadeCancel?.();
      channel.envelopeCancel = null;
      channel.fadeCancel = null;
      channel.ended = true;
      channel.audio.loop = false;
      unloadInteractionAudio(channel.audio);
      if (active.channels.every((candidate) => candidate.ended)) {
        activeInteractionRef.current = null;
        setBackgroundMusicDucked(false);
      }
    },
    [unloadInteractionAudio],
  );

  const playInteractionEvent = useCallback(
    (
      element: SoundTarget,
      trigger: InteractionSoundTrigger,
      interactionEvent: InteractionSoundEvent,
      continuous = false,
    ) => {
      const setting = element.interactionSounds?.find(
        (sound) =>
          sound.enabled !== false &&
          sound.trigger === trigger &&
          sound.event === interactionEvent &&
          sound.assets.length > 0,
      );
      if (!setting) return false;

      const mixerGain =
        (mixerRef.current.interactionSoundVolume / 100) *
        (mixerRef.current.masterVolume / 100);

      const active = activeInteractionRef.current;
      if (
        continuous &&
        active?.continuous &&
        active.elementId === element.id &&
        active.settingId === setting.id
      ) {
        if (active.stopping) {
          active.channels.forEach((channel) => {
            channel.fadeCancel?.();
            channel.fadeCancel = null;
            channel.audio.volume = clamp(
              (setting.volume / 100) * mixerGain,
              0,
              1,
            );
          });
          active.targetVolume = clamp((setting.volume / 100) * mixerGain, 0, 1);
          active.stopping = false;
        }
        return true;
      }

      const cursorKey = `${element.id}:${setting.id}`;
      let cursor = interactionPlaybackCursorsRef.current.get(cursorKey);
      if (!cursor) {
        cursor = { lastSource: null, sequentialIndex: 0 };
        interactionPlaybackCursorsRef.current.set(cursorKey, cursor);
      }
      const asset = chooseInteractionSoundAsset(setting, cursor);
      const audio = interactionAudioRefs.current[0];
      if (!asset || !audio) return false;

      stopInteractionPlaybackImmediately(active);
      audio.loop = continuous;
      audio.src = asset.src;
      audio.volume = calculateInteractionSoundVolume(
        { ...setting, volume: setting.volume * mixerGain },
        0,
        0,
        Number.NaN,
        continuous,
      );
      configureInteractionAudio(audio, element);
      const channels: ViewerInteractionAudioChannel[] = [
        {
          audio,
          ended: false,
          envelopeCancel: null,
          fadeCancel: null,
        },
      ];
      const nextActive: ViewerActiveInteractionSound = {
        channels,
        continuous,
        elementId: element.id,
        fadeOutSeconds: setting.fadeOutSeconds,
        settingId: setting.id,
        stopping: false,
        targetVolume: clamp((setting.volume / 100) * mixerGain, 0, 1),
        trigger,
      };
      activeInteractionRef.current = nextActive;
      setBackgroundMusicDucked(true);

      channels.forEach((channel) => {
        const beginEnvelope = () => {
          if (activeInteractionRef.current !== nextActive || channel.ended) {
            return;
          }
          channel.envelopeCancel = startInteractionSoundEnvelope(
            channel.audio,
            () => ({
              ...setting,
              volume:
                setting.volume *
                (mixerRef.current.interactionSoundVolume / 100) *
                (mixerRef.current.masterVolume / 100),
            }),
            continuous,
          );
        };
        try {
          const playResult = channel.audio.play();
          if (playResult) {
            void playResult
              .then(beginEnvelope)
              .catch(() => markInteractionChannelFailed(nextActive, channel));
          } else {
            beginEnvelope();
          }
        } catch {
          markInteractionChannelFailed(nextActive, channel);
        }
      });
      return true;
    },
    [
      configureInteractionAudio,
      markInteractionChannelFailed,
      stopInteractionPlaybackImmediately,
    ],
  );

  const stopContinuousInteraction = useCallback(
    (elementId: string, trigger?: InteractionSoundTrigger) => {
      const active = activeInteractionRef.current;
      if (
        !active?.continuous ||
        active.elementId !== elementId ||
        (trigger && active.trigger !== trigger) ||
        active.stopping
      ) {
        return;
      }
      active.stopping = true;
      const completedChannels = new Set<ViewerInteractionAudioChannel>();
      const finishChannel = (channel: ViewerInteractionAudioChannel) => {
        if (
          activeInteractionRef.current !== active ||
          completedChannels.has(channel)
        ) {
          return;
        }
        completedChannels.add(channel);
        channel.fadeCancel = null;
        channel.audio.pause();
        channel.audio.currentTime = 0;
        channel.audio.loop = false;
        channel.ended = true;
        unloadInteractionAudio(channel.audio);
        if (completedChannels.size === active.channels.length) {
          activeInteractionRef.current = null;
          setBackgroundMusicDucked(false);
        }
      };
      active.channels.forEach((channel) => {
        channel.envelopeCancel?.();
        channel.envelopeCancel = null;
        if (active.fadeOutSeconds > 0 && !channel.audio.paused) {
          channel.fadeCancel = fadeInteractionSoundToSilence(
            channel.audio,
            active.fadeOutSeconds,
            () => finishChannel(channel),
          );
        } else {
          finishChannel(channel);
        }
      });
    },
    [unloadInteractionAudio],
  );

  const endPointerInteraction = useCallback(
    (element: CanvasElement, pointerId: number) => {
      const session = pointerSessionsRef.current.get(pointerId);
      pointerSessionsRef.current.delete(pointerId);
      if (!session || session.elementId !== element.id) return;
      stopContinuousInteraction(element.id, "press");
      stopContinuousInteraction(element.id, "drag");
      playInteractionEvent(element, "press", "release");
      if (session.dragging) {
        playInteractionEvent(element, "drag", "drop");
      }
    },
    [playInteractionEvent, stopContinuousInteraction],
  );

  useEffect(() => {
    const timers = scrollStopTimersRef.current;
    const placementTimers = placementResetTimersRef.current;
    const effectResetTimers = targetEffectResetTimersRef.current;
    const targetCommandTimers = targetCommandTimersRef.current;
    const audioElements = [...interactionAudioRefs.current];
    const playbackCursors = interactionPlaybackCursorsRef.current;
    const audioGraphs = interactionAudioGraphsRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      placementTimers.forEach((timer) => window.clearTimeout(timer));
      placementTimers.clear();
      effectResetTimers.forEach((timer) => window.clearTimeout(timer));
      effectResetTimers.clear();
      targetCommandTimers.forEach((timer) => window.clearTimeout(timer));
      targetCommandTimers.clear();
      stopInteractionPlaybackImmediately(undefined, false);
      audioElements.forEach((audio) => {
        if (!audio) return;
        if (!audio.paused) audio.pause();
        audio.currentTime = 0;
        audio.loop = false;
        audio.removeAttribute("src");
      });
      playbackCursors.clear();
      audioGraphs.clear();
      const audioContext = interactionAudioContextRef.current;
      interactionAudioContextRef.current = null;
      if (audioContext && audioContext.state !== "closed") {
        void audioContext.close().catch(() => undefined);
      }
      activeInteractionRef.current = null;
    };
  }, [stopInteractionPlaybackImmediately]);

  useEffect(() => {
    if (!activeModal) return;
    const modalElements = () =>
      Array.from(
        pageRef.current?.querySelectorAll<HTMLElement>(
          '.viewer-preview-element[data-modal-member="true"]',
        ) ?? [],
      );
    const focusableElements = () => {
      const candidates = modalElements().flatMap((element) => [
        ...(element.matches(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
          ? [element]
          : []),
        ...Array.from(
          element.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ),
      ]);
      return candidates.filter(
        (element, index) =>
          candidates.indexOf(element) === index &&
          !element.hasAttribute("disabled") &&
          element.getAttribute("aria-hidden") !== "true",
      );
    };
    const focusFrame = window.requestAnimationFrame(() => {
      const root = pageRef.current?.querySelector<HTMLElement>(
        '.viewer-preview-element[data-modal-dialog="true"]',
      );
      (focusableElements()[0] ?? root)?.focus({ preventScroll: true });
    });
    const handleModalKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Capture + immediate stop keeps the editor's preview-level Escape
        // listener from closing the whole preview before the authored modal.
        event.preventDefault();
        event.stopImmediatePropagation();
        if (activeModal.closeOnEscape) closeRuntimeModal(activeModal.targetId);
        return;
      }
      if (event.key !== "Tab" || !activeModal.trapFocus) return;
      const focusables = focusableElements();
      const root = pageRef.current?.querySelector<HTMLElement>(
        '.viewer-preview-element[data-modal-dialog="true"]',
      );
      const cycle = focusables.length ? focusables : root ? [root] : [];
      if (!cycle.length) return;
      event.preventDefault();
      event.stopPropagation();
      const currentIndex = cycle.indexOf(document.activeElement as HTMLElement);
      const nextIndex = event.shiftKey
        ? currentIndex <= 0
          ? cycle.length - 1
          : currentIndex - 1
        : currentIndex < 0 || currentIndex === cycle.length - 1
          ? 0
          : currentIndex + 1;
      cycle[nextIndex]?.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", handleModalKeyDown, true);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleModalKeyDown, true);
    };
  }, [activeModal, closeRuntimeModal]);

  useLayoutEffect(() => {
    const measure = () => {
      const root = document.documentElement;
      setViewport({
        height: Math.max(1, root.clientHeight || window.innerHeight),
        width: Math.max(1, root.clientWidth || window.innerWidth),
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (event: MediaQueryListEvent) =>
      setPrefersReducedMotion(event.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  // after-delay triggers: activate an element's timed interactions once the
  // delay elapses, counted from when the preview opened.
  useEffect(() => {
    const timers: number[] = [];
    for (const element of elements) {
      for (const interaction of element.interactions ?? []) {
        if (
          interaction.enabled === false ||
          interaction.trigger !== "after-delay"
        ) {
          continue;
        }
        timers.push(
          window.setTimeout(
            () => {
              mutateRuntimeState(element.id, (state) => ({
                ...state,
                timed: true,
              }));
              directTargetEffectRef.current(
                element,
                "after-delay",
                interaction.id,
              );
            },
            Math.max(0, interaction.timeSeconds) * 1000,
          ),
        );
      }
    }
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [elements, mutateRuntimeState]);

  // Release elements into the physics sim when a gravity interaction's trigger
  // becomes active. Already-released elements are left to the simulation.
  useEffect(() => {
    for (const element of elements) {
      if (releasedRef.current.has(element.id)) continue;
      const state = runtimeState.get(element.id) ?? IDLE_RUNTIME_STATE;
      const active = (element.interactions ?? []).some(
        (interaction) =>
          interaction.enabled !== false &&
          interaction.motion === "gravity" &&
          isRuntimeInteractionActive(interaction, state),
      );
      if (active) releaseToPhysics(element);
    }
  }, [elements, runtimeState, releaseToPhysics]);

  useEffect(
    () => () => {
      if (physicsFrameRef.current !== null) {
        cancelAnimationFrame(physicsFrameRef.current);
      }
      physicsWorldRef.current?.dispose();
      physicsWorldRef.current = null;
      releasedRef.current.clear();
    },
    [],
  );

  const pageType = artboard.pageType ?? "screen";
  const viewportMode = artboard.viewportMode ?? "fit";
  const layout = viewerPreviewLayout(artboard, viewport);
  const renderElements = useMemo(
    () => [
      ...elements,
      ...spawnInstances.flatMap((instance) => instance.elements),
    ],
    [elements, spawnInstances],
  );
  useEffect(() => {
    const liveIds = new Set(renderElements.map((element) => element.id));
    const current = runtimeStateRef.current;
    if (Array.from(current.keys()).some((id) => !liveIds.has(id))) {
      const next = new Map(
        Array.from(current).filter(([id]) => liveIds.has(id)),
      );
      runtimeStateRef.current = next;
      setRuntimeState(next);
    }
    for (const id of strandPosesRef.current.keys()) {
      if (!liveIds.has(id)) strandPosesRef.current.delete(id);
    }
  }, [renderElements]);
  const spawnScaleByElementId = new Map(
    spawnInstances.flatMap((instance) =>
      instance.elements.map((element) => [element.id, instance.scale] as const),
    ),
  );
  const spawnIdByElementId = new Map(
    spawnInstances.flatMap((instance) =>
      instance.elements.map((element) => [element.id, instance.id] as const),
    ),
  );
  const sourceIdBySpawnElementId = new Map(
    spawnInstances.flatMap((instance) =>
      instance.elements.map(
        (element) =>
          [element.id, element.id.slice(instance.id.length + 1)] as const,
      ),
    ),
  );
  const trailRows = useMemo(
    () =>
      elements.flatMap((source) =>
        source.visible
          ? (source.interactions ?? [])
              .filter(
                (interaction) =>
                  interaction.enabled !== false &&
                  interaction.trigger === "drag" &&
                  interaction.effect === "pointer-trail",
              )
              .map((interaction) => ({ source, interaction }))
          : [],
      ),
    [elements],
  );
  const trailLimits = useMemo(
    () =>
      new Map(
        trailRows.map(({ interaction }) => [
          interaction.id,
          interaction.trailMaxCount,
        ]),
      ),
    [trailRows],
  );
  const waveInteractionsByElementId = new Map<string, InteractionDefinition>();
  for (const source of renderElements) {
    for (const interaction of source.interactions ?? []) {
      if (
        interaction.enabled === false ||
        interaction.trigger !== "pointer-move" ||
        interaction.effect !== "wave-deform"
      )
        continue;
      waveInteractionsByElementId.set(source.id, interaction);
      for (const targetId of interaction.waveTargetIds ?? [])
        waveInteractionsByElementId.set(targetId, interaction);
    }
  }
  const usesWaveDeform = renderElements.some(
    (element) =>
      (element.type === "pen" || element.type === "line") &&
      waveInteractionsByElementId.has(element.id),
  );
  waveTargetPointerRef.current = pagePointer;
  useEffect(() => {
    if (!usesWaveDeform) return;
    let frame = 0;
    let previous = 0;
    const animate = (now: number) => {
      const deltaSeconds = Math.min(
        0.05,
        (now - (previous || now - 16)) / 1000,
      );
      previous = now;
      const target = waveTargetPointerRef.current;
      const prior = waveFrameRef.current;
      const strength =
        prior.strength +
        ((target ? 1 : 0) - prior.strength) * Math.min(1, deltaSeconds * 10);
      const next = {
        pointer: target ?? prior.pointer,
        seconds: now / 1000,
        strength: strength < 0.01 && !target ? 0 : strength,
      };
      waveFrameRef.current = next;
      setWaveFrame(next);
      if (!prefersReducedMotion) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [usesWaveDeform, prefersReducedMotion]);
  // Every visible 2D element is a static collision proxy in the 3D world
  // (extruded through z), so 3D physics bodies collide with 2D shapes.
  const collision3DProxies = useMemo(
    () =>
      renderElements
        .filter((element) => element.visible)
        .map((element) => ({
          depth: 600,
          height: element.height,
          id: `proxy:${element.id}`,
          width: element.width,
          x: element.x + element.width / 2,
          y: -(element.y + element.height / 2),
          z: 0,
        })),
    [renderElements],
  );
  const usesPointerMove = renderElements.some((element) =>
    (element.interactions ?? []).some(
      (interaction) =>
        interaction.enabled !== false && interaction.trigger === "pointer-move",
    ),
  );
  const visibleElements = renderElements.filter((element) => element.visible);
  const elementsById = new Map(
    visibleElements.map((element) => [element.id, element]),
  );
  const modalMemberIdsForTarget = (targetId: string) => {
    const target = elementsById.get(targetId);
    if (!target) return new Set<string>();
    if (!target.groupId) return new Set([target.id]);
    return new Set(
      visibleElements
        .filter((element) => element.groupId === target.groupId)
        .map((element) => element.id),
    );
  };
  const referencedModalElementIds = new Set<string>();
  for (const element of visibleElements) {
    for (const interaction of element.interactions ?? []) {
      if (
        interaction.enabled === false ||
        interaction.effect !== "open-modal" ||
        !interaction.modalTarget
      )
        continue;
      for (const id of modalMemberIdsForTarget(interaction.modalTarget))
        referencedModalElementIds.add(id);
    }
  }
  const activeModalElementIds = activeModal
    ? modalMemberIdsForTarget(activeModal.targetId)
    : new Set<string>();
  const baseRuntimeVisuals = new Map(
    visibleElements.map(
      (element) =>
        [
          element.id,
          runtimeVisualForElement(
            element.interactions,
            runtimeState.get(element.id) ?? IDLE_RUNTIME_STATE,
            {
              center: {
                x: element.x + element.width / 2,
                y: element.y + element.height / 2,
              },
              pointer: pagePointer,
            },
          ),
        ] as const,
    ),
  );
  const runtimeVisuals = new Map(baseRuntimeVisuals);
  // Attachments keep their relative translation when the authored target moves
  // later in the same preview. Snap placements intentionally remain absolute.
  const resolvedAttachments = new Set<string>();
  const resolvingAttachments = new Set<string>();
  const resolveAttachedVisual = (
    elementId: string,
  ): RuntimeVisual | undefined => {
    if (resolvedAttachments.has(elementId))
      return runtimeVisuals.get(elementId);
    const sourceVisual = baseRuntimeVisuals.get(elementId);
    if (!sourceVisual || resolvingAttachments.has(elementId))
      return sourceVisual;
    const placement = dropPlacements.get(elementId);
    if (!placement || placement.effect !== "attach-to-target") {
      resolvedAttachments.add(elementId);
      return sourceVisual;
    }
    resolvingAttachments.add(elementId);
    const target = elementsById.get(placement.targetId);
    const targetVisual = resolveAttachedVisual(placement.targetId);
    if (target && targetVisual) {
      const currentTargetRect = runtimeRectForElement(target, targetVisual);
      runtimeVisuals.set(elementId, {
        ...sourceVisual,
        tx: sourceVisual.tx + currentTargetRect.x - placement.targetXAtAttach,
        ty: sourceVisual.ty + currentTargetRect.y - placement.targetYAtAttach,
      });
    }
    resolvingAttachments.delete(elementId);
    resolvedAttachments.add(elementId);
    return runtimeVisuals.get(elementId);
  };
  for (const elementId of dropPlacements.keys()) {
    resolveAttachedVisual(elementId);
  }

  const removeOccupant = (elementId: string, onlyTargetId?: string) => {
    for (const [targetId, occupants] of targetOccupantsRef.current) {
      if (onlyTargetId && targetId !== onlyTargetId) continue;
      const next = occupants.filter((id) => id !== elementId);
      if (next.length) targetOccupantsRef.current.set(targetId, next);
      else targetOccupantsRef.current.delete(targetId);
    }
    const occupiedTarget = occupancyTargetByElementRef.current.get(elementId);
    if (!onlyTargetId || occupiedTarget === onlyTargetId)
      occupancyTargetByElementRef.current.delete(elementId);
  };
  const markTargetInteractionTriggered = (
    elementId: string,
    interactionId: string,
  ) => {
    mutateRuntimeState(elementId, (state) => ({
      ...state,
      // Move a retriggered row to the end so timing/motion resolve from the
      // interaction that actually fired most recently, not authored order.
      triggeredInteractionIds: [
        ...state.triggeredInteractionIds.filter((id) => id !== interactionId),
        interactionId,
      ],
    }));
  };
  const clearTargetInteraction = (elementId: string, interactionId: string) => {
    const timerKey = `${elementId}:${interactionId}`;
    const timer = targetEffectResetTimersRef.current.get(timerKey);
    if (timer !== undefined) window.clearTimeout(timer);
    targetEffectResetTimersRef.current.delete(timerKey);
    mutateRuntimeState(elementId, (state) => ({
      ...state,
      triggeredInteractionIds: state.triggeredInteractionIds.filter(
        (id) => id !== interactionId,
      ),
    }));
  };
  const scheduleTargetInteractionReset = (
    elementId: string,
    interaction: InteractionDefinition,
  ) => {
    const resetsByContext =
      interaction.resetMode === "contextual" &&
      (interaction.trigger === "drop-outside-target" ||
        interaction.trigger === "drag-leave-target");
    if (interaction.resetMode !== "return-to-origin" && !resetsByContext)
      return;
    const timerKey = `${elementId}:${interaction.id}`;
    const previousTimer = targetEffectResetTimersRef.current.get(timerKey);
    if (previousTimer !== undefined) window.clearTimeout(previousTimer);
    const timer = window.setTimeout(
      () => {
        targetEffectResetTimersRef.current.delete(timerKey);
        if (interaction.resetMode === "return-to-origin")
          resetPlacedElement(elementId);
        clearTargetInteraction(elementId, interaction.id);
      },
      Math.max(0, interaction.duration + interaction.hold) * 1000,
    );
    targetEffectResetTimersRef.current.set(timerKey, timer);
  };
  const resetPlacedElement = (elementId: string, clearTriggered = false) => {
    const timer = placementResetTimersRef.current.get(elementId);
    if (timer !== undefined) window.clearTimeout(timer);
    placementResetTimersRef.current.delete(elementId);
    removeOccupant(elementId);
    updateDropPlacements((current) => {
      if (!current.has(elementId)) return current;
      const next = new Map(current);
      next.delete(elementId);
      return next;
    });
    mutateRuntimeState(elementId, (state) => ({
      ...state,
      drag: null,
      dragOffset: { x: 0, y: 0 },
      triggeredInteractionIds: clearTriggered
        ? []
        : state.triggeredInteractionIds,
    }));
  };
  const acceptTargetOccupancy = (
    source: CanvasElement,
    interaction: InteractionDefinition,
    target: CanvasElement,
  ) => {
    const occupancy = resolveDropOccupancy({
      behavior: interaction.occupiedBehavior,
      capacity: interaction.targetCapacity,
      occupants: targetOccupantsRef.current.get(target.id) ?? [],
      sourceId: source.id,
    });
    if (!occupancy.accepted) return false;
    const previousTarget = occupancyTargetByElementRef.current.get(source.id);
    if (previousTarget && previousTarget !== target.id)
      removeOccupant(source.id, previousTarget);
    for (const evictedId of occupancy.evicted)
      resetPlacedElement(evictedId, true);
    targetOccupantsRef.current.set(target.id, occupancy.occupants);
    occupancyTargetByElementRef.current.set(source.id, target.id);
    return true;
  };
  const visualForCurrentGesture = (
    element: CanvasElement,
    stateOverride?: ElementRuntimeState,
    resolving = new Set<string>(),
  ): RuntimeVisual => {
    const state =
      stateOverride ??
      runtimeStateRef.current.get(element.id) ??
      IDLE_RUNTIME_STATE;
    let visual = runtimeVisualForElement(element.interactions, state, {
      center: {
        x: element.x + element.width / 2,
        y: element.y + element.height / 2,
      },
      pointer: pagePointer,
    });
    const placement = dropPlacementsRef.current.get(element.id);
    if (
      placement?.effect === "attach-to-target" &&
      !resolving.has(element.id)
    ) {
      resolving.add(element.id);
      const target = elementsById.get(placement.targetId);
      if (target) {
        const targetVisual = visualForCurrentGesture(
          target,
          undefined,
          resolving,
        );
        const targetRect = runtimeRectForElement(target, targetVisual);
        visual = {
          ...visual,
          tx: visual.tx + targetRect.x - placement.targetXAtAttach,
          ty: visual.ty + targetRect.y - placement.targetYAtAttach,
        };
      }
      resolving.delete(element.id);
    }
    return visual;
  };
  const targetHitForInteraction = (
    source: CanvasElement,
    interaction: InteractionDefinition,
    sourceVisual: RuntimeVisual,
  ) => {
    if (!interaction.collisionTarget || !matchesDropRule(interaction, source))
      return null;
    const target = elementsById.get(interaction.collisionTarget);
    if (!target || target.id === source.id) return null;
    const targetVisual = visualForCurrentGesture(target);
    const sourceRect = runtimeRectForElement(source, sourceVisual);
    const targetRect = runtimeRectForElement(target, targetVisual);
    return {
      hit: isDropTargetHit(sourceRect, targetRect, interaction.dropTolerance),
      sourceRect,
      target,
      targetRect,
    };
  };
  const spawnInstanceAt = (
    source: CanvasElement,
    interaction: InteractionDefinition,
    point: ViewerPoint,
  ) => {
    const interactionKey = `${source.id}:${interaction.id}`;
    const count = spawnInstances.filter(
      (instance) => instance.interactionId === interactionKey,
    ).length;
    const maxCount = Math.max(1, interaction.spawnMaxCount);
    if (count >= maxCount && interaction.spawnOverflow === "stop") return false;
    const instance = createSpawnInstance(
      elements,
      interaction,
      point,
      `viewer-spawn-${nextSpawnIdRef.current++}`,
    );
    if (!instance) return false;
    const keyedInstance = { ...instance, interactionId: interactionKey };
    setSpawnInstances((current) => {
      const next = [...current, keyedInstance];
      const matching = next.filter(
        (entry) => entry.interactionId === interactionKey,
      );
      if (matching.length <= maxCount) return next;
      const oldest = matching[0];
      return next.filter((entry) => entry.id !== oldest.id);
    });
    return true;
  };
  const applyTargetEffect = ({
    interaction,
    pointer,
    source,
    sourceVisual,
    target,
    targetRect,
  }: {
    interaction: InteractionDefinition;
    pointer?: ViewerPoint;
    source: CanvasElement;
    sourceVisual: RuntimeVisual;
    target?: CanvasElement;
    targetRect?: RuntimeRect;
  }): boolean => {
    if (interaction.effect === "emit-event") return true;
    if (interaction.effect === "spawn-instance") {
      return spawnInstanceAt(
        source,
        interaction,
        pointer ?? {
          x: source.x + source.width / 2,
          y: source.y + source.height / 2,
        },
      );
    }
    if (interaction.effect === "open-modal") {
      if (!elementsById.has(interaction.modalTarget)) return false;
      openRuntimeModal(interaction);
      return true;
    }
    if (interaction.effect === "close-modal") {
      const currentModal = activeModalRef.current;
      if (!currentModal) return false;
      if (interaction.modalTarget) {
        const activeMembers = modalMemberIdsForTarget(currentModal.targetId);
        const requestedMembers = modalMemberIdsForTarget(
          interaction.modalTarget,
        );
        if (!Array.from(requestedMembers).some((id) => activeMembers.has(id)))
          return false;
      }
      closeRuntimeModal(currentModal.targetId);
      return true;
    }
    if (interaction.effect === "return-to-origin") {
      resetPlacedElement(source.id, true);
      return true;
    }
    if (
      interaction.effect !== "snap-to-target" &&
      interaction.effect !== "attach-to-target"
    )
      return false;
    if (!target || !targetRect) return false;
    const placementEffect = interaction.effect;
    if (placementEffect === "attach-to-target") {
      const visited = new Set<string>();
      let ancestorId: string | undefined = target.id;
      while (ancestorId && !visited.has(ancestorId)) {
        if (ancestorId === source.id) return false;
        visited.add(ancestorId);
        ancestorId = dropPlacementsRef.current.get(ancestorId)?.targetId;
      }
    }

    const previousPlacement = dropPlacementsRef.current.get(source.id);
    if (previousPlacement?.targetId !== target.id) {
      updateDropPlacements((current) => {
        if (!current.has(source.id)) return current;
        const next = new Map(current);
        next.delete(source.id);
        return next;
      });
    }

    const offset =
      interaction.effect === "attach-to-target" &&
      interaction.attachPreserveOffset
        ? { x: sourceVisual.tx, y: sourceVisual.ty }
        : (() => {
            const currentSourceRect = runtimeRectForElement(
              source,
              sourceVisual,
            );
            const adjustment = snapOffsetForTarget({
              anchor: interaction.snapAnchor,
              authoredSource: currentSourceRect,
              offsetX: interaction.snapOffsetX,
              offsetY: interaction.snapOffsetY,
              target: targetRect,
            });
            return {
              x: sourceVisual.tx + adjustment.x,
              y: sourceVisual.ty + adjustment.y,
            };
          })();
    mutateRuntimeState(source.id, (state) => ({
      ...state,
      drag: null,
      dragOffset: offset,
      physics: null,
    }));
    updateDropPlacements((current) => {
      const next = new Map(current);
      next.set(source.id, {
        effect: placementEffect,
        targetId: target.id,
        targetXAtAttach: targetRect.x,
        targetYAtAttach: targetRect.y,
      });
      return next;
    });

    const previousTimer = placementResetTimersRef.current.get(source.id);
    if (previousTimer !== undefined) window.clearTimeout(previousTimer);
    placementResetTimersRef.current.delete(source.id);
    if (interaction.resetMode === "return-to-origin") {
      const resetAfterMs =
        Math.max(0, interaction.duration + interaction.hold) * 1000;
      const timer = window.setTimeout(() => {
        resetPlacedElement(source.id);
        clearTargetInteraction(source.id, interaction.id);
      }, resetAfterMs);
      placementResetTimersRef.current.set(source.id, timer);
    }
    return true;
  };
  type TargetDispatchStatus = "applied" | "rejected" | "scheduled";
  const dispatchTargetEffect = (
    sourceId: string,
    interaction: InteractionDefinition,
    onApplied?: () => void,
    pointer?: ViewerPoint,
  ): TargetDispatchStatus => {
    const run = () => {
      const source = elementsById.get(sourceId);
      if (!source) return "rejected" as const;
      const sourceVisual = visualForCurrentGesture(source);
      const target = interaction.collisionTarget
        ? elementsById.get(interaction.collisionTarget)
        : undefined;
      const targetVisual = target ? visualForCurrentGesture(target) : undefined;
      const targetRect =
        target && targetVisual
          ? runtimeRectForElement(target, targetVisual)
          : undefined;
      const isPlacement =
        interaction.effect === "snap-to-target" ||
        interaction.effect === "attach-to-target";
      const isCommand =
        isPlacement ||
        interaction.effect === "emit-event" ||
        interaction.effect === "spawn-instance" ||
        interaction.effect === "return-to-origin" ||
        interaction.effect === "open-modal" ||
        interaction.effect === "close-modal";
      const commandApplied = applyTargetEffect({
        interaction,
        pointer,
        source,
        sourceVisual,
        target,
        targetRect,
      });
      if (isCommand && !commandApplied) return "rejected" as const;
      if (isPlacement || !isCommand) {
        markTargetInteractionTriggered(source.id, interaction.id);
      }
      if (!isCommand) {
        scheduleTargetInteractionReset(source.id, interaction);
      }
      onApplied?.();
      return "applied" as const;
    };
    if (interaction.delay > 0) {
      const timer = window.setTimeout(() => {
        targetCommandTimersRef.current.delete(timer);
        run();
      }, interaction.delay * 1000);
      targetCommandTimersRef.current.add(timer);
      return "scheduled";
    }
    return run();
  };
  const fireDirectTargetEffects = (
    source: CanvasElement,
    trigger: string,
    interactionId?: string,
    pointer?: ViewerPoint,
  ) => {
    for (const interaction of source.interactions ?? []) {
      if (
        interaction.enabled === false ||
        interaction.trigger !== trigger ||
        (interactionId && interaction.id !== interactionId)
      )
        continue;
      dispatchTargetEffect(source.id, interaction, undefined, pointer);
    }
  };
  directTargetEffectRef.current = fireDirectTargetEffects;
  const updateTargetBoundaryEvents = (
    source: CanvasElement,
    session: ViewerInteractionPointerSession,
  ) => {
    const sourceVisual = visualForCurrentGesture(source);
    for (const interaction of source.interactions ?? []) {
      if (
        interaction.enabled === false ||
        (interaction.trigger !== "drag-enter-target" &&
          interaction.trigger !== "drag-leave-target")
      )
        continue;
      const result = targetHitForInteraction(source, interaction, sourceVisual);
      const hit = result?.hit === true;
      const wasHit = session.targetHits.has(interaction.id);
      if (hit) session.targetHits.add(interaction.id);
      else session.targetHits.delete(interaction.id);
      const shouldFire =
        (interaction.trigger === "drag-enter-target" && hit && !wasHit) ||
        (interaction.trigger === "drag-leave-target" && !hit && wasHit);
      if (!shouldFire) continue;
      const isPlacement =
        interaction.effect === "snap-to-target" ||
        interaction.effect === "attach-to-target";
      dispatchTargetEffect(
        source.id,
        interaction,
        isPlacement
          ? () => {
              const sessionIsActive = Array.from(
                pointerSessionsRef.current.values(),
              ).includes(session);
              if (!sessionIsActive) return;
              session.startX = session.currentX;
              session.startY = session.currentY;
            }
          : undefined,
      );
    }
  };
  const completeTargetDrop = (source: CanvasElement): boolean => {
    const interactions = (source.interactions ?? []).filter(
      (interaction) =>
        interaction.enabled !== false &&
        (interaction.trigger === "drop-on-target" ||
          interaction.trigger === "drop-outside-target"),
    );
    if (!interactions.length) return false;
    const sourceVisual = visualForCurrentGesture(source);
    const matchingRows = interactions.flatMap((interaction) => {
      const result = targetHitForInteraction(source, interaction, sourceVisual);
      if (!result) return [];
      const fires =
        interaction.trigger === "drop-on-target" ? result.hit : !result.hit;
      return fires ? [{ interaction, result }] : [];
    });
    let immediatePlacementApplied = false;
    let keepDroppedPosition = false;
    let firedOutsideTarget = false;
    for (const { interaction, result } of matchingRows) {
      // Capacity belongs to the successful drop event, not a particular DO
      // command. Modal/opacity/etc. rows therefore honor the same target gate.
      if (
        interaction.trigger === "drop-on-target" &&
        !acceptTargetOccupancy(source, interaction, result.target)
      )
        continue;
      const status = dispatchTargetEffect(source.id, interaction);
      const isPlacement =
        interaction.effect === "snap-to-target" ||
        interaction.effect === "attach-to-target";
      if (interaction.trigger === "drop-outside-target")
        firedOutsideTarget = true;
      if (isPlacement && status === "applied") {
        immediatePlacementApplied = true;
      } else if (
        status !== "rejected" &&
        interaction.effect !== "return-to-origin"
      ) {
        // Non-placement rows keep the actual drop position. Delayed placement
        // also starts from that live position and resolves fresh geometry when
        // its timer fires.
        keepDroppedPosition = true;
      }
    }
    // Finalize once after every matching row has dispatched. Immediate
    // placement commands have already replaced dragOffset. A successful
    // non-placement drop persists where it landed unless its reset lifecycle
    // returns it later; misses/outside drops restore the pre-drag position.
    if (
      !immediatePlacementApplied &&
      keepDroppedPosition &&
      !firedOutsideTarget
    )
      commitInteractionDrag(source);
    else mutateRuntimeState(source.id, (state) => ({ ...state, drag: null }));
    return true;
  };
  strandFrameInputsRef.current = new Map(
    visibleElements.flatMap((element) => {
      const interaction = strandInteractionForElement(element);
      const visual = runtimeVisuals.get(element.id);
      return interaction && visual
        ? [[element.id, { element, interaction, visual }] as const]
        : [];
    }),
  );
  strandPagePointerRef.current = pagePointer;
  useEffect(() => {
    let frame = 0;
    const animate = (now: number) => {
      const dt = (now - (lastStrandFrameRef.current ?? now - 16)) / 1000;
      lastStrandFrameRef.current = now;
      const inputs = strandFrameInputsRef.current;
      const active = activeStrandPointerRef.current;
      const activeInput = active && inputs.get(active.elementId);
      const activePose = active && strandPosesRef.current.get(active.elementId);
      let changed = false;
      const next = new Map(strandPosesRef.current);
      for (const [id, { element, interaction, visual }] of inputs) {
        let pose = next.get(id);
        if (!pose) {
          const path = strandPathForElement(element);
          if (!path) continue;
          pose = createStrandPose(path, {
            anchor: interaction.strandAnchor,
            spacing: strandSampleSpacing(element),
          });
          if (!pose.points.length) continue;
          next.set(id, pose);
          changed = true;
        }
        const pointer = active ?? strandPagePointerRef.current;
        const canReactToPointer =
          active || interaction.trigger === "pointer-move";
        const localPointer =
          pointer && canReactToPointer
            ? strandLocalPoint(pointer, element, visual)
            : null;
        let grab =
          active?.elementId === id
            ? constrainedStrandGrab(
                pose,
                active.grab,
                interaction.strandMaxDisplacement,
              )
            : undefined;
        let grabProfile: "material" | "fluid" = "material";
        const attractors = [] as {
          point: StrandBonePoint;
          radius: number;
          strength: number;
        }[];
        if (
          active &&
          activeInput &&
          activePose?.points.length &&
          id !== active.elementId
        ) {
          const merge = [
            ...(activeInput.element.interactions ?? []),
            ...(element.interactions ?? []),
          ].find(
            (entry) =>
              entry.enabled !== false &&
              entry.effect === "liquid-merge" &&
              entry.liquidAttraction > 0 &&
              ((entry.collisionTarget === id &&
                activeInput.element.interactions?.includes(entry)) ||
                (entry.collisionTarget === active.elementId &&
                  element.interactions?.includes(entry))),
          );
          if (merge && interaction.strandMaxDisplacement > 0) {
            const movingPose = next.get(active.elementId) ?? activePose;
            const closest = movingPose.points.reduce(
              (best, point, index) => {
                const world = strandWorldPoint(
                  point,
                  activeInput.element,
                  activeInput.visual,
                );
                const distance = Math.hypot(
                  world.x - active.x,
                  world.y - active.y,
                );
                return distance < best.distance ? { index, distance } : best;
              },
              { index: 0, distance: Infinity },
            );
            const world = strandWorldPoint(
              movingPose.points[closest.index],
              activeInput.element,
              activeInput.visual,
            );
            const pinnedSourceIndex = active.grab.index;
            const pinnedSourceWorld = strandWorldPoint(
              movingPose.points[pinnedSourceIndex],
              activeInput.element,
              activeInput.visual,
            );
            let latch = latchedStrandsRef.current.get(id);
            if (!latch || latch.sourceId !== active.elementId) {
              const nearest = pose.points.reduce(
                (best, point, index) => {
                  if (index === pose.anchorIndex) return best;
                  const targetWorld = strandWorldPoint(point, element, visual);
                  const distance = Math.hypot(
                    targetWorld.x - pinnedSourceWorld.x,
                    targetWorld.y - pinnedSourceWorld.y,
                  );
                  return distance < best.distance ? { index, distance } : best;
                },
                { index: -1, distance: Infinity },
              );
              const contactDistance =
                merge.joinDistance +
                (element.strokeWidth + activeInput.element.strokeWidth) / 2;
              if (nearest.index >= 0 && nearest.distance <= contactDistance) {
                const targetWorld = strandWorldPoint(
                  pose.points[nearest.index],
                  element,
                  visual,
                );
                latch = {
                  sourceId: active.elementId,
                  sourceIndex: pinnedSourceIndex,
                  targetIndex: nearest.index,
                  // Retain a small contact spacing so many ribbons travel as
                  // a supple bundle instead of collapsing onto one centerline.
                  offset: {
                    x: targetWorld.x - pinnedSourceWorld.x,
                    y: targetWorld.y - pinnedSourceWorld.y,
                  },
                };
                latchedStrandsRef.current.set(id, latch);
              }
            }
            if (latch?.sourceId === active.elementId) {
              const sourceWorld = strandWorldPoint(
                movingPose.points[latch.sourceIndex],
                activeInput.element,
                activeInput.visual,
              );
              const currentWorld = strandWorldPoint(
                pose.points[latch.targetIndex],
                element,
                visual,
              );
              const follow =
                1 -
                Math.exp(
                  -Math.max(0.001, dt) * (12 + merge.liquidAttraction * 0.16),
                );
              const desiredWorld = {
                x: sourceWorld.x + latch.offset.x,
                y: sourceWorld.y + latch.offset.y,
              };
              grab = {
                index: latch.targetIndex,
                target: strandLocalPoint(
                  {
                    x:
                      currentWorld.x +
                      (desiredWorld.x - currentWorld.x) * follow,
                    y:
                      currentWorld.y +
                      (desiredWorld.y - currentWorld.y) * follow,
                  },
                  element,
                  visual,
                ),
              };
              grabProfile = "fluid";
            } else {
              attractors.push({
                point: strandLocalPoint(world, element, visual),
                radius: Math.max(150, merge.bridgeWidth * 5),
                strength: merge.liquidAttraction,
              });
            }
          }
        }
        const pointerMoveForce =
          !active && interaction.trigger === "pointer-move";
        const forceRadius = pointerMoveForce
          ? Math.max(1, interaction.trackDistance)
          : interaction.strandNeighborRadius;
        const forceStrength = pointerMoveForce
          ? 100
          : interaction.strandNeighborStrength;
        const pointerForce =
          id !== active?.elementId &&
          (!active ||
            latchedStrandsRef.current.get(id)?.sourceId !== active.elementId) &&
          localPointer &&
          forceRadius > 0 &&
          forceStrength > 0 &&
          interaction.strandMaxDisplacement > 0
            ? {
                pointer: localPointer,
                radius: forceRadius,
                strength: forceStrength,
              }
            : undefined;
        const unsettled = pose.points.some(
          (point, index) =>
            Math.hypot(
              point.x - pose.rest[index].x,
              point.y - pose.rest[index].y,
            ) > 0.01 ||
            Math.hypot(pose.velocities[index].x, pose.velocities[index].y) >
              0.01,
        );
        if (!grab && !pointerForce && attractors.length === 0 && !unsettled)
          continue;
        const stepped = limitStrandPoseDisplacement(
          stepStrandPose(pose, {
            dt,
            grab,
            grabProfile,
            maxDisplacement: interaction.strandMaxDisplacement,
            pointerForce,
            attractors,
            stiffness: interaction.strandStiffness,
            damping: interaction.strandDamping,
          }),
          interaction.strandMaxDisplacement,
          { preserveShape: interaction.strandDragMode === "swipe" },
        );
        next.set(id, stepped);
        changed = true;
      }
      for (const id of next.keys()) {
        if (!inputs.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      if (changed) {
        strandPosesRef.current = next;
        setStrandPoses(next);
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      lastStrandFrameRef.current = null;
    };
  }, []);
  const nextActiveLiquidPairs = new Set<string>();
  const mergedElementIds = new Set<string>();
  const activeLiquidPairs: {
    id: string;
    sourceId: string;
    targetId: string;
    source: MetaballSource;
    targetSource: MetaballSource;
    color: string;
    opacity: number;
    bridgeWidth: number;
    smoothness: number;
  }[] = [];
  for (const element of visibleElements) {
    for (const interaction of element.interactions ?? []) {
      if (
        interaction.enabled === false ||
        interaction.effect !== "liquid-merge" ||
        !interaction.collisionTarget
      )
        continue;
      const target = elementsById.get(interaction.collisionTarget);
      const sourceVisual = runtimeVisuals.get(element.id);
      const targetVisual = runtimeVisuals.get(target?.id ?? "");
      if (!target || !sourceVisual || !targetVisual || target.id === element.id)
        continue;
      const pairId = `${interaction.id}:${element.id}:${target.id}`;
      const source = liquidSourceForElement(
        element,
        sourceVisual,
        undefined,
        strandPoses.get(element.id),
      );
      const targetSource = liquidSourceForElement(
        target,
        targetVisual,
        undefined,
        strandPoses.get(target.id),
      );
      if (!source || !targetSource) continue;
      const gap = liquidBoundsGap(
        metaballFilterBounds([source], 0, false),
        metaballFilterBounds([targetSource], 0, false),
      );
      if (
        !isLiquidPairActive(
          interaction,
          gap,
          activeLiquidPairsRef.current.has(pairId),
        )
      )
        continue;
      nextActiveLiquidPairs.add(pairId);
      mergedElementIds.add(element.id);
      mergedElementIds.add(target.id);
      activeLiquidPairs.push({
        id: pairId,
        sourceId: element.id,
        targetId: target.id,
        source,
        targetSource,
        color: element.fill === "transparent" ? element.stroke : element.fill,
        opacity: Math.min(element.opacity, target.opacity) / 100,
        bridgeWidth: interaction.bridgeWidth,
        smoothness: interaction.liquidSmoothness / 100,
      });
    }
  }
  activeLiquidPairsRef.current = nextActiveLiquidPairs;
  // A strand can have several simultaneously active merge links. Rendering
  // each link separately paints shared strands repeatedly and makes them look
  // darker instead of like one connected liquid body.
  const liquidParent = new Map<string, string>();
  const liquidRoot = (id: string): string => {
    const parent = liquidParent.get(id);
    if (!parent || parent === id) return id;
    const root = liquidRoot(parent);
    liquidParent.set(id, root);
    return root;
  };
  for (const pair of activeLiquidPairs) {
    if (!liquidParent.has(pair.sourceId))
      liquidParent.set(pair.sourceId, pair.sourceId);
    if (!liquidParent.has(pair.targetId))
      liquidParent.set(pair.targetId, pair.targetId);
    const sourceRoot = liquidRoot(pair.sourceId);
    const targetRoot = liquidRoot(pair.targetId);
    if (sourceRoot !== targetRoot) {
      const first = sourceRoot < targetRoot ? sourceRoot : targetRoot;
      const second = sourceRoot < targetRoot ? targetRoot : sourceRoot;
      liquidParent.set(second, first);
    }
  }
  const liquidGroups = new Map<
    string,
    {
      id: string;
      sources: Map<string, MetaballSource>;
      color: string;
      opacity: number;
      bridgeWidth: number;
      smoothness: number;
    }
  >();
  for (const pair of activeLiquidPairs) {
    const root = liquidRoot(pair.sourceId);
    let group = liquidGroups.get(root);
    if (!group) {
      group = {
        id: root,
        sources: new Map(),
        color: pair.color,
        opacity: pair.opacity,
        bridgeWidth: pair.bridgeWidth,
        smoothness: pair.smoothness,
      };
      liquidGroups.set(root, group);
    }
    group.sources.set(pair.source.id, pair.source);
    group.sources.set(pair.targetSource.id, pair.targetSource);
    group.opacity = Math.min(group.opacity, pair.opacity);
    group.bridgeWidth = Math.max(group.bridgeWidth, pair.bridgeWidth);
  }
  const liquidLayers = Array.from(liquidGroups.values(), (group) => ({
    ...group,
    sources: Array.from(group.sources.values()),
  }));
  const stageTop =
    pageType === "scroll"
      ? Math.max(0, (viewport.height - layout.height) / 2)
      : (viewport.height - layout.height) / 2;
  const pointFromClient = (
    clientX: number,
    clientY: number,
  ): ViewerPoint | null => {
    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: clamp(
        (clientX - rect.left) / Math.max(0.0001, layout.scaleX),
        0,
        artboard.width,
      ),
      y: clamp(
        (clientY - rect.top) / Math.max(0.0001, layout.scaleY),
        0,
        artboard.height,
      ),
    };
  };
  const appendTrailPoints = (
    additions: { interaction: InteractionDefinition; points: ViewerPoint[] }[],
  ) => {
    if (!additions.length) return;
    // Called only from pointer event handlers, never while rendering.
    // eslint-disable-next-line react-hooks/purity
    const now = performance.now();
    const particles = additions.flatMap(({ interaction, points }) => {
      const firstId = nextParticleIdRef.current;
      nextParticleIdRef.current += points.length;
      return createTrailParticles(interaction, points, now, firstId);
    });
    trailLayerRef.current?.append(particles, now);
  };
  const emitClickInteractionEvents = (
    element: CanvasElement,
    interactions = (element.interactions ?? []).filter(
      (interaction) =>
        interaction.enabled !== false && interaction.trigger === "click-tap",
    ),
  ) => {
    if (!onInteractionEvent) return;
    const objectId = sourceIdBySpawnElementId.get(element.id) ?? element.id;
    for (const interaction of interactions) {
      onInteractionEvent({
        objectId,
        interactionId: interaction.id,
        eventSource: "on-trigger",
      });
      const duration = Math.max(0, interaction.delay + interaction.duration);
      const timer = window.setTimeout(() => {
        targetCommandTimersRef.current.delete(timer);
        onInteractionEvent({
          objectId,
          interactionId: interaction.id,
          eventSource: "on-complete",
        });
      }, duration * 1000);
      targetCommandTimersRef.current.add(timer);
    }
  };
  return (
    <section
      aria-label="Viewer preview"
      aria-modal="true"
      className="viewer-preview"
      data-output-kbps={soundOutputBitrate(advancedSound.outputQuality)}
      data-output-quality={advancedSound.outputQuality}
      role="dialog"
    >
      <ViewerBackgroundMusic
        advancedSettings={advancedSound}
        ducked={backgroundMusicDucked}
        mixer={mixer}
        settings={backgroundMusic}
      />
      <audio
        aria-hidden="true"
        className="viewer-interaction-sound"
        data-channel-index={0}
        onEnded={(event) => handleInteractionChannelEnded(event.currentTarget)}
        preload={soundPreloadAttribute(advancedSound.preloadSounds)}
        ref={(audio) => {
          interactionAudioRefs.current[0] = audio;
        }}
      />
      {advancedSound.preloadSounds !== "on-demand"
        ? Array.from(
            new Map(
              [...elements, ...objects3d].flatMap((element) =>
                (element.interactionSounds ?? []).flatMap((setting) =>
                  setting.assets.map((asset) => [asset.src, asset] as const),
                ),
              ),
            ).values(),
          ).map((asset) => (
            <audio
              aria-hidden="true"
              className="viewer-sound-preload"
              key={asset.src}
              preload={soundPreloadAttribute(advancedSound.preloadSounds)}
              src={asset.src}
            />
          ))
        : null}
      <button
        aria-label="Close preview"
        className="viewer-preview-close interface-scale-surface"
        onClick={onClose}
        type="button"
      >
        <X aria-hidden="true" size={18} strokeWidth={1.5} />
      </button>
      <div
        className={`viewer-preview-viewport is-${pageType}`}
        data-page-type={pageType}
        data-viewport-mode={viewportMode}
      >
        <div
          className="viewer-preview-scroll-space"
          style={{
            height:
              pageType === "scroll"
                ? Math.max(viewport.height, stageTop + layout.height)
                : viewport.height,
          }}
        >
          <div
            className="viewer-preview-stage"
            style={{
              height: layout.height,
              left: (viewport.width - layout.width) / 2,
              top: stageTop,
              width: layout.width,
            }}
          >
            <div
              className="viewer-preview-page"
              onClick={(event) => {
                const point = pointFromClient(event.clientX, event.clientY);
                if (!point) return;
                const clickedElementId =
                  (event.target as Element)
                    .closest?.("[data-element-id]")
                    ?.getAttribute("data-element-id") ?? null;
                for (const source of elements) {
                  if (!source.visible || source.id === clickedElementId)
                    continue;
                  for (const interaction of source.interactions ?? []) {
                    if (
                      interaction.enabled === false ||
                      interaction.trigger !== "click-tap" ||
                      interaction.triggerArea !== "entire-artwork" ||
                      interaction.effect !== "spawn-instance"
                    )
                      continue;
                    dispatchTargetEffect(
                      source.id,
                      interaction,
                      undefined,
                      point,
                    );
                    emitClickInteractionEvents(source, [interaction]);
                  }
                }
              }}
              onPointerDown={(event) => {
                if (
                  ((event.pointerType === "touch" ||
                    event.pointerType === "pen") &&
                    event.isPrimary === false) ||
                  (event.pointerType === "mouse" && event.button !== 0)
                )
                  return;
                const point = pointFromClient(event.clientX, event.clientY);
                if (!point) return;
                const targetId =
                  (event.target as Element)
                    .closest?.("[data-element-id]")
                    ?.getAttribute("data-element-id") ?? null;
                const activeRows = trailRows.filter(
                  ({ source, interaction }) =>
                    interaction.triggerArea === "entire-artwork" ||
                    source.id === targetId,
                );
                if (!activeRows.length) return;
                trailSessionsRef.current.set(
                  event.pointerId,
                  new Map(
                    activeRows.map(({ interaction }) => [
                      interaction.id,
                      point,
                    ]),
                  ),
                );
                appendTrailPoints(
                  activeRows.map(({ interaction }) => ({
                    interaction,
                    points: [point],
                  })),
                );
              }}
              onPointerLeave={
                usesPointerMove ? () => setPagePointer(null) : undefined
              }
              onPointerMove={
                usesPointerMove || trailRows.length
                  ? (event) => {
                      const point = pointFromClient(
                        event.clientX,
                        event.clientY,
                      );
                      if (!point) return;
                      if (usesPointerMove) setPagePointer(point);
                      const session = trailSessionsRef.current.get(
                        event.pointerId,
                      );
                      if (!session) return;
                      const additions: {
                        interaction: InteractionDefinition;
                        points: ViewerPoint[];
                      }[] = [];
                      for (const { interaction } of trailRows) {
                        const lastEmission = session.get(interaction.id);
                        if (!lastEmission) continue;
                        const points = sampleTrailSegment(
                          lastEmission,
                          point,
                          interaction.trailSpacing,
                        );
                        if (!points.length) continue;
                        session.set(interaction.id, points[points.length - 1]);
                        additions.push({ interaction, points });
                      }
                      appendTrailPoints(additions);
                    }
                  : undefined
              }
              onPointerUp={(event) => {
                trailSessionsRef.current.delete(event.pointerId);
              }}
              onPointerCancel={(event) => {
                trailSessionsRef.current.delete(event.pointerId);
              }}
              ref={pageRef}
              style={{
                borderRadius: artboard.cornerRadius,
                height: artboard.height,
                transform: `scale(${layout.scaleX}, ${layout.scaleY})`,
                width: artboard.width,
              }}
            >
              <ArtboardBackground artboard={artboard} />
              <div
                aria-hidden={activeModal ? true : undefined}
                data-viewer-3d-layer
                inert={activeModal ? true : undefined}
              >
                <Artboard3DScene
                  artboardHeight={artboard.height}
                  artboardWidth={artboard.width}
                  collisionProxies={collision3DProxies}
                  interactive={!activeModal}
                  objects={objects3d}
                  onSoundEvent={(objectId, trigger, event, continuous) => {
                    const object = objects3d.find(
                      (item) => item.id === objectId,
                    );
                    if (object)
                      playInteractionEvent(object, trigger, event, continuous);
                  }}
                  onSoundStop={(objectId, trigger) =>
                    stopContinuousInteraction(objectId, trigger)
                  }
                  projectId={projectId}
                  scene={scene3d}
                />
              </div>
              {activeModal?.backdrop ? (
                activeModal.closeOnBackdrop ? (
                  <button
                    aria-label="Close modal"
                    className="viewer-preview-modal-backdrop"
                    onClick={() => closeRuntimeModal(activeModal.targetId)}
                    style={{
                      background: "rgba(0, 0, 0, 0.56)",
                      border: 0,
                      cursor: "pointer",
                      inset: 0,
                      padding: 0,
                      position: "absolute",
                      zIndex: 999,
                    }}
                    type="button"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="viewer-preview-modal-backdrop"
                    style={{
                      background: "rgba(0, 0, 0, 0.56)",
                      inset: 0,
                      position: "absolute",
                      zIndex: 999,
                    }}
                  />
                )
              ) : null}
              {visibleElements.map((element, elementIndex) => {
                const runtime =
                  runtimeState.get(element.id) ?? IDLE_RUNTIME_STATE;
                const runtimeVisual = runtimeVisuals.get(element.id)!;
                const strandPose = strandPoses.get(element.id);
                const waveInteraction = waveInteractionsByElementId.get(
                  element.id,
                );
                const wavePointer = (prefersReducedMotion
                  ? pagePointer
                  : waveFrame.pointer) ?? {
                  x: artboard.width / 2,
                  y: artboard.height / 2,
                };
                const wavePaths =
                  waveInteraction &&
                  (element.type === "pen" || element.type === "line")
                    ? waveDeformedPaths(
                        element,
                        waveInteraction,
                        strandLocalPoint(wavePointer, element, runtimeVisual),
                        {
                          x:
                            (wavePointer.x / Math.max(1, artboard.width) -
                              0.5) *
                            2,
                          y:
                            (wavePointer.y / Math.max(1, artboard.height) -
                              0.5) *
                            2,
                        },
                        prefersReducedMotion ? 0 : waveFrame.seconds,
                        prefersReducedMotion
                          ? pagePointer
                            ? 1
                            : 0
                          : waveFrame.strength,
                        elementIndex,
                      )
                    : null;
                const graphicElement =
                  wavePaths && element.type === "pen"
                    ? {
                        ...element,
                        vectorPaths: wavePaths,
                        points: wavePaths[0]?.points,
                      }
                    : element;
                const waveLinePathData =
                  wavePaths && element.type === "line"
                    ? pathData(wavePaths[0]?.points ?? [])
                    : undefined;
                const strandBend = strandPose
                  ? undefined
                  : strandBendForElement(
                      element,
                      runtime,
                      pagePointer,
                      undefined,
                      pagePointer,
                    );
                const dragEnabled =
                  hasTargetDragGesture(element.interactions) ||
                  (element.interactions ?? []).some(
                    (interaction) =>
                      interaction.enabled !== false &&
                      interaction.trigger === "drag",
                  );
                const dragGestureInteraction = (
                  element.interactions ?? []
                ).find(
                  (interaction) =>
                    interaction.enabled !== false &&
                    (interaction.trigger === "drag" ||
                      isTargetDragTrigger(interaction.trigger)),
                );
                const trailOnlyDrag =
                  dragEnabled &&
                  (element.interactions ?? [])
                    .filter((interaction) => interaction.enabled !== false)
                    .every(
                      (interaction) =>
                        interaction.trigger === "drag" &&
                        interaction.effect === "pointer-trail",
                    );
                const clickInteractions = (element.interactions ?? []).filter(
                  (interaction) =>
                    interaction.enabled !== false &&
                    interaction.trigger === "click-tap",
                );
                const clickEnabled = clickInteractions.length > 0;
                const isArtworkInputSurface =
                  clickEnabled &&
                  clickInteractions.every(
                    (interaction) =>
                      interaction.triggerArea === "entire-artwork",
                  );
                const isModalMember = activeModalElementIds.has(element.id);
                const isModalDialog = activeModal?.targetId === element.id;
                const isInactiveModalElement =
                  referencedModalElementIds.has(element.id) && !isModalMember;
                const isBehindModal = Boolean(activeModal && !isModalMember);
                const pullsNeighbors = (element.interactions ?? []).some(
                  (interaction) =>
                    interaction.enabled !== false &&
                    interaction.trigger === "drag" &&
                    interaction.effect === "strand-bend",
                );
                return (
                  <div
                    className={[
                      "viewer-preview-element",
                      `element-${element.type}`,
                      dragEnabled ? "is-draggable" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-hidden={
                      isInactiveModalElement || isBehindModal ? true : undefined
                    }
                    aria-modal={isModalDialog ? true : undefined}
                    aria-label={isModalDialog ? element.name : undefined}
                    data-element-id={element.id}
                    data-interaction-area={
                      isArtworkInputSurface ? "entire-artwork" : undefined
                    }
                    data-spawn-instance-id={spawnIdByElementId.get(element.id)}
                    data-modal-dialog={isModalDialog ? "true" : undefined}
                    data-modal-member={isModalMember ? "true" : undefined}
                    inert={isBehindModal ? true : undefined}
                    key={element.id}
                    role={
                      isModalDialog
                        ? "dialog"
                        : clickEnabled
                          ? "button"
                          : undefined
                    }
                    tabIndex={
                      isModalDialog
                        ? -1
                        : clickEnabled && !isBehindModal
                          ? 0
                          : undefined
                    }
                    onClick={(event) => {
                      if (suppressDragClickRef.current.delete(element.id)) {
                        event.stopPropagation();
                        return;
                      }
                      playInteractionEvent(element, "click", "click");
                      fireInteractionClick(element);
                      fireDirectTargetEffects(
                        element,
                        "click-tap",
                        undefined,
                        pointFromClient(event.clientX, event.clientY) ??
                          undefined,
                      );
                      emitClickInteractionEvents(element);
                    }}
                    onDoubleClick={() => {
                      playInteractionEvent(element, "click", "double-click");
                      fireDirectTargetEffects(element, "double-click");
                    }}
                    onKeyDown={(event) => {
                      if (
                        !clickEnabled ||
                        (event.key !== "Enter" && event.key !== " ")
                      )
                        return;
                      event.preventDefault();
                      playInteractionEvent(element, "click", "click");
                      fireInteractionClick(element);
                      fireDirectTargetEffects(element, "click-tap", undefined, {
                        x: element.x + element.width / 2,
                        y: element.y + element.height / 2,
                      });
                      emitClickInteractionEvents(element);
                    }}
                    onPointerCancel={(event) => {
                      const session = pointerSessionsRef.current.get(
                        event.pointerId,
                      );
                      pointerSessionsRef.current.delete(event.pointerId);
                      if (session?.elementId === element.id) {
                        stopContinuousInteraction(element.id, "press");
                        stopContinuousInteraction(element.id, "drag");
                      }
                      if (session?.elementId === element.id)
                        setInteractionDrag(element, null);
                      if (
                        activeStrandPointerRef.current?.elementId === element.id
                      )
                        activeStrandPointerRef.current = null;
                      latchedStrandsRef.current.clear();
                    }}
                    onLostPointerCapture={(event) => {
                      const session = pointerSessionsRef.current.get(
                        event.pointerId,
                      );
                      if (!session || session.elementId !== element.id) return;
                      pointerSessionsRef.current.delete(event.pointerId);
                      stopContinuousInteraction(element.id, "press");
                      stopContinuousInteraction(element.id, "drag");
                      setInteractionDrag(element, null);
                      if (
                        activeStrandPointerRef.current?.elementId === element.id
                      )
                        activeStrandPointerRef.current = null;
                      latchedStrandsRef.current.clear();
                    }}
                    onPointerDown={(event) => {
                      if (
                        ((event.pointerType === "touch" ||
                          event.pointerType === "pen") &&
                          event.isPrimary === false) ||
                        (event.pointerType === "mouse" && event.button !== 0) ||
                        Array.from(pointerSessionsRef.current.values()).some(
                          (session) => session.elementId === element.id,
                        )
                      )
                        return;
                      // A previous drag may not have produced a click (for
                      // example, if the pointer was canceled). Keep the next
                      // genuine press from being suppressed in that case.
                      suppressDragClickRef.current.delete(element.id);
                      latchedStrandsRef.current.clear();
                      lastPointerRef.current = {
                        x: event.clientX,
                        y: event.clientY,
                      };
                      // Let the browser focus tabbable click targets normally.
                      // Calling focus() before its pointer default action can
                      // incorrectly show a keyboard ring on the first click.
                      if (event.pointerType === "touch")
                        fireDirectTargetEffects(element, "touch-start");
                      const pageRect = pageRef.current?.getBoundingClientRect();
                      const worldPointer = pageRect
                        ? {
                            x:
                              (event.clientX - pageRect.left) /
                              Math.max(0.0001, layout.scaleX),
                            y:
                              (event.clientY - pageRect.top) /
                              Math.max(0.0001, layout.scaleY),
                          }
                        : null;
                      const strandInteraction =
                        strandInteractionForElement(element);
                      const authoredPath =
                        strandInteraction && strandPathForElement(element);
                      const pose =
                        strandPosesRef.current.get(element.id) ??
                        (strandInteraction && authoredPath
                          ? createStrandPose(authoredPath, {
                              anchor: strandInteraction.strandAnchor,
                              spacing: strandSampleSpacing(element),
                            })
                          : undefined);
                      if (
                        pose?.points.length &&
                        !strandPosesRef.current.has(element.id)
                      ) {
                        const next = new Map(strandPosesRef.current);
                        next.set(element.id, pose);
                        strandPosesRef.current = next;
                        setStrandPoses(next);
                      }
                      const strandGrab =
                        worldPointer && pose?.points.length
                          ? closestStrandBone(
                              pose,
                              strandLocalPoint(
                                worldPointer,
                                element,
                                runtimeVisual,
                              ),
                            )
                          : undefined;
                      const targetHits = new Set<string>();
                      const initialVisual = visualForCurrentGesture(element);
                      for (const interaction of element.interactions ?? []) {
                        if (
                          interaction.enabled === false ||
                          (interaction.trigger !== "drag-enter-target" &&
                            interaction.trigger !== "drag-leave-target")
                        )
                          continue;
                        if (
                          targetHitForInteraction(
                            element,
                            interaction,
                            initialVisual,
                          )?.hit
                        )
                          targetHits.add(interaction.id);
                      }
                      pointerSessionsRef.current.set(event.pointerId, {
                        currentX: event.clientX,
                        currentY: event.clientY,
                        dragging: false,
                        elementId: element.id,
                        startX: event.clientX,
                        startY: event.clientY,
                        targetHits,
                        strandGrab,
                      });
                      event.currentTarget.setPointerCapture?.(event.pointerId);
                      playInteractionEvent(element, "press", "press-start");
                      playInteractionEvent(
                        element,
                        "press",
                        "while-pressing",
                        true,
                      );
                    }}
                    onPointerEnter={(event) => {
                      lastPointerRef.current = {
                        x: event.clientX,
                        y: event.clientY,
                      };
                      playInteractionEvent(element, "hover", "enter");
                      playInteractionEvent(
                        element,
                        "hover",
                        "while-hovering",
                        true,
                      );
                      setInteractionHover(element, true);
                      fireDirectTargetEffects(element, "hover");
                    }}
                    onPointerLeave={() => {
                      stopContinuousInteraction(element.id, "hover");
                      playInteractionEvent(element, "hover", "leave");
                      setInteractionHover(element, false);
                    }}
                    onPointerMove={(event) => {
                      lastPointerRef.current = {
                        x: event.clientX,
                        y: event.clientY,
                      };
                      const session = pointerSessionsRef.current.get(
                        event.pointerId,
                      );
                      if (!session || session.elementId !== element.id) return;
                      const pointerDeltaX = event.clientX - session.currentX;
                      session.currentX = event.clientX;
                      session.currentY = event.clientY;
                      if (!session.dragging) {
                        const distance = Math.hypot(
                          event.clientX - session.startX,
                          event.clientY - session.startY,
                        );
                        if (distance < 3) return;
                        session.dragging = true;
                        playInteractionEvent(element, "drag", "drag-start");
                      }
                      playInteractionEvent(
                        element,
                        "drag",
                        "while-dragging",
                        true,
                      );
                      // Trail-only surfaces are static: their transient marks
                      // are handled by the page's bubbling pointer event. Keep
                      // sound/capture handling, but don't rerender the artwork
                      // for an unused drag transform. Mixed effects stay here.
                      if (trailOnlyDrag) return;
                      const currentRuntime =
                        runtimeStateRef.current.get(element.id) ??
                        IDLE_RUNTIME_STATE;
                      const rawDrag = {
                        x:
                          (event.clientX - session.startX) /
                          Math.max(0.0001, layout.scaleX),
                        y:
                          (event.clientY - session.startY) /
                          Math.max(0.0001, layout.scaleY),
                      };
                      const axisConstrainedDrag = constrainDragDelta({
                        artboard,
                        authoredSource: authoredRectForElement(element),
                        bounds: "none",
                        committedOffset: currentRuntime.dragOffset,
                        delta: rawDrag,
                        dragAxis: dragGestureInteraction?.dragAxis ?? "free",
                      });
                      const proposedVisual = visualForCurrentGesture(element, {
                        ...currentRuntime,
                        drag: {
                          dx: axisConstrainedDrag.x,
                          dy: axisConstrainedDrag.y,
                        },
                      });
                      const constrainedDrag = constrainDragDelta({
                        artboard,
                        authoredSource: authoredRectForElement(element),
                        bounds: dragGestureInteraction?.dragBounds ?? "none",
                        committedOffset: currentRuntime.dragOffset,
                        delta: axisConstrainedDrag,
                        dragAxis: dragGestureInteraction?.dragAxis ?? "free",
                        transformedSource: runtimeRectForElement(
                          element,
                          proposedVisual,
                        ),
                      });
                      const swipeStrand =
                        strandInteractionForElement(element)?.strandDragMode ===
                        "swipe";
                      const swipeOnlyStrand =
                        swipeStrand &&
                        !(element.interactions ?? []).some(
                          (interaction) =>
                            interaction.enabled !== false &&
                            (interaction.trigger === "drag" ||
                              isTargetDragTrigger(interaction.trigger)) &&
                            interaction.effect !== "strand-bend",
                        );
                      if (!swipeOnlyStrand)
                        setInteractionDrag(element, {
                          dx: constrainedDrag.x,
                          dy: constrainedDrag.y,
                        });
                      updateTargetBoundaryEvents(element, session);
                      if (swipeStrand && Math.abs(pointerDeltaX) > 0.01) {
                        const rect = pageRef.current?.getBoundingClientRect();
                        if (rect) {
                          const pointerX =
                            (event.clientX - rect.left) /
                            Math.max(0.0001, layout.scaleX);
                          const deltaX =
                            pointerDeltaX / Math.max(0.0001, layout.scaleX);
                          const next = new Map(strandPosesRef.current);
                          let changed = false;
                          for (const candidate of visibleElements) {
                            const interaction =
                              strandInteractionForElement(candidate);
                            if (
                              !interaction ||
                              interaction.strandDragMode !== "swipe"
                            )
                              continue;
                            const visual = visualForCurrentGesture(candidate);
                            const centerX =
                              candidate.x + visual.tx + candidate.width / 2;
                            const radius = Math.max(
                              1,
                              interaction.strandNeighborRadius,
                            );
                            const proximity = Math.max(
                              0,
                              1 - Math.abs(pointerX - centerX) / radius,
                            );
                            if (proximity <= 0) continue;
                            const pose =
                              next.get(candidate.id) ??
                              (() => {
                                const path = strandPathForElement(candidate);
                                return path
                                  ? createStrandPose(path, {
                                      anchor: interaction.strandAnchor,
                                      spacing: strandSampleSpacing(candidate),
                                    })
                                  : undefined;
                              })();
                            if (!pose?.points.length) continue;
                            const strength =
                              proximity *
                              (candidate.id === element.id
                                ? 1
                                : interaction.strandNeighborStrength / 100);
                            next.set(
                              candidate.id,
                              applyStrandSwipeImpulse(pose, deltaX, strength),
                            );
                            changed = true;
                          }
                          if (changed) {
                            strandPosesRef.current = next;
                            setStrandPoses(next);
                          }
                        }
                      } else if (
                        !swipeStrand &&
                        pullsNeighbors &&
                        session.strandGrab
                      ) {
                        const rect = pageRef.current?.getBoundingClientRect();
                        if (rect) {
                          const artboardPointer = {
                            elementId: element.id,
                            x:
                              (event.clientX - rect.left) /
                              Math.max(0.0001, layout.scaleX),
                            y:
                              (event.clientY - rect.top) /
                              Math.max(0.0001, layout.scaleY),
                          };
                          const local = strandLocalPoint(
                            artboardPointer,
                            element,
                            runtimeVisual,
                          );
                          const grab = {
                            index: session.strandGrab.index,
                            target: {
                              x: local.x - session.strandGrab.offset.x,
                              y: local.y - session.strandGrab.offset.y,
                            },
                          };
                          const pose = strandPosesRef.current.get(element.id);
                          const interaction =
                            strandInteractionForElement(element);
                          if (pose && interaction) {
                            if (
                              interaction.dragAxis === "horizontal" ||
                              interaction.dragAxis === "x"
                            ) {
                              grab.target.y = pose.rest[grab.index].y;
                            } else if (
                              interaction.dragAxis === "vertical" ||
                              interaction.dragAxis === "y"
                            ) {
                              grab.target.x = pose.rest[grab.index].x;
                            }
                            const constrained = constrainedStrandGrab(
                              pose,
                              grab,
                              interaction.strandMaxDisplacement,
                            );
                            activeStrandPointerRef.current = {
                              ...artboardPointer,
                              grab: constrained,
                            };
                            const next = new Map(strandPosesRef.current);
                            next.set(
                              element.id,
                              stepStrandPose(pose, {
                                dt: 1 / 60,
                                grab: constrained,
                                maxDisplacement:
                                  interaction.strandMaxDisplacement,
                                stiffness: interaction.strandStiffness,
                                damping: interaction.strandDamping,
                              }),
                            );
                            strandPosesRef.current = next;
                            setStrandPoses(next);
                          }
                        }
                      }
                    }}
                    onPointerUp={(event) => {
                      const session = pointerSessionsRef.current.get(
                        event.pointerId,
                      );
                      if (session?.elementId === element.id && session.dragging)
                        suppressDragClickRef.current.add(element.id);
                      const targetDropHandled = Boolean(
                        session?.elementId === element.id &&
                        session.dragging &&
                        completeTargetDrop(element),
                      );
                      if (event.pointerType === "touch")
                        fireDirectTargetEffects(element, "touch-end");
                      endPointerInteraction(element, event.pointerId);
                      if (!targetDropHandled) commitInteractionDrag(element);
                      if (
                        event.currentTarget.hasPointerCapture?.(event.pointerId)
                      ) {
                        event.currentTarget.releasePointerCapture?.(
                          event.pointerId,
                        );
                      }
                      if (
                        activeStrandPointerRef.current?.elementId === element.id
                      )
                        activeStrandPointerRef.current = null;
                      latchedStrandsRef.current.clear();
                    }}
                    onTransitionEnd={(event) => {
                      // A relocating effect can slide the element out from
                      // under a stationary pointer, so neither `pointerleave`
                      // nor `:hover` updates. Once the move settles, hit-test
                      // the element's real rect against the tracked pointer
                      // and clear hover if the pointer is no longer over it.
                      if (event.propertyName !== "transform") return;
                      const pointer = lastPointerRef.current;
                      if (!pointer) return;
                      const rect = event.currentTarget.getBoundingClientRect();
                      const inside =
                        pointer.x >= rect.left &&
                        pointer.x <= rect.right &&
                        pointer.y >= rect.top &&
                        pointer.y <= rect.bottom;
                      if (!inside) setInteractionHover(element, false);
                    }}
                    onWheel={(event) => {
                      playInteractionEvent(
                        element,
                        "scroll",
                        "while-scrolling",
                        true,
                      );
                      const previousTimer = scrollStopTimersRef.current.get(
                        element.id,
                      );
                      if (previousTimer) window.clearTimeout(previousTimer);
                      const timer = window.setTimeout(() => {
                        scrollStopTimersRef.current.delete(element.id);
                        stopContinuousInteraction(element.id, "scroll");
                      }, 150);
                      scrollStopTimersRef.current.set(element.id, timer);
                      if (
                        (element.interactions ?? []).some(
                          (interaction) =>
                            interaction.enabled !== false &&
                            interaction.trigger === "scroll-swipe",
                        )
                      ) {
                        mutateRuntimeState(element.id, (state) => ({
                          ...state,
                          scroll: Math.min(
                            5000,
                            Math.max(0, state.scroll + event.deltaY),
                          ),
                        }));
                      }
                    }}
                    style={{
                      animation:
                        runtimeVisual.shake && !prefersReducedMotion
                          ? "interaction-shake 0.35s ease-in-out infinite"
                          : undefined,
                      filter: composeFilter(runtimeVisual),
                      display: isInactiveModalElement ? "none" : undefined,
                      height: element.height,
                      left: element.x,
                      opacity: runtimeVisual.opacity ?? element.opacity / 100,
                      top: element.y,
                      transform: composeTransform(
                        element.rotation,
                        spawnScaleByElementId.has(element.id)
                          ? {
                              ...runtimeVisual,
                              scaleX:
                                runtimeVisual.scaleX *
                                (spawnScaleByElementId.get(element.id) ?? 1),
                              scaleY:
                                runtimeVisual.scaleY *
                                (spawnScaleByElementId.get(element.id) ?? 1),
                            }
                          : runtimeVisual,
                      ),
                      transformOrigin: "center",
                      touchAction: dragEnabled ? "none" : undefined,
                      transition:
                        prefersReducedMotion || runtime.physics
                          ? "none"
                          : activeTransition(element.interactions, runtime),
                      width: element.width,
                      zIndex: isModalMember ? 1000 : undefined,
                    }}
                  >
                    {element.type === "text" ? (
                      <div
                        className="text-shape"
                        style={textStyleForElement(element)}
                      >
                        {element.text}
                      </div>
                    ) : mergedElementIds.has(element.id) &&
                      element.type !== "line" &&
                      element.type !== "pen" ? (
                      <span
                        style={{
                          display: "block",
                          height: "100%",
                          visibility: "hidden",
                          width: "100%",
                        }}
                      >
                        <ShapeGraphic element={element} />
                      </span>
                    ) : (
                      <ShapeGraphic
                        element={graphicElement}
                        strandBend={strandBend}
                        strandPathData={
                          strandPose
                            ? strandPosePath(strandPose)
                            : waveLinePathData
                        }
                        strandRibbonPathData={
                          strandPose && element.strokeStyle !== "none"
                            ? strandPoseRibbonPath(
                                strandPose,
                                element.strokeWidth,
                              )
                            : undefined
                        }
                      />
                    )}
                  </div>
                );
              })}
              {liquidLayers.map((layer) => (
                <MetaballLayer
                  bridgeWidth={layer.bridgeWidth}
                  className="viewer-liquid-merge"
                  color={layer.color}
                  height={artboard.height}
                  key={layer.id}
                  opacity={layer.opacity}
                  smoothness={layer.smoothness}
                  sources={layer.sources}
                  style={{ position: "absolute", left: 0, top: 0, zIndex: 2 }}
                  width={artboard.width}
                />
              ))}
              {trailRows.length ? (
                <ViewerPointerTrails limits={trailLimits} ref={trailLayerRef} />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
