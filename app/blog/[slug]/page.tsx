import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getBlogPostBySlug } from "@/lib/blog/repository";

type Params = { params: { slug: string } };
export const dynamic = "force-dynamic";

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

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = params;
  let post: Awaited<ReturnType<typeof getBlogPostBySlug>> = null;
  try {
    post = await getBlogPostBySlug(slug);
  } catch (error) {
    console.error("[blog-detail] failed to load metadata", error);
    post = null;
  }
  if (!post) {
    return {
      title: "Artigo não encontrado",
      description: "O artigo pedido não foi encontrado.",
    };
  }

  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: `/blog/${post.slug}` },
  };
}

export default async function BlogDetailPage({ params }: Params) {
  const { slug } = params;
  let post: Awaited<ReturnType<typeof getBlogPostBySlug>> = null;
  try {
    post = await getBlogPostBySlug(slug);
  } catch (error) {
    console.error("[blog-detail] failed to load post", error);
    post = null;
  }

  if (!post || post.status !== "published") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <article className="mx-auto max-w-3xl space-y-5 px-6 pb-16 pt-8">
        <Link className="text-sm text-muted-foreground hover:text-foreground" href="/blog">
          Voltar aos destaques
        </Link>
        <header className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Publicado em {formatDate(post.publishedAt ?? post.updatedAt)}
          </p>
          <h1 className="text-2xl font-semibold">{post.title}</h1>
          <p className="text-sm text-muted-foreground">{post.summary}</p>
        </header>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.bodyMd}</ReactMarkdown>
          </div>
        </div>

        <footer className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
          Fonte de dados: {post.sourceDataset}. Este conteúdo foi gerado por IA com base em métricas
          do dashboard e pode ser ajustado por revisão editorial.
        </footer>
      </article>
    </main>
  );
}
