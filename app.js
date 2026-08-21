const componentInput = document.querySelector("#componentInput");
const sampleButton = document.querySelector("#sampleButton");
const resetButton = document.querySelector("#resetButton");
const shapeButtons = document.querySelectorAll("[data-shape]");
const addArtboardButton = document.querySelector("#addArtboardButton");
const addTextButton = document.querySelector("#addTextButton");
const addHorizontalGuideButton = document.querySelector("#addHorizontalGuideButton");
const addVerticalGuideButton = document.querySelector("#addVerticalGuideButton");
const insertToolButtons = [...shapeButtons, addTextButton, addHorizontalGuideButton, addVerticalGuideButton];
const bringFrontButton = document.querySelector("#bringFrontButton");
const duplicateButton = document.querySelector("#duplicateButton");
const alignmentButtons = document.querySelectorAll("[data-align]");
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
const stage = document.querySelector("#stage");
const artboardWorkspace = document.querySelector("#artboardWorkspace");
const rulerOverlay = document.querySelector("#rulerOverlay");
const horizontalRuler = document.querySelector("#horizontalRuler");
const verticalRuler = document.querySelector("#verticalRuler");
let artSurface = null;
let componentLayer = null;
let smartGuideLayer = null;
let artboardGuideLayer = null;
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
const regionPanel = document.querySelector("#regionPanel");
const addRegionButtons = document.querySelectorAll("[data-region-shape]");
const regionList = document.querySelector("#regionList");
const regionShapeSelect = document.querySelector("#regionShapeSelect");
const regionTriggerSelect = document.querySelector("#regionTriggerSelect");
const regionEffectSelect = document.querySelector("#regionEffectSelect");
const regionXRange = document.querySelector("#regionXRange");
const regionYRange = document.querySelector("#regionYRange");
const regionWRange = document.querySelector("#regionWRange");
const regionHRange = document.querySelector("#regionHRange");
const regionStrengthRange = document.querySelector("#regionStrengthRange");
const regionSoftnessRange = document.querySelector("#regionSoftnessRange");
const regionAngleRange = document.querySelector("#regionAngleRange");
const regionSpeedRange = document.querySelector("#regionSpeedRange");
const regionXOutput = document.querySelector("#regionXOutput");
const regionYOutput = document.querySelector("#regionYOutput");
const regionWOutput = document.querySelector("#regionWOutput");
const regionHOutput = document.querySelector("#regionHOutput");
const regionStrengthOutput = document.querySelector("#regionStrengthOutput");
const regionSoftnessOutput = document.querySelector("#regionSoftnessOutput");
const regionAngleOutput = document.querySelector("#regionAngleOutput");
const regionSpeedOutput = document.querySelector("#regionSpeedOutput");
const previewRegionButton = document.querySelector("#previewRegionButton");
const removeRegionButton = document.querySelector("#removeRegionButton");
const regionControls = [
  regionShapeSelect,
  regionTriggerSelect,
  regionEffectSelect,
  regionXRange,
  regionYRange,
  regionWRange,
  regionHRange,
  regionStrengthRange,
  regionSoftnessRange,
  regionAngleRange,
  regionSpeedRange
].filter(Boolean);
const regionRangeControls = [
  regionXRange,
  regionYRange,
  regionWRange,
  regionHRange,
  regionStrengthRange,
  regionSoftnessRange,
  regionAngleRange,
  regionSpeedRange
].filter(Boolean);

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
  none: "None",
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
  none: {},
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

const regionShapeLabels = {
  ellipse: "Ellipse",
  rect: "Rectangle",
  brush: "Soft Brush"
};

const regionTriggerLabels = {
  hover: "Hover",
  click: "Click / Tap",
  drag: "Drag / Swipe",
  move: "Pointer Move"
};

const regionEffectLabels = {
  bulge: "Bulge",
  stretch: "Stretch",
  smear: "Smear",
  ripple: "Ripple",
  spotlight: "Spotlight",
  pinch: "Pinch"
};

