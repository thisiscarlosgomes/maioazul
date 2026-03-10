"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  MessageCircle,
  SendHorizontal,
  RotateCcw,
  X,
  ChevronRight,
  Thermometer,
  Droplets,
  CloudRain,
  CloudSun,
  Waves,
  Wind,
  Timer,
} from "lucide-react";
import { useGuideChat, type GuideChatContext } from "@/lib/hooks/useGuideChat";
import ChatMarkdownContent from "@/components/chat/ChatMarkdownContent";
import Link from "next/link";
import Image from "next/image";
import { useLang } from "@/lib/lang";

type GuideChatWidgetProps = {
  context?: GuideChatContext;
  welcomeMessage?: string;
};

function formatMessageTime(iso: string, lang: "pt" | "en") {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return lang === "pt" ? "agora" : "now";
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

function ThinkingLoader() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-2 w-2 rounded-full bg-[#111111]/68 animate-pulse"
          style={{ animationDelay: `${index * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function weatherLabelFromCode(code: number | undefined, lang: "pt" | "en") {
  if (code === undefined) return lang === "pt" ? "Tempo" : "Weather";
  if (code === 0) return lang === "pt" ? "Limpo" : "Clear";
  if ([1, 2].includes(code)) return lang === "pt" ? "Parcialmente nublado" : "Partly cloudy";
  if (code === 3) return lang === "pt" ? "Nublado" : "Cloudy";
  if ([45, 48].includes(code)) return lang === "pt" ? "Nevoeiro" : "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return lang === "pt" ? "Chuvisco" : "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return lang === "pt" ? "Chuva" : "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return lang === "pt" ? "Neve" : "Snow";
  if ([95, 96, 99].includes(code)) return lang === "pt" ? "Trovoada" : "Thunder";
  return lang === "pt" ? "Tempo" : "Weather";
}

export default function GuideChatWidget({ context, welcomeMessage }: GuideChatWidgetProps) {
  const [lang] = useLang();
  const { messages, input, setInput, loading, error, submitMessage, resetChat } = useGuideChat({
    context,
    welcomeMessage,
  });

  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const hasBottomNav =
    context?.surface === "map" ||
    context?.surface === "places" ||
    context?.surface === "experiences" ||
    context?.surface === "favorites";

  const copy = useMemo(
    () => ({
      pt: {
        assistant: "Assistente",
        closeOverlay: "Fechar chat",
        promptPlaceholder: "Faça uma pergunta...",
        enterToSend: "enter para enviar",
        openAssistant: "Abrir assistente",
        chat: "Chat",
        weather: "Tempo",
        temp: "Temp",
        humidity: "Humidade",
        rain: "Chuva",
        updated: "Atualizado",
        surf: "Surf",
        outlook: "Condições",
      },
      en: {
        assistant: "Assistant",
        closeOverlay: "Close chat",
        promptPlaceholder: "Ask a question...",
        enterToSend: "enter to send",
        openAssistant: "Open assistant",
        chat: "Chat",
        weather: "Weather",
        temp: "Temp",
        humidity: "Humidity",
        rain: "Rain",
        updated: "Updated",
        surf: "Surf",
        outlook: "Outlook",
      },
    }),
    []
  );

  const quickPrompts = useMemo(
    () => {
      const pt = lang === "pt";
      switch (context?.surface) {
        case "map":
          return [
            pt ? "Quais zonas devo explorar hoje no mapa?" : "Which map areas should I explore today?",
            pt ? "Mostra praias com mar mais calmo." : "Show beaches with calmer sea.",
            pt ? "Como está o vento e o surf agora?" : "How are wind and surf right now?",
            pt ? "Onde vale a pena ir ao fim da tarde?" : "Where is best to go late afternoon?",
          ];
        case "places":
          return [
            pt ? "Sugere 5 lugares para primeira visita no Maio." : "Suggest 5 places for a first visit in Maio.",
            pt ? "Quero natureza e trilhos leves, o que recomendas?" : "I want nature and easy trails, what do you recommend?",
            pt ? "Mostra lugares bons para famílias." : "Show places that are good for families.",
            pt ? "Quais lugares têm mais contexto histórico?" : "Which places have more historical context?",
          ];
        case "experiences":
          return [
            pt ? "Que experiências recomendas para 2 dias?" : "What experiences do you recommend for 2 days?",
            pt ? "Organiza um plano calmo para hoje." : "Create a relaxed plan for today.",
            pt ? "Quais atividades dependem do vento/surf?" : "Which activities depend on wind/surf?",
            pt ? "Que experiências são melhores de manhã cedo?" : "Which experiences are best early in the morning?",
          ];
        case "favorites":
          return [
            pt ? "Ajuda-me a montar um roteiro com os meus favoritos." : "Help me build an itinerary with my favorites.",
            pt ? "Como combinar favoritos por proximidade?" : "How can I combine favorites by proximity?",
            pt ? "Que favorito combina com um dia de vento forte?" : "Which favorite fits a windy day?",
            pt ? "Sugere ordem de visita para meio dia." : "Suggest a visit order for half a day.",
          ];
        case "mcp-guide":
          return [
            pt ? "Como ligar este MCP no ChatGPT?" : "How do I connect this MCP in ChatGPT?",
            pt ? "Dá-me exemplo de prompt usando dados de clima." : "Give me a prompt example using weather data.",
            pt ? "Mostra um exemplo para horários de barco/voo." : "Show an example for ferry/flight schedules.",
            pt ? "Como testar se o endpoint MCP está ativo?" : "How can I test if the MCP endpoint is active?",
          ];
        default:
          return [
            pt ? "O que devo fazer hoje no Maio?" : "What should I do in Maio today?",
            pt ? "Mostra praias com água mais calma." : "Show beaches with calmer water.",
            pt ? "Como está o tempo e o vento agora?" : "How are weather and wind right now?",
            pt ? "Há barcos ou voos esta semana?" : "Are there ferries or flights this week?",
          ];
      }
    },
    [context?.surface, lang],
  );

  useEffect(() => {
    if (!open) return;
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, loading, open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMessage(input);
  }

  async function handleQuickPrompt(prompt: string) {
    if (!open) setOpen(true);
    await submitMessage(prompt);
  }

  async function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    await submitMessage(input);
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[95]">
      {open ? (
        <>
          <button
            aria-label={copy[lang].closeOverlay}
            className="pointer-events-auto fixed inset-0 bg-[#111111]/12 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            type="button"
          />

          <section className="pointer-events-auto fixed bottom-0 right-0 flex h-[88dvh] w-full max-w-none flex-col rounded-t-[24px] border border-[rgba(17,17,17,0.08)] bg-white text-[#111111] shadow-[0_32px_90px_rgba(0,0,0,0.18)] sm:bottom-6 sm:right-6 sm:h-[min(78vh,720px)] sm:w-[min(92vw,420px)] sm:rounded-[28px] sm:border">
            <header className="flex items-center justify-between border-b border-[rgba(17,17,17,0.08)] px-4 py-4 sm:px-5">
              <div>
                <p className="text-base font-semibold">Maioazul AI</p>
                <p className="text-sm text-[#111111]/52">{copy[lang].assistant}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#111111]/64 transition hover:bg-[#111111]/6 hover:text-[#111111]"
                  onClick={resetChat}
                  type="button"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#111111]/64 transition hover:bg-[#111111]/6 hover:text-[#111111]"
                  onClick={() => setOpen(false)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
              {!loading && messages.length === 1 ? (
                <div className="grid gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      className="rounded-[16px] border border-[rgba(17,17,17,0.08)] bg-[#f8f8f5] px-4 py-3 text-left text-sm text-[#111111]/84 transition hover:bg-[#f1f1ec]"
                      onClick={() => handleQuickPrompt(prompt)}
                      type="button"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              ) : null}

              {messages.map((message) => (
                <div key={message.id} className={message.role === "user" ? "flex flex-col items-end" : "flex flex-col items-start"}>
                  <div className={message.role === "user" ? "max-w-[85%] rounded-[22px] bg-[#1E78FF] px-4 py-3 text-sm leading-6 text-white" : "max-w-[88%] rounded-[22px] border border-[rgba(17,17,17,0.06)] bg-[#f3f3ef] px-4 py-3 text-sm leading-6 text-[#111111]"}>
                    {message.role === "user" ? (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <ChatMarkdownContent content={message.content} />
                    )}
                    {message.id !== "welcome" ? (
                      <p className={message.role === "user" ? "mt-1 text-right text-[12px] text-white/80" : "mt-1 text-[12px] text-[#111111]/46"}>
                        {formatMessageTime(message.createdAt, lang)}
                      </p>
                    ) : null}
                  </div>

                  {message.role === "assistant" && Array.isArray(message.toolEvents) ? (
                    <div className="mt-2 grid w-full max-w-[88%] gap-2">
                      {message.toolEvents
                        .map((event) => event.weatherCard)
                        .filter((card): card is NonNullable<typeof card> => Boolean(card))
                        .slice(0, 1)
                        .map((card) => (
                          <div
                            key={`${message.id}-weather`}
                            className="rounded-2xl border border-[rgba(17,17,17,0.08)] bg-white p-3"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-[#111111]">
                                {card.location} {copy[lang].weather}
                              </p>
                              <span className="inline-flex items-center gap-1 text-xs text-[#111111]/62">
                                <CloudSun className="h-3.5 w-3.5" />
                                {weatherLabelFromCode(card.weatherCode, lang)}
                              </span>
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                              <div className="rounded-xl bg-[#f6f6f3] px-2 py-2 text-xs text-[#111111]/76">
                                <span className="inline-flex items-center gap-1">
                                  <Thermometer className="h-3.5 w-3.5" /> {copy[lang].temp}
                                </span>
                                <p className="mt-1 text-sm font-semibold text-[#111111]">
                                  {card.temperature !== undefined ? `${card.temperature.toFixed(1)}°C` : "—"}
                                </p>
                              </div>
                              <div className="rounded-xl bg-[#f6f6f3] px-2 py-2 text-xs text-[#111111]/76">
                                <span className="inline-flex items-center gap-1">
                                  <Droplets className="h-3.5 w-3.5" /> {copy[lang].humidity}
                                </span>
                                <p className="mt-1 text-sm font-semibold text-[#111111]">
                                  {card.humidity !== undefined ? `${Math.round(card.humidity)}%` : "—"}
                                </p>
                              </div>
                              <div className="rounded-xl bg-[#f6f6f3] px-2 py-2 text-xs text-[#111111]/76">
                                <span className="inline-flex items-center gap-1">
                                  <CloudRain className="h-3.5 w-3.5" /> {copy[lang].rain}
                                </span>
                                <p className="mt-1 text-sm font-semibold text-[#111111]">
                                  {card.precipitation !== undefined ? `${card.precipitation.toFixed(1)} mm` : "—"}
                                </p>
                              </div>
                            </div>
                            {card.updatedAt ? (
                              <p className="mt-2 text-[11px] text-[#111111]/46">
                                {copy[lang].updated}: {new Date(card.updatedAt).toLocaleString()}
                              </p>
                            ) : null}
                          </div>
                        ))}

                      {message.toolEvents
                        .map((event) => event.surfCard)
                        .filter((card): card is NonNullable<typeof card> => Boolean(card))
                        .slice(0, 1)
                        .map((card) => (
                          <div
                            key={`${message.id}-surf`}
                            className="rounded-2xl border border-[rgba(17,17,17,0.08)] bg-white p-3"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-[#111111]">
                                {card.location} {copy[lang].surf}
                              </p>
                              <span className="inline-flex items-center gap-1 text-xs text-[#111111]/62">
                                <Waves className="h-3.5 w-3.5" />
                                {copy[lang].outlook}
                              </span>
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                              {card.points.map((point) => (
                                <div
                                  key={`${message.id}-surf-${point.label}`}
                                  className="rounded-xl bg-[#f6f6f3] px-2 py-2 text-xs text-[#111111]/76"
                                >
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#111111]/62">
                                    {point.label}
                                  </p>
                                  <p className="mt-1 inline-flex items-center gap-1 text-[#111111]">
                                    <Waves className="h-3.5 w-3.5" />
                                    {point.surfMinM !== undefined && point.surfMaxM !== undefined
                                      ? `${point.surfMinM.toFixed(1)}-${point.surfMaxM.toFixed(1)}m`
                                      : "—"}
                                  </p>
                                  <p className="mt-0.5 inline-flex items-center gap-1 text-[#111111]">
                                    <Wind className="h-3.5 w-3.5" />
                                    {point.windKph !== undefined ? `${Math.round(point.windKph)} kph` : "—"}
                                  </p>
                                  <p className="mt-0.5 inline-flex items-center gap-1 text-[#111111]">
                                    <Timer className="h-3.5 w-3.5" />
                                    {point.swellPeriodS !== undefined
                                      ? `${Math.round(point.swellPeriodS)}s`
                                      : "—"}
                                  </p>
                                </div>
                              ))}
                            </div>
                            {card.updatedAt ? (
                              <p className="mt-2 text-[11px] text-[#111111]/46">
                                Updated: {new Date(card.updatedAt).toLocaleString()}
                              </p>
                            ) : null}
                          </div>
                        ))}

                      {message.toolEvents
                        .flatMap((event) => (Array.isArray(event.placeCards) ? event.placeCards : []))
                        .slice(0, 6)
                        .map((card) => (
                          <Link
                            key={`${message.id}-${card.id}`}
                            href={`/places/${card.id}`}
                            className="grid grid-cols-[56px_1fr_34px] items-center gap-3 overflow-hidden rounded-2xl border border-[rgba(17,17,17,0.08)] bg-white p-2.5 transition hover:bg-[#f7f7f4]"
                          >
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#ecece8]">
                              {card.imageUrl ? (
                                <Image
                                  src={card.imageUrl}
                                  alt={card.name}
                                  width={56}
                                  height={56}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                  unoptimized
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-sm font-semibold leading-5 text-[#111111]">{card.name}</p>
                              {card.location ? (
                                <p className="truncate text-xs text-[#111111]/58">{card.location}</p>
                              ) : null}
                            </div>
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(17,17,17,0.12)] text-[#111111]/74">
                              <ChevronRight className="h-4 w-4" />
                            </span>
                          </Link>
                        ))}
                    </div>
                  ) : null}
                </div>
              ))}

              {loading ? (
                <div className="flex justify-start">
                  <div className="rounded-[22px] bg-[#f3f3ef] px-4 py-3 text-sm text-[#111111]/72">
                    <ThinkingLoader />
                  </div>
                </div>
              ) : null}
            </div>

            <form className="border-t border-[rgba(17,17,17,0.08)] p-4 sm:p-4" onSubmit={handleSubmit}>
              <div className="rounded-[24px] border border-[rgba(17,17,17,0.08)] bg-white px-3 py-2">
                <textarea
                  className="min-h-[56px] w-full resize-none bg-transparent px-1 py-1 text-sm text-[#111111] outline-none placeholder:text-[#111111]/40"
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder={copy[lang].promptPlaceholder}
                  value={input}
                />
                <div className="flex items-center justify-between gap-2 px-1 pb-1">
                  <p className="text-xs text-[#111111]/52">{copy[lang].enterToSend}</p>
                  <button
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1E78FF] text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={loading || !input.trim()}
                    type="submit"
                  >
                    <SendHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
              <p className="hidden mt-2 text-center text-xs text-[#111111]/46">
                {lang === "pt" ? "Desenvolvido por Maioazul MCP" : "Powered by Maioazul MCP"}
              </p>
            </form>
          </section>
        </>
      ) : null}

      {!open ? (
        <button
          aria-label={copy[lang].openAssistant}
          className="pointer-events-auto fixed right-4 inline-flex h-12 items-center gap-2 rounded-full bg-black px-4 text-sm font-medium text-white shadow-lg transition hover:bg-black/90 sm:bottom-6 sm:right-6"
          style={{
            bottom: hasBottomNav
              ? "calc(6.25rem + env(safe-area-inset-bottom))"
              : "calc(1rem + env(safe-area-inset-bottom))",
          }}
          onClick={() => setOpen(true)}
          type="button"
        >
         <MessageCircle className="h-4 w-4" />
         {copy[lang].chat}
        </button>
      ) : null}
    </div>
  );
}
