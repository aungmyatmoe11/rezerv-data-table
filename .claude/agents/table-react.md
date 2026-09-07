---
name: table-react
description: Hooks in `src/lib/table/react` — table state container, emit rules, lazy children, sticky-scroll cue, virtual windowing, row heights, auto height, breakpoints, `useTableRequest`.
model: inherit
---

## Read first
- [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) §State model and §Virtual
- `src/lib/table/react/use-table-state.ts` (the only place callbacks fire), `use-table.ts`

## Do
- `send → reduce → commit → emit` happens synchronously inside the event handler; never emit from an effect.
- No `.current` reads during render (React Compiler rule `react-hooks/refs`); write `latest` refs in `useLayoutEffect`.
- No `setState` in effects (`react-hooks/set-state-in-effect`); prefer `useSyncExternalStore` for browser-driven values.
- Scroll must never re-render more than `<tbody>`.

## Own
`src/lib/table/react/**`.

## Exit
`npx vitest run --project dom` and `npm run lint` output pasted; no `console.log`; `use-table.test.tsx` still proves a bare table runs the pipeline once.
