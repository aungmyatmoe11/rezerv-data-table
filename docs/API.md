# API — `DataTable<T>` props, defaults, differences from Ant Design

Import from `@/lib/table`. Everything is inert unless supplied.

```tsx
import { DataTable, defineColumns, useTableRequest, type ColumnDef } from "@/lib/table";
```

## Table props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `columns` | `ColumnDef<T>[]` | required | see [Columns](#columns) |
| `dataSource` | `readonly T[]` | required | tree data via `expandable.childrenColumnName` |
| `rowKey` | `keyof T \| (record) => Key` | `'key'` | missing / duplicate → dev warning + index fallback, never throws |
| `bordered` | `boolean` | `false` | per-cell borders (sticky-safe) |
| `size` | `'small' \| 'middle' \| 'large'` | `'middle'` | row heights 39 / 47 / 55 |
| `rowHeight` | `number` (px) | from `size` | overrides `size`; used by `virtual` |
| `showHeader` | `boolean` | `true` | |
| `tableLayout` | `'auto' \| 'fixed'` | `'fixed'` when any column is fixed, else `'auto'` | |
| `title` / `footer` / `summary` | `(pageData) => ReactNode` | — | `summary` renders in `<tfoot>` |
| `rowClassName` | `string \| (record, index) => string` | — | |
| `rowHoverable` | `boolean` | `true` | |
| `onRow` / `onHeaderRow` | `(record, index) => HTMLAttributes` | — | |
| `loading` | `boolean \| LoadingConfig` | `false` | `{ spinning, delay, indicator, mode: 'skeleton' \| 'overlay', skeletonRows }`; default mode is skeleton when `dataSource` is empty, overlay otherwise |
| `error` / `onRetry` | `unknown` / `() => void` | — | error row with Retry (★ not in antd) |
| `locale` | `TableLocale` | English | `emptyText`, `errorText`, `retryText`, sort tooltips, selection menu, pager labels |
| `pagination` | `false \| PaginationConfig` | client, page size 10 | see below |
| `rowSelection` | `RowSelectionConfig<T>` | off | see below |
| `expandable` | `ExpandableConfig<T>` | off | see below |
| `scroll` | `{ x?, y?, scrollToFirstRowOnChange? }` | — | `x: number \| string \| true`, `y: number \| string \| 'auto'` (★ `'auto'` fills the parent) |
| `sticky` | `boolean \| { offsetHeader, offsetScroll }` | off | sticky header without `scroll.y` |
| `virtual` | `boolean` | `false` | needs `scroll.y` (+ `rowHeight` recommended); warns otherwise |
| `columnReorder` | `boolean \| { order?, defaultOrder?, onReorder? }` | off | ★ pointer + keyboard drag |
| `sortDirections` | `('ascend' \| 'descend')[]` | `['ascend', 'descend']` | table-wide cycle |
| `showSorterTooltip` | `boolean` | `true` | |
| `onChange` | `(pagination, filters, sorter, { currentDataSource, action }) => void` | — | fires on `'paginate' \| 'sort' \| 'filter'` |
| `onScroll` | `(event) => void` | — | body scroller |
| `theme` | `Partial<TableTheme>` | antd tokens | `headerBg`, `rowBg`, `hoverRowBg`, `selectedRowBg`, `sortedColumnBg`, `sortedHeaderBg`, `borderColor`, `stickyShadow`, `fixedColumnGap`, `radius`, `fontSize` |
| `className` / `style` / `id` / `aria-label` / `aria-labelledby` | | — | |

## Columns

```ts
type ColumnDef<T> = DataColumn<T> | LooseDataColumn<T> | DisplayColumn<T> | GroupColumn<T>;
```

- **DataColumn** — `dataIndex: DataIndexPath<T>` (typed dot path, depth ≤ 3);
  `render?: (value: PathValue<T, P>, record: T, index: number) => CellResult`.
- **LooseDataColumn** — `dataIndex: (string | number)[]` for dynamic paths; `render(value: unknown, …)`.
- **DisplayColumn** — `key` + `render(record, record, index)`; no `dataIndex`.
- **GroupColumn** — `title` + `children: ColumnDef<T>[]` (nested header rows).

Leaf props: `key`, `title` (node or `({ sortOrder }) => node`), `width`, `minWidth`, `align`,
`fixed: 'left' | 'right' | true`, `hidden`, `ellipsis: boolean | { showTitle }`,
`responsive: Breakpoint[]`, `className`, `sorter: fn | true | { compare?, multiple? }`,
`sortOrder` (controlled by presence), `defaultSortOrder`, `sortDirections`, `sortIcon`,
`showSorterTooltip`, `filters`, `onFilter`, `filteredValue` (controlled by presence),
`defaultFilteredValue`, `filterMultiple`, `colSpan` (header; `0` hides), `onCell` →
`{ colSpan, rowSpan, className, style }`, `onHeaderCell`, `draggable` (★ opt-out of reorder).

`CellResult` is `ReactNode | { children, props: { colSpan?, rowSpan? } }` (antd's legacy span form
is accepted too).

`defineColumns<T>()(cols)` keeps literal types for `satisfies`-style authoring.

## `pagination`

`current` / `defaultCurrent`, `pageSize` / `defaultPageSize` (10), `total`, `pageSizeOptions`
(`[10, 20, 50, 100]`), `showSizeChanger`, `showQuickJumper`, `showTotal(total, [from, to])`,
`position` (`['bottomRight']`; any of `topLeft | topCenter | topRight | bottomLeft | bottomCenter | bottomRight`),
`size`, `simple`, `hideOnSinglePage`, `disabled`, `onChange(page, pageSize)`,
`onShowSizeChange(current, size)`.

