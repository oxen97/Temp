"use client";

import {
  Canvas,
  events as createPointerEvents,
  useFrame,
  useThree,
} from "@react-three/fiber";
import {
  type DomEvent,
  type RootState,
  type ThreeEvent,
} from "@react-three/fiber";
import {
  Box3,
  type Color,
  DoubleSide,
  FrontSide,
  type Group,
  type Material,
  type Mesh,
  type Object3D,
  OrthographicCamera,
  Plane,
  PerspectiveCamera,
  type Ray,
  Raycaster,
  Vector2,
  Vector3,
} from "three";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";

import {
  type CameraAngles,
  cameraDragAngles,
  cameraElevation,
  cameraInputForState,
  cameraPitchRange,
  type CameraRig,
  type CameraVector,
  claimPointerGesture,
  isArtworkCameraDrag,
  isCameraRotateInteraction,
  orbitCameraPose,
  ownsPointerGesture,
  ZERO_CAMERA_ANGLES,
} from "@/features/editor/lib/camera-rig";
import {
  type CollisionProxy3D,
  InteractionPhysics3DWorld,
  loadRapier3D,
  type Physics3DReadout,
} from "@/features/editor/lib/interaction-physics-3d";
import {
  IDLE_RUNTIME_STATE,
  IDENTITY_VISUAL,
  interactionIntensity,
  isRuntimeInteractionActive,
  runtimeVisualForElement,
  type ElementRuntimeState,
} from "@/features/editor/lib/interaction-runtime";
import type { InteractionDefinition } from "@/features/editor/lib/interaction-model";
import {
  hasTargetDragGesture,
  isDropTargetHit,
  isTargetDragTrigger,
  matchesDropRule,
  snapOffsetForTarget,
} from "@/features/editor/lib/interaction-drop-runtime";
import type {
  InteractionSoundEvent,
  InteractionSoundTrigger,
} from "@/features/editor/store/editor-store";
import {
  orthographicCameraPlacement,
  orthographicOrbitPlacement,
} from "@/features/editor/three/camera-clearance";
import {
  artboardPointToEditorAtDepth,
  projectEditorMoveToScreen,
  projectObjectToScreen,
  screenOffsetToEditorMove,
  screenPointToNdc,
  spatialTransformToWorld,
  worldPointToArtboard,
  type ProjectedBounds,
} from "@/features/editor/three/coordinate-system";
import { createGeometry3D } from "@/features/editor/three/geometry-factory";
import { createDeformableGeometry3D } from "@/features/editor/three/deformable-geometry";
import {
  DropTargets3D,
  type Object3DDropTarget,
} from "@/features/editor/three/drop-targets";
import {
  applyInteractionVisual3D,
  InteractionOpacity3D,
} from "@/features/editor/three/interaction-visual";
import {
  bendPoint3D,
  createStrandPose3D,
  MeshDeformation3D,
  stepStrandPose3D,
  wavePoint3D,
} from "@/features/editor/three/mesh-deformation";
import { cloneModelAssetScene } from "@/features/editor/three/model-assets";
import {
  LiquidMerge3D,
  readLiquidPull3D,
} from "@/features/editor/three/liquid-merge";
import {
  Object3DVisualCompositorProvider,
  useObject3DCompositor,
} from "@/features/editor/three/object-visual-compositor";
import { disposeObject3D } from "@/features/editor/three/resource-disposal";
import {
  resolveScene3DSettings,
  type Material3DSettings,
  type Object3DElement,
  type Scene3DSettings,
  type Vector3Value,
} from "@/features/editor/three/types";

/**
 * True inside the viewer preview, where authored interactions play. Provided
 * inside the Canvas so it crosses the R3F reconciler boundary to ObjectGroup.
 */
const Interactive3DContext = createContext(false);
const ReducedMotion3DContext = createContext(false);
/** The preview's Camera Rotate rig, for objects that host camera interactions. */
const CameraRig3DContext = createContext<CameraRig | null>(null);
export type ScreenPointToWorld3D = (
  point: { x: number; y: number },
  z: number,
) => { x: number; y: number } | null;

function ScreenPointToWorldBridge({
  bridgeRef,
  viewport,
}: {
  bridgeRef: MutableRefObject<ScreenPointToWorld3D | null>;
  viewport: ProjectedBounds;
}) {
  const { camera } = useThree();
  useLayoutEffect(() => {
    const convert: ScreenPointToWorld3D = (point, z) =>
      artboardPointToEditorAtDepth(point, z, camera, viewport);
    bridgeRef.current = convert;
    return () => {
      if (bridgeRef.current === convert) bridgeRef.current = null;
    };
  }, [bridgeRef, camera, viewport]);
  return null;
}
export type { Object3DDropTarget } from "@/features/editor/three/drop-targets";
const DropTargets3DContext = createContext<DropTargets3D | null>(null);

function DropTargets3DProvider({
  children,
  getDropTargets,
}: {
  children: ReactNode;
  getDropTargets?: () => readonly Object3DDropTarget[];
}) {
  const [registry] = useState(() => new DropTargets3D());
  useLayoutEffect(() => {
    registry.setExternal(getDropTargets);
  }, [getDropTargets, registry]);
  return (
    <DropTargets3DContext.Provider value={registry}>
      {children}
    </DropTargets3DContext.Provider>
  );
}

export type Object3DRuntimeEvent = {
  phase: "start" | "move" | "end" | "activate";
  /** Artboard coordinates, independent of preview CSS zoom and camera depth. */
  point: { x: number; y: number };
};
export type Object3DRuntimeInteractionHandler = (
  objectId: string,
  interaction: InteractionDefinition,
  event: Object3DRuntimeEvent,
) => void;
const Runtime3DEventsContext = createContext<
  Object3DRuntimeInteractionHandler | undefined
>(undefined);
const Runtime3DPointerContext = createContext<
  MutableRefObject<{ x: number; y: number } | null>
>({ current: null });

/** One canvas listener serves all pointer-following objects without React state. */
function Runtime3DPointerProvider({ children }: { children: ReactNode }) {
  const { gl, invalidate } = useThree();
  const pointer = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const canvas = gl?.domElement;
    if (!canvas) return;
    const move = (event: PointerEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY };
      invalidate();
    };
    const leave = () => {
      pointer.current = null;
      invalidate();
    };
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerleave", leave);
    return () => {
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
    };
  }, [gl, invalidate]);
  return (
    <Runtime3DPointerContext.Provider value={pointer}>
      {children}
    </Runtime3DPointerContext.Provider>
  );
}

type Object3DSoundEvents = {
  play: (
    objectId: string,
    trigger: InteractionSoundTrigger,
    event: InteractionSoundEvent,
    continuous?: boolean,
  ) => void;
  stop: (objectId: string, trigger: InteractionSoundTrigger) => void;
};

const Object3DSoundContext = createContext<Object3DSoundEvents | null>(null);
const Viewport3DContext = createContext<ProjectedBounds>({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
});

// R3F tracks hover per mesh intersection, even when handlers live on a parent
// group. Moving between meshes of one GLB can therefore emit pointer-out for
// the old mesh followed by pointer-over for the next one. Only the final exit
// from the object should end its hover sound.
export function pointerRemainsOver3DObject(
  eventObject: Object3D,
  intersections: readonly { eventObject: Object3D }[] | undefined,
): boolean {
  return intersections?.some((hit) => hit.eventObject === eventObject) ?? false;
}

/** Imperative controller used to move/resize a 3D object's mesh during a drag
 *  or resize gesture without a React re-render. */
export type Object3DGestureApi = {
  projectMove: (
    from: Vector3Value,
    to: Vector3Value,
  ) => { x: number; y: number };
  screenDeltaToEditor: (
    anchor: Vector3Value,
    delta: { x: number; y: number },
  ) => { x: number; y: number } | null;
  apply: (
    objectId: string,
    world: {
      position: readonly [number, number, number];
      rotation: readonly [number, number, number];
      scale: readonly [number, number, number];
    },
    measure?: boolean,
  ) => ProjectedBounds | null;
};

/**
 * A ref flag (not state, so toggling it never re-renders) that suppresses
 * BoundsReporter while a gesture drives the mesh imperatively — otherwise its
 * per-frame setState would re-render the editor and fight the imperative path.
 */
const NEVER_MANIPULATING: { current: boolean } = { current: false };

function setOrthographicFarPlane(camera: OrthographicCamera, far: number) {
  if (camera.far === far) return;
  camera.far = far;
  camera.updateProjectionMatrix();
}
const Manipulating3DContext = createContext<{ current: boolean }>(
  NEVER_MANIPULATING,
);

/**
 * Lives inside the Canvas and publishes an imperative handle so the editor's
 * pointer handlers can update a mesh's transform (and request a single frame)
 * directly, bypassing the store/React round-trip during a gesture.
 */
