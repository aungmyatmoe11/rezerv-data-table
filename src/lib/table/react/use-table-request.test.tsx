import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TablePaginationState } from "../core/types";
import { useTableRequest, type RequestFetcher, type RequestParams } from "./use-table-request";

interface Row {
  key: string;
}

/** A server that owns `total` and slices its own pages — the shape a real endpoint returns. */
function server(total: number): RequestFetcher<Row> & { calls: RequestParams<Row>[] } {
  const calls: RequestParams<Row>[] = [];
  const fetcher = (params: RequestParams<Row>): Promise<{ data: Row[]; total: number }> => {
    calls.push(params);
    const from = (params.page - 1) * params.pageSize;
    const data = Array.from({ length: Math.max(0, Math.min(params.pageSize, total - from)) }, (_, i) => ({ key: `r${from + i}` }));
    return Promise.resolve({ data, total });
  };
  return Object.assign(fetcher, { calls });
}

function page(pagination: TablePaginationState): number {
  return pagination.current;
}

describe("useTableRequest", () => {
  it("emits page / size changes as request params", async () => {
    const fetcher = server(100);
    const { result } = renderHook(() => useTableRequest<Row>(fetcher, { defaultPageSize: 10 }));
    await waitFor(() => expect(result.current.dataSource).toHaveLength(10));

    act(() => result.current.onChange({ current: 3, pageSize: 10, total: 100 }, {}, [], { action: "paginate", currentDataSource: [] }));
    await waitFor(() => expect(result.current.dataSource[0]?.key).toBe("r20"));
    expect(page(result.current.pagination)).toBe(3);
  });

  it("clamps to the last page and refetches when the server total shrinks", async () => {
    const big = server(100);
    const { result, rerender } = renderHook(({ fetcher }) => useTableRequest<Row>(fetcher, { defaultPageSize: 10 }), { initialProps: { fetcher: big as RequestFetcher<Row> } });
    await waitFor(() => expect(result.current.dataSource).toHaveLength(10));

    act(() => result.current.onChange({ current: 9, pageSize: 10, total: 100 }, {}, [], { action: "paginate", currentDataSource: [] }));
    await waitFor(() => expect(page(result.current.pagination)).toBe(9));

    // the dataset shrinks under the current page (rows 10,000 → 64 in the demo)
    const small = server(24);
    rerender({ fetcher: small as RequestFetcher<Row> });

    // page 9 does not exist any more: the hook clamps to 3 and asks the server again,
    // instead of leaving the table on an empty page it can no longer navigate away from
    await waitFor(() => expect(page(result.current.pagination)).toBe(3));
    await waitFor(() => expect(result.current.dataSource).toHaveLength(4));
    expect(result.current.dataSource[0]?.key).toBe("r20");
    expect(small.calls.map((call) => call.page)).toEqual([9, 3]);
  });

  it("leaves a page that is still in range alone", async () => {
    const big = server(100);
    const { result, rerender } = renderHook(({ fetcher }) => useTableRequest<Row>(fetcher, { defaultPageSize: 10 }), { initialProps: { fetcher: big as RequestFetcher<Row> } });
    await waitFor(() => expect(result.current.dataSource).toHaveLength(10));
    act(() => result.current.onChange({ current: 2, pageSize: 10, total: 100 }, {}, [], { action: "paginate", currentDataSource: [] }));
    await waitFor(() => expect(page(result.current.pagination)).toBe(2));

    const smaller = server(40);
    rerender({ fetcher: smaller as RequestFetcher<Row> });
    await waitFor(() => expect(result.current.pagination.total).toBe(40));
    expect(page(result.current.pagination)).toBe(2);
    expect(smaller.calls.map((call) => call.page)).toEqual([2]);
  });

  it("surfaces an error with a working retry", async () => {
    const failing = vi.fn<RequestFetcher<Row>>().mockRejectedValueOnce(new Error("boom")).mockResolvedValue({ data: [{ key: "r0" }], total: 1 });
    const { result } = renderHook(() => useTableRequest<Row>(failing, { defaultPageSize: 10 }));
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));

    act(() => result.current.onRetry());
    await waitFor(() => expect(result.current.dataSource).toHaveLength(1));
    expect(result.current.error).toBeUndefined();
  });
});
