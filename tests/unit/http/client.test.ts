import { describe, it, expect, vi } from 'vitest';
import { createHttpClient } from '../../../src/http/client.js';
import { AdaptyApiError } from '../../../src/http/errors.js';

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('createHttpClient', () => {
  it('GETs and parses JSON', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const c = createHttpClient({ fetch, baseUrl: 'https://x' });
    const r = await c.request({ method: 'GET', path: '/p', headers: {} });
    expect(r).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('POSTs JSON body', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const c = createHttpClient({ fetch, baseUrl: 'https://x' });
    await c.request({ method: 'POST', path: '/p', headers: {}, body: { a: 1 } });
    const init = fetch.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
  });
  it('throws AdaptyApiError on 4xx', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(400, { errors: [{ code: 'BAD' }] }));
    const c = createHttpClient({ fetch, baseUrl: 'https://x' });
    await expect(c.request({ method: 'GET', path: '/p', headers: {} })).rejects.toBeInstanceOf(AdaptyApiError);
  });
  it('retries GET on 503 up to maxRetries', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse(503, {}))
      .mockResolvedValueOnce(jsonResponse(503, {}))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const c = createHttpClient({ fetch, baseUrl: 'https://x', maxRetries: 3, retryBaseMs: 1 });
    const r = await c.request({ method: 'GET', path: '/p', headers: {} });
    expect(r).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it('does NOT retry POST on 503', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(503, {}));
    const c = createHttpClient({ fetch, baseUrl: 'https://x', maxRetries: 3, retryBaseMs: 1 });
    await expect(c.request({ method: 'POST', path: '/p', headers: {} })).rejects.toBeInstanceOf(AdaptyApiError);
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('honours timeout via AbortSignal', async () => {
    const fetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal!.addEventListener('abort', () => reject(new Error('aborted')));
      });
    });
    const c = createHttpClient({ fetch, baseUrl: 'https://x', timeoutMs: 5 });
    await expect(c.request({ method: 'GET', path: '/p', headers: {} })).rejects.toThrow(/abort/i);
  });
  it('returns null body for 204', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const c = createHttpClient({ fetch, baseUrl: 'https://x' });
    expect(await c.request({ method: 'DELETE', path: '/p', headers: {} })).toBeNull();
  });
  it('joins baseUrl and path correctly', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    const c = createHttpClient({ fetch, baseUrl: 'https://x/api/v2/' });
    await c.request({ method: 'GET', path: '/profile', headers: {} });
    expect(fetch.mock.calls[0]![0]).toBe('https://x/api/v2/profile');
  });
  it('appends query params', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    const c = createHttpClient({ fetch, baseUrl: 'https://x' });
    await c.request({ method: 'GET', path: '/p', headers: {}, query: { a: '1', b: 'two' } });
    expect(fetch.mock.calls[0]![0]).toBe('https://x/p?a=1&b=two');
  });
});
