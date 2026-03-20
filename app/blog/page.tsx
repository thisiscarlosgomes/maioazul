import type { Metadata } from "next";
import Link from "next/link";
import { listBlogPosts } from "@/lib/blog/repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Histórias dos Indicadores",
  description:
    "Artigos em linguagem simples gerados a partir de métricas oficiais publicadas no dashboard.",
  alternates: {
    canonical: "/blog",
  },
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

export default async function BlogPage() {
  let posts: Awaited<ReturnType<typeof listBlogPosts>> = [];
  try {
    posts = await listBlogPosts({ status: "published", limit: 24 });
  } catch (error) {
    console.error("[blog-page] failed to load posts", error);
    posts = [];
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-6xl space-y-6 px-6 pb-16 pt-2">
        <div className="pt-6">
          <h1 className="text-xl font-semibold">Histórias dos Indicadores</h1>
          <p className="hidden text-sm text-muted-foreground sm:block">
            Conteúdo gerado por IA com revisão editorial e base em dados oficiais.
          </p>
        </div>

        {posts.length ? (
          <div className="grid gap-3 md:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-emerald-500/50"
              >
                <p className="text-xs text-muted-foreground">
                  {formatDate(post.publishedAt ?? post.updatedAt)}
                </p>
                <h2 className="mt-2 line-clamp-2 font-medium">{post.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.summary}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Ainda não há artigos publicados.
          </div>
        )}
      </section>
    </main>
  );
}
