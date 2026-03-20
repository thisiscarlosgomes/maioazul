import type { Metadata } from "next";
import Link from "next/link";
import { listBlogPosts } from "@/lib/blog/repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Destaques dos Indicadores",
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
    <main className="min-h-screen text-white">
      <section className="mx-auto max-w-6xl space-y-6 px-6 pb-16 pt-2">
        <div className="pt-6">
          <h1 className="text-lg font-semibold">Destaques dos Indicadores</h1>
          <p className="hidden text-sm text-white/65 sm:block">
            Conteúdo gerado por IA com revisão editorial e base em dados oficiais.
          </p>
        </div>

        {posts.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="rounded-[1.6rem] bg-white/[0.04] p-5 transition hover:-translate-y-0.5 hover:border-white/30"
              >
                <p className="text-xs text-white/60">
                  {formatDate(post.publishedAt ?? post.updatedAt)}
                </p>
                <h2 className="hidden mt-3 line-clamp-2 text-lg font-medium leading-tight">{post.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-white/70">{post.summary}</p>
                {post.heroImageUrl ? (
                  <img
                    src={post.heroImageUrl}
                    alt={post.heroImageAlt || post.title}
                    className="mt-6 h-40 w-full rounded-3xl border border-white/10 object-cover"
                  />
                ) : (
                  <div className="mt-6 flex h-40 w-full items-center justify-center rounded-3xl border border-dashed border-white/15 bg-black/20 text-sm text-white/45">
                    Sem imagem
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/65">
            Ainda não há artigos publicados.
          </div>
        )}
      </section>
    </main>
  );
}
