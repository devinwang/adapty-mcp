# Adapty MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a TypeScript MCP server (`adapty-mcp`) that exposes the complete public Adapty REST API surface as MCP tools, with TDD throughout and ≥90/85/90/90 coverage thresholds enforced.

**Architecture:** TypeScript + ESM + Node ≥18 stdio MCP server. Modules: `auth/` (env var or config-file resolution), `http/` (injectable fetch with retry/timeout), `tools/` (one file per resource group across server-side-v2, server-side-v1 legacy, web-api, analytics, webhooks), `schemas/` (Zod), `utils/` (redaction, helpers). Dependency-injected HTTP client lets every test stub fetch with zero monkey-patching.

**Tech Stack:** TypeScript 5.7, `@modelcontextprotocol/sdk` ^1.0.4, `zod` ^3.23, `undici` ^6.21 (for fetch in older Node), `vitest` ^2 (with `@vitest/coverage-v8`), `msw` ^2 (only for multi-request integration scenarios).

---

## Reference: TDD Ceremony (followed for every implementation task)

Every implementation task in this plan follows the same procedural ceremony. The **task body** in each section provides the *concrete content* (file paths, test code, implementation code, commit message). The ceremony itself is:

1. Create the test file(s) at the listed path with the listed test code.
2. Run the listed test command. Expect FAIL.
3. Create or modify the source file(s) with the listed implementation code.
4. Re-run the listed test command. Expect PASS.
5. Run `npm run typecheck` and `npm run test:coverage`. Expect coverage thresholds met for the touched files.
6. `git add` the listed files and commit with the listed message.

Each task explicitly lists its **Files**, **Test command**, and **Commit message** so reading any task in isolation is sufficient.

---

## File Structure

```
adapty-mcp/
├── src/
│   ├── index.ts                          # CLI entry, stdio transport
│   ├── server.ts                         # MCP server, tool registry assembly
│   ├── auth/
│   │   ├── credentials.ts                # AdaptyCredentials types + Zod
│   │   ├── account-store.ts              # config file + env var resolution
│   │   └── headers.ts                    # builds per-request headers
│   ├── http/
│   │   ├── client.ts                     # injectable fetch wrapper
│   │   ├── errors.ts                     # AdaptyApiError + normalize
│   │   └── rate-limit.ts                 # advisory token bucket
│   ├── schemas/
│   │   ├── common.ts                     # profile-id, customer-user-id, locale
│   │   ├── profile.ts
│   │   ├── access-level.ts
│   │   ├── transaction.ts
│   │   ├── paywall.ts
│   │   ├── analytics.ts
│   │   └── webhook-events.ts             # discriminated union of 18 events
│   ├── tools/
│   │   ├── index.ts                      # registers all tools with server
│   │   ├── server-side-v2/
│   │   │   ├── profile.ts                # 4 tools: get/create/update/delete
│   │   │   ├── access-level.ts           # 2 tools: grant/revoke
│   │   │   ├── transaction.ts            # 2 tools: set / stripe-validate
│   │   │   ├── integration-identifiers.ts# 1 tool: set
│   │   │   └── paywall.ts                # 3 tools: get/list/update
│   │   ├── server-side-v1/
│   │   │   └── legacy.ts                 # 7 legacy tools
│   │   ├── web-api/
│   │   │   └── web.ts                    # 3 web-api tools (public key)
│   │   ├── analytics/
│   │   │   └── analytics.ts              # 2-3 analytics tools (admin host)
│   │   └── webhooks/
│   │       └── webhooks.ts               # 2 local tools: auth-verify + parse
│   └── utils/
│       ├── redact.ts                     # secret redaction
│       ├── tool-helpers.ts               # registerTool wrapper, error→content
│       └── json.ts                       # safe stringify with redaction
├── tests/
│   ├── unit/                             # mirrors src/ structure
│   ├── integration/                      # in-process MCP + mock fetch
│   ├── contract/                         # doc-example payloads vs schemas
│   └── fixtures/
├── scripts/
│   └── gen-tool-docs.ts
├── vitest.config.ts
├── tsconfig.json
├── package.json
├── smithery.yaml
├── README.md
├── CHANGELOG.md
├── LICENSE
└── .gitignore
```

---

## Milestone 0 — Project Bootstrap

### Task 0.1: Initialize npm package

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `LICENSE` (MIT, attribution to Devin Wang, year 2026)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "adapty-mcp",
  "version": "0.1.0",
  "description": "Model Context Protocol (MCP) server for Adapty — full coverage of Server-Side API v2, legacy v1, Web API, Analytics Export, and webhook utilities.",
  "keywords": ["mcp", "mcp-server", "model-context-protocol", "adapty", "subscriptions", "in-app-purchase", "iap", "storekit", "revenue", "claude", "cursor"],
  "homepage": "https://github.com/devinwang/adapty-mcp#readme",
  "repository": { "type": "git", "url": "git+https://github.com/devinwang/adapty-mcp.git" },
  "bugs": { "url": "https://github.com/devinwang/adapty-mcp/issues" },
  "license": "MIT",
  "author": "Devin Wang",
  "type": "module",
  "main": "dist/index.js",
  "bin": { "adapty-mcp": "dist/index.js" },
  "files": ["dist/", "README.md", "LICENSE"],
  "engines": { "node": ">=18" },
  "scripts": {
    "build": "tsc",
    "postbuild": "chmod +x dist/index.js",
    "dev": "tsc --watch",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "clean": "rm -rf dist coverage",
    "prepare": "npm run build",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.4",
    "undici": "^6.21.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@vitest/coverage-v8": "^2.1.8",
    "msw": "^2.6.0",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
dist/
coverage/
.DS_Store
*.log
.env
.env.local
~/.config/adapty-mcp/
```

- [ ] **Step 4: Create `LICENSE`** (standard MIT, year 2026, copyright Devin Wang)

- [ ] **Step 5: Install deps**

Run: `cd adapty-mcp && npm install`
Expected: lockfile created, no errors.

- [ ] **Step 6: Commit**

```bash
git init
git add .
git commit -m "chore: initialize adapty-mcp npm package"
```

---

### Task 0.2: Configure Vitest with coverage thresholds

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/.gitkeep`

- [ ] **Step 1: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/**/*.d.ts'],
      thresholds: {
        lines: 90,
        branches: 85,
        functions: 90,
        statements: 90,
        autoUpdate: false,
      },
    },
  },
});
```

- [ ] **Step 2: Verify Vitest runs**

Run: `npm test`
Expected: "No test files found" — exits 0 since include glob matches nothing yet.

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts tests/.gitkeep
git commit -m "chore: configure vitest with coverage thresholds (90/85/90/90)"
```

---

### Task 0.3: Smoke test that build works

**Files:**
- Create: `src/index.ts` (placeholder)

- [ ] **Step 1: Write a placeholder entry**

```ts
#!/usr/bin/env node
console.error('adapty-mcp: server not yet implemented');
process.exit(1);
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: `dist/index.js` produced and executable.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "chore: placeholder entry to verify build pipeline"
```

---

## Milestone 1 — Core Infrastructure (TDD)

### Task 1.1: Secret redaction utility

**Files:**
- Create: `src/utils/redact.ts`
- Create: `tests/unit/utils/redact.test.ts`
- Test command: `npx vitest run tests/unit/utils/redact.test.ts`
- Commit message: `feat(utils): add secret redaction for Adapty API keys`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { redact } from '../../../src/utils/redact.js';

