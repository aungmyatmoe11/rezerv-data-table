/**
 * Resolves each cell's `onCell` colSpan / rowSpan into a map the body reads, so a cell
 * covered by a span from above renders nothing instead of overlapping it.
 */
import type { CellSpan, FlatEntry, LeafColumn, SpanMap } from "./types";
import { spanKey } from "./warnings";

/**
 * Resolves `onCell` col/row spans over the flattened rows of the current page and marks the
 * cells they cover as hidden. Returns `null` when no column declares `onCell` so the render
 * path can skip span lookups entirely.
 */
export function resolveSpans<T>(flat: readonly FlatEntry<T>[], leaves: readonly LeafColumn<T>[]): SpanMap | null {
  const spanned = leaves.filter((leaf) => leaf.onCell !== null);
  if (spanned.length === 0) return null;

  const map = new Map<string, CellSpan>();
  const rows = flat.filter((entry): entry is Extract<FlatEntry<T>, { kind: "row" }> => entry.kind === "row");
  const hide = (rowKey: string | number, columnKey: string | number): void => {
    const key = spanKey(rowKey, columnKey);
    const existing = map.get(key);
    map.set(key, existing === undefined ? { colSpan: 1, rowSpan: 1, hidden: true } : { ...existing, hidden: true });
  };

  rows.forEach((row, rowIndex) => {
    for (const leaf of spanned) {
      const props = leaf.onCell?.(row.record, row.index) ?? {};
      const colSpan = props.colSpan ?? 1;
      const rowSpan = props.rowSpan ?? 1;
      const key = spanKey(row.key, leaf.key);
      const existing = map.get(key);
      const cell: CellSpan = { colSpan, rowSpan, hidden: existing?.hidden === true || colSpan === 0 || rowSpan === 0 };
      if (props.className !== undefined) cell.className = props.className;
      if (props.style !== undefined) cell.style = props.style;
      map.set(key, cell);
      if (cell.hidden) continue;
      for (let c = 1; c < colSpan; c += 1) {
        const covered = leaves[leaf.index + c];
        if (covered !== undefined) hide(row.key, covered.key);
      }
      for (let r = 1; r < rowSpan; r += 1) {
        const covered = rows[rowIndex + r];
        if (covered !== undefined) hide(covered.key, leaf.key);
      }
    }
  });
  return map;
}
