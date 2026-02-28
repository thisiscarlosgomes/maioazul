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

const DEFAULT_WELCOME_MESSAGE: SiteChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Pergunte sobre turismo no Maio, indicadores ou métricas centrais.",
  createdAt: new Date().toISOString(),
};

const STORAGE_KEY = "maioazul-site-chat-v2";

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

export function useSiteChat() {
  const [messages, setMessages] = useState<SiteChatMessage[]>([
    DEFAULT_WELCOME_MESSAGE,
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
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
              ? { ...DEFAULT_WELCOME_MESSAGE, createdAt: message.createdAt }
              : message,
          ),
        );
      }
    } catch {
      // Ignore invalid local chat cache.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore storage write failures.
    }
  }, [messages]);

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
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) {
          const limit =
            typeof payload?.limit === "number" ? payload.limit : 10;
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

  return {
    messages,
    input,
    setInput,
    loading,
    error,
    submitMessage,
  };
}
