const componentInput = document.querySelector("#componentInput");
const sampleButton = document.querySelector("#sampleButton");
const resetButton = document.querySelector("#resetButton");
const shapeButtons = document.querySelectorAll("[data-shape]");
const addTextButton = document.querySelector("#addTextButton");
const bringFrontButton = document.querySelector("#bringFrontButton");
const duplicateButton = document.querySelector("#duplicateButton");
const testEffectButton = document.querySelector("#testEffectButton");
const componentList = document.querySelector("#componentList");
const triggerSelect = document.querySelector("#triggerSelect");
const effectSelect = document.querySelector("#effectSelect");
const zoomRange = document.querySelector("#zoomRange");
const shakeRange = document.querySelector("#shakeRange");
const speedRange = document.querySelector("#speedRange");
const zoomControl = document.querySelector("#zoomControl");
const shakeControl = document.querySelector("#shakeControl");
const speedControl = document.querySelector("#speedControl");
const zoomLabel = document.querySelector("#zoomLabel");
const shakeLabel = document.querySelector("#shakeLabel");
const shakeUnit = document.querySelector("#shakeUnit");
const speedLabel = document.querySelector("#speedLabel");
const actionTypeSelect = document.querySelector("#actionTypeSelect");
const actionValueLabel = document.querySelector("#actionValueLabel");
const actionValueRange = document.querySelector("#actionValueRange");
const actionValueOutput = document.querySelector("#actionValueOutput");
const actionDelayRange = document.querySelector("#actionDelayRange");
const actionDelayOutput = document.querySelector("#actionDelayOutput");
const actionDurationRange = document.querySelector("#actionDurationRange");
const actionDurationOutput = document.querySelector("#actionDurationOutput");
const addActionButton = document.querySelector("#addActionButton");
const clearActionsButton = document.querySelector("#clearActionsButton");
const actionList = document.querySelector("#actionList");
const soundToggle = document.querySelector("#soundToggle");
const soundSelect = document.querySelector("#soundSelect");
const soundCustomOption = soundSelect.querySelector("option[value='custom']");
const soundVolumeRange = document.querySelector("#soundVolumeRange");
const soundVolumeOutput = document.querySelector("#soundVolumeOutput");
const soundFileInput = document.querySelector("#soundFileInput");
const soundFileName = document.querySelector("#soundFileName");
const testSoundButton = document.querySelector("#testSoundButton");
const xRange = document.querySelector("#xRange");
const yRange = document.querySelector("#yRange");
const wRange = document.querySelector("#wRange");
const hRange = document.querySelector("#hRange");
const rotationRange = document.querySelector("#rotationRange");
const opacityRange = document.querySelector("#opacityRange");
const fillInput = document.querySelector("#fillInput");
const strokeInput = document.querySelector("#strokeInput");
const strokeTransparentToggle = document.querySelector("#strokeTransparentToggle");
const strokeWidthRange = document.querySelector("#strokeWidthRange");
const strokeWidthInput = document.querySelector("#strokeWidthInput");
const cornerRadiusRange = document.querySelector("#cornerRadiusRange");
const cornerRadiusInput = document.querySelector("#cornerRadiusInput");
const curveC1XRange = document.querySelector("#curveC1XRange");
const curveC1YRange = document.querySelector("#curveC1YRange");
const curveC2XRange = document.querySelector("#curveC2XRange");
const curveC2YRange = document.querySelector("#curveC2YRange");
const strokeStyleSelect = document.querySelector("#strokeStyleSelect");
const lineCapSelect = document.querySelector("#lineCapSelect");
const textInput = document.querySelector("#textInput");
const fontInput = document.querySelector("#fontInput");
const fontSizeRange = document.querySelector("#fontSizeRange");
const xOutput = document.querySelector("#xOutput");
const yOutput = document.querySelector("#yOutput");
const wOutput = document.querySelector("#wOutput");
const hOutput = document.querySelector("#hOutput");
const rotationOutput = document.querySelector("#rotationOutput");
const opacityOutput = document.querySelector("#opacityOutput");
const zoomOutput = document.querySelector("#zoomOutput");
const shakeOutput = document.querySelector("#shakeOutput");
const speedOutput = document.querySelector("#speedOutput");
const strokeWidthOutput = document.querySelector("#strokeWidthOutput");
const cornerRadiusOutput = document.querySelector("#cornerRadiusOutput");
const curveC1XOutput = document.querySelector("#curveC1XOutput");
const curveC1YOutput = document.querySelector("#curveC1YOutput");
const curveC2XOutput = document.querySelector("#curveC2XOutput");
const curveC2YOutput = document.querySelector("#curveC2YOutput");
const fontSizeOutput = document.querySelector("#fontSizeOutput");
const selectedSummary = document.querySelector("#selectedSummary");
const effectSummary = document.querySelector("#effectSummary");
const interactionCount = document.querySelector("#interactionCount");
const statusTitle = document.querySelector("#statusTitle");
const statusText = document.querySelector("#statusText");
const emptyState = document.querySelector("#emptyState");
const artSurface = document.querySelector("#artSurface");
const stage = document.querySelector("#stage");
const componentLayer = document.querySelector("#componentLayer");
const smartGuideLayer = document.querySelector("#smartGuideLayer");
const artboardWidthInput = document.querySelector("#artboardWidthInput");
const artboardHeightInput = document.querySelector("#artboardHeightInput");
const artboardBgInput = document.querySelector("#artboardBgInput");
const artboardTransparentToggle = document.querySelector("#artboardTransparentToggle");
const fillTransparentToggle = document.querySelector("#fillTransparentToggle");
const rangeControls = Array.from(document.querySelectorAll("input[type='range']"));
const appearancePanel = fillInput.closest(".panel-section");
const textPanel = textInput.closest(".panel-section");
const fillField = fillInput.closest(".field");
const fillTransparentField = fillTransparentToggle.closest(".toggle");
const strokeField = strokeInput.closest(".field");
const strokeTransparentField = strokeTransparentToggle.closest(".toggle");
const strokeWidthField = strokeWidthRange.closest(".range-field");
const cornerRadiusField = cornerRadiusRange.closest(".range-field");
const curvePanel = curveC1XRange.closest(".panel-section");
const strokeStyleField = strokeStyleSelect.closest(".field");
const lineCapField = lineCapSelect.closest(".field");

const effectClasses = [
  "effect-zoom",
  "effect-shake",
  "effect-bounce",
  "effect-tilt",
  "effect-glitch",
  "effect-wave",
  "effect-split",
  "effect-reveal",
  "effect-spin",
  "effect-pulse",
  "effect-blur",
  "effect-flicker"
];

const triggerLabels = {
  click: "Click / Tap",
  hover: "Hover / Mobile Tap",
  drag: "Drag / Swipe",
  wheel: "Wheel / Pinch Policy"
};

const effectLabels = {
  zoom: "Zoom",
  shake: "Shake",
  bounce: "Bounce",
  tilt: "Tilt",
  glitch: "Glitch",
  wave: "Wave Distort",
  split: "Split Layer",
  reveal: "Reveal Note",
  spin: "Spin",
  pulse: "Pulse Glow",
  blur: "Blur Focus",
  flicker: "Fade Flicker"
};

const effectControlConfigs = {
  zoom: { zoom: { label: "Scale", unit: "%" }, speed: { label: "Speed" } },
  shake: { shake: { label: "Distance", unit: "px" }, speed: { label: "Speed" } },
  bounce: { shake: { label: "Power", unit: "" }, speed: { label: "Speed" } },
  tilt: { shake: { label: "Angle", unit: "deg" }, speed: { label: "Speed" } },
  glitch: { shake: { label: "Intensity", unit: "px" }, speed: { label: "Speed" } },
  wave: { shake: { label: "Warp", unit: "" }, speed: { label: "Speed" } },
  split: { shake: { label: "Separation", unit: "" }, speed: { label: "Speed" } },
  reveal: { speed: { label: "Speed" } },
  spin: { speed: { label: "Speed" } },
  pulse: { zoom: { label: "Scale", unit: "%" }, speed: { label: "Speed" } },
  blur: { shake: { label: "Blur", unit: "px" }, speed: { label: "Speed" } },
  flicker: { speed: { label: "Speed" } }
};

const sampleSounds = {
  "sample-ping": { label: "Soft Ping MP3", src: "./sample-audio/01-soft-ping.mp3" },
  "sample-tap": { label: "Glass Tap MP3", src: "./sample-audio/02-glass-tap.mp3" },
  "sample-pop": { label: "Deep Pop MP3", src: "./sample-audio/03-deep-pop.mp3" }
};

const soundLabels = {
  none: "No Sound",
  tone: "Generated Tone",
  custom: "Uploaded Audio",
  ...Object.fromEntries(Object.entries(sampleSounds).map(([key, sound]) => [key, sound.label]))
};

const actionConfigs = {
  scale: { label: "Scale", min: 20, max: 220, step: 1, value: 130, unit: "%", duration: 420, easing: "cubic-bezier(.18, .89, .32, 1.28)" },
  moveX: { label: "Move X", min: -240, max: 240, step: 4, value: 80, unit: "px", duration: 440, easing: "cubic-bezier(.2, .8, .2, 1)" },
  moveY: { label: "Move Y", min: -240, max: 240, step: 4, value: -80, unit: "px", duration: 440, easing: "cubic-bezier(.2, .8, .2, 1)" },
  rotate: { label: "Rotate", min: -360, max: 360, step: 5, value: 90, unit: "deg", duration: 520, easing: "cubic-bezier(.2, .8, .2, 1)" },
  opacity: { label: "Opacity", min: 0, max: 100, step: 1, value: 35, unit: "%", duration: 360, easing: "ease-in-out" },
  blur: { label: "Blur", min: 0, max: 20, step: 1, value: 6, unit: "px", duration: 420, easing: "ease-in-out" },
  glow: { label: "Glow", min: 0, max: 100, step: 1, value: 70, unit: "%", duration: 520, easing: "ease-out" },
  spring: { label: "Spring", min: 8, max: 140, step: 2, value: 48, unit: "px", duration: 620, easing: "linear" },
  sound: { label: "Sound", min: 0, max: 0, step: 1, value: 0, unit: "", duration: 0, noValue: true, noDuration: true }
};

const shapeLabels = {
  line: "Line",
  curve: "Curve",
  circle: "Circle",
  rect: "Rectangle",
  triangle: "Triangle",
  star: "Star"
};

const defaultCurve = {
  curveC1X: 28,
  curveC1Y: 8,
  curveC2X: 72,
  curveC2Y: 8
};
const maxStrokeWidth = 20;
const smartGuideSnapPx = 6;
const smartGuideSpacingSnapPx = 10;
const smartGuideSpacingReleasePx = 16;
const smartGuideSpacingPriorityPx = 6;
const smartGuideCrossAxisPaddingPx = 28;
const smartGuideMeasureLimitPx = 360;

const sampleComponents = [
  { name: "Green Orb", src: "./sample-components/01-green-orb.svg", x: 10, y: 10, w: 20, h: 28, effect: "zoom", trigger: "click", zoom: 150, shake: 12 },
  { name: "Yellow Triangle", src: "./sample-components/02-yellow-triangle.svg", x: 25, y: 12, w: 20, h: 28, effect: "tilt", trigger: "hover", zoom: 130, shake: 16 },
  { name: "Red Disc", src: "./sample-components/03-red-disc.svg", x: 48, y: 26, w: 28, h: 32, effect: "bounce", trigger: "click", zoom: 135, shake: 18 },
  { name: "Blue Card", src: "./sample-components/04-blue-card.svg", x: 68, y: 14, w: 24, h: 25, effect: "glitch", trigger: "hover", zoom: 130, shake: 16 },
  { name: "Black Wave", src: "./sample-components/05-black-wave.svg", x: 9, y: 52, w: 70, h: 18, effect: "wave", trigger: "drag", zoom: 125, shake: 18 },
  { name: "Title Type", src: "./sample-components/06-title-type.svg", x: 8, y: 74, w: 58, h: 13, effect: "reveal", trigger: "click", zoom: 118, shake: 10 },
  { name: "Dot Grid", src: "./sample-components/07-dot-grid.svg", x: 70, y: 50, w: 20, h: 20, effect: "shake", trigger: "click", zoom: 120, shake: 22 },
  { name: "Pink Ribbon", src: "./sample-components/08-pink-ribbon.svg", x: 42, y: 5, w: 38, h: 16, effect: "split", trigger: "wheel", zoom: 135, shake: 14 },
  { name: "Outline Star", src: "./sample-components/09-outline-star.svg", x: 78, y: 68, w: 15, h: 20, effect: "zoom", trigger: "click", zoom: 165, shake: 10 },
  { name: "Caption", src: "./sample-components/10-caption.svg", x: 42, y: 86, w: 42, h: 10, effect: "shake", trigger: "hover", zoom: 120, shake: 8 }
];

const defaultArtboard = {
  width: 940,
  height: 588,
  background: "#ffffff",
  transparent: false
};
let artboard = { ...defaultArtboard };

let nextId = 1;
let selectedId = null;
let selectedIds = [];
let components = [];
let interactions = 0;
let audioContext = null;
const activeAudioPlayers = new Set();
const activeToneNodes = new Set();
const activeActionRuns = new Map();
let dragState = null;
let resizeState = null;
let cornerRadiusState = null;
let curveHandleState = null;
let marqueeState = null;
let marqueeNode = null;
let copiedComponent = null;
let movedDuringDrag = false;
const maxHistory = 100;
let historyStack = [];
let isRestoringHistory = false;

function selectedComponents() {
  const ids = new Set(selectedIds);
  return components.filter((component) => ids.has(component.id));
}

function selectedComponent() {
  const selected = selectedComponents();
  if (!selected.length) return null;
  return selected.find((component) => component.id === selectedId) || selected[selected.length - 1];
}

