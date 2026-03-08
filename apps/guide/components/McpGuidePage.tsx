"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

type Example = {
  name: string;
  note: string;
  code: string;
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Ignore clipboard errors.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition hover:bg-accent"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function McpGuidePage() {
  const endpoint = useMemo(() => {
    if (typeof window === "undefined") return "https://www.visit-maio.com/api/mcp";
    return `${window.location.origin}/api/mcp`;
  }, []);

  const examples: Example[] = [
    {
      name: "ChatGPT (Custom Connector)",
      note: "Create a custom MCP connector and use the streamable HTTP endpoint:",
      code: endpoint,
    },
    {
      name: "Claude CLI",
      note: "Add this MCP server with HTTP transport:",
      code: `claude mcp add --transport http visit-maio ${endpoint}`,
    },
    {
      name: "Cursor",
      note: "Add this in MCP settings JSON:",
      code: `{
  "mcpServers": {
    "visit-maio": {
      "url": "${endpoint}"
    }
  }
}`,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-14 pt-8 sm:px-6">
      <header className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          MCP Guide
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Connect Visit Maio MCP</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Use this endpoint to connect compatible AI clients to Visit Maio data tools (places,
          weather, surf, transport schedules, and tourism metrics).
        </p>

        <div className="mt-4 rounded-xl border border-border bg-background p-3">
          <div className="flex items-center justify-between gap-3">
            <code className="overflow-x-auto text-xs text-foreground sm:text-sm">{endpoint}</code>
            <CopyButton value={endpoint} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Health:</span>
          <a
            href="/api/mcp/health"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-foreground hover:bg-accent"
          >
            /api/mcp/health
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      <section className="mt-6 space-y-4">
        {examples.map((example) => (
          <article key={example.name} className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">{example.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{example.note}</p>
            <div className="mt-3 rounded-xl border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-foreground sm:text-sm">
                  {example.code}
                </pre>
                <CopyButton value={example.code} />
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
