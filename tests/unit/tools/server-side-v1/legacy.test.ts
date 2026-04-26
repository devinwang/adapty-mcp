import { describe, it, expect, vi, beforeEach } from 'vitest';
import { legacyTools } from '../../../../src/tools/server-side-v1/legacy.js';
import { createHttpClient } from '../../../../src/http/client.js';
import { createAccountStore } from '../../../../src/auth/account-store.js';

function setupEnv() {
  process.env.ADAPTY_SECRET_API_KEY = 'secret_live_aa.bb';
}
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
function deps(fetch: ReturnType<typeof vi.fn>) {
  return { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) };
}
function find(name: string) {
  const t = legacyTools.find(x => x.name === name);
  if (!t) throw new Error(`tool not found: ${name}`);
  return t;
}

beforeEach(() => { setupEnv(); });

describe('legacy v1 tools', () => {
  it('exposes 7 tools in the documented order', () => {
    expect(legacyTools.map(t => t.name)).toEqual([
      'adapty_v1_profile_get',
      'adapty_v1_profile_create',
      'adapty_v1_profile_update',
      'adapty_v1_profile_delete',
      'adapty_v1_access_level_grant',
      'adapty_v1_access_level_revoke',
      'adapty_v1_stripe_token_validate',
    ]);
  });

  it('every description begins with the legacy marker', () => {
    for (const t of legacyTools) {
      expect(t.description.startsWith('[LEGACY — prefer v2 equivalent] ')).toBe(true);
    }
  });

  it('profile_get GETs /profiles/{profileId}/ with platform header', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const t = find('adapty_v1_profile_get');
    const r = await t.handler({ profileId: 'p1', platform: 'iOS' }, deps(fetch));
    expect(r.isError).toBeUndefined();
    expect(fetch.mock.calls[0]![0]).toBe('https://x/profiles/p1/');
    const init = fetch.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('GET');
    const headers = init.headers as Record<string, string>;
    expect(headers['adapty-profile-id']).toBe('p1');
    expect(headers['adapty-platform']).toBe('iOS');
    expect(headers.Authorization).toBe('Api-Key secret_live_aa.bb');
  });

  it('profile_get falls back to customerUserId in the URL path', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const t = find('adapty_v1_profile_get');
    await t.handler({ customerUserId: 'u9' }, deps(fetch));
    expect(fetch.mock.calls[0]![0]).toBe('https://x/profiles/u9/');
    const init = fetch.mock.calls[0]![1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['adapty-customer-user-id']).toBe('u9');
  });

  it('profile_get URL-encodes special characters in identifiers', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const t = find('adapty_v1_profile_get');
    await t.handler({ profileId: 'a/b' }, deps(fetch));
    expect(fetch.mock.calls[0]![0]).toBe('https://x/profiles/a%2Fb/');
  });

  it('profile_create POSTs /profiles/ with identity folded into the body alongside attributes', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse(201, { ok: true }))
      .mockResolvedValueOnce(jsonResponse(201, { ok: true }));
    const t = find('adapty_v1_profile_create');
    const d = deps(fetch);
    await t.handler({ customerUserId: 'u1', attributes: { email: 'a@b.co' } }, d);
    let init = fetch.mock.calls[0]![1] as RequestInit;
    expect(fetch.mock.calls[0]![0]).toBe('https://x/profiles/');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ customer_user_id: 'u1', email: 'a@b.co' });

    await t.handler({ profileId: 'p1' }, d);
    init = fetch.mock.calls[1]![1] as RequestInit;
    expect(fetch.mock.calls[1]![0]).toBe('https://x/profiles/');
    expect(JSON.parse(init.body as string)).toEqual({ profile_id: 'p1' });
  });

  it('profile_update PATCHes /profiles/{id}/ with attributes body', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const t = find('adapty_v1_profile_update');
    await t.handler({ profileId: 'p1', attributes: { first_name: 'A' } }, deps(fetch));
    expect(fetch.mock.calls[0]![0]).toBe('https://x/profiles/p1/');
    const init = fetch.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ first_name: 'A' });
  });

  it('profile_delete DELETEs /profiles/{id}/delete', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const t = find('adapty_v1_profile_delete');
    const r = await t.handler({ profileId: 'p1' }, deps(fetch));
    expect(r.isError).toBeUndefined();
    expect(fetch.mock.calls[0]![0]).toBe('https://x/profiles/p1/delete');
    const init = fetch.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('DELETE');
  });

  it('access_level_grant POSTs the grant URL with default store and no expires_at', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const t = find('adapty_v1_access_level_grant');
    await t.handler({ profileId: 'p1', accessLevelId: 'premium' }, deps(fetch));
    expect(fetch.mock.calls[0]![0]).toBe('https://x/profiles/p1/paid-access-levels/premium/grant/');
    const init = fetch.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ store: 'manual' });
  });

  it('access_level_grant includes starts_at and expires_at when provided and a custom store', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const t = find('adapty_v1_access_level_grant');
    await t.handler(
      {
        customerUserId: 'u9',
        accessLevelId: 'pro',
        startsAt: '2026-01-01T00:00:00Z',
        expiresAt: '2027-01-01T00:00:00Z',
        store: 'stripe',
      },
      deps(fetch),
    );
    expect(fetch.mock.calls[0]![0]).toBe('https://x/profiles/u9/paid-access-levels/pro/grant/');
    const init = fetch.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      starts_at: '2026-01-01T00:00:00Z',
      expires_at: '2027-01-01T00:00:00Z',
      store: 'stripe',
    });
    const headers = init.headers as Record<string, string>;
    expect(headers['adapty-customer-user-id']).toBe('u9');
  });

  it('access_level_grant URL-encodes the access-level segment', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const t = find('adapty_v1_access_level_grant');
    await t.handler({ profileId: 'p1', accessLevelId: 'tier one/free' }, deps(fetch));
    expect(fetch.mock.calls[0]![0]).toBe('https://x/profiles/p1/paid-access-levels/tier%20one%2Ffree/grant/');
  });

  it('access_level_revoke POSTs the revoke URL', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const t = find('adapty_v1_access_level_revoke');
    await t.handler({ profileId: 'p1', accessLevelId: 'premium' }, deps(fetch));
    expect(fetch.mock.calls[0]![0]).toBe('https://x/profiles/p1/paid-access-levels/premium/revoke/');
    const init = fetch.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('POST');
  });

  it('stripe_token_validate POSTs /purchase/stripe/token/validate/ with the token body', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const t = find('adapty_v1_stripe_token_validate');
    await t.handler({ profileId: 'p1', token: 'tok_x' }, deps(fetch));
    expect(fetch.mock.calls[0]![0]).toBe('https://x/purchase/stripe/token/validate/');
    const init = fetch.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ token: 'tok_x' });
  });

  it('profile_get rejects when neither profileId nor customerUserId is provided', async () => {
    const fetch = vi.fn();
    const t = find('adapty_v1_profile_get');
    const r = await t.handler({}, deps(fetch));
    expect(r.isError).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('access_level_grant rejects empty accessLevelId at schema level', async () => {
    const fetch = vi.fn();
    const t = find('adapty_v1_access_level_grant');
    const r = await t.handler({ profileId: 'p1', accessLevelId: '' }, deps(fetch));
    expect(r.isError).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
});
