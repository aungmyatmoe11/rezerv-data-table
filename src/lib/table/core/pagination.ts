/**
 * Page arithmetic: clamping, slicing, server-page detection
 * (`dataSource.length < total`) and the page-item list the pager renders. Pure numbers.
 */
import type { TablePaginationState } from "./types";

export const DEFAULT_PAGE_SIZE = 10;
export const DEFAULT_PAGE_SIZE_OPTIONS: readonly number[] = [10, 20, 50, 100];

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)));
}

/** Out-of-range or non-finite pages clamp into `[1, pages]`. */
export function clampPage(current: number, pageSize: number, total: number): number {
  const pages = totalPages(total, pageSize);
  if (!Number.isFinite(current)) return 1;
  return Math.min(Math.max(1, Math.floor(current)), pages);
}

/** Server-paged when the parent hands over fewer rows than `total` — inferred, not flagged. */
export function isServerPaged(dataLength: number, total: number | undefined): boolean {
  return total !== undefined && dataLength < total;
}

export interface PaginateResult<T> {
  rows: readonly T[];
  number: number;
  pageSize: number;
  total: number;
  server: boolean;
}

/** One pass: count, clamp and slice (never count and slice separately). */
export function paginate<T>(rows: readonly T[], current: number, pageSize: number, total: number | undefined): PaginateResult<T> {
  const size = Math.max(1, pageSize);
  if (isServerPaged(rows.length, total)) {
    const serverTotal = total ?? rows.length;
    const page = clampPage(current, size, serverTotal);
    // parent က page တစ်ခုထက် ပိုပို့လာရင်ပဲ slice လုပ်တယ်
    const pageRows = rows.length > size ? rows.slice(0, size) : rows;
    return { rows: pageRows, number: page, pageSize: size, total: serverTotal, server: true };
  }
  const clientTotal = rows.length;
  const page = clampPage(current, size, clientTotal);
  const start = (page - 1) * size;
  return { rows: rows.slice(start, start + size), number: page, pageSize: size, total: clientTotal, server: false };
}

export function paginationState(current: number, pageSize: number, total: number): TablePaginationState {
  return { current, pageSize, total };
}

/** 1-based inclusive range shown by `showTotal`. `[0, 0]` when empty. */
export function pageRange(current: number, pageSize: number, total: number): readonly [number, number] {
  if (total <= 0) return [0, 0];
  const start = (current - 1) * pageSize + 1;
  return [start, Math.min(total, current * pageSize)];
}

export type PageItem = { type: "page"; page: number } | { type: "jump-prev" | "jump-next"; page: number };

/**
 * Page buttons with jumpers: first and last are always present, a
 * window of `siblings` around the current page, and `•••` jumpers for the gaps.
 */
export function pageItems(current: number, pages: number, siblings = 1): readonly PageItem[] {
  const all = (from: number, to: number): PageItem[] => {
    const items: PageItem[] = [];
    for (let page = from; page <= to; page += 1) items.push({ type: "page", page });
    return items;
  };
  const minimal = 2 * siblings + 5; // first + jump + window + jump + last
  if (pages <= minimal) return all(1, pages);

  const left = Math.max(2, current - siblings);
  const right = Math.min(pages - 1, current + siblings);
  const items: PageItem[] = [{ type: "page", page: 1 }];
  if (left > 2) items.push({ type: "jump-prev", page: Math.max(1, current - 5) });
  else items.push(...all(2, left - 1));
  items.push(...all(left, right));
  if (right < pages - 1) items.push({ type: "jump-next", page: Math.min(pages, current + 5) });
  else items.push(...all(right + 1, pages - 1));
  items.push({ type: "page", page: pages });
  return items;
}
