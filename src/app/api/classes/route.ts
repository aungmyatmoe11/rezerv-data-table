import { NextResponse } from "next/server";
import { listClassesMock, parseListParams } from "@/features/timetable/api";
import { MockApiError } from "@/mocks/scenarios";

export const dynamic = "force-dynamic";

/** GET /api/classes?page&pageSize&sortField&sortOrder&scenario&rows&nonce → { data, total } */
export async function GET(request: Request): Promise<Response> {
  const params = parseListParams(new URL(request.url).searchParams);
  try {
    if (params.scenario === "malformed") {
      // scenario ကို server ဘက်မှာ simulate: shape မမှန်တဲ့ body ကို 200 နဲ့ ပြန်ပို့တယ်
      await listClassesMock({ ...params, scenario: "normal" }, request.signal);
      return NextResponse.json({ unexpected: true });
    }
    const result = await listClassesMock(params, request.signal);
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof MockApiError) {
      return NextResponse.json({ error: { message: error.message, retryable: error.retryable } }, { status: error.status });
    }
    return NextResponse.json({ error: { message: "Unexpected server error.", retryable: true } }, { status: 500 });
  }
}
