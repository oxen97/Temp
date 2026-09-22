import { useCallback, useSyncExternalStore } from "react";

type InterfaceTheme = "light" | "dark";
type ThemeSnapshot = InterfaceTheme | "pending";

const THEME_STORAGE_KEY = "amous-interface-theme";
const THEME_CHANGE_EVENT = "amous-interface-theme-change";

let sessionOverride: InterfaceTheme | null = null;

function readTheme(): ThemeSnapshot {
  if (sessionOverride) return sessionOverride;
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // System preference remains available when storage is blocked.
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function subscribeTheme(onChange: () => void) {
  const query = window.matchMedia?.("(prefers-color-scheme: dark)");
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    sessionOverride = null;
    onChange();
  };
  query?.addEventListener("change", onChange);
  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    query?.removeEventListener("change", onChange);
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

export function useInterfaceTheme() {
  const snapshot = useSyncExternalStore(
    subscribeTheme,
    readTheme,
    () => "pending",
  );
  const themeReady = snapshot !== "pending";
  const theme = themeReady ? snapshot : "light";
  const toggleTheme = useCallback(() => {
    const next: InterfaceTheme = readTheme() === "dark" ? "light" : "dark";
    sessionOverride = next;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Keep the explicit choice for this session.
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  return { theme, themeReady, toggleTheme };
}
