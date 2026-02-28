const PROD_ENDPOINT = "https://www.maioazul.com/api/mcp";
const HEALTH_ENDPOINT = "https://www.maioazul.com/api/mcp/health";
const LOCAL_ENDPOINT = "http://127.0.0.1:3000/api/mcp";

const clients = [
  {
    name: "ChatGPT",
    note: "Available on paid plans that support connectors.",
    steps: [
      "Open ChatGPT in your browser and go to Settings.",
      "Open Apps and connectors, then enable Developer mode in Advanced settings if required.",
      "Add a new custom connector and use the hosted MCP URL below.",
    ],
    code: PROD_ENDPOINT,
  },
  {
    name: "Claude Desktop",
    note: "Use an HTTP bridge command in the local desktop config.",
    steps: [
      "Open your Claude Desktop config file.",
      "Add a new entry under mcpServers.",
      "Restart Claude Desktop after saving the file.",
    ],
    code: `{
  "mcpServers": {
    "maioazul": {
      "command": "npx",
      "args": ["mcp-remote", "${PROD_ENDPOINT}"]
    }
  }
}`,
  },
  {
    name: "Claude Code",
    note: "Direct HTTP registration from the CLI.",
    steps: [
      "Open your terminal.",
      "Run the command below once.",
      "Claude Code will register the remote MCP server for future sessions.",
    ],
    code: `claude mcp add --transport http maioazul ${PROD_ENDPOINT}`,
  },
  {
    name: "Gemini CLI",
    note: "Add the server to your Gemini settings.json file.",
    steps: [
      "Open ~/.gemini/settings.json.",
      "Add the mcpServers entry below.",
      "Restart Gemini CLI.",
    ],
    code: `{
  "mcpServers": {
    "maioazul": {
      "httpUrl": "${PROD_ENDPOINT}"
    }
  }
}`,
  },
  {
    name: "Cursor",
    note: "Cursor supports MCP in Settings.",
    steps: [
      "Open Cursor Settings.",
      "Search for MCP or Model Context Protocol.",
      "Add a new server using the configuration below.",
    ],
    code: `{
  "mcpServers": {
    "maioazul": {
      "url": "${PROD_ENDPOINT}",
      "transport": "http"
    }
  }
}`,
  },
  {
    name: "VS Code",
    note: "Use settings.json with an HTTP server entry.",
    steps: [
      "Open Command Palette and choose Preferences: Open Settings (JSON).",
      "Add the server definition below.",
      "Reload the window if the extension asks for it.",
    ],
    code: `{
  "servers": {
    "maioazul": {
      "url": "${PROD_ENDPOINT}",
      "type": "http"
    }
  }
}`,
  },
  {
    name: "Windsurf",
    note: "Use the remote MCP bridge command.",
    steps: [
      "Open ~/.codeium/mcp_config.json.",
      "Add the configuration below.",
      "Restart Windsurf.",
    ],
    code: `{
  "mcpServers": {
    "maioazul": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${PROD_ENDPOINT}"]
    }
  }
}`,
  },
  {
    name: "AnythingLLM",
    note: "Use a streamable MCP server entry.",
    steps: [
      "Open anythingllm_mcp_servers.json in your desktop storage folder.",
      "Add the server definition below.",
      "Restart AnythingLLM.",
    ],
    code: `{
  "mcpServers": {
    "maioazul": {
      "type": "streamable",
      "url": "${PROD_ENDPOINT}"
    }
  }
}`,
  },
];

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-[24px] border border-white/10 bg-[#0f1720] px-5 py-4 text-sm leading-6 text-[#d6e2ea]">
      <code>{code}</code>
    </pre>
  );
}

