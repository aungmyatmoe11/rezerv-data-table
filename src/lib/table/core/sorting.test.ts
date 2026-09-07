import { afterEach, describe, expect, it, vi } from "vitest";
import { leavesByKey, resolveColumns } from "./columns";
import { buildComparator, cycleOrder, reconcileSort, sortFromColumns, sortTree, toSorterResult, toggleSort } from "./sorting";
import type { ColumnDef, SortEntry } from "./types";
import { resetWarnings } from "./warnings";

interface Row {
  key: string;
  name: string;
  age: number;
  children?: Row[];
}

const options = { breakpoints: null, order: null, tableSortDirections: ["ascend", "descend"] as const };

function leaves(columns: readonly ColumnDef<Row>[]) {
  return leavesByKey(resolveColumns(columns, options).leaves);
}

afterEach(() => {
  resetWarnings();
  vi.restoreAllMocks();
});

describe("cycleOrder", () => {
  it("cycles none → ascend → descend → none", () => {
    expect(cycleOrder(null)).toBe("ascend");
    expect(cycleOrder("ascend")).toBe("descend");
    expect(cycleOrder("descend")).toBeNull();
  });

  it("honours restricted directions", () => {
    expect(cycleOrder(null, ["descend"])).toBe("descend");
    expect(cycleOrder("descend", ["descend"])).toBeNull();
  });
});

describe("toggleSort (Ant Design merge rule)", () => {
  const single = { multiple: false as const, sortDirections: undefined };
  const multiA = { multiple: 2, sortDirections: undefined };
  const multiB = { multiple: 1, sortDirections: undefined };

  it("replaces the sort when either side is single", () => {
    let sort: readonly SortEntry[] = [];
    sort = toggleSort(sort, "name", single);
    expect(sort).toEqual([{ columnKey: "name", order: "ascend", multiple: false }]);
    sort = toggleSort(sort, "age", single);
    expect(sort).toEqual([{ columnKey: "age", order: "ascend", multiple: false }]);
    sort = toggleSort(sort, "age", single);
    expect(sort[0]?.order).toBe("descend");
    sort = toggleSort(sort, "age", single);
    expect(sort).toEqual([]);
  });

  it("merges when both the clicked column and the head declare `multiple`, ordered by priority", () => {
    let sort: readonly SortEntry[] = [];
    sort = toggleSort(sort, "age", multiB);
    sort = toggleSort(sort, "name", multiA);
    expect(sort.map((s) => s.columnKey)).toEqual(["name", "age"]);
    sort = toggleSort(sort, "age", multiB); // age → descend, keeps position
    expect(sort).toEqual([
      { columnKey: "name", order: "ascend", multiple: 2 },
      { columnKey: "age", order: "descend", multiple: 1 },
    ]);
    sort = toggleSort(sort, "age", multiB); // age → none
    expect(sort).toEqual([{ columnKey: "name", order: "ascend", multiple: 2 }]);
  });

  it("a single column click replaces an existing multi sort", () => {
    const sort = toggleSort([{ columnKey: "name", order: "ascend", multiple: 2 }], "age", single);
    expect(sort).toEqual([{ columnKey: "age", order: "ascend", multiple: false }]);
  });
});

describe("sortTree", () => {
  const columns: ColumnDef<Row>[] = [
    { dataIndex: "name", title: "Name", sorter: true },
    { dataIndex: "age", title: "Age", sorter: (a, b) => a.age - b.age },
    { dataIndex: "key", title: "Key" },
  ];

  it("is stable and sorts each tree level", () => {
    const rows: Row[] = [
      { key: "b", name: "b", age: 30, children: [{ key: "b2", name: "b2", age: 2 }, { key: "b1", name: "b1", age: 1 }] },
      { key: "a", name: "a", age: 30 },
      { key: "c", name: "c", age: 10 },
    ];
    const compare = buildComparator([{ columnKey: "age", order: "ascend", multiple: false }], leaves(columns));
    const sorted = sortTree(rows, compare, "children");
    expect(sorted.map((r) => r.key)).toEqual(["c", "b", "a"]); // b before a: stable
    expect(sorted[1]?.children?.map((r) => r.key)).toEqual(["b1", "b2"]);
    expect(rows[0]?.children?.map((r) => r.key)).toEqual(["b2", "b1"]); // input untouched
  });

  it("server-sorted columns (`sorter: true`) produce no comparator → identity", () => {
    const compare = buildComparator([{ columnKey: "name", order: "ascend", multiple: false }], leaves(columns));
    expect(compare).toBeNull();
    const rows: Row[] = [{ key: "z", name: "z", age: 1 }, { key: "a", name: "a", age: 2 }];
    expect(sortTree(rows, compare, null)).toBe(rows);
  });

  it("drops unknown or non-sortable keys with one warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const sort = reconcileSort([{ columnKey: "nope", order: "ascend", multiple: false }, { columnKey: "key", order: "ascend", multiple: false }], leaves(columns));
    expect(sort).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe("sortFromColumns / toSorterResult", () => {
  it("reads controlled `sortOrder` and initial `defaultSortOrder`", () => {
    const columns: ColumnDef<Row>[] = [
      { dataIndex: "name", title: "Name", sorter: true, sortOrder: "descend" },
      { dataIndex: "age", title: "Age", sorter: true, defaultSortOrder: "ascend" },
    ];
    const lv = resolveColumns(columns, options).leaves;
    expect(sortFromColumns(lv, "controlled")).toEqual([{ columnKey: "name", order: "descend", multiple: false }]);
    expect(sortFromColumns(lv, "default")).toEqual([{ columnKey: "age", order: "ascend", multiple: false }]);
  });

  it("shapes single sort as an object (order null when cleared) and multi sort as an array", () => {
    const columns: ColumnDef<Row>[] = [
      { dataIndex: "name", title: "Name", sorter: { multiple: 2 } },
      { dataIndex: "age", title: "Age", sorter: { multiple: 1 } },
    ];
    const lv = leaves(columns);
    expect(toSorterResult([{ columnKey: "name", order: "ascend", multiple: false }], lv, null)).toMatchObject({ columnKey: "name", field: "name", order: "ascend" });
    expect(toSorterResult([], lv, "name")).toMatchObject({ columnKey: "name", order: null });
    const multi = toSorterResult(
      [
        { columnKey: "name", order: "ascend", multiple: 2 },
        { columnKey: "age", order: "descend", multiple: 1 },
      ],
      lv,
      null,
    );
    expect(Array.isArray(multi)).toBe(true);
    expect((multi as { columnKey: string }[]).map((s) => s.columnKey)).toEqual(["name", "age"]);
  });
});
