# Rezerv DataTable

**Rezerv Frontend Engineering Assessment — Part 2: Component Engineering Challenge (Reusable Data Table)**

A from-scratch, fully typed, config-driven `DataTable<T>` for React 19 / Next.js 16, with an
Ant-Design-shaped API: the defaults render a plain semantic table; every feature — pagination,
selection, expansion, fixed columns, virtual windowing, multi-sort, filters, tree data — is
inert until its config attribute is supplied.

- **Live:** <https://rezerv-data-table.vercel.app>
- **Playground:** [/playground](https://rezerv-data-table.vercel.app/playground) — flip attributes, read the generated JSX, watch the callbacks
- **Real usage:** [/timetable](https://rezerv-data-table.vercel.app/timetable) (class timetable) · **Second dataset:** [/inventory](https://rezerv-data-table.vercel.app/inventory) (server-side multi-sort, tree rows)

> **Constraint honoured — and then some.** No table or grid library: not TanStack Table, AG Grid,
> MUI DataGrid, Ant Design Table, react-data-grid, and no virtualisation library. The brief allows
> UI-kit primitives, but this repo ships **no component library either**: every button, checkbox,
> radio, switch, segmented control, select, menu, tooltip, drawer, tag, spinner, progress bar and
> icon is written here, in `src/lib/ui`. The runtime dependencies are `react`, `react-dom`, `next`
> and `dayjs` — nothing else — and an ESLint rule fails the build if a component or table library
> is imported.

---

## Setup instructions

Requires Node 22 (`.node-version`) and npm.

```bash
npm install
```

```bash
npm run dev
```

Open <http://localhost:3000>. Routes: `/`, `/timetable`, `/inventory`, `/playground`.

```bash
npm run check
```

`check` = typecheck → lint → unit tests (Vitest, 104 tests) → end-to-end tests (Playwright against a
fresh production build, 35 tests incl. axe). Individual steps: `npm run typecheck`, `npm run lint`,
`npm run test`, `npm run test:e2e`, `npm run test:perf` (performance budgets), `npm run build`.

No backend is needed: the "API" is in-process mock data with realistic latency, exposed both
directly (client mode) and through Next.js route handlers under `/api/*` (server mode).

---

## Component API design and how column definitions work

```tsx
import { DataTable, type ColumnDef } from "@/lib/table";

const columns: ColumnDef<ClassSession>[] = [
  { dataIndex: "name", title: "Class", fixed: "left", width: 220, sorter: (a, b) => a.name.localeCompare(b.name) },
  { dataIndex: "instructor", title: "Instructor", width: 170 },
  { dataIndex: "startAt", title: "Time", formatter: (startAt, record) => formatTimeRange(startAt, record.endAt, "DD-MM-YYYY HH:mm") },
  { dataIndex: "capacity.booked", title: "Attendance", render: (booked, record) => `${booked} / ${record.capacity.total}` },
  { key: "actions", title: "", render: (record) => <Button>Edit</Button> },
];

<DataTable columns={columns} dataSource={classes} rowKey="id" />
```

**Generic over the row type.** `DataTable<T extends object>` and `ColumnDef<T>` are generic;
`dataIndex` is a *typed path* into `T` (`"capacity.booked"` compiles, `"nope"` does not) and the
`render(value, record, index)` callback receives `value` typed from that path
(`PathValue<T, "capacity.booked">`). Columns without data (`key` + `render`) receive the record.
This is checked by a type-level test (`core/types.test-d.ts`) and a compile-time contract file
(`docs/contracts/contract-examples.ts`, `npm run typecheck:contracts`).

**Ant Design vocabulary, our implementation.** The prop names are the ones a React developer
already knows — `columns`, `dataSource`, `rowKey`, `pagination`, `rowSelection`, `expandable`,
`scroll`, `bordered`, `size`, `loading`, `locale`, `onChange(pagination, filters, sorter, extra)` —
but the implementation is ours. `resolveConfig` turns props into a resolved config where each
feature is `{ enabled: false }` unless supplied; a disabled feature allocates no state, attaches no
listener and renders no extra column. A bare `<DataTable columns dataSource />` is a `<table>`
plus rows and one pipeline run.

**Column definition surface** (leaf columns): `key`, `dataIndex`, `title`, `render`, `width`,
`minWidth`, `align`, `fixed: 'left' | 'right'`, `hidden`, `ellipsis`, `responsive`, `sorter`
(`fn` | `true` | `{ compare, multiple }`), `sortOrder` / `defaultSortOrder`, `sortDirections`,
`sortIcon`, `filters` / `onFilter` / `filteredValue`, `colSpan`, `onCell` (colSpan / rowSpan),
`onHeaderCell`, `formatter`. Group columns take `title` + `children`. The full list, the
defaults and the differences from antd are in [docs/API.md](docs/API.md).

**Three layers, ESLint-enforced.**

| Layer | Path | May import |
| --- | --- | --- |
| `core` — pure TypeScript: types, sorting, filtering, pagination, expansion flattening, selection, column layout, spans, reducer, pipeline | `src/lib/table/core` | nothing from React/Next/antd/app |
| `react` — hooks: state container + emit, lazy children, sticky cue, virtual windowing, auto height, request adapter | `src/lib/table/react` | `core`, React |
| `ui` — markup + CSS | `src/lib/table/ui` | `core`, `react`, `@/lib/ui` |
| `@/lib/ui` — the primitive layer: Button, Checkbox, Radio, Switch, Segmented, Select, Menu, Popover, Tooltip, NumberInput, ColorInput, Tag, Alert, Empty, Spinner, Progress, Card, Collapse, Drawer, Toast, icons | `src/lib/ui` | React only |

`useTable(props)` is exported as a headless layer: the same engine could drive a different renderer.

---

## Client-side vs server-side strategy (sort & pagination)

The same component runs both modes; the difference is who owns the data.

| | Client-side (required) | Server-side (bonus) |
| --- | --- | --- |
| Sorting | `sorter: (a, b) => number` — the table sorts the full array (stable, per tree level) | `sorter: true` or `{ multiple: n }` with no comparator — the table only **emits** the new sorter and renders `dataSource` as given |
| Pagination | `pagination` (default page size 10) slices the sorted array | `pagination={{ current, pageSize, total }}` with `total > dataSource.length` — the table renders `dataSource` as one page and emits page changes |
| Who fetches | Consumer, once | Consumer, on every `onChange` |

The **controlled / uncontrolled** split is per slice and antd-compatible: a slice is controlled
when its prop key is present (`column.sortOrder`, `column.filteredValue`, `pagination.current`,
`pagination.pageSize`, `rowSelection.selectedRowKeys`, `expandable.expandedRowKeys`).
Controlled slices are read from props and never written internally; the
reducer still computes the next state and `emit` reports it, so a parent can accept or ignore it.

`onChange(pagination, filters, sorter, { currentDataSource, action })` fires on paginate, sort
and filter — `action` says which, `sorter` is an object for single sort and an ordered array for
multi-sort, and `currentDataSource` is the full filtered + sorted dataset (not just the page) so a
consumer can export or count it without recomputing.

For server mode the repo ships a small adapter that lives **outside** the table:

```tsx
const table = useTableRequest<ClassSession>(fetchClasses, { defaultPageSize: 10 });
<DataTable columns={columns} {...table} />
// table = { dataSource, loading, error, onRetry, pagination: { current, pageSize, total }, onChange }
```

It owns the request lifecycle — params → fetch → `AbortController` → retry — and hands the table
exactly the props it needs. `/timetable` has a **Client-side / Server-side** switch and `/inventory`
is server-only with three-column multi-sort so the difference is visible in the network tab.

---

## Expandable-rows design for both inline and on-demand child rows

One `expandable` config covers both modes; the table owns the row-level state machine.

- **Inline** — `expandedRowRender(record)` renders whatever the consumer returns (the timetable
  renders a nested `<DataTable size="small" pagination={false}>` of attendees).
- **On-demand** — add `loadChildren(record, signal)`; the table keeps a per-row
  `idle → loading → error → ready` machine with an `AbortController` (collapse aborts), a
  generation guard (late responses are dropped), a cache (`cacheChildren`, default on) and a
  `retry()`. `expandedRowRender` receives the loaded children as its fifth argument.
- **Tree data** — `childrenColumnName` renders children with the same columns, indented; with
  `loadChildren` those children are fetched lazily and `rowSelection.checkStrictly: false` links
  parent/child selection.

The expanded region is a `<tr><td colSpan={all}>` below the parent, so it spans the table width
and stays inside the horizontal scroller; the content is `role="region"` labelled by the parent
row, with `aria-busy` while loading, a skeleton by default while loading, and an
`role="alert"` + **Retry** button on error (`renderLoading` / `renderError` override both).
Expand / collapse animates `grid-template-rows: 0fr → 1fr` (160 ms), disabled under
`prefers-reduced-motion` and under `virtual`. Empty children render the consumer's `emptyText`;
rows whose `rowExpandable` returns `false` get a spacer instead of a toggle.

`/timetable` → *Children: On-demand* + *Scenario: Fail once, then succeed* shows the full
loading → error → Retry → ready path.

**Two layers of failure handling.** Everything above is a *data* failure: the fetch rejected, the
table knows it, and `error` + `onRetry` render it in place. A *render* failure is a different
class — an exception thrown while React is rendering (a consumer's own `render` callback is the
usual culprit) cannot become table state, because the component that would display it is the one
that threw. Those are caught by [`src/app/error.tsx`](src/app/error.tsx): the header and nav stay
usable, the message and Next's `digest` are shown, and `reset()` re-renders just that segment, so
a transient failure costs a click instead of a reload. A crash in the root layout itself falls
through to [`src/app/global-error.tsx`](src/app/global-error.tsx), which renders its own document.

---

## Sticky-column approach

`column.fixed: 'left' | 'right'` uses `position: sticky` on the cells — no cloned tables, no
scroll synchronisation.

- Leaves are stable-partitioned into `[left…, middle…, right…]`; each fixed cell gets an offset
  (`--dt-left` / `--dt-right`) computed from the widths of the fixed columns before it, so any
  number of columns can be pinned on either side. Selection and expand columns join the left group
  automatically when the first data column is fixed.
- `border-collapse: collapse` breaks sticky positioning in Chromium and WebKit, so the table uses
  `separate` with per-cell borders (`bordered` is implemented that way too).
- **Shadow cue.** The scroller's `scroll` listener (passive, rAF-coalesced, in `useStickyScroll`)
  writes `data-ping-left` / `data-ping-right` attributes on the scroller only when the value
  changes; CSS paints an inset shadow strip on the last-left / first-right fixed cell via a
  pseudo-element (a `box-shadow` on a sticky cell would paint under its neighbour). No React
  state is involved, so scrolling never re-renders anything.
- `theme.fixedColumnGap` reproduces antd's "gapped fixed columns" demo.
- On narrow viewports (`tests/e2e/responsive.spec.ts`, tablet 712 + Pixel 7) the pinned column keeps its width
  and the rest scrolls beneath it.

---

## State management decision and why

**Local, single reducer, no store library.**

- All interaction state lives in one `TableState` (`sort`, `filters`, `page`, `selectedKeys`,
  `expandedKeys`) behind one `useReducer`. Cross-slice rules — sort or filter or
  page-size change resets to page 1 — are in one pure `reduce()` and are unit-tested.
- `send(action)` runs **synchronously in the event handler**: `reduce → commit (uncontrolled
  slices only) → emit (callbacks)`. There is no effect that watches state to fire callbacks, so
  there is no double-render, no stale closure and no "callback fired on mount" class of bug.
- Derived data (keyed rows → filtered → sorted → paged → flattened → spans) is a memoised
  pipeline (`core/row-model.ts`) with one `memoLast` per stage: a page change does not re-run the
  comparator, and the `currentDataSource` handed to `onChange` is the same array the next render
  uses.
- Server state (the fetch) is deliberately **outside** the component in `useTableRequest`, so
  the table stays a leaf and a consumer can replace the adapter with React Query, SWR or a store
  without touching the table.

Why not Zustand / Redux: the state is scoped to one table instance and must support multiple
instances (nested attendee tables) — a global store adds identity management for no benefit. Why
not React Query inside the table: the table would then own network policy (retries, caching,
dedupe) that belongs to the app. Why not `useState` per slice: the cross-slice invariants would
be spread over effects.

---

## Tradeoffs considered and assumptions made

- **From-scratch engine with antd's vocabulary.** Familiar prop names lower the learning cost
  and let the `/playground` generate copy-pasteable JSX; the cost is a large prop surface. Every
  prop is inert when absent and the resolved config makes the surface explicit.
- **No component library either.** The brief permits UI-kit primitives, but importing one would
  have made "from scratch" a matter of degree, pulled a styling engine (and its hydration
  quirks) into the app, and hidden the accessibility work behind someone else's markup. Writing
  the ~20 primitives in `src/lib/ui` left the runtime at four dependencies, one theming
  mechanism (CSS custom properties) and ARIA we can point at. The trade-off is real: these
  controls cover exactly this app's needs — no virtualised select, no form integration, no RTL
  sweep — and a product team would need more before reusing them widely.
- **Column drag-reorder was removed, not deferred.** It was built and then dropped along with its
  dependency: the feature is not in the brief, and it was the only thing in the repo pulling an
  interaction library.
- **Key-presence controlled semantics** (antd parity) rather than a separate `controlled` flag:
  simpler for consumers, but `sortOrder: undefined` must be spelled `sortOrder: null` to mean
  "controlled, none".
- **Sticky columns via `position: sticky`** rather than cloned fixed tables: far less code and no
  height/scroll sync, at the cost of needing numeric `width` on fixed columns (the table warns
  once in development when it is missing) and per-cell borders.
- **Hand-written virtual windowing** (`useSyncExternalStore` + spacer rows) instead of a
  library: it is opt-in (`virtual`), needs `scroll.y` and a `rowHeight`, and windows the *flattened*
  list so expanded rows and tree rows still work (variable heights are measured with one
  `ResizeObserver`). `rowSpan` is degraded to 1 under `virtual`.
- **`onChange` fires on paginate / sort / filter** exactly like antd; selection and expansion have
  their own callbacks (`rowSelection.onChange`, `expandable.onExpand`) — one event per concern.
- **Server pagination detection** follows antd: server mode iff `dataSource.length < total`.
- **Sort stability and null handling:** the default comparator sorts `null`/`undefined` last and
  treats `NaN` as 0; sorting is stable by index; unknown sort keys are dropped with a one-time
  development warning; out-of-range pages are clamped.
- **Times render on the studio's clock, not the viewer's.** Timetable cells are server-rendered as
  well as hydrated, so a timezone-dependent format produces different text on each side (React
  #418). `src/features/format.ts` pins the offset; `format.test.ts` renders the same string under
  five timezones.
- **Row keys never throw.** A missing or duplicate key warns once and falls back to the row
  index, so a bad fixture degrades instead of crashing the dashboard.
- **Tree rows and `expandedRowRender` are mutually exclusive** (`expandedRowRender` wins, with a
  warning) — matching antd and keeping the flatten stage simple.
- Assumed: staff dashboards run on modern evergreen browsers; `ResizeObserver` and
  `position: sticky` are available. Assumed the reviewer values the mocked API behaving like a
  real one (latency, aborts, 503s, malformed payloads) over a real backend.

---

## Ant Design demo parity

Each row is one attribute on our component; the link opens the playground with that attribute on.

| antd demo | Ours | Try it |
| --- | --- | --- |
| Row selection / selection & operation | `rowSelection` (`checkbox` \| `radio`, `selections` menu, `getCheckboxProps`, `onChange` / `onSelect` / `onSelectAll`) | [/playground?selection=checkbox&selectionsMenu=true&disableCancelled=true](/playground?selection=checkbox&selectionsMenu=true&disableCancelled=true) |
| Sorting, multiple sorting, sorted colours | `sorter`, `sorter.multiple`, priority badges, `theme.sortedColumnBg` | [/playground?multiSort=true&sortedHighlight=true](/playground?multiSort=true&sortedHighlight=true) |
| Custom loading | `loading={{ mode: 'skeleton' \| 'overlay', indicator, delay }}` | [/playground?loading=custom](/playground?loading=custom) |
| Size (incl. px) | `size` and `rowHeight={px}` | [/playground?rowHeight=64](/playground?rowHeight=64) |
| Border, title, footer | `bordered`, `title`, `footer`, `summary` | [/playground?bordered=true&title=true&footer=true&summary=true](/playground?bordered=true&title=true&footer=true&summary=true) |
| Expand, nested table | `expandable.expandedRowRender` (+ `loadChildren`) | [/playground?expansion=on-demand](/playground?expansion=on-demand) |
| Tree data | `expandable.childrenColumnName`, `checkStrictly` | [/playground?expansion=tree&selection=checkbox](/playground?expansion=tree&selection=checkbox) |
| colSpan / rowSpan | `column.onCell` → `{ colSpan, rowSpan }`, header `colSpan` | [/playground?spans=true](/playground?spans=true) |
| Fixed header, fixed columns + header, gapped fixed columns | `scroll.y`, `sticky`, `column.fixed` with `width`, `theme.fixedColumnGap` | [/playground?scrollY=fixed&fixedRight=true&fixedGap=true](/playground?scrollY=fixed&fixedRight=true&fixedGap=true) |
| Auto height | `scroll.y: 'auto'` (ResizeObserver) | [/playground?rows=200&scrollY=auto](/playground?rows=200&scrollY=auto) |
| Hidden columns, ellipsis, responsive | `column.hidden`, `column.ellipsis`, `column.responsive` | [/playground?hideColumn=instructor&ellipsis=true&responsive=true](/playground?hideColumn=instructor&ellipsis=true&responsive=true) |
| Pagination (positions, size changer, jumper, total, simple) | `pagination.position` × 6, `showSizeChanger`, `showQuickJumper`, `showTotal`, `simple` | [/playground?paginationPosition=topAndBottom&showSizeChanger=true&showQuickJumper=true&showTotal=true](/playground?paginationPosition=topAndBottom&showSizeChanger=true&showQuickJumper=true&showTotal=true) |
| Big data / virtual | `virtual` (hand-written windowing) | [/playground?rowHeight=44&rows=10000&pagination=false&scrollY=fixed&virtual=true](/playground?rowHeight=44&rows=10000&pagination=false&scrollY=fixed&virtual=true) |
| Value formatting (dates, money, units) | `column.formatter` — a preset name **or any dayjs pattern**, live in `/timetable` → *Time format* and `/playground` → *formatter*; the rule is in [docs/API.md](docs/API.md#formatting-rule) | [/playground?timeFormat=DD-MM-YYYY](/playground?timeFormat=DD-MM-YYYY) |
| Dynamic settings | the playground itself: controls → live table → generated JSX + event log | [/playground](/playground) |
| No data | `locale.emptyText` (defaults to antd `Empty`), plus `error` + `onRetry` | [/playground?empty=true](/playground?empty=true) |

Feature combinations that need care are listed in the conflict matrix in [docs/API.md](docs/API.md#feature-conflict-matrix).

---

## Performance

Measured by `npm run test:perf` (headless Chromium, production build, `/playground` with 10,000
generated rows; p95 of 5 samples, budgets asserted in `tests/perf/table.perf.spec.ts`).

| Scenario | Result (p95 of 5 runs, 2026-09-08, Apple Silicon) | Budget |
| --- | --- | --- |
| Sort click, 10,000 rows, paginated (aria-sort flipped + rows painted) | **50 ms** | < 200 ms |
| Sort click, 10,000 rows, `virtual`, no pagination | **49 ms** | < 200 ms |
| Page change after sorting 10,000 rows (comparator not re-run) | **27 ms** | < 100 ms |
| Virtual scroll, 60 steps × 6 rows: frame p95 / mean / mounted `<tr>` | **18.5 ms / 16.7 ms / 20 rows** | < 32 ms p95 / < 40 rows |

Removing the component library roughly halved the sort numbers (129 ms → 50 ms) and took the
worst scroll frame from 59 ms to 18.5 ms: the cells no longer mount third-party components with
runtime-computed styles.

How it stays fast: one memoised pipeline stage per concern, `React.memo` rows and cells, sticky
cue without React state, virtual windowing that re-renders only `<tbody>` and only when the
visible index range changes, and features that execute no code until configured.

---

## Accessibility

Semantic `<table>` / `<thead>` / `<th scope="col">`; sort is a `<button>` inside the header with
`aria-sort` on the `<th>`; expand toggles are `<button aria-expanded aria-controls>`; expanded
content is `role="region"` with `aria-busy`; errors are `role="alert"`; pagination buttons carry
`aria-current="page"`; `aria-rowcount` / `aria-rowindex` under `virtual`; a polite live region
announces loading / error. `tests/e2e/a11y.spec.ts` runs axe (WCAG 2 A/AA) on `/` and `/timetable`
and asserts zero serious/critical violations, plus a keyboard-only walk through sort, expand and
paging. Light and dark themes, `prefers-reduced-motion` respected.

---

## Testing

- **Unit (Vitest):** pure core — sort cycle and antd multi-sort merge rule, stable sort, page
  clamping, server-page detection, tree flattening, spans, selection scopes, reducer invariants,
  memo identity — plus hook and component tests in jsdom (controlled slices never written, bare
  table renders no extra DOM, on-demand skeleton → error → retry).
- **E2E (Playwright, production build):** timetable client + server modes, inventory multi-sort
  / tree / pinned-right / drawer, playground JSX ↔ DOM parity, virtual window, auto height,
  formatter patterns, pinned column at tablet **and** mobile widths, axe.
- **Perf:** budgets above.
- CI (`.github/workflows/ci.yml`): docs gate → contracts typecheck → `npm run check`.

**What the suite deliberately does not cover**, so a reviewer does not have to guess whether it
was missed or decided:

| Not covered | Why, and what stands in for it |
| --- | --- |
| Cross-browser e2e (Firefox / WebKit) | Chromium only. Nothing here is engine-specific — `position: sticky`, `ResizeObserver` and `IntersectionObserver`-free scroll maths are baseline — and a second engine doubles CI time for the same assertions. A real product would add WebKit for the sticky and scroll suites. |
| Coverage thresholds | Coverage is measured by what the tests assert, not by a percentage gate; the pure core is tested behaviourally (sort merge rules, page clamping, flattening, spans, selection scopes) rather than line-chased. A long-lived repo should add a floor to stop it eroding. |
| Bundle-size budget | The perf gate gauges interaction (sort, page change, frame p95), not payload. With four runtime dependencies the payload is small by construction, but a `size-limit` check in CI is the honest way to keep it that way. |
| Visual regression snapshots | Layout, light / dark and the three breakpoints are verified by hand (see the design doc). Snapshots pay off once a team is changing this CSS; for one author over one week they mostly encode churn. |

---

## Deliberately deferred

- `scrollTo({ index })` imperative handle under `virtual`.
- Column resizing. (Column drag-reorder is not deferred — it was removed; see the trade-off above.)
- Row grouping / aggregation, inline editing, CSV export — out of scope for the brief.
- The four verification gaps in the table above (cross-browser e2e, coverage floor, bundle budget,
  visual snapshots) — each is a cost worth paying on a product, not on a one-week assessment.
- Telemetry. `app/error.tsx` shows the failure and Next's `digest`; a production app would send
  both to Sentry from that boundary, which is one `useEffect` and a DSN.

---

## Documentation map

| File | Question it answers |
| --- | --- |
| [docs/PRODUCT.md](docs/PRODUCT.md) | Who is this for, what must it feel like |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers, pipeline, state model, sticky / virtual mechanics |
| [docs/DESIGN.md](docs/DESIGN.md) | Tokens, density, motion, states |
| [docs/API.md](docs/API.md) | Every prop, defaults, antd differences, conflict matrix |
| [docs/REQUIREMENTS_TRACEABILITY.md](docs/REQUIREMENTS_TRACEABILITY.md) | Brief requirement → code → test |
| [docs/adr](docs/adr/README.md) | Why the six load-bearing decisions were made |
| [CLAUDE.md](CLAUDE.md) · [AGENTS.md](AGENTS.md) · [.claude/agents](.claude/agents) | Rules and roles for AI-assisted work on this repo |
