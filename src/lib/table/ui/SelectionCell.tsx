"use client";

import { DownOutlined } from "@ant-design/icons";
import { Checkbox, Dropdown, Radio } from "antd";
import type { ReactNode } from "react";
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
  const nameProp = name === undefined ? {} : { name };
  const origin =
    type === "radio" ? (
      <Radio
        {...nameProp}
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onChange(true, event.nativeEvent)}
      />
    ) : (
      <Checkbox
        {...nameProp}
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onChange(event.target.checked, event.nativeEvent)}
      />
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

  const items =
    selections?.map((item) => {
      if (item === "SELECT_ALL") return { key: "all", label: locale.selectionAll, onClick: onSelectAll };
      if (item === "SELECT_INVERT") return { key: "invert", label: locale.selectInvert, onClick: onInvert };
      if (item === "SELECT_NONE") return { key: "none", label: locale.selectNone, onClick: onNone };
      return { key: String(item.key), label: item.text, onClick: () => item.onSelect(changeableKeys) };
    }) ?? null;

  return (
    <span className="dt__selection-header">
      <Checkbox
        checked={allChecked}
        indeterminate={indeterminate}
        disabled={disabled}
        aria-label={locale.selectAll}
        onChange={(event) => onTogglePage(event.target.checked)}
      />
      {items !== null && items.length > 0 ? (
        <Dropdown
          trigger={["click"]}
          menu={{
            items: items.map(({ key, label }) => ({ key, label })),
            onClick: ({ key }) => items.find((item) => item.key === key)?.onClick(),
          }}
        >
          <button type="button" className="dt__selection-menu" aria-label={locale.selectAll} aria-haspopup="menu">
            <DownOutlined />
          </button>
        </Dropdown>
      ) : null}
    </span>
  );
}
