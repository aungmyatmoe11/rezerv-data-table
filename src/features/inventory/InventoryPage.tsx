"use client";

import { Alert, Drawer, Select, Space, Switch, Typography } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable, useTableRequest, type Key, type RequestParams } from "@/lib/table";
import { SCENARIOS, resetScenarioLatches, type Scenario } from "@/mocks/scenarios";
import { fetchItemsHttp, fetchMovementsHttp } from "./api";
import { buildItemColumns, formatMoney, formatQuantity, movementColumns } from "./columns";
import type { InventoryItem, SortSpec, StockMovement } from "./types";

const SCENARIO_LABEL: Record<Scenario, string> = {
  normal: "Normal",
  slow: "Slow network",
  empty: "Empty dataset",
  error: "Server error",
  "fail-once": "Fail once, then succeed",
  malformed: "Malformed payload",
};

function MovementsDrawer({ item, scenario, nonce, onClose }: { item: InventoryItem | null; scenario: Scenario; nonce: string; onClose: () => void }) {
  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; rows: StockMovement[]; error?: unknown; tick: number }>({ status: "loading", rows: [], tick: 0 });
  const itemId = item?.id ?? null;
  useEffect(() => {
    if (itemId === null) return;
    const controller = new AbortController();
    fetchMovementsHttp(itemId, scenario, nonce, controller.signal).then(
      (rows) => {
        if (!controller.signal.aborted) setState((prev) => ({ ...prev, status: "ready", rows }));
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setState((prev) => ({ ...prev, status: "error", rows: [], error }));
      },
    );
    return () => controller.abort();
  }, [itemId, scenario, nonce, state.tick]);
  const retry = useCallback(() => setState((prev) => ({ ...prev, status: "loading", tick: prev.tick + 1 })), []);

  return (
    <Drawer
      open={item !== null}
      onClose={onClose}
      size={560}
      title={item === null ? "" : `Stock movements — ${item.name}`}
      destroyOnHidden
      afterOpenChange={(open) => {
        if (open) setState({ status: "loading", rows: [], tick: 0 });
      }}
    >
      <DataTable<StockMovement>
        aria-label="Stock movements"
        columns={movementColumns}
        dataSource={state.rows}
        rowKey="id"
        size="small"
        loading={state.status === "loading"}
        error={state.status === "error" ? state.error : undefined}
        onRetry={retry}
        pagination={{ defaultPageSize: 8, size: "small", hideOnSinglePage: true }}
        locale={{ emptyText: "No movements recorded for this item." }}
      />
    </Drawer>
  );
}

export function InventoryPage() {
  const [scenario, setScenario] = useState<Scenario>("normal");
  const [nonce, setNonce] = useState(() => String(Date.now()));
  const [linkedSelection, setLinkedSelection] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [drawerItem, setDrawerItem] = useState<InventoryItem | null>(null);

  const changeScenario = (next: Scenario): void => {
    resetScenarioLatches();
    setNonce(String(Date.now()));
    setScenario(next);
  };

  const fetcher = useCallback(
    (params: RequestParams<InventoryItem>, signal: AbortSignal) => {
      const sort: SortSpec[] = params.sorter.filter((s) => s.order !== null).map((s) => ({ field: String(s.field ?? s.columnKey), order: s.order === "descend" ? "descend" : "ascend" }));
      const category = params.filters["category"]?.map(String);
      const warehouse = params.filters["warehouse"]?.map(String);
      return fetchItemsHttp({ page: params.page, pageSize: params.pageSize, sort, category, warehouse, scenario, nonce }, signal);
    },
    [scenario, nonce],
  );
  const request = useTableRequest<InventoryItem>(fetcher, { defaultPageSize: 10 });

  const columns = useMemo(() => buildItemColumns(setDrawerItem), []);

  const summary = useCallback((pageData: readonly InventoryItem[]) => {
    const qty = pageData.reduce((sum, item) => sum + Number(item.quantity), 0);
    const value = pageData.reduce((sum, item) => sum + Number(item.quantity) * item.unitPrice.amount, 0);
    return (
      <tr>
        <td className="dt__td" colSpan={5}>
          Page totals ({pageData.length} products)
        </td>
        <td className="dt__td" data-align="right" style={{ textAlign: "end" }}>
          {formatQuantity(qty.toFixed(3))}
        </td>
        <td className="dt__td" data-align="right" style={{ textAlign: "end" }}>
          {formatMoney(value, "SGD")}
        </td>
        <td className="dt__td" colSpan={3} />
      </tr>
    );
  }, []);

  return (
    <div>
      <h1 className="page-title">Inventory</h1>
      <p className="page-subtitle">A second, differently-shaped dataset on the same component: server-side multi-sort and filters, tree variants, linked selection, page totals.</p>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="scenario-bar">
          <label>
            Scenario
            <Select<Scenario> value={scenario} onChange={changeScenario} style={{ width: 210 }} options={SCENARIOS.map((value) => ({ value, label: SCENARIO_LABEL[value] }))} />
          </label>
          <label>
            Linked selection (checkStrictly: false)
            <Switch checked={linkedSelection} onChange={setLinkedSelection} />
          </label>
        </div>
        <Typography.Text type="secondary">
          Every column sorter is <code>{"{ multiple: n }"}</code> without a comparator, so clicking headers builds a multi-sort that the table only <em>emits</em>; the server orders the page. Products with variants expand into tree rows.
        </Typography.Text>
      </div>

      {selectedKeys.length > 0 ? (
        <Alert type="info" showIcon style={{ marginBottom: 12 }} message={<Space wrap><span><strong>{selectedKeys.length}</strong> selected</span><a onClick={() => setSelectedKeys([])}>Clear</a></Space>} />
      ) : null}

      <DataTable<InventoryItem>
        aria-label="Inventory items"
        columns={columns}
        dataSource={request.dataSource}
        rowKey="id"
        loading={request.loading}
        error={request.error}
        onRetry={request.onRetry}
        bordered
        size="small"
        scroll={{ x: 1400, y: 520 }}
        rowSelection={{ selectedRowKeys: selectedKeys, onChange: (keys) => setSelectedKeys(keys), checkStrictly: !linkedSelection, getCheckboxProps: (item) => ({ disabled: !item.active }) }}
        expandable={{ childrenColumnName: "children", indentSize: 20 }}
        pagination={{ ...request.pagination, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: (total, [from, to]) => `${from}–${to} of ${total} products` }}
        onChange={request.onChange}
        summary={summary}
        locale={{ emptyText: "No products match the current filters." }}
      />

      <MovementsDrawer item={drawerItem} scenario={scenario} nonce={nonce} onClose={() => setDrawerItem(null)} />
    </div>
  );
}
