import type { PlaygroundConfig } from "./config";

/**
 * Renders the exact `<DataTable />` usage for the current playground config so a reviewer can
 * copy what they see. Only non-default attributes are emitted — the same progressive
 * disclosure the component itself follows.
 */
export function generateJsx(config: PlaygroundConfig): string {
  const lines: string[] = [];
  const push = (name: string, value?: string): void => {
    lines.push(value === undefined ? `  ${name}` : `  ${name}={${value}}`);
  };

  push("columns", "columns");
  push("dataSource", config.empty ? "[]" : config.rows === 12 ? "classes" : `classes /* ${config.rows.toLocaleString()} rows */`);
  push("rowKey", '"id"');
  if (config.bordered) push("bordered");
  if (config.size !== "middle") push("size", `"${config.size}"`);
  if (config.rowHeight !== null) push("rowHeight", String(config.rowHeight));
  if (!config.showHeader) push("showHeader", "false");
  if (!config.hoverable) push("rowHoverable", "false");
  if (config.title) push("title", "(rows) => `Classes this week · ${rows.length} on this page`");
  if (config.footer) push("footer", "(rows) => `Showing ${rows.length} classes`");
  if (config.summary) push("summary", "(rows) => <tr><td colSpan={4}>Seats booked</td><td>{sum(rows, 'bookedCount')}</td></tr>");

  if (config.loading === "skeleton") push("loading", '{{ mode: "skeleton", skeletonRows: 6 }}');
  if (config.loading === "overlay") push("loading", '{{ mode: "overlay" }}');
  if (config.loading === "custom") push("loading", '{{ mode: "overlay", indicator: <Spin indicator={<LoadingOutlined spin />} tip="Syncing…" /> }}');
  if (config.error) push("error", 'new Error("Failed to load classes")');
  if (config.error) push("onRetry", "() => refetch()");

  if (!config.pagination) push("pagination", "false");
  else {
    const parts: string[] = [`pageSize: ${config.pageSize}`];
    if (config.paginationPosition === "topAndBottom") parts.push('position: ["topRight", "bottomRight"]');
    else if (config.paginationPosition !== "bottomRight") parts.push(`position: ["${config.paginationPosition}"]`);
    if (config.showSizeChanger) parts.push("showSizeChanger: true");
    if (config.showQuickJumper) parts.push("showQuickJumper: true");
    if (config.showTotal) parts.push("showTotal: (total, [from, to]) => `${from}–${to} of ${total}`");
    if (config.simplePagination) parts.push("simple: true");
    push("pagination", `{{ ${parts.join(", ")} }}`);
  }

  if (config.selection !== "off") {
    const parts: string[] = [];
    if (config.selection === "radio") parts.push('type: "radio"');
    if (config.selectionsMenu) parts.push("selections: true");
    if (config.disableCancelled) parts.push('getCheckboxProps: (r) => ({ disabled: r.status === "Cancelled" })');
    parts.push("onChange: (keys, rows, info) => setSelected(keys)");
    push("rowSelection", `{{ ${parts.join(", ")} }}`);
  }

  if (config.expansion === "inline") push("expandable", "{{ expandedRowRender: (cls) => <AttendeeTable rows={cls.attendees} />" + (config.expandRowByClick ? ", expandRowByClick: true" : "") + " }}");
  if (config.expansion === "on-demand")
    push("expandable", "{{ loadChildren: (cls, signal) => api.attendees(cls.id, { signal }), expandedRowRender: (cls, _i, _d, _e, attendees) => <AttendeeTable rows={attendees} />" + (config.expandRowByClick ? ", expandRowByClick: true" : "") + " }}");
  if (config.expansion === "tree") push("expandable", '{{ childrenColumnName: "children", indentSize: 20' + (config.expandRowByClick ? ", expandRowByClick: true" : "") + " }}");

  const scroll: string[] = [];
  if (config.scrollX) scroll.push("x: 1040");
  if (config.scrollY === "fixed") scroll.push("y: 420");
  if (config.scrollY === "auto") scroll.push('y: "auto"');
  if (scroll.length > 0) push("scroll", `{{ ${scroll.join(", ")} }}`);
  if (config.stickyHeader) push("sticky", "{{ offsetHeader: 56 }}");
  if (config.virtual) push("virtual");
  if (!config.sortedHighlight || config.sortedColor !== "" || config.fixedGap) {
    const theme: string[] = [];
    if (!config.sortedHighlight) theme.push("sortedColumnBg: 'transparent'");
    if (config.sortedColor !== "") theme.push(`sortedColumnBg: "${config.sortedColor}"`);
    if (config.fixedGap) theme.push("fixedColumnGap: 8");
    push("theme", `{{ ${theme.join(", ")} }}`);
  }
  push("onChange", "(pagination, filters, sorter, extra) => api.list({ ...pagination, sorter, filters })");

  const columnNotes: string[] = [];
  if (config.fixedLeft) columnNotes.push('Class → fixed: "left", width: 220');
  if (config.fixedRight) columnNotes.push('Actions → fixed: "right", width: 120');
  if (config.hideColumn !== "none") columnNotes.push(`${config.hideColumn} → hidden: true`);
  if (config.ellipsis) columnNotes.push("all → ellipsis: true");
  if (config.responsive) columnNotes.push('Location → responsive: ["lg"], Instructor → responsive: ["md"]');
  if (config.timeFormat !== "day-time") columnNotes.push(`Time → formatter: (start, row) => formatTimeRange(start, row.endAt, "${config.timeFormat}")`);
  if (config.multiSort) columnNotes.push("sorter: { compare, multiple: n }");
  if (config.filters) columnNotes.push("Status → filters + onFilter");
  if (config.spans) columnNotes.push("Instructor → onCell: (r) => ({ rowSpan: mergeByInstructor(r) })");

  const header = columnNotes.length > 0 ? `// columns: ${columnNotes.join(" · ")}\n` : "";
  return `${header}<DataTable<ClassSession>\n${lines.join("\n")}\n/>`;
}
