import { describe, it, expect } from 'vitest';
import { buildHeaders } from '../../../src/auth/headers.js';

describe('buildHeaders', () => {
  const cred = { app: 'a', environment: 'live' as const, secretKey: 'secret_live_a.b', publicKey: 'public_live_a.b' };
  it('uses secret key for keyType=secret', () => {
    const h = buildHeaders({ credentials: cred, keyType: 'secret', profileId: 'p1' });
    expect(h.Authorization).toBe('Api-Key secret_live_a.b');
    expect(h['adapty-profile-id']).toBe('p1');
    expect(h['Content-Type']).toBe('application/json');
  });
  it('uses public key for keyType=public', () => {
    const h = buildHeaders({ credentials: cred, keyType: 'public', profileId: 'p1' });
    expect(h.Authorization).toBe('Api-Key public_live_a.b');
  });
  it('throws when keyType=secret but no secretKey', () => {
    const c = { app: 'a', environment: 'live' as const, publicKey: 'public_live_a.b' };
    expect(() => buildHeaders({ credentials: c, keyType: 'secret', profileId: 'p1' })).toThrow(/secret/);
  });
  it('throws when keyType=public but no publicKey', () => {
    const c = { app: 'a', environment: 'live' as const, secretKey: 'secret_live_a.b' };
    expect(() => buildHeaders({ credentials: c, keyType: 'public', profileId: 'p1' })).toThrow(/public/);
  });
  it('uses customer-user-id when profileId omitted', () => {
    const h = buildHeaders({ credentials: cred, keyType: 'secret', customerUserId: 'cu1' });
    expect(h['adapty-customer-user-id']).toBe('cu1');
    expect(h['adapty-profile-id']).toBeUndefined();
  });
  it('throws when both profileId and customerUserId provided', () => {
    expect(() => buildHeaders({ credentials: cred, keyType: 'secret', profileId: 'p', customerUserId: 'c' }))
      .toThrow(/exactly one/);
  });
  it('allows neither when allowAnonymous=true (e.g. paywall list)', () => {
    const h = buildHeaders({ credentials: cred, keyType: 'secret', allowAnonymous: true });
    expect(h['adapty-profile-id']).toBeUndefined();
    expect(h['adapty-customer-user-id']).toBeUndefined();
  });
  it('throws when neither provided and allowAnonymous=false', () => {
    expect(() => buildHeaders({ credentials: cred, keyType: 'secret' })).toThrow(/profile-id|customer-user-id/);
  });
  it('includes adapty-platform when given', () => {
    const h = buildHeaders({ credentials: cred, keyType: 'secret', profileId: 'p', platform: 'iOS' });
    expect(h['adapty-platform']).toBe('iOS');
  });
});
