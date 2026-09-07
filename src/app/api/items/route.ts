import { NextResponse } from "next/server";
import { listItemsMock, parseItemsParams } from "@/features/inventory/api";
import { MockApiError } from "@/mocks/scenarios";

export const dynamic = "force-dynamic";

/** GET /api/items?page&pageSize&sort=field:order,…&category&warehouse&scenario&nonce → { data, total } */
export async function GET(request: Request): Promise<Response> {
  const params = parseItemsParams(new URL(request.url).searchParams);
  try {
    if (params.scenario === "malformed") {
      await listItemsMock({ ...params, scenario: "normal" }, request.signal);
      return NextResponse.json({ unexpected: true });
    }
    const result = await listItemsMock(params, request.signal);
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof MockApiError) {
      return NextResponse.json({ error: { message: error.message, retryable: error.retryable } }, { status: error.status });
    }
    return NextResponse.json({ error: { message: "Unexpected server error.", retryable: true } }, { status: 500 });
  }
}
