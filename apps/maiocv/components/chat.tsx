"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { BUSINESS_DATA_URL, businessMetricProgram } from "../lib/business-visual";
import { PLACE_COLLECTIONS, placeDataUrl, placeVisualProgram } from "../lib/place-visual";
import { publicChatAnswer, publicChatGreeting } from "../lib/chat-answer";
import { isPopulationTotalQuestion, populationAnswer, POPULATION_DATA_URL } from "../lib/population-answer";
import { declaredCitations, type Citation } from "../lib/chat-citations";
import { t, type MessageKey } from "../lib/i18n";
import type { Locale } from "../lib/locale";

const OpenUIBusiness = dynamic(() => import("./openui-business").then(module => module.OpenUIBusiness));
const OpenUIPlaces = dynamic(() => import("./openui-places").then(module => module.OpenUIPlaces));

type Message = {
  role: "user" | "assistant";
  content: string;
  visual?: { kind: "business" | "places"; program: string };
  citations?: Citation[];
  uncited?: boolean;
  example?: boolean;
};
export function Chat({ locale = "pt" }: { locale?: Locale }) {
  const copy = (key: MessageKey, values?: Record<string, string | number>) => t(key, values, locale);
  const suggestions = [
    copy("chat.suggest.beaches"),
    copy("chat.suggest.business"),
    copy("chat.suggest.tourism"),
  ];
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scrollPad, setScrollPad] = useState(0);
  const active = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const latestQuestion = useRef<HTMLElement>(null);
  const scrollToQuestion = useRef<number | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => {
    const field = input.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, 150)}px`;
  }, [draft]);
  useLayoutEffect(() => {
    if (scrollToQuestion.current !== null && latestQuestion.current) {
      const question = latestQuestion.current;
      const headerOffset = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const targetScroll = question.getBoundingClientRect().top + window.scrollY - headerOffset;
      const heightWithoutSpacer = document.documentElement.scrollHeight - scrollPad;
      const neededPad = scrollToQuestion.current === 0 ? 0
        : Math.max(0, Math.ceil(targetScroll + window.innerHeight - heightWithoutSpacer));
      if (Math.abs(neededPad - scrollPad) > 2) {
        setScrollPad(neededPad);
        return;
      }
      question.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
      return;
    }
    if (scrollPad) {
      setScrollPad(0);
      return;
    }
    bottom.current?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "end" });
  }, [messages, busy, error, reduced, scrollPad]);

  async function send(question = draft) {
    const text = question.trim();
    if (!text || active.current) return;
    const greeting = publicChatGreeting(text, locale);
    if (greeting) {
      scrollToQuestion.current = messages.length;
      setMessages([...messages, { role: "user", content: text }, { role: "assistant", content: greeting, example: true, uncited: true }]);
      setDraft(""); setError("");
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    scrollToQuestion.current = messages.length;
    const conversation: Message[] = [...messages, { role: "user", content: text }];
    setMessages(conversation); setDraft(""); setError(""); setBusy(true);
    const timeout = window.setTimeout(() => controller.abort(), 60000);
    try {
      if (isPopulationTotalQuestion(text)) {
        const source = await fetch(POPULATION_DATA_URL, { signal: controller.signal });
        if (!source.ok) throw new Error(copy("chat.error.population"));
        const answer = populationAnswer(await source.json(), text);
        if (!answer) throw new Error(copy("chat.error.populationValue"));
        if (active.current === controller)
          setMessages([...conversation, { role: "assistant", content: answer, uncited: true }]);
        return;
      }
      const outbound = conversation.slice(-12).map(({ role, content }) => ({ role, content }));
      const instruction = locale === "fr"
        ? "Reply in French. Keep source titles in their original language."
        : locale === "en"
          ? "Reply in English. Keep source titles in their original language."
          : "";
      if (instruction && outbound.at(-1)?.role === "user") {
        const last = outbound[outbound.length - 1];
        outbound[outbound.length - 1] = { role: last.role, content: last.content + "\n\n" + instruction };
      }
      const response = await fetch("/api/maio-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ messages: outbound, context: { surface: "mcp-guide", lang: locale } }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(response.status === 429
        ? copy("chat.error.busy")
        : copy("chat.error.answer"));
      if (Array.isArray(data.toolEvents) && data.toolEvents.some((event: { ok?: boolean }) => event.ok === false))
        throw new Error(copy("chat.error.source"));
      if (typeof data.message !== "string" || !data.message.trim())
        throw new Error(copy("chat.error.empty"));
      const publicAnswer = publicChatAnswer(data.message, text);
      if (!publicAnswer) throw new Error(copy("chat.error.empty"));
      let visual: Message["visual"];
      const pilotEnabled = new URLSearchParams(window.location.search).get("openui") === "1";
      const usedBusinessData = Array.isArray(data.toolEvents) && data.toolEvents.some(
        (event: { name?: string; arguments?: { datasetId?: string }; ok?: boolean }) =>
          event.name === "get_open_data_dataset" &&
          event.arguments?.datasetId === "business-demography" && event.ok === true,
      );
      if (pilotEnabled && usedBusinessData) {
        try {
          const source = await fetch(BUSINESS_DATA_URL, { signal: controller.signal });
          if (source.ok) {
            const program = businessMetricProgram(await source.json());
            if (program) visual = { kind: "business", program };
          }
        } catch {
        }
      }
      if (pilotEnabled && !visual && Array.isArray(data.toolEvents)) {
        const placeEvent = data.toolEvents.find((event: { name?: string; arguments?: { collectionId?: string }; ok?: boolean }) =>
          event.name === "get_open_data_collection" && event.ok === true &&
          typeof event.arguments?.collectionId === "string" && event.arguments.collectionId in PLACE_COLLECTIONS,
        );
        const collection = placeEvent?.arguments?.collectionId;
        if (collection) {
          try {
            const source = await fetch(placeDataUrl(collection), { signal: controller.signal });
            if (source.ok) {
              const program = placeVisualProgram(await source.json(), publicAnswer, collection);
              if (program) visual = { kind: "places", program };
            }
          } catch {
          }
        }
      }
      if (active.current === controller) {
        const declared = declaredCitations(data);
        setMessages([...conversation, {
          role: "assistant",
          content: publicAnswer,
          visual,
          citations: declared ?? undefined,
          uncited: declared !== null && declared.length === 0,
          example: data.prepared === true,
        }]);
      }
    } catch (cause) {
      if (active.current === controller) {
        scrollToQuestion.current = null;
        setMessages(messages);
        setDraft(text);
        setError(controller.signal.aborted
          ? copy("chat.error.timeout")
          : cause instanceof Error ? cause.message : copy("chat.error.generic"));
      }
    } finally {
      window.clearTimeout(timeout);
      if (active.current === controller) {
        active.current = null; setBusy(false);
        input.current?.focus({ preventScroll: true });
      }
    }
  }

  return (
    <main className="chat-page" id="conteudo">
      <div className={`chat-conversation${!messages.length && !busy ? " chat-conversation-empty" : ""}`}
        style={scrollPad ? { paddingBottom: `${24 + scrollPad}px` } : undefined}>
        {messages.length || busy ? <h1 className="sr-only">{copy("chat.welcome")}</h1> : null}
        {!messages.length && !busy && (
          <div className="chat-welcome">
            <h1>{copy("chat.welcome")}</h1>
            <div className="chat-suggestions">
              {suggestions.map(question => (
                <button key={question} type="button" onClick={() => { setDraft(question); input.current?.focus(); }}>
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}
        <div role="log" aria-label={copy("chat.log")} aria-live="polite" aria-relevant="additions">
          {messages.map((message, index) => (
            <motion.article key={index} ref={message.role === "user" && index === scrollToQuestion.current ? latestQuestion : null}
              className={`chat-message chat-message-${message.role}`}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              {message.visual?.kind === "business" && <OpenUIBusiness program={message.visual.program} />}
              {message.visual?.kind === "places" && <OpenUIPlaces program={message.visual.program} />}
              {!message.visual && <p>{message.content.replace(/\*\*/g, "")}</p>}
              {message.example ? <p className="chat-example">{copy("chat.example")}</p> : null}
              {message.uncited ? <p className="chat-no-source">{copy("chat.noSource")}</p> : null}
              {message.citations?.map((citation) => (
                <p key={citation.name}>
                  {citation.href ? <a href={citation.href}>{citation.name}</a> : citation.name}
                  {citation.kind ? ` · ${citation.kind}` : ""}
                </p>
              ))}
            </motion.article>
          ))}
        </div>
        {busy && <div role="status" className="chat-status chat-thinking">
          <span className="thinking-dots" aria-hidden="true"><span /><span /><span /></span>
          <span className="thinking-label">{copy("chat.thinking")}</span>
        </div>}
        {error && <p role="alert" className="chat-error">{error}</p>}
        <div ref={bottom} />
      </div>
      <div className="chat-composer-wrap">
        <form className="chat-composer" onSubmit={event => { event.preventDefault(); void send(); }}>
          <label className="sr-only" htmlFor="chat-question">{copy("chat.label")}</label>
          <textarea id="chat-question" ref={input} value={draft} maxLength={2000}
            placeholder={copy("chat.placeholder")} rows={1} readOnly={busy}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault(); void send();
              }
            }} />
          <button type="submit" className="chat-send" disabled={busy || !draft.trim()} aria-label={busy ? copy("chat.sending") : copy("chat.send")}>
            {busy ? <span className="chat-spinner" aria-hidden="true" /> : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 19V5m-6 6 6-6 6 6" />
              </svg>
            )}
          </button>
        </form>
        <p className="chat-note">{copy("chat.note")}</p>
      </div>
    </main>
  );
}
