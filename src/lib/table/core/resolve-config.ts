/**
 * Props to resolved config: every feature becomes `{ enabled: false }` or
 * `{ enabled: true, ...defaults }`. This is what makes an unsupplied prop cost nothing — every hook
 * and renderer downstream branches on `enabled` rather than re-reading the raw props.
 */
import type { ReactNode } from "react";
import { isGroupColumn } from "./columns";
import { DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from "./pagination";
import { DEFAULT_SORT_DIRECTIONS } from "./sorting";
import type {
  BuiltinSelection,
  ColumnDef,
  ControlledFlags,
  DataTableProps,
  ExpandableConfig,
  ExpansionMode,
  FixedSide,
  PaginationConfig,
  PaginationPosition,
  RowSelectionConfig,
  SelectionItem,
  SortDirection,
  TableLocale,
  TableSize,
} from "./types";
import { warnOnce } from "./warnings";

export const ROW_HEIGHT_BY_SIZE: Record<TableSize, number> = { small: 39, middle: 47, large: 55 };

export const DEFAULT_LOCALE: Required<Omit<TableLocale, "emptyText" | "errorText" | "pageSizeLabel">> & {
  emptyText: ReactNode;
  errorText: ReactNode;
  pageSizeLabel: (size: number) => string;
} = {
  emptyText: "No data",
  errorText: "Something went wrong while loading this table.",
  retryText: "Retry",
  triggerAsc: "Click to sort ascending",
  triggerDesc: "Click to sort descending",
  cancelSort: "Click to cancel sorting",
  selectAll: "Select all rows on this page",
  selectInvert: "Invert current page",
  selectNone: "Clear all data",
  selectionAll: "Select all data",
  expand: "Expand row",
  collapse: "Collapse row",
  filterConfirm: "OK",
  filterReset: "Reset",
  pagePrev: "Previous page",
  pageNext: "Next page",
  pageJumpTo: "Go to",
  pageSizeLabel: (size) => `${size} / page`,
  sortPriority: "Sort priority",
};

export type ResolvedPagination =
  | { enabled: false }
  | {
      enabled: true;
      config: PaginationConfig;
      controlledPage: number | undefined;
      controlledPageSize: number | undefined;
      position: readonly PaginationPosition[];
      pageSizeOptions: readonly number[];
      showSizeChanger: boolean;
      showQuickJumper: boolean;
      simple: boolean;
      hideOnSinglePage: boolean;
      disabled: boolean;
      size: "default" | "small";
    };

export type ResolvedSelection<T> =
  | { enabled: false }
  | {
      enabled: true;
      config: RowSelectionConfig<T>;
      type: "checkbox" | "radio";
      checkStrictly: boolean;
      preserveSelectedRowKeys: boolean;
      hideSelectAll: boolean;
      fixed: boolean;
      columnWidth: number | string;
      selections: readonly (BuiltinSelection | SelectionItem)[] | null;
    };

export type ResolvedExpansion<T> =
  | { enabled: false; mode: "none" }
  | {
      enabled: true;
      mode: Exclude<ExpansionMode, "none">;
      config: ExpandableConfig<T>;
      childrenColumnName: string | null;
      hasLoader: boolean;
      cacheChildren: boolean;
      indentSize: number;
      showExpandColumn: boolean;
      expandRowByClick: boolean;
      fixed: FixedSide | null;
      columnWidth: number | string;
    };


export interface ResolvedLoading {
  active: boolean;
  mode: "skeleton" | "overlay";
  skeletonRows: number;
  indicator: ReactNode | undefined;
  delay: number;
}

export interface ResolvedConfig<T> {
  pagination: ResolvedPagination;
  selection: ResolvedSelection<T>;
  expansion: ResolvedExpansion<T>;
  scroll: { x: number | string | null; y: number | string | "auto" | null; scrollToFirstRowOnChange: boolean };
  sticky: { offsetHeader: number; offsetScroll: number } | null;
  virtual: boolean;
  loading: ResolvedLoading;
  size: TableSize;
  rowHeight: number;
  bordered: boolean;
  showHeader: boolean;
  tableLayout: "auto" | "fixed";
  rowHoverable: boolean;
  sortDirections: readonly SortDirection[];
  showSorterTooltip: boolean;
  locale: typeof DEFAULT_LOCALE;
  controlled: ControlledFlags;
  /** Initial (default*) values for uncontrolled slices. */
  defaults: { page: number; pageSize: number; selectedKeys: readonly import("./types").Key[]; expandedKeys: readonly import("./types").Key[]; expandAll: boolean };
}

function walkColumns<T>(columns: readonly ColumnDef<T>[], visit: (column: ColumnDef<T>) => void): void {
  for (const column of columns) {
    visit(column);
    if (isGroupColumn(column)) walkColumns(column.children, visit);
  }
}

/**
 * Props → normalised config. Every feature resolves to `{ enabled: false }` unless its prop is
 * supplied, so hooks and render paths can early-return without touching feature code.
 */
export function resolveConfig<T extends object>(props: DataTableProps<T>): ResolvedConfig<T> {
  const { pagination, rowSelection, expandable, scroll, sticky, virtual, loading, columns, dataSource } = props;

  let sortControlled = false;
  let filtersControlled = false;
  walkColumns(columns, (column) => {
    if ("sortOrder" in column) sortControlled = true;
    if ("filteredValue" in column) filtersControlled = true;
  });

  const resolvedPagination: ResolvedPagination =
    pagination === false
      ? { enabled: false }
      : {
          enabled: true,
          config: pagination ?? {},
          controlledPage: pagination?.current,
          controlledPageSize: pagination?.pageSize,
          position: pagination?.position ?? ["bottomRight"],
          pageSizeOptions: pagination?.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS,
          showSizeChanger: pagination?.showSizeChanger ?? false,
          showQuickJumper: pagination?.showQuickJumper ?? false,
          simple: pagination?.simple ?? false,
          hideOnSinglePage: pagination?.hideOnSinglePage ?? false,
          disabled: pagination?.disabled ?? false,
          size: pagination?.size ?? "default",
        };

  const resolvedSelection: ResolvedSelection<T> =
    rowSelection === undefined
      ? { enabled: false }
      : {
          enabled: true,
          config: rowSelection,
          type: rowSelection.type ?? "checkbox",
          checkStrictly: rowSelection.checkStrictly ?? true,
          preserveSelectedRowKeys: rowSelection.preserveSelectedRowKeys ?? false,
          hideSelectAll: rowSelection.hideSelectAll ?? false,
          fixed: rowSelection.fixed ?? false,
          columnWidth: rowSelection.columnWidth ?? 48,
          selections:
            rowSelection.selections === undefined || rowSelection.selections === false
              ? null
              : rowSelection.selections === true
                ? ["SELECT_ALL", "SELECT_INVERT", "SELECT_NONE"]
                : rowSelection.selections,
        };

  let resolvedExpansion: ResolvedExpansion<T> = { enabled: false, mode: "none" };
  if (expandable !== undefined) {
    const hasRender = typeof expandable.expandedRowRender === "function";
    if (hasRender && expandable.childrenColumnName !== undefined) {
      warnOnce("expandable:mode", "`expandedRowRender` and `childrenColumnName` are mutually exclusive; using `expandedRowRender`.");
    }
    const fixedRaw = expandable.fixed;
    resolvedExpansion = {
      enabled: true,
      mode: hasRender ? "row" : "tree",
      config: expandable,
      childrenColumnName: hasRender ? null : (expandable.childrenColumnName ?? "children"),
      hasLoader: typeof expandable.loadChildren === "function",
      cacheChildren: expandable.cacheChildren ?? true,
      indentSize: expandable.indentSize ?? 16,
      showExpandColumn: expandable.showExpandColumn ?? true,
      expandRowByClick: expandable.expandRowByClick ?? false,
      fixed: fixedRaw === true ? "left" : fixedRaw === "left" || fixedRaw === "right" ? fixedRaw : null,
      columnWidth: expandable.columnWidth ?? 48,
    };
  }

  const size = props.size ?? "middle";
  const rowHeight = props.rowHeight ?? ROW_HEIGHT_BY_SIZE[size];

  const isVirtual = virtual === true;
  if (isVirtual) {
    if (scroll?.y === undefined) warnOnce("virtual:scroll", "`virtual` needs `scroll.y` (a number or 'auto') to know the viewport height.");
    if (props.rowHeight === undefined) warnOnce("virtual:rowHeight", "`virtual` uses `rowHeight` for windowing; falling back to the `size` preset.");
  }

  const paginationConfig = pagination === false ? null : (pagination ?? {});
  const loadingConfig = typeof loading === "object" ? loading : {};
  const loadingActive = typeof loading === "boolean" ? loading : (loading?.spinning ?? loading !== undefined);
  const resolvedLoading: ResolvedLoading = {
    active: loadingActive,
    mode: loadingConfig.mode ?? (dataSource.length === 0 ? "skeleton" : "overlay"),
    skeletonRows:
      loadingConfig.skeletonRows ??
      (paginationConfig === null ? 6 : Math.min(paginationConfig.pageSize ?? paginationConfig.defaultPageSize ?? DEFAULT_PAGE_SIZE, 10)),
    indicator: loadingConfig.indicator,
    delay: loadingConfig.delay ?? 0,
  };

  const stickyConfig = sticky === undefined || sticky === false ? null : sticky === true ? {} : sticky;


  const controlled: ControlledFlags = {
    sort: sortControlled,
    filters: filtersControlled,
    page: pagination !== false && pagination?.current !== undefined,
    pageSize: pagination !== false && pagination?.pageSize !== undefined,
    selectedKeys: rowSelection?.selectedRowKeys !== undefined,
    expandedKeys: expandable?.expandedRowKeys !== undefined,
  };

  return {
    pagination: resolvedPagination,
    selection: resolvedSelection,
    expansion: resolvedExpansion,
    scroll: {
      x: scroll?.x === undefined ? null : scroll.x === true ? "max-content" : scroll.x,
      y: scroll?.y ?? null,
      scrollToFirstRowOnChange: scroll?.scrollToFirstRowOnChange ?? false,
    },
    sticky: stickyConfig === null ? null : { offsetHeader: stickyConfig.offsetHeader ?? 0, offsetScroll: stickyConfig.offsetScroll ?? 0 },
    virtual: isVirtual,
    loading: resolvedLoading,
    size,
    rowHeight,
    bordered: props.bordered ?? false,
    showHeader: props.showHeader ?? true,
    tableLayout: props.tableLayout ?? "auto",
    rowHoverable: props.rowHoverable ?? true,
    sortDirections: props.sortDirections ?? DEFAULT_SORT_DIRECTIONS,
    showSorterTooltip: props.showSorterTooltip ?? true,
    locale: { ...DEFAULT_LOCALE, ...stripUndefined(props.locale ?? {}) },
    controlled,
    defaults: {
      page: pagination !== false ? (pagination?.defaultCurrent ?? 1) : 1,
      pageSize: pagination !== false ? (pagination?.defaultPageSize ?? DEFAULT_PAGE_SIZE) : DEFAULT_PAGE_SIZE,
      selectedKeys: rowSelection?.defaultSelectedRowKeys ?? [],
      expandedKeys: expandable?.defaultExpandedRowKeys ?? [],
      expandAll: expandable?.defaultExpandAllRows ?? false,
    },
  };
}

function stripUndefined<O extends object>(value: O): Partial<O> {
  const out: Partial<O> = {};
  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined) (out as Record<string, unknown>)[key] = item;
  }
  return out;
}
