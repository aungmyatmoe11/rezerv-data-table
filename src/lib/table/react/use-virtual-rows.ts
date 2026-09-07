import { useCallback, useMemo, useRef, useSyncExternalStore, type RefObject } from "react";
import type { Key } from "../core/types";

export interface VirtualWindow {
  start: number;
  end: number;
  /** Spacer heights (px) above and below the rendered slice. */
  top: number;
  bottom: number;
  total: number;
}

export interface VirtualOptions {
  enabled: boolean;
  keys: readonly Key[];
  rowHeight: number;
  /** Measured heights for variable rows (expanded regions); everything else is `rowHeight`. */
  heights: ReadonlyMap<Key, number> | null;
  /** Bumped whenever `heights` changes in place. */
  version: number;
  /** Estimate for variable rows that have not been measured yet. */
  estimate: number;
  overscan?: number;
}

const SERVER_WINDOW: VirtualWindow = { start: 0, end: 30, top: 0, bottom: 0, total: 0 };

function lowerBound(offsets: readonly number[], target: number): number {
  let lo = 0;
  let hi = offsets.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((offsets[mid] ?? 0) <= target) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * Hand-written windowing. Subscribes to the scroller through `useSyncExternalStore` and
 * returns a cached `{start, end}` unless the visible index range actually changes — so a
 * scroll that stays inside the current window causes no React render at all.
 *
 * Fixed-height fast path when no row has been measured; prefix sums + binary search otherwise.
 */
export function useVirtualRows(scrollerRef: RefObject<HTMLElement | null>, options: VirtualOptions): VirtualWindow | null {
  const { enabled, keys, rowHeight, heights, version, estimate } = options;
  const overscan = options.overscan ?? 5;
  const count = keys.length;

  // heights Map ကို in-place mutate လုပ်တာမို့ version ကို snapshot ယူပြီး memo dependency အဖြစ်သုံးတယ်
  const snapshot = useMemo(() => (heights === null || heights.size === 0 ? null : { heights, version }), [heights, version]);
  const offsets = useMemo<readonly number[] | null>(() => {
    if (!enabled || snapshot === null) return null;
    const { heights } = snapshot;
    const out = new Array<number>(count + 1);
    out[0] = 0;
    for (let i = 0; i < count; i += 1) {
      const key = keys[i];
      const measured = key === undefined ? undefined : heights.get(key);
      out[i + 1] = (out[i] ?? 0) + (measured ?? (key !== undefined && String(key).endsWith("__expanded") ? estimate : rowHeight));
    }
    return out;
  }, [enabled, snapshot, keys, count, rowHeight, estimate]);

  const total = offsets === null ? count * rowHeight : (offsets[count] ?? 0);
  const offsetOf = useCallback((index: number): number => (offsets === null ? index * rowHeight : (offsets[Math.min(index, count)] ?? 0)), [offsets, rowHeight, count]);

  const cache = useRef<VirtualWindow>(SERVER_WINDOW);
  const getSnapshot = useCallback((): VirtualWindow => {
    const el = scrollerRef.current;
    if (!enabled || el === null) {
      const whole = { start: 0, end: count, top: 0, bottom: 0, total };
      if (cache.current.start === 0 && cache.current.end === count && cache.current.total === total && cache.current.top === 0) return cache.current;
      cache.current = whole;
      return whole;
    }
    const scrollTop = Math.max(0, el.scrollTop);
    const viewport = el.clientHeight || 600;
    let start: number;
    let end: number;
    if (offsets === null) {
      start = Math.floor(scrollTop / rowHeight);
      end = Math.ceil((scrollTop + viewport) / rowHeight);
    } else {
      start = lowerBound(offsets, scrollTop);
      end = lowerBound(offsets, scrollTop + viewport) + 1;
    }
    start = Math.max(0, start - overscan);
    end = Math.min(count, end + overscan);
    if (cache.current.start === start && cache.current.end === end && cache.current.total === total) return cache.current;
    cache.current = { start, end, top: offsetOf(start), bottom: Math.max(0, total - offsetOf(end)), total };
    return cache.current;
  }, [scrollerRef, enabled, count, total, offsets, rowHeight, overscan, offsetOf]);

  const subscribe = useCallback(
    (onChange: () => void): (() => void) => {
      const el = scrollerRef.current;
      if (!enabled || el === null) return () => undefined;
      let frame = 0;
      const schedule = (): void => {
        if (frame !== 0) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          onChange();
        });
      };
      el.addEventListener("scroll", schedule, { passive: true });
      const observer = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
      observer?.observe(el);
      return () => {
        el.removeEventListener("scroll", schedule);
        observer?.disconnect();
        if (frame !== 0) cancelAnimationFrame(frame);
      };
    },
    [scrollerRef, enabled],
  );

  const window = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_WINDOW);
  return enabled ? window : null;
}