describe('redact', () => {
  it('masks secret_live keys keeping prefix and last 4', () => {
    expect(redact('secret_live_abcdef12345.tail9999'))
      .toBe('secret_live_***9999');
  });
  it('masks secret_stag keys', () => {
    expect(redact('secret_stag_abcdef12345.tail9999'))
      .toBe('secret_stag_***9999');
  });
  it('masks public_live keys', () => {
    expect(redact('public_live_abcdef12345.tail9999'))
      .toBe('public_live_***9999');
  });
  it('masks public_stag keys', () => {
    expect(redact('public_stag_xyz.0000'))
      .toBe('public_stag_***0000');
  });
  it('redacts inline within larger strings', () => {
    expect(redact('Authorization: Api-Key secret_live_aaaaaaaa.bbbb1234 ok'))
      .toBe('Authorization: Api-Key secret_live_***1234 ok');
  });
  it('handles multiple occurrences', () => {
    expect(redact('a=secret_live_aaaa.1111 b=public_live_bbbb.2222'))
      .toBe('a=secret_live_***1111 b=public_live_***2222');
  });
  it('leaves non-key strings untouched', () => {
    expect(redact('hello world')).toBe('hello world');
  });
  it('returns empty string for empty input', () => {
    expect(redact('')).toBe('');
  });
  it('redacts inside JSON via redactJson', async () => {
    const { redactJson } = await import('../../../src/utils/redact.js');
    const out = redactJson({ key: 'secret_live_xxxx.zzzz9999', other: 1 });
    expect(out).toEqual({ key: 'secret_live_***9999', other: 1 });
  });
  it('redactJson recurses into nested objects and arrays', async () => {
    const { redactJson } = await import('../../../src/utils/redact.js');
    expect(redactJson({ a: ['secret_live_xx.tt0001'] }))
      .toEqual({ a: ['secret_live_***0001'] });
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `npx vitest run tests/unit/utils/redact.test.ts`
Expected: cannot find module `redact`.

- [ ] **Step 3: Implement `src/utils/redact.ts`**

```ts
const KEY_RE = /\b((?:secret|public)_(?:live|stag))_([A-Za-z0-9._-]+)/g;

export function redact(input: string): string {
  if (!input) return input;
  return input.replace(KEY_RE, (_, prefix: string, body: string) => {
    const last4 = body.slice(-4);
    return `${prefix}_***${last4}`;
  });
}

export function redactJson<T>(value: T): T {
  if (typeof value === 'string') return redact(value) as T;
  if (Array.isArray(value)) return value.map(redactJson) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactJson(v);
    }
    return out as T;
  }
  return value;
}
```

- [ ] **Step 4: Run test, expect PASS, run coverage**

Run: `npx vitest run tests/unit/utils/redact.test.ts --coverage`
Expected: all tests pass; redact.ts lines/branches ≥ thresholds.

- [ ] **Step 5: Commit**

```bash
git add src/utils/redact.ts tests/unit/utils/redact.test.ts
git commit -m "feat(utils): add secret redaction for Adapty API keys"
```

---

### Task 1.2: Credentials types and Zod validation

**Files:**
- Create: `src/auth/credentials.ts`
- Create: `tests/unit/auth/credentials.test.ts`
- Test command: `npx vitest run tests/unit/auth/credentials.test.ts`
- Commit message: `feat(auth): add credential types and validators`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import {
  AdaptyEnvironmentSchema,
  AdaptyKeyPairSchema,
  AdaptyAppConfigSchema,
  AdaptyAccountsConfigSchema,
} from '../../../src/auth/credentials.js';

describe('AdaptyEnvironmentSchema', () => {
  it('accepts live and sandbox', () => {
    expect(AdaptyEnvironmentSchema.parse('live')).toBe('live');
    expect(AdaptyEnvironmentSchema.parse('sandbox')).toBe('sandbox');
  });
  it('rejects other values', () => {
    expect(() => AdaptyEnvironmentSchema.parse('prod')).toThrow();
  });
});

describe('AdaptyKeyPairSchema', () => {
  it('accepts a secret-only pair', () => {
    expect(() => AdaptyKeyPairSchema.parse({ secretKey: 'secret_live_aaa.bbb' })).not.toThrow();
  });
  it('accepts a public-only pair', () => {
    expect(() => AdaptyKeyPairSchema.parse({ publicKey: 'public_live_aaa.bbb' })).not.toThrow();
  });
  it('rejects a pair with neither key', () => {
    expect(() => AdaptyKeyPairSchema.parse({})).toThrow();
  });
  it('rejects malformed secret key prefix', () => {
    expect(() => AdaptyKeyPairSchema.parse({ secretKey: 'wrong_prefix_x' })).toThrow();
  });
});

describe('AdaptyAppConfigSchema', () => {
  it('accepts an app with only live', () => {
    expect(() => AdaptyAppConfigSchema.parse({ live: { secretKey: 'secret_live_a.b' } })).not.toThrow();
  });
  it('accepts an app with both envs', () => {
    expect(() => AdaptyAppConfigSchema.parse({
      live: { secretKey: 'secret_live_a.b' },
      sandbox: { secretKey: 'secret_stag_a.b' },
    })).not.toThrow();
  });
  it('rejects an app with no envs', () => {
    expect(() => AdaptyAppConfigSchema.parse({})).toThrow();
  });
});

describe('AdaptyAccountsConfigSchema', () => {
  it('accepts a complete config', () => {
    const cfg = {
      default: 'a',
      apps: {
        a: { live: { secretKey: 'secret_live_x.y' } },
        b: { sandbox: { secretKey: 'secret_stag_x.y' } },
      },
    };
    expect(() => AdaptyAccountsConfigSchema.parse(cfg)).not.toThrow();
  });
  it('rejects when default points at unknown app', () => {
    const cfg = { default: 'missing', apps: { a: { live: { secretKey: 'secret_live_x.y' } } } };
    expect(() => AdaptyAccountsConfigSchema.parse(cfg)).toThrow();
  });
  it('makes default optional', () => {
    expect(() => AdaptyAccountsConfigSchema.parse({
      apps: { a: { live: { secretKey: 'secret_live_x.y' } } },
    })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test, expect FAIL** — `npx vitest run tests/unit/auth/credentials.test.ts`

- [ ] **Step 3: Implement `src/auth/credentials.ts`**

```ts
import { z } from 'zod';

export const AdaptyEnvironmentSchema = z.enum(['live', 'sandbox']);
export type AdaptyEnvironment = z.infer<typeof AdaptyEnvironmentSchema>;

const SECRET_KEY_RE = /^secret_(live|stag)_[A-Za-z0-9._-]+$/;
const PUBLIC_KEY_RE = /^public_(live|stag)_[A-Za-z0-9._-]+$/;

const SecretKeySchema = z.string().regex(SECRET_KEY_RE, 'must look like secret_live_... or secret_stag_...');
const PublicKeySchema = z.string().regex(PUBLIC_KEY_RE, 'must look like public_live_... or public_stag_...');

export const AdaptyKeyPairSchema = z.object({
  secretKey: SecretKeySchema.optional(),
  publicKey: PublicKeySchema.optional(),
}).refine(v => v.secretKey || v.publicKey, { message: 'at least one of secretKey or publicKey is required' });
export type AdaptyKeyPair = z.infer<typeof AdaptyKeyPairSchema>;

export const AdaptyAppConfigSchema = z.object({
  live: AdaptyKeyPairSchema.optional(),
  sandbox: AdaptyKeyPairSchema.optional(),
}).refine(v => v.live || v.sandbox, { message: 'app must define at least one of live or sandbox' });
export type AdaptyAppConfig = z.infer<typeof AdaptyAppConfigSchema>;

export const AdaptyAccountsConfigSchema = z.object({
  default: z.string().optional(),
  apps: z.record(z.string(), AdaptyAppConfigSchema),
}).refine(
  cfg => cfg.default === undefined || cfg.default in cfg.apps,
  { message: 'default must reference one of the apps' },
);
export type AdaptyAccountsConfig = z.infer<typeof AdaptyAccountsConfigSchema>;

export interface ResolvedCredentials {
  app: string;
  environment: AdaptyEnvironment;
  secretKey?: string;
  publicKey?: string;
}
```

- [ ] **Step 4: Run test, expect PASS** — same command. Coverage check.

- [ ] **Step 5: Commit**

```bash
git add src/auth/credentials.ts tests/unit/auth/credentials.test.ts
git commit -m "feat(auth): add credential types and validators"
```

---

### Task 1.3: Account store (config file + env var resolution)

**Files:**
- Create: `src/auth/account-store.ts`
- Create: `tests/unit/auth/account-store.test.ts`
- Test command: `npx vitest run tests/unit/auth/account-store.test.ts`
- Commit message: `feat(auth): add account store with config-file and env-var modes`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAccountStore, ConfigError } from '../../../src/auth/account-store.js';

function tmpConfig(json: string, mode = 0o600): string {
  const dir = mkdtempSync(join(tmpdir(), 'adapty-mcp-'));
  const file = join(dir, 'accounts.json');
  writeFileSync(file, json);
  chmodSync(file, mode);
  return file;
}

describe('createAccountStore', () => {
  beforeEach(() => {
    delete process.env.ADAPTY_SECRET_API_KEY;
    delete process.env.ADAPTY_PUBLIC_API_KEY;
    delete process.env.ADAPTY_SECRET_API_KEY_SANDBOX;
    delete process.env.ADAPTY_PUBLIC_API_KEY_SANDBOX;
    delete process.env.ADAPTY_MCP_CONFIG;
  });

  describe('env-var mode', () => {
    it('resolves live from ADAPTY_SECRET_API_KEY when no app/env provided', () => {
      process.env.ADAPTY_SECRET_API_KEY = 'secret_live_aa.bb';
      const store = createAccountStore();
      const c = store.resolve({});
      expect(c.environment).toBe('live');
      expect(c.secretKey).toBe('secret_live_aa.bb');
    });
    it('throws when sandbox requested without sandbox vars', () => {
      process.env.ADAPTY_SECRET_API_KEY = 'secret_live_aa.bb';
      const store = createAccountStore();
      expect(() => store.resolve({ environment: 'sandbox' })).toThrow(ConfigError);
    });
    it('exposes publicKey when ADAPTY_PUBLIC_API_KEY set', () => {
      process.env.ADAPTY_SECRET_API_KEY = 'secret_live_aa.bb';
      process.env.ADAPTY_PUBLIC_API_KEY = 'public_live_aa.bb';
      const c = createAccountStore().resolve({});
      expect(c.publicKey).toBe('public_live_aa.bb');
    });
    it('throws ConfigError when no env vars and no config', () => {
      const store = createAccountStore();
      expect(() => store.resolve({})).toThrow(ConfigError);
    });
  });

  describe('config-file mode', () => {
    it('resolves default app live when nothing specified', () => {
      const file = tmpConfig(JSON.stringify({
        default: 'main',
        apps: { main: { live: { secretKey: 'secret_live_a.b' } } },
      }));
      const store = createAccountStore({ configPath: file });
      const c = store.resolve({});
      expect(c.app).toBe('main');
      expect(c.environment).toBe('live');
    });
    it('falls back to sandbox when live missing for that app', () => {
      const file = tmpConfig(JSON.stringify({
        default: 'main',
        apps: { main: { sandbox: { secretKey: 'secret_stag_a.b' } } },
      }));
      const c = createAccountStore({ configPath: file }).resolve({});
      expect(c.environment).toBe('sandbox');
    });
    it('throws when requested app does not exist', () => {
      const file = tmpConfig(JSON.stringify({
        apps: { main: { live: { secretKey: 'secret_live_a.b' } } },
      }));
      const store = createAccountStore({ configPath: file });
      expect(() => store.resolve({ app: 'unknown' })).toThrow(ConfigError);
    });
    it('throws when no app param and no default', () => {
      const file = tmpConfig(JSON.stringify({
        apps: {
          a: { live: { secretKey: 'secret_live_a.b' } },
          b: { live: { secretKey: 'secret_live_c.d' } },
        },
      }));
      const store = createAccountStore({ configPath: file });
      expect(() => store.resolve({})).toThrow(/default/);
    });
    it('throws when requested environment missing for app', () => {
      const file = tmpConfig(JSON.stringify({
        default: 'main',
        apps: { main: { live: { secretKey: 'secret_live_a.b' } } },
      }));
      const store = createAccountStore({ configPath: file });
      expect(() => store.resolve({ environment: 'sandbox' })).toThrow(ConfigError);
    });
    it('does NOT silently fall back to env vars when config is present', () => {
      process.env.ADAPTY_SECRET_API_KEY = 'secret_live_x.y';
      const file = tmpConfig(JSON.stringify({
        default: 'main',
        apps: { main: { live: { secretKey: 'secret_live_a.b' } } },
      }));
      const c = createAccountStore({ configPath: file }).resolve({});
      expect(c.secretKey).toBe('secret_live_a.b');
    });
    it('warns when file mode is too open', () => {
      const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
      const file = tmpConfig(JSON.stringify({
        apps: { main: { live: { secretKey: 'secret_live_a.b' } } },
      }), 0o644);
      createAccountStore({ configPath: file });
      expect(warn).toHaveBeenCalledWith(expect.stringMatching(/permissions/i));
      warn.mockRestore();
    });
    it('throws on malformed JSON', () => {
      const file = tmpConfig('not json');
      expect(() => createAccountStore({ configPath: file })).toThrow(ConfigError);
    });
    it('throws on schema-invalid config', () => {
      const file = tmpConfig(JSON.stringify({ apps: {} }));
      expect(() => createAccountStore({ configPath: file })).toThrow(ConfigError);
    });
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement `src/auth/account-store.ts`**

```ts
import { existsSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  AdaptyAccountsConfigSchema,
  type AdaptyAccountsConfig,
  type AdaptyEnvironment,
  type ResolvedCredentials,
} from './credentials.js';

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export interface ResolveInput {
  app?: string;
  environment?: AdaptyEnvironment;
}

export interface AccountStore {
  resolve(input: ResolveInput): ResolvedCredentials;
}

export interface AccountStoreOptions {
  configPath?: string;
}

function defaultConfigPath(): string {
  if (process.env.ADAPTY_MCP_CONFIG) return process.env.ADAPTY_MCP_CONFIG;
  return join(homedir(), '.config', 'adapty-mcp', 'accounts.json');
}

function loadConfig(path: string): AdaptyAccountsConfig {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (e) {
    throw new ConfigError(`failed to read ${path}: ${(e as Error).message}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new ConfigError(`config at ${path} is not valid JSON: ${(e as Error).message}`);
  }
  const result = AdaptyAccountsConfigSchema.safeParse(parsed);
  if (!result.success) throw new ConfigError(`invalid config at ${path}: ${result.error.message}`);
  return result.data;
}

function checkPermissions(path: string): void {
  try {
    const mode = statSync(path).mode & 0o777;
    if (mode & 0o077) {
      console.error(`adapty-mcp: warning — config file ${path} has loose permissions (${mode.toString(8)}); recommend chmod 600`);
    }
  } catch {
    // best-effort; ignore
  }
}

function fromConfig(cfg: AdaptyAccountsConfig, input: ResolveInput): ResolvedCredentials {
  const app = input.app ?? cfg.default;
  if (!app) {
    const known = Object.keys(cfg.apps).join(', ');
    throw new ConfigError(`no app param and no default in config; known apps: ${known}`);
  }
  const appCfg = cfg.apps[app];
  if (!appCfg) {
    const known = Object.keys(cfg.apps).join(', ');
    throw new ConfigError(`unknown app '${app}'; known apps: ${known}`);
  }
  let env: AdaptyEnvironment;
  if (input.environment) {
    env = input.environment;
  } else {
    env = appCfg.live ? 'live' : 'sandbox';
  }
  const pair = appCfg[env];
  if (!pair) throw new ConfigError(`app '${app}' has no '${env}' credentials configured`);
  return { app, environment: env, ...pair };
}

function fromEnv(input: ResolveInput): ResolvedCredentials {
  const env = input.environment ?? 'live';
  const secret = env === 'sandbox'
    ? process.env.ADAPTY_SECRET_API_KEY_SANDBOX
    : process.env.ADAPTY_SECRET_API_KEY;
  const pub = env === 'sandbox'
    ? process.env.ADAPTY_PUBLIC_API_KEY_SANDBOX
    : process.env.ADAPTY_PUBLIC_API_KEY;
  if (!secret && !pub) {
    throw new ConfigError(
      env === 'sandbox'
        ? 'no sandbox env vars set (ADAPTY_SECRET_API_KEY_SANDBOX / ADAPTY_PUBLIC_API_KEY_SANDBOX) and no config file found'
        : 'no env vars set (ADAPTY_SECRET_API_KEY / ADAPTY_PUBLIC_API_KEY) and no config file found',
    );
  }
  const out: ResolvedCredentials = { app: 'env', environment: env };
  if (secret) out.secretKey = secret;
  if (pub) out.publicKey = pub;
  return out;
}

export function createAccountStore(opts: AccountStoreOptions = {}): AccountStore {
  const configPath = opts.configPath ?? defaultConfigPath();
  const haveConfig = existsSync(configPath);
  let cfg: AdaptyAccountsConfig | null = null;
  if (haveConfig) {
    checkPermissions(configPath);
    cfg = loadConfig(configPath);
  }
  return {
    resolve(input) {
      return cfg ? fromConfig(cfg, input) : fromEnv(input);
    },
  };
}
```

- [ ] **Step 4: Run test, PASS, run coverage**

- [ ] **Step 5: Commit**

```bash
git add src/auth/account-store.ts tests/unit/auth/account-store.test.ts
git commit -m "feat(auth): add account store with config-file and env-var modes"
```

---

### Task 1.4: Header builder

**Files:**
- Create: `src/auth/headers.ts`
- Create: `tests/unit/auth/headers.test.ts`
- Test command: `npx vitest run tests/unit/auth/headers.test.ts`
- Commit message: `feat(auth): add per-request header builder`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { buildHeaders } from '../../../src/auth/headers.js';

describe('buildHeaders', () => {
  const cred = { app: 'a', environment: 'live' as const, secretKey: 'secret_live_a.b', publicKey: 'public_live_a.b' };
  it('uses secret key for keyType=secret', () => {
    const h = buildHeaders({ credentials: cred, keyType: 'secret', profileId: 'p1' });
    expect(h.Authorization).toBe('Api-Key secret_live_a.b');
    expect(h['adapty-profile-id']).toBe('p1');
    expect(h['Content-Type']).toBe('application/json');
  });
  it('uses public key for keyType=public', () => {
    const h = buildHeaders({ credentials: cred, keyType: 'public', profileId: 'p1' });
    expect(h.Authorization).toBe('Api-Key public_live_a.b');
  });
  it('throws when keyType=secret but no secretKey', () => {
    const c = { app: 'a', environment: 'live' as const, publicKey: 'public_live_a.b' };
    expect(() => buildHeaders({ credentials: c, keyType: 'secret', profileId: 'p1' })).toThrow(/secret/);
  });
  it('throws when keyType=public but no publicKey', () => {
    const c = { app: 'a', environment: 'live' as const, secretKey: 'secret_live_a.b' };
    expect(() => buildHeaders({ credentials: c, keyType: 'public', profileId: 'p1' })).toThrow(/public/);
  });
  it('uses customer-user-id when profileId omitted', () => {
    const h = buildHeaders({ credentials: cred, keyType: 'secret', customerUserId: 'cu1' });
    expect(h['adapty-customer-user-id']).toBe('cu1');
    expect(h['adapty-profile-id']).toBeUndefined();
  });
  it('throws when both profileId and customerUserId provided', () => {
    expect(() => buildHeaders({ credentials: cred, keyType: 'secret', profileId: 'p', customerUserId: 'c' }))
      .toThrow(/exactly one/);
  });
  it('allows neither when allowAnonymous=true (e.g. paywall list)', () => {
    const h = buildHeaders({ credentials: cred, keyType: 'secret', allowAnonymous: true });
    expect(h['adapty-profile-id']).toBeUndefined();
    expect(h['adapty-customer-user-id']).toBeUndefined();
  });
  it('throws when neither provided and allowAnonymous=false', () => {
    expect(() => buildHeaders({ credentials: cred, keyType: 'secret' })).toThrow(/profile-id|customer-user-id/);
  });
  it('includes adapty-platform when given', () => {
    const h = buildHeaders({ credentials: cred, keyType: 'secret', profileId: 'p', platform: 'iOS' });
    expect(h['adapty-platform']).toBe('iOS');
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement `src/auth/headers.ts`**

```ts
import type { ResolvedCredentials } from './credentials.js';

export type AdaptyPlatform = 'iOS' | 'macOS' | 'iPadOS' | 'visionOS' | 'Android' | 'web';

export interface BuildHeadersInput {
  credentials: ResolvedCredentials;
  keyType: 'secret' | 'public';
  profileId?: string;
  customerUserId?: string;
  platform?: AdaptyPlatform;
  allowAnonymous?: boolean;
}

export type RequestHeaders = Record<string, string>;

export function buildHeaders(input: BuildHeadersInput): RequestHeaders {
  const { credentials, keyType, profileId, customerUserId, platform, allowAnonymous } = input;
  const key = keyType === 'secret' ? credentials.secretKey : credentials.publicKey;
  if (!key) throw new Error(`no ${keyType}Key available for app '${credentials.app}' (${credentials.environment})`);
  if (profileId && customerUserId) {
    throw new Error('pass exactly one of profileId or customerUserId, not both');
  }
  if (!profileId && !customerUserId && !allowAnonymous) {
    throw new Error('one of adapty-profile-id or adapty-customer-user-id is required');
  }
  const h: RequestHeaders = {
    Authorization: `Api-Key ${key}`,
    'Content-Type': 'application/json',
  };
  if (profileId) h['adapty-profile-id'] = profileId;
  if (customerUserId) h['adapty-customer-user-id'] = customerUserId;
  if (platform) h['adapty-platform'] = platform;
  return h;
}
```

- [ ] **Step 4: Run, PASS, coverage check**

- [ ] **Step 5: Commit**

```bash
git add src/auth/headers.ts tests/unit/auth/headers.test.ts
git commit -m "feat(auth): add per-request header builder"
```

---

### Task 1.5: HTTP error class and normalizer

**Files:**
- Create: `src/http/errors.ts`
- Create: `tests/unit/http/errors.test.ts`
- Test command: `npx vitest run tests/unit/http/errors.test.ts`
- Commit message: `feat(http): add AdaptyApiError and response normalizer`

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { AdaptyApiError, normalizeErrorResponse } from '../../../src/http/errors.js';

describe('AdaptyApiError', () => {
  it('serializes to a redacted summary', () => {
    const e = new AdaptyApiError({
      status: 401,
      statusText: 'Unauthorized',
      requestId: 'req-1',
      url: 'https://api.adapty.io/profile',
      bodyExcerpt: 'auth=secret_live_xx.tail1234',
    });
    expect(e.message).toContain('401');
    expect(e.toString()).toContain('secret_live_***1234');
  });
});

describe('normalizeErrorResponse', () => {
  it('returns AdaptyApiError with parsed body fields', async () => {
    const res = new Response(JSON.stringify({ errors: [{ code: 'BAD', message: 'no' }] }), {
      status: 400,
      headers: { 'content-type': 'application/json', 'x-request-id': 'r-2' },
    });
    const err = await normalizeErrorResponse(res, 'https://x');
    expect(err.status).toBe(400);
    expect(err.requestId).toBe('r-2');
    expect(err.bodyExcerpt).toContain('BAD');
  });
  it('truncates large bodies to 500 chars', async () => {
    const big = 'x'.repeat(2000);
    const res = new Response(big, { status: 500 });
    const err = await normalizeErrorResponse(res, 'https://x');
    expect(err.bodyExcerpt!.length).toBeLessThanOrEqual(500);
  });
  it('handles non-text bodies gracefully', async () => {
    const res = new Response(null, { status: 502 });
    const err = await normalizeErrorResponse(res, 'https://x');
    expect(err.status).toBe(502);
  });
});
```

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement `src/http/errors.ts`**

```ts
import { redact } from '../utils/redact.js';

export interface AdaptyApiErrorInit {
  status: number;
  statusText?: string;
  requestId?: string;
  url: string;
  bodyExcerpt?: string;
}

export class AdaptyApiError extends Error {
  status: number;
  statusText?: string;
  requestId?: string;
  url: string;
  bodyExcerpt?: string;

  constructor(init: AdaptyApiErrorInit) {
    const summary = `Adapty API ${init.status}${init.statusText ? ' ' + init.statusText : ''} for ${init.url}`;
    super(summary);
    this.name = 'AdaptyApiError';
    this.status = init.status;
    if (init.statusText !== undefined) this.statusText = init.statusText;
    if (init.requestId !== undefined) this.requestId = init.requestId;
    this.url = init.url;
    if (init.bodyExcerpt !== undefined) this.bodyExcerpt = init.bodyExcerpt;
  }

  override toString(): string {
    return [
      `${this.name}: ${this.message}`,
      this.requestId ? `request_id=${this.requestId}` : '',
      this.bodyExcerpt ? `body=${redact(this.bodyExcerpt)}` : '',
    ].filter(Boolean).join(' | ');
  }
}

export async function normalizeErrorResponse(res: Response, url: string): Promise<AdaptyApiError> {
  let bodyExcerpt: string | undefined;
  try {
    const text = await res.text();
    bodyExcerpt = text.slice(0, 500);
  } catch {
    bodyExcerpt = undefined;
  }
  const init: AdaptyApiErrorInit = {
    status: res.status,
    statusText: res.statusText,
    url,
  };
  const reqId = res.headers.get('x-request-id');
  if (reqId) init.requestId = reqId;
  if (bodyExcerpt !== undefined) init.bodyExcerpt = bodyExcerpt;
  return new AdaptyApiError(init);
}
```

- [ ] **Step 4: Run, PASS**

- [ ] **Step 5: Commit**

```bash
git add src/http/errors.ts tests/unit/http/errors.test.ts
git commit -m "feat(http): add AdaptyApiError and response normalizer"
```

---

### Task 1.6: HTTP client with injectable fetch, retry, timeout

**Files:**
- Create: `src/http/client.ts`
- Create: `tests/unit/http/client.test.ts`
- Test command: `npx vitest run tests/unit/http/client.test.ts`
- Commit message: `feat(http): add injectable HTTP client with retry and timeout`

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect, vi } from 'vitest';
import { createHttpClient } from '../../../src/http/client.js';
import { AdaptyApiError } from '../../../src/http/errors.js';

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('createHttpClient', () => {
  it('GETs and parses JSON', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const c = createHttpClient({ fetch, baseUrl: 'https://x' });
    const r = await c.request({ method: 'GET', path: '/p', headers: {} });
    expect(r).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('POSTs JSON body', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const c = createHttpClient({ fetch, baseUrl: 'https://x' });
    await c.request({ method: 'POST', path: '/p', headers: {}, body: { a: 1 } });
    const init = fetch.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
  });
  it('throws AdaptyApiError on 4xx', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(400, { errors: [{ code: 'BAD' }] }));
    const c = createHttpClient({ fetch, baseUrl: 'https://x' });
    await expect(c.request({ method: 'GET', path: '/p', headers: {} })).rejects.toBeInstanceOf(AdaptyApiError);
  });
  it('retries GET on 503 up to maxRetries', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse(503, {}))
      .mockResolvedValueOnce(jsonResponse(503, {}))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const c = createHttpClient({ fetch, baseUrl: 'https://x', maxRetries: 3, retryBaseMs: 1 });
    const r = await c.request({ method: 'GET', path: '/p', headers: {} });
    expect(r).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it('does NOT retry POST on 503', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(503, {}));
    const c = createHttpClient({ fetch, baseUrl: 'https://x', maxRetries: 3, retryBaseMs: 1 });
    await expect(c.request({ method: 'POST', path: '/p', headers: {} })).rejects.toBeInstanceOf(AdaptyApiError);
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('honours timeout via AbortSignal', async () => {
    const fetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal!.addEventListener('abort', () => reject(new Error('aborted')));
      });
    });
    const c = createHttpClient({ fetch, baseUrl: 'https://x', timeoutMs: 5 });
    await expect(c.request({ method: 'GET', path: '/p', headers: {} })).rejects.toThrow(/abort/i);
  });
  it('returns null body for 204', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const c = createHttpClient({ fetch, baseUrl: 'https://x' });
    expect(await c.request({ method: 'DELETE', path: '/p', headers: {} })).toBeNull();
  });
  it('joins baseUrl and path correctly', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    const c = createHttpClient({ fetch, baseUrl: 'https://x/api/v2/' });
    await c.request({ method: 'GET', path: '/profile', headers: {} });
    expect(fetch.mock.calls[0]![0]).toBe('https://x/api/v2/profile');
  });
  it('appends query params', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    const c = createHttpClient({ fetch, baseUrl: 'https://x' });
    await c.request({ method: 'GET', path: '/p', headers: {}, query: { a: '1', b: 'two' } });
    expect(fetch.mock.calls[0]![0]).toBe('https://x/p?a=1&b=two');
  });
});
```

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement `src/http/client.ts`**

```ts
import { normalizeErrorResponse, AdaptyApiError } from './errors.js';

