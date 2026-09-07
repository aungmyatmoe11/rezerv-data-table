/** Abort-aware sleep — a cancelled request rejects immediately instead of lingering. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function abortError(): Error {
  const error = new Error("The request was aborted.");
  error.name = "AbortError";
  return error;
}

/** Realistic API latency: a base plus a little jitter. */
export function latencyFor(kind: "list" | "detail" | "slow"): number {
  const jitter = Math.floor(Math.random() * 120);
  switch (kind) {
    case "slow":
      return 1800 + jitter;
    case "detail":
      return 350 + jitter;
    default:
      return 500 + jitter;
  }
}
