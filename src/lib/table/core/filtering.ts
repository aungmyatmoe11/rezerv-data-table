import type { FilterState, Key, LeafColumn } from "./types";

type Predicate<T> = (record: T) => boolean;

function buildPredicate<T>(filters: FilterState, leavesByKey: ReadonlyMap<Key, LeafColumn<T>>): Predicate<T> | null {
  const active: { values: readonly Key[]; onFilter: (value: Key, record: T) => boolean }[] = [];
  for (const [columnKey, values] of Object.entries(filters)) {
    if (values === null || values.length === 0) continue;
    const leaf = leavesByKey.get(columnKey) ?? leavesByKey.get(Number(columnKey));
    if (leaf?.onFilter == null) continue;
    active.push({ values, onFilter: leaf.onFilter });
  }
  if (active.length === 0) return null;
  // column တစ်ခုအတွင်း value တွေက OR၊ column အချင်းချင်းက AND (antd parity)
  return (record) => active.every(({ values, onFilter }) => values.some((value) => onFilter(value, record)));
}

/** Recursive filter for tree data; identity when no filter is active. */
export function filterTree<T>(rows: readonly T[], filters: FilterState, leavesByKey: ReadonlyMap<Key, LeafColumn<T>>, childrenColumnName: string | null): readonly T[] {
  const predicate = buildPredicate(filters, leavesByKey);
  if (predicate === null) return rows;
  return applyPredicate(rows, predicate, childrenColumnName);
}

function applyPredicate<T>(rows: readonly T[], predicate: Predicate<T>, childrenColumnName: string | null): readonly T[] {
  const result: T[] = [];
  for (const row of rows) {
    if (!predicate(row)) continue;
    if (childrenColumnName === null) {
      result.push(row);
      continue;
    }
    const children = (row as Record<string, unknown>)[childrenColumnName];
    if (!Array.isArray(children) || children.length === 0) {
      result.push(row);
      continue;
    }
    const filteredChildren = applyPredicate(children as T[], predicate, childrenColumnName);
    result.push(filteredChildren.length === children.length ? row : { ...row, [childrenColumnName]: filteredChildren });
  }
  return result;
}

export function hasActiveFilters(filters: FilterState): boolean {
  return Object.values(filters).some((values) => values !== null && values.length > 0);
}
