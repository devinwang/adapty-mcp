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

function buildHeadersOrThrow(deps: ToolDeps, args: z.infer<typeof TargetSchema> & { app?: string | undefined; environment?: 'live'|'sandbox' | undefined; platform?: string | undefined }) {
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
