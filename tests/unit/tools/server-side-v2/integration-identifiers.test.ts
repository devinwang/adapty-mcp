import { describe, it, expect, vi, beforeEach } from 'vitest';
import { integrationIdTools } from '../../../../src/tools/server-side-v2/integration-identifiers.js';
import { createHttpClient } from '../../../../src/http/client.js';
import { createAccountStore } from '../../../../src/auth/account-store.js';

beforeEach(() => { process.env.ADAPTY_SECRET_API_KEY = 'secret_live_a.b'; });

it('exposes adapty_integration_identifiers_set', () => {
  expect(integrationIdTools.map(t => t.name)).toEqual(['adapty_integration_identifiers_set']);
});
it('POSTs /integration-identifiers with provider->value map', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status:200, headers:{'content-type':'application/json'}}));
  const t = integrationIdTools[0]!;
  await t.handler(
    { profileId:'p1', identifiers: { amplitude_user_id: 'amp-1', mixpanel_user_id: 'mp-1' } },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body as string)).toEqual({ amplitude_user_id:'amp-1', mixpanel_user_id:'mp-1' });
});
it('schema requires at least one identifier', async () => {
  const fetch = vi.fn();
  const r = await integrationIdTools[0]!.handler(
    { profileId:'p1', identifiers: {} },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  expect(r.isError).toBe(true);
});
it('handler accepts customerUserId target with platform', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status:200, headers:{'content-type':'application/json'}}));
  await integrationIdTools[0]!.handler(
    { customerUserId:'u9', platform:'iOS', identifiers: { amplitude_user_id:'amp-9' } },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect((init.headers as Record<string,string>)['adapty-customer-user-id']).toBe('u9');
});
