# ORIENTATION — how to read this library

This library is about 4,600 lines across 39 files. That is more than anyone should have to hold in
their head at once, so it is built so you never have to: there is **one mental model**, and every
feature is the same seven-step shape repeated. Learn the shape once and the rest is lookup.

Read this before [ARCHITECTURE.md](ARCHITECTURE.md). This file is the tour; that one is the
reference.

---

## 1. The one idea

```
props ──► resolveConfig ──► row model ──► render
             (inert?)        (memoised)
                 ▲                             ┌──────────────┐
                 │                             │ user clicks  │
                 └──────── state ◄─── reduce ◄─┤ a sort header│
                                        │      └──────────────┘
                                        └──► emit ──► your callback
```

Everything flows one way. A user interaction becomes an **action**; one pure `reduce()` turns the
action into the next state; the state feeds a **memoised pipeline** that derives the rows to show;
the renderer draws them. Consumer callbacks fire from exactly one place (`emit`), synchronously,
in the event handler that started it.

Three consequences worth knowing up front, because they explain most of the code you will read:

1. **A feature you did not configure does not exist.** `resolveConfig` turns every feature into
   `{ enabled: false }` or `{ enabled: true, …defaults }`. Hooks early-return on `enabled: false`;
   the renderer emits no extra column, pager or overlay. There is no branch in a hot loop asking
   "is selection on?" — the work was removed upstream.
2. **Nothing derived is stored.** Filtered, sorted, paged and flattened rows are computed, not
   kept in state. Each pipeline stage memoises on its own inputs, so changing the page does not
   re-run the comparator.
3. **No effect ever calls a prop.** If you are looking for where `onChange` fires, it is not in a
   `useEffect`. It is in `emit`, called by `send`, called by the click handler.

---

## 2. The layers

| Layer | Path | What it is | What it must never do |
| --- | --- | --- | --- |
| `core` | `src/lib/table/core` | Pure TypeScript. All the rules. | Import React, the DOM, Next or anything from the app |
| `react` | `src/lib/table/react` | Hooks. Timing, subscriptions, lifecycles. | Contain business rules, or import markup |
| `ui` | `src/lib/table/ui` | Markup and CSS. | Decide anything `core` could have decided |
| `@/lib/ui` | `src/lib/ui` | The primitives (Button, Checkbox, Select…). | Know that a table exists |

`eslint.config.mjs` fails the build on any import that crosses these the wrong way, so the
boundary is checkable rather than aspirational.

**This is also the debugging map.** Wrong rows on screen → `core`. Right rows at the wrong moment,
or a callback that fired twice → `react`. Right data, wrong pixels → `ui`.

---

## 3. The seven slots every feature occupies

Take sorting, the shortest complete example. Every other feature — filtering, pagination,
expansion, selection, spans — fills the same seven slots, in the same order.

| # | Slot | Sorting | Read it for |
| --- | --- | --- | --- |
| 1 | **Type** | [`core/types.ts`](../src/lib/table/core/types.ts) — `ColumnDef.sorter` | What a consumer is allowed to pass |
| 2 | **Config** | [`core/resolve-config.ts`](../src/lib/table/core/resolve-config.ts) | The defaults, and how absence becomes inert |
| 3 | **Rule** | [`core/sorting.ts`](../src/lib/table/core/sorting.ts) — `toggleSort`, `buildComparator` | The actual logic, as pure functions |
| 4 | **State** | [`core/state.ts`](../src/lib/table/core/state.ts) — `reduce` | What changes, and what else resets |
| 5 | **Derive** | [`core/row-model.ts`](../src/lib/table/core/row-model.ts) — stage S3 | Where it runs in the pipeline |
| 6 | **Wire** | [`react/use-table.ts`](../src/lib/table/react/use-table.ts) — `SortingApi` | The tiny surface the renderer gets |
| 7 | **Render** | [`ui/HeaderCell.tsx`](../src/lib/table/ui/HeaderCell.tsx) | The markup and the ARIA |

Plus the proof: [`core/sorting.test.ts`](../src/lib/table/core/sorting.test.ts).

