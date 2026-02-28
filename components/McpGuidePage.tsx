"use client";

import { useState } from "react";

const PROD_ENDPOINT = "https://www.maioazul.com/api/mcp";

const clients = [
  {
    name: "ChatGPT",
    href: "https://chatgpt.com",
    note: "Disponível em planos pagos com suporte a conectores.",
    steps: [
      "Abra o ChatGPT no navegador e entre em Definições.",
      "Abra Apps e conectores e ative o modo de programador, se necessário.",
      "Adicione um novo conector personalizado com o URL MCP abaixo.",
    ],
    code: PROD_ENDPOINT,
  },
//   {
//     name: "Claude Desktop",
//     href: "https://claude.ai/download",
//     note: "Use uma ponte MCP remota no ficheiro de configuração do Claude Desktop.",
//     steps: [
//       "Abra o ficheiro de configuração do Claude Desktop.",
//       "Adicione um novo servidor dentro de mcpServers.",
//       "Reinicie o Claude Desktop depois de guardar.",
//     ],
//     code: `{
//   "mcpServers": {
//     "maioazul": {
//       "command": "npx",
//       "args": ["mcp-remote", "${PROD_ENDPOINT}"]
//     }
//   }
// }`,
//   },
  {
    name: "Claude Code",
    href: "https://docs.anthropic.com/en/docs/claude-code",
    note: "Registo direto por HTTP a partir do terminal.",
    steps: [
      "Abra o terminal.",
      "Execute o comando abaixo uma vez.",
      "O Claude Code vai manter o servidor registado para sessões futuras.",
    ],
    code: `claude mcp add --transport http maioazul ${PROD_ENDPOINT}`,
  },
//   {
//     name: "Gemini CLI",
//     note: "Adicione o servidor MCP ao ficheiro settings.json.",
//     steps: [
//       "Abra ~/.gemini/settings.json.",
//       "Adicione a entrada mcpServers abaixo.",
//       "Reinicie o Gemini CLI.",
//     ],
//     code: `{
//   "mcpServers": {
//     "maioazul": {
//       "httpUrl": "${PROD_ENDPOINT}"
//     }
//   }
// }`,
//   },
  {
    name: "Cursor",
    href: "https://www.cursor.com",
    note: "O Cursor permite servidores MCP nas Definições.",
    steps: [
      "Abra as Definições do Cursor.",
      "Procure por MCP ou Model Context Protocol.",
      "Adicione um novo servidor MCP com a configuração abaixo.",
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
//   {
//     name: "VS Code",
//     note: "Use uma entrada MCP HTTP no settings.json.",
//     steps: [
//       "Abra o ficheiro Settings JSON.",
//       "Adicione a definição do servidor abaixo.",
//       "Recarregue o editor se necessário.",
//     ],
//     code: `{
//   "servers": {
//     "maioazul": {
//       "url": "${PROD_ENDPOINT}",
//       "type": "http"
//     }
//   }
// }`,
//   },
//   {
//     name: "Windsurf",
//     note: "Use a configuração com ponte MCP remota.",
//     steps: [
//       "Abra ~/.codeium/mcp_config.json.",
//       "Adicione a entrada MCP abaixo.",
//       "Reinicie o Windsurf.",
//     ],
//     code: `{
//   "mcpServers": {
//     "maioazul": {
//       "command": "npx",
//       "args": ["-y", "mcp-remote", "${PROD_ENDPOINT}"]
//     }
//   }
// }`,
//   },
//   {
//     name: "AnythingLLM",
//     note: "Use uma definição MCP streamable.",
//     steps: [
//       "Abra anythingllm_mcp_servers.json na pasta de armazenamento da aplicação.",
//       "Adicione a configuração abaixo.",
//       "Reinicie o AnythingLLM.",
//     ],
//     code: `{
//   "mcpServers": {
//     "maioazul": {
//       "type": "streamable",
//       "url": "${PROD_ENDPOINT}"
//     }
//   }
// }`,
//   },
];

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[12px] bg-[#111111]">
      <pre className="overflow-x-auto px-5 py-4 pb-16 font-mono text-xs leading-4 text-white">
        <code>{code}</code>
      </pre>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#111111] to-transparent" />
      <div className="absolute bottom-4 right-4">
        <button
          className="rounded-sm border border-white/14 bg-white/8 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/14"
          onClick={copyCode}
          type="button"
        >
          {copied ? "copiado" : "copiar"}
        </button>
      </div>
    </div>
  );
}

export default function McpGuidePage() {
  const [copied, setCopied] = useState(false);

  async function copyEndpoint() {
    try {
      await navigator.clipboard.writeText(PROD_ENDPOINT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="bg-white text-[#111111]">
      <header className="border-b border-[rgba(17,17,17,0.08)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-7 py-6">
          <img alt="Maioazul" className="h-[18px] w-auto" src="/maioazul.png" />
          <nav className="flex items-center gap-6 text-sm font-semibold text-[#000]">
            <a className="transition hover:text-[#111111]" href="/dashboard">
              Portal de Dados
            </a>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden pb-20 pt-14">
        <div className="absolute inset-0 bg-gradient-to-b from-[#f9f9f2] via-white to-[#10069F]/10" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-7 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="max-w-3xl">
            <h1 className="pt-4 text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.08]">
              Maioazul MCP
            </h1>
            <p className="mt-6 max-w-2xl text-[15px] leading-7 text-[rgba(17,17,17,0.7)]">
              O Maioazul tem um endpoint MCP público de leitura para dashboards de turismo e dados entre
              ilhas encontradas no Portal de Dados. Use o URL de produção em ChatGPT, Claude, Cursor, Gemini e outros clientes compatíveis com MCP.
            </p>
          </div>

          <div className="rounded-[24px] border border-[rgba(17,17,17,0.08)] bg-white p-6 shadow-[0_18px_40px_rgba(0,0,0,0.04)]">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#10069F]">MCP Link</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <a
                className="block break-all text-md font-semibold text-[#111111] underline underline-offset-4"
                href={PROD_ENDPOINT}
              >
                {PROD_ENDPOINT}
              </a>
              <button
                className="rounded-sm border border-[rgba(17,17,17,0.12)] px-3 py-1.5 text-sm font-medium text-[#111111] transition hover:bg-[#111111]/[0.03]"
                onClick={copyEndpoint}
                type="button"
              >
                {copied ? "copiado" : "copiar"}
              </button>
            </div>
            <p className="mt-4 text-[13px] leading-6 text-[#111111]/68">
              Não é necessária chave API neste momento. As ferramentas atuais são apenas de leitura e focadas nos
              dados de turismo do Maio e no dashboard.
            </p>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto w-full max-w-6xl px-7">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#10069F]">instruções</p>
            <h2 className="mt-3 text-[1.55rem] tracking-[-0.02em] sm:text-[1.8rem]">
              Adicionar Maioazul ao seu cliente
            </h2>
            <p className="mt-1 text-[13px] leading-6 text-[#111111]/68">
              Os exemplos abaixo seguem o mesmo padrão geral usado em guias MCP públicos, adaptado para o endpoint
              alojado do Maioazul.
            </p>
          </div>

          <div className="mt-8 grid gap-4">
            {clients.map((client) => (
              <article
                key={client.name}
                className="grid gap-6 rounded-[12px] border border-[rgba(17,17,17,0.08)] bg-white p-6 lg:grid-cols-[0.5fr_0.5fr]"
              >
                <div>
                  <h3 className="text-[1.2rem] tracking-[-0.02em]">
                    <a
                      className="underline transition hover:text-[#10069F]"
                      href={client.href}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {client.name}
                    </a>
                  </h3>
                  <p className="mt-2 text-[13px] leading-6 text-[#111111]/66">{client.note}</p>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[13px] leading-4 text-[#111111]/74 marker:text-[#111111]/55">
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
          <pre className="flex w-full justify-center overflow-x-auto whitespace-pre font-mono text-[12px] leading-none text-[#111111]/72 sm:text-[14px]">
            {`░▒▓█  M A I O A Z U L  █▓▒░`}
          </pre>
        </div>
      </footer>
    </div>
  );
}
