import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Key, LazyEntry } from "../core/types";

export interface LazyChildren {
  /** Stable Map identity (mutated in place); pair it with `version` in memo dependencies. */
  map: ReadonlyMap<Key, LazyEntry>;
  version: number;
  retry: (key: Key) => void;
}

const EMPTY: ReadonlyMap<Key, LazyEntry> = new Map();
const noop = (): void => undefined;

function isAbort(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: string }).name === "AbortError";
}

/**
 * Per-row async state machine for on-demand children:
 *   idle → loading → ready | error, with retry.
 * Expanding starts a fetch (unless cached), collapsing aborts it, a stale response never wins
 * (generation guard). Returns a constant when no loader is configured so nothing runs.
 */
export function useLazyChildren<T>(
  loader: ((record: T, signal: AbortSignal) => Promise<unknown>) | null,
  cache: boolean,
  expandedKeys: readonly Key[],
  getRecord: (key: Key) => T | undefined,
): LazyChildren {
  const [map] = useState(() => new Map<Key, LazyEntry>());
  const controllers = useRef<Map<Key, AbortController>>(new Map());
  const generations = useRef<Map<Key, number>>(new Map());
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // latest-ref pattern: keeps `load` stable even when the consumer passes an inline loader
  const latest = useRef({ loader, getRecord });
  useLayoutEffect(() => {
    latest.current = { loader, getRecord };
  });

  const load = useCallback(
    (key: Key, force: boolean): void => {
      const fetcher = latest.current.loader;
      if (fetcher === null) return;
      const record = latest.current.getRecord(key);
      if (record === undefined) return;
      const entry = map.get(key);
      if (!force && entry !== undefined && (entry.status === "loading" || (entry.status === "ready" && cache))) return;

      controllers.current.get(key)?.abort();
      const generation = (generations.current.get(key) ?? 0) + 1;
      generations.current.set(key, generation);
      const controller = new AbortController();
      controllers.current.set(key, controller);
      map.set(key, { status: "loading" });
      bump();

      fetcher(record, controller.signal).then(
        (data) => {
          if (generations.current.get(key) !== generation) return;
          controllers.current.delete(key);
          map.set(key, { status: "ready", data });
          bump();
        },
        (error: unknown) => {
          if (generations.current.get(key) !== generation || isAbort(error)) return;
          controllers.current.delete(key);
          map.set(key, { status: "error", error });
          bump();
        },
      );
    },
    [map, cache, bump],
  );

  const cancel = useCallback(
    (key: Key): void => {
      const controller = controllers.current.get(key);
      if (controller === undefined) return;
      controller.abort();
      controllers.current.delete(key);
      generations.current.set(key, (generations.current.get(key) ?? 0) + 1);
      if (map.get(key)?.status === "loading") {
        map.set(key, { status: "idle" });
        bump();
      }
    },
    [map, bump],
  );

  // expandedKeys ပြောင်းတိုင်း — အသစ်ဖွင့်တဲ့ row ကို fetch၊ ပိတ်လိုက်တဲ့ row ရဲ့ in-flight request ကို abort
  const previousKeys = useRef<ReadonlySet<Key>>(new Set());
  useEffect(() => {
    if (loader === null) return;
    const current = new Set(expandedKeys);
    for (const key of current) if (!previousKeys.current.has(key)) load(key, false);
    for (const key of previousKeys.current) if (!current.has(key)) cancel(key);
    previousKeys.current = current;
  }, [loader, expandedKeys, load, cancel]);

  useEffect(() => {
    const active = controllers.current;
    return () => {
      for (const controller of active.values()) controller.abort();
      active.clear();
    };
  }, []);

  const retry = useCallback((key: Key) => load(key, true), [load]);

  if (loader === null) return { map: EMPTY, version: 0, retry: noop };
  return { map, version, retry };
}
