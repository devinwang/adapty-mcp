import { describe, it, expect } from 'vitest';
import { AdaptyApiError, normalizeErrorResponse } from '../../../src/http/errors.js';

describe('AdaptyApiError', () => {
  it('serializes to a redacted summary', () => {
    const e = new AdaptyApiError({
      status: 401,
      statusText: 'Unauthorized',
      requestId: 'req-1',
      url: 'https://api.adapty.io/profile',
      bodyExcerpt: 'auth=secret_live_xx.tail1234',
    });
    expect(e.message).toContain('401');
    expect(e.toString()).toContain('secret_live_***1234');
  });
});

describe('normalizeErrorResponse', () => {
  it('returns AdaptyApiError with parsed body fields', async () => {
    const res = new Response(JSON.stringify({ errors: [{ code: 'BAD', message: 'no' }] }), {
      status: 400,
      headers: { 'content-type': 'application/json', 'x-request-id': 'r-2' },
    });
    const err = await normalizeErrorResponse(res, 'https://x');
    expect(err.status).toBe(400);
    expect(err.requestId).toBe('r-2');
    expect(err.bodyExcerpt).toContain('BAD');
  });
  it('truncates large bodies to 500 chars', async () => {
    const big = 'x'.repeat(2000);
    const res = new Response(big, { status: 500 });
    const err = await normalizeErrorResponse(res, 'https://x');
    expect(err.bodyExcerpt!.length).toBeLessThanOrEqual(500);
  });
  it('handles non-text bodies gracefully', async () => {
    const res = new Response(null, { status: 502 });
    const err = await normalizeErrorResponse(res, 'https://x');
    expect(err.status).toBe(502);
  });
});
