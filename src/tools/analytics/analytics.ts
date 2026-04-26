/**
 * Analytics Export API tools (uses secret key, admin host).
 *
 * Paths assumed per the implementation plan; the
 * https://adapty.io/docs/api-export-analytics page is SPA-rendered and
 * could not be programmatically extracted. Tighten in M9.4 contract
 * tests against actual responses.
 *
 *   adapty_analytics_query          POST /metrics/analytics/
 *   adapty_analytics_cohorts_query  POST /metrics/cohorts/
 *   adapty_analytics_export_csv     POST /metrics/analytics/export/
 *
 * Base URL: https://api-admin.adapty.io/api/v1/client-api
 */
import { z } from 'zod';
import { buildHeaders, type AdaptyPlatform } from '../../auth/headers.js';
import type { AccountStore } from '../../auth/account-store.js';
import type { HttpClient } from '../../http/client.js';
import { CommonRequestSchema } from '../../schemas/common.js';
import { runTool, type ToolResult } from '../../utils/tool-helpers.js';

export interface ToolDeps { accountStore: AccountStore; httpClient: HttpClient; }
export interface ToolDef {
  name: string; description: string;
  inputSchema: z.ZodTypeAny;
  handler: (args: unknown, deps: ToolDeps) => Promise<ToolResult>;
}

const AnalyticsQuerySchema = CommonRequestSchema.extend({
  metric: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  groupBy: z.array(z.string()).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
});

const CohortsQuerySchema = CommonRequestSchema.extend({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  groupBy: z.array(z.string()).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
});

const AnalyticsExportSchema = CommonRequestSchema.extend({
  metric: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  groupBy: z.array(z.string()).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
});

function analyticsHeaders(
  deps: ToolDeps,
  a: {
    app?: string | undefined;
    environment?: 'live' | 'sandbox' | undefined;
    platform?: string | undefined;
  },
) {
  const cred = deps.accountStore.resolve({
    ...(a.app !== undefined ? { app: a.app } : {}),
    ...(a.environment !== undefined ? { environment: a.environment } : {}),
  });
  return buildHeaders({
    credentials: cred,
    keyType: 'secret',
    allowAnonymous: true,
    ...(a.platform !== undefined ? { platform: a.platform as AdaptyPlatform } : {}),
  });
}

export const analyticsTools: ToolDef[] = [
  {
    name: 'adapty_analytics_query',
    description: 'Query Adapty analytics metrics over a date range. Use case: pull MRR/ARR/conversion numbers into a dashboard or chatbot answer.',
    inputSchema: AnalyticsQuerySchema,
    handler: (args, deps) => runTool({
      schema: AnalyticsQuerySchema, args,
      handler: async (a) => {
        const body: Record<string, unknown> = {
          metric: a.metric,
          start_date: a.startDate,
          end_date: a.endDate,
        };
        if (a.groupBy !== undefined) body['group_by'] = a.groupBy;
        if (a.filters !== undefined) body['filters'] = a.filters;
        return deps.httpClient.request({
          method: 'POST', path: '/metrics/analytics/',
          headers: analyticsHeaders(deps, a),
          body,
        });
      },
    }),
  },
  {
    name: 'adapty_analytics_cohorts_query',
    description: 'Query Adapty cohort retention metrics over a date range. Use case: weekly/monthly retention for a marketing review.',
    inputSchema: CohortsQuerySchema,
    handler: (args, deps) => runTool({
      schema: CohortsQuerySchema, args,
      handler: async (a) => {
        const body: Record<string, unknown> = {
          start_date: a.startDate,
          end_date: a.endDate,
        };
        if (a.groupBy !== undefined) body['group_by'] = a.groupBy;
        if (a.filters !== undefined) body['filters'] = a.filters;
        return deps.httpClient.request({
          method: 'POST', path: '/metrics/cohorts/',
          headers: analyticsHeaders(deps, a),
          body,
        });
      },
    }),
  },
  {
    name: 'adapty_analytics_export_csv',
    description: 'Export an analytics dataset as CSV. Use case: bulk download for spreadsheet analysis.',
    inputSchema: AnalyticsExportSchema,
    handler: (args, deps) => runTool({
      schema: AnalyticsExportSchema, args,
      handler: async (a) => {
        const body: Record<string, unknown> = {
          metric: a.metric,
          start_date: a.startDate,
          end_date: a.endDate,
        };
        if (a.groupBy !== undefined) body['group_by'] = a.groupBy;
        if (a.filters !== undefined) body['filters'] = a.filters;
        return deps.httpClient.request({
          method: 'POST', path: '/metrics/analytics/export/',
          headers: analyticsHeaders(deps, a),
          body,
        });
      },
    }),
  },
];