const defaultRegion = {
  shape: "ellipse",
  trigger: "hover",
  effect: "bulge",
  x: 30,
  y: 30,
  w: 32,
  h: 32,
  strength: 48,
  softness: 60,
  angle: 0,
  speed: 55
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
const workspaceInsetX = 520;
const workspaceInsetY = 356;
const workspaceCoordinateLimit = 100000;
const componentCoordinateLimit = 1000;
const rulerSize = 24;
const canvasRecordSettings = {
  width: 4000,
  height: 3000,
  background: "#ffffff",
  transparent: true
};
const canvasRecordPosition = { x: -1000, y: -700 };

const sampleComponents = [
  { name: "Green Orb", src: "./sample-components/01-green-orb.svg", x: 10, y: 10, w: 20, h: 28, effect: "zoom", trigger: "click", zoom: 150, shake: 12, regions: [{ name: "Orb bulge", shape: "ellipse", x: 24, y: 22, w: 48, h: 48, effect: "bulge", trigger: "hover", strength: 58, softness: 72, speed: 58 }] },
  { name: "Yellow Triangle", src: "./sample-components/02-yellow-triangle.svg", x: 25, y: 12, w: 20, h: 28, effect: "tilt", trigger: "hover", zoom: 130, shake: 16, regions: [{ name: "Top smear", shape: "brush", x: 28, y: 8, w: 40, h: 34, effect: "smear", trigger: "drag", strength: 54, softness: 80, angle: -28, speed: 68 }] },
  { name: "Red Disc", src: "./sample-components/03-red-disc.svg", x: 48, y: 26, w: 28, h: 32, effect: "bounce", trigger: "click", zoom: 135, shake: 18 },
  { name: "Blue Card", src: "./sample-components/04-blue-card.svg", x: 68, y: 14, w: 24, h: 25, effect: "glitch", trigger: "hover", zoom: 130, shake: 16, regions: [{ name: "Card spotlight", shape: "rect", x: 18, y: 26, w: 58, h: 36, effect: "spotlight", trigger: "click", strength: 64, softness: 42, speed: 52 }] },
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
let artboards = [];
let activeArtboardId = null;
let selectedArtboardId = null;
let selectedArtboardIds = [];
let nextArtboardId = 1;
let boardZoom = 1;
let workspaceOriginX = workspaceInsetX;
let workspaceOriginY = workspaceInsetY;
let isSpacePanning = false;
let stagePanState = null;
const minBoardZoom = 0.02;
const maxBoardZoom = 4;

let nextId = 1;
let nextRegionId = 1;
let nextGuideId = 1;
let selectedId = null;
let selectedIds = [];
let selectedRegionId = null;
let selectedGuideId = null;
let selectedGuideIds = [];
let components = [];
let guides = [];
let interactions = 0;
let audioContext = null;
const activeAudioPlayers = new Set();
const activeToneNodes = new Set();
const activeActionRuns = new Map();
const activeCssEffectRuns = new Map();
const activeRegionTimers = new Map();
const activeRegionCanvasRuns = new Map();
const drawableImageCache = new Map();
let nextRegionVectorId = 1;
let dragState = null;
let layerDragState = null;
let resizeState = null;
let cornerRadiusState = null;
let curveHandleState = null;
let regionDragState = null;
let brushDrawComponentId = null;
let brushDrawState = null;
let marqueeState = null;
let marqueeNode = null;
let workspaceMarqueeState = null;
let workspaceMarqueeNode = null;
let artboardDragState = null;
let artboardDragDidMove = false;
let guideDragState = null;
let rulerGuideDragState = null;
let activeInsertTool = null;
let insertDrawState = null;
let insertPreviewNode = null;
let rulersVisible = false;
let rulerRenderFrame = 0;
let measurementGuidesVisible = false;
let lastCanvasPointer = null;
let copiedComponent = null;
let movedDuringDrag = false;
const maxHistory = 100;
let historyStack = [];
let isRestoringHistory = false;

function activeArtboardRecord() {
  return artboards.find((record) => record.id === activeArtboardId) || null;
}

function selectedArtboardRecords() {
  const ids = new Set(selectedArtboardIds);
  return artboards.filter((record) => !record.isCanvas && ids.has(record.id));
}

function setArtboardSelection(ids, primaryId = null) {
  const existingIds = new Set(artboards.filter((record) => !record.isCanvas).map((record) => record.id));
  selectedArtboardIds = Array.from(new Set(ids)).filter((id) => existingIds.has(id));
  selectedArtboardId = primaryId && selectedArtboardIds.includes(primaryId)
    ? primaryId
    : selectedArtboardIds[selectedArtboardIds.length - 1] || null;
}

function clearArtboardSelection() {
  selectedArtboardIds = [];
  selectedArtboardId = null;
}

function commitActiveArtboardState() {
  const record = activeArtboardRecord();
  if (!record) return;
  record.artboard = { ...artboard };
  record.components = components;
  record.guides = guides.map((guide) => ({ ...guide }));
  record.selectedIds = [...selectedIds];
  record.selectedId = selectedId;
  record.selectedRegionId = selectedRegionId;
  record.selectedGuideId = selectedGuideId;
  record.selectedGuideIds = [...selectedGuideIds];
}

function setActiveArtboardRefs(record) {
  activeArtboardId = record?.id || null;
  artboard = record ? { ...record.artboard } : { ...defaultArtboard };
  components = record?.components || [];
  guides = record?.guides?.map((guide) => ({ ...guide })) || [];
  selectedIds = record ? [...(record.selectedIds || [])] : [];
  selectedId = record?.selectedId || null;
  selectedRegionId = record?.selectedRegionId || null;
  selectedGuideIds = record
    ? [...(record.selectedGuideIds || (record.selectedGuideId ? [record.selectedGuideId] : []))]
    : [];
  selectedGuideId = selectedGuideIds.includes(record?.selectedGuideId)
    ? record.selectedGuideId
    : selectedGuideIds[selectedGuideIds.length - 1] || null;
  artSurface = record?.surface || null;
  componentLayer = record?.componentLayer || null;
  smartGuideLayer = record?.smartGuideLayer || null;
  artboardGuideLayer = record?.artboardGuideLayer || null;
}

function applyArtboardVisual(record) {
  if (!record?.surface) return;
  const settings = record.artboard || defaultArtboard;
  const position = record.position || { x: 0, y: 0 };
  record.frame.style.left = `${workspaceOriginX + position.x * boardZoom}px`;
  record.frame.style.top = `${workspaceOriginY + position.y * boardZoom}px`;
  record.surface.style.setProperty("--artboard-width", `${settings.width}px`);
  record.surface.style.setProperty("--artboard-aspect", `${settings.width} / ${settings.height}`);
  record.surface.style.setProperty("--artboard-bg", settings.transparent ? "transparent" : settings.background);
  record.surface.style.setProperty("--board-zoom", String(boardZoom));
  record.surface.classList.toggle("is-transparent", settings.transparent);
}

function refreshWorkspaceBounds({ preserveViewport = false } = {}) {
  const previousOriginX = workspaceOriginX;
  const previousOriginY = workspaceOriginY;
  const minX = artboards.length ? Math.min(...artboards.map((record) => record.position.x)) : 0;
  const minY = artboards.length ? Math.min(...artboards.map((record) => record.position.y)) : 0;
  workspaceOriginX = workspaceInsetX + Math.max(0, -minX * boardZoom);
  workspaceOriginY = workspaceInsetY + Math.max(0, -minY * boardZoom);

  const right = artboards.length
    ? Math.max(...artboards.map((record) => workspaceOriginX + (record.position.x + record.artboard.width) * boardZoom))
    : 0;
  const bottom = artboards.length
    ? Math.max(...artboards.map((record) => workspaceOriginY + (record.position.y + record.artboard.height) * boardZoom))
    : 0;

  artboards.forEach((record) => {
    record.frame.style.left = `${workspaceOriginX + record.position.x * boardZoom}px`;
    record.frame.style.top = `${workspaceOriginY + record.position.y * boardZoom}px`;
    syncArtboardGuidePositions(record);
  });
  artboardWorkspace.style.width = `${Math.max(stage.clientWidth + 1040, right + 520)}px`;
  artboardWorkspace.style.height = `${Math.max(stage.clientHeight + 760, bottom + 420)}px`;

  if (preserveViewport) {
    stage.scrollLeft += workspaceOriginX - previousOriginX;
    stage.scrollTop += workspaceOriginY - previousOriginY;
  }
  scheduleRulerRender();
}

function nextArtboardPosition(settings = defaultArtboard) {
  const frameRecords = artboards.filter((record) => !record.isCanvas);
  if (!frameRecords.length) return { x: 0, y: 0 };
  const right = Math.max(...frameRecords.map((record) => record.position.x + record.artboard.width));
  const top = Math.min(...frameRecords.map((record) => record.position.y));
  return { x: right + 96, y: top };
}

function createArtboardRecord(data = {}) {
  const id = Number(data.id) || nextArtboardId++;
  nextArtboardId = Math.max(nextArtboardId, id + 1);
  const record = {
    id,
    name: data.name || (data.isCanvas ? "Canvas" : `Artboard ${id}`),
    isCanvas: Boolean(data.isCanvas),
    artboard: { ...defaultArtboard, ...(data.artboard || {}) },
    position: {
      x: clampNumber(data.position?.x ?? data.x, -workspaceCoordinateLimit, workspaceCoordinateLimit, 0),
      y: clampNumber(data.position?.y ?? data.y, -workspaceCoordinateLimit, workspaceCoordinateLimit, 0)
    },
    components: (data.components || []).map(cloneComponent),
    guides: (data.guides || []).map((guide) => ({ ...guide })),
    selectedIds: [...(data.selectedIds || [])],
    selectedId: data.selectedId || null,
    selectedRegionId: data.selectedRegionId || null,
    selectedGuideId: data.selectedGuideId || null,
    selectedGuideIds: [...(data.selectedGuideIds || (data.selectedGuideId ? [data.selectedGuideId] : []))],
    expanded: data.expanded !== false,
    frame: null,
    label: null,
    surface: null,
    componentLayer: null,
    smartGuideLayer: null,
    artboardGuideLayer: null
  };

  const frame = document.createElement("div");
  frame.className = `artboard-frame${record.isCanvas ? " is-canvas-record" : ""}`;
  frame.dataset.artboardId = String(id);

  const label = document.createElement("button");
  label.type = "button";
  label.className = "artboard-label";
  label.textContent = record.name;
  label.addEventListener("pointerdown", (event) => startArtboardDrag(event, id));
  label.addEventListener("click", (event) => {
    event.stopPropagation();
    if (artboardDragDidMove) {
      artboardDragDidMove = false;
      return;
    }
    if (event.shiftKey) {
      syncSelectionVisuals();
      return;
    }
    selectArtboard(id);
  });

  const surface = document.createElement("div");
  surface.className = `art-surface${record.isCanvas ? " is-canvas-surface" : ""}`;
  surface.dataset.artboardId = String(id);
  surface.setAttribute("aria-label", record.name);
  surface.addEventListener("pointerdown", (event) => {
    if (!record.isCanvas && !activeInsertTool && !event.target.closest(".art-component")) {
      setArtboardSelection(event.shiftKey ? [...selectedArtboardIds, id] : [id], id);
    }
    if (activeArtboardId !== id) activateArtboard(id);
    if (activeInsertTool) startInsertDraw(event, id);
  }, { capture: true });
  surface.addEventListener("pointerdown", startMarqueeSelection);

  const smartLayer = document.createElement("div");
  smartLayer.className = "smart-guide-layer";
  smartLayer.setAttribute("aria-hidden", "true");

  const guideLayer = document.createElement("div");
  guideLayer.className = `guide-layer${record.isCanvas ? " is-canvas-guide-layer" : ""}`;

  const layer = document.createElement("div");
  layer.className = "component-layer";

  surface.append(layer, smartLayer);
  frame.append(label, surface);
  artboardWorkspace.append(frame, guideLayer);
  record.frame = frame;
  record.label = label;
  record.surface = surface;
  record.componentLayer = layer;
  record.smartGuideLayer = smartLayer;
  record.artboardGuideLayer = guideLayer;
  applyArtboardVisual(record);
  return record;
}

function updateArtboardEmptyState() {
  emptyState.classList.toggle("is-hidden", artboards.length > 0);
}

function focusArtboard(record) {
  if (!record?.surface || record.isCanvas) return;
  window.requestAnimationFrame(() => {
    const stageRect = stage.getBoundingClientRect();
    const surfaceRect = record.surface.getBoundingClientRect();
    stage.scrollLeft += surfaceRect.left - stageRect.left - Math.max(28, (stage.clientWidth - surfaceRect.width) / 2);
    stage.scrollTop += surfaceRect.top - stageRect.top - Math.max(28, (stage.clientHeight - surfaceRect.height) / 2);
  });
}

function startArtboardDrag(event, artboardId) {
  if (event.button !== 0 || isSpacePanning) return;
  if (!selectedArtboardIds.includes(artboardId)) {
    setArtboardSelection(event.shiftKey ? [...selectedArtboardIds, artboardId] : [artboardId], artboardId);
  }
  const record = activateArtboard(artboardId);
  if (!record || record.isCanvas) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  const historyLengthBeforeDrag = historyStack.length;
  saveHistory();
  setSelection([]);
  setGuideSelection([]);
  syncSelectionVisuals();
  const movingRecords = selectedArtboardRecords();
  artboardDragDidMove = false;
  artboardDragState = {
    id: artboardId,
    ids: movingRecords.map((item) => item.id),
    startX: event.clientX,
    startY: event.clientY,
    bases: movingRecords.map((item) => ({ id: item.id, x: item.position.x, y: item.position.y })),
    moved: false,
    historyEntryAdded: historyStack.length > historyLengthBeforeDrag
  };
  document.body.classList.add("is-artboard-dragging");
  window.addEventListener("pointermove", handleArtboardDragMove);
  window.addEventListener("pointerup", handleArtboardDragUp, { once: true });
}

function handleArtboardDragMove(event) {
  if (!artboardDragState) return;
  const dx = (event.clientX - artboardDragState.startX) / boardZoom;
  const dy = (event.clientY - artboardDragState.startY) / boardZoom;
  if (Math.abs(dx) + Math.abs(dy) > 1) artboardDragState.moved = true;
  artboardDragState.bases.forEach((base) => {
    const record = artboards.find((item) => item.id === base.id);
    if (!record) return;
    record.position.x = clampNumber(base.x + dx, -workspaceCoordinateLimit, workspaceCoordinateLimit, base.x);
    record.position.y = clampNumber(base.y + dy, -workspaceCoordinateLimit, workspaceCoordinateLimit, base.y);
  });
  refreshWorkspaceBounds({ preserveViewport: true });
}

function handleArtboardDragUp() {
  window.removeEventListener("pointermove", handleArtboardDragMove);
  artboardDragDidMove = Boolean(artboardDragState?.moved);
  if (!artboardDragState?.moved && artboardDragState?.historyEntryAdded) historyStack.pop();
  artboardDragState = null;
  document.body.classList.remove("is-artboard-dragging");
  commitActiveArtboardState();
  window.setTimeout(() => { artboardDragDidMove = false; }, 0);
}

function activateArtboard(id, { focus = false, renderBoard = false } = {}) {
  const record = artboards.find((item) => item.id === id);
  if (!record) return null;

  if (activeArtboardId !== id) {
    if (componentLayer) clearActiveRegionEffects();
    cancelBrushDrawMode();
    commitActiveArtboardState();
    setActiveArtboardRefs(record);
    if (!selectedArtboardIds.includes(id)) clearArtboardSelection();
  }

  artboards.forEach((item) => {
    const isActive = item.id === id;
    item.frame?.classList.toggle("is-active", isActive);
    item.artboardGuideLayer?.classList.toggle("is-active", isActive);
  });
  applyArtboardSettings();
  syncArtboardInputs();
  updateArtboardEmptyState();
  if (renderBoard) render();
  else {
    renderComponentList();
    syncControlsFromSelection();
    syncSelectionVisuals();
  }
  if (focus) focusArtboard(record);
  return record;
}

function selectArtboard(id, { focus = false, toggle = false } = {}) {
  const existing = selectedArtboardIds.includes(id);
  if (toggle && existing) {
    setArtboardSelection(selectedArtboardIds.filter((selected) => selected !== id));
    syncSelectionVisuals();
    return artboards.find((record) => record.id === id) || null;
  }
  setArtboardSelection(toggle ? [...selectedArtboardIds, id] : [id], id);
  const record = activateArtboard(id, { focus });
  if (!record || record.isCanvas) return null;
  setSelection([]);
  setGuideSelection([]);
  selectedRegionId = null;
  syncSelectionVisuals();
  return record;
}

function createArtboard({ save = true, focus = true, artboard: settings = null } = {}) {
  if (save) saveHistory();
  commitActiveArtboardState();
  const nextSettings = settings || { ...defaultArtboard };
  const record = createArtboardRecord({ artboard: nextSettings, position: nextArtboardPosition(nextSettings) });
  artboards.push(record);
  setActiveArtboardRefs(record);
  setArtboardSelection([record.id], record.id);
  artboards.forEach((item) => {
    const isActive = item.id === record.id;
    item.frame?.classList.toggle("is-active", isActive);
    item.artboardGuideLayer?.classList.toggle("is-active", isActive);
  });
  updateArtboardEmptyState();
  syncArtboardInputs();
  applyArtboardSettings();
  render();
  refreshWorkspaceBounds();
  if (focus) focusArtboard(record);
  return record;
}

function canvasRecord() {
  return artboards.find((record) => record.isCanvas) || null;
}

function ensureCanvasRecord() {
  const existing = canvasRecord();
  if (existing) return existing;
  commitActiveArtboardState();
  const record = createArtboardRecord({
    name: "Canvas",
    isCanvas: true,
    artboard: canvasRecordSettings,
    position: canvasRecordPosition
  });
  artboards.unshift(record);
  updateArtboardEmptyState();
  refreshWorkspaceBounds({ preserveViewport: true });
  return record;
}

function ensureActiveArtboard() {
  return activeArtboardRecord() || createArtboard({ save: false, focus: true });
}

function clearArtboards() {
  artboards.forEach((record) => {
    record.frame?.remove();
    record.artboardGuideLayer?.remove();
  });
  artboards = [];
  activeArtboardId = null;
  clearArtboardSelection();
  workspaceOriginX = workspaceInsetX;
  workspaceOriginY = workspaceInsetY;
  setActiveArtboardRefs(null);
  refreshWorkspaceBounds();
  updateArtboardEmptyState();
}

function selectedComponents() {
  const ids = new Set(selectedIds);
  return components.filter((component) => ids.has(component.id));
}

function selectedComponent() {
  const selected = selectedComponents();
  if (!selected.length) return null;
  return selected.find((component) => component.id === selectedId) || selected[selected.length - 1];
}

function setGuideSelection(ids, primaryId = null) {
  const existingIds = new Set(guides.map((guide) => guide.id));
  selectedGuideIds = Array.from(new Set(ids)).filter((id) => existingIds.has(id));
  selectedGuideId = primaryId && selectedGuideIds.includes(primaryId)
    ? primaryId
    : selectedGuideIds[selectedGuideIds.length - 1] || null;
  if (selectedGuideIds.length) clearArtboardSelection();
}

function setSelection(ids, { preserveGuides = false } = {}) {
  const existingIds = new Set(components.map((component) => component.id));
  selectedIds = Array.from(new Set(ids)).filter((id) => existingIds.has(id));
  selectedId = selectedIds[selectedIds.length - 1] || null;
  if (selectedIds.length) clearArtboardSelection();
  if (selectedIds.length && !preserveGuides) setGuideSelection([]);
  if (selectedRegionId && !components.some((component) => selectedIds.includes(component.id) && component.regions?.some((region) => region.id === selectedRegionId))) {
    selectedRegionId = null;
  }
  if (brushDrawComponentId && brushDrawComponentId !== selectedId) cancelBrushDrawMode();
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
    componentLayer?.querySelectorAll(".art-component").forEach((node) => {
      const id = Number(node.dataset.id);
      node.classList.toggle("is-selected", isSelected(id));
      node.classList.toggle("has-selected-region", Boolean(selectedRegionId && components.find((component) => component.id === id)?.regions?.some((region) => region.id === selectedRegionId)));
    });
    artboards.forEach((record) => {
      const selected = selectedArtboardIds.includes(record.id);
      record.frame?.classList.toggle("is-artboard-selected", selected);
      record.label?.setAttribute("aria-pressed", String(selected));
    });
    syncGuideSelectionVisuals();
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

function cloneRegions(regions) {
  return Array.isArray(regions)
    ? regions.map((region) => ({
      ...region,
      points: Array.isArray(region.points) ? region.points.map((point) => [...point]) : []
    }))
    : [];
}

function cloneComponent(component) {
  return {
    ...component,
    actions: cloneActions(component.actions),
    regions: cloneRegions(component.regions)
  };
}

function captureState() {
  commitActiveArtboardState();
  return {
    artboards: artboards.map((record) => ({
      id: record.id,
      name: record.name,
      isCanvas: record.isCanvas,
      artboard: { ...record.artboard },
      position: { ...record.position },
      components: record.components.map(cloneComponent),
      guides: (record.guides || []).map((guide) => ({ ...guide })),
      selectedIds: [...(record.selectedIds || [])],
      selectedId: record.selectedId || null,
      selectedRegionId: record.selectedRegionId || null,
      selectedGuideId: record.selectedGuideId || null,
      selectedGuideIds: [...(record.selectedGuideIds || [])],
      expanded: record.expanded !== false
    })),
    activeArtboardId,
    selectedArtboardId,
    selectedArtboardIds: [...selectedArtboardIds],
    nextArtboardId,
    boardZoom,
    stageScroll: { left: stage.scrollLeft, top: stage.scrollTop },
    nextId,
    nextRegionId,
    nextGuideId,
    interactions
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
  cancelBrushDrawMode();
  if (componentLayer) clearActiveRegionEffects();
  clearArtboards();
  nextId = record.snapshot.nextId;
  nextRegionId = record.snapshot.nextRegionId || 1;
  nextGuideId = record.snapshot.nextGuideId || 1;
  nextArtboardId = record.snapshot.nextArtboardId || 1;
  boardZoom = clampNumber(record.snapshot.boardZoom, minBoardZoom, maxBoardZoom, 1);
  interactions = record.snapshot.interactions;
  interactionCount.textContent = String(interactions);

  (record.snapshot.artboards || []).forEach((data) => {
    const boardRecord = createArtboardRecord(data);
    artboards.push(boardRecord);
    setActiveArtboardRefs(boardRecord);
    renderComponents();
    renderGuides();
    commitActiveArtboardState();
  });

  const restoredActive = artboards.find((item) => item.id === record.snapshot.activeArtboardId) || artboards[0] || null;
  setArtboardSelection(
    record.snapshot.selectedArtboardIds || (record.snapshot.selectedArtboardId ? [record.snapshot.selectedArtboardId] : []),
    record.snapshot.selectedArtboardId
  );
  setActiveArtboardRefs(restoredActive);
  artboards.forEach((item) => {
    const isActive = item.id === restoredActive?.id;
    item.frame?.classList.toggle("is-active", isActive);
    item.artboardGuideLayer?.classList.toggle("is-active", isActive);
  });
  if (restoredActive) {
    syncArtboardInputs();
    applyArtboardSettings();
  }
  updateArtboardEmptyState();
  refreshWorkspaceBounds();
  syncSelectionVisuals();
  const restoredScroll = record.snapshot.stageScroll;
  if (restoredScroll) {
    window.requestAnimationFrame(() => {
      stage.scrollLeft = restoredScroll.left;
      stage.scrollTop = restoredScroll.top;
    });
  }
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

function nextRegionIdFromComponents() {
  const ids = components.flatMap((component) => (component.regions || []).map((region) => Number(region.id) || 0));
  return Math.max(1, ...ids) + 1;
}

function normalizeBrushPoints(points) {
  if (!Array.isArray(points)) return [];
  return points
    .map((point) => {
      if (Array.isArray(point)) {
        return [
          clampNumber(point[0], 0, 100, 0),
          clampNumber(point[1], 0, 100, 0)
        ];
      }
      return [
        clampNumber(point?.x, 0, 100, 0),
        clampNumber(point?.y, 0, 100, 0)
      ];
    })
    .filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]));
}

function normalizeRegion(region = {}, index = 0) {
  const shape = region.shape in regionShapeLabels ? region.shape : defaultRegion.shape;
  const trigger = region.trigger in regionTriggerLabels ? region.trigger : defaultRegion.trigger;
  const effect = region.effect in regionEffectLabels ? region.effect : defaultRegion.effect;
  const normalized = {
    id: Number.isFinite(Number(region.id)) ? Number(region.id) : nextRegionId++,
    name: region.name || `Area ${index + 1}`,
    shape,
    trigger,
    effect,
    x: clampNumber(region.x ?? defaultRegion.x, 0, 95, defaultRegion.x),
    y: clampNumber(region.y ?? defaultRegion.y, 0, 95, defaultRegion.y),
    w: clampNumber(region.w ?? defaultRegion.w, 5, 100, defaultRegion.w),
    h: clampNumber(region.h ?? defaultRegion.h, 5, 100, defaultRegion.h),
    strength: clampNumber(region.strength ?? defaultRegion.strength, 0, 100, defaultRegion.strength),
    softness: clampNumber(region.softness ?? defaultRegion.softness, 0, 100, defaultRegion.softness),
    angle: clampNumber(region.angle ?? defaultRegion.angle, -180, 180, defaultRegion.angle),
    speed: clampNumber(region.speed ?? defaultRegion.speed, 10, 100, defaultRegion.speed),
    points: normalizeBrushPoints(region.points)
  };
  clampRegion(normalized);
  return normalized;
}

function hydrateRegions(regions) {
  return Array.isArray(regions) ? regions.map((region, index) => normalizeRegion(region, index)) : [];
}

function duplicateRegions(regions) {
  return cloneRegions(regions).map((region, index) => normalizeRegion({ ...region, id: undefined, name: region.name || `Area ${index + 1}` }, index));
}

function clampRegion(region) {
  region.w = clampNumber(region.w, 5, 100, defaultRegion.w);
  region.h = clampNumber(region.h, 5, 100, defaultRegion.h);
  region.x = clampNumber(region.x, 0, 100 - region.w, defaultRegion.x);
  region.y = clampNumber(region.y, 0, 100 - region.h, defaultRegion.y);
  region.strength = clampNumber(region.strength, 0, 100, defaultRegion.strength);
  region.softness = clampNumber(region.softness, 0, 100, defaultRegion.softness);
  region.angle = clampNumber(region.angle, -180, 180, defaultRegion.angle);
  region.speed = clampNumber(region.speed, 10, 100, defaultRegion.speed);
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
  if (!artSurface) return;
  const record = activeArtboardRecord();
  if (record) record.artboard = { ...artboard };
  applyArtboardVisual(record);
  refreshWorkspaceBounds();
  artboardBgInput.disabled = artboard.transparent;
}

function applyBoardZoom() {
  artboards.forEach(applyArtboardVisual);
  refreshWorkspaceBounds();
}

function setBoardZoom(nextZoom, originEvent = null) {
  if (!artSurface) return;
  const previousZoom = boardZoom;
  const next = clampNumber(nextZoom, minBoardZoom, maxBoardZoom, previousZoom);
  if (Math.abs(next - previousZoom) < 0.001) return;

  const previousRect = artSurface.getBoundingClientRect();
  const focusX = originEvent && previousRect.width
    ? clampNumber((originEvent.clientX - previousRect.left) / previousRect.width, 0, 1, 0.5)
    : 0.5;
  const focusY = originEvent && previousRect.height
    ? clampNumber((originEvent.clientY - previousRect.top) / previousRect.height, 0, 1, 0.5)
    : 0.5;
  const clientX = originEvent?.clientX ?? previousRect.left + previousRect.width / 2;
  const clientY = originEvent?.clientY ?? previousRect.top + previousRect.height / 2;

  boardZoom = next;
  applyBoardZoom();

  const nextRect = artSurface.getBoundingClientRect();
  stage.scrollLeft += nextRect.left + nextRect.width * focusX - clientX;
  stage.scrollTop += nextRect.top + nextRect.height * focusY - clientY;
  scheduleRulerRender();
}

function rulerMajorInterval() {
  const targetUnits = 80 / Math.max(minBoardZoom, boardZoom);
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(0.0001, targetUnits)));
  const normalized = targetUnits / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function prepareRulerCanvas(canvas, width, height) {
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const pixelWidth = Math.max(1, Math.round(width * ratio));
  const pixelHeight = Math.max(1, Math.round(height * ratio));
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = "rgba(255, 255, 255, .97)";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#8c8c8c";
  context.fillStyle = "#666";
  context.lineWidth = 1;
  context.font = '9px Inter, "Segoe UI", Arial, sans-serif';
  return context;
}

function isMajorRulerTick(value, major) {
  return Math.abs(value / major - Math.round(value / major)) < 0.0001;
}

function rulerSelectionRect() {
  const selectedNodes = selectedIds.map((id) => componentLayer?.querySelector(`[data-id="${id}"]`)).filter(Boolean);
  if (selectedNodes.length) {
    const rects = selectedNodes.map((node) => node.getBoundingClientRect());
    return {
      left: Math.min(...rects.map((rect) => rect.left)),
      right: Math.max(...rects.map((rect) => rect.right)),
      top: Math.min(...rects.map((rect) => rect.top)),
      bottom: Math.max(...rects.map((rect) => rect.bottom))
    };
  }
  const record = activeArtboardRecord();
  return record && !record.isCanvas ? record.surface.getBoundingClientRect() : null;
}

function drawHorizontalRulerHighlight(context, width, height) {
  const selection = rulerSelectionRect();
  if (!selection) return;
  const stageRect = stage.getBoundingClientRect();
  const left = Math.max(0, selection.left - stageRect.left - rulerSize);
  const right = Math.min(width, selection.right - stageRect.left - rulerSize);
  if (right <= left) return;
  context.fillStyle = "rgba(13, 153, 255, .14)";
  context.fillRect(left, 0, right - left, height);
  context.fillStyle = "#0D99FF";
  context.fillRect(left, height - 2, right - left, 2);
}

function drawVerticalRulerHighlight(context, width, height) {
  const selection = rulerSelectionRect();
  if (!selection) return;
  const stageRect = stage.getBoundingClientRect();
  const top = Math.max(0, selection.top - stageRect.top - rulerSize);
  const bottom = Math.min(height, selection.bottom - stageRect.top - rulerSize);
  if (bottom <= top) return;
  context.fillStyle = "rgba(13, 153, 255, .14)";
  context.fillRect(0, top, width, bottom - top);
  context.fillStyle = "#0D99FF";
  context.fillRect(width - 2, top, 2, bottom - top);
}

function renderHorizontalRuler() {
  const width = Math.max(1, stage.clientWidth - rulerSize);
  const height = rulerSize;
  const context = prepareRulerCanvas(horizontalRuler, width, height);
  const major = rulerMajorInterval();
  const minor = major / 10;
  const origin = workspaceOriginX - stage.scrollLeft - rulerSize;
  const worldStart = (0 - origin) / boardZoom;
  const worldEnd = (width - origin) / boardZoom;
  const first = Math.floor(worldStart / minor) * minor;

  drawHorizontalRulerHighlight(context, width, height);
  context.fillStyle = "#666";
  context.textBaseline = "top";
  for (let value = first; value <= worldEnd + minor; value += minor) {
    const x = origin + value * boardZoom;
    const isMajor = isMajorRulerTick(value, major);
    context.beginPath();
    context.moveTo(Math.round(x) + 0.5, isMajor ? 12 : 18);
    context.lineTo(Math.round(x) + 0.5, rulerSize);
    context.stroke();
    if (isMajor) context.fillText(String(Math.round(value)), Math.round(x) + 3, 1);
  }
}

function renderVerticalRuler() {
  const width = rulerSize;
  const height = Math.max(1, stage.clientHeight - rulerSize);
  const context = prepareRulerCanvas(verticalRuler, width, height);
  const major = rulerMajorInterval();
  const minor = major / 10;
  const activeOffset = activeArtboardRecord()?.isCanvas ? 0 : 24;
  const origin = workspaceOriginY + activeOffset - stage.scrollTop - rulerSize;
  const worldStart = (0 - origin) / boardZoom;
  const worldEnd = (height - origin) / boardZoom;
  const first = Math.floor(worldStart / minor) * minor;

  drawVerticalRulerHighlight(context, width, height);
  context.fillStyle = "#666";
  for (let value = first; value <= worldEnd + minor; value += minor) {
    const y = origin + value * boardZoom;
    const isMajor = isMajorRulerTick(value, major);
    context.beginPath();
    context.moveTo(isMajor ? 12 : 18, Math.round(y) + 0.5);
    context.lineTo(rulerSize, Math.round(y) + 0.5);
    context.stroke();
    if (isMajor) {
      context.save();
      context.translate(13, Math.round(y) - 3);
      context.rotate(-Math.PI / 2);
      context.fillText(String(Math.round(value)), 0, 0);
      context.restore();
    }
  }
}

function renderRulers() {
  rulerRenderFrame = 0;
  if (!rulersVisible) return;
  renderHorizontalRuler();
  renderVerticalRuler();
}

function scheduleRulerRender() {
  if (!rulersVisible || rulerRenderFrame) return;
  rulerRenderFrame = window.requestAnimationFrame(renderRulers);
}

function toggleRulers() {
  rulersVisible = !rulersVisible;
  rulerOverlay.classList.toggle("is-hidden", !rulersVisible);
  scheduleRulerRender();
}

function updateRulerGuidePreview(event) {
  if (!rulerGuideDragState?.preview) return;
  const workspaceRect = artboardWorkspace.getBoundingClientRect();
  const distance = Math.hypot(
    event.clientX - rulerGuideDragState.startX,
    event.clientY - rulerGuideDragState.startY
  );
  rulerGuideDragState.moved = distance >= 4;
  if (rulerGuideDragState.orientation === "vertical") {
    rulerGuideDragState.preview.style.left = `${event.clientX - workspaceRect.left}px`;
  } else {
    rulerGuideDragState.preview.style.top = `${event.clientY - workspaceRect.top}px`;
  }
}

function startRulerGuideDrag(event, orientation) {
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  cancelInsertTool();
  const normalizedOrientation = orientation === "vertical" ? "vertical" : "horizontal";
  const preview = document.createElement("div");
  preview.className = `insert-guide-preview ruler-guide-preview is-${normalizedOrientation}`;
  artboardWorkspace.appendChild(preview);
  rulerGuideDragState = {
    orientation: normalizedOrientation,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
    preview
  };
  updateRulerGuidePreview(event);
  window.addEventListener("pointermove", handleRulerGuideDragMove);
  window.addEventListener("pointerup", handleRulerGuideDragUp, { once: true });
}

function handleRulerGuideDragMove(event) {
  if (!rulerGuideDragState) return;
  event.preventDefault();
  updateRulerGuidePreview(event);
}

function guideDropRecord(event) {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  const surface = element?.closest?.(".art-surface");
  const record = surface
    ? artboards.find((item) => item.id === Number(surface.dataset.artboardId))
    : null;
  return record || ensureCanvasRecord();
}

function handleRulerGuideDragUp(event) {
  const state = rulerGuideDragState;
  if (!state) return;
  window.removeEventListener("pointermove", handleRulerGuideDragMove);
  updateRulerGuidePreview(event);
  state.preview.remove();
  rulerGuideDragState = null;

  const stageRect = stage.getBoundingClientRect();
  const insideStage = event.clientX >= stageRect.left
    && event.clientX <= stageRect.right
    && event.clientY >= stageRect.top
    && event.clientY <= stageRect.bottom;
  const returnedToRuler = state.orientation === "horizontal"
    ? event.clientY <= stageRect.top + rulerSize
    : event.clientX <= stageRect.left + rulerSize;
  if (!state.moved || !insideStage || returnedToRuler) return;

  const record = guideDropRecord(event);
  activateArtboard(record.id);
  const surfaceRect = record.surface.getBoundingClientRect();
  const position = state.orientation === "vertical"
    ? (event.clientX - surfaceRect.left) / Math.max(1, surfaceRect.width) * record.artboard.width
    : (event.clientY - surfaceRect.top) / Math.max(1, surfaceRect.height) * record.artboard.height;
  addGuide(state.orientation, position);
}

function syncArtboardInputs() {
  const record = activeArtboardRecord();
  const hasArtboard = Boolean(record && !record.isCanvas);
  [artboardWidthInput, artboardHeightInput, artboardBgInput, artboardTransparentToggle].forEach((control) => {
    control.disabled = !hasArtboard;
  });
  if (record?.isCanvas) {
    artboardWidthInput.value = "";
    artboardHeightInput.value = "";
    artboardBgInput.value = "#ffffff";
    artboardTransparentToggle.checked = false;
    return;
  }
  artboardWidthInput.value = Math.round(artboard.width);
  artboardHeightInput.value = Math.round(artboard.height);
  artboardBgInput.value = artboard.background;
  artboardTransparentToggle.checked = artboard.transparent;
  if (hasArtboard) artboardBgInput.disabled = artboard.transparent;
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
  if (!activeArtboardRecord()) return;
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
  commitActiveArtboardState();
  syncArtboardInputs();
  applyArtboardSettings();
  if (sizeChanged) {
    components.forEach(clampComponent);
    render();
  }
}
function setCanvasReady(title = "Components loaded") {
  ensureActiveArtboard();
  updateArtboardEmptyState();
  statusTitle.textContent = title;
  statusText.textContent = "Select a component, drag it into place, then freely change style or effect.";
}

function loadSamples() {
  saveHistory();
  ensureActiveArtboard();
  components = [];
  setSelection([]);
  selectedRegionId = null;
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
  ensureActiveArtboard();
  components = [];
  setSelection([]);
  selectedRegionId = null;
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
      effect: "none",
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
function shapeComponentConfig(shape, geometry) {
  const style = defaultStyle();
  return {
    ...style,
    type: "shape",
    shape,
    name: shapeLabels[shape],
    ...geometry,
    fill: "#ffffff",
    fillTransparent: false,
    strokeTransparent: false,
    strokeWidth: 1,
    cornerRadius: 0,
    ...defaultCurve,
    effect: "none",
    trigger: triggerSelect.value
  };
}

function textComponentConfig(geometry) {
  return {
    ...defaultStyle(),
    type: "text",
    name: "Text",
    ...geometry,
    fill: "#191714",
    fillTransparent: false,
    strokeTransparent: false,
    effect: "none",
    trigger: triggerSelect.value
  };
}

function insertToolKey(tool) {
  if (!tool) return "";
  if (tool.kind === "shape") return `shape:${tool.shape}`;
  if (tool.kind === "guide") return `guide:${tool.orientation}`;
  return tool.kind;
}

function syncInsertToolState() {
  const activeKey = insertToolKey(activeInsertTool);
  insertToolButtons.forEach((button) => {
    const key = button.dataset.shape
      ? `shape:${button.dataset.shape}`
      : button === addTextButton
      ? "text"
      : button === addVerticalGuideButton
      ? "guide:vertical"
      : "guide:horizontal";
    const isActive = key === activeKey;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  document.body.classList.toggle("is-insert-tool", Boolean(activeInsertTool));
}

function cancelInsertDraw() {
  window.removeEventListener("pointermove", handleInsertDrawMove);
  window.removeEventListener("pointerup", handleInsertDrawUp);
  insertPreviewNode?.remove();
  insertPreviewNode = null;
  insertDrawState = null;
}

function cancelInsertTool() {
  cancelInsertDraw();
  activeInsertTool = null;
  syncInsertToolState();
}

function activateInsertTool(tool) {
  const nextKey = insertToolKey(tool);
  if (nextKey && nextKey === insertToolKey(activeInsertTool)) {
    cancelInsertTool();
    return;
  }
  cancelBrushDrawMode();
  cancelInsertDraw();
  activeInsertTool = { ...tool };
  syncInsertToolState();
  stage.focus({ preventScroll: true });
}

function unboundedPointInSurface(event, rect = artSurface?.getBoundingClientRect()) {
  if (!rect) return { x: 0, y: 0 };
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function constrainedInsertEnd(state, event) {
  const raw = unboundedPointInSurface(event, state.surfaceRect);
  const start = state.start;
  let dx = raw.x - start.x;
  let dy = raw.y - start.y;
  const constrain = event.shiftKey || event.ctrlKey || event.metaKey;

  if (constrain && state.tool.kind === "shape" && state.tool.shape === "line") {
    const length = Math.hypot(dx, dy);
    const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI / 4;
    dx = Math.cos(angle) * length;
    dy = Math.sin(angle) * length;
  } else if (constrain && state.tool.kind === "shape" && ["circle", "rect", "triangle", "star"].includes(state.tool.shape)) {
    const aspect = visualAspectForShape(state.tool.shape);
    const directionX = Math.sign(dx) || 1;
    const directionY = Math.sign(dy) || 1;
    if (Math.abs(dx) / Math.max(1, Math.abs(dy)) > aspect) dy = directionY * Math.abs(dx) / aspect;
    else dx = directionX * Math.abs(dy) * aspect;
  }

  return { x: start.x + dx, y: start.y + dy };
}

function insertGeometry(state, event) {
  const end = constrainedInsertEnd(state, event);
  const left = Math.min(state.start.x, end.x);
  const top = Math.min(state.start.y, end.y);
  return {
    end,
    left,
    top,
    width: Math.abs(end.x - state.start.x),
    height: Math.abs(end.y - state.start.y)
  };
}

function createInsertPreview(state) {
  const preview = document.createElement("div");
  if (state.tool.kind === "guide") {
    preview.className = `insert-guide-preview is-${state.tool.orientation}`;
    artboardGuideLayer?.appendChild(preview);
  } else {
    const shapeClass = state.tool.kind === "shape" ? ` is-${state.tool.shape}` : " is-text";
    preview.className = `insert-draw-preview${shapeClass}`;
    componentLayer?.appendChild(preview);
  }
  return preview;
}

function updateInsertPreview(event) {
  if (!insertDrawState || !insertPreviewNode) return;
  const geometry = insertGeometry(insertDrawState, event);
  insertDrawState.geometry = geometry;
  insertDrawState.moved = geometry.width + geometry.height >= 5;

  if (insertDrawState.tool.kind === "guide") {
    const layerRect = artboardGuideLayer.getBoundingClientRect();
    if (insertDrawState.tool.orientation === "vertical") insertPreviewNode.style.left = `${event.clientX - layerRect.left}px`;
    else insertPreviewNode.style.top = `${event.clientY - layerRect.top}px`;
    return;
  }

  const shape = insertDrawState.tool.shape;
  if (shape === "line") {
    const dx = geometry.end.x - insertDrawState.start.x;
    const dy = geometry.end.y - insertDrawState.start.y;
    insertPreviewNode.style.left = `${insertDrawState.start.x}px`;
    insertPreviewNode.style.top = `${insertDrawState.start.y}px`;
    insertPreviewNode.style.width = `${Math.max(1, Math.hypot(dx, dy))}px`;
    insertPreviewNode.style.height = "1px";
    insertPreviewNode.style.transformOrigin = "0 0";
    insertPreviewNode.style.transform = `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`;
    return;
  }

  insertPreviewNode.style.left = `${geometry.left}px`;
  insertPreviewNode.style.top = `${geometry.top}px`;
  insertPreviewNode.style.width = `${Math.max(1, geometry.width)}px`;
  insertPreviewNode.style.height = `${Math.max(1, geometry.height)}px`;
}

function startInsertDraw(event, artboardId) {
  if (!activeInsertTool || event.button !== 0 || isSpacePanning) return;
  const record = activeArtboardId === artboardId ? activeArtboardRecord() : activateArtboard(artboardId);
  if (!record?.surface) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  clearSmartGuides();
  const surfaceRect = record.surface.getBoundingClientRect();
  insertDrawState = {
    artboardId,
    tool: { ...activeInsertTool },
    surfaceRect,
    start: unboundedPointInSurface(event, surfaceRect),
    geometry: null,
    moved: false
  };
  insertPreviewNode = createInsertPreview(insertDrawState);
  updateInsertPreview(event);
  window.addEventListener("pointermove", handleInsertDrawMove);
  window.addEventListener("pointerup", handleInsertDrawUp, { once: true });
}

function startWorkspaceInsertDraw(event) {
  if (!activeInsertTool || event.button !== 0 || isSpacePanning) return;
  if (!(event.target instanceof Element)) return;
  if (event.target.closest(".art-surface, .artboard-guide")) return;
  if (event.target.closest(".artboard-frame:not(.is-canvas-record)")) return;
  const record = ensureCanvasRecord();
  activateArtboard(record.id);
  startInsertDraw(event, record.id);
}

function handleInsertDrawMove(event) {
  if (!insertDrawState) return;
  event.preventDefault();
  updateInsertPreview(event);
}

function componentGeometryFromInsert(state) {
  const geometry = state.geometry;
  const surfaceRect = state.surfaceRect;
  const toX = (value) => value / Math.max(1, surfaceRect.width) * 100;
  const toY = (value) => value / Math.max(1, surfaceRect.height) * 100;

  if (state.tool.kind === "shape" && state.tool.shape === "line") {
    const dx = geometry.end.x - state.start.x;
    const dy = geometry.end.y - state.start.y;
    const width = Math.max(0.2, Math.hypot(dx, dy) / Math.max(1, surfaceRect.width) * 100);
    const height = lineHeightForStroke(1);
    return {
      x: toX((state.start.x + geometry.end.x) / 2) - width / 2,
      y: toY((state.start.y + geometry.end.y) / 2) - height / 2,
      w: width,
      h: height,
      rotation: Math.atan2(dy, dx) * 180 / Math.PI
    };
  }

  return {
    x: toX(geometry.left),
    y: toY(geometry.top),
    w: Math.max(1, toX(geometry.width)),
    h: Math.max(1, toY(geometry.height)),
    rotation: 0
  };
}

function handleInsertDrawUp(event) {
  const state = insertDrawState;
  if (!state) return;
  updateInsertPreview(event);
  const shouldCreate = state.moved;
  const geometry = shouldCreate ? componentGeometryFromInsert(state) : null;
  const guidePosition = shouldCreate && state.tool.kind === "guide"
    ? state.tool.orientation === "vertical"
      ? normalizedGuidePosition(state.geometry.end.x / Math.max(1, state.surfaceRect.width) * artboard.width, "vertical", activeArtboardRecord())
      : normalizedGuidePosition(state.geometry.end.y / Math.max(1, state.surfaceRect.height) * artboard.height, "horizontal", activeArtboardRecord())
    : null;
  const tool = { ...state.tool };
  cancelInsertDraw();
  activeInsertTool = null;
  syncInsertToolState();
  if (!shouldCreate) return;

  if (tool.kind === "guide") addGuide(tool.orientation, guidePosition);
  else if (tool.kind === "text") addComponent(textComponentConfig(geometry), true);
  else addComponent(shapeComponentConfig(tool.shape, geometry), true);
}
function addComponent(config, shouldRender = true) {
  if (shouldRender) saveHistory();
  ensureActiveArtboard();
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
    effect: config.effect ?? effectSelect.value ?? "none",
    zoom: config.zoom ?? Number(zoomRange.value),
    shake: config.shake ?? Number(shakeRange.value),
    speed: config.speed ?? Number(speedRange.value),
    soundEnabled: config.soundEnabled ?? soundToggle.checked,
    soundSource: config.soundSource || (soundSelect.value === "mixed" ? "tone" : soundSelect.value) || "tone",
    soundSrc: config.soundSrc || "",
    soundName: config.soundName || "",
    soundVolume: clampNumber(config.soundVolume ?? soundVolumeRange.value, 0, 100, 80),
    actions: cloneActions(config.actions),
    regions: hydrateRegions(config.regions),
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
  component.w = clampNumber(component.w, minSize, componentCoordinateLimit, minSize);
  component.h = clampNumber(component.h, minHeight, componentCoordinateLimit, minHeight);
  component.x = clampNumber(component.x, -componentCoordinateLimit, componentCoordinateLimit, 0);
  component.y = clampNumber(component.y, -componentCoordinateLimit, componentCoordinateLimit, 0);
  component.rotation = Math.max(-180, Math.min(180, Number(component.rotation)));
}

function render() {
  preserveScrollPosition(() => {
    if (componentLayer) {
      renderComponents();
      renderGuides();
    }
    commitActiveArtboardState();
    renderComponentList();
    syncControlsFromSelection();
  });
}

function renderComponents() {
  if (!componentLayer) return;
  const ownerArtboardId = activeArtboardId;
  componentLayer.innerHTML = "";

  components.forEach((component, index) => {
    clampComponent(component);
    const node = document.createElement("div");
    const hasSelectedRegion = Boolean(selectedRegionId && component.regions?.some((region) => region.id === selectedRegionId));
    node.className = `art-component${component.type === "shape" ? ` is-${component.shape}` : ""}${isSelected(component.id) ? " is-selected" : ""}${hasSelectedRegion ? " has-selected-region" : ""}`;
    node.dataset.id = component.id;
    node.dataset.artboardId = String(ownerArtboardId);
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
    note.innerHTML = `<strong>${escapeHtml(component.name)}</strong><span>${triggerLabels[component.trigger]} + ${effectLabels[component.effect] || "None"}</span>`;

    node.appendChild(viewport);
    node.appendChild(createRegionLayer(component));
    const selectionBox = createSelectionBox(component);
    node.appendChild(selectionBox);
    if (component.type === "shape" && component.shape === "curve") {
      node.appendChild(createCurveControls(component));
    }
    node.appendChild(note);
    bindComponentEvents(node, component, ownerArtboardId);
    componentLayer.appendChild(node);
  });
}

function selectedGuide() {
  return guides.find((guide) => guide.id === selectedGuideId) || null;
}

function selectedGuides() {
  const ids = new Set(selectedGuideIds);
  return guides.filter((guide) => ids.has(guide.id));
}

function isGuideSelected(id) {
  return selectedGuideIds.includes(id);
}

function guideLimit(orientation, record = activeArtboardRecord()) {
  const settings = record?.artboard || artboard;
  return orientation === "vertical" ? settings.width : settings.height;
}

function normalizedGuidePosition(position, orientation, record = activeArtboardRecord()) {
  const limit = Math.max(1, guideLimit(orientation, record));
  return record?.isCanvas
    ? clampNumber(position, -workspaceCoordinateLimit, workspaceCoordinateLimit, limit / 2)
    : clampNumber(position, 0, limit, limit / 2);
}

function syncGuideNode(node, guide, record = activeArtboardRecord()) {
  if (!record) return;
  const limit = Math.max(1, guideLimit(guide.orientation, record));
  const frameLeft = workspaceOriginX + record.position.x * boardZoom;
  const surfaceTop = workspaceOriginY + record.position.y * boardZoom + (record.isCanvas ? 0 : 24);
  guide.position = normalizedGuidePosition(guide.position, guide.orientation, record);
  node.className = `artboard-guide is-${guide.orientation}${isGuideSelected(guide.id) ? " is-selected" : ""}`;
  node.dataset.guideId = String(guide.id);
  node.dataset.positionLabel = `${Math.round(guide.position)}px`;
  if (guide.orientation === "vertical") {
    node.style.left = `${frameLeft + guide.position * boardZoom}px`;
    node.style.setProperty("--guide-label-offset", `${surfaceTop + 4}px`);
  } else {
    node.style.top = `${surfaceTop + guide.position * boardZoom}px`;
    node.style.setProperty("--guide-label-offset", `${frameLeft + 4}px`);
  }
}

function syncArtboardGuidePositions(record) {
  if (!record?.artboardGuideLayer) return;
  const boardGuides = record.id === activeArtboardId ? guides : (record.guides || []);
  record.artboardGuideLayer.querySelectorAll(".artboard-guide").forEach((node) => {
    const guide = boardGuides.find((item) => item.id === Number(node.dataset.guideId));
    if (guide) syncGuideNode(node, guide, record);
  });
}

function syncGuideSelectionVisuals() {
  artboardGuideLayer?.querySelectorAll(".artboard-guide").forEach((node) => {
    node.classList.toggle("is-selected", isGuideSelected(Number(node.dataset.guideId)));
  });
}

function renderGuides() {
  if (!artboardGuideLayer) return;
  const ownerArtboardId = activeArtboardId;
  artboardGuideLayer.replaceChildren();
  guides.forEach((guide) => {
    const node = document.createElement("button");
    node.type = "button";
    node.setAttribute("aria-label", `${guide.orientation} guide at ${Math.round(guide.position)} pixels`);
    syncGuideNode(node, guide, activeArtboardRecord());
    node.addEventListener("pointerdown", (event) => {
      if (ownerArtboardId !== activeArtboardId) activateArtboard(ownerArtboardId);
      startGuideDrag(event, guide.id);
    });
    node.addEventListener("click", (event) => event.stopPropagation());
    artboardGuideLayer.appendChild(node);
  });
}

function addGuide(orientation, position = null) {
  saveHistory();
  ensureActiveArtboard();
  const normalizedOrientation = orientation === "vertical" ? "vertical" : "horizontal";
  const guide = {
    id: nextGuideId++,
    orientation: normalizedOrientation,
    position: normalizedGuidePosition(position, normalizedOrientation, activeArtboardRecord())
  };
  setSelection([]);
  selectedRegionId = null;
  guides.push(guide);
  setGuideSelection([guide.id], guide.id);
  renderGuides();
  syncSelectionVisuals();
  commitActiveArtboardState();
}

function startGuideDrag(event, guideId) {
  if (event.button !== 0 || isSpacePanning) return;
  const guide = guides.find((item) => item.id === guideId);
  if (!guide || !artSurface) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  saveHistory();
  setSelection([]);
  selectedRegionId = null;
  setGuideSelection([guideId], guideId);
  syncSelectionVisuals();
  clearSmartGuides();
  guideDragState = { guideId, orientation: guide.orientation };
  window.addEventListener("pointermove", handleGuideDragMove);
  window.addEventListener("pointerup", handleGuideDragUp, { once: true });
}

function handleGuideDragMove(event) {
  if (!guideDragState || !artSurface) return;
  const guide = guides.find((item) => item.id === guideDragState.guideId);
  if (!guide) return;
  const rect = artSurface.getBoundingClientRect();
  const limit = guideLimit(guide.orientation);
  const ratio = guide.orientation === "vertical"
    ? (event.clientX - rect.left) / Math.max(1, rect.width)
    : (event.clientY - rect.top) / Math.max(1, rect.height);
  guide.position = normalizedGuidePosition(ratio * limit, guide.orientation, activeArtboardRecord());
  const node = artboardGuideLayer?.querySelector(`[data-guide-id="${guide.id}"]`);
  if (node) syncGuideNode(node, guide, activeArtboardRecord());
  if (event.altKey) showMeasurementGuides(guideDistanceMeasures(guide));
  else clearMeasurementGuides();
  selectedSummary.textContent = `${guide.orientation === "vertical" ? "Vertical" : "Horizontal"} guide / ${Math.round(guide.position)}px`;
}

function handleGuideDragUp() {
  window.removeEventListener("pointermove", handleGuideDragMove);
  guideDragState = null;
  clearSmartGuides();
  commitActiveArtboardState();
  syncControlsFromSelection();
}

function removeSelectedGuide() {
  const ids = new Set(selectedGuideIds);
  if (!ids.size) return false;
  saveHistory();
  guides = guides.filter((guide) => !ids.has(guide.id));
  setGuideSelection([]);
  renderGuides();
  syncControlsFromSelection();
  commitActiveArtboardState();
  return true;
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

function selectedRegion(component = selectedComponent()) {
  if (!component || !selectedRegionId) return null;
  return component.regions?.find((region) => region.id === selectedRegionId) || null;
}

function componentRegionSource(component, region) {
  const source = document.createElement("div");
  source.className = "region-source";
  const safeW = Math.max(1, Number(region.w) || defaultRegion.w);
  const safeH = Math.max(1, Number(region.h) || defaultRegion.h);
  source.style.left = `${-(Number(region.x) || 0) / safeW * 100}%`;
  source.style.top = `${-(Number(region.y) || 0) / safeH * 100}%`;
  source.style.width = `${100 / safeW * 100}%`;
  source.style.height = `${100 / safeH * 100}%`;
  source.appendChild(componentVisual(component, "component-image region-source-visual"));
  return source;
}

function componentRemainderSource(component, area) {
  const source = document.createElement("div");
  source.className = "region-source region-remainder-source";
  const safeW = Math.max(0.1, Number(area.w) || 1);
  const safeH = Math.max(0.1, Number(area.h) || 1);
  source.style.left = `${-(Number(area.x) || 0) / safeW * 100}%`;
  source.style.top = `${-(Number(area.y) || 0) / safeH * 100}%`;
  source.style.width = `${100 / safeW * 100}%`;
  source.style.height = `${100 / safeH * 100}%`;
  source.appendChild(componentVisual(component, "component-image region-source-visual"));
  return source;
}

function imageFromSource(src) {
  if (!src) return Promise.resolve(null);
  if (drawableImageCache.has(src)) return drawableImageCache.get(src);
  const promise = new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
  drawableImageCache.set(src, promise);
  return promise;
}

function svgImageFromMarkup(markup) {
  const svg = markup.includes("xmlns=")
    ? markup
    : markup.replace("<svg ", `<svg xmlns="http://www.w3.org/2000/svg" `);
  return imageFromSource(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
}

async function drawComponentToContext(ctx, component, x, y, width, height) {
  if (component.type === "image") {
    const image = await imageFromSource(component.src);
    if (image) ctx.drawImage(image, x, y, width, height);
    return;
  }

  if (component.type === "shape") {
    const image = await svgImageFromMarkup(shapeSvg(component));
    if (image) ctx.drawImage(image, x, y, width, height);
    return;
  }

  if (component.type === "text") {
    const fontSize = Number(component.fontSize) || 48;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${fontSize}px ${component.font || "Arial"}`;
    ctx.lineJoin = "round";
    if (!component.strokeTransparent && Number(component.strokeWidth) > 0) {
      ctx.strokeStyle = component.stroke || "#191714";
      ctx.lineWidth = Number(component.strokeWidth) || 0;
      ctx.strokeText(component.text || "Text", x + width / 2, y + height / 2, width * 0.96);
    }
    if (!component.fillTransparent) {
      ctx.fillStyle = component.fill || "#191714";
      ctx.fillText(component.text || "Text", x + width / 2, y + height / 2, width * 0.96);
    }
    ctx.restore();
  }
}

async function componentSourceCanvas(component, width, height, dpr) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  const ctx = canvas.getContext("2d");
  configureCanvasQuality(ctx);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  await drawComponentToContext(ctx, component, 0, 0, width, height);
  return canvas;
}

function appendRemainderStrip(remainder, component, area) {
  if (area.w <= 0.1 || area.h <= 0.1) return;
  const strip = document.createElement("div");
  strip.className = "region-remainder-strip";
  strip.style.left = `${area.x}%`;
  strip.style.top = `${area.y}%`;
  strip.style.width = `${area.w}%`;
  strip.style.height = `${area.h}%`;
  strip.appendChild(componentRemainderSource(component, area));
  remainder.appendChild(strip);
}

function createRegionRemainder(component, region) {
  const remainder = document.createElement("div");
  remainder.className = "region-remainder";
  remainder.dataset.componentId = String(component.id);
  remainder.dataset.regionId = String(region.id);
  clampRegion(region);

  const left = region.x;
  const top = region.y;
  const right = region.x + region.w;
  const bottom = region.y + region.h;
  appendRemainderStrip(remainder, component, { x: 0, y: 0, w: 100, h: top });
  appendRemainderStrip(remainder, component, { x: 0, y: bottom, w: 100, h: 100 - bottom });
  appendRemainderStrip(remainder, component, { x: 0, y: top, w: left, h: region.h });
  appendRemainderStrip(remainder, component, { x: right, y: top, w: 100 - right, h: region.h });
  return remainder;
}

function activeCanvasKey(componentId, regionId) {
  return `${componentId}:${regionId}`;
}

function configureCanvasQuality(ctx) {
  if (!ctx) return;
  ctx.imageSmoothingEnabled = true;
  try { ctx.imageSmoothingQuality = "high"; } catch {}
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawRegionMaskShape(ctx, region, x, y, width, height) {
  if (hasBrushPath(region)) {
    ctx.beginPath();
    region.points.forEach((point, index) => {
      const px = x + point[0] / 100 * width;
      const py = y + point[1] / 100 * height;
      if (index) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (region.shape === "ellipse" || region.shape === "brush") {
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  roundedRectPath(ctx, x, y, width, height, 5);
  ctx.fill();
}

function createRegionMask(region, canvasWidth, canvasHeight, dpr, rect, options = {}) {
  const mask = document.createElement("canvas");
  mask.width = Math.max(1, Math.round(canvasWidth * dpr));
  mask.height = Math.max(1, Math.round(canvasHeight * dpr));
  const ctx = mask.getContext("2d");
  configureCanvasQuality(ctx);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const featherScale = options.featherScale ?? 0.18;
  const expand = Math.max(0, options.expand ?? 0);
  const insetFactor = options.insetFactor ?? 0.35;
  const shapeRect = {
    x: rect.x - expand,
    y: rect.y - expand,
    width: rect.width + expand * 2,
    height: rect.height + expand * 2
  };
  const feather = Math.max(0, Math.min(shapeRect.width, shapeRect.height) * clampNumber(region.softness, 0, 100, defaultRegion.softness) / 100 * featherScale);
  const inset = Math.max(0, feather * insetFactor);

  ctx.save();
  if (feather > 0.5) ctx.filter = `blur(${feather}px)`;
  ctx.fillStyle = "#fff";
  drawRegionMaskShape(
    ctx,
    region,
    shapeRect.x + inset,
    shapeRect.y + inset,
    Math.max(1, shapeRect.width - inset * 2),
    Math.max(1, shapeRect.height - inset * 2)
  );
  ctx.restore();
  if (options.constrainToShape) {
    ctx.save();
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = "#fff";
    drawRegionMaskShape(ctx, region, rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
  }
  return mask;
}

function regionTransformStrength(region, component) {
  const strength = clampNumber(region.strength, 0, 100, defaultRegion.strength);
  const hasVisibleStroke = component?.type === "shape" && !component.strokeTransparent && Number(component.strokeWidth) > 0;
  if (!hasVisibleStroke) return strength;
  const strokeWidth = clampNumber(component.strokeWidth, 0, maxStrokeWidth, 1);
  const compensation = Math.max(0.88, 1 - Math.min(0.12, 0.04 + strokeWidth * 0.004));
  return strength * compensation;
}

function applyRegionCanvasTransform(ctx, region, progress, centerX, centerY, component = null) {
  const strength = regionTransformStrength(region, component);
  const angle = clampNumber(region.angle, -180, 180, defaultRegion.angle);
  const radians = angle * Math.PI / 180;
  const amount = Math.sin(Math.PI * progress);
  const push = strength * 0.95 * amount;

  ctx.translate(centerX, centerY);
  switch (region.effect) {
    case "pinch":
      ctx.scale(Math.max(0.35, 1 - strength / 220 * amount), Math.max(0.35, 1 - strength / 220 * amount));
      break;
    case "stretch":
      ctx.rotate(radians);
      ctx.scale(1 + strength / 105 * amount, Math.max(0.48, 1 - strength / 330 * amount));
      ctx.rotate(-radians);
      break;
    case "smear":
      ctx.translate(Math.cos(radians) * push, Math.sin(radians) * push);
      ctx.transform(1, 0, Math.tan(Math.max(-0.35, Math.min(0.35, strength / 240 * amount))), 1, 0, 0);
      break;
    case "ripple":
      ctx.scale(1 + Math.sin(progress * Math.PI * 3) * strength / 500, 1 - Math.sin(progress * Math.PI * 2.4) * strength / 620);
      ctx.rotate(Math.sin(progress * Math.PI * 2) * strength / 900);
      break;
    case "spotlight":
      ctx.scale(1 + strength / 950 * amount, 1 + strength / 950 * amount);
      break;
    case "bulge":
    default:
      ctx.scale(1 + strength / 150 * amount, 1 + strength / 150 * amount);
      break;
  }
  ctx.translate(-centerX, -centerY);
}

function createRegionSvgElement(name, attributes = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
}

function createRegionSvgShape(region, rect, fill) {
  if (hasBrushPath(region)) {
    const points = region.points.map((point) => {
      const x = rect.x + point[0] / 100 * rect.width;
      const y = rect.y + point[1] / 100 * rect.height;
      return `${roundPathValue(x)},${roundPathValue(y)}`;
    }).join(" ");
    return createRegionSvgElement("polygon", { points, fill });
  }

  if (region.shape === "ellipse" || region.shape === "brush") {
    return createRegionSvgElement("ellipse", {
      cx: rect.x + rect.width / 2,
      cy: rect.y + rect.height / 2,
      rx: rect.width / 2,
      ry: rect.height / 2,
      fill
    });
  }

  return createRegionSvgElement("rect", {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    rx: Math.min(5, rect.width / 2, rect.height / 2),
    fill
  });
}

function createRegionSvgBlurFilter(id, amount, width, height) {
  const filter = createRegionSvgElement("filter", {
    id,
    x: 0,
    y: 0,
    width,
    height,
    filterUnits: "userSpaceOnUse",
    "color-interpolation-filters": "sRGB"
  });
  filter.appendChild(createRegionSvgElement("feGaussianBlur", { stdDeviation: amount }));
  return filter;
}

function createEmbeddedShapeSvg(component, x, y, width, height) {
  const markup = shapeSvg(component);
  const namespacedMarkup = markup.includes("xmlns=")
    ? markup
    : markup.replace("<svg ", `<svg xmlns="http://www.w3.org/2000/svg" `);
  const parsed = new DOMParser().parseFromString(namespacedMarkup, "image/svg+xml");
  if (parsed.querySelector("parsererror")) return null;
  const source = parsed.documentElement;
  const svg = createRegionSvgElement("svg", {
    x,
    y,
    width,
    height,
    viewBox: source.getAttribute("viewBox") || `0 0 ${width} ${height}`,
    preserveAspectRatio: source.getAttribute("preserveAspectRatio") || "none",
    overflow: "visible",
    "aria-hidden": "true"
  });
  Array.from(source.childNodes).forEach((child) => svg.appendChild(document.importNode(child, true)));
  return svg;
}

function applyRegionSvgTransform(node, region, progress, centerX, centerY) {
  const strength = clampNumber(region.strength, 0, 100, defaultRegion.strength);
  const angle = clampNumber(region.angle, -180, 180, defaultRegion.angle);
  const amount = Math.sin(Math.PI * progress);
  const push = strength * 0.95 * amount;
  let transform = "";

  switch (region.effect) {
    case "pinch": {
      const scale = Math.max(0.35, 1 - strength / 220 * amount);
      transform = `translate(${centerX} ${centerY}) scale(${scale} ${scale}) translate(${-centerX} ${-centerY})`;
      break;
    }
    case "stretch": {
      const scaleX = 1 + strength / 105 * amount;
      const scaleY = Math.max(0.48, 1 - strength / 330 * amount);
      transform = `translate(${centerX} ${centerY}) rotate(${angle}) scale(${scaleX} ${scaleY}) rotate(${-angle}) translate(${-centerX} ${-centerY})`;
      break;
    }
    case "smear": {
      const pushX = Math.cos(angle * Math.PI / 180) * push;
      const pushY = Math.sin(angle * Math.PI / 180) * push;
      const skew = Math.atan(Math.max(-0.35, Math.min(0.35, strength / 240 * amount))) * 180 / Math.PI;
      transform = `translate(${centerX + pushX} ${centerY + pushY}) skewX(${skew}) translate(${-centerX} ${-centerY})`;
      break;
    }
    case "ripple": {
      const scaleX = 1 + Math.sin(progress * Math.PI * 3) * strength / 500;
      const scaleY = 1 - Math.sin(progress * Math.PI * 2.4) * strength / 620;
      const rotation = Math.sin(progress * Math.PI * 2) * strength / 900 * 180 / Math.PI;
      transform = `translate(${centerX} ${centerY}) scale(${scaleX} ${scaleY}) rotate(${rotation}) translate(${-centerX} ${-centerY})`;
      break;
    }
    case "spotlight": {
      const scale = 1 + strength / 950 * amount;
      transform = `translate(${centerX} ${centerY}) scale(${scale} ${scale}) translate(${-centerX} ${-centerY})`;
      break;
    }
    case "bulge":
    default: {
      const scale = 1 + strength / 150 * amount;
      transform = `translate(${centerX} ${centerY}) scale(${scale} ${scale}) translate(${-centerX} ${-centerY})`;
      break;
    }
  }

  node.setAttribute("transform", transform);
  node.style.filter = region.effect === "spotlight"
    ? `brightness(${1 + strength / 250 * amount}) saturate(1.18)`
    : "none";
}

function componentLocalSize(componentNode) {
  const style = getComputedStyle(componentNode);
  return {
    width: Math.max(1, parseFloat(style.width) || componentNode.offsetWidth),
    height: Math.max(1, parseFloat(style.height) || componentNode.offsetHeight)
  };
}

function startRegionVectorEffect(component, region, componentNode) {
  const { width, height } = componentLocalSize(componentNode);
  const key = activeCanvasKey(component.id, region.id);
  stopRegionCanvasRun(key);

  const regionRect = {
    x: width * region.x / 100,
    y: height * region.y / 100,
    width: Math.max(1, width * region.w / 100),
    height: Math.max(1, height * region.h / 100)
  };
  const pad = Math.max(72, Math.max(regionRect.width, regionRect.height) * 0.7, clampNumber(region.strength, 0, 100, defaultRegion.strength) * 1.4);
  const canvasWidth = width + pad * 2;
  const canvasHeight = height + pad * 2;
  const drawRect = {
    x: pad + regionRect.x,
    y: pad + regionRect.y,
    width: regionRect.width,
    height: regionRect.height
  };
  const uniqueId = nextRegionVectorId++;
  const maskId = `region-base-mask-${uniqueId}`;
  const clipId = `region-patch-clip-${uniqueId}`;
  const patchMaskId = `region-patch-mask-${uniqueId}`;
  const baseStrokeMaskId = `region-base-stroke-mask-${uniqueId}`;
  const patchStrokeMaskId = `region-patch-stroke-mask-${uniqueId}`;
  const baseBlurId = `region-base-blur-${uniqueId}`;
  const patchBlurId = `region-patch-blur-${uniqueId}`;
  const usesFreeformBrush = hasBrushPath(region);
  const layer = document.createElement("div");
  layer.className = "region-canvas-effect region-vector-effect";
  layer.setAttribute("aria-hidden", "true");
  layer.style.left = `${-pad}px`;
  layer.style.top = `${-pad}px`;
  layer.style.width = `${canvasWidth}px`;
  layer.style.height = `${canvasHeight}px`;
  layer.style.opacity = String(clampNumber(component.opacity ?? 100, 0, 100, 100) / 100);

  const vectorStage = createRegionSvgElement("svg", {
    class: "region-vector-stage",
    viewBox: `0 0 ${canvasWidth} ${canvasHeight}`,
    preserveAspectRatio: "none",
    "aria-hidden": "true"
  });

  const defs = createRegionSvgElement("defs");
  const createVectorMask = (id, background = null) => {
    const svgMask = createRegionSvgElement("mask", {
      id,
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      maskUnits: "userSpaceOnUse",
      maskContentUnits: "userSpaceOnUse"
    });
    svgMask.style.maskType = "luminance";
    if (background) {
      svgMask.appendChild(createRegionSvgElement("rect", { x: 0, y: 0, width: canvasWidth, height: canvasHeight, fill: background }));
    }
    defs.appendChild(svgMask);
    return svgMask;
  };

  const base = createRegionSvgElement("g");
  const patch = createRegionSvgElement("g");

  if (usesFreeformBrush) {
    const softness = clampNumber(region.softness, 0, 100, defaultRegion.softness) / 100;
    const brushSize = Math.min(drawRect.width, drawRect.height);
    const eraseExpand = Math.max(2, brushSize * 0.025);
    const hasFill = !component.fillTransparent && !["line", "curve"].includes(component.shape);
    const hasStroke = !component.strokeTransparent && Number(component.strokeWidth) > 0;

    if (hasFill) {
      const eraseFeather = Math.min(8, brushSize * softness * 0.025);
      const patchFeather = Math.min(16, brushSize * softness * 0.08);
      const patchInset = patchFeather * 0.12;
      const patchRect = {
        x: drawRect.x + patchInset,
        y: drawRect.y + patchInset,
        width: Math.max(1, drawRect.width - patchInset * 2),
        height: Math.max(1, drawRect.height - patchInset * 2)
      };
      const baseFillMask = createVectorMask(maskId, "white");
      const baseFillCut = createRegionSvgShape(region, drawRect, "black");
      baseFillCut.setAttribute("stroke", "black");
      baseFillCut.setAttribute("stroke-width", String(eraseExpand * 2));
      baseFillCut.setAttribute("stroke-linejoin", "round");
      if (eraseFeather > 0.3) {
        defs.appendChild(createRegionSvgBlurFilter(baseBlurId, eraseFeather, canvasWidth, canvasHeight));
        baseFillCut.setAttribute("filter", `url(#${baseBlurId})`);
      }
      baseFillMask.appendChild(baseFillCut);

      const patchFillMask = createVectorMask(patchMaskId);
      const patchFillShape = createRegionSvgShape(region, patchRect, "white");
      if (patchFeather > 0.3) {
        defs.appendChild(createRegionSvgBlurFilter(patchBlurId, patchFeather, canvasWidth, canvasHeight));
        patchFillShape.setAttribute("filter", `url(#${patchBlurId})`);
      }
      patchFillMask.appendChild(patchFillShape);

      const baseFillSource = createEmbeddedShapeSvg({ ...component, strokeTransparent: true }, pad, pad, width, height);
      const patchFillSource = createEmbeddedShapeSvg({ ...component, strokeTransparent: true }, pad, pad, width, height);
      if (!baseFillSource || !patchFillSource) return false;
      const baseFill = createRegionSvgElement("g", { mask: `url(#${maskId})` });
      const patchFill = createRegionSvgElement("g", { mask: `url(#${patchMaskId})` });
      baseFill.appendChild(baseFillSource);
      patchFill.appendChild(patchFillSource);
      base.appendChild(baseFill);
      patch.appendChild(patchFill);
    }

    if (hasStroke) {
      const baseStrokeMask = createVectorMask(baseStrokeMaskId, "white");
      const baseStrokeCut = createRegionSvgShape(region, drawRect, "black");
      baseStrokeCut.setAttribute("stroke", "black");
      baseStrokeCut.setAttribute("stroke-width", String(eraseExpand * 2));
      baseStrokeCut.setAttribute("stroke-linejoin", "round");
      baseStrokeMask.appendChild(baseStrokeCut);

      const patchStrokeMask = createVectorMask(patchStrokeMaskId);
      const patchStrokeShape = createRegionSvgShape(region, drawRect, "white");
      patchStrokeShape.setAttribute("stroke", "white");
      patchStrokeShape.setAttribute("stroke-width", "2");
      patchStrokeShape.setAttribute("stroke-linejoin", "round");
      patchStrokeMask.appendChild(patchStrokeShape);

      const baseStrokeSource = createEmbeddedShapeSvg({ ...component, fillTransparent: true }, pad, pad, width, height);
      const patchStrokeSource = createEmbeddedShapeSvg({ ...component, fillTransparent: true }, pad, pad, width, height);
      if (!baseStrokeSource || !patchStrokeSource) return false;
      const baseStroke = createRegionSvgElement("g", { mask: `url(#${baseStrokeMaskId})` });
      const patchStroke = createRegionSvgElement("g", { mask: `url(#${patchStrokeMaskId})` });
      baseStroke.appendChild(baseStrokeSource);
      patchStroke.appendChild(patchStrokeSource);
      base.appendChild(baseStroke);
      patch.appendChild(patchStroke);
    }
  } else {
    const mask = createVectorMask(maskId, "white");
    mask.appendChild(createRegionSvgShape(region, drawRect, "black"));
    const clip = createRegionSvgElement("clipPath", { id: clipId, clipPathUnits: "userSpaceOnUse" });
    clip.appendChild(createRegionSvgShape(region, drawRect, "white"));
    defs.appendChild(clip);
    const baseSource = createEmbeddedShapeSvg(component, pad, pad, width, height);
    const patchSource = createEmbeddedShapeSvg(component, pad, pad, width, height);
    if (!baseSource || !patchSource) return false;
    const baseClipped = createRegionSvgElement("g", { mask: `url(#${maskId})` });
    const patchClipped = createRegionSvgElement("g", { "clip-path": `url(#${clipId})` });
    baseClipped.appendChild(baseSource);
    patchClipped.appendChild(patchSource);
    base.appendChild(baseClipped);
    patch.appendChild(patchClipped);
  }
  vectorStage.append(defs, base, patch);

  const fullSource = componentVisual(component, "region-vector-full-source");
  fullSource.classList.add("region-canvas-effect");
  fullSource.style.inset = "0";
  fullSource.style.width = "100%";
  fullSource.style.height = "100%";
  fullSource.style.opacity = String(clampNumber(component.opacity ?? 100, 0, 100, 100) / 100);
  fullSource.style.display = "none";
  layer.appendChild(vectorStage);
  componentNode.append(layer, fullSource);
  syncCanvasWithRunningComponentEffect(layer, component);
  syncCanvasWithRunningComponentEffect(fullSource, component);

  const centerX = drawRect.x + drawRect.width / 2;
  const centerY = drawRect.y + drawRect.height / 2;
  const duration = regionDuration(region);
  const run = { canvas: layer, finalSource: fullSource, frame: 0, cancelled: false, kind: "vector" };
  activeRegionCanvasRuns.set(key, run);

  const showFullSource = () => {
    vectorStage.style.display = "none";
    fullSource.style.display = "grid";
  };
  const showSplitSource = () => {
    vectorStage.style.display = "block";
    fullSource.style.display = "none";
  };

  showFullSource();
  const renderFrame = (now) => {
    if (run.cancelled) return;
    if (!run.start) run.start = now;
    const progress = Math.min(1, (now - run.start) / duration);
    if (progress <= 0.001 || progress >= 0.999) {
      showFullSource();
    } else {
      showSplitSource();
      applyRegionSvgTransform(patch, region, progress, centerX, centerY);
    }
    if (progress < 1) run.frame = requestAnimationFrame(renderFrame);
  };
  run.frame = requestAnimationFrame(renderFrame);
  return true;
}

function removeRegionCanvasRun(key, run) {
  if (run.fadeTimer) window.clearTimeout(run.fadeTimer);
  run.canvas?.remove();
  run.finalSource?.remove();
  if (activeRegionCanvasRuns.get(key) === run) {
    activeRegionCanvasRuns.delete(key);
    run.componentNode?.classList.remove("is-region-settling", "is-region-crossfading");
  }
}

function stopRegionCanvasRun(key, options = {}) {
  const run = activeRegionCanvasRuns.get(key);
  if (!run) return;
  run.cancelled = true;
  if (run.frame) cancelAnimationFrame(run.frame);
  if (options.fade && run.canvas?.isConnected && !run.isFading) {
    run.isFading = true;
    run.canvas.classList.add("is-fading-out");
    const cleanup = () => removeRegionCanvasRun(key, run);
    run.canvas.addEventListener("transitionend", cleanup, { once: true });
    run.fadeTimer = window.setTimeout(cleanup, 300);
    return;
  }
  removeRegionCanvasRun(key, run);
}

function finishRegionCanvasRun(key, componentNode) {
  const run = activeRegionCanvasRuns.get(key);
  if (!run) {
    componentNode?.classList.remove("has-active-region");
    return;
  }

  if (run.kind === "vector") {
    componentNode?.classList.remove("has-active-region");
    stopRegionCanvasRun(key);
    return;
  }

  run.componentNode = componentNode;
  run.isSettling = true;
  componentNode?.classList.add("is-region-settling");
  componentNode?.classList.remove("has-active-region");
  const viewport = componentNode?.querySelector(".component-viewport");
  if (viewport) void viewport.offsetWidth;
  requestAnimationFrame(() => {
    if (activeRegionCanvasRuns.get(key) !== run || run.cancelled) return;
    componentNode?.classList.add("is-region-crossfading");
    stopRegionCanvasRun(key, { fade: true });
  });
}

async function startRegionCanvasEffect(component, region, componentNode) {
  if (component.type === "shape" && startRegionVectorEffect(component, region, componentNode)) return;
  const rect = componentLocalSize(componentNode);
  const key = activeCanvasKey(component.id, region.id);
  stopRegionCanvasRun(key);

  const dpr = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
  const regionRect = {
    x: rect.width * region.x / 100,
    y: rect.height * region.y / 100,
    width: Math.max(1, rect.width * region.w / 100),
    height: Math.max(1, rect.height * region.h / 100)
  };
  const pad = Math.max(72, Math.max(regionRect.width, regionRect.height) * 0.7, clampNumber(region.strength, 0, 100, defaultRegion.strength) * 1.4);
  const canvasWidth = rect.width + pad * 2;
  const canvasHeight = rect.height + pad * 2;
  const canvas = document.createElement("canvas");
  canvas.className = "region-canvas-effect";
  canvas.style.left = `${-pad}px`;
  canvas.style.top = `${-pad}px`;
  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;
  canvas.width = Math.max(1, Math.round(canvasWidth * dpr));
  canvas.height = Math.max(1, Math.round(canvasHeight * dpr));
  componentNode.appendChild(canvas);
  syncCanvasWithRunningComponentEffect(canvas, component);

  const ctx = canvas.getContext("2d");
  configureCanvasQuality(ctx);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const source = await componentSourceCanvas(component, rect.width, rect.height, dpr);
  const drawRect = {
    x: pad + regionRect.x,
    y: pad + regionRect.y,
    width: regionRect.width,
    height: regionRect.height
  };
  const usesFreeformBrush = hasBrushPath(region);
  const eraseExpand = usesFreeformBrush ? Math.max(2, Math.min(drawRect.width, drawRect.height) * 0.025) : 0;
  const eraseMask = createRegionMask(region, canvasWidth, canvasHeight, dpr, drawRect, {
    expand: eraseExpand,
    featherScale: usesFreeformBrush ? 0.025 : 0,
    insetFactor: 0,
    constrainToShape: !usesFreeformBrush
  });
  const patchMask = createRegionMask(region, canvasWidth, canvasHeight, dpr, drawRect, {
    featherScale: usesFreeformBrush ? 0.08 : 0,
    insetFactor: usesFreeformBrush ? 0.12 : 0,
    constrainToShape: !usesFreeformBrush
  });
  const patch = document.createElement("canvas");
  patch.width = canvas.width;
  patch.height = canvas.height;
  const patchCtx = patch.getContext("2d");
  configureCanvasQuality(patchCtx);
  patchCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  patchCtx.drawImage(source, pad, pad, rect.width, rect.height);
  patchCtx.globalCompositeOperation = "destination-in";
  patchCtx.drawImage(patchMask, 0, 0, canvasWidth, canvasHeight);
  patchCtx.globalCompositeOperation = "source-over";

  const centerX = drawRect.x + drawRect.width / 2;
  const centerY = drawRect.y + drawRect.height / 2;
  const duration = regionDuration(region);
  const run = {
    canvas,
    frame: 0,
    cancelled: false,
    kind: "canvas",
    componentNode
  };
  activeRegionCanvasRuns.set(key, run);

  const renderFrame = (now) => {
    if (run.cancelled) return;
    if (!run.start) run.start = now;
    const progress = Math.min(1, (now - run.start) / duration);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = clampNumber(component.opacity ?? 100, 0, 100, 100) / 100;
    ctx.drawImage(source, pad, pad, rect.width, rect.height);

    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = 1;
    ctx.drawImage(eraseMask, 0, 0, canvasWidth, canvasHeight);

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = clampNumber(component.opacity ?? 100, 0, 100, 100) / 100;
    ctx.save();
    applyRegionCanvasTransform(ctx, region, progress, centerX, centerY, component);
    if (region.effect === "spotlight") {
      ctx.filter = `brightness(${1 + clampNumber(region.strength, 0, 100, defaultRegion.strength) / 250 * Math.sin(Math.PI * progress)}) saturate(1.18)`;
    }
    ctx.drawImage(patch, 0, 0, canvasWidth, canvasHeight);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.filter = "none";

    if (progress < 1) {
      run.frame = requestAnimationFrame(renderFrame);
    }
  };

  run.frame = requestAnimationFrame(renderFrame);
}

function hasBrushPath(region) {
  return region?.shape === "brush" && Array.isArray(region.points) && region.points.length >= 3;
}

function brushPathD(points) {
  if (!points?.length) return "";
  return `${points.map((point, index) => `${index ? "L" : "M"}${roundPathValue(point[0])} ${roundPathValue(point[1])}`).join(" ")} Z`;
}

function brushClipPolygon(region) {
  const points = normalizeBrushPoints(region.points);
  if (points.length < 3) return "";
  return `polygon(${points.map((point) => `${roundPathValue(point[0])}% ${roundPathValue(point[1])}%`).join(", ")})`;
}

function applyBrushRegionPath(node, region) {
  const hasPath = hasBrushPath(region);
  const clip = node.querySelector(".region-effect-clip");
  const outline = node.querySelector(".region-outline");
  node.classList.toggle("has-brush-path", hasPath);

  if (!hasPath) {
    if (clip) {
      clip.style.clipPath = "";
      clip.style.webkitClipPath = "";
    }
    if (outline) outline.replaceChildren();
    return;
  }

  const polygon = brushClipPolygon(region);
  if (clip) {
    clip.style.clipPath = polygon;
    clip.style.webkitClipPath = polygon;
  }
  if (outline) {
    outline.innerHTML = `<svg class="region-brush-outline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="${brushPathD(region.points)}"></path></svg>`;
  }
}

function regionDuration(region) {
  return Math.max(180, 980 - clampNumber(region.speed, 10, 100, defaultRegion.speed) * 7.2);
}

function hasActiveEditorGesture() {
  return Boolean(
    dragState
    || resizeState
    || cornerRadiusState
    || curveHandleState
    || regionDragState
    || brushDrawState
    || marqueeState
    || workspaceMarqueeState
    || stagePanState
    || artboardDragState
    || guideDragState
  );
}

function applyRegionVars(node, region) {
  clampRegion(region);
  const strength = clampNumber(region.strength, 0, 100, defaultRegion.strength);
  const softness = clampNumber(region.softness, 0, 100, defaultRegion.softness);
  const angle = clampNumber(region.angle, -180, 180, defaultRegion.angle);
  const radians = angle * Math.PI / 180;
  const push = strength * 0.9;
  const maskStart = Math.max(24, 84 - softness * 0.46);
  const maskMid = Math.max(maskStart + 8, 94 - softness * 0.12);

  node.style.left = `${region.x}%`;
  node.style.top = `${region.y}%`;
  node.style.width = `${region.w}%`;
  node.style.height = `${region.h}%`;
  node.style.borderRadius = region.shape === "ellipse" ? "50%" : region.shape === "brush" ? "58% 42% 64% 36% / 52% 61% 39% 48%" : "5px";
  node.style.setProperty("--region-duration", `${regionDuration(region)}ms`);
  node.style.setProperty("--region-scale", String(1 + strength / 145));
  node.style.setProperty("--region-stretch-x", String(1 + strength / 115));
  node.style.setProperty("--region-stretch-y", String(Math.max(0.58, 1 - strength / 330)));
  node.style.setProperty("--region-angle", `${angle}deg`);
  node.style.setProperty("--region-push-x", `${Math.cos(radians) * push}px`);
  node.style.setProperty("--region-push-y", `${Math.sin(radians) * push}px`);
  node.style.setProperty("--region-skew", `${Math.max(-18, Math.min(18, strength * 0.22))}deg`);
  node.style.setProperty("--region-blur", `${strength / 22}px`);
  node.style.setProperty("--region-ripple-a", `${strength * 0.16}deg`);
  node.style.setProperty("--region-ripple-b", `${strength * -0.1}deg`);
  node.style.setProperty("--region-brightness", String(1 + strength / 210));
  node.style.setProperty("--region-glow", `${8 + strength * 0.34}px`);
  node.style.setProperty("--region-pinch-scale", String(Math.max(0.45, 1 - strength / 235)));
  node.style.setProperty("--region-mask-start", `${maskStart}%`);
  node.style.setProperty("--region-mask-mid", `${maskMid}%`);
}

function syncRegionNode(node, component, region) {
  node.className = `region-effect-zone region-shape-${region.shape} region-effect-${region.effect}${selectedRegionId === region.id && isSelected(component.id) ? " is-selected" : ""}`;
  node.dataset.componentId = String(component.id);
  node.dataset.regionId = String(region.id);
  node.dataset.regionName = region.name;
  applyRegionVars(node, region);
  const source = node.querySelector(".region-source");
  if (source) {
    const safeW = Math.max(1, Number(region.w) || defaultRegion.w);
    const safeH = Math.max(1, Number(region.h) || defaultRegion.h);
    source.style.left = `${-(Number(region.x) || 0) / safeW * 100}%`;
    source.style.top = `${-(Number(region.y) || 0) / safeH * 100}%`;
    source.style.width = `${100 / safeW * 100}%`;
    source.style.height = `${100 / safeH * 100}%`;
  }
  const label = node.querySelector(".region-label");
  if (label) label.textContent = region.name;
  applyBrushRegionPath(node, region);
}

function createRegionNode(component, region, index) {
  const node = document.createElement("div");
  region.name = region.name || `Area ${index + 1}`;
  syncRegionNode(node, component, region);

  const clip = document.createElement("div");
  clip.className = "region-effect-clip";
  clip.appendChild(componentRegionSource(component, region));
  node.appendChild(clip);

  const outline = document.createElement("div");
  outline.className = "region-outline";
  node.appendChild(outline);
  applyBrushRegionPath(node, region);

  const label = document.createElement("span");
  label.className = "region-label";
  label.textContent = region.name;
  node.appendChild(label);

  const resizeHandle = document.createElement("button");
  resizeHandle.type = "button";
  resizeHandle.className = "region-resize-handle";
  resizeHandle.setAttribute("aria-label", `Resize ${region.name}`);
  resizeHandle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    clearActiveRegionEffects(component.id);
    selectRegion(component.id, region.id);
    startRegionDrag(event, component.id, region.id, "resize");
  });
  node.appendChild(resizeHandle);

  node.addEventListener("pointerenter", (event) => {
    setRegionPointerOrigin(node, event);
    if (!hasActiveEditorGesture() && region.trigger === "hover" && window.matchMedia("(hover: hover)").matches) {
      activateRegion(component.id, region.id, event);
    }
  });

  node.addEventListener("pointermove", (event) => {
    setRegionPointerOrigin(node, event);
    if (!hasActiveEditorGesture() && region.trigger === "move") activateRegion(component.id, region.id, event);
  });

  node.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (canStartBrushDraw(component.id)) {
      startBrushRegionDraw(event, component.id);
      return;
    }
    selectRegion(component.id, region.id);
    setRegionPointerOrigin(node, event);
    clearActiveRegionEffects(component.id);
    startRegionDrag(event, component.id, region.id, "move");
  });

  return node;
}

function createRegionLayer(component) {
  const layer = document.createElement("div");
  layer.className = "component-region-layer";
  (component.regions || []).forEach((region, index) => {
    clampRegion(region);
    layer.appendChild(createRegionRemainder(component, region));
    layer.appendChild(createRegionNode(component, region, index));
  });
  return layer;
}

function syncRegionSelectionVisuals() {
  componentLayer.querySelectorAll(".region-effect-zone").forEach((node) => {
    const componentId = Number(node.dataset.componentId);
    const regionId = Number(node.dataset.regionId);
    node.classList.toggle("is-selected", isSelected(componentId) && selectedRegionId === regionId);
  });
}

function selectRegion(componentId, regionId) {
  selectOnly(componentId);
  selectedRegionId = regionId;
  syncSelectionVisuals();
  syncRegionSelectionVisuals();
}

function setRegionPointerOrigin(node, event) {
  const rect = node.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const x = clampNumber((event.clientX - rect.left) / rect.width * 100, 0, 100, 50);
  const y = clampNumber((event.clientY - rect.top) / rect.height * 100, 0, 100, 50);
  node.style.setProperty("--region-origin-x", `${x}%`);
  node.style.setProperty("--region-origin-y", `${y}%`);
}

function regionTimerKey(componentId, regionId) {
  return `${componentId}:${regionId}`;
}

function activateRegion(componentId, regionId, event = null) {
  if (hasActiveEditorGesture()) return;
  const component = components.find((item) => item.id === componentId);
  const region = component?.regions?.find((item) => item.id === regionId);
  const node = componentLayer.querySelector(`.region-effect-zone[data-component-id="${componentId}"][data-region-id="${regionId}"]`);
  const componentNode = componentLayer.querySelector(`[data-id="${componentId}"]`);
  const remainder = componentLayer.querySelector(`.region-remainder[data-component-id="${componentId}"][data-region-id="${regionId}"]`);
  if (!component || !region || !node) return;

  if (event) setRegionPointerOrigin(node, event);
  const key = regionTimerKey(componentId, regionId);
  const previousTimer = activeRegionTimers.get(key);
  if (previousTimer) window.clearTimeout(previousTimer);

  node.classList.remove("is-active");
  void node.offsetWidth;
  node.classList.add("is-active");
  remainder?.classList.add("is-active");
  componentNode?.classList.add("has-active-region");
  if (componentNode) startRegionCanvasEffect(component, region, componentNode);

  const timer = window.setTimeout(() => {
    node.classList.remove("is-active");
    remainder?.classList.remove("is-active");
    activeRegionTimers.delete(key);
    const hasActiveRegion = componentLayer.querySelector(`.region-effect-zone[data-component-id="${componentId}"].is-active`);
    if (hasActiveRegion) stopRegionCanvasRun(key);
    else finishRegionCanvasRun(key, componentNode);
  }, regionDuration(region) + 80);
  activeRegionTimers.set(key, timer);
}

function clearActiveRegionEffects(componentId = null) {
  if (!componentLayer) return;
  activeRegionTimers.forEach((timer, key) => {
    if (componentId !== null && !key.startsWith(`${componentId}:`)) return;
    window.clearTimeout(timer);
    activeRegionTimers.delete(key);
  });

  const selector = componentId === null ? ".region-effect-zone.is-active" : `.region-effect-zone[data-component-id="${componentId}"].is-active`;
  componentLayer.querySelectorAll(selector).forEach((node) => node.classList.remove("is-active"));
  Array.from(activeRegionCanvasRuns.keys()).forEach((key) => {
    if (componentId === null || key.startsWith(`${componentId}:`)) stopRegionCanvasRun(key);
  });
  const remainderSelector = componentId === null ? ".region-remainder.is-active" : `.region-remainder[data-component-id="${componentId}"].is-active`;
  componentLayer.querySelectorAll(remainderSelector).forEach((node) => node.classList.remove("is-active"));
  if (componentId === null) {
    componentLayer.querySelectorAll(".art-component.has-active-region").forEach((node) => node.classList.remove("has-active-region"));
  } else {
    componentLayer.querySelector(`[data-id="${componentId}"]`)?.classList.remove("has-active-region");
  }
}

function startRegionDrag(event, componentId, regionId, mode) {
  const component = components.find((item) => item.id === componentId);
  const region = component?.regions?.find((item) => item.id === regionId);
  const componentNode = componentLayer.querySelector(`[data-id="${componentId}"]`);
  if (!component || !region || !componentNode) return;

  saveHistory();
  clearActiveRegionEffects(componentId);
  clearSmartGuides();
  const rect = componentNode.getBoundingClientRect();
  regionDragState = {
    componentId,
    regionId,
    mode,
    startX: event.clientX,
    startY: event.clientY,
    width: Math.max(1, rect.width),
    height: Math.max(1, rect.height),
    base: { x: region.x, y: region.y, w: region.w, h: region.h },
    moved: false
  };

  movedDuringDrag = true;
  window.addEventListener("pointermove", handleRegionDragMove);
  window.addEventListener("pointerup", handleRegionDragUp, { once: true });
}

function handleRegionDragMove(event) {
  if (!regionDragState) return;
  const component = components.find((item) => item.id === regionDragState.componentId);
  const region = component?.regions?.find((item) => item.id === regionDragState.regionId);
  const node = componentLayer.querySelector(`.region-effect-zone[data-component-id="${regionDragState.componentId}"][data-region-id="${regionDragState.regionId}"]`);
  if (!component || !region || !node) return;

  const dx = (event.clientX - regionDragState.startX) / regionDragState.width * 100;
  const dy = (event.clientY - regionDragState.startY) / regionDragState.height * 100;
  regionDragState.moved = regionDragState.moved || Math.abs(dx) + Math.abs(dy) > 0.7;

  if (regionDragState.mode === "resize") {
    region.w = regionDragState.base.w + dx;
    region.h = regionDragState.base.h + dy;
  } else {
    region.x = regionDragState.base.x + dx;
    region.y = regionDragState.base.y + dy;
  }

  clampRegion(region);
  syncRegionNode(node, component, region);
  setRegionPointerOrigin(node, event);
  syncControlsFromSelection();
}

function handleRegionDragUp(event) {
  const state = regionDragState;
  window.removeEventListener("pointermove", handleRegionDragMove);
  regionDragState = null;

  if (state) {
    const component = components.find((item) => item.id === state.componentId);
    const region = component?.regions?.find((item) => item.id === state.regionId);
    if (region && !state.moved && region.trigger === "click") activateRegion(state.componentId, state.regionId, event);
  }

  window.setTimeout(() => { movedDuringDrag = false; }, 0);
}

function syncBrushDrawButtonState() {
  addRegionButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.regionShape === "brush" && Boolean(brushDrawComponentId));
  });
  document.body.classList.toggle("is-brush-drawing", Boolean(brushDrawComponentId));
}