function Object3DGestureBridge({
  artboardHeight,
  artboardWidth,
  bridgeRef,
  objects,
  settings,
  viewport,
}: {
  artboardHeight: number;
  artboardWidth: number;
  bridgeRef: MutableRefObject<Object3DGestureApi | null>;
  objects: Object3DElement[];
  settings: Scene3DSettings;
  viewport: ProjectedBounds;
}) {
  const { camera, scene, invalidate } = useThree();
  const objectById = useMemo(
    () => new Map(objects.map((object) => [object.id, object])),
    [objects],
  );
  useEffect(() => {
    const api: Object3DGestureApi = {
      projectMove(from, to) {
        return projectEditorMoveToScreen(
          from,
          to,
          camera,
          viewport.width,
          viewport.height,
        );
      },
      screenDeltaToEditor(anchor, delta) {
        return screenOffsetToEditorMove(
          anchor,
          delta,
          camera,
          viewport.width,
          viewport.height,
        );
      },
      apply(objectId, world, measure = false) {
        let target: Object3D | null = null;
        scene.traverse((child) => {
          if (child.userData?.amousObjectId === objectId) target = child;
        });
        if (!target) return null;
        const group = target as Object3D;
        group.position.set(
          world.position[0],
          world.position[1],
          world.position[2],
        );
        group.rotation.set(
          world.rotation[0],
          world.rotation[1],
          world.rotation[2],
        );
        group.scale.set(world.scale[0], world.scale[1], world.scale[2]);
        group.updateMatrixWorld();
        if (camera instanceof OrthographicCamera) {
          const object = objectById.get(objectId);
          if (object) {
            const placement = orthographicCameraPlacement({
              artboardHeight,
              artboardWidth,
              objects: [object],
              override: { objectId, pose: world },
              scene: settings,
            });
            if (
              camera.position.distanceTo(placement.target) < placement.distance
            ) {
              camera.position.copy(placement.position);
            }
            if (camera.far < placement.far) {
              setOrthographicFarPlane(camera, placement.far);
            }
            camera.updateMatrixWorld();
          }
        }
        invalidate();
        if (!measure) return null;
        const bounds = projectObjectToScreen(
          group,
          camera,
          viewport.width,
          viewport.height,
        );
        return bounds
          ? { ...bounds, x: bounds.x + viewport.x, y: bounds.y + viewport.y }
          : null;
      },
    };
    bridgeRef.current = api;
    return () => {
      if (bridgeRef.current === api) bridgeRef.current = null;
    };
  }, [
    artboardHeight,
    artboardWidth,
    camera,
    scene,
    invalidate,
    bridgeRef,
    objectById,
    settings,
    viewport,
  ]);
  return null;
}

/**
 * R3F's default pointer `compute` maps clicks with `event.offsetX / size.width`.
 * When an ancestor applies a CSS `transform: scale()` — as the viewer preview
 * does to fit the artboard — `offsetX` stays in the element's unscaled local
 * space while the measured `size` is the scaled visual size, so the two desync
 * and every ray misses (3D interactions never fire on click). Recompute the
 * pointer from `clientX/Y` against the live bounding rect instead: both are in
 * the same scaled screen space, so the ratio is correct at any scale.
 */
const scaledPointerEvents = (
  store: Parameters<typeof createPointerEvents>[0],
) => {
  const manager = createPointerEvents(store);
  return {
    ...manager,
    compute: (event: DomEvent, state: RootState) => {
      const rect = state.gl.domElement.getBoundingClientRect();
      const ndc = screenPointToNdc(event.clientX, event.clientY, rect);
      state.pointer.set(ndc.x, ndc.y);
      state.raycaster.setFromCamera(state.pointer, state.camera);
    },
  };
};

type Physics3DApi = {
  readouts: Map<string, Physics3DReadout>;
  release: (object: Object3DElement) => void;
};

const Physics3DContext = createContext<Physics3DApi | null>(null);

/**
 * Owns the Rapier 3D world (inside the Canvas so its useFrame can step it).
 * Objects are released into the sim on a gravity trigger; each frame the bodies'
 * readouts are published so ObjectGroup can drive the released objects.
 */
function Physics3DProvider({
  artboardHeight,
  artboardWidth,
  children,
  proxies,
}: {
  artboardHeight: number;
  artboardWidth: number;
  children: ReactNode;
  proxies: CollisionProxy3D[];
}) {
  const [readouts, setReadouts] = useState<Map<string, Physics3DReadout>>(
    () => new Map(),
  );
  const worldRef = useRef<InteractionPhysics3DWorld | null>(null);
  const releasedRef = useRef<Set<string>>(new Set());

  const release = useCallback(
    (object: Object3DElement) => {
      if (releasedRef.current.has(object.id)) return;
      releasedRef.current.add(object.id);
      const gravity = (object.interactions ?? []).find(
        (interaction) =>
          interaction.enabled !== false && interaction.motion === "gravity",
      );
      const world = spatialTransformToWorld(object.transform);
      void loadRapier3D().then((rapier) => {
        if (!releasedRef.current.has(object.id)) return;
        if (!worldRef.current) {
          worldRef.current = new InteractionPhysics3DWorld(rapier, {
            height: artboardHeight,
            width: artboardWidth,
          });
          // Register 2D-element proxies so 3D bodies collide with 2D shapes.
          for (const proxy of proxies) worldRef.current.addStaticProxy(proxy);
        }
        worldRef.current.addBody({
          bounciness: (gravity?.bounciness ?? 50) / 100,
          depth: object.dimensions.depth,
          height: object.dimensions.height,
          id: object.id,
          width: object.dimensions.width,
          x: world.position[0],
          y: world.position[1],
          z: world.position[2],
        });
      });
    },
    [artboardHeight, artboardWidth, proxies],
  );

  useFrame(() => {
    const world = worldRef.current;
    if (!world || releasedRef.current.size === 0) return;
    world.step();
    const next = new Map<string, Physics3DReadout>();
    for (const id of releasedRef.current) {
      const readout = world.read(id);
      if (readout) next.set(id, readout);
    }
    setReadouts(next);
  });

  useEffect(
    () => () => {
      worldRef.current?.dispose();
      worldRef.current = null;
      releasedRef.current.clear();
    },
    [],
  );

  const api = useMemo(() => ({ readouts, release }), [readouts, release]);
  return (
    <Physics3DContext.Provider value={api}>
      {children}
    </Physics3DContext.Provider>
  );
}

type Artboard3DSceneProps = {
  artboardHeight: number;
  artboardWidth: number;
  /**
   * Preview only: Camera Rotate interactions turn the camera through this rig.
   * Without one (the editor) the camera always faces the artboard.
   */
  cameraRig?: CameraRig | null;
  className?: string;
  /** 2D-element proxies (world px) that 3D bodies can collide with. */
  collisionProxies?: CollisionProxy3D[];
  /** Enables selection and authoring gestures; never enabled in the viewer. */
  editable?: boolean;
  /** When true (viewer preview), objects play their authored interactions. */
  interactive?: boolean;
  /** Freezes ambient motion while keeping direct pointer manipulation usable. */
  reducedMotion?: boolean;
  /** Populated with an imperative controller for gesture-time mesh updates. */
  gestureBridgeRef?: MutableRefObject<Object3DGestureApi | null>;
  /** Ref flag; while true, BoundsReporter stays quiet (gesture drives the
   *  mesh + overlay imperatively). */
  manipulatingRef?: MutableRefObject<boolean>;
  objects: Object3DElement[];
  onClearSelection?: () => void;
  onLoadError?: (objectId: string, error: Error) => void;
  onObjectDrag?: (objectId: string, position: Vector3Value) => void;
  onObjectDragEnd?: (objectId: string) => void;
  onObjectDragStart?: (objectId: string) => void;
  onSoundEvent?: Object3DSoundEvents["play"];
  onSoundStop?: Object3DSoundEvents["stop"];
  onRuntimeInteraction?: Object3DRuntimeInteractionHandler;
  /** Converts artboard pixels to authoring XY on a requested world-Z plane. */
  screenPointToWorldRef?: MutableRefObject<ScreenPointToWorld3D | null>;
  /** Live artboard bounds of 2D targets or objects in another 3D canvas layer. */
  getDropTargets?: () => readonly Object3DDropTarget[];
  onProjectedBoundsChange?: (
    objectId: string,
    bounds: ProjectedBounds | null,
  ) => void;
  onSelectObject?: (objectId: string, additive?: boolean) => void;
  projectId?: string;
  scene?: Partial<Scene3DSettings>;
  /** Editor-only visible area in artboard coordinates; preview stays clipped. */
  viewport?: ProjectedBounds;
};

/**
 * The editor renders only its continuously visible world viewport. Keeping
 * this independent from the artboard edges avoids switching canvas sizes when
 * the page starts fitting inside the workspace during zoom. The preview has
 * no viewport and therefore renders the authored page exactly.
 */
export function sceneRenderViewport(
  artboardWidth: number,
  artboardHeight: number,
  visibleViewport?: ProjectedBounds,
): ProjectedBounds {
  if (!visibleViewport) {
    return { x: 0, y: 0, width: artboardWidth, height: artboardHeight };
  }
  return {
    height: Math.max(1, visibleViewport.height),
    width: Math.max(1, visibleViewport.width),
    x: visibleViewport.x,
    y: visibleViewport.y,
  };
}

