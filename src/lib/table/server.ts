/**
 * Server-safe entry point: pure helpers with no React / DOM / antd imports.
 * Use this from route handlers, server components and mock backends; use `@/lib/table`
 * for the component and hooks.
 */
export { defaultCompare, getByPath, toPath } from "./core/value";
export { clampPage, paginate, pageRange, totalPages } from "./core/pagination";
export { cycleOrder } from "./core/sorting";
export type { Key, SortOrder, SortDirection, SorterResult, TablePaginationState, FilterState } from "./core/types";
