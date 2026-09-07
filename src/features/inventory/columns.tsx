import { Button, Tag, Text } from "@/lib/ui";
import type { ColumnDef } from "@/lib/table";
import { studioTime } from "../format";
import type { InventoryItem, StockMovement } from "./types";

const CATEGORIES = ["Apparel", "Equipment", "Supplements", "Accessories", "Recovery"];
const WAREHOUSES = ["Main", "WH-North", "WH-South", "WH-East"];

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-SG", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
}

export function formatQuantity(quantity: string): string {
  const value = Number(quantity);
  return Number.isFinite(value) ? value.toLocaleString("en-SG", { minimumFractionDigits: 0, maximumFractionDigits: 3 }) : quantity;
}

/**
 * A deliberately different shape from the timetable: money object, decimal-as-string,
 * booleans, a nullable date, tree children and a fixed-right actions column.
 * Every sorter is `{ multiple }` without `compare` → server-side multi-sort.
 */
export function buildItemColumns(onShowMovements: (item: InventoryItem) => void): ColumnDef<InventoryItem>[] {
  return [
    { dataIndex: "sku", title: "SKU", fixed: "left", width: 170, sorter: { multiple: 4 }, render: (sku) => <Text code>{sku}</Text> },
    { dataIndex: "name", title: "Product", width: 240, ellipsis: true, sorter: { multiple: 3 } },
    {
      dataIndex: "category",
      title: "Category",
      width: 140,
      filters: CATEGORIES.map((value) => ({ text: value, value })),
      onFilter: (value, record) => record.category === value,
    },
    {
      dataIndex: "warehouse",
      title: "Warehouse",
      width: 130,
      filters: WAREHOUSES.map((value) => ({ text: value, value })),
      onFilter: (value, record) => record.warehouse === value,
    },
    { dataIndex: "quantity", title: "Qty", width: 110, align: "right", sorter: { multiple: 2 }, render: (quantity) => <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatQuantity(quantity)}</span> },
    {
      dataIndex: "unitPrice.amount",
      title: "Unit price",
      width: 130,
      align: "right",
      sorter: { multiple: 1 },
      render: (amount, record) => <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatMoney(amount, record.unitPrice.currency)}</span>,
    },
    { dataIndex: "active", title: "Active", width: 100, align: "center", render: (active) => <Tag tone={active ? "success" : "neutral"}>{active ? "Yes" : "No"}</Tag> },
    {
      dataIndex: "lastCountedOn",
      title: "Last counted",
      width: 140,
      sorter: { multiple: 0 },
      render: (date) => (date === null ? <Text tone="secondary">Never</Text> : studioTime(date).format("D MMM YYYY")),
    },
    {
      key: "actions",
      title: "Actions",
      fixed: "right",
      width: 150,
      align: "center",
      render: (item) =>
        item.id.includes("-v") ? null : (
          <Button size="small" onClick={() => onShowMovements(item)}>
            Movements
          </Button>
        ),
    },
  ];
}

export const movementColumns: ColumnDef<StockMovement>[] = [
  { dataIndex: "occurredAt", title: "When", width: 180, sorter: (a, b) => a.occurredAt.localeCompare(b.occurredAt), defaultSortOrder: "descend", render: (value) => studioTime(value).format("D MMM YYYY · HH:mm") },
  { dataIndex: "reason", title: "Reason", width: 200 },
  {
    dataIndex: "delta",
    title: "Change",
    width: 110,
    align: "right",
    sorter: (a, b) => Number(a.delta) - Number(b.delta),
    render: (delta) => {
      const value = Number(delta);
      return <Tag tone={value >= 0 ? "success" : "danger"}>{value >= 0 ? `+${formatQuantity(delta)}` : formatQuantity(delta)}</Tag>;
    },
  },
];
