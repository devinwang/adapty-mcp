import { z } from 'zod';
import { ProfileIdSchema, CustomerUserIdSchema } from './common.js';

export const AdaptyProfileSchema = z.object({
  profile_id: ProfileIdSchema,
  customer_user_id: CustomerUserIdSchema.nullable().optional(),
  access_levels: z.record(z.string(), z.unknown()).default({}),
  subscriptions: z.record(z.string(), z.unknown()).default({}),
  non_subscriptions: z.record(z.string(), z.unknown()).default({}),
}).passthrough();
export type AdaptyProfile = z.infer<typeof AdaptyProfileSchema>;

export const ProfileAttributesUpdateSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  phone_number: z.string().optional(),
  birthday: z.string().optional(),
  gender: z.enum(['m', 'f', 'o']).optional(),
  custom_attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});
export type ProfileAttributesUpdate = z.infer<typeof ProfileAttributesUpdateSchema>;
