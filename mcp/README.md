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

### 5) `search_codigo_postura`

- Purpose: ranked semantic/keyword search over locally indexed legal corpus chunks
- Local source: `data/codigo_postura/*.jsonl` (or `LEGAL_CODE_CHUNKS_PATH`)
- Input:
  - `query: string`
  - `top_k: number` (`1-20`, default: `5`)
  - `article_number?: number`
  - `doc_id?: string`
- Output:
  - `{ tool, ok, payload }` with cited snippets (`article_number`, pages, title/chapter, source_pdf)

### 6) `get_codigo_postura_article`

- Purpose: deterministic retrieval of full text for one legal article
- Input:
  - `article_number: number`
  - `doc_id?: string`
  - `max_chars: number` (`200-60000`, default: `12000`)
- Output:
  - `{ tool, ok, payload }` with full/trimmed text and page citations

### 7) `list_codigo_postura_articles`

- Purpose: list available article numbers and structural citations by document
- Input:
  - `doc_id?: string`
  - `limit: number` (`1-1000`, default: `400`)
- Output:
  - `{ tool, ok, payload }` with article metadata entries

### 8) `get_codigo_postura_stats`

- Purpose: corpus coverage stats (documents, chunks, article ranges)
- Input:
  - none
- Output:
  - `{ tool, ok, payload }`

### 9) `get_codigo_postura_qa`

- Purpose: extraction quality diagnostics for legal corpus chunks
- Input:
  - `doc_id?: string`
  - `sample_limit: number` (`5-200`, default: `40`)
- Output:
  - `{ tool, ok, payload }` with `suspicious_ratio`, `severity`, `reason_breakdown`, and cited sample lines

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
- `LEGAL_CODE_CHUNKS_PATH` (optional absolute path to one `.jsonl` file or a directory containing `.jsonl` files)

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

This checks all 9 tools through the MCP HTTP transport and exits non-zero if any call fails.

## Next hardening steps

1. Add authentication and tenant scoping before any write tools.
2. Add auth-aware client configuration for whichever hosted connector you want to use first.
3. Add SSE mode only if a target client specifically needs server-initiated notifications.
