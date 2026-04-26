import { z } from 'zod';
import { timingSafeEqual } from 'node:crypto';
import { runTool, type ToolResult } from '../../utils/tool-helpers.js';
import { WebhookEventSchema } from '../../schemas/webhook-events.js';

export interface ToolDeps { accountStore: unknown; httpClient: unknown; }
export interface ToolDef {
  name: string; description: string;
  inputSchema: z.ZodTypeAny;
  handler: (args: unknown, deps: ToolDeps) => Promise<ToolResult>;
}

const VerifySchema = z.object({
  received: z.string(),
  expected: z.string().min(1, 'expected webhook authorization token must be non-empty'),
});

const ParseSchema = z.object({
  rawBody: z.string().min(1),
});

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export const webhookTools: ToolDef[] = [
  {
    name: 'adapty_webhook_authorization_verify',
    description: 'Verify an incoming Adapty webhook by constant-time comparing the inbound Authorization header value against the value you configured in the Adapty dashboard. No HMAC — Adapty echoes the configured token verbatim.',
    inputSchema: VerifySchema,
    handler: (args) => runTool({
      schema: VerifySchema, args,
      handler: async ({ received, expected }) => ({ valid: constantTimeEqual(received, expected) }),
    }),
  },
  {
    name: 'adapty_webhook_event_parse',
    description: 'Parse a raw webhook JSON body into a typed Adapty event. Validates against the discriminated union of all 18 known event types.',
    inputSchema: ParseSchema,
    handler: (args) => runTool({
      schema: ParseSchema, args,
      handler: async ({ rawBody }) => {
        const parsed = JSON.parse(rawBody);
        return WebhookEventSchema.parse(parsed);
      },
    }),
  },
];
