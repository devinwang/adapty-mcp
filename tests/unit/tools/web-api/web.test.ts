import { it, expect, vi, beforeEach } from 'vitest';
import { webTools } from '../../../../src/tools/web-api/web.js';
import { createHttpClient } from '../../../../src/http/client.js';
import { createAccountStore } from '../../../../src/auth/account-store.js';

beforeEach(() => {
  delete process.env.ADAPTY_SECRET_API_KEY;
  delete process.env.ADAPTY_SECRET_API_KEY_SANDBOX;
  delete process.env.ADAPTY_PUBLIC_API_KEY_SANDBOX;
  process.env.ADAPTY_PUBLIC_API_KEY = 'public_live_a.b';
});

it('exposes 3 adapty_web_* tools', () => {
  expect(webTools.map(t => t.name).sort()).toEqual([
    'adapty_web_attribution_set',
    'adapty_web_paywall_get',
    'adapty_web_paywall_view_record',
  ]);
});

it('paywall_get POSTs /paywall/ with public key Authorization', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } }));
  const t = webTools.find(x => x.name === 'adapty_web_paywall_get')!;
  await t.handler(
    { profileId: 'p1', developerId: 'pw_a' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  expect(fetch.mock.calls[0]![0]).toBe('https://x/paywall/');
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body as string)).toEqual({ developer_id: 'pw_a' });
  expect((init.headers as Record<string, string>).Authorization).toBe('Api-Key public_live_a.b');
  expect((init.headers as Record<string, string>)['adapty-profile-id']).toBe('p1');
});

it('paywall_view_record POSTs /paywall/visit/ with revision', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } }));
  const t = webTools.find(x => x.name === 'adapty_web_paywall_view_record')!;
  await t.handler(
    { customerUserId: 'u1', developerId: 'pw_a', paywallRevision: 7 },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  expect(fetch.mock.calls[0]![0]).toBe('https://x/paywall/visit/');
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body as string)).toEqual({ developer_id: 'pw_a', paywall_revision: 7 });
  expect((init.headers as Record<string, string>)['adapty-customer-user-id']).toBe('u1');
});

it('attribution_set POSTs /attribution/ with optional fields', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } }));
  const t = webTools.find(x => x.name === 'adapty_web_attribution_set')!;
  await t.handler(
    { profileId: 'p1', source: 'appsflyer', networkUserId: 'afid_x', attributes: { campaign: 'spring' } },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  expect(fetch.mock.calls[0]![0]).toBe('https://x/attribution/');
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body as string)).toEqual({ source: 'appsflyer', network_user_id: 'afid_x', attributes: { campaign: 'spring' } });
});

it('attribution_set omits absent optional body fields', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } }));
  const t = webTools.find(x => x.name === 'adapty_web_attribution_set')!;
  await t.handler(
    { profileId: 'p1', source: 'organic' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(JSON.parse(init.body as string)).toEqual({ source: 'organic' });
});

it('paywall_get rejects when neither profileId nor customerUserId provided', async () => {
  const fetch = vi.fn();
  const t = webTools.find(x => x.name === 'adapty_web_paywall_get')!;
  const r = await t.handler(
    { developerId: 'pw_a' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  expect(r.isError).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});

it('paywall_get fails when public key not configured', async () => {
  delete process.env.ADAPTY_PUBLIC_API_KEY;
  process.env.ADAPTY_SECRET_API_KEY = 'secret_live_a.b';
  const fetch = vi.fn();
  const t = webTools.find(x => x.name === 'adapty_web_paywall_get')!;
  const r = await t.handler(
    { profileId: 'p1', developerId: 'pw_a' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  expect(r.isError).toBe(true);
});
