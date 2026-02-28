import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import * as z from 'zod/v4';

type Query = Record<string, string | number | undefined | null>;

const SERVER_NAME = 'maioazul-dashboard-mcp';
const SERVER_VERSION = '0.1.0';
const MIN_YEAR = 2024;
const MAX_YEAR = 2035;

class ToolHttpError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = 'ToolHttpError';
    this.status = status;
    this.body = body;
  }
}

function getBaseUrl(request: Request): string {
  const envBaseUrl = process.env.DASHBOARD_BASE_URL?.trim();
  if (envBaseUrl) {
    return envBaseUrl;
  }

  const url = new URL(request.url);
  return url.origin;
}

function buildUrl(request: Request, path: string, query?: Query): string {
  const url = new URL(path, getBaseUrl(request));

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function fetchJson(request: Request, path: string, query?: Query): Promise<unknown> {
  const url = buildUrl(request, path, query);
  const timeoutMs = Number(process.env.MCP_REQUEST_TIMEOUT_MS ?? 15000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new ToolHttpError(`Upstream request failed (${res.status})`, res.status, await res.text());
    }

    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

function ok(tool: string, payload: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ tool, ok: true, payload }, null, 2),
      },
    ],
  };
}

function fail(tool: string, error: unknown) {
  if (error instanceof ToolHttpError) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              tool,
              ok: false,
              error: {
                type: 'upstream_http_error',
                status: error.status,
                message: error.message,
                body: error.body.slice(0, 1000),
              },
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }

  if (error instanceof Error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              tool,
              ok: false,
              error: {
                type: 'internal_error',
                message: error.message,
              },
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            tool,
            ok: false,
            error: {
              type: 'unknown_error',
              message: 'Unknown error',
            },
          },
          null,
          2,
        ),
      },
    ],
    isError: true,
  };
}

function createMcpServer(request: Request): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  server.registerTool(
    'get_tourism_overview',
    {
      title: 'Get Tourism Overview',
      description: 'Fetches island tourism summary by quarter and totals for a year from municipal Maio tourism data.',
      inputSchema: {
        year: z.number().int().min(MIN_YEAR).max(MAX_YEAR).optional().describe('Reference year. Defaults to 2025 in upstream API.'),
      },
    },
    async ({ year }) => {
      try {
        const data = await fetchJson(request, '/api/transparencia/municipal/maio/turism/overview', { year });
        return ok('get_tourism_overview', data);
      } catch (error) {
        return fail('get_tourism_overview', error);
      }
    },
  );

  server.registerTool(
    'get_tourism_indicators',
    {
      title: 'Get Tourism Indicators',
      description:
        'Returns tourism pressure, seasonality, and local-retention proxy for an island/year using your existing indicators API.',
      inputSchema: {
        ilha: z.enum(['Maio', 'Sal', 'Boa Vista']).default('Maio').describe('Island name used by the upstream API.'),
        year: z.number().int().min(MIN_YEAR).max(MAX_YEAR).default(2025).describe('Reference year.'),
      },
    },
    async ({ ilha, year }) => {
      try {
        const data = await fetchJson(request, '/api/transparencia/municipal/maio/turism/indicators', { ilha, year });
        return ok('get_tourism_indicators', data);
      } catch (error) {
        return fail('get_tourism_indicators', error);
      }
    },
  );

  server.registerTool(
    'get_maio_core_metrics',
    {
      title: 'Get Maio Core Metrics',
      description: 'Returns Maio municipal core metrics with optional filters and bounded row count.',
      inputSchema: {
        year: z.number().int().min(MIN_YEAR).max(MAX_YEAR).optional().describe('Reference year. If omitted, API returns latest year.'),
        category: z.string().min(1).max(64).optional().describe('Category filter from maio_core_metrics.'),
        metric: z.string().min(1).max(64).optional().describe('Metric name filter from maio_core_metrics.'),
        limit: z.number().int().min(1).max(200).default(100).describe('Maximum number of metric rows returned to the client.'),
      },
    },
    async ({ year, category, metric, limit }) => {
      try {
        const payload = (await fetchJson(request, '/api/transparencia/municipal/maio/core-metrics', {
          year,
          category,
          metric,
        })) as { data?: unknown[] };

        const rows = Array.isArray(payload?.data) ? payload.data : [];
        const bounded = rows.slice(0, limit);

        return ok('get_maio_core_metrics', {
          ...payload,
          data: bounded,
          limits: {
            requested_limit: limit,
            total_rows_available: rows.length,
            returned_rows: bounded.length,
          },
        });
      } catch (error) {
        return fail('get_maio_core_metrics', error);
      }
    },
  );

  server.registerTool(
    'get_tourism_quarters',
    {
      title: 'Get Tourism Quarters',
      description: 'Returns quarterly guest/night aggregates per island for a year.',
      inputSchema: {
        year: z.number().int().min(MIN_YEAR).max(MAX_YEAR).default(2025).describe('Reference year.'),
      },
    },
    async ({ year }) => {
      try {
        const data = await fetchJson(request, '/api/transparencia/turismo/quarters', { year });
        return ok('get_tourism_quarters', data);
      } catch (error) {
        return fail('get_tourism_quarters', error);
      }
    },
  );

  return server;
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id, mcp-protocol-version, Last-Event-ID');
  headers.set('Access-Control-Expose-Headers', 'mcp-session-id, mcp-protocol-version');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function handleMcpRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return withCors(new Response(null, { status: 204 }));
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  const server = createMcpServer(request);
  await server.connect(transport);

  const response = await transport.handleRequest(request, {
    parsedBody:
      request.method === 'POST'
        ? await request
            .clone()
            .json()
            .catch(() => undefined)
        : undefined,
  });

  return withCors(response);
}

export function getMcpHealth(request: Request) {
  return Response.json({
    ok: true,
    service: SERVER_NAME,
    version: SERVER_VERSION,
    transport: 'streamable-http',
    mode: 'stateless-json',
    endpoint: new URL('/api/mcp', request.url).toString(),
  });
}

export { isInitializeRequest };
