import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ColumnDef, DataTableProps } from "../core/types";
import { useTable } from "./use-table";

interface Row {
  key: string;
  name: string;
  age: number;
}

const rows: Row[] = Array.from({ length: 23 }, (_, i) => ({ key: `r${i}`, name: `Name ${i}`, age: (i * 7) % 23 }));

const columns: ColumnDef<Row>[] = [
  { dataIndex: "name", title: "Name", sorter: (a, b) => a.name.localeCompare(b.name) },
  { dataIndex: "age", title: "Age", sorter: (a, b) => a.age - b.age },
];

function setup(overrides: Partial<DataTableProps<Row>> = {}) {
  const initial: DataTableProps<Row> = { columns, dataSource: rows, ...overrides };
  return renderHook((props: DataTableProps<Row>) => useTable(props), { initialProps: initial });
}

describe("useTable — progressive disclosure", () => {
  it("a bare table has no selection or expansion API and paginates by default", () => {
    const { result } = setup();
    expect(result.current.selection).toBeNull();
    expect(result.current.expansion).toBeNull();
    expect(result.current.pagination).toMatchObject({ page: 1, pageSize: 10, total: 23, pages: 3, server: false });
    expect(result.current.model.flat).toHaveLength(10);
    expect(result.current.layout.hasFixed).toBe(false);
  });

  it("pagination={false} renders everything and exposes no pagination API", () => {
    const { result } = setup({ pagination: false });
    expect(result.current.pagination).toBeNull();
    expect(result.current.model.flat).toHaveLength(23);
  });

  it("`send` is referentially stable across renders", () => {
    const { result, rerender } = setup();
    const first = result.current.send;
    rerender({ columns, dataSource: rows, bordered: true });
    expect(result.current.send).toBe(first);
  });
});

describe("useTable — uncontrolled sort fires the FE hook with page reset", () => {
  it("cycles ascend → descend → none, emits pagination.onChange(1) and onChange(sort)", () => {
    const onChange = vi.fn();
    const onPage = vi.fn();
    const { result } = setup({ onChange, pagination: { pageSize: 5, onChange: onPage } });

    act(() => result.current.pagination?.setPage(3));
    expect(result.current.pagination?.page).toBe(3);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ current: 3 }), {}, expect.objectContaining({ order: null }), expect.objectContaining({ action: "paginate" }));

    act(() => result.current.sorting.toggle("age"));
    expect(result.current.sorting.orderOf("age")).toBe("ascend");
    expect(result.current.pagination?.page).toBe(1);
    expect(onPage).toHaveBeenLastCalledWith(1, 5);
    const [pagination, filters, sorter, extra] = onChange.mock.calls.at(-1) as Parameters<NonNullable<DataTableProps<Row>["onChange"]>>;
    expect(pagination).toEqual({ current: 1, pageSize: 5, total: 23 });
    expect(filters).toEqual({});
    expect(sorter).toMatchObject({ columnKey: "age", field: "age", order: "ascend" });
    expect(extra.action).toBe("sort");
    expect(extra.currentDataSource).toHaveLength(23);
    expect(extra.currentDataSource[0]?.age).toBe(0);
    expect(result.current.model.flat[0]).toMatchObject({ record: expect.objectContaining({ age: 0 }) });

    act(() => result.current.sorting.toggle("age"));
    expect(result.current.sorting.orderOf("age")).toBe("descend");
    act(() => result.current.sorting.toggle("age"));
    expect(result.current.sorting.orderOf("age")).toBeNull();
    expect(onChange.mock.calls.at(-1)?.[2]).toMatchObject({ columnKey: "age", order: null });
  });
});

