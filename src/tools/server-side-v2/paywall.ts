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

const PaywallGetSchema = z.object({
  developerId: z.string().min(1),
}).merge(CommonRequestSchema);

const PaywallsListSchema = CommonRequestSchema;

const PaywallProductSchema = z.object({
  vendorProductId: z.string().min(1),
  developerId: z.string().min(1).optional(),
});

const PaywallUpdateSchema = z.object({
  developerId: z.string().min(1),
  name: z.string().min(1).optional(),
  remoteConfig: z.record(z.string(), z.unknown()).optional(),
  products: z.array(PaywallProductSchema).optional(),
}).merge(CommonRequestSchema).refine(
  v => v.name !== undefined || v.remoteConfig !== undefined || v.products !== undefined,
  { message: 'at least one mutable field (name, remoteConfig, products) required' },
);

function paywallHeaders(
  deps: ToolDeps,
  a: { app?: string | undefined; environment?: 'live' | 'sandbox' | undefined; platform?: string | undefined },
) {
  const cred = deps.accountStore.resolve({
    ...(a.app !== undefined ? { app: a.app } : {}),
    ...(a.environment !== undefined ? { environment: a.environment } : {}),
  });
  return buildHeaders({
    credentials: cred,
    keyType: 'secret',
    allowAnonymous: true,
    ...(a.platform !== undefined ? { platform: a.platform as AdaptyPlatform } : {}),
  });
}

export const paywallTools: ToolDef[] = [
  {
    name: 'adapty_paywall_get',
    description: 'Fetch a single paywall by its developer ID. Use case: server-side rendering of a paywall configuration.',
    inputSchema: PaywallGetSchema,
    handler: (args, deps) => runTool({
      schema: PaywallGetSchema, args,
      handler: async (a) => deps.httpClient.request({
        method: 'GET', path: '/paywall',
        headers: paywallHeaders(deps, a),
        query: { developer_id: a.developerId },
      }),
    }),
  },
  {
    name: 'adapty_paywalls_list',
    description: 'List all paywalls configured for the current Adapty app. Use case: build a server-side index of paywall keys.',
    inputSchema: PaywallsListSchema,
    handler: (args, deps) => runTool({
      schema: PaywallsListSchema, args,
      handler: async (a) => deps.httpClient.request({
        method: 'GET', path: '/paywalls',
        headers: paywallHeaders(deps, a),
      }),
    }),
  },
  {
    name: 'adapty_paywall_update',
    description: 'Update a paywall configuration (name, remote_config, products). Use case: rotate remote config or product list from a server-side admin tool.',
    inputSchema: PaywallUpdateSchema,
    handler: (args, deps) => runTool({
      schema: PaywallUpdateSchema, args,
      handler: async (a) => {
        const body: Record<string, unknown> = { developer_id: a.developerId };
        if (a.name !== undefined) body['name'] = a.name;
        if (a.remoteConfig !== undefined) body['remote_config'] = a.remoteConfig;
        if (a.products !== undefined) {
          body['products'] = a.products.map(p => ({
            vendor_product_id: p.vendorProductId,
            ...(p.developerId !== undefined ? { developer_id: p.developerId } : {}),
          }));
        }
        return deps.httpClient.request({
          method: 'PUT', path: '/paywall',
          headers: paywallHeaders(deps, a),
          body,
        });
      },
    }),
  },
];
