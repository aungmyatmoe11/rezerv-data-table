import { latencyFor, sleep } from "./latency";

export const SCENARIOS = ["normal", "slow", "empty", "error", "fail-once", "malformed"] as const;
export type Scenario = (typeof SCENARIOS)[number];

export function isScenario(value: unknown): value is Scenario {
  return typeof value === "string" && (SCENARIOS as readonly string[]).includes(value);
}

export class MockApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "MockApiError";
  }
}

/** `fail-once` latch per scope so the first call fails and the retry succeeds. */
const failOnceLatch = new Set<string>();

export function resetScenarioLatches(): void {
  failOnceLatch.clear();
}

/**
 * Applies a scenario to a mock request: waits the realistic latency, then either throws
 * (error / fail-once), returns `empty: true`, or lets the caller respond normally.
 */
export async function applyScenario(scenario: Scenario, scope: string, kind: "list" | "detail", signal?: AbortSignal): Promise<{ empty: boolean; malformed: boolean }> {
  await sleep(latencyFor(scenario === "slow" ? "slow" : kind), signal);
  switch (scenario) {
    case "error":
      throw new MockApiError("The classes service is unavailable (503).", 503, true);
    case "fail-once":
      if (!failOnceLatch.has(scope)) {
        failOnceLatch.add(scope);
        throw new MockApiError("Temporary failure — please retry.", 503, true);
      }
      return { empty: false, malformed: false };
    case "empty":
      return { empty: true, malformed: false };
    case "malformed":
      return { empty: false, malformed: true };
    default:
      return { empty: false, malformed: false };
  }
}
