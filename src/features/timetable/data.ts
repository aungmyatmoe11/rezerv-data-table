import attendeesJson from "@/mocks/fixtures/attendees.json";
import classesJson from "@/mocks/fixtures/classes.json";
import { scaleRows } from "@/mocks/scale";
import type { Attendee, ClassSession, ClassStatus, RowCount } from "./types";

export const classSeed: readonly ClassSession[] = classesJson as ClassSession[];
export const attendeeSeed: readonly Attendee[] = attendeesJson as Attendee[];

export const attendeesByClass: ReadonlyMap<string, readonly Attendee[]> = (() => {
  const map = new Map<string, Attendee[]>();
  for (const attendee of attendeeSeed) {
    const list = map.get(attendee.classId);
    if (list === undefined) map.set(attendee.classId, [attendee]);
    else list.push(attendee);
  }
  return map;
})();

/** Fixture integrity: `bookedCount` must equal the non-cancelled attendees. Fails loudly in development. */
if (process.env.NODE_ENV !== "production") {
  for (const session of classSeed) {
    const counted = (attendeesByClass.get(session.id) ?? []).filter((a) => a.bookingStatus !== "Cancelled").length;
    if (counted !== session.bookedCount) throw new Error(`Fixture mismatch: ${session.id} bookedCount ${session.bookedCount} !== ${counted}`);
  }
}

const NAME_SUFFIX = ["", " · Express", " · Advanced", " · Beginners", " · Evening", " · Sunrise"];

/** 64 seed rows or a synthesised 10k set with realistic variation for sort / scroll benchmarks. */
export function classesFor(count: RowCount): ClassSession[] {
  return scaleRows(classSeed, count, (row, index) => {
    const dayShift = Math.floor(index / classSeed.length);
    const start = new Date(row.startAt);
    const end = new Date(row.endAt);
    // UTC getters/setters — shifting in local time would produce a different instant per timezone
    start.setUTCDate(start.getUTCDate() + dayShift);
    end.setUTCDate(end.getUTCDate() + dayShift);
    const bookedCount = (index * 7 + dayShift) % (row.capacity + 1);
    const status: ClassStatus = row.status === "Cancelled" && index % 13 === 0 ? "Cancelled" : bookedCount >= row.capacity ? "Full" : "Scheduled";
    return { ...row, name: `${row.name}${NAME_SUFFIX[dayShift % NAME_SUFFIX.length] ?? ""}`, startAt: start.toISOString(), endAt: end.toISOString(), bookedCount, status };
  });
}

/**
 * Children delivered together with the parent (inline expansion mode).
 *
 * `scaleRows` gives a clone its seed id plus one more `-<n>` group (`cls-013` → `cls-013-42`),
 * so only ids carrying **two** trailing groups may be trimmed — stripping unconditionally would
 * turn a seed id into `cls` and silently return no attendees.
 */
export function attendeesOf(session: ClassSession): readonly Attendee[] {
  const seedId = /-\d+-\d+$/.test(session.id) ? session.id.replace(/-\d+$/, "") : session.id;
  return attendeesByClass.get(seedId) ?? [];
}

export function withInlineAttendees(rows: readonly ClassSession[]): ClassSession[] {
  return rows.map((row) => ({ ...row, attendees: [...attendeesOf(row)] }));
}
