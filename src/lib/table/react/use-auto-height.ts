/**
 * Resolves `scroll.y: 'auto'` into a pixel height by measuring the space the
 * scroller has been given, so a table can fill its container without a hard-coded height.
 */
import { useEffect, useState, type RefObject } from "react";
import { warnOnce } from "../core/warnings";

/**
 * `scroll.y: 'auto'` — the body scroller fills whatever height the table's parent gives it,
 * minus the table's own chrome (title, pagination bars, footer). One ResizeObserver on the
 * parent; a single state update per resize.
 */
export function useAutoHeight(wrapperRef: RefObject<HTMLElement | null>, scrollerRef: RefObject<HTMLElement | null>, enabled: boolean): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const scroller = scrollerRef.current;
    if (!enabled || wrapper === null || scroller === null) return;
    const parent = wrapper.parentElement;
    if (parent === null || typeof ResizeObserver !== "function") return;

    const update = (): void => {
      const available = parent.clientHeight;
      if (available === 0) {
        warnOnce("scroll:auto", "`scroll.y: 'auto'` needs a parent with a definite height; falling back to natural height.");
        return;
      }
      const chrome = wrapper.offsetHeight - scroller.offsetHeight;
      const next = Math.max(120, available - chrome);
      setHeight((current) => (current !== null && Math.abs(current - next) < 1 ? current : next));
    };
    const observer = new ResizeObserver(update);
    observer.observe(parent);
    // wrapper chrome (pagination bar toggling, title) also changes the available body height
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [wrapperRef, scrollerRef, enabled]);

  return enabled ? height : null;
}
