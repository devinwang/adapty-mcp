# Changelog

## 0.1.0 — 2026-04-26

Initial release. Exposes the full public Adapty REST API surface plus webhook utilities.

- Server-Side API v2 (12 tools): profile, access-level, transaction, stripe-purchase, integration-identifiers, paywalls.
- Server-Side API v1 legacy (7 tools): mirrors v2 against the legacy `/api/v1/sdk` paths; tools are clearly marked `[LEGACY — prefer v2 equivalent]`.
- Web API (3 tools, public key): paywall fetch, paywall view, attribution.
- Analytics Export (3 tools, secret key, admin host): metrics query, cohorts, CSV export.
- Webhook utilities (2 tools, no network): authorization-token verify (constant-time compare) and event parser covering all 18 documented event types.

Engineering:
- TDD-first; vitest with coverage thresholds (lines 90, branches 85, functions 90, statements 90, project-wide).
- Multi-app config via `~/.config/adapty-mcp/accounts.json` with sandbox/live envs and a `default` app pointer.
- All API keys redacted from every error message, log line, and tool result via a shared regex matcher.
- Injectable HTTP client with 30s timeout and GET-only retry on 429/502/503/504 with exponential backoff.
- Strict TypeScript (`exactOptionalPropertyTypes: true`), Node ≥ 18, ESM-only.

Internal-only modules ready for future wiring:
- `src/http/rate-limit.ts` — advisory token-bucket helper. Tested but not yet wired into the HTTP client; reserved as a hook for client-side advisory throttling in a follow-up release.
