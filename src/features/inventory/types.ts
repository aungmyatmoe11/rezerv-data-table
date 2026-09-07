export interface Money {
  amount: number;
  currency: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  warehouse: string;
  /** Decimal kept as a string (scale 3) — never a float. */
  quantity: string;
  unitPrice: Money;
  active: boolean;
  /** ISO date or null when never counted. */
  lastCountedOn: string | null;
  /** Product variants — rendered as tree children with the same columns. */
  children?: InventoryItem[];
}

export interface StockMovement {
  id: string;
  itemId: string;
  occurredAt: string;
  delta: string;
  reason: string;
}

export interface SortSpec {
  field: string;
  order: "ascend" | "descend";
}
