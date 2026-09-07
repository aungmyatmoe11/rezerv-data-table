import type { PaginationPosition, TableSize } from "@/lib/table";
import type { TimeFormat } from "../format";

export type LoadingMode = "off" | "skeleton" | "overlay" | "custom";
export type SelectionMode = "off" | "checkbox" | "radio";
export type ExpansionMode = "off" | "inline" | "on-demand" | "tree";
export type RowsPreset = 12 | 200 | 10_000;
export type ScrollY = "off" | "fixed" | "auto";

export interface PlaygroundConfig {
  // chrome
  bordered: boolean;
  size: TableSize;
  rowHeight: number | null;
  title: boolean;
  footer: boolean;
  summary: boolean;
  showHeader: boolean;
  hoverable: boolean;
  // data & states
  rows: RowsPreset;
  loading: LoadingMode;
  empty: boolean;
  error: boolean;
  // pagination
  pagination: boolean;
  pageSize: number;
  paginationPosition: PaginationPosition | "topAndBottom";
  showSizeChanger: boolean;
  showQuickJumper: boolean;
  showTotal: boolean;
  simplePagination: boolean;
  // selection
  selection: SelectionMode;
  selectionsMenu: boolean;
  disableCancelled: boolean;
  // expansion
  expansion: ExpansionMode;
  expandRowByClick: boolean;
  // layout
  fixedLeft: boolean;
  fixedRight: boolean;
  fixedGap: boolean;
  scrollX: boolean;
  scrollY: ScrollY;
  stickyHeader: boolean;
  hideColumn: "none" | "instructor" | "location";
  ellipsis: boolean;
  responsive: boolean;
  /** `column.formatter` — swaps how the Time column reads without touching its markup. */
  timeFormat: TimeFormat;
  spans: boolean;
  // sorting & filtering
  multiSort: boolean;
  sortedHighlight: boolean;
  sortedColor: string;
  filters: boolean;
  // performance
  virtual: boolean;
}

export const DEFAULT_CONFIG: PlaygroundConfig = {
  bordered: false,
  size: "middle",
  rowHeight: null,
  title: false,
  footer: false,
  summary: false,
  showHeader: true,
  hoverable: true,
  rows: 12,
  loading: "off",
  empty: false,
  error: false,
  pagination: true,
  pageSize: 5,
  paginationPosition: "bottomRight",
  showSizeChanger: false,
  showQuickJumper: false,
  showTotal: false,
  simplePagination: false,
  selection: "off",
  selectionsMenu: false,
  disableCancelled: false,
  expansion: "off",
  expandRowByClick: false,
  fixedLeft: true,
  fixedRight: false,
  fixedGap: false,
  scrollX: true,
  scrollY: "off",
  stickyHeader: false,
  hideColumn: "none",
  ellipsis: false,
  responsive: false,
  timeFormat: "day-time",
  spans: false,
  multiSort: false,
  sortedHighlight: true,
  sortedColor: "",
  filters: false,
  virtual: false,
};

export interface Preset {
  key: string;
  label: string;
  description: string;
  config: Partial<PlaygroundConfig>;
}

export const PRESETS: readonly Preset[] = [
  { key: "required", label: "Required features", description: "Sort, paginate, expand, sticky column — the assignment floor.", config: { expansion: "inline", showTotal: true } },
  { key: "selection", label: "Selection & operations", description: "Checkbox column, select-all menu, disabled rows, bulk actions.", config: { selection: "checkbox", selectionsMenu: true, disableCancelled: true, showTotal: true } },
  { key: "dense", label: "Dense report", description: "Small size, borders, title / footer / summary, fixed header, ellipsis.", config: { size: "small", bordered: true, title: true, footer: true, summary: true, scrollY: "fixed", ellipsis: true, fixedRight: true, showSizeChanger: true, showQuickJumper: true } },
  { key: "tree", label: "Tree data", description: "Recurring series as parent rows with occurrences as children.", config: { expansion: "tree", selection: "checkbox" } },
  { key: "bigdata", label: "10,000 rows (virtual)", description: "Virtual windowing over ten thousand rows, no pagination.", config: { rows: 10_000, virtual: true, pagination: false, scrollY: "fixed", rowHeight: 44 } },
  { key: "everything", label: "Everything on", description: "Every attribute enabled at once — nothing conflicts.", config: { bordered: true, title: true, footer: true, summary: true, selection: "checkbox", selectionsMenu: true, expansion: "inline", fixedRight: true, scrollY: "fixed", stickyHeader: true, showSizeChanger: true, showQuickJumper: true, showTotal: true, multiSort: true, filters: true, ellipsis: true } },
];

// --- URL codec (only non-default keys are written) ---------------------------

export function configToSearch(config: PlaygroundConfig): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(DEFAULT_CONFIG) as (keyof PlaygroundConfig)[]) {
    const value = config[key];
    if (value === DEFAULT_CONFIG[key]) continue;
    params.set(key, value === null ? "null" : String(value));
  }
  return params.toString();
}

export function configFromSearch(search: string): Partial<PlaygroundConfig> {
  const params = new URLSearchParams(search);
  const partial: Partial<PlaygroundConfig> = {};
  for (const key of Object.keys(DEFAULT_CONFIG) as (keyof PlaygroundConfig)[]) {
    const raw = params.get(key);
    if (raw === null) continue;
    const fallback = DEFAULT_CONFIG[key];
    let value: unknown;
    if (raw === "null") value = null;
    else if (typeof fallback === "boolean") value = raw === "true";
    else if (typeof fallback === "number" || fallback === null) value = Number(raw);
    else value = raw;
    (partial as Record<string, unknown>)[key] = value;
  }
  return partial;
}
