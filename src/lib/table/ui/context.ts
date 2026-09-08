/**
 * The row-level context passed from body to cells, so a cell reads what it needs from
 * one object instead of taking twenty props through three levels.
 */
import type { HTMLAttributes, MouseEvent, ReactNode } from "react";
import type { DEFAULT_LOCALE } from "../core/resolve-config";
import type { ExpandIconContext, FixedSide, Key, LeafColumn, SpanMap } from "../core/types";

/**
 * Everything a row needs that does NOT change per row. Memoised by DataTable so
 * `React.memo` rows only re-render when this object, their entry, or their own
 * selected/expanded flags change.
 */
export interface RowContext<T> {
  tableId: string;
  leaves: readonly LeafColumn<T>[];
  leftOffsets: ReadonlyMap<Key, number>;
  rightOffsets: ReadonlyMap<Key, number>;
  edgeLeftKey: Key | null;
  edgeRightKey: Key | null;
  /** Extra leading columns (selection / expand) that are sticky-left. */
  stickyExtras: boolean;
  extraWidths: { selection: number; expand: number };
  spans: SpanMap | null;
  sortedKeys: ReadonlySet<Key>;
  hoverable: boolean;
  locale: typeof DEFAULT_LOCALE;

  selectionType: "checkbox" | "radio" | null;
  isSelectionDisabled: (key: Key) => boolean;
  checkboxProps: (record: T) => { disabled?: boolean; name?: string };
  onToggleSelect: (key: Key, selected: boolean, nativeEvent?: Event) => void;
  onRadio: (key: Key, nativeEvent?: Event) => void;
  renderSelectionCell: ((checked: boolean, record: T, index: number, originNode: ReactNode) => ReactNode) | null;

  expansionMode: "none" | "row" | "tree";
  showExpandColumn: boolean;
  expandRowByClick: boolean;
  indentSize: number;
  expandFixed: FixedSide | null;
  onToggleExpand: (key: Key) => void;
  expandIcon: ((ctx: ExpandIconContext<T>) => ReactNode) | null;

  onRow: ((record: T, index: number) => HTMLAttributes<HTMLTableRowElement>) | null;
  rowClassName: string | ((record: T, index: number) => string) | null;
}

export type RowClickHandler<T> = (record: T, event: MouseEvent<HTMLTableRowElement>) => void;
