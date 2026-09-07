# ARCHITECTURE — how the table works

## Layers

```mermaid
flowchart LR
  subgraph lib["src/lib/table"]
    core["core/  pure TS\ntypes · value · sorting · filtering · pagination\nexpansion · selection · columns · spans\nstate (reducer) · resolve-config · row-model"]
    react["react/  hooks\nuse-table-state (send/emit) · use-table\nuse-lazy-children · use-sticky-scroll\nuse-virtual-rows · use-row-heights · use-auto-height\nuse-breakpoint · use-table-request"]
    ui["ui/  markup + CSS\nDataTable · TableHeader · HeaderCell · FilterDropdown\nTableBody · BodyRow · BodyCell · ExpandedRow\nTablePagination · TableStates · ColumnReorder · theme"]
    core --> react --> ui
  end
  features["src/features/*  timetable · inventory · playground"] --> ui
  mocks["src/mocks + src/app/api/*"] --> features
```

| From | May import | Enforced by |
| --- | --- | --- |
| `core` | only other `core` files; `import type` from React is allowed for `ReactNode` in public types | `eslint.config.mjs` (`@typescript-eslint/no-restricted-imports`, `allowTypeImports`) |
| `react` | `core`, `react` | same |
| `ui` | `core`, `react`, antd non-table primitives, `@dnd-kit/*` | same + `no-restricted-imports` for `antd` `Table` / `Pagination`, `@tanstack/*` |
| `src/lib/table` | never `@/features`, `@/app`, `@/mocks` | same |
| `src/lib/table/core.ts` | server-safe entry (no hooks) used by route handlers | — |

## Progressive disclosure

