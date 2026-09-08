/**
 * Writes the `data-ping-left` / `data-ping-right` attributes that CSS uses to
 * paint the pinned-column shadow, passive and rAF-coalesced, and only when the value changes.
 * Deliberately not React state: scrolling must never re-render the table.
 */
import { useEffect, type RefObject } from "react";

/**
 * Drives the pinned-column shadow cue without React state: a passive scroll listener
 * (rAF-coalesced) writes `data-ping-left` / `data-ping-right` on the scroller only when the
 * value changes. CSS does the rest. Attached only when the table has fixed columns.
 */
export function useStickyScroll(ref: RefObject<HTMLElement | null>, enabled: boolean): void {
  useEffect(() => {
    const el = ref.current;
    if (!enabled || el === null) return;

    let frame = 0;
    const update = (): void => {
      frame = 0;
      const { scrollLeft, clientWidth, scrollWidth } = el;
      const left = scrollLeft > 0 ? "true" : "false";
      const right = scrollLeft + clientWidth < scrollWidth - 1 ? "true" : "false";
      if (el.dataset.pingLeft !== left) el.dataset.pingLeft = left;
      if (el.dataset.pingRight !== right) el.dataset.pingRight = right;
    };
    const schedule = (): void => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(update);
    };

    update();
    el.addEventListener("scroll", schedule, { passive: true });
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
    observer?.observe(el);

    return () => {
      el.removeEventListener("scroll", schedule);
      observer?.disconnect();
      if (frame !== 0) cancelAnimationFrame(frame);
      delete el.dataset.pingLeft;
      delete el.dataset.pingRight;
    };
  }, [ref, enabled]);
}
