import { describe, it, expect, vi, beforeEach } from 'vitest';
import { accessLevelTools } from '../../../../src/tools/server-side-v2/access-level.js';
import { createHttpClient } from '../../../../src/http/client.js';
import { createAccountStore } from '../../../../src/auth/account-store.js';

beforeEach(() => { process.env.ADAPTY_SECRET_API_KEY = 'secret_live_a.b'; });

it('lists adapty_access_level_grant and adapty_access_level_revoke', () => {
  expect(accessLevelTools.map(t => t.name).sort()).toEqual(['adapty_access_level_grant','adapty_access_level_revoke']);
});

it('grant POSTs /access-level with full body', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200, headers: {'content-type':'application/json'} }));
  const tool = accessLevelTools.find(t => t.name === 'adapty_access_level_grant')!;
  await tool.handler(
    { profileId: 'p1', accessLevelId: 'premium', startsAt: '2026-01-01T00:00:00Z', expiresAt: '2027-01-01T00:00:00Z' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(init.method).toBe('POST');
  const body = JSON.parse(init.body as string);
  expect(body.access_level_id).toBe('premium');
  expect(body.starts_at).toBe('2026-01-01T00:00:00Z');
  expect(body.expires_at).toBe('2027-01-01T00:00:00Z');
});

it('revoke DELETEs /access-level with body containing access_level_id', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  const tool = accessLevelTools.find(t => t.name === 'adapty_access_level_revoke')!;
  await tool.handler(
    { profileId: 'p1', accessLevelId: 'premium' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  const init = fetch.mock.calls[0]![1] as RequestInit;
  expect(init.method).toBe('DELETE');
  expect(JSON.parse(init.body as string)).toEqual({ access_level_id: 'premium' });
});

it('grant rejects empty accessLevelId', async () => {
  const fetch = vi.fn();
  const tool = accessLevelTools.find(t => t.name === 'adapty_access_level_grant')!;
  const r = await tool.handler(
    { profileId: 'p1', accessLevelId: '', startsAt: '2026-01-01T00:00:00Z' },
    { accountStore: createAccountStore(), httpClient: createHttpClient({ fetch, baseUrl: 'https://x' }) },
  );
  expect(r.isError).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});
