# ADR 0003 — One reducer, key-presence controlled slices, callbacks emitted in the handler

## Context

Sort, filters, page, page size, selection, expansion and column order interact (a sort resets the
page; filters must not clear selection). Each slice may be controlled or uncontrolled
independently, and consumers must be told about changes exactly once, synchronously, so they can
call an API.

## Decision

- One `TableState` behind one `useReducer`; `reduce(prev, action, ctx)` is pure and holds every
  cross-slice rule.
- A slice is controlled when its prop key is present (`sortOrder`, `filteredValue`,
  `pagination.current`, `pagination.pageSize`, `selectedRowKeys`, `expandedRowKeys`), which is
  the convention this API follows. `commit` writes only uncontrolled slices.
- `send(action)` runs `reduce → commit → emit` **inside the event handler**. `emit` is the only
  place a consumer callback fires. No effect watches state to call props.

## Alternatives

- **`useState` per slice + effects for invariants** — the previous attempt; effects fired on
  mount, ran twice under StrictMode and made "did the user do this?" ambiguous.
- **Zustand / Redux store** — state is per instance and instances nest; a store adds identity
  management and global coupling for no benefit.
- **Explicit `controlled` flag** — simpler to reason about in isolation, but it gives consumers
  two ways to say the same thing, and the two can disagree.

## Consequences

Deterministic callbacks (batched with the parent's `setState`), unit-testable invariants, and a
`currentDataSource` in `onChange` that is the same array the next render uses. Cost: `send` reads
a `latest` ref written in `useLayoutEffect`, and a parent that controls `pagination.current` but
not sort must apply the emitted `current: 1` itself (documented in `docs/API.md`).

## Revisit when

A slice needs asynchronous validation before commit — add a middleware step between `reduce` and
`commit`, not an effect.
