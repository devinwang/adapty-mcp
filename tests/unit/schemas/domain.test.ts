import { describe, it, expect } from 'vitest';
import { AdaptyProfileSchema, ProfileAttributesUpdateSchema } from '../../../src/schemas/profile.js';
import { GrantAccessLevelInputSchema, RevokeAccessLevelInputSchema } from '../../../src/schemas/access-level.js';
import { SetTransactionInputSchema, StripeValidateInputSchema } from '../../../src/schemas/transaction.js';
import { PaywallSchema, PaywallUpdateInputSchema } from '../../../src/schemas/paywall.js';

describe('Profile schemas', () => {
  it('AdaptyProfileSchema accepts a doc-example payload', () => {
    const doc = {
      profile_id: '11111111-1111-1111-1111-111111111111',
      customer_user_id: 'u1',
      access_levels: {},
      subscriptions: {},
      non_subscriptions: {},
    };
    expect(() => AdaptyProfileSchema.parse(doc)).not.toThrow();
  });
  it('ProfileAttributesUpdateSchema accepts known attribute keys', () => {
    expect(() => ProfileAttributesUpdateSchema.parse({
      first_name: 'A', last_name: 'B', email: 'a@b.c', phone_number: '+1', custom_attributes: { plan: 'pro' },
    })).not.toThrow();
  });
});

describe('Access level schemas', () => {
  it('GrantAccessLevelInputSchema requires accessLevelId, startsAt, expiresAt', () => {
    const ok = {
      profileId: 'p1',
      accessLevelId: 'premium',
      startsAt: '2026-01-01T00:00:00Z',
      expiresAt: '2027-01-01T00:00:00Z',
    };
    expect(() => GrantAccessLevelInputSchema.parse(ok)).not.toThrow();
    expect(() => GrantAccessLevelInputSchema.parse({ ...ok, accessLevelId: '' })).toThrow();
  });
  it('RevokeAccessLevelInputSchema requires accessLevelId', () => {
    expect(() => RevokeAccessLevelInputSchema.parse({ profileId: 'p1', accessLevelId: 'premium' })).not.toThrow();
  });
});

describe('Transaction schemas', () => {
  it('SetTransactionInputSchema requires store enum and transaction id', () => {
    expect(() => SetTransactionInputSchema.parse({
      profileId: 'p1', store: 'app_store', transactionId: 't1',
    })).not.toThrow();
    expect(() => SetTransactionInputSchema.parse({
      profileId: 'p1', store: 'play_store', transactionId: 't1',
    })).not.toThrow();
    expect(() => SetTransactionInputSchema.parse({
      profileId: 'p1', store: 'wrong', transactionId: 't1',
    })).toThrow();
  });
  it('StripeValidateInputSchema requires stripe ids', () => {
    expect(() => StripeValidateInputSchema.parse({
      profileId: 'p1', subscriptionId: 'sub_x', customerId: 'cus_x',
    })).not.toThrow();
  });
});

describe('Paywall schemas', () => {
  it('PaywallSchema accepts minimal paywall', () => {
    expect(() => PaywallSchema.parse({
      developer_id: 'paywall_a', name: 'A', revision: 1, products: [],
    })).not.toThrow();
  });
  it('PaywallUpdateInputSchema requires developerId and at least one mutable field', () => {
    expect(() => PaywallUpdateInputSchema.parse({ developerId: 'p_a', name: 'New' })).not.toThrow();
    expect(() => PaywallUpdateInputSchema.parse({ developerId: 'p_a' })).toThrow();
  });
});