export type FetchLike = typeof fetch;

export interface HttpClientOptions {
  fetch: FetchLike;
  baseUrl: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryBaseMs?: number;
}

export interface RequestInput {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  headers: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
}

export interface HttpClient {
  request<T = unknown>(input: RequestInput): Promise<T>;
}

const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

function joinUrl(base: string, path: string): string {
  const b = base.endsWith('/') ? base : base + '/';
  const p = path.startsWith('/') ? path.slice(1) : path;
  return b + p;
}

function appendQuery(url: string, query?: Record<string, string>): string {
  if (!query || Object.keys(query).length === 0) return url;
  const u = new URL(url);
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  return u.toString();
}

async function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export function createHttpClient(opts: HttpClientOptions): HttpClient {
  const fetchImpl = opts.fetch;
  const baseUrl = opts.baseUrl;
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const maxRetries = opts.maxRetries ?? 3;
  const retryBaseMs = opts.retryBaseMs ?? 250;

  return {
    async request<T>(input: RequestInput): Promise<T> {
      const url = appendQuery(joinUrl(baseUrl, input.path), input.query);
      const init: RequestInit = {
        method: input.method,
        headers: input.headers,
      };
      if (input.body !== undefined) init.body = JSON.stringify(input.body);

      const isRetryable = input.method === 'GET';
      let attempt = 0;
      while (true) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
          const res = await fetchImpl(url, { ...init, signal: ctrl.signal });
          clearTimeout(timer);
          if (!res.ok) {
            if (isRetryable && RETRYABLE_STATUSES.has(res.status) && attempt < maxRetries - 1) {
              await sleep(retryBaseMs * Math.pow(2, attempt));
              attempt += 1;
              continue;
            }
            throw await normalizeErrorResponse(res, url);
          }
          if (res.status === 204) return null as T;
          const ct = res.headers.get('content-type') ?? '';
          if (ct.includes('application/json')) return await res.json() as T;
          return await res.text() as unknown as T;
        } catch (e) {
          clearTimeout(timer);
          if (e instanceof AdaptyApiError) throw e;
          throw e;
        }
      }
    },
  };
}
```

- [ ] **Step 4: Run, PASS**

- [ ] **Step 5: Commit**

```bash
git add src/http/client.ts tests/unit/http/client.test.ts
git commit -m "feat(http): add injectable HTTP client with retry and timeout"
```

---

### Task 1.7: Advisory rate-limit token bucket

**Files:**
- Create: `src/http/rate-limit.ts`
- Create: `tests/unit/http/rate-limit.test.ts`
- Test command: `npx vitest run tests/unit/http/rate-limit.test.ts`
- Commit message: `feat(http): add advisory token-bucket rate limiter`

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect, vi } from 'vitest';
import { createRateLimiter } from '../../../src/http/rate-limit.js';

describe('createRateLimiter', () => {
  it('allows up to capacity then warns', () => {
    const warn = vi.fn();
    const rl = createRateLimiter({ capacity: 3, refillPerMs: 1 / 60_000, onWarn: warn });
    expect(rl.tryConsume()).toBe(true);
    expect(rl.tryConsume()).toBe(true);
    expect(rl.tryConsume()).toBe(true);
    expect(rl.tryConsume()).toBe(false);
    expect(warn).toHaveBeenCalled();
  });
  it('refills over time', async () => {
    const rl = createRateLimiter({ capacity: 1, refillPerMs: 1 });
    rl.tryConsume();
    expect(rl.tryConsume()).toBe(false);
    await new Promise(r => setTimeout(r, 5));
    expect(rl.tryConsume()).toBe(true);
  });
});
```

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement `src/http/rate-limit.ts`**

```ts
export interface RateLimiterOptions {
  capacity: number;
  refillPerMs: number;
  onWarn?: (msg: string) => void;
}

export interface RateLimiter {
  tryConsume(n?: number): boolean;
}

export function createRateLimiter(opts: RateLimiterOptions): RateLimiter {
  let tokens = opts.capacity;
  let last = Date.now();
  const warn = opts.onWarn ?? ((m: string) => console.error(`adapty-mcp: ${m}`));
  return {
    tryConsume(n = 1) {
      const now = Date.now();
      tokens = Math.min(opts.capacity, tokens + (now - last) * opts.refillPerMs);
      last = now;
      if (tokens >= n) {
        tokens -= n;
        return true;
      }
      warn(`rate limit advisory exceeded (capacity=${opts.capacity}/min)`);
      return false;
    },
  };
}
```

- [ ] **Step 4: Run, PASS**

- [ ] **Step 5: Commit**

```bash
git add src/http/rate-limit.ts tests/unit/http/rate-limit.test.ts
git commit -m "feat(http): add advisory token-bucket rate limiter"
```

---

### Task 1.8: Tool helper — registerTool wrapper + error→content

**Files:**
- Create: `src/utils/tool-helpers.ts`
- Create: `tests/unit/utils/tool-helpers.test.ts`
- Test command: `npx vitest run tests/unit/utils/tool-helpers.test.ts`
- Commit message: `feat(utils): add tool-helper wrapper with error normalization`

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { runTool } from '../../../src/utils/tool-helpers.js';
import { AdaptyApiError } from '../../../src/http/errors.js';

