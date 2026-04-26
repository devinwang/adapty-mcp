import { describe, it, expect, vi } from 'vitest';
import { createRateLimiter } from '../../../src/http/rate-limit.js';

describe('createRateLimiter', () => {
  it('allows up to capacity then warns', () => {
    const warn = vi.fn();
    const rl = createRateLimiter({ capacity: 3, refillPerMs: 1 / 60_000, onWarn: warn });
    expect(rl.tryConsume()).toBe(true);
    expect(rl.tryConsume()).toBe(true);
    expect(rl.tryConsume()).toBe(true);
    expect(rl.tryConsume()).toBe(false);
    expect(warn).toHaveBeenCalled();
  });
  it('refills over time', async () => {
    const rl = createRateLimiter({ capacity: 1, refillPerMs: 1 });
    rl.tryConsume();
    expect(rl.tryConsume()).toBe(false);
    await new Promise(r => setTimeout(r, 5));
    expect(rl.tryConsume()).toBe(true);
  });
});