function setSelection(ids) {
  const existingIds = new Set(components.map((component) => component.id));
  selectedIds = Array.from(new Set(ids)).filter((id) => existingIds.has(id));
  selectedId = selectedIds[selectedIds.length - 1] || null;
}

function selectOnly(id) {
  setSelection([id]);
}

function isSelected(id) {
  return selectedIds.includes(id);
}

function toggleSelection(id) {
  if (isSelected(id)) {
    setSelection(selectedIds.filter((selected) => selected !== id));
    return;
  }
  setSelection([...selectedIds, id]);
}

function syncSelectionVisuals() {
  preserveScrollPosition(() => {
    componentLayer.querySelectorAll(".art-component").forEach((node) => {
      node.classList.toggle("is-selected", isSelected(Number(node.dataset.id)));
    });
    renderComponentList();
    syncControlsFromSelection();
  });
}

function scrollTargets() {
  return Array.from(new Set([
    document.scrollingElement,
    document.documentElement,
    document.body,
    stage,
    document.querySelector(".left-sidebar"),
    document.querySelector(".right-sidebar")
  ].filter(Boolean)));
}

function preserveScrollPosition(callback) {
  const positions = scrollTargets().map((target) => ({
    target,
    left: target.scrollLeft,
    top: target.scrollTop
  }));
  const result = callback();
  const restore = () => {
    positions.forEach(({ target, left, top }) => {
      target.scrollLeft = left;
      target.scrollTop = top;
    });
  };
  restore();
  window.requestAnimationFrame(restore);
  return result;
}

function cloneActions(actions) {
  return Array.isArray(actions) ? actions.map((action) => ({ ...action })) : [];
}

function cloneComponent(component) {
  return {
    ...component,
    actions: cloneActions(component.actions)
  };
}

function captureState() {
  return {
    components: components.map(cloneComponent),
    selectedIds: [...selectedIds],
    selectedId,
    nextId,
    interactions,
    artboard: { ...artboard },
    artboardVisible: !artSurface.classList.contains("is-hidden")
  };
}

function saveHistory() {
  if (isRestoringHistory) return;
  const snapshot = captureState();
  const serialized = JSON.stringify(snapshot);
  if (historyStack[historyStack.length - 1]?.serialized === serialized) return;
  historyStack.push({ snapshot, serialized });
  if (historyStack.length > maxHistory) historyStack.shift();
}

function restoreState(record) {
  if (!record?.snapshot) return;
  isRestoringHistory = true;
  components = record.snapshot.components.map(cloneComponent);
  selectedIds = [...record.snapshot.selectedIds];
  selectedId = record.snapshot.selectedId;
  nextId = record.snapshot.nextId;
  interactions = record.snapshot.interactions;
  artboard = { ...record.snapshot.artboard };
  interactionCount.textContent = String(interactions);
  syncArtboardInputs();
  applyArtboardSettings();

  if (record.snapshot.artboardVisible || components.length) {
    emptyState.classList.add("is-hidden");
    artSurface.classList.remove("is-hidden");
  } else {
    emptyState.classList.remove("is-hidden");
    artSurface.classList.add("is-hidden");
  }

  render();
  isRestoringHistory = false;
}

function undoLastAction() {
  const record = historyStack.pop();
  if (!record) return;
  restoreState(record);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function visualAspectForShape(shape) {
  return shape === "triangle" ? 2 / Math.sqrt(3) : 1;
}

function percentHeightForVisualAspect(widthPercent, visualAspect = 1) {
  const artboardAspect = artboard.width / artboard.height;
  return widthPercent * artboardAspect / visualAspect;
}

function widthPercentForVisualAspect(heightPercent, visualAspect = 1) {
  const artboardAspect = artboard.width / artboard.height;
  return heightPercent * visualAspect / artboardAspect;
}

function percentHeightForPixels(pixels) {
  const renderedHeight = artSurface?.getBoundingClientRect().height || artboard.height;
  return Math.max(0.2, Number(pixels) / renderedHeight * 100);
}

function lineHeightForStroke(strokeWidth) {
  return percentHeightForPixels(Math.max(3, clampNumber(strokeWidth, 0, maxStrokeWidth, 1) + 2));
}

function defaultShapeSize(shape) {
  if (shape === "line") return { w: 60, h: lineHeightForStroke(1) };
  if (shape === "curve") return { w: 46, h: 16 };
  const width = shape === "rect" || shape === "circle" || shape === "triangle" ? 20 : 18;
  const visualAspect = visualAspectForShape(shape);
  return { w: width, h: percentHeightForVisualAspect(width, visualAspect) };
}

function setVisible(element, visible) {
  if (!element) return;
  element.classList.toggle("is-hidden", !visible);
}

function updateInspectorVisibility(component) {
  const isSingleSelection = selectedIds.length === 1;
  const isShape = isSingleSelection && component?.type === "shape";
  const isText = isSingleSelection && component?.type === "text";
  const isCurve = isShape && component.shape === "curve";
  const hasEditableAppearance = isShape || isText;
  const hasFill = isText || (isShape && !["line", "curve"].includes(component.shape));

  setVisible(appearancePanel, hasEditableAppearance);
  setVisible(textPanel, isText);
  setVisible(fillField, hasFill);
  setVisible(fillTransparentField, hasFill);
  setVisible(strokeField, hasEditableAppearance);
  setVisible(strokeTransparentField, hasEditableAppearance);
  setVisible(strokeWidthField, hasEditableAppearance);
  setVisible(cornerRadiusField, isShape && supportsCornerRadius(component));
  setVisible(curvePanel, isCurve);
  setVisible(strokeStyleField, isShape);
  setVisible(lineCapField, isShape && ["line", "curve"].includes(component.shape));
}
function applyArtboardSettings() {
  artSurface.style.setProperty("--artboard-width", `${artboard.width}px`);
  artSurface.style.setProperty("--artboard-aspect", `${artboard.width} / ${artboard.height}`);
  artSurface.style.setProperty("--artboard-bg", artboard.transparent ? "transparent" : artboard.background);
  artSurface.classList.toggle("is-transparent", artboard.transparent);
  artboardBgInput.disabled = artboard.transparent;
}

function syncArtboardInputs() {
  artboardWidthInput.value = Math.round(artboard.width);
  artboardHeightInput.value = Math.round(artboard.height);
  artboardBgInput.value = artboard.background;
  artboardTransparentToggle.checked = artboard.transparent;
}

function preserveComponentPixelsForArtboardResize(previousArtboard, nextArtboard) {
  if (!previousArtboard.width || !previousArtboard.height || !nextArtboard.width || !nextArtboard.height) return;
  components.forEach((component) => {
    const pixelX = previousArtboard.width * Number(component.x) / 100;
    const pixelY = previousArtboard.height * Number(component.y) / 100;
    const pixelW = previousArtboard.width * Number(component.w) / 100;
    const pixelH = previousArtboard.height * Number(component.h) / 100;
    component.x = pixelX / nextArtboard.width * 100;
    component.y = pixelY / nextArtboard.height * 100;
    component.w = pixelW / nextArtboard.width * 100;
    component.h = pixelH / nextArtboard.height * 100;
  });
}

function syncArtboardFromControls() {
  saveHistory();
  const previousArtboard = { ...artboard };
  const nextArtboard = {
    width: clampNumber(artboardWidthInput.value, 320, 2400, defaultArtboard.width),
    height: clampNumber(artboardHeightInput.value, 240, 1800, defaultArtboard.height),
    background: artboardBgInput.value || defaultArtboard.background,
    transparent: artboardTransparentToggle.checked
  };
  const sizeChanged = previousArtboard.width !== nextArtboard.width || previousArtboard.height !== nextArtboard.height;
  if (sizeChanged) preserveComponentPixelsForArtboardResize(previousArtboard, nextArtboard);
  artboard = nextArtboard;
  syncArtboardInputs();
  applyArtboardSettings();
  if (sizeChanged) {
    components.forEach(clampComponent);
    render();
  }
}
function setCanvasReady(title = "Components loaded") {
  emptyState.classList.add("is-hidden");
  artSurface.classList.remove("is-hidden");
  statusTitle.textContent = title;
  statusText.textContent = "Select a component, drag it into place, then freely change style or effect.";
}

function loadSamples() {
  saveHistory();
  components = [];
  setSelection([]);
  nextId = 1;
  interactions = 0;
  interactionCount.textContent = "0";
  const sampleSoundKeys = Object.keys(sampleSounds);
  sampleComponents.forEach((item, index) => addComponent({
    ...item,
    type: "image",
    soundSource: sampleSoundKeys[index % sampleSoundKeys.length],
    soundVolume: 82
  }, false));
  setSelection(components[0] ? [components[0].id] : []);
  setCanvasReady("10 separate sample components loaded");
  render();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name.replace(/\.[^.]+$/, ""), src: reader.result });
    reader.readAsDataURL(file);
  });
}

async function loadComponentFiles(files) {
  const list = Array.from(files || []);
  if (!list.length) return;
  const loaded = await Promise.all(list.map(readFileAsDataUrl));
  saveHistory();
  components = [];
  setSelection([]);
  nextId = 1;
  interactions = 0;
  interactionCount.textContent = "0";

  loaded.forEach((item, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    addComponent({
      type: "image",
      name: item.name || `Component ${index + 1}`,
      src: item.src,
      x: 8 + col * 22,
      y: 10 + row * 23,
      w: 18,
      h: 18,
      effect: index % 2 ? "shake" : "zoom",
      trigger: "click"
    }, false);
  });

  setSelection(components[0] ? [components[0].id] : []);
  setCanvasReady(`${loaded.length} uploaded components loaded`);
  render();
}

function defaultStyle() {
  return {
    fill: fillInput.value || "#ffffff",
    fillTransparent: fillTransparentToggle.checked,
    stroke: strokeInput.value || "#191714",
    strokeTransparent: strokeTransparentToggle.checked,
    strokeWidth: clampNumber(strokeWidthRange.value, 0, maxStrokeWidth, 0),
    cornerRadius: Number(cornerRadiusRange.value) || 0,
    curveC1X: Number(curveC1XRange.value) || defaultCurve.curveC1X,
    curveC1Y: Number(curveC1YRange.value) || defaultCurve.curveC1Y,
    curveC2X: Number(curveC2XRange.value) || defaultCurve.curveC2X,
    curveC2Y: Number(curveC2YRange.value) || defaultCurve.curveC2Y,
    strokeStyle: strokeStyleSelect.value || "solid",
    lineCap: lineCapSelect.value || "round",
    text: textInput.value || "INTERACTIVE",
    font: fontInput.value || "Arial",
    fontSize: Number(fontSizeRange.value) || 48
  };
}
function addShape(shape) {
  const style = defaultStyle();
  const size = defaultShapeSize(shape);

  addComponent({
    ...style,
    type: "shape",
    shape,
    name: shapeLabels[shape],
    x: 35,
    y: 35,
    ...size,
    fill: "#ffffff",
    fillTransparent: !["line", "curve"].includes(shape),
    strokeTransparent: false,
    strokeWidth: 1,
    cornerRadius: 0,
    ...defaultCurve,
    effect: effectSelect.value,
    trigger: triggerSelect.value
  }, true);
}
function addText() {
  addComponent({
    ...defaultStyle(),
    type: "text",
    name: "Text",
    x: 24,
    y: 42,
    w: 42,
    h: 12,
    fill: "#191714",
    fillTransparent: false,
    strokeTransparent: false,
    effect: effectSelect.value,
    trigger: triggerSelect.value
  }, true);
}
function addComponent(config, shouldRender = true) {
  if (shouldRender) saveHistory();
  const id = nextId++;
  const fillTransparent = Boolean(config.fillTransparent ?? config.fill === "transparent");
  const strokeTransparent = Boolean(config.strokeTransparent ?? config.stroke === "transparent");
  const component = {
    id,
    type: config.type || "image",
    shape: config.shape || "rect",
    name: config.name || `Component ${id}`,
    src: config.src || "",
    x: config.x ?? 20,
    y: config.y ?? 20,
    w: config.w ?? 20,
    h: config.h ?? 20,
    rotation: config.rotation ?? 0,
    opacity: config.opacity ?? 100,
    trigger: config.trigger || triggerSelect.value,
    effect: config.effect || effectSelect.value,
    zoom: config.zoom ?? Number(zoomRange.value),
    shake: config.shake ?? Number(shakeRange.value),
    speed: config.speed ?? Number(speedRange.value),
    soundEnabled: config.soundEnabled ?? soundToggle.checked,
    soundSource: config.soundSource || (soundSelect.value === "mixed" ? "tone" : soundSelect.value) || "tone",
    soundSrc: config.soundSrc || "",
    soundName: config.soundName || "",
    soundVolume: clampNumber(config.soundVolume ?? soundVolumeRange.value, 0, 100, 80),
    actions: cloneActions(config.actions),
    fill: config.fill && config.fill !== "transparent" ? config.fill : fillInput.value || "#ffffff",
    fillTransparent,
    stroke: config.stroke && config.stroke !== "transparent" ? config.stroke : strokeInput.value || "#191714",
    strokeTransparent,
    strokeWidth: clampNumber(config.strokeWidth ?? strokeWidthRange.value, 0, maxStrokeWidth, 1),
    cornerRadius: config.cornerRadius ?? Number(cornerRadiusRange.value),
    curveC1X: clampNumber(config.curveC1X ?? curveC1XRange.value, 0, 100, defaultCurve.curveC1X),
    curveC1Y: clampNumber(config.curveC1Y ?? curveC1YRange.value, 0, 100, defaultCurve.curveC1Y),
    curveC2X: clampNumber(config.curveC2X ?? curveC2XRange.value, 0, 100, defaultCurve.curveC2X),
    curveC2Y: clampNumber(config.curveC2Y ?? curveC2YRange.value, 0, 100, defaultCurve.curveC2Y),
    strokeStyle: config.strokeStyle || strokeStyleSelect.value,
    lineCap: config.lineCap || lineCapSelect.value,
    text: config.text || textInput.value,
    font: config.font || fontInput.value,
    fontSize: config.fontSize ?? Number(fontSizeRange.value),
    count: 0
  };

  clampComponent(component);
  components.push(component);
  setSelection([id]);
  setCanvasReady();
  if (shouldRender) render();
}
function clampComponent(component) {
  const minSize = component.type === "shape" && component.shape === "line" ? 0.2 : 1;
  const minHeight = component.type === "shape" && component.shape === "line" ? lineHeightForStroke(component.strokeWidth) : minSize;
  component.w = Math.max(minSize, Math.min(100, Number(component.w)));
  component.h = Math.max(minHeight, Math.min(100, Number(component.h)));
  component.x = Math.max(0, Math.min(100 - component.w, Number(component.x)));
  component.y = Math.max(0, Math.min(100 - component.h, Number(component.y)));
  component.rotation = Math.max(-180, Math.min(180, Number(component.rotation)));
}

