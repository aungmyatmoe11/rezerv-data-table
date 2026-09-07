"use client";

import { theme as antdTheme } from "antd";
import { useMemo, type CSSProperties } from "react";
import type { TableTheme } from "../core/types";

type CssVars = CSSProperties & Record<`--dt-${string}`, string>;

/**
 * Bridges antd design tokens to the table's own `--dt-*` custom properties, so the
 * table follows `ConfigProvider` theming (light/dark, brand colour) without importing any
 * antd table styles. The `theme` prop overrides individual values.
 */
export function useTableCssVars(overrides: Partial<TableTheme> | undefined): CSSProperties {
  const { token } = antdTheme.useToken();
  return useMemo<CssVars>(() => {
    const vars: CssVars = {
      "--dt-header-bg": overrides?.headerBg ?? token.colorFillAlter,
      "--dt-header-color": overrides?.headerColor ?? token.colorTextHeading,
      "--dt-row-bg": overrides?.rowBg ?? token.colorBgContainer,
      "--dt-hover-bg": overrides?.hoverRowBg ?? token.colorFillTertiary,
      "--dt-selected-bg": overrides?.selectedRowBg ?? token.controlItemBgActive,
      "--dt-sorted-bg": overrides?.sortedColumnBg ?? token.colorFillAlter,
      "--dt-sorted-header-bg": overrides?.sortedHeaderBg ?? token.colorFillSecondary,
      "--dt-border": overrides?.borderColor ?? token.colorBorderSecondary,
      "--dt-text": token.colorText,
      "--dt-text-secondary": token.colorTextSecondary,
      "--dt-primary": token.colorPrimary,
      "--dt-error": token.colorError,
      "--dt-shadow": overrides?.stickyShadow ?? "rgba(0, 0, 0, 0.16)",
      "--dt-radius": `${overrides?.radius ?? token.borderRadiusLG}px`,
      "--dt-font-size": `${overrides?.fontSize ?? token.fontSize}px`,
      "--dt-fixed-gap": `${overrides?.fixedColumnGap ?? 0}px`,
      "--dt-skeleton": token.colorFillContent,
      "--dt-skeleton-shine": token.colorFillSecondary,
    };
    return vars;
  }, [token, overrides]);
}
