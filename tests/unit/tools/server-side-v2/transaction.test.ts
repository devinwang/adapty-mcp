import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transactionTools } from '../../../../src/tools/server-side-v2/transaction.js';
import { createHttpClient } from '../../../../src/http/client.js';
import { createAccountStore } from '../../../../src/auth/account-store.js';

beforeEach(() => { process.env.ADAPTY_SECRET_API_KEY = 'secret_live_a.b'; });

it('exposes transaction_set and stripe_purchase_validate', () => {
  expect(transactionTools.map(t => t.name).sort()).toEqual([
    'adapty_stripe_purchase_validate','adapty_transaction_set',
  ]);
});

it('transaction_set POSTs /transaction with snake_case body', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status:200, headers:{'content-type':'application/json'}}));
  const t = transactionTools.find(x => x.name === 'adapty_transaction_set')!;
  await t.handler(
    { profileId:'p1', store:'app_store', transactionId:'tx1', productId:'pr1', receipt:'AAA' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body as string)).toEqual({ store:'app_store', transaction_id:'tx1', product_id:'pr1', receipt:'AAA' });
});

it('stripe_purchase_validate POSTs /stripe-purchase with stripe ids', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status:200, headers:{'content-type':'application/json'}}));
  const t = transactionTools.find(x => x.name === 'adapty_stripe_purchase_validate')!;
  await t.handler(
    { profileId:'p1', subscriptionId:'sub_1', customerId:'cus_1' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(JSON.parse(init.body as string)).toEqual({ subscription_id:'sub_1', customer_id:'cus_1' });
});

it('transaction_set schema rejects empty transactionId', async () => {
  const fetch = vi.fn();
  const t = transactionTools.find(x => x.name === 'adapty_transaction_set')!;
  const r = await t.handler(
    { profileId:'p1', store:'app_store', transactionId:'' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  expect(r.isError).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});
