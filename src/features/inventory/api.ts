import { defaultCompare, getByPath, toPath } from "@/lib/table/core";
import itemsJson from "@/mocks/fixtures/items.json";
import movementsJson from "@/mocks/fixtures/movements.json";
import { MockApiError, applyScenario, isScenario, type Scenario } from "@/mocks/scenarios";
import type { InventoryItem, SortSpec, StockMovement } from "./types";

export const itemSeed: readonly InventoryItem[] = itemsJson as InventoryItem[];
export const movementSeed: readonly StockMovement[] = movementsJson as StockMovement[];

export interface ListItemsParams {
  page: number;
  pageSize: number;
  /** Multi-sort in priority order. */
  sort: readonly SortSpec[];
  category?: readonly string[] | undefined;
  warehouse?: readonly string[] | undefined;
  scenario: Scenario;
  nonce: string;
}

export interface ListItemsResult {
  data: InventoryItem[];
  total: number;
}

const SORTABLE: ReadonlySet<string> = new Set(["sku", "name", "quantity", "unitPrice.amount", "lastCountedOn", "category", "warehouse"]);

/** Decimal strings compare numerically; everything else through the shared comparator. */
function valueFor(item: InventoryItem, field: string): unknown {
  if (field === "quantity") return Number(item.quantity);
  return getByPath(item, toPath(field));
}

function sortItems(rows: readonly InventoryItem[], sort: readonly SortSpec[]): InventoryItem[] {
  const active = sort.filter((spec) => SORTABLE.has(spec.field));
  if (active.length === 0) return [...rows];
  const compare = (a: InventoryItem, b: InventoryItem): number => {
    for (const spec of active) {
      const result = defaultCompare(valueFor(a, spec.field), valueFor(b, spec.field)) * (spec.order === "ascend" ? 1 : -1);
      if (result !== 0) return result;
    }
    return 0;
  };
  // parent level + each variant list (Ant Design sorts every tree level)
  return rows
    .slice()
    .sort(compare)
    .map((row) => (row.children === undefined || row.children.length < 2 ? row : { ...row, children: row.children.slice().sort(compare) }));
}

export async function listItemsMock(params: ListItemsParams, signal?: AbortSignal): Promise<ListItemsResult> {
  const outcome = await applyScenario(params.scenario, `items:${params.nonce}`, "list", signal);
  if (outcome.malformed) throw new MockApiError("Malformed response from the inventory service.", 502, false);
  if (outcome.empty) return { data: [], total: 0 };

  let rows = itemSeed;
  if (params.category !== undefined && params.category.length > 0) rows = rows.filter((row) => params.category?.includes(row.category));
  if (params.warehouse !== undefined && params.warehouse.length > 0) rows = rows.filter((row) => params.warehouse?.includes(row.warehouse));
  const sorted = sortItems(rows, params.sort);
  const pageSize = Math.min(Math.max(1, params.pageSize), 100);
  const start = (Math.max(1, params.page) - 1) * pageSize;
  return { data: sorted.slice(start, start + pageSize), total: sorted.length };
}

export async function listMovementsMock(itemId: string, scenario: Scenario, nonce: string, signal?: AbortSignal): Promise<StockMovement[]> {
  const outcome = await applyScenario(scenario, `movements:${itemId}:${nonce}`, "detail", signal);
  if (outcome.malformed) throw new MockApiError("Malformed response from the movements service.", 502, false);
  if (outcome.empty) return [];
  const parentId = itemId.replace(/-v\d+$/, "");
  return movementSeed.filter((movement) => movement.itemId === parentId).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

// ---------------------------------------------------------------------------
// HTTP transport
// ---------------------------------------------------------------------------

function encodeSort(sort: readonly SortSpec[]): string {
  return sort.map((spec) => `${spec.field}:${spec.order}`).join(",");
}

export function decodeSort(value: string | null): SortSpec[] {
  if (value === null || value.length === 0) return [];
  return value
    .split(",")
    .map((part) => part.split(":"))
    .filter((pair): pair is [string, string] => pair.length === 2 && (pair[1] === "ascend" || pair[1] === "descend"))
    .map(([field, order]) => ({ field, order: order as SortSpec["order"] }));
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

const isListResult = (body: unknown): body is ListItemsResult =>
  typeof body === "object" && body !== null && Array.isArray((body as ListItemsResult).data) && typeof (body as ListItemsResult).total === "number";
const isMovementList = (body: unknown): body is StockMovement[] => Array.isArray(body);

export async function fetchItemsHttp(params: ListItemsParams, signal?: AbortSignal): Promise<ListItemsResult> {
  const query = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize), scenario: params.scenario, nonce: params.nonce });
  if (params.sort.length > 0) query.set("sort", encodeSort(params.sort));
  if (params.category !== undefined && params.category.length > 0) query.set("category", params.category.join(","));
  if (params.warehouse !== undefined && params.warehouse.length > 0) query.set("warehouse", params.warehouse.join(","));
  const response = await fetch(`/api/items?${query.toString()}`, { signal: signal ?? null });
  return parseResponse(response, isListResult);
}

export async function fetchMovementsHttp(itemId: string, scenario: Scenario, nonce: string, signal?: AbortSignal): Promise<StockMovement[]> {
  const query = new URLSearchParams({ scenario, nonce });
  const response = await fetch(`/api/items/${encodeURIComponent(itemId)}/movements?${query.toString()}`, { signal: signal ?? null });
  return parseResponse(response, isMovementList);
}

export function parseItemsParams(searchParams: URLSearchParams): ListItemsParams {
  const scenarioRaw = searchParams.get("scenario");
  const list = (name: string): string[] | undefined => {
    const raw = searchParams.get(name);
    return raw === null || raw.length === 0 ? undefined : raw.split(",");
  };
  return {
    page: Number(searchParams.get("page")) || 1,
    pageSize: Number(searchParams.get("pageSize")) || 10,
    sort: decodeSort(searchParams.get("sort")),
    category: list("category"),
    warehouse: list("warehouse"),
    scenario: isScenario(scenarioRaw) ? scenarioRaw : "normal",
    nonce: searchParams.get("nonce") ?? "0",
  };
}
