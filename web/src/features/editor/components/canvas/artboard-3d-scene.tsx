"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { type ThreeEvent } from "@react-three/fiber";
import {
  Box3,
  type BoxHelper,
  type Color,
  DoubleSide,
  FrontSide,
  type Group,
  type Material,
  type Mesh,
  type Object3D,
  PerspectiveCamera,
  Vector3,
} from "three";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
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
import {
  projectObjectToScreen,
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
} from "@/features/editor/three/types";

/**
 * True inside the viewer preview, where authored interactions play. Provided
 * inside the Canvas so it crosses the R3F reconciler boundary to ObjectGroup.
 */
const Interactive3DContext = createContext(false);

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
  /** When true (viewer preview), objects play their authored interactions. */
  interactive?: boolean;
  objects: Object3DElement[];
  onClearSelection?: () => void;
  onLoadError?: (objectId: string, error: Error) => void;
  onProjectedBoundsChange?: (
    objectId: string,
    bounds: ProjectedBounds | null,
  ) => void;
  onSelectObject?: (objectId: string) => void;
  projectId?: string;
  scene?: Partial<Scene3DSettings>;
  selectedObjectIds?: readonly string[];
};

function SceneCamera({
  artboardHeight,
  artboardWidth,
  scene,
}: {
  artboardHeight: number;
  artboardWidth: number;
  scene: Scene3DSettings;
}) {
  const { camera, invalidate } = useThree();

  useEffect(() => {
    const centerX = artboardWidth / 2;
    const centerY = -artboardHeight / 2;
    const perspectiveDistance =
      artboardHeight /
      (2 * Math.tan((Math.max(1, scene.perspective) * Math.PI) / 360));
    const cameraDistance =
      scene.projection === "perspective"
        ? perspectiveDistance * Math.max(0.05, scene.cameraPosition.z / 1000)
        : Math.max(1, scene.cameraPosition.z);
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
    if (camera instanceof PerspectiveCamera) {
      const focalLength =
        (0.5 * camera.getFilmHeight()) /
        Math.tan((scene.perspective * Math.PI) / 360);
      camera.setFocalLength(focalLength);
    }
    camera.updateProjectionMatrix();
    invalidate();
  }, [artboardHeight, artboardWidth, camera, invalidate, scene]);

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
  const { camera, size } = useThree();
  const previousRef = useRef("");

  useFrame(() => {
    if (!onChange) return;
    const bounds = projectObjectToScreen(
      object,
      camera,
      size.width,
      size.height,
    );
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

function SelectedBox({ object }: { object: Object3D }) {
  const helperRef = useRef<BoxHelper>(null);
  useFrame(() => helperRef.current?.update());
  return <boxHelper args={[object, 0xab51f0]} ref={helperRef} />;
}

function ObjectGroup({
  children,
  object,
  onProjectedBoundsChange,
  onSelectObject,
  selected,
}: {
  children: ReactNode;
  object: Object3DElement;
  onProjectedBoundsChange: Artboard3DSceneProps["onProjectedBoundsChange"];
  onSelectObject: Artboard3DSceneProps["onSelectObject"];
  selected: boolean;
}) {
  const interactive = useContext(Interactive3DContext);
  const [group, setGroup] = useState<Group | null>(null);
  const [toggled, setToggled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const world = spatialTransformToWorld(object.transform);
  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    event.nativeEvent.stopPropagation();
    if (!object.locked) onSelectObject?.(object.id);
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
          interactions
            ? (event: ThreeEvent<MouseEvent>) => {
                event.stopPropagation();
                setToggled((current) => !current);
              }
            : undefined
        }
        onPointerDown={handlePointerDown}
        onPointerOut={interactions ? () => setHovering(false) : undefined}
        onPointerOver={
          interactions
            ? (event: ThreeEvent<PointerEvent>) => {
                event.stopPropagation();
                setHovering(true);
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
      {selected && group ? <SelectedBox object={group} /> : null}
      {selected && group ? (
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
  object,
  onLoadError,
  onProjectedBoundsChange,
  onSelectObject,
  selected,
}: {
  object: Object3DElement;
  onLoadError: Artboard3DSceneProps["onLoadError"];
  onProjectedBoundsChange: Artboard3DSceneProps["onProjectedBoundsChange"];
  onSelectObject: Artboard3DSceneProps["onSelectObject"];
  selected: boolean;
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
      object={object}
      onProjectedBoundsChange={onProjectedBoundsChange}
      onSelectObject={onSelectObject}
      selected={selected}
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
  object,
  onLoadError,
  onProjectedBoundsChange,
  onSelectObject,
  projectId,
  selected,
}: {
  object: Object3DElement & { source: { assetId: string; kind: "asset" } };
  onLoadError: Artboard3DSceneProps["onLoadError"];
  onProjectedBoundsChange: Artboard3DSceneProps["onProjectedBoundsChange"];
  onSelectObject: Artboard3DSceneProps["onSelectObject"];
  projectId: string;
  selected: boolean;
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
      object={object}
      onProjectedBoundsChange={onProjectedBoundsChange}
      onSelectObject={onSelectObject}
      selected={selected}
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
  interactive = false,
  objects,
  onClearSelection,
  onLoadError,
  onProjectedBoundsChange,
  onSelectObject,
  projectId = "local-project",
  scene,
  selectedObjectIds = [],
}: Artboard3DSceneProps) {
  const settings = resolveScene3DSettings(scene);
  const visibleObjects = objects.filter((object) => object.visible);
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
    >
      <Canvas
        key={settings.projection}
        camera={{
          far: 100000,
          fov: settings.perspective,
          near: 0.1,
          position: [artboardWidth / 2, -artboardHeight / 2, 1000],
          zoom: 1,
        }}
        dpr={[1, 2]}
        flat
        frameloop={usesPhysics ? "always" : "demand"}
        gl={{ alpha: true, antialias: true }}
        onPointerMissed={onClearSelection}
        orthographic={settings.projection === "orthographic"}
        shadows="basic"
      >
        <SceneCamera
          artboardHeight={artboardHeight}
          artboardWidth={artboardWidth}
          scene={settings}
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
        <Interactive3DContext.Provider value={interactive}>
          <Physics3DProvider
            artboardHeight={artboardHeight}
            artboardWidth={artboardWidth}
            proxies={collisionProxies}
          >
            {visibleObjects.map((object) =>
              object.source.kind === "asset" ? (
                <AssetObject
                  key={`${object.id}:${object.source.assetId}:${object.material.useSourceMaterial}`}
                  object={
                    object as Object3DElement & {
                      source: { assetId: string; kind: "asset" };
                    }
                  }
                  onLoadError={onLoadError}
                  onProjectedBoundsChange={onProjectedBoundsChange}
                  onSelectObject={onSelectObject}
                  projectId={projectId}
                  selected={selectedObjectIds.includes(object.id)}
                />
              ) : (
                <GeneratedObject
                  key={object.id}
                  object={object}
                  onLoadError={onLoadError}
                  onProjectedBoundsChange={onProjectedBoundsChange}
                  onSelectObject={onSelectObject}
                  selected={selectedObjectIds.includes(object.id)}
                />
              ),
            )}
          </Physics3DProvider>
        </Interactive3DContext.Provider>
      </Canvas>
    </div>
  );
}
