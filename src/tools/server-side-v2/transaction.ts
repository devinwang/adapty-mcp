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

const SetTransactionSchema = Target.merge(CommonRequestSchema).extend({
  store: z.enum(['app_store','play_store']),
  transactionId: z.string().min(1),
  productId: z.string().min(1).optional(),
  receipt: z.string().optional(),
  purchaseToken: z.string().optional(),
});

const StripeValidateSchema = Target.merge(CommonRequestSchema).extend({
  subscriptionId: z.string().min(1).optional(),
  customerId: z.string().min(1).optional(),
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

export const transactionTools: ToolDef[] = [
  {
    name: 'adapty_transaction_set',
    description: 'Submit a store transaction (App Store or Google Play) for Adapty to verify and record. Use case: server-side receipt validation when your client cannot reach Adapty directly.',
    inputSchema: SetTransactionSchema,
    handler: (args, deps) => runTool({
      schema: SetTransactionSchema, args,
      handler: async (a) => deps.httpClient.request({
        method: 'POST', path: '/transaction',
        headers: headers(deps, a),
        body: {
          store: a.store,
          transaction_id: a.transactionId,
          ...(a.productId !== undefined ? { product_id: a.productId } : {}),
          ...(a.receipt !== undefined ? { receipt: a.receipt } : {}),
          ...(a.purchaseToken !== undefined ? { purchase_token: a.purchaseToken } : {}),
        },
      }),
    }),
  },
  {
    name: 'adapty_stripe_purchase_validate',
    description: 'Validate a Stripe subscription/customer with Adapty. Use case: granting access on Stripe purchase events.',
    inputSchema: StripeValidateSchema,
    handler: (args, deps) => runTool({
      schema: StripeValidateSchema, args,
      handler: async (a) => deps.httpClient.request({
        method: 'POST', path: '/stripe-purchase',
        headers: headers(deps, a),
        body: {
          ...(a.subscriptionId !== undefined ? { subscription_id: a.subscriptionId } : {}),
          ...(a.customerId !== undefined ? { customer_id: a.customerId } : {}),
        },
      }),
    }),
  },
];
