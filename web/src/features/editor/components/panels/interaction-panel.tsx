/* Interaction authoring panel. The 2D fields are bound to the selected
   element's persisted definitions; the remaining 3D planning UI is local. */

import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { type ReactNode, type SetStateAction, useEffect, useMemo, useState } from "react";

import {
  DesignDropdown,
  DesignNumberField,
  DesignRange,
} from "@/features/editor/components/ui/design-fields";
import {
  SoundPlayButton,
  SoundStepperField,
} from "@/features/editor/components/sound/sound-fields";
import {
  KeyframeTimelineEditor,
  type KeyframeTimelineTrack,
} from "@/features/editor/components/panels/keyframe-timeline-editor";
import {
  collisionInteractionTriggers,
  continuousInteractionTriggers,
  getEffectOptions,
  getMappingOptions,
  getMotionOptions,
  getResetPolicy,
  immediateEffects,
  isLiquidMergeShape,
  mediaInteractionTriggers,
  model3DTriggerOptions,
  modelInteractionTriggers,
  pageInteractionTriggers,
  threeDCollisionTriggerOptions,
  timeInteractionTriggers,
} from "@/features/editor/components/panels/interaction-panel-policy";
import {
  getModelAsset,
  LOCAL_PROJECT_ID,
} from "@/features/editor/three/model-assets";
import {
  createDefaultInteraction,
  type InteractionDefinition,
} from "@/features/editor/lib/interaction-model";
import type { Model3DAssetMetadata } from "@/features/editor/three/types";
import { assetPath } from "@/lib/asset-path";

export type InteractionPanelElement = {
  animationNames?: readonly string[];
  assetId?: string;
  boneNames?: readonly string[];
  id: string;
  jointNames?: readonly string[];
  materialNames?: readonly string[];
  meshFaceGroupNames?: readonly string[];
  meshNames?: readonly string[];
  morphTargetNames?: readonly string[];
  name: string;
  sourceKind?: "asset" | "primitive" | "vector";
  type: string;
};

type TriggerOptionGroup = {
  label: string;
  options: { label: string; value: string }[];
};

const baseTriggerGroups: TriggerOptionGroup[] = [
  {
    label: "Tap & pointer",
    options: [
      { label: "Click / Tap", value: "click-tap" },
      { label: "Double Click / Double Tap", value: "double-click" },
      { label: "Hover", value: "hover" },
      { label: "Touch Start", value: "touch-start" },
      { label: "Touch End", value: "touch-end" },
      { label: "Long Press", value: "long-press" },
    ],
  },
  {
    label: "Continuous",
    options: [
      { label: "Pointer Move / Touch Move", value: "pointer-move" },
      { label: "Drag", value: "drag" },
      { label: "Wheel / Pinch", value: "wheel-pinch" },
      { label: "Scroll / Swipe", value: "scroll-swipe" },
    ],
  },
  {
    label: "Collision",
    options: [
      { label: "Overlap Start", value: "overlap-start" },
      { label: "While Overlapping", value: "while-overlapping" },
      { label: "Overlap End", value: "overlap-end" },
      { label: "Drop On Target", value: "drop-on-target" },
      { label: "Near Target", value: "near-target" },
    ],
  },
  {
    label: "Time",
    options: [
      { label: "After Delay", value: "after-delay" },
      { label: "Repeat Every…", value: "repeat-every" },
      { label: "Idle Start", value: "idle-start" },
      { label: "Idle End", value: "idle-end" },
    ],
  },
  {
    label: "Media",
    options: [
      { label: "Video Starts", value: "video-starts" },
      { label: "Video Ends", value: "video-ends" },
    ],
  },
  {
    label: "Page",
    options: [
      { label: "Page Enter", value: "page-enter" },
      { label: "Page Exit", value: "page-exit" },
    ],
  },
];

const threeDTriggerGroups: TriggerOptionGroup[] = [
  {
    label: "3D collision",
    options: threeDCollisionTriggerOptions,
  },
];

const modelTriggerGroups: TriggerOptionGroup[] = [
  {
    label: "Model animation",
    options: model3DTriggerOptions,
  },
];

const allTriggerGroups = [
  ...baseTriggerGroups,
  ...threeDTriggerGroups,
  ...modelTriggerGroups,
];

const triggerLabels = new Map(
  allTriggerGroups.flatMap((group) =>
    group.options.map((option) => [option.value, option.label] as const),
  ),
);

const sampleInteractions = [
  {
    enabled: true,
    id: "sample-move",
    meta: "X +100 px",
    name: "Move",
    trigger: "click-tap",
  },
  {
    enabled: true,
    id: "sample-scale",
    meta: "120 %",
    name: "Scale",
    trigger: "click-tap",
  },
  {
    enabled: false,
    id: "sample-opacity",
    meta: "→ 40 %",
    name: "Opacity",
    trigger: "hover",
  },
  {
    enabled: true,
    id: "sample-drop",
    meta: "mask reveal",
    name: "Show / Hide",
    trigger: "drop-on-target",
  },
];

