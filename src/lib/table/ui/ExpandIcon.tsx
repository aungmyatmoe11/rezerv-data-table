"use client";

/**
 * The expand / collapse toggle, or a spacer of the same width when a row is not
 * expandable — so rows stay aligned either way.
 */
import { ChevronRightIcon } from "@/lib/ui";
import type { MouseEvent, ReactNode } from "react";
import type { ExpandIconContext } from "../core/types";

interface ExpandIconProps<T> {
  expanded: boolean;
  expandable: boolean;
  record: T;
  controlsId: string;
  labelExpand: string;
  labelCollapse: string;
  onToggle: () => void;
  custom: ((ctx: ExpandIconContext<T>) => ReactNode) | null;
}

export function ExpandIcon<T>({ expanded, expandable, record, controlsId, labelExpand, labelCollapse, onToggle, custom }: ExpandIconProps<T>) {
  if (custom !== null) {
    return custom({
      expanded,
      expandable,
      record,
      onExpand: (_record, event: MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        onToggle();
      },
    });
  }
  if (!expandable) return <span className="dt__expand-spacer" aria-hidden="true" />;
  return (
    <button
      type="button"
      className="dt__expand"
      aria-expanded={expanded}
      aria-controls={controlsId}
      aria-label={expanded ? labelCollapse : labelExpand}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      <ChevronRightIcon />
    </button>
  );
}
