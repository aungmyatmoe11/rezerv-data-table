/**
 * Compile-time specification of the public surface. This file is type-checked by
 * `npm run typecheck:contracts` (tsconfig.contracts.json) and never bundled.
 *
 * Every export here is re-exported from `@/lib/table`; if a name disappears or changes shape,
 * this file stops compiling.
 */
import type {
  ColumnDef,
  DataIndexPath,
  DataTableProps,
  ExpandableConfig,
  Key,
  PaginationConfig,
  PathValue,
  RowSelectionConfig,
  SorterResult,
  TableChangeHandler,
  TablePaginationState,
} from "@/lib/table";
import type { RequestFetcher, TableRequest, TableInstance } from "@/lib/table";

// --- helpers ------------------------------------------------------------------

type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const assertType = <_T extends true>(): void => undefined;

// --- typed paths ----------------------------------------------------------------

interface Row {
  id: string;
  name: string;
  capacity: { booked: number; total: number };
  tags: string[];
  lastCountedAt: string | null;
}

assertType<Equals<PathValue<Row, "capacity.booked">, number>>();
assertType<Equals<PathValue<Row, "lastCountedAt">, string | null>>();
assertType<Equals<PathValue<Row, "tags.0">, string | undefined>>();
assertType<Equals<Extract<DataIndexPath<Row>, "capacity.total">, "capacity.total">>();

// --- required props only -------------------------------------------------------

export const minimal: DataTableProps<Row> = { columns: [], dataSource: [] };

// --- column shapes ------------------------------------------------------------

export const columns: ColumnDef<Row>[] = [
  { dataIndex: "name", title: "Name", sorter: (a, b) => a.name.localeCompare(b.name), fixed: "left", width: 200 },
  { dataIndex: "capacity.booked", title: "Booked", render: (value, record) => `${value} / ${record.capacity.total}` },
  { key: "actions", title: "Actions", render: (record) => record.id },
  { title: "Group", children: [{ dataIndex: "id", title: "Id" }] },
];

// --- callback shapes ----------------------------------------------------------

export const onChange: TableChangeHandler<Row> = (pagination, filters, sorter, extra) => {
  const state: TablePaginationState = pagination;
  const single: SorterResult<Row> | SorterResult<Row>[] = sorter;
  const keys: Key[] | null | undefined = filters["name"];
  const action: "paginate" | "sort" | "filter" = extra.action;
  void state;
  void single;
  void keys;
  void action;
  void extra.currentDataSource.length;
};

export const pagination: PaginationConfig = { current: 1, pageSize: 10, total: 100, position: ["topRight", "bottomRight"], showTotal: (total, [from, to]) => `${from}–${to} of ${total}` };

export const selection: RowSelectionConfig<Row> = {
  selectedRowKeys: [],
  onChange: (keys, rows, info) => {
    void keys;
    void rows[0]?.name;
    void info.type;
  },
  checkStrictly: false,
};

export const expandable: ExpandableConfig<Row, Row[]> = {
  loadChildren: async (record, signal) => {
    void signal.aborted;
    return [record];
  },
  expandedRowRender: (record, _index, _indent, _expanded, children) => `${record.name}:${children?.length ?? 0}`,
};

// --- server adapter ---------------------------------------------------------

export const fetcher: RequestFetcher<Row> = async (params, signal) => {
  void params.page;
  void params.sorter[0]?.columnKey;
  void signal;
  return { data: [], total: 0 };
};

export const spread = (request: TableRequest<Row>): DataTableProps<Row> => ({ columns, ...request });

// --- headless instance ----------------------------------------------------------

export const headless = (table: TableInstance<Row>): number => table.model.flat.length + (table.pagination?.page ?? 0);
