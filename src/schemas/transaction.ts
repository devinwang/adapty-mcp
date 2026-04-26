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
