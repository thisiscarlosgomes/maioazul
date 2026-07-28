"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Check, Copy, RotateCcw, Sparkles } from "lucide-react";
import { useSiteChat } from "@/lib/hooks/useSiteChat";
import ChatMarkdownContent from "@/components/chat/ChatMarkdownContent";
import {
  DEFAULT_CHAT_QUICK_PROMPTS,
  DEFAULT_CHAT_WELCOME_MESSAGE,
  getVisibleChatQuickPrompts,
} from "@/components/chat/defaultPrompts";

const STARTER_PROMPTS = getVisibleChatQuickPrompts(DEFAULT_CHAT_QUICK_PROMPTS);

function ThinkingLoader() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          className="h-2 w-2 rounded-full bg-[#1E78FF]/50"
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

export default function SiteChatPage() {
  const {
    messages,
    input,
    setInput,
    loading,
    error,
    remainingQuestions,
    maxQuestions,
    submitMessage,
    resetChat,
  } = useSiteChat({
    welcomeMessage: DEFAULT_CHAT_WELCOME_MESSAGE,
  });
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMessage(input);
  }

  async function handleStarterPrompt(prompt: string) {
    if (loading) return;
    await submitMessage(prompt);
  }

  async function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await submitMessage(input);
    }
  }

  async function handleCopyMessage(messageId: string, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      window.setTimeout(() => {
        setCopiedMessageId((current) => (current === messageId ? null : current));
      }, 1200);
    } catch {
      // Ignore clipboard failures.
    }
  }

  const visibleMessages = messages;
  const showQuickPrompts = !loading && messages.length === 1;

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, loading]);

  return (
    <div className="h-[calc(100svh-3.5rem)] overflow-hidden bg-background text-foreground">
      <section className="mx-auto h-full w-full max-w-6xl px-6 md:px-7">
        <div
          ref={scrollRef}
          className="mx-auto h-full w-full max-w-6xl overflow-y-auto overscroll-contain pb-[19rem] pt-4 md:pb-[17rem]"
        >
          <div className="space-y-4 pb-5">
            {visibleMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Faça uma pergunta para começar.
              </p>
            ) : null}
            {visibleMessages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "flex flex-col items-end" : "flex flex-col items-start"}>
                {message.role === "assistant" && message.id === "welcome" ? (
                  <p className="mb-2 text-xl font-semibold leading-tight text-foreground">
                    Bem-vindo, como posso ajudar?
                  </p>
                ) : null}
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[85%] rounded-[22px] bg-[#1E78FF] px-4 py-3 text-sm leading-6 text-white"
                      : "max-w-[88%] px-0 py-0 text-sm leading-6 text-foreground"
                  }
                >
                  {message.role === "user" ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <ChatMarkdownContent content={message.content} />
                  )}
                </div>
                {message.id !== "welcome" ? (
                  <div
                    className={
                      message.role === "user"
                        ? "mt-2 flex w-full items-center justify-end gap-2 pr-2"
                        : "mt-2 flex w-full max-w-[88%] items-center justify-between gap-2 pl-2 pr-2"
                    }
                  >
                    <p className="text-[12px] text-muted-foreground">
                      {message.role === "user" ? "você" : "Maioazul"} • {formatMessageTime(message.createdAt)}
                    </p>
                    {message.role === "assistant" && message.id !== "welcome" ? (
                      <button
                        aria-label="Copiar resposta"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        onClick={() => handleCopyMessage(message.id, message.content)}
                        type="button"
                      >
                        {copiedMessageId === message.id ? (
                          <Check size={13} />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
            {loading ? (
              <div className="flex justify-start">
                <div className="rounded-[22px] px-4 py-3 text-sm text-muted-foreground">
                  <ThinkingLoader />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-background/96 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-6 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2 md:px-7">
          {showQuickPrompts ? (
            <div className="mx-auto grid w-full max-w-6xl gap-2 md:grid-cols-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  className="w-full rounded-full border border-border hover:cursor-pointer px-4 py-2.5 text-center text-sm font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-55"
                  onClick={() => handleStarterPrompt(prompt)}
                  type="button"
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}

          <form
            className={`relative mx-auto w-full max-w-6xl rounded-[24px] border border-border  py-2.5 px-3 ${
              showQuickPrompts ? "mt-3" : "mt-0"
            }`}
            onSubmit={handleSubmit}
          >
            <label className="sr-only" htmlFor="chat-input">
              Faça uma pergunta
            </label>
            <textarea
              id="chat-input"
              className="min-h-[54px] w-full resize-none bg-transparent px-1 py-1 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder="Faça uma pergunta..."
              value={input}
            />

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  <Sparkles size={14} />
                  Maioazul MCP
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  aria-label="Reset chat"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition hover:text-foreground"
                  onClick={resetChat}
                  type="button"
                >
                  <RotateCcw size={17} />
                </button>
                <button
                  aria-label="Send message"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background transition disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={loading || input.trim().length === 0}
                  type="submit"
                >
                  <ArrowUp size={18} />
                </button>
              </div>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              enter para enviar · {remainingQuestions}/{maxQuestions} perguntas restantes
            </div>
            {error ? <p className="mt-3 text-sm text-[#b42318]">{error}</p> : null}
          </form>
        </div>
      </div>
    </div>
  );
}
