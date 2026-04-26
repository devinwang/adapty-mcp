import { describe, it, expect, vi } from 'vitest';
import { profileTools } from '../../../../src/tools/server-side-v2/profile.js';
import { createHttpClient } from '../../../../src/http/client.js';
import { createAccountStore } from '../../../../src/auth/account-store.js';

function setupEnv() {
  process.env.ADAPTY_SECRET_API_KEY = 'secret_live_aa.bb';
}
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('profile tools', () => {
  it('exposes 4 tools with adapty_profile_* names', () => {
    expect(profileTools.map(t => t.name).sort()).toEqual([
      'adapty_profile_create','adapty_profile_delete','adapty_profile_get','adapty_profile_update',
    ]);
  });

  it('adapty_profile_get sends GET /profile with profile id header', async () => {
    setupEnv();
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { profile_id: 'p1', access_levels: {}, subscriptions: {}, non_subscriptions: {} }));
    const client = createHttpClient({ fetch, baseUrl: 'https://api.adapty.io/api/v2/server-side-api' });
    const tool = profileTools.find(t => t.name === 'adapty_profile_get')!;
    const r = await tool.handler({ profileId: 'p1' }, { accountStore: createAccountStore(), httpClient: client });
    expect(r.isError).toBeUndefined();
    const url = fetch.mock.calls[0]![0];
    const init = fetch.mock.calls[0]![1] as RequestInit;
    expect(url).toBe('https://api.adapty.io/api/v2/server-side-api/profile');
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string,string>)['adapty-profile-id']).toBe('p1');
    expect((init.headers as Record<string,string>).Authorization).toBe('Api-Key secret_live_aa.bb');
  });

  it('adapty_profile_create POSTs body with attributes', async () => {
    setupEnv();
    const fetch = vi.fn().mockResolvedValue(jsonResponse(201, { profile_id: 'p1', access_levels:{}, subscriptions:{}, non_subscriptions:{} }));
    const client = createHttpClient({ fetch, baseUrl: 'https://api.adapty.io/api/v2/server-side-api' });
    const tool = profileTools.find(t => t.name === 'adapty_profile_create')!;
    const r = await tool.handler(
      { customerUserId: 'u1', attributes: { email: 'a@b.co' } },
      { accountStore: createAccountStore(), httpClient: client },
    );
    expect(r.isError).toBeUndefined();
    const init = fetch.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'a@b.co' });
    expect((init.headers as Record<string,string>)['adapty-customer-user-id']).toBe('u1');
  });

  it('adapty_profile_update PUTs attributes', async () => {
    setupEnv();
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { profile_id: 'p1', access_levels:{}, subscriptions:{}, non_subscriptions:{} }));
    const client = createHttpClient({ fetch, baseUrl: 'https://api.adapty.io/api/v2/server-side-api' });
    const tool = profileTools.find(t => t.name === 'adapty_profile_update')!;
    await tool.handler({ profileId: 'p1', attributes: { first_name: 'A' } }, { accountStore: createAccountStore(), httpClient: client });
    const init = fetch.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ first_name: 'A' });
  });

  it('adapty_profile_delete DELETEs and returns null on 204', async () => {
    setupEnv();
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const client = createHttpClient({ fetch, baseUrl: 'https://api.adapty.io/api/v2/server-side-api' });
    const tool = profileTools.find(t => t.name === 'adapty_profile_delete')!;
    const r = await tool.handler({ profileId: 'p1' }, { accountStore: createAccountStore(), httpClient: client });
    expect(r.isError).toBeUndefined();
    const init = fetch.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('DELETE');
  });

  it('adapty_profile_get rejects when neither profileId nor customerUserId provided', async () => {
    setupEnv();
    const fetch = vi.fn();
    const client = createHttpClient({ fetch, baseUrl: 'https://api.adapty.io/api/v2/server-side-api' });
    const tool = profileTools.find(t => t.name === 'adapty_profile_get')!;
    const r = await tool.handler({}, { accountStore: createAccountStore(), httpClient: client });
    expect(r.isError).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('adapty_profile_get surfaces Adapty 401 as error content', async () => {
    setupEnv();
    const fetch = vi.fn().mockResolvedValue(new Response('{"errors":[{"code":"BAD"}]}', { status: 401, headers: { 'content-type': 'application/json' }}));
    const client = createHttpClient({ fetch, baseUrl: 'https://api.adapty.io/api/v2/server-side-api' });
    const tool = profileTools.find(t => t.name === 'adapty_profile_get')!;
    const r = await tool.handler({ profileId: 'p1' }, { accountStore: createAccountStore(), httpClient: client });
    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain('401');
  });
});
