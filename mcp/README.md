# MaioAzul Dashboard MCP

This MCP server wraps existing dashboard APIs from this repo. It does not duplicate data logic.

## What this gives you

- Strict tool contracts (typed input + bounded output)
- Read-only access to dashboard data for LLM clients
- Stable JSON envelopes for predictable downstream use
- Dual transport support: stdio for local clients and Streamable HTTP for hosted connectors

## Tool Contract

### 1) `get_tourism_overview`

- Purpose: tourism summary by quarter and island totals
- Upstream route: `/api/transparencia/municipal/maio/turism/overview`
- Input:
  - `year?: number` (`2024-2035`)
- Output:
  - `{ tool, ok, payload }`

### 2) `get_tourism_indicators`

- Purpose: tourism pressure, seasonality, local retention proxy
- Upstream route: `/api/transparencia/municipal/maio/turism/indicators`
- Input:
  - `ilha: "Maio" | "Sal" | "Boa Vista"` (default: `"Maio"`)
  - `year: number` (`2024-2035`, default: `2025`)
- Output:
  - `{ tool, ok, payload }`

### 3) `get_maio_core_metrics`

- Purpose: municipal core metrics with optional filtering
- Upstream route: `/api/transparencia/municipal/maio/core-metrics`
- Input:
  - `year?: number` (`2024-2035`)
  - `category?: string`
  - `metric?: string`
  - `limit: number` (`1-200`, default: `100`)
- Output:
  - `{ tool, ok, payload }` where `payload.data` is truncated to `limit`

### 4) `get_tourism_quarters`

- Purpose: quarterly guest/night aggregates by island
- Upstream route: `/api/transparencia/turismo/quarters`
- Input:
  - `year: number` (`2024-2035`, default: `2025`)
- Output:
  - `{ tool, ok, payload }`

## Error Model

All tools return a single JSON text payload.

Success:

```json
{
  "tool": "get_tourism_overview",
  "ok": true,
  "payload": {}
}
```

Failure:

```json
{
  "tool": "get_tourism_overview",
  "ok": false,
  "error": {
    "type": "upstream_http_error",
    "status": 500,
    "message": "Upstream request failed (500)",
    "body": "..."
  }
}
```

## Run

1. Install deps:

```bash
cd /Users/carlos/maioazul/mcp
npm install
```

2. Start your Next app (separate terminal):

```bash
cd /Users/carlos/maioazul
npm run dev
```

3. Start MCP server:

```bash
cd /Users/carlos/maioazul/mcp
npm run dev
```

## Run Over Streamable HTTP

1. Start your Next app:

```bash
cd /Users/carlos/maioazul
npm run dev
```

2. Start the MCP server in HTTP mode:

```bash
cd /Users/carlos/maioazul/mcp
npm run dev:http
```

3. Connect your MCP client to:

```text
http://127.0.0.1:3333/mcp
```

Notes:

- The HTTP transport runs in Streamable HTTP JSON response mode.
- Use `POST` requests against `/mcp`.
- Session IDs are generated automatically on initialize and reused via the `mcp-session-id` header.
- Health is available at `http://127.0.0.1:3333/health`.
- Each HTTP request is logged to stderr as structured JSON.

## Environment

- `DASHBOARD_BASE_URL` (default: `http://127.0.0.1:3000`)
- `MCP_REQUEST_TIMEOUT_MS` (default: `15000`)
- `MCP_TRANSPORT` (`stdio` or `http`, default: `stdio`)
- `MCP_HTTP_HOST` (default: `127.0.0.1`)
- `MCP_HTTP_PORT` (default: `3333`)
- `MCP_HTTP_PATH` (default: `/mcp`)
- `MCP_HEALTH_PATH` (default: `/health`)

## Connect MCP client (stdio)

Use command-based MCP config in your client:

- command: `node`
- args: [`/Users/carlos/maioazul/mcp/dist/server.js`]

Or for dev:

- command: `npm`
- args: [`run`, `dev`, `--prefix`, `/Users/carlos/maioazul/mcp`]

## Connect MCP client (Streamable HTTP)

Use URL-based MCP config in your client:

- url: `http://127.0.0.1:3333/mcp`
- transport: `streamable-http`

## Smoke Test

With the Next app and MCP HTTP server both running:

```bash
cd /Users/carlos/maioazul/mcp
npm run smoke:http
```

This checks all 4 tools through the MCP HTTP transport and exits non-zero if any call fails.

## Next hardening steps

1. Add authentication and tenant scoping before any write tools.
2. Add auth-aware client configuration for whichever hosted connector you want to use first.
3. Add SSE mode only if a target client specifically needs server-initiated notifications.