function cancelBrushDrawMode() {
  brushDrawComponentId = null;
  brushDrawState?.preview?.remove();
  brushDrawState = null;
  window.removeEventListener("pointermove", handleBrushRegionDrawMove);
  window.removeEventListener("pointerup", handleBrushRegionDrawUp);
  syncBrushDrawButtonState();
}

function beginBrushDrawMode() {
  const component = selectedComponent();
  if (!component || selectedIds.length !== 1) return;
  brushDrawComponentId = component.id;
  selectedRegionId = null;
  syncBrushDrawButtonState();
  syncSelectionVisuals();
}

function canStartBrushDraw(componentId) {
  return brushDrawComponentId === componentId && selectedIds.length === 1 && selectedId === componentId && !brushDrawState;
}

function pointInComponentPercent(event, rect) {
  return {
    x: clampNumber((event.clientX - rect.left) / rect.width * 100, 0, 100, 0),
    y: clampNumber((event.clientY - rect.top) / rect.height * 100, 0, 100, 0)
  };
}

function brushPreviewPath(points) {
  if (!points.length) return "";
  return `${points.map((point, index) => `${index ? "L" : "M"}${roundPathValue(point.x)} ${roundPathValue(point.y)}`).join(" ")}${points.length > 2 ? " Z" : ""}`;
}

