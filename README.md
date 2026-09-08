# Rezerv DataTable

**Rezerv Frontend Engineering Assessment — Part 2: Component Engineering Challenge (Reusable Data Table)**

A from-scratch, fully typed, config-driven `DataTable<T>` for React 19 / Next.js 16. The defaults
render a plain semantic table; every feature — pagination, selection, expansion, fixed columns,
virtual windowing, multi-sort, filters, tree data — stays inert until its config attribute is
supplied.

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

## How to read this repo

The library is deliberately larger than one sitting. Two paths in, depending on how much time you
have.

For the full guided tour — the mental model, the reading order, a click traced end to end, and
the recipe for adding a feature — read **[docs/ORIENTATION.md](docs/ORIENTATION.md)**. The short
version follows.

**Ten minutes — see it work, then see why.**

1. Run `npm run dev` and open [/playground](http://localhost:3000/playground). Toggle attributes on
   the left; the table reacts, the generated JSX updates, the event log shows exactly which
   callbacks fired with what arguments. This is the fastest map of the API surface.
2. Read [Architecture](#architecture) below — four layers, one pipeline, one reducer. That is the
   whole mental model.
3. Open [`src/lib/table/core/row-model.ts`](src/lib/table/core/row-model.ts). Every feature is one
   stage in this pipeline; if you understand this file you can predict the rest.

**An hour — follow one feature end to end.** Sorting is the shortest complete path:

| Step | File |
| --- | --- |
| The prop and its types | [`core/types.ts`](src/lib/table/core/types.ts) (`ColumnDef.sorter`) |
| Config resolution — inert when absent | [`core/resolve-config.ts`](src/lib/table/core/resolve-config.ts) |
| Pure logic — cycle, merge rule, comparator | [`core/sorting.ts`](src/lib/table/core/sorting.ts) |
| State transition, and what resets | [`core/state.ts`](src/lib/table/core/state.ts) (`reduce`) |
| Where it runs in the pipeline | [`core/row-model.ts`](src/lib/table/core/row-model.ts) (stage S3) |
| Handler-time dispatch and callback | [`react/use-table-state.ts`](src/lib/table/react/use-table-state.ts) (`send` → `emit`) |
| Markup and ARIA | [`ui/HeaderCell.tsx`](src/lib/table/ui/HeaderCell.tsx) |
| Proof | [`core/sorting.test.ts`](src/lib/table/core/sorting.test.ts) |

Every other feature — filtering, pagination, expansion, selection, spans — occupies the same seven
slots. That repetition is the point: one shape to learn, then it repeats.

**Where things live.**

```
src/lib/table/        the library      core/ (pure TS) · react/ (hooks) · ui/ (markup)
                                       index.ts = client entry, server.ts = server-safe entry
src/lib/ui/           the primitives   buttons, inputs, menus, overlays, icons, tokens
src/features/         consumers        timetable · inventory · playground · shared
src/mocks/            fixtures, latency, failure scenarios
src/app/              routes + /api route handlers
tests/                e2e (Playwright) · perf (budgets)
docs/                 the long-form documentation — see the map at the end
```

---

## Where the evaluation criteria are answered

| Criterion | Where to look | Proof |
| --- | --- | --- |
| Reusable, well-typed component API | [Component API design](#component-api-design-and-how-column-definitions-work) · [docs/API.md](docs/API.md) | `core/types.test-d.ts`, `npm run typecheck:contracts`, two unrelated datasets consuming the same component |
| Correctness — sorting, pagination, expansion (both modes), sticky column | [Client vs server](#client-side-vs-server-side-strategy-sort--pagination) · [Expandable rows](#expandable-rows-design-for-both-inline-and-on-demand-child-rows) · [Sticky columns](#sticky-column-approach) | 104 unit tests, 35 e2e tests on a production build |
| Loading / skeleton / empty / error experience | [States](#loading-skeleton-empty-and-error-experience) | `/playground?empty=true`, timetable *Scenario* switch, `tests/e2e/timetable.spec.ts` |
| Performance with larger datasets | [Performance](#performance) | `npm run test:perf` — asserted budgets at 10,000 rows |
| State management choice | [State management](#state-management-decision-and-why) · [ADR 0003](docs/adr/0003-single-reducer-handler-time-emit.md) | `core/state.test.ts`, `react/use-table.test.tsx` |
| Code quality & maintainability | [Maintainability](#code-quality-and-maintainability) | ESLint layer firewall, `strict` TS, CI gate, ADRs |
| Product thinking | [docs/PRODUCT.md](docs/PRODUCT.md) · [Tradeoffs](#tradeoffs-considered-and-assumptions-made) | Named users, testable principles, an explicit out-of-scope list |

---

## Architecture

**Four layers, one direction, enforced by lint rather than convention.**

| Layer | Path | May import |
| --- | --- | --- |
| `core` — pure TypeScript: types, sorting, filtering, pagination, expansion flattening, selection, column layout, spans, reducer, pipeline | `src/lib/table/core` | nothing from React, Next, the app, or any UI |
| `react` — hooks: state container + emit, lazy children, sticky cue, virtual windowing, auto height, request adapter | `src/lib/table/react` | `core`, React |
| `ui` — markup + CSS | `src/lib/table/ui` | `core`, `react`, `@/lib/ui` |
| `@/lib/ui` — the primitive layer: Button, Checkbox, Radio, Switch, Segmented, Select, Menu, Popover, Tooltip, NumberInput, ColorInput, Tag, Alert, Empty, Spinner, Progress, Card, Collapse, Drawer, Toast, icons | `src/lib/ui` | React only |

An `eslint.config.mjs` rule fails the build on any import that crosses a layer the wrong way, so
the boundary cannot erode quietly. `src/lib/table` may never import from `src/features` or
`src/app`: the library does not know its consumers exist.

**Why this split earns its keep.** The engine is testable without a DOM (the `core` suite runs in
milliseconds and asserts behaviour, not markup); `useTable(props)` is exported as a headless layer,
so the same engine could drive a different renderer; and a bug is locatable by symptom — wrong
rows is `core`, wrong timing is `react`, wrong pixels is `ui`.

**Progressive disclosure.** `resolveConfig(props)` maps every feature to `{ enabled: false }` or
`{ enabled: true, …defaults }`. Each hook early-returns when disabled — no state, no effect, no
listener — and the renderer emits no selection or expand column, pager or overlay. This is the
ergonomic story ("add an attribute, get a feature") and the performance story ("no attribute, no
cost") at the same time.

**One pipeline.** Derived data flows through memoised stages in `core/row-model.ts`: keyed →
filtered → sorted → paged → flattened → spans. Each stage has its own `memoLast`, so a page change
does not re-run the comparator. Adding a feature means adding a stage or a branch inside one — not
threading a new concern through the component tree.

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) has the diagram, the full stage table and the
mechanics of sticky, virtual and auto height.

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
(`docs/contracts/contract-examples.ts`, `npm run typecheck:contracts`) — so the type story is a
gate in CI, not a claim in a README.

**Conventional names, our implementation.** The prop names are the ones a React developer working
on dashboards already expects — `columns`, `dataIndex`, `dataSource`, `rowKey`, `pagination`,
`rowSelection`, `expandable`, `scroll`, `bordered`, `size`, `loading`, `locale`,
`onChange(pagination, filters, sorter, extra)`. Choosing an established vocabulary over an invented
one was a deliberate API decision: it removes a learning cost for the feature developers who are
the component's actual users, and it makes the generated JSX in `/playground` copy-pasteable into a
real screen. The engine behind those names is written from scratch here; the reasoning is recorded
in [ADR 0001](docs/adr/0001-from-scratch-engine-with-a-familiar-api.md).

**Reusability is demonstrated, not asserted.** The same component, unmodified, drives three
screens with different row shapes, different data sources and different feature sets:

| Consumer | Row shape | What it exercises |
| --- | --- | --- |
| [`/timetable`](src/features/timetable) | `ClassSession` | client **and** server mode behind one switch, inline + on-demand children, pinned column |
| [`/inventory`](src/features/inventory) | `InventoryItem` | server multi-sort, tree rows, linked parent/child selection, pinned-right actions, drawer |
| [`/playground`](src/features/playground) | `ClassSession` | every attribute, driven from URL state |

No page patches the library to fit itself. When a screen needed something the table could not do,
the fix went into the table's config surface or was dropped — that rule is what kept the API from
becoming a pile of escape hatches.

**Column definition surface** (leaf columns): `key`, `dataIndex`, `title`, `render`, `width`,
`minWidth`, `align`, `fixed: 'left' | 'right'`, `hidden`, `ellipsis`, `responsive`, `sorter`
(`fn` | `true` | `{ compare, multiple }`), `sortOrder` / `defaultSortOrder`, `sortDirections`,
`sortIcon`, `filters` / `onFilter` / `filteredValue`, `colSpan`, `onCell` (colSpan / rowSpan),
`onHeaderCell`, `formatter`. Group columns take `title` + `children`. The full list and the
defaults are in [docs/API.md](docs/API.md).

---

## Client-side vs server-side strategy (sort & pagination)

The same component runs both modes; the difference is who owns the data.

| | Client-side (required) | Server-side (bonus) |
| --- | --- | --- |
| Sorting | `sorter: (a, b) => number` — the table sorts the full array (stable, per tree level) | `sorter: true` or `{ multiple: n }` with no comparator — the table only **emits** the new sorter and renders `dataSource` as given |
| Pagination | `pagination` (default page size 10) slices the sorted array | `pagination={{ current, pageSize, total }}` with `total > dataSource.length` — the table renders `dataSource` as one page and emits page changes |
| Who fetches | Consumer, once | Consumer, on every `onChange` |

The mode is inferred from the props rather than selected by a flag: a column with a comparator can
sort locally, a column without one cannot, and `total > dataSource.length` means the rows on screen
are a page of a larger set. One less thing for a consumer to configure — and one less way to
configure it wrongly.

The **controlled / uncontrolled** split is per slice: a slice is controlled when its prop key is
present (`column.sortOrder`, `column.filteredValue`, `pagination.current`, `pagination.pageSize`,
`rowSelection.selectedRowKeys`, `expandable.expandedRowKeys`). Controlled slices are read from
props and never written internally; the reducer still computes the next state and `emit` reports
it, so a parent can accept or ignore it.

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
exactly the props it needs. Keeping it outside is what lets a consumer swap in React Query, SWR or
a store without the table noticing ([ADR 0002](docs/adr/0002-leaf-table-and-request-hook.md)).
`/timetable` has a **Client-side / Server-side** switch and `/inventory` is server-only with
three-column multi-sort, so the difference is visible in the network tab.

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

The consumer supplies a fetcher and gets the whole lifecycle; the alternative — handing back
`onExpand` and letting every screen re-implement abort, race-guarding and retry — is the bug
factory this component exists to remove.

The expanded region is a `<tr><td colSpan={all}>` below the parent, so it spans the table width
and stays inside the horizontal scroller; the content is `role="region"` labelled by the parent
row, with `aria-busy` while loading, a skeleton by default while loading, and an
`role="alert"` + **Retry** button on error (`renderLoading` / `renderError` override both).
Expand / collapse animates `grid-template-rows: 0fr → 1fr` (160 ms), disabled under
`prefers-reduced-motion` and under `virtual`. Empty children render the consumer's `emptyText`;
rows whose `rowExpandable` returns `false` get a spacer instead of a toggle.

`/timetable` → *Children: On-demand* + *Scenario: Fail once, then succeed* shows the full
loading → error → Retry → ready path.

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
- `theme.fixedColumnGap` renders the pinned group with a visible gutter, for layouts that want the
  pinned columns to read as a separate panel.
- On narrow viewports (`tests/e2e/responsive.spec.ts`, tablet 712 + Pixel 7) the pinned column keeps
  its width and the rest scrolls beneath it.

The reasoning and the rejected alternative are in
[ADR 0004](docs/adr/0004-sticky-columns-via-position-sticky.md).

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

Why not Zustand or Redux: the state is scoped to one table instance and must support multiple
instances (nested attendee tables) — a global store adds identity management for no benefit. Why
not React Query inside the table: the table would then own network policy (retries, caching,
dedupe) that belongs to the app. Why not `useState` per slice: the cross-slice invariants would
be spread over effects, which is precisely the failure mode the single reducer removes.

Recorded as [ADR 0003](docs/adr/0003-single-reducer-handler-time-emit.md).

---

## Loading, skeleton, empty and error experience

Four states, each with a defined layout and a way out.

| State | Default | Configurable via |
| --- | --- | --- |
| **Loading, first page** | Skeleton rows matching the real column widths — the layout does not jump when data arrives | `loading={{ mode: 'skeleton' \| 'overlay', indicator, delay }}` |
| **Loading, subsequent pages** | Overlay over the previous page, so context is kept and the table does not collapse to nothing | same |
| **Empty** | A centred empty state with the consumer's message | `locale.emptyText` |
| **Error** | `role="alert"` with the message and a **Retry** button, in place of rows | `error`, `onRetry` |

A `delay` (default 200 ms) suppresses the loading state for fetches that resolve quickly, so a fast
response never produces a flash of skeleton.

The same four states exist a second time *inside* an expanded row, scoped to that row: a child
fetch that fails shows its error and Retry within the row, and the rest of the table stays usable.

**Two layers of failure handling.** Everything above is a *data* failure: the fetch rejected, the
table knows it, and `error` + `onRetry` render it in place. A *render* failure is a different
class — an exception thrown while React is rendering (a consumer's own `render` callback is the
usual culprit) cannot become table state, because the component that would display it is the one
that threw. Those are caught by [`src/app/error.tsx`](src/app/error.tsx): the header and nav stay
usable, the message and Next's `digest` are shown, and `reset()` re-renders just that segment, so
a transient failure costs a click instead of a reload. A crash in the root layout itself falls
through to [`src/app/global-error.tsx`](src/app/global-error.tsx), which renders its own document.

To see all of it: `/timetable` → **Scenario** → *Slow*, *Empty*, *Error*, *Fail once, then succeed*,
*Malformed*. The mock API produces real latency, real aborts, 503s and malformed payloads, so these
paths are exercised the way they would be in production rather than by a boolean prop.

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

## Code quality and maintainability

The constraints that hold the codebase in shape, all machine-enforced:

| Guard | What it prevents |
| --- | --- |
| ESLint layer firewall | `core` importing React or the DOM; `ui` importing app modules; the library importing its consumers |
| ESLint dependency rule | A table, grid, virtualisation or component library re-entering through any import |
| TypeScript `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` | Silent `undefined` at index and optional-prop boundaries |
| No `any` (lint error) | External data bypassing validation — it stays `unknown` until narrowed |
| React Compiler lint | `.current` reads during render, `setState` in effects, invalid memoisation |
| `npm run validate:docs` | Dangling documentation links, missing sections, an untraced requirement |
| CI (`.github/workflows/ci.yml`) | All of the above, plus the full test suite, on every push and PR |

Conventions a maintainer can rely on: a feature's logic is pure and lives in `core` with a test
beside it; hooks never contain business rules; callbacks fire only from `emit`; a new prop must
resolve to `{ enabled: false }` and run no code when absent. Six
[ADRs](docs/adr/README.md) record the load-bearing decisions with the alternatives that were
rejected, so the next person can tell a considered choice from an accident.

---

## Testing

- **Unit (Vitest):** pure core — sort cycle and the multi-sort merge rule, stable sort, page
  clamping, server-page detection, tree flattening, spans, selection scopes, reducer invariants,
  memo identity — plus hook and component tests in jsdom (controlled slices never written, bare
  table renders no extra DOM, on-demand skeleton → error → retry).
- **E2E (Playwright, production build):** timetable client + server modes, inventory multi-sort
  / tree / pinned-right / drawer, playground JSX ↔ DOM parity, virtual window, auto height,
  formatter patterns, pinned column at tablet **and** mobile widths, axe.
- **Perf:** budgets above.
- CI: docs gate → contracts typecheck → `npm run check`.

**What the suite deliberately does not cover**, so a reviewer does not have to guess whether it
was missed or decided:

| Not covered | Why, and what stands in for it |
| --- | --- |
| Cross-browser e2e (Firefox / WebKit) | Chromium only. Nothing here is engine-specific — `position: sticky`, `ResizeObserver` and `IntersectionObserver`-free scroll maths are baseline — and a second engine doubles CI time for the same assertions. A real product would add WebKit for the sticky and scroll suites. |
| Coverage thresholds | Coverage is measured by what the tests assert, not by a percentage gate; the pure core is tested behaviourally (sort merge rules, page clamping, flattening, spans, selection scopes) rather than line-chased. A long-lived repo should add a floor to stop it eroding. |
| Bundle-size budget | The perf gate gauges interaction (sort, page change, frame p95), not payload. With four runtime dependencies the payload is small by construction, but a `size-limit` check in CI is the honest way to keep it that way. |
| Visual regression snapshots | Layout, light / dark and the three breakpoints are verified by hand (see the design doc). Snapshots pay off once a team is changing this CSS; for one author over one week they mostly encode churn. |

---

## Tradeoffs considered and assumptions made

- **From-scratch engine with an established vocabulary.** Familiar prop names lower the learning
  cost for the feature developers who are the real users, and let `/playground` generate
  copy-pasteable JSX; the cost is a large prop surface. Every prop is inert when absent and the
  resolved config makes the surface explicit.
- **No component library either.** The brief permits UI-kit primitives, but importing one would
  have made "from scratch" a matter of degree, pulled a styling engine (and its hydration
  quirks) into the app, and hidden the accessibility work behind someone else's markup. Writing
  the ~20 primitives in `src/lib/ui` left the runtime at four dependencies, one theming
  mechanism (CSS custom properties) and ARIA we can point at. The trade-off is real: these
  controls cover exactly this app's needs — no virtualised select, no form integration, no RTL
  sweep — and a product team would need more before reusing them widely.
- **Breadth was capped to protect depth.** The brief values architecture and implementation
  quality over feature count, so the optional features that survived are the ones that pressure
  the architecture — server mode, tree data, virtual windowing, spans — because each proved the
  pipeline generalises. Features that would only have lengthened the list were cut.
- **Column drag-reorder was removed, not deferred.** It was built and then dropped along with its
  dependency: the feature is not in the brief, and it was the only thing in the repo pulling an
  interaction library.
- **Key-presence controlled semantics** rather than a separate `controlled` flag: simpler for
  consumers, but `sortOrder: undefined` must be spelled `sortOrder: null` to mean "controlled,
  none".
- **Sticky columns via `position: sticky`** rather than cloned fixed tables: far less code and no
  height/scroll sync, at the cost of needing numeric `width` on fixed columns (the table warns
  once in development when it is missing) and per-cell borders.
- **Hand-written virtual windowing** (`useSyncExternalStore` + spacer rows) instead of a
  library: it is opt-in (`virtual`), needs `scroll.y` and a `rowHeight`, and windows the *flattened*
  list so expanded rows and tree rows still work (variable heights are measured with one
  `ResizeObserver`). `rowSpan` is degraded to 1 under `virtual`.
- **`onChange` fires on paginate / sort / filter**; selection and expansion have their own
  callbacks (`rowSelection.onChange`, `expandable.onExpand`) — one event per concern.
- **Sort stability and null handling:** the default comparator sorts `null`/`undefined` last and
  treats `NaN` as 0; sorting is stable by index; unknown sort keys are dropped with a one-time
  development warning; out-of-range pages are clamped.
- **Times render on the studio's clock, not the viewer's.** Timetable cells are server-rendered as
  well as hydrated, so a timezone-dependent format produces different text on each side (React
  #418). `src/features/shared/format.ts` pins the offset; `format.test.ts` renders the same string
  under five timezones.
- **Row keys never throw.** A missing or duplicate key warns once and falls back to the row
  index, so a bad fixture degrades instead of crashing the dashboard.
- **Tree rows and `expandedRowRender` are mutually exclusive** (`expandedRowRender` wins, with a
  warning) — keeping the flatten stage simple.
- Assumed: staff dashboards run on modern evergreen browsers; `ResizeObserver` and
  `position: sticky` are available. Assumed the reviewer values the mocked API behaving like a
  real one (latency, aborts, 503s, malformed payloads) over a real backend.

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

## Capability index

Every row is one attribute on the component, and the link opens the playground with that attribute
already on — so any claim above can be checked in one click rather than taken on trust.

| Capability | Attribute | Try it |
| --- | --- | --- |
| Row selection, bulk operations | `rowSelection` (`checkbox` \| `radio`, `selections` menu, `getCheckboxProps`, `onChange` / `onSelect` / `onSelectAll`) | [/playground?selection=checkbox&selectionsMenu=true&disableCancelled=true](/playground?selection=checkbox&selectionsMenu=true&disableCancelled=true) |
| Sorting, multi-sort, sorted-column highlight | `sorter`, `sorter.multiple`, priority badges, `theme.sortedColumnBg` | [/playground?multiSort=true&sortedHighlight=true](/playground?multiSort=true&sortedHighlight=true) |
| Loading modes | `loading={{ mode: 'skeleton' \| 'overlay', indicator, delay }}` | [/playground?loading=custom](/playground?loading=custom) |
| Density, custom row height | `size` and `rowHeight={px}` | [/playground?rowHeight=64](/playground?rowHeight=64) |
| Border, title, footer, summary | `bordered`, `title`, `footer`, `summary` | [/playground?bordered=true&title=true&footer=true&summary=true](/playground?bordered=true&title=true&footer=true&summary=true) |
| Expansion, nested table | `expandable.expandedRowRender` (+ `loadChildren`) | [/playground?expansion=on-demand](/playground?expansion=on-demand) |
| Tree data | `expandable.childrenColumnName`, `checkStrictly` | [/playground?expansion=tree&selection=checkbox](/playground?expansion=tree&selection=checkbox) |
| Merged cells | `column.onCell` → `{ colSpan, rowSpan }`, header `colSpan` | [/playground?spans=true](/playground?spans=true) |
| Fixed header, fixed columns, gapped pinned group | `scroll.y`, `sticky`, `column.fixed` with `width`, `theme.fixedColumnGap` | [/playground?scrollY=fixed&fixedRight=true&fixedGap=true](/playground?scrollY=fixed&fixedRight=true&fixedGap=true) |
| Auto height | `scroll.y: 'auto'` (ResizeObserver) | [/playground?rows=200&scrollY=auto](/playground?rows=200&scrollY=auto) |
| Hidden columns, ellipsis, responsive columns | `column.hidden`, `column.ellipsis`, `column.responsive` | [/playground?hideColumn=instructor&ellipsis=true&responsive=true](/playground?hideColumn=instructor&ellipsis=true&responsive=true) |
| Pagination (positions, size changer, jumper, total, simple) | `pagination.position` × 6, `showSizeChanger`, `showQuickJumper`, `showTotal`, `simple` | [/playground?paginationPosition=topAndBottom&showSizeChanger=true&showQuickJumper=true&showTotal=true](/playground?paginationPosition=topAndBottom&showSizeChanger=true&showQuickJumper=true&showTotal=true) |
| Large datasets, virtual windowing | `virtual` (hand-written) | [/playground?rowHeight=44&rows=10000&pagination=false&scrollY=fixed&virtual=true](/playground?rowHeight=44&rows=10000&pagination=false&scrollY=fixed&virtual=true) |
| Value formatting (dates, money, units) | `column.formatter` — a preset name **or any dayjs pattern**, live in `/timetable` → *Time format*; the rule is in [docs/API.md](docs/API.md#formatting-rule) | [/playground?timeFormat=DD-MM-YYYY](/playground?timeFormat=DD-MM-YYYY) |
| Empty and error states | `locale.emptyText`, `error` + `onRetry` | [/playground?empty=true](/playground?empty=true) |
| The playground itself | controls → live table → generated JSX + event log | [/playground](/playground) |

Feature combinations that need care are listed in the conflict matrix in
[docs/API.md](docs/API.md#feature-conflict-matrix).

---

## Documentation map

| File | Question it answers | Read it when |
| --- | --- | --- |
| [docs/ORIENTATION.md](docs/ORIENTATION.md) | How do I read this library without drowning | **Start here** if you are going into the code |
| [docs/PRODUCT.md](docs/PRODUCT.md) | Who is this for, what must it feel like | You want the product reasoning before the code |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers, pipeline, state model, sticky / virtual mechanics | You are about to read or change the library |
| [docs/API.md](docs/API.md) | Every prop, defaults, conflict matrix, dev warnings | You are using the component |
| [docs/DESIGN.md](docs/DESIGN.md) | Tokens, density, motion, states | You are changing how it looks |
| [docs/REQUIREMENTS_TRACEABILITY.md](docs/REQUIREMENTS_TRACEABILITY.md) | Brief requirement → code → test | You are checking the submission against the brief |
| [docs/adr](docs/adr/README.md) | Why the six load-bearing decisions were made | You disagree with one of them |

---

## License

[MIT](LICENSE) © Aung Myat Moe
