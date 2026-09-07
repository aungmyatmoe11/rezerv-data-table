import { useMemo, useSyncExternalStore } from "react";
import type { Breakpoint } from "../core/types";

/** Ant Design breakpoints ("at least" semantics; `xs` is the sub-576px band). */
const QUERIES: Record<Breakpoint, string> = {
  xs: "(max-width: 575.98px)",
  sm: "(min-width: 576px)",
  md: "(min-width: 768px)",
  lg: "(min-width: 992px)",
  xl: "(min-width: 1200px)",
  xxl: "(min-width: 1600px)",
};

const ORDER: readonly Breakpoint[] = ["xs", "sm", "md", "lg", "xl", "xxl"];

function snapshot(): string {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "";
  return ORDER.filter((bp) => window.matchMedia(QUERIES[bp]).matches).join(",");
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => undefined;
  const lists = ORDER.map((bp) => window.matchMedia(QUERIES[bp]));
  for (const list of lists) list.addEventListener("change", callback);
  return () => {
    for (const list of lists) list.removeEventListener("change", callback);
  };
}

const noop = (): (() => void) => () => undefined;
const empty = (): string => "";

/**
 * Active breakpoints for `column.responsive`. Subscribes to `matchMedia` only when some
 * column actually declares `responsive`; returns `null` otherwise (and during SSR).
 */
export function useBreakpoints(enabled: boolean): ReadonlySet<Breakpoint> | null {
  const key = useSyncExternalStore(enabled ? subscribe : noop, enabled ? snapshot : empty, empty);
  return useMemo(() => (enabled && key !== "" ? new Set(key.split(",") as Breakpoint[]) : null), [enabled, key]);
}
