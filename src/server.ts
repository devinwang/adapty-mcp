import { collectTools, type BoundTool } from './tools/index.js';
import type { FetchLike } from './http/client.js';
import type { ToolResult } from './utils/tool-helpers.js';

export interface ServerHandle {
  listTools(): Promise<Array<{ name: string; description: string; inputSchema: unknown }>>;
  callTool(name: string, args: unknown): Promise<ToolResult>;
}

export interface ServerOptions { fetch?: FetchLike; }

export function createServer(opts: ServerOptions = {}): ServerHandle {
  const fetchImpl = opts.fetch ?? fetch;
  const tools: BoundTool[] = collectTools({ fetch: fetchImpl });
  const byName = new Map(tools.map(t => [t.name, t] as const));
  return {
    async listTools() {
      return tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
    },
    async callTool(name, args) {
      const t = byName.get(name);
      if (!t) return { content: [{ type: 'text', text: `unknown tool: ${name}` }], isError: true };
      return t.call(args);
    },
  };
}
