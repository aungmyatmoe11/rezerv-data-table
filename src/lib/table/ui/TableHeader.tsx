"use client";

import type { CSSProperties } from "react";
import type { TableInstance } from "../react/use-table";
import { SortableHeaderCell } from "./ColumnReorder";
import type { RowContext } from "./context";
import { HeaderCell } from "./HeaderCell";
import { SelectionHeader } from "./SelectionCell";

interface TableHeaderProps<T extends object> {
  table: TableInstance<T>;
  ctx: RowContext<T>;
}

export function TableHeader<T extends object>({ table, ctx }: TableHeaderProps<T>) {
  const { layout, config, sorting, filtering, selection, reorder, props } = table;
  const depth = layout.headerRows.length;
  const hasExpandColumn = ctx.expansionMode === "row" && ctx.showExpandColumn;
  const extrasEdge = ctx.stickyExtras && ctx.edgeLeftKey === null;

  let extraLeft = 0;
  const selectionStyle = ctx.stickyExtras ? ({ "--dt-left": `${extraLeft}px` } as CSSProperties) : undefined;
  if (selection !== null) extraLeft += ctx.extraWidths.selection;
  const expandStyle = ctx.stickyExtras ? ({ "--dt-left": `${extraLeft}px` } as CSSProperties) : undefined;
  if (hasExpandColumn) extraLeft += ctx.extraWidths.expand;
  const leftShift = ctx.stickyExtras ? extraLeft : 0;

  return (
    <thead className="dt__thead">
      {layout.headerRows.map((row, rowIndex) => {
        const rowAttrs = props.onHeaderRow?.(row.map((cell) => cell.column), rowIndex) ?? {};
        return (
          <tr key={rowIndex} {...rowAttrs}>
            {rowIndex === 0 && selection !== null ? (
              <th
                scope="col"
                className="dt__th dt__selection-cell"
                rowSpan={depth === 1 ? undefined : depth}
                style={selectionStyle}
                data-fixed={ctx.stickyExtras ? "left" : undefined}
                data-fixed-edge={extrasEdge && !hasExpandColumn ? "left" : undefined}
              >
                {selection.type === "checkbox" ? (
                  <SelectionHeader
                    allChecked={selection.pageAllChecked}
                    indeterminate={selection.pageIndeterminate}
                    disabled={!selection.pageHasChangeable}
                    hideSelectAll={selection.resolved.hideSelectAll}
                    title={selection.resolved.config.columnTitle}
                    locale={config.locale}
                    selections={selection.resolved.selections}
                    changeableKeys={selection.changeableKeys}
                    onTogglePage={selection.togglePage}
                    onSelectAll={selection.selectAll}
                    onInvert={selection.invert}
                    onNone={selection.none}
                  />
                ) : (
                  (selection.resolved.config.columnTitle ?? null)
                )}
              </th>
            ) : null}
            {rowIndex === 0 && hasExpandColumn ? (
              <th
                scope="col"
                className="dt__th dt__selection-cell"
                rowSpan={depth === 1 ? undefined : depth}
                style={expandStyle}
                data-fixed={ctx.stickyExtras ? "left" : ctx.expandFixed ?? undefined}
                data-fixed-edge={extrasEdge ? "left" : undefined}
              >
                {table.expansion?.resolved.config.columnTitle ?? null}
              </th>
            ) : null}
            {row.map((cell) => {
              const left = layout.leftOffsets.get(cell.key);
              const right = layout.rightOffsets.get(cell.key);
              const edge: "left" | "right" | null = cell.key === ctx.edgeLeftKey ? "left" : cell.key === ctx.edgeRightKey ? "right" : null;
              const shared = {
                cell,
                sorting,
                filtering,
                tableSortDirections: config.sortDirections,
                showSorterTooltip: config.showSorterTooltip,
                locale: config.locale,
                left: left === undefined ? undefined : left + leftShift,
                right,
                edge,
              };
              const sortable = reorder !== null && cell.leaf !== null && reorder.draggableKeys.includes(cell.key);
              return sortable ? (
                <SortableHeaderCell key={String(cell.key)} {...shared} />
              ) : (
                <HeaderCell key={String(cell.key)} {...shared} dragHandle={null} dragRef={undefined} dragStyle={undefined} dragging={false} />
              );
            })}
          </tr>
        );
      })}
    </thead>
  );
}