function updateBrushDrawPreview() {
  if (!brushDrawState?.path) return;
  brushDrawState.path.setAttribute("d", brushPreviewPath(brushDrawState.points));
}

function shouldAddBrushPoint(points, nextPoint) {
  const previous = points[points.length - 1];
  if (!previous) return true;
  return Math.hypot(nextPoint.x - previous.x, nextPoint.y - previous.y) >= 0.7;
}

function createBrushRegionFromPoints(points, component) {
  const safePoints = points.length >= 3 ? points : [
    { x: points[0]?.x ?? 50, y: points[0]?.y ?? 50 },
    { x: (points[0]?.x ?? 50) + 8, y: points[0]?.y ?? 50 },
    { x: (points[0]?.x ?? 50) + 8, y: (points[0]?.y ?? 50) + 8 },
    { x: points[0]?.x ?? 50, y: (points[0]?.y ?? 50) + 8 }
  ];
  const xs = safePoints.map((point) => point.x);
  const ys = safePoints.map((point) => point.y);
  const padding = 1.8;
  const left = clampNumber(Math.min(...xs) - padding, 0, 95, 0);
  const top = clampNumber(Math.min(...ys) - padding, 0, 95, 0);
  const right = clampNumber(Math.max(...xs) + padding, left + 5, 100, left + 18);
  const bottom = clampNumber(Math.max(...ys) + padding, top + 5, 100, top + 18);
  const width = Math.max(5, right - left);
  const height = Math.max(5, bottom - top);
  const normalizedPoints = safePoints.map((point) => [
    clampNumber((point.x - left) / width * 100, 0, 100, 0),
    clampNumber((point.y - top) / height * 100, 0, 100, 0)
  ]);

  return normalizeRegion({
    ...defaultRegion,
    shape: "brush",
    name: `Brush ${component.regions.length + 1}`,
    trigger: "drag",
    effect: "smear",
    x: left,
    y: top,
    w: width,
    h: height,
    softness: 82,
    angle: 0,
    points: normalizedPoints
  }, component.regions.length);
}

