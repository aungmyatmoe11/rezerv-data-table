# ADR 0001 — From-scratch engine behind a deliberately familiar API

## Context

The brief forbids table and grid libraries (TanStack Table, AG Grid, MUI DataGrid, Ant Design
Table, react-data-grid) but allows non-table UI primitives. So the engine has to be written here.

That settles the implementation but not the *interface*, and the interface is the part a reusable
component is judged on. The component's users are feature developers on a dashboard team who will
configure a table for a new screen and move on. Two questions followed: what should the prop
surface look like, and how much of it should exist at all.

## Decision

Build the engine in `src/lib/table/{core,react,ui}` from scratch, and give it the prop vocabulary
that React dashboard developers already hold in their heads — `columns` / `dataIndex` /
`dataSource` / `rowKey` / `pagination` / `rowSelection` / `expandable` / `scroll` /
`onChange(pagination, filters, sorter, extra)`.

This vocabulary is the de-facto convention across the React table ecosystem, and Ant Design
Table's API is its most widely used expression, so that API was read closely (against
`@rc-component/table` source) and used as the reference standard for naming and for semantics such
as controlled-by-key-presence. It is a **reference, not a dependency**: nothing from it is
installed, imported or vendored, and ESLint fails the build on every table, grid and component
library — see [ADR 0006](0006-no-component-library.md).

Where the brief needs behaviour the reference standard does not define, the API extends it rather
than bending it: `error` / `onRetry`, `loading.mode`, `expandable.loadChildren`,
`scroll.y: 'auto'`, `rowHeight`, `theme`.

## Alternatives

- **Invent a new vocabulary** (e.g. `data={{ processing: 'client' }}`, branded ids). An earlier
  attempt did exactly this. It was verbose and unfamiliar, every consumer had to learn a private
  dialect for no gain, and `/playground` could not generate JSX that a developer would recognise
  as something to paste into a real screen. Novelty in an API is a cost paid by every user.
- **Wrap an existing table** — violates the brief.
- **TanStack Table headless + own renderer** — still a table library by the brief's definition.

## Consequences

The API is learnable in minutes and the playground's generated JSX is copy-pasteable. The cost is
a wide prop surface, which is only safe because every prop resolves to `{ enabled: false }` in
`resolveConfig` and runs no code when absent — so breadth of API does not become breadth of
runtime.

Because the vocabulary is conventional, places where this component deliberately behaves
differently have to be written down rather than discovered; they are listed in
[docs/API.md](../API.md). Some rarely used props from the reference standard (`components`,
`itemRender`, `expandedRowOffset`) are not implemented.

## Revisit when

A consumer needs one of the unimplemented props — add it additively, never by changing an existing
semantic — or when a convention this API mirrors stops being the ecosystem norm.
