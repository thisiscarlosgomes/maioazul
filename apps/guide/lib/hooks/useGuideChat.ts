"use client";

import { useEffect, useState } from "react";

export type GuideToolEvent = {
  name: string;
  arguments: Record<string, unknown>;
  ok: boolean;
  placeCards?: Array<{
    id: string;
    name: string;
    location?: string;
    imageUrl?: string;
  }>;
  weatherCard?: {
    location: string;
    temperature?: number;
    humidity?: number;
    precipitation?: number;
    weatherCode?: number;
    updatedAt?: string;
  };
  surfCard?: {
    location: string;
    updatedAt?: string;
    points: Array<{
      label: string;
      surfMinM?: number;
      surfMaxM?: number;
      windKph?: number;
      swellPeriodS?: number;
    }>;
  };
};

export type GuideChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolEvents?: GuideToolEvent[];
  createdAt: string;
};

export type GuideChatContext = {
  surface?:
    | "guide"
    | "map"
    | "places"
    | "experiences"
    | "favorites"
    | "mcp-guide"
    | "generic";
};

type UseGuideChatOptions = {
  storageKey?: string;
  welcomeMessage?: string;
  context?: GuideChatContext;
};

const DEFAULT_WELCOME_MESSAGE =
  "Pergunte sobre lugares, clima, surf, ferries, voos e o que fazer no Maio.";
const STORAGE_KEY = "visit-maio-guide-chat-v1";

function buildWelcomeMessage(message: string): GuideChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    content: message,
    createdAt: new Date().toISOString(),
  };
}

export function useGuideChat(options: UseGuideChatOptions = {}) {
  const storageKey = options.storageKey ?? STORAGE_KEY;
  const welcomeMessage = options.welcomeMessage ?? DEFAULT_WELCOME_MESSAGE;

  const [messages, setMessages] = useState<GuideChatMessage[]>([
    buildWelcomeMessage(welcomeMessage),
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRestoredFromStorage, setHasRestoredFromStorage] = useState(false);

  useEffect(() => {
    setHasRestoredFromStorage(false);
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return;

      const restored = parsed.filter((message): message is GuideChatMessage => {
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
      // Ignore invalid local storage.
    } finally {
      setHasRestoredFromStorage(true);
    }
  }, [storageKey, welcomeMessage]);

  useEffect(() => {
    if (!hasRestoredFromStorage) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // Ignore storage write failures.
    }
  }, [hasRestoredFromStorage, messages, storageKey]);

  async function submitMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMessage: GuideChatMessage = {
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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          context: options.context,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof payload?.error === "string" ? payload.error : "Chat request failed.",
        );
      }

      const assistantMessage: GuideChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          typeof payload?.message === "string" && payload.message.trim().length > 0
            ? payload.message.trim()
            : "I couldn't generate a response.",
        toolEvents: Array.isArray(payload?.toolEvents) ? payload.toolEvents : [],
        createdAt: new Date().toISOString(),
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    setMessages([buildWelcomeMessage(welcomeMessage)]);
    setInput("");
    setLoading(false);
    setError(null);

    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage failures.
    }
  }

  return {
    messages,
    input,
    setInput,
    loading,
    error,
    submitMessage,
    resetChat,
  };
}
