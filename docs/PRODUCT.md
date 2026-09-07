# PRODUCT — who this is for and what it must feel like

## Users

- **Studio staff** at the front desk: scan today's classes, see which are full, open a class to
  check attendees in, cancel or remind a batch. Uses a laptop at the desk and a phone on the floor.
- **Feature developers** on the dashboard team: need a table they can configure in minutes for a
  new screen (inventory, memberships, payouts) without learning a new mental model.
- **The reviewer** of this assessment: wants to see API design, correctness, states, performance
  and product judgement — quickly.

## Purpose

One reusable `DataTable<T>` that renders any row shape from column definitions, with the
real-world concerns (sorting, pagination, expansion in two modes, pinned columns, skeletons,
empty / error states, large datasets) solved once, in the component, rather than per screen.

## Decisions (dated)

| Date | Decision |
| --- | --- |
| 2026-09-06 | API mirrors Ant Design Table's vocabulary; engine is from scratch (assignment constraint). |
| 2026-09-06 | Scope is the full antd demo list, delivered in tiers: required first, then config, layout, expensive. |
| 2026-09-06 | Table is a leaf; server state lives in `useTableRequest` outside it. |
| 2026-09-06 | Reviewer documentation is an in-app `/playground` modelled on antd's dynamic-settings demo. |
| 2026-09-07 | Virtual windowing and auto height hand-built; no `@tanstack/*`. |
| 2026-09-08 | No component library either: every primitive and icon is written in `src/lib/ui`; `antd` and `@dnd-kit` removed, and column drag-reorder dropped with them. |

## Anti-references

- Dashboards where "loading" is a full-page spinner and the layout jumps when data arrives.
- Tables that pin a column by cloning the table and syncing two scrollbars.
- Components whose every prop is required, or whose defaults already do everything.

## Principles (each testable)

1. **Inert by default.** `<DataTable columns dataSource />` renders a plain table and nothing
   else — `DataTable.test.tsx` asserts no extra columns, pager or overlay.
2. **Layout never jumps.** Skeleton rows match the column widths; overlay loading keeps the
   previous page; expanded rows animate height — checked in e2e and by eye at 375 / 768 / 1280.
3. **Every failure has a way out.** Initial fetch error → Retry; child fetch error → Retry inside
   the row; bad keys and unknown sort fields degrade with a dev warning — e2e `fail-once` scenario.
4. **Interaction stays under 200 ms at 10,000 rows.** `tests/perf` budgets.
5. **Accessible by construction.** Semantic table, keyboard-operable controls, axe serious/critical = 0.

## Out of scope

Editing, grouping, aggregation, CSV export, column resizing, saved views, a real backend.
