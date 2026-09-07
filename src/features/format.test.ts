import { afterAll, describe, expect, it } from "vitest";
import { formatTimeRange } from "./timetable/columns";
import { studioTime } from "./format";

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

  it("is identical in every timezone — the server renders these cells too, so a drift breaks hydration", () => {
    const rendered = new Set<string>();
    for (const zone of ["UTC", "Asia/Bangkok", "America/Los_Angeles", "Pacific/Kiritimati", "Australia/Sydney"]) {
      process.env.TZ = zone;
      rendered.add(formatTimeRange(START, END));
    }
    expect([...rendered]).toEqual(["Mon 7 Sep · 05:00 – 05:50"]);
  });
});
