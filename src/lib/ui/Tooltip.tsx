"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "./use-is-client";
import "./ui.css";

interface TooltipProps {
  title: ReactNode;
  /** Delay before showing on hover, in seconds (focus shows immediately). */
  delay?: number;
  children: ReactNode;
}

/**
 * Hover / focus tooltip. The anchor wraps the child so no ref forwarding is required of
 * callers, and the bubble is portalled so it is never clipped by the table's scroller.
 * It is `aria-describedby`-linked rather than replacing the control's own label.
 */
export function Tooltip({ title, delay = 0, children }: TooltipProps) {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({ top: -9999, left: -9999 });
  const mounted = useIsClient();
  const id = useId();
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  const show = (immediate: boolean): void => {
    const run = (): void => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (rect === undefined) return;
      setStyle({ top: rect.bottom + 6, left: Math.max(8, rect.left) });
      setOpen(true);
    };
    if (immediate || delay === 0) run();
    else timer.current = setTimeout(run, delay * 1000);
  };

  const hide = (): void => {
    if (timer.current !== null) clearTimeout(timer.current);
    setOpen(false);
  };

  return (
    <span
      ref={anchorRef}
      className="ui-tooltip-anchor"
      style={{ display: "inline-flex" }}
      onPointerEnter={() => show(false)}
      onPointerLeave={hide}
      onFocusCapture={() => show(true)}
      onBlurCapture={hide}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {open && mounted ? createPortal(
        <span role="tooltip" id={id} className="ui-tooltip" style={style}>
          {title}
        </span>,
        document.body,
      ) : null}
    </span>
  );
}
