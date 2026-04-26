import { z } from 'zod';
import { buildHeaders } from '../../auth/headers.js';
import type { AccountStore } from '../../auth/account-store.js';
import type { HttpClient } from '../../http/client.js';
import { CommonRequestSchema, ProfileIdSchema, CustomerUserIdSchema } from '../../schemas/common.js';
import { runTool, type ToolResult } from '../../utils/tool-helpers.js';

export interface ToolDeps { accountStore: AccountStore; httpClient: HttpClient; }
export interface ToolDef {
  name: string; description: string;
  inputSchema: z.ZodTypeAny;
  handler: (args: unknown, deps: ToolDeps) => Promise<ToolResult>;
}

const Target = z.object({ profileId: ProfileIdSchema.optional(), customerUserId: CustomerUserIdSchema.optional() });

const IntegrationIdentifiersSchema = Target.merge(CommonRequestSchema).extend({
  identifiers: z.record(z.string(), z.string().min(1)).refine(o => Object.keys(o).length > 0, 'at least one identifier required'),
});

function headers(deps: ToolDeps, a: z.infer<typeof Target> & { app?: string | undefined; environment?: 'live'|'sandbox' | undefined; platform?: string | undefined }) {
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

export const integrationIdTools: ToolDef[] = [
  {
    name: 'adapty_integration_identifiers_set',
    description: 'Attach external integration identifiers (Amplitude, Mixpanel, AppsFlyer, etc.) to an Adapty profile so server-to-server analytics can correlate the same user across systems.',
    inputSchema: IntegrationIdentifiersSchema,
    handler: (args, deps) => runTool({
      schema: IntegrationIdentifiersSchema, args,
      handler: async (a) => deps.httpClient.request({
        method: 'POST', path: '/integration-identifiers',
        headers: headers(deps, a),
        body: a.identifiers,
      }),
    }),
  },
];
