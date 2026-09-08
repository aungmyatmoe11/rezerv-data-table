import { defaultCompare } from "@/lib/table/core";
import { isScenario, MockApiError, applyScenario, type Scenario } from "@/mocks/scenarios";
import { attendeesOf, classesFor, withInlineAttendees } from "./data";
import type { Attendee, ClassSession, ClassStatus, RowCount } from "./types";

export interface ListClassesParams {
  page: number;
  pageSize: number;
  sortField?: string | undefined;
  sortOrder?: "ascend" | "descend" | undefined;
  scenario: Scenario;
  rows: RowCount;
  /** Status facet, the way a real list endpoint takes one: `?status=Scheduled,Full`. */
  status?: readonly ClassStatus[] | undefined;
  /** Embed each class's attendees in the row (the `?include=attendees` pattern). */
  includeAttendees?: boolean;
  /** Changes the `fail-once` latch scope so the scenario can be replayed. */
  nonce: string;
}

export interface ListClassesResult {
  data: ClassSession[];
  total: number;
}

const SORTABLE: ReadonlySet<string> = new Set(["name", "instructor", "startAt", "bookedCount", "status"]);
const STATUSES: readonly ClassStatus[] = ["Scheduled", "Full", "Cancelled"];

/** The Attendance column shows a ratio, so both sides must order by the ratio — not by the count. */
const occupancy = (row: ClassSession): number => (row.capacity === 0 ? 0 : row.bookedCount / row.capacity);

/**
 * The "backend": in-memory implementation shared by the Next route handlers (server mode)
 * and the client-mode demo. Models a production endpoint: latency, paging, sorting, failures.
 */
export async function listClassesMock(params: ListClassesParams, signal?: AbortSignal): Promise<ListClassesResult> {
  const outcome = await applyScenario(params.scenario, `classes:${params.nonce}`, "list", signal);
  if (outcome.malformed) throw new MockApiError("Malformed response from the classes service.", 502, false);
  if (outcome.empty) return { data: [], total: 0 };

  let rows = classesFor(params.rows);
  // filter ကို paging မလုပ်ခင် server ဘက်မှာ လုပ်တာမို့ total က filter ပြီးရလဒ်ကို ပြတယ်
  if (params.status !== undefined && params.status.length > 0) {
    const wanted = new Set<string>(params.status);
    rows = rows.filter((row) => wanted.has(row.status));
  }
  if (params.sortField !== undefined && params.sortOrder !== undefined && SORTABLE.has(params.sortField)) {
    const field = params.sortField as keyof ClassSession;
    const sign = params.sortOrder === "ascend" ? 1 : -1;
    const compare = field === "bookedCount" ? (a: ClassSession, b: ClassSession) => occupancy(a) - occupancy(b) : (a: ClassSession, b: ClassSession) => defaultCompare(a[field], b[field]);
    rows = rows.slice().sort((a, b) => sign * compare(a, b));
  }
  const pageSize = Math.min(Math.max(1, params.pageSize), 10_000);
  const start = (Math.max(1, params.page) - 1) * pageSize;
  const page = rows.slice(start, start + pageSize);
  return { data: params.includeAttendees === true ? withInlineAttendees(page) : page, total: rows.length };
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
  const query = toQuery({
    page: params.page,
    pageSize: params.pageSize,
    sortField: params.sortField,
    sortOrder: params.sortOrder,
    scenario: params.scenario,
    rows: params.rows,
    nonce: params.nonce,
    ...(params.status !== undefined && params.status.length > 0 ? { status: params.status.join(",") } : {}),
    ...(params.includeAttendees === true ? { include: "attendees" } : {}),
  });
  const response = await fetch(`/api/classes?${query}`, { signal: signal ?? null });
  return parseResponse(response, isListResult);
}

export async function fetchAttendeesHttp(session: ClassSession, scenario: Scenario, nonce: string, signal?: AbortSignal): Promise<Attendee[]> {
  const response = await fetch(`/api/classes/${encodeURIComponent(session.id)}/attendees?${toQuery({ scenario, nonce })}`, { signal: signal ?? null });
  return parseResponse(response, isAttendeeList);
}

export function isClassStatus(value: unknown): value is ClassStatus {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

/** `?status=Scheduled,Full` → validated facet; unknown values are dropped, like a real API. */
function parseStatus(raw: string | null): readonly ClassStatus[] | undefined {
  if (raw === null || raw === "") return undefined;
  const wanted = raw.split(",");
  const valid = STATUSES.filter((status) => wanted.includes(status));
  return valid.length === 0 ? undefined : valid;
}

/** Query-string parsing shared by the route handlers. */
export function parseListParams(searchParams: URLSearchParams): ListClassesParams {
  const scenarioRaw = searchParams.get("scenario");
  const rowsRaw = Number(searchParams.get("rows"));
  const sortOrderRaw = searchParams.get("sortOrder");
  return {
    page: Number(searchParams.get("page")) || 1,
    // HTTP endpoint caps a page at 100 rows, like a real backend would
    pageSize: Math.min(Number(searchParams.get("pageSize")) || 10, 100),
    sortField: searchParams.get("sortField") ?? undefined,
    sortOrder: sortOrderRaw === "ascend" || sortOrderRaw === "descend" ? sortOrderRaw : undefined,
    scenario: isScenario(scenarioRaw) ? scenarioRaw : "normal",
    status: parseStatus(searchParams.get("status")),
    rows: rowsRaw === 10_000 ? 10_000 : 64,
    includeAttendees: searchParams.get("include") === "attendees",
    nonce: searchParams.get("nonce") ?? "0",
  };
}
