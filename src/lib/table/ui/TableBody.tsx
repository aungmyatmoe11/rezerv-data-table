"use client";

import type { TableInstance } from "../react/use-table";
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
}

export function TableBody<T extends object>({ table, ctx, totalColumns, extraColumns, showSkeleton }: TableBodyProps<T>) {
  const { model, config, selection, expansion, props } = table;

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
  return (
    <tbody className="dt__tbody">
      {model.flat.map((entry, position) =>
        entry.kind === "row" ? (
          <BodyRow key={String(entry.key)} ctx={ctx} entry={entry} selected={selection?.isSelected(entry.key) ?? false} ariaRowIndex={config.virtual ? headerRows + position + 1 : undefined} />
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
          />
        ) : null,
      )}
    </tbody>
  );
}
