# DESIGN — how the table looks and moves

## Tokens

Two token layers, both plain CSS custom properties — no styling engine, nothing computed in
JavaScript. `src/lib/ui/ui.css` defines the app-wide `--ui-*` palette (light, plus a dark
override under `html[data-theme="dark"]`); `ui/theme.ts` maps those onto the table's own
`--dt-*` properties, which the `theme` prop can override per instance. Nothing in
`data-table.css` uses a raw colour.

| Variable | Source | Purpose |
| --- | --- | --- |
| `--dt-header-bg`, `--dt-header-color` | `--ui-fill-alter`, `--ui-text` | header row |
| `--dt-row-bg`, `--dt-hover-bg`, `--dt-selected-bg` | `--ui-bg`, `--ui-fill-tertiary`, `--ui-primary-soft` | body rows; fixed cells inherit `--dt-row-bg` so pinned cells follow hover / selection |
| `--dt-sorted-bg`, `--dt-sorted-header-bg` | `--ui-fill-alter`, `--ui-fill-secondary` | sorted-column highlight |
| `--dt-border`, `--dt-radius` | `--ui-border-soft`, 8px | per-cell borders, wrapper |
| `--dt-shadow` | fixed rgba | sticky-column shadow strip |
| `--dt-primary`, `--dt-text-secondary` | `--ui-primary`, `--ui-text-secondary` | sort caret active state, priority badge, muted text |
| `--dt-row-height` | `size` preset or `rowHeight` | virtual rows, skeleton rows |
| `--dt-fixed-gap` | `theme.fixedColumnGap` | gapped fixed columns |

App-level brand: primary `#0f6e56`, canvas `#f5f7f6` light / `#0f1412` dark. Every semantic
colour pair (`--ui-success` on `--ui-success-bg`, and so on) is chosen to clear WCAG AA 4.5:1 in
both themes — axe checks this on `/` and `/timetable` in CI.

## Density

| `size` | Row height | Cell padding |
| --- | --- | --- |
| `small` | 39 px | 8 × 8 |
| `middle` (default) | 47 px | 12 × 12 |
| `large` | 55 px | 16 × 16 |

`rowHeight={px}` overrides the preset and is what `virtual` uses for windowing.

## Motion

| Interaction | Duration | Easing | Notes |
| --- | --- | --- | --- |
| Row hover, header hover | 120 ms | ease | background only |
| Sort caret / sorted highlight | 160 ms | ease | colour only |
| Expand / collapse | 160 ms | ease | `grid-template-rows: 0fr → 1fr` + opacity; **off** under `virtual` |
| Sticky shadow | 200 ms | ease | `box-shadow` on a pseudo-element strip |
| Loading overlay | 160 ms | ease | fades over the previous page |

`prefers-reduced-motion: reduce` disables every transition and animation in the table.

## States

| State | What renders |
| --- | --- |
| Loading, no data yet | skeleton rows (`loading.skeletonRows`, default 6) that mirror leaf widths and alignment |
| Loading, data on screen | previous rows stay, translucent overlay + spinner (`loading.indicator` overrides) |
| Empty | our `Empty` (inbox glyph + message) or `locale.emptyText`, one row spanning all columns |
| Error | `role="alert"` message + Retry (`onRetry`), one row spanning all columns |
| Expanded row loading | skeleton lines inside the region (`renderLoading` overrides) |
| Expanded row error | inline alert + Retry (`renderError` overrides) |
| Row selected | `--dt-selected-bg`, pinned cells included |
| Sorted column | header and cells tinted; multi-sort shows a numbered priority badge |

## Layout rules

- Wrapper is the single scroller (`overflow: auto`, `overflow-anchor: none`); `scroll.x` sets a
  minimum table width, `scroll.y` a max height; the header is `position: sticky` inside it.
- `table-layout: fixed` whenever any column is fixed or `tableLayout="fixed"`; otherwise auto.
- `ellipsis` cells are `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` with the
  full text in `title`.
- Pagination bars are flex rows; `position` decides top/bottom × start/center/end, any subset.
- Responsive: `column.responsive` hides columns below a breakpoint (the conventional `xs…xxl` names);
  narrow viewports keep the pinned column and scroll the rest.

## Anti-patterns (do not)

- Do not put a `box-shadow` on a sticky cell — it paints under the neighbour; use the strip.
- Do not use `border-collapse: collapse` — it breaks sticky columns in Chromium/WebKit.
- Do not animate `height: auto`; use the grid-rows trick.
- Do not introduce a raw colour: add a `--ui-*` token (light **and** dark) and use that.
- Do not write a root-level rule as a descendant selector (`.dt[data-bordered="true"] .dt__td`):
  a nested table lives inside an expanded row, so it would inherit the parent's borders, density
  and sticky behaviour. Use the explicit child chain through `.dt__scroller`.
