"use client";

/**
 * The column filter popover: the value list, its keyboard behaviour, and the
 * confirm / reset actions.
 */
import { useRef, useState } from "react";
import { Button, Checkbox, FilterIcon, Popover, Radio } from "@/lib/ui";
import type { DEFAULT_LOCALE } from "../core/resolve-config";
import type { FilterItem, Key } from "../core/types";

interface FilterDropdownProps {
  columnKey: Key;
  items: readonly FilterItem[];
  multiple: boolean;
  value: readonly Key[];
  locale: typeof DEFAULT_LOCALE;
  onChange: (values: Key[] | null) => void;
}

/** Column filter menu. The panel edits a draft; the filtering itself runs in `core/filtering`. */
export function FilterDropdown({ columnKey, items, multiple, value, locale, onChange }: FilterDropdownProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<readonly Key[]>(value);
  const active = value.length > 0;
  const label = `Filter ${String(columnKey)}`;

  const confirm = (): void => {
    onChange(draft.length === 0 ? null : [...draft]);
    setOpen(false);
  };
  const reset = (): void => {
    setDraft([]);
    onChange(null);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="dt__filter-trigger"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-active={active ? "true" : undefined}
        onClick={(event) => {
          event.stopPropagation();
          if (!open) setDraft(value);
          setOpen(!open);
        }}
      >
        <FilterIcon />
      </button>
      <Popover anchorRef={triggerRef} open={open} onClose={() => setOpen(false)} placement="bottom-end" role="dialog" aria-label={label}>
        <div className="dt__filter-menu" onClick={(event) => event.stopPropagation()}>
          {items.map((item) => {
            const checked = draft.includes(item.value);
            return (
              <label key={String(item.value)}>
                {multiple ? (
                  <Checkbox checked={checked} onChange={(next) => setDraft(next ? [...draft, item.value] : draft.filter((v) => v !== item.value))} />
                ) : (
                  <Radio checked={checked} onChange={() => setDraft([item.value])} />
                )}
                <span>{item.text}</span>
              </label>
            );
          })}
          <div className="dt__filter-actions">
            <Button size="small" variant="link" disabled={draft.length === 0 && !active} onClick={reset}>
              {locale.filterReset}
            </Button>
            <Button size="small" variant="primary" onClick={confirm}>
              {locale.filterConfirm}
            </Button>
          </div>
        </div>
      </Popover>
    </>
  );
}
