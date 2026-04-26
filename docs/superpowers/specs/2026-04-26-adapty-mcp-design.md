# Adapty MCP — Design Spec

**Date:** 2026-04-26
**Status:** Draft, awaiting user approval
**Author:** Devin Wang

## 1. Goal

Ship a TypeScript Model Context Protocol (MCP) server that exposes the **complete public Adapty REST API surface** as MCP tools. Coverage targets every documented endpoint across:

- Server-Side API v2 (`api.adapty.io/api/v2/server-side-api/`)
- Server-Side API v1 (legacy, still in production use)
- Web API (public-key endpoints)
- Analytics Export API (`api-admin.adapty.io/api/v1/client-api/`)
- Webhook signature verification + event payload parsing (local utilities)

The server follows the same shape as the existing `apple-app-store-connect-mcp` and `google-play-developer-mcp` projects in this repo.

## 2. Hard Constraints

- **TDD-first.** No implementation code lands without a failing test that drives it.
- **Coverage thresholds: lines ≥ 90%, branches ≥ 85%, functions ≥ 90%, statements ≥ 90%.** Enforced in `vitest.config.ts` and in CI (fail-under semantics — pipeline fails if any threshold is missed).
- **Vitest** as the only test runner. HTTP mocked via fetch injection; `msw` allowed for multi-request integration scenarios only.
- **TypeScript + ESM**, Node ≥ 18, single stdio transport.
- **No secret leakage.** All errors, logs, and tool responses run through a redaction step.
- **No third-party telemetry.** All network traffic is to `api.adapty.io` / `api-admin.adapty.io`.

## 3. Out of Scope

