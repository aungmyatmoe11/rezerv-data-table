"use client";

import type { ReactNode } from "react";
import { Checkbox, ChevronDownIcon, MenuButton, Radio, type MenuItem } from "@/lib/ui";
import type { BuiltinSelection, Key, SelectionItem } from "../core/types";
import type { DEFAULT_LOCALE } from "../core/resolve-config";

interface SelectionCellProps<T> {
  type: "checkbox" | "radio";
  checked: boolean;
  disabled: boolean;
  name: string | undefined;
  record: T;
  index: number;
  label: string;
  onChange: (checked: boolean, nativeEvent: Event) => void;
  renderCell: ((checked: boolean, record: T, index: number, originNode: ReactNode) => ReactNode) | null;
}

export function SelectionCell<T>({ type, checked, disabled, name, record, index, label, onChange, renderCell }: SelectionCellProps<T>) {
  const shared = {
    checked,
    disabled,
    "aria-label": label,
    ...(name === undefined ? {} : { name }),
    onClick: (event: React.MouseEvent<HTMLInputElement>) => event.stopPropagation(),
  };
  const origin =
    type === "radio" ? (
      <Radio {...shared} onChange={(event) => onChange(true, event.nativeEvent)} />
    ) : (
      <Checkbox {...shared} onChange={(next, event) => onChange(next, event.nativeEvent)} />
    );
  return <>{renderCell === null ? origin : renderCell(checked, record, index, origin)}</>;
}

interface SelectionHeaderProps {
  allChecked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  hideSelectAll: boolean;
  title: ReactNode | undefined;
  locale: typeof DEFAULT_LOCALE;
  selections: readonly (BuiltinSelection | SelectionItem)[] | null;
  changeableKeys: readonly Key[];
  onTogglePage: (selected: boolean) => void;
  onSelectAll: () => void;
  onInvert: () => void;
  onNone: () => void;
}

export function SelectionHeader({ allChecked, indeterminate, disabled, hideSelectAll, title, locale, selections, changeableKeys, onTogglePage, onSelectAll, onInvert, onNone }: SelectionHeaderProps) {
  if (title !== undefined) return <>{title}</>;
  if (hideSelectAll) return null;

  const items: MenuItem[] =
    selections?.map((item) => {
      if (item === "SELECT_ALL") return { key: "all", label: locale.selectionAll, onSelect: onSelectAll };
      if (item === "SELECT_INVERT") return { key: "invert", label: locale.selectInvert, onSelect: onInvert };
      if (item === "SELECT_NONE") return { key: "none", label: locale.selectNone, onSelect: onNone };
      return { key: String(item.key), label: item.text, onSelect: () => item.onSelect(changeableKeys) };
    }) ?? [];

  return (
    <span className="dt__selection-header">
      <Checkbox checked={allChecked} indeterminate={indeterminate} disabled={disabled} aria-label={locale.selectAll} onChange={(next) => onTogglePage(next)} />
      {items.length > 0 ? (
        <MenuButton
          items={items}
          label={locale.selectionAll}
          renderTrigger={(props) => (
            <button {...props} type="button" className="dt__selection-menu" aria-label={locale.selectionAll}>
              <ChevronDownIcon />
            </button>
          )}
        />
      ) : null}
    </span>
  );
}
