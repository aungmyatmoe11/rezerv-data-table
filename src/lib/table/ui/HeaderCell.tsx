"use client";

import { CaretDownOutlined, CaretUpOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import type { DEFAULT_LOCALE } from "../core/resolve-config";
import { cycleOrder } from "../core/sorting";
import type { ColumnDef, FilterItem, HeaderCellModel, Key, SortDirection, SortOrder } from "../core/types";
import type { FilteringApi, SortingApi } from "../react/use-table";
import { FilterDropdown } from "./FilterDropdown";

interface HeaderCellProps<T> {
  cell: HeaderCellModel<T>;
  sorting: SortingApi;
  filtering: FilteringApi;
  tableSortDirections: readonly SortDirection[];
  showSorterTooltip: boolean;
  locale: typeof DEFAULT_LOCALE;
  left: number | undefined;
  right: number | undefined;
  edge: "left" | "right" | null;
  dragHandle: ReactNode;
  dragAttributes: Record<string, unknown> | undefined;
  dragging: boolean;
}

function ariaSort(order: SortOrder): "ascending" | "descending" | "none" {
  return order === "ascend" ? "ascending" : order === "descend" ? "descending" : "none";
}

/** Structural view over the header-relevant column props (leaf or group). */
interface HeaderColumnView<T> {
  title?: ReactNode | ((ctx: { sortOrder: SortOrder }) => ReactNode);
  showSorterTooltip?: boolean;
  sortIcon?: (ctx: { sortOrder: SortOrder }) => ReactNode;
  filters?: readonly FilterItem[];
  filterMultiple?: boolean;
  onHeaderCell?: (column: ColumnDef<T>) => HTMLAttributes<HTMLTableCellElement>;
}

export function HeaderCell<T>({ cell, sorting, filtering, tableSortDirections, showSorterTooltip, locale, left, right, edge, dragHandle, dragAttributes, dragging }: HeaderCellProps<T>) {
  const { leaf } = cell;
  const key: Key = cell.key;
  const order = leaf?.sortable ? sorting.orderOf(key) : null;
  const priority = leaf?.sortable ? sorting.priorityOf(key) : null;
  const columnDef = cell.column as unknown as HeaderColumnView<T>;
  const title = typeof columnDef.title === "function" ? columnDef.title({ sortOrder: order }) : columnDef.title;
  const headerAttrs: HTMLAttributes<HTMLTableCellElement> = columnDef.onHeaderCell?.(cell.column) ?? {};

  const style: CSSProperties & Record<string, string | undefined> = {
    "--dt-left": left === undefined ? undefined : `${left}px`,
    "--dt-right": right === undefined ? undefined : `${right}px`,
  };

  let content: ReactNode = title;
  if (leaf?.sortable) {
    const nextOrder = cycleOrder(order, leaf.sortDirections ?? tableSortDirections);
    const tooltip = nextOrder === "ascend" ? locale.triggerAsc : nextOrder === "descend" ? locale.triggerDesc : locale.cancelSort;
    const icon =
      columnDef.sortIcon?.({ sortOrder: order }) ??
      (
        <span className="dt__sort-icons" aria-hidden="true">
          <span data-active={order === "ascend" ? "true" : undefined}>
            <CaretUpOutlined />
          </span>
          <span data-active={order === "descend" ? "true" : undefined}>
            <CaretDownOutlined />
          </span>
        </span>
      );
    const button = (
      <button type="button" className="dt__sort" onClick={() => sorting.toggle(key)} aria-label={typeof title === "string" ? `${title}: ${tooltip}` : tooltip}>
        <span className="dt__sort-label">{title}</span>
        {priority !== null ? (
          <span className="dt__sort-priority" title={locale.sortPriority}>
            {priority}
          </span>
        ) : null}
        {icon}
      </button>
    );
    const wantTooltip = columnDef.showSorterTooltip ?? showSorterTooltip;
    content = wantTooltip ? (
      <Tooltip title={tooltip} mouseEnterDelay={0.3}>
        {button}
      </Tooltip>
    ) : (
      button
    );
  }

  const filter =
    leaf?.filterable && columnDef.filters !== undefined ? (
      <FilterDropdown columnKey={key} items={columnDef.filters} multiple={columnDef.filterMultiple !== false} value={filtering.valuesOf(key)} locale={locale} onChange={(values) => filtering.set(key, values)} />
    ) : null;

  return (
    <th
      {...headerAttrs}
      {...dragAttributes}
      scope={cell.leaf !== null ? "col" : "colgroup"}
      className={["dt__th", cell.className, headerAttrs.className].filter(Boolean).join(" ")}
      style={style}
      colSpan={cell.colSpan === 1 ? undefined : cell.colSpan}
      rowSpan={cell.rowSpan === 1 ? undefined : cell.rowSpan}
      aria-sort={leaf?.sortable ? ariaSort(order) : undefined}
      data-column={String(key)}
      data-align={cell.align}
      data-sorted={order !== null ? "true" : undefined}
      data-fixed={cell.fixed ?? undefined}
      data-fixed-edge={edge ?? undefined}
      data-ellipsis={leaf?.ellipsis ? "true" : undefined}
      data-draggable={dragHandle !== null ? "true" : undefined}
      data-dragging={dragging ? "true" : undefined}
    >
      {dragHandle}
      {content}
      {filter}
    </th>
  );
}
