"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckIcon } from "./icons";
import "./ui.css";

interface ToastEntry {
  id: number;
  text: string;
}

interface ToastApi {
  success: (text: string) => void;
}

const ToastContext = createContext<ToastApi>({ success: () => undefined });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

const DURATION_MS = 2200;

/** Minimal transient feedback: a polite live region, auto-dismissed, never focus-stealing. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<readonly ToastEntry[]>([]);

  const success = useCallback((text: string): void => {
    const id = Date.now() + Math.random();
    setEntries((current) => [...current, { id, text }]);
    setTimeout(() => setEntries((current) => current.filter((entry) => entry.id !== id)), DURATION_MS);
  }, []);

  const api = useMemo<ToastApi>(() => ({ success }), [success]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="ui-toasts" aria-live="polite">
        {entries.map((entry) => (
          <div key={entry.id} className="ui-toast">
            <CheckIcon />
            {entry.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
