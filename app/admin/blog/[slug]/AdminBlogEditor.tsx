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
    heroImageUrl: string | null;
    heroImageAlt: string | null;
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
  const [heroImageUrl, setHeroImageUrl] = useState(post.heroImageUrl ?? "");
  const [heroImageAlt, setHeroImageAlt] = useState(post.heroImageAlt ?? post.title);
  const [imagePrompt, setImagePrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState(post.updatedAt);

  const publicUrl = useMemo(() => `/blog/${post.slug}`, [post.slug]);
  const markdownComponents = useMemo(
    () => ({
      p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
        <p className="mb-5 leading-relaxed text-white/90" {...props} />
      ),
      h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h1 className="mb-4 mt-8 text-3xl font-semibold text-white" {...props} />
      ),
      h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h2 className="mb-3 mt-7 text-2xl font-semibold text-white" {...props} />
      ),
      h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h3 className="mb-2 mt-6 text-xl font-semibold text-white" {...props} />
      ),
      ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
        <ul className="mb-5 list-disc space-y-2 pl-6 text-white/90" {...props} />
      ),
      ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
        <ol className="mb-5 list-decimal space-y-2 pl-6 text-white/90" {...props} />
      ),
      li: (props: React.HTMLAttributes<HTMLLIElement>) => (
        <li className="leading-relaxed" {...props} />
      ),
      strong: (props: React.HTMLAttributes<HTMLElement>) => (
        <strong className="font-semibold text-white" {...props} />
      ),
      blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
        <blockquote className="mb-5 border-l-2 border-white/25 pl-4 italic text-white/80" {...props} />
      ),
      a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a className="underline decoration-white/50 underline-offset-2 hover:decoration-white" {...props} />
      ),
      hr: () => <hr className="my-8 border-white/15" />,
    }),
    []
  );

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
          heroImageUrl: heroImageUrl.trim(),
          heroImageAlt: heroImageAlt.trim(),
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

  const handleGenerateImage = async () => {
    setGeneratingImage(true);
    setMessage(null);
    try {
      const res = await fetch("/api/blog/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: post.id,
          action: "generate_image",
          imagePrompt: imagePrompt.trim() || undefined,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(payload.error ?? "Falha ao gerar imagem.");
        return;
      }
      setMessage("Imagem gerada. Grave para confirmar no artigo.");
      window.location.reload();
    } catch {
      setMessage("Erro inesperado ao gerar imagem.");
    } finally {
      setGeneratingImage(false);
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
              <label className="text-xs text-muted-foreground">Imagem (URL)</label>
              <input
                value={heroImageUrl}
                onChange={(event) => setHeroImageUrl(event.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500/60"
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Preview da imagem</label>
              {heroImageUrl ? (
                <img
                  src={heroImageUrl}
                  alt={heroImageAlt || title || "Imagem do artigo"}
                  className="h-44 w-full rounded-lg border border-border object-cover"
                />
              ) : (
                <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-border bg-background text-xs text-muted-foreground">
                  Sem imagem ainda.
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                Prompt para gerar imagem (opcional)
              </label>
              <textarea
                value={imagePrompt}
                onChange={(event) => setImagePrompt(event.target.value)}
                className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500/60"
                placeholder="Ex.: Casas e famílias locais do Maio, luz natural ao pôr-do-sol, estilo editorial."
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleGenerateImage}
                disabled={generatingImage}
              >
                {generatingImage ? "A gerar imagem..." : "Gerar imagem"}
              </Button>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Alt da imagem</label>
              <input
                value={heroImageAlt}
                onChange={(event) => setHeroImageAlt(event.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500/60"
                placeholder="Descrição da imagem"
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
            {heroImageUrl ? (
              <img
                src={heroImageUrl}
                alt={heroImageAlt || title || "Imagem do artigo"}
                className="h-52 w-full rounded-lg object-cover border border-border"
              />
            ) : null}
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">{title || "Sem título"}</h1>
              <p className="text-sm text-muted-foreground">{summary || "Sem resumo"}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {bodyMd || ""}
                </ReactMarkdown>
              </div>
            </div>
          </section>
        </div>
      </article>
    </main>
  );
}
