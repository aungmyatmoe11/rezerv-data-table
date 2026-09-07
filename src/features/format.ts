import dayjs, { type Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

/**
 * The studio's own wall clock (UTC+07:00).
 *
 * Timetable rows are rendered on the server as well as in the browser, so a timezone-dependent
 * format (`dayjs(iso).format(...)`, which uses the runtime's local zone) produces different text
 * in each place and breaks hydration — the server runs in UTC, the visitor does not. Pinning the
 * offset also matches how staff read a timetable: a 09:00 class is 09:00 at the studio, whoever
 * is looking at the dashboard.
 */
export const STUDIO_UTC_OFFSET_MINUTES = 420;

/** An ISO instant as the studio's wall clock — identical on the server and in every browser. */
export function studioTime(iso: string): Dayjs {
  return dayjs.utc(iso).utcOffset(STUDIO_UTC_OFFSET_MINUTES);
}
