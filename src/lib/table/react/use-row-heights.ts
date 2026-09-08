/**
 * Measures rendered row heights with one `ResizeObserver`, so virtual windowing
 * stays correct when rows are not all the same height (expanded rows, tree rows, wrapped text).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Key } from "../core/types";

export interface RowHeights {
  heights: ReadonlyMap<Key, number> | null;
  version: number;
  /** Callback ref for variable-height rows (expanded regions). */
  measure: (key: Key) => (node: HTMLElement | null) => void;
}

const noopMeasure = (): ((node: HTMLElement | null) => void) => () => undefined;

/**
 * Measures variable-height rows with one ResizeObserver. Fires on expand / content change,
 * never on scroll. Returns a constant when disabled so nothing observes anything.
 */
export function useRowHeights(enabled: boolean): RowHeights {
  const [heights] = useState(() => new Map<Key, number>());
  const [version, setVersion] = useState(0);
  const observer = useRef<ResizeObserver | null>(null);
  const nodes = useRef<Map<Element, Key>>(new Map());

  useEffect(() => {
    if (!enabled || typeof ResizeObserver !== "function") return;
    const ro = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        const key = nodes.current.get(entry.target);
        if (key === undefined) continue;
        const height = entry.borderBoxSize?.[0]?.blockSize ?? (entry.target as HTMLElement).offsetHeight;
        const previous = heights.get(key);
        if (previous === undefined || Math.abs(previous - height) > 0.5) {
          heights.set(key, height);
          changed = true;
        }
      }
      if (changed) setVersion((v) => v + 1);
    });
    observer.current = ro;
    const known = nodes.current;
    return () => {
      ro.disconnect();
      observer.current = null;
      known.clear();
    };
  }, [enabled, heights]);

  const measure = useCallback(
    (key: Key) =>
      (node: HTMLElement | null): void => {
        const ro = observer.current;
        if (ro === null) return;
        if (node === null) {
          for (const [element, existing] of nodes.current) {
            if (existing === key) {
              ro.unobserve(element);
              nodes.current.delete(element);
            }
          }
          return;
        }
        nodes.current.set(node, key);
        ro.observe(node);
      },
    [],
  );

  if (!enabled) return { heights: null, version: 0, measure: noopMeasure };
  return { heights, version, measure };
}
