"use client";

import { Button, Empty, Tag, Text, type Tone } from "@/lib/ui";

export interface LogEntry {
  id: number;
  at: string;
  name: string;
  payload: unknown;
}

const TONE: Record<string, Tone> = {
  onChange: "info",
  "pagination.onChange": "info",
  "rowSelection.onChange": "accent",
  "expandable.onExpand": "success",
  "expandable.onExpandedRowsChange": "success",
};

/** Keeps payloads readable: drops React elements / column objects, trims long arrays. */
export function summarise(value: unknown, depth = 0): unknown {
  if (depth > 3) return "…";
  if (Array.isArray(value)) {
    const trimmed = value.slice(0, 6).map((item) => summarise(item, depth + 1));
    return value.length > 6 ? [...trimmed, `… +${value.length - 6} more`] : trimmed;
  }
  if (value !== null && typeof value === "object") {
    if ("$$typeof" in (value as object)) return "<ReactElement>";
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (key === "column" || key === "currentDataSource") {
        out[key] = key === "column" ? "<ColumnDef>" : `<${Array.isArray(item) ? item.length : "?"} rows>`;
        continue;
      }
      if (typeof item === "function") continue;
      out[key] = summarise(item, depth + 1);
    }
    return out;
  }
  return value;
}

export function EventLog({ entries, onClear }: { entries: readonly LogEntry[]; onClear: () => void }) {
  return (
    <div className="pg-events">
      <div className="pg-panel-head">
        <Text strong>Events</Text>
        <Button size="small" variant="link" onClick={onClear} disabled={entries.length === 0}>
          Clear
        </Button>
      </div>
      {entries.length === 0 ? (
        <Empty description="Sort, paginate, select or expand to see the callbacks a real frontend would wire to an API." />
      ) : (
        <ol className="pg-event-list" aria-live="polite">
          {entries.map((entry) => (
            <li key={entry.id}>
              <div className="pg-event-head">
                <Tag tone={TONE[entry.name] ?? "neutral"}>{entry.name}</Tag>
                <span className="pg-event-time">{entry.at}</span>
              </div>
              <pre className="pg-code pg-code--small">{JSON.stringify(summarise(entry.payload), null, 2)}</pre>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
