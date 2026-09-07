"use client";

import type { ReactNode } from "react";
import "./ui.css";

export interface SegmentedOption<V> {
  label: ReactNode;
  value: V;
  disabled?: boolean;
}

interface SegmentedProps<V extends string | number> {
  value: V;
  options: readonly SegmentedOption<V>[];
  onChange: (value: V) => void;
  "aria-label"?: string;
}

/**
 * Radio group styled as a segmented control. Each option is a real button with
 * `role="radio"`, so it is clickable in tests and operable with the keyboard — arrow keys move
 * between options because the browser's focus order follows the DOM and each is focusable.
 */
export function Segmented<V extends string | number>({ value, options, onChange, ...aria }: SegmentedProps<V>) {
  return (
    <span className="ui-segmented" role="radiogroup" aria-label={aria["aria-label"]}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          className="ui-segmented-item"
          aria-checked={option.value === value}
          disabled={option.disabled === true}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </span>
  );
}
