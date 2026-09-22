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
  type CollisionProxy3D,
  InteractionPhysics3DWorld,
  loadRapier3D,
  type Physics3DReadout,
} from "@/features/editor/lib/interaction-physics-3d";
import {
  IDLE_RUNTIME_STATE,
  isRuntimeInteractionActive,
  runtimeVisualForElement,
} from "@/features/editor/lib/interaction-runtime";
import type {
  InteractionSoundEvent,
  InteractionSoundTrigger,
} from "@/features/editor/store/editor-store";
import { orthographicCameraPlacement } from "@/features/editor/three/camera-clearance";
import {
  projectEditorMoveToScreen,
  projectObjectToScreen,
  screenOffsetToEditorMove,
  screenPointToNdc,
  spatialTransformToWorld,
  type ProjectedBounds,
} from "@/features/editor/three/coordinate-system";
import { createGeometry3D } from "@/features/editor/three/geometry-factory";
import { cloneModelAssetScene } from "@/features/editor/three/model-assets";
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
  className?: string;
  /** 2D-element proxies (world px) that 3D bodies can collide with. */
  collisionProxies?: CollisionProxy3D[];
  /** Enables selection and authoring gestures; never enabled in the viewer. */
  editable?: boolean;
  /** When true (viewer preview), objects play their authored interactions. */
  interactive?: boolean;
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

function SceneCamera({
  artboardHeight,
  artboardWidth,
  objects,
  scene,
  viewport,
}: {
  artboardHeight: number;
  artboardWidth: number;
  objects: Object3DElement[];
  scene: Scene3DSettings;
  viewport: ProjectedBounds;
}) {
  const { camera, invalidate } = useThree();

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
      const placement = orthographicCameraPlacement({
        artboardHeight,
        artboardWidth,
        objects,
        scene,
      });
      camera.position.copy(placement.position);
      setOrthographicFarPlane(camera, placement.far);
      camera.lookAt(placement.target);
      Object.assign(camera, {
        left: -artboardWidth / 2,
        right: artboardWidth / 2,
        top: artboardHeight / 2,
        bottom: -artboardHeight / 2,
      });
    } else {
      camera.position.set(
        centerX + scene.cameraPosition.x,
        centerY - scene.cameraPosition.y,
        cameraDistance,
      );
      camera.lookAt(
        centerX + scene.cameraTarget.x,
        centerY - scene.cameraTarget.y,
        scene.cameraTarget.z,
      );
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
    scene,
    viewport,
  ]);

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
  const soundEvents = useContext(Object3DSoundContext);
  const [group, setGroup] = useState<Group | null>(null);
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
      if (!hasSound) return;
      event.stopPropagation();
      suppressSoundClickRef.current = false;
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
    event.stopPropagation();
    event.nativeEvent.stopPropagation();
    if (object.locked) return;
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
  // Reuses the shared runtime; screen-plane deltas map to 3D: tx/ty -> x/-y,
  // rotate -> Z spin, scale -> uniform-ish. Applied on an inner group so the
  // rotation pivots at the object's own center, not the world origin.
  const visual = interactions
    ? runtimeVisualForElement(interactions, {
        ...IDLE_RUNTIME_STATE,
        hovering,
        toggled,
      })
    : null;

  const physics = useContext(Physics3DContext);
  const readout = physics?.readouts.get(object.id) ?? null;

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
                if (!hasSound || soundHoverRef.current) return;
                soundHoverRef.current = true;
                soundEvents?.play(object.id, "hover", "enter");
                soundEvents?.play(object.id, "hover", "while-hovering", true);
              }
            : undefined
        }
        onWheel={
          hasSound
            ? () => {
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
        {readout ? (
          children
        ) : visual ? (
          <group
            position={[visual.tx, -visual.ty, 0]}
            rotation={[0, 0, (visual.rotate * Math.PI) / 180]}
            scale={[
              visual.scaleX,
              visual.scaleY,
              (visual.scaleX + visual.scaleY) / 2,
            ]}
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
  const result = useMemo(() => {
    try {
      return {
        error: null,
        geometry: createGeometry3D({ dimensions, source }),
      };
    } catch (cause: unknown) {
      return {
        error: cause instanceof Error ? cause : new Error(String(cause)),
        geometry: null,
      };
    }
  }, [dimensions, source]);
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
      <primitive
        object={model}
        position={normalization.position}
        scale={normalization.scale}
      />
    </ObjectGroup>
  );
}

export function Artboard3DScene({
  artboardHeight,
  artboardWidth,
  className,
  collisionProxies = [],
  editable = false,
  gestureBridgeRef,
  interactive = false,
  manipulatingRef,
  objects,
  onClearSelection,
  onLoadError,
  onObjectDrag,
  onObjectDragEnd,
  onObjectDragStart,
  onSoundEvent,
  onSoundStop,
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
            scene={settings}
            viewport={renderViewport}
          />
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
            <Interactive3DContext.Provider value={interactive}>
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
                            source: { assetId: string; kind: "asset" };
                          }
                        }
                        onLoadError={onLoadError}
                        onObjectDrag={onObjectDrag}
                        onObjectDragEnd={onObjectDragEnd}
                        onObjectDragStart={onObjectDragStart}
                        onProjectedBoundsChange={onProjectedBoundsChange}
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
                        onProjectedBoundsChange={onProjectedBoundsChange}
                        onSelectObject={onSelectObject}
                      />
                    ),
                  )}
                </Physics3DProvider>
              </Object3DSoundContext.Provider>
            </Interactive3DContext.Provider>
          </Manipulating3DContext.Provider>
        </Viewport3DContext.Provider>
      </Canvas>
    </div>
  );
}
