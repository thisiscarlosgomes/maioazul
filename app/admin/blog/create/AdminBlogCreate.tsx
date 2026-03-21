"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";

export default function AdminBlogCreate() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [bodyMd, setBodyMd] = useState("");
  const [year, setYear] = useState<string>("");
  const [sourceDataset, setSourceDataset] = useState("manual_editor");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [heroImageAlt, setHeroImageAlt] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  const handleCreate = async () => {
    setCreating(true);
    setMessage(null);
    try {
      const parsedYear = Number(year);
      const res = await fetch("/api/blog/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: title.trim(),
          summary: summary.trim(),
          bodyMd: bodyMd.trim(),
          year: Number.isFinite(parsedYear) ? Math.floor(parsedYear) : null,
          sourceDataset: sourceDataset.trim() || "manual_editor",
          heroImageUrl: heroImageUrl.trim(),
          heroImageAlt: heroImageAlt.trim(),
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        slug?: string;
      };

      if (!res.ok || !payload.ok || !payload.slug) {
        setMessage(payload.error ?? "Não foi possível criar o artigo.");
        return;
      }

      router.push(`/admin/blog/${payload.slug}`);
      router.refresh();
    } catch {
      setMessage("Erro inesperado ao criar artigo.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <article className="mx-auto max-w-5xl space-y-5 px-6 pb-16 pt-8">
        <div className="flex items-center justify-between gap-3">
          <Link className="text-sm text-muted-foreground hover:text-foreground" href="/admin">
            Voltar ao admin
          </Link>
          <Button size="sm" onClick={handleCreate} disabled={creating}>
            {creating ? "A criar..." : "Criar artigo"}
          </Button>
        </div>

        <header className="space-y-2">
          <p className="text-xs text-muted-foreground">Novo artigo manual (draft)</p>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Ano (opcional)</label>
                <input
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500/60"
                  placeholder="2025"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Origem</label>
                <input
                  value={sourceDataset}
                  onChange={(event) => setSourceDataset(event.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500/60"
                />
              </div>
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
            {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
          </section>

          <section className="space-y-3 rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Preview</h2>
            {heroImageUrl ? (
              <Image
                src={heroImageUrl}
                alt={heroImageAlt || title || "Imagem do artigo"}
                className="h-52 w-full rounded-lg object-cover border border-border"
                width={1200}
                height={628}
                unoptimized
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
