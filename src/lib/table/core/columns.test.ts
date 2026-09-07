import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveColumns } from "./columns";
import type { ColumnDef } from "./types";
import { resetWarnings } from "./warnings";

interface Row {
  key: string;
  name: string;
  city: string;
  age: number;
  price: { amount: number };
}

const opts = { breakpoints: null, order: null, tableSortDirections: ["ascend", "descend"] as const };

afterEach(() => {
  resetWarnings();
  vi.restoreAllMocks();
});

describe("resolveColumns", () => {
  it("derives keys from dataIndex, partitions fixed columns and computes sticky offsets", () => {
    const columns: ColumnDef<Row>[] = [
      { dataIndex: "name", title: "Name", fixed: "left", width: 120 },
      { dataIndex: "city", title: "City" },
      { dataIndex: "age", title: "Age", fixed: "left", width: 80 },
      { key: "actions", title: "Actions", fixed: "right", width: 100, render: (r) => r.name },
    ];
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const layout = resolveColumns(columns, opts);
    expect(layout.leaves.map((l) => l.key)).toEqual(["name", "age", "city", "actions"]);
    expect(layout.leftOffsets.get("name")).toBe(0);
    expect(layout.leftOffsets.get("age")).toBe(120);
    expect(layout.rightOffsets.get("actions")).toBe(0);
    expect(layout.lastLeftKey).toBe("age");
    expect(layout.firstRightKey).toBe("actions");
    expect(layout.hasFixed).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1); // interleaved fixed columns
  });

  it("warns when a fixed column has no numeric width", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    resolveColumns([{ dataIndex: "name", title: "Name", fixed: true }] as ColumnDef<Row>[], opts);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("no numeric `width`"));
  });

  it("drops hidden and responsive-hidden columns and applies a leaf order", () => {
    const columns: ColumnDef<Row>[] = [
      { dataIndex: "name", title: "Name" },
      { dataIndex: "city", title: "City", hidden: true },
      { dataIndex: "age", title: "Age", responsive: ["lg"] },
      { dataIndex: "price.amount", title: "Price" },
    ];
    const layout = resolveColumns(columns, { ...opts, breakpoints: new Set(["xs", "sm"]), order: ["price.amount", "name"] });
    expect(layout.leaves.map((l) => l.key)).toEqual(["price.amount", "name"]);
    expect(layout.leaves[0]?.path).toEqual(["price", "amount"]);
  });

  it("builds multi-row headers for grouped columns", () => {
    const columns: ColumnDef<Row>[] = [
      { dataIndex: "name", title: "Name" },
      { title: "Details", children: [{ dataIndex: "city", title: "City" }, { dataIndex: "age", title: "Age" }] },
    ];
    const layout = resolveColumns(columns, opts);
    expect(layout.headerRows).toHaveLength(2);
    expect(layout.headerRows[0]?.map((c) => [String(c.key), c.colSpan, c.rowSpan])).toEqual([
      ["name", 1, 2],
      ["__col_1", 2, 1],
    ]);
    expect(layout.headerRows[1]?.map((c) => String(c.key))).toEqual(["city", "age"]);
  });

  it("wires sorter variants into sortable / comparator / serverSort / multiple", () => {
    const columns: ColumnDef<Row>[] = [
      { dataIndex: "name", title: "A", sorter: true },
      { dataIndex: "city", title: "B", sorter: (a, b) => a.city.localeCompare(b.city) },
      { dataIndex: "age", title: "C", sorter: { multiple: 3 } },
      { dataIndex: "price.amount", title: "D", sorter: { compare: (a, b) => a.price.amount - b.price.amount, multiple: 1 } },
    ];
    const [a, b, c, d] = resolveColumns(columns, opts).leaves;
    expect(a).toMatchObject({ sortable: true, serverSort: true, comparator: null, multiple: false });
    expect(b).toMatchObject({ sortable: true, serverSort: false, multiple: false });
    expect(b?.comparator).toBeTypeOf("function");
    expect(c).toMatchObject({ sortable: true, serverSort: true, multiple: 3 });
    expect(d).toMatchObject({ sortable: true, serverSort: false, multiple: 1 });
  });
});
