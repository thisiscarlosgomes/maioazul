import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const serverUrl = process.env.MCP_SERVER_URL ?? 'http://127.0.0.1:3333/mcp';

const calls = [
  ['get_tourism_overview', { year: 2025 }],
  ['get_tourism_indicators', { ilha: 'Maio', year: 2025 }],
  ['get_maio_core_metrics', { year: 2025, limit: 3 }],
  ['get_tourism_quarters', { year: 2025 }],
];

async function main() {
  const client = new Client({ name: 'maioazul-smoke-test', version: '0.1.0' });
  const transport = new StreamableHTTPClientTransport(new URL(serverUrl));

  await client.connect(transport);

  const failures = [];

  for (const [name, args] of calls) {
    const result = await client.callTool({ name, arguments: args });
    const text = result.content?.find((item) => item.type === 'text')?.text ?? '';
    const parsed = text ? JSON.parse(text) : null;

    if (!parsed?.ok) {
      failures.push({ name, error: parsed?.error ?? 'invalid_response' });
      continue;
    }

    const summary = Array.isArray(parsed.payload?.data)
      ? { rows: parsed.payload.data.length }
      : { keys: Object.keys(parsed.payload ?? {}).slice(0, 8) };

    console.log(JSON.stringify({ tool: name, ok: true, summary }));
  }

  await client.close();

  if (failures.length > 0) {
    console.error(JSON.stringify({ ok: false, failures }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, serverUrl, toolsChecked: calls.map(([name]) => name) }, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
