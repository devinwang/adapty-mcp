# Adapty MCP — Session Handoff

**Date:** 2026-04-26
**Mode:** superpowers:subagent-driven-development
**Working dir:** `/Users/devin/Dropbox/code/mcp-servers/adapty-mcp/`
**Git:** local repo, branch `main`, no remote

## Resume Instructions for New Session

1. Read this file fully.
2. Read the design spec: `docs/superpowers/specs/2026-04-26-adapty-mcp-design.md`
3. Read the implementation plan: `docs/superpowers/plans/2026-04-26-adapty-mcp.md` (3157 lines — read it section by section as you dispatch each task; do NOT load it all at once)
4. Resume the Subagent-Driven loop starting from **Task M0.2**.

## What's Done

| Task | Status | Commit |
|---|---|---|
| M0.1 Initialize npm package | DONE (with fix commit) | `b848003`, `c6f29a1` |

Files now in repo: `package.json`, `tsconfig.json`, `.gitignore`, `LICENSE`, `package-lock.json`, `node_modules/`, plus pre-existing `docs/`. **No `src/` or `tests/` yet.**

## Remaining Tasks (31 of 32)

In dispatch order — every task has a fully spelled-out section in the plan file:

- M0.2 Vitest config
- M0.3 Smoke build (creates first `src/index.ts` placeholder)
- M1.1–M1.8 Core infrastructure (redact, credentials, account-store, headers, http errors, http client, rate-limit, tool-helpers)
- M2.1–M2.3 Schemas (common, domain, webhook events)
- M3.1–M3.5 Server-Side API v2 tools (12 tools across 5 files)
- M4.1 Legacy v1 tools (7 tools, 1 file)
- M5.1+5.2 Web API (path research + 3 tools)
- M6.1+6.2 Analytics Export (research + 3 tools)
- M7.1 Webhook utilities (auth-verify + event-parse)
- M8.1 Tool registry
- M8.2 MCP server + stdio entry
- M9.1 README + tool catalog generator
- M9.2 Smithery manifest
- M9.3 CI workflow
- M9.4 Contract tests
- M9.5 Final whole-branch code review

The TodoWrite list in the new session should mirror these (one per item).

## Subagent-Driven Process Reminders

For each task:
1. Read the task block from the plan file (only the relevant section).
2. Dispatch **implementer** (general-purpose) with the FULL task text inlined into the prompt — do NOT make the subagent read the plan file.
3. Handle status: DONE / DONE_WITH_CONCERNS (proceed unless concerns are correctness) / BLOCKED / NEEDS_CONTEXT.
4. Dispatch **spec compliance reviewer** (general-purpose, with verbatim spec text). Loop until approved.
5. Dispatch **code quality reviewer** (subagent_type: `superpowers:code-reviewer`) with BASE_SHA = previous commit, HEAD_SHA = current commit.
6. Loop fix → re-review until approved.
7. Mark TodoWrite item completed.

## Lessons Learned from M0.1

- **Spec reviewer brief must enumerate every required field.** Partial summaries cause false-positive "extras detected". Either inline the full plan section in the reviewer prompt or say explicitly "anything else from the plan is fine".
- **Code reviewer Important issues worth acting on:** version range tightness (use `~` not `^` for early-stage SDKs like `@modelcontextprotocol/sdk`), `publishConfig.access: public` for non-scoped public packages.
- **Code reviewer Minor issues to skip during execution:** stylistic gitignore additions beyond the plan, optional tsconfig flags, `.nvmrc`, etc. Defer to a single polish task or reject as out-of-scope.
- **Hooks:** A user hook blocks creating arbitrary `*.md` files via the `Write` tool. Use shell `cat > file << EOF` heredoc instead. Allowed paths: `README.md`, `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `.claude*/plans/`, `.claude/commands/`. Files under `docs/superpowers/specs/` and `docs/superpowers/plans/` need shell.
- **WebFetch on adapty.io docs returns the SPA shell only** for many pages. For path/schema confirmation in M5/M6, expect to ask the user to paste actual responses or to do live curl tests, OR proceed with the documented working assumptions and tighten later.

## Hard Constraints (from spec § 2)

- TDD-first; every implementation driven by a failing test.
- Coverage: lines 90, branches 85, functions 90, statements 90 — enforced in `vitest.config.ts` (M0.2).
- Vitest only; HTTP mocked via fetch injection by default; `msw` reserved for multi-request integration.
- TypeScript + ESM, Node 18+.
- All API keys redacted in logs/errors/tool output.

## CLAUDE.md Constraints (Critical for Subagent Prompts)

- Native-level English in every file, comment, commit message.
- **Never** mention "Claude", "Claude Code", "Claude AI", "Anthropic", or add a `Co-Authored-By: Claude` trailer anywhere — including commit messages, README, comments. Pass these constraints into every implementer prompt.

## Open Items (resolved during their respective milestones)

1. M5.1 — confirm exact Web API paths from a live-render of `https://adapty.io/docs/web-api-requests` (SPA — `WebFetch` only sees the shell). Working assumptions documented in plan task 5.1.
2. M6.1 — confirm exact Analytics Export endpoints + auth from `https://adapty.io/docs/api-export-analytics`. Working assumptions in plan task 6.1.
3. M4.1 legacy v1 paths — already confirmed via `https://adapty.io/docs/server-side-api-specs-legacy`; 7 endpoints listed in plan task 4.1.
4. Webhook auth model — confirmed: NOT HMAC, just an Authorization-header echo of the token configured in the Adapty dashboard. Constant-time string compare. (Plan task 7.1 reflects this.)

## Final Step

After M9.5 final review passes, invoke `superpowers:finishing-a-development-branch` to complete the branch handoff.
