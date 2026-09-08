# Architecture decision records

MADR-style: Context · Decision · Alternatives · Consequences · Revisit when. One file per
load-bearing decision; a new ADR is written only after the decision is agreed with the owner.

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](0001-from-scratch-engine-with-a-familiar-api.md) | From-scratch engine behind a deliberately familiar prop vocabulary | accepted |
| [0002](0002-leaf-table-and-request-hook.md) | The table is a leaf; server state lives in `useTableRequest` | accepted |
| [0003](0003-single-reducer-handler-time-emit.md) | One reducer, key-presence controlled slices, callbacks emitted in the handler | accepted |
| [0004](0004-sticky-columns-via-position-sticky.md) | Pinned columns via `position: sticky` with computed offsets | accepted |
| [0005](0005-hand-written-virtual-windowing.md) | Opt-in, hand-written virtual windowing over the flattened row list | accepted |
| [0006](0006-no-component-library.md) | No component library: our own primitives, icons and pagination controls | accepted (supersedes the earlier "use a UI kit for primitives" decision) |
