const PROD_ENDPOINT = "https://www.maioazul.com/api/mcp";
const clients = [
  {
    name: "ChatGPT",
    note: "Available on paid plans that support connectors.",
    steps: [
      "Open ChatGPT in your browser and go to Settings.",
      "Open Apps and connectors, then enable Developer mode if required.",
      "Add a new custom connector and use the hosted MCP URL below.",
    ],
    code: PROD_ENDPOINT,
  },
  {
    name: "Claude Desktop",
    note: "Use a remote MCP bridge command in the Claude Desktop config file.",
    steps: [
      "Open your Claude Desktop config file.",
      "Add a new server under mcpServers.",
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
      "Claude Code will keep the server registered for future sessions.",
    ],
    code: `claude mcp add --transport http maioazul ${PROD_ENDPOINT}`,
  },
  {
    name: "Gemini CLI",
    note: "Add the MCP server to your settings.json file.",
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
    note: "Cursor supports MCP servers in Settings.",
    steps: [
      "Open Cursor Settings.",
      "Search for MCP or Model Context Protocol.",
      "Add a new MCP server with the config below.",
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
    note: "Use an HTTP MCP entry in settings.json.",
    steps: [
      "Open Settings JSON.",
      "Add the server definition below.",
      "Reload the editor if needed.",
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
    note: "Use the remote bridge configuration.",
    steps: [
      "Open ~/.codeium/mcp_config.json.",
      "Add the MCP entry below.",
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
    note: "Use a streamable MCP server definition.",
    steps: [
      "Open anythingllm_mcp_servers.json in your desktop storage folder.",
      "Add the configuration below.",
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
    <pre className="overflow-x-auto rounded-[22px] bg-[#111111] px-5 py-4 font-mono text-sm leading-6 text-white">
      <code>{code}</code>
    </pre>
  );
}

export default function McpGuidePage() {
  return (
    <div className="bg-white text-[#111111]">
      <header className="border-b border-[rgba(17,17,17,0.08)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-7 py-6">
          <img className="h-[18px] w-auto" src="/maioazul.png" alt="Maioazul" />
          <nav className="flex items-center gap-6 text-sm font-semibold text-[#111111]/75">
            <a className="transition hover:text-[#111111]" href={PROD_ENDPOINT}>
              MCP endpoint
            </a>
            <a className="transition hover:text-[#111111]" href="/dashboard">
              data
            </a>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden pb-12 pt-14">
        <div className="absolute inset-0 bg-gradient-to-b from-[#f9f9f2] via-white to-[#10069F]/10" />
        <div className="relative mx-auto w-full max-w-6xl px-7">
          <div className="max-w-3xl">
            <h1 className="pt-4 text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.08]">
              Maioazul data MCP Server
            </h1>
            <p className="mt-4 max-w-2xl pt-4 text-[15px] leading-7 text-[rgba(17,17,17,0.7)]">
              maioazul has a public read-only mcp endpoint for tourism dashboards and island data. use the production
              url below in chatgpt, claude, cursor, gemini, and other mcp-compatible clients.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <div className="hidden lg:block" />
            <div className="rounded-[24px] border border-[rgba(17,17,17,0.08)] bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#10069F]">Production</p>
              <a
                className="mt-3 block break-all text-lg font-semibold text-[#111111] underline underline-offset-4"
                href={PROD_ENDPOINT}
              >
                {PROD_ENDPOINT}
              </a>
              <p className="mt-4 text-[13px] leading-6 text-[#111111]/68">
                no api key is required right now. the current tools are read-only and focused on maio tourism and
                dashboard data.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[rgba(17,17,17,0.08)] py-14">
        <div className="mx-auto w-full max-w-6xl px-7">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#10069F]">Instructions</p>
            <h2 className="mt-3 text-[1.55rem] tracking-[-0.02em] sm:text-[1.8rem]">Add MaioAzul to your client</h2>
            <p className="mt-4 text-[13px] leading-6 text-[#111111]/68">
              these examples follow the same general setup pattern used by public mcp guides, adapted for the maioazul
              hosted endpoint.
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {clients.map((client) => (
              <article
                key={client.name}
                className="grid gap-6 rounded-[24px] border border-[rgba(17,17,17,0.08)] bg-white p-6 lg:grid-cols-[0.48fr_0.52fr]"
              >
                <div>
                  <h3 className="text-[1.2rem] tracking-[-0.02em]">{client.name}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-[#111111]/66">{client.note}</p>
                  <ul className="mt-5 list-disc space-y-3 pl-5 text-[13px] leading-6 text-[#111111]/74 marker:text-[#111111]/55">
                    {client.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
                <CodeBlock code={client.code} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[rgba(17,17,17,0.08)] py-12">
        <div className="w-full px-7">
          <pre className="flex w-full justify-center overflow-x-auto font-mono text-[11px] leading-4 text-[#111111]/72 sm:text-xs">
{`|\\/|  /\\  |  /  /\\    /\\  _____  |  |  |
|  | /--\\ | /  /--\\  /  \\   |    |  |  |
|  |/    \\|/  /    \\/_/\\_\\  |    \\__/__/`}
          </pre>
        </div>
      </footer>
    </div>
  );
}
