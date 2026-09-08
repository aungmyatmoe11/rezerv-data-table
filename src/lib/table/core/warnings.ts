/**
 * The development-only warning channel. Bad input degrades rather than throwing — a
 * duplicate row key or an unknown sort field warns here exactly once, then falls back.
 */
const seen = new Set<string>();

const isDev = (): boolean => typeof process !== "undefined" && process.env?.NODE_ENV !== "production";

/** Development-only, de-duplicated warning. Never throws. */
export function warnOnce(key: string, message: string): void {
  if (!isDev() || seen.has(key)) return;
  seen.add(key);
  console.warn(`[DataTable] ${message}`);
}

/** Test helper. */
export function resetWarnings(): void {
  seen.clear();
}

/** Compose a stable key from a row key and a column key. */
export function spanKey(rowKey: string | number, columnKey: string | number): string {
  return `${String(rowKey)} ${String(columnKey)}`;
}
