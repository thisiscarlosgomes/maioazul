"use client";

import { FormEvent } from "react";
import { useSiteChat } from "@/lib/hooks/useSiteChat";

const STARTER_PROMPTS = [
  "Como está o turismo no Maio em 2025?",
  "Compare os indicadores de turismo do Maio e do Sal em 2025.",
  "Mostra-me as principais métricas centrais do Maio.",
];

export default function SiteChatPage() {
  const { messages, input, setInput, loading, error, submitMessage } = useSiteChat();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMessage(input);
  }

  return (
    <div className="bg-white text-[#111111]">
      <section className="border-b border-[rgba(17,17,17,0.08)]">
        <div className="mx-auto max-w-6xl px-7 py-12">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#10069F]">
            Maioazul Chat
          </p>
          <h1 className="mt-4 max-w-3xl text-[clamp(2rem,4vw,3.4rem)] leading-[1.04]">
            chat de dados para o maio
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#111111]/68">
            Este chat do site usa ferramentas nativas do Maioazul no servidor para consultar visão geral do turismo,
            indicadores, trimestres e métricas centrais. O MCP continua disponível para clientes externos, mas o chat
            do site usa a mesma lógica diretamente.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-7 py-10 lg:grid-cols-[0.34fr_0.66fr]">
        <aside className="space-y-6">
          <div className="rounded-[24px] border border-[rgba(17,17,17,0.08)] bg-white p-6">
            <h2 className="text-[1.25rem]">Experimente perguntar</h2>
            <div className="mt-5 flex flex-col gap-3">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  className="rounded-[18px] border border-[rgba(17,17,17,0.08)] px-4 py-3 text-left text-sm transition hover:border-[#111111]/20 hover:bg-[#111111]/[0.02]"
                  onClick={() => submitMessage(prompt)}
                  type="button"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-[rgba(17,17,17,0.08)] bg-[#f8f8f5] p-6">
            <h2 className="text-[1.25rem]">Como funciona</h2>
            <ul className="mt-5 list-disc space-y-3 pl-5 text-[14px] leading-6 text-[#111111]/72">
              <li>O modelo corre no servidor, não no navegador.</li>
              <li>Quando precisa de dados, o chat chama ferramentas nativas do Maioazul.</li>
              <li>Essas ferramentas usam a mesma lógica base do servidor MCP público.</li>
            </ul>
          </div>
        </aside>

        <div className="rounded-[28px] border border-[rgba(17,17,17,0.08)] bg-white">
          <div className="max-h-[62vh] space-y-5 overflow-y-auto px-6 py-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "ml-auto max-w-[85%] rounded-[22px] bg-[#111111] px-5 py-4 text-sm leading-7 text-white"
                    : "max-w-[90%] rounded-[22px] bg-[#f5f5f1] px-5 py-4 text-sm leading-7 text-[#111111]"
                }
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.toolEvents && message.toolEvents.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {message.toolEvents.map((event, index) => (
                      <span
                        key={`${event.name}-${index}`}
                        className="rounded-full border border-[rgba(17,17,17,0.08)] bg-white px-3 py-1 text-[11px] uppercase tracking-[0.06em] text-[#111111]/72"
                      >
                        {event.ok ? "tool" : "tool error"}: {event.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {loading ? (
              <div className="max-w-[90%] rounded-[22px] bg-[#f5f5f1] px-5 py-4 text-sm text-[#111111]/62">
                a pensar...
              </div>
            ) : null}
          </div>

          <form className="border-t border-[rgba(17,17,17,0.08)] px-6 py-5" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="chat-input">
              Faça uma pergunta
            </label>
            <textarea
              id="chat-input"
              className="min-h-[110px] w-full resize-y rounded-[20px] border border-[rgba(17,17,17,0.08)] px-4 py-3 text-sm outline-none transition focus:border-[#111111]/22"
              onChange={(event) => setInput(event.target.value)}
              placeholder="Pergunte sobre turismo no Maio, indicadores ou métricas do dashboard..."
              value={input}
            />
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-[13px] text-[#111111]/56">
                Chat no servidor com ferramentas nativas de dados do Maioazul.
              </p>
              <button
                className="rounded-full bg-[#111111] px-5 py-2.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading || input.trim().length === 0}
                type="submit"
              >
                enviar
              </button>
            </div>
            {error ? <p className="mt-3 text-sm text-[#b42318]">{error}</p> : null}
          </form>
        </div>
      </section>
    </div>
  );
}
