"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";

type AdminBlogEditorProps = {
  post: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    bodyMd: string;
    status: string;
    sourceDataset: string;
    updatedAt: string;
  };
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dt);
}

export default function AdminBlogEditor({ post }: AdminBlogEditorProps) {
  const [title, setTitle] = useState(post.title);
  const [summary, setSummary] = useState(post.summary);
  const [bodyMd, setBodyMd] = useState(post.bodyMd);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState(post.updatedAt);

  const publicUrl = useMemo(() => `/blog/${post.slug}`, [post.slug]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/blog/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: post.id,
          action: "update",
          title,
          summary,
          bodyMd,
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(payload.error ?? "Falha ao guardar alterações.");
        return;
      }

      const now = new Date().toISOString();
      setLastSavedAt(now);
      setMessage("Alterações guardadas com sucesso.");
    } catch {
      setMessage("Erro inesperado ao guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <article className="mx-auto max-w-5xl space-y-5 px-6 pb-16 pt-8">
        <div className="flex items-center justify-between gap-3">
          <Link className="text-sm text-muted-foreground hover:text-foreground" href="/admin">
            Voltar ao admin
          </Link>
          <div className="flex items-center gap-2">
            {post.status === "published" ? (
              <Button size="sm" variant="outline" asChild>
                <Link href={publicUrl} target="_blank">
                  Ver página pública
                </Link>
              </Button>
            ) : null}
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "A guardar..." : "Guardar"}
            </Button>
          </div>
        </div>

        <header className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Preview ({post.status}) · Última gravação {formatDate(lastSavedAt)}
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-3 rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Editor</h2>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Título</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500/60"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Resumo</label>
              <textarea
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500/60"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Conteúdo (Markdown)</label>
              <textarea
                value={bodyMd}
                onChange={(event) => setBodyMd(event.target.value)}
                className="min-h-[420px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500/60"
              />
            </div>
            <p className="text-xs text-muted-foreground">Fonte: {post.sourceDataset}</p>
            {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
          </section>

          <section className="space-y-3 rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Preview</h2>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">{title || "Sem título"}</h1>
              <p className="text-sm text-muted-foreground">{summary || "Sem resumo"}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{bodyMd || ""}</ReactMarkdown>
              </div>
            </div>
          </section>
        </div>
      </article>
    </main>
  );
}