Note what is *not* in the list: no sorting code in `BodyRow`, no sorting branch in `DataTable`, no
`useEffect` anywhere. A feature is a vertical slice, not a thread running through the tree.

---

## 4. Walkthrough — one click, end to end

A user clicks a sortable column header. In order:

1. **[`ui/HeaderCell.tsx`](../src/lib/table/ui/HeaderCell.tsx)** — the header's `<button>` calls
   `sorting.toggle(key)`. That is all the markup knows how to do; it holds no state.
2. **[`react/use-table.ts`](../src/lib/table/react/use-table.ts)** — `SortingApi.toggle` dispatches
   `send({ type: "sort/toggle", columnKey })`.
3. **[`react/use-table-state.ts`](../src/lib/table/react/use-table-state.ts)** — `send` runs three
   steps, synchronously, still inside the click handler:
   - `reduce(prev, action, ctx)` → the next state,
   - `commit` → writes **only the uncontrolled slices** (a slice whose prop key the consumer
     supplied is theirs, not ours),
   - `emit(prev, next, action, deps)` → fires `onChange(pagination, filters, sorter, extra)`.
4. **[`core/state.ts`](../src/lib/table/core/state.ts)** — `reduce` calls `toggleSort` for the new
   sort, and applies the cross-slice rule: a sort change resets to page 1. Selection is
   deliberately left alone.
5. **[`core/sorting.ts`](../src/lib/table/core/sorting.ts)** — `toggleSort` runs the
   ascend → descend → none cycle and the merge rule: the click joins the existing sort only when
   the clicked column *and* the current head sorter both declare `multiple`; otherwise it replaces.
6. **Re-render.** [`core/row-model.ts`](../src/lib/table/core/row-model.ts) re-runs from stage S3
   (sorted) onward. S1 (keyed) and S2 (filtered) hit their memos and return the same arrays by
   identity, so nothing upstream recomputes.
7. **[`ui/TableBody.tsx`](../src/lib/table/ui/TableBody.tsx)** renders the new flat list.
   `BodyRow` and `BodyCell` are memoised, so rows whose identity did not change do not re-render.

If a column's `sorter` is `true` rather than a comparator, step 6 is a no-op: the table emits the
new sorter and renders whatever `dataSource` it was given. That single difference is the whole
client-mode / server-mode split.

---

## 5. Reading order

If you want to read the library rather than a feature through it, this order never asks you to
understand something that has not been introduced.

**Foundations** — no dependencies on anything else here.

1. [`core/types.ts`](../src/lib/table/core/types.ts) — skim; it is the vocabulary, not logic.
   The interesting part is `DataIndexPath` / `PathValue`, which give `render` a value typed from
   its `dataIndex`.
2. [`core/value.ts`](../src/lib/table/core/value.ts) — path lookup, the default comparator, row
   keys. Small and total.
3. [`core/warnings.ts`](../src/lib/table/core/warnings.ts) — 20 lines, and it explains the
   library's error philosophy: degrade and warn once, never throw.

**The rules** — each is pure, each has a test beside it.

4. [`core/columns.ts`](../src/lib/table/core/columns.ts) — the one non-obvious file: group columns
   flatten into leaves, and leaves partition into `[left, middle, right]` with the sticky offsets.
5. [`core/sorting.ts`](../src/lib/table/core/sorting.ts) → [`filtering.ts`](../src/lib/table/core/filtering.ts)
   → [`pagination.ts`](../src/lib/table/core/pagination.ts) → [`expansion.ts`](../src/lib/table/core/expansion.ts)
   → [`selection.ts`](../src/lib/table/core/selection.ts) → [`spans.ts`](../src/lib/table/core/spans.ts).

**The assembly.**

6. [`core/resolve-config.ts`](../src/lib/table/core/resolve-config.ts) — where "inert by default"
   is actually implemented.
7. [`core/state.ts`](../src/lib/table/core/state.ts) — the reducer and the cross-slice rules.
8. [`core/row-model.ts`](../src/lib/table/core/row-model.ts) — the pipeline that ties it together.

**React and markup.**

