import { describe, expect, it, vi } from "vitest";
import { leavesByKey, resolveColumns } from "./columns";
import type { RowModelInput } from "./row-model";
import { createRowModel, memoLast } from "./row-model";
import type { ColumnDef } from "./types";

interface Row {
  key: string;
  name: string;
  age: number;
}

const rows: Row[] = Array.from({ length: 25 }, (_, i) => ({ key: `r${i}`, name: `Name ${25 - i}`, age: i }));

function build(compareSpy: (a: Row, b: Row) => number) {
  const columns: ColumnDef<Row>[] = [
    { dataIndex: "name", title: "Name", sorter: true },
    { dataIndex: "age", title: "Age", sorter: compareSpy },
  ];
  const layout = resolveColumns(columns, { breakpoints: null, tableSortDirections: ["ascend", "descend"] });
  const input: RowModelInput<Row> = {
    dataSource: rows,
    getKey: (r) => r.key,
    childrenColumnName: null,
    leaves: layout.leaves,
    leavesByKey: leavesByKey(layout.leaves),
    filters: {},
    sort: [{ columnKey: "age", order: "descend", multiple: false }],
    paginationEnabled: true,
    page: 1,
    pageSize: 10,
    total: undefined,
    expansionMode: "none",
    expandedKeys: [],
    hasLoader: false,
    rowExpandable: null,
    lazy: null,
    lazyVersion: 0,
  };
  return { input, run: createRowModel<Row>() };
}

describe("memoLast", () => {
  it("returns the cached result while every argument is identical", () => {
    const fn = vi.fn((a: number, b: number) => a + b);
    const memo = memoLast(fn);
    expect(memo(1, 2)).toBe(3);
    expect(memo(1, 2)).toBe(3);
    expect(fn).toHaveBeenCalledTimes(1);
    memo(1, 3);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("createRowModel", () => {
  it("runs filter → sort → paginate → flatten, and a page change does not re-sort", () => {
    const compare = vi.fn((a: Row, b: Row) => a.age - b.age);
    const { input, run } = build(compare);

    const first = run(input);
    expect(first.page.rows.map((r) => r.age)).toEqual([24, 23, 22, 21, 20, 19, 18, 17, 16, 15]);
    expect(first.sorted).toHaveLength(25);
    expect(first.flat).toHaveLength(10);
    const sortCalls = compare.mock.calls.length;
    expect(sortCalls).toBeGreaterThan(0);

    const second = run({ ...input, page: 3 });
    expect(second.page.rows.map((r) => r.age)).toEqual([4, 3, 2, 1, 0]);
    expect(second.sorted).toBe(first.sorted); // S3 reused
    expect(compare.mock.calls.length).toBe(sortCalls); // comparator not re-invoked
  });

  it("server mode: keeps the parent's page untouched and reports `total`", () => {
    const { input, run } = build((a, b) => a.age - b.age);
    const onePage = rows.slice(0, 10);
    const model = run({ ...input, dataSource: onePage, total: 250, page: 4, sort: [] });
    expect(model.page).toMatchObject({ server: true, total: 250, number: 4 });
    expect(model.page.rows).toBe(onePage);
  });

  it("clamps an out-of-range page instead of rendering nothing", () => {
    const { input, run } = build((a, b) => a.age - b.age);
    const model = run({ ...input, page: 99, sort: [] });
    expect(model.page.number).toBe(3);
    expect(model.page.rows).toHaveLength(5);
  });

  it("spans are null unless a column declares onCell", () => {
    const { input, run } = build((a, b) => a.age - b.age);
    expect(run(input).spans).toBeNull();
  });
});
