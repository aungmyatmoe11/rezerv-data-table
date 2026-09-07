"use client";

import { useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CheckIcon, ChevronDownIcon } from "./icons";
import { Popover } from "./Popover";
import "./ui.css";

export interface SelectOption<V> {
  value: V;
  label: ReactNode;
  /** Text used for the trigger and the accessible name; derived from `label` when it is a string. */
  title?: string;
  disabled?: boolean;
}

interface SelectProps<V extends string | number> {
  value: V;
  options: readonly SelectOption<V>[];
  onChange: (value: V) => void;
  size?: "middle" | "small";
  disabled?: boolean;
  style?: CSSProperties;
  "aria-label"?: string;
}

function titleOf<V>(option: SelectOption<V> | undefined): string {
  if (option === undefined) return "";
  if (option.title !== undefined) return option.title;
  return typeof option.label === "string" ? option.label : String(option.value);
}

/**
 * Listbox built on the combobox pattern: the trigger owns `aria-expanded` / `aria-controls`,
 * the panel is a `role="listbox"` of `role="option"`s, and the keyboard does what a native
 * select does (arrows, Home / End, Enter, Escape, type-ahead is intentionally left out).
 */
export function Select<V extends string | number>({ value, options, onChange, size = "middle", disabled = false, style, ...aria }: SelectProps<V>) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex === -1 ? undefined : options[selectedIndex];

  const openList = (): void => {
    setActive(selectedIndex === -1 ? 0 : selectedIndex);
    setOpen(true);
  };

  const commit = (index: number): void => {
    const option = options[index];
    if (option === undefined || option.disabled === true) return;
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const move = (delta: number): void => {
    setActive((current) => {
      const count = options.length;
      for (let step = 1; step <= count; step += 1) {
        const next = (current + delta * step + count * count) % count;
        if (options[next]?.disabled !== true) return next;
      }
      return current;
    });
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openList();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      commit(active);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        className="ui-select-trigger"
        data-size={size}
        style={style}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={aria["aria-label"]}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span className="ui-select-value">{selected?.label ?? ""}</span>
        <ChevronDownIcon />
      </button>
      <Popover anchorRef={triggerRef} open={open} onClose={() => setOpen(false)} matchAnchorWidth>
        <ul className="ui-listbox" role="listbox" id={listId} aria-label={aria["aria-label"]}>
          {options.map((option, index) => (
            <li
              key={String(option.value)}
              role="option"
              className="ui-option"
              title={titleOf(option)}
              aria-selected={option.value === value}
              aria-disabled={option.disabled === true ? true : undefined}
              data-active={index === active ? "true" : undefined}
              onPointerEnter={() => setActive(index)}
              onClick={() => commit(index)}
            >
              <span>{option.label}</span>
              {option.value === value ? <CheckIcon /> : null}
            </li>
          ))}
        </ul>
      </Popover>
    </>
  );
}
