"use client";

import { FilterFilled } from "@ant-design/icons";
import { Button, Checkbox, Dropdown, Radio } from "antd";
import { useState } from "react";
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

/** Column filter menu (antd `Dropdown` + `Checkbox`/`Radio`); the filtering itself runs in core. */
export function FilterDropdown({ columnKey, items, multiple, value, locale, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<readonly Key[]>(value);
  const active = value.length > 0;

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
    <Dropdown
      trigger={["click"]}
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(value);
        setOpen(next);
      }}
      popupRender={() => (
        <div className="dt__filter-menu" role="group" aria-label={`Filter ${String(columnKey)}`} onClick={(event) => event.stopPropagation()}>
          {items.map((item) => {
            const checked = draft.includes(item.value);
            return (
              <label key={String(item.value)}>
                {multiple ? (
                  <Checkbox checked={checked} onChange={(event) => setDraft(event.target.checked ? [...draft, item.value] : draft.filter((v) => v !== item.value))} />
                ) : (
                  <Radio checked={checked} onChange={() => setDraft([item.value])} />
                )}
                <span>{item.text}</span>
              </label>
            );
          })}
          <div className="dt__filter-actions">
            <Button size="small" type="link" disabled={draft.length === 0 && !active} onClick={reset}>
              {locale.filterReset}
            </Button>
            <Button size="small" type="primary" onClick={confirm}>
              {locale.filterConfirm}
            </Button>
          </div>
        </div>
      )}
    >
      <button
        type="button"
        className="dt__filter-trigger"
        aria-label={`Filter ${String(columnKey)}`}
        aria-haspopup="true"
        aria-expanded={open}
        data-active={active ? "true" : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <FilterFilled />
      </button>
    </Dropdown>
  );
}
