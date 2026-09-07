"use client";

import { AlertIcon, Button, Empty, Spinner } from "@/lib/ui";
import { isValidElement, type ReactNode } from "react";
import type { DEFAULT_LOCALE } from "../core/resolve-config";
import type { LeafColumn } from "../core/types";

interface SkeletonProps<T> {
  leaves: readonly LeafColumn<T>[];
  rows: number;
  extraColumns: number;
}

const WIDTHS = ["72%", "55%", "84%", "48%", "66%", "60%"];

/** Skeleton rows that follow the real column layout (widths, alignment, count). */
export function TableSkeleton<T>({ leaves, rows, extraColumns }: SkeletonProps<T>) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={rowIndex} className="dt__tr dt__skeleton-row" aria-hidden="true" data-hoverable="false">
          {Array.from({ length: extraColumns }, (_, i) => (
            <td key={`extra-${i}`} className="dt__td dt__selection-cell">
              <span className="dt__skeleton-bar" style={{ width: 16 }} />
            </td>
          ))}
          {leaves.map((leaf, leafIndex) => (
            <td key={String(leaf.key)} className="dt__td" data-align={leaf.align} data-fixed={leaf.fixed ?? undefined}>
              <span className="dt__skeleton-bar" style={{ width: WIDTHS[(rowIndex + leafIndex) % WIDTHS.length], marginInlineStart: leaf.align === "right" ? "auto" : undefined }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

interface EmptyProps {
  colSpan: number;
  emptyText: ReactNode;
}

export function TableEmpty({ colSpan, emptyText }: EmptyProps) {
  const custom = isValidElement(emptyText);
  return (
    <tr className="dt__tr dt__state-row" data-hoverable="false" data-state="empty">
      <td className="dt__td dt__state-cell" colSpan={colSpan}>
        {custom ? emptyText : <Empty description={emptyText} />}
      </td>
    </tr>
  );
}

interface ErrorProps {
  colSpan: number;
  error: unknown;
  onRetry: (() => void) | undefined;
  locale: typeof DEFAULT_LOCALE;
}

export function TableError({ colSpan, error, onRetry, locale }: ErrorProps) {
  const message = error instanceof Error && error.message.length > 0 ? error.message : locale.errorText;
  return (
    <tr className="dt__tr dt__state-row" data-hoverable="false" data-state="error">
      <td className="dt__td dt__state-cell" colSpan={colSpan}>
        <div className="dt__error" role="alert">
          <AlertIcon className="dt__error-icon" />
          <span>{message}</span>
          {onRetry !== undefined ? (
            <Button variant="primary" onClick={onRetry}>
              {locale.retryText}
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

export function LoadingOverlay({ indicator }: { indicator: ReactNode | undefined }) {
  return (
    <div className="dt__overlay" aria-hidden="true">
      {indicator ?? <Spinner />}
    </div>
  );
}
