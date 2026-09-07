"use client";

import { memo, type CSSProperties, type MouseEvent } from "react";
import type { FlatEntry } from "../core/types";
import { spanKey } from "../core/warnings";
import { BodyCell } from "./BodyCell";
import type { RowContext } from "./context";
import { ExpandIcon } from "./ExpandIcon";
import { SelectionCell } from "./SelectionCell";

interface BodyRowProps<T> {
  ctx: RowContext<T>;
  entry: Extract<FlatEntry<T>, { kind: "row" }>;
  selected: boolean;
  ariaRowIndex: number | undefined;
}

function stickyStyle(offset: number | undefined, side: "left" | "right"): CSSProperties | undefined {
  if (offset === undefined) return undefined;
  return { [side === "left" ? "--dt-left" : "--dt-right"]: `${offset}px` } as CSSProperties;
}

function BodyRowInner<T>({ ctx, entry, selected, ariaRowIndex }: BodyRowProps<T>) {
  const { record, key, index, depth, expandable, expanded } = entry;
  const rowId = `${ctx.tableId}-row-${String(key)}`;
  const regionId = `${ctx.tableId}-region-${String(key)}`;
  const isTree = ctx.expansionMode === "tree";
  const hasExpandColumn = ctx.expansionMode === "row" && ctx.showExpandColumn;
  const hasSelection = ctx.selectionType !== null;
  const disabled = hasSelection && ctx.isSelectionDisabled(key);
  const checkboxProps = hasSelection ? ctx.checkboxProps(record) : undefined;

  const rowAttrs = ctx.onRow?.(record, index) ?? {};
  const className = ["dt__tr", typeof ctx.rowClassName === "function" ? ctx.rowClassName(record, index) : ctx.rowClassName, rowAttrs.className]
    .filter(Boolean)
    .join(" ");
  const clickable = ctx.expandRowByClick && expandable;
  const onClick = (event: MouseEvent<HTMLTableRowElement>): void => {
    rowAttrs.onClick?.(event);
    if (clickable && !event.defaultPrevented) ctx.onToggleExpand(key);
  };

  const expandToggle = expandable || ctx.expansionMode !== "none" ? (
    <ExpandIcon
      expanded={expanded}
      expandable={expandable}
      record={record}
      controlsId={regionId}
      labelExpand={ctx.locale.expand}
      labelCollapse={ctx.locale.collapse}
      onToggle={() => ctx.onToggleExpand(key)}
      custom={ctx.expandIcon}
    />
  ) : null;

  // extra leading columns are sticky when the first data column is fixed
  let extraLeft = 0;
  const selectionSticky = ctx.stickyExtras ? stickyStyle(extraLeft, "left") : undefined;
  if (hasSelection) extraLeft += ctx.extraWidths.selection;
  const expandSticky = ctx.stickyExtras ? stickyStyle(extraLeft, "left") : undefined;
  if (hasExpandColumn) extraLeft += ctx.extraWidths.expand;
  const leftShift = ctx.stickyExtras ? extraLeft : 0;
  const extrasEdge = ctx.stickyExtras && ctx.edgeLeftKey === null;

  return (
    <tr
      {...rowAttrs}
      id={rowId}
      className={className}
      onClick={onClick}
      aria-rowindex={ariaRowIndex}
      aria-selected={hasSelection ? selected : undefined}
      aria-expanded={ctx.expansionMode !== "none" && expandable ? expanded : undefined}
      data-row-key={String(key)}
      data-depth={isTree ? depth : undefined}
      data-selected={selected ? "true" : undefined}
      data-expanded={expanded ? "true" : undefined}
      data-hoverable={ctx.hoverable ? "true" : "false"}
      data-clickable={clickable ? "true" : undefined}
    >
      {hasSelection ? (
        <td
          className="dt__td dt__selection-cell"
          style={selectionSticky}
          data-fixed={ctx.stickyExtras ? "left" : undefined}
          data-fixed-edge={extrasEdge && !hasExpandColumn ? "left" : undefined}
        >
          <SelectionCell
            type={ctx.selectionType ?? "checkbox"}
            checked={selected}
            disabled={disabled || checkboxProps?.disabled === true}
            name={checkboxProps?.name}
            record={record}
            index={index}
            label={`Select row ${String(key)}`}
            onChange={(checked, nativeEvent) => (ctx.selectionType === "radio" ? ctx.onRadio(key, nativeEvent) : ctx.onToggleSelect(key, checked, nativeEvent))}
            renderCell={ctx.renderSelectionCell}
          />
        </td>
      ) : null}
      {hasExpandColumn ? (
        <td
          className="dt__td dt__selection-cell"
          style={expandSticky}
          data-fixed={ctx.stickyExtras ? "left" : ctx.expandFixed ?? undefined}
          data-fixed-edge={extrasEdge ? "left" : undefined}
        >
          {expandToggle}
        </td>
      ) : null}
      {ctx.leaves.map((leaf, leafIndex) => {
        const left = ctx.leftOffsets.get(leaf.key);
        const right = ctx.rightOffsets.get(leaf.key);
        const edge = leaf.key === ctx.edgeLeftKey ? "left" : leaf.key === ctx.edgeRightKey ? "right" : null;
        const prefix =
          isTree && leafIndex === 0 ? (
            <span className="dt__tree-cell" style={{ paddingInlineStart: depth * ctx.indentSize }}>
              {expandToggle}
            </span>
          ) : null;
        return (
          <BodyCell
            key={String(leaf.key)}
            leaf={leaf}
            record={record}
            index={index}
            rowKey={key}
            span={ctx.spans?.get(spanKey(key, leaf.key))}
            sorted={ctx.sortedKeys.has(leaf.key)}
            left={left === undefined ? undefined : left + leftShift}
            right={right}
            edge={edge}
            prefix={prefix}
            cellId={undefined}
          />
        );
      })}
    </tr>
  );
}

export const BodyRow = memo(BodyRowInner) as typeof BodyRowInner;
