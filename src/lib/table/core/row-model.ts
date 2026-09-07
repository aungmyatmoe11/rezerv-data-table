import { flattenExpanded } from "./expansion";
import { filterTree } from "./filtering";
import type { PaginateResult } from "./pagination";
import { paginate } from "./pagination";
import { buildComparator, sortTree } from "./sorting";
import { resolveSpans } from "./spans";
import type { ExpansionMode, FilterState, FlatEntry, GetRowKey, Key, LazyEntry, LeafColumn, SortEntry, SpanMap } from "./types";
import { warnOnce } from "./warnings";

/** Single-entry memo keyed on argument identity. Enough for a per-stage pipeline cache. */
export function memoLast<A extends readonly unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  let lastArgs: A | null = null;
  let lastResult: R;
  return (...args: A): R => {
    if (lastArgs !== null && lastArgs.length === args.length && lastArgs.every((arg, i) => Object.is(arg, args[i]))) {
      return lastResult;
    }
    lastArgs = args;
    lastResult = fn(...args);
    return lastResult;
  };
}

export interface RowModelInput<T> {
  dataSource: readonly T[];
  getKey: GetRowKey<T>;
  /** Tree mode only; `null` otherwise. */
  childrenColumnName: string | null;
  leaves: readonly LeafColumn<T>[];
  leavesByKey: ReadonlyMap<Key, LeafColumn<T>>;
  filters: FilterState;
  sort: readonly SortEntry[];
  paginationEnabled: boolean;
  page: number;
  pageSize: number;
  total: number | undefined;
  expansionMode: ExpansionMode;
  expandedKeys: readonly Key[];
  hasLoader: boolean;
  rowExpandable: ((record: T) => boolean) | null;
  lazy: ReadonlyMap<Key, LazyEntry> | null;
  /** Bumped by the lazy-children hook so a stable Map identity still invalidates the flatten stage. */
  lazyVersion: number;
}

export interface RowModel<T> {
  recordByKey: ReadonlyMap<Key, T>;
  /** S3 — the full filtered + sorted dataset (what `onChange.extra.currentDataSource` carries). */
  sorted: readonly T[];
  /** S4 — top-level rows on the current page plus clamped pagination state. */
  page: PaginateResult<T>;
  /** S5 — render list. */
  flat: readonly FlatEntry<T>[];
  /** S6 — `null` when no column declares `onCell`. */
  spans: SpanMap | null;
}

function keyRows<T>(rows: readonly T[], getKey: GetRowKey<T>, childrenColumnName: string | null): ReadonlyMap<Key, T> {
  const map = new Map<Key, T>();
  let duplicate: Key | null = null;
  const visit = (list: readonly T[]): void => {
    list.forEach((record, index) => {
      const key = getKey(record, index);
      if (map.has(key) && duplicate === null) duplicate = key;
      map.set(key, record);
      if (childrenColumnName === null) return;
      const children = (record as Record<string, unknown>)[childrenColumnName];
      if (Array.isArray(children)) visit(children as readonly T[]);
    });
  };
  visit(rows);
  if (duplicate !== null) {
    warnOnce("rowKey:duplicate", `Duplicate row key "${String(duplicate)}". Selection and expansion need unique keys.`);
  }
  return map;
}

/**
 * Creates a per-table pipeline with one cache per stage:
 *   S1 key → S2 filter → S3 sort → S4 paginate (top-level) → S5 flatten → S6 spans
 * A page change re-runs only S4–S6; toggling a row re-runs only S5–S6.
 */
export function createRowModel<T>(): (input: RowModelInput<T>) => RowModel<T> {
  const keyed = memoLast(keyRows<T>);
  const filtered = memoLast(filterTree<T>);
  const comparator = memoLast(buildComparator<T>);
  const sorted = memoLast(sortTree<T>);
  const paged = memoLast((rows: readonly T[], enabled: boolean, pageNumber: number, pageSize: number, total: number | undefined): PaginateResult<T> =>
    enabled ? paginate(rows, pageNumber, pageSize, total) : { rows, number: 1, pageSize: Math.max(1, rows.length), total: rows.length, server: false },
  );
  const expandedSet = memoLast((keys: readonly Key[]) => new Set(keys));
  const flattened = memoLast(
    (
      rows: readonly T[],
      mode: ExpansionMode,
      childrenColumnName: string | null,
      getKey: GetRowKey<T>,
      expanded: ReadonlySet<Key>,
      hasLoader: boolean,
      rowExpandable: ((record: T) => boolean) | null,
      lazy: ReadonlyMap<Key, LazyEntry> | null,
      _lazyVersion: number,
    ): readonly FlatEntry<T>[] => flattenExpanded(rows, { mode, childrenColumnName, getKey, expandedKeys: expanded, hasLoader, rowExpandable, lazy }),
  );
  const spanned = memoLast(resolveSpans<T>);

  return (input) => {
    const recordByKey = keyed(input.dataSource, input.getKey, input.childrenColumnName);
    const s2 = filtered(input.dataSource, input.filters, input.leavesByKey, input.childrenColumnName);
    const compare = comparator(input.sort, input.leavesByKey);
    const s3 = sorted(s2, compare, input.childrenColumnName);
    const page = paged(s3, input.paginationEnabled, input.page, input.pageSize, input.total);
    const flat = flattened(
      page.rows,
      input.expansionMode,
      input.childrenColumnName,
      input.getKey,
      expandedSet(input.expandedKeys),
      input.hasLoader,
      input.rowExpandable,
      input.lazy,
      input.lazyVersion,
    );
    const spans = spanned(flat, input.leaves);
    return { recordByKey, sorted: s3, page, flat, spans };
  };
}
