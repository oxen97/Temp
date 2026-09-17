import { useCallback, useEffect, useState } from "react";

import {
  INTERFACE_SCALE_STORAGE_KEY,
  LEGACY_INTERFACE_SCALE_STORAGE_KEY,
  type InterfaceScaleMode,
  migrateInterfaceScaleMode,
  resolveInterfaceScale,
} from "@/features/editor/lib/interface-scale";

export function useInterfaceScale() {
  const [interfaceScaleMode, setInterfaceScaleMode] =
    useState<InterfaceScaleMode>("auto");
  const [screenWidthCss, setScreenWidthCss] = useState(0);
  const [viewportWidthCss, setViewportWidthCss] = useState(0);
  const [displayPixelRatio, setDisplayPixelRatio] = useState(1);
  const [interfaceScaleReady, setInterfaceScaleReady] = useState(false);

  const selectInterfaceScale = useCallback((mode: InterfaceScaleMode) => {
    setInterfaceScaleMode(mode);
    try {
      window.localStorage.setItem(INTERFACE_SCALE_STORAGE_KEY, mode);
    } catch {
      // The setting still applies for this session when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    let resolutionQuery: MediaQueryList | null = null;
    const watchResolutionChanges = () => {
      resolutionQuery?.removeEventListener("change", updateDisplayMetrics);
      resolutionQuery =
        typeof window.matchMedia === "function"
          ? window.matchMedia(
              `(resolution: ${Math.max(1, window.devicePixelRatio || 1)}dppx)`,
            )
          : null;
      resolutionQuery?.addEventListener("change", updateDisplayMetrics);
    };
    const updateDisplayMetrics = () => {
      setScreenWidthCss(window.screen?.width || window.innerWidth);
      setViewportWidthCss(window.innerWidth);
      setDisplayPixelRatio(Math.max(1, window.devicePixelRatio || 1));
      watchResolutionChanges();
    };
    let disposed = false;
    let frame = 0;
    const initializeInterface = () => {
      if (disposed) return;
      try {
        const screenWidth = window.screen?.width || window.innerWidth;
        const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
        const mode = migrateInterfaceScaleMode(
          window.localStorage.getItem(INTERFACE_SCALE_STORAGE_KEY),
          window.localStorage.getItem(LEGACY_INTERFACE_SCALE_STORAGE_KEY),
          screenWidth,
          pixelRatio,
        );
        window.localStorage.setItem(INTERFACE_SCALE_STORAGE_KEY, mode);
        setInterfaceScaleMode(mode);
      } catch {
        setInterfaceScaleMode("auto");
      }
      updateDisplayMetrics();
      setInterfaceScaleReady(true);
    };
    const revealAfterFontLoad = () => {
      frame = window.requestAnimationFrame(initializeInterface);
    };
    const fontLoad = document.fonts?.load?.(
      '500 12px "Inter Variable"',
      "AMOUS",
    );
    if (fontLoad) {
      void fontLoad.then(revealAfterFontLoad, revealAfterFontLoad);
    } else {
      revealAfterFontLoad();
    }
    window.addEventListener("resize", updateDisplayMetrics);
    return () => {
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
      resolutionQuery?.removeEventListener("change", updateDisplayMetrics);
      window.removeEventListener("resize", updateDisplayMetrics);
    };
  }, []);

  const resolvedInterfaceScale = resolveInterfaceScale(
    interfaceScaleMode,
    screenWidthCss,
    displayPixelRatio,
  );

  return {
    displayPixelRatio,
    interfaceScaleMode,
    interfaceScaleReady,
    resolvedInterfaceScale,
    selectInterfaceScale,
    viewportWidthCss,
  };
}
