"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type FeedItem = {
  id: string;
  title: string;
  detail: string;
  source: string;
  updatedAt: string;
  href: string;
  tone: "data" | "place" | "system";
};

type FeedResponse = {
  ok: boolean;
  generatedAt: string;
  count: number;
  items: FeedItem[];
};

const DEFAULT_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

function normalizeInterval(value: number, fallback: number) {
  if (!Number.isFinite(value) || value < 1000) return fallback;
  return Math.floor(value);
}

const REFRESH_INTERVAL_MS = normalizeInterval(
  Number(process.env.NEXT_PUBLIC_FEED_REFRESH_INTERVAL_MS ?? DEFAULT_REFRESH_INTERVAL_MS),
  DEFAULT_REFRESH_INTERVAL_MS
);

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sem data";

  const now = Date.now();
  const diffMs = date.getTime() - now;
  const absMs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat("pt-PT", { numeric: "auto" });

  if (absMs < 60_000) return "agora";
  if (absMs < 60 * 60_000) return rtf.format(Math.round(diffMs / 60_000), "minute");
  if (absMs < 24 * 60 * 60_000) return rtf.format(Math.round(diffMs / (60 * 60_000)), "hour");
  return rtf.format(Math.round(diffMs / (24 * 60 * 60_000)), "day");
}

function formatAbsolute(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "data inválida";
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function FeedRollingCards() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/feed?limit=24", { cache: "no-store" });
        const data = (await res.json()) as FeedResponse;

        if (cancelled) return;

        if (!res.ok || !data.ok) {
          setError("Não foi possível carregar o feed de atualizações.");
          return;
        }

        const sorted = [...(data.items ?? [])].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setItems(sorted);
        setError(null);
      } catch {
        if (!cancelled) {
          setError("Não foi possível carregar o feed de atualizações.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    refreshTimerRef.current = window.setInterval(() => {
      void load();
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  const visible = items;

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-border bg-card/70 p-5"
          >
            <div className="h-3 w-48 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-5 w-4/5 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-300/30 bg-red-500/5 p-6 text-sm text-red-200">
        {error}
      </div>
    );
  }

  if (!visible.length) {
    return (
      <div className="rounded-2xl border border-border bg-card/40 p-6 text-sm text-muted-foreground">
        Ainda não existem atualizações.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2">
        {visible.map((item, index) => (
          <Link
            key={item.id}
            href={item.href}
            className={`group rounded-2xl border bg-card/70 p-5 transition hover:-translate-y-0.5 hover:bg-card ${
              index === 0 ? "border-emerald-500/70" : "border-border"
            }`}
          >
            <div className="text-xs text-muted-foreground">
              {formatWhen(item.updatedAt)} · {formatAbsolute(item.updatedAt)}
            </div>
            <h3 className="mt-3 text-base font-semibold text-foreground">{item.title}</h3>
          </Link>
        ))}
      </div>
    </div>
  );
}