function interactionLabel(effect: string) {
  if (effect === "liquid-merge") return "Liquid Merge";
  if (effect === "strand-bend") return "Strand Bend";
  return effect
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function interactionMeta(interaction: InteractionDefinition) {
  if (interaction.effect === "liquid-merge")
    return `Bridge ${interaction.bridgeWidth} px`;
  if (interaction.effect === "strand-bend")
    return `${interaction.strandMaxDisplacement} px`;
  if (interaction.effect === "move") return `X ${interaction.moveX >= 0 ? "+" : ""}${interaction.moveX} px`;
  if (interaction.effect === "scale") return `${interaction.scaleX} %`;
  if (interaction.effect === "opacity") return `→ ${interaction.opacityTo} %`;
  return "";
}

function useInteractionField<Key extends keyof InteractionDefinition>(
  key: Key,
  initialValue: InteractionDefinition[Key],
  binding: {
    interaction: InteractionDefinition | undefined;
    elementId: string | undefined;
    onUpdateInteraction: ((elementId: string, interactionId: string, updates: Partial<InteractionDefinition>) => void) | undefined;
  },
) {
  const { interaction, elementId, onUpdateInteraction } = binding;
  const [localValue, setLocalValue] = useState(initialValue);
  const value = interaction?.[key] ?? localValue;
  const setValue = (next: SetStateAction<InteractionDefinition[Key]>) => {
    const resolved = typeof next === "function"
      ? (next as (previous: InteractionDefinition[Key]) => InteractionDefinition[Key])(value)
      : next;
    if (interaction && elementId && onUpdateInteraction) {
      onUpdateInteraction(elementId, interaction.id, { [key]: resolved } as Partial<InteractionDefinition>);
    } else {
      setLocalValue(resolved);
    }
  };
  return [value, setValue] as const;
}

function GroupedDropdown({
  ariaLabel,
  groups,
  onChange,
  value,
}: {
  ariaLabel: string;
  groups: TriggerOptionGroup[];
  onChange: (value: string) => void;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = triggerLabels.get(value) ?? value;

  return (
    <div
      className="design-dropdown interaction-dropdown"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="design-dropdown-toggle"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="design-dropdown-value">{selectedLabel}</span>
      </button>
      <span aria-hidden="true" className="design-dropdown-icon">
        <ChevronDown size={9} strokeWidth={1.25} />
      </span>
      {open ? (
        <div
          aria-label={`${ariaLabel} menu`}
          className="design-dropdown-menu"
          role="listbox"
        >
          {groups.map((group) => (
            <div className="interaction-menu-section" key={group.label}>
              <span aria-hidden="true" className="interaction-menu-group">
                {group.label}
              </span>
              {group.options.map((option) => (
                <button
                  aria-selected={option.value === value}
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  role="option"
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function InteractionSection({
  cap,
  children,
  title,
}: {
  cap: string;
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="interaction-section">
      <div className="sound-section-heading">
        <h2>{title}</h2>
        <span className="interaction-heading-cap">{cap}</span>
      </div>
      {children}
    </section>
  );
}

function Row({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="sound-control-row">
      <span className="sound-control-label">{label}</span>
      {children}
    </div>
  );
}

function ToggleRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <Row label={label}>
      <button
        aria-label={label}
        aria-pressed={checked}
        className={checked ? "sound-toggle is-active" : "sound-toggle"}
        onClick={onChange}
        type="button"
      >
        <span />
      </button>
    </Row>
  );
}

type ThreeDInteractionState = {
  angularDamping: number;
  animationClip: string;
  animationEnd: number;
  animationLoop: string;
  animationRepeat: number;
  animationSpeed: number;
  animationStart: number;
  attachTarget: string;
  blendWeight: number;
  bodyType: string;
  colliderHeight: number;
  colliderOffsetX: number;
  colliderOffsetY: number;
  colliderOffsetZ: number;
  colliderRadius: number;
  colliderShape: string;
  colliderSizeX: number;
  colliderSizeY: number;
  colliderSizeZ: number;
  collisionLayer: string;
  collisionMask: string;
  collisionTargetMode: string;
  continuousDetection: boolean;
  coordinateSpace: string;
  crossfadeDuration: number;
  customAxisX: number;
  customAxisY: number;
  customAxisZ: number;
  faceTarget: boolean;
  forwardAxis: string;
  freezePositionX: boolean;
  freezePositionY: boolean;
  freezePositionZ: boolean;
  freezeRotationX: boolean;
  freezeRotationY: boolean;
  freezeRotationZ: boolean;
  gravityScale: number;
  isSensor: boolean;
  linearDamping: number;
  lockScale: boolean;
  lookAtTarget: string;
  marker: string;
  mass: number;
  materialProperty: string;
  materialSlot: string;
  materialValue: number;
  minimumImpulse: number;
  morphTarget: string;
  morphWeight: number;
  moveZ: number;
  orbitAngle: number;
  orbitAxis: string;
  orbitRadius: number;
  orbitTarget: string;
  plane: string;
  preserveWorldTransform: boolean;
  resetAngularVelocity: boolean;
  resetAnimation: boolean;
  resetAttachment: boolean;
  resetLinearVelocity: boolean;
  resetMaterial: boolean;
  resetMorph: boolean;
  resetPosition: boolean;
  resetRotation: boolean;
  resetScale: boolean;
  rootMotion: string;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  rotationOrder: string;
  scaleZ: number;
  transformAxis: string;
  transition: string;
};

const defaultThreeDInteractionState: ThreeDInteractionState = {
  angularDamping: 5,
  animationClip: "",
  animationEnd: 0,
  animationLoop: "once",
  animationRepeat: 1,
  animationSpeed: 1,
  animationStart: 0,
  attachTarget: "",
  blendWeight: 100,
  bodyType: "kinematic",
  colliderHeight: 1,
  colliderOffsetX: 0,
  colliderOffsetY: 0,
  colliderOffsetZ: 0,
  colliderRadius: 0.5,
  colliderShape: "auto",
  colliderSizeX: 1,
  colliderSizeY: 1,
  colliderSizeZ: 1,
  collisionLayer: "default",
  collisionMask: "all",
  collisionTargetMode: "selected",
  continuousDetection: false,
  coordinateSpace: "world",
  crossfadeDuration: 0.2,
  customAxisX: 1,
  customAxisY: 0,
  customAxisZ: 0,
  faceTarget: true,
  forwardAxis: "negative-z",
  freezePositionX: false,
  freezePositionY: false,
  freezePositionZ: false,
  freezeRotationX: false,
  freezeRotationY: false,
  freezeRotationZ: false,
  gravityScale: 1,
  isSensor: false,
  linearDamping: 5,
  lockScale: true,
  lookAtTarget: "",
  marker: "",
  mass: 1,
  materialProperty: "color",
  materialSlot: "",
  materialValue: 100,
  minimumImpulse: 0,
  morphTarget: "",
  morphWeight: 100,
  moveZ: 0,
  orbitAngle: 360,
  orbitAxis: "y",
  orbitRadius: 100,
  orbitTarget: "",
  plane: "screen",
  preserveWorldTransform: true,
  resetAngularVelocity: true,
  resetAnimation: true,
  resetAttachment: true,
  resetLinearVelocity: true,
  resetMaterial: true,
  resetMorph: true,
  resetPosition: true,
  resetRotation: true,
  resetScale: true,
  rootMotion: "ignore",
  rotateX: 0,
  rotateY: 0,
  rotateZ: 90,
  rotationOrder: "XYZ",
  scaleZ: 100,
  transformAxis: "free",
  transition: "crossfade",
};

type ExtendedInteractionState = {
  blurAmount: number;
  boneName: string;
  cameraFov: number;
  cameraMoveX: number;
  cameraMoveY: number;
  cameraMoveZ: number;
  cameraProjection: string;
  cameraRotateX: number;
  cameraRotateY: number;
  cameraRotateZ: number;
  cameraShake: number;
  cameraTarget: string;
  cameraZoom: number;
  colorParameter: string;
  colorValue: number;
  emitCollision: boolean;
  emitComplete: boolean;
  emitCustom: boolean;
  emitReset: boolean;
  emitStart: boolean;
  emitTrigger: boolean;
  eventName: string;
  hybridColliderDepth: number;
  hybridColliderMode: string;
  hybridZ: number;
  jointName: string;
  lightColor: string;
  lightProperty: string;
  lightType: string;
  lightValue: number;
  meshFaceGroup: string;
  meshFaceFrom: number;
  meshFaceIndex: number;
  meshFaceMode: string;
  meshFaceTo: number;
  meshName: string;
  meshVisible: boolean;
  modelTargetX: number;
  modelTargetY: number;
  modelTargetZ: number;
  modelTransformProperty: string;
  postAmount: number;
  postEffect: string;
  shaderUniform: string;
  shaderColor: string;
  shaderUniformType: string;
  shaderValueX: number;
  shaderValueY: number;
  shaderValueZ: number;
  shaderValueW: number;
  shadowBlur: number;
  shadowMapQuality: string;
  shadowOpacity: number;
  shadowSpread: number;
  shadowX: number;
  shadowY: number;
  shadowZ: number;
  toneMapping: string;
  useHdr: boolean;
  visualQuality: string;
};

const defaultExtendedInteractionState: ExtendedInteractionState = {
  blurAmount: 20,
  boneName: "",
  cameraFov: 35,
  cameraMoveX: 0,
  cameraMoveY: 0,
  cameraMoveZ: 100,
  cameraProjection: "orthographic",
  cameraRotateX: 0,
  cameraRotateY: 0,
  cameraRotateZ: 0,
  cameraShake: 30,
  cameraTarget: "selected",
  cameraZoom: 120,
  colorParameter: "brightness",
  colorValue: 100,
  emitCollision: true,
  emitComplete: true,
  emitCustom: false,
  emitReset: true,
  emitStart: true,
  emitTrigger: true,
  eventName: "",
  hybridColliderDepth: 20,
  hybridColliderMode: "extruded-shape",
  hybridZ: 0,
  jointName: "",
  lightColor: "#ffffff",
  lightProperty: "intensity",
  lightType: "ambient",
  lightValue: 100,
  meshFaceGroup: "",
  meshFaceFrom: 0,
  meshFaceIndex: 0,
  meshFaceMode: "material-group",
  meshFaceTo: 0,
  meshName: "",
  meshVisible: true,
  modelTargetX: 0,
  modelTargetY: 0,
  modelTargetZ: 0,
  modelTransformProperty: "rotation",
  postAmount: 50,
  postEffect: "bloom",
  shaderUniform: "uProgress",
  shaderColor: "#ab51f0",
  shaderUniformType: "float",
  shaderValueX: 1,
  shaderValueY: 0,
  shaderValueZ: 0,
  shaderValueW: 0,
  shadowBlur: 12,
  shadowMapQuality: "medium",
  shadowOpacity: 40,
  shadowSpread: 0,
  shadowX: 4,
  shadowY: 4,
  shadowZ: 0,
  toneMapping: "aces",
  useHdr: false,
  visualQuality: "balanced",
};

function axisTimelineTracks(
  label: string,
  propertyPrefix: string,
  values: readonly [number, number, number],
  unit: string,
): KeyframeTimelineTrack[] {
  return (["X", "Y", "Z"] as const).map((axis, index) => ({
    defaultValue: values[index],
    label: `${label} ${axis}`,
    property: `custom:${propertyPrefix}-${axis.toLowerCase()}`,
    unit,
  }));
}

function numericTimelineTrack(
  label: string,
  property: string,
  defaultValue: number,
  unit: string,
): KeyframeTimelineTrack {
  return {
    defaultValue,
    label,
    property: `custom:${property}`,
    unit,
  };
}

export function InteractionPanel({
  elements = [],
  interactionsByElement,
  onAddInteraction,
  onRemoveInteraction,
  onUpdateInteraction,
  projectId = LOCAL_PROJECT_ID,
  selectedElementIds = [],
  selectedName,
  selectedTypes = [],
}: {
  elements?: readonly InteractionPanelElement[];
  interactionsByElement?: Record<string, InteractionDefinition[]>;
  onAddInteraction?: (elementId: string, interaction: InteractionDefinition) => void;
  onRemoveInteraction?: (elementId: string, interactionId: string) => void;
  onUpdateInteraction?: (elementId: string, interactionId: string, updates: Partial<InteractionDefinition>) => void;
  projectId?: string;
  selectedElementIds?: readonly string[];
  selectedName: string | null;
  selectedTypes?: readonly string[];
}) {
  const noop = () => {};
  const selectedEntries = useMemo(
    () => elements.filter((element) => selectedElementIds.includes(element.id)),
    [elements, selectedElementIds],
  );
  const is3DSelection =
    selectedTypes.length > 0 &&
    selectedTypes.every((type) => type === "object3d");
  const sharedSourceKind = is3DSelection
    ? selectedEntries[0]?.sourceKind
    : undefined;
  const selectedAssetId = is3DSelection
    ? selectedEntries.find((element) => element.assetId)?.assetId
    : undefined;
  const [loadedAssetMetadata, setLoadedAssetMetadata] =
    useState<Model3DAssetMetadata | null>(null);

  useEffect(() => {
    if (
      !selectedAssetId ||
      selectedEntries.some(
        (element) =>
          element.animationNames !== undefined ||
          element.boneNames !== undefined ||
          element.jointNames !== undefined ||
          element.materialNames !== undefined ||
          element.meshFaceGroupNames !== undefined ||
          element.meshNames !== undefined ||
          element.morphTargetNames !== undefined,
      )
    )
      return;
    let active = true;
    void getModelAsset(projectId, selectedAssetId)
      .then((record) => {
        if (active && record) setLoadedAssetMetadata(record.metadata);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [projectId, selectedAssetId, selectedEntries]);

  const animationNames = useMemo(
    () =>
      Array.from(
        new Set([
          ...selectedEntries.flatMap((element) => element.animationNames ?? []),
          ...(loadedAssetMetadata && loadedAssetMetadata.id === selectedAssetId
            ? loadedAssetMetadata.animationNames
            : []),
        ]),
      ),
    [loadedAssetMetadata, selectedAssetId, selectedEntries],
  );
  const materialNames = useMemo(
    () =>
      Array.from(
        new Set([
          ...selectedEntries.flatMap((element) => element.materialNames ?? []),
          ...(loadedAssetMetadata && loadedAssetMetadata.id === selectedAssetId
            ? loadedAssetMetadata.materialNames
            : []),
        ]),
      ),
    [loadedAssetMetadata, selectedAssetId, selectedEntries],
  );
  const boneNames = useMemo(
    () =>
      Array.from(
        new Set([
          ...selectedEntries.flatMap((element) => element.boneNames ?? []),
          ...(loadedAssetMetadata && loadedAssetMetadata.id === selectedAssetId
            ? loadedAssetMetadata.boneNames
            : []),
        ]),
      ),
    [loadedAssetMetadata, selectedAssetId, selectedEntries],
  );
  const jointNames = useMemo(
    () =>
      Array.from(
        new Set([
          ...selectedEntries.flatMap((element) => element.jointNames ?? []),
          ...(loadedAssetMetadata && loadedAssetMetadata.id === selectedAssetId
            ? loadedAssetMetadata.jointNames
            : []),
        ]),
      ),
    [loadedAssetMetadata, selectedAssetId, selectedEntries],
  );
  const meshNames = useMemo(
    () =>
      Array.from(
        new Set([
          ...selectedEntries.flatMap((element) => element.meshNames ?? []),
          ...(loadedAssetMetadata && loadedAssetMetadata.id === selectedAssetId
            ? loadedAssetMetadata.meshNames
            : []),
        ]),
      ),
    [loadedAssetMetadata, selectedAssetId, selectedEntries],
  );
  const meshFaceGroupNames = useMemo(
    () =>
      Array.from(
        new Set([
          ...selectedEntries.flatMap(
            (element) => element.meshFaceGroupNames ?? [],
          ),
          ...(loadedAssetMetadata && loadedAssetMetadata.id === selectedAssetId
            ? loadedAssetMetadata.meshFaceGroupNames
            : []),
        ]),
      ),
    [loadedAssetMetadata, selectedAssetId, selectedEntries],
  );
  const morphTargetNames = useMemo(
    () =>
      Array.from(
        new Set([
          ...selectedEntries.flatMap(
            (element) => element.morphTargetNames ?? [],
          ),
          ...(loadedAssetMetadata && loadedAssetMetadata.id === selectedAssetId
            ? loadedAssetMetadata.morphTargetNames
            : []),
        ]),
      ),
    [loadedAssetMetadata, selectedAssetId, selectedEntries],
  );
  const contains3DObjects = elements.some(
    (element) => element.type === "object3d",
  );
  const contains2DObjects = elements.some(
    (element) => element.type !== "object3d",
  );
  const is2DSelection =
    selectedTypes.length > 0 &&
    selectedTypes.every((type) => type !== "object3d");
  const isHybridCollisionAvailable =
    (is2DSelection && contains3DObjects) ||
    (is3DSelection && contains2DObjects);
  const threeDContext = {
    animationNames,
    hasBones: boneNames.length > 0,
    hasJoints: jointNames.length > 0,
    hasMaterialSlots: materialNames.length > 0,
    hasMeshFaceGroups: meshFaceGroupNames.length > 0,
    hasMeshes: meshNames.length > 0,
    hasMorphTargets: morphTargetNames.length > 0,
    is3D: is3DSelection,
    isHybridCollision: isHybridCollisionAvailable,
    sourceKind: sharedSourceKind,
  };
  const triggerGroups = [
    ...baseTriggerGroups,
    ...(is3DSelection || isHybridCollisionAvailable ? threeDTriggerGroups : []),
    ...(is3DSelection && animationNames.length > 0 ? modelTriggerGroups : []),
  ];
  const [sampleRows, setSampleRows] = useState(sampleInteractions);
  const [selectedId, setSelectedId] = useState("sample-move");
  const [openMoreId, setOpenMoreId] = useState<string | null>(null);
  const selectedElementId = selectedElementIds[0];
  const authoredInteractions = selectedElementId
    ? (interactionsByElement?.[selectedElementId] ?? [])
    : [];
  const authoredMode = interactionsByElement !== undefined;
  const activeSelectedId = authoredMode && !authoredInteractions.some((item) => item.id === selectedId)
    ? (authoredInteractions[0]?.id ?? "")
    : selectedId;
  const authoredInteraction = authoredInteractions.find((item) => item.id === activeSelectedId);
  const binding = { interaction: authoredInteraction, elementId: selectedElementId, onUpdateInteraction };
  const interactions = authoredMode
    ? authoredInteractions.map((item) => ({
        enabled: item.enabled,
        id: item.id,
        meta: interactionMeta(item),
        name: item.name || interactionLabel(item.effect),
        trigger: item.trigger,
      }))
    : sampleRows;
  const addInteraction = (nextTrigger = "click-tap") => {
    if (!selectedElementId || !onAddInteraction) return;
    const interaction = createDefaultInteraction({
      trigger: nextTrigger,
      mapping: getMappingOptions(nextTrigger, threeDContext)[0]?.value ?? "",
      name: "Move",
    });
    onAddInteraction(selectedElementId, interaction);
    setSelectedId(interaction.id);
  };

  const [trigger, setTrigger] = useInteractionField("trigger", "click-tap", binding);
  const [triggerArea, setTriggerArea] = useInteractionField("triggerArea", "selected-object", binding);
  const [sourceVideo, setSourceVideo] = useInteractionField("sourceVideo", "", binding);
  const [fallback, setFallback] = useInteractionField("fallback", "tap", binding);
  const [longPressSeconds, setLongPressSeconds] = useInteractionField("longPressSeconds", 0.5, binding);
  const [collisionTarget, setCollisionTarget] = useInteractionField("collisionTarget", "", binding);
  const [detection, setDetection] = useInteractionField("detection", "bounding-box", binding);
  const [joinDistance, setJoinDistance] = useInteractionField("joinDistance", 30, binding);
  const [releaseDistance, setReleaseDistance] = useInteractionField("releaseDistance", 45, binding);
  const [timeSeconds, setTimeSeconds] = useInteractionField("timeSeconds", 5, binding);

  const [mapping, setMapping] = useInteractionField("mapping", "drag-progress", binding);
  const [pointerAxis, setPointerAxis] = useInteractionField("pointerAxis", "both", binding);
  const [mappingMode, setMappingMode] = useInteractionField("mappingMode", "follow", binding);
  const [trackDistance, setTrackDistance] = useInteractionField("trackDistance", 300, binding);
  const [dragAxis, setDragAxis] = useInteractionField("dragAxis", "free", binding);
  const [rangeMin, setRangeMin] = useInteractionField("rangeMin", 0, binding);
  const [rangeMax, setRangeMax] = useInteractionField("rangeMax", 100, binding);
  const [threshold, setThreshold] = useInteractionField("threshold", 80, binding);

  const [effect, setEffect] = useInteractionField("effect", "move", binding);
  const [groupEffect, setGroupEffect] = useInteractionField("groupEffect", "move", binding);
  const [moveX, setMoveX] = useInteractionField("moveX", 100, binding);
  const [moveY, setMoveY] = useInteractionField("moveY", 0, binding);
  const [movePath, setMovePath] = useInteractionField("movePath", "straight", binding);
  const [referencePoint, setReferencePoint] = useInteractionField("referencePoint", "center", binding);
  const [scaleX, setScaleX] = useInteractionField("scaleX", 120, binding);
  const [scaleY, setScaleY] = useInteractionField("scaleY", 120, binding);
  const [rotateTo, setRotateTo] = useInteractionField("rotateTo", 45, binding);
  const [skewX, setSkewX] = useInteractionField("skewX", 12, binding);
  const [skewY, setSkewY] = useInteractionField("skewY", 0, binding);
  const [opacityTo, setOpacityTo] = useInteractionField("opacityTo", 40, binding);
  const [blurAmount, setBlurAmount] = useInteractionField("blurAmount", 6, binding);
  const [shadowX, setShadowX] = useInteractionField("shadowX", 0, binding);
  const [shadowY, setShadowY] = useInteractionField("shadowY", 12, binding);
  const [shadowBlur, setShadowBlur] = useInteractionField("shadowBlur", 24, binding);
  const [bridgeWidth, setBridgeWidth] = useInteractionField("bridgeWidth", 50, binding);
  const [liquidAttraction, setLiquidAttraction] = useInteractionField("liquidAttraction", 0, binding);
  const [liquidSmoothness, setLiquidSmoothness] = useInteractionField("liquidSmoothness", 60, binding);
  const [strandAnchor, setStrandAnchor] = useInteractionField("strandAnchor", "top", binding);
  const [strandStiffness, setStrandStiffness] = useInteractionField("strandStiffness", 0.45, binding);
  const [strandDamping, setStrandDamping] = useInteractionField("strandDamping", 0.82, binding);
  const [strandInfluenceRadius, setStrandInfluenceRadius] = useInteractionField("strandInfluenceRadius", 90, binding);
  const [strandMaxDisplacement, setStrandMaxDisplacement] = useInteractionField("strandMaxDisplacement", 140, binding);
  const [strandNeighborRadius, setStrandNeighborRadius] = useInteractionField("strandNeighborRadius", 0, binding);
  const [strandNeighborStrength, setStrandNeighborStrength] = useInteractionField("strandNeighborStrength", 0, binding);
  const [affectedObjects, setAffectedObjects] = useInteractionField("affectedObjects", "selected", binding);
  const [impactBounciness, setImpactBounciness] = useInteractionField("impactBounciness", 65, binding);
  const [impactMass, setImpactMass] = useInteractionField("impactMass", 1, binding);
  const [targetMass, setTargetMass] = useInteractionField("targetMass", 1, binding);
  const [impactFriction, setImpactFriction] = useInteractionField("impactFriction", 20, binding);

  const [motion, setMotion] = useInteractionField("motion", "spring", binding);
  const [springStrength, setSpringStrength] = useInteractionField("springStrength", 100, binding);
  const [springMass, setSpringMass] = useInteractionField("springMass", 1, binding);
  const [springDamping, setSpringDamping] = useInteractionField("springDamping", 12, binding);
  const [initialVelocity, setInitialVelocity] = useInteractionField("initialVelocity", 100, binding);
  const [friction, setFriction] = useInteractionField("friction", 50, binding);
  const [deceleration, setDeceleration] = useInteractionField("deceleration", 50, binding);
  const [bounceStrength, setBounceStrength] = useInteractionField("bounceStrength", 100, binding);
  const [bounceCount, setBounceCount] = useInteractionField("bounceCount", 2, binding);
  const [bounceDamping, setBounceDamping] = useInteractionField("bounceDamping", 12, binding);
  const [bounceOff, setBounceOff] = useInteractionField("bounceOff", "artboard", binding);
  const [gravityContact, setGravityContact] = useInteractionField("gravityContact", "bounce", binding);
  const [stackColliders, setStackColliders] = useInteractionField("stackColliders", "physics", binding);
  const [stackObstacleIds, setStackObstacleIds] = useInteractionField("stackObstacleIds", [] as string[], binding);
  const [stackMass, setStackMass] = useInteractionField("stackMass", 1, binding);
  const [stackFriction, setStackFriction] = useInteractionField("stackFriction", 25, binding);
  const [stackSleepSpeed, setStackSleepSpeed] = useInteractionField("stackSleepSpeed", 5, binding);
  const [gravityStrength, setGravityStrength] = useInteractionField("gravityStrength", 100, binding);
  const [bounciness, setBounciness] = useInteractionField("bounciness", 50, binding);
  const [gravityDirection, setGravityDirection] = useInteractionField("gravityDirection", "down", binding);

  const [duration, setDuration] = useInteractionField("duration", 0.3, binding);
  const [delay, setDelay] = useInteractionField("delay", 0, binding);
  const [stagger, setStagger] = useInteractionField("stagger", 0.05, binding);
  const [easing, setEasing] = useInteractionField("easing", "ease-out", binding);
  const [smoothing, setSmoothing] = useInteractionField("smoothing", 0.1, binding);
  const [continuousEasing, setContinuousEasing] = useInteractionField("continuousEasing", "linear", binding);

  const [resetMode, setResetMode] = useInteractionField("resetMode", "contextual", binding);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [keyframeEditorOpen, setKeyframeEditorOpen] = useState(false);
  const [sameProperty, setSameProperty] = useInteractionField("sameProperty", "replace", binding);
  const [otherProperty, setOtherProperty] = useInteractionField("otherProperty", "parallel", binding);
  const [repeat, setRepeat] = useInteractionField("repeat", 1, binding);
  const [yoyo, setYoyo] = useInteractionField("yoyo", false, binding);
  const [hold, setHold] = useInteractionField("hold", 0, binding);
  const [cursor, setCursor] = useInteractionField("cursor", "pointer", binding);
  const [threeD, setThreeD] = useState(defaultThreeDInteractionState);
  const setThreeDValue = <Key extends keyof ThreeDInteractionState>(
    key: Key,
    value: ThreeDInteractionState[Key],
  ) => setThreeD((current) => ({ ...current, [key]: value }));
  const [extended, setExtended] = useState(defaultExtendedInteractionState);
  const setExtendedValue = <Key extends keyof ExtendedInteractionState>(
    key: Key,
    value: ExtendedInteractionState[Key],
  ) => setExtended((current) => ({ ...current, [key]: value }));

  const isContinuous = continuousInteractionTriggers.has(trigger);
  const isCollision = collisionInteractionTriggers.has(trigger);
  const isPhysicalCollision = threeDCollisionTriggerOptions.some(
    (option) => option.value === trigger,
  );
  const isTime = timeInteractionTriggers.has(trigger);
  const isMedia = mediaInteractionTriggers.has(trigger);
  const isModelTrigger = modelInteractionTriggers.has(trigger);
  const showTriggerArea =
    !isTime &&
    !isMedia &&
    !isModelTrigger &&
    !pageInteractionTriggers.has(trigger);
  const mappingChoices = getMappingOptions(trigger, threeDContext);
  const showMapping = mappingChoices.length > 0;
  const selectedMapping = mappingChoices.some(
    (option) => option.value === mapping,
  )
    ? mapping
    : (mappingChoices[0]?.value ?? "");
  const effectChoices = getEffectOptions(selectedTypes, trigger, threeDContext);
  const selectedEffect = effectChoices.some((option) => option.value === effect)
    ? effect
    : effectChoices[0].value;
  const activeEffect =
    selectedEffect === "group-animation" ? groupEffect : selectedEffect;
  const isLiquidMerge = activeEffect === "liquid-merge";
  const isCollisionBounce = activeEffect === "collision-bounce";
  const isModelAnimationEffect = [
    "play-model-animation",
    "pause-model-animation",
    "resume-model-animation",
    "stop-model-animation",
    "change-model-animation",
    "seek-model-animation",
    "crossfade-model-animation",
  ].includes(activeEffect);
  const isMaterialEffect = [
    "change-material",
    "material-parameter",
    "material-slot",
  ].includes(activeEffect);
  const isMorphEffect = activeEffect === "morph-target";
  const isCameraEffect = activeEffect.startsWith("camera-");
  const isVisualPipelineEffect = [
    "blur",
    "color",
    "shadow",
    "animate-lighting",
    "post-processing",
    "shader-parameter",
  ].includes(activeEffect);
  const isModelStructureEffect = [
    "bone-transform",
    "joint-rotation",
    "mesh-transform",
    "mesh-visibility",
    "mesh-face-material",
  ].includes(activeEffect);
  const isPairEffect = isLiquidMerge || isCollisionBounce;
  const isImmediate = immediateEffects.has(activeEffect);
  const selectedMappingMode =
    isLiquidMerge && showMapping
      ? "follow"
      : isImmediate && showMapping
        ? "threshold"
        : mappingMode;
  const eventTiming = !isContinuous || selectedMappingMode === "threshold";
  const motionChoices = getMotionOptions(
    trigger,
    selectedMapping,
    selectedEffect,
    groupEffect,
  );
  const selectedMotion = motionChoices.some((option) => option.value === motion)
    ? motion
    : (motionChoices[0]?.value ?? "direct");
  const isStacking =
    activeEffect === "stack-on-target" ||
    (selectedMotion === "gravity" && gravityContact === "stack");
  const isSpatialPhysicsSelection = is3DSelection || isPhysicalCollision;
  const resetPolicy = getResetPolicy(
    trigger,
    fallback,
    activeEffect,
    isStacking,
    threeDContext,
  );
  const selectedReset = resetPolicy.options.some(
    (option) => option.value === resetMode,
  )
    ? resetMode
    : "contextual";
  const obstacleChoices = elements.filter(
    (element) => !selectedElementIds.includes(element.id),
  );
  const targetChoices = obstacleChoices
    .filter((element) => {
      if (isPhysicalCollision && is2DSelection)
        return element.type === "object3d";
      if (isPhysicalCollision && is3DSelection) return true;
      if (isLiquidMerge && is3DSelection) return element.type === "object3d";
      return !isLiquidMerge || isLiquidMergeShape(element.type);
    })
    .map((element) => ({
      label: `${element.name} (${element.type})`,
      value: element.id,
    }));
  const selectedCollisionTarget = targetChoices.some(
    (option) => option.value === collisionTarget,
  )
    ? collisionTarget
    : (targetChoices[0]?.value ?? "");
  const selectedAnimationClip = animationNames.includes(threeD.animationClip)
    ? threeD.animationClip
    : (animationNames[0] ?? "");
  const selectedMaterialSlot =
    threeD.materialSlot === "all" || materialNames.includes(threeD.materialSlot)
      ? threeD.materialSlot
      : (materialNames[0] ?? "all");
  const selectedMorphTarget = morphTargetNames.includes(threeD.morphTarget)
    ? threeD.morphTarget
    : (morphTargetNames[0] ?? "");
  const selectedBoneName = boneNames.includes(extended.boneName)
    ? extended.boneName
    : (boneNames[0] ?? "");
  const selectedJointName = jointNames.includes(extended.jointName)
    ? extended.jointName
    : (jointNames[0] ?? "");
  const selectedMeshName = meshNames.includes(extended.meshName)
    ? extended.meshName
    : (meshNames[0] ?? "");
  const selectedMeshFaceGroup = meshFaceGroupNames.includes(
    extended.meshFaceGroup,
  )
    ? extended.meshFaceGroup
    : (meshFaceGroupNames[0] ?? "");
  let effectTimelineTracks: KeyframeTimelineTrack[] = [];
  let virtualTimelineTargetName = "";
  switch (activeEffect) {
    case "camera-move":
      virtualTimelineTargetName = "Artwork Camera";
      effectTimelineTracks = axisTimelineTracks(
        "Camera Position",
        "camera-position",
        [extended.cameraMoveX, extended.cameraMoveY, extended.cameraMoveZ],
        "px",
      );
      break;
    case "camera-rotate":
      virtualTimelineTargetName = "Artwork Camera";
      effectTimelineTracks = axisTimelineTracks(
        "Camera Rotation",
        "camera-rotation",
        [
          extended.cameraRotateX,
          extended.cameraRotateY,
          extended.cameraRotateZ,
        ],
        "°",
      );
      break;
    case "camera-zoom":
      virtualTimelineTargetName = "Artwork Camera";
      effectTimelineTracks = [
        numericTimelineTrack(
          "Camera Zoom / Dolly",
          "camera-zoom",
          extended.cameraZoom,
          "%",
        ),
      ];
      break;
    case "camera-look-at":
      virtualTimelineTargetName = "Artwork Camera";
      effectTimelineTracks = axisTimelineTracks(
        "Look At Target",
        "camera-look-at",
        [0, 0, 0],
        "px",
      );
      break;
    case "camera-shake":
      virtualTimelineTargetName = "Artwork Camera";
      effectTimelineTracks = [
        numericTimelineTrack(
          "Camera Shake Strength",
          "camera-shake",
          extended.cameraShake,
          "%",
        ),
      ];
      break;
    case "blur":
      effectTimelineTracks = [
        numericTimelineTrack(
          "Blur Amount",
          "blur-amount",
          extended.blurAmount,
          "px",
        ),
      ];
      break;
    case "color":
      effectTimelineTracks = [
        numericTimelineTrack(
          `Color · ${extended.colorParameter}`,
          `color-${extended.colorParameter}`,
          extended.colorValue,
          "%",
        ),
      ];
      break;
    case "shadow":
      effectTimelineTracks = [
        ...axisTimelineTracks(
          "Shadow Offset",
          "shadow-offset",
          [extended.shadowX, extended.shadowY, extended.shadowZ],
          "px",
        ).filter((track) => is3DSelection || !track.label.endsWith(" Z")),
        numericTimelineTrack(
          "Shadow Blur",
          "shadow-blur",
          extended.shadowBlur,
          "px",
        ),
        numericTimelineTrack(
          "Shadow Spread",
          "shadow-spread",
          extended.shadowSpread,
          "px",
        ),
        numericTimelineTrack(
          "Shadow Opacity",
          "shadow-opacity",
          extended.shadowOpacity,
          "%",
        ),
      ];
      break;
    case "animate-lighting":
      virtualTimelineTargetName = "Scene Lighting";
      effectTimelineTracks = [
        numericTimelineTrack(
          `Light · ${extended.lightProperty}`,
          `light-${extended.lightType}-${extended.lightProperty}`,
          extended.lightValue,
          extended.lightProperty === "rotation" ? "°" : "%",
        ),
      ];
      break;
    case "post-processing":
      virtualTimelineTargetName = "Post Processing";
      effectTimelineTracks = [
        numericTimelineTrack(
          `Post · ${extended.postEffect}`,
          `post-${extended.postEffect}`,
          extended.postAmount,
          "%",
        ),
      ];
      break;
    case "shader-parameter": {
      virtualTimelineTargetName = "Shader";
      const channelCount =
        extended.shaderUniformType === "vec4"
          ? 4
          : extended.shaderUniformType === "vec3" ||
              extended.shaderUniformType === "color"
            ? 3
            : extended.shaderUniformType === "vec2"
              ? 2
              : 1;
      const shaderValues = [
        extended.shaderValueX,
        extended.shaderValueY,
        extended.shaderValueZ,
        extended.shaderValueW,
      ];
      effectTimelineTracks = ["X", "Y", "Z", "W"]
        .slice(0, channelCount)
        .map((axis, index) =>
          numericTimelineTrack(
            `${extended.shaderUniform} ${axis}`,
            `shader-${extended.shaderUniform}-${axis.toLowerCase()}`,
            shaderValues[index],
            "",
          ),
        );
      break;
    }
    case "bone-transform":
    case "joint-rotation":
    case "mesh-transform": {
      const partName =
        activeEffect === "bone-transform"
          ? selectedBoneName
          : activeEffect === "joint-rotation"
            ? selectedJointName
            : selectedMeshName;
      const property =
        activeEffect === "joint-rotation"
          ? "rotation"
          : extended.modelTransformProperty;
      effectTimelineTracks = axisTimelineTracks(
        `${partName || "Model part"} · ${property}`,
        `${activeEffect}-${partName || "part"}-${property}`,
        [extended.modelTargetX, extended.modelTargetY, extended.modelTargetZ],
        property === "rotation" ? "°" : property === "scale" ? "%" : "px",
      );
      break;
    }
  }
  if (isCameraEffect && extended.cameraProjection === "perspective") {
    effectTimelineTracks.push(
      numericTimelineTrack(
        "Camera Field of View",
        "camera-fov",
        extended.cameraFov,
        "°",
      ),
    );
  }
  const selectedTimelineObjects =
    selectedEntries.length > 0
      ? selectedEntries
      : selectedName
        ? [
            {
              id: "interaction-preview-selection",
              name: selectedName,
              type: is3DSelection ? "object3d" : (selectedTypes[0] ?? "shape"),
            },
          ]
        : [];
  const keyframeObjects = virtualTimelineTargetName
    ? [
        {
          additionalTracks: effectTimelineTracks,
          dimension: "3d" as const,
          id: `timeline-${activeEffect}`,
          includeBaseTracks: false,
          name: virtualTimelineTargetName,
        },
      ]
    : selectedTimelineObjects.map((element) => ({
        additionalTracks: effectTimelineTracks,
        dimension:
          element.type === "object3d" ? ("3d" as const) : ("2d" as const),
        id: element.id,
        includeBaseTracks: !isModelStructureEffect,
        materialNames:
          element.type === "object3d" && !isModelStructureEffect
            ? materialNames
            : undefined,
        morphTargetNames:
          element.type === "object3d" && !isModelStructureEffect
            ? morphTargetNames
            : undefined,
        name: element.name,
      }));
  const showThreeDMappingFrame =
    is3DSelection &&
    [
      "position-3d",
      "surface-position",
      "depth-progress",
      "distance-3d",
    ].includes(selectedMapping);

  const groupOrder: string[] = [];
  for (const interaction of interactions) {
    if (!groupOrder.includes(interaction.trigger)) {
      groupOrder.push(interaction.trigger);
    }
  }

  return (
    <section
      aria-label="Interaction settings"
      className="interaction-properties"
      role="tabpanel"
    >
      <div className="interaction-header">
        <div className="interaction-selected">
          <span>Selected</span>
          <strong>
            {selectedTypes.length > 1
              ? `${selectedTypes.length} objects`
              : (selectedName ?? "No selection")}
          </strong>
          {is3DSelection ? (
            <span className="interaction-3d-badge">
              3D · {sharedSourceKind ?? "mixed"}
            </span>
          ) : null}
        </div>
        <button
          className="interaction-add-button"
          disabled={authoredMode && !selectedElementId}
          onClick={() => addInteraction()}
          type="button"
        >
          + Add interaction
        </button>
      </div>

      <div className="interaction-list">
        {groupOrder.map((groupTrigger) => (
          <div className="interaction-group" key={groupTrigger}>
            <div className="interaction-group-head">
              <span>{triggerLabels.get(groupTrigger)}</span>
              <button
                className="interaction-add-effect"
                onClick={() => addInteraction(groupTrigger)}
                type="button"
              >
                + Add effect
              </button>
            </div>
            {interactions
              .filter((interaction) => interaction.trigger === groupTrigger)
              .map((interaction) => (
                <div
                  className={[
                    "interaction-row",
                    interaction.id === activeSelectedId ? "is-selected" : "",
                    interaction.enabled ? "" : "is-disabled",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={interaction.id}
                  onClick={() => setSelectedId(interaction.id)}
                >
                  <SoundPlayButton
                    label={`Preview ${interaction.name}`}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <button
                    aria-label={`Toggle ${interaction.name}`}
                    aria-pressed={interaction.enabled}
                    className={
                      interaction.enabled
                        ? "sound-toggle is-active"
                        : "sound-toggle"
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      if (authoredMode && selectedElementId && onUpdateInteraction)
                        onUpdateInteraction(selectedElementId, interaction.id, { enabled: !interaction.enabled });
                      else setSampleRows((current) => current.map((item) =>
                        item.id === interaction.id ? { ...item, enabled: !item.enabled } : item,
                      ));
                    }}
                    type="button"
                  >
                    <span />
                  </button>
                  <span className="interaction-row-name">
                    {interaction.name}
                  </span>
                  <span className="interaction-row-meta">
                    {interaction.meta}
                  </span>
                  <button
                    aria-label={`${interaction.name} options`}
                    className="interaction-row-more"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMoreId((current) => current === interaction.id ? null : interaction.id);
                    }}
                    type="button"
                  >
                    ⋯
                  </button>
                  {openMoreId === interaction.id ? (
                    <button
                      aria-label={`Delete ${interaction.name}`}
                      className="interaction-row-more"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (authoredMode && selectedElementId && onRemoveInteraction)
                          onRemoveInteraction(selectedElementId, interaction.id);
                        else setSampleRows((current) => current.filter((item) => item.id !== interaction.id));
                        setOpenMoreId(null);
                      }}
                      type="button"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              ))}
          </div>
        ))}
      </div>

      <InteractionSection cap="Trigger" title="1. WHEN">
        <Row label="Trigger">
          <GroupedDropdown
            ariaLabel="Trigger"
            groups={triggerGroups}
            onChange={(nextTrigger) => {
              const nextMapping = getMappingOptions(nextTrigger, threeDContext)[0]?.value ?? "";
              const effectIsSupported = getEffectOptions(
                selectedTypes,
                nextTrigger,
                threeDContext,
              ).some((option) => option.value === effect);
              if (authoredInteraction && selectedElementId && onUpdateInteraction) {
                onUpdateInteraction(selectedElementId, authoredInteraction.id, {
                  trigger: nextTrigger,
                  mapping: nextMapping,
                  mappingMode: "follow",
                  resetMode: "contextual",
                  ...(!effectIsSupported ? { effect: "move", name: "Move" } : {}),
                });
                return;
              }
              setTrigger(nextTrigger);
              setMapping(nextMapping);
              setMappingMode("follow");
              setResetMode("contextual");
              if (!effectIsSupported) {
                setEffect("move");
              }
            }}
            value={trigger}
          />
        </Row>
        {showTriggerArea ? (
          <Row label="Trigger area">
            <DesignDropdown
              ariaLabel="Trigger area"
              className="interaction-dropdown"
              noScroll
              onChange={setTriggerArea}
              options={[
                { label: "Selected object", value: "selected-object" },
                { label: "Entire artwork", value: "entire-artwork" },
                { label: "Draw detail area…", value: "draw-detail-area" },
              ]}
              value={triggerArea}
            />
          </Row>
        ) : null}
        {isMedia ? (
          <>
            <Row label="Source video">
              <DesignDropdown
                ariaLabel="Source video"
                className="interaction-dropdown"
                disabled
                noScroll
                onChange={setSourceVideo}
                options={[{ label: "No video on this page", value: "" }]}
                value={sourceVideo}
              />
            </Row>
            <p className="interaction-note">
              Select a video once video elements are available in the editor.
            </p>
          </>
        ) : null}
        {trigger === "hover" ? (
          <>
            <Row label="Mobile fallback">
              <DesignDropdown
                ariaLabel="Mobile fallback"
                className="interaction-dropdown"
                noScroll
                onChange={setFallback}
                options={[
                  { label: "Tap", value: "tap" },
                  { label: "Touch Start", value: "touch-start" },
                  { label: "Long Press", value: "long-press" },
                ]}
                value={fallback}
              />
            </Row>
            <p className="interaction-note">
              Tap toggles · Touch Start and Long Press hover while held
            </p>
          </>
        ) : null}
        {trigger === "long-press" ||
        (trigger === "hover" && fallback === "long-press") ? (
          <Row label="Hold duration">
            <SoundStepperField
              ariaLabel="Long press duration"
              min={0.1}
              onBegin={noop}
              onChange={setLongPressSeconds}
              value={longPressSeconds}
            />
          </Row>
        ) : null}
        {isCollision ? (
          <>
            {isPhysicalCollision ? (
              <Row label="Target mode">
                <DesignDropdown
                  ariaLabel="3D collision target mode"
                  className="interaction-dropdown"
                  noScroll
                  onChange={(value) =>
                    setThreeDValue("collisionTargetMode", value)
                  }
                  options={[
                    { label: "Selected spatial object", value: "selected" },
                    { label: "Any compatible object", value: "any" },
                    { label: "Object group", value: "group" },
                  ]}
                  value={threeD.collisionTargetMode}
                />
              </Row>
            ) : null}
            {threeD.collisionTargetMode !== "any" || !isPhysicalCollision ? (
              <Row label="Target element">
                <DesignDropdown
                  ariaLabel="Collision target element"
                  className="interaction-dropdown"
                  disabled={targetChoices.length === 0}
                  noScroll
                  onChange={setCollisionTarget}
                  options={
                    targetChoices.length
                      ? targetChoices
                      : [
                          {
                            label: isLiquidMerge
                              ? "No other compatible objects"
                              : "No other objects",
                            value: "",
                          },
                        ]
                  }
                  value={selectedCollisionTarget}
                />
              </Row>
            ) : null}
            {!isPhysicalCollision ? (
              <Row label="Detection">
                <DesignDropdown
                  ariaLabel="Collision detection"
                  className="interaction-dropdown"
                  disabled={isPairEffect}
                  noScroll
                  onChange={setDetection}
                  options={[
                    { label: "Bounding box", value: "bounding-box" },
                    { label: "Precise outline", value: "precise-outline" },
                  ]}
                  value={isPairEffect ? "precise-outline" : detection}
                />
              </Row>
            ) : (
              <>
                <Row label="Collider shape">
                  <DesignDropdown
                    ariaLabel="Trigger collider shape"
                    className="interaction-dropdown"
                    noScroll
                    onChange={(value) => setThreeDValue("colliderShape", value)}
                    options={[
                      { label: "Auto", value: "auto" },
                      { label: "Box", value: "box" },
                      { label: "Sphere", value: "sphere" },
                      { label: "Capsule", value: "capsule" },
                      { label: "Convex Hull", value: "convex-hull" },
                      { label: "Mesh", value: "mesh" },
                    ]}
                    value={threeD.colliderShape}
                  />
                </Row>
                {trigger === "collision-enter" ? (
                  <Row label="Min. impulse">
                    <DesignNumberField
                      ariaLabel="Minimum collision impulse"
                      label=""
                      min={0}
                      onChange={(value) =>
                        setThreeDValue("minimumImpulse", Math.max(0, value))
                      }
                      value={threeD.minimumImpulse}
                    />
                  </Row>
                ) : null}
                {is2DSelection ? (
                  <div className="interaction-subsection-card">
                    <span className="interaction-subsection-heading">
                      2D → 3D collision proxy
                    </span>
                    <Row label="Proxy shape">
                      <DesignDropdown
                        ariaLabel="Hybrid collider mode"
                        className="interaction-dropdown"
                        noScroll
                        onChange={(value) =>
                          setExtendedValue("hybridColliderMode", value)
                        }
                        options={[
                          {
                            label: "Extruded 2D outline",
                            value: "extruded-shape",
                          },
                          { label: "Bounding box", value: "bounding-box" },
                          { label: "Convex hull", value: "convex-hull" },
                        ]}
                        value={extended.hybridColliderMode}
                      />
                    </Row>
                    <Row label="Z / Depth">
                      <div className="interaction-field-pair">
                        <DesignNumberField
                          ariaLabel="2D collision Z position"
                          label="Z"
                          onChange={(value) =>
                            setExtendedValue("hybridZ", value)
                          }
                          value={extended.hybridZ}
                        />
                        <DesignNumberField
                          ariaLabel="2D collision depth"
                          label="D"
                          min={0.1}
                          onChange={(value) =>
                            setExtendedValue("hybridColliderDepth", value)
                          }
                          value={extended.hybridColliderDepth}
                        />
                      </div>
                    </Row>
                    <p className="interaction-3d-note">
                      The 2D outline is extruded into a thin 3D collider while
                      its artwork remains visually flat.
                    </p>
                  </div>
                ) : null}
                <p className="interaction-3d-note">
                  Physical collision uses the 3D rigid body and collider. Use
                  Overlap when objects should pass through one another.
                </p>
              </>
            )}
            {trigger === "near-target" ? (
              <>
                <Row label="Join distance">
                  <DesignNumberField
                    ariaLabel="Join distance"
                    label=""
                    min={0}
                    onChange={(value) => {
                      const next = Math.max(0, value);
                      setJoinDistance(next);
                      setReleaseDistance((current) => Math.max(current, next));
                    }}
                    value={joinDistance}
                  />
                </Row>
                <Row label="Release distance">
                  <DesignNumberField
                    ariaLabel="Release distance"
                    label=""
                    min={joinDistance}
                    onChange={(value) =>
                      setReleaseDistance(Math.max(joinDistance, value))
                    }
                    value={releaseDistance}
                  />
                </Row>
                <p className="interaction-note">
                  Distances are in px. The larger release distance prevents
                  flickering while the objects separate.
                </p>
              </>
            ) : null}
            {isLiquidMerge ? (
              <p className="interaction-note">
                Merge proximity updates as the strands bend.
              </p>
            ) : isPairEffect ? (
              <p className="interaction-note">
                Precise outline is used for this two-object effect.
              </p>
            ) : null}
            <p className="interaction-note">
              Only elements used by a collision interaction are checked
            </p>
          </>
        ) : null}
        {isModelTrigger ? (
          <>
            <Row label="Animation clip">
              <DesignDropdown
                ariaLabel="Animation clip"
                className="interaction-dropdown"
                disabled={animationNames.length === 0}
                noScroll
                onChange={(value) => setThreeDValue("animationClip", value)}
                options={
                  animationNames.length
                    ? animationNames.map((name) => ({
                        label: name,
                        value: name,
                      }))
                    : [{ label: "No animation clips", value: "" }]
                }
                value={selectedAnimationClip}
              />
            </Row>
            {trigger === "model-animation-marker" ? (
              <Row label="Marker">
                <input
                  aria-label="Animation marker"
                  className="interaction-text-input"
                  onChange={(event) =>
                    setThreeDValue("marker", event.currentTarget.value)
                  }
                  placeholder="Marker name or time"
                  type="text"
                  value={threeD.marker}
                />
              </Row>
            ) : null}
            <p className="interaction-3d-note">
              This trigger reads the authored animation timeline from the GLB.
            </p>
          </>
        ) : null}
        {isTime ? (
          <>
            <Row label="Time">
              <SoundStepperField
                ariaLabel="Trigger time"
                onBegin={noop}
                onChange={setTimeSeconds}
                value={timeSeconds}
              />
            </Row>
            <p className="interaction-note">
              Delay · interval · idle, measured from page enter
            </p>
          </>
        ) : null}
      </InteractionSection>

      {showMapping ? (
        <InteractionSection cap="Continuous input" title="2. MAPPING">
          <Row label="Input mapping">
            <DesignDropdown
              ariaLabel="Input mapping"
              className="interaction-dropdown"
              noScroll
              onChange={setMapping}
              options={mappingChoices}
              value={selectedMapping}
            />
          </Row>
          {showThreeDMappingFrame ? (
            <div className="interaction-subsection-card">
              <span className="interaction-subsection-heading">
                3D input frame
              </span>
              <Row label="Space">
                <DesignDropdown
                  ariaLabel="Mapping coordinate space"
                  className="interaction-dropdown"
                  noScroll
                  onChange={(value) => setThreeDValue("coordinateSpace", value)}
                  options={[
                    { label: "Screen", value: "screen" },
                    { label: "World", value: "world" },
                    { label: "Local", value: "local" },
                    { label: "Target local", value: "target-local" },
                  ]}
                  value={threeD.coordinateSpace}
                />
              </Row>
              <Row label="Axis">
                <DesignDropdown
                  ariaLabel="3D mapping axis"
                  className="interaction-dropdown"
                  noScroll
                  onChange={(value) => setThreeDValue("transformAxis", value)}
                  options={[
                    { label: "Free", value: "free" },
                    { label: "X", value: "x" },
                    { label: "Y", value: "y" },
                    { label: "Z", value: "z" },
                    { label: "Custom vector", value: "custom" },
                  ]}
                  value={threeD.transformAxis}
                />
              </Row>
              <Row label="Plane">
                <DesignDropdown
                  ariaLabel="3D interaction plane"
                  className="interaction-dropdown"
                  noScroll
                  onChange={(value) => setThreeDValue("plane", value)}
                  options={[
                    { label: "Screen", value: "screen" },
                    { label: "XY", value: "xy" },
                    { label: "XZ", value: "xz" },
                    { label: "YZ", value: "yz" },
                    { label: "Camera facing", value: "camera-facing" },
                    { label: "Custom", value: "custom" },
                  ]}
                  value={threeD.plane}
                />
              </Row>
              {threeD.transformAxis === "custom" ||
              threeD.plane === "custom" ? (
                <Row label="Vector">
                  <div className="interaction-field-pair is-triple">
                    <DesignNumberField
                      ariaLabel="Custom axis X"
                      label="X"
                      onChange={(value) => setThreeDValue("customAxisX", value)}
                      value={threeD.customAxisX}
                    />
                    <DesignNumberField
                      ariaLabel="Custom axis Y"
                      label="Y"
                      onChange={(value) => setThreeDValue("customAxisY", value)}
                      value={threeD.customAxisY}
                    />
                    <DesignNumberField
                      ariaLabel="Custom axis Z"
                      label="Z"
                      onChange={(value) => setThreeDValue("customAxisZ", value)}
                      value={threeD.customAxisZ}
                    />
                  </div>
                </Row>
              ) : null}
            </div>
          ) : null}
          {selectedMapping === "distance-to-target" ? (
            <p className="interaction-note">
              0% at the join distance; 100% when the outlines touch.
            </p>
          ) : null}
          {selectedMapping === "pointer-position" ? (
            <>
              <Row label="Axis">
                <DesignDropdown
                  ariaLabel="Pointer position axis"
                  className="interaction-dropdown"
                  noScroll
                  onChange={setPointerAxis}
                  options={[
                    { label: "Both X & Y", value: "both" },
                    { label: "X only", value: "x" },
                    { label: "Y only", value: "y" },
                  ]}
                  value={pointerAxis}
                />
              </Row>
              <p className="interaction-note">
                Position is 0–100% within the trigger area; values outside are
                clamped.
              </p>
            </>
          ) : null}
          {selectedMapping === "drag-progress" ? (
            <>
              <Row label="Track distance">
                <DesignNumberField
                  ariaLabel="Track distance"
                  label=""
                  min={0}
                  onChange={setTrackDistance}
                  value={trackDistance}
                />
              </Row>
              <Row label="Axis">
                <DesignDropdown
                  ariaLabel="Drag axis"
                  className="interaction-dropdown"
                  noScroll
                  onChange={setDragAxis}
                  options={[
                    { label: "Free", value: "free" },
                    { label: "X only", value: "x" },
                    { label: "Y only", value: "y" },
                  ]}
                  value={dragAxis}
                />
              </Row>
            </>
          ) : null}
          <Row label="Input range">
            <div className="interaction-field-pair">
              <DesignNumberField
                ariaLabel="Input range start"
                label=""
                onChange={setRangeMin}
                unit={
                  selectedMapping === "pointer-velocity"
                    ? "px/s"
                    : selectedMapping === "drag-angle"
                      ? "°"
                      : selectedMapping === "overlap-time"
                        ? "s"
                        : "%"
                }
                value={rangeMin}
              />
              <DesignNumberField
                ariaLabel="Input range end"
                label=""
                onChange={setRangeMax}
                unit={
                  selectedMapping === "pointer-velocity"
                    ? "px/s"
                    : selectedMapping === "drag-angle"
                      ? "°"
                      : selectedMapping === "overlap-time"
                        ? "s"
                        : "%"
                }
                value={rangeMax}
              />
            </div>
          </Row>
          <Row label="Response mode">
            <DesignDropdown
              ariaLabel="Mapping response mode"
              className="interaction-dropdown"
              noScroll
              disabled={isImmediate || isLiquidMerge}
              onChange={setMappingMode}
              options={[
                { label: "Follow input", value: "follow" },
                { label: "Fire at threshold", value: "threshold" },
              ]}
              value={selectedMappingMode}
            />
          </Row>
          {selectedMappingMode === "threshold" ? (
            <>
              <Row label="Threshold">
                <DesignNumberField
                  ariaLabel="Threshold"
                  label=""
                  min={0}
                  onChange={setThreshold}
                  unit={
                    selectedMapping === "pointer-velocity"
                      ? "px/s"
                      : selectedMapping === "drag-angle"
                        ? "°"
                        : selectedMapping === "overlap-time"
                          ? "s"
                          : "%"
                  }
                  value={threshold}
                />
              </Row>
              <p className="interaction-note">
                Fires once when the value crosses upward; going below re-arms
                it.
              </p>
            </>
          ) : null}
          {isImmediate ? (
            <p className="interaction-note">
              Immediate actions use a threshold so they do not repeat every
              frame.
            </p>
          ) : null}
          {isLiquidMerge ? (
            <p className="interaction-note">
              Liquid Merge follows proximity continuously while the shapes are
              near each other.
            </p>
          ) : null}
        </InteractionSection>
      ) : null}

      <InteractionSection cap="Effect" title="3. DO">
        <Row label="Effect">
          <DesignDropdown
            ariaLabel="Effect"
            className="interaction-dropdown interaction-effect-dropdown"
            onChange={(nextEffect) => {
              const firstMergeTarget = nextEffect === "liquid-merge"
                ? obstacleChoices.find((item) => is3DSelection ? item.type === "object3d" : isLiquidMergeShape(item.type))?.id
                : undefined;
              const currentMergeTargetIsValid = obstacleChoices.some((item) =>
                item.id === collisionTarget &&
                (is3DSelection ? item.type === "object3d" : isLiquidMergeShape(item.type)),
              );
              if (authoredInteraction && selectedElementId && onUpdateInteraction)
                onUpdateInteraction(selectedElementId, authoredInteraction.id, {
                  effect: nextEffect,
                  name: interactionLabel(nextEffect),
                  ...(firstMergeTarget && !currentMergeTargetIsValid
                    ? { collisionTarget: firstMergeTarget, detection: "precise-outline" }
                    : {}),
                });
              else {
                setEffect(nextEffect);
                if (firstMergeTarget && !currentMergeTargetIsValid) setCollisionTarget(firstMergeTarget);
              }
            }}
            options={effectChoices}
            scrollToEndOnOpen={effectChoices.some(
              (option) =>
                option.value === "liquid-merge" ||
                option.value === "collision-bounce",
            )}
            value={selectedEffect}
          />
        </Row>
        {(trigger === "near-target" || trigger === "while-overlapping") &&
        !effectChoices.some((option) => option.value === "liquid-merge") ? (
          <p className="interaction-note">
            Liquid Merge needs one selected 2D vector shape or strand.
          </p>
        ) : null}
        {selectedEffect === "group-animation" ? (
          <Row label="Child effect">
            <DesignDropdown
              ariaLabel="Group child effect"
              className="interaction-dropdown"
              noScroll
              onChange={setGroupEffect}
              options={effectChoices.filter(
                (option) => option.value !== "group-animation",
              )}
              value={groupEffect}
            />
          </Row>
        ) : null}
        {activeEffect === "move" && !isStacking ? (
          <>
            <Row label="Move">
              <div
                className={
                  is3DSelection
                    ? "interaction-field-pair is-triple"
                    : "interaction-field-pair"
                }
              >
                <DesignNumberField
                  ariaLabel="Move X"
                  label="X"
                  onChange={setMoveX}
                  value={moveX}
                />
                <DesignNumberField
                  ariaLabel="Move Y"
                  label="Y"
                  onChange={setMoveY}
                  value={moveY}
                />
                {is3DSelection ? (
                  <DesignNumberField
                    ariaLabel="Move Z"
                    label="Z"
                    onChange={(value) => setThreeDValue("moveZ", value)}
                    value={threeD.moveZ}
                  />
                ) : null}
              </div>
            </Row>
            {is3DSelection ? (
              <Row label="Space">
                <DesignDropdown
                  ariaLabel="Coordinate space"
                  className="interaction-dropdown"
                  noScroll
                  onChange={(value) => setThreeDValue("coordinateSpace", value)}
                  options={[
                    { label: "World", value: "world" },
                    { label: "Local", value: "local" },
                    { label: "Screen", value: "screen" },
                    { label: "Target local", value: "target-local" },
                  ]}
                  value={threeD.coordinateSpace}
                />
              </Row>
            ) : null}
            <Row label="Path">
              <DesignDropdown
                ariaLabel="Move path"
                className="interaction-dropdown"
                noScroll
                onChange={setMovePath}
                options={[
                  { label: "Straight", value: "straight" },
                  { label: "Circular", value: "circular" },
                ]}
                value={movePath}
              />
            </Row>
            <Row label="Reference point">
              <DesignDropdown
                ariaLabel="Reference point"
                className="interaction-dropdown"
                noScroll
                onChange={setReferencePoint}
                options={[
                  { label: "Center", value: "center" },
                  { label: "Top Left", value: "top-left" },
                  { label: "Top Right", value: "top-right" },
                  { label: "Bottom Left", value: "bottom-left" },
                  { label: "Bottom Right", value: "bottom-right" },
                ]}
                value={referencePoint}
              />
            </Row>
          </>
        ) : null}
        {isStacking ? (
          <p className="interaction-note">
            Gravity controls movement while the objects fall and settle;
            authored Move X/Y offsets are not used.
          </p>
        ) : null}
        {activeEffect === "scale" ? (
          <>
            <Row label="Scale">
              <div
                className={
                  is3DSelection
                    ? "interaction-field-pair is-triple"
                    : "interaction-field-pair"
                }
              >
                <DesignNumberField
                  ariaLabel="Scale X"
                  label="X"
                  onChange={setScaleX}
                  unit="%"
                  value={scaleX}
                />
                <DesignNumberField
                  ariaLabel="Scale Y"
                  label="Y"
                  onChange={setScaleY}
                  unit="%"
                  value={scaleY}
                />
                {is3DSelection ? (
                  <DesignNumberField
                    ariaLabel="Scale Z"
                    label="Z"
                    onChange={(value) => setThreeDValue("scaleZ", value)}
                    unit="%"
                    value={threeD.scaleZ}
                  />
                ) : null}
              </div>
            </Row>
            {is3DSelection ? (
              <ToggleRow
                checked={threeD.lockScale}
                label="Lock XYZ ratio"
                onChange={() => setThreeDValue("lockScale", !threeD.lockScale)}
              />
            ) : null}
          </>
        ) : null}
        {activeEffect === "rotate" && !is3DSelection ? (
          <Row label="Rotate to">
            <DesignNumberField
              ariaLabel="Rotate to"
              label=""
              onChange={setRotateTo}
              unit="°"
              value={rotateTo}
            />
          </Row>
        ) : null}
        {activeEffect === "skew" && !is3DSelection ? (
          <Row label="Skew">
            <div className="interaction-field-pair">
              <DesignNumberField ariaLabel="Skew X" label="X" onChange={setSkewX} unit="°" value={skewX} />
              <DesignNumberField ariaLabel="Skew Y" label="Y" onChange={setSkewY} unit="°" value={skewY} />
            </div>
          </Row>
        ) : null}
        {activeEffect === "rotate" && is3DSelection ? (
          <>
            <Row label="Rotate">
              <div className="interaction-field-pair is-triple">
                <DesignNumberField
                  ariaLabel="Rotate X"
                  label="X"
                  onChange={(value) => setThreeDValue("rotateX", value)}
                  unit="°"
                  value={threeD.rotateX}
                />
                <DesignNumberField
                  ariaLabel="Rotate Y"
                  label="Y"
                  onChange={(value) => setThreeDValue("rotateY", value)}
                  unit="°"
                  value={threeD.rotateY}
                />
                <DesignNumberField
                  ariaLabel="Rotate Z"
                  label="Z"
                  onChange={(value) => setThreeDValue("rotateZ", value)}
                  unit="°"
                  value={threeD.rotateZ}
                />
              </div>
            </Row>
            <Row label="Space">
              <DesignDropdown
                ariaLabel="Rotation coordinate space"
                className="interaction-dropdown"
                noScroll
                onChange={(value) => setThreeDValue("coordinateSpace", value)}
                options={[
                  { label: "Local", value: "local" },
                  { label: "World", value: "world" },
                ]}
                value={threeD.coordinateSpace === "world" ? "world" : "local"}
              />
            </Row>
            <Row label="Order">
              <DesignDropdown
                ariaLabel="Rotation order"
                className="interaction-dropdown"
                noScroll
                onChange={(value) => setThreeDValue("rotationOrder", value)}
                options={["XYZ", "XZY", "YXZ", "YZX", "ZXY", "ZYX"].map(
                  (value) => ({ label: value, value }),
                )}
                value={threeD.rotationOrder}
              />
            </Row>
          </>
        ) : null}
        {activeEffect === "opacity" ? (
          <Row label="Opacity to">
            <DesignRange
              ariaLabel="Opacity target"
              className="sound-slider"
              max={100}
              min={0}
              onBegin={noop}
              onChange={setOpacityTo}
              value={opacityTo}
            />
            <span className="interaction-value-caption">{opacityTo} %</span>
          </Row>
        ) : null}
        {activeEffect === "look-at-target" ? (
          <>
            <Row label="Target">
              <DesignDropdown
                ariaLabel="Look at target"
                className="interaction-dropdown"
                disabled={targetChoices.length === 0}
                noScroll
                onChange={(value) => setThreeDValue("lookAtTarget", value)}
                options={
                  targetChoices.length
                    ? targetChoices
                    : [{ label: "No other objects", value: "" }]
                }
                value={
                  targetChoices.some(
                    (item) => item.value === threeD.lookAtTarget,
                  )
                    ? threeD.lookAtTarget
                    : (targetChoices[0]?.value ?? "")
                }
              />
            </Row>
            <Row label="Forward axis">
              <DesignDropdown
                ariaLabel="Look at forward axis"
                className="interaction-dropdown"
                noScroll
                onChange={(value) => setThreeDValue("forwardAxis", value)}
                options={[
                  { label: "+X", value: "positive-x" },
                  { label: "−X", value: "negative-x" },
                  { label: "+Y", value: "positive-y" },
                  { label: "−Y", value: "negative-y" },
                  { label: "+Z", value: "positive-z" },
                  { label: "−Z", value: "negative-z" },
                ]}
                value={threeD.forwardAxis}
              />
            </Row>
          </>
        ) : null}
        {activeEffect === "orbit-around-target" ? (
          <>
            <Row label="Target">
              <DesignDropdown
                ariaLabel="Orbit target"
                className="interaction-dropdown"
                disabled={targetChoices.length === 0}
                noScroll
                onChange={(value) => setThreeDValue("orbitTarget", value)}
                options={
                  targetChoices.length
                    ? targetChoices
                    : [{ label: "No other objects", value: "" }]
                }
                value={
                  targetChoices.some(
                    (item) => item.value === threeD.orbitTarget,
                  )
                    ? threeD.orbitTarget
                    : (targetChoices[0]?.value ?? "")
                }
              />
            </Row>
            <Row label="Orbit">
              <div className="interaction-field-pair is-triple">
                <DesignNumberField
                  ariaLabel="Orbit angle"
                  label="A"
                  onChange={(value) => setThreeDValue("orbitAngle", value)}
                  unit="°"
                  value={threeD.orbitAngle}
                />
                <DesignNumberField
                  ariaLabel="Orbit radius"
                  label="R"
                  min={0}
                  onChange={(value) => setThreeDValue("orbitRadius", value)}
                  value={threeD.orbitRadius}
                />
                <DesignDropdown
                  ariaLabel="Orbit axis"
                  className="interaction-dropdown"
                  noScroll
                  onChange={(value) => setThreeDValue("orbitAxis", value)}
                  options={["x", "y", "z"].map((value) => ({
                    label: value.toUpperCase(),
                    value,
                  }))}
                  value={threeD.orbitAxis}
                />
              </div>
            </Row>
            <ToggleRow
              checked={threeD.faceTarget}
              label="Face target"
              onChange={() => setThreeDValue("faceTarget", !threeD.faceTarget)}
            />
          </>
        ) : null}
        {activeEffect === "attach-to-target" ? (
          <>
            <Row label="Target">
              <DesignDropdown
                ariaLabel="Attach target"
                className="interaction-dropdown"
                disabled={targetChoices.length === 0}
                noScroll
                onChange={(value) => setThreeDValue("attachTarget", value)}
                options={
                  targetChoices.length
                    ? targetChoices
                    : [{ label: "No other objects", value: "" }]
                }
                value={
                  targetChoices.some(
                    (item) => item.value === threeD.attachTarget,
                  )
                    ? threeD.attachTarget
                    : (targetChoices[0]?.value ?? "")
                }
              />
            </Row>
            <ToggleRow
              checked={threeD.preserveWorldTransform}
              label="Preserve world transform"
              onChange={() =>
                setThreeDValue(
                  "preserveWorldTransform",
                  !threeD.preserveWorldTransform,
                )
              }
            />
          </>
        ) : null}
        {isModelAnimationEffect ? (
          <>
            <Row label="Clip">
              <DesignDropdown
                ariaLabel="Animation clip"
                className="interaction-dropdown"
                noScroll
                onChange={(value) => setThreeDValue("animationClip", value)}
                options={animationNames.map((name) => ({
                  label: name,
                  value: name,
                }))}
                value={selectedAnimationClip}
              />
            </Row>
            {activeEffect === "crossfade-model-animation" ? (
              <Row label="Crossfade">
                <SoundStepperField
                  ariaLabel="Crossfade duration"
                  min={0}
                  onBegin={noop}
                  onChange={(value) =>
                    setThreeDValue("crossfadeDuration", value)
                  }
                  value={threeD.crossfadeDuration}
                />
              </Row>
            ) : null}
          </>
        ) : null}
        {isMaterialEffect ? (
          <>
            <Row label="Material slot">
              <DesignDropdown
                ariaLabel="Material slot"
                className="interaction-dropdown"
                noScroll
                onChange={(value) => setThreeDValue("materialSlot", value)}
                options={[
                  { label: "All materials", value: "all" },
                  ...materialNames.map((name) => ({
                    label: name,
                    value: name,
                  })),
                ]}
                value={selectedMaterialSlot}
              />
            </Row>
            <Row label="Property">
              <DesignDropdown
                ariaLabel="Material property"
                className="interaction-dropdown"
                noScroll
                onChange={(value) => setThreeDValue("materialProperty", value)}
                options={[
                  { label: "Color", value: "color" },
                  { label: "Emissive", value: "emissive" },
                  { label: "Metalness", value: "metalness" },
                  { label: "Roughness", value: "roughness" },
                  { label: "Opacity", value: "opacity" },
                ]}
                value={threeD.materialProperty}
              />
            </Row>
            <Row label="Value">
              <DesignRange
                ariaLabel="Material value"
                className="sound-slider"
                max={100}
                min={0}
                onBegin={noop}
                onChange={(value) => setThreeDValue("materialValue", value)}
                value={threeD.materialValue}
              />
            </Row>
          </>
        ) : null}
        {isMorphEffect ? (
          <>
            <Row label="Morph target">
              <DesignDropdown
                ariaLabel="Morph target"
                className="interaction-dropdown"
                noScroll
                onChange={(value) => setThreeDValue("morphTarget", value)}
                options={morphTargetNames.map((name) => ({
                  label: name,
                  value: name,
                }))}
                value={selectedMorphTarget}
              />
            </Row>
            <Row label="Weight">
              <DesignRange
                ariaLabel="Morph target weight"
                className="sound-slider"
                max={100}
                min={0}
                onBegin={noop}
                onChange={(value) => setThreeDValue("morphWeight", value)}
                value={threeD.morphWeight}
              />
              <span className="interaction-value-caption">
                {threeD.morphWeight} %
              </span>
            </Row>
          </>
        ) : null}
        {isCameraEffect ? (
          <>
            {activeEffect === "camera-move" ? (
              <Row label="Camera position">
                <div className="interaction-field-pair is-triple">
                  <DesignNumberField
                    ariaLabel="Camera move X"
                    label="X"
                    onChange={(value) => setExtendedValue("cameraMoveX", value)}
                    value={extended.cameraMoveX}
                  />
                  <DesignNumberField
                    ariaLabel="Camera move Y"
                    label="Y"
                    onChange={(value) => setExtendedValue("cameraMoveY", value)}
                    value={extended.cameraMoveY}
                  />
                  <DesignNumberField
                    ariaLabel="Camera move Z"
                    label="Z"
                    onChange={(value) => setExtendedValue("cameraMoveZ", value)}
                    value={extended.cameraMoveZ}
                  />
                </div>
              </Row>
            ) : null}
            {activeEffect === "camera-rotate" ? (
              <Row label="Camera rotation">
                <div className="interaction-field-pair is-triple">
                  <DesignNumberField
                    ariaLabel="Camera rotate X"
                    label="X"
                    onChange={(value) =>
                      setExtendedValue("cameraRotateX", value)
                    }
                    unit="°"
                    value={extended.cameraRotateX}
                  />
                  <DesignNumberField
                    ariaLabel="Camera rotate Y"
                    label="Y"
                    onChange={(value) =>
                      setExtendedValue("cameraRotateY", value)
                    }
                    unit="°"
                    value={extended.cameraRotateY}
                  />
                  <DesignNumberField
                    ariaLabel="Camera rotate Z"
                    label="Z"
                    onChange={(value) =>
                      setExtendedValue("cameraRotateZ", value)
                    }
                    unit="°"
                    value={extended.cameraRotateZ}
                  />
                </div>
              </Row>
            ) : null}
            {activeEffect === "camera-zoom" ? (
              <Row label="Zoom / Dolly">
                <DesignNumberField
                  ariaLabel="Camera zoom or dolly"
                  label=""
                  min={1}
                  onChange={(value) => setExtendedValue("cameraZoom", value)}
                  unit="%"
                  value={extended.cameraZoom}
                />
              </Row>
            ) : null}
            {activeEffect === "camera-look-at" ? (
              <Row label="Look at">
                <DesignDropdown
                  ariaLabel="Camera look at target"
                  className="interaction-dropdown"
                  noScroll
                  onChange={(value) => setExtendedValue("cameraTarget", value)}
                  options={[
                    { label: "Selected object", value: "selected" },
                    { label: "Artboard center", value: "artboard" },
                    ...obstacleChoices.map((element) => ({
                      label: element.name,
                      value: element.id,
                    })),
                  ]}
                  value={extended.cameraTarget}
                />
              </Row>
            ) : null}
            {activeEffect === "camera-shake" ? (
              <Row label="Shake strength">
                <DesignRange
                  ariaLabel="Camera shake strength"
                  className="sound-slider"
                  max={100}
                  min={0}
                  onBegin={noop}
                  onChange={(value) => setExtendedValue("cameraShake", value)}
                  value={extended.cameraShake}
                />
                <span className="interaction-value-caption">
                  {extended.cameraShake} %
                </span>
              </Row>
            ) : null}
            <Row label="Projection">
              <DesignDropdown
                ariaLabel="Camera projection"
                className="interaction-dropdown"
                noScroll
                onChange={(value) =>
                  setExtendedValue("cameraProjection", value)
                }
                options={[
                  { label: "Orthographic", value: "orthographic" },
                  { label: "Perspective", value: "perspective" },
                ]}
                value={extended.cameraProjection}
              />
            </Row>
            {extended.cameraProjection === "perspective" ? (
              <Row label="Field of view">
                <DesignNumberField
                  ariaLabel="Camera field of view"
                  label=""
                  max={160}
                  min={1}
                  onChange={(value) => setExtendedValue("cameraFov", value)}
                  unit="°"
                  value={extended.cameraFov}
                />
              </Row>
            ) : null}
            <p className="interaction-3d-note">
              Camera effects move the fixed artwork view; they do not turn the
              editor into a free-orbit 3D viewport.
            </p>
          </>
        ) : null}
        {activeEffect === "blur" ? (
          <Row label="Blur amount">
            <DesignRange
              ariaLabel="Blur amount"
              className="sound-slider"
              max={100}
              min={0}
              onBegin={noop}
              onChange={(value) => is3DSelection ? setExtendedValue("blurAmount", value) : setBlurAmount(value)}
              value={is3DSelection ? extended.blurAmount : blurAmount}
            />
            <span className="interaction-value-caption">
              {is3DSelection ? extended.blurAmount : blurAmount} px
            </span>
          </Row>
        ) : null}
        {activeEffect === "color" ? (
          <>
            <Row label="Color property">
              <DesignDropdown
                ariaLabel="Animated color property"
                className="interaction-dropdown"
                noScroll
                onChange={(value) => setExtendedValue("colorParameter", value)}
                options={[
                  { label: "Brightness", value: "brightness" },
                  { label: "Contrast", value: "contrast" },
                  { label: "Saturation", value: "saturation" },
                  { label: "Hue", value: "hue" },
                  { label: "Tint", value: "tint" },
                ]}
                value={extended.colorParameter}
              />
            </Row>
            <Row label="Target value">
              <DesignRange
                ariaLabel="Animated color target"
                className="sound-slider"
                max={200}
                min={0}
                onBegin={noop}
                onChange={(value) => setExtendedValue("colorValue", value)}
                value={extended.colorValue}
              />
              <span className="interaction-value-caption">
                {extended.colorValue} %
              </span>
            </Row>
          </>
        ) : null}
        {activeEffect === "shadow" ? (
          <>
            <Row label="Shadow offset">
              <div
                className={
                  is3DSelection
                    ? "interaction-field-pair is-triple"
                    : "interaction-field-pair"
                }
              >
                <DesignNumberField
                  ariaLabel="Shadow X"
                  label="X"
                  onChange={(value) => is3DSelection ? setExtendedValue("shadowX", value) : setShadowX(value)}
                  value={is3DSelection ? extended.shadowX : shadowX}
                />
                <DesignNumberField
                  ariaLabel="Shadow Y"
                  label="Y"
                  onChange={(value) => is3DSelection ? setExtendedValue("shadowY", value) : setShadowY(value)}
                  value={is3DSelection ? extended.shadowY : shadowY}
                />
                {is3DSelection ? (
                  <DesignNumberField
                    ariaLabel="Shadow Z"
                    label="Z"
                    onChange={(value) => setExtendedValue("shadowZ", value)}
                    value={extended.shadowZ}
                  />
                ) : null}
              </div>
            </Row>
            <Row label="Blur / Spread">
              <div className="interaction-field-pair">
                <DesignNumberField
                  ariaLabel="Shadow blur"
                  label="B"
                  min={0}
                  onChange={(value) => is3DSelection ? setExtendedValue("shadowBlur", value) : setShadowBlur(value)}
                  value={is3DSelection ? extended.shadowBlur : shadowBlur}
                />
                <DesignNumberField
                  ariaLabel="Shadow spread"
                  label="S"
                  onChange={(value) => setExtendedValue("shadowSpread", value)}
                  value={extended.shadowSpread}
                />
              </div>
            </Row>
            <Row label="Opacity">
              <DesignRange
                ariaLabel="Shadow opacity"
                className="sound-slider"
                max={100}
                min={0}
                onBegin={noop}
                onChange={(value) => setExtendedValue("shadowOpacity", value)}
                value={extended.shadowOpacity}
              />
              <span className="interaction-value-caption">
                {extended.shadowOpacity} %
              </span>
            </Row>
          </>
        ) : null}
        {activeEffect === "animate-lighting" ? (
          <>
            <Row label="Light">
              <DesignDropdown
                ariaLabel="Animated light"
                className="interaction-dropdown"
                noScroll
                onChange={(value) => setExtendedValue("lightType", value)}
                options={[
                  { label: "Ambient", value: "ambient" },
                  { label: "Directional", value: "directional" },
                  { label: "Point", value: "point" },
                  { label: "Spot", value: "spot" },
                  { label: "All lights", value: "all" },
                ]}
                value={extended.lightType}
              />
            </Row>
            <Row label="Property">
              <DesignDropdown
                ariaLabel="Light animation property"
                className="interaction-dropdown"
                noScroll
                onChange={(value) => setExtendedValue("lightProperty", value)}
                options={[
                  { label: "Intensity", value: "intensity" },
                  { label: "Color", value: "color" },
                  { label: "Position", value: "position" },
                  { label: "Rotation", value: "rotation" },
                  { label: "Cone angle", value: "cone" },
                ]}
                value={extended.lightProperty}
              />
            </Row>
            {extended.lightProperty === "color" ? (
              <Row label="Light color">
                <input
                  aria-label="Animated light color"
                  className="interaction-color-input"
                  onChange={(event) =>
                    setExtendedValue("lightColor", event.currentTarget.value)
                  }
                  type="color"
                  value={extended.lightColor}
                />
              </Row>
            ) : (
              <Row label="Target value">
                <DesignRange
                  ariaLabel="Animated light value"
                  className="sound-slider"
                  max={200}
                  min={0}
                  onBegin={noop}
                  onChange={(value) => setExtendedValue("lightValue", value)}
                  value={extended.lightValue}
                />
              </Row>
            )}
          </>
        ) : null}
        {activeEffect === "post-processing" ? (
          <>
            <Row label="Post effect">
              <DesignDropdown
                ariaLabel="Post processing effect"
                className="interaction-dropdown"
                noScroll
                onChange={(value) => setExtendedValue("postEffect", value)}
                options={[
                  { label: "Bloom", value: "bloom" },
                  { label: "Depth of Field", value: "depth-of-field" },
                  { label: "Vignette", value: "vignette" },
                  {
                    label: "Chromatic Aberration",
                    value: "chromatic-aberration",
                  },
                  { label: "Film Grain", value: "film-grain" },
                  { label: "Tone Mapping", value: "tone-mapping" },
                ]}
                value={extended.postEffect}
              />
            </Row>
            <Row label="Amount">
              <DesignRange
                ariaLabel="Post processing amount"
                className="sound-slider"
                max={100}
                min={0}
                onBegin={noop}
                onChange={(value) => setExtendedValue("postAmount", value)}
                value={extended.postAmount}
              />
              <span className="interaction-value-caption">
                {extended.postAmount} %
              </span>
            </Row>
          </>
        ) : null}
        {activeEffect === "shader-parameter" ? (
          <>
            <Row label="Uniform">
              <input
                aria-label="Shader uniform name"
                className="interaction-text-input"
                onChange={(event) =>
                  setExtendedValue("shaderUniform", event.currentTarget.value)
                }
                placeholder="uProgress"
                type="text"
                value={extended.shaderUniform}
              />
            </Row>
            <Row label="Value type">
              <DesignDropdown
                ariaLabel="Shader uniform type"
                className="interaction-dropdown"
                noScroll
                onChange={(value) =>
                  setExtendedValue("shaderUniformType", value)
                }
                options={[
                  { label: "Float", value: "float" },
                  { label: "Color", value: "color" },
                  { label: "Vector 2", value: "vec2" },
                  { label: "Vector 3", value: "vec3" },
                  { label: "Vector 4", value: "vec4" },
                ]}
                value={extended.shaderUniformType}
              />
            </Row>
            {extended.shaderUniformType === "color" ? (
              <Row label="Target value">
                <input
                  aria-label="Shader color value"
                  className="interaction-color-input"
                  onChange={(event) =>
                    setExtendedValue("shaderColor", event.currentTarget.value)
                  }
                  type="color"
                  value={extended.shaderColor}
                />
              </Row>
            ) : (
              <Row label="Target value">
                <div
                  className={`interaction-field-pair ${
                    extended.shaderUniformType === "float"
                      ? "is-single"
                      : extended.shaderUniformType === "vec2"
                        ? ""
                        : extended.shaderUniformType === "vec4"
                          ? "is-quad"
                          : "is-triple"
                  }`}
                >
                  <DesignNumberField
                    ariaLabel="Shader value X"
                    label={extended.shaderUniformType === "float" ? "" : "X"}
                    onChange={(value) =>
                      setExtendedValue("shaderValueX", value)
                    }
                    value={extended.shaderValueX}
                  />
                  {extended.shaderUniformType !== "float" ? (
                    <DesignNumberField
                      ariaLabel="Shader value Y"
                      label="Y"
                      onChange={(value) =>
                        setExtendedValue("shaderValueY", value)
                      }
                      value={extended.shaderValueY}
                    />
                  ) : null}
                  {["vec3", "vec4"].includes(extended.shaderUniformType) ? (
                    <DesignNumberField
                      ariaLabel="Shader value Z"
                      label="Z"
                      onChange={(value) =>
                        setExtendedValue("shaderValueZ", value)
                      }
                      value={extended.shaderValueZ}
                    />
                  ) : null}
                  {extended.shaderUniformType === "vec4" ? (
                    <DesignNumberField
                      ariaLabel="Shader value W"
                      label="W"
                      onChange={(value) =>
                        setExtendedValue("shaderValueW", value)
                      }
                      value={extended.shaderValueW}
                    />
                  ) : null}
                </div>
              </Row>
            )}
          </>
        ) : null}
        {isModelStructureEffect ? (
          <>
            {activeEffect === "bone-transform" ? (
              <Row label="Bone">
                <DesignDropdown
                  ariaLabel="Model bone"
                  className="interaction-dropdown"
                  noScroll
                  onChange={(value) => setExtendedValue("boneName", value)}
                  options={boneNames.map((name) => ({
                    label: name,
                    value: name,
                  }))}
                  value={selectedBoneName}
                />
              </Row>
            ) : null}
            {activeEffect === "joint-rotation" ? (
              <Row label="Joint">
                <DesignDropdown
                  ariaLabel="Model joint"
                  className="interaction-dropdown"
                  noScroll
                  onChange={(value) => setExtendedValue("jointName", value)}
                  options={jointNames.map((name) => ({
                    label: name,
                    value: name,
                  }))}
                  value={selectedJointName}
                />
              </Row>
            ) : null}
            {[
              "mesh-transform",
              "mesh-visibility",
              "mesh-face-material",
            ].includes(activeEffect) ? (
              <Row label="Mesh">
                <DesignDropdown
                  ariaLabel="Model mesh"
                  className="interaction-dropdown"
                  noScroll
                  onChange={(value) => setExtendedValue("meshName", value)}
                  options={meshNames.map((name) => ({
                    label: name,
                    value: name,
                  }))}
                  value={selectedMeshName}
                />
              </Row>
            ) : null}
            {activeEffect === "mesh-face-material" ? (
              <>
                <Row label="Selection">
                  <DesignDropdown
                    ariaLabel="Mesh face selection mode"
                    className="interaction-dropdown"
                    noScroll
                    onChange={(value) =>
                      setExtendedValue("meshFaceMode", value)
                    }
                    options={[
                      { label: "Material group", value: "material-group" },
                      { label: "Face index", value: "face-index" },
                      { label: "Face range", value: "face-range" },
                      { label: "Pick on canvas", value: "canvas-pick" },
                    ]}
                    value={extended.meshFaceMode}
                  />
                </Row>
                {extended.meshFaceMode === "material-group" ? (
                  <Row label="Face group">
                    <DesignDropdown
                      ariaLabel="Mesh face group"
                      className="interaction-dropdown"
                      noScroll
                      onChange={(value) =>
                        setExtendedValue("meshFaceGroup", value)
                      }
                      options={meshFaceGroupNames.map((name) => ({
                        label: name,
                        value: name,
                      }))}
                      value={selectedMeshFaceGroup}
                    />
                  </Row>
                ) : null}
                {extended.meshFaceMode === "face-index" ? (
                  <Row label="Face index">
                    <DesignNumberField
                      ariaLabel="Mesh face index"
                      label=""
                      min={0}
                      onChange={(value) =>
                        setExtendedValue("meshFaceIndex", Math.max(0, value))
                      }
                      precision={0}
                      value={extended.meshFaceIndex}
                    />
                  </Row>
                ) : null}
                {extended.meshFaceMode === "face-range" ? (
                  <Row label="Face range">
                    <div className="interaction-field-pair">
                      <DesignNumberField
                        ariaLabel="Mesh face range start"
                        label="From"
                        min={0}
                        onChange={(value) =>
                          setExtendedValue("meshFaceFrom", Math.max(0, value))
                        }
                        precision={0}
                        value={extended.meshFaceFrom}
                      />
                      <DesignNumberField
                        ariaLabel="Mesh face range end"
                        label="To"
                        min={0}
                        onChange={(value) =>
                          setExtendedValue("meshFaceTo", Math.max(0, value))
                        }
                        precision={0}
                        value={extended.meshFaceTo}
                      />
                    </div>
                  </Row>
                ) : null}
                {extended.meshFaceMode === "canvas-pick" ? (
                  <Row label="Face picker">
                    <button className="interaction-inline-action" type="button">
                      Pick face in 3D object
                    </button>
                  </Row>
                ) : null}
                <Row label="Material">
                  <DesignDropdown
                    ariaLabel="Mesh face material"
                    className="interaction-dropdown"
                    noScroll
                    onChange={(value) => setThreeDValue("materialSlot", value)}
                    options={materialNames.map((name) => ({
                      label: name,
                      value: name,
                    }))}
                    value={selectedMaterialSlot}
                  />
                </Row>
                <p className="interaction-note">
                  Face indices follow the imported mesh topology. Reimporting a
                  changed GLB may require picking the face again.
                </p>
              </>
            ) : null}
            {["bone-transform", "joint-rotation", "mesh-transform"].includes(
              activeEffect,
            ) ? (
              <>
                {activeEffect !== "joint-rotation" ? (
                  <Row label="Property">
                    <DesignDropdown
                      ariaLabel="Model sub-object transform property"
                      className="interaction-dropdown"
                      noScroll
                      onChange={(value) =>
                        setExtendedValue("modelTransformProperty", value)
                      }
                      options={[
                        { label: "Position", value: "position" },
                        { label: "Rotation", value: "rotation" },
                        { label: "Scale", value: "scale" },
                      ]}
                      value={extended.modelTransformProperty}
                    />
                  </Row>
                ) : null}
                <Row label="XYZ value">
                  <div className="interaction-field-pair is-triple">
                    <DesignNumberField
                      ariaLabel="Model target X"
                      label="X"
                      onChange={(value) =>
                        setExtendedValue("modelTargetX", value)
                      }
                      value={extended.modelTargetX}
                    />
                    <DesignNumberField
                      ariaLabel="Model target Y"
                      label="Y"
                      onChange={(value) =>
                        setExtendedValue("modelTargetY", value)
                      }
                      value={extended.modelTargetY}
                    />
                    <DesignNumberField
                      ariaLabel="Model target Z"
                      label="Z"
                      onChange={(value) =>
                        setExtendedValue("modelTargetZ", value)
                      }
                      value={extended.modelTargetZ}
                    />
                  </div>
                </Row>
              </>
            ) : null}
            {activeEffect === "mesh-visibility" ? (
              <ToggleRow
                checked={extended.meshVisible}
                label="Visible"
                onChange={() =>
                  setExtendedValue("meshVisible", !extended.meshVisible)
                }
              />
            ) : null}
          </>
        ) : null}
        {isLiquidMerge ? (
          <>
            <Row label="Bridge width">
              <DesignRange
                ariaLabel="Liquid bridge width"
                className="sound-slider"
                max={300}
                min={0}
                onChange={setBridgeWidth}
                value={bridgeWidth}
              />
              <span className="interaction-value-caption">{bridgeWidth} px</span>
            </Row>
            <Row label="Attraction">
              <DesignRange
                ariaLabel="Liquid attraction"
                className="sound-slider"
                max={100}
                min={0}
                onChange={setLiquidAttraction}
                value={liquidAttraction}
              />
              <span className="interaction-value-caption">{liquidAttraction} %</span>
            </Row>
            <Row label="Smoothness">
              <DesignRange
                ariaLabel="Liquid smoothness"
                className="sound-slider"
                max={100}
                min={0}
                onChange={setLiquidSmoothness}
                value={liquidSmoothness}
              />
              <span className="interaction-value-caption">
                {liquidSmoothness} %
              </span>
            </Row>
            <p className="interaction-note">
              Paired shapes or strands pull together inside Join / Release distance and visually merge; both source objects stay editable.
            </p>
          </>
        ) : null}
        {activeEffect === "strand-bend" ? (
          <>
            <Row label="Anchor end">
              <DesignDropdown
                ariaLabel="Strand anchor"
                className="interaction-dropdown"
                noScroll
                onChange={(value) => setStrandAnchor(value as InteractionDefinition["strandAnchor"])}
                options={[
                  { label: "Top", value: "top" },
                  { label: "Bottom", value: "bottom" },
                  { label: "Left", value: "left" },
                  { label: "Right", value: "right" },
                ]}
                value={strandAnchor}
              />
            </Row>
            <Row label="Stiffness">
              <DesignRange
                ariaLabel="Strand stiffness"
                className="sound-slider"
                max={100}
                min={0}
                onChange={(value) => setStrandStiffness(value / 100)}
                value={Math.round(strandStiffness * 100)}
              />
              <span className="interaction-value-caption">{Math.round(strandStiffness * 100)} %</span>
            </Row>
            <Row label="Damping">
              <DesignRange
                ariaLabel="Strand damping"
                className="sound-slider"
                max={100}
                min={0}
                onChange={(value) => setStrandDamping(value / 100)}
                value={Math.round(strandDamping * 100)}
              />
              <span className="interaction-value-caption">{Math.round(strandDamping * 100)} %</span>
            </Row>
            <Row label="Influence radius">
              <DesignNumberField
                ariaLabel="Strand influence radius"
                label=""
                min={1}
                onChange={(value) => setStrandInfluenceRadius(Math.max(1, value))}
                unit="px"
                value={strandInfluenceRadius}
              />
            </Row>
            <Row label="Max. bend">
              <DesignNumberField
                ariaLabel="Strand max displacement"
                label=""
                min={0}
                onChange={(value) => setStrandMaxDisplacement(Math.max(0, value))}
                unit="px"
                value={strandMaxDisplacement}
              />
            </Row>
            <Row label="Neighbor radius">
              <DesignNumberField
                ariaLabel="Strand neighbor radius"
                label=""
                min={0}
                onChange={(value) => setStrandNeighborRadius(Math.max(0, value))}
                unit="px"
                value={strandNeighborRadius}
              />
            </Row>
            <Row label="Neighbor pull">
              <DesignRange
                ariaLabel="Strand neighbor pull"
                className="sound-slider"
                max={100}
                min={0}
                onChange={setStrandNeighborStrength}
                value={strandNeighborStrength}
              />
              <span className="interaction-value-caption">{strandNeighborStrength} %</span>
            </Row>
            <p className="interaction-note">
              Nearby lines and open pen paths with Strand Bend follow the pointer during Drag or Pointer Move; each keeps its own anchor, stiffness, and damping.
            </p>
          </>
        ) : null}
        {isCollisionBounce ? (
          <>
            <Row label="Affected objects">
              <DesignDropdown
                ariaLabel="Collision affected objects"
                className="interaction-dropdown"
                noScroll
                onChange={setAffectedObjects}
                options={[
                  { label: "Selected object only", value: "selected" },
                  { label: "Both objects", value: "both" },
                ]}
                value={affectedObjects}
              />
            </Row>
            <p className="interaction-note">
              Bounce direction and speed follow the impact angle and velocity.
            </p>
          </>
        ) : null}
        {isPairEffect && !isLiquidMerge ? (
          <p className="interaction-note">
            Settings preview only — interaction playback is not connected yet.
          </p>
        ) : null}
      </InteractionSection>

      {!isImmediate ? (
        <InteractionSection cap="Motion" title="4. HOW">
          <Row label="Behavior">
            <DesignDropdown
              ariaLabel="Motion behavior"
              className="interaction-dropdown"
              noScroll
              onChange={setMotion}
              options={motionChoices}
              value={selectedMotion}
            />
          </Row>
          {selectedMotion === "spring" ? (
            <>
              <Row label="Spring">
                <div className="interaction-field-pair is-triple">
                  <DesignNumberField
                    ariaLabel="Spring strength"
                    label=""
                    onChange={setSpringStrength}
                    unit=""
                    value={springStrength}
                  />
                  <DesignNumberField
                    ariaLabel="Spring mass"
                    label=""
                    onChange={setSpringMass}
                    unit=""
                    value={springMass}
                  />
                  <DesignNumberField
                    ariaLabel="Spring damping"
                    label=""
                    onChange={setSpringDamping}
                    unit=""
                    value={springDamping}
                  />
                </div>
              </Row>
              <p className="interaction-note">
                Strength · Mass · Damping — fine-tune in Advanced
              </p>
            </>
          ) : null}
          {selectedMotion === "collision-bounce" ? (
            <>
              <Row label="Bounciness">
                <DesignRange
                  ariaLabel="Collision bounciness"
                  className="sound-slider"
                  max={100}
                  min={0}
                  onChange={setImpactBounciness}
                  value={impactBounciness}
                />
                <span className="interaction-value-caption">
                  {impactBounciness} %
                </span>
              </Row>
              <Row label="Mass">
                <DesignNumberField
                  ariaLabel="Selected object mass"
                  label=""
                  min={0.1}
                  onChange={(value) => setImpactMass(Math.max(0.1, value))}
                  precision={1}
                  unit=""
                  value={impactMass}
                />
              </Row>
              {affectedObjects === "both" ? (
                <Row label="Target mass">
                  <DesignNumberField
                    ariaLabel="Target object mass"
                    label=""
                    min={0.1}
                    onChange={(value) => setTargetMass(Math.max(0.1, value))}
                    precision={1}
                    unit=""
                    value={targetMass}
                  />
                </Row>
              ) : null}
              <Row label="Friction">
                <DesignRange
                  ariaLabel="Collision friction"
                  className="sound-slider"
                  max={100}
                  min={0}
                  onChange={setImpactFriction}
                  value={impactFriction}
                />
                <span className="interaction-value-caption">
                  {impactFriction} %
                </span>
              </Row>
            </>
          ) : null}
          {selectedMotion === "gravity" ? (
            <>
              <Row label="Contact behavior">
                <DesignDropdown
                  ariaLabel="Gravity contact behavior"
                  className="interaction-dropdown"
                  noScroll
                  onChange={setGravityContact}
                  options={[
                    { label: "Bounce only", value: "bounce" },
                    { label: "Stack & Settle", value: "stack" },
                  ]}
                  value={gravityContact}
                />
              </Row>
              {isStacking ? (
                <>
                  <Row label="Collide with">
                    <DesignDropdown
                      ariaLabel="Stack collision targets"
                      className="interaction-dropdown"
                      noScroll
                      onChange={setStackColliders}
                      options={[
                        {
                          label: "Artboard + physics objects",
                          value: "physics",
                        },
                        { label: "Physics + obstacles…", value: "obstacles" },
                      ]}
                      value={stackColliders}
                    />
                  </Row>
                  {stackColliders === "obstacles" ? (
                    <div
                      aria-label="Static obstacles"
                      className="interaction-obstacle-list"
                      role="group"
                    >
                      {obstacleChoices.length ? (
                        obstacleChoices.map((element) => (
                          <label key={element.id}>
                            <input
                              aria-label={`Static obstacle ${element.name}`}
                              checked={stackObstacleIds.includes(element.id)}
                              onChange={() =>
                                setStackObstacleIds((current) =>
                                  current.includes(element.id)
                                    ? current.filter((id) => id !== element.id)
                                    : [...current, element.id],
                                )
                              }
                              type="checkbox"
                            />
                            <span>{element.name}</span>
                          </label>
                        ))
                      ) : (
                        <span>No other objects on this page</span>
                      )}
                    </div>
                  ) : null}
                  <Row label="Mass">
                    <DesignNumberField
                      ariaLabel="Stacking mass"
                      label=""
                      min={0.1}
                      onChange={(value) => setStackMass(Math.max(0.1, value))}
                      precision={1}
                      unit=""
                      value={stackMass}
                    />
                  </Row>
                  <Row label="Friction">
                    <DesignRange
                      ariaLabel="Stacking friction"
                      className="sound-slider"
                      max={100}
                      min={0}
                      onChange={setStackFriction}
                      value={stackFriction}
                    />
                    <span className="interaction-value-caption">
                      {stackFriction} %
                    </span>
                  </Row>
                  <Row label="Bounciness">
                    <DesignRange
                      ariaLabel="Stacking bounciness"
                      className="sound-slider"
                      max={100}
                      min={0}
                      onChange={setBounciness}
                      value={bounciness}
                    />
                    <span className="interaction-value-caption">
                      {bounciness} %
                    </span>
                  </Row>
                  <p className="interaction-note">
                    Other Gravity objects can pile up. Selected obstacles stay
                    fixed; artboard edges are always included.
                  </p>
                  <p className="interaction-note">
                    Settings preview only — stacking playback is not connected
                    yet.
                  </p>
                </>
              ) : (
                <>
                  <Row label="Bounce off">
                    <DesignDropdown
                      ariaLabel="Gravity bounce targets"
                      className="interaction-dropdown"
                      noScroll
                      onChange={setBounceOff}
                      options={[
                        { label: "Artboard edges", value: "artboard" },
                        {
                          label: "Artboard + obstacles…",
                          value: "obstacles",
                        },
                      ]}
                      value={bounceOff}
                    />
                  </Row>
                  <p className="interaction-note">
                    Falling and bouncing without a persistent resting pile.
                  </p>
                </>
              )}
            </>
          ) : null}
        </InteractionSection>
      ) : null}

      <InteractionSection
        cap={
          isStacking
            ? "Physics simulation"
            : isCollisionBounce
              ? "Impact action"
              : isImmediate
                ? "Immediate action"
                : eventTiming
                  ? "Event"
                  : "Continuous input"
        }
        title="5. TIMING"
      >
        {isModelAnimationEffect ? (
          <>
            <Row label="Delay">
              <SoundStepperField
                ariaLabel="Model animation delay"
                min={0}
                onBegin={noop}
                onChange={setDelay}
                value={delay}
              />
            </Row>
            <Row label="Playback speed">
              <DesignNumberField
                ariaLabel="Model animation playback speed"
                label=""
                min={0}
                onChange={(value) => setThreeDValue("animationSpeed", value)}
                precision={2}
                unit="×"
                value={threeD.animationSpeed}
              />
            </Row>
            <Row label="Clip range">
              <div className="interaction-field-pair">
                <SoundStepperField
                  ariaLabel="Model animation start time"
                  min={0}
                  onBegin={noop}
                  onChange={(value) => setThreeDValue("animationStart", value)}
                  value={threeD.animationStart}
                />
                <SoundStepperField
                  ariaLabel="Model animation end time"
                  min={0}
                  onBegin={noop}
                  onChange={(value) => setThreeDValue("animationEnd", value)}
                  value={threeD.animationEnd}
                />
              </div>
            </Row>
            <Row label="Transition">
              <DesignDropdown
                ariaLabel="Model animation transition"
                className="interaction-dropdown"
                noScroll
                onChange={(value) => setThreeDValue("transition", value)}
                options={[
                  { label: "Cut", value: "cut" },
                  { label: "Crossfade", value: "crossfade" },
                  { label: "Blend", value: "blend" },
                ]}
                value={threeD.transition}
              />
            </Row>
            {threeD.transition !== "cut" ? (
              <Row label="Transition time">
                <SoundStepperField
                  ariaLabel="Animation transition duration"
                  min={0}
                  onBegin={noop}
                  onChange={(value) =>
                    setThreeDValue("crossfadeDuration", value)
                  }
                  value={threeD.crossfadeDuration}
                />
              </Row>
            ) : null}
            <Row label="Loop">
              <DesignDropdown
                ariaLabel="Model animation loop mode"
                className="interaction-dropdown"
                noScroll
                onChange={(value) => setThreeDValue("animationLoop", value)}
                options={[
                  { label: "Once", value: "once" },
                  { label: "Repeat", value: "repeat" },
                  { label: "Ping Pong", value: "ping-pong" },
                ]}
                value={threeD.animationLoop}
              />
            </Row>
            {threeD.animationLoop !== "once" ? (
              <Row label="Repeat count">
                <DesignNumberField
                  ariaLabel="Model animation repeat count"
                  label=""
                  min={1}
                  onChange={(value) =>
                    setThreeDValue("animationRepeat", Math.max(1, value))
                  }
                  value={threeD.animationRepeat}
                />
              </Row>
            ) : null}
            <Row label="Root motion">
              <DesignDropdown
                ariaLabel="Model animation root motion"
                className="interaction-dropdown"
                noScroll
                onChange={(value) => setThreeDValue("rootMotion", value)}
                options={[
                  { label: "Ignore", value: "ignore" },
                  { label: "Apply to object", value: "apply" },
                ]}
                value={threeD.rootMotion}
              />
            </Row>
            <p className="interaction-3d-note">
              Model clips use their own timeline; generic duration and easing
              are not applied.
            </p>
          </>
        ) : isImmediate || isCollisionBounce || isStacking ? (
          <>
            <Row label="Delay">
              <SoundStepperField
                ariaLabel="Delay"
                onBegin={noop}
                onChange={setDelay}
                value={delay}
              />
            </Row>
            <p className="interaction-note">
              {isStacking
                ? "Stacking runs until the page exits; no fixed duration or easing."
                : isCollisionBounce
                  ? "Impact timing comes from the collision; no fixed duration or easing."
                  : "Instant actions do not use motion or animation duration."}
            </p>
          </>
        ) : !eventTiming ? (
          <>
            <Row label="Smoothing">
              <SoundStepperField
                ariaLabel="Smoothing"
                onBegin={noop}
                onChange={setSmoothing}
                value={smoothing}
              />
            </Row>
            <p className="interaction-note">
              Lag catching up to input · 0 s reacts instantly
            </p>
            <Row label="Easing">
              <DesignDropdown
                ariaLabel="Continuous easing"
                className="interaction-dropdown"
                noScroll
                onChange={setContinuousEasing}
                options={[
                  { label: "Linear", value: "linear" },
                  { label: "Ease In", value: "ease-in" },
                  { label: "Ease Out", value: "ease-out" },
                  { label: "Ease In Out", value: "ease-in-out" },
                  { label: "Custom Curve…", value: "custom" },
                ]}
                value={continuousEasing}
              />
            </Row>
          </>
        ) : (
          <>
            <Row label="Time">
              <SoundStepperField
                ariaLabel="Duration"
                onBegin={noop}
                onChange={setDuration}
                value={duration}
              />
            </Row>
            <Row label="Delay">
              <SoundStepperField
                ariaLabel="Delay"
                onBegin={noop}
                onChange={setDelay}
                value={delay}
              />
            </Row>
            {selectedTypes.length > 1 ? (
              <Row label="Stagger">
                <SoundStepperField
                  ariaLabel="Stagger"
                  onBegin={noop}
                  onChange={setStagger}
                  value={stagger}
                />
              </Row>
            ) : null}
            {selectedTypes.length > 1 ? (
              <p className="interaction-note">
                Sequential delay between grouped elements · forward · reverse ·
                random
              </p>
            ) : null}
            <Row label="Easing">
              <DesignDropdown
                ariaLabel="Easing"
                className="interaction-dropdown"
                noScroll
                onChange={setEasing}
                options={[
                  { label: "Linear", value: "linear" },
                  { label: "Ease In", value: "ease-in" },
                  { label: "Ease Out", value: "ease-out" },
                  { label: "Ease In Out", value: "ease-in-out" },
                  { label: "Custom Curve…", value: "custom" },
                ]}
                value={easing}
              />
            </Row>
          </>
        )}
      </InteractionSection>

      <InteractionSection cap="After interaction" title="6. RESET">
        <Row label="After">
          <DesignDropdown
            ariaLabel="Reset behavior"
            className="interaction-dropdown"
            noScroll
            onChange={setResetMode}
            options={resetPolicy.options}
            value={selectedReset}
          />
        </Row>
        <p className="interaction-hint">{resetPolicy.description}</p>
        <p className="interaction-hint">
          Effects apply at runtime only — authored values never change
        </p>
        {isSpatialPhysicsSelection ? (
          <div className="interaction-subsection-card">
            <span className="interaction-subsection-heading">
              {is3DSelection ? "3D reset scope" : "Spatial reset scope"}
            </span>
            <div className="interaction-axis-grid" role="group">
              {(
                [
                  ["Position", "resetPosition"],
                  ["Rotation", "resetRotation"],
                  ["Scale", "resetScale"],
                  ["Linear velocity", "resetLinearVelocity"],
                  ["Angular velocity", "resetAngularVelocity"],
                  ...(is3DSelection
                    ? ([
                        ["Animation pose", "resetAnimation"],
                        ["Material", "resetMaterial"],
                        ["Morph targets", "resetMorph"],
                        ["Attachment", "resetAttachment"],
                      ] as const)
                    : []),
                ] as const
              ).map(([label, key]) => (
                <label key={key}>
                  <input
                    aria-label={`Reset ${label.toLowerCase()}`}
                    checked={threeD[key]}
                    onChange={() =>
                      setThreeD((current) => ({
                        ...current,
                        [key]: !current[key],
                      }))
                    }
                    type="checkbox"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </InteractionSection>

      <section className="interaction-section interaction-advanced">
        <div className="sound-section-heading">
          <h2>Advanced</h2>
          <button
            aria-expanded={advancedOpen}
            aria-label={advancedOpen ? "Collapse advanced" : "Expand advanced"}
            className={
              advancedOpen
                ? "sound-bgm-collapse is-expanded"
                : "sound-bgm-collapse"
            }
            onClick={() => setAdvancedOpen((current) => !current)}
            type="button"
          >
            <Image
              alt=""
              aria-hidden="true"
              height={9}
              src={assetPath("/figma/sound/Group%20263.svg")}
              width={9}
            />
          </button>
        </div>

        {advancedOpen ? (
          <>
            <p className="interaction-subheading">Conflict &amp; Priority</p>
            <Row label="Same property">
              <DesignDropdown
                ariaLabel="Same property conflict"
                className="interaction-dropdown"
                noScroll
                onChange={setSameProperty}
                options={[
                  { label: "Replace existing", value: "replace" },
                  { label: "Additive", value: "additive" },
                  { label: "Interrupt", value: "interrupt" },
                ]}
                value={sameProperty}
              />
            </Row>
            <Row label="Other property">
              <DesignDropdown
                ariaLabel="Other property execution"
                className="interaction-dropdown"
                noScroll
                onChange={setOtherProperty}
                options={[
                  { label: "Run in parallel", value: "parallel" },
                  { label: "Run in order", value: "order" },
                ]}
                value={otherProperty}
              />
            </Row>
            <p className="interaction-note">
              List order = priority · drag to reorder
            </p>
            <div className="interaction-order-list">
              {interactions.map((interaction, index) => (
                <div className="interaction-order-row" key={interaction.id}>
                  <span aria-hidden="true" className="interaction-order-grip">
                    ⠿
                  </span>
                  <span>
                    {index + 1}. {interaction.name}
                  </span>
                  <span className="interaction-order-trigger">
                    {triggerLabels.get(interaction.trigger)}
                  </span>
                </div>
              ))}
            </div>

            <p className="interaction-subheading">Logic Event Outputs</p>
            <div className="interaction-subsection-card">
              <p className="interaction-subsection-heading">
                Interaction lifecycle
                <span>Scene Logic input</span>
              </p>
              <div className="interaction-event-output-grid">
                {(
                  [
                    ["On Trigger", "emitTrigger"],
                    ["On Start", "emitStart"],
                    ["On Complete", "emitComplete"],
                    ["On Reset", "emitReset"],
                    ["On Collision", "emitCollision"],
                    ["Custom Event", "emitCustom"],
                  ] as const
                ).map(([label, key]) => (
                  <label key={key}>
                    <input
                      aria-label={`Emit ${label}`}
                      checked={extended[key]}
                      onChange={(event) =>
                        setExtendedValue(key, event.currentTarget.checked)
                      }
                      type="checkbox"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              {extended.emitCustom ? (
                <Row label="Event name">
                  <input
                    aria-label="Custom event output name"
                    className="interaction-text-input"
                    onChange={(event) =>
                      setExtendedValue("eventName", event.currentTarget.value)
                    }
                    placeholder="scene.open.detail"
                    type="text"
                    value={extended.eventName}
                  />
                </Row>
              ) : null}
              <p className="interaction-3d-note">
                Logic can listen to these outputs only to branch between scenes.
                Motion and animation stay in Interaction.
              </p>
            </div>

            {isVisualPipelineEffect ? (
              <>
                <p className="interaction-subheading">Visual Pipeline</p>
                <div className="interaction-subsection-card">
                  <Row label="Quality">
                    <DesignDropdown
                      ariaLabel="Visual effect quality"
                      className="interaction-dropdown"
                      noScroll
                      onChange={(value) =>
                        setExtendedValue("visualQuality", value)
                      }
                      options={[
                        { label: "Performance", value: "performance" },
                        { label: "Balanced", value: "balanced" },
                        { label: "High", value: "high" },
                      ]}
                      value={extended.visualQuality}
                    />
                  </Row>
                  <ToggleRow
                    checked={extended.useHdr}
                    label="HDR rendering"
                    onChange={() =>
                      setExtendedValue("useHdr", !extended.useHdr)
                    }
                  />
                  <Row label="Tone mapping">
                    <DesignDropdown
                      ariaLabel="Tone mapping"
                      className="interaction-dropdown"
                      noScroll
                      onChange={(value) =>
                        setExtendedValue("toneMapping", value)
                      }
                      options={[
                        { label: "None", value: "none" },
                        { label: "Linear", value: "linear" },
                        { label: "Reinhard", value: "reinhard" },
                        { label: "ACES", value: "aces" },
                      ]}
                      value={extended.toneMapping}
                    />
                  </Row>
                  <Row label="Shadow map">
                    <DesignDropdown
                      ariaLabel="Shadow map quality"
                      className="interaction-dropdown"
                      noScroll
                      onChange={(value) =>
                        setExtendedValue("shadowMapQuality", value)
                      }
                      options={[
                        { label: "Low", value: "low" },
                        { label: "Medium", value: "medium" },
                        { label: "High", value: "high" },
                      ]}
                      value={extended.shadowMapQuality}
                    />
                  </Row>
                </div>
              </>
            ) : null}

            {isSpatialPhysicsSelection ? (
              <>
                <p className="interaction-subheading">
                  {is3DSelection ? "3D Rigid Body" : "2D / 3D Collision Body"}
                </p>
                <div className="interaction-subsection-card">
                  <Row label="Body type">
                    <DesignDropdown
                      ariaLabel="Rigid body type"
                      className="interaction-dropdown"
                      noScroll
                      onChange={(value) => {
                        setThreeD((current) => ({
                          ...current,
                          bodyType: value,
                          colliderShape:
                            value === "dynamic" &&
                            current.colliderShape === "mesh"
                              ? "convex-hull"
                              : current.colliderShape,
                        }));
                      }}
                      options={[
                        { label: "Static", value: "static" },
                        { label: "Kinematic", value: "kinematic" },
                        { label: "Dynamic", value: "dynamic" },
                      ]}
                      value={threeD.bodyType}
                    />
                  </Row>
                  <Row label="Collider">
                    <DesignDropdown
                      ariaLabel="Collider shape"
                      className="interaction-dropdown"
                      noScroll
                      onChange={(value) =>
                        setThreeDValue("colliderShape", value)
                      }
                      options={[
                        { label: "Auto", value: "auto" },
                        { label: "Box", value: "box" },
                        { label: "Sphere", value: "sphere" },
                        { label: "Capsule", value: "capsule" },
                        { label: "Convex Hull", value: "convex-hull" },
                        ...(threeD.bodyType !== "dynamic"
                          ? [{ label: "Mesh (precise)", value: "mesh" }]
                          : []),
                      ]}
                      value={threeD.colliderShape}
                    />
                  </Row>
                  <ToggleRow
                    checked={threeD.isSensor}
                    label="Is trigger sensor"
                    onChange={() =>
                      setThreeDValue("isSensor", !threeD.isSensor)
                    }
                  />
                  <Row label="Offset">
                    <div className="interaction-field-pair is-triple">
                      <DesignNumberField
                        ariaLabel="Collider offset X"
                        label="X"
                        onChange={(value) =>
                          setThreeDValue("colliderOffsetX", value)
                        }
                        value={threeD.colliderOffsetX}
                      />
                      <DesignNumberField
                        ariaLabel="Collider offset Y"
                        label="Y"
                        onChange={(value) =>
                          setThreeDValue("colliderOffsetY", value)
                        }
                        value={threeD.colliderOffsetY}
                      />
                      <DesignNumberField
                        ariaLabel="Collider offset Z"
                        label="Z"
                        onChange={(value) =>
                          setThreeDValue("colliderOffsetZ", value)
                        }
                        value={threeD.colliderOffsetZ}
                      />
                    </div>
                  </Row>
                  {["auto", "box", "convex-hull", "mesh"].includes(
                    threeD.colliderShape,
                  ) ? (
                    <Row label="Size">
                      <div className="interaction-field-pair is-triple">
                        <DesignNumberField
                          ariaLabel="Collider size X"
                          label="X"
                          min={0.01}
                          onChange={(value) =>
                            setThreeDValue("colliderSizeX", value)
                          }
                          value={threeD.colliderSizeX}
                        />
                        <DesignNumberField
                          ariaLabel="Collider size Y"
                          label="Y"
                          min={0.01}
                          onChange={(value) =>
                            setThreeDValue("colliderSizeY", value)
                          }
                          value={threeD.colliderSizeY}
                        />
                        <DesignNumberField
                          ariaLabel="Collider size Z"
                          label="Z"
                          min={0.01}
                          onChange={(value) =>
                            setThreeDValue("colliderSizeZ", value)
                          }
                          value={threeD.colliderSizeZ}
                        />
                      </div>
                    </Row>
                  ) : null}
                  {threeD.colliderShape === "sphere" ||
                  threeD.colliderShape === "capsule" ? (
                    <Row label="Radius">
                      <DesignNumberField
                        ariaLabel="Collider radius"
                        label=""
                        min={0.01}
                        onChange={(value) =>
                          setThreeDValue("colliderRadius", value)
                        }
                        value={threeD.colliderRadius}
                      />
                    </Row>
                  ) : null}
                  {threeD.colliderShape === "capsule" ? (
                    <Row label="Height">
                      <DesignNumberField
                        ariaLabel="Collider height"
                        label=""
                        min={0.01}
                        onChange={(value) =>
                          setThreeDValue("colliderHeight", value)
                        }
                        value={threeD.colliderHeight}
                      />
                    </Row>
                  ) : null}
                  {threeD.bodyType === "dynamic" ? (
                    <p className="interaction-3d-note">
                      Dynamic bodies use a convex collider; precise Mesh is
                      available only for Static or Kinematic bodies.
                    </p>
                  ) : null}
                </div>

                <p className="interaction-subheading">
                  {is3DSelection ? "3D Physics" : "Spatial Physics"}
                </p>
                <div className="interaction-subsection-card">
                  <Row label="Mass">
                    <DesignNumberField
                      ariaLabel="3D body mass"
                      label=""
                      min={0.01}
                      onChange={(value) => setThreeDValue("mass", value)}
                      precision={2}
                      value={threeD.mass}
                    />
                  </Row>
                  <Row label="Friction">
                    <DesignRange
                      ariaLabel="3D body friction"
                      className="sound-slider"
                      max={100}
                      min={0}
                      onBegin={noop}
                      onChange={setFriction}
                      value={friction}
                    />
                    <span className="interaction-value-caption">
                      {friction} %
                    </span>
                  </Row>
                  <Row label="Bounciness">
                    <DesignRange
                      ariaLabel="3D body bounciness"
                      className="sound-slider"
                      max={100}
                      min={0}
                      onBegin={noop}
                      onChange={setBounciness}
                      value={bounciness}
                    />
                    <span className="interaction-value-caption">
                      {bounciness} %
                    </span>
                  </Row>
                  <Row label="Linear damping">
                    <DesignRange
                      ariaLabel="Linear damping"
                      className="sound-slider"
                      max={100}
                      min={0}
                      onBegin={noop}
                      onChange={(value) =>
                        setThreeDValue("linearDamping", value)
                      }
                      value={threeD.linearDamping}
                    />
                  </Row>
                  <Row label="Angular damping">
                    <DesignRange
                      ariaLabel="Angular damping"
                      className="sound-slider"
                      max={100}
                      min={0}
                      onBegin={noop}
                      onChange={(value) =>
                        setThreeDValue("angularDamping", value)
                      }
                      value={threeD.angularDamping}
                    />
                  </Row>
                  <Row label="Gravity scale">
                    <DesignNumberField
                      ariaLabel="Gravity scale"
                      label=""
                      onChange={(value) =>
                        setThreeDValue("gravityScale", value)
                      }
                      precision={2}
                      value={threeD.gravityScale}
                    />
                  </Row>
                  <ToggleRow
                    checked={threeD.continuousDetection}
                    label="Continuous collision detection"
                    onChange={() =>
                      setThreeDValue(
                        "continuousDetection",
                        !threeD.continuousDetection,
                      )
                    }
                  />
                  <Row label="Collision layer">
                    <DesignDropdown
                      ariaLabel="Collision layer"
                      className="interaction-dropdown"
                      noScroll
                      onChange={(value) =>
                        setThreeDValue("collisionLayer", value)
                      }
                      options={[
                        { label: "Default", value: "default" },
                        { label: "Artwork", value: "artwork" },
                        { label: "Environment", value: "environment" },
                        { label: "Custom 1", value: "custom-1" },
                      ]}
                      value={threeD.collisionLayer}
                    />
                  </Row>
                  <Row label="Collision mask">
                    <DesignDropdown
                      ariaLabel="Collision mask"
                      className="interaction-dropdown"
                      noScroll
                      onChange={(value) =>
                        setThreeDValue("collisionMask", value)
                      }
                      options={[
                        { label: "All layers", value: "all" },
                        { label: "Same layer", value: "same" },
                        { label: "Custom…", value: "custom" },
                      ]}
                      value={threeD.collisionMask}
                    />
                  </Row>
                </div>

                <p className="interaction-subheading">
                  {is3DSelection ? "3D Constraints" : "Spatial Constraints"}
                </p>
                <div className="interaction-subsection-card">
                  <span className="interaction-subsection-heading">
                    Freeze position
                  </span>
                  <div className="interaction-axis-grid" role="group">
                    {(
                      [
                        ["X", "freezePositionX"],
                        ["Y", "freezePositionY"],
                        ["Z", "freezePositionZ"],
                      ] as const
                    ).map(([axis, key]) => (
                      <label key={key}>
                        <input
                          aria-label={`Freeze position ${axis}`}
                          checked={threeD[key]}
                          onChange={() =>
                            setThreeD((current) => ({
                              ...current,
                              [key]: !current[key],
                            }))
                          }
                          type="checkbox"
                        />
                        <span>{axis}</span>
                      </label>
                    ))}
                  </div>
                  <span className="interaction-subsection-heading">
                    Freeze rotation
                  </span>
                  <div className="interaction-axis-grid" role="group">
                    {(
                      [
                        ["X", "freezeRotationX"],
                        ["Y", "freezeRotationY"],
                        ["Z", "freezeRotationZ"],
                      ] as const
                    ).map(([axis, key]) => (
                      <label key={key}>
                        <input
                          aria-label={`Freeze rotation ${axis}`}
                          checked={threeD[key]}
                          onChange={() =>
                            setThreeD((current) => ({
                              ...current,
                              [key]: !current[key],
                            }))
                          }
                          type="checkbox"
                        />
                        <span>{axis}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {animationNames.length > 0 ? (
                  <>
                    <p className="interaction-subheading">Animation Blending</p>
                    <div className="interaction-subsection-card">
                      <Row label="Clip">
                        <DesignDropdown
                          ariaLabel="Advanced animation clip"
                          className="interaction-dropdown"
                          noScroll
                          onChange={(value) =>
                            setThreeDValue("animationClip", value)
                          }
                          options={animationNames.map((name) => ({
                            label: name,
                            value: name,
                          }))}
                          value={selectedAnimationClip}
                        />
                      </Row>
                      <Row label="Transition">
                        <DesignDropdown
                          ariaLabel="Advanced animation transition"
                          className="interaction-dropdown"
                          noScroll
                          onChange={(value) =>
                            setThreeDValue("transition", value)
                          }
                          options={[
                            { label: "Cut", value: "cut" },
                            { label: "Crossfade", value: "crossfade" },
                            { label: "Blend", value: "blend" },
                          ]}
                          value={threeD.transition}
                        />
                      </Row>
                      <Row label="Blend weight">
                        <DesignRange
                          ariaLabel="Animation blend weight"
                          className="sound-slider"
                          max={100}
                          min={0}
                          onBegin={noop}
                          onChange={(value) =>
                            setThreeDValue("blendWeight", value)
                          }
                          value={threeD.blendWeight}
                        />
                      </Row>
                      <Row label="Root motion">
                        <DesignDropdown
                          ariaLabel="Advanced root motion"
                          className="interaction-dropdown"
                          noScroll
                          onChange={(value) =>
                            setThreeDValue("rootMotion", value)
                          }
                          options={[
                            { label: "Ignore", value: "ignore" },
                            { label: "Apply to object", value: "apply" },
                          ]}
                          value={threeD.rootMotion}
                        />
                      </Row>
                    </div>
                  </>
                ) : null}

                {materialNames.length > 0 ? (
                  <>
                    <p className="interaction-subheading">Material Target</p>
                    <Row label="Material slot">
                      <DesignDropdown
                        ariaLabel="Advanced material slot"
                        className="interaction-dropdown"
                        noScroll
                        onChange={(value) =>
                          setThreeDValue("materialSlot", value)
                        }
                        options={[
                          { label: "All materials", value: "all" },
                          ...materialNames.map((name) => ({
                            label: name,
                            value: name,
                          })),
                        ]}
                        value={selectedMaterialSlot}
                      />
                    </Row>
                  </>
                ) : null}

                {morphTargetNames.length > 0 ? (
                  <>
                    <p className="interaction-subheading">Morph Target</p>
                    <Row label="Target">
                      <DesignDropdown
                        ariaLabel="Advanced morph target"
                        className="interaction-dropdown"
                        noScroll
                        onChange={(value) =>
                          setThreeDValue("morphTarget", value)
                        }
                        options={morphTargetNames.map((name) => ({
                          label: name,
                          value: name,
                        }))}
                        value={selectedMorphTarget}
                      />
                    </Row>
                  </>
                ) : null}
              </>
            ) : null}

            {!isImmediate && !isPairEffect && !isStacking ? (
              <>
                <p className="interaction-subheading">Playback</p>
                <Row label="Repeat">
                  <DesignNumberField
                    ariaLabel="Repeat count"
                    label=""
                    min={0}
                    onChange={setRepeat}
                    unit=""
                    value={repeat}
                  />
                </Row>
                <p className="interaction-note">
                  ∞ allowed — ambient loops run until page exit
                </p>
                <Row label="Yoyo">
                  <button
                    aria-label="Yoyo"
                    aria-pressed={yoyo}
                    className={yoyo ? "sound-toggle is-active" : "sound-toggle"}
                    onClick={() => setYoyo((current) => !current)}
                    type="button"
                  >
                    <span />
                  </button>
                  <span className="interaction-value-caption">
                    play backward after completion
                  </span>
                </Row>
                <Row label="Hold">
                  <SoundStepperField
                    ariaLabel="Hold"
                    onBegin={noop}
                    onChange={setHold}
                    value={hold}
                  />
                </Row>
              </>
            ) : null}
            {trigger === "hover" ? (
              <Row label="Cursor on hover">
                <DesignDropdown
                  ariaLabel="Cursor on hover"
                  className="interaction-dropdown"
                  noScroll
                  onChange={setCursor}
                  options={[
                    { label: "Default", value: "default" },
                    { label: "Pointer", value: "pointer" },
                  ]}
                  value={cursor}
                />
              </Row>
            ) : null}

            {!isImmediate && selectedMotion !== "direct" ? (
              <>
                <p className="interaction-subheading">
                  Physics details ·{" "}
                  {
                    motionChoices.find(
                      (option) => option.value === selectedMotion,
                    )?.label
                  }
                </p>
                {selectedMotion === "spring" ? (
                  <>
                    <Row label="Strength">
                      <DesignRange
                        ariaLabel="Spring strength detail"
                        className="sound-slider"
                        max={200}
                        min={0}
                        onBegin={noop}
                        onChange={setSpringStrength}
                        value={springStrength}
                      />
                    </Row>
                    <Row label="Mass">
                      <DesignRange
                        ariaLabel="Spring mass detail"
                        className="sound-slider"
                        max={10}
                        min={0}
                        onBegin={noop}
                        onChange={setSpringMass}
                        value={springMass}
                      />
                    </Row>
                    <Row label="Damping">
                      <DesignRange
                        ariaLabel="Spring damping detail"
                        className="sound-slider"
                        max={40}
                        min={0}
                        onBegin={noop}
                        onChange={setSpringDamping}
                        value={springDamping}
                      />
                    </Row>
                  </>
                ) : null}
                {selectedMotion === "inertia" ? (
                  <>
                    <Row label="Initial velocity">
                      <DesignRange
                        ariaLabel="Initial velocity detail"
                        className="sound-slider"
                        max={200}
                        min={0}
                        onBegin={noop}
                        onChange={setInitialVelocity}
                        value={initialVelocity}
                      />
                    </Row>
                    <Row label="Friction">
                      <DesignRange
                        ariaLabel="Friction detail"
                        className="sound-slider"
                        max={100}
                        min={0}
                        onBegin={noop}
                        onChange={setFriction}
                        value={friction}
                      />
                    </Row>
                    <Row label="Deceleration">
                      <DesignRange
                        ariaLabel="Deceleration detail"
                        className="sound-slider"
                        max={100}
                        min={0}
                        onBegin={noop}
                        onChange={setDeceleration}
                        value={deceleration}
                      />
                    </Row>
                  </>
                ) : null}
                {selectedMotion === "bounce" ? (
                  <>
                    <Row label="Strength">
                      <DesignRange
                        ariaLabel="Bounce strength detail"
                        className="sound-slider"
                        max={200}
                        min={0}
                        onBegin={noop}
                        onChange={setBounceStrength}
                        value={bounceStrength}
                      />
                    </Row>
                    <Row label="Bounce count">
                      <DesignNumberField
                        ariaLabel="Bounce count detail"
                        label=""
                        min={0}
                        onChange={setBounceCount}
                        value={bounceCount}
                      />
                    </Row>
                    <Row label="Damping">
                      <DesignRange
                        ariaLabel="Bounce damping detail"
                        className="sound-slider"
                        max={40}
                        min={0}
                        onBegin={noop}
                        onChange={setBounceDamping}
                        value={bounceDamping}
                      />
                    </Row>
                  </>
                ) : null}
                {selectedMotion === "gravity" ? (
                  <>
                    <Row label="Strength">
                      <DesignRange
                        ariaLabel="Gravity strength detail"
                        className="sound-slider"
                        max={200}
                        min={0}
                        onBegin={noop}
                        onChange={setGravityStrength}
                        value={gravityStrength}
                      />
                    </Row>
                    {isStacking ? (
                      <Row label="Settle speed">
                        <DesignNumberField
                          ariaLabel="Stacking settle speed"
                          label=""
                          min={0}
                          onChange={(value) =>
                            setStackSleepSpeed(Math.max(0, value))
                          }
                          unit="px/s"
                          value={stackSleepSpeed}
                        />
                      </Row>
                    ) : (
                      <Row label="Bounciness">
                        <DesignRange
                          ariaLabel="Gravity bounciness detail"
                          className="sound-slider"
                          max={100}
                          min={0}
                          onBegin={noop}
                          onChange={setBounciness}
                          value={bounciness}
                        />
                      </Row>
                    )}
                    <Row label="Direction">
                      <DesignDropdown
                        ariaLabel="Gravity direction"
                        className="interaction-dropdown"
                        noScroll
                        onChange={setGravityDirection}
                        options={[
                          { label: "Down", value: "down" },
                          { label: "Up", value: "up" },
                          { label: "Left", value: "left" },
                          { label: "Right", value: "right" },
                          ...(isSpatialPhysicsSelection
                            ? [
                                { label: "Forward (−Z)", value: "forward" },
                                { label: "Backward (+Z)", value: "backward" },
                                { label: "Custom vector", value: "custom" },
                              ]
                            : []),
                        ]}
                        value={gravityDirection}
                      />
                    </Row>
                    {isSpatialPhysicsSelection &&
                    gravityDirection === "custom" ? (
                      <Row label="Gravity vector">
                        <div className="interaction-field-pair is-triple">
                          <DesignNumberField
                            ariaLabel="Gravity vector X"
                            label="X"
                            onChange={(value) =>
                              setThreeDValue("customAxisX", value)
                            }
                            value={threeD.customAxisX}
                          />
                          <DesignNumberField
                            ariaLabel="Gravity vector Y"
                            label="Y"
                            onChange={(value) =>
                              setThreeDValue("customAxisY", value)
                            }
                            value={threeD.customAxisY}
                          />
                          <DesignNumberField
                            ariaLabel="Gravity vector Z"
                            label="Z"
                            onChange={(value) =>
                              setThreeDValue("customAxisZ", value)
                            }
                            value={threeD.customAxisZ}
                          />
                        </div>
                      </Row>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : null}

            {!isImmediate && !isPairEffect && !isStacking && eventTiming ? (
              <>
                <p className="interaction-subheading">Keyframes</p>
                <div className="interaction-keyframes">
                  <span className="interaction-keyframes-time">0 s</span>
                  <span
                    aria-hidden="true"
                    className="interaction-keyframes-line"
                  />
                  <span className="interaction-keyframes-time">
                    {duration} s
                  </span>
                  <button
                    className="interaction-edit-keyframes"
                    onClick={() => setKeyframeEditorOpen(true)}
                    type="button"
                  >
                    Edit keyframes…
                  </button>
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </section>
      <KeyframeTimelineEditor
        durationSeconds={Math.max(0.1, duration)}
        objects={keyframeObjects}
        onClose={() => setKeyframeEditorOpen(false)}
        open={keyframeEditorOpen}
        title="Interaction Keyframes"
      />
    </section>
  );
}
