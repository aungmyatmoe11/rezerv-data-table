import { NextResponse } from "next/server";
import { listAttendeesMock } from "@/features/timetable/api";
import { classesFor } from "@/features/timetable/data";
import { isScenario, MockApiError } from "@/mocks/scenarios";

export const dynamic = "force-dynamic";

/** GET /api/classes/:id/attendees?scenario&nonce → Attendee[] */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await context.params;
  const searchParams = new URL(request.url).searchParams;
  const scenarioRaw = searchParams.get("scenario");
  const scenario = isScenario(scenarioRaw) ? scenarioRaw : "normal";
  const nonce = searchParams.get("nonce") ?? "0";

  const session = classesFor(10_000).find((row) => row.id === id);
  if (session === undefined) {
    return NextResponse.json({ error: { message: `Class ${id} was not found.`, retryable: false } }, { status: 404 });
  }
  try {
    if (scenario === "malformed") {
      await listAttendeesMock(session, "normal", nonce, request.signal);
      return NextResponse.json({ unexpected: true });
    }
    const attendees = await listAttendeesMock(session, scenario, nonce, request.signal);
    return NextResponse.json(attendees, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof MockApiError) {
      return NextResponse.json({ error: { message: error.message, retryable: error.retryable } }, { status: error.status });
    }
    return NextResponse.json({ error: { message: "Unexpected server error.", retryable: true } }, { status: 500 });
  }
}
