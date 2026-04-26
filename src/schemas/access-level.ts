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
