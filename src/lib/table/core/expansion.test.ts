import { describe, expect, it } from "vitest";
import { collectKeys, flattenExpanded, toggleKey } from "./expansion";
import type { FlatEntry, LazyEntry } from "./types";

interface Row {
  key: string;
  children?: Row[];
}

const getKey = (row: Row) => row.key;

function rowKeys<T>(flat: readonly FlatEntry<T>[]): string[] {
  return flat.map((e) => (e.kind === "row" ? `${String(e.key)}@${e.depth}` : `exp:${String(e.parentKey)}`));
}

describe("toggleKey", () => {
  it("adds and removes", () => {
    expect(toggleKey(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleKey(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("flattenExpanded — row mode", () => {
  const rows: Row[] = [{ key: "a" }, { key: "b" }];

  it("emits one sentinel after an expanded row", () => {
    const flat = flattenExpanded(rows, { mode: "row", childrenColumnName: null, getKey, expandedKeys: new Set(["b"]), hasLoader: false, rowExpandable: null, lazy: null });
    expect(rowKeys(flat)).toEqual(["a@0", "b@0", "exp:b"]);
    expect(flat[1]).toMatchObject({ expandable: true, expanded: true });
  });

  it("respects rowExpandable", () => {
    const flat = flattenExpanded(rows, { mode: "row", childrenColumnName: null, getKey, expandedKeys: new Set(["a"]), hasLoader: false, rowExpandable: (r) => r.key !== "a", lazy: null });
    expect(rowKeys(flat)).toEqual(["a@0", "b@0"]);
    expect(flat[0]).toMatchObject({ expandable: false, expanded: false });
  });
});

describe("flattenExpanded — tree mode", () => {
  const rows: Row[] = [{ key: "a", children: [{ key: "a1" }, { key: "a2", children: [{ key: "a2x" }] }] }, { key: "b", children: [] }, { key: "c" }];

  it("flattens expanded children with depth and parentKey", () => {
    const flat = flattenExpanded(rows, { mode: "tree", childrenColumnName: "children", getKey, expandedKeys: new Set(["a", "a2"]), hasLoader: false, rowExpandable: null, lazy: null });
    expect(rowKeys(flat)).toEqual(["a@0", "a1@1", "a2@1", "a2x@2", "b@0", "c@0"]);
    expect(flat[3]).toMatchObject({ parentKey: "a2", index: 0 });
  });

  it("an empty child list is not expandable (edge case: empty child lists)", () => {
    const flat = flattenExpanded(rows, { mode: "tree", childrenColumnName: "children", getKey, expandedKeys: new Set(["b"]), hasLoader: false, rowExpandable: null, lazy: null });
    const b = flat.find((e) => e.kind === "row" && e.key === "b");
    expect(b).toMatchObject({ hasChildren: false, expandable: false, expanded: false });
  });

  it("with a loader, emits a sentinel while loading / errored and children once ready", () => {
    const lazy = new Map<string, LazyEntry>([
      ["a", { status: "loading" }],
      ["c", { status: "ready", data: [{ key: "c1" }] }],
    ]);
    const flat = flattenExpanded([{ key: "a" }, { key: "c" }], { mode: "tree", childrenColumnName: "children", getKey, expandedKeys: new Set(["a", "c"]), hasLoader: true, rowExpandable: null, lazy });
    expect(rowKeys(flat)).toEqual(["a@0", "exp:a", "c@0", "c1@1"]);
  });

  it("a loader-backed row that resolved to no children is no longer expandable", () => {
    const lazy = new Map<string, LazyEntry>([["a", { status: "ready", data: [] }]]);
    const flat = flattenExpanded([{ key: "a" }], { mode: "tree", childrenColumnName: "children", getKey, expandedKeys: new Set(["a"]), hasLoader: true, rowExpandable: null, lazy });
    expect(flat[0]).toMatchObject({ hasChildren: false, expandable: false });
  });
});

describe("collectKeys", () => {
  it("walks the whole tree", () => {
    expect(collectKeys([{ key: "a", children: [{ key: "a1" }] }, { key: "b" }], getKey, "children")).toEqual(["a", "a1", "b"]);
  });
});
