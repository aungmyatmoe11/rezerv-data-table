import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ColumnDef } from "../core/types";
import { DataTable } from "./DataTable";

interface Row {
  key: string;
  name: string;
  age: number;
}

const rows: Row[] = Array.from({ length: 12 }, (_, i) => ({ key: `r${i}`, name: `Person ${i}`, age: 20 + ((i * 7) % 12) }));
const columns: ColumnDef<Row>[] = [
  { dataIndex: "name", title: "Name", sorter: (a, b) => a.name.localeCompare(b.name), fixed: "left", width: 160 },
  { dataIndex: "age", title: "Age", sorter: (a, b) => a.age - b.age, align: "right" },
];

describe("DataTable — bare render", () => {
  it("renders a semantic table with only the configured columns and a default pager", () => {
    render(<DataTable columns={columns} dataSource={rows} aria-label="People" />);
    const table = screen.getByRole("table", { name: "People" });
    expect(within(table).getAllByRole("columnheader")).toHaveLength(2);
    expect(within(table).getAllByRole("row")).toHaveLength(1 + 10); // header + first page
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /expand row/i })).toBeNull();
    expect(screen.getByRole("navigation", { name: "People pagination" })).toBeInTheDocument();
  });

  it("pagination={false} removes the pager and renders every row", () => {
    render(<DataTable columns={columns} dataSource={rows} pagination={false} />);
    expect(screen.queryByRole("navigation", { name: /pagination/i })).toBeNull();
    expect(screen.getAllByRole("row")).toHaveLength(1 + 12);
  });
});

describe("DataTable — sorting", () => {
  it("cycles aria-sort none → ascending → descending → none on header click", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} dataSource={rows} pagination={false} showSorterTooltip={false} />);
    const header = screen.getByRole("columnheader", { name: /age/i });
    const button = within(header).getByRole("button");
    expect(header).toHaveAttribute("aria-sort", "none");
    await user.click(button);
    expect(header).toHaveAttribute("aria-sort", "ascending");
    const firstCell = screen.getAllByRole("row")[1]?.querySelectorAll("td")[1];
    expect(firstCell?.textContent).toBe("20");
    await user.click(button);
    expect(header).toHaveAttribute("aria-sort", "descending");
    await user.click(button);
    expect(header).toHaveAttribute("aria-sort", "none");
  });
});

describe("DataTable — pagination controls", () => {
  it("navigates pages and disables prev on the first page", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DataTable columns={columns} dataSource={rows} pagination={{ pageSize: 5, onChange }} />);
    const prev = screen.getByRole("button", { name: "Previous page" });
    expect(prev).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Page 3" }));
    expect(onChange).toHaveBeenCalledWith(3, 5);
    expect(screen.getByRole("button", { name: "Page 3" })).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("row")).toHaveLength(1 + 2);
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });
});

describe("DataTable — feature columns appear only with config", () => {
  it("rowSelection adds a checkbox column and reports selections", async () => {
    const user = userEvent.setup();
    const onSelection = vi.fn();
    render(<DataTable columns={columns} dataSource={rows} pagination={false} rowSelection={{ onChange: onSelection }} />);
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(1 + 12);
    await user.click(boxes[1] as HTMLElement);
    expect(onSelection).toHaveBeenLastCalledWith(["r0"], [rows[0]], { type: "single" });
    await user.click(boxes[0] as HTMLElement);
    expect(onSelection).toHaveBeenLastCalledWith(rows.map((r) => r.key), rows, { type: "all" });
  });

  it("expandable renders an expand column and the region below the row", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} dataSource={rows} pagination={false} expandable={{ expandedRowRender: (record) => <div>Details for {record.name}</div> }} />);
    const toggle = screen.getAllByRole("button", { name: "Expand row" })[0] as HTMLElement;
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const region = screen.getByRole("region");
    expect(region).toHaveTextContent("Details for Person 0");
    expect(region.closest("tr")?.querySelector("td")).toHaveAttribute("colspan", "3");
  });
});

describe("DataTable — on-demand children", () => {
  it("shows a loading region, then an error with Retry, then the content", async () => {
    const user = userEvent.setup();
    let attempts = 0;
    const loadChildren = vi.fn(async () => {
      attempts += 1;
      await new Promise((resolve) => setTimeout(resolve, attempts === 1 ? 60 : 5));
      if (attempts === 1) throw new Error("network down");
      return ["Alice", "Bob"];
    });
    render(
      <DataTable
        columns={columns}
        dataSource={rows}
        pagination={false}
        expandable={{ loadChildren, expandedRowRender: (_r, _i, _d, _e, children) => <ul>{(children as string[]).map((c) => <li key={c}>{c}</li>)}</ul> }}
      />,
    );
    await user.click(screen.getAllByRole("button", { name: "Expand row" })[0] as HTMLElement);
    expect(screen.getByRole("region")).toHaveAttribute("aria-busy", "true");
    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Alice")).toBeInTheDocument();
    expect(screen.getByRole("region")).toHaveAttribute("aria-busy", "false");
    expect(loadChildren).toHaveBeenCalledTimes(2);
  });
});

describe("DataTable — states", () => {
  it("renders skeleton rows that mirror the column count while loading with no data", () => {
    const { container } = render(<DataTable columns={columns} dataSource={[]} loading={{ skeletonRows: 4 }} />);
    const skeletonRows = container.querySelectorAll(".dt__skeleton-row");
    expect(skeletonRows).toHaveLength(4);
    expect(skeletonRows[0]?.querySelectorAll("td")).toHaveLength(2);
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
  });

  it("loading.delay holds the skeleton back, and a fast load never shows one", async () => {
    vi.useFakeTimers();
    try {
      const { container, rerender } = render(<DataTable columns={columns} dataSource={[]} loading={{ delay: 300, skeletonRows: 3 }} />);
      expect(container.querySelectorAll(".dt__skeleton-row")).toHaveLength(0);

      // the wait outlasts the delay → the skeleton appears
      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      expect(container.querySelectorAll(".dt__skeleton-row")).toHaveLength(3);

      // a second, faster load resolves inside the delay → nothing flashes
      rerender(<DataTable columns={columns} dataSource={rows} loading={false} />);
      rerender(<DataTable columns={columns} dataSource={rows} loading={{ delay: 300 }} />);
      await act(async () => {
        vi.advanceTimersByTime(120);
      });
      rerender(<DataTable columns={columns} dataSource={rows} loading={false} />);
      expect(container.querySelectorAll(".dt__skeleton-row")).toHaveLength(0);
      expect(screen.getByRole("table")).not.toHaveAttribute("aria-busy", "true");
    } finally {
      vi.useRealTimers();
    }
  });

  it("renders the empty state and the error state with retry", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DataTable columns={columns} dataSource={[]} locale={{ emptyText: "No classes this week" }} />);
    expect(screen.getByText("No classes this week")).toBeInTheDocument();
    const onRetry = vi.fn();
    rerender(<DataTable columns={columns} dataSource={[]} error={new Error("Failed to load classes")} onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load classes");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("marks fixed columns for sticky positioning with an edge cue", () => {
    const { container } = render(<DataTable columns={columns} dataSource={rows} pagination={false} />);
    const fixedHeader = container.querySelector('th[data-fixed="left"]');
    expect(fixedHeader).toHaveAttribute("data-fixed-edge", "left");
    expect(container.querySelector("[data-layout]")).toHaveAttribute("data-layout", "fixed");
  });
});
