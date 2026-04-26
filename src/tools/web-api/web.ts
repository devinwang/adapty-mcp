/**
 * Web API tools (uses public API key, not secret).
 *
 * Paths confirmed against https://adapty.io/docs/api-web (via deep-link operation
 * pages — the index page is SPA-only). Body field names are working assumptions
 * from the implementation plan; tighten in M9.4 contract tests if Adapty's
 * Postman collection or live responses disagree.
 *
 *   adapty_web_paywall_get          POST /paywall/
 *   adapty_web_paywall_view_record  POST /paywall/visit/
 *   adapty_web_attribution_set      POST /attribution/
 */
import { z } from 'zod';
import { buildHeaders, type AdaptyPlatform } from '../../auth/headers.js';
import type { AccountStore } from '../../auth/account-store.js';
import type { HttpClient } from '../../http/client.js';
import { CommonRequestSchema } from '../../schemas/common.js';
import { runTool, type ToolResult } from '../../utils/tool-helpers.js';

export interface ToolDeps { accountStore: AccountStore; httpClient: HttpClient; }
export interface ToolDef {
  name: string; description: string;
  inputSchema: z.ZodTypeAny;
  handler: (args: unknown, deps: ToolDeps) => Promise<ToolResult>;
}

const Target = z.object({
  profileId: z.string().min(1).optional(),
  customerUserId: z.string().min(1).optional(),
});

const WebPaywallGetSchema = Target.merge(CommonRequestSchema).extend({
  developerId: z.string().min(1),
});

const WebPaywallViewSchema = Target.merge(CommonRequestSchema).extend({
  developerId: z.string().min(1),
  paywallRevision: z.number().int().nonnegative(),
});

const WebAttributionSchema = Target.merge(CommonRequestSchema).extend({
  source: z.string().min(1),
  networkUserId: z.string().min(1).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

function webHeaders(
  deps: ToolDeps,
  a: {
    app?: string | undefined;
    environment?: 'live' | 'sandbox' | undefined;
    platform?: string | undefined;
    profileId?: string | undefined;
    customerUserId?: string | undefined;
  },
) {
  const cred = deps.accountStore.resolve({
    ...(a.app !== undefined ? { app: a.app } : {}),
    ...(a.environment !== undefined ? { environment: a.environment } : {}),
  });
  return buildHeaders({
    credentials: cred,
    keyType: 'public',
    allowAnonymous: false,
    ...(a.profileId !== undefined ? { profileId: a.profileId } : {}),
    ...(a.customerUserId !== undefined ? { customerUserId: a.customerUserId } : {}),
    ...(a.platform !== undefined ? { platform: a.platform as AdaptyPlatform } : {}),
  });
}

export const webTools: ToolDef[] = [
  {
    name: 'adapty_web_paywall_get',
    description: 'Fetch a web-rendered paywall configuration by its developer ID. Use case: server-side rendering of a paywall on a marketing landing page.',
    inputSchema: WebPaywallGetSchema,
    handler: (args, deps) => runTool({
      schema: WebPaywallGetSchema, args,
      handler: async (a) => deps.httpClient.request({
        method: 'POST', path: '/paywall/',
        headers: webHeaders(deps, a),
        body: { developer_id: a.developerId },
      }),
    }),
  },
  {
    name: 'adapty_web_paywall_view_record',
    description: 'Record that a paywall was viewed by a customer. Use case: track impressions for conversion analytics.',
    inputSchema: WebPaywallViewSchema,
    handler: (args, deps) => runTool({
      schema: WebPaywallViewSchema, args,
      handler: async (a) => deps.httpClient.request({
        method: 'POST', path: '/paywall/visit/',
        headers: webHeaders(deps, a),
        body: { developer_id: a.developerId, paywall_revision: a.paywallRevision },
      }),
    }),
  },
  {
    name: 'adapty_web_attribution_set',
    description: 'Attach marketing attribution metadata (source/network/attributes) to a profile. Use case: forward MMP postbacks to Adapty.',
    inputSchema: WebAttributionSchema,
    handler: (args, deps) => runTool({
      schema: WebAttributionSchema, args,
      handler: async (a) => {
        const body: Record<string, unknown> = { source: a.source };
        if (a.networkUserId !== undefined) body['network_user_id'] = a.networkUserId;
        if (a.attributes !== undefined) body['attributes'] = a.attributes;
        return deps.httpClient.request({
          method: 'POST', path: '/attribution/',
          headers: webHeaders(deps, a),
          body,
        });
      },
    }),
  },
];
