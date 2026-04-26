#!/usr/bin/env tsx
/**
 * Generate the Markdown tool catalog used in README.md.
 *
 * This script does NOT issue any HTTP requests; it merely instantiates the
 * tool registry to read tool names and descriptions.
 */
import { collectTools, type BoundTool } from '../src/tools/index.js';

interface Group {
  title: string;
  match: (name: string) => boolean;
}

const GROUPS: Group[] = [
  {
    title: 'Server-Side API v2',
    match: (n) =>
      n.startsWith('adapty_profile_') ||
      n.startsWith('adapty_access_level_') ||
      n.startsWith('adapty_transaction_') ||
      n === 'adapty_stripe_purchase_validate' ||
      n.startsWith('adapty_integration_identifiers_') ||
      n.startsWith('adapty_paywall_') ||
      n.startsWith('adapty_paywalls_'),
  },
  {
    title: 'Server-Side API v1 (Legacy)',
    match: (n) => n.startsWith('adapty_v1_'),
  },
  {
    title: 'Web API',
    match: (n) => n.startsWith('adapty_web_'),
  },
  {
    title: 'Analytics Export',
    match: (n) => n.startsWith('adapty_analytics_'),
  },
  {
    title: 'Webhook Utilities',
    match: (n) => n.startsWith('adapty_webhook_'),
  },
];

function escapeCell(value: string): string {
  // Collapse all whitespace runs (including newlines) into a single space and
  // escape pipe characters so the markdown table renders as a single row.
  return value.replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();
}

function renderGroup(title: string, tools: BoundTool[]): string {
  const lines: string[] = [];
  lines.push(`### ${title}`);
  lines.push('');
  lines.push('| Tool | Description |');
  lines.push('| --- | --- |');
  for (const t of tools) {
    lines.push(`| \`${t.name}\` | ${escapeCell(t.description)} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const tools = collectTools({ fetch: globalThis.fetch });
  const out: string[] = [];
  out.push('## Tool catalog');
  out.push('');
  const seen = new Set<string>();
  for (const group of GROUPS) {
    const matched = tools.filter((t) => group.match(t.name));
    matched.forEach((t) => seen.add(t.name));
    if (matched.length === 0) continue;
    out.push(renderGroup(group.title, matched));
  }
  const leftover = tools.filter((t) => !seen.has(t.name));
  if (leftover.length > 0) {
    out.push(renderGroup('Other', leftover));
  }
  process.stdout.write(out.join('\n'));
  if (!out[out.length - 1]?.endsWith('\n')) process.stdout.write('\n');
}

main();