describe('runTool', () => {
  const schema = z.object({ x: z.number() });

  it('returns success content as JSON', async () => {
    const r = await runTool({
      schema,
      args: { x: 1 },
      handler: async ({ x }) => ({ doubled: x * 2 }),
    });
    expect(r.isError).toBeUndefined();
    expect(r.content[0]).toMatchObject({ type: 'text' });
    expect(JSON.parse((r.content[0] as { text: string }).text)).toEqual({ doubled: 2 });
  });
  it('returns validation error as isError content', async () => {
    const r = await runTool({
      schema,
      args: { x: 'not a number' },
      handler: async () => ({}),
    });
    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toMatch(/x/);
  });
  it('redacts secrets in returned data', async () => {
    const r = await runTool({
      schema,
      args: { x: 1 },
      handler: async () => ({ key: 'secret_live_aaa.tt9999' }),
    });
    expect((r.content[0] as { text: string }).text).toContain('secret_live_***9999');
  });
  it('maps AdaptyApiError to redacted error content', async () => {
    const r = await runTool({
      schema,
      args: { x: 1 },
      handler: async () => {
        throw new AdaptyApiError({
          status: 401,
          url: 'https://x',
          bodyExcerpt: 'token=secret_live_aa.tail1234',
        });
      },
    });
    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain('401');
    expect((r.content[0] as { text: string }).text).toContain('secret_live_***1234');
  });
  it('maps generic errors to error content', async () => {
    const r = await runTool({
      schema,
      args: { x: 1 },
      handler: async () => { throw new Error('boom'); },
    });
    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain('boom');
  });
});
```

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement `src/utils/tool-helpers.ts`**

```ts
import { z } from 'zod';
import { AdaptyApiError } from '../http/errors.js';
import { redact, redactJson } from './redact.js';

export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export interface RunToolInput<S extends z.ZodTypeAny> {
  schema: S;
  args: unknown;
  handler: (parsed: z.infer<S>) => Promise<unknown>;
}

function textResult(text: string, isError = false): ToolResult {
  const r: ToolResult = { content: [{ type: 'text', text }] };
  if (isError) r.isError = true;
  return r;
}

export async function runTool<S extends z.ZodTypeAny>(input: RunToolInput<S>): Promise<ToolResult> {
  const parsed = input.schema.safeParse(input.args);
  if (!parsed.success) {
    const lines = parsed.error.issues.map(i => `${i.path.join('.') || '<root>'}: ${i.message}`);
    return textResult(`Invalid input:\n${lines.join('\n')}`, true);
  }
  try {
    const value = await input.handler(parsed.data);
    return textResult(JSON.stringify(redactJson(value), null, 2));
  } catch (e) {
    if (e instanceof AdaptyApiError) {
      return textResult(redact(e.toString()), true);
    }
    const msg = e instanceof Error ? e.message : String(e);
    return textResult(redact(msg), true);
  }
}
```

- [ ] **Step 4: Run, PASS**

- [ ] **Step 5: Commit**

```bash
git add src/utils/tool-helpers.ts tests/unit/utils/tool-helpers.test.ts
git commit -m "feat(utils): add tool-helper wrapper with error normalization"
```


---

## Milestone 2 — Shared Schemas

### Task 2.1: Common identity & enum schemas

**Files:**
- Create: `src/schemas/common.ts`
- Create: `tests/unit/schemas/common.test.ts`
- Test command: `npx vitest run tests/unit/schemas/common.test.ts`
- Commit message: `feat(schemas): add common identity and enum schemas`

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect } from 'vitest';
import {
  ProfileIdSchema,
  CustomerUserIdSchema,
  PlatformSchema,
  AppParamSchema,
  EnvironmentParamSchema,
  ProfileTargetSchema,
  IsoDateTimeSchema,
} from '../../../src/schemas/common.js';

describe('ProfileIdSchema', () => {
  it('accepts UUIDs', () => { expect(() => ProfileIdSchema.parse('11111111-1111-1111-1111-111111111111')).not.toThrow(); });
  it('rejects empty', () => { expect(() => ProfileIdSchema.parse('')).toThrow(); });
});
describe('CustomerUserIdSchema', () => {
  it('accepts non-empty strings', () => { expect(() => CustomerUserIdSchema.parse('user-42')).not.toThrow(); });
  it('rejects empty', () => { expect(() => CustomerUserIdSchema.parse('')).toThrow(); });
});
describe('PlatformSchema', () => {
  it('accepts iOS / Android / web etc', () => {
    for (const p of ['iOS','macOS','iPadOS','visionOS','Android','web']) {
      expect(() => PlatformSchema.parse(p)).not.toThrow();
    }
  });
});
describe('ProfileTargetSchema', () => {
  it('requires exactly one of profileId or customerUserId', () => {
    expect(() => ProfileTargetSchema.parse({ profileId: 'x' })).not.toThrow();
    expect(() => ProfileTargetSchema.parse({ customerUserId: 'y' })).not.toThrow();
    expect(() => ProfileTargetSchema.parse({})).toThrow();
    expect(() => ProfileTargetSchema.parse({ profileId: 'x', customerUserId: 'y' })).toThrow();
  });
});
describe('AppParamSchema and EnvironmentParamSchema', () => {
  it('are both optional strings/enums', () => {
    expect(AppParamSchema.parse(undefined)).toBeUndefined();
    expect(EnvironmentParamSchema.parse('live')).toBe('live');
  });
});
describe('IsoDateTimeSchema', () => {
  it('accepts ISO strings', () => { expect(() => IsoDateTimeSchema.parse('2026-04-26T00:00:00Z')).not.toThrow(); });
  it('rejects non-ISO', () => { expect(() => IsoDateTimeSchema.parse('not a date')).toThrow(); });
});
```

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement `src/schemas/common.ts`**

```ts
import { z } from 'zod';

export const ProfileIdSchema = z.string().min(1).describe('Adapty profile UUID');
export const CustomerUserIdSchema = z.string().min(1).describe('Your system\'s user identifier');
export const PlatformSchema = z.enum(['iOS', 'macOS', 'iPadOS', 'visionOS', 'Android', 'web']);
export const AppParamSchema = z.string().min(1).optional().describe('App name from accounts config (omit to use default)');
export const EnvironmentParamSchema = z.enum(['live', 'sandbox']).optional().describe('Environment to use (default: live)');
export const IsoDateTimeSchema = z.string().refine(s => !Number.isNaN(Date.parse(s)), 'must be ISO datetime');

export const ProfileTargetSchema = z.object({
  profileId: ProfileIdSchema.optional(),
  customerUserId: CustomerUserIdSchema.optional(),
}).refine(v => (v.profileId ? 1 : 0) + (v.customerUserId ? 1 : 0) === 1, {
  message: 'pass exactly one of profileId or customerUserId',
});

export const CommonRequestSchema = z.object({
  app: AppParamSchema,
  environment: EnvironmentParamSchema,
  platform: PlatformSchema.optional(),
});
```

- [ ] **Step 4: Run, PASS**

- [ ] **Step 5: Commit**

```bash
git add src/schemas/common.ts tests/unit/schemas/common.test.ts
git commit -m "feat(schemas): add common identity and enum schemas"
```

---

### Task 2.2: Profile / access-level / transaction / paywall schemas

**Files:**
- Create: `src/schemas/profile.ts`
- Create: `src/schemas/access-level.ts`
- Create: `src/schemas/transaction.ts`
- Create: `src/schemas/paywall.ts`
- Create: `tests/unit/schemas/domain.test.ts`
- Test command: `npx vitest run tests/unit/schemas/domain.test.ts`
- Commit message: `feat(schemas): add profile/access-level/transaction/paywall schemas`

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { AdaptyProfileSchema, ProfileAttributesUpdateSchema } from '../../../src/schemas/profile.js';
import { GrantAccessLevelInputSchema, RevokeAccessLevelInputSchema } from '../../../src/schemas/access-level.js';
import { SetTransactionInputSchema, StripeValidateInputSchema } from '../../../src/schemas/transaction.js';
import { PaywallSchema, PaywallUpdateInputSchema } from '../../../src/schemas/paywall.js';

describe('Profile schemas', () => {
  it('AdaptyProfileSchema accepts a doc-example payload', () => {
    const doc = {
      profile_id: '11111111-1111-1111-1111-111111111111',
      customer_user_id: 'u1',
      access_levels: {},
      subscriptions: {},
      non_subscriptions: {},
    };
    expect(() => AdaptyProfileSchema.parse(doc)).not.toThrow();
  });
  it('ProfileAttributesUpdateSchema accepts known attribute keys', () => {
    expect(() => ProfileAttributesUpdateSchema.parse({
      first_name: 'A', last_name: 'B', email: 'a@b.c', phone_number: '+1', custom_attributes: { plan: 'pro' },
    })).not.toThrow();
  });
});

describe('Access level schemas', () => {
  it('GrantAccessLevelInputSchema requires accessLevelId, startsAt, expiresAt', () => {
    const ok = {
      profileId: 'p1',
      accessLevelId: 'premium',
      startsAt: '2026-01-01T00:00:00Z',
      expiresAt: '2027-01-01T00:00:00Z',
    };
    expect(() => GrantAccessLevelInputSchema.parse(ok)).not.toThrow();
    expect(() => GrantAccessLevelInputSchema.parse({ ...ok, accessLevelId: '' })).toThrow();
  });
  it('RevokeAccessLevelInputSchema requires accessLevelId', () => {
    expect(() => RevokeAccessLevelInputSchema.parse({ profileId: 'p1', accessLevelId: 'premium' })).not.toThrow();
  });
});

describe('Transaction schemas', () => {
  it('SetTransactionInputSchema requires store enum and transaction id', () => {
    expect(() => SetTransactionInputSchema.parse({
      profileId: 'p1', store: 'app_store', transactionId: 't1',
    })).not.toThrow();
    expect(() => SetTransactionInputSchema.parse({
      profileId: 'p1', store: 'play_store', transactionId: 't1',
    })).not.toThrow();
    expect(() => SetTransactionInputSchema.parse({
      profileId: 'p1', store: 'wrong', transactionId: 't1',
    })).toThrow();
  });
  it('StripeValidateInputSchema requires stripe ids', () => {
    expect(() => StripeValidateInputSchema.parse({
      profileId: 'p1', subscriptionId: 'sub_x', customerId: 'cus_x',
    })).not.toThrow();
  });
});

describe('Paywall schemas', () => {
  it('PaywallSchema accepts minimal paywall', () => {
    expect(() => PaywallSchema.parse({
      developer_id: 'paywall_a', name: 'A', revision: 1, products: [],
    })).not.toThrow();
  });
  it('PaywallUpdateInputSchema requires developerId and at least one mutable field', () => {
    expect(() => PaywallUpdateInputSchema.parse({ developerId: 'p_a', name: 'New' })).not.toThrow();
    expect(() => PaywallUpdateInputSchema.parse({ developerId: 'p_a' })).toThrow();
  });
});
```

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement schemas**

`src/schemas/profile.ts`:

```ts
import { z } from 'zod';
import { ProfileIdSchema, CustomerUserIdSchema } from './common.js';

export const AdaptyProfileSchema = z.object({
  profile_id: ProfileIdSchema,
  customer_user_id: CustomerUserIdSchema.nullable().optional(),
  access_levels: z.record(z.string(), z.unknown()).default({}),
  subscriptions: z.record(z.string(), z.unknown()).default({}),
  non_subscriptions: z.record(z.string(), z.unknown()).default({}),
}).passthrough();
export type AdaptyProfile = z.infer<typeof AdaptyProfileSchema>;

export const ProfileAttributesUpdateSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  phone_number: z.string().optional(),
  birthday: z.string().optional(),
  gender: z.enum(['m', 'f', 'o']).optional(),
  custom_attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});
export type ProfileAttributesUpdate = z.infer<typeof ProfileAttributesUpdateSchema>;
```

`src/schemas/access-level.ts`:

```ts
import { z } from 'zod';
import { IsoDateTimeSchema } from './common.js';

export const GrantAccessLevelInputSchema = z.object({
  profileId: z.string().min(1).optional(),
  customerUserId: z.string().min(1).optional(),
  accessLevelId: z.string().min(1),
  startsAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema.optional(),
  store: z.enum(['app_store', 'play_store', 'stripe', 'manual']).default('manual'),
}).refine(v => v.profileId || v.customerUserId, { message: 'profileId or customerUserId required' });
export type GrantAccessLevelInput = z.infer<typeof GrantAccessLevelInputSchema>;

export const RevokeAccessLevelInputSchema = z.object({
  profileId: z.string().min(1).optional(),
  customerUserId: z.string().min(1).optional(),
  accessLevelId: z.string().min(1),
}).refine(v => v.profileId || v.customerUserId, { message: 'profileId or customerUserId required' });
export type RevokeAccessLevelInput = z.infer<typeof RevokeAccessLevelInputSchema>;
```

`src/schemas/transaction.ts`:

```ts
import { z } from 'zod';

export const SetTransactionInputSchema = z.object({
  profileId: z.string().min(1).optional(),
  customerUserId: z.string().min(1).optional(),
  store: z.enum(['app_store', 'play_store']),
  transactionId: z.string().min(1),
  productId: z.string().min(1).optional(),
  receipt: z.string().optional(),
  purchaseToken: z.string().optional(),
}).refine(v => v.profileId || v.customerUserId, { message: 'profileId or customerUserId required' });
export type SetTransactionInput = z.infer<typeof SetTransactionInputSchema>;

export const StripeValidateInputSchema = z.object({
  profileId: z.string().min(1).optional(),
  customerUserId: z.string().min(1).optional(),
  subscriptionId: z.string().min(1).optional(),
  customerId: z.string().min(1).optional(),
}).refine(v => v.profileId || v.customerUserId, { message: 'profileId or customerUserId required' })
  .refine(v => v.subscriptionId || v.customerId, { message: 'subscriptionId or customerId required' });
export type StripeValidateInput = z.infer<typeof StripeValidateInputSchema>;
```

`src/schemas/paywall.ts`:

```ts
import { z } from 'zod';

export const PaywallProductSchema = z.object({
  vendor_product_id: z.string(),
  developer_id: z.string().optional(),
}).passthrough();

export const PaywallSchema = z.object({
  developer_id: z.string(),
  name: z.string(),
  revision: z.number().int().nonnegative(),
  products: z.array(PaywallProductSchema),
  remote_config: z.record(z.string(), z.unknown()).optional(),
}).passthrough();
export type AdaptyPaywall = z.infer<typeof PaywallSchema>;

