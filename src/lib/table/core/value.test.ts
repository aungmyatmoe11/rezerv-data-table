import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultCompare, getByPath, resolveRowKey, safeCompare, toPath } from "./value";
import { resetWarnings } from "./warnings";

afterEach(() => {
  resetWarnings();
  vi.restoreAllMocks();
});

describe("toPath / getByPath", () => {
  it("normalises dotted strings and arrays", () => {
    expect(toPath("a.b.c")).toEqual(["a", "b", "c"]);
    expect(toPath(["a", 0, "c"])).toEqual(["a", 0, "c"]);
    expect(toPath(undefined)).toBeNull();
    expect(toPath("")).toBeNull();
  });

  it("walks nested objects and arrays, returning undefined on a missing segment", () => {
    const record = { unitPrice: { amount: 12.5 }, tags: ["a", "b"], nil: null };
    expect(getByPath(record, ["unitPrice", "amount"])).toBe(12.5);
    expect(getByPath(record, ["tags", "1"])).toBe("b");
    expect(getByPath(record, ["nil", "x"])).toBeUndefined();
    expect(getByPath(record, ["missing", "deep"])).toBeUndefined();
    expect(getByPath(record, null)).toBe(record);
  });
});

describe("defaultCompare", () => {
  it("puts null and undefined last regardless of direction", () => {
    const rows = [3, null, 1, undefined, 2];
    expect(rows.slice().sort(defaultCompare)).toEqual([1, 2, 3, null, undefined]);
  });

  it("compares numbers, dates, booleans and natural-order strings", () => {
    expect(defaultCompare(2, 10)).toBeLessThan(0);
    expect(defaultCompare(new Date(2026, 0, 2), new Date(2026, 0, 1))).toBeGreaterThan(0);
    expect(defaultCompare(false, true)).toBeLessThan(0);
    expect(defaultCompare("Class 2", "Class 10")).toBeLessThan(0);
    expect(defaultCompare("a", "B")).toBeLessThan(0);
  });

  it("never throws on mixed or NaN input", () => {
    expect(() => defaultCompare({}, "x")).not.toThrow();
    expect(defaultCompare(Number.NaN, 1)).toBeGreaterThan(0);
    expect(defaultCompare(Number.NaN, Number.NaN)).toBe(0);
  });
});

describe("safeCompare", () => {
  it("coerces NaN / non-numeric comparator results to 0", () => {
    const broken = safeCompare<number>(() => Number.NaN);
    expect(broken(1, 2)).toBe(0);
    const stringy = safeCompare<number>((() => "x") as unknown as (a: number, b: number) => number);
    expect(stringy(1, 2)).toBe(0);
  });
});

describe("resolveRowKey", () => {
  it("reads `key` by default, a named field, or a function", () => {
    expect(resolveRowKey<{ key: string }>(undefined)({ key: "k1" }, 0)).toBe("k1");
    expect(resolveRowKey<{ id: number }>("id")({ id: 7 }, 0)).toBe(7);
    expect(resolveRowKey<{ id: number }>((r) => `row-${r.id}`)({ id: 7 }, 0)).toBe("row-7");
  });

  it("never throws: a missing key warns once and falls back to the index", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const getKey = resolveRowKey<{ name: string }>(undefined);
    expect(getKey({ name: "a" }, 0)).toBe("__dt_0");
    expect(getKey({ name: "b" }, 1)).toBe("__dt_1");
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
