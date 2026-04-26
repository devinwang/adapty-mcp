import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paywallTools } from '../../../../src/tools/server-side-v2/paywall.js';
import { createHttpClient } from '../../../../src/http/client.js';
import { createAccountStore } from '../../../../src/auth/account-store.js';

beforeEach(() => { process.env.ADAPTY_SECRET_API_KEY = 'secret_live_a.b'; });

it('exposes paywall_get, paywalls_list, paywall_update', () => {
  expect(paywallTools.map(t => t.name).sort()).toEqual(['adapty_paywall_get','adapty_paywall_update','adapty_paywalls_list']);
});

it('paywall_get GETs /paywall with developer_id query', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"developer_id":"p_a","name":"A","revision":1,"products":[]}', { status:200, headers:{'content-type':'application/json'}}));
  const t = paywallTools.find(x => x.name === 'adapty_paywall_get')!;
  await t.handler({ developerId: 'p_a' }, { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) });
  expect(fetch.mock.calls[0]![0]).toBe('https://x/paywall?developer_id=p_a');
});

it('paywalls_list GETs /paywalls', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('[]', { status:200, headers:{'content-type':'application/json'}}));
  const t = paywallTools.find(x => x.name === 'adapty_paywalls_list')!;
  await t.handler({}, { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) });
  expect(fetch.mock.calls[0]![0]).toBe('https://x/paywalls');
});

it('paywall_update PUTs /paywall with snake_case body', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"developer_id":"p_a","name":"New","revision":2,"products":[]}', { status:200, headers:{'content-type':'application/json'}}));
  const t = paywallTools.find(x => x.name === 'adapty_paywall_update')!;
  await t.handler(
    { developerId: 'p_a', name: 'New', remoteConfig: { color: 'red' } },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(init.method).toBe('PUT');
  expect(JSON.parse(init.body as string)).toEqual({ developer_id:'p_a', name:'New', remote_config:{color:'red'} });
});

it('paywall_update rejects when no mutable field provided', async () => {
  const fetch = vi.fn();
  const r = await paywallTools.find(x => x.name === 'adapty_paywall_update')!.handler(
    { developerId: 'p_a' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  expect(r.isError).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});

it('paywall_update with products and platform exercises full body builder', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status:200, headers:{'content-type':'application/json'}}));
  const t = paywallTools.find(x => x.name === 'adapty_paywall_update')!;
  await t.handler(
    { developerId: 'p_a', platform: 'iOS', products: [{ vendorProductId: 'sku.1' }, { vendorProductId: 'sku.2', developerId: 'sku2_id' }] },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(JSON.parse(init.body as string)).toEqual({
    developer_id: 'p_a',
    products: [{ vendor_product_id: 'sku.1' }, { vendor_product_id: 'sku.2', developer_id: 'sku2_id' }],
  });
  expect((init.headers as Record<string,string>)['adapty-platform']).toBe('iOS');
});
