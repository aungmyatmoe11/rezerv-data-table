import type { ColumnDef, Comparator, Key, LeafColumn, SortDirection, SortEntry, SortOrder, SorterResult } from "./types";
import { warnOnce } from "./warnings";

export const DEFAULT_SORT_DIRECTIONS: readonly SortDirection[] = ["ascend", "descend"];

/** none → ascend → descend → none (or whatever `directions` allows). */
export function cycleOrder(current: SortOrder, directions: readonly SortDirection[] = DEFAULT_SORT_DIRECTIONS): SortOrder {
  const sequence: SortOrder[] = [...directions, null];
  const index = sequence.indexOf(current);
  return sequence[(index + 1) % sequence.length] ?? null;
}

export interface SortColumnMeta {
  multiple: number | false;
  sortDirections: readonly SortDirection[] | undefined;
}

/**
 * Ant Design merge rule: the click joins the existing sort only when the clicked
 * column AND the current head sorter both declare `multiple`; otherwise it replaces.
 */
export function toggleSort(
  sort: readonly SortEntry[],
  columnKey: Key,
  meta: SortColumnMeta,
  tableDirections: readonly SortDirection[] = DEFAULT_SORT_DIRECTIONS,
): readonly SortEntry[] {
  const existing = sort.find((entry) => entry.columnKey === columnKey);
  const nextOrder = cycleOrder(existing?.order ?? null, meta.sortDirections ?? tableDirections);
  const head = sort[0];
  const canMerge = meta.multiple !== false && (head === undefined || head.multiple !== false);

  if (!canMerge) {
    return nextOrder === null ? [] : [{ columnKey, order: nextOrder, multiple: meta.multiple }];
  }

  const rest = sort.filter((entry) => entry.columnKey !== columnKey);
  if (nextOrder === null) return rest;
  const next = [...rest, { columnKey, order: nextOrder, multiple: meta.multiple }];
  // multiple ကြီးတဲ့ column က priority ပိုမြင့်တယ် (antd parity)၊ stable sort ဖြစ်လို့ တူရင် click order အတိုင်း
  return next.sort((a, b) => Number(b.multiple) - Number(a.multiple));
}

/** Drop entries whose column no longer exists or is not sortable. Warns once per unknown key. */
export function reconcileSort<T>(sort: readonly SortEntry[], leavesByKey: ReadonlyMap<Key, LeafColumn<T>>): readonly SortEntry[] {
  let changed = false;
  const next = sort.filter((entry) => {
    const leaf = leavesByKey.get(entry.columnKey);
    if (leaf === undefined || !leaf.sortable) {
      warnOnce(`sort:unknown:${String(entry.columnKey)}`, `Ignoring sort on unknown or non-sortable column "${String(entry.columnKey)}".`);
      changed = true;
      return false;
    }
    return true;
  });
  return changed ? next : sort;
}

/** Sort entries declared on columns via `sortOrder` (controlled) or `defaultSortOrder` (initial). */
export function sortFromColumns<T>(leaves: readonly LeafColumn<T>[], mode: "controlled" | "default"): readonly SortEntry[] {
  const entries: SortEntry[] = [];
  for (const leaf of leaves) {
    const def = leaf.def as { sortOrder?: SortOrder; defaultSortOrder?: SortOrder };
    const order = mode === "controlled" ? def.sortOrder : def.defaultSortOrder;
    if (order === "ascend" || order === "descend") {
      entries.push({ columnKey: leaf.key, order, multiple: leaf.multiple });
    }
  }
  if (entries.length > 1 && entries.some((entry) => entry.multiple === false)) {
    // multiple မပါတဲ့ column တွေ ပါနေရင် single-sort semantics ဖြစ်လို့ ပထမတစ်ခုပဲ ယူတယ်
    return entries.slice(0, 1);
  }
  return entries.sort((a, b) => Number(b.multiple) - Number(a.multiple));
}

export function buildComparator<T>(sort: readonly SortEntry[], leavesByKey: ReadonlyMap<Key, LeafColumn<T>>): Comparator<T> | null {
  const steps: { compare: Comparator<T>; sign: 1 | -1 }[] = [];
  for (const entry of sort) {
    const leaf = leavesByKey.get(entry.columnKey);
    if (leaf?.comparator == null) continue; // server-sorted or unknown → identity for this key
    steps.push({ compare: leaf.comparator, sign: entry.order === "ascend" ? 1 : -1 });
  }
  if (steps.length === 0) return null;
  return (a, b) => {
    for (const step of steps) {
      const result = step.compare(a, b) * step.sign;
      if (result !== 0) return result;
    }
    return 0;
  };
}

/**
 * Stable per-level sort. Children (`childrenColumnName`) are sorted recursively with the
 * same comparator; records are shallow-copied only when a child list actually changes.
 */
export function sortTree<T>(rows: readonly T[], compare: Comparator<T> | null, childrenColumnName: string | null): readonly T[] {
  if (compare === null || rows.length < 2) return sortChildren(rows, compare, childrenColumnName);
  const sorted = rows.slice().sort(compare); // Array.prototype.sort is stable (ES2019+)
  return sortChildren(sorted, compare, childrenColumnName);
}

function sortChildren<T>(rows: readonly T[], compare: Comparator<T> | null, childrenColumnName: string | null): readonly T[] {
  if (childrenColumnName === null || compare === null) return rows;
  let changed = false;
  const next = rows.map((row) => {
    const children = (row as Record<string, unknown>)[childrenColumnName];
    if (!Array.isArray(children) || children.length < 2) return row;
    const sortedChildren = sortTree(children as T[], compare, childrenColumnName);
    if (sortedChildren === children) return row;
    changed = true;
    return { ...row, [childrenColumnName]: sortedChildren };
  });
  return changed ? next : rows;
}

/** Ant Design-shaped payload: single sort → object, multi sort → array ordered by priority. */
export function toSorterResult<T>(
  sort: readonly SortEntry[],
  leavesByKey: ReadonlyMap<Key, LeafColumn<T>>,
  clearedKey: Key | null,
): SorterResult<T> | SorterResult<T>[] {
  const toResult = (columnKey: Key, order: SortOrder): SorterResult<T> => {
    const leaf = leavesByKey.get(columnKey);
    const result: SorterResult<T> = { columnKey, order };
    if (leaf !== undefined) {
      result.column = leaf.def as ColumnDef<T>;
      const dataIndex = (leaf.def as { dataIndex?: SorterResult<T>["field"] }).dataIndex;
      if (dataIndex !== undefined) result.field = dataIndex;
    }
    return result;
  };
  const isMulti = sort.some((entry) => entry.multiple !== false);
  if (isMulti) return sort.map((entry) => toResult(entry.columnKey, entry.order));
  const head = sort[0];
  if (head !== undefined) return toResult(head.columnKey, head.order);
  return toResult(clearedKey ?? "", null);
}