function render() {
  preserveScrollPosition(() => {
    renderComponents();
    renderComponentList();
    syncControlsFromSelection();
  });
}

function renderComponents() {
  componentLayer.innerHTML = "";

  components.forEach((component, index) => {
    clampComponent(component);
    const node = document.createElement("div");
    node.className = `art-component${component.type === "shape" ? ` is-${component.shape}` : ""}${isSelected(component.id) ? " is-selected" : ""}`;
    node.dataset.id = component.id;
    node.dataset.name = component.name;
    node.style.left = `${component.x}%`;
    node.style.top = `${component.y}%`;
    node.style.width = `${component.w}%`;
    node.style.height = `${component.h}%`;
    node.style.zIndex = String(index + 1);
    node.style.opacity = "1";
    node.style.setProperty("--component-opacity", String((component.opacity ?? 100) / 100));
    node.style.borderRadius = component.type === "shape" && component.shape === "rect" ? `${Math.min(40, Number(component.cornerRadius) || 0)}px` : "0";
    applyBaseTransform(node, component);
    applyEffectVars(node, component);
    applySelectionVars(node, component);

    const viewport = document.createElement("div");
    viewport.className = "component-viewport";
    viewport.appendChild(componentVisual(component, "component-image"));
    viewport.appendChild(componentVisual(component, "component-ghost-a"));
    viewport.appendChild(componentVisual(component, "component-ghost-b"));

    const note = document.createElement("div");
    note.className = "component-note";
    note.innerHTML = `<strong>${escapeHtml(component.name)}</strong><span>${triggerLabels[component.trigger]} + ${effectLabels[component.effect]}</span>`;

    node.appendChild(viewport);
    const selectionBox = createSelectionBox(component);
    node.appendChild(selectionBox);
    if (component.type === "shape" && component.shape === "curve") {
      node.appendChild(createCurveControls(component));
    }
    node.appendChild(note);
    bindComponentEvents(node, component);
    componentLayer.appendChild(node);
  });
}

function componentVisual(component, className) {
  const wrapper = document.createElement("div");
  wrapper.className = className;

  if (component.type === "shape") {
    wrapper.innerHTML = shapeSvg(component);
    return wrapper;
  }

  if (component.type === "text") {
    const span = document.createElement("span");
    span.className = "text-visual";
    span.textContent = component.text || "Text";
    span.style.color = component.fillTransparent ? "transparent" : component.fill || "#191714";
    span.style.fontFamily = component.font || "Arial";
    span.style.fontSize = `${component.fontSize || 48}px`;
    span.style.webkitTextStroke = `${component.strokeWidth || 0}px ${component.strokeTransparent ? "transparent" : component.stroke || "transparent"}`;
    wrapper.appendChild(span);
    return wrapper;
  }

  const img = document.createElement("img");
  img.src = component.src;
  img.alt = "";
  wrapper.appendChild(img);
  return wrapper;
}

function componentPixelSize(component) {
  return {
    width: Math.max(1, artboard.width * component.w / 100),
    height: Math.max(1, artboard.height * component.h / 100)
  };
}

function svgStrokeInset(component, viewBoxWidth, viewBoxHeight, multiplier = 1) {
  const strokePixels = Math.max(0, Number(component.strokeWidth) || 0);
  if (!strokePixels) return { x: 0, y: 0 };
  const size = componentPixelSize(component);
  const screenInset = strokePixels * multiplier / 2 + 0.5;
  return {
    x: Math.min(viewBoxWidth * 0.24, screenInset * viewBoxWidth / size.width),
    y: Math.min(viewBoxHeight * 0.24, screenInset * viewBoxHeight / size.height)
  };
}

function applySelectionVars(node, component) {
  const selectionOffset = 4;
  node.style.setProperty("--selection-offset", `${selectionOffset}px`);
  node.style.setProperty("--selection-inset", `-${selectionOffset}px`);
}

function curvePointValue(component, key) {
  return clampNumber(component?.[key], 0, 100, defaultCurve[key]);
}

function shapeSvg(component) {
  const fill = component.fillTransparent ? "transparent" : component.fill || "#ffffff";
  const stroke = component.strokeTransparent ? "transparent" : component.stroke || "#191714";
  const sw = clampNumber(component.strokeWidth, 0, maxStrokeWidth, 0);
  const dash = component.strokeStyle === "dashed" ? ` stroke-dasharray="${Math.max(10, sw * 2)} ${Math.max(8, sw * 1.4)}"` : component.strokeStyle === "dotted" ? ` stroke-dasharray="1 ${Math.max(8, sw * 1.8)}"` : "";
  const lineCap = component.lineCap || "round";
  const radius = Math.max(0, Math.min(100, Number(component.cornerRadius) || 0));
  const strokeJoin = radius > 0 ? "round" : "miter";
  const common = `stroke="${stroke}" stroke-width="${sw}" vector-effect="non-scaling-stroke" stroke-linejoin="${strokeJoin}" stroke-miterlimit="4" stroke-linecap="${lineCap}"${dash}`;
  const polygonStrokeJoin = radius > 0 ? "round" : "miter";
  const polygonCommon = `stroke="${stroke}" stroke-width="${sw}" vector-effect="non-scaling-stroke" stroke-linejoin="${polygonStrokeJoin}" stroke-miterlimit="3" stroke-linecap="${lineCap}"${dash}`;

  if (component.shape === "line") {
    const lineWidth = Math.max(sw, 1);
    const lineDash = component.strokeStyle === "dashed" ? ` stroke-dasharray="${Math.max(14, lineWidth * 2)} ${Math.max(10, lineWidth * 1.4)}"` : component.strokeStyle === "dotted" ? ` stroke-dasharray="1 ${Math.max(10, lineWidth * 1.8)}"` : "";
    const inset = svgStrokeInset(component, 220, 100);
    return `<svg class="component-svg line-svg" preserveAspectRatio="none" viewBox="0 0 220 100" aria-hidden="true"><line x1="${roundPathValue(inset.x)}" y1="50" x2="${roundPathValue(220 - inset.x)}" y2="50" stroke="${stroke}" stroke-width="${lineWidth}" vector-effect="non-scaling-stroke" stroke-linecap="${component.lineCap || "round"}"${lineDash}/></svg>`;
  }

  if (component.shape === "curve") {
    const lineWidth = Math.max(sw, 1);
    const lineDash = component.strokeStyle === "dashed" ? ` stroke-dasharray="${Math.max(14, lineWidth * 2)} ${Math.max(10, lineWidth * 1.4)}"` : component.strokeStyle === "dotted" ? ` stroke-dasharray="1 ${Math.max(10, lineWidth * 1.8)}"` : "";
    const inset = svgStrokeInset(component, 220, 100);
    const minX = inset.x;
    const maxX = 220 - inset.x;
    const minY = inset.y;
    const maxY = 100 - inset.y;
    const startY = 50;
    const endY = 50;
    const c1x = minX + curvePointValue(component, "curveC1X") / 100 * (maxX - minX);
    const c1y = minY + curvePointValue(component, "curveC1Y") / 100 * (maxY - minY);
    const c2x = minX + curvePointValue(component, "curveC2X") / 100 * (maxX - minX);
    const c2y = minY + curvePointValue(component, "curveC2Y") / 100 * (maxY - minY);
    return `<svg class="component-svg" preserveAspectRatio="none" viewBox="0 0 220 100" aria-hidden="true"><path d="M ${roundPathValue(minX)} ${startY} C ${roundPathValue(c1x)} ${roundPathValue(c1y)} ${roundPathValue(c2x)} ${roundPathValue(c2y)} ${roundPathValue(maxX)} ${endY}" fill="none" stroke="${stroke}" stroke-width="${lineWidth}" vector-effect="non-scaling-stroke" stroke-linecap="${component.lineCap || "round"}" stroke-linejoin="round"${lineDash}/></svg>`;
  }

  if (component.shape === "circle") {
    const inset = svgStrokeInset(component, 100, 100);
    const radiusValue = Math.max(0, 50 - Math.max(inset.x, inset.y));
    return `<svg class="component-svg" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="${roundPathValue(radiusValue)}" fill="${fill}" ${common}/></svg>`;
  }

  if (component.shape === "triangle") {
    const height = 173.205;
    const inset = svgStrokeInset(component, 200, height, 1.55);
    const points = [[100, inset.y], [200 - inset.x, height - inset.y], [inset.x, height - inset.y]];
    const path = roundedPolygonPath(points, Math.min(28, radius * 0.34));
    return `<svg class="component-svg" preserveAspectRatio="none" viewBox="0 0 200 ${height}" aria-hidden="true"><path d="${path}" fill="${fill}" ${polygonCommon}/></svg>`;
  }

  if (component.shape === "star") {
    const inset = svgStrokeInset(component, 200, 200, 1.55);
    const points = [[100, inset.y], [124, 68], [200 - inset.x, 68], [138, 114], [162, 200 - inset.y], [100, 148], [38, 200 - inset.y], [62, 114], [inset.x, 68], [76, 68]];
    const path = roundedPolygonPath(points, Math.min(18, radius * 0.22));
    return `<svg class="component-svg" preserveAspectRatio="none" viewBox="0 0 200 200" aria-hidden="true"><path d="${path}" fill="${fill}" ${polygonCommon}/></svg>`;
  }

  const inset = svgStrokeInset(component, 100, 100);
  const rectWidth = Math.max(0, 100 - inset.x * 2);
  const rectHeight = Math.max(0, 100 - inset.y * 2);
  const rectRadius = Math.min(rectWidth, rectHeight) * radius / 200;
  return `<svg class="component-svg" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden="true"><rect x="${roundPathValue(inset.x)}" y="${roundPathValue(inset.y)}" width="${roundPathValue(rectWidth)}" height="${roundPathValue(rectHeight)}" rx="${roundPathValue(rectRadius)}" ry="${roundPathValue(rectRadius)}" fill="${fill}" ${common}/></svg>`;
}

function polygonPath(points) {
  return `${points.map((point, index) => `${index ? "L" : "M"}${roundPathValue(point[0])} ${roundPathValue(point[1])}`).join(" ")} Z`;
}

function roundedPolygonPath(points, radius) {
  const safeRadius = Math.max(0, Number(radius) || 0);
  if (!safeRadius) return polygonPath(points);

  const commands = [];
  points.forEach((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const toPrevious = { x: previous[0] - point[0], y: previous[1] - point[1] };
    const toNext = { x: next[0] - point[0], y: next[1] - point[1] };
    const previousLength = Math.hypot(toPrevious.x, toPrevious.y);
    const nextLength = Math.hypot(toNext.x, toNext.y);
    if (!previousLength || !nextLength) return;
    const distance = Math.min(safeRadius, previousLength * 0.42, nextLength * 0.42);
    const start = [point[0] + toPrevious.x / previousLength * distance, point[1] + toPrevious.y / previousLength * distance];
    const end = [point[0] + toNext.x / nextLength * distance, point[1] + toNext.y / nextLength * distance];

    commands.push(`${index ? "L" : "M"}${roundPathValue(start[0])} ${roundPathValue(start[1])}`);
    commands.push(`Q${roundPathValue(point[0])} ${roundPathValue(point[1])} ${roundPathValue(end[0])} ${roundPathValue(end[1])}`);
  });

  return `${commands.join(" ")} Z`;
}

function roundPathValue(value) {
  return Math.round(value * 100) / 100;
}

function supportsCornerRadius(component) {
  return component?.type === "shape" && ["rect", "triangle", "star"].includes(component.shape);
}
function createSelectionBox(component) {
  const selectionBox = document.createElement("div");
  selectionBox.className = "selection-box";
  ["nw", "n", "ne", "e", "se", "s", "sw", "w"].forEach((handle) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "selection-handle";
    button.dataset.handle = handle;
    button.setAttribute("aria-label", `Resize ${component.name} ${handle}`);
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectOnly(component.id);
      startResize(event, component.id, handle);
    });
    selectionBox.appendChild(button);
  });

  if (supportsCornerRadius(component)) {
    const radiusButton = document.createElement("button");
    radiusButton.type = "button";
    radiusButton.className = "corner-radius-handle";
    radiusButton.setAttribute("aria-label", `Adjust ${component.name} corner radius`);
    radiusButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectOnly(component.id);
      startCornerRadiusDrag(event, component.id);
    });
    selectionBox.appendChild(radiusButton);
  }

  return selectionBox;
}

