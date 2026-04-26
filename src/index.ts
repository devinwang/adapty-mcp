#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import { createServer } from './server.js';

const handle = createServer();
const server = new Server(
  { name: 'adapty-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = await handle.listTools();
  return {
    tools: tools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.inputSchema as z.ZodTypeAny, { target: 'jsonSchema7' }),
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const result = await handle.callTool(req.params.name, req.params.arguments);
  return result as unknown as { content: Array<{ type: 'text'; text: string }>; isError?: boolean };
});

await server.connect(new StdioServerTransport());
