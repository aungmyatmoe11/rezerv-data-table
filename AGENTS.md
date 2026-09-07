# AGENTS.md — roles, routing and hand-off

Operating rules live in [CLAUDE.md](CLAUDE.md). This file says **who** does **what** and how
work is handed back.

## Router

| Change touches | Agent | File |
| --- | --- | --- |
| Public props, `types.ts`, `resolve-config.ts`, ESLint firewall, ADRs, contracts | `table-architect` | [.claude/agents/table-architect.md](.claude/agents/table-architect.md) |
| Pure engine: sorting, filtering, pagination, expansion, selection, columns, spans, reducer, pipeline | `table-core` | [.claude/agents/table-core.md](.claude/agents/table-core.md) |
| Hooks: state container, emit, lazy children, sticky cue, virtual, auto height, request adapter | `table-react` | [.claude/agents/table-react.md](.claude/agents/table-react.md) |
| Markup, CSS, antd primitives, theming, a11y | `table-ui` | [.claude/agents/table-ui.md](.claude/agents/table-ui.md) |
| `/timetable`, `/inventory`, `/playground`, mocks, route handlers | `table-consumer` | [.claude/agents/table-consumer.md](.claude/agents/table-consumer.md) |
| Vitest, Playwright, perf, CI | `table-qa` | [.claude/agents/table-qa.md](.claude/agents/table-qa.md) |

Ownership is disjoint. A change that crosses two rows is two hand-offs, architect first.

## Non-negotiables (summary)

- Table engine from scratch; antd is reference vocabulary and non-table primitives only.
- Every feature inert by default; every conflict in the matrix in [docs/API.md](docs/API.md).
- Core stays pure; callbacks only from `emit`; scroll never re-renders more than `<tbody>`.
- Keep e2e aria-labels stable: `Class timetable`, `Inventory items`, `Stock movements`,
  `Live table`, `Generated JSX`, `Table configuration`.

## Hand-off format

End every task with:

1. **Files** changed (paths).
2. **Commands run** with their actual summary lines (`Tests 84 passed`, `27 passed`, …).
3. **State:** completed / proposed / blocked / unverified — never merge the four.
4. **Residual risk** in one or two sentences.
5. For the user, the summary in Myanmar (မြန်မာဘာသာ); code identifiers stay in English.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
