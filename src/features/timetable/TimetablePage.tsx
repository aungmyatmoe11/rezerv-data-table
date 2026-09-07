"use client";

import { Alert, Button, Segmented, Select, Space, Typography } from "antd";
import { useCallback, useMemo, useState } from "react";
import { DataTable, useTableRequest, type Key, type RequestParams } from "@/lib/table";
import { SCENARIOS, resetScenarioLatches, type Scenario } from "@/mocks/scenarios";
import { fetchAttendeesHttp, fetchClassesHttp, listAttendeesMock, listClassesMock } from "./api";
import { withInlineAttendees } from "./data";
import { attendeeColumns, buildClassColumns } from "./columns";
import type { Attendee, ChildrenMode, ClassSession, DataMode, RowCount } from "./types";

const SCENARIO_LABEL: Record<Scenario, string> = {
  normal: "Normal",
  slow: "Slow network",
  empty: "Empty dataset",
  error: "Server error",
  "fail-once": "Fail once, then succeed",
  malformed: "Malformed payload",
};

/**
 * Client mode still "fetches" once (mocked, with latency) so skeleton / error states are real;
 * the fetcher returns the WHOLE dataset and the table sorts / pages it locally.
 */
async function fetchAllClasses(scenario: Scenario, rowCount: RowCount, nonce: string, signal: AbortSignal): Promise<{ data: ClassSession[]; total: number }> {
  const result = await listClassesMock({ page: 1, pageSize: rowCount, scenario, rows: rowCount, nonce }, signal);
  const data = withInlineAttendees(result.data);
  return { data, total: data.length };
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

export function TimetablePage() {
  const [dataMode, setDataMode] = useState<DataMode>("client");
  const [childrenMode, setChildrenMode] = useState<ChildrenMode>("inline");
  const [scenario, setScenario] = useState<Scenario>("normal");
  const [rowCount, setRowCount] = useState<RowCount>(64);
  const [nonce, setNonce] = useState(() => String(Date.now()));
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);

  const changeScenario = (next: Scenario): void => {
    resetScenarioLatches();
    setNonce(String(Date.now()));
    setScenario(next);
  };

  const columns = useMemo(() => buildClassColumns(dataMode), [dataMode]);

  // --- client mode: one mocked load, then everything is local -----------------
  const clientFetcher = useCallback((_params: RequestParams<ClassSession>, signal: AbortSignal) => fetchAllClasses(scenario, rowCount, nonce, signal), [scenario, rowCount, nonce]);
  const client = useTableRequest<ClassSession>(clientFetcher, { enabled: dataMode === "client", keepPreviousData: false });

  // --- server mode: the table emits, the hook fetches ---------------------------
  const fetcher = useCallback(
    (params: RequestParams<ClassSession>, signal: AbortSignal) =>
      fetchClassesHttp(
        { page: params.page, pageSize: params.pageSize, sortField: params.sorter[0]?.columnKey === undefined ? undefined : String(params.sorter[0].columnKey), sortOrder: params.sorter[0]?.order ?? undefined, scenario, rows: rowCount, nonce },
        signal,
      ),
    [scenario, rowCount, nonce],
  );
  const server = useTableRequest<ClassSession>(fetcher, { defaultPageSize: 10, enabled: dataMode === "server" });

  // --- on-demand children ---------------------------------------------------------
  const loadChildren = useCallback(
    (record: ClassSession, signal: AbortSignal): Promise<Attendee[]> =>
      dataMode === "server" ? fetchAttendeesHttp(record, scenario, nonce, signal) : listAttendeesMock(record, scenario, nonce, signal),
    [dataMode, scenario, nonce],
  );

  const active = dataMode === "server" ? server : client;
  const { dataSource, loading, error, onRetry } = active;

  const stats = useMemo(() => {
    const total = dataMode === "server" ? server.pagination.total : dataSource.length;
    const full = dataSource.filter((c) => c.status === "Full").length;
    const cancelled = dataSource.filter((c) => c.status === "Cancelled").length;
    const capacity = dataSource.reduce((sum, c) => sum + c.capacity, 0);
    const booked = dataSource.reduce((sum, c) => sum + c.bookedCount, 0);
    return { total, full, cancelled, occupancy: capacity === 0 ? 0 : Math.round((booked / capacity) * 100) };
  }, [dataMode, dataSource, server.pagination.total]);

  const expandable = useMemo(
    () => ({
      expandedRowRender: (record: ClassSession, _index: number, _indent: number, _expanded: boolean, children?: unknown) => {
        const attendees = childrenMode === "inline" ? (record.attendees ?? []) : ((children as Attendee[] | undefined) ?? []);
        return (
          <DataTable<Attendee>
            columns={attendeeColumns}
            dataSource={attendees}
            rowKey="id"
            size="small"
            pagination={false}
            aria-label={`Attendees for ${record.name}`}
            locale={{ emptyText: "No attendees have booked this class yet." }}
          />
        );
      },
      ...(childrenMode === "on-demand" ? { loadChildren } : {}),
      rowExpandable: (record: ClassSession) => record.status !== "Cancelled" || childrenMode === "on-demand" || (record.attendees?.length ?? 0) > 0,
    }),
    [childrenMode, loadChildren],
  );

  return (
    <div>
      <h1 className="page-title">Class timetable</h1>
      <p className="page-subtitle">Staff view of this week&apos;s sessions. Expand a class to manage its attendees.</p>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="scenario-bar">
          <label>
            Data
            <Segmented<DataMode> value={dataMode} onChange={setDataMode} options={[{ label: "Client-side", value: "client" }, { label: "Server-side", value: "server" }]} />
          </label>
          <label>
            Children
            <Segmented<ChildrenMode> value={childrenMode} onChange={setChildrenMode} options={[{ label: "Inline", value: "inline" }, { label: "On-demand", value: "on-demand" }]} />
          </label>
          <label>
            Rows
            <Segmented<RowCount> value={rowCount} onChange={setRowCount} options={[{ label: "64", value: 64 }, { label: "10,000", value: 10_000 }]} />
          </label>
          <label>
            Scenario
            <Select<Scenario> value={scenario} onChange={changeScenario} style={{ width: 210 }} options={SCENARIOS.map((value) => ({ value, label: SCENARIO_LABEL[value] }))} />
          </label>
        </div>
        <Typography.Text type="secondary">
          {dataMode === "client"
            ? "One mocked fetch, then sorting and pagination run locally over the full dataset."
            : "The table emits sort / page changes through onChange; useTableRequest calls /api/classes and hands back one page + total."}
        </Typography.Text>
      </div>

      <div className="stat-row">
        <Stat label="Classes" value={stats.total} />
        <Stat label="Full" value={stats.full} />
        <Stat label="Cancelled" value={stats.cancelled} />
        <Stat label="Occupancy" value={`${stats.occupancy}%`} />
      </div>

      {selectedKeys.length > 0 ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={
            <Space wrap>
              <span>
                <strong>{selectedKeys.length}</strong> {selectedKeys.length === 1 ? "class" : "classes"} selected
              </span>
              <Button size="small">Send reminder</Button>
              <Button size="small" danger>
                Cancel classes
              </Button>
              <Button size="small" type="link" onClick={() => setSelectedKeys([])}>
                Clear
              </Button>
            </Space>
          }
        />
      ) : null}

      <DataTable<ClassSession>
        aria-label="Class timetable"
        columns={columns}
        dataSource={dataSource}
        rowKey="id"
        loading={loading}
        error={error}
        onRetry={onRetry}
        scroll={{ x: 960 }}
        rowSelection={{ selectedRowKeys: selectedKeys, onChange: (keys) => setSelectedKeys(keys), getCheckboxProps: (record) => ({ disabled: record.status === "Cancelled" }) }}
        expandable={expandable}
        pagination={dataMode === "server" ? { ...server.pagination, showSizeChanger: true, showTotal: (total, [from, to]) => `${from}–${to} of ${total}` } : { defaultPageSize: 10, showSizeChanger: true, showTotal: (total, [from, to]) => `${from}–${to} of ${total}` }}
        {...(dataMode === "server" ? { onChange: server.onChange } : {})}
        locale={{ emptyText: "No classes scheduled this week." }}
      />
    </div>
  );
}
