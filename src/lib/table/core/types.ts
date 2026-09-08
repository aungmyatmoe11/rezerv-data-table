/**
 * The public type surface: every prop, column shape and callback signature a consumer
 * touches, plus the typed `dataIndex` path machinery (`DataIndexPath`, `PathValue`) that makes
 * `render` receive a value typed from its path. Shapes only — no runtime behaviour lives here.
 */
import type { CSSProperties, HTMLAttributes, MouseEvent, ReactNode, UIEvent } from "react";

// ---------------------------------------------------------------------------
// Primitive vocabulary — the conventional names for these concepts.
// ---------------------------------------------------------------------------

export type Key = string | number;
export type SortOrder = "ascend" | "descend" | null;
export type SortDirection = Exclude<SortOrder, null>;
export type FixedSide = "left" | "right";
export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
export type TableSize = "small" | "middle" | "large";
export type Align = "left" | "center" | "right";

// ---------------------------------------------------------------------------
// Typed data paths — `dataIndex: 'unitPrice.amount'` is checked against T and
// `render(value)` receives the value type at that path. Depth is capped at 3 and
// array members collapse to `${number}` to keep the union small.
// ---------------------------------------------------------------------------

type Prev = [never, 0, 1, 2, 3];
type Scalar = string | number | boolean | bigint | symbol | null | undefined | Date | ((...args: never[]) => unknown);
type Idx<T> = keyof T & (string | number);

export type DataIndexPath<T, D extends number = 3> = [D] extends [never]
  ? never
  : T extends Scalar
    ? never
    : string extends keyof T
      ? string
      : T extends readonly (infer U)[]
        ? `${number}` | `${number}.${DataIndexPath<U, Prev[D]>}`
        : { [K in Idx<T>]-?: `${K}` | `${K}.${DataIndexPath<NonNullable<T[K]>, Prev[D]>}` }[Idx<T>];

type Step<T, K extends string> = T extends readonly (infer U)[]
  ? K extends `${number}`
    ? U | undefined
    : never
  : K extends keyof T
    ? T[K]
    : never;

export type PathValue<T, P extends string> = P extends `${infer H}.${infer R}`
  ? Step<T, H> extends infer V
    ? PathValue<NonNullable<V>, R> | Extract<V, null | undefined>
    : never
  : Step<T, P>;

export type DataIndex = string | readonly (string | number)[];

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

export interface CellSpanProps {
  colSpan?: number;
  rowSpan?: number;
  className?: string;
  style?: CSSProperties;
}

/** `render` may return plain content or `{ children, props }` to merge cells. */
export type CellResult = ReactNode | { children: ReactNode; props: CellSpanProps };

export type Comparator<T> = (a: T, b: T) => number;

/**
 * `true`  → server-side: the table only emits the sort change.
 * fn      → client-side comparator.
 * object  → `compare` for client-side, `multiple` = priority for multi-sort.
 */
export type Sorter<T> = boolean | Comparator<T> | { compare?: Comparator<T>; multiple?: number };

export interface FilterItem {
  text: ReactNode;
  value: Key;
}

export interface SortTitleContext {
  sortOrder: SortOrder;
}

export interface ColumnCommon<T> {
  key?: Key;
  title?: ReactNode | ((ctx: SortTitleContext) => ReactNode);
  width?: number | string;
  minWidth?: number;
  align?: Align;
  /** `true` is shorthand for `'left'`. */
  fixed?: FixedSide | boolean;
  hidden?: boolean;
  ellipsis?: boolean | { showTitle?: boolean };
  /** Column is shown only at or above these breakpoints. */
  responsive?: readonly Breakpoint[];
  className?: string;
  sorter?: Sorter<T>;
  /** Presence of this key (even `null`) makes the sort state controlled. */
  sortOrder?: SortOrder;
  defaultSortOrder?: SortOrder;
  sortDirections?: readonly SortDirection[];
  sortIcon?: (ctx: SortTitleContext) => ReactNode;
  showSorterTooltip?: boolean;
  filters?: readonly FilterItem[];
  onFilter?: (value: Key, record: T) => boolean;
  /** Presence of this key (even `null`) makes the filter state controlled. */
  filteredValue?: readonly Key[] | null;
  defaultFilteredValue?: readonly Key[];
  filterMultiple?: boolean;
  /** Header cell span. `0` hides the header cell. */
  colSpan?: number;
  onCell?: (record: T, index: number) => CellSpanProps;
  onHeaderCell?: (column: ColumnDef<T>) => HTMLAttributes<HTMLTableCellElement>;
}

