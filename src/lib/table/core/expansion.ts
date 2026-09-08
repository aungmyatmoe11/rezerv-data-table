/**
 * Expanded-key toggling, and the flatten step that turns a row tree plus a set of
 * expanded keys into the linear list the renderer walks. Inline children, tree children and
 * on-demand children all converge on the same flat entries.
 */
import type { ExpansionMode, FlatEntry, GetRowKey, Key, LazyEntry } from "./types";

export function toggleKey(keys: readonly Key[], key: Key): readonly Key[] {
  return keys.includes(key) ? keys.filter((item) => item !== key) : [...keys, key];
}

export function expandedRowKeyOf(key: Key): string {
  return `${String(key)}__expanded`;
}

export interface FlattenOptions<T> {
  mode: ExpansionMode;
  childrenColumnName: string | null;
  getKey: GetRowKey<T>;
  expandedKeys: ReadonlySet<Key>;
  hasLoader: boolean;
  rowExpandable: ((record: T) => boolean) | null;
  lazy: ReadonlyMap<Key, LazyEntry> | null;
}

/**
 * Flattens the current page into the render list.
 * - `row` mode: an expanded row is followed by one `expanded` sentinel entry.
 * - `tree` mode: an expanded row is followed by its children (depth + 1); while children are
 *   loading or failed, the sentinel is emitted instead so the UI can show skeleton / error.
 */
export function flattenExpanded<T>(rows: readonly T[], options: FlattenOptions<T>): readonly FlatEntry<T>[] {
  const out: FlatEntry<T>[] = [];
  if (options.mode === "none") {
    rows.forEach((record, index) => {
      out.push({ kind: "row", key: options.getKey(record, index), record, index, depth: 0, parentKey: null, hasChildren: false, expandable: false, expanded: false });
    });
    return out;
  }
  walk(rows, 0, null, options, out);
  return out;
}

function walk<T>(rows: readonly T[], depth: number, parentKey: Key | null, options: FlattenOptions<T>, out: FlatEntry<T>[]): void {
  rows.forEach((record, index) => {
    const key = options.getKey(record, index);
    const lazyEntry = options.lazy?.get(key);
    const inlineChildren = options.mode === "tree" && options.childrenColumnName !== null ? childrenOf(record, options.childrenColumnName) : null;
    const loadedChildren = lazyEntry?.status === "ready" && Array.isArray(lazyEntry.data) ? (lazyEntry.data as readonly T[]) : null;
    const children = loadedChildren ?? inlineChildren;

    const hasChildren =
      options.mode === "row" ? true : children !== null ? children.length > 0 : options.hasLoader && lazyEntry?.status !== "ready";
    const allowed = options.rowExpandable === null ? true : options.rowExpandable(record);
    const expandable = allowed && hasChildren;
    const expanded = expandable && options.expandedKeys.has(key);

    out.push({ kind: "row", key, record, index, depth, parentKey, hasChildren, expandable, expanded });
    if (!expanded) return;

    if (options.mode === "row") {
      out.push({ kind: "expanded", key: expandedRowKeyOf(key), parentKey: key, record, index, depth });
      return;
    }
    // tree mode
    if (children !== null && (loadedChildren !== null || !options.hasLoader || lazyEntry?.status === "ready")) {
      walk(children, depth + 1, key, options, out);
      return;
    }
    if (options.hasLoader) {
      // loading / error / idle → sentinel for skeleton or error UI
      out.push({ kind: "expanded", key: expandedRowKeyOf(key), parentKey: key, record, index, depth });
      return;
    }
    if (children !== null) walk(children, depth + 1, key, options, out);
  });
}

function childrenOf<T>(record: T, childrenColumnName: string): readonly T[] | null {
  const value = (record as Record<string, unknown>)[childrenColumnName];
  return Array.isArray(value) ? (value as readonly T[]) : null;
}

/** All keys in a tree (used by `defaultExpandAllRows`). */
export function collectKeys<T>(rows: readonly T[], getKey: GetRowKey<T>, childrenColumnName: string | null): Key[] {
  const keys: Key[] = [];
  const visit = (list: readonly T[]): void => {
    list.forEach((record, index) => {
      keys.push(getKey(record, index));
      if (childrenColumnName === null) return;
      const children = childrenOf(record, childrenColumnName);
      if (children !== null) visit(children);
    });
  };
  visit(rows);
  return keys;
}