Server mode iff `dataSource.length < total`. `current` present ⇒ controlled page; `pageSize`
present ⇒ controlled size.

## `rowSelection`

`type` (`'checkbox'`), `selectedRowKeys` (controlled) / `defaultSelectedRowKeys`,
`onChange(keys, rows, { type: 'all' | 'none' | 'invert' | 'single' | 'multiple' })`,
`onSelect(record, selected, rows, nativeEvent)`, `onSelectAll(selected, rows, changeRows)`,
`getCheckboxProps(record) → { disabled, name }`, `selections` (`true` or a list of
`'SELECT_ALL' | 'SELECT_INVERT' | 'SELECT_NONE' | { key, text, onSelect(changeableKeys) }`),
`hideSelectAll`, `columnWidth`, `columnTitle`, `fixed`, `preserveSelectedRowKeys`,
`checkStrictly` (`true`; `false` links tree parents/children across pages), `renderCell`.

Header checkbox scope is the current page; `SELECT_ALL` is the whole filtered dataset.

## `expandable`

`expandedRowRender(record, index, indent, expanded, children?)` (row mode),
`childrenColumnName` (`'children'`, tree mode), `loadChildren(record, signal) → Promise<C>` (★ on-demand;
the table owns loading / error / retry / cache), `cacheChildren` (`true`), `renderLoading`,
`renderError(error, retry, record)`, `expandedRowHeight` (★ estimate under `virtual`),
`expandedRowKeys` (controlled) / `defaultExpandedRowKeys` / `defaultExpandAllRows`,
`onExpand(expanded, record)`, `onExpandedRowsChange(keys)`, `rowExpandable`, `expandRowByClick`,
`expandIcon({ expanded, expandable, record, onExpand })`, `expandedRowClassName`, `columnWidth`,
`columnTitle`, `fixed`, `indentSize` (16), `showExpandColumn`.

## `useTableRequest(fetcher, options)`

`fetcher(params: { page, pageSize, sorter: SorterResult[], filters }, signal) → Promise<{ data, total }>`.
Options: `defaultPage`, `defaultPageSize`, `keepPreviousData` (`true`: overlay instead of
skeleton on refetch), `enabled`, `deps`. Returns `{ dataSource, loading, error, onRetry,
pagination, onChange, params, refetch }` — spread it onto `DataTable`.

## `useTable(props, scrollerRef?)`

Headless instance: `config`, `layout` (leaves, header rows, sticky offsets), `state`, `model`
(pipeline output), `pageData`, `send`, and feature APIs `sorting`, `filtering`, `pagination`,
`selection`, `expansion`, `reorder` (each `null` when disabled).

## Differences from Ant Design Table

| antd | Here | Why |
| --- | --- | --- |
| `loading` is a spinner | `loading.mode: 'skeleton' \| 'overlay'`, `skeletonRows` | brief requires skeleton rows that match the layout |
| no error state | `error` + `onRetry`, `locale.errorText` / `retryText` | brief requires an error state |
| lazy children need consumer code | `expandable.loadChildren` with owned state machine | brief requires on-demand children with loading / error |
| `virtual` uses rc-virtual-list | hand-written windowing; `rowHeight`, `expandedRowHeight` | no library allowed |
| column reorder via user code | `columnReorder` with `onReorder` | the "order column" demo as one attribute |
| `scroll.y` number only | `scroll.y: 'auto'` | "auto height" demo |
| `size` presets only | `rowHeight` in px | user request |
| `components`, `getPopupContainer`, `rowSelection.onCell`, `expandable.expandedRowOffset`, `pagination.itemRender` | not implemented | not needed for the brief; would be additive |
| sort tooltip / icons via antd internals | `sortIcon`, `showSorterTooltip` (antd Tooltip) | parity |

## Feature-conflict matrix

| Pair | Verdict | Rule |
| --- | --- | --- |
| `virtual` × `rowSpan` | degrade | rowSpan forced to 1; colSpan kept |
| `virtual` × `expandedRowRender` | supported | measured heights; expand animation off |
| `virtual` × `pagination` / `summary` | supported | windows the page; summary in `<tfoot>` |
| tree × `expandedRowRender` | exclusive | `expandedRowRender` wins, dev warning |
| tree × `rowSpan` | caveat | spans over flattened rows; collapsing can break a group |
| `fixed` × `columnReorder` | supported | fixed leaves are not sortable; moves never cross the fixed boundary |
| `fixed` × `responsive` / `hidden` | supported | offsets recomputed from visible leaves |
| `checkStrictly: false` × pagination | supported | entities from the sorted set; header checkbox scope = page |
| `sticky` × `scroll.y` | supported | `scroll.y` wins (header sticks inside the scroller) |
| `scroll.y: 'auto'` × pagination / title / footer | supported | chrome height subtracted; no definite parent height → warning, natural height |
| group header / header `colSpan` × `columnReorder` | auto opt-out | grouped leaves are not draggable |
| multi-sort × server | supported | array sorter payload; no client sort for server columns |
| `loading` overlay × pointer events | by design | overlay blocks interaction until the fetch settles |
| `columnReorder` × `scroll.x` (keyboard) | caveat | dnd-kit keeps the dragged header in view: when the target column sits in the far half of the scroller the first arrow press scrolls, the next one moves |

## Development warnings (`warnOnce`)

`rowKey:missing`, `rowKey:duplicate`, `rowKey:fn`, `fixed:order`, `expandable:mode`,
`virtual:scroll`, `virtual:rowHeight`, `scroll:auto`. Each fires once per key per session and
never in production.