export type DataColumn<T> = {
  [P in DataIndexPath<T>]: ColumnCommon<T> & {
    dataIndex: P;
    render?: (value: PathValue<T, P>, record: T, index: number) => CellResult;
    /**
     * Value → display text, for columns that only need formatting (dates, money, units).
     * `render` wins when both are given; the result is also the ellipsis tooltip, and swapping
     * the function is enough to change how a column reads — no markup rewrite.
     */
    formatter?: (value: PathValue<T, P>, record: T, index: number) => string;
  };
}[DataIndexPath<T>];

/** Escape hatch: array paths are not type-checked. */
export type LooseDataColumn<T> = ColumnCommon<T> & {
  dataIndex: readonly (string | number)[];
  render?: (value: unknown, record: T, index: number) => CellResult;
  formatter?: (value: unknown, record: T, index: number) => string;
};

/**
 * No `dataIndex`: `render` receives the whole record as `value`.
 * `dataIndex?: undefined` (not `never`) lets TypeScript discriminate the union by the
 * *absence* of `dataIndex`, so `render`'s parameters are inferred in plain object literals.
 */
export type DisplayColumn<T> = ColumnCommon<T> & {
  key: Key;
  dataIndex?: undefined;
  render: (value: T, record: T, index: number) => CellResult;
};

export interface GroupColumn<T> {
  key?: Key;
  title: ReactNode;
  dataIndex?: undefined;
  render?: undefined;
  children: ColumnDef<T>[];
  fixed?: FixedSide | boolean;
  align?: Align;
  className?: string;
  hidden?: boolean;
  responsive?: readonly Breakpoint[];
  onHeaderCell?: (column: ColumnDef<T>) => HTMLAttributes<HTMLTableCellElement>;
}

export type ColumnDef<T> = DataColumn<T> | LooseDataColumn<T> | DisplayColumn<T> | GroupColumn<T>;

/** Structural view of any non-group column, used internally after the group check. */
export type AnyLeafColumnDef<T> = ColumnCommon<T> & {
  dataIndex?: DataIndex;
  render?: (value: never, record: T, index: number) => CellResult;
  formatter?: (value: never, record: T, index: number) => string;
};

/** Identity helper that preserves literal `dataIndex` inference: `defineColumns<Row>()([...])`. */
export const defineColumns =
  <T,>() =>
  <const C extends readonly ColumnDef<T>[]>(columns: C): C =>
    columns;

// ---------------------------------------------------------------------------
// Feature configs — each is INERT unless supplied.
// ---------------------------------------------------------------------------

export type PaginationPosition = "topLeft" | "topCenter" | "topRight" | "bottomLeft" | "bottomCenter" | "bottomRight";

export interface PaginationConfig {
  current?: number;
  defaultCurrent?: number;
  pageSize?: number;
  defaultPageSize?: number;
  /** Server mode when `dataSource.length < total`; the table then renders `dataSource` as one page. */
  total?: number;
  pageSizeOptions?: readonly number[];
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: (total: number, range: readonly [number, number]) => ReactNode;
  position?: readonly PaginationPosition[];
  size?: "default" | "small";
  simple?: boolean;
  hideOnSinglePage?: boolean;
  disabled?: boolean;
  onChange?: (page: number, pageSize: number) => void;
  onShowSizeChange?: (current: number, size: number) => void;
}

export type SelectionChangeType = "all" | "none" | "invert" | "single" | "multiple";

export interface SelectionItem {
  key: Key;
  text: ReactNode;
  onSelect: (changeableRowKeys: readonly Key[]) => void;
}

export type BuiltinSelection = "SELECT_ALL" | "SELECT_INVERT" | "SELECT_NONE";

export interface RowSelectionConfig<T> {
  type?: "checkbox" | "radio";
  selectedRowKeys?: readonly Key[];
  defaultSelectedRowKeys?: readonly Key[];
  onChange?: (selectedRowKeys: Key[], selectedRows: T[], info: { type: SelectionChangeType }) => void;
  onSelect?: (record: T, selected: boolean, selectedRows: T[], nativeEvent: Event) => void;
  onSelectAll?: (selected: boolean, selectedRows: T[], changeRows: T[]) => void;
  getCheckboxProps?: (record: T) => { disabled?: boolean; name?: string };
  selections?: boolean | readonly (BuiltinSelection | SelectionItem)[];
  hideSelectAll?: boolean;
  columnWidth?: number | string;
  columnTitle?: ReactNode;
  fixed?: boolean;
  /** Keep keys of rows that are no longer in `dataSource`. */
  preserveSelectedRowKeys?: boolean;
  /** `false` links parent/child selection for tree data. Default `true`. */
  checkStrictly?: boolean;
  renderCell?: (checked: boolean, record: T, index: number, originNode: ReactNode) => ReactNode;
}

