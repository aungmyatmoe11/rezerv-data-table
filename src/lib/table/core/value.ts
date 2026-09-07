import type { Comparator, DataIndex, GetRowKey, Key } from "./types";
import { warnOnce } from "./warnings";

export function toPath(dataIndex: DataIndex | undefined): readonly (string | number)[] | null {
  if (dataIndex === undefined) return null;
  if (typeof dataIndex === "string") return dataIndex.length === 0 ? null : dataIndex.split(".");
  return dataIndex.length === 0 ? null : dataIndex;
}

export function pathKey(path: readonly (string | number)[]): string {
  return path.map(String).join(".");
}

export function getByPath(record: unknown, path: readonly (string | number)[] | null): unknown {
  if (path === null) return record;
  let current: unknown = record;
  for (const segment of path) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string | number, unknown>)[segment];
  }
  return current;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Default comparator: nulls last, then numbers / dates / booleans / strings.
 * Mixed types fall back to string comparison so the sort is total and never throws.
 */
export function defaultCompare(a: unknown, b: unknown): number {
  if (isNil(a) && isNil(b)) return 0;
  if (isNil(a)) return 1;
  if (isNil(b)) return -1;
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) && Number.isNaN(b)) return 0;
    if (Number.isNaN(a)) return 1;
    if (Number.isNaN(b)) return -1;
    return a - b;
  }
  if (typeof a === "bigint" && typeof b === "bigint") return a < b ? -1 : a > b ? 1 : 0;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "boolean" && typeof b === "boolean") return a === b ? 0 : a ? 1 : -1;
  return collator.compare(String(a), String(b));
}

/** Wraps a comparator so a NaN / non-numeric result becomes 0 instead of corrupting the sort. */
export function safeCompare<T>(compare: Comparator<T>): Comparator<T> {
  return (a, b) => {
    const result = compare(a, b);
    return typeof result === "number" && Number.isFinite(result) ? result : 0;
  };
}

export function compareByPath<T>(path: readonly (string | number)[] | null): Comparator<T> {
  return (a, b) => defaultCompare(getByPath(a, path), getByPath(b, path));
}

function coerceKey(value: unknown): Key | null {
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "bigint") return value.toString();
  return null;
}

/**
 * Never throws. A missing key warns once (dev) and falls back to a positional key so
 * the table still renders.
 */
export function resolveRowKey<T>(rowKey: (keyof T & string) | ((record: T) => Key) | undefined): GetRowKey<T> {
  if (typeof rowKey === "function") {
    return (record, index) => {
      const key = coerceKey(rowKey(record));
      if (key === null) {
        warnOnce("rowKey:fn", "`rowKey` function returned a non-key value; falling back to the row index.");
        return `__dt_${index}`;
      }
      return key;
    };
  }
  const field = rowKey ?? "key";
  return (record, index) => {
    const key = coerceKey((record as Record<string, unknown>)[field]);
    if (key === null) {
      warnOnce("rowKey:missing", `Each record needs a "${field}" property (or set \`rowKey\`); falling back to the row index.`);
      return `__dt_${index}`;
    }
    return key;
  };
}
