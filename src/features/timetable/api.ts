import { defaultCompare } from "@/lib/table/core";
import { isScenario, MockApiError, applyScenario, type Scenario } from "@/mocks/scenarios";
import { attendeesOf, classesFor } from "./data";
import type { Attendee, ClassSession, RowCount } from "./types";

export interface ListClassesParams {
  page: number;
  pageSize: number;
  sortField?: string | undefined;
  sortOrder?: "ascend" | "descend" | undefined;
  scenario: Scenario;
  rows: RowCount;
  /** Changes the `fail-once` latch scope so the scenario can be replayed. */
  nonce: string;
}

export interface ListClassesResult {
  data: ClassSession[];
  total: number;
}

const SORTABLE: ReadonlySet<string> = new Set(["name", "instructor", "startAt", "bookedCount", "status"]);

/**
 * The "backend": in-memory implementation shared by the Next route handlers (server mode)
 * and the client-mode demo. Models a production endpoint: latency, paging, sorting, failures.
 */
export async function listClassesMock(params: ListClassesParams, signal?: AbortSignal): Promise<ListClassesResult> {
  const outcome = await applyScenario(params.scenario, `classes:${params.nonce}`, "list", signal);
  if (outcome.malformed) throw new MockApiError("Malformed response from the classes service.", 502, false);
  if (outcome.empty) return { data: [], total: 0 };

  let rows = classesFor(params.rows);
  if (params.sortField !== undefined && params.sortOrder !== undefined && SORTABLE.has(params.sortField)) {
    const field = params.sortField as keyof ClassSession;
    const sign = params.sortOrder === "ascend" ? 1 : -1;
    rows = rows.slice().sort((a, b) => sign * defaultCompare(a[field], b[field]));
  }
  const pageSize = Math.min(Math.max(1, params.pageSize), 100);
  const start = (Math.max(1, params.page) - 1) * pageSize;
  return { data: rows.slice(start, start + pageSize), total: rows.length };
}

export async function listAttendeesMock(session: ClassSession, scenario: Scenario, nonce: string, signal?: AbortSignal): Promise<Attendee[]> {
  const outcome = await applyScenario(scenario, `attendees:${session.id}:${nonce}`, "detail", signal);
  if (outcome.malformed) throw new MockApiError("Malformed response from the attendees service.", 502, false);
  if (outcome.empty) return [];
  return [...attendeesOf(session)];
}

// ---------------------------------------------------------------------------
// HTTP transport (server mode) — talks to the Next.js route handlers.
// ---------------------------------------------------------------------------

function toQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined) query.set(key, String(value));
  return query.toString();
}

async function parseResponse<R>(response: Response, validate: (body: unknown) => body is R): Promise<R> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (body as { error?: { message?: string; retryable?: boolean } } | null)?.error;
    throw new MockApiError(error?.message ?? `Request failed (${response.status}).`, response.status, error?.retryable ?? response.status >= 500);
  }
  if (!validate(body)) throw new MockApiError("Malformed response from the server.", 502, false);
  return body;
}

const isListResult = (body: unknown): body is ListClassesResult =>
  typeof body === "object" && body !== null && Array.isArray((body as ListClassesResult).data) && typeof (body as ListClassesResult).total === "number";
const isAttendeeList = (body: unknown): body is Attendee[] => Array.isArray(body);

export async function fetchClassesHttp(params: ListClassesParams, signal?: AbortSignal): Promise<ListClassesResult> {
  const query = toQuery({ page: params.page, pageSize: params.pageSize, sortField: params.sortField, sortOrder: params.sortOrder, scenario: params.scenario, rows: params.rows, nonce: params.nonce });
  const response = await fetch(`/api/classes?${query}`, { signal: signal ?? null });
  return parseResponse(response, isListResult);
}

export async function fetchAttendeesHttp(session: ClassSession, scenario: Scenario, nonce: string, signal?: AbortSignal): Promise<Attendee[]> {
  const response = await fetch(`/api/classes/${encodeURIComponent(session.id)}/attendees?${toQuery({ scenario, nonce })}`, { signal: signal ?? null });
  return parseResponse(response, isAttendeeList);
}

/** Query-string parsing shared by the route handlers. */
export function parseListParams(searchParams: URLSearchParams): ListClassesParams {
  const scenarioRaw = searchParams.get("scenario");
  const rowsRaw = Number(searchParams.get("rows"));
  const sortOrderRaw = searchParams.get("sortOrder");
  return {
    page: Number(searchParams.get("page")) || 1,
    pageSize: Number(searchParams.get("pageSize")) || 10,
    sortField: searchParams.get("sortField") ?? undefined,
    sortOrder: sortOrderRaw === "ascend" || sortOrderRaw === "descend" ? sortOrderRaw : undefined,
    scenario: isScenario(scenarioRaw) ? scenarioRaw : "normal",
    rows: rowsRaw === 10_000 ? 10_000 : 64,
    nonce: searchParams.get("nonce") ?? "0",
  };
}