export interface ExpandIconContext<T> {
  expanded: boolean;
  expandable: boolean;
  record: T;
  onExpand: (record: T, event: MouseEvent<HTMLElement>) => void;
}

export interface ExpandableConfig<T, C = unknown> {
  /** Custom region below the row ('row' mode). Wins over `childrenColumnName`. */
  expandedRowRender?: (record: T, index: number, indent: number, expanded: boolean, children?: C) => ReactNode;
  /** Tree data: children rendered with the same columns, indented ('tree' mode). Default `'children'`. */
  childrenColumnName?: string;
  /** On-demand children. The table owns loading / error / retry / cache per row. */
  loadChildren?: (record: T, signal: AbortSignal) => Promise<C>;
  /** Default `true`. */
  cacheChildren?: boolean;
  renderLoading?: (record: T) => ReactNode;
  renderError?: (error: unknown, retry: () => void, record: T) => ReactNode;
  /** Fixed height estimate for expanded rows under `virtual`. */
  expandedRowHeight?: number;
  expandedRowKeys?: readonly Key[];
  defaultExpandedRowKeys?: readonly Key[];
  defaultExpandAllRows?: boolean;
  onExpand?: (expanded: boolean, record: T) => void;
  onExpandedRowsChange?: (expandedKeys: Key[]) => void;
  rowExpandable?: (record: T) => boolean;
  expandRowByClick?: boolean;
  expandIcon?: (ctx: ExpandIconContext<T>) => ReactNode;
  expandedRowClassName?: string | ((record: T, index: number, indent: number) => string);
  columnWidth?: number | string;
  columnTitle?: ReactNode;
  fixed?: boolean | FixedSide;
  indentSize?: number;
  showExpandColumn?: boolean;
}

export interface ScrollConfig {
  x?: number | string | true;
  /** `'auto'` fills the parent container (ResizeObserver). */
  y?: number | string | "auto";
  scrollToFirstRowOnChange?: boolean;
}

export interface StickyConfig {
  offsetHeader?: number;
  offsetScroll?: number;
  getContainer?: () => HTMLElement | Window;
}

export interface LoadingConfig {
  spinning?: boolean;
  delay?: number;
  indicator?: ReactNode;
  /** Default: `'skeleton'` when `dataSource` is empty, `'overlay'` otherwise. */
  mode?: "skeleton" | "overlay";
  skeletonRows?: number;
}

export interface TableLocale {
  emptyText?: ReactNode;
  errorText?: ReactNode;
  retryText?: ReactNode;
  triggerAsc?: string;
  triggerDesc?: string;
  cancelSort?: string;
  selectAll?: string;
  selectInvert?: string;
  selectNone?: string;
  selectionAll?: string;
  expand?: string;
  collapse?: string;
  filterConfirm?: string;
  filterReset?: string;
  pagePrev?: string;
  pageNext?: string;
  pageJumpTo?: string;
  pageSizeLabel?: (size: number) => string;
  sortPriority?: string;
}

export interface TableTheme {
  headerBg: string;
  headerColor: string;
  rowBg: string;
  hoverRowBg: string;
  selectedRowBg: string;
  sortedColumnBg: string;
  sortedHeaderBg: string;
  borderColor: string;
  stickyShadow: string;
  fixedColumnGap: number;
  radius: number;
  fontSize: number;
}

// ---------------------------------------------------------------------------
// Callback payloads
// ---------------------------------------------------------------------------

export interface SorterResult<T> {
  columnKey: Key;
  field?: DataIndex;
  column?: ColumnDef<T>;
  order: SortOrder;
}

export interface TablePaginationState {
  current: number;
  pageSize: number;
  total: number;
}

export type FilterState = Record<string, Key[] | null>;

export type ChangeAction = "paginate" | "sort" | "filter";

export interface ChangeExtra<T> {
  /** The full filtered + sorted dataset (not just the page). */
  currentDataSource: readonly T[];
  action: ChangeAction;
}

export type TableChangeHandler<T> = (
  pagination: TablePaginationState,
  filters: FilterState,
  sorter: SorterResult<T> | SorterResult<T>[],
  extra: ChangeExtra<T>,
) => void;

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

export interface DataTableProps<T extends object> {
  columns: readonly ColumnDef<T>[];
  dataSource: readonly T[];
  /** Default `'key'`. Missing or duplicate keys warn in development and fall back to the row index. */
  rowKey?: (keyof T & string) | ((record: T) => Key);