export default function McpGuidePage() {
  return (
    <main className="min-h-screen bg-[#f6f1e8] text-[#16202a]">
      <section className="relative overflow-hidden border-b border-[#16202a]/10 bg-[radial-gradient(circle_at_top_left,_rgba(19,120,107,0.18),_transparent_32%),linear-gradient(135deg,#f6f1e8_0%,#efe4d2_52%,#e2efe8_100%)]">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 lg:px-10">
          <div className="max-w-4xl">
            <p className="inline-flex rounded-full border border-[#16202a]/10 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#13786b]">
              MaioAzul MCP
            </p>
            <h1 className="mt-6 max-w-3xl font-['Bebas_Neue'] text-[clamp(3.4rem,10vw,6.8rem)] leading-[0.92] tracking-[0.02em] text-[#13222d]">
              Connect MaioAzul to your AI tools
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#16202a]/78 sm:text-xl">
              The MaioAzul MCP server gives ChatGPT, Claude, Cursor, Gemini, and other MCP-compatible clients direct
              access to Maio tourism dashboards and island data through a hosted read-only endpoint.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-[28px] border border-[#16202a]/10 bg-white/80 p-6 shadow-[0_20px_60px_rgba(16,32,42,0.08)] backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#13786b]">Hosted endpoint</p>
              <a className="mt-3 block text-lg font-semibold text-[#13222d] underline decoration-[#13786b]/35 underline-offset-4" href={PROD_ENDPOINT}>
                {PROD_ENDPOINT}
              </a>
              <p className="mt-4 text-sm leading-7 text-[#16202a]/70">
                No API key is required right now. The server is read-only and currently exposes tourism overview,
                tourism indicators, Maio core metrics, and tourism quarters tools.
              </p>
            </div>

            <div className="rounded-[28px] border border-[#16202a]/10 bg-[#13222d] p-6 text-[#e7f1f0] shadow-[0_20px_60px_rgba(16,32,42,0.16)]">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8fd7ca]">Health</p>
              <a className="mt-3 block text-base font-medium text-white underline decoration-white/30 underline-offset-4" href={HEALTH_ENDPOINT}>
                {HEALTH_ENDPOINT}
              </a>
              <p className="mt-4 text-sm leading-7 text-white/72">
                Local development endpoint:
              </p>
              <code className="mt-2 inline-block rounded-full bg-white/8 px-3 py-2 text-sm text-white/92">{LOCAL_ENDPOINT}</code>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[28px] border border-[#16202a]/10 bg-white p-7 shadow-[0_20px_50px_rgba(16,32,42,0.06)]">
            <h2 className="font-['DM_Sans'] text-2xl font-semibold text-[#13222d]">What you can do with it</h2>
            <ul className="mt-5 space-y-3 text-[15px] leading-7 text-[#16202a]/76">
              <li>Ask for tourism performance by quarter and island.</li>
              <li>Pull Maio indicators like seasonality, pressure, and retention proxies.</li>
              <li>Query Maio core metrics with filters and bounded result sizes.</li>
              <li>Use the same hosted endpoint across multiple MCP-compatible clients.</li>
            </ul>
          </div>

          <div className="rounded-[28px] border border-[#16202a]/10 bg-[#fff9f0] p-7 shadow-[0_20px_50px_rgba(16,32,42,0.05)]">
            <h2 className="font-['DM_Sans'] text-2xl font-semibold text-[#13222d]">Before you connect</h2>
            <ol className="mt-5 space-y-3 text-[15px] leading-7 text-[#16202a]/76">
              <li>Use the hosted production URL unless you explicitly want local development.</li>
              <li>Prefer clients that support Streamable HTTP MCP directly.</li>
              <li>If a desktop client only supports command-based MCP, use `mcp-remote` as the bridge.</li>
              <li>After connecting, ask the client to list tools or try a simple tourism overview question.</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16 sm:px-8 lg:px-10">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#13786b]">Client setup</p>
            <h2 className="mt-3 font-['DM_Sans'] text-3xl font-semibold tracking-[-0.03em] text-[#13222d]">
              Add MaioAzul to your chatbot or IDE
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[#16202a]/64">
            The examples below follow the same configuration pattern used by public MCP guides, adapted for the
            MaioAzul production endpoint.
          </p>
        </div>

        <div className="mt-8 grid gap-6">
          {clients.map((client) => (
            <article
              key={client.name}
              className="grid gap-5 rounded-[30px] border border-[#16202a]/10 bg-white p-6 shadow-[0_18px_48px_rgba(16,32,42,0.06)] lg:grid-cols-[0.52fr_0.48fr]"
            >
              <div>
                <h3 className="font-['DM_Sans'] text-2xl font-semibold text-[#13222d]">{client.name}</h3>
                <p className="mt-2 text-sm leading-7 text-[#16202a]/68">{client.note}</p>
                <ol className="mt-5 space-y-3 text-[15px] leading-7 text-[#16202a]/78">
                  {client.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
              <CodeBlock code={client.code} />
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-[#16202a]/10 bg-[#13222d] text-[#eff8f6]">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:px-8 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8fd7ca]">Local testing</p>
              <h2 className="mt-3 font-['DM_Sans'] text-3xl font-semibold tracking-[-0.03em] text-white">
                Run it against localhost
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/72">
                If you are developing locally, run the Next app and swap the production URL for the local endpoint below.
              </p>
            </div>
            <CodeBlock
              code={`npm run dev

# local MCP endpoint
${LOCAL_ENDPOINT}

# local health
http://127.0.0.1:3000/api/mcp/health`}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
