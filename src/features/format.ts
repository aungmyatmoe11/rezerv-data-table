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

/** Named patterns, so the common shapes are one word instead of a token string. */
export const TIME_FORMATS = {
  "day-time": "ddd D MMM · HH:mm",
  "date-time": "DD/MM/YYYY HH:mm",
  "12-hour": "MMM D, h:mm A",
  "time-only": "HH:mm",
  "date-only": "DD-MM-YYYY",
} as const;

export type TimeFormatPreset = keyof typeof TIME_FORMATS;
export const TIME_FORMAT_PRESETS = Object.keys(TIME_FORMATS) as TimeFormatPreset[];

/**
 * A preset name, or any dayjs pattern written out (`"DD-MM-YYYY"` → `08-09-2026`).
 * `string & {}` keeps the preset names in autocomplete while still accepting a raw pattern.
 */
export type TimeFormat = TimeFormatPreset | (string & {});

/** A preset name resolves to its pattern; anything else IS the pattern. */
export function resolveTimePattern(format: TimeFormat): string {
  // pattern ကို လက်ဖြင့်ရိုက်နေစဉ် ဖြတ်လိုက်ရင် ဗလာဖြစ်တတ်လို့ default preset ကို ပြန်သုံးတယ်
  if (format.trim() === "") return TIME_FORMATS["day-time"];
  return Object.hasOwn(TIME_FORMATS, format) ? TIME_FORMATS[format as TimeFormatPreset] : format;
}

/** Bracketed text is a literal in dayjs (`"[at] HH:mm"`), so it must not count as a token. */
function tokensOf(pattern: string): string {
  return pattern.replace(/\[[^\]]*\]/g, "");
}

/**
 * A class's time range, under one rule: **the pattern decides the whole cell.**
 *
 * 1. The start is rendered with the resolved pattern, whatever it contains.
 * 2. The end is appended only when that pattern shows a clock (`H`, `h`, `m`, `s`) — a date-only
 *    pattern is a date, not a range, so `"DD-MM-YYYY"` reads `08-09-2026` and nothing more.
 * 3. When it is appended it repeats the clock alone, in the same 12- or 24-hour style the pattern
 *    asked for. Repeating the date on both sides reads badly at every column width.
 */
export function formatTimeRange(startAt: string, endAt: string, format: TimeFormat = "day-time"): string {
  const pattern = resolveTimePattern(format);
  const tokens = tokensOf(pattern);
  const start = studioTime(startAt).format(pattern);
  if (!/[Hhms]/.test(tokens)) return start;
  const twelveHour = /[hAa]/.test(tokens);
  return `${start} – ${studioTime(endAt).format(twelveHour ? (tokens.includes("a") ? "h:mm a" : "h:mm A") : "HH:mm")}`;
}

/** The instant every demo previews a pattern with: Mon 7 Sep 2026, 05:00 studio time. */
const SAMPLE_INSTANT = "2026-09-06T22:00:00.000Z";

/**
 * What a pattern renders — the label of every option in the demos' format pickers, produced by
 * the same resolver the column uses, so a label can never drift from the cells beneath it. The
 * end of the range is left off: it is derived, and the labels stay short enough to read.
 */
export function formatSample(format: TimeFormat): string {
  return studioTime(SAMPLE_INSTANT).format(resolveTimePattern(format));
}
