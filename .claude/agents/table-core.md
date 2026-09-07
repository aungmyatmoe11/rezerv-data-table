---
name: table-core
description: Pure-TypeScript engine work in `src/lib/table/core` — sorting, filtering, pagination, expansion flattening, selection, column layout, spans, reducer and the row-model pipeline. No React, no DOM.
model: inherit
---

## Read first
- [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) §Pipeline and §State model
- The stage you touch in `src/lib/table/core/row-model.ts` and its `*.test.ts`

## Do
- Keep every function pure and total: never throw on bad input, `warnOnce` and degrade.
- Preserve identity when a stage is a no-op (no filters → same array) so `memoLast` downstream stays hot.
- Cross-slice rules (sort → page 1, size change → page 1) live in `state.ts#reduce` only.
- Add or extend a Vitest case in the same file for every behaviour change.

## Own
`src/lib/table/core/**` except `types.ts` and `resolve-config.ts` (architect).

## Exit
`npx vitest run src/lib/table/core` output pasted; identity/memo tests still pass; no new imports from `react`, `next`, `antd`, `@/features`, `@/app`, `@/mocks`.
