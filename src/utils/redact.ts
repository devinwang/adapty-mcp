const KEY_RE = /\b((?:secret|public)_(?:live|stag))_([A-Za-z0-9._-]+)/g;

export function redact(input: string): string {
  if (!input) return input;
  return input.replace(KEY_RE, (_, prefix: string, body: string) => {
    const last4 = body.slice(-4);
    return `${prefix}_***${last4}`;
  });
}

export function redactJson<T>(value: T): T {
  if (typeof value === 'string') return redact(value) as T;
  if (Array.isArray(value)) return value.map(redactJson) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactJson(v);
    }
    return out as T;
  }
  return value;
}
