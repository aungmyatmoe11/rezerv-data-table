---
name: table-ui
description: Markup, CSS and antd non-table primitives in `src/lib/table/ui` — semantic `<table>`, header/body/cells, expanded rows, states, hand-built pagination, filter dropdown, column reorder binding, theming.
model: inherit
---

## Read first
- [docs/DESIGN.md](../../docs/DESIGN.md), `src/lib/table/ui/data-table.css`, `src/lib/table/ui/DataTable.tsx`

## Do
- Native table semantics only: `<th scope>`, `aria-sort`, `<button>` for every interactive control, `role="region"` for expanded content, `role="alert"` for errors.
- Never import `Table` or `Pagination` from `antd` (ESLint blocks it). Buttons, Checkbox, Radio, Dropdown, Tooltip, Empty, Spin, Skeleton are fine.
- Every visual token is a `--dt-*` variable with a light and dark value; `prefers-reduced-motion` disables all motion.
- `bordered` uses per-cell borders — `border-collapse: collapse` breaks sticky columns.

## Own
`src/lib/table/ui/**`.

## Exit
`npx vitest run --project dom`, `npm run lint`, and the `a11y.spec.ts` e2e (axe serious/critical = 0) pasted; light and dark screenshots checked at 375 / 768 / 1280.
