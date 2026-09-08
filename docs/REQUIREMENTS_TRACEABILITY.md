# Requirements traceability — brief → code → test

Status: **verified** (automated test passes), **manual** (checked by hand in the browser),
**partial** (works with a documented limit), **deferred** (not built, listed in README).

| ID | Requirement (Part 2 brief) | Where | Evidence | Status |
| --- | --- | --- | --- | --- |
| R-01 | React/Next + TypeScript, table generic over row type | `src/lib/table/core/types.ts` (`DataTable<T>`, `ColumnDef<T>`) | `core/types.test-d.ts`, `docs/contracts/contract-examples.ts` | verified |
| R-02 | Driven by column definitions: key/accessor, header, cell render, sortable flag, width, pinned flag | `ColumnCommon<T>`: `key`, `dataIndex`, `title`, `render`, `sorter`, `width`, `fixed` | `ui/DataTable.test.tsx` | verified |
| R-03 | Mock JSON / mocked API with latency | `src/mocks/*`, `src/app/api/*` | `tests/e2e/timetable.spec.ts` (scenarios) | verified |
| R-04 | Client-side sorting asc / desc / none | `core/sorting.ts` (`cycleOrder`, `toggleSort`) | `core/sorting.test.ts`; e2e "sorts a column ascending → descending → none" | verified |
| R-05 | Server-side sorting (controlled, emits) | `sorter: true`, `emit` in `react/use-table-state.ts`, `useTableRequest` | e2e "server mode › emits sort and page changes", `inventory.spec.ts` multi-sort | verified |
| R-06 | Client-side pagination: page size + navigation | `core/pagination.ts`, `ui/TablePagination.tsx` | `core/pagination.test.ts`; e2e "paginates with page size + navigation" | verified |
| R-07 | Server-side pagination (controlled page/size, parent supplies page + total) | `PaginationConfig.total`, server detection `dataSource.length < total` | e2e server mode; `core/pagination.test.ts` server identity | verified |
| R-08 | Inline child rows | `expandable.expandedRowRender` | e2e "expands a class inline" | verified |
| R-09 | On-demand child rows with loading + error | `expandable.loadChildren`, `react/use-lazy-children.ts`, `ui/ExpandedRow.tsx` | `DataTable.test.tsx` skeleton → error → retry; e2e "on-demand children" | verified |
| R-10 | Expanded content below parent, full width, smooth transition | `ExpandedRow` (`<td colSpan>`), `.dt__expanded` grid-rows animation | e2e region visible; manual at 3 viewports | verified |
| R-11 | ≥1 column pinned left, fixed during horizontal scroll | `column.fixed`, `core/columns.ts` offsets, `data-table.css` sticky | e2e "pinned Class column shows a shadow cue"; `responsive.spec.ts` | verified |
| R-12 | Visual cue when content scrolls beneath the pinned column | `react/use-sticky-scroll.ts` → `data-ping-*` | e2e `data-ping-left` assertion | verified |
| R-13 | Skeleton rows matching column layout | `ui/TableStates.tsx#TableSkeleton` | e2e "shows skeleton rows while loading" | verified |
| R-14 | Loading, empty, error states | `loading`, `locale.emptyText`, `error` + `onRetry` | e2e "empty and error states, with a working retry" | verified |
| R-15 | Controlled and uncontrolled sort / pagination | `ControlledFlags`, `mergeControlled`, `commit` | `core/state.test.ts`, `react/use-table.test.tsx` "controlled slice never written" | verified |
| R-16 | Renders timetable + a differently-shaped dataset | `/timetable`, `/inventory` (nested `unitPrice.amount`, tree rows) | `inventory.spec.ts` | verified |
| R-17 | Accessibility: semantic markup, keyboard focus, ARIA | `ui/*` (`aria-sort`, buttons, `role="region"`, `role="alert"`) | `tests/e2e/a11y.spec.ts` (axe + keyboard walk) | verified |
| R-18 | Empty dataset and empty child lists | `TableEmpty`; nested table `emptyText`; `rowExpandable` | e2e empty scenario; `expansion.test.ts` empty children | verified |
| R-19 | Failed initial fetch and failed child fetch | `fail-once` scenario, retry paths | e2e (both) | verified |
| R-20 | Slow fetches show skeletons | `slow` scenario (1.8 s) | e2e "shows skeleton rows while loading" | verified |
| R-21 | Pinned column on narrow / mobile viewports | `scroll.x` + sticky | `responsive.spec.ts` (Pixel 7) | verified |
| R-22 | Large datasets stay smooth (no laggy sort / scroll) | memoised pipeline, `React.memo`, `virtual` | `tests/perf/table.perf.spec.ts` budgets; e2e 10,000-row sort | verified |
| R-23 | Invalid sort key or out-of-range page | `reconcileSort` drops unknown keys + `warnOnce`; `clampPage` | `core/sorting.test.ts`, `core/pagination.test.ts` | verified |
| R-24 | UI/UX: SaaS layout, hover states, transitions, responsive | `src/app/globals.css`, `data-table.css`, `docs/DESIGN.md` | manual (light/dark, 375/768/1280) | manual |
| R-25 | README with the seven named sections | `README.md` | `scripts/validate-docs.mjs` checks the headings | verified |
| R-26 | Public repository + deployed URL | GitHub `aungmyatmoe11/rezerv-data-table`, Vercel | README links | pending until submission |

## Beyond the brief (user-requested antd parity)

Every control listed below is rendered by this repo's own primitives (`src/lib/ui`); no component
library is installed.

| Feature | Where | Evidence |
| --- | --- | --- |
| Row selection incl. operations menu, disabled rows, bulk action bar | `rowSelection`, `ui/SelectionCell.tsx` | e2e "row selection drives a bulk action bar"; unit selection scopes |
| Multi-sort with priority badges, sorted colours | `sorter.multiple`, `theme.sortedColumnBg` | `inventory.spec.ts`; `sorting.test.ts` merge rule |
| Custom loading (skeleton / overlay / indicator / delay), size in px, border / title / footer / summary | `loading`, `rowHeight`, `bordered`, `title`, `footer`, `summary` | `playground.spec.ts` JSX ↔ DOM |
| Fixed header, auto height, fixed right / gapped columns, hidden columns, ellipsis, responsive | `scroll.y`, `scroll.y: 'auto'`, `fixed: 'right'`, `theme.fixedColumnGap`, `hidden`, `ellipsis`, `responsive` | `playground.spec.ts` auto height; manual for the rest |
| Nested table, tree data, colSpan / rowSpan | `expandedRowRender`, `childrenColumnName`, `onCell` | `inventory.spec.ts` tree; `spans-filtering-selection.test.ts` |
| ~~Column drag reorder~~ | removed with its interaction library on 2026-09-08 (not in the brief) | — |
| Virtual windowing for big data | `virtual`, `react/use-virtual-rows.ts` | `playground.spec.ts` virtual; `tests/perf` |
| Pagination positions ×6, size changer, jumper, total, simple | `pagination.*` | `playground.spec.ts` JSX ↔ DOM |
| `onChange` + per-feature callbacks for API calls | `emit` | `react/use-table.test.tsx`; playground event log |
| Dynamic-settings playground for reviewers | `src/features/playground` | `playground.spec.ts` |
| Route + root error boundaries (render-time failures, not just data failures) | `src/app/error.tsx`, `src/app/global-error.tsx` | `src/app/error.test.tsx`; verified in a production build against a throwing route |
