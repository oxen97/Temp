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
import { SoundStepperField } from "@/features/editor/components/sound/sound-fields";
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

const continuousTriggers = new Set([
  "pointer-move",
  "drag",
  "wheel-pinch",
  "scroll-swipe",
]);
const collisionTriggers = new Set([
  "overlap-start",
  "while-overlapping",
  "overlap-end",
  "drop-on-target",
]);
const timeTriggers = new Set([
  "after-delay",
  "repeat-every",
  "idle-start",
  "idle-end",
]);

const triggerLabels = new Map(
  triggerGroups.flatMap((group) =>
    group.options.map((option) => [option.value, option.label] as const),
  ),
);

const effectOptions = [
  { label: "Move", value: "move" },
  { label: "Scale", value: "scale" },
  { label: "Rotate", value: "rotate" },
  { label: "Skew", value: "skew" },
  { label: "Distort", value: "distort" },
  { label: "Opacity", value: "opacity" },
  { label: "Color", value: "color" },
  { label: "Blur", value: "blur" },
  { label: "Shadow", value: "shadow" },
  { label: "Show / Hide", value: "show-hide" },
  { label: "Shake", value: "shake" },
  { label: "Order", value: "order" },
];

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
  selectedName,
}: {
  selectedName: string | null;
}) {
  const noop = () => {};
  const [interactions, setInteractions] = useState(sampleInteractions);
  const [selectedId, setSelectedId] = useState("sample-move");

  const [trigger, setTrigger] = useState("click-tap");
  const [triggerArea, setTriggerArea] = useState("selected-object");
  const [fallback, setFallback] = useState("tap");
  const [collisionTarget, setCollisionTarget] = useState("sauce-zone");
  const [detection, setDetection] = useState("bounding-box");
  const [timeSeconds, setTimeSeconds] = useState(5);

  const [mapping, setMapping] = useState("drag-progress");
  const [trackDistance, setTrackDistance] = useState(300);
  const [dragAxis, setDragAxis] = useState("free");
  const [rangeMin, setRangeMin] = useState(0);
  const [rangeMax, setRangeMax] = useState(100);
  const [threshold, setThreshold] = useState(80);

  const [effect, setEffect] = useState("move");
  const [moveX, setMoveX] = useState(100);
  const [moveY, setMoveY] = useState(0);
  const [movePath, setMovePath] = useState("straight");
  const [referencePoint, setReferencePoint] = useState("center");
  const [scaleX, setScaleX] = useState(120);
  const [scaleY, setScaleY] = useState(120);
  const [opacityTo, setOpacityTo] = useState(40);

  const [motion, setMotion] = useState("spring");
  const [springStrength, setSpringStrength] = useState(100);
  const [springMass, setSpringMass] = useState(1);
  const [springDamping, setSpringDamping] = useState(12);
  const [bounceOff, setBounceOff] = useState("artboard");

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

  const isContinuous = continuousTriggers.has(trigger);
  const isCollision = collisionTriggers.has(trigger);
  const isTime = timeTriggers.has(trigger);
  const showMapping = isContinuous || isCollision;

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
          <strong>{selectedName ?? "No selection"}</strong>
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
                  <button
                    aria-label={`Preview ${interaction.name}`}
                    className="interaction-row-play"
                    onClick={(event) => event.stopPropagation()}
                    type="button"
                  >
                    <span aria-hidden="true">▶</span>
                  </button>
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
            onChange={setTrigger}
            value={trigger}
          />
        </Row>
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
        {isCollision ? (
          <>
            <Row label="Target element">
              <DesignDropdown
                ariaLabel="Collision target element"
                className="interaction-dropdown"
                noScroll
                onChange={setCollisionTarget}
                options={[
                  { label: "Sauce zone (Rectangle 2)", value: "sauce-zone" },
                  { label: "Floor (Rectangle 3)", value: "floor" },
                ]}
                value={collisionTarget}
              />
            </Row>
            <Row label="Detection">
              <DesignDropdown
                ariaLabel="Collision detection"
                className="interaction-dropdown"
                noScroll
                onChange={setDetection}
                options={[
                  { label: "Bounding box", value: "bounding-box" },
                  { label: "Precise outline", value: "precise-outline" },
                ]}
                value={detection}
              />
            </Row>
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
        <InteractionSection cap="Continuous & collision" title="2. MAPPING">
          <Row label="Input mapping">
            <DesignDropdown
              ariaLabel="Input mapping"
              className="interaction-dropdown"
              noScroll
              onChange={setMapping}
              options={[
                { label: "Drag Progress", value: "drag-progress" },
                { label: "Drag Angle", value: "drag-angle" },
                { label: "Scroll Progress", value: "scroll-progress" },
                { label: "Wheel / Pinch Amount", value: "wheel-amount" },
                { label: "Pointer Velocity", value: "pointer-velocity" },
                { label: "Overlap Time", value: "overlap-time" },
              ]}
              value={mapping}
            />
          </Row>
          {mapping === "drag-progress" ? (
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
                unit="%"
                value={rangeMin}
              />
              <DesignNumberField
                ariaLabel="Input range end"
                label=""
                onChange={setRangeMax}
                unit="%"
                value={rangeMax}
              />
            </div>
          </Row>
          <Row label="Threshold">
            <DesignNumberField
              ariaLabel="Threshold"
              label=""
              max={100}
              min={0}
              onChange={setThreshold}
              unit="%"
              value={threshold}
            />
          </Row>
          <p className="interaction-note">
            Threshold runs an extra event once the value crosses it
          </p>
        </InteractionSection>
      ) : null}

      <InteractionSection cap="Effect" title="3. DO">
        <Row label="Effect">
          <DesignDropdown
            ariaLabel="Effect"
            className="interaction-dropdown"
            onChange={setEffect}
            options={effectOptions}
            value={effect}
          />
        </Row>
        {effect === "move" ? (
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
        {effect === "scale" ? (
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
        {effect === "opacity" ? (
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
      </InteractionSection>

      <InteractionSection cap="Motion" title="4. HOW">
        <Row label="Behavior">
          <DesignDropdown
            ariaLabel="Motion behavior"
            className="interaction-dropdown"
            noScroll
            onChange={setMotion}
            options={[
              { label: "Direct", value: "direct" },
              { label: "Spring", value: "spring" },
              { label: "Inertia", value: "inertia" },
              { label: "Bounce", value: "bounce" },
              { label: "Gravity", value: "gravity" },
            ]}
            value={motion}
          />
        </Row>
        {motion === "spring" ? (
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
        {motion === "gravity" ? (
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

      <InteractionSection
        cap={isContinuous ? "Continuous input" : "Event"}
        title="5. TIMING"
      >
        {isContinuous ? (
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
            <Row label="Stagger">
              <SoundStepperField
                ariaLabel="Stagger"
                onBegin={noop}
                onChange={setStagger}
                value={stagger}
              />
            </Row>
            <p className="interaction-note">
              Sequential delay between grouped elements · forward · reverse ·
              random
            </p>
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
            options={[
              { label: "Contextual default", value: "contextual" },
              { label: "Keep final state", value: "keep" },
              { label: "Restart when triggered again", value: "restart" },
              { label: "Return when trigger ends", value: "return" },
            ]}
            value={resetMode}
          />
        </Row>
        <p className="interaction-hint">
          Default changes automatically for each trigger
        </p>
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

            <p className="interaction-subheading">Physics details · Spring</p>
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

            <p className="interaction-subheading">Keyframes</p>
            <div className="interaction-keyframes">
              <span className="interaction-keyframes-time">0 s</span>
              <span aria-hidden="true" className="interaction-keyframes-line" />
              <span className="interaction-keyframes-time">{duration} s</span>
              <button className="interaction-edit-keyframes" type="button">
                Edit keyframes…
              </button>
            </div>
          </>
        ) : null}
      </section>
    </section>
  );
}