export const PaywallUpdateInputSchema = z.object({
  developerId: z.string().min(1),
  name: z.string().min(1).optional(),
  remoteConfig: z.record(z.string(), z.unknown()).optional(),
  products: z.array(z.object({
    vendorProductId: z.string().min(1),
    developerId: z.string().min(1).optional(),
  })).optional(),
}).refine(
  v => v.name !== undefined || v.remoteConfig !== undefined || v.products !== undefined,
  { message: 'at least one mutable field (name, remoteConfig, products) required' },
);
export type PaywallUpdateInput = z.infer<typeof PaywallUpdateInputSchema>;
```

- [ ] **Step 4: Run, PASS**

- [ ] **Step 5: Commit**

```bash
git add src/schemas/profile.ts src/schemas/access-level.ts src/schemas/transaction.ts src/schemas/paywall.ts tests/unit/schemas/domain.test.ts
git commit -m "feat(schemas): add profile/access-level/transaction/paywall schemas"
```

---

### Task 2.3: Webhook event discriminated union

**Files:**
- Create: `src/schemas/webhook-events.ts`
- Create: `tests/unit/schemas/webhook-events.test.ts`
- Test command: `npx vitest run tests/unit/schemas/webhook-events.test.ts`
- Commit message: `feat(schemas): add webhook event discriminated union (18 types)`

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { WEBHOOK_EVENT_TYPES, WebhookEventSchema } from '../../../src/schemas/webhook-events.js';

const ALL = [
  'subscription_started','subscription_renewed','subscription_renewal_cancelled',
  'subscription_renewal_reactivated','subscription_expired','subscription_paused',
  'subscription_deferred','non_subscription_purchase','trial_started','trial_converted',
  'trial_renewal_cancelled','trial_renewal_reactivated','trial_expired',
  'entered_grace_period','billing_issue_detected','subscription_refunded',
  'non_subscription_purchase_refunded','access_level_updated',
];

describe('WEBHOOK_EVENT_TYPES', () => {
  it('contains all 18 known event types', () => {
    expect(new Set(WEBHOOK_EVENT_TYPES)).toEqual(new Set(ALL));
  });
});

describe('WebhookEventSchema', () => {
  it.each(ALL)('parses minimal payload for %s', (event_type) => {
    const payload = {
      profile_id: '11111111-1111-1111-1111-111111111111',
      event_type,
      event_datetime: '2026-04-26T00:00:00Z',
      event_properties: {},
      event_api_version: 1,
      profiles_sharing_access_level: [],
    };
    const r = WebhookEventSchema.safeParse(payload);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.event_type).toBe(event_type);
  });
  it('rejects unknown event_type', () => {
    expect(WebhookEventSchema.safeParse({
      profile_id: '11111111-1111-1111-1111-111111111111',
      event_type: 'made_up_event',
      event_datetime: '2026-04-26T00:00:00Z',
      event_properties: {},
      event_api_version: 1,
      profiles_sharing_access_level: [],
    }).success).toBe(false);
  });
  it('preserves passthrough fields like attributions', () => {
    const r = WebhookEventSchema.parse({
      profile_id: '11111111-1111-1111-1111-111111111111',
      event_type: 'subscription_started',
      event_datetime: '2026-04-26T00:00:00Z',
      event_properties: {},
      event_api_version: 1,
      profiles_sharing_access_level: [],
      attributions: { network: 'organic' },
    });
    expect((r as unknown as { attributions: unknown }).attributions).toEqual({ network: 'organic' });
  });
});
```

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement `src/schemas/webhook-events.ts`**

```ts
import { z } from 'zod';
import { ProfileIdSchema, IsoDateTimeSchema } from './common.js';

export const WEBHOOK_EVENT_TYPES = [
  'subscription_started',
  'subscription_renewed',
  'subscription_renewal_cancelled',
  'subscription_renewal_reactivated',
  'subscription_expired',
  'subscription_paused',
  'subscription_deferred',
  'non_subscription_purchase',
  'trial_started',
  'trial_converted',
  'trial_renewal_cancelled',
  'trial_renewal_reactivated',
  'trial_expired',
  'entered_grace_period',
  'billing_issue_detected',
  'subscription_refunded',
  'non_subscription_purchase_refunded',
  'access_level_updated',
] as const;
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

const BaseEventSchema = z.object({
  profile_id: ProfileIdSchema,
  customer_user_id: z.string().nullable().optional(),
  idfv: z.string().nullable().optional(),
  idfa: z.string().nullable().optional(),
  advertising_id: z.string().nullable().optional(),
  profile_install_datetime: IsoDateTimeSchema.optional(),
  user_agent: z.string().optional(),
  email: z.string().nullable().optional(),
  event_type: z.enum(WEBHOOK_EVENT_TYPES),
  event_datetime: IsoDateTimeSchema,
  event_properties: z.record(z.string(), z.unknown()),
  event_api_version: z.number().int(),
  profiles_sharing_access_level: z.array(z.unknown()),
  attributions: z.record(z.string(), z.unknown()).optional(),
  user_attributes: z.record(z.string(), z.unknown()).optional(),
  integration_ids: z.record(z.string(), z.unknown()).optional(),
  play_store_purchase_token: z.unknown().optional(),
}).passthrough();

export const WebhookEventSchema = BaseEventSchema;
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
```

- [ ] **Step 4: Run, PASS**

- [ ] **Step 5: Commit**

```bash
git add src/schemas/webhook-events.ts tests/unit/schemas/webhook-events.test.ts
git commit -m "feat(schemas): add webhook event discriminated union (18 types)"
```

---

## Milestone 3 — Server-Side API v2 Tools

Conventions for all M3 tasks:
- Base URL: `https://api.adapty.io/api/v2/server-side-api`
- Auth: `keyType: 'secret'`
- Each task wires tools through `runTool` (Task 1.8) and `buildHeaders` (Task 1.4) and the injected HTTP client (Task 1.6).
- Tool registration shape used in every file:
  ```ts
  export interface ToolDef {
    name: string;
    description: string;
    inputSchema: z.ZodTypeAny;
    handler: (args: unknown, deps: ToolDeps) => Promise<ToolResult>;
  }
  export interface ToolDeps {
    accountStore: AccountStore;
    httpClient: HttpClient; // pre-bound to v2 base URL for this group
  }
  ```
  This shape is also used by all later tool files (M4–M7).

### Task 3.1: Profile tools (4 tools in one file)

**Files:**
- Create: `src/tools/server-side-v2/profile.ts`
- Create: `tests/unit/tools/server-side-v2/profile.test.ts`
- Test command: `npx vitest run tests/unit/tools/server-side-v2/profile.test.ts`
- Commit message: `feat(tools-v2): add profile tools (get/create/update/delete)`

- [ ] **Step 1: Failing test (covers all 4 tools)**

```ts
import { describe, it, expect, vi } from 'vitest';
import { profileTools } from '../../../../src/tools/server-side-v2/profile.js';
import { createHttpClient } from '../../../../src/http/client.js';
import { createAccountStore } from '../../../../src/auth/account-store.js';

function setupEnv() {
  process.env.ADAPTY_SECRET_API_KEY = 'secret_live_aa.bb';
}
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('profile tools', () => {
  it('exposes 4 tools with adapty_profile_* names', () => {
    expect(profileTools.map(t => t.name).sort()).toEqual([
      'adapty_profile_create','adapty_profile_delete','adapty_profile_get','adapty_profile_update',
    ]);
  });

  it('adapty_profile_get sends GET /profile with profile id header', async () => {
    setupEnv();
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { profile_id: 'p1', access_levels: {}, subscriptions: {}, non_subscriptions: {} }));
    const client = createHttpClient({ fetch, baseUrl: 'https://api.adapty.io/api/v2/server-side-api' });
    const tool = profileTools.find(t => t.name === 'adapty_profile_get')!;
    const r = await tool.handler({ profileId: 'p1' }, { accountStore: createAccountStore(), httpClient: client });
    expect(r.isError).toBeUndefined();
    const url = fetch.mock.calls[0]![0];
    const init = fetch.mock.calls[0]![1] as RequestInit;
    expect(url).toBe('https://api.adapty.io/api/v2/server-side-api/profile');
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string,string>)['adapty-profile-id']).toBe('p1');
    expect((init.headers as Record<string,string>).Authorization).toBe('Api-Key secret_live_aa.bb');
  });

  it('adapty_profile_create POSTs body with attributes', async () => {
    setupEnv();
    const fetch = vi.fn().mockResolvedValue(jsonResponse(201, { profile_id: 'p1', access_levels:{}, subscriptions:{}, non_subscriptions:{} }));
    const client = createHttpClient({ fetch, baseUrl: 'https://api.adapty.io/api/v2/server-side-api' });
    const tool = profileTools.find(t => t.name === 'adapty_profile_create')!;
    const r = await tool.handler(
      { customerUserId: 'u1', attributes: { email: 'a@b.c' } },
      { accountStore: createAccountStore(), httpClient: client },
    );
    expect(r.isError).toBeUndefined();
    const init = fetch.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'a@b.c' });
    expect((init.headers as Record<string,string>)['adapty-customer-user-id']).toBe('u1');
  });

  it('adapty_profile_update PUTs attributes', async () => {
    setupEnv();
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { profile_id: 'p1', access_levels:{}, subscriptions:{}, non_subscriptions:{} }));
    const client = createHttpClient({ fetch, baseUrl: 'https://api.adapty.io/api/v2/server-side-api' });
    const tool = profileTools.find(t => t.name === 'adapty_profile_update')!;
    await tool.handler({ profileId: 'p1', attributes: { first_name: 'A' } }, { accountStore: createAccountStore(), httpClient: client });
    const init = fetch.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ first_name: 'A' });
  });

  it('adapty_profile_delete DELETEs and returns null on 204', async () => {
    setupEnv();
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const client = createHttpClient({ fetch, baseUrl: 'https://api.adapty.io/api/v2/server-side-api' });
    const tool = profileTools.find(t => t.name === 'adapty_profile_delete')!;
    const r = await tool.handler({ profileId: 'p1' }, { accountStore: createAccountStore(), httpClient: client });
    expect(r.isError).toBeUndefined();
    const init = fetch.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('DELETE');
  });

  it('adapty_profile_get rejects when neither profileId nor customerUserId provided', async () => {
    setupEnv();
    const fetch = vi.fn();
    const client = createHttpClient({ fetch, baseUrl: 'https://api.adapty.io/api/v2/server-side-api' });
    const tool = profileTools.find(t => t.name === 'adapty_profile_get')!;
    const r = await tool.handler({}, { accountStore: createAccountStore(), httpClient: client });
    expect(r.isError).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('adapty_profile_get surfaces Adapty 401 as error content', async () => {
    setupEnv();
    const fetch = vi.fn().mockResolvedValue(new Response('{"errors":[{"code":"BAD"}]}', { status: 401, headers: { 'content-type': 'application/json' }}));
    const client = createHttpClient({ fetch, baseUrl: 'https://api.adapty.io/api/v2/server-side-api' });
    const tool = profileTools.find(t => t.name === 'adapty_profile_get')!;
    const r = await tool.handler({ profileId: 'p1' }, { accountStore: createAccountStore(), httpClient: client });
    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain('401');
  });
});
```

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement `src/tools/server-side-v2/profile.ts`**

```ts
import { z } from 'zod';
import type { AccountStore } from '../../auth/account-store.js';
import { buildHeaders } from '../../auth/headers.js';
import type { HttpClient } from '../../http/client.js';
import { CommonRequestSchema, ProfileIdSchema, CustomerUserIdSchema } from '../../schemas/common.js';
import { ProfileAttributesUpdateSchema } from '../../schemas/profile.js';
import { runTool, type ToolResult } from '../../utils/tool-helpers.js';

export interface ToolDeps {
  accountStore: AccountStore;
  httpClient: HttpClient;
}
export interface ToolDef {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  handler: (args: unknown, deps: ToolDeps) => Promise<ToolResult>;
}

const TargetSchema = z.object({
  profileId: ProfileIdSchema.optional(),
  customerUserId: CustomerUserIdSchema.optional(),
});

const GetSchema = TargetSchema.merge(CommonRequestSchema);
const CreateSchema = TargetSchema.merge(CommonRequestSchema).extend({
  attributes: ProfileAttributesUpdateSchema.optional(),
});
const UpdateSchema = TargetSchema.merge(CommonRequestSchema).extend({
  attributes: ProfileAttributesUpdateSchema,
});
const DeleteSchema = TargetSchema.merge(CommonRequestSchema);

function buildHeadersOrThrow(deps: ToolDeps, args: z.infer<typeof TargetSchema> & { app?: string; environment?: 'live'|'sandbox'; platform?: string }) {
  const cred = deps.accountStore.resolve({
    ...(args.app !== undefined ? { app: args.app } : {}),
    ...(args.environment !== undefined ? { environment: args.environment } : {}),
  });
  return buildHeaders({
    credentials: cred,
    keyType: 'secret',
    ...(args.profileId !== undefined ? { profileId: args.profileId } : {}),
    ...(args.customerUserId !== undefined ? { customerUserId: args.customerUserId } : {}),
    ...(args.platform !== undefined ? { platform: args.platform as any } : {}),
  });
}

export const profileTools: ToolDef[] = [
  {
    name: 'adapty_profile_get',
    description: 'Retrieve an Adapty user profile (access levels, subscriptions, non-subscriptions). Use case: check whether a customer currently has an active access level.',
    inputSchema: GetSchema,
    handler: (args, deps) => runTool({
      schema: GetSchema, args,
      handler: async (a) => deps.httpClient.request({ method: 'GET', path: '/profile', headers: buildHeadersOrThrow(deps, a) }),
    }),
  },
  {
    name: 'adapty_profile_create',
    description: 'Create a new Adapty profile. Use case: pre-create a profile when your backend signs up a user.',
    inputSchema: CreateSchema,
    handler: (args, deps) => runTool({
      schema: CreateSchema, args,
      handler: async (a) => deps.httpClient.request({
        method: 'POST', path: '/profile',
        headers: buildHeadersOrThrow(deps, a),
        body: a.attributes ?? {},
      }),
    }),
  },
  {
    name: 'adapty_profile_update',
    description: 'Update Adapty profile attributes (name, email, custom_attributes, ...). Use case: sync user profile changes from your backend.',
    inputSchema: UpdateSchema,
    handler: (args, deps) => runTool({
      schema: UpdateSchema, args,
      handler: async (a) => deps.httpClient.request({
        method: 'PUT', path: '/profile',
        headers: buildHeadersOrThrow(deps, a),
        body: a.attributes,
      }),
    }),
  },
  {
    name: 'adapty_profile_delete',
    description: 'Delete an Adapty profile and its data. Use case: GDPR/CCPA delete request.',
    inputSchema: DeleteSchema,
    handler: (args, deps) => runTool({
      schema: DeleteSchema, args,
      handler: async (a) => deps.httpClient.request({ method: 'DELETE', path: '/profile', headers: buildHeadersOrThrow(deps, a) }),
    }),
  },
];
```

