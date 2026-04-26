import { z } from 'zod';
import { AdaptyApiError } from '../http/errors.js';
import { redact, redactJson } from './redact.js';

export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export interface RunToolInput<S extends z.ZodTypeAny> {
  schema: S;
  args: unknown;
  handler: (parsed: z.infer<S>) => Promise<unknown>;
}

function textResult(text: string, isError = false): ToolResult {
  const r: ToolResult = { content: [{ type: 'text', text }] };
  if (isError) r.isError = true;
  return r;
}

export async function runTool<S extends z.ZodTypeAny>(input: RunToolInput<S>): Promise<ToolResult> {
  const parsed = input.schema.safeParse(input.args);
  if (!parsed.success) {
    const lines = parsed.error.issues.map(i => `${i.path.join('.') || '<root>'}: ${i.message}`);
    return textResult(`Invalid input:\n${lines.join('\n')}`, true);
  }
  try {
    const value = await input.handler(parsed.data);
    return textResult(JSON.stringify(redactJson(value), null, 2));
  } catch (e) {
    if (e instanceof AdaptyApiError) {
      return textResult(redact(e.toString()), true);
    }
    const msg = e instanceof Error ? e.message : String(e);
    return textResult(redact(msg), true);
  }
}
