"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { ToastProvider } from "@/lib/ui";
import { colorModeStore, type ColorMode } from "./color-mode";

interface ThemeContextValue {
  mode: ColorMode;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ mode: "light", toggle: () => undefined });

export function useColorMode(): ThemeContextValue {
  return useContext(ThemeContext);
}

export const BRAND = {
  primary: "#0f6e56",
  radius: 8,
} as const;

/**
 * Colour mode lives in an external store so the first client render already adopts the saved
 * choice (no setState-in-effect). Theming itself is pure CSS custom properties — there is no
 * component library and no style engine to configure.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const mode = useSyncExternalStore(colorModeStore.subscribe, colorModeStore.getSnapshot, colorModeStore.getServerSnapshot);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const toggle = useCallback(() => colorModeStore.set(mode === "dark" ? "light" : "dark"), [mode]);
  const value = useMemo(() => ({ mode, toggle }), [mode, toggle]);

  return (
    <ThemeContext.Provider value={value}>
      <ToastProvider>{children}</ToastProvider>
    </ThemeContext.Provider>
  );
}