9. [`react/use-table-state.ts`](../src/lib/table/react/use-table-state.ts) — `send` and `emit`.
10. [`react/use-table.ts`](../src/lib/table/react/use-table.ts) — the headless instance.
11. [`ui/DataTable.tsx`](../src/lib/table/ui/DataTable.tsx) → `TableHeader` → `TableBody` →
    `BodyRow` → `BodyCell`.

**The specialists** — read only when you need them: `use-lazy-children`, `use-virtual-rows`,
`use-row-heights`, `use-sticky-scroll`, `use-auto-height`, `use-breakpoint`, `use-delayed-flag`,
`use-table-request`. Each is self-contained and starts with a comment saying what it owns.

Every file in `src/lib/table` opens with a two-to-four-line header stating its job. Opening a file
cold and reading its first paragraph is a supported way to use this codebase.

---

## 6. How to add a feature

The shape above is also the recipe. Say you are adding column resizing:

1. **Type it** in `core/types.ts` — `column.resizable?: boolean`, plus whatever config object the
   feature needs on the table.
2. **Resolve it** in `core/resolve-config.ts`. It must resolve to `{ enabled: false }` when the
   prop is absent, and nothing downstream may read the raw prop again.
3. **Write the rule** as pure functions in a new `core/resizing.ts`, with `core/resizing.test.ts`
   beside it. No React in this file. This is where the feature is actually *designed*.
4. **Add state** to `TableState` and actions to `reduce` in `core/state.ts` — only if the feature
   has state. Decide explicitly what it resets and what resets it; that rule goes here and nowhere
   else.
5. **Add a pipeline stage** in `core/row-model.ts` only if the feature changes which rows or
   columns are shown. Give it its own `memoLast` and its own inputs.
6. **Expose a small API** from `react/use-table.ts` — the pattern is `{ valueOf, setter }`, like
   `SortingApi`. If the feature needs subscriptions or measurement, that goes in its own
   `react/use-*.ts` hook.
7. **Render it** in `ui/`, and add the callback to `emit` in `react/use-table-state.ts` if
   consumers need to hear about it. Never call a prop from an effect.
8. **Document it** in [API.md](API.md), and add a row to
   [REQUIREMENTS_TRACEABILITY.md](REQUIREMENTS_TRACEABILITY.md) if it answers a brief requirement.

If a step feels like it belongs in a different layer than the recipe says, that is worth
investigating before you write it — it usually means the rule is not as pure as it looked, and
the fix is to move the decision earlier rather than to cross the boundary.

---

## 7. Vocabulary

These words mean specific things throughout the codebase.

| Term | Meaning |
| --- | --- |
| **Leaf column** | A column that renders cells, after group columns have been flattened. The renderer only ever sees leaves. |
| **Flat entry** | One item in the linear list the body walks: a data row, a child row, or an expanded region. Produced by `flattenExpanded`. |
| **Slice** | One independent part of `TableState` — `sort`, `filters`, `page`, `selectedKeys`, `expandedKeys`. Controlled-ness is decided per slice. |
| **Controlled by key presence** | A slice is controlled when the consumer supplied its prop key. `sortOrder: null` means "controlled, no sort"; omitting it means "uncontrolled". |
| **Inert** | A feature whose config resolved to `{ enabled: false }`: no state, no listener, no extra DOM, no code run. |
| **Emit** | The single function that fires consumer callbacks, in `react/use-table-state.ts`. If a callback fires, it came from here. |
| **Row model** | The output of the memoised pipeline: the rows to render, plus the spans and keys that go with them. |
| **Server mode** | Inferred, never flagged: a column with `sorter: true` and no comparator, or `total > dataSource.length`. |

---

## Where to go next

| You want | Read |
| --- | --- |
| The prop reference | [API.md](API.md) |
| The diagram, pipeline stages, sticky and virtual mechanics | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Why a decision was made this way | [adr/](adr/README.md) |
| Who this is for and what it must feel like | [PRODUCT.md](PRODUCT.md) |
| Tokens, density, motion, states | [DESIGN.md](DESIGN.md) |
