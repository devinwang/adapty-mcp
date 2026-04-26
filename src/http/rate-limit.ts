export interface RateLimiterOptions {
  capacity: number;
  refillPerMs: number;
  onWarn?: (msg: string) => void;
}

export interface RateLimiter {
  tryConsume(n?: number): boolean;
}

export function createRateLimiter(opts: RateLimiterOptions): RateLimiter {
  let tokens = opts.capacity;
  let last = Date.now();
  const warn = opts.onWarn ?? ((m: string) => console.error(`adapty-mcp: ${m}`));
  return {
    tryConsume(n = 1) {
      const now = Date.now();
      tokens = Math.min(opts.capacity, tokens + (now - last) * opts.refillPerMs);
      last = now;
      if (tokens >= n) {
        tokens -= n;
        return true;
      }
      warn(`rate limit advisory exceeded (capacity=${opts.capacity}/min)`);
      return false;
    },
  };
}
