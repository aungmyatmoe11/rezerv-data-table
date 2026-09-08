import { describe, expect, it } from "vitest";
import { leavesByKey, resolveColumns } from "./columns";
import { flattenExpanded } from "./expansion";
import { filterTree, hasActiveFilters } from "./filtering";
import { buildKeyEntities, changeableKeys, conductCheck, pruneKeys } from "./selection";
import { resolveSpans } from "./spans";
import type { ColumnDef } from "./types";
import { spanKey } from "./warnings";

interface Row {
  key: string;
  name: string;
  city: string;
  children?: Row[];
}

const opts = { breakpoints: null, order: null, tableSortDirections: ["ascend", "descend"] as const };

describe("filterTree", () => {
  const columns: ColumnDef<Row>[] = [
    { dataIndex: "name", title: "Name", filters: [{ text: "A", value: "a" }], onFilter: (v, r) => r.name.startsWith(String(v)) },
    { dataIndex: "city", title: "City", filters: [{ text: "X", value: "x" }], onFilter: (v, r) => r.city === v },
  ];
  const lv = leavesByKey(resolveColumns(columns, opts).leaves);
  const rows: Row[] = [
    { key: "1", name: "alpha", city: "x", children: [{ key: "1a", name: "beta", city: "x" }, { key: "1b", name: "aleph", city: "y" }] },
    { key: "2", name: "alps", city: "y" },
    { key: "3", name: "bravo", city: "x" },
  ];

  it("is identity with no active filter", () => {
    expect(filterTree(rows, { name: null, city: [] }, lv, "children")).toBe(rows);
    expect(hasActiveFilters({ name: null })).toBe(false);
  });

  it("server-side filtering: `filters` without `onFilter` shows the control but never filters locally", () => {
    // antd parity — the dropdown is how the change is emitted; the server answers it
    const serverColumns: ColumnDef<Row>[] = [{ dataIndex: "name", title: "Name", filters: [{ text: "A", value: "a" }] }];
    const resolved = resolveColumns(serverColumns, opts);
    expect(resolved.leaves[0]?.filterable).toBe(true);
    expect(resolved.leaves[0]?.onFilter).toBeNull();
    expect(filterTree(rows, { name: ["a"] }, leavesByKey(resolved.leaves), "children")).toBe(rows);
  });

  it("ORs within a column, ANDs across columns, and filters children recursively", () => {
    const out = filterTree(rows, { name: ["a"] }, lv, "children");
    expect(out.map((r) => r.key)).toEqual(["1", "2"]);
    expect(out[0]?.children?.map((r) => r.key)).toEqual(["1b"]);
    expect(filterTree(rows, { name: ["a"], city: ["x"] }, lv, null).map((r) => r.key)).toEqual(["1"]);
    expect(filterTree(rows, { name: ["a", "b"] }, lv, null)).toHaveLength(3);
  });
});

describe("selection helpers", () => {
  const rows: Row[] = [{ key: "p", name: "p", city: "", children: [{ key: "c1", name: "", city: "" }, { key: "c2", name: "", city: "" }] }];

  it("conductCheck links descendants and ancestors, skipping disabled keys", () => {
    const entities = buildKeyEntities(rows, (r) => r.key, "children", (r) => r.key === "c2");
    expect([...conductCheck([], "p", true, entities)].sort()).toEqual(["c1", "p"]);
    expect(conductCheck(["c1"], "c1", false, entities)).toEqual([]);
  });

  it("changeableKeys and pruneKeys", () => {
    expect(changeableKeys(["a", "b", "c"], new Set(["b"]))).toEqual(["a", "c"]);
    const keys = ["a", "gone"];
    expect(pruneKeys(keys, (k) => k === "a", false)).toEqual(["a"]);
    expect(pruneKeys(keys, (k) => k === "a", true)).toBe(keys);
    const intact = ["a"];
    expect(pruneKeys(intact, () => true, false)).toBe(intact);
  });
});

describe("resolveSpans", () => {
  it("marks covered cells hidden for rowSpan and colSpan, and returns null without onCell", () => {
    const columns: ColumnDef<Row>[] = [
      { dataIndex: "name", title: "Name", onCell: (_r, i) => (i === 0 ? { rowSpan: 2 } : i === 1 ? { rowSpan: 0 } : {}) },
      { dataIndex: "city", title: "City", onCell: (_r, i) => (i === 2 ? { colSpan: 2 } : {}) },
      { dataIndex: "key", title: "Key" },
    ];
    const layout = resolveColumns(columns, opts);
    const rows: Row[] = [
      { key: "a", name: "", city: "" },
      { key: "b", name: "", city: "" },
      { key: "c", name: "", city: "" },
    ];
    const flat = flattenExpanded(rows, { mode: "none", childrenColumnName: null, getKey: (r) => r.key, expandedKeys: new Set(), hasLoader: false, rowExpandable: null, lazy: null });
    const spans = resolveSpans(flat, layout.leaves);
    expect(spans?.get(spanKey("a", "name"))).toMatchObject({ rowSpan: 2, hidden: false });
    expect(spans?.get(spanKey("b", "name"))).toMatchObject({ hidden: true });
    expect(spans?.get(spanKey("c", "city"))).toMatchObject({ colSpan: 2, hidden: false });
    expect(spans?.get(spanKey("c", "key"))).toMatchObject({ hidden: true });

    const plain = resolveColumns([{ dataIndex: "name", title: "Name" }] as ColumnDef<Row>[], opts);
    expect(resolveSpans(flat, plain.leaves)).toBeNull();
  });
});
