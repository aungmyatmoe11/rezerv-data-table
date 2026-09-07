"use client";

import { Button, CopyIcon, Segmented, Spinner, Tag, Text, Tooltip, useToast } from "@/lib/ui";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { DataTable, type ColumnDef, type DataTableProps, type Key } from "@/lib/table";
import { listAttendeesMock } from "@/features/timetable/api";
import { attendeeColumns, buildClassColumns } from "@/features/timetable/columns";
import { classesFor, withInlineAttendees } from "@/features/timetable/data";
import type { Attendee, ClassSession } from "@/features/timetable/types";
import { generateJsx } from "./code-gen";
import { configFromSearch, configToSearch, DEFAULT_CONFIG, PRESETS, type PlaygroundConfig } from "./config";
import { EventLog, type LogEntry } from "./EventLog";
import { Controls } from "./Controls";
import "./playground.css";

type ConfigAction = { type: "set"; key: keyof PlaygroundConfig; value: PlaygroundConfig[keyof PlaygroundConfig] } | { type: "merge"; config: Partial<PlaygroundConfig> } | { type: "reset" };

function configReducer(state: PlaygroundConfig, action: ConfigAction): PlaygroundConfig {
  switch (action.type) {
    case "set":
      return { ...state, [action.key]: action.value };
    case "merge":
      return { ...DEFAULT_CONFIG, ...action.config };
    case "reset":
      return DEFAULT_CONFIG;
    default:
      return state;
  }
}

/** Recurring series → parent row, occurrences → tree children (same columns). */
function toTree(rows: readonly ClassSession[]): ClassSession[] {
  return rows.map((row) => ({
    ...row,
    children: [1, 2, 3].map((week) => {
      const start = new Date(row.startAt);
      const end = new Date(row.endAt);
      start.setUTCDate(start.getUTCDate() + week * 7);
      end.setUTCDate(end.getUTCDate() + week * 7);
      return { ...row, id: `${row.id}-w${week}`, name: `${row.name} · week ${week + 1}`, startAt: start.toISOString(), endAt: end.toISOString(), bookedCount: Math.max(0, row.bookedCount - week * 2), attendees: [] };
    }),
  }));
}

/** rowSpan for consecutive rows sharing an instructor, in data order (Ant Design's colspan-rowspan demo pattern). */
function instructorSpans(rows: readonly ClassSession[]): ReadonlyMap<string, number> {
  const spans = new Map<string, number>();
  let index = 0;
  while (index < rows.length) {
    const head = rows[index];
    if (head === undefined) break;
    let length = 1;
    while (rows[index + length]?.instructor === head.instructor) length += 1;
    spans.set(head.id, length);
    for (let i = 1; i < length; i += 1) spans.set(rows[index + i]?.id ?? "", 0);
    index += length;
  }
  return spans;
}

