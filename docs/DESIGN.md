# DESIGN — how the table looks and moves

## Tokens

The library reads antd's theme tokens once (`ui/theme.ts`, `theme.useToken()`) and writes them
as `--dt-*` CSS variables on the table root; the `theme` prop overrides any of them per instance.
Nothing in `data-table.css` uses a raw colour.

| Variable | Source | Purpose |
| --- | --- | --- |
| `--dt-header-bg`, `--dt-header-color` | `colorFillAlter`, `colorTextHeading` | header row |
| `--dt-row-bg`, `--dt-hover-bg`, `--dt-selected-bg` | `colorBgContainer`, `colorFillTertiary`, `controlItemBgActive` | body rows; fixed cells inherit `--dt-row-bg` so pinned cells follow hover / selection |
| `--dt-sorted-bg`, `--dt-sorted-header-bg` | `colorFillQuaternary`… | sorted-column highlight (antd "sorted colours") |
| `--dt-border`, `--dt-radius` | `colorBorderSecondary`, `borderRadiusLG` | per-cell borders, wrapper |
| `--dt-shadow` | `colorFillSecondary` | sticky-column shadow strip |
| `--dt-primary`, `--dt-text-secondary` | `colorPrimary`, `colorTextSecondary` | sort caret active state, priority badge, muted text |
| `--dt-row-height` | `size` preset or `rowHeight` | virtual rows, skeleton rows |
| `--dt-fixed-gap` | `theme.fixedColumnGap` | gapped fixed columns |

App-level brand: primary `#0f6e56`, canvas `#f5f7f6` light / `#0f1412` dark; `colorLink` is the
primary so links meet AA. Light-mode antd preset tags are darkened (`globals.css`) to pass 4.5:1.

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
| Empty | antd `Empty` or `locale.emptyText`, one row spanning all columns |
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
- Responsive: `column.responsive` hides columns below a breakpoint (antd's `xs…xxl` values);
  narrow viewports keep the pinned column and scroll the rest.

## Anti-patterns (do not)

- Do not put a `box-shadow` on a sticky cell — it paints under the neighbour; use the strip.
- Do not use `border-collapse: collapse` — it breaks sticky columns in Chromium/WebKit.
- Do not animate `height: auto`; use the grid-rows trick.
- Do not colour text with antd preset tag colours on light backgrounds without the AA overrides.
