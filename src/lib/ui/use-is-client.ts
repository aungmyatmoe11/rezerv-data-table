"use client";

import { useSyncExternalStore } from "react";

const subscribe = (): (() => void) => () => undefined;
const onClient = (): boolean => true;
const onServer = (): boolean => false;

/**
 * `false` during server rendering and the hydration pass, `true` afterwards — the guard every
 * portal needs, expressed as an external store rather than a mount effect (no setState in an
 * effect, and React uses the server snapshot while hydrating, so the markup always matches).
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, onClient, onServer);
}
