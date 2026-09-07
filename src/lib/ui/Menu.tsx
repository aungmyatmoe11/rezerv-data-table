"use client";

import { useId, useRef, useState, type ReactNode, type Ref } from "react";
import { Popover } from "./Popover";
import "./ui.css";

export interface MenuItem {
  key: string;
  label: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
}

export interface MenuTriggerProps {
  ref: Ref<HTMLButtonElement>;
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
  "aria-controls": string | undefined;
  onClick: () => void;
}

interface MenuButtonProps {
  items: readonly MenuItem[];
  label: string;
  /** The consumer owns the trigger's markup; these props wire it to the menu. */
  renderTrigger: (props: MenuTriggerProps) => ReactNode;
}

/** Click-triggered menu: `role="menu"` panel, `role="menuitem"` buttons, Escape closes. */
export function MenuButton({ items, label, renderTrigger }: MenuButtonProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const menuId = useId();

  return (
    <>
      {renderTrigger({
        ref: triggerRef,
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": open ? menuId : undefined,
        onClick: () => setOpen((current) => !current),
      })}
      <Popover anchorRef={triggerRef} open={open} onClose={() => setOpen(false)} placement="bottom-end">
        <ul className="ui-menu" role="menu" id={menuId} aria-label={label}>
          {items.map((item) => (
            <li key={item.key} role="none">
              <button
                type="button"
                role="menuitem"
                className="ui-menu-item"
                disabled={item.disabled === true}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </Popover>
    </>
  );
}
