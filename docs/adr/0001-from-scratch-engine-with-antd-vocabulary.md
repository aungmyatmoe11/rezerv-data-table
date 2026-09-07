# ADR 0001 — From-scratch engine that speaks Ant Design Table's vocabulary

## Context

The brief forbids table/grid libraries (TanStack Table, AG Grid, MUI DataGrid, Ant Design Table,
react-data-grid) but allows non-table UI primitives. The owner's team uses Ant Design daily and
wants a table whose configuration reads like antd's (`pagination`, `rowSelection`, `expandable`,
`scroll`, `onChange(pagination, filters, sorter, extra)`), including the whole antd demo list.

## Decision

Build the engine in `src/lib/table/{core,react,ui}` from scratch. Adopt antd's prop **names and
semantics** (verified against `@rc-component/table` source) as the public API, adding only what the
brief needs and antd lacks (`error` / `onRetry`, `loading.mode`, `expandable.loadChildren`,
`scroll.y: 'auto'`, `rowHeight`, `columnReorder`, `theme`). Use antd only for Button, Checkbox,
Radio, Dropdown, Tooltip, Empty, Spin and icons. Enforce with ESLint (`Table` / `Pagination` from
`antd` and `@tanstack/*` banned).

## Alternatives

- **Wrap antd Table** — violates the brief.
- **Invent a new vocabulary** (e.g. `data={{ processing: 'client' }}`, branded ids) — the previous
  attempt did this; it was verbose and unfamiliar, and the playground could not generate JSX a
  consumer would recognise.
- **TanStack Table headless + own renderer** — a table library by the brief's definition.

## Consequences

Familiar API and copy-pasteable playground output; a large prop surface that must stay inert by
default (`resolveConfig`); antd differences must be documented (`docs/API.md`). Minor antd props
(`components`, `itemRender`, `expandedRowOffset`) are not implemented.

## Revisit when

antd changes a semantic we mirror (e.g. controlled-by-presence), or a consumer needs a prop from
the "not implemented" list — add it additively, never by changing an existing semantic.
