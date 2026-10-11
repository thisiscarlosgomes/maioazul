"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { CHATGPT_URL } from "../lib/content";
import { publicChatAnswer } from "../lib/chat-answer";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const examples = [
  { label: "Praias", prompt: "Que praias posso conhecer no Maio?" },
  { label: "Economia", prompt: "Quantas empresas existem no Maio?" },
  { label: "Turismo", prompt: "Como foi o turismo no Maio em 2024?" },
];

export function McpDemo() {
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
      const answer = [
        "Bitxe Rotcha, Ponta Preta e Boca Lagoa. Confirme as condições do mar.",
        "IAE 2024: cerca de 308 empresas ativas; 114 no comércio, 62 no alojamento e restauração e 40 noutros serviços. Estimativas arredondadas.",
        "INE Turismo 2024: 1 932 hóspedes e 7 553 dormidas nos alojamentos abrangidos no Maio; média calculada de 3,9 noites.",
      ][match];
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
              content: `${question.trim()}\n\nResponde em português, em texto simples, com no máximo 60 palavras ou 3 pontos curtos. Usa as ferramentas do Maio e indica a fonte e o período quando houver dados. Não inventes informação.`,
            },
          ],
          context: { surface: "mcp-guide" },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const dailyQuota = response.status === 429 && typeof data.limit === "number" && typeof data.windowHours === "number";
        throw new Error(dailyQuota
          ? `A API ainda aplica um limite de ${data.limit} perguntas por ${data.windowHours} horas. O limite desta sessão foi atingido.`
          : response.status === 429
            ? "O serviço está temporariamente ocupado. Tente novamente dentro de instantes."
            : "Não foi possível consultar o Maio. Tente novamente.");
      }
      if (
        Array.isArray(data.toolEvents) &&
        data.toolEvents.some((event: { ok?: boolean }) => event.ok === false)
      ) {
        throw new Error(
          "Uma das fontes não respondeu. Tente novamente ou pergunte sobre outro tema.",
        );
      }
      if (typeof data.message !== "string" || !data.message.trim())
        throw new Error("Não recebemos uma resposta. Tente novamente.");
      const publicAnswer = publicChatAnswer(data.message, question.trim());
      if (!publicAnswer) throw new Error("Não recebemos uma resposta. Tente novamente.");
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
            ? "A consulta demorou demasiado. Tente novamente."
            : cause instanceof Error
              ? cause.message
              : "Não foi possível consultar o Maio.",
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
        aria-label="Perguntas de exemplo"
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
          A sua pergunta sobre o Maio
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
            placeholder="O que quer saber sobre o Maio?"
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
          aria-label={loading ? "A consultar o Maio" : "Enviar pergunta"}
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
                    A consultar os dados do Maio…
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
                      <p>Cerca de 308 empresas ativas em 2024.</p>
                    )}
                    <div className="answer-points data-results">
                      {(preset === 1
                        ? [
                            ["114", "Comércio e reparação"],
                            ["62", "Alojamento e restauração"],
                            ["40", "Outros serviços"],
                          ]
                        : [
                            ["1 932", "Hóspedes"],
                            ["7 553", "Dormidas"],
                            ["3,9 noites", "Média por hóspede"],
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
                        ? "IAE 2024 · Estimativas arredondadas via API Maio; fonte original por verificar."
                        : "INE · 2024 · Alojamentos abrangidos. Média calculada."}
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
        <a className="button button-light" href={CHATGPT_URL}>
          Abrir no ChatGPT
        </a>
        <Link className="button" href="/chat">
          Conversar aqui
        </Link>
      </div>
    </div>
  );
}