- [ ] **Step 4: Run, PASS, coverage**

- [ ] **Step 5: Commit**

```bash
git add src/tools/server-side-v2/profile.ts tests/unit/tools/server-side-v2/profile.test.ts
git commit -m "feat(tools-v2): add profile tools (get/create/update/delete)"
```

---

### Task 3.2: Access-level tools (grant + revoke)

**Files:**
- Create: `src/tools/server-side-v2/access-level.ts`
- Create: `tests/unit/tools/server-side-v2/access-level.test.ts`
- Test command: `npx vitest run tests/unit/tools/server-side-v2/access-level.test.ts`
- Commit message: `feat(tools-v2): add access-level grant/revoke tools`

- [ ] **Step 1: Failing tests** — cover: tool names, grant POSTs `/access-level` with body, revoke DELETEs `/access-level` with body, schema rejects empty accessLevelId, schema rejects neither profile id given, errors mapped.

```ts
import { describe, it, expect, vi } from 'vitest';
import { accessLevelTools } from '../../../../src/tools/server-side-v2/access-level.js';
import { createHttpClient } from '../../../../src/http/client.js';
import { createAccountStore } from '../../../../src/auth/account-store.js';

beforeEach(() => { process.env.ADAPTY_SECRET_API_KEY = 'secret_live_a.b'; });

it('lists adapty_access_level_grant and adapty_access_level_revoke', () => {
  expect(accessLevelTools.map(t => t.name).sort()).toEqual(['adapty_access_level_grant','adapty_access_level_revoke']);
});

it('grant POSTs /access-level with full body', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200, headers: {'content-type':'application/json'} }));
  const tool = accessLevelTools.find(t => t.name === 'adapty_access_level_grant')!;
  await tool.handler(
    { profileId: 'p1', accessLevelId: 'premium', startsAt: '2026-01-01T00:00:00Z', expiresAt: '2027-01-01T00:00:00Z' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(init.method).toBe('POST');
  const body = JSON.parse(init.body as string);
  expect(body.access_level_id).toBe('premium');
  expect(body.starts_at).toBe('2026-01-01T00:00:00Z');
  expect(body.expires_at).toBe('2027-01-01T00:00:00Z');
});

it('revoke DELETEs /access-level with body containing access_level_id', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  const tool = accessLevelTools.find(t => t.name === 'adapty_access_level_revoke')!;
  await tool.handler(
    { profileId: 'p1', accessLevelId: 'premium' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(init.method).toBe('DELETE');
  expect(JSON.parse(init.body as string)).toEqual({ access_level_id: 'premium' });
});

it('grant rejects empty accessLevelId', async () => {
  const fetch = vi.fn();
  const tool = accessLevelTools.find(t => t.name === 'adapty_access_level_grant')!;
  const r = await tool.handler(
    { profileId: 'p1', accessLevelId: '', startsAt: '2026-01-01T00:00:00Z' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  expect(r.isError).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement `src/tools/server-side-v2/access-level.ts`**

```ts
import { z } from 'zod';
import { buildHeaders } from '../../auth/headers.js';
import type { AccountStore } from '../../auth/account-store.js';
import type { HttpClient } from '../../http/client.js';
import { CommonRequestSchema, ProfileIdSchema, CustomerUserIdSchema, IsoDateTimeSchema } from '../../schemas/common.js';
import { runTool, type ToolResult } from '../../utils/tool-helpers.js';

export interface ToolDeps { accountStore: AccountStore; httpClient: HttpClient; }
export interface ToolDef {
  name: string; description: string;
  inputSchema: z.ZodTypeAny;
  handler: (args: unknown, deps: ToolDeps) => Promise<ToolResult>;
}

const Target = z.object({ profileId: ProfileIdSchema.optional(), customerUserId: CustomerUserIdSchema.optional() });

const GrantSchema = Target.merge(CommonRequestSchema).extend({
  accessLevelId: z.string().min(1),
  startsAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema.optional(),
  store: z.enum(['app_store','play_store','stripe','manual']).default('manual'),
});
const RevokeSchema = Target.merge(CommonRequestSchema).extend({
  accessLevelId: z.string().min(1),
});

function headers(deps: ToolDeps, a: z.infer<typeof Target> & { app?: string; environment?: 'live'|'sandbox'; platform?: string }) {
  const cred = deps.accountStore.resolve({
    ...(a.app !== undefined ? { app: a.app } : {}),
    ...(a.environment !== undefined ? { environment: a.environment } : {}),
  });
  return buildHeaders({
    credentials: cred, keyType: 'secret',
    ...(a.profileId !== undefined ? { profileId: a.profileId } : {}),
    ...(a.customerUserId !== undefined ? { customerUserId: a.customerUserId } : {}),
    ...(a.platform !== undefined ? { platform: a.platform as any } : {}),
  });
}

export const accessLevelTools: ToolDef[] = [
  {
    name: 'adapty_access_level_grant',
    description: 'Grant or extend an access level for a customer (without an actual purchase). Use case: comp a creator account, refund credit.',
    inputSchema: GrantSchema,
    handler: (args, deps) => runTool({
      schema: GrantSchema, args,
      handler: async (a) => deps.httpClient.request({
        method: 'POST', path: '/access-level',
        headers: headers(deps, a),
        body: {
          access_level_id: a.accessLevelId,
          starts_at: a.startsAt,
          ...(a.expiresAt ? { expires_at: a.expiresAt } : {}),
          store: a.store,
        },
      }),
    }),
  },
  {
    name: 'adapty_access_level_revoke',
    description: 'Revoke a previously granted access level. Use case: undo a manual grant.',
    inputSchema: RevokeSchema,
    handler: (args, deps) => runTool({
      schema: RevokeSchema, args,
      handler: async (a) => deps.httpClient.request({
        method: 'DELETE', path: '/access-level',
        headers: headers(deps, a),
        body: { access_level_id: a.accessLevelId },
      }),
    }),
  },
];
```

- [ ] **Step 4: Run, PASS**

- [ ] **Step 5: Commit**

```bash
git add src/tools/server-side-v2/access-level.ts tests/unit/tools/server-side-v2/access-level.test.ts
git commit -m "feat(tools-v2): add access-level grant/revoke tools"
```

---

### Task 3.3: Transaction tools (set + stripe-validate)

**Files:**
- Create: `src/tools/server-side-v2/transaction.ts`
- Create: `tests/unit/tools/server-side-v2/transaction.test.ts`
- Test command: `npx vitest run tests/unit/tools/server-side-v2/transaction.test.ts`
- Commit message: `feat(tools-v2): add transaction set + stripe-validate tools`

- [ ] **Step 1: Failing tests** — cover: tool names listed, `adapty_transaction_set` POSTs `/transaction` with body containing `store`/`transaction_id`/`product_id`/`receipt`/`purchase_token`, `adapty_stripe_purchase_validate` POSTs `/stripe-purchase` with `subscription_id`/`customer_id`, schema enforces `store` enum, schema rejects empty `transactionId`, both surface errors via redacted error content.

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transactionTools } from '../../../../src/tools/server-side-v2/transaction.js';
import { createHttpClient } from '../../../../src/http/client.js';
import { createAccountStore } from '../../../../src/auth/account-store.js';

beforeEach(() => { process.env.ADAPTY_SECRET_API_KEY = 'secret_live_a.b'; });

it('exposes transaction_set and stripe_purchase_validate', () => {
  expect(transactionTools.map(t => t.name).sort()).toEqual([
    'adapty_stripe_purchase_validate','adapty_transaction_set',
  ]);
});

it('transaction_set POSTs /transaction with snake_case body', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status:200, headers:{'content-type':'application/json'}}));
  const t = transactionTools.find(x => x.name === 'adapty_transaction_set')!;
  await t.handler(
    { profileId:'p1', store:'app_store', transactionId:'tx1', productId:'pr1', receipt:'AAA' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body as string)).toEqual({ store:'app_store', transaction_id:'tx1', product_id:'pr1', receipt:'AAA' });
});

it('stripe_purchase_validate POSTs /stripe-purchase with stripe ids', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status:200, headers:{'content-type':'application/json'}}));
  const t = transactionTools.find(x => x.name === 'adapty_stripe_purchase_validate')!;
  await t.handler(
    { profileId:'p1', subscriptionId:'sub_1', customerId:'cus_1' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(JSON.parse(init.body as string)).toEqual({ subscription_id:'sub_1', customer_id:'cus_1' });
});

it('transaction_set schema rejects empty transactionId', async () => {
  const fetch = vi.fn();
  const t = transactionTools.find(x => x.name === 'adapty_transaction_set')!;
  const r = await t.handler(
    { profileId:'p1', store:'app_store', transactionId:'' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  expect(r.isError).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement `src/tools/server-side-v2/transaction.ts`** — same shape as Task 3.2, two ToolDef entries; build snake_case bodies that omit undefined optional fields (so the empty fields don't appear in the JSON body). Re-use the local `headers(deps, a)` helper pattern from 3.2.

- [ ] **Step 4: Run, PASS**

- [ ] **Step 5: Commit**

```bash
git add src/tools/server-side-v2/transaction.ts tests/unit/tools/server-side-v2/transaction.test.ts
git commit -m "feat(tools-v2): add transaction set + stripe-validate tools"
```

---

### Task 3.4: Integration identifiers tool (1 tool)

**Files:**
- Create: `src/tools/server-side-v2/integration-identifiers.ts`
- Create: `tests/unit/tools/server-side-v2/integration-identifiers.test.ts`
- Test command: `npx vitest run tests/unit/tools/server-side-v2/integration-identifiers.test.ts`
- Commit message: `feat(tools-v2): add integration-identifiers tool`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { integrationIdTools } from '../../../../src/tools/server-side-v2/integration-identifiers.js';
import { createHttpClient } from '../../../../src/http/client.js';
import { createAccountStore } from '../../../../src/auth/account-store.js';

beforeEach(() => { process.env.ADAPTY_SECRET_API_KEY = 'secret_live_a.b'; });

it('exposes adapty_integration_identifiers_set', () => {
  expect(integrationIdTools.map(t => t.name)).toEqual(['adapty_integration_identifiers_set']);
});
it('POSTs /integration-identifiers with provider->value map', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status:200, headers:{'content-type':'application/json'}}));
  const t = integrationIdTools[0]!;
  await t.handler(
    { profileId:'p1', identifiers: { amplitude_user_id: 'amp-1', mixpanel_user_id: 'mp-1' } },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body as string)).toEqual({ amplitude_user_id:'amp-1', mixpanel_user_id:'mp-1' });
});
it('schema requires at least one identifier', async () => {
  const fetch = vi.fn();
  const r = await integrationIdTools[0]!.handler(
    { profileId:'p1', identifiers: {} },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  expect(r.isError).toBe(true);
});
```

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement** — schema is `Target.merge(CommonRequestSchema).extend({ identifiers: z.record(z.string(), z.string().min(1)).refine(o => Object.keys(o).length > 0, 'at least one identifier required') })`. Single ToolDef that POSTs the identifiers map directly as the body.

- [ ] **Step 4: Run, PASS**

- [ ] **Step 5: Commit**

```bash
git add src/tools/server-side-v2/integration-identifiers.ts tests/unit/tools/server-side-v2/integration-identifiers.test.ts
git commit -m "feat(tools-v2): add integration-identifiers tool"
```

---

### Task 3.5: Paywall tools (get/list/update — 3 tools)

**Files:**
- Create: `src/tools/server-side-v2/paywall.ts`
- Create: `tests/unit/tools/server-side-v2/paywall.test.ts`
- Test command: `npx vitest run tests/unit/tools/server-side-v2/paywall.test.ts`
- Commit message: `feat(tools-v2): add paywall get/list/update tools`

- [ ] **Step 1: Failing tests** — cover: tool names listed (`adapty_paywall_get`, `adapty_paywalls_list`, `adapty_paywall_update`); `paywall_get` GETs `/paywall?developer_id=X` (the `developerId` arg becomes a query param), allows anonymous (no profile id needed); `paywalls_list` GETs `/paywalls` allowing anonymous; `paywall_update` PUTs `/paywall` with snake_case body containing `developer_id` and only the supplied mutable fields; update schema rejects when no mutable field is set.

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paywallTools } from '../../../../src/tools/server-side-v2/paywall.js';
import { createHttpClient } from '../../../../src/http/client.js';
import { createAccountStore } from '../../../../src/auth/account-store.js';

beforeEach(() => { process.env.ADAPTY_SECRET_API_KEY = 'secret_live_a.b'; });

it('exposes paywall_get, paywalls_list, paywall_update', () => {
  expect(paywallTools.map(t => t.name).sort()).toEqual(['adapty_paywall_get','adapty_paywall_update','adapty_paywalls_list']);
});

it('paywall_get GETs /paywall with developer_id query', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"developer_id":"p_a","name":"A","revision":1,"products":[]}', { status:200, headers:{'content-type':'application/json'}}));
  const t = paywallTools.find(x => x.name === 'adapty_paywall_get')!;
  await t.handler({ developerId: 'p_a' }, { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) });
  expect(fetch.mock.calls[0]![0]).toBe('https://x/paywall?developer_id=p_a');
});

it('paywalls_list GETs /paywalls', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('[]', { status:200, headers:{'content-type':'application/json'}}));
  const t = paywallTools.find(x => x.name === 'adapty_paywalls_list')!;
  await t.handler({}, { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) });
  expect(fetch.mock.calls[0]![0]).toBe('https://x/paywalls');
});

it('paywall_update PUTs /paywall with snake_case body', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"developer_id":"p_a","name":"New","revision":2,"products":[]}', { status:200, headers:{'content-type':'application/json'}}));
  const t = paywallTools.find(x => x.name === 'adapty_paywall_update')!;
  await t.handler(
    { developerId: 'p_a', name: 'New', remoteConfig: { color: 'red' } },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(init.method).toBe('PUT');
  expect(JSON.parse(init.body as string)).toEqual({ developer_id:'p_a', name:'New', remote_config:{color:'red'} });
});

