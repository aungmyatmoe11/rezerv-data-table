"use client";

/**
 * Maps the `theme` prop onto the `--dt-*` custom properties on the scroller. Theming
 * happens in CSS from there on: no token object is read during render.
 */
import { useMemo, type CSSProperties } from "react";
import type { TableTheme } from "../core/types";

type CssVars = CSSProperties & Record<`--dt-${string}`, string>;

/**
 * Maps the table's `--dt-*` custom properties onto the design-system tokens in `@/lib/ui/ui.css`,
 * so a table follows the app's light / dark theme through CSS alone — no token objects read in
 * JavaScript, which also means the server and the browser produce identical markup.
 * The `theme` prop overrides individual values per table instance.
 */
export function useTableCssVars(overrides: Partial<TableTheme> | undefined): CSSProperties {
  return useMemo<CssVars>(
    () => ({
      "--dt-header-bg": overrides?.headerBg ?? "var(--ui-fill-alter)",
      "--dt-header-color": overrides?.headerColor ?? "var(--ui-text)",
      "--dt-row-bg": overrides?.rowBg ?? "var(--ui-bg)",
      "--dt-hover-bg": overrides?.hoverRowBg ?? "var(--ui-fill-tertiary)",
      "--dt-selected-bg": overrides?.selectedRowBg ?? "var(--ui-primary-soft)",
      "--dt-sorted-bg": overrides?.sortedColumnBg ?? "var(--ui-fill-secondary)",
      "--dt-sorted-header-bg": overrides?.sortedHeaderBg ?? "var(--ui-fill)",
      "--dt-sort-idle": "var(--ui-text-disabled)",
      "--dt-border": overrides?.borderColor ?? "var(--ui-border-soft)",
      "--dt-text": "var(--ui-text)",
      "--dt-text-secondary": "var(--ui-text-secondary)",
      "--dt-primary": "var(--ui-primary)",
      "--dt-error": "var(--ui-danger)",
      "--dt-shadow": overrides?.stickyShadow ?? "rgba(0, 0, 0, 0.16)",
      "--dt-radius": `${overrides?.radius ?? 8}px`,
      "--dt-font-size": `${overrides?.fontSize ?? 14}px`,
      "--dt-fixed-gap": `${overrides?.fixedColumnGap ?? 0}px`,
      "--dt-skeleton": "var(--ui-fill)",
      "--dt-skeleton-shine": "var(--ui-fill-secondary)",
    }),
    [overrides],
  );
}
