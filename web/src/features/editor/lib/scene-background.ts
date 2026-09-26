import type {
  ArtboardSettings,
  EditorPage,
  SceneBackgroundKey,
  SceneBackgroundSettings,
} from "@/features/editor/store/editor-store";

/**
 * Scene backgrounds.
 *
 * The artboard keeps the common background. A scene that sets its own keeps a
 * complete copy of the background fields in `page.background`; every other
 * artboard setting (size, page type, viewport, corners) stays common. A new
 * scene uses the common background until its own is edited, and "Apply to all
 * scenes" makes one scene's background the common one again.
 */

// A record keyed by every SceneBackgroundKey, so the list cannot miss a field.
const SCENE_BACKGROUND_KEY_SET: Record<SceneBackgroundKey, true> = {
  background: true,
  backgroundAutoPlay: true,
  backgroundGradientEnabled: true,
  backgroundImage: true,
  backgroundImageFit: true,
  backgroundImageOpacity: true,
  backgroundLoop: true,
  backgroundMediaPreview: true,
  backgroundMediaPreviewSource: true,
  backgroundMediaType: true,
  backgroundMute: true,
  backgroundOpacity: true,
  backgroundRotateWithCamera: true,
  backgroundSolidEnabled: true,
  backgroundType: true,
  backgroundVideo: true,
  gradientAngle: true,
  gradientEndColor: true,
  gradientEndOpacity: true,
  gradientStartColor: true,
  gradientStartOpacity: true,
  gradientStops: true,
  gradientType: true,
};

export const SCENE_BACKGROUND_KEYS = Object.keys(
  SCENE_BACKGROUND_KEY_SET,
) as SceneBackgroundKey[];

export function isSceneBackgroundKey(key: string): key is SceneBackgroundKey {
  return Object.prototype.hasOwnProperty.call(SCENE_BACKGROUND_KEY_SET, key);
}

/** A copy of the background fields that are set in `settings`. */
export function sceneBackgroundOf(
  settings: SceneBackgroundSettings,
): SceneBackgroundSettings {
  const copy: Record<string, unknown> = {};
  for (const key of SCENE_BACKGROUND_KEYS) {
    const value = settings[key];
    if (value === undefined) continue;
    copy[key] =
      key === "gradientStops" && Array.isArray(value)
        ? value.map((stop) => ({ ...stop }))
        : value;
  }
  return copy as SceneBackgroundSettings;
}

/**
 * The artboard with its background fields replaced by `background`. Fields the
 * scene leaves unset fall back to their defaults, not to the common value, so
 * a saved and reopened scene looks the same.
 */
export function withSceneBackground(
  artboard: ArtboardSettings,
  background: SceneBackgroundSettings,
): ArtboardSettings {
  const settings: Record<string, unknown> = { ...artboard };
  for (const key of SCENE_BACKGROUND_KEYS) delete settings[key];
  return {
    ...(settings as ArtboardSettings),
    ...sceneBackgroundOf(background),
  };
}

// The same artboard and scene background always give the same object, so
// memoized thumbnails, the navigator and the canvas only re-render on change.
const sceneArtboards = new WeakMap<
  ArtboardSettings,
  WeakMap<SceneBackgroundSettings, ArtboardSettings>
>();

/** The artboard as `page` shows it: common settings with its own background. */
export function artboardForScene(
  artboard: ArtboardSettings,
  page?: Pick<EditorPage, "background"> | null,
): ArtboardSettings {
  const background = page?.background;
  if (!background) return artboard;
  let byBackground = sceneArtboards.get(artboard);
  if (!byBackground) {
    byBackground = new WeakMap();
    sceneArtboards.set(artboard, byBackground);
  }
  let merged = byBackground.get(background);
  if (!merged) {
    merged = withSceneBackground(artboard, background);
    byBackground.set(background, merged);
  }
  return merged;
}

/** The background `page` shows, as a standalone copy. */
export function effectiveSceneBackground(
  artboard: ArtboardSettings,
  page?: Pick<EditorPage, "background"> | null,
): SceneBackgroundSettings {
  return sceneBackgroundOf(page?.background ?? artboard);
}

function isGradientStop(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const stop = value as Record<string, unknown>;
  return (
    typeof stop.color === "string" &&
    typeof stop.opacity === "number" &&
    typeof stop.position === "number"
  );
}

/**
 * Reads a scene background from a saved document. Anything that is not a
 * background object is dropped, so the scene falls back to the common one.
 */
export function normalizeSceneBackground(
  value: unknown,
): SceneBackgroundSettings | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.background !== "string") return undefined;
  const background: Record<string, unknown> = {};
  for (const key of SCENE_BACKGROUND_KEYS) {
    const field = record[key];
    if (field === undefined || field === null) continue;
    if (key === "gradientStops") {
      if (Array.isArray(field) && field.every(isGradientStop)) {
        background[key] = field;
      }
      continue;
    }
    if (typeof field === "object") continue;
    background[key] = field;
  }
  return sceneBackgroundOf(background as SceneBackgroundSettings);
}