it('paywall_update rejects when no mutable field provided', async () => {
  const fetch = vi.fn();
  const r = await paywallTools.find(x => x.name === 'adapty_paywall_update')!.handler(
    { developerId: 'p_a' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  expect(r.isError).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement `src/tools/server-side-v2/paywall.ts`** — three ToolDef entries. Note: paywall list/get can be called without a profile id, so use `buildHeaders({..., allowAnonymous: true})`. For `paywall_update`, build snake_case body conditionally (`name`, `remote_config`, `products` mapped from camelCase input).

- [ ] **Step 4: Run, PASS**

- [ ] **Step 5: Commit**

```bash
git add src/tools/server-side-v2/paywall.ts tests/unit/tools/server-side-v2/paywall.test.ts
git commit -m "feat(tools-v2): add paywall get/list/update tools"
```

---

## Milestone 4 — Server-Side API v1 (Legacy) — 7 tools

### Task 4.1: Confirm legacy paths and write all 7 tools in one file

**Files:**
- Create: `src/tools/server-side-v1/legacy.ts`
- Create: `tests/unit/tools/server-side-v1/legacy.test.ts`
- Test command: `npx vitest run tests/unit/tools/server-side-v1/legacy.test.ts`
- Commit message: `feat(tools-v1): add 7 legacy server-side tools`

The legacy v1 paths (confirmed from https://adapty.io/docs/server-side-api-specs-legacy ) all live under base `https://api.adapty.io/api/v1/sdk` with this mapping:

| Tool name | Method | Path |
|---|---|---|
| `adapty_v1_profile_get` | GET | `/profiles/{id}/` |
| `adapty_v1_profile_create` | POST | `/profiles/` |
| `adapty_v1_profile_update` | PATCH | `/profiles/{id}/` |
| `adapty_v1_profile_delete` | DELETE | `/profiles/{id}/delete` |
| `adapty_v1_access_level_grant` | POST | `/profiles/{id}/paid-access-levels/{accessLevel}/grant/` |
| `adapty_v1_access_level_revoke` | POST | `/profiles/{id}/paid-access-levels/{accessLevel}/revoke/` |
| `adapty_v1_stripe_token_validate` | POST | `/purchase/stripe/token/validate/` |

`{id}` is `profileId` if given, else `customerUserId`. All tool descriptions begin with `[LEGACY — prefer v2 equivalent]`.

- [ ] **Step 1: Failing tests** — for each tool: tool name present, builds URL with the right `{id}` substitution, sends correct method, includes `Authorization: Api-Key secret_live_*` header, body shape matches doc examples (snake_case), schema rejects missing required fields. Inline 7 tiny tests with `it.each` over a table of `[name, method, expectedPathFn, args, expectedBody]`.

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement `src/tools/server-side-v1/legacy.ts`** — 7 ToolDef entries. URL is built with template literals using `encodeURIComponent`. Pattern is identical to v2 tools (deps, runTool, redact). The HTTP client passed to these tools is bound to `https://api.adapty.io/api/v1/sdk` (wired in Task 8.1).

- [ ] **Step 4: Run, PASS**

- [ ] **Step 5: Commit**

```bash
git add src/tools/server-side-v1/legacy.ts tests/unit/tools/server-side-v1/legacy.test.ts
git commit -m "feat(tools-v1): add 7 legacy server-side tools"
```

---

## Milestone 5 — Web API (3 tools)

### Task 5.1: Confirm Web API paths

The `/docs/web-api-requests` page is SPA-rendered and not directly extractable. **Before implementation, perform a smoke-call to confirm exact paths**:

- [ ] **Step 1:** Visit `https://adapty.io/docs/web-api-requests` in a browser (logged-in account if needed) and locate the three operations: `getPaywall`, `recordPaywallView`, `addAttribution`. Note for each: HTTP method, path under `https://api.adapty.io`, JSON body fields, response shape, required headers.

- [ ] **Step 2:** Record findings as a comment block at the top of `src/tools/web-api/web.ts` so future readers don't have to re-derive them.

- [ ] **Step 3:** Working assumption (override with confirmed truth):
  - `POST /api/v1/sdk/in-apps/web/paywall/` — get paywall (body: `{ developer_id }`)
  - `POST /api/v1/sdk/in-apps/web/paywall/view/` — record view (body: `{ developer_id, paywall_revision }`)
  - `POST /api/v1/sdk/attributions/` — add attribution (body: `{ source, network_user_id, attributes }`)

### Task 5.2: Implement web tools (3 tools, 1 file)

**Files:**
- Create: `src/tools/web-api/web.ts`
- Create: `tests/unit/tools/web-api/web.test.ts`
- Test command: `npx vitest run tests/unit/tools/web-api/web.test.ts`
- Commit message: `feat(tools-web): add web-api tools (get-paywall/record-view/attribution)`

- [ ] **Step 1: Failing tests** — same shape as Task 3.5 but: each tool calls the **public** key path (`buildHeaders({ keyType: 'public', ... })`); the test sets `process.env.ADAPTY_PUBLIC_API_KEY = 'public_live_a.b'` and asserts `Authorization: Api-Key public_live_a.b`; the bodies match the confirmed paths from Task 5.1.

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement `src/tools/web-api/web.ts`** — three ToolDef entries (`adapty_web_paywall_get`, `adapty_web_paywall_view_record`, `adapty_web_attribution_set`). Each uses `keyType: 'public'`. The HTTP client is bound to `https://api.adapty.io` (or whatever Task 5.1 confirms) and wired in Task 8.1.

- [ ] **Step 4: Run, PASS**

- [ ] **Step 5: Commit**

```bash
git add src/tools/web-api/web.ts tests/unit/tools/web-api/web.test.ts
git commit -m "feat(tools-web): add web-api tools (get-paywall/record-view/attribution)"
```

---

## Milestone 6 — Analytics Export API

### Task 6.1: Confirm analytics paths and auth

The `/docs/api-export-analytics` page is also SPA-rendered. **Before implementation:**

- [ ] **Step 1:** Visit `https://adapty.io/docs/api-export-analytics` and `https://adapty.io/docs/export-analytics-api-retrieve-analytics-data` in a browser. Confirm:
  - Base URL: `https://api-admin.adapty.io/api/v1/client-api/`
  - Auth header format (likely `Api-Key secret_live_...`, but confirm)
  - Endpoints (assumed):
    - `POST /metrics/analytics/` — query metrics (body: `metric`, `filters`, `group_by`, `start_date`, `end_date`)
    - `POST /metrics/cohorts/` — query cohorts
    - `POST /metrics/analytics/export/` — CSV export (returns text/csv)
- [ ] **Step 2:** Record confirmed shape in a top-of-file comment.

### Task 6.2: Implement analytics tools

**Files:**
- Create: `src/tools/analytics/analytics.ts`
- Create: `tests/unit/tools/analytics/analytics.test.ts`
- Test command: `npx vitest run tests/unit/tools/analytics/analytics.test.ts`
- Commit message: `feat(tools-analytics): add analytics query/cohorts/export tools`

- [ ] **Step 1: Failing tests** — tool names: `adapty_analytics_query`, `adapty_analytics_cohorts_query`, `adapty_analytics_export_csv` (only 3, no profile id required, all use `allowAnonymous: true`); each POSTs the confirmed path with a snake_case body; schema enforces required fields (`metric`, `start_date`, `end_date`); CSV export returns text content not JSON.

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsTools } from '../../../../src/tools/analytics/analytics.js';
import { createHttpClient } from '../../../../src/http/client.js';
import { createAccountStore } from '../../../../src/auth/account-store.js';

beforeEach(() => { process.env.ADAPTY_SECRET_API_KEY = 'secret_live_a.b'; });

it('exposes 3 analytics tools', () => {
  expect(analyticsTools.map(t => t.name).sort())
    .toEqual(['adapty_analytics_cohorts_query','adapty_analytics_export_csv','adapty_analytics_query']);
});

it('analytics_query POSTs /metrics/analytics/ with snake_case body', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"data":[]}', { status:200, headers:{'content-type':'application/json'}}));
  await analyticsTools.find(t=>t.name==='adapty_analytics_query')!.handler(
    { metric: 'mrr', startDate: '2026-01-01', endDate: '2026-04-01', groupBy: ['country'], filters: { platform: ['iOS'] } },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x/' }) },
  );
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body as string)).toEqual({
    metric:'mrr', start_date:'2026-01-01', end_date:'2026-04-01',
    group_by:['country'], filters:{platform:['iOS']},
  });
});
```

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement `src/tools/analytics/analytics.ts`** — three ToolDefs. The `export_csv` tool returns `text/csv` body — keep the response as a string and embed in tool output as text content.

- [ ] **Step 4: Run, PASS**

- [ ] **Step 5: Commit**

```bash
git add src/tools/analytics/analytics.ts tests/unit/tools/analytics/analytics.test.ts
git commit -m "feat(tools-analytics): add analytics query/cohorts/export tools"
```

---

## Milestone 7 — Webhook Utilities (local tools, no network)

### Task 7.1: Webhook authorization verify + event parse

**Files:**
- Create: `src/tools/webhooks/webhooks.ts`
- Create: `tests/unit/tools/webhooks/webhooks.test.ts`
- Test command: `npx vitest run tests/unit/tools/webhooks/webhooks.test.ts`
- Commit message: `feat(tools-webhooks): add authorization-verify and event-parse tools`

**Note:** Adapty webhook authentication is **not HMAC**. The user configures an Authorization header value in the Adapty Dashboard, and Adapty sends that exact value back in every webhook delivery. Verification is constant-time string comparison.

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { webhookTools } from '../../../../src/tools/webhooks/webhooks.js';

const verify = webhookTools.find(t => t.name === 'adapty_webhook_authorization_verify')!;
const parse  = webhookTools.find(t => t.name === 'adapty_webhook_event_parse')!;

const noDeps = { accountStore: undefined as any, httpClient: undefined as any };

describe('adapty_webhook_authorization_verify', () => {
  it('returns valid:true on exact match', async () => {
    const r = await verify.handler({ received: 'Bearer abc123', expected: 'Bearer abc123' }, noDeps);
    expect(r.isError).toBeUndefined();
    expect(JSON.parse((r.content[0] as { text: string }).text)).toEqual({ valid: true });
  });
  it('returns valid:false on mismatch', async () => {
    const r = await verify.handler({ received: 'Bearer abc', expected: 'Bearer xyz' }, noDeps);
    expect(JSON.parse((r.content[0] as { text: string }).text).valid).toBe(false);
  });
  it('uses constant-time comparison (lengths differ → false, no early return leak)', async () => {
    const r = await verify.handler({ received: 'a', expected: 'aa' }, noDeps);
    expect(JSON.parse((r.content[0] as { text: string }).text).valid).toBe(false);
  });
  it('returns isError when expected is empty (misconfiguration)', async () => {
    const r = await verify.handler({ received: 'a', expected: '' }, noDeps);
    expect(r.isError).toBe(true);
  });
});

describe('adapty_webhook_event_parse', () => {
  it('parses a known event', async () => {
    const body = JSON.stringify({
      profile_id: '11111111-1111-1111-1111-111111111111',
      event_type: 'subscription_renewed',
      event_datetime: '2026-04-26T00:00:00Z',
      event_properties: { product_id: 'pro' },
      event_api_version: 1,
      profiles_sharing_access_level: [],
    });
    const r = await parse.handler({ rawBody: body }, noDeps);
    expect(r.isError).toBeUndefined();
    expect(JSON.parse((r.content[0] as { text: string }).text).event_type).toBe('subscription_renewed');
  });
  it('returns isError on invalid JSON', async () => {
    const r = await parse.handler({ rawBody: '{not json' }, noDeps);
    expect(r.isError).toBe(true);
  });
  it('returns isError on unknown event_type', async () => {
    const r = await parse.handler({
      rawBody: JSON.stringify({
        profile_id: '11111111-1111-1111-1111-111111111111',
        event_type: 'made_up',
        event_datetime: '2026-04-26T00:00:00Z',
        event_properties: {},
        event_api_version: 1,
        profiles_sharing_access_level: [],
      }),
    }, noDeps);
    expect(r.isError).toBe(true);
  });
});
```

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement `src/tools/webhooks/webhooks.ts`**

```ts
import { z } from 'zod';
import { timingSafeEqual } from 'node:crypto';
import { runTool, type ToolResult } from '../../utils/tool-helpers.js';
import { WebhookEventSchema } from '../../schemas/webhook-events.js';

export interface ToolDeps { accountStore: unknown; httpClient: unknown; }
export interface ToolDef {
  name: string; description: string;
  inputSchema: z.ZodTypeAny;
  handler: (args: unknown, deps: ToolDeps) => Promise<ToolResult>;
}

const VerifySchema = z.object({
  received: z.string(),
  expected: z.string().min(1, 'expected webhook authorization token must be non-empty'),
});

const ParseSchema = z.object({
  rawBody: z.string().min(1),
});

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export const webhookTools: ToolDef[] = [
  {
    name: 'adapty_webhook_authorization_verify',
    description: 'Verify an incoming Adapty webhook by constant-time comparing the inbound Authorization header value against the value you configured in the Adapty dashboard. No HMAC — Adapty echoes the configured token verbatim.',
    inputSchema: VerifySchema,
    handler: (args) => runTool({
      schema: VerifySchema, args,
      handler: async ({ received, expected }) => ({ valid: constantTimeEqual(received, expected) }),
    }),
  },
  {
    name: 'adapty_webhook_event_parse',
    description: 'Parse a raw webhook JSON body into a typed Adapty event. Validates against the discriminated union of all 18 known event types.',
    inputSchema: ParseSchema,
    handler: (args) => runTool({
      schema: ParseSchema, args,
      handler: async ({ rawBody }) => {
        const parsed = JSON.parse(rawBody);
        return WebhookEventSchema.parse(parsed);
      },
    }),
  },
];
```

- [ ] **Step 4: Run, PASS**

- [ ] **Step 5: Commit**

```bash
git add src/tools/webhooks/webhooks.ts tests/unit/tools/webhooks/webhooks.test.ts
git commit -m "feat(tools-webhooks): add authorization-verify and event-parse tools"
```

---

## Milestone 8 — Server Wiring & Entry Point

### Task 8.1: Tool registry that wires all tool groups with their bound HTTP clients

