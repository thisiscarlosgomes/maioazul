import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

type Query = Record<string, string | number | undefined | null>;
type SessionState = {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
};

const SERVER_NAME = 'maioazul-dashboard-mcp';
const SERVER_VERSION = '0.1.0';
const DEFAULT_BASE_URL = process.env.DASHBOARD_BASE_URL ?? 'http://127.0.0.1:3000';
const REQUEST_TIMEOUT_MS = Number(process.env.MCP_REQUEST_TIMEOUT_MS ?? 15000);
const MCP_TRANSPORT = process.env.MCP_TRANSPORT ?? 'stdio';
const HTTP_HOST = process.env.MCP_HTTP_HOST ?? '127.0.0.1';
const HTTP_PORT = Number(process.env.MCP_HTTP_PORT ?? 3333);
const HTTP_PATH = process.env.MCP_HTTP_PATH ?? '/mcp';
const HEALTH_PATH = process.env.MCP_HEALTH_PATH ?? '/health';
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

function buildUrl(path: string, query?: Query): string {
  const url = new URL(path, DEFAULT_BASE_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function fetchJson(path: string, query?: Query): Promise<unknown> {
  const url = buildUrl(path, query);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
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

function createMcpAppServer(): McpServer {
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
        const data = await fetchJson('/api/transparencia/municipal/maio/turism/overview', { year });
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
        const data = await fetchJson('/api/transparencia/municipal/maio/turism/indicators', { ilha, year });
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
        const payload = (await fetchJson('/api/transparencia/municipal/maio/core-metrics', {
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
        const data = await fetchJson('/api/transparencia/turismo/quarters', { year });
        return ok('get_tourism_quarters', data);
      } catch (error) {
        return fail('get_tourism_quarters', error);
      }
    },
  );

  return server;
}

function writeJson(res: ServerResponse, status: number, body: unknown, headers?: Record<string, string>) {
  res.writeHead(status, {
    'content-type': 'application/json',
    ...headers,
  });
  res.end(JSON.stringify(body));
}

function logHttpRequest(req: IncomingMessage, status: number, startTime: number, meta?: Record<string, unknown>) {
  const durationMs = Date.now() - startTime;
  const payload = {
    scope: 'mcp-http',
    method: req.method ?? 'UNKNOWN',
    path: req.url ?? '',
    status,
    duration_ms: durationMs,
    ...meta,
  };

  console.error(JSON.stringify(payload));
}

function writeJsonRpcError(
  res: ServerResponse,
  status: number,
  message: string,
  code = -32000,
  headers?: Record<string, string>,
) {
  writeJson(
    res,
    status,
    {
      jsonrpc: '2.0',
      error: {
        code,
        message,
      },
      id: null,
    },
    headers,
  );
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function startStdioServer() {
  const server = createMcpAppServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${SERVER_NAME} running on stdio (base URL: ${DEFAULT_BASE_URL})`);
}

async function startHttpServer() {
  const sessions = new Map<string, SessionState>();

  const closeAllSessions = async () => {
    const activeSessions = Array.from(sessions.entries());
    sessions.clear();

    await Promise.allSettled(
      activeSessions.map(async ([, session]) => {
        await session.transport.close();
        await session.server.close();
      }),
    );
  };

  const nodeServer = createServer(async (req, res) => {
    const startTime = Date.now();

    try {
      if (!req.url) {
        writeJsonRpcError(res, 400, 'Bad Request: Missing URL');
        logHttpRequest(req, 400, startTime);
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host ?? `${HTTP_HOST}:${HTTP_PORT}`}`);
      if (url.pathname === HEALTH_PATH) {
        writeJson(res, 200, {
          ok: true,
          service: SERVER_NAME,
          version: SERVER_VERSION,
          transport: 'http',
          path: HTTP_PATH,
          sessions: sessions.size,
          dashboard_base_url: DEFAULT_BASE_URL,
        });
        logHttpRequest(req, 200, startTime, { health: true });
        return;
      }

      if (url.pathname !== HTTP_PATH) {
        writeJson(res, 404, { error: 'Not found' });
        logHttpRequest(req, 404, startTime);
        return;
      }

      if (req.method === 'GET') {
        writeJsonRpcError(res, 405, 'Method not allowed. Use POST for Streamable HTTP JSON responses.', -32000, {
          allow: 'POST',
        });
        logHttpRequest(req, 405, startTime);
        return;
      }

      if (req.method !== 'POST') {
        writeJsonRpcError(res, 405, 'Method not allowed.', -32000, {
          allow: 'POST',
        });
        logHttpRequest(req, 405, startTime);
        return;
      }

      const parsedBody = await readJsonBody(req);
      const sessionHeader = req.headers['mcp-session-id'];
      const sessionId = Array.isArray(sessionHeader) ? sessionHeader[0] : sessionHeader;

      if (sessionId) {
        const existingSession = sessions.get(sessionId);
        if (!existingSession) {
          writeJsonRpcError(res, 404, 'Session not found.');
          logHttpRequest(req, 404, startTime, { session_id: sessionId, session_found: false });
          return;
        }

        await existingSession.transport.handleRequest(req, res, parsedBody);
        logHttpRequest(req, res.statusCode || 200, startTime, { session_id: sessionId, session_found: true });
        return;
      }

      if (!isInitializeRequest(parsedBody)) {
        writeJsonRpcError(res, 400, 'Bad Request: No valid session ID provided.');
        logHttpRequest(req, 400, startTime, { initialize: false });
        return;
      }

      const server = createMcpAppServer();
      let initializedSessionId: string | undefined;
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: true,
        onsessioninitialized: (newSessionId) => {
          initializedSessionId = newSessionId;
          sessions.set(newSessionId, { server, transport });
        },
      });

      transport.onclose = () => {
        if (initializedSessionId) {
          sessions.delete(initializedSessionId);
        }
      };

      await server.connect(transport);
      await transport.handleRequest(req, res, parsedBody);
      logHttpRequest(req, res.statusCode || 200, startTime, {
        initialize: true,
        session_id: initializedSessionId,
      });
    } catch (error) {
      console.error('Error handling MCP HTTP request:', error);
      if (!res.headersSent) {
        writeJsonRpcError(res, 500, 'Internal server error', -32603);
      } else {
        res.end();
      }
      logHttpRequest(req, 500, startTime, {
        error: error instanceof Error ? error.message : 'unknown_error',
      });
    }
  });

  nodeServer.listen(HTTP_PORT, HTTP_HOST, () => {
    console.error(
      `${SERVER_NAME} running on http://${HTTP_HOST}:${HTTP_PORT}${HTTP_PATH} (health: ${HEALTH_PATH}, base URL: ${DEFAULT_BASE_URL}, JSON response mode)`,
    );
  });

  const shutdown = async () => {
    nodeServer.close();
    await closeAllSessions();
  };

  process.on('SIGINT', async () => {
    await shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await shutdown();
    process.exit(0);
  });
}

async function main() {
  if (MCP_TRANSPORT === 'http') {
    await startHttpServer();
    return;
  }

  if (MCP_TRANSPORT !== 'stdio') {
    throw new Error(`Unsupported MCP_TRANSPORT "${MCP_TRANSPORT}". Use "stdio" or "http".`);
  }

  await startStdioServer();
}

main().catch((error) => {
  console.error('Fatal error in MCP server:', error);
  process.exit(1);
});
