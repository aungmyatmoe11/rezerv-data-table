import { describe, expect, it } from "vitest";
import { leavesByKey, resolveColumns } from "./columns";
import { buildKeyEntities } from "./selection";
import type { ReduceContext } from "./state";
import { initialState, mergeControlled, pickUncontrolled, reduce } from "./state";
import type { ColumnDef, ControlledFlags, TableState } from "./types";

interface Row {
  key: string;
  name: string;
  children?: Row[];
}

const columns: ColumnDef<Row>[] = [
  { dataIndex: "name", title: "Name", sorter: true },
  { dataIndex: "key", title: "Key" },
];

const base: TableState = initialState({ sort: [], filters: {}, page: 3, pageSize: 10, selectedKeys: [], expandedKeys: [], columnOrder: null });

function ctx(overrides: Partial<ReduceContext<Row>> = {}): ReduceContext<Row> {
  return {
    leavesByKey: leavesByKey(resolveColumns(columns, { breakpoints: null, order: null, tableSortDirections: ["ascend", "descend"] }).leaves),
    sortDirections: ["ascend", "descend"],
    pageKeys: ["a", "b"],
    allKeys: ["a", "b", "c", "d"],
    keyEntities: null,
    ...overrides,
  };
}

const none: ControlledFlags = { sort: false, filters: false, page: false, pageSize: false, selectedKeys: false, expandedKeys: false, columnOrder: false };

describe("reduce — cross-slice rules", () => {
  it("sort, filter and page-size changes reset the page to 1", () => {
    expect(reduce(base, { type: "sort/toggle", columnKey: "name" }, ctx()).page.number).toBe(1);
    expect(reduce(base, { type: "filter/set", columnKey: "name", value: ["x"] }, ctx()).page.number).toBe(1);
    expect(reduce(base, { type: "page/setSize", pageSize: 20 }, ctx()).page).toEqual({ number: 1, pageSize: 20 });
  });

  it("ignores sort on a non-sortable column and returns the same state object", () => {
    expect(reduce(base, { type: "sort/toggle", columnKey: "key" }, ctx())).toBe(base);
  });

  it("does NOT clear selection on sort or filter (Ant Design parity)", () => {
    const selected: TableState = { ...base, selectedKeys: ["a"] };
    expect(reduce(selected, { type: "sort/toggle", columnKey: "name" }, ctx()).selectedKeys).toEqual(["a"]);
    expect(reduce(selected, { type: "filter/set", columnKey: "name", value: ["x"] }, ctx()).selectedKeys).toEqual(["a"]);
  });
});

describe("reduce — selection scopes", () => {
  it("page selection toggles only the page keys; select/all uses all keys; invert flips the page", () => {
    const withC: TableState = { ...base, selectedKeys: ["c"] };
    expect(reduce(withC, { type: "select/page", selected: true }, ctx()).selectedKeys).toEqual(["c", "a", "b"]);
    expect(reduce(withC, { type: "select/all" }, ctx()).selectedKeys).toEqual(["c", "a", "b", "d"]);
    expect(reduce({ ...base, selectedKeys: ["a", "c"] }, { type: "select/invert" }, ctx()).selectedKeys).toEqual(["c", "b"]);
    expect(reduce(withC, { type: "select/none" }, ctx()).selectedKeys).toEqual([]);
    expect(reduce(withC, { type: "select/radio", key: "b" }, ctx()).selectedKeys).toEqual(["b"]);
  });

  it("links parent and children when keyEntities are supplied (checkStrictly: false)", () => {
    const rows: Row[] = [{ key: "p", name: "p", children: [{ key: "c1", name: "c1" }, { key: "c2", name: "c2" }] }];
    const keyEntities = buildKeyEntities(rows, (r) => r.key, "children", null);
    let state = reduce(base, { type: "select/toggle", key: "c1", selected: true }, ctx({ keyEntities }));
    expect(state.selectedKeys).toEqual(["c1"]);
    state = reduce(state, { type: "select/toggle", key: "c2", selected: true }, ctx({ keyEntities }));
    expect([...state.selectedKeys].sort()).toEqual(["c1", "c2", "p"]);
    state = reduce(state, { type: "select/toggle", key: "p", selected: false }, ctx({ keyEntities }));
    expect(state.selectedKeys).toEqual([]);
  });
});

describe("controlled slices", () => {
  it("mergeControlled reads controlled slices from props and pickUncontrolled never writes them", () => {
    const flags: ControlledFlags = { ...none, page: true, sort: true };
    const effective = mergeControlled(base, { page: 7, sort: [{ columnKey: "name", order: "descend", multiple: false }] }, flags);
    expect(effective.page.number).toBe(7);
    expect(effective.sort[0]?.order).toBe("descend");

    const next = reduce(effective, { type: "sort/toggle", columnKey: "name" }, ctx());
    expect(next.page.number).toBe(1); // reducer computes the intent…
    const internal = pickUncontrolled(next, flags, base);
    expect(internal.page.number).toBe(3); // …but controlled slices are never stored
    expect(internal.sort).toBe(base.sort);
  });
});