`resolveConfig(props)` (memoised on prop identities) maps every feature to
`{ enabled: false }` or `{ enabled: true, …defaults }`. Each hook early-returns on
`enabled: false` (no state, no effect, no listener) and the renderer emits no selection / expand
column, pager, overlay or dnd context unless enabled. This is both the ergonomic story ("add an
attribute, get a feature") and the performance story ("no attribute, no cost").

## Row-model pipeline (`core/row-model.ts`)

| Stage | Operation | Memo dependencies |
| --- | --- | --- |
| S1 keyed | `resolveRowKey` over the tree; `recordByKey`; duplicate/missing keys warn once | `dataSource`, `rowKey`, `childrenColumnName` |
| S2 filtered | `filterTree` via `column.onFilter` — identity when no filters | S1, `filters`, `onFilterByKey` |
| S3 sorted | stable sort per tree level; antd multi-sort merge rule; server columns (no comparator) are identity | S2, `sort`, `comparatorsByKey` |
| S4 paged | top-level only; server iff `sorted.length < total`; client `clampPage` + slice | S3, `page`, `pageSize`, `total` |
| S5 flattened | `flattenExpanded` → `FlatEntry[]` (`row` entries with depth / parent, `expanded` sentinels); lazy children merged in | S4, `expandedKeys`, mode, lazy version |
| S6 spans | `onCell` colSpan / rowSpan → `SpanMap` or `null` | S5, `onCellByKey` |

Each stage is wrapped in `memoLast`, so a page change never re-invokes the comparator and the
`currentDataSource` passed to `onChange` is the same array the next render uses. `virtual`
windows the **final** flat list; S6 runs on the whole page so spans are stable while scrolling.
Selection entities for `checkStrictly: false` are built from S3 (cross-page linkage).

## State model

```ts
interface TableState {
  sort: SortEntry[];            // >1 entry only when every entry has `multiple`
  filters: Record<string, Key[] | null>;
  page: { number: number; pageSize: number };
  selectedKeys: Key[];
  expandedKeys: Key[];
  columnOrder: Key[] | null;
}
```

- **Controlled by key presence** (antd parity): `column.sortOrder`, `column.filteredValue`,
  `pagination.current`, `pagination.pageSize`, `rowSelection.selectedRowKeys`,
  `expandable.expandedRowKeys`, `columnReorder.order`. `effective = mergeControlled(internal, props, flags)`.
- **Actions:** `sort/toggle`, `filter/set`, `page/set`, `page/setSize`, `select/toggle | radio |
  page | all | invert | none | custom`, `expand/toggle | set`, `columns/reorder`.
- **`reduce(prev, action, ctx)`** is pure; cross-slice rules (sort / filter / size → page 1) live
  only here. Filters and sorts never clear selection; stale keys are pruned at derive time.
- **`send`** (stable, reads a `latest` ref written in `useLayoutEffect`):
  `next = reduce(effective, action, ctx)` → `commit` writes uncontrolled slices →
  `emit(effective, next, action, props)` calls the consumer synchronously in the handler.
  `emit` is the only place any callback fires.

`emit` mapping: sort / filter → `pagination.onChange(1, size)` then `onChange(…, 'sort' | 'filter')`;
page → `pagination.onChange` (+ `onShowSizeChange`) then `onChange(…, 'paginate')`; selection →
`rowSelection.onSelect` / `onSelectAll` then `onChange(keys, rows, { type })`; expansion →
`onExpand` then `onExpandedRowsChange`; reorder → `onReorder`. After sort / filter / paginate,
`scroll.scrollToFirstRowOnChange` scrolls the body to the top.

## Sticky columns

`table-layout: fixed; border-collapse: separate` + `<colgroup>`. Leaves are stable-partitioned
`[left…, middle…, right…]`; `left[i] = Σ width(left[<i])`, `right[j] = Σ width(right[>j])`, written
as `--dt-left` / `--dt-right` on each cell. Edge cells carry `data-fixed-edge`.
`useStickyScroll` (passive scroll + ResizeObserver, rAF-coalesced) writes `data-ping-left/right`
on the scroller only on change; CSS draws the shadow with a pseudo-element strip. No React state.

## Expansion

`useLazyChildren` keeps `Map<Key, { status, data, error, controller, generation }>` in state plus
a `version` counter that feeds S5. Expand without `loadChildren` → `ready`; cached → `ready`;
else `loading` with an `AbortController`; collapse aborts; a late response with an old
generation is dropped; `retry()` re-runs. `ExpandedRow` renders the region and the default
skeleton / alert + Retry.

## Virtual windowing

`useVirtualRows` subscribes to the scroller through `useSyncExternalStore` (scroll + resize,
rAF-coalesced) and returns a **cached** `{ start, end, top, bottom }` unless the visible index
range changes — a scroll inside the window renders nothing; a change re-renders only `<tbody>`
(the hook lives in `TableBody`). Fixed-height fast path (`rowHeight`), prefix sums + binary
search once any expanded row has been measured (`useRowHeights`, one ResizeObserver). Spacer rows
carry the off-screen height; `aria-rowcount` / `aria-rowindex` keep the semantics. `rowSpan` is
degraded to 1 under `virtual`.

## Auto height and responsive columns

`useAutoHeight` observes the wrapper's parent and the wrapper itself and sets `--dt-scroll-y`
to `parent height − table chrome` (title, pagination bars, footer). `useBreakpoint` uses
`matchMedia` for `column.responsive`.

## Column reorder

`ColumnReorderProvider` (dnd-kit `DndContext` + `SortableContext`, pointer + keyboard sensors)
mounts only when `columnReorder` is on. Only unfixed, ungrouped leaves are sortable; a drop
permutes the draggable subsequence and keeps fixed columns in their slots, then dispatches
`columns/reorder`. `columns.ts` applies `columnOrder` before partitioning.

## Server adapter

`useTableRequest(fetcher, options)` reduces `{ params, data, total, status, error }`, refetches on
`params` / `refetch()` / `deps`, aborts superseded requests, and returns exactly
`{ dataSource, loading, error, onRetry, pagination, onChange }`. Client mode uses the same hook
with a fetch-all fetcher so skeleton / error states are real in both modes.

## Testing layout

- `vitest.config.ts`: two projects — `core` (node) and `dom` (jsdom for `react/`, `ui/`,
  `features/`); `--typecheck` runs `*.test-d.ts`.
- `playwright.config.ts`: e2e against a fresh production build on port 3110, `desktop` and
  `mobile` (Pixel 7) projects. `playwright.perf.config.ts`: sequential, port 3111.
