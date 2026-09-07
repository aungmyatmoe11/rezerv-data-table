# CLAUDE.md — rezerv-data-table

Rezerv Frontend Assessment Part 2. A from-scratch, typed, config-driven `DataTable<T>` with an
Ant-Design-shaped API. Read [AGENTS.md](AGENTS.md) for roles and hand-off; this file is the
operating rules.

## Commands

| Task | Command |
| --- | --- |
| Dev server | `npm run dev` (port 3000) |
| Fast gates | `npm run typecheck && npm run lint && npm run test` |
| Full gate | `npm run check` (adds Playwright e2e on a production build) |
| Perf budgets | `npm run test:perf` |
| Docs gate | `npm run validate:docs && npm run typecheck:contracts` |
| Single unit file | `npx vitest run src/lib/table/core/sorting.test.ts` |
| Single e2e | `npx playwright test tests/e2e/playground.spec.ts -g "virtual"` |

Never write PASS without pasting the command output.

## Hard rules

- **No table/grid library.** Never import `Table` or `Pagination` from `antd`; never add
  `@tanstack/*`, `ag-grid`, `react-data-grid`, `react-window`, `react-virtual`. ESLint enforces the
  first two; treat the rest the same.
- **Layer firewall** (ESLint-enforced): `src/lib/table/core` imports nothing from React, Next,
  antd, `@/features`, `@/app`, `@/mocks` or `../react` / `../ui`. `react` imports `core` + React.
  `ui` imports `core`, `react`, antd non-table primitives. `src/lib/table` never imports from
  `src/features` or `src/app`.
- **Inert defaults.** A new prop must resolve to `{ enabled: false }` in `resolveConfig` and run no
  code when absent.
- **Callbacks fire only from `emit`** in `react/use-table-state.ts`, synchronously in the handler.
  No effects that watch state to call props.
- **React Compiler lint** is on: no `.current` reads in render, no `setState` in effects, keep
  manual memoisation valid.
- **TypeScript:** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noImplicitOverride`. No `any`; external data is `unknown` until validated.
- **Comments:** Myanmar for complex logic only; English identifiers; no comments on trivial code.
- **Tests / docs:** add the Vitest case beside the code you change; update `docs/API.md` for any
  public prop; do not create new docs beyond the documented set without asking.
- **No `console.log`** in committed code (`warnOnce` is the dev-only channel).
- **Commits:** conventional prefix (`feat(core):`, `fix(ui):`, `docs:`), end with
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- **Publishing / deploying** (GitHub visibility, Vercel) only when the user says so.

## Where things are

```
src/lib/table/            the library (core / react / ui / index.ts, core.ts = server-safe entry)
src/features/timetable    reference consumer: client + server modes, inline + on-demand children
src/features/inventory    second dataset: server multi-sort, tree rows, linked selection, drawer
src/features/playground   dynamic-settings demo: config → JSX + event log, state in the URL
src/mocks                 fixtures, latency, scenarios (normal | slow | empty | error | fail-once | malformed)
src/app/api/*             Next route handlers backed by the same mock
tests/e2e, tests/perf     Playwright (prod build, ports 3110 / 3111)
docs/                     PRODUCT, ARCHITECTURE, DESIGN, API, REQUIREMENTS_TRACEABILITY, adr/, contracts/
```

## E2E gotchas

- antd `Segmented` hides its radios — click `.ant-segmented-item` by text. antd `Select` options
  are `.ant-select-item-option[title="…"]`.
- Expand toggles relabel to "Collapse row"; scope locators to the row (`firstExpandToggle` helper).
- Read `test-results/**/error-context.md` before guessing at a failure.
