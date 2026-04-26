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
  webApi: 'https://api.adapty.io/api/v2/web-api',
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
