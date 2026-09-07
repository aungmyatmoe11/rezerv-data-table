# ADR 0005 — Opt-in, hand-written virtual windowing over the flattened row list

## Context

"Large datasets — interaction must stay smooth" and the antd big-data demo. Virtualisation
libraries (`@tanstack/react-virtual`, `react-window`) are close enough to "table/grid library"
territory that we chose not to depend on them.

## Decision

`virtual` (opt-in) windows the **final** flattened row list inside the body scroller.
`useVirtualRows` subscribes with `useSyncExternalStore` (scroll + resize, rAF-coalesced) and
returns a cached `{ start, end, top, bottom }` that only changes when the visible index range
changes; it lives in `TableBody` so only `<tbody>` re-renders. Fixed row height (`rowHeight`) is
the fast path; expanded rows are measured by one ResizeObserver and prefix sums + binary search
take over. Spacer `<tr>`s carry off-screen height; `aria-rowcount` / `aria-rowindex` keep
semantics. `rowSpan` is degraded to 1 under `virtual`.

## Alternatives

- **Pagination only** — the default and fine for most screens, but the 10,000-row
  no-pagination case would mount 10,000 rows.
- **`@tanstack/react-virtual`** — good library, but it is what the previous attempt used and it
  blurs the "from scratch" line.
- **Absolute-positioned rows** — breaks native table semantics and sticky columns.

## Consequences

~120 lines, zero dependencies, semantic table preserved, works with pagination, expansion and
tree rows. Requires `scroll.y` (and ideally `rowHeight`); expand animation is disabled; focus is
lost when a focused row scrolls out (documented); `scrollTo({ index })` is deferred.

## Revisit when

Consumers need horizontal virtualisation or thousands of columns — that is a different design
(column windowing) and should be a separate ADR.
