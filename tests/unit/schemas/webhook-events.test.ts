import { describe, it, expect } from 'vitest';
import { WEBHOOK_EVENT_TYPES, WebhookEventSchema } from '../../../src/schemas/webhook-events.js';

const ALL = [
  'subscription_started','subscription_renewed','subscription_renewal_cancelled',
  'subscription_renewal_reactivated','subscription_expired','subscription_paused',
  'subscription_deferred','non_subscription_purchase','trial_started','trial_converted',
  'trial_renewal_cancelled','trial_renewal_reactivated','trial_expired',
  'entered_grace_period','billing_issue_detected','subscription_refunded',
  'non_subscription_purchase_refunded','access_level_updated',
];

describe('WEBHOOK_EVENT_TYPES', () => {
  it('contains all 18 known event types', () => {
    expect(new Set(WEBHOOK_EVENT_TYPES)).toEqual(new Set(ALL));
  });
});

describe('WebhookEventSchema', () => {
  it.each(ALL)('parses minimal payload for %s', (event_type) => {
    const payload = {
      profile_id: '11111111-1111-1111-1111-111111111111',
      event_type,
      event_datetime: '2026-04-26T00:00:00Z',
      event_properties: {},
      event_api_version: 1,
      profiles_sharing_access_level: [],
    };
    const r = WebhookEventSchema.safeParse(payload);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.event_type).toBe(event_type);
  });
  it('rejects unknown event_type', () => {
    expect(WebhookEventSchema.safeParse({
      profile_id: '11111111-1111-1111-1111-111111111111',
      event_type: 'made_up_event',
      event_datetime: '2026-04-26T00:00:00Z',
      event_properties: {},
      event_api_version: 1,
      profiles_sharing_access_level: [],
    }).success).toBe(false);
  });
  it('preserves passthrough fields like attributions', () => {
    const r = WebhookEventSchema.parse({
      profile_id: '11111111-1111-1111-1111-111111111111',
      event_type: 'subscription_started',
      event_datetime: '2026-04-26T00:00:00Z',
      event_properties: {},
      event_api_version: 1,
      profiles_sharing_access_level: [],
      attributions: { network: 'organic' },
    });
    expect((r as unknown as { attributions: unknown }).attributions).toEqual({ network: 'organic' });
  });
});
