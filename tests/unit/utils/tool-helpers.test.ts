import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { runTool } from '../../../src/utils/tool-helpers.js';
import { AdaptyApiError } from '../../../src/http/errors.js';

describe('runTool', () => {
  const schema = z.object({ x: z.number() });

  it('returns success content as JSON', async () => {
    const r = await runTool({
      schema,
      args: { x: 1 },
      handler: async ({ x }) => ({ doubled: x * 2 }),
    });
    expect(r.isError).toBeUndefined();
    expect(r.content[0]).toMatchObject({ type: 'text' });
    expect(JSON.parse((r.content[0] as { text: string }).text)).toEqual({ doubled: 2 });
  });
  it('returns validation error as isError content', async () => {
    const r = await runTool({
      schema,
      args: { x: 'not a number' },
      handler: async () => ({}),
    });
    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toMatch(/x/);
  });
  it('redacts secrets in returned data', async () => {
    const r = await runTool({
      schema,
      args: { x: 1 },
      handler: async () => ({ key: 'secret_live_aaa.tt9999' }),
    });
    expect((r.content[0] as { text: string }).text).toContain('secret_live_***9999');
  });
  it('maps AdaptyApiError to redacted error content', async () => {
    const r = await runTool({
      schema,
      args: { x: 1 },
      handler: async () => {
        throw new AdaptyApiError({
          status: 401,
          url: 'https://x',
          bodyExcerpt: 'token=secret_live_aa.tail1234',
        });
      },
    });
    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain('401');
    expect((r.content[0] as { text: string }).text).toContain('secret_live_***1234');
  });
  it('maps generic errors to error content', async () => {
    const r = await runTool({
      schema,
      args: { x: 1 },
      handler: async () => { throw new Error('boom'); },
    });
    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain('boom');
  });
});
