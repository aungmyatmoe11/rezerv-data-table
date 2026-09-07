import { useCallback, useEffect, useMemo, useReducer } from "react";
import type { FilterState, SorterResult, TableChangeHandler, TablePaginationState } from "../core/types";

export interface RequestParams<T> {
  page: number;
  pageSize: number;
  /** Active sorters in priority order (empty when unsorted). */
  sorter: readonly SorterResult<T>[];
  filters: FilterState;
}

export interface RequestResult<T> {
  data: readonly T[];
  total: number;
}

export type RequestFetcher<T> = (params: RequestParams<T>, signal: AbortSignal) => Promise<RequestResult<T>>;

export interface UseTableRequestOptions {
  defaultPage?: number;
  defaultPageSize?: number;
  /** Keep the previous page on screen (overlay spinner) instead of showing skeleton rows. Default `true`. */
  keepPreviousData?: boolean;
  /** Set `false` to pause fetching. */
  enabled?: boolean;
  /** Extra values that should trigger a refetch when they change (e.g. a scenario switch). */
  deps?: readonly unknown[];
}

export interface TableRequest<T extends object> {
  dataSource: readonly T[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  pagination: TablePaginationState;
  onChange: TableChangeHandler<T>;
  params: RequestParams<T>;
  refetch: () => void;
}

interface State<T> {
  params: RequestParams<T>;
  data: readonly T[];
  total: number;
  status: "idle" | "loading" | "success" | "error";
  error: unknown;
  tick: number;
}

type Action<T> =
  | { type: "params"; params: RequestParams<T> }
  | { type: "refetch" }
  | { type: "start" }
  | { type: "success"; data: readonly T[]; total: number }
  | { type: "failure"; error: unknown };

function reducer<T>(state: State<T>, action: Action<T>): State<T> {
  switch (action.type) {
    case "params":
      return { ...state, params: action.params };
    case "refetch":
      return { ...state, tick: state.tick + 1 };
    case "start":
      return { ...state, status: "loading", error: null };
    case "success":
      return { ...state, status: "success", data: action.data, total: action.total, error: null };
    case "failure":
      return { ...state, status: "error", error: action.error };
    default:
      return state;
  }
}

/**
 * Server-mode adapter that lives OUTSIDE the table: owns the request lifecycle
 * (params → fetch → abort → retry) and exposes exactly the props `DataTable` needs.
 *
 *   const table = useTableRequest(fetchClasses);
 *   <DataTable columns={columns} {...table} />
 */
export function useTableRequest<T extends object>(fetcher: RequestFetcher<T>, options: UseTableRequestOptions = {}): TableRequest<T> {
  const { defaultPage = 1, defaultPageSize = 10, keepPreviousData = true, enabled = true } = options;
  const deps = options.deps ?? [];

  const [state, dispatch] = useReducer(reducer<T>, undefined, () => ({
    params: { page: defaultPage, pageSize: defaultPageSize, sorter: [], filters: {} },
    data: [],
    total: 0,
    status: "idle" as const,
    error: null,
    tick: 0,
  }));

  const depsKey = JSON.stringify(deps);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    dispatch({ type: "start" });
    fetcher(state.params, controller.signal).then(
      (result) => {
        if (!controller.signal.aborted) dispatch({ type: "success", data: result.data, total: result.total });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) dispatch({ type: "failure", error });
      },
    );
    return () => controller.abort();
    // depsKey က options.deps ကို serialise ထားတာ — array identity မဟုတ်ဘဲ content ပြောင်းမှသာ refetch ဖြစ်စေတယ်
  }, [fetcher, state.params, state.tick, enabled, depsKey]);

  const onChange = useCallback<TableChangeHandler<T>>((pagination, filters, sorter) => {
    const sorters = Array.isArray(sorter) ? sorter : sorter.order === null ? [] : [sorter];
    dispatch({ type: "params", params: { page: pagination.current, pageSize: pagination.pageSize, sorter: sorters, filters } });
  }, []);

  const refetch = useCallback(() => dispatch({ type: "refetch" }), []);

  const loading = state.status === "loading" || state.status === "idle";
  const dataSource = loading && !keepPreviousData ? [] : state.data;
  const pagination = useMemo<TablePaginationState>(
    () => ({ current: state.params.page, pageSize: state.params.pageSize, total: state.total }),
    [state.params.page, state.params.pageSize, state.total],
  );

  return {
    dataSource,
    loading,
    error: state.status === "error" ? state.error : undefined,
    onRetry: refetch,
    pagination,
    onChange,
    params: state.params,
    refetch,
  };
}
