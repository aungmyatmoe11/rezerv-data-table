/**
 * Negative cases: each `@ts-expect-error` must keep failing. If one starts compiling, the type
 * safety it documents has regressed. Checked by `npm run typecheck:contracts`.
 */
import type { ColumnDef, DataTableProps } from "@/lib/table";

interface Row {
  id: string;
  name: string;
  capacity: { booked: number; total: number };
}

// dataIndex must be a real path
export const badPath: ColumnDef<Row>[] = [
  // @ts-expect-error "nope" is not a key of Row
  { dataIndex: "nope", title: "Nope" },
  // @ts-expect-error "capacity.nope" is not a nested key
  { dataIndex: "capacity.nope", title: "Nope" },
];

// render receives the typed value
export const badRender: ColumnDef<Row>[] = [
  // @ts-expect-error value is number, not string
  { dataIndex: "capacity.booked", title: "Booked", render: (value: string) => value },
];

// display columns need a key and a render
export const badDisplay: ColumnDef<Row>[] = [
  // @ts-expect-error a column without dataIndex must have `key` and `render`
  { title: "Actions" },
];

// dataSource must match the row type
// @ts-expect-error string[] is not Row[]
export const badData: DataTableProps<Row> = { columns: [], dataSource: ["a"] };

// rowKey must be a key of Row or a function
// @ts-expect-error "nope" is not a key of Row
export const badRowKey: DataTableProps<Row> = { columns: [], dataSource: [], rowKey: "nope" };

// size is a union
// @ts-expect-error "huge" is not a TableSize
export const badSize: DataTableProps<Row> = { columns: [], dataSource: [], size: "huge" };

// pagination position is a union
// @ts-expect-error "middle" is not a PaginationPosition
export const badPosition: DataTableProps<Row> = { columns: [], dataSource: [], pagination: { position: ["middle"] } };
