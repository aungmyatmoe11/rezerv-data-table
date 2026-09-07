"use client";

import { Button } from "antd";
import type { ReactNode } from "react";
import type { DEFAULT_LOCALE } from "../core/resolve-config";
import type { ExpandableConfig, FlatEntry, LazyEntry } from "../core/types";

interface ExpandedRowProps<T> {
  tableId: string;
  entry: Extract<FlatEntry<T>, { kind: "expanded" }>;
  colSpan: number;
  mode: "row" | "tree";
  config: ExpandableConfig<T>;
  hasLoader: boolean;
  lazy: LazyEntry | undefined;
  onRetry: () => void;
  locale: typeof DEFAULT_LOCALE;
  indentSize: number;
  /** Measurement ref under `virtual` (variable-height rows). */
  rowRef: ((node: HTMLTableRowElement | null) => void) | undefined;
}

function DefaultLoading() {
  return (
    <div className="dt__expanded-loading" aria-hidden="true">
      <span className="dt__skeleton-bar" style={{ width: "62%" }} />
      <span className="dt__skeleton-bar" style={{ width: "48%" }} />
      <span className="dt__skeleton-bar" style={{ width: "55%" }} />
    </div>
  );
}

/**
 * The region below an expanded row. Owns the loading / error / retry presentation for
 * on-demand children; hands ready data to `expandedRowRender`.
 */
export function ExpandedRow<T>({ tableId, entry, colSpan, mode, config, hasLoader, lazy, onRetry, locale, indentSize, rowRef }: ExpandedRowProps<T>) {
  const { record, index, depth, parentKey } = entry;
  const regionId = `${tableId}-region-${String(parentKey)}`;
  const rowId = `${tableId}-row-${String(parentKey)}`;
  const status = hasLoader ? (lazy?.status ?? "loading") : "ready";

  let body: ReactNode;
  if (status === "loading" || status === "idle") {
    body = config.renderLoading?.(record) ?? <DefaultLoading />;
  } else if (status === "error") {
    body = config.renderError?.(lazy?.error, onRetry, record) ?? (
      <div className="dt__expanded-error" role="alert">
        <span>{locale.errorText}</span>
        <Button size="small" onClick={onRetry}>
          {locale.retryText}
        </Button>
      </div>
    );
  } else if (mode === "row") {
    body = config.expandedRowRender?.(record, index, depth * indentSize, true, lazy?.data);
  } else {
    body = null; // tree mode renders children as rows; this sentinel only carries loading / error
  }
  if (body === null || body === undefined) return null;

  const className = ["dt__tr dt__expanded-row", typeof config.expandedRowClassName === "function" ? config.expandedRowClassName(record, index, depth * indentSize) : config.expandedRowClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <tr ref={rowRef} className={className} data-expanded-for={String(parentKey)}>
      <td className="dt__td" colSpan={colSpan}>
        <div className="dt__expanded">
          <div>
            <div id={regionId} className="dt__expanded-body" role="region" aria-labelledby={rowId} aria-busy={status === "loading"}>
              {body}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
