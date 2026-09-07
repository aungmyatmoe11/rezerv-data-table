import { describe, expect, it } from "vitest";
import { clampPage, isServerPaged, pageItems, pageRange, paginate, totalPages } from "./pagination";

describe("clampPage", () => {
  it("clamps out-of-range and non-finite pages", () => {
    expect(clampPage(0, 10, 45)).toBe(1);
    expect(clampPage(-3, 10, 45)).toBe(1);
    expect(clampPage(99, 10, 45)).toBe(5);
    expect(clampPage(Number.NaN, 10, 45)).toBe(1);
    expect(clampPage(2.7, 10, 45)).toBe(2);
    expect(clampPage(3, 10, 0)).toBe(1);
  });

  it("totalPages is never below 1", () => {
    expect(totalPages(0, 10)).toBe(1);
    expect(totalPages(45, 10)).toBe(5);
    expect(totalPages(50, 10)).toBe(5);
  });
});

describe("paginate", () => {
  const rows = Array.from({ length: 45 }, (_, i) => i + 1);

  it("slices client data in one pass and reports the clamped page", () => {
    const page = paginate(rows, 5, 10, undefined);
    expect(page.rows).toEqual([41, 42, 43, 44, 45]);
    expect(page).toMatchObject({ current: 5, pageSize: 10, total: 45, server: false });
    expect(paginate(rows, 9, 10, undefined).current).toBe(5);
  });

  it("switches to server mode when the parent hands over fewer rows than `total` (Ant Design rule)", () => {
    const onePage = rows.slice(0, 10);
    expect(isServerPaged(onePage.length, 45)).toBe(true);
    const page = paginate(onePage, 3, 10, 45);
    expect(page.rows).toBe(onePage);
    expect(page).toMatchObject({ current: 3, total: 45, server: true });
  });

  it("stays in client mode when `total` equals the data length", () => {
    expect(isServerPaged(45, 45)).toBe(false);
    expect(paginate(rows, 2, 10, 45).rows).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });
});

describe("pageRange / pageItems", () => {
  it("computes the 1-based range for showTotal", () => {
    expect(pageRange(1, 10, 45)).toEqual([1, 10]);
    expect(pageRange(5, 10, 45)).toEqual([41, 45]);
    expect(pageRange(1, 10, 0)).toEqual([0, 0]);
  });

  it("emits Ant Design style jumpers around the current page", () => {
    expect(pageItems(1, 5).map((i) => i.type)).toEqual(["page", "page", "page", "page", "page"]);
    const items = pageItems(10, 20).map((i) => (i.type === "page" ? i.page : i.type));
    expect(items).toEqual([1, "jump-prev", 9, 10, 11, "jump-next", 20]);
    const start = pageItems(2, 20).map((i) => (i.type === "page" ? i.page : i.type));
    expect(start).toEqual([1, 2, 3, "jump-next", 20]);
    const end = pageItems(19, 20).map((i) => (i.type === "page" ? i.page : i.type));
    expect(end).toEqual([1, "jump-prev", 18, 19, 20]);
  });
});
