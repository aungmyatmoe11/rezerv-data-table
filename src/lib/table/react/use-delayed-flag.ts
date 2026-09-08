import { useEffect, useState } from "react";

/**
 * `loading.delay` (antd-shaped): a fetch that resolves in 80 ms should not flash a skeleton, so
 * the loading UI only appears once the wait has actually lasted `delay` ms. If the wait ends
 * first, nothing is ever shown.
 *
 * `delay: 0` — the default — returns the flag untouched and starts no timer, keeping the common
 * path free of extra state, in line with the library's inert-by-default rule.
 */
export function useDelayedFlag(active: boolean, delay: number): boolean {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (!active || delay <= 0) return;
    const timer = setTimeout(() => setElapsed(true), delay);
    // cleanup က deactivate / delay ပြောင်း / unmount သုံးမျိုးလုံးကို ဖုံးလို့ ပြန်သုညချရာ နေရာ ဖြစ်တယ်
    return () => {
      clearTimeout(timer);
      setElapsed(false);
    };
  }, [active, delay]);

  return delay <= 0 ? active : active && elapsed;
}
