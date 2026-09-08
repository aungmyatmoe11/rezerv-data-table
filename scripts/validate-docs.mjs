#!/usr/bin/env node
/**
 * Documentation gate: dangling relative links, README sections the brief mandates,
 * requirement-id coverage, ADRs, and (when present locally) the agent roster.
 * CLAUDE.md, AGENTS.md and .claude/ are gitignored — CI clones will not have them.
 * Does not prove application readiness.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".next", "test-results", "playwright-report", ".git"].includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const markdown = walk(root).filter((file) => extname(file) === ".md");

// --- relative links resolve ------------------------------------------------------
const linkPattern = /\[[^\]]*]\(([^)]+)\)/g;
for (const file of markdown) {
  const text = readFileSync(file, "utf8");
  let match;
  while ((match = linkPattern.exec(text)) !== null) {
    const raw = match[1].trim().split(/\s+/)[0];
    if (!raw || raw.startsWith("http") || raw.startsWith("mailto:") || raw.startsWith("#") || raw.startsWith("/")) continue;
    const target = resolve(dirname(file), raw.split("#")[0]);
    if (!existsSync(target)) errors.push(`${file.replace(root + "/", "")}: missing link ${raw}`);
  }
}

// --- README carries the seven sections the brief names ---------------------------
const readme = readFileSync(join(root, "README.md"), "utf8");
for (const heading of [
  "## Setup instructions",
  "## Component API design and how column definitions work",
  "## Client-side vs server-side strategy (sort & pagination)",
  "## Expandable-rows design for both inline and on-demand child rows",
  "## Sticky-column approach",
  "## State management decision and why",
  "## Tradeoffs considered and assumptions made",
]) {
  if (!readme.includes(heading)) errors.push(`README.md: missing section "${heading}"`);
}

// --- traceability covers R-01 … R-26 ------------------------------------------------
const trace = readFileSync(join(root, "docs/REQUIREMENTS_TRACEABILITY.md"), "utf8");
for (let i = 1; i <= 26; i += 1) {
  const id = `R-${String(i).padStart(2, "0")}`;
  if (!trace.includes(`| ${id} |`)) errors.push(`docs/REQUIREMENTS_TRACEABILITY.md: missing ${id}`);
}
if (/\bTODO\b|\bTBD\b/.test(trace)) errors.push("docs/REQUIREMENTS_TRACEABILITY.md: contains TODO/TBD");

// --- agent roster (local-only files; skip when absent so CI can clone without them)
const agents = ["table-architect", "table-core", "table-react", "table-ui", "table-consumer", "table-qa"];
const agentsDocPath = join(root, "AGENTS.md");
const agentRosterPresent = existsSync(agentsDocPath);
if (agentRosterPresent) {
  const agentsDoc = readFileSync(agentsDocPath, "utf8");
  for (const agent of agents) {
    const file = join(root, ".claude/agents", `${agent}.md`);
    if (!existsSync(file)) errors.push(`.claude/agents/${agent}.md: missing`);
    else {
      const text = readFileSync(file, "utf8");
      for (const section of ["## Read first", "## Do", "## Own", "## Exit"]) if (!text.includes(section)) errors.push(`.claude/agents/${agent}.md: missing ${section}`);
    }
    if (!agentsDoc.includes(agent)) errors.push(`AGENTS.md: does not list ${agent}`);
  }
}

// --- ADR index lists every ADR file ------------------------------------------------
const adrDir = join(root, "docs/adr");
const adrIndex = readFileSync(join(adrDir, "README.md"), "utf8");
for (const file of readdirSync(adrDir)) {
  if (file === "README.md" || !file.endsWith(".md")) continue;
  if (!adrIndex.includes(file)) errors.push(`docs/adr/README.md: does not link ${file}`);
}

if (errors.length > 0) {
  for (const error of errors) process.stderr.write(`${error}\n`);
  process.exit(1);
}
const rosterNote = agentRosterPresent ? `${agents.length} agents` : "agent roster skipped (local-only)";
process.stdout.write(`validate-docs: ${markdown.length} markdown files, ${rosterNote}, links and sections OK\n`);
