import { useCallback, useEffect, useRef } from "react";

import { normalizedInteractionSound } from "@/features/editor/lib/sound-settings";
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
  } = useEditorStore();
  const backgroundMusicObjectUrlsRef = useRef(new Set<string>());
  const editorMountedRef = useRef(true);

  const createBackgroundMusicObjectUrl = useCallback((file: Blob) => {
    const source = URL.createObjectURL(file);
    backgroundMusicObjectUrlsRef.current.add(source);
    return source;
  }, []);

  const updateInteractionSoundForElements = useCallback(
    (elementIds: string[], settings: InteractionSoundSettings) => {
      const currentElements = useEditorStore
        .getState()
        .pages.flatMap((page) => page.elements);
      elementIds.forEach((elementId) => {
        const existingSettings = currentElements.find(
          (element) => element.id === elementId,
        )?.interactionSounds;
        updateElement(elementId, {
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
    [updateElement],
  );

  const appendInteractionSoundAssetsForElements = useCallback(
    (elementIds: string[], assets: BackgroundMusicAsset[]) => {
      elementIds.forEach((elementId) => {
        const currentElement = useEditorStore
          .getState()
          .pages.flatMap((page) => page.elements)
          .find((element) => element.id === elementId);
        const existingSettings = currentElement?.interactionSounds;
        const primarySettings = normalizedInteractionSound(
          existingSettings?.[0],
        );
        updateElement(elementId, {
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
    [updateElement],
  );

  const applyCommonInteractionSoundAssetForElements = useCallback(
    (elementIds: string[], asset: BackgroundMusicAsset) => {
      elementIds.forEach((elementId) => {
        const currentElement = useEditorStore
          .getState()
          .pages.flatMap((page) => page.elements)
          .find((element) => element.id === elementId);
        const existingSettings = currentElement?.interactionSounds;
        const primarySettings = normalizedInteractionSound(
          existingSettings?.[0],
        );
        updateElement(elementId, {
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
    [updateElement],
  );

  const clearInteractionSoundAssetsForElements = useCallback(
    (elementIds: string[]) => {
      elementIds.forEach((elementId) => {
        const currentElement = useEditorStore
          .getState()
          .pages.flatMap((page) => page.elements)
          .find((element) => element.id === elementId);
        const existingSettings = currentElement?.interactionSounds;
        updateElement(elementId, {
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
    [updateElement],
  );

  const deleteInteractionSoundAsset = useCallback(
    (elementId: string, settingIndex: number, assetIndex: number) => {
      const currentElement = useEditorStore
        .getState()
        .pages.flatMap((page) => page.elements)
        .find((element) => element.id === elementId);
      if (!currentElement?.interactionSounds?.[settingIndex]) return;
      updateElement(elementId, {
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
    [updateElement],
  );

  const replaceInteractionSoundsForElement = useCallback(
    (elementId: string, interactionSounds: InteractionSoundSettings[]) => {
      updateElement(elementId, {
        interactionSounds: interactionSounds.map((sound) => ({
          ...sound,
          assets: sound.assets.map((asset) => ({ ...asset })),
        })),
      });
    },
    [updateElement],
  );

  const updateInteractionExpandedForElements = useCallback(
    (elementIds: string[], interactionSoundExpanded: boolean) => {
      elementIds.forEach((elementId) =>
        updateElement(elementId, { interactionSoundExpanded }),
      );
    },
    [updateElement],
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
