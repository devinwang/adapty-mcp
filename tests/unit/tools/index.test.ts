import { describe, it, expect, vi } from 'vitest';
import { collectTools, BASE_URLS } from '../../../src/tools/index.js';

it('declares the four base URLs', () => {
  expect(BASE_URLS.serverSideV2).toBe('https://api.adapty.io/api/v2/server-side-api');
  expect(BASE_URLS.serverSideV1).toBe('https://api.adapty.io/api/v1/sdk');
  expect(BASE_URLS.webApi).toBe('https://api.adapty.io/api/v2/web-api');
  expect(BASE_URLS.analytics).toBe('https://api-admin.adapty.io/api/v1/client-api');
});

it('returns >= 27 tools spanning all groups', () => {
  const fetch = vi.fn();
  const tools = collectTools({ fetch });
  const names = new Set(tools.map(t => t.name));
  expect(names.size).toBeGreaterThanOrEqual(27);
  expect(names.has('adapty_profile_get')).toBe(true);
  expect(names.has('adapty_v1_profile_get')).toBe(true);
  expect(names.has('adapty_web_paywall_get')).toBe(true);
  expect(names.has('adapty_analytics_query')).toBe(true);
  expect(names.has('adapty_webhook_event_parse')).toBe(true);
});

it('all tool names are unique', () => {
  const names = collectTools({ fetch: vi.fn() }).map(t => t.name);
  expect(new Set(names).size).toBe(names.length);
});
