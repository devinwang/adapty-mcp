import { it, expect, vi, beforeEach } from 'vitest';
import { analyticsTools } from '../../../../src/tools/analytics/analytics.js';
import { createHttpClient } from '../../../../src/http/client.js';
import { createAccountStore } from '../../../../src/auth/account-store.js';

beforeEach(() => {
  delete process.env.ADAPTY_PUBLIC_API_KEY;
  delete process.env.ADAPTY_PUBLIC_API_KEY_SANDBOX;
  delete process.env.ADAPTY_SECRET_API_KEY_SANDBOX;
  process.env.ADAPTY_SECRET_API_KEY = 'secret_live_a.b';
});

it('exposes 3 analytics tools', () => {
  expect(analyticsTools.map(t => t.name).sort())
    .toEqual(['adapty_analytics_cohorts_query', 'adapty_analytics_export_csv', 'adapty_analytics_query']);
});

it('analytics_query POSTs /metrics/analytics/ with snake_case body', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"data":[]}', { status: 200, headers: { 'content-type': 'application/json' } }));
  await analyticsTools.find(t => t.name === 'adapty_analytics_query')!.handler(
    { metric: 'mrr', startDate: '2026-01-01', endDate: '2026-04-01', groupBy: ['country'], filters: { platform: ['iOS'] } },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x/' }) },
  );
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body as string)).toEqual({
    metric: 'mrr', start_date: '2026-01-01', end_date: '2026-04-01',
    group_by: ['country'], filters: { platform: ['iOS'] },
  });
});

it('analytics_query omits absent groupBy and filters', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"data":[]}', { status: 200, headers: { 'content-type': 'application/json' } }));
  await analyticsTools.find(t => t.name === 'adapty_analytics_query')!.handler(
    { metric: 'mrr', startDate: '2026-01-01', endDate: '2026-02-01' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x/' }) },
  );
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(JSON.parse(init.body as string)).toEqual({ metric: 'mrr', start_date: '2026-01-01', end_date: '2026-02-01' });
});

it('cohorts_query POSTs /metrics/cohorts/ without metric in body', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"data":[]}', { status: 200, headers: { 'content-type': 'application/json' } }));
  await analyticsTools.find(t => t.name === 'adapty_analytics_cohorts_query')!.handler(
    { startDate: '2026-01-01', endDate: '2026-04-01', groupBy: ['platform'] },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x/' }) },
  );
  expect(fetch.mock.calls[0]![0]).toBe('https://x/metrics/cohorts/');
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(JSON.parse(init.body as string)).toEqual({ start_date: '2026-01-01', end_date: '2026-04-01', group_by: ['platform'] });
});

it('cohorts_query omits absent groupBy and filters', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"data":[]}', { status: 200, headers: { 'content-type': 'application/json' } }));
  await analyticsTools.find(t => t.name === 'adapty_analytics_cohorts_query')!.handler(
    { startDate: '2026-01-01', endDate: '2026-02-01' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x/' }) },
  );
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(JSON.parse(init.body as string)).toEqual({ start_date: '2026-01-01', end_date: '2026-02-01' });
});

it('cohorts_query passes filters when provided', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"data":[]}', { status: 200, headers: { 'content-type': 'application/json' } }));
  await analyticsTools.find(t => t.name === 'adapty_analytics_cohorts_query')!.handler(
    { startDate: '2026-01-01', endDate: '2026-02-01', filters: { country: ['US'] } },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x/' }) },
  );
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(JSON.parse(init.body as string)).toEqual({ start_date: '2026-01-01', end_date: '2026-02-01', filters: { country: ['US'] } });
});

it('export_csv POSTs /metrics/analytics/export/ and returns the CSV text content', async () => {
  const csv = 'metric,date,value\nmrr,2026-01-01,100\n';
  const fetch = vi.fn().mockResolvedValue(new Response(csv, { status: 200, headers: { 'content-type': 'text/csv' } }));
  const r = await analyticsTools.find(t => t.name === 'adapty_analytics_export_csv')!.handler(
    { metric: 'mrr', startDate: '2026-01-01', endDate: '2026-02-01' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x/' }) },
  );
  expect(r.isError).toBeUndefined();
  // runTool wraps the result via JSON.stringify with redactJson; for a string value the result is the JSON-encoded string.
  expect((r.content[0] as { text: string }).text).toContain('mrr,2026-01-01,100');
  expect(fetch.mock.calls[0]![0]).toBe('https://x/metrics/analytics/export/');
});

it('export_csv passes groupBy and filters in body', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('a,b\n', { status: 200, headers: { 'content-type': 'text/csv' } }));
  await analyticsTools.find(t => t.name === 'adapty_analytics_export_csv')!.handler(
    { metric: 'arr', startDate: '2026-01-01', endDate: '2026-02-01', groupBy: ['country'], filters: { platform: ['iOS'] } },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x/' }) },
  );
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(JSON.parse(init.body as string)).toEqual({
    metric: 'arr', start_date: '2026-01-01', end_date: '2026-02-01',
    group_by: ['country'], filters: { platform: ['iOS'] },
  });
});

it('analytics_query rejects missing required fields', async () => {
  const fetch = vi.fn();
  const r = await analyticsTools.find(t => t.name === 'adapty_analytics_query')!.handler(
    { startDate: '2026-01-01', endDate: '2026-02-01' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x/' }) },
  );
  expect(r.isError).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});

it('analytics_query works without profile id (allowAnonymous)', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } }));
  await analyticsTools.find(t => t.name === 'adapty_analytics_query')!.handler(
    { metric: 'mrr', startDate: '2026-01-01', endDate: '2026-02-01' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x/' }) },
  );
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect((init.headers as Record<string, string>)['adapty-profile-id']).toBeUndefined();
  expect((init.headers as Record<string, string>)['adapty-customer-user-id']).toBeUndefined();
  expect((init.headers as Record<string, string>).Authorization).toBe('Api-Key secret_live_a.b');
});

it('analytics_query forwards platform header when provided', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } }));
  await analyticsTools.find(t => t.name === 'adapty_analytics_query')!.handler(
    { metric: 'mrr', startDate: '2026-01-01', endDate: '2026-02-01', platform: 'iOS' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x/' }) },
  );
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect((init.headers as Record<string, string>)['adapty-platform']).toBe('iOS');
});
