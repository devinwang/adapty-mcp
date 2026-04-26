import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { AdaptyProfileSchema } from '../../src/schemas/profile.js';
import { PaywallSchema } from '../../src/schemas/paywall.js';
import { WebhookEventSchema } from '../../src/schemas/webhook-events.js';

const fixtureDir = resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures/doc-examples');

function load(name: string): unknown {
  return JSON.parse(readFileSync(resolve(fixtureDir, name), 'utf8'));
}

describe('contract: AdaptyProfileSchema vs profile.json', () => {
  it('parses without errors and preserves access_levels', () => {
    const payload = load('profile.json');
    const parsed = AdaptyProfileSchema.parse(payload);
    expect(parsed.profile_id).toBe('00000000-0000-4000-8000-000000000001');
    expect(parsed.access_levels.premium).toBeDefined();
  });
});

describe('contract: PaywallSchema vs paywall.json', () => {
  it('parses without errors and preserves developer_id and products', () => {
    const payload = load('paywall.json');
    const parsed = PaywallSchema.parse(payload);
    expect(parsed.developer_id).toBe('paywall_main_v3');
    expect(parsed.products.length).toBe(2);
  });
});

describe('contract: WebhookEventSchema vs subscription_renewed payload', () => {
  it('parses without errors and preserves event_type', () => {
    const payload = load('webhook-subscription-renewed.json');
    const parsed = WebhookEventSchema.parse(payload);
    expect(parsed.event_type).toBe('subscription_renewed');
    expect((parsed as unknown as { user_attributes?: unknown }).user_attributes).toBeDefined();
  });
});