export function PlaygroundPage() {
  const toast = useToast();
  const [config, dispatch] = useReducer(configReducer, DEFAULT_CONFIG);
  const [events, setEvents] = useState<LogEntry[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [retryTick, setRetryTick] = useState(0);

  // URL ↔ config so the README can deep-link to a configuration
  useEffect(() => {
    const partial = configFromSearch(window.location.search);
    if (Object.keys(partial).length > 0) dispatch({ type: "merge", config: partial });
  }, []);
  useEffect(() => {
    const search = configToSearch(config);
    window.history.replaceState(null, "", search.length > 0 ? `?${search}` : window.location.pathname);
  }, [config]);

  const set = useCallback(<K extends keyof PlaygroundConfig>(key: K, value: PlaygroundConfig[K]) => dispatch({ type: "set", key, value }), []);
  const log = useCallback((name: string, payload: unknown) => {
    setEvents((prev) => [{ id: Date.now() + Math.random(), at: new Date().toLocaleTimeString(), name, payload }, ...prev].slice(0, 20));
  }, []);

  // --- data --------------------------------------------------------------------
  const baseRows = useMemo(() => withInlineAttendees(classesFor(config.rows === 12 ? 64 : 10_000).slice(0, config.rows)), [config.rows]);
  const dataSource = useMemo(() => (config.empty ? [] : config.expansion === "tree" ? toTree(baseRows) : baseRows), [baseRows, config.empty, config.expansion]);
  const spans = useMemo(() => (config.spans ? instructorSpans(dataSource) : null), [config.spans, dataSource]);

  // --- columns derived from the config ----------------------------------------
  const columns = useMemo<ColumnDef<ClassSession>[]>(() => {
    const base = buildClassColumns("client").map((column) => {
      const col = { ...column } as ColumnDef<ClassSession> & { dataIndex?: string; sorter?: unknown; ellipsis?: boolean; hidden?: boolean; responsive?: string[]; fixed?: string; filters?: unknown; onFilter?: unknown; onCell?: unknown };
      if (col.dataIndex === "name" && !config.fixedLeft) delete col.fixed;
      if (config.ellipsis) col.ellipsis = true;
      if (config.hideColumn === "instructor" && col.dataIndex === "instructor") col.hidden = true;
      if (config.responsive) {
        if (col.dataIndex === "instructor") col.responsive = ["md"];
        if (col.dataIndex === "startAt") col.responsive = ["lg"];
      }
      if (config.multiSort && typeof col.sorter === "function") {
        const compare = col.sorter as (a: ClassSession, b: ClassSession) => number;
        const priorities: Record<string, number> = { name: 4, instructor: 3, startAt: 2, bookedCount: 1, status: 0 };
        const priority = priorities[col.dataIndex ?? ""] ?? 0;
        col.sorter = { compare, multiple: priority };
      }
      if (!config.filters && col.dataIndex === "status") {
        delete col.filters;
        delete col.onFilter;
      }
      if (spans !== null && col.dataIndex === "instructor") {
        col.onCell = (record: ClassSession) => ({ rowSpan: spans.get(record.id) ?? 1 });
      }
      return col as ColumnDef<ClassSession>;
    });
    const location: ColumnDef<ClassSession> = { dataIndex: "location", title: "Location", width: 140, hidden: config.hideColumn === "location", ...(config.responsive ? { responsive: ["lg"] as const } : {}), ...(config.ellipsis ? { ellipsis: true } : {}) };
    const actions: ColumnDef<ClassSession> = {
      key: "actions",
      title: "Actions",
      width: 120,
      align: "center",
      ...(config.fixedRight ? { fixed: "right" as const } : {}),
      render: (record) => (
        <Button size="small" variant="link" onClick={() => toast.success(`Open ${record.name}`)}>
          Manage
        </Button>
      ),
    };
    return [...base.slice(0, 2), location, ...base.slice(2), actions];
  }, [config.fixedLeft, config.fixedRight, config.ellipsis, config.hideColumn, config.responsive, config.multiSort, config.filters, spans, toast]);

  // --- props derived from the config (the same thing the code panel prints) -------
  const tableProps = useMemo<DataTableProps<ClassSession>>(() => {
    const props: DataTableProps<ClassSession> = {
      columns,
      dataSource,
      rowKey: "id",
      "aria-label": "Playground table",
      bordered: config.bordered,
      size: config.size,
      showHeader: config.showHeader,
      rowHoverable: config.hoverable,
      onChange: (pagination, filters, sorter, extra) => log("onChange", { pagination, filters, sorter, extra }),
    };
    if (config.rowHeight !== null) props.rowHeight = config.rowHeight;
    if (config.title) props.title = (rows) => `Classes this week · ${rows.length} on this page`;
    if (config.footer) props.footer = (rows) => `Showing ${rows.length} classes`;
    if (config.summary)
      props.summary = (rows) => (
        <tr>
          <td className="dt__td" colSpan={columns.filter((c) => !("hidden" in c && c.hidden)).length + (config.selection !== "off" ? 1 : 0) + (config.expansion === "inline" || config.expansion === "on-demand" ? 1 : 0) - 1}>
            Seats booked on this page
          </td>
          <td className="dt__td" style={{ textAlign: "end" }}>
            {rows.reduce((sum, r) => sum + r.bookedCount, 0)}
          </td>
        </tr>
      );
    if (config.loading === "skeleton") props.loading = { mode: "skeleton", skeletonRows: 6 };
    if (config.loading === "overlay") props.loading = { mode: "overlay" };
    if (config.loading === "custom") props.loading = { mode: "overlay", indicator: <span className="pg-loading"><Spinner label="Syncing" /> Syncing…</span> };
    if (config.error) {
      props.error = new Error(`Failed to load classes (attempt ${retryTick + 1})`);
      props.onRetry = () => setRetryTick((t) => t + 1);
    }
    props.pagination = config.pagination
      ? {
          pageSize: config.pageSize,
          position: config.paginationPosition === "topAndBottom" ? ["topRight", "bottomRight"] : [config.paginationPosition],
          showSizeChanger: config.showSizeChanger,
          showQuickJumper: config.showQuickJumper,
          simple: config.simplePagination,
          ...(config.showTotal ? { showTotal: (total: number, [from, to]: readonly [number, number]) => `${from}–${to} of ${total}` } : {}),
          onChange: (page, pageSize) => log("pagination.onChange", { page, pageSize }),
        }
      : false;
    if (config.selection !== "off") {
      props.rowSelection = {
        type: config.selection,
        selectedRowKeys: selectedKeys,
        selections: config.selectionsMenu,
        checkStrictly: config.expansion !== "tree",
        onChange: (keys, rows, info) => {
          setSelectedKeys(keys);
          log("rowSelection.onChange", { selectedRowKeys: keys, selectedRows: rows.map((r) => r.name), info });
        },
        ...(config.disableCancelled ? { getCheckboxProps: (record: ClassSession) => ({ disabled: record.status === "Cancelled" }) } : {}),
      };
    }
    if (config.expansion !== "off") {
      const shared = {
        expandRowByClick: config.expandRowByClick,
        onExpand: (expanded: boolean, record: ClassSession) => log("expandable.onExpand", { expanded, record: record.name }),
        onExpandedRowsChange: (keys: Key[]) => log("expandable.onExpandedRowsChange", { expandedKeys: keys }),
      };
      const renderAttendees = (record: ClassSession, attendees: readonly Attendee[]) => (
        <DataTable<Attendee> columns={attendeeColumns} dataSource={attendees} rowKey="id" size="small" pagination={false} aria-label={`Attendees for ${record.name}`} locale={{ emptyText: "No attendees yet." }} />
      );
      if (config.expansion === "inline") props.expandable = { ...shared, expandedRowRender: (record) => renderAttendees(record, record.attendees ?? []) };
      if (config.expansion === "on-demand")
        props.expandable = {
          ...shared,
          loadChildren: (record, signal) => listAttendeesMock(record, "normal", "playground", signal),
          expandedRowRender: (record, _i, _d, _e, children) => renderAttendees(record, (children as Attendee[] | undefined) ?? []),
        };
      if (config.expansion === "tree") props.expandable = { ...shared, childrenColumnName: "children", indentSize: 20 };
    }
    const scroll: NonNullable<DataTableProps<ClassSession>["scroll"]> = {};
    if (config.scrollX) scroll.x = 1040;
    if (config.scrollY === "fixed") scroll.y = 420;
    if (config.scrollY === "auto") scroll.y = "auto";
    if (Object.keys(scroll).length > 0) props.scroll = scroll;
    if (config.stickyHeader) props.sticky = { offsetHeader: 56 };
    if (config.virtual) props.virtual = true;
    const theme: NonNullable<DataTableProps<ClassSession>["theme"]> = {};
    if (!config.sortedHighlight) {
      theme.sortedColumnBg = "transparent";
      theme.sortedHeaderBg = "transparent";
    } else if (config.sortedColor !== "") theme.sortedColumnBg = config.sortedColor;
    if (config.fixedGap) theme.fixedColumnGap = 8;
    if (Object.keys(theme).length > 0) props.theme = theme;
    return props;
  }, [columns, dataSource, config, selectedKeys, retryTick, log]);

  const code = useMemo(() => generateJsx(config), [config]);
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Copied");
    } catch {
      toast.success("Clipboard unavailable");
    }
  };

  const tableStyle = config.scrollY === "auto" ? { height: 520 } : undefined;

  return (
    <div className="pg">
      <div className="pg-head">
        <div>
          <h1 className="page-title">Playground</h1>
          <p className="page-subtitle">Flip an attribute, watch the table, read the JSX that produces it. Only the attributes you add do anything — the defaults are inert.</p>
        </div>
        <div className="pg-presets">
          <Segmented<string>
            aria-label="Presets"
            options={[{ label: "Defaults", value: "defaults" }, ...PRESETS.map((preset) => ({ label: preset.label, value: preset.key }))]}
            value={PRESETS.find((preset) => Object.entries(preset.config).every(([key, value]) => config[key as keyof PlaygroundConfig] === value) && Object.keys(preset.config).length > 0)?.key ?? "defaults"}
            onChange={(key) => (key === "defaults" ? dispatch({ type: "reset" }) : dispatch({ type: "merge", config: PRESETS.find((preset) => preset.key === key)?.config ?? {} }))}
          />
        </div>
      </div>

      <div className="pg-grid">
        <aside className="pg-controls" aria-label="Table configuration">
          <Controls config={config} onChange={set} />
        </aside>

        <section className="pg-stage" aria-label="Live table">
          <div className="pg-stage-head">
            <Text strong>Live</Text>
            <span className="pg-stage-tags">
              {config.virtual ? <Tag tone="success">virtual</Tag> : null}
              {config.rows === 10_000 ? <Tag>10,000 rows</Tag> : null}
              {selectedKeys.length > 0 ? <Tag tone="accent">{selectedKeys.length} selected</Tag> : null}
            </span>
          </div>
          <div style={tableStyle}>
            <DataTable<ClassSession> {...tableProps} />
          </div>
        </section>

        <aside className="pg-side">
          <div className="pg-code-panel">
            <div className="pg-panel-head">
              <Text strong>Generated usage</Text>
              <Tooltip title="Copy JSX">
                <Button size="small" icon={<CopyIcon />} onClick={copy} aria-label="Copy generated JSX" />
              </Tooltip>
            </div>
            <pre className="pg-code" aria-label="Generated JSX">
              <code>{code}</code>
            </pre>
          </div>
          <EventLog entries={events} onClear={() => setEvents([])} />
        </aside>
      </div>
    </div>
  );
}
