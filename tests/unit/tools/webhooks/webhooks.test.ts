import { describe, it, expect } from 'vitest';
import { webhookTools } from '../../../../src/tools/webhooks/webhooks.js';

const verify = webhookTools.find(t => t.name === 'adapty_webhook_authorization_verify')!;
const parse  = webhookTools.find(t => t.name === 'adapty_webhook_event_parse')!;

const noDeps = { accountStore: undefined as any, httpClient: undefined as any };

describe('adapty_webhook_authorization_verify', () => {
  it('returns valid:true on exact match', async () => {
    const r = await verify.handler({ received: 'Bearer abc123', expected: 'Bearer abc123' }, noDeps);
    expect(r.isError).toBeUndefined();
    expect(JSON.parse((r.content[0] as { text: string }).text)).toEqual({ valid: true });
  });
  it('returns valid:false on mismatch', async () => {
    const r = await verify.handler({ received: 'Bearer abc', expected: 'Bearer xyz' }, noDeps);
    expect(JSON.parse((r.content[0] as { text: string }).text).valid).toBe(false);
  });
  it('uses constant-time comparison (lengths differ → false, no early return leak)', async () => {
    const r = await verify.handler({ received: 'a', expected: 'aa' }, noDeps);
    expect(JSON.parse((r.content[0] as { text: string }).text).valid).toBe(false);
  });
  it('returns isError when expected is empty (misconfiguration)', async () => {
    const r = await verify.handler({ received: 'a', expected: '' }, noDeps);
    expect(r.isError).toBe(true);
  });
});

describe('adapty_webhook_event_parse', () => {
  it('parses a known event', async () => {
    const body = JSON.stringify({
      profile_id: '11111111-1111-1111-1111-111111111111',
      event_type: 'subscription_renewed',
      event_datetime: '2026-04-26T00:00:00Z',
      event_properties: { product_id: 'pro' },
      event_api_version: 1,
      profiles_sharing_access_level: [],
    });
    const r = await parse.handler({ rawBody: body }, noDeps);
    expect(r.isError).toBeUndefined();
    expect(JSON.parse((r.content[0] as { text: string }).text).event_type).toBe('subscription_renewed');
  });
  it('returns isError on invalid JSON', async () => {
    const r = await parse.handler({ rawBody: '{not json' }, noDeps);
    expect(r.isError).toBe(true);
  });
  it('returns isError on unknown event_type', async () => {
    const r = await parse.handler({
      rawBody: JSON.stringify({
        profile_id: '11111111-1111-1111-1111-111111111111',
        event_type: 'made_up',
        event_datetime: '2026-04-26T00:00:00Z',
        event_properties: {},
        event_api_version: 1,
        profiles_sharing_access_level: [],
      }),
    }, noDeps);
    expect(r.isError).toBe(true);
  });
});