function createCurveControls(component) {
  const c1x = curvePointValue(component, "curveC1X");
  const c1y = curvePointValue(component, "curveC1Y");
  const c2x = curvePointValue(component, "curveC2X");
  const c2y = curvePointValue(component, "curveC2Y");
  const layer = document.createElement("div");
  layer.className = "curve-control-layer";

  const overlay = document.createElement("div");
  overlay.className = "curve-control-overlay";
  overlay.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="50" x2="${c1x}" y2="${c1y}"></line><line x1="100" y1="50" x2="${c2x}" y2="${c2y}"></line></svg>`;
  layer.appendChild(overlay);

  [["curveC1", c1x, c1y], ["curveC2", c2x, c2y]].forEach(([point, x, y]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "curve-control-handle";
    button.dataset.point = point;
    button.style.left = `${x}%`;
    button.style.top = `${y}%`;
    button.setAttribute("aria-label", `Adjust ${component.name} ${point}`);
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectOnly(component.id);
      startCurveHandleDrag(event, component.id, point);
    });
    layer.appendChild(button);
  });

  return layer;
}
function bindComponentEvents(node, component) {
  node.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  node.addEventListener("pointerenter", () => {
    if (component.trigger === "hover" && window.matchMedia("(hover: hover)").matches) {
      triggerComponent(component.id);
    }
  });

  node.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    if (event.shiftKey) {
      toggleSelection(component.id);
      render();
      return;
    }

    if (isSelected(component.id)) selectedId = component.id;
    else selectOnly(component.id);

    renderComponentList();
    syncControlsFromSelection();
    startDrag(event, component.id);
    if (component.trigger === "drag") triggerComponent(component.id);
  });

  node.addEventListener("wheel", (event) => {
    if (component.trigger !== "wheel") return;
    event.preventDefault();
    event.stopPropagation();
    selectOnly(component.id);
    render();
    triggerComponent(component.id);
  }, { passive: false });
}

function smartGuideSurface() {
  const rect = artSurface.getBoundingClientRect();
  const width = Math.max(1, rect.width || artboard.width);
  const height = Math.max(1, rect.height || artboard.height);
  return {
    width,
    height,
    scaleX: artboard.width / width,
    scaleY: artboard.height / height
  };
}

function rectForSmartGuide(item, surface) {
  const left = Number(item.x) / 100 * surface.width;
  const top = Number(item.y) / 100 * surface.height;
  const width = Number(item.w) / 100 * surface.width;
  const height = Number(item.h) / 100 * surface.height;
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    centerX: left + width / 2,
    centerY: top + height / 2
  };
}

function smartGuideBounds(rects) {
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2
  };
}

function shiftedSmartGuideRect(rect, dx, dy) {
  return {
    ...rect,
    left: rect.left + dx,
    top: rect.top + dy,
    right: rect.right + dx,
    bottom: rect.bottom + dy,
    centerX: rect.centerX + dx,
    centerY: rect.centerY + dy
  };
}

function smartGuideAnchors(rect, axis) {
  if (axis === "x") {
    return [
      { key: "left", value: rect.left },
      { key: "center", value: rect.centerX },
      { key: "right", value: rect.right }
    ];
  }

  return [
    { key: "top", value: rect.top },
    { key: "center", value: rect.centerY },
    { key: "bottom", value: rect.bottom }
  ];
}

function clampPx(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rangesOverlap(aStart, aEnd, bStart, bEnd, padding = 0) {
  return aStart - padding <= bEnd && aEnd + padding >= bStart;
}

function axisStart(rect, axis) {
  return axis === "x" ? rect.left : rect.top;
}

function axisEnd(rect, axis) {
  return axis === "x" ? rect.right : rect.bottom;
}

function rectsShareGuideLane(rectA, rectB, axis, padding = smartGuideCrossAxisPaddingPx) {
  return axis === "x"
    ? rangesOverlap(rectA.top, rectA.bottom, rectB.top, rectB.bottom, padding)
    : rangesOverlap(rectA.left, rectA.right, rectB.left, rectB.right, padding);
}

function gapBetweenRects(axis, leadingRect, trailingRect) {
  return Math.max(0, axisStart(trailingRect, axis) - axisEnd(leadingRect, axis));
}

function findAlignmentSnap(axis, group, targets, surface) {
  const movingAnchors = smartGuideAnchors(group, axis);
  const centerAnchor = movingAnchors.find((anchor) => anchor.key === "center");
  let best = null;

  const consider = (candidate) => {
    const abs = Math.abs(candidate.delta);
    if (abs > smartGuideSnapPx) return;
    if (!best || abs < best.abs || (abs === best.abs && candidate.source === "artboard")) {
      best = { ...candidate, abs };
    }
  };

  consider({
    type: "alignment",
    source: "artboard",
    axis,
    delta: (axis === "x" ? surface.width / 2 : surface.height / 2) - centerAnchor.value,
    position: axis === "x" ? surface.width / 2 : surface.height / 2,
    full: true
  });

  targets.forEach((target) => {
    const targetAnchors = smartGuideAnchors(target.rect, axis);
    movingAnchors.forEach((movingAnchor) => {
      targetAnchors.forEach((targetAnchor) => {
        consider({
          type: "alignment",
          source: "component",
          axis,
          delta: targetAnchor.value - movingAnchor.value,
          position: targetAnchor.value,
          targetRect: target.rect
        });
      });
    });
  });

  return best;
}

function findEqualSpacingSnap(axis, group, targets, tolerance = smartGuideSpacingSnapPx, lockedKey = null) {
  const groupStart = axisStart(group, axis);
  const groupEnd = axisEnd(group, axis);
  const laneTargets = targets
    .filter((target) => rectsShareGuideLane(group, target.rect, axis))
    .sort((a, b) => axisStart(a.rect, axis) - axisStart(b.rect, axis));
  const beforeTargets = laneTargets.filter((target) => axisEnd(target.rect, axis) <= groupStart);
  const afterTargets = laneTargets.filter((target) => axisStart(target.rect, axis) >= groupEnd);
  let best = null;

  const consider = (candidate) => {
    const abs = Math.abs(candidate.delta);
    const isLocked = lockedKey && candidate.key === lockedKey;
    if (abs > tolerance && !(isLocked && abs <= smartGuideSpacingReleasePx)) return;
    if (candidate.gapA > smartGuideMeasureLimitPx || candidate.gapB > smartGuideMeasureLimitPx) return;
    const lockBonus = isLocked ? -1 : 0;
    const edgePenalty = candidate.mode === "middle" ? 0 : 0.2;
    const score = abs + Math.abs(candidate.gapA + candidate.gapB) * 0.0001 + edgePenalty + lockBonus;
    const next = {
      ...candidate,
      abs,
      gap: (candidate.gapA + candidate.gapB) / 2,
      locked: isLocked,
      score
    };
    if (!best || next.score < best.score) best = next;
  };

  beforeTargets.forEach((before) => {
    afterTargets.forEach((after) => {
      if (!rectsShareGuideLane(before.rect, after.rect, axis)) return;
      const gapA = gapBetweenRects(axis, before.rect, group);
      const gapB = gapBetweenRects(axis, group, after.rect);
      consider({
        type: "spacing",
        mode: "middle",
        axis,
        key: `${axis}:spacing:middle:${before.id}:${after.id}`,
        delta: (gapB - gapA) / 2,
        gapA,
        gapB,
        beforeRect: before.rect,
        afterRect: after.rect
      });
    });
  });

  afterTargets.forEach((first, firstIndex) => {
    afterTargets.slice(firstIndex + 1).forEach((second) => {
      if (axisEnd(first.rect, axis) > axisStart(second.rect, axis)) return;
      if (!rectsShareGuideLane(first.rect, second.rect, axis)) return;
      const gapA = gapBetweenRects(axis, group, first.rect);
      const gapB = gapBetweenRects(axis, first.rect, second.rect);
      consider({
        type: "spacing",
        mode: "before",
        axis,
        key: `${axis}:spacing:before:${first.id}:${second.id}`,
        delta: gapA - gapB,
        gapA,
        gapB,
        firstRect: first.rect,
        secondRect: second.rect
      });
    });
  });

  beforeTargets.forEach((first, firstIndex) => {
    beforeTargets.slice(firstIndex + 1).forEach((second) => {
      if (axisEnd(first.rect, axis) > axisStart(second.rect, axis)) return;
      if (!rectsShareGuideLane(first.rect, second.rect, axis)) return;
      const gapA = gapBetweenRects(axis, first.rect, second.rect);
      const gapB = gapBetweenRects(axis, second.rect, group);
      consider({
        type: "spacing",
        mode: "after",
        axis,
        key: `${axis}:spacing:after:${first.id}:${second.id}`,
        delta: gapA - gapB,
        gapA,
        gapB,
        firstRect: first.rect,
        secondRect: second.rect
      });
    });
  });

  return best;
}

function chooseSmartGuideCandidate(alignment, spacing) {
  if (!alignment) return spacing || null;
  if (!spacing) return alignment;
  if (spacing.locked || spacing.abs <= Math.max(1, alignment.abs + smartGuideSpacingPriorityPx)) return spacing;
  return alignment;
}

function smartGuideLineForCandidate(candidate, group, surface) {
  if (!candidate || candidate.type !== "alignment") return null;
  const target = candidate.targetRect;

  if (candidate.axis === "x") {
    const y1 = candidate.full || !target ? 0 : clampPx(Math.min(group.top, target.top) - 14, 0, surface.height);
    const y2 = candidate.full || !target ? surface.height : clampPx(Math.max(group.bottom, target.bottom) + 14, 0, surface.height);
    return { orientation: "vertical", x: candidate.position, y1, y2: Math.max(y1 + 1, y2) };
  }

  const x1 = candidate.full || !target ? 0 : clampPx(Math.min(group.left, target.left) - 14, 0, surface.width);
  const x2 = candidate.full || !target ? surface.width : clampPx(Math.max(group.right, target.right) + 14, 0, surface.width);
  return { orientation: "horizontal", y: candidate.position, x1, x2: Math.max(x1 + 1, x2) };
}

function formatGuideDistance(displayPixels, scale) {
  return String(Math.max(0, Math.round(displayPixels * scale)));
}

function horizontalMeasure(x1, x2, y, surface) {
  const left = Math.min(x1, x2);
  const width = Math.abs(x2 - x1);
  if (width < 1) return null;
  return {
    orientation: "horizontal",
    left,
    top: y,
    width,
    label: formatGuideDistance(width, surface.scaleX),
    labelLeft: left + width / 2,
    labelTop: clampPx(y, 10, surface.height - 10)
  };
}

function verticalMeasure(y1, y2, x, surface) {
  const top = Math.min(y1, y2);
  const height = Math.abs(y2 - y1);
  if (height < 1) return null;
  return {
    orientation: "vertical",
    left: x,
    top,
    height,
    label: formatGuideDistance(height, surface.scaleY),
    labelLeft: clampPx(x, 12, surface.width - 12),
    labelTop: clampPx(top + height / 2, 10, surface.height - 10)
  };
}

function horizontalMeasureLane(rectA, rectB, surface) {
  const top = Math.max(rectA.top, rectB.top);
  const bottom = Math.min(rectA.bottom, rectB.bottom);
  const y = top <= bottom ? (top + bottom) / 2 : (rectA.centerY + rectB.centerY) / 2;
  return clampPx(y, 12, surface.height - 12);
}

function verticalMeasureLane(rectA, rectB, surface) {
  const left = Math.max(rectA.left, rectB.left);
  const right = Math.min(rectA.right, rectB.right);
  const x = left <= right ? (left + right) / 2 : (rectA.centerX + rectB.centerX) / 2;
  return clampPx(x, 12, surface.width - 12);
}

function addSpacingMeasureBetween(axis, leadingRect, trailingRect, surface, measures) {
  if (axis === "x") {
    const measure = horizontalMeasure(leadingRect.right, trailingRect.left, horizontalMeasureLane(leadingRect, trailingRect, surface), surface);
    if (measure) measures.push(measure);
    return;
  }

  const measure = verticalMeasure(leadingRect.bottom, trailingRect.top, verticalMeasureLane(leadingRect, trailingRect, surface), surface);
  if (measure) measures.push(measure);
}

function addEqualSpacingMeasures(pair, group, surface, measures) {
  if (!pair) return;

  if (pair.mode === "before") {
    addSpacingMeasureBetween(pair.axis, group, pair.firstRect, surface, measures);
    addSpacingMeasureBetween(pair.axis, pair.firstRect, pair.secondRect, surface, measures);
    return;
  }

  if (pair.mode === "after") {
    addSpacingMeasureBetween(pair.axis, pair.firstRect, pair.secondRect, surface, measures);
    addSpacingMeasureBetween(pair.axis, pair.secondRect, group, surface, measures);
    return;
  }

  addSpacingMeasureBetween(pair.axis, pair.beforeRect, group, surface, measures);
  addSpacingMeasureBetween(pair.axis, group, pair.afterRect, surface, measures);
}

function addNearestDistanceMeasures(axis, group, targets, surface, measures) {
  const isX = axis === "x";
  const candidates = targets.filter((target) => {
    const rect = target.rect;
    return isX
      ? rangesOverlap(group.top, group.bottom, rect.top, rect.bottom, smartGuideCrossAxisPaddingPx)
      : rangesOverlap(group.left, group.right, rect.left, rect.right, smartGuideCrossAxisPaddingPx);
  });

  if (isX) {
    const before = candidates
      .filter((target) => target.rect.right <= group.left)
      .sort((a, b) => group.left - a.rect.right - (group.left - b.rect.right))[0];
    const after = candidates
      .filter((target) => target.rect.left >= group.right)
      .sort((a, b) => a.rect.left - group.right - (b.rect.left - group.right))[0];

    if (before && group.left - before.rect.right <= smartGuideMeasureLimitPx) {
      const measure = horizontalMeasure(before.rect.right, group.left, horizontalMeasureLane(before.rect, group, surface), surface);
      if (measure) measures.push(measure);
    }
    if (after && after.rect.left - group.right <= smartGuideMeasureLimitPx) {
      const measure = horizontalMeasure(group.right, after.rect.left, horizontalMeasureLane(group, after.rect, surface), surface);
      if (measure) measures.push(measure);
    }
    return;
  }

  const before = candidates
    .filter((target) => target.rect.bottom <= group.top)
    .sort((a, b) => group.top - a.rect.bottom - (group.top - b.rect.bottom))[0];
  const after = candidates
    .filter((target) => target.rect.top >= group.bottom)
    .sort((a, b) => a.rect.top - group.bottom - (b.rect.top - group.bottom))[0];

  if (before && group.top - before.rect.bottom <= smartGuideMeasureLimitPx) {
    const measure = verticalMeasure(before.rect.bottom, group.top, verticalMeasureLane(before.rect, group, surface), surface);
    if (measure) measures.push(measure);
  }
  if (after && after.rect.top - group.bottom <= smartGuideMeasureLimitPx) {
    const measure = verticalMeasure(group.bottom, after.rect.top, verticalMeasureLane(group, after.rect, surface), surface);
    if (measure) measures.push(measure);
  }
}

function renderSmartGuides(guides, measures) {
  if (!smartGuideLayer) return;
  smartGuideLayer.replaceChildren();

  guides.forEach((guide) => {
    const line = document.createElement("div");
    line.className = `smart-guide is-${guide.orientation}`;
    if (guide.orientation === "vertical") {
      line.style.left = `${guide.x}px`;
      line.style.top = `${guide.y1}px`;
      line.style.height = `${guide.y2 - guide.y1}px`;
    } else {
      line.style.left = `${guide.x1}px`;
      line.style.top = `${guide.y}px`;
      line.style.width = `${guide.x2 - guide.x1}px`;
    }
    smartGuideLayer.appendChild(line);
  });

  measures.forEach((measure) => {
    const line = document.createElement("div");
    line.className = `smart-distance is-${measure.orientation}`;
    if (measure.orientation === "horizontal") {
      line.style.left = `${measure.left}px`;
      line.style.top = `${measure.top}px`;
      line.style.width = `${measure.width}px`;
    } else {
      line.style.left = `${measure.left}px`;
      line.style.top = `${measure.top}px`;
      line.style.height = `${measure.height}px`;
    }
    smartGuideLayer.appendChild(line);

    const label = document.createElement("div");
    label.className = "smart-distance-label";
    label.textContent = measure.label;
    label.style.left = `${measure.labelLeft}px`;
    label.style.top = `${measure.labelTop}px`;
    smartGuideLayer.appendChild(label);
  });
}

function clearSmartGuides() {
  if (smartGuideLayer) smartGuideLayer.replaceChildren();
}

function resolveSmartGuides(proposedItems, movingIds, lockedSnaps = {}) {
  const surface = smartGuideSurface();
  const movingIdSet = new Set(movingIds);
  const movingRects = proposedItems.map((item) => ({ ...item, rect: rectForSmartGuide(item, surface) }));
  const group = smartGuideBounds(movingRects.map((item) => item.rect));
  const targets = components
    .filter((component) => !movingIdSet.has(component.id))
    .map((component) => ({ id: component.id, rect: rectForSmartGuide(component, surface) }));

  const snapX = chooseSmartGuideCandidate(
    findAlignmentSnap("x", group, targets, surface),
    findEqualSpacingSnap("x", group, targets, smartGuideSpacingSnapPx, lockedSnaps.x)
  );
  const snapY = chooseSmartGuideCandidate(
    findAlignmentSnap("y", group, targets, surface),
    findEqualSpacingSnap("y", group, targets, smartGuideSpacingSnapPx, lockedSnaps.y)
  );

  const dxPx = snapX?.delta || 0;
  const dyPx = snapY?.delta || 0;
  const dxPercent = dxPx / surface.width * 100;
  const dyPercent = dyPx / surface.height * 100;
  const items = proposedItems.map((item) => ({
    ...item,
    x: item.x + dxPercent,
    y: item.y + dyPercent
  }));
  const snappedGroup = shiftedSmartGuideRect(group, dxPx, dyPx);
  const guides = [
    smartGuideLineForCandidate(snapX, snappedGroup, surface),
    smartGuideLineForCandidate(snapY, snappedGroup, surface)
  ].filter(Boolean);
  const measures = [];
  const equalX = findEqualSpacingSnap("x", snappedGroup, targets, 1.5);
  const equalY = findEqualSpacingSnap("y", snappedGroup, targets, 1.5);

  if (equalX) addEqualSpacingMeasures(equalX, snappedGroup, surface, measures);
  else addNearestDistanceMeasures("x", snappedGroup, targets, surface, measures);

  if (equalY) addEqualSpacingMeasures(equalY, snappedGroup, surface, measures);
  else addNearestDistanceMeasures("y", snappedGroup, targets, surface, measures);

  return {
    items,
    guides,
    measures,
    lockedSnaps: {
      x: snapX?.type === "spacing" ? snapX.key : null,
      y: snapY?.type === "spacing" ? snapY.key : null
    }
  };
}

function startDrag(event, id) {
  const component = components.find((item) => item.id === id);
  const rect = artSurface.getBoundingClientRect();
  if (!component || !rect.width || !rect.height) return;

  saveHistory();
  const ids = isSelected(id) ? [...selectedIds] : [id];
  dragState = {
    ids,
    clickedId: id,
    startX: event.clientX,
    startY: event.clientY,
    width: rect.width,
    height: rect.height,
    bases: ids.map((selected) => {
      const item = components.find((componentItem) => componentItem.id === selected);
      return { id: selected, x: item?.x || 0, y: item?.y || 0, w: item?.w || 0, h: item?.h || 0 };
    }),
    lockedSnaps: { x: null, y: null }
  };
  clearSmartGuides();
  movedDuringDrag = false;
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp, { once: true });
}

function handlePointerMove(event) {
  if (!dragState) return;

  const dx = ((event.clientX - dragState.startX) / dragState.width) * 100;
  const dy = ((event.clientY - dragState.startY) / dragState.height) * 100;
  if (Math.abs(dx) + Math.abs(dy) > 0.6) movedDuringDrag = true;

  const proposedItems = dragState.bases.map((base) => ({
    id: base.id,
    x: base.x + dx,
    y: base.y + dy,
    w: base.w,
    h: base.h
  }));
  const snap = movedDuringDrag
    ? resolveSmartGuides(proposedItems, dragState.ids, dragState.lockedSnaps)
    : { items: proposedItems, guides: [], measures: [] };
  dragState.lockedSnaps = snap.lockedSnaps || { x: null, y: null };
  const nextById = new Map(snap.items.map((item) => [item.id, item]));

  dragState.bases.forEach((base) => {
    const component = components.find((item) => item.id === base.id);
    const node = componentLayer.querySelector(`[data-id="${base.id}"]`);
    if (!component || !node) return;
    const next = nextById.get(base.id);
    component.x = next ? next.x : base.x + dx;
    component.y = next ? next.y : base.y + dy;
    clampComponent(component);
    syncComponentNode(node, component);
  });

  renderSmartGuides(snap.guides, snap.measures);
  syncControlsFromSelection();
}

function handlePointerUp() {
  const state = dragState;
  const clickedComponent = state ? components.find((item) => item.id === state.clickedId) : null;
  const shouldTriggerTap = Boolean(clickedComponent && !movedDuringDrag && (clickedComponent.trigger === "click" || (clickedComponent.trigger === "hover" && !window.matchMedia("(hover: hover)").matches)));

  window.removeEventListener("pointermove", handlePointerMove);
  dragState = null;
  clearSmartGuides();
  render();

  if (shouldTriggerTap) {
    window.requestAnimationFrame(() => triggerComponent(clickedComponent.id));
  }
  window.setTimeout(() => { movedDuringDrag = false; }, 0);
}

function pointInSurface(event) {
  const rect = artSurface.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
    y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
    rect
  };
}

function rectsIntersect(a, b) {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

function startMarqueeSelection(event) {
  if (event.button !== 0 || event.target.closest(".art-component")) return;
  if (artSurface.classList.contains("is-hidden")) return;

  event.preventDefault();
  clearSmartGuides();
  const start = pointInSurface(event);
  marqueeState = {
    startX: start.x,
    startY: start.y,
    baseIds: event.shiftKey ? [...selectedIds] : [],
    moved: false
  };

  if (!event.shiftKey) setSelection([]);
  marqueeNode = document.createElement("div");
  marqueeNode.className = "selection-marquee";
  artSurface.appendChild(marqueeNode);
  syncSelectionVisuals();

  window.addEventListener("pointermove", handleMarqueeMove);
  window.addEventListener("pointerup", handleMarqueeUp, { once: true });
}

function handleMarqueeMove(event) {
  if (!marqueeState || !marqueeNode) return;
  const current = pointInSurface(event);
  const left = Math.min(marqueeState.startX, current.x);
  const top = Math.min(marqueeState.startY, current.y);
  const width = Math.abs(current.x - marqueeState.startX);
  const height = Math.abs(current.y - marqueeState.startY);
  marqueeState.moved = width + height > 4;

  marqueeNode.style.left = `${left}px`;
  marqueeNode.style.top = `${top}px`;
  marqueeNode.style.width = `${width}px`;
  marqueeNode.style.height = `${height}px`;

  const surfaceRect = current.rect;
  const selectionRect = {
    left: surfaceRect.left + left,
    top: surfaceRect.top + top,
    right: surfaceRect.left + left + width,
    bottom: surfaceRect.top + top + height
  };
  const hitIds = components
    .filter((component) => {
      const node = componentLayer.querySelector(`[data-id="${component.id}"]`);
      return node && rectsIntersect(node.getBoundingClientRect(), selectionRect);
    })
    .map((component) => component.id);

  setSelection([...marqueeState.baseIds, ...hitIds]);
  syncSelectionVisuals();
}

function handleMarqueeUp() {
  window.removeEventListener("pointermove", handleMarqueeMove);
  if (!marqueeState?.moved && !marqueeState?.baseIds.length) setSelection([]);
  marqueeNode?.remove();
  marqueeNode = null;
  marqueeState = null;
  syncSelectionVisuals();
}
function startResize(event, id, handle) {
  const component = components.find((item) => item.id === id);
  const rect = artSurface.getBoundingClientRect();
  if (!component || !rect.width || !rect.height) return;

  saveHistory();
  clearSmartGuides();
  resizeState = {
    id,
    handle,
    startX: event.clientX,
    startY: event.clientY,
    width: rect.width,
    height: rect.height,
    base: {
      x: component.x,
      y: component.y,
      w: component.w,
      h: component.h,
      rotation: component.rotation || 0
    }
  };

  movedDuringDrag = true;
  window.addEventListener("pointermove", handleResizeMove);
  window.addEventListener("pointerup", handleResizeUp, { once: true });
}

function handleResizeMove(event) {
  if (!resizeState) return;
  const component = components.find((item) => item.id === resizeState.id);
  const node = componentLayer.querySelector(`[data-id="${resizeState.id}"]`);
  if (!component || !node) return;

  const rawDx = ((event.clientX - resizeState.startX) / resizeState.width) * 100;
  const rawDy = ((event.clientY - resizeState.startY) / resizeState.height) * 100;
  const angle = -(resizeState.base.rotation || 0) * Math.PI / 180;
  const dx = rawDx * Math.cos(angle) - rawDy * Math.sin(angle);
  const dy = rawDx * Math.sin(angle) + rawDy * Math.cos(angle);

  let minX = -resizeState.base.w / 2;
  let maxX = resizeState.base.w / 2;
  let minY = -resizeState.base.h / 2;
  let maxY = resizeState.base.h / 2;
  const handle = resizeState.handle;

  if (handle.includes("w")) minX += dx;
  if (handle.includes("e")) maxX += dx;
  if (handle.includes("n")) minY += dy;
  if (handle.includes("s")) maxY += dy;

  const minSize = component.type === "shape" && component.shape === "line" ? 0.2 : 1;
  if (maxX - minX < minSize) {
    if (handle.includes("w")) minX = maxX - minSize;
    else maxX = minX + minSize;
  }
  if (maxY - minY < minSize) {
    if (handle.includes("n")) minY = maxY - minSize;
    else maxY = minY + minSize;
  }

  let newW = maxX - minX;
  let newH = maxY - minY;
  const baseCenterX = resizeState.base.x + resizeState.base.w / 2;
  const baseCenterY = resizeState.base.y + resizeState.base.h / 2;

  if (event.ctrlKey && component.type === "shape" && component.shape !== "line") {
    const aspect = visualAspectForShape(component.shape);
    const widthFromHeight = widthPercentForVisualAspect(newH, aspect);
    const usesHorizontal = handle.includes("e") || handle.includes("w");
    const usesVertical = handle.includes("n") || handle.includes("s");
    if (usesHorizontal && usesVertical) {
      newW = Math.abs(newW - resizeState.base.w) >= Math.abs(widthFromHeight - resizeState.base.w) ? newW : widthFromHeight;
    } else if (usesVertical) {
      newW = widthFromHeight;
    }
    newW = Math.max(minSize, Math.min(100, newW));
    newH = Math.max(minSize, Math.min(100, percentHeightForVisualAspect(newW, aspect)));
    component.w = newW;
    component.h = newH;
    component.x = baseCenterX - newW / 2;
    component.y = baseCenterY - newH / 2;
  } else {
    const localCenterX = (minX + maxX) / 2;
    const localCenterY = (minY + maxY) / 2;
    const rotation = (resizeState.base.rotation || 0) * Math.PI / 180;
    const centerOffsetX = localCenterX * Math.cos(rotation) - localCenterY * Math.sin(rotation);
    const centerOffsetY = localCenterX * Math.sin(rotation) + localCenterY * Math.cos(rotation);

    component.w = newW;
    component.h = newH;
    component.x = baseCenterX + centerOffsetX - newW / 2;
    component.y = baseCenterY + centerOffsetY - newH / 2;
  }

  clampComponent(component);
  syncComponentNode(node, component);
  syncControlsFromSelection();
}
function handleResizeUp() {
  window.removeEventListener("pointermove", handleResizeMove);
  resizeState = null;
  window.setTimeout(() => { movedDuringDrag = false; }, 0);
  render();
}

function startCornerRadiusDrag(event, id) {
  const component = components.find((item) => item.id === id);
  const node = componentLayer.querySelector(`[data-id="${id}"]`);
  if (!component || !node || !supportsCornerRadius(component)) return;

  saveHistory();
  const rect = node.getBoundingClientRect();
  cornerRadiusState = {
    id,
    startX: event.clientX,
    startY: event.clientY,
    baseRadius: Number(component.cornerRadius) || 0,
    size: Math.max(1, Math.min(rect.width, rect.height))
  };

  movedDuringDrag = true;
  window.addEventListener("pointermove", handleCornerRadiusMove);
  window.addEventListener("pointerup", handleCornerRadiusUp, { once: true });
}

function handleCornerRadiusMove(event) {
  if (!cornerRadiusState) return;
  const component = components.find((item) => item.id === cornerRadiusState.id);
  if (!component || !supportsCornerRadius(component)) return;

  const deltaX = event.clientX - cornerRadiusState.startX;
  const deltaY = event.clientY - cornerRadiusState.startY;
  const delta = (-deltaX + deltaY) / 2;
  const percentDelta = delta / cornerRadiusState.size * 100;
  component.cornerRadius = Math.max(0, Math.min(100, cornerRadiusState.baseRadius + percentDelta));
  render();
}

function handleCornerRadiusUp() {
  window.removeEventListener("pointermove", handleCornerRadiusMove);
  cornerRadiusState = null;
  window.setTimeout(() => { movedDuringDrag = false; }, 0);
}

function startCurveHandleDrag(event, id, point) {
  const component = components.find((item) => item.id === id);
  const node = componentLayer.querySelector(`[data-id="${id}"]`);
  if (!component || !node || component.type !== "shape" || component.shape !== "curve") return;

  saveHistory();
  curveHandleState = {
    id,
    point,
    rect: node.getBoundingClientRect()
  };

  movedDuringDrag = true;
  window.addEventListener("pointermove", handleCurveHandleMove);
  window.addEventListener("pointerup", handleCurveHandleUp, { once: true });
}

function handleCurveHandleMove(event) {
  if (!curveHandleState) return;
  const component = components.find((item) => item.id === curveHandleState.id);
  if (!component || component.type !== "shape" || component.shape !== "curve") return;

  const x = clampNumber((event.clientX - curveHandleState.rect.left) / curveHandleState.rect.width * 100, 0, 100, defaultCurve[`${curveHandleState.point}X`]);
  const y = clampNumber((event.clientY - curveHandleState.rect.top) / curveHandleState.rect.height * 100, 0, 100, defaultCurve[`${curveHandleState.point}Y`]);
  component[`${curveHandleState.point}X`] = x;
  component[`${curveHandleState.point}Y`] = y;
  render();
}

function handleCurveHandleUp() {
  window.removeEventListener("pointermove", handleCurveHandleMove);
  curveHandleState = null;
  window.setTimeout(() => { movedDuringDrag = false; }, 0);
}

function syncComponentNode(node, component) {
  node.style.left = `${component.x}%`;
  node.style.top = `${component.y}%`;
  node.style.width = `${component.w}%`;
  node.style.height = `${component.h}%`;
  node.style.opacity = "1";
  node.style.setProperty("--component-opacity", String((component.opacity ?? 100) / 100));
  node.style.borderRadius = component.type === "shape" && component.shape === "rect" ? `${Math.min(40, Number(component.cornerRadius) || 0)}px` : "0";
  applyBaseTransform(node, component);
  applyEffectVars(node, component);
  applySelectionVars(node, component);
}
function renderComponentList() {
  if (!components.length) {
    componentList.innerHTML = `<div class="component-item"><span>No components yet</span><small>Upload, draw, or load samples</small></div>`;
    return;
  }

  componentList.innerHTML = "";
  components.forEach((component) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `component-item${isSelected(component.id) ? " is-selected" : ""}`;
    const actionText = component.actions?.length ? ` / ${component.actions.length} actions` : "";
    button.innerHTML = `<span>${escapeHtml(component.name)}</span><small>${component.type} / ${effectLabels[component.effect]}${actionText}</small>`;
    button.addEventListener("click", (event) => {
      if (event.shiftKey) toggleSelection(component.id);
      else selectOnly(component.id);
      render();
    });
    componentList.appendChild(button);
  });
}

function commonSelectedValue(selected, getter) {
  if (!selected.length) return null;
  const first = getter(selected[0]);
  return selected.every((component) => getter(component) === first) ? first : null;
}

function normalizedSoundSource(component) {
  const source = component?.soundSource || "tone";
  return source in soundLabels ? source : "tone";
}

function soundLabelForComponent(component) {
  const source = normalizedSoundSource(component);
  if (source === "custom") return component.soundName || "Uploaded Audio";
  return soundLabels[source] || soundLabels.tone;
}

function syncCustomSoundOptionLabel(label = "Uploaded Audio") {
  if (soundCustomOption) soundCustomOption.textContent = label || "Uploaded Audio";
}

function setSoundControlsDisabled(disabled) {
  soundToggle.disabled = disabled;
  soundSelect.disabled = disabled;
  soundVolumeRange.disabled = disabled;
  soundFileInput.disabled = disabled;
  testSoundButton.disabled = disabled;
}

function syncSoundControlsFromSelection(selected, component) {
  if (!component) {
    soundToggle.checked = false;
    soundToggle.indeterminate = false;
    soundSelect.value = "tone";
    soundVolumeRange.value = 80;
    soundVolumeOutput.textContent = "80";
    soundFileName.textContent = "No component selected";
    syncCustomSoundOptionLabel();
    setSoundControlsDisabled(true);
    updateRangeFill(soundVolumeRange);
    return;
  }

  const commonEnabled = commonSelectedValue(selected, (item) => Boolean(item.soundEnabled ?? true));
  const commonSourceSignature = commonSelectedValue(selected, (item) => {
    const source = normalizedSoundSource(item);
    return source === "custom" ? `${source}:${item.soundName || ""}:${item.soundSrc || ""}` : source;
  });
  const commonSource = commonSourceSignature ? normalizedSoundSource(selected[0]) : null;
  const commonVolume = commonSelectedValue(selected, (item) => Number(item.soundVolume ?? 80));
  const activeSource = commonSource || normalizedSoundSource(component);
  const activeVolume = Number.isFinite(commonVolume) ? commonVolume : Number(component.soundVolume ?? 80);

  soundToggle.indeterminate = selected.length > 1 && commonEnabled === null;
  soundToggle.checked = commonEnabled === null ? true : Boolean(commonEnabled);
  soundSelect.value = commonSource || "mixed";
  soundVolumeRange.value = clampNumber(activeVolume, 0, 100, 80);
  soundVolumeOutput.textContent = commonVolume === null && selected.length > 1 ? "--" : String(Math.round(soundVolumeRange.value));
  const soundLabel = commonSource
    ? soundLabelForComponent(component)
    : `${selected.length} selected / Mixed sounds`;
  soundFileName.textContent = soundLabel;
  syncCustomSoundOptionLabel(commonSource === "custom" ? soundLabel : "Uploaded Audio");
  setSoundControlsDisabled(false);
  soundVolumeRange.disabled = activeSource === "none";
  testSoundButton.disabled = activeSource === "none" || soundToggle.checked === false;
  updateRangeFill(soundVolumeRange);
}

function syncEffectControlVisibility(effect = effectSelect.value) {
  const config = effectControlConfigs[effect] || effectControlConfigs.zoom;
  setVisible(zoomControl, Boolean(config.zoom));
  setVisible(shakeControl, Boolean(config.shake));
  setVisible(speedControl, Boolean(config.speed));
  zoomRange.disabled = !config.zoom;
  shakeRange.disabled = !config.shake;
  speedRange.disabled = !config.speed;
  zoomLabel.textContent = config.zoom?.label || "Zoom";
  shakeLabel.textContent = config.shake?.label || "Intensity";
  shakeUnit.textContent = config.shake?.unit || "";
  speedLabel.textContent = config.speed?.label || "Speed";
}

function syncEffectControlOutputs() {
  zoomOutput.textContent = zoomRange.value;
  shakeOutput.textContent = shakeRange.value;
  speedOutput.textContent = speedRange.value;
  updateRangeFill(zoomRange);
  updateRangeFill(shakeRange);
  updateRangeFill(speedRange);
}

function actionConfig(type = actionTypeSelect.value) {
  return actionConfigs[type] || actionConfigs.scale;
}

function formatActionValue(actionOrType, value = null) {
  const type = typeof actionOrType === "string" ? actionOrType : actionOrType.type;
  const config = actionConfig(type);
  const rawValue = value ?? actionOrType.value ?? config.value;
  if (config.noValue) return "";
  return `${Math.round(Number(rawValue))}${config.unit}`;
}

function syncActionValueControl() {
  const config = actionConfig();
  const disabled = !selectedComponent();
  actionValueRange.min = config.min;
  actionValueRange.max = config.max;
  actionValueRange.step = config.step;
  actionValueRange.disabled = disabled || Boolean(config.noValue);
  actionDelayRange.disabled = disabled;
  actionDurationRange.disabled = disabled || Boolean(config.noDuration);

  if (!actionValueRange.dataset.touched || actionValueRange.disabled) {
    actionValueRange.value = config.value;
  } else {
    actionValueRange.value = clampNumber(actionValueRange.value, config.min, config.max, config.value);
  }

  if (!actionDurationRange.dataset.touched || actionDurationRange.disabled) {
    actionDurationRange.value = config.duration;
  }

  if (actionValueLabel.firstChild) actionValueLabel.firstChild.textContent = `${config.label} `;
  actionValueOutput.textContent = formatActionValue(actionTypeSelect.value, actionValueRange.value);
  actionDelayOutput.textContent = `${Math.round(actionDelayRange.value)}ms`;
  actionDurationOutput.textContent = actionDurationRange.disabled ? "-" : `${Math.round(actionDurationRange.value)}ms`;
  updateRangeFill(actionValueRange);
  updateRangeFill(actionDelayRange);
  updateRangeFill(actionDurationRange);
}

function setActionBuilderDisabled(disabled) {
  actionTypeSelect.disabled = disabled;
  actionValueRange.disabled = disabled || Boolean(actionConfig().noValue);
  actionDelayRange.disabled = disabled;
  actionDurationRange.disabled = disabled || Boolean(actionConfig().noDuration);
  addActionButton.disabled = disabled;
  clearActionsButton.disabled = disabled;
}

function actionSummary(action) {
  const config = actionConfig(action.type);
  const value = formatActionValue(action);
  const timing = action.type === "sound"
    ? `${Math.round(action.delay || 0)}ms delay`
    : `${Math.round(action.delay || 0)}ms delay / ${Math.round(action.duration || config.duration)}ms`;
  return {
    title: value ? `${config.label} ${value}` : config.label,
    meta: timing
  };
}

function renderActionListForSelection(selected, component) {
  actionList.innerHTML = "";
  if (!component) {
    actionList.innerHTML = `<div class="action-item is-empty">No selection</div>`;
    return;
  }

  const actions = cloneActions(component.actions);
  if (!actions.length) {
    actionList.innerHTML = `<div class="action-item is-empty">No actions</div>`;
    return;
  }

  actions.forEach((action, index) => {
    const summary = actionSummary(action);
    const item = document.createElement("div");
    item.className = "action-item";
    item.innerHTML = `
      <div class="action-copy">
        <strong>${index + 1}. ${escapeHtml(summary.title)}</strong>
        <small>${escapeHtml(summary.meta)}</small>
      </div>
      <div class="action-controls">
        <button type="button" data-action-op="up" ${index === 0 ? "disabled" : ""}>Up</button>
        <button type="button" data-action-op="down" ${index === actions.length - 1 ? "disabled" : ""}>Dn</button>
        <button type="button" data-action-op="remove">X</button>
      </div>
    `;
    item.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => updateSelectedActionStack((stack) => {
        if (button.dataset.actionOp === "remove") {
          stack.splice(index, 1);
          return;
        }
        if (button.dataset.actionOp === "up" && index > 0) {
          [stack[index - 1], stack[index]] = [stack[index], stack[index - 1]];
          return;
        }
        if (button.dataset.actionOp === "down" && index < stack.length - 1) {
          [stack[index + 1], stack[index]] = [stack[index], stack[index + 1]];
        }
      }));
    });
    actionList.appendChild(item);
  });
}

function syncActionBuilderFromSelection(selected, component) {
  setActionBuilderDisabled(!component);
  renderActionListForSelection(selected, component);
  syncActionValueControl();
}

function updateSelectedActionStack(mutator) {
  const selected = selectedComponents();
  if (!selected.length) return;
  saveHistory();
  selected.forEach((component) => {
    component.actions = cloneActions(component.actions);
    mutator(component.actions, component);
  });
  syncControlsFromSelection();
  renderComponentList();
}

function addActionToSelected() {
  const config = actionConfig();
  const action = {
    type: actionTypeSelect.value,
    value: config.noValue ? 0 : Number(actionValueRange.value),
    delay: Number(actionDelayRange.value),
    duration: config.noDuration ? 0 : Number(actionDurationRange.value),
    easing: config.easing || "ease"
  };
  updateSelectedActionStack((stack) => {
    stack.push(action);
  });
}

function clearSelectedActions() {
  updateSelectedActionStack((stack) => {
    stack.splice(0, stack.length);
  });
}

function syncControlsFromSelection() {
  const selected = selectedComponents();
  const component = selectedComponent();
  updateInspectorVisibility(component);

  if (!component) {
    selectedSummary.textContent = "None";
    effectSummary.textContent = "None";
    fillInput.disabled = false;
    fillTransparentToggle.checked = false;
    fillTransparentToggle.disabled = true;
    strokeInput.disabled = false;
    strokeTransparentToggle.checked = false;
    strokeTransparentToggle.disabled = true;
    strokeWidthRange.disabled = true;
    strokeWidthInput.disabled = true;
    cornerRadiusRange.disabled = true;
    cornerRadiusInput.disabled = true;
    [curveC1XRange, curveC1YRange, curveC2XRange, curveC2YRange].forEach((control) => { control.disabled = true; });
    syncEffectControlVisibility(effectSelect.value);
    syncSoundControlsFromSelection(selected, component);
    syncActionBuilderFromSelection(selected, component);
    updateAllRangeFills();
    return;
  }

  const hasEditableAppearance = component.type === "shape" || component.type === "text";
  const isCurve = component.type === "shape" && component.shape === "curve";
  const hasFill = component.type === "text" || (component.type === "shape" && !["line", "curve"].includes(component.shape));
  const transparentFill = hasFill && Boolean(component.fillTransparent);
  const transparentStroke = hasEditableAppearance && Boolean(component.strokeTransparent);
  triggerSelect.value = component.trigger;
  effectSelect.value = component.effect;
  syncEffectControlVisibility(component.effect);
  zoomRange.value = component.zoom;
  shakeRange.value = component.shake;
  speedRange.value = component.speed;
  xRange.value = roundValue(component.x);
  yRange.value = roundValue(component.y);
  wRange.value = roundValue(component.w);
  hRange.value = roundValue(component.h);
  rotationRange.value = Math.round(component.rotation);
  opacityRange.value = Math.round(component.opacity ?? 100);
  fillInput.value = /^#[0-9a-f]{6}$/i.test(component.fill || "") ? component.fill : "#ffffff";
  fillInput.disabled = !hasFill || transparentFill;
  fillTransparentToggle.checked = transparentFill;
  fillTransparentToggle.disabled = !hasFill;
  strokeInput.value = component.stroke || "#191714";
  strokeInput.disabled = !hasEditableAppearance || transparentStroke;
  strokeTransparentToggle.checked = transparentStroke;
  strokeTransparentToggle.disabled = !hasEditableAppearance;
  strokeWidthRange.disabled = !hasEditableAppearance;
  strokeWidthInput.disabled = !hasEditableAppearance;
  strokeWidthRange.value = clampNumber(component.strokeWidth, 0, maxStrokeWidth, 0);
  strokeWidthInput.value = strokeWidthRange.value;
  cornerRadiusRange.value = supportsCornerRadius(component) ? component.cornerRadius ?? 0 : 0;
  cornerRadiusInput.value = cornerRadiusRange.value;
  cornerRadiusRange.disabled = !supportsCornerRadius(component);
  cornerRadiusInput.disabled = !supportsCornerRadius(component);
  curveC1XRange.value = isCurve ? roundValue(curvePointValue(component, "curveC1X")) : defaultCurve.curveC1X;
  curveC1YRange.value = isCurve ? roundValue(curvePointValue(component, "curveC1Y")) : defaultCurve.curveC1Y;
  curveC2XRange.value = isCurve ? roundValue(curvePointValue(component, "curveC2X")) : defaultCurve.curveC2X;
  curveC2YRange.value = isCurve ? roundValue(curvePointValue(component, "curveC2Y")) : defaultCurve.curveC2Y;
  [curveC1XRange, curveC1YRange, curveC2XRange, curveC2YRange].forEach((control) => { control.disabled = !isCurve; });
  strokeStyleSelect.value = component.strokeStyle || "solid";
  lineCapSelect.value = component.lineCap || "round";
  textInput.value = component.text || "";
  fontInput.value = component.font || "Arial";
  fontSizeRange.value = component.fontSize ?? 48;
  syncSoundControlsFromSelection(selected, component);
  syncActionBuilderFromSelection(selected, component);

  xOutput.textContent = xRange.value;
  yOutput.textContent = yRange.value;
  wOutput.textContent = wRange.value;
  hOutput.textContent = hRange.value;
  rotationOutput.textContent = rotationRange.value;
  opacityOutput.textContent = opacityRange.value;
  syncEffectControlOutputs();
  strokeWidthOutput.textContent = strokeWidthRange.value;
  cornerRadiusOutput.textContent = cornerRadiusRange.value;
  curveC1XOutput.textContent = curveC1XRange.value;
  curveC1YOutput.textContent = curveC1YRange.value;
  curveC2XOutput.textContent = curveC2XRange.value;
  curveC2YOutput.textContent = curveC2YRange.value;
  fontSizeOutput.textContent = fontSizeRange.value;
  selectedSummary.textContent = selected.length > 1 ? `${selected.length} selected` : component.name;
  effectSummary.textContent = component.actions?.length
    ? `${triggerLabels[component.trigger]} + ${component.actions.length} actions`
    : `${triggerLabels[component.trigger]} + ${effectLabels[component.effect]}`;
  updateAllRangeFills();
}
function updateRangeFill(control) {
  if (!(control instanceof HTMLInputElement) || control.type !== "range") return;
  const min = Number(control.min || 0);
  const max = Number(control.max || 100);
  const value = Number(control.value || 0);
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
  control.style.setProperty("--range-fill", `${Math.max(0, Math.min(100, percent))}%`);
}

function updateAllRangeFills() {
  rangeControls.forEach(updateRangeFill);
}

function syncRangeFromNumberInput(numberInput, rangeInput) {
  const min = Number(rangeInput.min || numberInput.min || 0);
  const max = Number(rangeInput.max || numberInput.max || 100);
  const fallback = Number(rangeInput.value || min);
  const value = clampNumber(numberInput.value, min, max, fallback);
  rangeInput.value = String(value);
  numberInput.value = String(value);
}

function updateSelectedFromControls() {
  const component = selectedComponent();
  if (!component) return;
  saveHistory();

  const hasEditableAppearance = component.type === "shape" || component.type === "text";
  const isCurve = component.type === "shape" && component.shape === "curve";
  const isLine = component.type === "shape" && component.shape === "line";
  const hasFill = component.type === "text" || (component.type === "shape" && !["line", "curve"].includes(component.shape));
  const controlCenterY = Number(yRange.value) + Number(hRange.value) / 2;

  component.trigger = triggerSelect.value;
  component.effect = effectSelect.value;
  component.zoom = Number(zoomRange.value);
  component.shake = Number(shakeRange.value);
  component.speed = Number(speedRange.value);
  component.x = Number(xRange.value);
  component.y = Number(yRange.value);
  component.w = Number(wRange.value);
  component.h = Number(hRange.value);
  component.rotation = Number(rotationRange.value);
  component.opacity = Number(opacityRange.value);
  component.fill = fillInput.value;
  component.fillTransparent = hasFill && fillTransparentToggle.checked;
  component.stroke = strokeInput.value;
  component.strokeTransparent = hasEditableAppearance && strokeTransparentToggle.checked;
  component.strokeWidth = clampNumber(strokeWidthRange.value, 0, maxStrokeWidth, 0);
  if (isLine) {
    component.h = lineHeightForStroke(component.strokeWidth);
    component.y = controlCenterY - component.h / 2;
  }
  component.cornerRadius = supportsCornerRadius(component) ? Number(cornerRadiusRange.value) : 0;
  if (isCurve) {
    component.curveC1X = Number(curveC1XRange.value);
    component.curveC1Y = Number(curveC1YRange.value);
    component.curveC2X = Number(curveC2XRange.value);
    component.curveC2Y = Number(curveC2YRange.value);
  }
  component.strokeStyle = strokeStyleSelect.value;
  component.lineCap = lineCapSelect.value;
  component.text = textInput.value;
  component.font = fontInput.value;
  component.fontSize = Number(fontSizeRange.value);
  clampComponent(component);
  render();
}

function applySoundSourceToComponent(component, source) {
  component.soundSource = source;
  if (source === "custom") {
    component.soundName = component.soundName || "Uploaded Audio";
    return;
  }

  component.soundSrc = "";
  component.soundName = soundLabels[source] || soundLabels.tone;
  if (source === "none") component.soundEnabled = false;
  else component.soundEnabled = true;
}

function updateSelectedSoundFromControls(changes = {}) {
  const selected = selectedComponents();
  if (!selected.length) return;

  if (changes.enabled || changes.source) stopActiveSounds();
  saveHistory();
  const source = soundSelect.value;
  const volume = clampNumber(soundVolumeRange.value, 0, 100, 80);

  selected.forEach((component) => {
    if (changes.enabled) {
      component.soundEnabled = soundToggle.checked;
      if (component.soundEnabled && normalizedSoundSource(component) === "none") applySoundSourceToComponent(component, "tone");
    }
    if (changes.source && source !== "mixed") applySoundSourceToComponent(component, source);
    if (changes.volume) component.soundVolume = volume;
  });

  syncControlsFromSelection();
  renderComponentList();
}

function readAudioFileAsDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      name: file.name,
      src: reader.result,
      type: file.type || ""
    });
    reader.readAsDataURL(file);
  });
}

function isSupportedAudioFile(file) {
  return Boolean(file?.type?.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(file?.name || ""));
}

async function loadSoundFileForSelection(files) {
  const file = Array.from(files || [])[0];
  if (!file || !isSupportedAudioFile(file)) return;
  const selected = selectedComponents();
  if (!selected.length) return;

  stopActiveSounds();
  const loaded = await readAudioFileAsDataUrl(file);
  saveHistory();
  selected.forEach((component) => {
    component.soundEnabled = true;
    component.soundSource = "custom";
    component.soundSrc = loaded.src;
    component.soundName = loaded.name;
    component.soundMime = loaded.type;
    component.soundVolume = clampNumber(soundVolumeRange.value, 0, 100, 80);
  });
  soundFileInput.value = "";
  syncControlsFromSelection();
  renderComponentList();
}

function applyBaseTransform(node, component) {
  const base = `rotate(${component.rotation}deg)`;
  node.style.transform = base;
  node.style.setProperty("--base-transform", base);
}

function applyEffectVars(node, component) {
  const duration = Math.max(220, 900 - component.speed * 6.2);
  const intensity = Math.max(0, Number(component.shake) || 0);
  const wave = intensity / 2;
  node.style.setProperty("--zoom-scale", String(component.zoom / 100));
  node.style.setProperty("--shake-amount", `${intensity}px`);
  node.style.setProperty("--wave-x-a", `${wave}deg`);
  node.style.setProperty("--wave-y-a", `${wave * -0.5}deg`);
  node.style.setProperty("--wave-x-b", `${wave * -0.75}deg`);
  node.style.setProperty("--wave-y-b", `${wave * 0.38}deg`);
  node.style.setProperty("--blur-amount", `${intensity}px`);
  node.style.setProperty("--blur-soft", `${intensity * 0.12}px`);
  node.style.setProperty("--effect-duration", `${duration}ms`);
}

function actionTargetForNode(node) {
  return node.querySelector(".component-viewport") || node;
}

function resetActionTarget(node) {
  const target = actionTargetForNode(node);
  target.style.transform = "";
  target.style.filter = "";
  target.style.opacity = "";
}

function stopComponentActionRun(id) {
  const run = activeActionRuns.get(id);
  if (!run) return;
  run.cancelled = true;
  run.timers.forEach((timer) => window.clearTimeout(timer));
  run.animations.forEach((animation) => {
    try { animation.cancel(); } catch {}
  });
  activeActionRuns.delete(id);

  const node = componentLayer.querySelector(`[data-id="${id}"]`);
  if (node) resetActionTarget(node);
}

function stopAllActionRuns() {
  Array.from(activeActionRuns.keys()).forEach(stopComponentActionRun);
}

function waitForAction(ms, run) {
  if (!ms) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      run.timers.delete(timer);
      resolve();
    }, ms);
    run.timers.add(timer);
  });
}

function actionKeyframes(action, component) {
  const value = Number(action.value);
  const baseOpacity = String((component.opacity ?? 100) / 100);

  switch (action.type) {
    case "scale": {
      const scale = Math.max(0.05, value / 100);
      return [
        { transform: "scale(1)" },
        { transform: `scale(${scale})`, offset: 0.55 },
        { transform: "scale(1)" }
      ];
    }
    case "moveX":
      return [
        { transform: "translateX(0)" },
        { transform: `translateX(${value}px)`, offset: 0.58 },
        { transform: "translateX(0)" }
      ];
    case "moveY":
      return [
        { transform: "translateY(0)" },
        { transform: `translateY(${value}px)`, offset: 0.58 },
        { transform: "translateY(0)" }
      ];
    case "rotate":
      return [
        { transform: "rotate(0deg)" },
        { transform: `rotate(${value}deg)`, offset: 0.58 },
        { transform: "rotate(0deg)" }
      ];
    case "opacity": {
      const opacity = Math.max(0, Math.min(1, value / 100));
      return [
        { opacity: baseOpacity },
        { opacity, offset: 0.5 },
        { opacity: baseOpacity }
      ];
    }
    case "blur":
      return [
        { filter: "blur(0) saturate(1)" },
        { filter: `blur(${Math.max(0, value)}px) saturate(.72)`, offset: 0.48 },
        { filter: "blur(0) saturate(1)" }
      ];
    case "glow": {
      const alpha = Math.max(0, Math.min(1, value / 100));
      const radius = 8 + alpha * 30;
      return [
        { filter: "brightness(1) drop-shadow(0 0 0 rgba(13, 153, 255, 0))" },
        { filter: `brightness(${1 + alpha * 0.22}) drop-shadow(0 0 ${radius}px rgba(13, 153, 255, ${0.18 + alpha * 0.55}))`, offset: 0.5 },
        { filter: "brightness(1) drop-shadow(0 0 0 rgba(13, 153, 255, 0))" }
      ];
    }
    case "spring": {
      const distance = Math.max(0, value);
      return [
        { transform: "translate(0, 0) scale(1)" },
        { transform: `translate(${distance}px, ${distance * -0.32}px) scale(1.04)`, offset: 0.28 },
        { transform: `translate(${distance * -0.38}px, ${distance * 0.16}px) scale(.98)`, offset: 0.52 },
        { transform: `translate(${distance * 0.16}px, 0) scale(1.015)`, offset: 0.74 },
        { transform: "translate(0, 0) scale(1)" }
      ];
    }
    default:
      return [
        { transform: "scale(1)" },
        { transform: "scale(1.08)", offset: 0.5 },
        { transform: "scale(1)" }
      ];
  }
}

function animateAction(component, node, action, run) {
  if (action.type === "sound") {
    playComponentSound(component);
    return Promise.resolve();
  }

  const target = actionTargetForNode(node);
  const duration = Math.max(80, Number(action.duration) || actionConfig(action.type).duration);
  const animation = target.animate(actionKeyframes(action, component), {
    duration,
    easing: action.easing || actionConfig(action.type).easing || "ease",
    fill: "none"
  });

  run.animations.add(animation);
  return new Promise((resolve) => {
    const finish = () => {
      run.animations.delete(animation);
      resolve();
    };
    animation.addEventListener("finish", finish, { once: true });
    animation.addEventListener("cancel", finish, { once: true });
  });
}

async function runActionStack(component, node) {
  stopComponentActionRun(component.id);
  const run = {
    cancelled: false,
    animations: new Set(),
    timers: new Set()
  };
  activeActionRuns.set(component.id, run);

  for (const action of cloneActions(component.actions)) {
    if (run.cancelled) break;
    await waitForAction(Math.max(0, Number(action.delay) || 0), run);
    if (run.cancelled) break;
    await animateAction(component, node, action, run);
  }

  if (activeActionRuns.get(component.id) === run) {
    activeActionRuns.delete(component.id);
    resetActionTarget(node);
  }
}

function triggerComponent(id) {
  const component = components.find((item) => item.id === id);
  const node = componentLayer.querySelector(`[data-id="${id}"]`);
  if (!component || !node) return;

  interactions += 1;
  component.count += 1;
  interactionCount.textContent = String(interactions);

  effectClasses.forEach((className) => node.classList.remove(className));
  void node.offsetWidth;

  if (component.actions?.length) {
    runActionStack(component, node);
    return;
  }

  playComponentSound(component);
  node.classList.add(`effect-${component.effect}`);

  const duration = Number.parseFloat(getComputedStyle(node).getPropertyValue("--effect-duration")) || 560;
  window.setTimeout(() => {
    node.classList.remove(`effect-${component.effect}`);
  }, component.effect === "reveal" ? 1700 : duration + 80);
}

function stopActiveSounds() {
  activeAudioPlayers.forEach((audio) => {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {}
  });
  activeAudioPlayers.clear();

  activeToneNodes.forEach(({ oscillator, gain }) => {
    try {
      const now = audioContext?.currentTime || 0;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(0.0001, now);
      oscillator.stop(now);
    } catch {}
  });
  activeToneNodes.clear();
}

function playComponentSound(component) {
  if (!component.soundEnabled) return;
  const source = normalizedSoundSource(component);
  if (source === "none") return;

  const volume = clampNumber(component.soundVolume ?? 80, 0, 100, 80) / 100;
  if (source === "tone") {
    playGeneratedTone(component, volume);
    return;
  }

  const src = source === "custom" ? component.soundSrc : sampleSounds[source]?.src;
  if (!src) return;
  const audio = new Audio(src);
  audio.volume = Math.max(0, Math.min(1, volume));
  audio.currentTime = 0;
  activeAudioPlayers.add(audio);
  audio.addEventListener("ended", () => activeAudioPlayers.delete(audio), { once: true });
  audio.addEventListener("pause", () => {
    if (audio.currentTime === 0 || audio.ended) activeAudioPlayers.delete(audio);
  }, { once: true });
  audio.play().catch(() => activeAudioPlayers.delete(audio));
}

function playGeneratedTone(component, volume = 1) {
  audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === "suspended") audioContext.resume();
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = component.effect === "glitch" || component.effect === "shake" ? "square" : "sine";
  oscillator.frequency.setValueAtTime(140 + component.zoom * 2 + component.shake * 5, now);
  oscillator.frequency.exponentialRampToValueAtTime(90 + component.zoom, now + 0.16);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.08 * volume), now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  const toneNode = { oscillator, gain };
  activeToneNodes.add(toneNode);
  oscillator.addEventListener("ended", () => activeToneNodes.delete(toneNode), { once: true });
  oscillator.start(now);
  oscillator.stop(now + 0.22);
}


function cloneComponentData(component) {
  const copy = cloneComponent(component);
  delete copy.id;
  copy.count = 0;
  return copy;
}

function copySelectedComponent() {
  const selected = selectedComponents();
  if (!selected.length) return;
  copiedComponent = selected.map(cloneComponentData);
}

function pasteCopiedComponent() {
  const copiedList = Array.isArray(copiedComponent) ? copiedComponent : copiedComponent ? [copiedComponent] : [];
  if (!copiedList.length) return;

  saveHistory();
  const pastedIds = [];
  copiedList.forEach((copied) => {
    const id = nextId++;
    const pasted = {
      ...copied,
      id,
      name: `${copied.name} Copy`,
      x: copied.x + 3,
      y: copied.y + 3,
      count: 0
    };
    clampComponent(pasted);
    components.push(pasted);
    pastedIds.push(id);
  });

  setSelection(pastedIds);
  setCanvasReady();
  render();
}

function removeSelectedComponent() {
  const ids = new Set(selectedIds);
  if (!ids.size && selectedId) ids.add(selectedId);
  if (!ids.size) return;

  saveHistory();
  ids.forEach(stopComponentActionRun);
  components = components.filter((component) => !ids.has(component.id));
  setSelection([]);
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  emptyState.classList.add("is-hidden");
  artSurface.classList.remove("is-hidden");
  render();
}

function isTextEntryTarget(target) {
  if (!(target instanceof Element)) return false;
  if (target.closest("textarea, [contenteditable='true']")) return true;
  if (!(target instanceof HTMLInputElement)) return false;
  return ["text", "number", "search", "email", "url", "tel", "password"].includes(target.type);
}

function handleEditorShortcut(event) {
  const key = event.key.toLowerCase();
  if ((event.ctrlKey || event.metaKey) && key === "z") {
    event.preventDefault();
    undoLastAction();
    return;
  }

  const isTextEntry = isTextEntryTarget(event.target);

  if (!isTextEntry && (event.ctrlKey || event.metaKey) && key === "a") {
    event.preventDefault();
    setSelection(components.map((component) => component.id));
    syncSelectionVisuals();
    return;
  }

  if (!isTextEntry && (event.ctrlKey || event.metaKey) && key === "c") {
    event.preventDefault();
    copySelectedComponent();
    return;
  }

  if (!isTextEntry && (event.ctrlKey || event.metaKey) && key === "v") {
    event.preventDefault();
    pasteCopiedComponent();
    return;
  }

  if (event.key === "Delete" || event.key === "Backspace") {
    if (isTextEntry) return;
    event.preventDefault();
    removeSelectedComponent();
  }
}
function bringSelectedFront() {
  const ids = new Set(selectedIds);
  if (!ids.size && selectedId) ids.add(selectedId);
  if (!ids.size) return;
  saveHistory();
  const moving = components.filter((component) => ids.has(component.id));
  components = components.filter((component) => !ids.has(component.id));
  components.push(...moving);
  setSelection(moving.map((component) => component.id));
  render();
}

function duplicateSelected() {
  copySelectedComponent();
  pasteCopiedComponent();
}
function resetDemo() {
  saveHistory();
  stopAllActionRuns();
  stopActiveSounds();
  components = [];
  setSelection([]);
  nextId = 1;
  interactions = 0;
  dragState = null;
  resizeState = null;
  cornerRadiusState = null;
  curveHandleState = null;
  artboard = { ...defaultArtboard };
  syncArtboardInputs();
  applyArtboardSettings();
  componentInput.value = "";
  componentLayer.innerHTML = "";
  clearSmartGuides();
  emptyState.classList.remove("is-hidden");
  artSurface.classList.add("is-hidden");
  interactionCount.textContent = "0";
  selectedSummary.textContent = "None";
  effectSummary.textContent = "None";
  statusTitle.textContent = "Load samples, upload layers, or draw a shape.";
  statusText.textContent = "Click a component to select it. Drag it on the canvas to place it.";
  renderComponentList();
}
function roundValue(value) {
  const rounded = Math.round(Number(value) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

componentInput.addEventListener("change", (event) => loadComponentFiles(event.target.files));
sampleButton.addEventListener("click", loadSamples);
resetButton.addEventListener("click", resetDemo);
shapeButtons.forEach((button) => button.addEventListener("click", () => addShape(button.dataset.shape)));
addTextButton.addEventListener("click", addText);
bringFrontButton.addEventListener("click", bringSelectedFront);
duplicateButton.addEventListener("click", duplicateSelected);
testEffectButton.addEventListener("click", () => {
  selectedComponents().forEach((component) => triggerComponent(component.id));
});
testSoundButton.addEventListener("click", () => {
  stopActiveSounds();
  selectedComponents().forEach(playComponentSound);
});
window.addEventListener("keydown", handleEditorShortcut);
artSurface.addEventListener("pointerdown", startMarqueeSelection);
[artboardWidthInput, artboardHeightInput, artboardBgInput, artboardTransparentToggle].forEach((control) => {
  control.addEventListener("input", syncArtboardFromControls);
  control.addEventListener("change", syncArtboardFromControls);
});

soundToggle.addEventListener("change", () => updateSelectedSoundFromControls({ enabled: true }));
soundSelect.addEventListener("change", () => updateSelectedSoundFromControls({ source: true }));
soundVolumeRange.addEventListener("input", () => {
  updateRangeFill(soundVolumeRange);
  soundVolumeOutput.textContent = String(Math.round(soundVolumeRange.value));
  updateSelectedSoundFromControls({ volume: true });
});
soundVolumeRange.addEventListener("change", () => updateSelectedSoundFromControls({ volume: true }));
soundFileInput.addEventListener("change", (event) => loadSoundFileForSelection(event.target.files));

actionTypeSelect.addEventListener("change", () => {
  delete actionValueRange.dataset.touched;
  delete actionDurationRange.dataset.touched;
  syncActionValueControl();
});
actionValueRange.addEventListener("input", () => {
  actionValueRange.dataset.touched = "true";
  syncActionValueControl();
});
actionDelayRange.addEventListener("input", () => {
  actionDelayOutput.textContent = `${Math.round(actionDelayRange.value)}ms`;
  updateRangeFill(actionDelayRange);
});
actionDurationRange.addEventListener("input", () => {
  actionDurationRange.dataset.touched = "true";
  syncActionValueControl();
});
addActionButton.addEventListener("click", addActionToSelected);
clearActionsButton.addEventListener("click", clearSelectedActions);

[
  triggerSelect,
  effectSelect,
  zoomRange,
  shakeRange,
  speedRange,
  xRange,
  yRange,
  wRange,
  hRange,
  rotationRange,
  opacityRange,
  fillInput,
  fillTransparentToggle,
  strokeInput,
  strokeTransparentToggle,
  strokeWidthRange,
  cornerRadiusRange,
  curveC1XRange,
  curveC1YRange,
  curveC2XRange,
  curveC2YRange,
  strokeStyleSelect,
  lineCapSelect,
  textInput,
  fontInput,
  fontSizeRange
].forEach((control) => {
  const handleControlChange = () => {
    if (control === effectSelect) syncEffectControlVisibility(effectSelect.value);
    if (control === strokeWidthRange) strokeWidthInput.value = strokeWidthRange.value;
    if (control === cornerRadiusRange) cornerRadiusInput.value = cornerRadiusRange.value;
    if (control === curveC1XRange) curveC1XOutput.textContent = curveC1XRange.value;
    if (control === curveC1YRange) curveC1YOutput.textContent = curveC1YRange.value;
    if (control === curveC2XRange) curveC2XOutput.textContent = curveC2XRange.value;
    if (control === curveC2YRange) curveC2YOutput.textContent = curveC2YRange.value;
    updateRangeFill(control);
    syncEffectControlOutputs();
    updateSelectedFromControls();
  };
  control.addEventListener("input", handleControlChange);
  control.addEventListener("change", handleControlChange);
});

[
  [strokeWidthInput, strokeWidthRange],
  [cornerRadiusInput, cornerRadiusRange]
].forEach(([numberInput, rangeInput]) => {
  const handleNumberChange = () => {
    syncRangeFromNumberInput(numberInput, rangeInput);
    updateRangeFill(rangeInput);
    updateSelectedFromControls();
  };
  numberInput.addEventListener("input", handleNumberChange);
  numberInput.addEventListener("change", handleNumberChange);
});

syncArtboardInputs();
applyArtboardSettings();
syncEffectControlVisibility(effectSelect.value);
updateAllRangeFills();
syncControlsFromSelection();
renderComponentList();
