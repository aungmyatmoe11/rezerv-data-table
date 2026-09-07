# ADR 0006 — Hand-built pagination controls; antd only for non-table primitives

## Context

antd's `Pagination` is part of its table experience, and importing it would make "the table is
from scratch" arguable. The brief allows non-table primitives (buttons, icons, modals).

## Decision

`ui/TablePagination.tsx` is hand-built (`<nav>` with `<button>`s, `aria-current="page"`, size
changer via antd `Select`, quick jumper via antd `InputNumber`, `simple` mode, `showTotal`,
`hideOnSinglePage`, six positions). antd is used for Button, Checkbox, Radio, Dropdown, Tooltip,
Empty, Spin, Select, InputNumber and icons; dnd-kit for drag sensors. ESLint bans
`Table` / `Pagination` from `antd` and `@tanstack/*`.

## Alternatives

- **antd `Pagination`** — simplest, but a reviewer could reasonably count it as table UI.
- **No antd at all** — more work for no assessment value; the brief explicitly permits primitives.

## Consequences

Pagination markup and keyboard behaviour are ours to test (`TablePagination` unit + e2e). Visual
consistency with antd comes from the theme tokens (`--dt-*` from `theme.useToken()`).

## Revisit when

The design system moves away from antd — the `ui` layer is the only one that would change.
