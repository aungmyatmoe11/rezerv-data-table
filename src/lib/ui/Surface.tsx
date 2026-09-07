"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "./use-is-client";
import { ChevronRightIcon, CloseIcon } from "./icons";
import { Button } from "./Button";
import "./ui.css";

export function Space({ wrap = false, children, style }: { wrap?: boolean; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="ui-space" data-wrap={wrap ? "true" : undefined} style={style}>
      {children}
    </div>
  );
}

export function Card({ title, icon, children, style }: { title?: ReactNode; icon?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <section className="ui-card" style={style}>
      {title === undefined ? null : (
        <h2 className="ui-card-title">
          {icon}
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

export interface CollapseItem {
  key: string;
  label: ReactNode;
  children: ReactNode;
}

/** Accordion that allows any number of open panels; each header is a real disclosure button. */
export function Collapse({ items, defaultOpenKeys = [] }: { items: readonly CollapseItem[]; defaultOpenKeys?: readonly string[] }) {
  const [openKeys, setOpenKeys] = useState<readonly string[]>(defaultOpenKeys);
  return (
    <div className="ui-collapse">
      {items.map((item) => {
        const open = openKeys.includes(item.key);
        return (
          <div key={item.key} className="ui-collapse-panel">
            <button
              type="button"
              className="ui-collapse-trigger"
              aria-expanded={open}
              onClick={() => setOpenKeys((keys) => (open ? keys.filter((key) => key !== item.key) : [...keys, item.key]))}
            >
              <ChevronRightIcon />
              {item.label}
            </button>
            {open ? <div className="ui-collapse-body">{item.children}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

interface DrawerProps {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  width?: number;
  children: ReactNode;
}

/**
 * Right-side panel. While open it takes `role="dialog" aria-modal`, locks body scroll and
 * closes on Escape; focus moves to the panel so the keyboard lands inside it.
 */
export function Drawer({ open, title, onClose, width = 520, children }: DrawerProps) {
  const mounted = useIsClient();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;
  return createPortal(
    <>
      <div className="ui-drawer-mask" onClick={onClose} />
      <aside className="ui-drawer" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined} style={{ "--ui-drawer-width": `${width}px` } as CSSProperties}>
        <header className="ui-drawer-head">
          <span>{title}</span>
          <Button variant="text" shape="circle" size="small" aria-label="Close" icon={<CloseIcon />} onClick={onClose} />
        </header>
        <div className="ui-drawer-body">{children}</div>
      </aside>
    </>,
    document.body,
  );
}