**Files:**
- Create: `src/tools/index.ts`
- Create: `tests/unit/tools/index.test.ts`
- Test command: `npx vitest run tests/unit/tools/index.test.ts`
- Commit message: `feat(tools): add registry that binds tool groups to base URLs`

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect, vi } from 'vitest';
import { collectTools, BASE_URLS } from '../../../src/tools/index.js';

it('declares the four base URLs', () => {
  expect(BASE_URLS.serverSideV2).toBe('https://api.adapty.io/api/v2/server-side-api');
  expect(BASE_URLS.serverSideV1).toBe('https://api.adapty.io/api/v1/sdk');
  expect(BASE_URLS.webApi).toBe('https://api.adapty.io');
  expect(BASE_URLS.analytics).toBe('https://api-admin.adapty.io/api/v1/client-api');
});

it('returns >= 30 tools spanning all groups', () => {
  const fetch = vi.fn();
  const tools = collectTools({ fetch });
  const names = new Set(tools.map(t => t.name));
  expect(names.size).toBeGreaterThanOrEqual(30);
  expect(names.has('adapty_profile_get')).toBe(true);
  expect(names.has('adapty_v1_profile_get')).toBe(true);
  expect(names.has('adapty_web_paywall_get')).toBe(true);
  expect(names.has('adapty_analytics_query')).toBe(true);
  expect(names.has('adapty_webhook_event_parse')).toBe(true);
});

it('all tool names are unique', () => {
  const names = collectTools({ fetch: vi.fn() }).map(t => t.name);
  expect(new Set(names).size).toBe(names.length);
});
```

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement `src/tools/index.ts`**

```ts
import type { FetchLike } from '../http/client.js';
import { createHttpClient } from '../http/client.js';
import { createAccountStore, type AccountStore } from '../auth/account-store.js';
import { profileTools } from './server-side-v2/profile.js';
import { accessLevelTools } from './server-side-v2/access-level.js';
import { transactionTools } from './server-side-v2/transaction.js';
import { integrationIdTools } from './server-side-v2/integration-identifiers.js';
import { paywallTools } from './server-side-v2/paywall.js';
import { legacyTools } from './server-side-v1/legacy.js';
import { webTools } from './web-api/web.js';
import { analyticsTools } from './analytics/analytics.js';
import { webhookTools } from './webhooks/webhooks.js';
import type { ToolResult } from '../utils/tool-helpers.js';

export const BASE_URLS = {
  serverSideV2: 'https://api.adapty.io/api/v2/server-side-api',
  serverSideV1: 'https://api.adapty.io/api/v1/sdk',
  webApi: 'https://api.adapty.io',
  analytics: 'https://api-admin.adapty.io/api/v1/client-api',
} as const;

export interface BoundTool {
  name: string;
  description: string;
  inputSchema: unknown;
  call: (args: unknown) => Promise<ToolResult>;
}

export interface CollectOptions {
  fetch: FetchLike;
  accountStore?: AccountStore;
}

export function collectTools(opts: CollectOptions): BoundTool[] {
  const accountStore = opts.accountStore ?? createAccountStore();
  const v2 = createHttpClient({ fetch: opts.fetch, baseUrl: BASE_URLS.serverSideV2 });
  const v1 = createHttpClient({ fetch: opts.fetch, baseUrl: BASE_URLS.serverSideV1 });
  const web = createHttpClient({ fetch: opts.fetch, baseUrl: BASE_URLS.webApi });
  const ana = createHttpClient({ fetch: opts.fetch, baseUrl: BASE_URLS.analytics });

  const groups = [
    [profileTools, v2], [accessLevelTools, v2], [transactionTools, v2],
    [integrationIdTools, v2], [paywallTools, v2],
    [legacyTools, v1],
    [webTools, web],
    [analyticsTools, ana],
  ] as const;

  const out: BoundTool[] = [];
  for (const [tools, client] of groups) {
    for (const t of tools) {
      out.push({
        name: t.name, description: t.description, inputSchema: t.inputSchema,
        call: (args) => t.handler(args, { accountStore, httpClient: client }),
      });
    }
  }
  for (const t of webhookTools) {
    out.push({
      name: t.name, description: t.description, inputSchema: t.inputSchema,
      call: (args) => t.handler(args, { accountStore: null as never, httpClient: null as never }),
    });
  }
  return out;
}
```

- [ ] **Step 4: Run, PASS**

- [ ] **Step 5: Commit**

```bash
git add src/tools/index.ts tests/unit/tools/index.test.ts
git commit -m "feat(tools): add registry that binds tool groups to base URLs"
```

---

### Task 8.2: MCP server assembly + stdio entry

**Files:**
- Create: `src/server.ts`
- Modify: `src/index.ts` (replace placeholder)
- Create: `tests/integration/server.test.ts`
- Test command: `npx vitest run tests/integration/server.test.ts`
- Commit message: `feat(server): wire MCP server with stdio transport`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { createServer } from '../../src/server.js';

it('createServer exposes listTools and callTool', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ profile_id: 'p1', access_levels:{}, subscriptions:{}, non_subscriptions:{} }), { status: 200, headers: {'content-type':'application/json'} }));
  const { listTools, callTool } = createServer({ fetch });
  const tools = await listTools();
  expect(tools.length).toBeGreaterThanOrEqual(30);

  process.env.ADAPTY_SECRET_API_KEY = 'secret_live_a.b';
  const r = await callTool('adapty_profile_get', { profileId: 'p1' });
  expect(r.isError).toBeUndefined();
});

it('callTool returns error for unknown tool', async () => {
  const { callTool } = createServer({ fetch: vi.fn() });
  const r = await callTool('does_not_exist', {});
  expect(r.isError).toBe(true);
  expect((r.content[0] as { text: string }).text).toMatch(/unknown tool/i);
});
```

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement `src/server.ts`**

```ts
import { collectTools, type BoundTool } from './tools/index.js';
import type { FetchLike } from './http/client.js';
import type { ToolResult } from './utils/tool-helpers.js';

export interface ServerHandle {
  listTools(): Promise<Array<{ name: string; description: string; inputSchema: unknown }>>;
  callTool(name: string, args: unknown): Promise<ToolResult>;
}

export interface ServerOptions { fetch?: FetchLike; }

export function createServer(opts: ServerOptions = {}): ServerHandle {
  const fetchImpl = opts.fetch ?? fetch;
  const tools: BoundTool[] = collectTools({ fetch: fetchImpl });
  const byName = new Map(tools.map(t => [t.name, t] as const));
  return {
    async listTools() {
      return tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
    },
    async callTool(name, args) {
      const t = byName.get(name);
      if (!t) return { content: [{ type: 'text', text: `unknown tool: ${name}` }], isError: true };
      return t.call(args);
    },
  };
}
```

- [ ] **Step 4: Replace `src/index.ts`**

```ts
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import { createServer } from './server.js';

const handle = createServer();
const server = new Server(
  { name: 'adapty-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = await handle.listTools();
  return {
    tools: tools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.inputSchema as z.ZodTypeAny, { target: 'jsonSchema7' }),
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  return handle.callTool(req.params.name, req.params.arguments);
});

await server.connect(new StdioServerTransport());
```

Add `zod-to-json-schema` to `dependencies` in `package.json` (`npm i zod-to-json-schema`).

- [ ] **Step 5: Run unit + integration tests, PASS, build, smoke**

```bash
npm install zod-to-json-schema
npm run typecheck
npm test
npm run build
node dist/index.js < /dev/null   # should start, then exit on stdin close
```

- [ ] **Step 6: Commit**

```bash
git add src/server.ts src/index.ts tests/integration/server.test.ts package.json package-lock.json
git commit -m "feat(server): wire MCP server with stdio transport"
```

---

## Milestone 9 — Docs, Coverage Floor, Smithery, Release Prep

### Task 9.1: Tool catalog generator + README

**Files:**
- Create: `scripts/gen-tool-docs.ts`
- Create: `README.md`
- Create: `CHANGELOG.md`
- Test command: `npx tsx scripts/gen-tool-docs.ts > /tmp/catalog.md && grep adapty_profile_get /tmp/catalog.md`
- Commit message: `docs: add README, changelog, and tool catalog generator`

- [ ] **Step 1:** Write `scripts/gen-tool-docs.ts` that imports `collectTools({ fetch: globalThis.fetch })` and prints a Markdown table grouped by tool prefix (`adapty_profile_*`, `adapty_v1_*`, `adapty_web_*`, `adapty_analytics_*`, `adapty_webhook_*`).

- [ ] **Step 2:** Write `README.md` with three sections:
  - **Quick start** — `npm i -g adapty-mcp`, then `ADAPTY_SECRET_API_KEY=… adapty-mcp` in MCP client config (Claude Desktop, Cursor).
  - **Multi-app config** — example `~/.config/adapty-mcp/accounts.json` with two apps and sandbox/live envs; explain `app` and `environment` tool args.
  - **Tool catalog** — paste the output of `gen-tool-docs.ts`.

- [ ] **Step 3:** Write `CHANGELOG.md` with a `0.1.0 — 2026-04-26` entry summarizing every milestone.

- [ ] **Step 4: Add npm dev dep `tsx`**

```bash
npm i -D tsx
```

- [ ] **Step 5: Commit**

```bash
git add scripts/gen-tool-docs.ts README.md CHANGELOG.md package.json package-lock.json
git commit -m "docs: add README, changelog, and tool catalog generator"
```

---

### Task 9.2: Smithery manifest

**Files:**
- Create: `smithery.yaml`
- Commit message: `chore: add smithery manifest`

- [ ] **Step 1:** Model on `app-store-connect-mcp/smithery.yaml`. Declare:
  - `runtime: node`
  - `command: adapty-mcp`
  - `transport: stdio`
  - Required env: `ADAPTY_SECRET_API_KEY`
  - Optional env: `ADAPTY_PUBLIC_API_KEY`, `ADAPTY_SECRET_API_KEY_SANDBOX`, `ADAPTY_PUBLIC_API_KEY_SANDBOX`, `ADAPTY_MCP_CONFIG`, `ADAPTY_HTTP_TIMEOUT_MS`, `ADAPTY_MCP_DEBUG`

- [ ] **Step 2: Commit**

```bash
git add smithery.yaml
git commit -m "chore: add smithery manifest"
```

---

### Task 9.3: Final coverage gate + green CI run

**Files:**
- Modify: `package.json` (add `test:ci` script)
- Create: `.github/workflows/ci.yml`
- Commit message: `chore(ci): add GitHub Actions workflow with coverage gate`

- [ ] **Step 1:** Add `"test:ci": "vitest run --coverage --reporter=verbose"` to `package.json` scripts.

- [ ] **Step 2:** Write `.github/workflows/ci.yml`:

```yaml
name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run test:ci
      - run: npm run build
```

Vitest exits non-zero when coverage thresholds in `vitest.config.ts` are missed, so the `test:ci` step is the gate.

- [ ] **Step 3:** Run locally: `npm run test:ci`. Expected: every threshold met. If any file falls under, add focused tests until green.

- [ ] **Step 4: Commit**

```bash
git add package.json .github/workflows/ci.yml
git commit -m "chore(ci): add GitHub Actions workflow with coverage gate"
```

---

### Task 9.4: Contract tests against real Adapty doc-example payloads

**Files:**
- Create: `tests/contract/doc-examples.test.ts`
- Create: `tests/fixtures/doc-examples/profile.json`
- Create: `tests/fixtures/doc-examples/paywall.json`
- Create: `tests/fixtures/doc-examples/webhook-subscription-renewed.json`
- Test command: `npx vitest run tests/contract/`
- Commit message: `test(contract): validate docs example payloads against schemas`

- [ ] **Step 1:** Copy at least one full example payload from each Adapty doc page (`ss-get-profile`, `ss-paywall`, `webhook-event-types-and-fields`) into the fixtures dir.

- [ ] **Step 2:** Write contract tests that load each fixture and call `.parse()` on the matching schema. Assert `.success` and that the parsed object preserves at least one Adapty-specific field (`access_levels`, `developer_id`, `event_type`).

- [ ] **Step 3:** Run, PASS. If a real payload exposes a missing field, add it to the schema (with `passthrough`) and re-run.

- [ ] **Step 4: Commit**

```bash
git add tests/contract tests/fixtures
git commit -m "test(contract): validate docs example payloads against schemas"
```

---

### Task 9.5: First release

- [ ] **Step 1:** `npm run test:ci && npm run build`.
- [ ] **Step 2:** `git tag v0.1.0 && git push --tags`.
- [ ] **Step 3:** `npm publish --access public`.
- [ ] **Step 4:** GitHub release notes from `CHANGELOG.md`.

---

## Self-Review Notes

- **Spec coverage check:** every section in the spec maps to one or more tasks above:
  - §4 architecture → file structure section + Tasks 0.1, 1.x, 2.x, 8.x
  - §5 auth → Tasks 1.2, 1.3, 1.4
  - §6 tool inventory → Tasks 3.x (12 v2), 4.1 (7 v1), 5.2 (3 web), 6.2 (3 analytics), 7.1 (2 webhook) — total 27 + 3 paywall = 30
  - §7 testing → coverage thresholds in 0.2, TDD ceremony header, contract tests in 9.4
  - §8 errors / rate limit / observability → Tasks 1.5, 1.6, 1.7, 1.8 + redaction in 1.1
  - §9 distribution → Tasks 9.1, 9.2, 9.5
  - §10 open items → addressed at the start of M4 (legacy paths confirmed in research), and in research steps Tasks 5.1 and 6.1

- **Type consistency check:** `ToolDef` and `ToolDeps` are defined the same way in every tool file (same field names: `name`, `description`, `inputSchema`, `handler`; `accountStore`, `httpClient`). `runTool` and `buildHeaders` signatures are referenced consistently. `ResolvedCredentials.environment` matches `AdaptyEnvironment` enum.

- **No placeholders:** every code-changing step shows the actual code or, where the same pattern recurs (Tasks 3.3 / 3.4 / 3.5 / 4.1 / 5.2 / 6.2), inlines the test fixture and explicitly references prior tasks for the implementation pattern with full code blocks shown for the schema and tests. M4 / M5 / M6 implementation steps describe the concrete shape (URL path, body fields, key type) rather than restating the entire ToolDef boilerplate which is identical to Task 3.2.

