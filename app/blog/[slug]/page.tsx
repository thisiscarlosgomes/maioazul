import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import BlogArticleActions from "@/components/blog/BlogArticleActions";
import { getBlogPostBySlug } from "@/lib/blog/repository";

type Params = { params: Promise<{ slug: string }> };
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
  const { slug } = await params;
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
  const { slug } = await params;
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

  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "https://www.maioazul.com";
  const shareUrl = `${siteUrl.replace(/\/+$/, "")}/blog/${post.slug}`;
  const markdownComponents = {
    p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p className="mb-5 text-base leading-relaxed text-white/88 md:text-[1.05rem]" {...props} />
    ),
    h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h1 className="mb-4 mt-9 text-3xl font-semibold text-white md:text-4xl" {...props} />
    ),
    h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h2 className="mb-3 mt-8 text-2xl font-semibold text-white md:text-3xl" {...props} />
    ),
    h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3 className="mb-2 mt-7 text-xl font-semibold text-white md:text-2xl" {...props} />
    ),
    ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
      <ul className="mb-6 list-disc space-y-2 pl-7 text-white/88" {...props} />
    ),
    ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
      <ol className="mb-6 list-decimal space-y-2 pl-7 text-white/88" {...props} />
    ),
    li: (props: React.HTMLAttributes<HTMLLIElement>) => <li className="leading-relaxed" {...props} />,
    strong: (props: React.HTMLAttributes<HTMLElement>) => (
      <strong className="font-semibold text-white" {...props} />
    ),
    blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
      <blockquote className="mb-6 border-l-2 border-white/25 pl-4 italic text-white/80" {...props} />
    ),
    a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a className="underline decoration-white/50 underline-offset-2 hover:decoration-white" {...props} />
    ),
    hr: () => <hr className="my-10 border-white/15" />,
    code: (props: React.HTMLAttributes<HTMLElement>) => (
      <code className="rounded bg-white/10 px-1.5 py-0.5 text-[0.95em] text-white" {...props} />
    ),
    pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
      <pre className="mb-6 overflow-x-auto rounded-xl bg-black/30 p-4 text-sm" {...props} />
    ),
  };

  return (
    <main className="min-h-screen bg-[#0a0b10] text-white">
      <article className="mx-auto max-w-4xl space-y-7 px-6 pb-20 pt-10 md:pt-14">
        <Link className="hidden inline-block text-sm text-white/60 hover:text-white" href="/blog">
          Voltar aos destaques
        </Link>
        <header className="space-y-5">
          <h1 className="text-center text-3xl font-semibold leading-tight md:text-4xl">
            {post.title}
          </h1>
          <p className="mx-auto max-w-2xl text-center text-base text-white/85 md:text-xl md:leading-tight">
            {post.summary}
          </p>
          <div className="flex flex-col items-start justify-between gap-3 pb-5 pt-2 text-white/75 md:flex-row md:items-center">
            <p className="text-sm md:leading-none md:tracking-tight">
              By Maioazul AI - {formatDate(post.publishedAt ?? post.updatedAt)}
            </p>
            <BlogArticleActions shareUrl={shareUrl} title={post.title} />
          </div>
          
          {post.heroImageUrl ? (
            <img
              src={post.heroImageUrl}
              alt={post.heroImageAlt || post.title}
              className="h-[20rem] w-full rounded-3xl border border-white/10 object-cover md:h-[20rem]"
            />
          ) : null}
        </header>

        <div className="p-0 md:p-0">
          <div className="max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {post.bodyMd}
            </ReactMarkdown>
          </div>
        </div>

        <footer className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-white/50">
          Fonte de dados: {post.sourceDataset}. Este conteúdo foi gerado por IA com base em métricas
          do dashboard e pode ser ajustado por revisão editorial.
        </footer>
      </article>
    </main>
  );
}
