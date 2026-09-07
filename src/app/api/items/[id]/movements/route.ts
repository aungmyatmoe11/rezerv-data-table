import { NextResponse } from "next/server";
import { listMovementsMock } from "@/features/inventory/api";
import { isScenario, MockApiError } from "@/mocks/scenarios";

export const dynamic = "force-dynamic";

/** GET /api/items/:id/movements?scenario&nonce → StockMovement[] */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await context.params;
  const searchParams = new URL(request.url).searchParams;
  const scenarioRaw = searchParams.get("scenario");
  const scenario = isScenario(scenarioRaw) ? scenarioRaw : "normal";
  const nonce = searchParams.get("nonce") ?? "0";
  try {
    if (scenario === "malformed") {
      await listMovementsMock(id, "normal", nonce, request.signal);
      return NextResponse.json({ unexpected: true });
    }
    const movements = await listMovementsMock(id, scenario, nonce, request.signal);
    return NextResponse.json(movements, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof MockApiError) {
      return NextResponse.json({ error: { message: error.message, retryable: error.retryable } }, { status: error.status });
    }
    return NextResponse.json({ error: { message: "Unexpected server error.", retryable: true } }, { status: 500 });
  }
}