type CameraBasePose = { position: CameraVector; target: CameraVector };

/** Orbits the camera around the base pose's target by Camera Rotate angles. */
export function applyCameraOrbit(
  camera: Object3D,
  base: CameraBasePose,
  angles: CameraAngles,
) {
  const pose = orbitCameraPose(base.position, base.target, angles);
  camera.position.set(pose.position.x, pose.position.y, pose.position.z);
  camera.up.set(0, 1, 0);
  camera.lookAt(base.target.x, base.target.y, base.target.z);
  // Rolling the camera counterclockwise turns the picture clockwise.
  if (pose.roll) camera.rotateZ(pose.roll);
  camera.updateMatrixWorld();
}

function SceneCamera({
  artboardHeight,
  artboardWidth,
  objects,
  rig,
  scene,
  viewport,
}: {
  artboardHeight: number;
  artboardWidth: number;
  objects: Object3DElement[];
  /** Preview only: Camera Rotate orbits the authored camera around its target. */
  rig?: CameraRig | null;
  scene: Scene3DSettings;
  viewport: ProjectedBounds;
}) {
  const { camera, invalidate } = useThree();
  const baseRef = useRef<CameraBasePose | null>(null);

  useLayoutEffect(() => {
    const centerX = artboardWidth / 2;
    const centerY = -artboardHeight / 2;
    const perspectiveDistance =
      artboardHeight /
      (2 * Math.tan((Math.max(1, scene.perspective) * Math.PI) / 360));
    const cameraDistance =
      scene.projection === "perspective"
        ? perspectiveDistance * Math.max(0.05, scene.cameraPosition.z / 1000)
        : Math.max(1, scene.cameraPosition.z);
    if (camera instanceof OrthographicCamera) {
      const placementInput = {
        artboardHeight,
        artboardWidth,
        objects,
        scene,
      };
      const placement = rig
        ? orthographicOrbitPlacement(placementInput)
        : orthographicCameraPlacement(placementInput);
      camera.position.copy(placement.position);
      setOrthographicFarPlane(camera, placement.far);
      camera.lookAt(placement.target);
      Object.assign(camera, {
        left: -artboardWidth / 2,
        right: artboardWidth / 2,
        top: artboardHeight / 2,
        bottom: -artboardHeight / 2,
      });
      baseRef.current = {
        position: { ...placement.position },
        target: { ...placement.target },
      };
    } else {
      const base = {
        position: {
          x: centerX + scene.cameraPosition.x,
          y: centerY - scene.cameraPosition.y,
          z: cameraDistance,
        },
        target: {
          x: centerX + scene.cameraTarget.x,
          y: centerY - scene.cameraTarget.y,
          z: scene.cameraTarget.z,
        },
      };
      camera.position.set(base.position.x, base.position.y, base.position.z);
      camera.lookAt(base.target.x, base.target.y, base.target.z);
      baseRef.current = base;
    }
    if (rig && baseRef.current) {
      const base = baseRef.current;
      rig.setPitchRange(
        ...cameraPitchRange(cameraElevation(base.position, base.target)),
      );
      // A re-layout during an orbit keeps the camera where the rig has it.
      applyCameraOrbit(camera, base, rig.angles());
    }
    if (camera instanceof PerspectiveCamera) {
      Object.assign(camera, { fov: scene.perspective });
    }
    if (
      camera instanceof OrthographicCamera ||
      camera instanceof PerspectiveCamera
    ) {
      // Render a larger viewport without changing the authored camera or
      // perspective parallax. A shifted camera would move objects with Z depth.
      camera.setViewOffset(
        artboardWidth,
        artboardHeight,
        viewport.x,
        viewport.y,
        viewport.width,
        viewport.height,
      );
    }
    invalidate();
  }, [
    artboardHeight,
    artboardWidth,
    camera,
    invalidate,
    objects,
    rig,
    scene,
    viewport,
  ]);

  // The rig asks for frames when its target changes and keeps them coming
  // while the camera is still easing, springing or coasting.
  useEffect(() => rig?.subscribe(() => invalidate()), [invalidate, rig]);
  useFrame(() => {
    const base = baseRef.current;
    if (!rig || !base) return;
    const moving = rig.step();
    applyCameraOrbit(camera, base, rig.angles());
    if (moving) invalidate();
  });

  return null;
}

function BoundsReporter({
  object,
  objectId,
  onChange,
}: {
  object: Object3D;
  objectId: string;
  onChange: Artboard3DSceneProps["onProjectedBoundsChange"];
}) {
  const { camera } = useThree();
  const previousRef = useRef("");
  const manipulating = useContext(Manipulating3DContext);
  const viewport = useContext(Viewport3DContext);

  // Report synchronously on the frame the projection changes. An earlier
  // version deferred this through requestAnimationFrame, which made the DOM
  // selection overlay trail the mesh by an extra frame — visible sloshing
  // during fast drag/resize. The parent dedupes and batches these updates.
  // While a gesture drives the mesh imperatively the overlay is updated
  // straight from the pointer, so stay quiet to avoid re-render churn.
  useFrame(() => {
    if (!onChange || manipulating.current) return;
    const bounds = projectObjectToScreen(
      object,
      camera,
      viewport.width,
      viewport.height,
    );
    if (bounds) {
      bounds.x += viewport.x;
      bounds.y += viewport.y;
    }
    const key = bounds
      ? `${bounds.x.toFixed(2)}:${bounds.y.toFixed(2)}:${bounds.width.toFixed(2)}:${bounds.height.toFixed(2)}`
      : "none";
    if (key !== previousRef.current) {
      previousRef.current = key;
      onChange(objectId, bounds);
    }
  });
  return null;
}

type ThreePointerCaptureTarget = {
  hasPointerCapture: (pointerId: number) => boolean;
  releasePointerCapture: (pointerId: number) => void;
  setPointerCapture: (pointerId: number) => void;
};

/** Convert a captured pointer ray back to authoring coordinates at fixed Z. */
export function positionOnObjectDragPlane(
  ray: Ray,
  plane: Plane,
  grabOffset: Vector3,
  z: number,
): Vector3Value | null {
  const hit = ray.intersectPlane(plane, new Vector3());
  if (!hit) return null;
  hit.add(grabOffset);
  return { x: hit.x, y: -hit.y, z };
}