  // chrome
  bordered?: boolean;
  size?: TableSize;
  /** Row height in px. Overrides `size`. Required by `virtual`. */
  rowHeight?: number;
  showHeader?: boolean;
  tableLayout?: "auto" | "fixed";
  title?: (currentPageData: readonly T[]) => ReactNode;
  footer?: (currentPageData: readonly T[]) => ReactNode;
  summary?: (currentPageData: readonly T[]) => ReactNode;
  rowClassName?: string | ((record: T, index: number) => string);
  rowHoverable?: boolean;
  onRow?: (record: T, index: number) => HTMLAttributes<HTMLTableRowElement>;
  onHeaderRow?: (columns: readonly ColumnDef<T>[], index: number) => HTMLAttributes<HTMLTableRowElement>;

  // states
  loading?: boolean | LoadingConfig;
  error?: unknown;
  onRetry?: () => void;
  locale?: TableLocale;

  // features (inert unless supplied)
  pagination?: false | PaginationConfig;
  rowSelection?: RowSelectionConfig<T>;
  expandable?: ExpandableConfig<T>;
  scroll?: ScrollConfig;
  sticky?: boolean | StickyConfig;
  virtual?: boolean;
  sortDirections?: readonly SortDirection[];
  showSorterTooltip?: boolean;

  // the FE hook
  onChange?: TableChangeHandler<T>;
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;

  // theming
  className?: string;
  style?: CSSProperties;
  theme?: Partial<TableTheme>;
  /** Accessible name for the table. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  id?: string;
}

// ---------------------------------------------------------------------------
// Internal models (exported for hooks / ui / tests)
// ---------------------------------------------------------------------------

export type GetRowKey<T> = (record: T, index: number) => Key;

export interface LeafColumn<T> {
  key: Key;
  def: ColumnDef<T>;
  /** Normalised path; `null` for display columns. */
  path: readonly (string | number)[] | null;
  title: ReactNode | ((ctx: SortTitleContext) => ReactNode);
  fixed: FixedSide | null;
  /** Numeric width when known. */
  width: number | undefined;
  widthRaw: number | string | undefined;
  minWidth: number | undefined;
  align: Align;
  ellipsis: boolean;
  ellipsisTitle: boolean;
  className: string | undefined;
  sortable: boolean;
  /** Client comparator; `null` when the column sorts on the server (or is not sortable). */
  comparator: Comparator<T> | null;
  serverSort: boolean;
  multiple: number | false;
  sortDirections: readonly SortDirection[] | undefined;
  filterable: boolean;
  onFilter: ((value: Key, record: T) => boolean) | null;
  onCell: ((record: T, index: number) => CellSpanProps) | null;
  render: ((value: unknown, record: T, index: number) => CellResult) | null;
  formatter: ((value: unknown, record: T, index: number) => string) | null;
  /** Position among visible leaves. */
  index: number;
}

export interface HeaderCellModel<T> {
  key: Key;
  column: ColumnDef<T>;
  leaf: LeafColumn<T> | null;
  colSpan: number;
  rowSpan: number;
  fixed: FixedSide | null;
  align: Align;
  className: string | undefined;
}

export interface ColumnLayout<T> {
  leaves: readonly LeafColumn<T>[];
  headerRows: readonly (readonly HeaderCellModel<T>[])[];
  leftOffsets: ReadonlyMap<Key, number>;
  rightOffsets: ReadonlyMap<Key, number>;
  lastLeftKey: Key | null;
  firstRightKey: Key | null;
  hasFixed: boolean;
  /** Sum of numeric widths (0 when any leaf has no numeric width). */
  totalWidth: number;
  allWidthsNumeric: boolean;
}

export type ExpansionMode = "none" | "row" | "tree";

export type LazyStatus = "idle" | "loading" | "error" | "ready";

export interface LazyEntry<C = unknown> {
  status: LazyStatus;
  data?: C;
  error?: unknown;
}

export type FlatEntry<T> =
  | {
      kind: "row";
      key: Key;
      record: T;
      index: number;
      depth: number;
      parentKey: Key | null;
      hasChildren: boolean;
      expandable: boolean;
      expanded: boolean;
    }
  | {
      kind: "expanded";
      key: string;
      parentKey: Key;
      record: T;
      index: number;
      depth: number;
    };

export interface SortEntry {
  columnKey: Key;
  order: SortDirection;
  multiple: number | false;
}

export interface TableState {
  sort: readonly SortEntry[];
  filters: FilterState;
  page: { number: number; pageSize: number };
  selectedKeys: readonly Key[];
  expandedKeys: readonly Key[];
}

export interface ControlledFlags {
  sort: boolean;
  filters: boolean;
  page: boolean;
  pageSize: boolean;
  selectedKeys: boolean;
  expandedKeys: boolean;
}

export interface CellSpan {
  colSpan: number;
  rowSpan: number;
  hidden: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Keyed by `${rowKey} ${columnKey}`. */
export type SpanMap = ReadonlyMap<string, CellSpan>;
