"use client";

import { useState } from "react";

const PROD_ENDPOINT = "https://www.maioazul.com/api/mcp";

const clients = [
  {
    name: "ChatGPT",
    href: "https://chatgpt.com/plugins",
    note: "Consulte os dados do Maio nas suas conversas. A ligação requer uma configuração inicial no ChatGPT.",
    steps: [
      "Copie a ligação e abra o ChatGPT através dos botões acima.",
      "Se necessário, em Definições → Segurança e início de sessão, ative o modo de programador. A disponibilidade depende da sua conta e das permissões da organização.",
      "Na página Plugins, selecione +, dê o nome Maioazul à ligação e cole o endereço no campo de ligação ao servidor MCP. Crie a ligação e reveja as ferramentas.",
      "Numa nova conversa, selecione Maioazul no menu de ferramentas e faça a sua pergunta.",
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
    <div className="relative overflow-hidden rounded-[12px] border border-[rgba(255,255,255,0.1)] bg-[#111111]">
      <div className="flex h-9 items-center border-b border-white/10 bg-[#2f3440] px-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
      </div>
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

export default function McpGuidePage({ tools }: { tools: { name: string; title: string; description: string }[] }) {
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
      <section className="relative overflow-hidden pb-20 pt-14">
        <div className="absolute inset-0 bg-gradient-to-b from-[#f9f9f2] via-white to-[#10069F]/10" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-7 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="max-w-3xl">
            <h1 className="pt-4 text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.08]">
              Maioazul MCP
            </h1>
            <p className="mt-6 max-w-2xl text-[15px] leading-7 text-[rgba(17,17,17,0.7)]">
              O Maioazul disponibiliza dados públicos de turismo, economia, serviços e ambiente, com acesso às coleções e datasets do Maio Open API. Use o URL de produção em ChatGPT, Claude, Cursor, Gemini e outros clientes compatíveis com MCP.
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
              dados de turismo, orçamento, empresas, geografia, transportes, meteorologia e contexto legal do Maio.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-black/10 py-12">
        <div className="mx-auto max-w-6xl px-7">
          <h2 className="text-2xl">Ferramentas disponíveis ({tools.length})</h2>
          <p className="mt-3 text-sm text-black/70">Esta lista é gerada pelo mesmo registo utilizado pelo servidor MCP. Use tools/list para consultar os parâmetros.</p>
          <p className="mt-3 text-sm text-black/70">As coleções e os datasets são consultados diretamente em <a className="underline" href="https://api.maio.cv">api.maio.cv</a>, preservando fontes, unidades, paginação e valores em falta. As estatísticas empresariais estão em business-demography; empresas individuais mapeadas estão em businesses.</p>
          <div className="mt-6 rounded-xl bg-blue-50 p-5 text-sm leading-6">
            <strong>Qualidade e atualidade</strong>
            <p>Barcos: apenas viagens publicadas para o dia selecionado na fonte. Sem horários semanais inventados. Voos: horários de terceiros com datas de validade; registos expirados ou sem validade são excluídos. Resultados vazios não significam ausência de serviço. Confirme sempre com o operador.</p>
            <p>retrievedAt indica a consulta à fonte; sourceUpdatedAt e updated_at ficam nulos quando a data de publicação é desconhecida. Meteorologia e mar podem ser estimativas de modelos, não medições de sensores locais. Coleções planeadas e dados retirados não são dados atuais disponíveis.</p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {tools.map(tool => <article key={tool.name} className="rounded-xl border border-black/10 p-4">
              <h3 className="font-semibold">{tool.title}</h3>
              <code className="mt-2 block break-all text-xs text-blue-800">{tool.name}</code>
              <p className="mt-2 text-sm leading-6 text-black/70">{tool.description}</p>
            </article>)}
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
            {clients.map((client) => client.name === "ChatGPT" ? (
              <article key={client.name} className="rounded-xl border border-black/10 bg-white p-6">
                <h3 className="text-xl">ChatGPT</h3>
                <p className="mt-2 text-sm leading-6 text-black/65">{client.note}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a href={client.href} target="_blank" rel="noreferrer" className="rounded-lg bg-[#10069F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2319b5]">
                    Abrir no ChatGPT <span aria-hidden="true">↗</span>
                  </a>
                  <button type="button" onClick={copyEndpoint} className="rounded-lg border border-black/15 px-5 py-3 text-sm font-semibold transition hover:bg-black/5">
                    {copied ? "Ligação copiada" : "Copiar ligação"}
                  </button>
                  <span className="sr-only" role="status">{copied ? "Ligação do Maioazul copiada." : ""}</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-black/60">Abre a página de plugins do ChatGPT. Não instala a ligação automaticamente.</p>
                <details className="mt-5 border-t border-black/10 pt-4">
                  <summary className="cursor-pointer text-sm font-semibold">Como ligar</summary>
                  <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-black/75">
                    {client.steps.map(step => <li key={step}>{step}</li>)}
                  </ol>
                  <p className="mt-4 text-xs text-black/60">Ligação para copiar manualmente, se necessário:</p>
                  <p className="mt-2 select-all break-all rounded-lg bg-slate-50 p-3 text-sm">{PROD_ENDPOINT}</p>
                  <a className="mt-4 inline-block text-sm underline" href="https://developers.openai.com/plugins/deploy/connect-chatgpt" target="_blank" rel="noreferrer">Ajuda oficial do ChatGPT ↗</a>
                </details>
              </article>
            ) : (
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
