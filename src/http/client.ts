import { normalizeErrorResponse, AdaptyApiError } from './errors.js';

export type FetchLike = typeof fetch;

export interface HttpClientOptions {
  fetch: FetchLike;
  baseUrl: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryBaseMs?: number;
}

export interface RequestInput {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  headers: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
}

export interface HttpClient {
  request<T = unknown>(input: RequestInput): Promise<T>;
}

const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

function joinUrl(base: string, path: string): string {
  const b = base.endsWith('/') ? base : base + '/';
  const p = path.startsWith('/') ? path.slice(1) : path;
  return b + p;
}

function appendQuery(url: string, query?: Record<string, string>): string {
  if (!query || Object.keys(query).length === 0) return url;
  const u = new URL(url);
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  return u.toString();
}

async function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export function createHttpClient(opts: HttpClientOptions): HttpClient {
  const fetchImpl = opts.fetch;
  const baseUrl = opts.baseUrl;
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const maxRetries = opts.maxRetries ?? 3;
  const retryBaseMs = opts.retryBaseMs ?? 250;

  return {
    async request<T>(input: RequestInput): Promise<T> {
      const url = appendQuery(joinUrl(baseUrl, input.path), input.query);
      const init: RequestInit = {
        method: input.method,
        headers: input.headers,
      };
      if (input.body !== undefined) init.body = JSON.stringify(input.body);

      const isRetryable = input.method === 'GET';
      let attempt = 0;
      while (true) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
          const res = await fetchImpl(url, { ...init, signal: ctrl.signal });
          clearTimeout(timer);
          if (!res.ok) {
            if (isRetryable && RETRYABLE_STATUSES.has(res.status) && attempt < maxRetries - 1) {
              await sleep(retryBaseMs * Math.pow(2, attempt));
              attempt += 1;
              continue;
            }
            throw await normalizeErrorResponse(res, url);
          }
          if (res.status === 204) return null as T;
          const ct = res.headers.get('content-type') ?? '';
          if (ct.includes('application/json')) return await res.json() as T;
          return await res.text() as unknown as T;
        } catch (e) {
          clearTimeout(timer);
          if (e instanceof AdaptyApiError) throw e;
          throw e;
        }
      }
    },
  };
}
