import { useCallback, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { isGroupColumn, leavesByKey as buildLeavesByKey, resolveColumns } from "../core/columns";
import { collectKeys } from "../core/expansion";
import { totalPages } from "../core/pagination";
import type { ResolvedConfig, ResolvedExpansion, ResolvedPagination, ResolvedSelection } from "../core/resolve-config";
import { resolveConfig } from "../core/resolve-config";
import type { RowModel, RowModelInput } from "../core/row-model";
import { createRowModel } from "../core/row-model";
import { buildKeyEntities, pruneKeys } from "../core/selection";
import { reconcileSort, sortFromColumns } from "../core/sorting";
import type { ControlledValues, ReduceContext, TableAction } from "../core/state";
import { mergeControlled } from "../core/state";
import type { ColumnDef, ColumnLayout, DataTableProps, FilterState, GetRowKey, Key, LazyEntry, LeafColumn, SortEntry, SortOrder, TableState } from "../core/types";
import { resolveRowKey } from "../core/value";
import { useBreakpoints } from "./use-breakpoint";
import { useLazyChildren } from "./use-lazy-children";
import { useStickyScroll } from "./use-sticky-scroll";
import { useTableStateContainer, type EmitDeps } from "./use-table-state";

const EMPTY_KEYS: readonly Key[] = [];
const EMPTY_SET: ReadonlySet<Key> = new Set();

export interface SortingApi {
  orderOf: (columnKey: Key) => SortOrder;
  /** 1-based priority badge when more than one sorter is active; otherwise `null`. */
  priorityOf: (columnKey: Key) => number | null;
  toggle: (columnKey: Key) => void;
}

export interface FilteringApi {
  valuesOf: (columnKey: Key) => readonly Key[];
  set: (columnKey: Key, values: Key[] | null) => void;
}

export interface PaginationApi {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  server: boolean;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  resolved: Extract<ResolvedPagination, { enabled: true }>;
}

export interface SelectionApi<T> {
  type: "checkbox" | "radio";
  selectedSet: ReadonlySet<Key>;
  selectedKeys: readonly Key[];
  isSelected: (key: Key) => boolean;
  isDisabled: (key: Key) => boolean;
  checkboxProps: (record: T) => { disabled?: boolean; name?: string };
  pageAllChecked: boolean;
  pageIndeterminate: boolean;
  pageHasChangeable: boolean;
  changeableKeys: readonly Key[];
  toggle: (key: Key, selected: boolean, nativeEvent?: Event) => void;
  radio: (key: Key, nativeEvent?: Event) => void;
  togglePage: (selected: boolean) => void;
  selectAll: () => void;
  invert: () => void;
  none: () => void;
  custom: (keys: readonly Key[]) => void;
  resolved: Extract<ResolvedSelection<T>, { enabled: true }>;
}

export interface ExpansionApi<T> {
  mode: "row" | "tree";
  isExpanded: (key: Key) => boolean;
  toggle: (key: Key) => void;
  lazy: ReadonlyMap<Key, LazyEntry>;
  retry: (key: Key) => void;
  resolved: Extract<ResolvedExpansion<T>, { enabled: true }>;
}

export interface ReorderApi {
  order: readonly Key[];
  draggableKeys: readonly Key[];
  setOrder: (order: readonly Key[]) => void;
}

export interface TableInstance<T extends object> {
  props: DataTableProps<T>;
  config: ResolvedConfig<T>;
  layout: ColumnLayout<T>;
  leavesByKey: ReadonlyMap<Key, LeafColumn<T>>;
  state: TableState;
  model: RowModel<T>;
  getKey: GetRowKey<T>;
  /** Top-level rows on the current page (what `title` / `footer` / `summary` receive). */
  pageData: readonly T[];
  send: (action: TableAction) => void;
  sorting: SortingApi;
  filtering: FilteringApi;
  pagination: PaginationApi | null;
  selection: SelectionApi<T> | null;
  expansion: ExpansionApi<T> | null;
  reorder: ReorderApi | null;
}

function hasResponsive<T>(columns: readonly ColumnDef<T>[]): boolean {
  return columns.some((column) => (column.responsive?.length ?? 0) > 0 || (isGroupColumn(column) && hasResponsive(column.children)));
}

function filtersFromLeaves<T>(leaves: readonly LeafColumn<T>[], mode: "controlled" | "default"): FilterState {
  const filters: FilterState = {};
  for (const leaf of leaves) {
    const def = leaf.def as { filteredValue?: readonly Key[] | null; defaultFilteredValue?: readonly Key[] };
    if (mode === "controlled") {
      if ("filteredValue" in def) filters[String(leaf.key)] = def.filteredValue === undefined || def.filteredValue === null ? null : [...def.filteredValue];
    } else if (def.defaultFilteredValue !== undefined) {
      filters[String(leaf.key)] = [...def.defaultFilteredValue];
    }
  }
  return filters;
}

/**
 * Composes config → columns → state → row model → feature APIs into one view model.
 * Everything a feature needs is `null` when that feature is not configured.
 */
export function useTable<T extends object>(props: DataTableProps<T>, scrollerRef: RefObject<HTMLDivElement | null> | null = null): TableInstance<T> {
  const { columns, dataSource } = props;
  const isEmpty = dataSource.length === 0;

  const config = useMemo(
    () => resolveConfig(props),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolveConfig reads exactly these props
    [
      columns,
      isEmpty,
      props.pagination,
      props.rowSelection,
      props.expandable,
      props.scroll,
      props.sticky,
      props.virtual,
      props.columnReorder,
      props.loading,
      props.size,
      props.rowHeight,
      props.bordered,
      props.showHeader,
      props.tableLayout,
      props.rowHoverable,
      props.sortDirections,
      props.showSorterTooltip,
      props.locale,
    ],
  );

  const getKey = useMemo(() => resolveRowKey(props.rowKey), [props.rowKey]);
  const breakpoints = useBreakpoints(useMemo(() => hasResponsive(columns), [columns]));

  const expansion = config.expansion;
  const childrenColumnName = expansion.enabled ? expansion.childrenColumnName : null;
  const flags = config.controlled;

  const latestRef = useRef<{ effective: TableState; flags: typeof flags; ctx: ReduceContext<T>; deps: EmitDeps<T> } | null>(null);
  const getLatest = useCallback(() => {
    const latest = latestRef.current;
    if (latest === null) throw new Error("DataTable: state accessed before the first commit.");
    return latest;
  }, []);

  const { internal, send } = useTableStateContainer<T>(() => {
    const initialLayout = resolveColumns(columns, { breakpoints: null, order: config.defaults.columnOrder, tableSortDirections: config.sortDirections });
    return {
      sort: sortFromColumns(initialLayout.leaves, "default"),
      filters: filtersFromLeaves(initialLayout.leaves, "default"),
      page: config.defaults.page,
      pageSize: config.defaults.pageSize,
      selectedKeys: config.defaults.selectedKeys,
      expandedKeys: config.defaults.expandAll ? collectKeys(dataSource, getKey, childrenColumnName) : config.defaults.expandedKeys,
      columnOrder: config.defaults.columnOrder,
    };
  }, getLatest);

  // --- columns (need the effective column order, which may be controlled) ---
  const controlledOrder = config.reorder.enabled ? (config.reorder.config.order ?? null) : null;
  const orderForLayout = flags.columnOrder ? controlledOrder : internal.columnOrder;
  const layout = useMemo(
    () => resolveColumns(columns, { breakpoints, order: orderForLayout, tableSortDirections: config.sortDirections }),
    [columns, breakpoints, orderForLayout, config.sortDirections],
  );
  const leavesByKey = useMemo(() => buildLeavesByKey(layout.leaves), [layout.leaves]);

  // --- effective state = internal + controlled slices from props ---
  const controlledValues = useMemo<ControlledValues>(() => {
    const values: ControlledValues = {};
    if (flags.sort) values.sort = sortFromColumns(layout.leaves, "controlled");
    if (flags.filters) values.filters = filtersFromLeaves(layout.leaves, "controlled");
    if (config.pagination.enabled) {
      if (flags.page && config.pagination.controlledPage !== undefined) values.page = config.pagination.controlledPage;
      if (flags.pageSize && config.pagination.controlledPageSize !== undefined) values.pageSize = config.pagination.controlledPageSize;
    }
    if (flags.selectedKeys && config.selection.enabled && config.selection.config.selectedRowKeys !== undefined) values.selectedKeys = config.selection.config.selectedRowKeys;
    if (flags.expandedKeys && expansion.enabled && expansion.config.expandedRowKeys !== undefined) values.expandedKeys = expansion.config.expandedRowKeys;
    if (flags.columnOrder) values.columnOrder = controlledOrder;
    return values;
  }, [flags, layout.leaves, config.pagination, config.selection, expansion, controlledOrder]);
  const effective = useMemo(() => mergeControlled(internal, controlledValues, flags), [internal, controlledValues, flags]);
  const sort = useMemo(() => reconcileSort(effective.sort, leavesByKey), [effective.sort, leavesByKey]);

  // --- on-demand children ---
  const modelRef = useRef<RowModel<T> | null>(null);
  const [preserved] = useState(() => new Map<Key, T>());
  const getRecord = useCallback((key: Key): T | undefined => modelRef.current?.recordByKey.get(key) ?? preserved.get(key), [preserved]);
  const loader = expansion.enabled && expansion.hasLoader ? (expansion.config.loadChildren ?? null) : null;
  const lazy = useLazyChildren<T>(loader, expansion.enabled ? expansion.cacheChildren : true, effective.expandedKeys, getRecord);

  // --- row model ---
  const [run] = useState(() => createRowModel<T>());
  const paginationEnabled = config.pagination.enabled;
  const total = config.pagination.enabled ? config.pagination.config.total : undefined;
  const rowExpandable = expansion.enabled ? (expansion.config.rowExpandable ?? null) : null;
  const hasLoader = expansion.enabled && expansion.hasLoader;
  const lazyMap = loader === null ? null : lazy.map;
  const buildInput = useCallback(
    (state: TableState, stateSort: readonly SortEntry[]): RowModelInput<T> => ({
      dataSource,
      getKey,
      childrenColumnName,
      leaves: layout.leaves,
      leavesByKey,
      filters: state.filters,
      sort: stateSort,
      paginationEnabled,
      page: state.page.number,
      pageSize: state.page.pageSize,
      total,
      expansionMode: expansion.mode,
      expandedKeys: state.expandedKeys,
      hasLoader,
      rowExpandable,
      lazy: lazyMap,
      lazyVersion: lazy.version,
    }),
    [dataSource, getKey, childrenColumnName, layout.leaves, leavesByKey, paginationEnabled, total, expansion.mode, hasLoader, rowExpandable, lazyMap, lazy.version],
  );
  const model = run(buildInput(effective, sort));

  // --- selection derivations (only when enabled) ---
  const selectionConfig = config.selection;
  const getCheckboxProps = selectionConfig.enabled ? selectionConfig.config.getCheckboxProps : undefined;
  const isDisabledRecord = useMemo(() => (getCheckboxProps === undefined ? null : (record: T) => getCheckboxProps(record).disabled === true), [getCheckboxProps]);

  const { allKeys, disabledSet } = useMemo(() => {
    if (!selectionConfig.enabled) return { allKeys: EMPTY_KEYS, disabledSet: EMPTY_SET };
    const keys = collectKeys(model.sorted, getKey, childrenColumnName);
    if (isDisabledRecord === null) return { allKeys: keys, disabledSet: EMPTY_SET };
    const disabled = new Set<Key>();
    for (const key of keys) {
      const record = model.recordByKey.get(key);
      if (record !== undefined && isDisabledRecord(record)) disabled.add(key);
    }
    return { allKeys: keys.filter((key) => !disabled.has(key)), disabledSet: disabled };
  }, [selectionConfig.enabled, model.sorted, model.recordByKey, getKey, childrenColumnName, isDisabledRecord]);

  const pageKeys = useMemo(() => {
    if (!selectionConfig.enabled) return EMPTY_KEYS;
    const keys: Key[] = [];
    for (const entry of model.flat) if (entry.kind === "row" && !disabledSet.has(entry.key)) keys.push(entry.key);
    return keys;
  }, [selectionConfig.enabled, model.flat, disabledSet]);

  const keyEntities = useMemo(
    () => (selectionConfig.enabled && !selectionConfig.checkStrictly ? buildKeyEntities(model.sorted, getKey, childrenColumnName, isDisabledRecord) : null),
    [selectionConfig, model.sorted, getKey, childrenColumnName, isDisabledRecord],
  );

  const preserve = selectionConfig.enabled && selectionConfig.preserveSelectedRowKeys;
  const selectedKeys = useMemo(
    () => (selectionConfig.enabled ? pruneKeys(effective.selectedKeys, (key) => model.recordByKey.has(key) || preserved.has(key), preserve) : EMPTY_KEYS),
    [selectionConfig.enabled, effective.selectedKeys, model.recordByKey, preserve, preserved],
  );
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const expandedSet = useMemo(() => new Set(effective.expandedKeys), [effective.expandedKeys]);

  // --- sticky cue (needs the scroller element from the UI layer) ---
  const fallbackScroller = useRef<HTMLDivElement | null>(null);
  const scroller = scrollerRef ?? fallbackScroller;
  useStickyScroll(scroller, layout.hasFixed && scrollerRef !== null);

  // --- wire the reducer context and emit dependencies for `send` ---
  const ctx = useMemo<ReduceContext<T>>(
    () => ({ leavesByKey, sortDirections: config.sortDirections, pageKeys, allKeys, keyEntities }),
    [leavesByKey, config.sortDirections, pageKeys, allKeys, keyEntities],
  );
  const rememberRecords = useCallback(
    (keys: readonly Key[]): void => {
      if (!preserve) return;
      const records = keys.map((key) => [key, getRecord(key)] as const).filter((pair): pair is readonly [Key, T] => pair[1] !== undefined);
      preserved.clear();
      for (const [key, record] of records) preserved.set(key, record);
    },
    [preserve, getRecord, preserved],
  );
  const scrollToTop = useCallback(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [scroller]);
  const deps = useMemo<EmitDeps<T>>(
    () => ({
      props,
      leavesByKey,
      paginationEnabled,
      modelFor: (state) => run(buildInput(state, reconcileSort(state.sort, leavesByKey))),
      resolveRecord: getRecord,
      rememberRecords,
      pageKeys,
      scrollToTop,
      scrollToFirstRowOnChange: config.scroll.scrollToFirstRowOnChange,
    }),
    [props, leavesByKey, paginationEnabled, run, buildInput, getRecord, rememberRecords, pageKeys, scrollToTop, config.scroll.scrollToFirstRowOnChange],
  );

  useLayoutEffect(() => {
    latestRef.current = { effective, flags, ctx, deps };
    modelRef.current = model;
  });

  // --- feature APIs ---
  const sorting = useMemo<SortingApi>(() => {
    const showPriority = sort.length > 1;
    return {
      orderOf: (columnKey) => sort.find((entry) => entry.columnKey === columnKey)?.order ?? null,
      priorityOf: (columnKey) => {
        if (!showPriority) return null;
        const index = sort.findIndex((entry) => entry.columnKey === columnKey);
        return index === -1 ? null : index + 1;
      },
      toggle: (columnKey) => send({ type: "sort/toggle", columnKey }),
    };
  }, [sort, send]);

  const filtering = useMemo<FilteringApi>(
    () => ({
      valuesOf: (columnKey) => effective.filters[String(columnKey)] ?? EMPTY_KEYS,
      set: (columnKey, values) => send({ type: "filter/set", columnKey, value: values }),
    }),
    [effective.filters, send],
  );

  const pagination = useMemo<PaginationApi | null>(() => {
    if (!config.pagination.enabled) return null;
    return {
      page: model.page.number,
      pageSize: model.page.pageSize,
      total: model.page.total,
      pages: totalPages(model.page.total, model.page.pageSize),
      server: model.page.server,
      setPage: (page) => send({ type: "page/set", current: page }),
      setPageSize: (pageSize) => send({ type: "page/setSize", pageSize }),
      resolved: config.pagination,
    };
  }, [config.pagination, model.page, send]);

  const selection = useMemo<SelectionApi<T> | null>(() => {
    if (!selectionConfig.enabled) return null;
    const pageAllChecked = pageKeys.length > 0 && pageKeys.every((key) => selectedSet.has(key));
    const pageIndeterminate = !pageAllChecked && pageKeys.some((key) => selectedSet.has(key));
    return {
      type: selectionConfig.type,
      selectedSet,
      selectedKeys,
      isSelected: (key) => selectedSet.has(key),
      isDisabled: (key) => disabledSet.has(key),
      checkboxProps: (record) => getCheckboxProps?.(record) ?? {},
      pageAllChecked,
      pageIndeterminate,
      pageHasChangeable: pageKeys.length > 0,
      changeableKeys: pageKeys,
      toggle: (key, selected, nativeEvent) => send(nativeEvent === undefined ? { type: "select/toggle", key, selected } : { type: "select/toggle", key, selected, nativeEvent }),
      radio: (key, nativeEvent) => send(nativeEvent === undefined ? { type: "select/radio", key } : { type: "select/radio", key, nativeEvent }),
      togglePage: (selected) => send({ type: "select/page", selected }),
      selectAll: () => send({ type: "select/all" }),
      invert: () => send({ type: "select/invert" }),
      none: () => send({ type: "select/none" }),
      custom: (keys) => send({ type: "select/custom", keys }),
      resolved: selectionConfig,
    };
  }, [selectionConfig, pageKeys, selectedSet, selectedKeys, disabledSet, getCheckboxProps, send]);

  const expansionApi = useMemo<ExpansionApi<T> | null>(() => {
    if (!expansion.enabled) return null;
    return {
      mode: expansion.mode,
      isExpanded: (key) => expandedSet.has(key),
      toggle: (key) => send({ type: "expand/toggle", key }),
      lazy: lazy.map,
      retry: lazy.retry,
      resolved: expansion,
    };
  }, [expansion, expandedSet, send, lazy.map, lazy.retry]);

  const reorder = useMemo<ReorderApi | null>(() => {
    if (!config.reorder.enabled) return null;
    return {
      order: layout.leaves.map((leaf) => leaf.key),
      draggableKeys: layout.leaves.filter((leaf) => leaf.draggable).map((leaf) => leaf.key),
      setOrder: (order) => send({ type: "columns/reorder", order }),
    };
  }, [config.reorder.enabled, layout.leaves, send]);

  return {
    props,
    config,
    layout,
    leavesByKey,
    state: effective,
    model,
    getKey,
    pageData: model.page.rows,
    send,
    sorting,
    filtering,
    pagination,
    selection,
    expansion: expansionApi,
    reorder,
  };
}
