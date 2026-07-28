import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  executeGuideTool,
  nativeToolDefinitions,
  ToolHttpError,
  type GuideToolName,
  toolSchemas,
} from "@/lib/chat/guide-data-tools";

const SERVER_NAME = "visit-maio-guide-mcp";
const SERVER_VERSION = "0.1.0";

function ok(tool: string, payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
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
          type: "text" as const,
          text: JSON.stringify(
            {
              tool,
              ok: false,
              error: {
                type: "upstream_http_error",
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
          type: "text" as const,
          text: JSON.stringify(
            {
              tool,
              ok: false,
              error: {
                type: "internal_error",
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
        type: "text" as const,
        text: JSON.stringify(
          {
            tool,
            ok: false,
            error: {
              type: "unknown_error",
              message: "Unknown error",
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

function registerTool(server: McpServer, request: Request, name: GuideToolName) {
  const definition = nativeToolDefinitions[name];
  const inputSchema = toolSchemas[name];

  server.registerTool(
    name,
    {
      title: definition.title,
      description: definition.description,
      inputSchema,
    },
    async (args: unknown) => {
      try {
        const payload = await executeGuideTool(request, name, args);
        return ok(name, payload);
      } catch (error) {
        return fail(name, error);
      }
    },
  );
}

function createMcpServer(request: Request): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  (Object.keys(nativeToolDefinitions) as GuideToolName[]).forEach((name) => {
    registerTool(server, request, name);
  });

  return server;
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, mcp-session-id, mcp-protocol-version, Last-Event-ID",
  );
  headers.set("Access-Control-Expose-Headers", "mcp-session-id, mcp-protocol-version");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function handleMcpRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
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
      request.method === "POST"
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
    transport: "streamable-http",
    mode: "stateless-json",
    endpoint: new URL("/api/mcp", request.url).toString(),
  });
}
