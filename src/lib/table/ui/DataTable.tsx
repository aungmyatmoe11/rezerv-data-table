"use client";

import { useId, useMemo, useRef, type CSSProperties } from "react";
import type { DataTableProps, Key, PaginationPosition } from "../core/types";
import { useAutoHeight } from "../react/use-auto-height";
import { useTable } from "../react/use-table";
import { ColumnReorderProvider } from "./ColumnReorder";
import type { RowContext } from "./context";
import { TableBody } from "./TableBody";
import { TableHeader } from "./TableHeader";
import { TablePagination } from "./TablePagination";
import { LoadingOverlay } from "./TableStates";
import { useTableCssVars } from "./theme";
import "./data-table.css";

const EMPTY_KEY_SET: ReadonlySet<Key> = new Set();

function toPx(value: number | string | null): string | undefined {
  if (value === null) return undefined;
  return typeof value === "number" ? `${value}px` : value;
}

function alignOf(position: PaginationPosition): "left" | "center" | "right" {
  return position.endsWith("Left") ? "left" : position.endsWith("Center") ? "center" : "right";
}

/**
 * From-scratch DataTable with an Ant Design-shaped API. Features are inert until their
 * config prop is supplied; see `useTable` for the headless layer.
 */
export function DataTable<T extends object>(props: DataTableProps<T>) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const table = useTable(props, scrollerRef);
  const autoHeight = useAutoHeight(wrapperRef, scrollerRef, table.config.scroll.y === "auto");
  const { config, layout, model, selection, expansion, pagination } = table;
  const generatedId = useId();
  const tableId = props.id ?? `dt${generatedId.replace(/:/g, "")}`;
  const cssVars = useTableCssVars(props.theme);

  const hasExpandColumn = expansion !== null && expansion.mode === "row" && expansion.resolved.showExpandColumn;
  const extraColumns = (selection === null ? 0 : 1) + (hasExpandColumn ? 1 : 0);
  const totalColumns = layout.leaves.length + extraColumns;
  const selectionWidth = selection === null ? 0 : typeof selection.resolved.columnWidth === "number" ? selection.resolved.columnWidth : 48;
  const expandWidth = hasExpandColumn ? (typeof expansion.resolved.columnWidth === "number" ? expansion.resolved.columnWidth : 48) : 0;
  const stickyExtras =
    extraColumns > 0 &&
    (layout.lastLeftKey !== null || (selection !== null && selection.resolved.fixed) || (hasExpandColumn && expansion.resolved.fixed === "left"));
  const hasFixed = layout.hasFixed || stickyExtras;

  const sortedKeys = useMemo<ReadonlySet<Key>>(() => (table.state.sort.length === 0 ? EMPTY_KEY_SET : new Set(table.state.sort.map((entry) => entry.columnKey))), [table.state.sort]);

  const ctx = useMemo<RowContext<T>>(
    () => ({
      tableId,
      leaves: layout.leaves,
      leftOffsets: layout.leftOffsets,
      rightOffsets: layout.rightOffsets,
      edgeLeftKey: layout.lastLeftKey,
      edgeRightKey: layout.firstRightKey,
      stickyExtras,
      extraWidths: { selection: selectionWidth, expand: expandWidth },
      spans: model.spans,
      sortedKeys,
      hoverable: config.rowHoverable,
      locale: config.locale,
      selectionType: selection?.type ?? null,
      isSelectionDisabled: selection?.isDisabled ?? (() => false),
      checkboxProps: selection?.checkboxProps ?? (() => ({})),
      onToggleSelect: selection?.toggle ?? (() => undefined),
      onRadio: selection?.radio ?? (() => undefined),
      renderSelectionCell: selection?.resolved.config.renderCell ?? null,
      expansionMode: expansion?.mode ?? "none",
      showExpandColumn: expansion?.resolved.showExpandColumn ?? false,
      expandRowByClick: expansion?.resolved.expandRowByClick ?? false,
      indentSize: expansion?.resolved.indentSize ?? 16,
      expandFixed: expansion?.resolved.fixed ?? null,
      onToggleExpand: expansion?.toggle ?? (() => undefined),
      expandIcon: expansion?.resolved.config.expandIcon ?? null,
      onRow: props.onRow ?? null,
      rowClassName: props.rowClassName ?? null,
    }),
    [tableId, layout, stickyExtras, selectionWidth, expandWidth, model.spans, sortedKeys, config.rowHoverable, config.locale, selection, expansion, props.onRow, props.rowClassName],
  );

  const loadingActive = config.loading.active;
  const showSkeleton = loadingActive && config.loading.mode === "skeleton";
  const showOverlay = loadingActive && config.loading.mode === "overlay";
  const stickyHeader = config.scroll.y !== null || config.sticky !== null;
  const headerTop = config.scroll.y === null && config.sticky !== null ? config.sticky.offsetHeader : 0;

  const rootStyle: CSSProperties & Record<`--dt-${string}`, string | undefined> = {
    ...cssVars,
    ...props.style,
    "--dt-row-height": `${config.rowHeight}px`,
    "--dt-header-top": `${headerTop}px`,
    "--dt-scroll-y": config.scroll.y === "auto" ? (autoHeight === null ? undefined : `${autoHeight}px`) : toPx(config.scroll.y),
    "--dt-scroll-x": config.scroll.x === "max-content" ? undefined : toPx(config.scroll.x),
  };

  const paginationBars = (edge: "top" | "bottom") =>
    pagination === null
      ? null
      : pagination.resolved.position
          .filter((position) => position.startsWith(edge))
          .map((position) => <TablePagination key={position} api={pagination} align={alignOf(position)} locale={config.locale} />);

  const title = props.title?.(table.pageData);
  const footer = props.footer?.(table.pageData);
  const summary = props.summary?.(table.pageData);

  const root = (
    <div
      ref={wrapperRef}
      id={tableId}
      className={["dt", props.className].filter(Boolean).join(" ")}
      style={rootStyle}
      data-size={config.size}
      data-bordered={config.bordered ? "true" : "false"}
      data-layout={config.tableLayout === "fixed" || hasFixed ? "fixed" : "auto"}
      data-sticky-header={stickyHeader ? "true" : "false"}
      data-virtual={config.virtual ? "true" : "false"}
      data-loading={loadingActive ? "true" : "false"}
      data-has-title={title !== undefined && title !== null ? "true" : "false"}
      data-has-footer={footer !== undefined && footer !== null ? "true" : "false"}
      data-fixed-gap={props.theme?.fixedColumnGap !== undefined && props.theme.fixedColumnGap > 0 ? "true" : undefined}
    >
      {title !== undefined && title !== null ? <div className="dt__title">{title}</div> : null}
      {paginationBars("top")}
      <div ref={scrollerRef} className="dt__scroller" onScroll={props.onScroll} tabIndex={hasFixed || config.scroll.x !== null ? 0 : undefined}>
        <table
          className="dt__table"
          style={{ width: config.scroll.x === "max-content" ? "max-content" : undefined, minWidth: config.scroll.x === "max-content" ? "100%" : undefined }}
          aria-label={props["aria-label"]}
          aria-labelledby={props["aria-labelledby"]}
          aria-busy={loadingActive || undefined}
          aria-rowcount={config.virtual ? model.flat.length + layout.headerRows.length : undefined}
        >
          <colgroup>
            {selection !== null ? <col style={{ width: selectionWidth }} /> : null}
            {hasExpandColumn ? <col style={{ width: expandWidth }} /> : null}
            {layout.leaves.map((leaf) => (
              <col key={String(leaf.key)} style={{ width: leaf.widthRaw, minWidth: leaf.minWidth }} />
            ))}
          </colgroup>
          {config.showHeader ? <TableHeader table={table} ctx={ctx} /> : null}
          <TableBody table={table} ctx={ctx} totalColumns={totalColumns} extraColumns={extraColumns} showSkeleton={showSkeleton} scrollerRef={scrollerRef} />
          {summary !== undefined && summary !== null ? <tfoot className="dt__summary">{summary}</tfoot> : null}
        </table>
        {showOverlay ? <LoadingOverlay indicator={config.loading.indicator} /> : null}
      </div>
      {paginationBars("bottom")}
      {footer !== undefined && footer !== null ? <div className="dt__footer">{footer}</div> : null}
      <div className="dt__live" aria-live="polite">
        {loadingActive ? "Loading" : props.error !== undefined && props.error !== null ? "Error" : ""}
      </div>
    </div>
  );

  // dnd-kit context only mounts when `columnReorder` is on — zero cost otherwise
  return table.reorder === null ? root : <ColumnReorderProvider reorder={table.reorder}>{root}</ColumnReorderProvider>;
}
