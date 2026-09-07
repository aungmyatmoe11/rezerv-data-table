import { describe, expect, it } from "vitest";
import { attendeesOf, classesFor, withInlineAttendees } from "./data";

describe("attendee lookup", () => {
  it("resolves attendees for a seed class", () => {
    const [first] = classesFor(64);
    expect(first).toBeDefined();
    expect(attendeesOf(first!).length).toBeGreaterThan(0);
  });

  it("resolves attendees for a scaled clone through its seed id", () => {
    const rows = classesFor(10_000);
    const clone = rows.find((row) => /-\d+-\d+$/.test(row.id));
    expect(clone).toBeDefined();
    expect(attendeesOf(clone!).length).toBeGreaterThan(0);
  });

  it("embeds children on every row for inline expansion", () => {
    const rows = withInlineAttendees(classesFor(64));
    expect(rows.every((row) => Array.isArray(row.attendees))).toBe(true);
    expect(rows.filter((row) => (row.attendees?.length ?? 0) > 0).length).toBeGreaterThan(30);
  });
});
