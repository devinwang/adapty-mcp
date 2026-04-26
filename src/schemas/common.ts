import { z } from 'zod';

export const ProfileIdSchema = z.string().min(1).describe('Adapty profile UUID');
export const CustomerUserIdSchema = z.string().min(1).describe('Your system\'s user identifier');
export const PlatformSchema = z.enum(['iOS', 'macOS', 'iPadOS', 'visionOS', 'Android', 'web']);
export const AppParamSchema = z.string().min(1).optional().describe('App name from accounts config (omit to use default)');
export const EnvironmentParamSchema = z.enum(['live', 'sandbox']).optional().describe('Environment to use (default: live)');
export const IsoDateTimeSchema = z.string().refine(s => !Number.isNaN(Date.parse(s)), 'must be ISO datetime');

export const ProfileTargetSchema = z.object({
  profileId: ProfileIdSchema.optional(),
  customerUserId: CustomerUserIdSchema.optional(),
}).refine(v => (v.profileId ? 1 : 0) + (v.customerUserId ? 1 : 0) === 1, {
  message: 'pass exactly one of profileId or customerUserId',
});

export const CommonRequestSchema = z.object({
  app: AppParamSchema,
  environment: EnvironmentParamSchema,
  platform: PlatformSchema.optional(),
});
