# ADR 0004 — Pinned columns via `position: sticky` with computed offsets

## Context

At least one column must stay pinned while the table scrolls horizontally, with a visual cue when
content passes beneath it, and it must hold on a 375 px viewport.

## Decision

Cells of fixed columns are `position: sticky` with `inset-inline-start/end` set from computed
offsets (`Σ width` of the fixed columns before/after them). The table uses
`table-layout: fixed; border-collapse: separate` and per-cell borders. The shadow cue is a
pseudo-element strip on the edge cell, toggled by `data-ping-left/right` attributes that a
passive, rAF-coalesced scroll listener writes on the scroller (no React state).

## Alternatives

- **Cloned fixed tables with scroll sync** (the classic pre-`position: sticky` approach) — two extra tables, row
  height synchronisation, double rendering.
- **`box-shadow` on the sticky cell** — paints under the neighbouring cell.
- **React state for the ping flag** — re-renders the whole table on every scroll.

## Consequences

Small implementation, any number of columns pinned on either side, selection / expand columns
join the left group automatically. Fixed columns need a numeric `width` (dev warning otherwise);
`bordered` must be per-cell. Interleaved fixed declarations are re-partitioned with a warning.

## Revisit when

A browser regresses sticky inside `overflow: auto` tables, or a consumer needs pinned columns
without widths — then measure widths with a ResizeObserver instead of requiring them.
