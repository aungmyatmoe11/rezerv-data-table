"use client";

import { ChevronLeftIcon, ChevronRightIcon, NumberInput, Select } from "@/lib/ui";
import { pageItems, pageRange } from "../core/pagination";
import type { DEFAULT_LOCALE } from "../core/resolve-config";
import type { PaginationApi } from "../react/use-table";

interface TablePaginationProps {
  api: PaginationApi;
  align: "left" | "center" | "right";
  locale: typeof DEFAULT_LOCALE;
  /** Accessible name; a nested table's pager must not collide with its parent's. */
  label: string;
}

/** Hand-built pagination — markup, keyboard behaviour and page-window logic are all ours. */
export function TablePagination({ api, align, locale, label }: TablePaginationProps) {
  const { resolved, page: pageNumber, pageSize, total, pages } = api;
  const { config } = resolved;
  if (resolved.hideOnSinglePage && pages <= 1) return null;
  const disabled = resolved.disabled;
  const range = pageRange(pageNumber, pageSize, total);
  const small = resolved.size === "small";

  const go = (page: number): void => {
    if (disabled) return;
    const next = Math.min(Math.max(1, page), pages);
    if (next !== pageNumber) api.setPage(next);
  };

  const prev = (
    <button type="button" className="dt__page-btn" aria-label={locale.pagePrev} disabled={disabled || pageNumber <= 1} onClick={() => go(pageNumber - 1)}>
      <ChevronLeftIcon />
    </button>
  );
  const next = (
    <button type="button" className="dt__page-btn" aria-label={locale.pageNext} disabled={disabled || pageNumber >= pages} onClick={() => go(pageNumber + 1)}>
      <ChevronRightIcon />
    </button>
  );

  return (
    <nav className="dt__pagination" aria-label={label} data-align={align} data-size={small ? "small" : "default"}>
      {config.showTotal !== undefined ? <span className="dt__pagination-total">{config.showTotal(total, range)}</span> : null}
      {resolved.simple ? (
        <span className="dt__page-simple">
          {prev}
          <span aria-live="polite">
            {pageNumber} / {pages}
          </span>
          {next}
        </span>
      ) : (
        <ul className="dt__page-list">
          <li>{prev}</li>
          {pageItems(pageNumber, pages).map((item) =>
            item.type === "page" ? (
              <li key={item.page}>
                <button
                  type="button"
                  className="dt__page-btn"
                  aria-current={item.page === pageNumber ? "page" : undefined}
                  aria-label={`Page ${item.page}`}
                  disabled={disabled}
                  onClick={() => go(item.page)}
                >
                  {item.page}
                </button>
              </li>
            ) : (
              <li key={item.type}>
                <button
                  type="button"
                  className="dt__page-btn"
                  data-jump="true"
                  aria-label={item.type === "jump-prev" ? "Jump back 5 pages" : "Jump forward 5 pages"}
                  disabled={disabled}
                  onClick={() => go(item.page)}
                >
                  •••
                </button>
              </li>
            ),
          )}
          <li>{next}</li>
        </ul>
      )}
      {resolved.showSizeChanger ? (
        <Select
          size={small ? "small" : "middle"}
          aria-label="Rows per page"
          value={pageSize}
          disabled={disabled}
          options={resolved.pageSizeOptions.map((size) => ({ value: size, label: locale.pageSizeLabel(size) }))}
          onChange={(size) => api.setPageSize(size)}
          style={{ minWidth: 110 }}
        />
      ) : null}
      {resolved.showQuickJumper ? (
        <label className="dt__page-jumper">
          <span>{locale.pageJumpTo}</span>
          <NumberInput
            size={small ? "small" : "middle"}
            aria-label={locale.pageJumpTo}
            min={1}
            max={pages}
            disabled={disabled}
            style={{ width: 64 }}
            value={null}
            onChange={() => undefined}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              const value = Number((event.target as HTMLInputElement).value);
              if (Number.isFinite(value)) go(value);
            }}
          />
        </label>
      ) : null}
    </nav>
  );
}
