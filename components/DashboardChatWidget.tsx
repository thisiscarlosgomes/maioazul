"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, ChevronDown, MessageCircle, Sparkles, X } from "lucide-react";
import { useSiteChat } from "@/lib/hooks/useSiteChat";

const QUICK_PROMPTS = [
  "Como está o Maio em 2025?",
  "Comparar Maio e Sal.",
  "Mostrar métricas centrais do Maio.",
];

function ThinkingLoader() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          className="h-2 w-2 rounded-full bg-[#111111]/68"
          transition={{
            duration: 0.9,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
            delay: index * 0.12,
          }}
        />
      ))}
    </div>
  );
}

function formatMessageTime(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

export default function DashboardChatWidget() {
  const { messages, input, setInput, loading, error, submitMessage } = useSiteChat();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMessage(input);
  }

  async function handleQuickPrompt(prompt: string) {
    if (!open) {
      setOpen(true);
    }
    await submitMessage(prompt);
  }

  async function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    await submitMessage(input);
  }

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[80]">
      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              animate={{ opacity: 1 }}
              className="pointer-events-auto fixed inset-0 bg-[#111111]/12 backdrop-blur-[2px]"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="pointer-events-auto fixed inset-0 flex h-[100dvh] w-full flex-col overflow-hidden rounded-none border-0 bg-white text-[#111111] shadow-[0_32px_90px_rgba(0,0,0,0.18)] sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(78vh,720px)] sm:w-[min(92vw,420px)] sm:rounded-[28px] sm:border sm:border-[rgba(17,17,17,0.08)]"
              exit={{ opacity: 0, scale: 0.98, y: 18 }}
              initial={{ opacity: 0, scale: 0.94, y: 26 }}
              transition={{ type: "spring", stiffness: 340, damping: 30, mass: 0.9 }}
            >
              <div className="flex items-center justify-between border-b border-[rgba(17,17,17,0.08)] px-4 py-4 sm:px-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#111111] text-white">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold">MaioAzul AI</p>
                    <p className="text-sm text-[#111111]/52">chat do dashboard</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="hidden h-9 w-9 items-center justify-center rounded-full text-[#111111]/64 transition hover:bg-[#111111]/6 hover:text-[#111111] sm:flex"
                    onClick={() => setOpen(false)}
                    type="button"
                  >
                    <ChevronDown className="h-5 w-5" />
                  </button>
                  <button
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[#111111]/64 transition hover:bg-[#111111]/6 hover:text-[#111111]"
                    onClick={() => setOpen(false)}
                    type="button"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div
                ref={scrollRef}
                className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5"
              >
                <AnimatePresence initial={false}>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={
                        message.role === "user"
                          ? "flex flex-col items-end"
                          : "flex flex-col items-start"
                      }
                      exit={{ opacity: 0, y: 8 }}
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <div
                        className={
                          message.role === "user"
                            ? "max-w-[85%] rounded-[22px] bg-[#111111] px-4 py-3 text-sm leading-6 text-white"
                            : "max-w-[88%] rounded-[22px] bg-[#f3f3ef] px-4 py-3 text-sm leading-6 text-[#111111]"
                        }
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <p
                        className={
                          message.role === "user"
                            ? "mt-2 pr-2 text-right text-[12px] text-[#111111]/46"
                            : "mt-2 pl-2 text-[12px] text-[#111111]/46"
                        }
                      >
                        {message.role === "user" ? "você" : "Maioazul AI"} •{" "}
                        {formatMessageTime(message.createdAt)}
                      </p>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {!loading && messages.length === 1 ? (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="grid gap-2"
                    initial={{ opacity: 0, y: 8 }}
                  >
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        className="rounded-[16px] border border-[rgba(17,17,17,0.08)] bg-[#f8f8f5] px-4 py-3 text-left text-sm text-[#111111]/84 transition hover:bg-[#f1f1ec]"
                        onClick={() => handleQuickPrompt(prompt)}
                        type="button"
                      >
                        {prompt}
                      </button>
                    ))}
                  </motion.div>
                ) : null}

                <AnimatePresence>
                  {loading ? (
                    <motion.div
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                      exit={{ opacity: 0, y: 8 }}
                      initial={{ opacity: 0, y: 10 }}
                    >
                      <div className="rounded-[22px] bg-[#f3f3ef] px-4 py-3 text-sm text-[#111111]/72">
                        <ThinkingLoader />
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <form className="border-t border-[rgba(17,17,17,0.08)] p-4 sm:p-4" onSubmit={handleSubmit}>
                <div className="rounded-[24px] border border-[rgba(17,17,17,0.1)] bg-white p-3">
                  <textarea
                    className="min-h-[44px] w-full resize-none bg-transparent px-1 py-1 text-sm leading-6 text-[#111111] outline-none placeholder:text-[#111111]/38"
                    rows={2}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleTextareaKeyDown}
                    placeholder="Faça uma pergunta..."
                    value={input}
                  />
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <p className="text-[11px] text-[#111111]/44">
                      enter para enviar
                    </p>
                    <motion.button
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111111] text-white transition disabled:cursor-not-allowed disabled:opacity-45"
                      disabled={loading || input.trim().length === 0}
                      type="submit"
                      whileTap={{ scale: 0.96 }}
                    >
                      <ArrowUp className="h-4.5 w-4.5" />
                    </motion.button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-center text-[12px] text-[#111111]/48">
                  <a className="transition hover:text-[#111111]/72" href="/mcp-guide">
                    powered by maioazul mcp
                  </a>
                </div>
                {error ? <p className="mt-3 text-sm text-[#b42318]">{error}</p> : null}
              </form>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      {!open ? (
        <motion.button
          aria-label="Abrir chat MaioAzul"
          className="pointer-events-auto fixed bottom-5 right-5 flex h-16 w-16 items-center justify-center rounded-full border border-[#10069F] bg-[#10069F] text-white shadow-[0_20px_40px_rgba(16,6,159,0.28)] sm:bottom-6 sm:right-6"
          onClick={() => setOpen(true)}
          transition={{ type: "spring", stiffness: 380, damping: 22 }}
          type="button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
        >
          <MessageCircle className="h-7 w-7" />
        </motion.button>
      ) : null}
    </div>
    ,
    document.body
  );
}