function startBrushRegionDraw(event, componentId) {
  const component = components.find((item) => item.id === componentId);
  const componentNode = componentLayer.querySelector(`[data-id="${componentId}"]`);
  if (!component || !componentNode) return;

  saveHistory();
  const rect = componentNode.getBoundingClientRect();
  const preview = document.createElement("div");
  preview.className = "brush-draw-preview";
  preview.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path></path></svg>`;
  componentNode.appendChild(preview);

  brushDrawState = {
    componentId,
    rect,
    preview,
    path: preview.querySelector("path"),
    points: [pointInComponentPercent(event, rect)]
  };
  updateBrushDrawPreview();

  movedDuringDrag = true;
  window.addEventListener("pointermove", handleBrushRegionDrawMove);
  window.addEventListener("pointerup", handleBrushRegionDrawUp, { once: true });
}

function handleBrushRegionDrawMove(event) {
  if (!brushDrawState) return;
  const point = pointInComponentPercent(event, brushDrawState.rect);
  if (shouldAddBrushPoint(brushDrawState.points, point)) {
    brushDrawState.points.push(point);
    updateBrushDrawPreview();
  }
}

function handleBrushRegionDrawUp() {
  const state = brushDrawState;
  if (!state) return;

  window.removeEventListener("pointermove", handleBrushRegionDrawMove);
  brushDrawState = null;
  state.preview.remove();

  const component = components.find((item) => item.id === state.componentId);
  if (component && state.points.length >= 2) {
    component.regions = cloneRegions(component.regions);
    const region = createBrushRegionFromPoints(state.points, component);
    component.regions.push(region);
    selectedRegionId = region.id;
  }

  cancelBrushDrawMode();
  render();
  window.setTimeout(() => { movedDuringDrag = false; }, 0);
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
function bindComponentEvents(node, component, ownerArtboardId = activeArtboardId) {
  node.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  node.addEventListener("pointerenter", (event) => {
    if (ownerArtboardId !== activeArtboardId) return;
    if (event.altKey) return;
    if (component.trigger === "hover" && window.matchMedia("(hover: hover)").matches) {
      triggerComponent(component.id);
    }
  });

  node.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (ownerArtboardId !== activeArtboardId) activateArtboard(ownerArtboardId);
    event.preventDefault();
    event.stopPropagation();

    if (canStartBrushDraw(component.id)) {
      startBrushRegionDraw(event, component.id);
      return;
    }

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
    if (ownerArtboardId !== activeArtboardId) activateArtboard(ownerArtboardId);
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

function addArtboardEdgeMeasures(group, surface, measures) {
  const left = clampPx(group.left, 0, surface.width);
  const right = clampPx(group.right, 0, surface.width);
  const top = clampPx(group.top, 0, surface.height);
  const bottom = clampPx(group.bottom, 0, surface.height);
  const horizontalLane = clampPx(group.centerY, 12, surface.height - 12);
  const verticalLane = clampPx(group.centerX, 12, surface.width - 12);

  [
    horizontalMeasure(0, left, horizontalLane, surface),
    horizontalMeasure(right, surface.width, horizontalLane, surface),
    verticalMeasure(0, top, verticalLane, surface),
    verticalMeasure(bottom, surface.height, verticalLane, surface)
  ].forEach((measure) => {
    if (measure) measures.push({ ...measure, kind: "figma-measure" });
  });
}

function measurementsBetweenRects(source, target, surface) {
  const measures = [];
  if (source.right <= target.left) {
    const measure = horizontalMeasure(source.right, target.left, horizontalMeasureLane(source, target, surface), surface);
    if (measure) measures.push({ ...measure, kind: "figma-measure" });
  } else if (target.right <= source.left) {
    const measure = horizontalMeasure(target.right, source.left, horizontalMeasureLane(target, source, surface), surface);
    if (measure) measures.push({ ...measure, kind: "figma-measure" });
  }

  if (source.bottom <= target.top) {
    const measure = verticalMeasure(source.bottom, target.top, verticalMeasureLane(source, target, surface), surface);
    if (measure) measures.push({ ...measure, kind: "figma-measure" });
  } else if (target.bottom <= source.top) {
    const measure = verticalMeasure(target.bottom, source.top, verticalMeasureLane(target, source, surface), surface);
    if (measure) measures.push({ ...measure, kind: "figma-measure" });
  }

  if (measures.length === 2) {
    const horizontal = measures.find((measure) => measure.orientation === "horizontal");
    const vertical = measures.find((measure) => measure.orientation === "vertical");
    if (horizontal) horizontal.labelTop = clampPx(horizontal.labelTop - 12, 10, surface.height - 10);
    if (vertical) vertical.labelLeft = clampPx(vertical.labelLeft + 16, 12, surface.width - 12);
  }
  return measures;
}

function figmaMeasurementsForTarget(targetId = null) {
  if (!selectedIds.length || !artSurface) return [];
  const selectedIdSet = new Set(selectedIds);
  const surface = smartGuideSurface();
  const selectedRects = components
    .filter((component) => selectedIdSet.has(component.id))
    .map((component) => rectForSmartGuide(component, surface));
  if (!selectedRects.length) return [];
  const selectedBounds = smartGuideBounds(selectedRects);

  if (targetId && !selectedIdSet.has(targetId)) {
    const target = components.find((component) => component.id === targetId);
    return target ? measurementsBetweenRects(selectedBounds, rectForSmartGuide(target, surface), surface) : [];
  }

  const measures = [];
  addArtboardEdgeMeasures(selectedBounds, surface, measures);
  return measures;
}

function guideFigmaMeasurements(guide, targetId = null) {
  if (!guide || !artSurface) return [];
  const surface = smartGuideSurface();
  const target = targetId ? components.find((component) => component.id === targetId) : null;
  const targetRect = target ? rectForSmartGuide(target, surface) : null;
  const measures = [];

  if (guide.orientation === "vertical") {
    const x = clampPx(guide.position / surface.scaleX, 0, surface.width);
    const lane = targetRect ? clampPx(targetRect.centerY, 12, surface.height - 12) : 18;
    const segments = targetRect
      ? x <= targetRect.left
        ? [[x, targetRect.left]]
        : x >= targetRect.right
          ? [[targetRect.right, x]]
          : [[targetRect.left, x], [x, targetRect.right]]
      : [[0, x], [x, surface.width]];
    segments.forEach(([start, end]) => {
      const measure = horizontalMeasure(start, end, lane, surface);
      if (measure) measures.push({ ...measure, kind: "guide-distance" });
    });
    return measures;
  }

  const y = clampPx(guide.position / surface.scaleY, 0, surface.height);
  const lane = targetRect ? clampPx(targetRect.centerX, 12, surface.width - 12) : 18;
  const segments = targetRect
    ? y <= targetRect.top
      ? [[y, targetRect.top]]
      : y >= targetRect.bottom
        ? [[targetRect.bottom, y]]
        : [[targetRect.top, y], [y, targetRect.bottom]]
    : [[0, y], [y, surface.height]];
  segments.forEach(([start, end]) => {
    const measure = verticalMeasure(start, end, lane, surface);
    if (measure) measures.push({ ...measure, kind: "guide-distance" });
  });
  return measures;
}

function figmaMeasurementsToGuide(guide) {
  if (!guide || !selectedIds.length || !artSurface) return [];
  const selectedIdSet = new Set(selectedIds);
  const surface = smartGuideSurface();
  const selectedRects = components
    .filter((component) => selectedIdSet.has(component.id))
    .map((component) => rectForSmartGuide(component, surface));
  if (!selectedRects.length) return [];
  const bounds = smartGuideBounds(selectedRects);
  const measures = [];

  if (guide.orientation === "vertical") {
    const x = clampPx(guide.position / surface.scaleX, 0, surface.width);
    const lane = clampPx(bounds.centerY, 12, surface.height - 12);
    const segments = x <= bounds.left
      ? [[x, bounds.left]]
      : x >= bounds.right
        ? [[bounds.right, x]]
        : [[bounds.left, x], [x, bounds.right]];
    segments.forEach(([start, end]) => {
      const measure = horizontalMeasure(start, end, lane, surface);
      if (measure) measures.push({ ...measure, kind: "figma-measure" });
    });
    return measures;
  }

  const y = clampPx(guide.position / surface.scaleY, 0, surface.height);
  const lane = clampPx(bounds.centerX, 12, surface.width - 12);
  const segments = y <= bounds.top
    ? [[y, bounds.top]]
    : y >= bounds.bottom
      ? [[bounds.bottom, y]]
      : [[bounds.top, y], [y, bounds.bottom]];
  segments.forEach(([start, end]) => {
    const measure = verticalMeasure(start, end, lane, surface);
    if (measure) measures.push({ ...measure, kind: "figma-measure" });
  });
  return measures;
}

function showMeasurementGuides(measures) {
  renderSmartGuides([], measures);
  measurementGuidesVisible = Boolean(measures.length);
}

function clearMeasurementGuides() {
  if (!measurementGuidesVisible) return;
  clearSmartGuides();
}

function renderFigmaMeasurementAtPoint(clientX, clientY) {
  const guide = selectedGuide();
  if (!artSurface || (!selectedIds.length && !guide) || hasActiveEditorGesture()) {
    clearMeasurementGuides();
    return;
  }
  const element = document.elementFromPoint(clientX, clientY);
  const hoveredGuideNode = element?.closest(".artboard-guide");
  const hoveredGuideId = Number(hoveredGuideNode?.dataset.guideId) || null;
  const hoveredGuide = hoveredGuideId ? guides.find((item) => item.id === hoveredGuideId) : null;
  if (!guide && hoveredGuide && selectedIds.length) {
    showMeasurementGuides(figmaMeasurementsToGuide(hoveredGuide));
    return;
  }
  const hoveredSurface = element?.closest(".art-surface");
  const surfaceRect = artSurface.getBoundingClientRect();
  const pointIsInsideSurface = clientX >= surfaceRect.left
    && clientX <= surfaceRect.right
    && clientY >= surfaceRect.top
    && clientY <= surfaceRect.bottom;
  if (!guide && hoveredSurface !== artSurface) {
    clearMeasurementGuides();
    return;
  }
  const targetNode = pointIsInsideSurface ? element?.closest(".art-component") : null;
  const targetId = Number(targetNode?.dataset.id) || null;
  if (guide) {
    showMeasurementGuides(guideFigmaMeasurements(guide, targetId));
    return;
  }
  if (targetId && selectedIds.includes(targetId)) {
    clearMeasurementGuides();
    return;
  }
  showMeasurementGuides(figmaMeasurementsForTarget(targetId));
}

function handleMeasurementPointerMove(event) {
  lastCanvasPointer = { clientX: event.clientX, clientY: event.clientY };
  if (!event.altKey || hasActiveEditorGesture()) {
    if (!hasActiveEditorGesture()) clearMeasurementGuides();
    return;
  }
  renderFigmaMeasurementAtPoint(event.clientX, event.clientY);
}

function handleMeasurementPointerLeave() {
  lastCanvasPointer = null;
  clearMeasurementGuides();
}

function guideDistanceMeasures(guide) {
  if (!guide || !artSurface) return [];
  const surface = smartGuideSurface();
  const targets = components.map((component) => ({
    id: component.id,
    rect: rectForSmartGuide(component, surface)
  }));

  const nearestCandidate = (candidates) => candidates.sort((a, b) => {
    const distanceDelta = a.distance - b.distance;
    if (Math.abs(distanceDelta) > 0.01) return distanceDelta;
    if (a.source === b.source) return 0;
    return a.source === "component" ? -1 : 1;
  })[0];

  if (guide.orientation === "vertical") {
    const guideX = clampPx(guide.position / surface.scaleX, 0, surface.width);
    const candidates = [
      { source: "artboard", distance: guideX, start: 0, end: guideX, lane: 18 },
      { source: "artboard", distance: surface.width - guideX, start: guideX, end: surface.width, lane: 18 }
    ];
    targets.forEach((target) => {
      if (target.rect.right <= guideX) {
        candidates.push({
          source: "component",
          distance: guideX - target.rect.right,
          start: target.rect.right,
          end: guideX,
          lane: clampPx(target.rect.centerY, 12, surface.height - 12)
        });
      }
      if (target.rect.left >= guideX) {
        candidates.push({
          source: "component",
          distance: target.rect.left - guideX,
          start: guideX,
          end: target.rect.left,
          lane: clampPx(target.rect.centerY, 12, surface.height - 12)
        });
      }
    });
    const nearest = nearestCandidate(candidates);
    const measure = horizontalMeasure(nearest.start, nearest.end, nearest.lane, surface);
    return measure ? [{ ...measure, kind: "guide-distance" }] : [];
  }

  const guideY = clampPx(guide.position / surface.scaleY, 0, surface.height);
  const candidates = [
    { source: "artboard", distance: guideY, start: 0, end: guideY, lane: 18 },
    { source: "artboard", distance: surface.height - guideY, start: guideY, end: surface.height, lane: 18 }
  ];
  targets.forEach((target) => {
    if (target.rect.bottom <= guideY) {
      candidates.push({
        source: "component",
        distance: guideY - target.rect.bottom,
        start: target.rect.bottom,
        end: guideY,
        lane: clampPx(target.rect.centerX, 12, surface.width - 12)
      });
    }
    if (target.rect.top >= guideY) {
      candidates.push({
        source: "component",
        distance: target.rect.top - guideY,
        start: guideY,
        end: target.rect.top,
        lane: clampPx(target.rect.centerX, 12, surface.width - 12)
      });
    }
  });
  const nearest = nearestCandidate(candidates);
  const measure = verticalMeasure(nearest.start, nearest.end, nearest.lane, surface);
  return measure ? [{ ...measure, kind: "guide-distance" }] : [];
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
    line.className = `smart-distance is-${measure.orientation}${measure.kind ? ` is-${measure.kind}` : ""}`;
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
    label.className = `smart-distance-label${measure.kind ? ` is-${measure.kind}` : ""}`;
    label.textContent = measure.label;
    label.style.left = `${measure.labelLeft}px`;
    label.style.top = `${measure.labelTop}px`;
    smartGuideLayer.appendChild(label);
  });
}

function clearSmartGuides() {
  if (smartGuideLayer) smartGuideLayer.replaceChildren();
  measurementGuidesVisible = false;
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

  const historyLengthBeforeDrag = historyStack.length;
  saveHistory();
  const ids = isSelected(id) ? [...selectedIds] : [id];
  dragState = {
    ids,
    clickedId: id,
    ownerArtboardId: activeArtboardId,
    startX: event.clientX,
    startY: event.clientY,
    width: rect.width,
    height: rect.height,
    historyEntryAdded: historyStack.length > historyLengthBeforeDrag,
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

function artboardAtPoint(clientX, clientY) {
  return [...artboards].reverse().find((record) => {
    if (record.isCanvas || !record.surface) return false;
    const rect = record.surface.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }) || null;
}

function moveComponentsToArtboard(sourceRecord, targetRecord, componentIds, {
  placement = "screen",
  primaryId = null,
  save = false
} = {}) {
  if (!sourceRecord || !targetRecord || sourceRecord.id === targetRecord.id) return false;
  const ids = new Set(componentIds);
  const moving = sourceRecord.components.filter((component) => ids.has(component.id));
  if (!moving.length) return false;

  const sourceRect = sourceRecord.componentLayer?.getBoundingClientRect();
  const targetRect = targetRecord.componentLayer?.getBoundingClientRect();
  if (!sourceRect?.width || !sourceRect.height || !targetRect?.width || !targetRect.height) return false;
  if (save) saveHistory();

  moving.forEach((component) => {
    if (placement === "offset") {
      const sourceWidth = Math.max(1, sourceRecord.artboard.width);
      const sourceHeight = Math.max(1, sourceRecord.artboard.height);
      const targetWidth = Math.max(1, targetRecord.artboard.width);
      const targetHeight = Math.max(1, targetRecord.artboard.height);
      const pixelWidth = component.w / 100 * sourceWidth;
      const pixelHeight = component.h / 100 * sourceHeight;
      const pixelX = component.x / 100 * sourceWidth;
      const pixelY = component.y / 100 * sourceHeight;
      const targetX = clampNumber(pixelX, 0, Math.max(0, targetWidth - pixelWidth), 0);
      const targetY = clampNumber(pixelY, 0, Math.max(0, targetHeight - pixelHeight), 0);
      component.x = targetX / targetWidth * 100;
      component.y = targetY / targetHeight * 100;
      component.w = pixelWidth / targetWidth * 100;
      component.h = pixelHeight / targetHeight * 100;
      return;
    }

    const screenX = sourceRect.left + component.x / 100 * sourceRect.width;
    const screenY = sourceRect.top + component.y / 100 * sourceRect.height;
    const screenWidth = component.w / 100 * sourceRect.width;
    const screenHeight = component.h / 100 * sourceRect.height;
    component.x = (screenX - targetRect.left) / targetRect.width * 100;
    component.y = (screenY - targetRect.top) / targetRect.height * 100;
    component.w = screenWidth / targetRect.width * 100;
    component.h = screenHeight / targetRect.height * 100;
  });

  moving.forEach((component) => {
    stopComponentActionRun(component.id);
    clearActiveRegionEffects(component.id);
    sourceRecord.componentLayer?.querySelector(`[data-id="${component.id}"]`)?.remove();
  });
  sourceRecord.components = sourceRecord.components.filter((component) => !ids.has(component.id));
  sourceRecord.selectedIds = [];
  sourceRecord.selectedId = null;
  sourceRecord.selectedRegionId = null;

  if (sourceRecord.id === activeArtboardId) {
    components = sourceRecord.components;
    selectedIds = [];
    selectedId = null;
    selectedRegionId = null;
    commitActiveArtboardState();
  }

  targetRecord.components.push(...moving);
  targetRecord.selectedIds = moving.map((component) => component.id);
  targetRecord.selectedId = moving.some((component) => component.id === primaryId)
    ? primaryId
    : moving[moving.length - 1].id;
  targetRecord.selectedRegionId = null;
  targetRecord.selectedGuideId = null;
  targetRecord.selectedGuideIds = [];
  targetRecord.expanded = true;
  clearArtboardSelection();

  if (targetRecord.id === activeArtboardId) setActiveArtboardRefs(targetRecord);
  activateArtboard(targetRecord.id);
  moving.forEach(clampComponent);
  render();
  return true;
}

function reparentDraggedComponents(state) {
  if (!state || !movedDuringDrag) return false;
  const sourceRecord = artboards.find((record) => record.id === state.ownerArtboardId);
  if (!sourceRecord || sourceRecord.id !== activeArtboardId) return false;
  const ids = new Set(state.ids);
  const moving = sourceRecord.components.filter((component) => ids.has(component.id));
  if (!moving.length) return false;

  const movingRects = moving
    .map((component) => sourceRecord.componentLayer?.querySelector(`[data-id="${component.id}"]`)?.getBoundingClientRect())
    .filter(Boolean);
  if (!movingRects.length) return false;
  const bounds = {
    left: Math.min(...movingRects.map((rect) => rect.left)),
    right: Math.max(...movingRects.map((rect) => rect.right)),
    top: Math.min(...movingRects.map((rect) => rect.top)),
    bottom: Math.max(...movingRects.map((rect) => rect.bottom))
  };
  const targetRecord = artboardAtPoint((bounds.left + bounds.right) / 2, (bounds.top + bounds.bottom) / 2);
  if (!targetRecord || targetRecord.id === sourceRecord.id) return false;
  return moveComponentsToArtboard(sourceRecord, targetRecord, state.ids, {
    placement: "screen",
    primaryId: state.clickedId
  });
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
  if (!movedDuringDrag && state?.historyEntryAdded) historyStack.pop();
  clearSmartGuides();
  if (!reparentDraggedComponents(state)) render();

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

function startWorkspaceMarqueeSelection(event) {
  if (event.button !== 0 || isSpacePanning || activeInsertTool || hasActiveEditorGesture()) return;
  if (!(event.target instanceof Element)) return;
  if (event.target.closest(".artboard-frame, .artboard-guide, .art-component")) return;

  event.preventDefault();
  const workspaceRect = artboardWorkspace.getBoundingClientRect();
  workspaceMarqueeState = {
    startClientX: event.clientX,
    startClientY: event.clientY,
    startX: event.clientX - workspaceRect.left,
    startY: event.clientY - workspaceRect.top,
    baseIds: event.shiftKey ? [...selectedArtboardIds] : [],
    moved: false
  };
  if (!event.shiftKey) {
    setSelection([]);
    setGuideSelection([]);
    clearArtboardSelection();
  }

  workspaceMarqueeNode = document.createElement("div");
  workspaceMarqueeNode.className = "selection-marquee is-workspace-marquee";
  workspaceMarqueeNode.style.left = `${workspaceMarqueeState.startX}px`;
  workspaceMarqueeNode.style.top = `${workspaceMarqueeState.startY}px`;
  artboardWorkspace.appendChild(workspaceMarqueeNode);
  syncSelectionVisuals();
  window.addEventListener("pointermove", handleWorkspaceMarqueeMove);
  window.addEventListener("pointerup", handleWorkspaceMarqueeUp, { once: true });
}

function handleWorkspaceMarqueeMove(event) {
  if (!workspaceMarqueeState || !workspaceMarqueeNode) return;
  const workspaceRect = artboardWorkspace.getBoundingClientRect();
  const currentX = event.clientX - workspaceRect.left;
  const currentY = event.clientY - workspaceRect.top;
  const left = Math.min(workspaceMarqueeState.startX, currentX);
  const top = Math.min(workspaceMarqueeState.startY, currentY);
  const width = Math.abs(currentX - workspaceMarqueeState.startX);
  const height = Math.abs(currentY - workspaceMarqueeState.startY);
  workspaceMarqueeState.moved = width + height > 4;
  workspaceMarqueeNode.style.left = `${left}px`;
  workspaceMarqueeNode.style.top = `${top}px`;
  workspaceMarqueeNode.style.width = `${width}px`;
  workspaceMarqueeNode.style.height = `${height}px`;

  const selectionRect = {
    left: Math.min(workspaceMarqueeState.startClientX, event.clientX),
    right: Math.max(workspaceMarqueeState.startClientX, event.clientX),
    top: Math.min(workspaceMarqueeState.startClientY, event.clientY),
    bottom: Math.max(workspaceMarqueeState.startClientY, event.clientY)
  };
  const hitIds = artboards
    .filter((record) => !record.isCanvas && record.surface && rectsIntersect(record.surface.getBoundingClientRect(), selectionRect))
    .map((record) => record.id);
  const nextIds = [...workspaceMarqueeState.baseIds, ...hitIds];
  setArtboardSelection(nextIds, hitIds[hitIds.length - 1] || workspaceMarqueeState.baseIds[workspaceMarqueeState.baseIds.length - 1]);
  syncSelectionVisuals();
}

function handleWorkspaceMarqueeUp() {
  window.removeEventListener("pointermove", handleWorkspaceMarqueeMove);
  const primaryId = selectedArtboardId;
  workspaceMarqueeNode?.remove();
  workspaceMarqueeNode = null;
  workspaceMarqueeState = null;
  if (primaryId) activateArtboard(primaryId);
  syncSelectionVisuals();
}

function startMarqueeSelection(event) {
  if (event.button !== 0 || event.target.closest(".art-component")) return;
  if (!artSurface) return;

  event.preventDefault();
  clearSmartGuides();
  const start = pointInSurface(event);
  marqueeState = {
    startX: start.x,
    startY: start.y,
    baseIds: event.shiftKey ? [...selectedIds] : [],
    baseGuideIds: event.shiftKey ? [...selectedGuideIds] : [],
    moved: false
  };

  if (!event.shiftKey) {
    setSelection([]);
    setGuideSelection([]);
  }
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
  const hitGuideIds = Array.from(artboardGuideLayer?.querySelectorAll(".artboard-guide") || [])
    .filter((node) => rectsIntersect(node.getBoundingClientRect(), selectionRect))
    .map((node) => Number(node.dataset.guideId));

  if (marqueeState.moved) clearArtboardSelection();
  setSelection([...marqueeState.baseIds, ...hitIds], { preserveGuides: true });
  setGuideSelection([...marqueeState.baseGuideIds, ...hitGuideIds], hitGuideIds[hitGuideIds.length - 1]);
  syncSelectionVisuals();
}

function handleMarqueeUp() {
  window.removeEventListener("pointermove", handleMarqueeMove);
  if (!marqueeState?.moved && !marqueeState?.baseIds.length && !marqueeState?.baseGuideIds.length) {
    setSelection([]);
    setGuideSelection([]);
  }
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

function beginComponentRename(component, item, nameNode) {
  if (!component || item.querySelector(".component-name-input")) return;
  const input = document.createElement("input");
  input.className = "component-name-input";
  input.type = "text";
  input.value = component.name;
  input.setAttribute("aria-label", "Layer name");
  nameNode.replaceWith(input);
  let cancelled = false;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    const nextName = input.value.trim();
    if (!cancelled && nextName && nextName !== component.name) {
      saveHistory();
      component.name = nextName;
      render();
      return;
    }
    renderComponentList();
  };

  input.addEventListener("pointerdown", (event) => event.stopPropagation());
  input.addEventListener("click", (event) => event.stopPropagation());
  input.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      input.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelled = true;
      input.blur();
    }
  });
  input.addEventListener("blur", finish, { once: true });
  input.focus();
  input.select();
}

function beginArtboardRename(record, item, nameNode) {
  if (!record || record.isCanvas || item.querySelector(".component-name-input")) return;
  const input = document.createElement("input");
  input.className = "component-name-input";
  input.type = "text";
  input.value = record.name;
  input.setAttribute("aria-label", "Artboard name");
  nameNode.replaceWith(input);
  let cancelled = false;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    const nextName = input.value.trim();
    if (!cancelled && nextName && nextName !== record.name) {
      saveHistory();
      record.name = nextName;
      if (record.label) record.label.textContent = nextName;
      record.surface?.setAttribute("aria-label", nextName);
      renderComponentList();
      syncControlsFromSelection();
      return;
    }
    renderComponentList();
  };

  input.addEventListener("pointerdown", (event) => event.stopPropagation());
  input.addEventListener("click", (event) => event.stopPropagation());
  input.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      input.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelled = true;
      input.blur();
    }
  });
  input.addEventListener("blur", finish, { once: true });
  input.focus();
  input.select();
}

function clearLayerDropTargets() {
  componentList.querySelectorAll(".layer-artboard.is-drop-target").forEach((item) => {
    item.classList.remove("is-drop-target");
  });
}

function finishLayerDrag() {
  clearLayerDropTargets();
  componentList.querySelectorAll(".layer-component.is-layer-dragging").forEach((item) => {
    item.classList.remove("is-layer-dragging");
    item.setAttribute("aria-grabbed", "false");
  });
  document.body.classList.remove("is-layer-reparenting");
  layerDragState = null;
}

function startLayerDrag(event, record, component, item) {
  if (!event.dataTransfer || item.querySelector(".component-name-input")) {
    event.preventDefault();
    return;
  }
  const ids = record.id === activeArtboardId && isSelected(component.id)
    ? [...selectedIds]
    : [component.id];
  layerDragState = {
    sourceArtboardId: record.id,
    componentIds: ids,
    primaryId: component.id
  };
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", `component:${component.id}`);
  item.classList.add("is-layer-dragging");
  item.setAttribute("aria-grabbed", "true");
  document.body.classList.add("is-layer-reparenting");
}

function canDropLayerOnArtboard(record) {
  return Boolean(layerDragState && record && !record.isCanvas && layerDragState.sourceArtboardId !== record.id);
}

function dropLayerOnArtboard(event, targetRecord) {
  if (!canDropLayerOnArtboard(targetRecord)) return;
  event.preventDefault();
  event.stopPropagation();
  const state = { ...layerDragState, componentIds: [...layerDragState.componentIds] };
  finishLayerDrag();
  const sourceRecord = artboards.find((record) => record.id === state.sourceArtboardId);
  moveComponentsToArtboard(sourceRecord, targetRecord, state.componentIds, {
    placement: "offset",
    primaryId: state.primaryId,
    save: true
  });
}

function createComponentLayerItem(record, component, nested = false) {
  const item = document.createElement("div");
  const selected = record.id === activeArtboardId && isSelected(component.id);
  item.className = `component-item layer-component${nested ? " is-layer-child" : ""}${selected ? " is-selected" : ""}`;
  item.role = "button";
  item.tabIndex = 0;
  item.draggable = true;
  item.setAttribute("aria-grabbed", "false");
  item.dataset.componentId = String(component.id);
  item.dataset.ownerArtboardId = String(record.id);
  const actionText = component.actions?.length ? ` / ${component.actions.length} actions` : "";
  const regionText = component.regions?.length ? ` / ${component.regions.length} areas` : "";
  const main = document.createElement("span");
  main.className = "component-item-main";
  const name = document.createElement("span");
  name.className = "component-item-name";
  name.textContent = component.name;
  main.appendChild(name);
  const meta = document.createElement("small");
  meta.textContent = `${component.type} / ${effectLabels[component.effect] || "None"}${actionText}${regionText}`;
  item.append(main, meta);

  const selectLayer = (event, rename = false) => {
    if (record.id !== activeArtboardId) activateArtboard(record.id);
    if (event?.shiftKey && !rename) toggleSelection(component.id);
    else selectOnly(component.id);
    if (rename) {
      syncControlsFromSelection();
      renderComponentList();
      const currentItem = componentList.querySelector(`[data-component-id="${component.id}"][data-owner-artboard-id="${record.id}"]`);
      const currentName = currentItem?.querySelector(".component-item-name");
      if (currentItem && currentName) beginComponentRename(component, currentItem, currentName);
    } else render();
  };

  item.addEventListener("click", (event) => {
    if (event.target.closest(".component-name-input")) return;
    if (event.detail >= 2) {
      event.preventDefault();
      event.stopPropagation();
      selectLayer(event, true);
      return;
    }
    selectLayer(event);
  });
  name.addEventListener("dblclick", (event) => {
    event.preventDefault();
    event.stopPropagation();
    selectLayer(event, true);
  });
  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectLayer(event);
    } else if (event.key === "F2") {
      event.preventDefault();
      selectLayer(event, true);
    }
  });
  item.addEventListener("dragstart", (event) => startLayerDrag(event, record, component, item));
  item.addEventListener("dragend", finishLayerDrag);
  return item;
}

function createArtboardLayerItem(record) {
  const item = document.createElement("div");
  item.className = `component-item layer-artboard${selectedArtboardIds.includes(record.id) ? " is-selected" : ""}${activeArtboardId === record.id ? " is-active-layer" : ""}`;
  item.role = "button";
  item.tabIndex = 0;
  item.dataset.artboardId = String(record.id);
  item.setAttribute("aria-expanded", String(record.expanded !== false));

  const disclosure = document.createElement("button");
  disclosure.type = "button";
  disclosure.className = `layer-disclosure${record.expanded !== false ? " is-expanded" : ""}`;
  disclosure.setAttribute("aria-label", `${record.expanded !== false ? "Collapse" : "Expand"} ${record.name}`);
  disclosure.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    record.expanded = record.expanded === false;
    renderComponentList();
  });

  const icon = document.createElement("span");
  icon.className = "layer-kind-icon is-artboard";
  icon.setAttribute("aria-hidden", "true");
  const name = document.createElement("span");
  name.className = "component-item-name";
  name.textContent = record.name;
  const meta = document.createElement("small");
  meta.textContent = String(record.components.length);
  item.append(disclosure, icon, name, meta);

  const selectLayer = (rename = false, toggle = false) => {
    selectArtboard(record.id, { toggle });
    if (rename) {
      const currentItem = componentList.querySelector(`[data-artboard-id="${record.id}"]`);
      const currentName = currentItem?.querySelector(".component-item-name");
      if (currentItem && currentName) beginArtboardRename(record, currentItem, currentName);
    }
  };
  item.addEventListener("click", (event) => {
    if (event.target.closest(".component-name-input, .layer-disclosure")) return;
    if (event.detail >= 2) {
      event.preventDefault();
      event.stopPropagation();
      selectLayer(true);
      return;
    }
    selectLayer(false, event.shiftKey);
  });
  name.addEventListener("dblclick", (event) => {
    event.preventDefault();
    event.stopPropagation();
    selectLayer(true);
  });
  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectLayer();
    } else if (event.key === "F2") {
      event.preventDefault();
      selectLayer(true);
    }
  });
  item.addEventListener("dragenter", (event) => {
    if (!canDropLayerOnArtboard(record)) return;
    event.preventDefault();
    item.classList.add("is-drop-target");
  });
  item.addEventListener("dragover", (event) => {
    if (!canDropLayerOnArtboard(record)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    item.classList.add("is-drop-target");
  });
  item.addEventListener("dragleave", (event) => {
    if (event.relatedTarget instanceof Node && item.contains(event.relatedTarget)) return;
    item.classList.remove("is-drop-target");
  });
  item.addEventListener("drop", (event) => dropLayerOnArtboard(event, record));
  return item;
}

function renderComponentList() {
  const frameRecords = artboards.filter((record) => !record.isCanvas);
  const looseRecord = canvasRecord();
  const hasLooseComponents = Boolean(looseRecord?.components.length);
  if (!frameRecords.length && !hasLooseComponents) {
    componentList.innerHTML = `<div class="component-item layer-empty"><span>No layers yet</span><small>Create an artboard or draw a layer</small></div>`;
    return;
  }

  componentList.innerHTML = "";
  looseRecord?.components.forEach((component) => {
    componentList.appendChild(createComponentLayerItem(looseRecord, component));
  });
  frameRecords.forEach((record) => {
    componentList.appendChild(createArtboardLayerItem(record));
    if (record.expanded === false) return;
    record.components.forEach((component) => {
      componentList.appendChild(createComponentLayerItem(record, component, true));
    });
  });
}

function renderRegionListForSelection(component) {
  regionList.innerHTML = "";
  if (!component || selectedIds.length !== 1) {
    regionList.innerHTML = `<div class="region-item is-empty"><span>One component required</span><small>Select one layer</small></div>`;
    return;
  }

  const regions = component.regions || [];
  if (!regions.length) {
    regionList.innerHTML = `<div class="region-item is-empty"><span>No detail areas</span><small>Add Ellipse, Rect, or Brush</small></div>`;
    return;
  }

  regions.forEach((region) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `region-item${selectedRegionId === region.id ? " is-selected" : ""}`;
    item.innerHTML = `<span>${escapeHtml(region.name)}</span><small>${regionEffectLabels[region.effect] || region.effect}</small>`;
    item.addEventListener("click", () => {
      selectedRegionId = region.id;
      render();
    });
    regionList.appendChild(item);
  });
}

function setRegionControlsDisabled(disabled, regionDisabled = disabled) {
  addRegionButtons.forEach((button) => { button.disabled = disabled; });
  regionControls.forEach((control) => { control.disabled = regionDisabled; });
  previewRegionButton.disabled = regionDisabled;
  removeRegionButton.disabled = regionDisabled;
}

function syncRegionOutputs() {
  regionXOutput.textContent = regionXRange.value;
  regionYOutput.textContent = regionYRange.value;
  regionWOutput.textContent = regionWRange.value;
  regionHOutput.textContent = regionHRange.value;
  regionStrengthOutput.textContent = regionStrengthRange.value;
  regionSoftnessOutput.textContent = regionSoftnessRange.value;
  regionAngleOutput.textContent = regionAngleRange.value;
  regionSpeedOutput.textContent = regionSpeedRange.value;
  regionRangeControls.forEach(updateRangeFill);
}

function syncRegionControlsFromSelection(selected, component) {
  const singleComponent = component && selected.length === 1;
  const region = singleComponent ? selectedRegion(component) : null;
  renderRegionListForSelection(singleComponent ? component : null);

  if (!singleComponent) {
    setRegionControlsDisabled(true);
    syncRegionOutputs();
    return;
  }

  if (!region) {
    setRegionControlsDisabled(false, true);
    syncRegionOutputs();
    return;
  }

  regionShapeSelect.value = region.shape;
  regionTriggerSelect.value = region.trigger;
  regionEffectSelect.value = region.effect;
  regionXRange.value = roundValue(region.x);
  regionYRange.value = roundValue(region.y);
  regionWRange.value = roundValue(region.w);
  regionHRange.value = roundValue(region.h);
  regionStrengthRange.value = Math.round(region.strength);
  regionSoftnessRange.value = Math.round(region.softness);
  regionAngleRange.value = Math.round(region.angle);
  regionSpeedRange.value = Math.round(region.speed);
  setRegionControlsDisabled(false, false);
  syncRegionOutputs();
}

function addRegionToSelected(shape = "ellipse") {
  const component = selectedComponent();
  if (!component || selectedIds.length !== 1) return;

  saveHistory();
  component.regions = cloneRegions(component.regions);
  const region = normalizeRegion({
    ...defaultRegion,
    shape,
    name: `${regionShapeLabels[shape] || "Area"} ${component.regions.length + 1}`,
    x: 34,
    y: 34,
    effect: shape === "brush" ? "smear" : "bulge",
    trigger: shape === "brush" ? "drag" : "hover",
    softness: shape === "brush" ? 78 : defaultRegion.softness
  }, component.regions.length);
  component.regions.push(region);
  selectedRegionId = region.id;
  render();
}

function removeSelectedRegion() {
  const component = selectedComponent();
  const region = selectedRegion(component);
  if (!component || !region) return;

  saveHistory();
  clearActiveRegionEffects(component.id);
  component.regions = (component.regions || []).filter((item) => item.id !== region.id);
  selectedRegionId = component.regions[0]?.id || null;
  render();
}

function updateSelectedRegionFromControls() {
  const component = selectedComponent();
  const region = selectedRegion(component);
  if (!component || !region || selectedIds.length !== 1) return;

  saveHistory();
  region.shape = regionShapeSelect.value in regionShapeLabels ? regionShapeSelect.value : defaultRegion.shape;
  region.trigger = regionTriggerSelect.value in regionTriggerLabels ? regionTriggerSelect.value : defaultRegion.trigger;
  region.effect = regionEffectSelect.value in regionEffectLabels ? regionEffectSelect.value : defaultRegion.effect;
  region.x = Number(regionXRange.value);
  region.y = Number(regionYRange.value);
  region.w = Number(regionWRange.value);
  region.h = Number(regionHRange.value);
  region.strength = Number(regionStrengthRange.value);
  region.softness = Number(regionSoftnessRange.value);
  region.angle = Number(regionAngleRange.value);
  region.speed = Number(regionSpeedRange.value);
  clampRegion(region);
  render();
}

function previewSelectedRegion() {
  const component = selectedComponent();
  const region = selectedRegion(component);
  if (!component || !region) return;
  activateRegion(component.id, region.id);
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
  const config = effectControlConfigs[effect] || effectControlConfigs.none;
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
  const guideSelection = selectedGuides();
  const artboardSelection = selectedArtboardRecords();
  scheduleRulerRender();
  const component = guideSelection.length ? null : selectedComponent();
  const guide = selectedGuide();
  const totalSelectionCount = selected.length + guideSelection.length;
  alignmentButtons.forEach((button) => {
    button.disabled = !selected.length || Boolean(guideSelection.length);
  });
  updateInspectorVisibility(component);

  if (!component) {
    selectedSummary.textContent = artboardSelection.length > 1
      ? `${artboardSelection.length} artboards selected`
      : artboardSelection.length === 1
      ? artboardSelection[0].name
      : totalSelectionCount > 1
      ? `${totalSelectionCount} selected`
      : guide
      ? `${guide.orientation === "vertical" ? "Vertical" : "Horizontal"} guide / ${Math.round(guide.position)}px`
      : activeArtboardRecord()?.name || "None";
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
    syncRegionControlsFromSelection(selected, component);
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
  syncRegionControlsFromSelection(selected, component);

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
  const region = selectedRegion(component);
  selectedSummary.textContent = selected.length > 1 ? `${selected.length} selected` : region ? `${component.name} / ${region.name}` : component.name;
  effectSummary.textContent = component.actions?.length
    ? `${triggerLabels[component.trigger]} + ${component.actions.length} actions`
    : `${triggerLabels[component.trigger]} + ${effectLabels[component.effect] || "None"}`;
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

function clearCssEffectClasses(node) {
  effectClasses.forEach((className) => node.classList.remove(className));
}

function stopCssEffectRun(id, shouldResetNode = true) {
  const run = activeCssEffectRuns.get(id);
  if (!run) return;
  window.clearTimeout(run.timer);
  activeCssEffectRuns.delete(id);

  if (shouldResetNode) {
    const node = componentLayer.querySelector(`[data-id="${id}"]`);
    if (node) clearCssEffectClasses(node);
  }
}

function syncCanvasWithRunningComponentEffect(canvas, component) {
  const run = activeCssEffectRuns.get(component.id);
  if (!run) return;
  const elapsed = Math.max(0, performance.now() - run.start);
  if (elapsed > run.duration + 100) return;
  canvas.style.setProperty("--effect-sync-delay", `${-elapsed}ms`);
  canvas.dataset.componentEffect = run.effect;
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
  Array.from(activeCssEffectRuns.keys()).forEach((id) => stopCssEffectRun(id));
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

  stopCssEffectRun(component.id, false);
  clearCssEffectClasses(node);
  void node.offsetWidth;

  if (component.actions?.length) {
    runActionStack(component, node);
    return;
  }

  playComponentSound(component);
  if (!component.effect || component.effect === "none") return;
  const effectClass = `effect-${component.effect}`;
  node.classList.add(effectClass);

  const duration = Number.parseFloat(getComputedStyle(node).getPropertyValue("--effect-duration")) || 560;
  const cleanupDelay = component.effect === "reveal" ? 1700 : duration + 80;
  const run = {
    effect: component.effect,
    className: effectClass,
    start: performance.now(),
    duration,
    timer: 0
  };
  run.timer = window.setTimeout(() => {
    if (activeCssEffectRuns.get(component.id) !== run) return;
    node.classList.remove(effectClass);
    activeCssEffectRuns.delete(component.id);
  }, cleanupDelay);
  activeCssEffectRuns.set(component.id, run);
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
      regions: duplicateRegions(copied.regions),
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
  cancelBrushDrawMode();
  ids.forEach((id) => {
    stopComponentActionRun(id);
    clearActiveRegionEffects(id);
  });
  components = components.filter((component) => !ids.has(component.id));
  setSelection([]);
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  updateArtboardEmptyState();
  render();
}

function removeSelectedArtboard() {
  const records = selectedArtboardRecords();
  if (!records.length) return false;

  saveHistory();
  cancelBrushDrawMode();
  records.forEach((record) => {
    record.components.forEach((component) => {
      stopComponentActionRun(component.id);
      clearActiveRegionEffects(component.id);
    });
  });

  const frameRecords = artboards.filter((item) => !item.isCanvas);
  const ids = new Set(records.map((record) => record.id));
  const frameIndex = Math.min(...records.map((record) => frameRecords.findIndex((item) => item.id === record.id)));
  records.forEach((record) => {
    record.frame?.remove();
    record.artboardGuideLayer?.remove();
  });
  artboards = artboards.filter((item) => !ids.has(item.id));
  clearArtboardSelection();

  const remainingFrames = artboards.filter((item) => !item.isCanvas);
  const nextRecord = remainingFrames[Math.min(frameIndex, remainingFrames.length - 1)] || canvasRecord() || null;
  setActiveArtboardRefs(nextRecord);
  artboards.forEach((item) => {
    const isActive = item.id === nextRecord?.id;
    item.frame?.classList.toggle("is-active", isActive);
    item.artboardGuideLayer?.classList.toggle("is-active", isActive);
  });

  updateArtboardEmptyState();
  if (nextRecord) {
    syncArtboardInputs();
    applyArtboardVisual(nextRecord);
    refreshWorkspaceBounds({ preserveViewport: true });
    render();
  } else {
    refreshWorkspaceBounds({ preserveViewport: true });
    syncArtboardInputs();
    renderComponentList();
    syncControlsFromSelection();
  }
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  return true;
}

function removeCombinedSelection() {
  const componentIds = new Set(selectedIds);
  const guideIds = new Set(selectedGuideIds);
  if (!componentIds.size || !guideIds.size) return false;

  saveHistory();
  cancelBrushDrawMode();
  componentIds.forEach((id) => {
    stopComponentActionRun(id);
    clearActiveRegionEffects(id);
  });
  components = components.filter((component) => !componentIds.has(component.id));
  guides = guides.filter((guide) => !guideIds.has(guide.id));
  setSelection([]);
  setGuideSelection([]);
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  updateArtboardEmptyState();
  render();
  return true;
}

function syncStagePanMode() {
  document.body.classList.toggle("is-space-panning", isSpacePanning);
  document.body.classList.toggle("is-stage-panning", Boolean(stagePanState));
}

function handleStageWheel(event) {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  event.stopPropagation();
  const targetSurface = event.target instanceof Element ? event.target.closest(".art-surface") : null;
  const targetArtboardId = Number(targetSurface?.dataset.artboardId);
  if (targetArtboardId && targetArtboardId !== activeArtboardId) activateArtboard(targetArtboardId);
  const direction = event.deltaY < 0 ? 1 : -1;
  const factor = direction > 0 ? 1.12 : 1 / 1.12;
  setBoardZoom(boardZoom * factor, event);
}

function startStagePan(event) {
  if (!isSpacePanning || event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  stagePanState = {
    startX: event.clientX,
    startY: event.clientY,
    scrollLeft: stage.scrollLeft,
    scrollTop: stage.scrollTop
  };
  syncStagePanMode();
  window.addEventListener("pointermove", handleStagePanMove);
  window.addEventListener("pointerup", handleStagePanUp, { once: true });
}

function handleStagePanMove(event) {
  if (!stagePanState) return;
  event.preventDefault();
  stage.scrollLeft = stagePanState.scrollLeft - (event.clientX - stagePanState.startX);
  stage.scrollTop = stagePanState.scrollTop - (event.clientY - stagePanState.startY);
}

function handleStagePanUp() {
  window.removeEventListener("pointermove", handleStagePanMove);
  stagePanState = null;
  syncStagePanMode();
}

function isTextEntryTarget(target) {
  if (!(target instanceof Element)) return false;
  if (target.closest("textarea, [contenteditable='true']")) return true;
  if (!(target instanceof HTMLInputElement)) return false;
  return ["text", "number", "search", "email", "url", "tel", "password"].includes(target.type);
}

function handleEditorShortcut(event) {
  const key = event.key.toLowerCase();
  const isTextEntry = isTextEntryTarget(event.target);

  if (!isTextEntry && event.key === "Escape" && activeInsertTool) {
    event.preventDefault();
    cancelInsertTool();
    return;
  }

  if (!isTextEntry && (event.ctrlKey || event.metaKey) && key === "r") {
    event.preventDefault();
    toggleRulers();
    return;
  }

  if (!isTextEntry && event.key === "Alt") {
    event.preventDefault();
    if (!hasActiveEditorGesture()) {
      if (lastCanvasPointer) {
        renderFigmaMeasurementAtPoint(lastCanvasPointer.clientX, lastCanvasPointer.clientY);
      } else if (selectedGuide()) {
        showMeasurementGuides(guideFigmaMeasurements(selectedGuide()));
      }
    }
    return;
  }

  if (!isTextEntry && event.code === "Space") {
    event.preventDefault();
    if (!isSpacePanning) {
      isSpacePanning = true;
      syncStagePanMode();
    }
    return;
  }

  if ((event.ctrlKey || event.metaKey) && key === "z") {
    event.preventDefault();
    undoLastAction();
    return;
  }

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
    if (removeSelectedArtboard()) return;
    if (removeCombinedSelection()) return;
    if (removeSelectedGuide()) return;
    if (selectedRegion()) {
      removeSelectedRegion();
      return;
    }
    removeSelectedComponent();
  }
}

function handleEditorKeyUp(event) {
  if (event.key === "Alt") {
    clearMeasurementGuides();
    return;
  }
  if (event.code === "Space") {
    isSpacePanning = false;
    syncStagePanMode();
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

function alignSelectedComponents(alignment) {
  const selected = selectedComponents();
  const ownerRecord = activeArtboardRecord();
  const ownerSurface = ownerRecord?.surface;
  const ownerLayer = ownerRecord?.componentLayer;
  if (!selected.length || selectedGuides().length || !ownerSurface || !ownerLayer) return;
  const ownerLayerRect = ownerLayer.getBoundingClientRect();
  if (!ownerLayerRect.width || !ownerLayerRect.height) return;
  const entries = selected.map((component) => ({
    component,
    node: ownerLayer.querySelector(`[data-id="${component.id}"]`)
  })).filter((entry) => entry.node).map((entry) => ({
    ...entry,
    rect: entry.node.getBoundingClientRect()
  }));
  if (!entries.length) return;

  let parentSurface = ownerSurface;
  if (ownerRecord.isCanvas && entries.length === 1) {
    const rect = entries[0].rect;
    parentSurface = artboardAtPoint((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2)?.surface || ownerSurface;
  }
  const parentRect = parentSurface.getBoundingClientRect();

  const reference = entries.length === 1
    ? {
      left: parentRect.left + parentSurface.clientLeft,
      right: parentRect.left + parentSurface.clientLeft + parentSurface.clientWidth,
      top: parentRect.top + parentSurface.clientTop,
      bottom: parentRect.top + parentSurface.clientTop + parentSurface.clientHeight
    }
    : {
      left: Math.min(...entries.map((entry) => entry.rect.left)),
      right: Math.max(...entries.map((entry) => entry.rect.right)),
      top: Math.min(...entries.map((entry) => entry.rect.top)),
      bottom: Math.max(...entries.map((entry) => entry.rect.bottom))
    };
  const referenceCenterX = (reference.left + reference.right) / 2;
  const referenceCenterY = (reference.top + reference.bottom) / 2;
  saveHistory();

  entries.forEach(({ component, rect }) => {
    let dx = 0;
    let dy = 0;
    if (alignment === "left") dx = reference.left - rect.left;
    else if (alignment === "horizontal-center") dx = referenceCenterX - (rect.left + rect.right) / 2;
    else if (alignment === "right") dx = reference.right - rect.right;
    else if (alignment === "top") dy = reference.top - rect.top;
    else if (alignment === "vertical-center") dy = referenceCenterY - (rect.top + rect.bottom) / 2;
    else if (alignment === "bottom") dy = reference.bottom - rect.bottom;
    component.x += dx / ownerLayerRect.width * 100;
    component.y += dy / ownerLayerRect.height * 100;
    clampComponent(component);
  });
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
  if (componentLayer) clearActiveRegionEffects();
  cancelBrushDrawMode();
  cancelInsertTool();
  clearArtboards();
  nextId = 1;
  nextRegionId = 1;
  nextArtboardId = 1;
  nextGuideId = 1;
  clearArtboardSelection();
  selectedRegionId = null;
  selectedGuideId = null;
  selectedGuideIds = [];
  interactions = 0;
  dragState = null;
  resizeState = null;
  cornerRadiusState = null;
  curveHandleState = null;
  regionDragState = null;
  brushDrawComponentId = null;
  brushDrawState = null;
  window.removeEventListener("pointermove", handleArtboardDragMove);
  window.removeEventListener("pointermove", handleWorkspaceMarqueeMove);
  window.removeEventListener("pointermove", handleGuideDragMove);
  window.removeEventListener("pointermove", handleRulerGuideDragMove);
  artboardDragState = null;
  workspaceMarqueeNode?.remove();
  workspaceMarqueeNode = null;
  workspaceMarqueeState = null;
  artboardDragDidMove = false;
  guideDragState = null;
  rulerGuideDragState?.preview?.remove();
  rulerGuideDragState = null;
  measurementGuidesVisible = false;
  lastCanvasPointer = null;
  document.body.classList.remove("is-artboard-dragging");
  isSpacePanning = false;
  stagePanState = null;
  boardZoom = 1;
  rulersVisible = false;
  rulerOverlay.classList.add("is-hidden");
  syncBrushDrawButtonState();
  syncStagePanMode();
  artboard = { ...defaultArtboard };
  syncArtboardInputs();
  componentInput.value = "";
  clearSmartGuides();
  updateArtboardEmptyState();
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
addArtboardButton.addEventListener("click", () => {
  cancelInsertTool();
  createArtboard();
});
shapeButtons.forEach((button) => button.addEventListener("click", () => activateInsertTool({ kind: "shape", shape: button.dataset.shape })));
addTextButton.addEventListener("click", () => activateInsertTool({ kind: "text" }));
addHorizontalGuideButton.addEventListener("click", () => activateInsertTool({ kind: "guide", orientation: "horizontal" }));
addVerticalGuideButton.addEventListener("click", () => activateInsertTool({ kind: "guide", orientation: "vertical" }));
alignmentButtons.forEach((button) => button.addEventListener("click", () => alignSelectedComponents(button.dataset.align)));
bringFrontButton.addEventListener("click", bringSelectedFront);
duplicateButton.addEventListener("click", duplicateSelected);
testEffectButton.addEventListener("click", () => {
  const component = selectedComponent();
  const region = selectedRegion(component);
  if (component && region) {
    activateRegion(component.id, region.id);
    return;
  }
  selectedComponents().forEach((component) => triggerComponent(component.id));
});
testSoundButton.addEventListener("click", () => {
  stopActiveSounds();
  selectedComponents().forEach(playComponentSound);
});
window.addEventListener("keydown", handleEditorShortcut);
window.addEventListener("keyup", handleEditorKeyUp);
stage.addEventListener("wheel", handleStageWheel, { passive: false, capture: true });
stage.addEventListener("pointerdown", startStagePan, { capture: true });
stage.addEventListener("pointermove", handleMeasurementPointerMove);
stage.addEventListener("pointerleave", handleMeasurementPointerLeave);
stage.addEventListener("scroll", scheduleRulerRender, { passive: true });
artboardWorkspace.addEventListener("pointerdown", startWorkspaceInsertDraw);
artboardWorkspace.addEventListener("pointerdown", startWorkspaceMarqueeSelection);
horizontalRuler.addEventListener("pointerdown", (event) => startRulerGuideDrag(event, "horizontal"));
verticalRuler.addEventListener("pointerdown", (event) => startRulerGuideDrag(event, "vertical"));
window.addEventListener("resize", scheduleRulerRender);
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

addRegionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.regionShape === "brush") {
      beginBrushDrawMode();
      return;
    }
    cancelBrushDrawMode();
    addRegionToSelected(button.dataset.regionShape);
  });
});
previewRegionButton.addEventListener("click", previewSelectedRegion);
removeRegionButton.addEventListener("click", removeSelectedRegion);
regionControls.forEach((control) => {
  const handleRegionControlChange = () => {
    syncRegionOutputs();
    updateSelectedRegionFromControls();
  };
  control.addEventListener("input", handleRegionControlChange);
  control.addEventListener("change", handleRegionControlChange);
});

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
