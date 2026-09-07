---
name: table-consumer
description: Feature pages that consume the table — `/timetable`, `/inventory`, `/playground` — plus the mock API, fixtures and route handlers. Proves reusability; never patches the library to fit a page.
model: inherit
---

## Read first
- [docs/PRODUCT.md](../../docs/PRODUCT.md), [docs/API.md](../../docs/API.md)
- `src/features/timetable/TimetablePage.tsx` (reference consumer), `src/mocks/scenarios.ts`

## Do
- Columns are data: `ColumnDef<T>[]` with typed `dataIndex`; domain rendering (Tag, Progress, dayjs) lives here, not in `src/lib`.
- Server mode goes through `useTableRequest`; client mode passes the full array and lets the table sort/page.
- Keep the e2e aria-labels stable: `Class timetable`, `Inventory items`, `Stock movements`, `Live table`, `Generated JSX`.
- Playground: every new attribute gets a control, a code-gen line and an event-log hook.

## Own
`src/features/**`, `src/mocks/**`, `src/app/**`.

## Exit
`npm run build` and the matching `tests/e2e/*.spec.ts` output pasted.
