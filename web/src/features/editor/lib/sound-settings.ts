import {
  type BackgroundMusicStartMode,
  type CanvasElement,
  defaultInteractionSoundSettings,
  type InteractionSoundEvent,
  type InteractionSoundPlaybackMode,
  type InteractionSoundSettings,
  type InteractionSoundTrigger,
  type SoundOutputQuality,
  type SoundPreloadMode,
} from "@/features/editor/store/editor-store";

export const backgroundMusicStartOptions = [
  { label: "On Page Enter", value: "on-page-enter" },
  { label: "After Delay", value: "after-delay" },
  { label: "On Interaction", value: "on-interaction" },
  { label: "Manual", value: "manual" },
] as const;

export const soundOutputQualityOptions: {
  label: string;
  value: SoundOutputQuality;
}[] = [
  { label: "High (320 kbps)", value: "high" },
  { label: "Medium (192 kbps)", value: "medium" },
  { label: "Low (128 kbps)", value: "low" },
];

export const soundPreloadOptions: { label: string; value: SoundPreloadMode }[] =
  [
    { label: "Auto", value: "auto" },
    { label: "Preload All", value: "all" },
    { label: "On Demand", value: "on-demand" },
  ];

export function isBackgroundMusicStartMode(
  value: string,
): value is BackgroundMusicStartMode {
  return backgroundMusicStartOptions.some((option) => option.value === value);
}

export function isSoundOutputQuality(
  value: string,
): value is SoundOutputQuality {
  return soundOutputQualityOptions.some((option) => option.value === value);
}

export function isSoundPreloadMode(value: string): value is SoundPreloadMode {
  return soundPreloadOptions.some((option) => option.value === value);
}

export function soundPreloadAttribute(mode: SoundPreloadMode) {
  if (mode === "all") return "auto" as const;
  if (mode === "on-demand") return "none" as const;
  return "metadata" as const;
}

export function soundOutputBitrate(quality: SoundOutputQuality) {
  if (quality === "high") return 320;
  if (quality === "medium") return 192;
  return 128;
}

export function formatAudioTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const wholeSeconds = Math.floor(safeSeconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainder = wholeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function formatAudioSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "0.0MB";
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)}MB`;
}

export const interactionSoundTriggerOptions: {
  label: string;
  value: InteractionSoundTrigger;
}[] = [
  { label: "Hover", value: "hover" },
  { label: "Click", value: "click" },
  { label: "Press", value: "press" },
  { label: "Drag", value: "drag" },
  { label: "Scroll", value: "scroll" },
];

export const interactionSoundEvents: Record<
  InteractionSoundTrigger,
  { label: string; value: InteractionSoundEvent }[]
> = {
  click: [
    { label: "Click", value: "click" },
    { label: "Double Click", value: "double-click" },
  ],
  drag: [
    { label: "Drag Start", value: "drag-start" },
    { label: "While Dragging", value: "while-dragging" },
    { label: "Drop", value: "drop" },
  ],
  hover: [
    { label: "Enter", value: "enter" },
    { label: "While Hovering", value: "while-hovering" },
    { label: "Leave", value: "leave" },
  ],
  press: [
    { label: "Press Start", value: "press-start" },
    { label: "While Pressing", value: "while-pressing" },
    { label: "Release", value: "release" },
  ],
  scroll: [
    { label: "While Scrolling", value: "while-scrolling" },
    { label: "Reach Point", value: "reach-point" },
  ],
};

export const interactionSoundPlaybackOptions: {
  label: string;
  value: InteractionSoundPlaybackMode;
}[] = [
  { label: "Shuffle", value: "shuffle" },
  { label: "Sequential", value: "sequential" },
];

export function normalizedInteractionSound(
  settings?: InteractionSoundSettings,
): InteractionSoundSettings {
  return {
    ...defaultInteractionSoundSettings,
    ...settings,
    assets: settings?.assets ? [...settings.assets] : [],
  };
}

export function supportsInteractionSounds(element: CanvasElement) {
  return [
    "rectangle",
    "circle",
    "triangle",
    "star",
    "line",
    "pen",
    "image",
  ].includes(element.type);
}
