/**
 * The state container, and the only place a consumer callback ever fires.
 * `send(action)` runs reduce, then commit (uncontrolled slices only), then emit — synchronously,
 * inside the event handler. No effect watches state in order to call a prop.
 */
import { useCallback, useLayoutEffect, useReducer, useRef } from "react";
import { paginationState } from "../core/pagination";
import type { RowModel } from "../core/row-model";
import { toSorterResult } from "../core/sorting";
import type { InitialStateInput, TableAction } from "../core/state";
import { initialState, pickUncontrolled, reduce, type ReduceContext } from "../core/state";
import type { ControlledFlags, DataTableProps, Key, LeafColumn, TableState } from "../core/types";

export interface EmitDeps<T extends object> {
  props: DataTableProps<T>;
  leavesByKey: ReadonlyMap<Key, LeafColumn<T>>;
  paginationEnabled: boolean;
  /** Runs the (memoised) row model for a candidate state — used for `extra.currentDataSource` and `total`. */
  modelFor: (state: TableState) => RowModel<T>;
  resolveRecord: (key: Key) => T | undefined;
  rememberRecords: (keys: readonly Key[]) => void;
  /** Row keys that were selectable on the page at the time of the action (for `onSelectAll.changeRows`). */
  pageKeys: readonly Key[];
  scrollToTop: () => void;
  scrollToFirstRowOnChange: boolean;
}

export interface TableStateController {
  internal: TableState;
  send: (action: TableAction) => void;
}

interface Latest<T extends object> {
  effective: TableState;
  flags: ControlledFlags;
  ctx: ReduceContext<T>;
  deps: EmitDeps<T>;
}

type Commit = { next: TableState; flags: ControlledFlags };

function commitReducer(internal: TableState, commit: Commit): TableState {
  return pickUncontrolled(commit.next, commit.flags, internal);
}

/**
 * The ONLY callback surface. Diffs `prev → next` for one action and fires the matching
 * consumer callbacks synchronously, inside the event handler.
 */
export function emit<T extends object>(prev: TableState, next: TableState, action: TableAction, deps: EmitDeps<T>): void {
  const { props } = deps;
  const pagination = props.pagination === false ? undefined : props.pagination;

  const fireChange = (kind: "sort" | "filter" | "paginate", clearedKey: Key | null): void => {
    const model = deps.modelFor(next);
    const total = model.page.total;
    const state = paginationState(deps.paginationEnabled ? model.page.number : 1, next.page.pageSize, total);
    props.onChange?.(state, { ...next.filters }, toSorterResult(next.sort, deps.leavesByKey, clearedKey), { currentDataSource: model.sorted, action: kind });
    if (deps.scrollToFirstRowOnChange) deps.scrollToTop();
  };

  switch (action.type) {
    case "sort/toggle": {
      if (deps.paginationEnabled) pagination?.onChange?.(1, next.page.pageSize);
      const cleared = next.sort.some((entry) => entry.columnKey === action.columnKey) ? null : action.columnKey;
      fireChange("sort", cleared);
      return;
    }
    case "filter/set":
      if (deps.paginationEnabled) pagination?.onChange?.(1, next.page.pageSize);
      fireChange("filter", null);
      return;
    case "page/set":
      pagination?.onChange?.(next.page.number, next.page.pageSize);
      fireChange("paginate", null);
      return;
    case "page/setSize":
      pagination?.onShowSizeChange?.(next.page.number, next.page.pageSize);
      pagination?.onChange?.(next.page.number, next.page.pageSize);
      fireChange("paginate", null);
      return;
    case "select/toggle":
    case "select/radio":
    case "select/page":
    case "select/all":
    case "select/invert":
    case "select/none":
    case "select/custom": {
      const selection = props.rowSelection;
      if (selection === undefined) return;
      const keys = [...next.selectedKeys];
      const rows = keys.map((key) => deps.resolveRecord(key)).filter((row): row is T => row !== undefined);
      deps.rememberRecords(keys);
      if (action.type === "select/toggle" || action.type === "select/radio") {
        const record = deps.resolveRecord(action.key);
        const selected = action.type === "select/radio" ? true : action.selected;
        if (record !== undefined) selection.onSelect?.(record, selected, rows, action.nativeEvent ?? new Event("change"));
        selection.onChange?.(keys, rows, { type: "single" });
        return;
      }
      if (action.type === "select/page") {
        const prevSet = new Set(prev.selectedKeys);
        const nextSet = new Set(next.selectedKeys);
        const changeRows = deps.pageKeys
          .filter((key) => prevSet.has(key) !== nextSet.has(key))
          .map((key) => deps.resolveRecord(key))
          .filter((row): row is T => row !== undefined);
        selection.onSelectAll?.(action.selected, rows, changeRows);
        selection.onChange?.(keys, rows, { type: action.selected ? "all" : "none" });
        return;
      }
      const type = action.type === "select/all" ? "all" : action.type === "select/invert" ? "invert" : action.type === "select/none" ? "none" : "multiple";
      selection.onChange?.(keys, rows, { type });
      return;
    }
    case "expand/toggle": {
      const expandable = props.expandable;
      const record = deps.resolveRecord(action.key);
      if (record !== undefined) expandable?.onExpand?.(next.expandedKeys.includes(action.key), record);
      expandable?.onExpandedRowsChange?.([...next.expandedKeys]);
      return;
    }
    case "expand/set":
      props.expandable?.onExpandedRowsChange?.([...next.expandedKeys]);
      return;
    default:
      return;
  }
}

/**
 * `useReducer` container with a stable `send`:
 *   send(action) → reduce(effective) → commit uncontrolled slices → emit callbacks.
 * No effects diff props against state; controlled slices are simply never stored.
 */
export function useTableStateContainer<T extends object>(init: () => InitialStateInput, getLatest: () => Latest<T>): TableStateController {
  const [internal, commit] = useReducer(commitReducer, undefined, () => initialState(init()));
  const latestRef = useRef(getLatest);
  useLayoutEffect(() => {
    latestRef.current = getLatest;
  });

  const send = useCallback((action: TableAction): void => {
    const { effective, flags, ctx, deps } = latestRef.current();
    const next = reduce(effective, action, ctx);
    if (next === effective) return;
    commit({ next, flags });
    emit(effective, next, action, deps);
  }, []);

  return { internal, send };
}