- Mobile SDK behaviour or replication (iOS/Android/RN/Flutter/Unity SDKs).
- Adapty Dashboard UI features that have no public REST endpoint.
- Persisting webhook events (this MCP only verifies and parses; storage is the user's responsibility).
- Polling for webhook deliveries (Adapty pushes; we cannot subscribe).

## 4. Architecture

### 4.1 Module Layout

```
adapty-mcp/
├── src/
│   ├── index.ts                 # CLI entry, stdio transport
│   ├── server.ts                # MCP server, tool registry
│   ├── auth/
│   │   ├── account-store.ts     # env var + config file resolution
│   │   ├── credentials.ts       # AdaptyCredentials type, validation
│   │   └── headers.ts           # Authorization + adapty-* header builder
│   ├── http/
│   │   ├── client.ts            # injectable fetch wrapper, retry, timeout
│   │   ├── errors.ts            # AdaptyApiError, 4xx/5xx normalization
│   │   └── rate-limit.ts        # advisory 40k/min/app token bucket
│   ├── tools/
│   │   ├── index.ts             # tool registry
│   │   ├── server-side-v2/      # profile, access-level, transaction,
│   │   │                        # integration-identifiers, paywall
│   │   ├── server-side-v1/      # legacy mirror, marked [LEGACY]
│   │   ├── web-api/             # public-key endpoints
│   │   ├── analytics/           # api-admin export endpoints
│   │   └── webhooks/            # local verify + parse utilities
│   ├── schemas/                 # shared Zod schemas
│   └── utils/
│       ├── redact.ts
│       ├── tool-helpers.ts
│       └── json.ts
├── tests/
│   ├── unit/                    # mirrors src/
│   ├── integration/             # in-process server + mock fetch
│   ├── contract/                # Adapty doc-example payloads vs schemas
│   └── fixtures/
├── scripts/
│   └── gen-tool-docs.ts
├── vitest.config.ts
├── package.json
├── tsconfig.json
├── smithery.yaml
├── README.md
├── CHANGELOG.md
└── LICENSE
```

### 4.2 Design Principles

- **One file per resource group.** ~30 tools total — splitting into 30 files (ASC-style) is over-fragmented for this scale; grouping by resource keeps related schemas and HTTP calls co-located.
- **Dependency-injected HTTP client.** Tools receive a `client` instance; tests inject a mock fetch with zero monkey-patching.
- **Schemas isolated from tools.** Webhook event union, profile shape, paywall shape live in `src/schemas/` so they can be exhaustively tested independently.
- **No `dist/` checked in.** `prepublishOnly` builds for npm.

## 5. Authentication & Multi-Account

### 5.1 Resolution Order (per tool call)

```
Tool call (app?, environment?)
  ↓
1. Config file present? (~/.config/adapty-mcp/accounts.json or $ADAPTY_MCP_CONFIG)
   a. Resolve app:
      - app param given → require it exists in config.apps; missing → ConfigError
      - app param omitted → use config.default; if absent → ConfigError listing available apps
   b. Resolve environment:
      - environment param given → require app[environment] exists; missing → ConfigError
      - environment param omitted → prefer "live", fall back to "sandbox" only if "live" absent
   c. Pick secretKey or publicKey based on the endpoint category (see 5.3).
   d. Config file is exclusive — when present, env vars are NOT silently consulted, so
      multi-app setups behave predictably.
2. No config file → fall back to env vars:
   ADAPTY_SECRET_API_KEY              (default live secret)
   ADAPTY_PUBLIC_API_KEY              (Web API)
   ADAPTY_SECRET_API_KEY_SANDBOX      (optional)
   ADAPTY_PUBLIC_API_KEY_SANDBOX      (optional)
   - environment="sandbox" requires the *_SANDBOX vars; missing → ConfigError.
   - environment omitted defaults to live.
3. Neither config nor env vars → ConfigError; tool result returns explicit setup guidance.
```

### 5.2 Config File Schema

```jsonc
{
  "default": "my-app",
  "apps": {
    "my-app": {
      "live":    { "secretKey": "secret_live_...",  "publicKey": "public_live_..." },
      "sandbox": { "secretKey": "secret_stag_...",  "publicKey": "public_stag_..." }
    },
    "client-x-app": { "live": { "secretKey": "..." } }
  }
}
```

Validated by Zod at startup. File mode > 0600 → non-blocking warning to stderr.

### 5.3 Per-Request Headers

- `Authorization: Api-Key <secret-or-public>` chosen by endpoint category.
- `adapty-profile-id` or `adapty-customer-user-id` — exactly one is required for Server-Side API endpoints. Tool input validates `oneOf` (Zod refinement); passing both raises a validation error before any HTTP call.
- Optional `adapty-platform` (`iOS` | `macOS` | `iPadOS` | `visionOS` | `Android` | `web`).
- `Content-Type: application/json`.

### 5.4 Secret Safety

- All log lines, error messages, and tool result `content` strings pass through `redact.ts`, which masks any token matching `^(secret|public)_(live|stag)_[A-Za-z0-9._-]+` to `<prefix>_***<last4>`.
- Config file mode warning at load time.

## 6. Tool Inventory

Naming: `adapty_<group>_<verb>`. Each tool's `inputSchema` is a strict Zod schema; descriptions include a one-line use case to help LLM tool selection.

### 6.1 Server-Side API v2 (12)

| Tool | Method | Path |
|---|---|---|
| `adapty_profile_get` | GET | `/profile` |
| `adapty_profile_create` | POST | `/profile` |
| `adapty_profile_update` | PUT | `/profile` |
| `adapty_profile_delete` | DELETE | `/profile` |
| `adapty_access_level_grant` | POST | `/access-level` |
| `adapty_access_level_revoke` | DELETE | `/access-level` |
| `adapty_transaction_set` | POST | `/transaction` |
| `adapty_stripe_purchase_validate` | POST | `/stripe-purchase` |
| `adapty_integration_identifiers_set` | POST | `/integration-identifiers` |
| `adapty_paywall_get` | GET | `/paywall` |
| `adapty_paywalls_list` | GET | `/paywalls` |
| `adapty_paywall_update` | PUT | `/paywall` |

### 6.2 Server-Side API v1 (Legacy, ~10)

Mirror of v2 against the v1 path prefix. Each tool description prefixed with `[LEGACY — prefer v2]`. Exact list confirmed against `https://adapty.io/docs/server-side-api-specs-legacy` during the implementation plan.

### 6.3 Web API (3)

Use public API key. Endpoints confirmed against `https://adapty.io/docs/web-api-requests`.

- `adapty_web_paywall_get`
- `adapty_web_paywall_view_record`
- `adapty_web_attribution_set`

### 6.4 Analytics Export API (3-4)

Base: `api-admin.adapty.io/api/v1/client-api/`.

- `adapty_analytics_query` — POST `/metrics/analytics/`, params: metric, filters, group-by, date range.
- `adapty_analytics_cohorts_query` — cohort retention metrics.
- `adapty_analytics_export_csv` — CSV export, if a distinct endpoint exists.

Final shape confirmed during implementation plan after fetching `https://adapty.io/docs/api-export-analytics` with a richer extractor.

### 6.5 Webhooks (2 local tools)

- `adapty_webhook_signature_verify` — input: raw body, signature header, webhook secret. Output: `{ valid: boolean, reason?: string }`. No network call.
- `adapty_webhook_event_parse` — input: raw JSON body. Output: discriminated union typed event with `eventType`, `profile`, `subscription`, etc. Schema covers every event type from `https://adapty.io/docs/webhook-event-types-and-fields`.

## 7. Testing Strategy

### 7.1 TDD Loop (per tool)

1. Write `tests/unit/tools/<group>/<tool>.test.ts` — red.
2. Add Zod schema validation tests + happy path — red.
3. Implement until unit green.
4. Add `tests/integration/` test exercising the full MCP tool call with mocked fetch.
5. Add edge cases: missing credentials, missing profile id, 4xx, 5xx, 429, timeout, network error.
6. Run coverage; backfill if any threshold drops.

### 7.2 Mock Strategy

- Default: **fetch injection** via `createHttpClient({ fetch: mockFetch })`. Lightweight, no port binding.
- `msw` only when an integration scenario requires multi-request orchestration.
- Fixtures under `tests/fixtures/` organised by endpoint path; payloads sourced from official Adapty doc examples.

### 7.3 Test Layers

- `tests/unit/` — schemas, auth resolver, header builder, redact, http error mapping, webhook signature verifier.
- `tests/integration/` — tool invocation through the MCP server.
- `tests/contract/` — Adapty doc-example payloads validated against our schemas; catches drift when fields are added.

### 7.4 Coverage & CI

- `vitest.config.ts`:
  ```ts
  coverage: {
    provider: 'v8',
    thresholds: { lines: 90, branches: 85, functions: 90, statements: 90 },
    reporter: ['text', 'lcov', 'html'],
  }
  ```
- CI fails on: threshold miss, any failing test, `tsc --noEmit` failure, `npm run lint` failure.
- Local: `npm test`, `npm run test:coverage`, `npm run typecheck`.

## 8. Error Handling, Rate Limit, Observability

- **`AdaptyApiError`** retains: `status`, Adapty `request_id`, error code, redacted body excerpt.
- **Timeout**: default 30s, override via `ADAPTY_HTTP_TIMEOUT_MS`.
- **Retry**: GET-only on 429/502/503/504, exponential backoff, max 3. Mutating verbs never auto-retry to avoid double-charging.
- **Rate limit**: advisory client-side token bucket at 40k/min/app, soft warning only. Adapty's own 429 remains the source of truth.
- **Logging**: stderr only, includes `request_id`, never prints raw secret. `ADAPTY_MCP_DEBUG=1` enables redacted body excerpts.

## 9. Distribution

- npm package: `adapty-mcp`, starts at `0.1.0`.
- bin: `adapty-mcp`.
- Package files: `dist/`, `README.md`, `LICENSE`.
- `prepublishOnly` runs build.
- License: MIT.
- `smithery.yaml` modeled on the two existing MCPs in this repo.
- README sections: Quick start (env var), Multi-app config, Tool catalog.
- Tool catalog generated from the live tool registry by `scripts/gen-tool-docs.ts` and embedded into README on each release.

## 10. Open Items (resolved during implementation plan)

1. Confirm exact list of Legacy v1 endpoints from `https://adapty.io/docs/server-side-api-specs-legacy`.
2. Confirm Analytics Export API auth header format (assumed secret key; verify).
3. Confirm Web API exact path structure and whether `record paywall view` requires both public key and a profile id.
4. Confirm webhook signature algorithm (HMAC-SHA256 assumed; verify) from `https://adapty.io/docs/webhook-event-types-and-fields` or related setup doc.

These do not block design approval — each is a documentation lookup at the start of the relevant implementation milestone.
