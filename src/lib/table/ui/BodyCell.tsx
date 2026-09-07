"use client";

import { isValidElement, memo, type CSSProperties, type ReactNode } from "react";
import type { CellResult, CellSpan, Key, LeafColumn } from "../core/types";
import { getByPath } from "../core/value";

interface BodyCellProps<T> {
  leaf: LeafColumn<T>;
  record: T;
  index: number;
  rowKey: Key;
  span: CellSpan | undefined;
  sorted: boolean;
  left: number | undefined;
  right: number | undefined;
  edge: "left" | "right" | null;
  /** Rendered before the value (tree indent + expand toggle) for the first column in tree mode. */
  prefix: ReactNode;
  cellId: string | undefined;
}

function titleOf(content: ReactNode, value: unknown): string | undefined {
  if (typeof content === "string") return content.length === 0 ? undefined : content;
  if (typeof content === "number") return String(content);
  if (typeof value === "string") return value.length === 0 ? undefined : value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return undefined;
}

function isSpanResult(result: CellResult): result is { children: ReactNode; props: { colSpan?: number; rowSpan?: number } } {
  return typeof result === "object" && result !== null && !isValidElement(result) && "props" in result && !Array.isArray(result);
}

function BodyCellInner<T>({ leaf, record, index, rowKey, span, sorted, left, right, edge, prefix, cellId }: BodyCellProps<T>) {
  const value = getByPath(record, leaf.path);
  const formatted = leaf.formatter === null ? undefined : leaf.formatter(value, record, index);
  const raw =
    leaf.render !== null
      ? leaf.render(value, record, index)
      : (formatted ?? (value === null || value === undefined ? "" : String(value)));
  let content: ReactNode;
  let colSpan = span?.colSpan ?? 1;
  let rowSpan = span?.rowSpan ?? 1;
  if (isSpanResult(raw)) {
    content = raw.children;
    if (raw.props.colSpan !== undefined) colSpan = raw.props.colSpan;
    if (raw.props.rowSpan !== undefined) rowSpan = raw.props.rowSpan;
  } else {
    content = raw as ReactNode;
  }
  if (span?.hidden === true || colSpan === 0 || rowSpan === 0) return null;

  const style: CSSProperties & Record<string, string | number | undefined> = {
    ...span?.style,
    "--dt-left": left === undefined ? undefined : `${left}px`,
    "--dt-right": right === undefined ? undefined : `${right}px`,
  };
  // ellipsis cells expose their full text on hover; custom renders fall back to the raw value
  const title = leaf.ellipsis && leaf.ellipsisTitle ? titleOf(content, value) : undefined;
  const className = ["dt__td", leaf.className, span?.className].filter(Boolean).join(" ");

  return (
    <td
      id={cellId}
      className={className}
      style={style}
      colSpan={colSpan === 1 ? undefined : colSpan}
      rowSpan={rowSpan === 1 ? undefined : rowSpan}
      data-column={String(leaf.key)}
      data-row={String(rowKey)}
      data-align={leaf.align}
      data-sorted={sorted ? "true" : undefined}
      data-fixed={leaf.fixed ?? undefined}
      data-fixed-edge={edge ?? undefined}
      data-ellipsis={leaf.ellipsis ? "true" : undefined}
      title={title}
    >
      {prefix}
      {content}
    </td>
  );
}

export const BodyCell = memo(BodyCellInner) as typeof BodyCellInner;
