# ADR 0006 — No component library: our own primitives and icons

## Context

The brief forbids table/grid libraries but explicitly permits "non-table UI primitives (icons,
buttons, a modal, etc.) from a UI kit". The first implementation took that allowance and used Ant
Design for Button, Checkbox, Radio, Select, Dropdown, Tooltip, Tag, Empty, Spin, Progress,
Drawer, Segmented, Switch, Collapse, ColorPicker and the icon set, plus its `ConfigProvider`
tokens and the Next.js style registry. Column reorder additionally pulled in dnd-kit.

That left three problems. "Built from scratch" became a matter of degree — a reviewer counting
imports sees a component library. The styling engine (cssinjs) computed class hashes at runtime,
which is a hydration hazard and forced a registry into the root layout. And the accessibility
work the brief asks about lived inside someone else's markup, so there was nothing of ours to
point at.

## Decision

Remove `antd`, `@ant-design/*` and `@dnd-kit/*`. Write the primitive layer in `src/lib/ui`:
Button, Checkbox, Radio, Switch, Segmented, Select, MenuButton, Popover, Tooltip, NumberInput,
ColorInput, Tag, Alert, Empty, Spinner, Progress, Card, Collapse, Drawer, Toast, Text and a
hand-drawn SVG icon set. Theme with `--ui-*` CSS custom properties, switched by `data-theme` on
`<html>` and applied before first paint by a small inline script. Drop column drag-reorder along
with its dependency — it is not in the brief.

Runtime dependencies are now `react`, `react-dom`, `next` and `dayjs`. ESLint fails the build on
any import from a component, table, grid or interaction library.

## Alternatives

- **Keep antd for primitives** — allowed by the brief and cheaper, but it is the status quo the
  owner explicitly asked to remove, and it keeps the ambiguity above.
- **Swap to a headless kit (Radix, Headless UI)** — better semantics than antd, still a library,
  and still a dependency to justify.
- **Keep dnd-kit for reorder only** — a single interaction library for a feature the brief never
  asks for; removing the feature is the cheaper honest answer.

## Consequences

One theming mechanism, no style engine, identical markup on server and client, and every ARIA
decision is ours to defend (`role="combobox"`/`listbox` for Select, `role="menu"` for the
selection menu, `role="switch"`, `role="progressbar"`, `role="dialog" aria-modal` for the Drawer,
`aria-describedby` tooltips). The primitives are scoped to this app: no virtualised select, no
form-library integration, no RTL pass, no theming API beyond the tokens. Column reorder is gone
from the feature matrix. Portals need an SSR guard, so `useIsClient()` (a `useSyncExternalStore`)
replaces the usual mount-effect pattern.

## Revisit when

This app grows a form-heavy surface (multi-select, date pickers, comboboxes with type-ahead) —
that is the point where a headless library earns its keep, and the swap should be a separate ADR
with the accessibility budget stated up front.