function ObjectGroup({
  children,
  editable,
  object,
  onObjectDrag,
  onObjectDragEnd,
  onObjectDragStart,
  onProjectedBoundsChange,
  onSelectObject,
}: {
  children: ReactNode;
  editable: boolean;
  object: Object3DElement;
  onObjectDrag: Artboard3DSceneProps["onObjectDrag"];
  onObjectDragEnd: Artboard3DSceneProps["onObjectDragEnd"];
  onObjectDragStart: Artboard3DSceneProps["onObjectDragStart"];
  onProjectedBoundsChange: Artboard3DSceneProps["onProjectedBoundsChange"];
  onSelectObject: Artboard3DSceneProps["onSelectObject"];
}) {
  const interactive = useContext(Interactive3DContext);
  const reducedMotion = useContext(ReducedMotion3DContext);
  const soundEvents = useContext(Object3DSoundContext);
  const runtimeEvents = useContext(Runtime3DEventsContext);
  const runtimeEventsRef = useRef(runtimeEvents);
  useLayoutEffect(() => {
    runtimeEventsRef.current = runtimeEvents;
  }, [runtimeEvents]);
  const stagePointer = useContext(Runtime3DPointerContext);
  const dropTargets = useContext(DropTargets3DContext);
  const runtimeViewport = useContext(Viewport3DContext);
  const { camera, gl, invalidate } = useThree();
  const [group, setGroup] = useState<Group | null>(null);
  const visualRef = useRef(IDENTITY_VISUAL);
  useObject3DCompositor({
    root: group,
    visual: visualRef,
    enabled: interactive,
  });
  const contentRef = useRef<Group>(null);
  const deformRef = useRef<MeshDeformation3D | null>(null);
  const opacityRef = useRef<InteractionOpacity3D | null>(null);
  const strandPose = useRef(createStrandPose3D());
  const runtimeRef = useRef<ElementRuntimeState>({
    ...IDLE_RUNTIME_STATE,
    dragOffset: { x: 0, y: 0 },
  });
  const timedIds = useRef(new Set<string>());
  const dropHits = useRef(new Set<string>());
  const placementRef = useRef<{
    targetId: string;
    targetX: number;
    targetY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const placementResetRef = useRef<number | null>(null);
  const targetCommandRef = useRef<
    (interaction: InteractionDefinition) => boolean
  >(() => false);
  const previewDragRef = useRef<{
    pointerId: number;
    start: Vector3;
    last: Vector3;
    plane: Plane;
    startOffset: { x: number; y: number };
  } | null>(null);
  const activeInteractions = useMemo(
    () =>
      interactive
        ? (object.interactions ?? []).filter((entry) => entry.enabled !== false)
        : [],
    [interactive, object.interactions],
  );
  const cameraRig = useContext(CameraRig3DContext);
  // Pointer Move and artwork-wide drags turn the camera from the page; the
  // object itself drives its clicks, hovers, delays, drops and own drags.
  const cameraInteractions = useMemo(
    () =>
      activeInteractions.filter(
        (entry) =>
          isCameraRotateInteraction(entry) &&
          entry.trigger !== "pointer-move" &&
          !isArtworkCameraDrag(entry),
      ),
    [activeInteractions],
  );
  const cameraDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const cameraKeysRef = useRef(new Set<string>());
  const cameraKey = (interaction: InteractionDefinition) =>
    `3d:${object.id}:${interaction.id}`;
  useEffect(() => {
    const keys = cameraKeysRef.current;
    return () => {
      for (const key of keys) cameraRig?.remove(key);
      keys.clear();
    };
  }, [cameraRig]);
  /** Turns the camera by a screen-space drag, so the turning camera never feeds back. */
  const updateCameraDrag = (client: { x: number; y: number } | null) => {
    const session = cameraDragRef.current;
    if (!cameraRig || !session) return;
    const rect = gl?.domElement?.getBoundingClientRect();
    const scaleX =
      rect && rect.width > 0 ? runtimeViewport.width / rect.width : 1;
    const scaleY =
      rect && rect.height > 0 ? runtimeViewport.height / rect.height : 1;
    for (const interaction of cameraInteractions) {
      if (interaction.trigger !== "drag") continue;
      const key = cameraKey(interaction);
      cameraKeysRef.current.add(key);
      cameraRig.update(
        key,
        interaction,
        client
          ? {
              active: true,
              angles: cameraDragAngles(interaction, {
                dx: (client.x - session.startX) * scaleX,
                dy: (client.y - session.startY) * scaleY,
              }),
            }
          : { active: false, angles: { ...ZERO_CAMERA_ANGLES } },
      );
    }
  };
  const strand = activeInteractions.find(
    (entry) =>
      entry.effect === "strand-bend" &&
      (entry.trigger === "drag" || entry.trigger === "pointer-move"),
  );
  const wave = activeInteractions.find(
    (entry) => entry.effect === "wave-deform",
  );
  const pointerMath = useMemo(
    () => ({
      raycaster: new Raycaster(),
      ndc: new Vector2(),
      plane: new Plane(),
      origin: new Vector3(),
      normal: new Vector3(),
      hit: new Vector3(),
      local: new Vector3(),
      delta: new Vector3(),
      center: new Vector3(),
      liquid: new Vector3(),
      bend: new Vector3(),
    }),
    [],
  );
  const readTarget = (): Object3DDropTarget | null => {
    if (!group?.isObject3D) return null;
    const bounds = projectObjectToScreen(
      group,
      camera,
      runtimeViewport.width,
      runtimeViewport.height,
    );
    return bounds
      ? {
          id: object.id,
          type: "object3d",
          bounds: {
            ...bounds,
            x: bounds.x + runtimeViewport.x,
            y: bounds.y + runtimeViewport.y,
          },
        }
      : null;
  };
  const resetPlacement = () => {
    runtimeRef.current.dragOffset = { x: 0, y: 0 };
    runtimeRef.current.drag = null;
    runtimeRef.current.triggeredInteractionIds = [];
    placementRef.current = null;
    dropTargets?.release(object.id);
    if (placementResetRef.current !== null)
      window.clearTimeout(placementResetRef.current);
    placementResetRef.current = null;
    invalidate();
  };
  const screenDelta = (delta: { x: number; y: number }) =>
    screenOffsetToEditorMove(
      {
        x: object.transform.position.x + runtimeRef.current.dragOffset.x,
        y: object.transform.position.y + runtimeRef.current.dragOffset.y,
        z: object.transform.position.z,
      },
      delta,
      camera,
      runtimeViewport.width,
      runtimeViewport.height,
    ) ?? delta;
  const applyTargetCommand = (interaction: InteractionDefinition): boolean => {
    if (interaction.effect === "return-to-origin") {
      resetPlacement();
      return true;
    }
    if (
      interaction.effect !== "snap-to-target" &&
      interaction.effect !== "attach-to-target"
    )
      return false;
    const target = dropTargets?.read(interaction.collisionTarget);
    const source = readTarget();
    if (!target || !source || target.id === source.id) return false;
    if (!dropTargets?.reserve(object.id, target.id, interaction)) return false;
    if (
      interaction.effect === "attach-to-target" &&
      !dropTargets.attach(object.id, target.id)
    )
      return false;
    const state = runtimeRef.current;
    const adjustment =
      interaction.effect === "attach-to-target" &&
      interaction.attachPreserveOffset
        ? { x: 0, y: 0 }
        : screenDelta(
            snapOffsetForTarget({
              anchor: interaction.snapAnchor,
              authoredSource: source.bounds,
              offsetX: interaction.snapOffsetX,
              offsetY: interaction.snapOffsetY,
              target: target.bounds,
            }),
          );
    state.dragOffset = {
      x: state.dragOffset.x + (state.drag?.dx ?? 0) + adjustment.x,
      y: state.dragOffset.y + (state.drag?.dy ?? 0) + adjustment.y,
    };
    const session = previewDragRef.current;
    if (session) session.start.copy(session.last);
    state.drag = session ? { dx: 0, dy: 0 } : null;
    placementRef.current =
      interaction.effect === "attach-to-target"
        ? {
            targetId: target.id,
            targetX: target.bounds.x,
            targetY: target.bounds.y,
            offsetX: state.dragOffset.x,
            offsetY: state.dragOffset.y,
          }
        : null;
    if (interaction.resetMode === "return-to-origin") {
      if (placementResetRef.current !== null)
        window.clearTimeout(placementResetRef.current);
      placementResetRef.current = window.setTimeout(
        resetPlacement,
        Math.max(0, interaction.duration + interaction.hold) * 1000,
      );
    }
    invalidate();
    return true;
  };
  useLayoutEffect(() => {
    targetCommandRef.current = applyTargetCommand;
  });
  const dispatchTarget = (
    interaction: InteractionDefinition,
    point: Vector3,
  ) => {
    applyTargetCommand(interaction);
    runtimeRef.current.triggeredInteractionIds = [
      ...new Set([
        ...runtimeRef.current.triggeredInteractionIds,
        interaction.id,
      ]),
    ];
    const eventPoint = worldPointToArtboard(point, camera, runtimeViewport);
    if (eventPoint)
      runtimeEvents?.(object.id, interaction, {
        phase: "activate",
        point: eventPoint,
      });
    invalidate();
  };
  const updateTargetEvents = (ending: boolean, point: Vector3) => {
    const source = readTarget();
    if (!source) return false;
    let applied = false;
    for (const interaction of activeInteractions) {
      if (!isTargetDragTrigger(interaction.trigger)) continue;
      const target = dropTargets?.read(interaction.collisionTarget);
      if (!target || target.id === source.id) continue;
      const hit =
        matchesDropRule(interaction, source) &&
        isDropTargetHit(
          source.bounds,
          target.bounds,
          interaction.dropTolerance,
        );
      const previous = dropHits.current.has(interaction.id);
      if (hit) dropHits.current.add(interaction.id);
      else dropHits.current.delete(interaction.id);
      const fire = ending
        ? (interaction.trigger === "drop-on-target" && hit) ||
          (interaction.trigger === "drop-outside-target" && !hit)
        : (interaction.trigger === "drag-enter-target" && hit && !previous) ||
          (interaction.trigger === "drag-leave-target" && !hit && previous);
      if (
        !fire ||
        (interaction.trigger === "drop-on-target" &&
          !dropTargets?.reserve(object.id, target.id, interaction))
      )
        continue;
      dispatchTarget(interaction, point);
      applied = true;
    }
    return applied;
  };
  useEffect(() => {
    if (!interactive || !group?.isObject3D || !dropTargets) return;
    return dropTargets.register(
      object.id,
      () => {
        const bounds = projectObjectToScreen(
          group,
          camera,
          runtimeViewport.width,
          runtimeViewport.height,
        );
        return bounds
          ? {
              id: object.id,
              type: "object3d",
              bounds: {
                ...bounds,
                x: bounds.x + runtimeViewport.x,
                y: bounds.y + runtimeViewport.y,
              },
            }
          : null;
      },
      () => {
        runtimeRef.current.dragOffset = { x: 0, y: 0 };
        runtimeRef.current.drag = null;
        placementRef.current = null;
        invalidate();
      },
    );
  }, [
    camera,
    dropTargets,
    group,
    interactive,
    invalidate,
    object.id,
    runtimeViewport,
  ]);
  useEffect(
    () => () => {
      if (placementResetRef.current !== null)
        window.clearTimeout(placementResetRef.current);
    },
    [],
  );
  const emitRuntime = (
    trigger: string,
    phase: Object3DRuntimeEvent["phase"],
    point: Vector3,
  ) => {
    const eventPoint = worldPointToArtboard(point, camera, runtimeViewport);
    for (const interaction of activeInteractions) {
      if (interaction.trigger === trigger) {
        if (phase === "activate" || phase === "start")
          applyTargetCommand(interaction);
        if (eventPoint)
          runtimeEvents?.(object.id, interaction, {
            phase,
            point: eventPoint,
          });
      }
    }
  };
  useLayoutEffect(() => {
    const content = contentRef.current;
    // Non-R3F component tests render intrinsic groups as DOM elements.
    if (!interactive || !content?.isObject3D) return;
    const deform = strand || wave ? new MeshDeformation3D(content) : null;
    const opacity = new InteractionOpacity3D(
      content,
      object.source.kind !== "asset" || !object.material.useSourceMaterial
        ? object.material.opacity / 100
        : undefined,
    );
    deformRef.current = deform;
    opacityRef.current = opacity;
    invalidate();
    return () => {
      deform?.dispose();
      opacity.dispose();
      deformRef.current = null;
      opacityRef.current = null;
    };
  }, [
    group,
    interactive,
    invalidate,
    object.dimensions,
    object.material,
    object.source,
    strand,
    wave,
  ]);
  useEffect(() => {
    timedIds.current.clear();
    const timers = activeInteractions
      .filter((entry) => entry.trigger === "after-delay")
      .map((interaction) =>
        window.setTimeout(
          () => {
            timedIds.current.add(interaction.id);
            targetCommandRef.current(interaction);
            const center = new Vector3(
              object.transform.position.x,
              -object.transform.position.y,
              object.transform.position.z,
            );
            const content = contentRef.current;
            if (content?.isObject3D) {
              content.updateWorldMatrix(true, true);
              const bounds = new Box3().setFromObject(content, true);
              if (!bounds.isEmpty()) bounds.getCenter(center);
            }
            const eventPoint = worldPointToArtboard(
              center,
              camera,
              runtimeViewport,
            );
            if (eventPoint)
              runtimeEventsRef.current?.(object.id, interaction, {
                phase: "activate",
                point: eventPoint,
              });
            invalidate();
          },
          Math.max(0, interaction.timeSeconds) * 1000,
        ),
      );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [
    activeInteractions,
    camera,
    invalidate,
    object.id,
    object.transform.position.x,
    object.transform.position.y,
    object.transform.position.z,
    runtimeViewport,
  ]);
  const [toggled, setToggled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const world = spatialTransformToWorld(object.transform);
  const dragRef = useRef<{
    grabOffset: Vector3;
    plane: Plane;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    started: boolean;
    z: number;
  } | null>(null);
  const soundPointerRef = useRef<{
    dragging: boolean;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const soundHoverRef = useRef(false);
  const suppressSoundClickRef = useRef(false);
  const scrollStopTimerRef = useRef<number | null>(null);
  const hasSound =
    interactive &&
    object.interactionSounds?.some(
      (sound) => sound.enabled !== false && sound.assets.length > 0,
    );
  useEffect(
    () => () => {
      if (scrollStopTimerRef.current !== null) {
        window.clearTimeout(scrollStopTimerRef.current);
      }
    },
    [],
  );
  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!editable) {
      const canDrag =
        activeInteractions.some(
          (entry) => entry.trigger === "drag" && !isArtworkCameraDrag(entry),
        ) || hasTargetDragGesture(activeInteractions);
      // A press on this object's own drag or button leaves the artwork camera alone.
      if (ownsPointerGesture(activeInteractions))
        claimPointerGesture(event.nativeEvent);
      if (
        cameraRig &&
        cameraInteractions.some((entry) => entry.trigger === "drag")
      ) {
        cameraDragRef.current = {
          pointerId: event.pointerId,
          startX: event.nativeEvent.clientX,
          startY: event.nativeEvent.clientY,
        };
        updateCameraDrag({
          x: event.nativeEvent.clientX,
          y: event.nativeEvent.clientY,
        });
      }
      if (!hasSound && !canDrag) return;
      event.stopPropagation();
      suppressSoundClickRef.current = false;
      if (canDrag && group?.isObject3D) {
        group.getWorldPosition(pointerMath.origin);
        camera.getWorldDirection(pointerMath.normal);
        const plane = new Plane().setFromNormalAndCoplanarPoint(
          pointerMath.normal,
          pointerMath.origin,
        );
        const hit = event.ray.intersectPlane(plane, new Vector3());
        if (hit) {
          previewDragRef.current = {
            pointerId: event.pointerId,
            start: hit.clone(),
            last: hit,
            plane,
            startOffset: { ...runtimeRef.current.dragOffset },
          };
          placementRef.current = null;
          dropTargets?.release(object.id);
          dropHits.current.clear();
          runtimeRef.current.drag = { dx: 0, dy: 0 };
          emitRuntime("drag", "start", hit);
          invalidate();
        }
      }
      soundPointerRef.current = {
        dragging: false,
        pointerId: event.pointerId,
        startX: event.nativeEvent.clientX,
        startY: event.nativeEvent.clientY,
      };
      (event.target as unknown as ThreePointerCaptureTarget).setPointerCapture(
        event.pointerId,
      );
      soundEvents?.play(object.id, "press", "press-start");
      soundEvents?.play(object.id, "press", "while-pressing", true);
      return;
    }
    // Locked objects let the press through, like locked 2D elements: the
    // object behind or the artboard (clear selection, marquee) receives it.
    if (object.locked) return;
    event.stopPropagation();
    event.nativeEvent.stopPropagation();
    if (event.nativeEvent.shiftKey) {
      onSelectObject?.(object.id, true);
      return;
    }
    onSelectObject?.(object.id);
    if (!onObjectDrag) return;

    // The mesh hit may be on its front or side. Intersect a fixed-depth plane
    // instead so the object follows the pointer without jumping in Z.
    const position = new Vector3(...world.position);
    const plane = new Plane().setFromNormalAndCoplanarPoint(
      new Vector3(0, 0, 1),
      position,
    );
    const hit = event.ray.intersectPlane(plane, new Vector3());
    if (!hit) return;
    dragRef.current = {
      grabOffset: position.sub(hit),
      plane,
      pointerId: event.pointerId,
      startClientX: event.nativeEvent.clientX,
      startClientY: event.nativeEvent.clientY,
      started: false,
      z: object.transform.position.z,
    };
    (event.target as unknown as ThreePointerCaptureTarget).setPointerCapture(
      event.pointerId,
    );
  };
  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!editable) {
      if (cameraDragRef.current?.pointerId === event.pointerId)
        updateCameraDrag({
          x: event.nativeEvent.clientX,
          y: event.nativeEvent.clientY,
        });
      const drag = previewDragRef.current;
      if (drag && drag.pointerId === event.pointerId) {
        const hit = event.ray.intersectPlane(drag.plane, pointerMath.hit);
        if (hit) {
          runtimeRef.current.drag = {
            dx: hit.x - drag.start.x,
            dy: drag.start.y - hit.y,
          };
          const dragInteraction = activeInteractions.find(
            (entry) =>
              entry.trigger === "drag" || isTargetDragTrigger(entry.trigger),
          );
          if (dragInteraction?.dragAxis === "x") runtimeRef.current.drag.dy = 0;
          if (dragInteraction?.dragAxis === "y") runtimeRef.current.drag.dx = 0;
          if (strand && contentRef.current?.isObject3D) {
            const content = contentRef.current;
            pointerMath.delta
              .copy(hit)
              .sub(
                strand.strandDragMode === "swipe" && !reducedMotion
                  ? drag.last
                  : drag.start,
              );
            if (strand.dragAxis === "x") pointerMath.delta.setY(0);
            if (strand.dragAxis === "y") pointerMath.delta.setX(0);
            content.updateWorldMatrix(true, false);
            pointerMath.local.copy(hit);
            content.worldToLocal(pointerMath.local);
            pointerMath.origin.copy(hit).sub(pointerMath.delta);
            content.worldToLocal(pointerMath.origin);
            pointerMath.delta.copy(pointerMath.local).sub(pointerMath.origin);
            if (
              strand.strandDragMode === "swipe" &&
              strand.motion === "spring" &&
              !reducedMotion
            ) {
              strandPose.current.velocity.addScaledVector(
                pointerMath.delta,
                18,
              );
            } else {
              strandPose.current.target.copy(pointerMath.delta);
            }
          }
          drag.last.copy(hit);
          emitRuntime("drag", "move", hit);
          invalidate();
        }
      }
      const session = soundPointerRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      if (!session.dragging) {
        const distance = Math.hypot(
          event.nativeEvent.clientX - session.startX,
          event.nativeEvent.clientY - session.startY,
        );
        if (distance < 3) return;
        session.dragging = true;
        soundEvents?.play(object.id, "drag", "drag-start");
      }
      soundEvents?.play(object.id, "drag", "while-dragging", true);
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    event.nativeEvent.stopPropagation();
    if (!drag.started) {
      const distance = Math.hypot(
        event.nativeEvent.clientX - drag.startClientX,
        event.nativeEvent.clientY - drag.startClientY,
      );
      if (distance < 2) return;
      drag.started = true;
      onObjectDragStart?.(object.id);
    }
    const position = positionOnObjectDragPlane(
      event.ray,
      drag.plane,
      drag.grabOffset,
      drag.z,
    );
    if (position) onObjectDrag?.(object.id, position);
  };
  const handlePointerEnd = (
    event: ThreeEvent<PointerEvent>,
    canceled = false,
  ) => {
    if (!editable) {
      if (cameraDragRef.current?.pointerId === event.pointerId) {
        updateCameraDrag(null);
        cameraDragRef.current = null;
      }
      const drag = previewDragRef.current;
      if (drag && drag.pointerId === event.pointerId) {
        const offset = runtimeRef.current.drag;
        const targetDrag = hasTargetDragGesture(activeInteractions);
        if (offset && !canceled) {
          const move = activeInteractions.find(
            (entry) => entry.trigger === "drag" && entry.effect === "move",
          );
          if (targetDrag || (move && move.resetMode !== "return-to-origin")) {
            runtimeRef.current.dragOffset.x += offset.dx;
            runtimeRef.current.dragOffset.y += offset.dy;
          }
          if (Math.hypot(offset.dx, offset.dy) > 2)
            suppressSoundClickRef.current = true;
        }
        runtimeRef.current.drag = null;
        previewDragRef.current = null;
        if (!canceled && targetDrag) {
          const applied = updateTargetEvents(true, drag.last);
          if (!applied) runtimeRef.current.dragOffset = drag.startOffset;
        } else if (canceled && targetDrag)
          runtimeRef.current.dragOffset = drag.startOffset;
        strandPose.current.target.set(0, 0, 0);
        emitRuntime("drag", "end", drag.last);
        invalidate();
      }
      const session = soundPointerRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      soundPointerRef.current = null;
      const target = event.target as unknown as ThreePointerCaptureTarget;
      if (target.hasPointerCapture(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
      soundEvents?.stop(object.id, "press");
      soundEvents?.stop(object.id, "drag");
      if (!canceled) {
        soundEvents?.play(object.id, "press", "release");
        if (session.dragging) {
          suppressSoundClickRef.current = true;
          soundEvents?.play(object.id, "drag", "drop");
        }
      }
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    event.nativeEvent.stopPropagation();
    const wasDragging = drag.started;
    dragRef.current = null;
    const target = event.target as unknown as ThreePointerCaptureTarget;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
    if (wasDragging) onObjectDragEnd?.(object.id);
  };

  const interactions =
    interactive && object.interactions?.length ? object.interactions : null;
  const initialVisual = runtimeVisualForElement(interactions ?? undefined, {
    ...IDLE_RUNTIME_STATE,
    hovering,
    toggled,
  });
  const physics = useContext(Physics3DContext);
  const readout = physics?.readouts.get(object.id) ?? null;
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  /** Camera Rotate hosted by this object: clicks, hovers, delays, scrolls and drops. */
  const updateCameraSources = () => {
    if (!cameraRig) return;
    for (const interaction of cameraInteractions) {
      if (interaction.trigger === "drag") continue;
      const input = cameraInputForState(interaction, {
        ...runtimeRef.current,
        hovering,
        timed: timedIds.current.has(interaction.id),
        toggled,
      });
      if (!input) continue;
      const key = cameraKey(interaction);
      if (input.active) cameraKeysRef.current.add(key);
      cameraRig.update(key, interaction, input);
    }
  };

  useFrame(({ clock }, dt) => {
    if (interactive) updateCameraSources();
    const content = contentRef.current;
    if (!interactive || !content?.isObject3D || !group?.isObject3D) return;
    const state = runtimeRef.current;
    state.hovering = hovering;
    state.toggled = toggled;
    state.timed = true;
    const placement = placementRef.current;
    if (placement && !previewDragRef.current) {
      const target = dropTargets?.read(placement.targetId);
      if (target) {
        const delta = screenDelta({
          x: target.bounds.x - placement.targetX,
          y: target.bounds.y - placement.targetY,
        });
        state.dragOffset = {
          x: placement.offsetX + delta.x,
          y: placement.offsetY + delta.y,
        };
      } else {
        placementRef.current = null;
        dropTargets?.release(object.id);
      }
    }
    group.getWorldPosition(pointerMath.center);
    let pointerWorld: Vector3 | null = null;
    let pointerLocal: Vector3 | null = null;
    const pointer = stagePointer.current;
    if (pointer && gl?.domElement) {
      const ndc = screenPointToNdc(
        pointer.x,
        pointer.y,
        gl.domElement.getBoundingClientRect(),
      );
      pointerMath.ndc.set(ndc.x, ndc.y);
      pointerMath.raycaster.setFromCamera(pointerMath.ndc, camera);
      camera.getWorldDirection(pointerMath.normal);
      pointerMath.plane.setFromNormalAndCoplanarPoint(
        pointerMath.normal,
        pointerMath.center,
      );
      pointerWorld = pointerMath.raycaster.ray.intersectPlane(
        pointerMath.plane,
        pointerMath.hit,
      );
      if (pointerWorld) {
        content.updateWorldMatrix(true, false);
        pointerLocal = content.worldToLocal(
          pointerMath.local.copy(pointerWorld),
        );
        if (pointer !== lastPointerRef.current)
          emitRuntime("pointer-move", "move", pointerWorld);
      }
    }
    lastPointerRef.current = pointer;
    const eligible = activeInteractions.filter(
      (entry) =>
        entry.trigger !== "after-delay" || timedIds.current.has(entry.id),
    );
    const visual = {
      ...(readout
        ? IDENTITY_VISUAL
        : runtimeVisualForElement(eligible, state, {
            center: { x: pointerMath.center.x, y: -pointerMath.center.y },
            pointer: pointerWorld
              ? { x: pointerWorld.x, y: -pointerWorld.y }
              : null,
          })),
    };
    visualRef.current = visual;
    if (reducedMotion) visual.shake = false;
    readLiquidPull3D(group, pointerMath.liquid);
    if (!strand && !readout) {
      visual.tx += pointerMath.liquid.x;
      visual.ty -= pointerMath.liquid.y;
    }
    if (
      !readout &&
      !hasTargetDragGesture(activeInteractions) &&
      !activeInteractions.some(
        (entry) => entry.trigger === "drag" && entry.effect === "move",
      )
    ) {
      visual.tx += state.dragOffset.x;
      visual.ty += state.dragOffset.y;
    }
    // Screen-plane movement must remain under the pointer even when the object
    // already has a rotated/non-uniformly scaled authored parent transform.
    pointerMath.delta.set(
      pointerMath.center.x + visual.tx,
      pointerMath.center.y - visual.ty,
      pointerMath.center.z + (!strand && !readout ? pointerMath.liquid.z : 0),
    );
    group.worldToLocal(pointerMath.delta);
    applyInteractionVisual3D(
      content,
      visual,
      clock.elapsedTime,
      pointerMath.delta,
    );
    opacityRef.current?.apply(visual.opacity);
    if (previewDragRef.current)
      updateTargetEvents(false, previewDragRef.current.last);
    if (
      eligible.some(
        (entry) =>
          entry.motion === "gravity" &&
          isRuntimeInteractionActive(entry, state),
      )
    )
      physics?.release(object);

    const deform = deformRef.current;
    let springMoving = false;
    if (strand) {
      if (strand.trigger === "pointer-move" && !previewDragRef.current) {
        const target = strandPose.current.target;
        target.set(0, 0, 0);
        if (pointerLocal && deform) {
          deform.bounds.getCenter(pointerMath.origin);
          const distance = deform.bounds.distanceToPoint(pointerLocal);
          target
            .copy(pointerLocal)
            .sub(pointerMath.origin)
            .multiplyScalar(
              Math.max(0, 1 - distance / Math.max(1, strand.trackDistance)),
            );
          if (strand.pointerAxis === "x") target.y = target.z = 0;
          if (strand.pointerAxis === "y") target.x = target.z = 0;
        }
      }
      springMoving = stepStrandPose3D(
        strandPose.current,
        reducedMotion ? { ...strand, motion: "direct" } : strand,
        dt,
      );
    }
    const waveStrength = wave
      ? wave.trigger === "pointer-move"
        ? 1
        : interactionIntensity(wave, {
            ...state,
            timed: timedIds.current.has(wave.id),
          })
      : 0;
    pointerMath.bend.copy(strandPose.current.displacement);
    if (strand && pointerMath.liquid.lengthSq() > 0) {
      pointerMath.origin.copy(pointerMath.center);
      content.worldToLocal(pointerMath.origin);
      pointerMath.delta.copy(pointerMath.center).add(pointerMath.liquid);
      content.worldToLocal(pointerMath.delta).sub(pointerMath.origin);
      pointerMath.bend
        .add(pointerMath.delta)
        .clampLength(0, strand.strandMaxDisplacement);
    }
    const bending = !!strand && pointerMath.bend.lengthSq() > 0.000001;
    if (deform) {
      if (bending || (wave && waveStrength > 0)) {
        deform.apply((point, bounds) => {
          if (strand && bending)
            bendPoint3D(point, bounds, pointerMath.bend, strand);
          if (wave && waveStrength > 0)
            wavePoint3D(
              point,
              bounds,
              wave,
              reducedMotion ? 0 : clock.elapsedTime,
              pointerLocal,
              waveStrength,
            );
        });
      } else deform.restore();
    }
    if (
      (placementRef.current && !reducedMotion) ||
      springMoving ||
      visual.shake ||
      (!reducedMotion && wave && waveStrength > 0 && wave.waveSpeed !== 0)
    )
      invalidate();
  });

  // Release into the physics sim once a gravity-motion trigger is active; from
  // then on the simulation drives the object's world transform.
  useEffect(() => {
    if (!physics || !interactions) return;
    const shouldFall = (object.interactions ?? []).some(
      (interaction) =>
        interaction.enabled !== false &&
        interaction.motion === "gravity" &&
        isRuntimeInteractionActive(interaction, {
          ...IDLE_RUNTIME_STATE,
          hovering,
          toggled,
        }),
    );
    if (shouldFall) physics.release(object);
  }, [physics, interactions, object, toggled, hovering]);

  return (
    <>
      <group
        name={object.name}
        onClick={
          interactions || hasSound
            ? (event: ThreeEvent<MouseEvent>) => {
                event.stopPropagation();
                if (suppressSoundClickRef.current) {
                  suppressSoundClickRef.current = false;
                  return;
                }
                if (hasSound) soundEvents?.play(object.id, "click", "click");
                if (interactions) setToggled((current) => !current);
                emitRuntime(
                  "click-tap",
                  "activate",
                  event.point ?? new Vector3(...world.position),
                );
                invalidate();
              }
            : undefined
        }
        onDoubleClick={
          hasSound
            ? (event: ThreeEvent<MouseEvent>) => {
                event.stopPropagation();
                soundEvents?.play(object.id, "click", "double-click");
              }
            : undefined
        }
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => handlePointerEnd(event)}
        onPointerCancel={(event) => handlePointerEnd(event, true)}
        onLostPointerCapture={(event) => handlePointerEnd(event, true)}
        onPointerOut={
          interactions || hasSound
            ? (event: ThreeEvent<PointerEvent>) => {
                if (
                  pointerRemainsOver3DObject(
                    event.eventObject,
                    event.intersections,
                  )
                )
                  return;
                if (interactions) setHovering(false);
                emitRuntime(
                  "hover",
                  "end",
                  event.point ?? new Vector3(...world.position),
                );
                invalidate();
                if (!soundHoverRef.current) return;
                soundHoverRef.current = false;
                soundEvents?.stop(object.id, "hover");
                soundEvents?.play(object.id, "hover", "leave");
              }
            : undefined
        }
        onPointerOver={
          interactions || hasSound
            ? (event: ThreeEvent<PointerEvent>) => {
                event.stopPropagation();
                if (interactions) setHovering(true);
                emitRuntime(
                  "hover",
                  "start",
                  event.point ?? new Vector3(...world.position),
                );
                invalidate();
                if (!hasSound || soundHoverRef.current) return;
                soundHoverRef.current = true;
                soundEvents?.play(object.id, "hover", "enter");
                soundEvents?.play(object.id, "hover", "while-hovering", true);
              }
            : undefined
        }
        onWheel={
          hasSound || interactions
            ? (event: ThreeEvent<WheelEvent>) => {
                runtimeRef.current.scroll = Math.max(
                  0,
                  runtimeRef.current.scroll + event.deltaY,
                );
                emitRuntime(
                  "scroll-swipe",
                  "move",
                  event.point ?? new Vector3(...world.position),
                );
                invalidate();
                soundEvents?.play(object.id, "scroll", "while-scrolling", true);
                if (scrollStopTimerRef.current !== null) {
                  window.clearTimeout(scrollStopTimerRef.current);
                }
                scrollStopTimerRef.current = window.setTimeout(() => {
                  scrollStopTimerRef.current = null;
                  soundEvents?.stop(object.id, "scroll");
                }, 150);
              }
            : undefined
        }
        position={readout ? readout.position : world.position}
        ref={setGroup}
        scale={world.scale}
        userData={{ amousObjectId: object.id }}
        {...(readout
          ? { quaternion: readout.quaternion }
          : { rotation: world.rotation })}
      >
        {interactive ? (
          <group
            position={[initialVisual.tx, -initialVisual.ty, 0]}
            rotation={[0, 0, (initialVisual.rotate * Math.PI) / 180]}
            scale={[
              initialVisual.scaleX,
              initialVisual.scaleY,
              (initialVisual.scaleX + initialVisual.scaleY) / 2,
            ]}
            ref={contentRef}
          >
            {children}
          </group>
        ) : (
          children
        )}
      </group>
      {group && onProjectedBoundsChange ? (
        <BoundsReporter
          object={group}
          objectId={object.id}
          onChange={onProjectedBoundsChange}
        />
      ) : null}
    </>
  );
}

function GeneratedObject({
  editable,
  object,
  onLoadError,
  onObjectDrag,
  onObjectDragEnd,
  onObjectDragStart,
  onProjectedBoundsChange,
  onSelectObject,
}: {
  editable: boolean;
  object: Object3DElement;
  onLoadError: Artboard3DSceneProps["onLoadError"];
  onObjectDrag: Artboard3DSceneProps["onObjectDrag"];
  onObjectDragEnd: Artboard3DSceneProps["onObjectDragEnd"];
  onObjectDragStart: Artboard3DSceneProps["onObjectDragStart"];
  onProjectedBoundsChange: Artboard3DSceneProps["onProjectedBoundsChange"];
  onSelectObject: Artboard3DSceneProps["onSelectObject"];
}) {
  const { dimensions, source } = object;
  const deformable = (object.interactions ?? []).some(
    (entry) =>
      entry.enabled !== false &&
      (entry.effect === "strand-bend" || entry.effect === "wave-deform"),
  );
  const result = useMemo(() => {
    try {
      return {
        error: null,
        geometry: deformable
          ? createDeformableGeometry3D({ dimensions, source })
          : createGeometry3D({ dimensions, source }),
      };
    } catch (cause: unknown) {
      return {
        error: cause instanceof Error ? cause : new Error(String(cause)),
        geometry: null,
      };
    }
  }, [deformable, dimensions, source]);
  useEffect(() => {
    if (result.error) onLoadError?.(object.id, result.error);
  }, [object.id, onLoadError, result.error]);
  useEffect(() => () => result.geometry?.dispose(), [result.geometry]);
  if (!result.geometry) return null;
  return (
    <ObjectGroup
      editable={editable}
      object={object}
      onObjectDrag={onObjectDrag}
      onObjectDragEnd={onObjectDragEnd}
      onObjectDragStart={onObjectDragStart}
      onProjectedBoundsChange={onProjectedBoundsChange}
      onSelectObject={onSelectObject}
    >
      <mesh
        castShadow={object.castShadow}
        geometry={result.geometry}
        receiveShadow={object.receiveShadow}
      >
        <meshStandardMaterial
          color={object.material.color}
          metalness={object.material.metalness}
          opacity={object.material.opacity / 100}
          roughness={object.material.roughness}
          side={object.material.doubleSided ? DoubleSide : FrontSide}
          transparent={object.material.opacity < 100}
        />
      </mesh>
    </ObjectGroup>
  );
}

function overrideAssetMaterials(
  object: Object3D,
  settings: Material3DSettings,
) {
  object.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    for (const material of materials) {
      const color = (material as Material & { color?: Color }).color;
      if (color) color.set(settings.color);
      if ("metalness" in material) {
        material.metalness = settings.metalness;
      }
      if ("roughness" in material) {
        material.roughness = settings.roughness;
      }
      material.opacity = settings.opacity / 100;
      material.transparent = settings.opacity < 100;
      material.side = settings.doubleSided ? DoubleSide : FrontSide;
      material.needsUpdate = true;
    }
  });
}

function AssetObject({
  editable,
  object,
  onLoadError,
  onObjectDrag,
  onObjectDragEnd,
  onObjectDragStart,
  onProjectedBoundsChange,
  onSelectObject,
  projectId,
}: {
  editable: boolean;
  object: Object3DElement & { source: { assetId: string; kind: "asset" } };
  onLoadError: Artboard3DSceneProps["onLoadError"];
  onObjectDrag: Artboard3DSceneProps["onObjectDrag"];
  onObjectDragEnd: Artboard3DSceneProps["onObjectDragEnd"];
  onObjectDragStart: Artboard3DSceneProps["onObjectDragStart"];
  onProjectedBoundsChange: Artboard3DSceneProps["onProjectedBoundsChange"];
  onSelectObject: Artboard3DSceneProps["onSelectObject"];
  projectId: string;
}) {
  const [model, setModel] = useState<Object3D | null>(null);
  const assetId = object.source.assetId;
  const objectId = object.id;
  const useSourceMaterial = object.material.useSourceMaterial;

  useEffect(() => {
    let active = true;
    let ownedModel: Object3D | null = null;
    cloneModelAssetScene(projectId, assetId)
      .then((nextModel) => {
        if (!active) {
          disposeObject3D(nextModel);
          return;
        }
        ownedModel = nextModel;
        setModel(nextModel);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        onLoadError?.(
          objectId,
          cause instanceof Error ? cause : new Error(String(cause)),
        );
      });
    return () => {
      active = false;
      if (ownedModel) disposeObject3D(ownedModel);
    };
  }, [assetId, objectId, onLoadError, projectId, useSourceMaterial]);

  useEffect(() => {
    if (model && !useSourceMaterial) {
      overrideAssetMaterials(model, object.material);
    }
  }, [model, object.material, useSourceMaterial]);

  const normalization = useMemo(() => {
    if (!model) {
      return {
        position: [0, 0, 0] as [number, number, number],
        scale: [1, 1, 1] as [number, number, number],
      };
    }
    const bounds = new Box3().setFromObject(model, true);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const scale: [number, number, number] = [
      object.dimensions.width / Math.max(0.0001, size.x),
      object.dimensions.height / Math.max(0.0001, size.y),
      object.dimensions.depth / Math.max(0.0001, size.z),
    ];
    return {
      position:
        object.transform.pivot === "center"
          ? ([
              -center.x * scale[0],
              -center.y * scale[1],
              -center.z * scale[2],
            ] as [number, number, number])
          : ([0, 0, 0] as [number, number, number]),
      scale,
    };
  }, [
    model,
    object.dimensions.depth,
    object.dimensions.height,
    object.dimensions.width,
    object.transform.pivot,
  ]);

  if (!model) return null;
  return (
    <ObjectGroup
      editable={editable}
      object={object}
      onObjectDrag={onObjectDrag}
      onObjectDragEnd={onObjectDragEnd}
      onObjectDragStart={onObjectDragStart}
      onProjectedBoundsChange={onProjectedBoundsChange}
      onSelectObject={onSelectObject}
    >
      <group position={normalization.position} scale={normalization.scale}>
        <primitive object={model} />
      </group>
    </ObjectGroup>
  );
}

export function Artboard3DScene({
  artboardHeight,
  artboardWidth,
  cameraRig = null,
  className,
  collisionProxies = [],
  editable = false,
  gestureBridgeRef,
  interactive = false,
  reducedMotion = false,
  manipulatingRef,
  objects,
  onClearSelection,
  onLoadError,
  onObjectDrag,
  onObjectDragEnd,
  onObjectDragStart,
  onSoundEvent,
  onSoundStop,
  onRuntimeInteraction,
  screenPointToWorldRef,
  getDropTargets,
  onProjectedBoundsChange,
  onSelectObject,
  projectId = "local-project",
  scene,
  viewport,
}: Artboard3DSceneProps) {
  const settings = useMemo(() => resolveScene3DSettings(scene), [scene]);
  const renderViewport = useMemo(
    () => sceneRenderViewport(artboardWidth, artboardHeight, viewport),
    [artboardHeight, artboardWidth, viewport],
  );
  const visibleObjects = useMemo(
    () => objects.filter((object) => object.visible),
    [objects],
  );
  // Physics needs a continuous frameloop to step; keep it on demand otherwise.
  const usesPhysics =
    interactive &&
    visibleObjects.some((object) =>
      (object.interactions ?? []).some(
        (interaction) =>
          interaction.enabled !== false && interaction.motion === "gravity",
      ),
    );
  if (!settings.enabled || !visibleObjects.length) return null;

  return (
    <div
      aria-label="3D scene"
      className={["artboard-3d-scene", className].filter(Boolean).join(" ")}
      style={{
        bottom: "auto",
        height: renderViewport.height,
        left: renderViewport.x,
        right: "auto",
        top: renderViewport.y,
        width: renderViewport.width,
        ...(viewport ? { borderRadius: 0 } : {}),
      }}
    >
      <Canvas
        key={settings.projection}
        camera={{
          far: 100000,
          fov: settings.perspective,
          manual: true,
          near: 0.1,
          position: [artboardWidth / 2, -artboardHeight / 2, 1000],
          zoom: 1,
        }}
        dpr={[1, 2]}
        events={scaledPointerEvents}
        flat
        frameloop={usesPhysics ? "always" : "demand"}
        gl={{ alpha: true, antialias: true }}
        onPointerMissed={onClearSelection}
        orthographic={settings.projection === "orthographic"}
        shadows="basic"
      >
        <Viewport3DContext.Provider value={renderViewport}>
          <SceneCamera
            artboardHeight={artboardHeight}
            artboardWidth={artboardWidth}
            objects={visibleObjects}
            rig={cameraRig}
            scene={settings}
            viewport={renderViewport}
          />
          {screenPointToWorldRef ? (
            <ScreenPointToWorldBridge
              bridgeRef={screenPointToWorldRef}
              viewport={renderViewport}
            />
          ) : null}
          <ambientLight intensity={settings.ambientLight} />
          <directionalLight
            castShadow
            intensity={1.25}
            position={[artboardWidth * 0.25, 0, 1000]}
            shadow-camera-bottom={-artboardHeight}
            shadow-camera-far={5000}
            shadow-camera-left={-artboardWidth}
            shadow-camera-right={artboardWidth}
            shadow-camera-top={artboardHeight}
            shadow-mapSize-height={2048}
            shadow-mapSize-width={2048}
          />
          {gestureBridgeRef ? (
            <Object3DGestureBridge
              artboardHeight={artboardHeight}
              artboardWidth={artboardWidth}
              bridgeRef={gestureBridgeRef}
              objects={visibleObjects}
              settings={settings}
              viewport={renderViewport}
            />
          ) : null}
          <Manipulating3DContext.Provider
            value={manipulatingRef ?? NEVER_MANIPULATING}
          >
            <ReducedMotion3DContext.Provider value={reducedMotion}>
              <CameraRig3DContext.Provider value={cameraRig}>
                <Interactive3DContext.Provider value={interactive}>
                  <Runtime3DEventsContext.Provider value={onRuntimeInteraction}>
                    <DropTargets3DProvider getDropTargets={getDropTargets}>
                      <Runtime3DPointerProvider>
                        <Object3DVisualCompositorProvider
                          enabled={interactive}
                          artboardWidth={artboardWidth}
                          artboardHeight={artboardHeight}
                        >
                          <Object3DSoundContext.Provider
                            value={
                              onSoundEvent && onSoundStop
                                ? { play: onSoundEvent, stop: onSoundStop }
                                : null
                            }
                          >
                            <Physics3DProvider
                              artboardHeight={artboardHeight}
                              artboardWidth={artboardWidth}
                              proxies={collisionProxies}
                            >
                              {visibleObjects.map((object) =>
                                object.source.kind === "asset" ? (
                                  <AssetObject
                                    editable={editable}
                                    key={`${object.id}:${object.source.assetId}:${object.material.useSourceMaterial}`}
                                    object={
                                      object as Object3DElement & {
                                        source: {
                                          assetId: string;
                                          kind: "asset";
                                        };
                                      }
                                    }
                                    onLoadError={onLoadError}
                                    onObjectDrag={onObjectDrag}
                                    onObjectDragEnd={onObjectDragEnd}
                                    onObjectDragStart={onObjectDragStart}
                                    onProjectedBoundsChange={
                                      onProjectedBoundsChange
                                    }
                                    onSelectObject={onSelectObject}
                                    projectId={projectId}
                                  />
                                ) : (
                                  <GeneratedObject
                                    editable={editable}
                                    key={object.id}
                                    object={object}
                                    onLoadError={onLoadError}
                                    onObjectDrag={onObjectDrag}
                                    onObjectDragEnd={onObjectDragEnd}
                                    onObjectDragStart={onObjectDragStart}
                                    onProjectedBoundsChange={
                                      onProjectedBoundsChange
                                    }
                                    onSelectObject={onSelectObject}
                                  />
                                ),
                              )}
                              <LiquidMerge3D
                                objects={visibleObjects}
                                enabled={interactive}
                              />
                            </Physics3DProvider>
                          </Object3DSoundContext.Provider>
                        </Object3DVisualCompositorProvider>
                      </Runtime3DPointerProvider>
                    </DropTargets3DProvider>
                  </Runtime3DEventsContext.Provider>
                </Interactive3DContext.Provider>
              </CameraRig3DContext.Provider>
            </ReducedMotion3DContext.Provider>
          </Manipulating3DContext.Provider>
        </Viewport3DContext.Provider>
      </Canvas>
    </div>
  );
}
