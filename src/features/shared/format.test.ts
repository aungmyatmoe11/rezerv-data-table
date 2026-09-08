import { afterAll, describe, expect, it } from "vitest";
import { formatTimeRange, resolveTimePattern, studioTime, TIME_FORMAT_PRESETS } from "./format";

const START = "2026-09-06T22:00:00.000Z";
const END = "2026-09-06T22:50:00.000Z";
const original = process.env.TZ;

afterAll(() => {
  process.env.TZ = original;
});

describe("studio clock", () => {
  it("renders the studio's wall clock, not the runtime's", () => {
    expect(studioTime(START).format("ddd D MMM · HH:mm")).toBe("Mon 7 Sep · 05:00");
    expect(formatTimeRange(START, END)).toBe("Mon 7 Sep · 05:00 – 05:50");
  });

  it("renders every named pattern from the same instant", () => {
    const seen = TIME_FORMAT_PRESETS.map((format) => formatTimeRange(START, END, format));
    expect(seen).toEqual(["Mon 7 Sep · 05:00 – 05:50", "07/09/2026 05:00 – 05:50", "Sep 7, 5:00 AM – 5:50 AM", "05:00 – 05:50", "07-09-2026"]);
  });

  it("is identical in every timezone — the server renders these cells too, so a drift breaks hydration", () => {
    const rendered = new Set<string>();
    for (const zone of ["UTC", "Asia/Bangkok", "America/Los_Angeles", "Pacific/Kiritimati", "Australia/Sydney"]) {
      process.env.TZ = zone;
      rendered.add(formatTimeRange(START, END));
    }
    expect([...rendered]).toEqual(["Mon 7 Sep · 05:00 – 05:50"]);
  });
});

describe("format rule", () => {
  it("takes a dayjs pattern wherever a preset name is taken", () => {
    expect(resolveTimePattern("day-time")).toBe("ddd D MMM · HH:mm");
    expect(resolveTimePattern("DD-MM-YYYY")).toBe("DD-MM-YYYY");
    expect(formatTimeRange(START, END, "DD-MM-YYYY")).toBe("07-09-2026");
  });

  it("appends the end only when the pattern shows a clock, in the style the pattern asked for", () => {
    expect(formatTimeRange(START, END, "DD-MM-YYYY HH:mm")).toBe("07-09-2026 05:00 – 05:50");
    expect(formatTimeRange(START, END, "D MMM h:mm a")).toBe("7 Sep 5:00 am – 5:50 am");
    expect(formatTimeRange(START, END, "dddd")).toBe("Monday");
  });

  it("reads bracketed text as a literal, not as clock tokens", () => {
    expect(formatTimeRange(START, END, "[Class on] DD MMM")).toBe("Class on 07 Sep");
  });

  it("falls back to the default while a pattern field is empty", () => {
    expect(formatTimeRange(START, END, "")).toBe("Mon 7 Sep · 05:00 – 05:50");
  });
});
