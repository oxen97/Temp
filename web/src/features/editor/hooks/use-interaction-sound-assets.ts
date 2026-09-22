import { useCallback, useEffect, useRef } from "react";

import {
  normalizedInteractionSound,
  type SoundTarget,
} from "@/features/editor/lib/sound-settings";
import {
  type BackgroundMusicAsset,
  defaultInteractionSoundSettings,
  type InteractionSoundSettings,
  useEditorStore,
} from "@/features/editor/store/editor-store";

export function useInteractionSoundAssets() {
  const {
    clipboard,
    future,
    pages,
    past,
    setBackgroundMusicArtwork,
    updateElement,
    updateObject3D,
  } = useEditorStore();
  const backgroundMusicObjectUrlsRef = useRef(new Set<string>());
  const editorMountedRef = useRef(true);

  const findSoundTarget = useCallback((id: string): SoundTarget | undefined => {
    for (const page of useEditorStore.getState().pages) {
      const target =
        page.elements.find((element) => element.id === id) ??
        page.objects3d?.find((object) => object.id === id);
      if (target) return target;
    }
  }, []);

  const updateSoundTarget = useCallback(
    (
      id: string,
      updates: Pick<
        SoundTarget,
        "interactionSounds" | "interactionSoundExpanded"
      >,
    ) => {
      const target = findSoundTarget(id);
      if (target?.type === "object3d") updateObject3D(id, updates);
      else if (target) updateElement(id, updates);
    },
    [findSoundTarget, updateElement, updateObject3D],
  );

  const createBackgroundMusicObjectUrl = useCallback((file: Blob) => {
    const source = URL.createObjectURL(file);
    backgroundMusicObjectUrlsRef.current.add(source);
    return source;
  }, []);

  const updateInteractionSoundForElements = useCallback(
    (elementIds: string[], settings: InteractionSoundSettings) => {
      elementIds.forEach((elementId) => {
        const existingSettings = findSoundTarget(elementId)?.interactionSounds;
        updateSoundTarget(elementId, {
          interactionSounds: [
            {
              ...settings,
              assets: settings.assets.map((asset) => ({ ...asset })),
            },
            ...(existingSettings?.slice(1).map((sound) => ({
              ...sound,
              assets: sound.assets.map((asset) => ({ ...asset })),
            })) ?? []),
          ],
        });
      });
    },
    [findSoundTarget, updateSoundTarget],
  );

  const appendInteractionSoundAssetsForElements = useCallback(
    (elementIds: string[], assets: BackgroundMusicAsset[]) => {
      elementIds.forEach((elementId) => {
        const currentElement = findSoundTarget(elementId);
        const existingSettings = currentElement?.interactionSounds;
        const primarySettings = normalizedInteractionSound(
          existingSettings?.[0],
        );
        updateSoundTarget(elementId, {
          interactionSounds: [
            {
              ...primarySettings,
              soundSource: "multiple",
              assets: [
                ...primarySettings.assets.map((asset) => ({ ...asset })),
                ...assets.map((asset) => ({ ...asset })),
              ],
            },
            ...(existingSettings?.slice(1).map((sound) => ({
              ...sound,
              assets: sound.assets.map((asset) => ({ ...asset })),
            })) ?? []),
          ],
        });
      });
    },
    [findSoundTarget, updateSoundTarget],
  );

  const applyCommonInteractionSoundAssetForElements = useCallback(
    (elementIds: string[], asset: BackgroundMusicAsset) => {
      elementIds.forEach((elementId) => {
        const currentElement = findSoundTarget(elementId);
        const existingSettings = currentElement?.interactionSounds;
        const primarySettings = normalizedInteractionSound(
          existingSettings?.[0],
        );
        updateSoundTarget(elementId, {
          interactionSounds: [
            {
              ...primarySettings,
              assets:
                primarySettings.soundSource === "multiple"
                  ? [
                      ...primarySettings.assets.map((existingAsset) => ({
                        ...existingAsset,
                      })),
                      { ...asset },
                    ]
                  : [{ ...asset }],
            },
            ...(existingSettings?.slice(1).map((sound) => ({
              ...sound,
              assets: sound.assets.map((existingAsset) => ({
                ...existingAsset,
              })),
            })) ?? []),
          ],
        });
      });
    },
    [findSoundTarget, updateSoundTarget],
  );

  const clearInteractionSoundAssetsForElements = useCallback(
    (elementIds: string[]) => {
      elementIds.forEach((elementId) => {
        const currentElement = findSoundTarget(elementId);
        const existingSettings = currentElement?.interactionSounds;
        updateSoundTarget(elementId, {
          interactionSounds: (existingSettings?.length
            ? existingSettings
            : [defaultInteractionSoundSettings]
          ).map((sound) => ({
            ...sound,
            assets: [],
          })),
        });
      });
    },
    [findSoundTarget, updateSoundTarget],
  );

  const deleteInteractionSoundAsset = useCallback(
    (elementId: string, settingIndex: number, assetIndex: number) => {
      const currentElement = findSoundTarget(elementId);
      if (!currentElement?.interactionSounds?.[settingIndex]) return;
      updateSoundTarget(elementId, {
        interactionSounds: currentElement.interactionSounds.map(
          (sound, currentSettingIndex) => ({
            ...sound,
            assets: sound.assets
              .filter(
                (_, currentAssetIndex) =>
                  currentSettingIndex !== settingIndex ||
                  currentAssetIndex !== assetIndex,
              )
              .map((asset) => ({ ...asset })),
          }),
        ),
      });
    },
    [findSoundTarget, updateSoundTarget],
  );

  const replaceInteractionSoundsForElement = useCallback(
    (elementId: string, interactionSounds: InteractionSoundSettings[]) => {
      updateSoundTarget(elementId, {
        interactionSounds: interactionSounds.map((sound) => ({
          ...sound,
          assets: sound.assets.map((asset) => ({ ...asset })),
        })),
      });
    },
    [updateSoundTarget],
  );

  const updateInteractionExpandedForElements = useCallback(
    (elementIds: string[], interactionSoundExpanded: boolean) => {
      elementIds.forEach((elementId) =>
        updateSoundTarget(elementId, { interactionSoundExpanded }),
      );
    },
    [updateSoundTarget],
  );

  const attachBackgroundMusicArtwork = useCallback(
    (pageId: string, assetSrc: string, artwork: Blob) => {
      if (!editorMountedRef.current) return;
      const state = useEditorStore.getState();
      const snapshots = [...state.past, ...state.future];
      const referencedAssets = [
        ...state.pages,
        ...snapshots.flatMap((snapshot) => snapshot.pages),
      ]
        .filter((page) => page.id === pageId)
        .map((page) => page.backgroundMusic?.asset)
        .filter((asset) => asset?.src === assetSrc);
      if (referencedAssets.length === 0) return;
      const existingArtworkSrc = referencedAssets.find(
        (asset) => asset?.artworkSrc,
      )?.artworkSrc;
      if (existingArtworkSrc) {
        setBackgroundMusicArtwork(pageId, assetSrc, existingArtworkSrc);
        return;
      }
      const artworkSrc = createBackgroundMusicObjectUrl(artwork);
      setBackgroundMusicArtwork(pageId, assetSrc, artworkSrc);
    },
    [createBackgroundMusicObjectUrl, setBackgroundMusicArtwork],
  );

  useEffect(() => {
    const referencedSources = new Set<string>();
    const collectSources = (sourcePages: typeof pages) => {
      sourcePages.forEach((page) => {
        const asset = page.backgroundMusic?.asset;
        if (asset) {
          referencedSources.add(asset.src);
          if (asset.artworkSrc) referencedSources.add(asset.artworkSrc);
        }
        page.elements.forEach((element) => {
          element.interactionSounds?.forEach((sound) => {
            sound.assets.forEach((soundAsset) =>
              referencedSources.add(soundAsset.src),
            );
          });
        });
        page.objects3d?.forEach((object) => {
          object.interactionSounds?.forEach((sound) => {
            sound.assets.forEach((soundAsset) =>
              referencedSources.add(soundAsset.src),
            );
          });
        });
      });
    };
    collectSources(useEditorStore.getState().pages);
    past.forEach((snapshot) => collectSources(snapshot.pages));
    future.forEach((snapshot) => collectSources(snapshot.pages));
    useEditorStore.getState().clipboard.forEach((element) => {
      element.interactionSounds?.forEach((sound) => {
        sound.assets.forEach((soundAsset) =>
          referencedSources.add(soundAsset.src),
        );
      });
    });
    const ownedSources = backgroundMusicObjectUrlsRef.current;
    ownedSources.forEach((source) => {
      if (referencedSources.has(source)) return;
      URL.revokeObjectURL(source);
      ownedSources.delete(source);
    });
  }, [clipboard, future, pages, past]);

  useEffect(() => {
    editorMountedRef.current = true;
    const ownedSources = backgroundMusicObjectUrlsRef.current;
    return () => {
      editorMountedRef.current = false;
      ownedSources.forEach((source) => URL.revokeObjectURL(source));
      ownedSources.clear();
    };
  }, []);

  return {
    appendInteractionSoundAssetsForElements,
    applyCommonInteractionSoundAssetForElements,
    attachBackgroundMusicArtwork,
    clearInteractionSoundAssetsForElements,
    createBackgroundMusicObjectUrl,
    deleteInteractionSoundAsset,
    replaceInteractionSoundsForElement,
    updateInteractionExpandedForElements,
    updateInteractionSoundForElements,
  };
}
