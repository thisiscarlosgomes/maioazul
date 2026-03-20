import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getBlogPostBySlug } from "@/lib/blog/repository";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";
import AdminBlogEditor from "./AdminBlogEditor";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export default async function AdminBlogPreviewPage({ params }: Params) {
  const jar = await cookies();
  const token = jar.get(ADMIN_SESSION_COOKIE)?.value ?? null;
  if (!verifyAdminSessionToken(token)) {
    redirect("/admin");
  }

  const { slug } = await params;
  if (!slug || !slug.trim()) {
    notFound();
  }

  const post = await getBlogPostBySlug(slug.trim());
  if (!post) {
    notFound();
  }

  return <AdminBlogEditor post={post} />;
}
