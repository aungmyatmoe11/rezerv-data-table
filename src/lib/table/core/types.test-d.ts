import { describe, expectTypeOf, it } from "vitest";
import type { ColumnDef, DataIndexPath, PathValue } from "./types";
import { defineColumns } from "./types";

interface Row {
  key: string;
  name: string;
  capacity: { booked: number; total: number };
  tags: string[];
  when: Date;
  note?: string | null;
}

describe("DataIndexPath / PathValue", () => {
  it("accepts nested paths up to depth 3 and rejects unknown ones", () => {
    expectTypeOf<"capacity.booked">().toMatchTypeOf<DataIndexPath<Row>>();
    expectTypeOf<"tags.0">().toMatchTypeOf<DataIndexPath<Row>>();
    expectTypeOf<"nope">().not.toMatchTypeOf<DataIndexPath<Row>>();
    expectTypeOf<"capacity.nope">().not.toMatchTypeOf<DataIndexPath<Row>>();
  });

  it("resolves value types, including optional / array members", () => {
    expectTypeOf<PathValue<Row, "capacity.booked">>().toEqualTypeOf<number>();
    expectTypeOf<PathValue<Row, "when">>().toEqualTypeOf<Date>();
    expectTypeOf<PathValue<Row, "tags.0">>().toEqualTypeOf<string | undefined>();
    expectTypeOf<PathValue<Row, "note">>().toEqualTypeOf<string | null | undefined>();
  });
});

describe("ColumnDef contextual typing", () => {
  it("types `render(value)` from a literal dataIndex in a plain array with `satisfies`", () => {
    const columns = [
      {
        dataIndex: "capacity.booked",
        title: "Booked",
        render: (value, record, index) => {
          expectTypeOf(value).toEqualTypeOf<number>();
          expectTypeOf(record).toEqualTypeOf<Row>();
          expectTypeOf(index).toEqualTypeOf<number>();
          return value;
        },
      },
      {
        dataIndex: "name",
        title: "Name",
        sorter: (a, b) => {
          expectTypeOf(a).toEqualTypeOf<Row>();
          return a.name.localeCompare(b.name);
        },
      },
      {
        key: "actions",
        title: "Actions",
        render: (value, record) => {
          expectTypeOf(value).toEqualTypeOf<Row>();
          expectTypeOf(record).toEqualTypeOf<Row>();
          return null;
        },
      },
    ] satisfies ColumnDef<Row>[];
    expectTypeOf(columns).toMatchTypeOf<readonly ColumnDef<Row>[]>();
  });

  it("works through defineColumns as well", () => {
    const columns = defineColumns<Row>()([
      { dataIndex: "when", title: "When", render: (value) => (expectTypeOf(value).toEqualTypeOf<Date>(), null) },
      { key: "x", title: "X", render: (record) => (expectTypeOf(record).toEqualTypeOf<Row>(), null) },
    ]);
    expectTypeOf(columns).toMatchTypeOf<readonly ColumnDef<Row>[]>();
  });

  it("rejects a wrong dataIndex", () => {
    // @ts-expect-error — 'nope' is not a path of Row
    const bad: ColumnDef<Row> = { dataIndex: "nope", title: "Bad" };
    void bad;
  });
});
