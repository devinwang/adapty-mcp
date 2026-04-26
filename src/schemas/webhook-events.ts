import { z } from 'zod';
import { ProfileIdSchema, IsoDateTimeSchema } from './common.js';

export const WEBHOOK_EVENT_TYPES = [
  'subscription_started',
  'subscription_renewed',
  'subscription_renewal_cancelled',
  'subscription_renewal_reactivated',
  'subscription_expired',
  'subscription_paused',
  'subscription_deferred',
  'non_subscription_purchase',
  'trial_started',
  'trial_converted',
  'trial_renewal_cancelled',
  'trial_renewal_reactivated',
  'trial_expired',
  'entered_grace_period',
  'billing_issue_detected',
  'subscription_refunded',
  'non_subscription_purchase_refunded',
  'access_level_updated',
] as const;
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

const BaseEventSchema = z.object({
  profile_id: ProfileIdSchema,
  customer_user_id: z.string().nullable().optional(),
  idfv: z.string().nullable().optional(),
  idfa: z.string().nullable().optional(),
  advertising_id: z.string().nullable().optional(),
  profile_install_datetime: IsoDateTimeSchema.optional(),
  user_agent: z.string().optional(),
  email: z.string().nullable().optional(),
  event_type: z.enum(WEBHOOK_EVENT_TYPES),
  event_datetime: IsoDateTimeSchema,
  event_properties: z.record(z.string(), z.unknown()),
  event_api_version: z.number().int(),
  profiles_sharing_access_level: z.array(z.unknown()),
  attributions: z.record(z.string(), z.unknown()).optional(),
  user_attributes: z.record(z.string(), z.unknown()).optional(),
  integration_ids: z.record(z.string(), z.unknown()).optional(),
  play_store_purchase_token: z.unknown().optional(),
}).passthrough();

export const WebhookEventSchema = BaseEventSchema;
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
