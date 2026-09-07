"use client";

import { useMemo, type RefObject } from "react";
import type { Key } from "../core/types";
import { useRowHeights } from "../react/use-row-heights";
import type { TableInstance } from "../react/use-table";
import { useVirtualRows } from "../react/use-virtual-rows";
import { BodyRow } from "./BodyRow";
import type { RowContext } from "./context";
import { ExpandedRow } from "./ExpandedRow";
import { TableEmpty, TableError, TableSkeleton } from "./TableStates";

interface TableBodyProps<T extends object> {
  table: TableInstance<T>;
  ctx: RowContext<T>;
  totalColumns: number;
  extraColumns: number;
  showSkeleton: boolean;
  scrollerRef: RefObject<HTMLDivElement | null>;
}

const EMPTY_KEYS: readonly Key[] = [];

/**
 * The windowing hooks live here so a scroll under `virtual` re-renders only `<tbody>`;
 * header, pagination and the wrapper never see it.
 */
export function TableBody<T extends object>({ table, ctx, totalColumns, extraColumns, showSkeleton, scrollerRef }: TableBodyProps<T>) {
  const { model, config, selection, expansion, props } = table;
  const virtual = config.virtual;
  const hasRows = !showSkeleton && (props.error === undefined || props.error === null) && model.flat.length > 0;

  const keys = useMemo<readonly Key[]>(() => (virtual && hasRows ? model.flat.map((entry) => entry.key) : EMPTY_KEYS), [virtual, hasRows, model.flat]);
  const heights = useRowHeights(virtual && expansion !== null && expansion.mode === "row");
  const window = useVirtualRows(scrollerRef, {
    enabled: virtual && hasRows,
    keys,
    rowHeight: config.rowHeight,
    heights: heights.heights,
    version: heights.version,
    estimate: expansion?.resolved.config.expandedRowHeight ?? config.rowHeight * 3,
  });

  if (showSkeleton) {
    return (
      <tbody className="dt__tbody" aria-busy="true">
        <TableSkeleton leaves={table.layout.leaves} rows={config.loading.skeletonRows} extraColumns={extraColumns} />
      </tbody>
    );
  }
  if (props.error !== undefined && props.error !== null) {
    return (
      <tbody className="dt__tbody">
        <TableError colSpan={totalColumns} error={props.error} onRetry={props.onRetry} locale={config.locale} />
      </tbody>
    );
  }
  if (model.flat.length === 0) {
    return (
      <tbody className="dt__tbody">
        <TableEmpty colSpan={totalColumns} emptyText={config.locale.emptyText} />
      </tbody>
    );
  }

  const headerRows = config.showHeader ? table.layout.headerRows.length : 0;
  const start = window === null ? 0 : window.start;
  const slice = window === null ? model.flat : model.flat.slice(window.start, window.end);

  return (
    <tbody className="dt__tbody">
      {window !== null && window.top > 0 ? (
        <tr className="dt__spacer" aria-hidden="true">
          <td colSpan={totalColumns} style={{ height: window.top }} />
        </tr>
      ) : null}
      {slice.map((entry, offset) =>
        entry.kind === "row" ? (
          <BodyRow key={String(entry.key)} ctx={ctx} entry={entry} selected={selection?.isSelected(entry.key) ?? false} ariaRowIndex={virtual ? headerRows + start + offset + 1 : undefined} />
        ) : expansion !== null ? (
          <ExpandedRow
            key={entry.key}
            tableId={ctx.tableId}
            entry={entry}
            colSpan={totalColumns}
            mode={expansion.mode}
            config={expansion.resolved.config}
            hasLoader={expansion.resolved.hasLoader}
            lazy={expansion.lazy.get(entry.parentKey)}
            onRetry={() => expansion.retry(entry.parentKey)}
            locale={config.locale}
            indentSize={expansion.resolved.indentSize}
            rowRef={virtual ? heights.measure(entry.key) : undefined}
          />
        ) : null,
      )}
      {window !== null && window.bottom > 0 ? (
        <tr className="dt__spacer" aria-hidden="true">
          <td colSpan={totalColumns} style={{ height: window.bottom }} />
        </tr>
      ) : null}
    </tbody>
  );
}
