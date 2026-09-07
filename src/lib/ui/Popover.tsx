"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "./use-is-client";
import "./ui.css";

export type PopoverPlacement = "bottom-start" | "bottom-end" | "top";

interface PopoverProps {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  placement?: PopoverPlacement;
  /** Give the panel at least the trigger's width (used by Select). */
  matchAnchorWidth?: boolean;
  className?: string;
  id?: string;
  role?: string;
  "aria-label"?: string;
  children: ReactNode;
}

const GAP = 4;
const MARGIN = 8;

/**
 * The one floating layer every menu, listbox and tooltip uses.
 *
 * It renders in a portal because the table body is an `overflow: auto` scroller — a panel
 * rendered in place would be clipped by it — and positions itself from the trigger's viewport
 * rect, flipping above when there is not enough room below. Position is recomputed on scroll
 * and resize through rAF, so an open menu tracks its trigger without re-rendering the page.
 */
export function Popover({ anchorRef, open, onClose, placement = "bottom-start", matchAnchorWidth = false, className, id, role, children, ...aria }: PopoverProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const mounted = useIsClient();
  const [style, setStyle] = useState<CSSProperties>({ top: -9999, left: -9999 });

  const place = useCallback((): void => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (anchor === null || panel === null) return;
    const rect = anchor.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = panel;
    const below = rect.bottom + GAP;
    const flip = placement === "top" || (below + height > window.innerHeight && rect.top - GAP - height > 0);
    const top = flip ? rect.top - GAP - height : below;
    const rawLeft = placement === "bottom-end" ? rect.right - width : rect.left;
    const left = Math.min(Math.max(MARGIN, rawLeft), Math.max(MARGIN, window.innerWidth - width - MARGIN));
    setStyle({ top, left, ...(matchAnchorWidth ? { "--ui-anchor-width": `${rect.width}px` } : {}) } as CSSProperties);
  }, [anchorRef, placement, matchAnchorWidth]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const schedule = (): void => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        place();
      });
    };
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as Node | null;
      if (target === null) return;
      if (panelRef.current?.contains(target) === true) return;
      if (anchorRef.current?.contains(target) === true) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
      anchorRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !mounted) return null;
  return createPortal(
    <div ref={panelRef} id={id} role={role} aria-label={aria["aria-label"]} className={["ui-popover", className].filter(Boolean).join(" ")} style={style}>
      {children}
    </div>,
    document.body,
  );
}
