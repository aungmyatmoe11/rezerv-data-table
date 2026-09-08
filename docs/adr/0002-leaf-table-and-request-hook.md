# ADR 0002 — The table is a leaf; server state lives in `useTableRequest`

## Context

Client mode needs the full array; server mode needs the table to emit sort / page changes and
receive one page plus a total. A table that fetched for itself would own retries, caching and
abort policy that belong to the application.

## Decision

`DataTable` receives data and callbacks only. A separate hook, `useTableRequest(fetcher, options)`,
owns the request lifecycle (`params → fetch → AbortController → retry`) and returns exactly the
props the table needs (`dataSource`, `loading`, `error`, `onRetry`, `pagination`, `onChange`).
Server pagination is inferred from the props rather than a flag (`dataSource.length < total`).

## Alternatives

- **React Query inside the table** — couples the component to a network library and its cache
  semantics; nested attendee tables would need per-table clients.
- **`source: { fetch }` prop** — the previous attempt's `SourceCapabilities`; it was never fully
  wired and duplicated the controlled API.

## Consequences

Both demo modes use the same hook (client mode with a fetch-all fetcher), so skeleton / error
states are real in both. Consumers can replace the hook with React Query or SWR without touching
the table. The hook is deliberately small (no cache, no dedupe).

## Revisit when

A consumer needs request caching or background refresh — wrap the fetcher, do not move fetching
into the component.
