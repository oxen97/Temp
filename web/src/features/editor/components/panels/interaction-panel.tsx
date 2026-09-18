/* UI preview of the Interaction tab. All state is local to the panel —
   nothing is persisted and no runtime behavior is wired yet. */

import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { type ReactNode, useState } from "react";

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
  collisionInteractionTriggers,
  continuousInteractionTriggers,
  getEffectOptions,
  getMappingOptions,
  getMotionOptions,
  getResetPolicy,
  immediateEffects,
  isLiquidMergeShape,
  mediaInteractionTriggers,
  pageInteractionTriggers,
  timeInteractionTriggers,
} from "@/features/editor/components/panels/interaction-panel-policy";
import { assetPath } from "@/lib/asset-path";

type TriggerOptionGroup = {
  label: string;
  options: { label: string; value: string }[];
};

const triggerGroups: TriggerOptionGroup[] = [
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

const triggerLabels = new Map(
  triggerGroups.flatMap((group) =>
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

export function InteractionPanel({
  elements = [],
  selectedElementIds = [],
  selectedName,
  selectedTypes = [],
}: {
  elements?: readonly { id: string; name: string; type: string }[];
  selectedElementIds?: readonly string[];
  selectedName: string | null;
  selectedTypes?: readonly string[];
}) {
  const noop = () => {};
  const [interactions, setInteractions] = useState(sampleInteractions);
  const [selectedId, setSelectedId] = useState("sample-move");

  const [trigger, setTrigger] = useState("click-tap");
  const [triggerArea, setTriggerArea] = useState("selected-object");
  const [sourceVideo, setSourceVideo] = useState("");
  const [fallback, setFallback] = useState("tap");
  const [longPressSeconds, setLongPressSeconds] = useState(0.5);
  const [collisionTarget, setCollisionTarget] = useState("");
  const [detection, setDetection] = useState("bounding-box");
  const [joinDistance, setJoinDistance] = useState(30);
  const [releaseDistance, setReleaseDistance] = useState(45);
  const [timeSeconds, setTimeSeconds] = useState(5);

  const [mapping, setMapping] = useState("drag-progress");
  const [pointerAxis, setPointerAxis] = useState("both");
  const [mappingMode, setMappingMode] = useState("follow");
  const [trackDistance, setTrackDistance] = useState(300);
  const [dragAxis, setDragAxis] = useState("free");
  const [rangeMin, setRangeMin] = useState(0);
  const [rangeMax, setRangeMax] = useState(100);
  const [threshold, setThreshold] = useState(80);

  const [effect, setEffect] = useState("move");
  const [groupEffect, setGroupEffect] = useState("move");
  const [moveX, setMoveX] = useState(100);
  const [moveY, setMoveY] = useState(0);
  const [movePath, setMovePath] = useState("straight");
  const [referencePoint, setReferencePoint] = useState("center");
  const [scaleX, setScaleX] = useState(120);
  const [scaleY, setScaleY] = useState(120);
  const [opacityTo, setOpacityTo] = useState(40);
  const [bridgeWidth, setBridgeWidth] = useState(50);
  const [liquidSmoothness, setLiquidSmoothness] = useState(60);
  const [affectedObjects, setAffectedObjects] = useState("selected");
  const [impactBounciness, setImpactBounciness] = useState(65);
  const [impactMass, setImpactMass] = useState(1);
  const [targetMass, setTargetMass] = useState(1);
  const [impactFriction, setImpactFriction] = useState(20);

  const [motion, setMotion] = useState("spring");
  const [springStrength, setSpringStrength] = useState(100);
  const [springMass, setSpringMass] = useState(1);
  const [springDamping, setSpringDamping] = useState(12);
  const [initialVelocity, setInitialVelocity] = useState(100);
  const [friction, setFriction] = useState(50);
  const [deceleration, setDeceleration] = useState(50);
  const [bounceStrength, setBounceStrength] = useState(100);
  const [bounceCount, setBounceCount] = useState(2);
  const [bounceDamping, setBounceDamping] = useState(12);
  const [bounceOff, setBounceOff] = useState("artboard");
  const [gravityStrength, setGravityStrength] = useState(100);
  const [bounciness, setBounciness] = useState(50);
  const [gravityDirection, setGravityDirection] = useState("down");

  const [duration, setDuration] = useState(0.3);
  const [delay, setDelay] = useState(0);
  const [stagger, setStagger] = useState(0.05);
  const [easing, setEasing] = useState("ease-out");
  const [smoothing, setSmoothing] = useState(0.1);
  const [continuousEasing, setContinuousEasing] = useState("linear");

  const [resetMode, setResetMode] = useState("contextual");

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [sameProperty, setSameProperty] = useState("replace");
  const [otherProperty, setOtherProperty] = useState("parallel");
  const [repeat, setRepeat] = useState(1);
  const [yoyo, setYoyo] = useState(false);
  const [hold, setHold] = useState(0);
  const [cursor, setCursor] = useState("pointer");

  const isContinuous = continuousInteractionTriggers.has(trigger);
  const isCollision = collisionInteractionTriggers.has(trigger);
  const isTime = timeInteractionTriggers.has(trigger);
  const isMedia = mediaInteractionTriggers.has(trigger);
  const showTriggerArea =
    !isTime && !isMedia && !pageInteractionTriggers.has(trigger);
  const mappingChoices = getMappingOptions(trigger);
  const showMapping = mappingChoices.length > 0;
  const selectedMapping = mappingChoices.some(
    (option) => option.value === mapping,
  )
    ? mapping
    : (mappingChoices[0]?.value ?? "");
  const effectChoices = getEffectOptions(selectedTypes, trigger);
  const selectedEffect = effectChoices.some((option) => option.value === effect)
    ? effect
    : effectChoices[0].value;
  const activeEffect =
    selectedEffect === "group-animation" ? groupEffect : selectedEffect;
  const isLiquidMerge = activeEffect === "liquid-merge";
  const isCollisionBounce = activeEffect === "collision-bounce";
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
  const resetPolicy = getResetPolicy(trigger, fallback, activeEffect);
  const selectedReset = resetPolicy.options.some(
    (option) => option.value === resetMode,
  )
    ? resetMode
    : "contextual";
  const targetChoices = elements
    .filter(
      (element) =>
        !selectedElementIds.includes(element.id) &&
        (!isLiquidMerge || isLiquidMergeShape(element.type)),
    )
    .map((element) => ({
      label: `${element.name} (${element.type})`,
      value: element.id,
    }));
  const selectedCollisionTarget = targetChoices.some(
    (option) => option.value === collisionTarget,
  )
    ? collisionTarget
    : (targetChoices[0]?.value ?? "");

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
        </div>
        <button className="interaction-add-button" type="button">
          + Add interaction
        </button>
      </div>

      <div className="interaction-list">
        {groupOrder.map((groupTrigger) => (
          <div className="interaction-group" key={groupTrigger}>
            <div className="interaction-group-head">
              <span>{triggerLabels.get(groupTrigger)}</span>
              <button className="interaction-add-effect" type="button">
                + Add effect
              </button>
            </div>
            {interactions
              .filter((interaction) => interaction.trigger === groupTrigger)
              .map((interaction) => (
                <div
                  className={[
                    "interaction-row",
                    interaction.id === selectedId ? "is-selected" : "",
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
                      setInteractions((current) =>
                        current.map((item) =>
                          item.id === interaction.id
                            ? { ...item, enabled: !item.enabled }
                            : item,
                        ),
                      );
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
                    onClick={(event) => event.stopPropagation()}
                    type="button"
                  >
                    ⋯
                  </button>
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
              setTrigger(nextTrigger);
              setMapping(getMappingOptions(nextTrigger)[0]?.value ?? "");
              setMappingMode("follow");
              setResetMode("contextual");
              if (
                !getEffectOptions(selectedTypes, nextTrigger).some(
                  (option) => option.value === effect,
                )
              ) {
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
                            ? "No other closed shapes"
                            : "No other objects",
                          value: "",
                        },
                      ]
                }
                value={selectedCollisionTarget}
              />
            </Row>
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
            {isPairEffect ? (
              <p className="interaction-note">
                Precise outline is used for this two-object effect.
              </p>
            ) : null}
            <p className="interaction-note">
              Only elements used by a collision interaction are checked
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
            onChange={setEffect}
            options={effectChoices}
            value={selectedEffect}
          />
        </Row>
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
        {activeEffect === "move" ? (
          <>
            <Row label="Move">
              <div className="interaction-field-pair">
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
              </div>
            </Row>
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
        {activeEffect === "scale" ? (
          <Row label="Scale">
            <div className="interaction-field-pair">
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
            </div>
          </Row>
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
        {isLiquidMerge ? (
          <>
            <Row label="Bridge width">
              <DesignRange
                ariaLabel="Liquid bridge width"
                className="sound-slider"
                max={100}
                min={0}
                onChange={setBridgeWidth}
                value={bridgeWidth}
              />
              <span className="interaction-value-caption">{bridgeWidth} %</span>
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
              Visually join the selected shape and target; keep both source
              objects editable.
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
        {isPairEffect ? (
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
              <Row label="Bounce off">
                <DesignDropdown
                  ariaLabel="Gravity bounce targets"
                  className="interaction-dropdown"
                  noScroll
                  onChange={setBounceOff}
                  options={[
                    { label: "Artboard edges", value: "artboard" },
                    { label: "Artboard + obstacles…", value: "obstacles" },
                  ]}
                  value={bounceOff}
                />
              </Row>
              <p className="interaction-note">
                Falling, bouncing and drop zones — resting piles are not
              </p>
            </>
          ) : null}
        </InteractionSection>
      ) : null}

      <InteractionSection
        cap={
          isCollisionBounce
            ? "Impact action"
            : isImmediate
              ? "Immediate action"
              : eventTiming
                ? "Event"
                : "Continuous input"
        }
        title="5. TIMING"
      >
        {isImmediate || isCollisionBounce ? (
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
              {isCollisionBounce
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

            {!isImmediate && !isPairEffect ? (
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
                        ]}
                        value={gravityDirection}
                      />
                    </Row>
                  </>
                ) : null}
              </>
            ) : null}

            {!isImmediate && !isPairEffect && eventTiming ? (
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
                  <button className="interaction-edit-keyframes" type="button">
                    Edit keyframes…
                  </button>
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </section>
    </section>
  );
}
