import { toggleKey } from "./expansion";
import type { KeyEntity } from "./selection";
import { conductCheck, invertKeys, selectKeys } from "./selection";
import { toggleSort } from "./sorting";
import type { ControlledFlags, FilterState, Key, LeafColumn, SortDirection, SortEntry, TableState } from "./types";

export type TableAction =
  | { type: "sort/toggle"; columnKey: Key }
  | { type: "filter/set"; columnKey: Key; value: Key[] | null }
  | { type: "page/set"; current: number }
  | { type: "page/setSize"; pageSize: number }
  | { type: "select/toggle"; key: Key; selected: boolean; nativeEvent?: Event }
  | { type: "select/radio"; key: Key; nativeEvent?: Event }
  | { type: "select/page"; selected: boolean }
  | { type: "select/all" }
  | { type: "select/invert" }
  | { type: "select/none" }
  | { type: "select/custom"; keys: readonly Key[] }
  | { type: "expand/toggle"; key: Key }
  | { type: "expand/set"; keys: readonly Key[] };

export interface ReduceContext<T> {
  leavesByKey: ReadonlyMap<Key, LeafColumn<T>>;
  sortDirections: readonly SortDirection[];
  /** Selectable (non-disabled) row keys on the current page. */
  pageKeys: readonly Key[];
  /** Selectable (non-disabled) row keys across the whole filtered dataset. */
  allKeys: readonly Key[];
  /** Present only when `rowSelection.checkStrictly === false`. */
  keyEntities: ReadonlyMap<Key, KeyEntity<T>> | null;
}

export interface InitialStateInput {
  sort: readonly SortEntry[];
  filters: FilterState;
  page: number;
  pageSize: number;
  selectedKeys: readonly Key[];
  expandedKeys: readonly Key[];
}

export function initialState(input: InitialStateInput): TableState {
  return {
    sort: input.sort,
    filters: input.filters,
    page: { number: input.page, pageSize: input.pageSize },
    selectedKeys: input.selectedKeys,
    expandedKeys: input.expandedKeys,
  };
}

/**
 * Pure reducer. Cross-slice rules live here and nowhere else:
 *   sort / filter / page-size change → page 1.
 * Selection is deliberately NOT cleared by sort or filter (Ant Design parity); stale
 * keys are pruned at derive time by the row model.
 */
export function reduce<T>(prev: TableState, action: TableAction, ctx: ReduceContext<T>): TableState {
  switch (action.type) {
    case "sort/toggle": {
      const leaf = ctx.leavesByKey.get(action.columnKey);
      if (leaf === undefined || !leaf.sortable) return prev;
      const sort = toggleSort(prev.sort, action.columnKey, { multiple: leaf.multiple, sortDirections: leaf.sortDirections }, ctx.sortDirections);
      return { ...prev, sort, page: { ...prev.page, number: 1 } };
    }
    case "filter/set": {
      const filters: FilterState = { ...prev.filters, [String(action.columnKey)]: action.value };
      return { ...prev, filters, page: { ...prev.page, number: 1 } };
    }
    case "page/set":
      if (action.current === prev.page.number) return prev;
      return { ...prev, page: { ...prev.page, number: action.current } };
    case "page/setSize":
      if (action.pageSize === prev.page.pageSize) return prev;
      return { ...prev, page: { number: 1, pageSize: action.pageSize } };
    case "select/toggle": {
      const selectedKeys =
        ctx.keyEntities !== null
          ? conductCheck(prev.selectedKeys, action.key, action.selected, ctx.keyEntities)
          : selectKeys(prev.selectedKeys, [action.key], action.selected);
      return { ...prev, selectedKeys };
    }
    case "select/radio":
      return { ...prev, selectedKeys: [action.key] };
    case "select/page":
      return { ...prev, selectedKeys: selectKeys(prev.selectedKeys, ctx.pageKeys, action.selected) };
    case "select/all":
      return { ...prev, selectedKeys: selectKeys(prev.selectedKeys, ctx.allKeys, true) };
    case "select/invert":
      return { ...prev, selectedKeys: invertKeys(prev.selectedKeys, ctx.pageKeys) };
    case "select/none":
      return { ...prev, selectedKeys: [] };
    case "select/custom":
      return { ...prev, selectedKeys: [...action.keys] };
    case "expand/toggle":
      return { ...prev, expandedKeys: toggleKey(prev.expandedKeys, action.key) };
    case "expand/set":
      return { ...prev, expandedKeys: [...action.keys] };
    default:
      return prev;
  }
}

export interface ControlledValues {
  sort?: readonly SortEntry[];
  filters?: FilterState;
  page?: number;
  pageSize?: number;
  selectedKeys?: readonly Key[];
  expandedKeys?: readonly Key[];
}

/** Controlled slices are read from props; everything else comes from internal state. */
export function mergeControlled(internal: TableState, controlled: ControlledValues, flags: ControlledFlags): TableState {
  return {
    sort: flags.sort ? (controlled.sort ?? []) : internal.sort,
    filters: flags.filters ? (controlled.filters ?? {}) : internal.filters,
    page: {
      number: flags.page ? (controlled.page ?? 1) : internal.page.number,
      pageSize: flags.pageSize ? (controlled.pageSize ?? internal.page.pageSize) : internal.page.pageSize,
    },
    selectedKeys: flags.selectedKeys ? (controlled.selectedKeys ?? []) : internal.selectedKeys,
    expandedKeys: flags.expandedKeys ? (controlled.expandedKeys ?? []) : internal.expandedKeys,
  };
}

/** Writes only uncontrolled slices back to internal state; controlled slices are never stored. */
export function pickUncontrolled(next: TableState, flags: ControlledFlags, prevInternal: TableState): TableState {
  return {
    sort: flags.sort ? prevInternal.sort : next.sort,
    filters: flags.filters ? prevInternal.filters : next.filters,
    page: {
      number: flags.page ? prevInternal.page.number : next.page.number,
      pageSize: flags.pageSize ? prevInternal.page.pageSize : next.page.pageSize,
    },
    selectedKeys: flags.selectedKeys ? prevInternal.selectedKeys : next.selectedKeys,
    expandedKeys: flags.expandedKeys ? prevInternal.expandedKeys : next.expandedKeys,
  };
}
