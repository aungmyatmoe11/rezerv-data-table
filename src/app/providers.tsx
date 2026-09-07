"use client";

import { App as AntdApp, ConfigProvider, theme } from "antd";
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
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
      <ConfigProvider
        theme={{
          algorithm: mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: { colorPrimary: BRAND.primary, colorLink: BRAND.primary, borderRadius: BRAND.radius, fontFamily: "var(--font-sans)" },
        }}
      >
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