describe("useTable — controlled slices are never written", () => {
  it("emits current=1 on sort but keeps rendering the parent's page until the parent applies it", () => {
    const onChange = vi.fn();
    const { result, rerender } = setup({ onChange, pagination: { current: 2, pageSize: 5 } });
    expect(result.current.pagination?.page).toBe(2);

    act(() => result.current.sorting.toggle("name"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ current: 1 });
    expect(result.current.pagination?.page).toBe(2); // parent still says 2

    rerender({ columns, dataSource: rows, onChange, pagination: { current: 1, pageSize: 5 } });
    expect(result.current.pagination?.page).toBe(1);
    expect(result.current.sorting.orderOf("name")).toBe("ascend"); // uncontrolled slice kept
  });

  it("controlled sortOrder ignores clicks and only emits", () => {
    const onChange = vi.fn();
    const controlled: ColumnDef<Row>[] = [
      { dataIndex: "name", title: "Name", sorter: true, sortOrder: "descend" },
      { dataIndex: "age", title: "Age", sorter: true, sortOrder: null },
    ];
    const { result } = setup({ columns: controlled, onChange });
    expect(result.current.sorting.orderOf("name")).toBe("descend");
    act(() => result.current.sorting.toggle("age"));
    expect(result.current.sorting.orderOf("age")).toBeNull();
    expect(onChange.mock.calls[0]?.[2]).toMatchObject({ columnKey: "age", order: "ascend" });
  });

  it("server mode: `sorter: true` never sorts locally and `total` drives the page count", () => {
    const onePage = rows.slice(0, 5);
    const serverColumns: ColumnDef<Row>[] = [{ dataIndex: "name", title: "Name", sorter: true }];
    const { result } = setup({ columns: serverColumns, dataSource: onePage, pagination: { current: 2, pageSize: 5, total: 23 } });
    expect(result.current.pagination).toMatchObject({ page: 2, total: 23, pages: 5, server: true });
    expect(result.current.model.flat.map((e) => e.kind === "row" && e.record.key)).toEqual(onePage.map((r) => r.key));
  });
});

describe("useTable — selection & expansion APIs appear only with their config", () => {
  it("row selection: page toggle, select-all scope and onChange payload", () => {
    const onSelectionChange = vi.fn();
    const { result } = setup({ pagination: { pageSize: 5 }, rowSelection: { onChange: onSelectionChange, getCheckboxProps: (r) => ({ disabled: r.key === "r1" }) } });
    const api = result.current.selection;
    expect(api).not.toBeNull();
    expect(api?.changeableKeys).toEqual(["r0", "r2", "r3", "r4"]);
    act(() => result.current.selection?.togglePage(true));
    expect(result.current.selection?.pageAllChecked).toBe(true);
    expect(onSelectionChange).toHaveBeenLastCalledWith(["r0", "r2", "r3", "r4"], expect.any(Array), { type: "all" });
    act(() => result.current.selection?.selectAll());
    expect(result.current.selection?.selectedKeys).toHaveLength(22);
  });

  it("expansion: inline row mode toggles a sentinel entry", () => {
    const onExpand = vi.fn();
    const { result } = setup({ expandable: { expandedRowRender: () => null, onExpand } });
    act(() => result.current.expansion?.toggle("r0"));
    expect(result.current.expansion?.isExpanded("r0")).toBe(true);
    expect(result.current.model.flat[1]).toMatchObject({ kind: "expanded", parentKey: "r0" });
    expect(onExpand).toHaveBeenCalledWith(true, rows[0]);
  });

  it("on-demand children: loading → ready, error → retry, collapse aborts", async () => {
    let attempt = 0;
    const loadChildren = vi.fn(async (record: Row, signal: AbortSignal) => {
      attempt += 1;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 5);
        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
        });
      });
      if (attempt === 1) throw new Error("boom");
      return [`child of ${record.key}`];
    });
    const { result } = setup({ expandable: { expandedRowRender: (_r, _i, _d, _e, children) => String(children), loadChildren } });

    await act(async () => {
      result.current.expansion?.toggle("r0");
    });
    expect(result.current.expansion?.lazy.get("r0")?.status).toBe("loading");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(result.current.expansion?.lazy.get("r0")?.status).toBe("error");

    await act(async () => {
      result.current.expansion?.retry("r0");
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(result.current.expansion?.lazy.get("r0")).toMatchObject({ status: "ready", data: ["child of r0"] });

    await act(async () => {
      result.current.expansion?.toggle("r1");
    });
    expect(result.current.expansion?.lazy.get("r1")?.status).toBe("loading");
    await act(async () => {
      result.current.expansion?.toggle("r1");
    });
    expect(result.current.expansion?.lazy.get("r1")?.status).toBe("idle");
    expect(loadChildren).toHaveBeenCalledTimes(3);
  });
});
