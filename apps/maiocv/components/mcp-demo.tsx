"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { Button } from "maio-ui";
import { CHATGPT_URL } from "../lib/content";
import { publicChatAnswer } from "../lib/chat-answer";
import { t, type MessageKey } from "../lib/i18n";
import { localize, type Locale } from "../lib/locale";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export function McpDemo({ locale = "pt" }: { locale?: Locale }) {
  const copy = (key: MessageKey, values?: Record<string, string | number>) => t(key, values, locale);
  const examples = [
    { label: copy("demo.beaches"), prompt: copy("chat.suggest.beaches"), answer: copy("demo.answer.beaches") },
    { label: copy("demo.economy"), prompt: copy("chat.suggest.business"), answer: copy("demo.answer.business") },
    { label: copy("demo.tourism"), prompt: copy("chat.suggest.tourism"), answer: copy("demo.answer.tourism") },
  ];
  const [question, setQuestion] = useState(examples[0].prompt);
  const [reply, setReply] = useState("");
  const [preset, setPreset] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const history = useRef<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  useEffect(() => () => pending.current?.abort(), []);
  const [revision, setRevision] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const reduced = useReducedMotion();
  const [editing, setEditing] = useState(false);
  const [typedLength, setTypedLength] = useState(0);

  useEffect(() => {
    if (editing || reduced) return;
    setTypedLength(0);
    let length = 0;
    const timer = window.setInterval(() => {
      length += 1;
      setTypedLength(length);
      if (length >= question.length) window.clearInterval(timer);
    }, 28);
    return () => window.clearInterval(timer);
  }, [question, editing, reduced]);
  function resetReply() {
    pending.current?.abort();
    pending.current = null;
    setLoading(false);
    setSubmitted(false);
    setPreset(null);
    setReply("");
    setError("");
  }

  function choose(index: number) {
    history.current = [];
    setEditing(false);
    resetReply();
    setQuestion(examples[index].prompt);
    setRevision((value) => value + 1);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim() || loading) return;
    pending.current?.abort();
    const match = examples.findIndex(
      (example) =>
        example.prompt.toLocaleLowerCase() ===
        question.trim().toLocaleLowerCase(),
    );
    if (match >= 0) {
      const answer = examples[match].answer;
      setPreset(match);
      setReply(answer);
      setSubmitted(true);
      setError("");
      setLoading(false);
      pending.current = null;
      setRevision((value) => value + 1);
      history.current = [
        { role: "user", content: question.trim() },
        { role: "assistant", content: answer },
      ];
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setSubmitted(true);
    setPreset(null);
    setReply("");
    setError("");
    setRevision((value) => value + 1);
    const timeout = window.setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch("/api/maio-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [
            ...history.current.slice(-6),
            {
              role: "user",
              content: `${question.trim()}\n\n${copy("demo.instruction")}`,
            },
          ],
          context: { surface: "mcp-guide", lang: locale },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const dailyQuota = response.status === 429 && typeof data.limit === "number" && typeof data.windowHours === "number";
        throw new Error(dailyQuota
          ? copy("demo.quota", { limit: data.limit, hours: data.windowHours })
          : response.status === 429
            ? copy("demo.error.busy")
            : copy("chat.error.answer"));
      }
      if (
        Array.isArray(data.toolEvents) &&
        data.toolEvents.some((event: { ok?: boolean }) => event.ok === false)
      ) {
        throw new Error(copy("demo.error.source"));
      }
      if (typeof data.message !== "string" || !data.message.trim())
        throw new Error(copy("chat.error.empty"));
      const publicAnswer = publicChatAnswer(data.message, question.trim(), locale);
      if (!publicAnswer) throw new Error(copy("chat.error.empty"));
      if (pending.current === controller) {
        setReply(publicAnswer.replace(/\*\*/g, ""));
        history.current = [
          ...history.current.slice(-4),
          { role: "user", content: question.trim() },
          { role: "assistant", content: publicAnswer },
        ];
      }
    } catch (cause) {
      if (pending.current === controller)
        setError(
          controller.signal.aborted
            ? copy("chat.error.timeout")
            : cause instanceof Error
              ? cause.message
              : copy("chat.error.generic"),
        );
    } finally {
      window.clearTimeout(timeout);
      if (pending.current === controller) {
        setLoading(false);
        pending.current = null;
      }
    }
  }

  return (
    <div className="simple-demo">
      <div
        className="question-suggestions"
        role="group"
        aria-label={copy("demo.examples")}
      >
        {examples.map((item, index) => (
          <button
            key={item.label}
            onClick={() => choose(index)}
            aria-pressed={question === item.prompt}
          >
            {item.label}
          </button>
        ))}
      </div>
      <form className="question-box" onSubmit={submit}>
        <label className="sr-only" htmlFor="maio-question">
          {copy("chat.label")}
        </label>
        <div className="typing-input">
          {!editing && !reduced && (
            <div className="typing-preview" aria-hidden="true">
              {question.slice(0, typedLength)}
              <span className="typing-caret" />
            </div>
          )}
          <textarea
            className={!editing && !reduced ? "typing-covered" : undefined}
            onFocus={() => setEditing(true)}
            id="maio-question"
            rows={1}
            value={question}
            maxLength={500}
            onChange={(event) => {
              resetReply();
              setQuestion(event.target.value);
            }}
            placeholder={copy("demo.placeholder")}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
        </div>
        <button
          type="submit"
          disabled={!question.trim() || loading}
          className="demo-send"
          aria-label={loading ? copy("chat.sending") : copy("chat.send")}
        >
          {loading ? <span className="chat-spinner" aria-hidden="true" /> : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 19V5m-6 6 6-6 6 6" />
            </svg>
          )}
        </button>
      </form>
      <div
        className={`simple-answer ${submitted ? "" : "answer-empty"}`}
        aria-live="polite"
      >
        <AnimatePresence mode="wait">
          {submitted && (
            <motion.div
              key={revision}
              initial={{ opacity: 0, height: 0, y: reduced ? 0 : 12 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: reduced ? 0 : 0.35 }}
            >
              <div>
                {loading ? (
                  <p role="status" className="live-thinking">
                    {copy("demo.thinking")}
                  </p>
                ) : error ? (
                  <p role="alert">{error}</p>
                ) : preset === 0 ? (
                  <div className="answer-points beach-results">
                    {["Bitxe Rotcha", "Ponta Preta", "Boca Lagoa"].map(
                      (name, i) => (
                        <motion.div
                          key={name}
                          initial={{ opacity: 0, y: reduced ? 0 : 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: reduced ? 0 : i * 0.08 }}
                        >
                          <Image
                            className="beach-result-photo"
                            src={
                              [
                                "/slideshow/rotcha.png",
                                "/slideshow/pontapreta.jpg",
                                "/slideshow/bocalagoa.png",
                              ][i]
                            }
                            alt={name}
                            width={420}
                            height={280}
                          />
                          <strong>{name}</strong>
                        </motion.div>
                      ),
                    )}
                  </div>
                ) : preset !== null ? (
                  <div>
                    {preset === 1 && (
                      <p>{copy("demo.business.lead")}</p>
                    )}
                    <div className="answer-points data-results">
                      {(preset === 1
                        ? [
                            ["114", copy("demo.business.commerce")],
                            ["62", copy("demo.business.stay")],
                            ["40", copy("demo.business.other")],
                          ]
                        : [
                            ["1 932", copy("demo.tourism.guests")],
                            ["7 553", copy("demo.tourism.nights")],
                            ["3,9", copy("demo.tourism.avg")],
                          ]
                      ).map(([value, label], i) => (
                        <motion.div
                          key={label}
                          initial={{ opacity: 0, y: reduced ? 0 : 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: reduced ? 0 : i * 0.08 }}
                        >
                          <strong>{value}</strong>
                          <p>{label}</p>
                        </motion.div>
                      ))}
                    </div>
                    <p className="answer-takeaway">
                      {preset === 1
                        ? copy("demo.business.source")
                        : copy("demo.tourism.source")}
                    </p>
                  </div>
                ) : (
                  <motion.p
                    key={reply}
                    initial={{ opacity: 0, y: reduced ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="live-reply"
                  >
                    {reply}
                  </motion.p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="button-row demo-chat-actions">
        <Button href={CHATGPT_URL} variant="light">
          {copy("footer.chatgpt")}
        </Button>
        <Button href={localize(locale, "/chat")}>{copy("demo.here")}</Button>
      </div>
    </div>
  );
}
