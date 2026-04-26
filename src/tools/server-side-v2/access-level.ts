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
