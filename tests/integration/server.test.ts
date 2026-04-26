import { describe, it, expect, vi } from 'vitest';
import { createServer } from '../../src/server.js';

it('createServer exposes listTools and callTool', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ profile_id: 'p1', access_levels:{}, subscriptions:{}, non_subscriptions:{} }), { status: 200, headers: {'content-type':'application/json'} }));
  const { listTools, callTool } = createServer({ fetch });
  const tools = await listTools();
  expect(tools.length).toBeGreaterThanOrEqual(27);

  process.env.ADAPTY_SECRET_API_KEY = 'secret_live_a.b';
  const r = await callTool('adapty_profile_get', { profileId: 'p1' });
  expect(r.isError).toBeUndefined();
});

it('callTool returns error for unknown tool', async () => {
  const { callTool } = createServer({ fetch: vi.fn() });
  const r = await callTool('does_not_exist', {});
  expect(r.isError).toBe(true);
  expect((r.content[0] as { text: string }).text).toMatch(/unknown tool/i);
});
