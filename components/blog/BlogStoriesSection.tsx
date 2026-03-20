"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SectionBlock } from "@/components/dashboard/SectionBlock";

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  publishedAt: string | null;
  updatedAt: string;
};

type BlogResponse = {
  ok: boolean;
  items?: BlogPost[];
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dt);
}

export function BlogStoriesSection() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/blog?status=published&limit=3", { cache: "no-store" });
        const payload = (await res.json()) as BlogResponse;
        if (!cancelled && res.ok && payload.ok) {
          setPosts(payload.items ?? []);
        }
      } catch {
        if (!cancelled) setPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SectionBlock
      title="Histórias dos Indicadores"
      description="Leituras em linguagem simples sobre métricas novas do dashboard."
    >
      {loading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="rounded-xl border border-border bg-card p-4">
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-3 w-full animate-pulse rounded bg-muted" />
              <div className="mt-1 h-3 w-5/6 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : posts.length ? (
        <div className="grid gap-3 md:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-emerald-500/50"
            >
              <p className="text-xs text-muted-foreground">{formatDate(post.publishedAt ?? post.updatedAt)}</p>
              <h3 className="mt-2 line-clamp-2 font-medium">{post.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.summary}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Ainda não há histórias publicadas.
        </div>
      )}
    </SectionBlock>
  );
}

