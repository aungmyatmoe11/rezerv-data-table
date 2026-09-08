"use client";

import Link from "next/link";
import { Alert, Button, Space, Text } from "@/lib/ui";

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Route-level error boundary.
 *
 * The table owns *data* failures itself (`error` + `onRetry`). This catches the class it cannot:
 * an exception thrown while rendering — most often from a consumer's own `render` callback, or a
 * server component that threw. `reset()` re-renders this segment only, so a transient failure
 * costs a click instead of a full reload, and the header / nav stay usable throughout.
 */
export default function RouteError({ error, reset }: RouteErrorProps) {
  const message = error.message.length > 0 ? error.message : "This page stopped while rendering.";
  return (
    <div className="app-error">
      <h1 className="page-title">Something went wrong</h1>
      <p className="page-subtitle">The rest of the app is still running — you can retry this view or go back.</p>
      <Alert tone="danger">
        <div role="alert">
          <strong>{message}</strong>
          {/* production မှာ server error ရဲ့ message ကို Next က ဖျောက်ပြီး digest ပဲ ပေးတာမို့
              အဲဒါကို ပြထားမှ user က report တဲ့အခါ server log နဲ့ ပြန်တိုက်လို့ရမယ် */}
          {error.digest === undefined ? null : (
            <Text tone="secondary" style={{ display: "block", marginTop: 4, fontSize: 12 }}>
              Reference: {error.digest}
            </Text>
          )}
        </div>
      </Alert>
      <Space wrap>
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <Link className="app-error-link" href="/">
          Back to overview
        </Link>
      </Space>
    </div>
  );
}
