import { z } from 'zod';
import { buildHeaders } from '../../auth/headers.js';
import type { AccountStore } from '../../auth/account-store.js';
import type { HttpClient } from '../../http/client.js';
import {
  CommonRequestSchema,
  ProfileIdSchema,
  CustomerUserIdSchema,
  IsoDateTimeSchema,
} from '../../schemas/common.js';
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

const Target = z.object({
  profileId: ProfileIdSchema.optional(),
  customerUserId: CustomerUserIdSchema.optional(),
});

const GetSchema = Target.merge(CommonRequestSchema);
const CreateSchema = Target.merge(CommonRequestSchema).extend({
  attributes: z.record(z.string(), z.unknown()).optional(),
});
const UpdateSchema = Target.merge(CommonRequestSchema).extend({
  attributes: z.record(z.string(), z.unknown()),
});
const DeleteSchema = Target.merge(CommonRequestSchema);
const GrantSchema = Target.merge(CommonRequestSchema).extend({
  accessLevelId: z.string().min(1),
  startsAt: IsoDateTimeSchema.optional(),
  expiresAt: IsoDateTimeSchema.optional(),
  store: z.enum(['app_store', 'play_store', 'stripe', 'manual']).default('manual'),
});
const RevokeSchema = Target.merge(CommonRequestSchema).extend({
  accessLevelId: z.string().min(1),
});
const StripeTokenValidateSchema = Target.merge(CommonRequestSchema).extend({
  token: z.string().min(1),
});

type TargetArgs = z.infer<typeof Target> & {
  app?: string | undefined;
  environment?: 'live' | 'sandbox' | undefined;
  platform?: string | undefined;
};

function legacyHeaders(deps: ToolDeps, a: TargetArgs) {
  const cred = deps.accountStore.resolve({
    ...(a.app !== undefined ? { app: a.app } : {}),
    ...(a.environment !== undefined ? { environment: a.environment } : {}),
  });
  return buildHeaders({
    credentials: cred,
    keyType: 'secret',
    ...(a.profileId !== undefined ? { profileId: a.profileId } : {}),
    ...(a.customerUserId !== undefined ? { customerUserId: a.customerUserId } : {}),
    ...(a.platform !== undefined ? { platform: a.platform as 'iOS' | 'macOS' | 'iPadOS' | 'visionOS' | 'Android' | 'web' } : {}),
  });
}

function targetId(a: { profileId?: string | undefined; customerUserId?: string | undefined }): string {
  const id = a.profileId ?? a.customerUserId;
  if (!id) throw new Error('one of profileId or customerUserId is required');
  return id;
}

function pathWithId(template: string, id: string): string {
  return template.replace('{id}', encodeURIComponent(id));
}

function pathWithIdAndAccessLevel(template: string, id: string, accessLevel: string): string {
  return template
    .replace('{id}', encodeURIComponent(id))
    .replace('{accessLevel}', encodeURIComponent(accessLevel));
}

export const legacyTools: ToolDef[] = [
  {
    name: 'adapty_v1_profile_get',
    description: '[LEGACY — prefer v2 equivalent] Fetch a v1 SDK profile by profile id or customer user id. Use case: maintain compatibility with apps still on the v1 SDK API surface.',
    inputSchema: GetSchema,
    handler: (args, deps) => runTool({
      schema: GetSchema, args,
      handler: async (a) => deps.httpClient.request({
        method: 'GET',
        path: pathWithId('/profiles/{id}/', targetId(a)),
        headers: legacyHeaders(deps, a),
      }),
    }),
  },
  {
    name: 'adapty_v1_profile_create',
    description: '[LEGACY — prefer v2 equivalent] Create a v1 SDK profile via the legacy /profiles/ endpoint. Use case: pre-create profiles from a backend integrated against the v1 SDK API.',
    inputSchema: CreateSchema,
    handler: (args, deps) => runTool({
      schema: CreateSchema, args,
      handler: async (a) => deps.httpClient.request({
        method: 'POST',
        path: '/profiles/',
        headers: legacyHeaders(deps, a),
        body: {
          ...(a.customerUserId ? { customer_user_id: a.customerUserId } : {}),
          ...(a.profileId ? { profile_id: a.profileId } : {}),
          ...(a.attributes ?? {}),
        },
      }),
    }),
  },
  {
    name: 'adapty_v1_profile_update',
    description: '[LEGACY — prefer v2 equivalent] Patch a v1 SDK profile attributes payload. Use case: sync profile changes through the legacy SDK API.',
    inputSchema: UpdateSchema,
    handler: (args, deps) => runTool({
      schema: UpdateSchema, args,
      handler: async (a) => deps.httpClient.request({
        method: 'PATCH',
        path: pathWithId('/profiles/{id}/', targetId(a)),
        headers: legacyHeaders(deps, a),
        body: a.attributes,
      }),
    }),
  },
  {
    name: 'adapty_v1_profile_delete',
    description: '[LEGACY — prefer v2 equivalent] Delete a v1 SDK profile via /profiles/{id}/delete. Use case: GDPR/CCPA delete request for legacy integrations.',
    inputSchema: DeleteSchema,
    handler: (args, deps) => runTool({
      schema: DeleteSchema, args,
      handler: async (a) => deps.httpClient.request({
        method: 'DELETE',
        path: pathWithId('/profiles/{id}/delete', targetId(a)),
        headers: legacyHeaders(deps, a),
      }),
    }),
  },
  {
    name: 'adapty_v1_access_level_grant',
    description: '[LEGACY — prefer v2 equivalent] Grant or extend a paid access level via the v1 SDK URL-scoped endpoint. Use case: comp an account through the legacy API.',
    inputSchema: GrantSchema,
    handler: (args, deps) => runTool({
      schema: GrantSchema, args,
      handler: async (a) => deps.httpClient.request({
        method: 'POST',
        path: pathWithIdAndAccessLevel(
          '/profiles/{id}/paid-access-levels/{accessLevel}/grant/',
          targetId(a),
          a.accessLevelId,
        ),
        headers: legacyHeaders(deps, a),
        body: {
          ...(a.startsAt ? { starts_at: a.startsAt } : {}),
          ...(a.expiresAt ? { expires_at: a.expiresAt } : {}),
          store: a.store,
        },
      }),
    }),
  },
  {
    name: 'adapty_v1_access_level_revoke',
    description: '[LEGACY — prefer v2 equivalent] Revoke a previously granted paid access level via the v1 SDK URL-scoped endpoint. Use case: undo a manual grant on legacy stacks.',
    inputSchema: RevokeSchema,
    handler: (args, deps) => runTool({
      schema: RevokeSchema, args,
      handler: async (a) => deps.httpClient.request({
        method: 'POST',
        path: pathWithIdAndAccessLevel(
          '/profiles/{id}/paid-access-levels/{accessLevel}/revoke/',
          targetId(a),
          a.accessLevelId,
        ),
        headers: legacyHeaders(deps, a),
        body: {},
      }),
    }),
  },
  {
    name: 'adapty_v1_stripe_token_validate',
    description: '[LEGACY — prefer v2 equivalent] Validate a Stripe token through the v1 SDK /purchase/stripe/token/validate/ endpoint. Use case: verify a Stripe token in legacy purchase flows.',
    inputSchema: StripeTokenValidateSchema,
    handler: (args, deps) => runTool({
      schema: StripeTokenValidateSchema, args,
      handler: async (a) => deps.httpClient.request({
        method: 'POST',
        path: '/purchase/stripe/token/validate/',
        headers: legacyHeaders(deps, a),
        body: { token: a.token },
      }),
    }),
  },
];
