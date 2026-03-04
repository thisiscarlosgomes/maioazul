"use client";

import { useEffect, useState } from "react";

export type ToolEvent = {
  name: string;
  arguments: Record<string, unknown>;
  ok: boolean;
};

export type SiteChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolEvents?: ToolEvent[];
  createdAt: string;
};

export type SiteChatContext = {
  surface?: "dashboard" | "orcamento" | "mcp-guide" | "generic";
  year?: number | string;
};

type UseSiteChatOptions = {
  storageKey?: string;
  welcomeMessage?: string;
  context?: SiteChatContext;
};

const DEFAULT_WELCOME_MESSAGE =
  "Pergunte sobre turismo no Maio, indicadores ou métricas centrais.";
const STORAGE_KEY = "maioazul-site-chat-v2";
const CHAT_QUERY_LIMIT = 10;

function buildWelcomeMessage(message: string): SiteChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    content: message,
    createdAt: new Date().toISOString(),
  };
}

function formatQuotaReset(resetAt: string | null | undefined) {
  if (!resetAt) return "mais tarde";

  const date = new Date(resetAt);
  if (Number.isNaN(date.getTime())) return "mais tarde";

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function useSiteChat(options: UseSiteChatOptions = {}) {
  const storageKey = options.storageKey ?? STORAGE_KEY;
  const welcomeMessage = options.welcomeMessage ?? DEFAULT_WELCOME_MESSAGE;
  const [messages, setMessages] = useState<SiteChatMessage[]>([
    buildWelcomeMessage(welcomeMessage),
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingQuestions, setRemainingQuestions] = useState(CHAT_QUERY_LIMIT);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return;

      const restored = parsed.filter((message): message is SiteChatMessage => {
        return (
          message &&
          typeof message === "object" &&
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string" &&
          typeof message.id === "string" &&
          typeof message.createdAt === "string"
        );
      });

      if (restored.length > 0) {
        setMessages(
          restored.map((message) =>
            message.id === "welcome"
              ? { ...buildWelcomeMessage(welcomeMessage), createdAt: message.createdAt }
              : message,
          ),
        );
      }
    } catch {
      // Ignore invalid local chat cache.
    }
  }, [storageKey, welcomeMessage]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // Ignore storage write failures.
    }
  }, [messages, storageKey]);

  async function submitMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMessage: SiteChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          context: options.context,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) {
          const limit =
            typeof payload?.limit === "number" ? payload.limit : CHAT_QUERY_LIMIT;
          setRemainingQuestions(
            typeof payload?.remaining === "number" ? payload.remaining : 0,
          );
          const resetLabel = formatQuotaReset(
            typeof payload?.resetAt === "string" ? payload.resetAt : null,
          );

          throw new Error(
            `Atingiste o limite de ${limit} mensagens por 24 horas. Tenta novamente em ${resetLabel}.`,
          );
        }

        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "O pedido de chat falhou.",
        );
      }

      const assistantMessage: SiteChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          typeof payload?.message === "string" && payload.message.trim().length > 0
            ? payload.message.trim()
            : "Não consegui gerar uma resposta.",
        toolEvents: Array.isArray(payload?.toolEvents) ? payload.toolEvents : [],
        createdAt: new Date().toISOString(),
      };

      setMessages((current) => [...current, assistantMessage]);
      if (typeof payload?.remaining === "number") {
        setRemainingQuestions(payload.remaining);
      }
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Ocorreu um erro.",
      );
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    setMessages([
      buildWelcomeMessage(welcomeMessage),
    ]);
    setInput("");
    setLoading(false);
    setError(null);
    setRemainingQuestions(CHAT_QUERY_LIMIT);

    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage write failures.
    }
  }

  return {
    messages,
    input,
    setInput,
    loading,
    error,
    remainingQuestions,
    maxQuestions: CHAT_QUERY_LIMIT,
    submitMessage,
    resetChat,
  };
}
