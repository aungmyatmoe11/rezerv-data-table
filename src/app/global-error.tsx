"use client";

import { Button } from "@/lib/ui";
import "./globals.css";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  /** Next 16.3: re-fetches and re-renders, rather than only clearing the error state. */
  retry: () => void;
}

/**
 * Last-resort boundary: it replaces the root layout, so it renders its own `<html>` / `<body>`
 * and depends on nothing above it — no providers, no shell, no colour-mode script. Only a crash
 * inside the layout itself gets here; everything else is caught one level down by `error.tsx`.
 */
export default function GlobalError({ error, retry }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body>
        <div className="app-error app-error-standalone" role="alert">
          <h1 className="page-title">The app failed to load</h1>
          <p className="page-subtitle">Something broke outside of any page. Reloading usually clears it.</p>
          {error.digest === undefined ? null : <p className="page-subtitle">Reference: {error.digest}</p>}
          <Button variant="primary" onClick={() => retry()}>
            Reload the app
          </Button>
        </div>
      </body>
    </html>
  );
}
