import { NextResponse } from "next/server";
import {
  deleteBlogPost,
  getBlogPostById,
  listBlogPosts,
  updateBlogPostContent,
  updateBlogPostImage,
  updateBlogPostStatus,
} from "@/lib/blog/repository";
import type { BlogPostStatus } from "@/lib/blog/types";
import { isAdminAuthenticatedRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { generateBlogHeroImage } from "@/lib/blog/images";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

type BlogAdminAction =
  | "approve"
  | "publish"
  | "move_to_draft"
  | "discard"
  | "update"
  | "generate_image";

function toTargetStatus(action: BlogAdminAction): BlogPostStatus {
  if (action === "approve") return "approved";
  if (action === "publish") return "published";
  return "draft";
}

export async function GET(req: Request) {
  if (!isAdminAuthenticatedRequest(req)) {
    return unauthorizedAdminResponse();
  }
  try {
    const items = await listBlogPosts({ status: "all", limit: 100 });
    return NextResponse.json({ ok: true, count: items.length, items });
  } catch (error) {
    console.error("[blog-admin] failed to list", error);
    return NextResponse.json({ ok: false, count: 0, items: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAdminAuthenticatedRequest(req)) {
    return unauthorizedAdminResponse();
  }
  try {
    const body = await req.json().catch(() => ({}));
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const action = body?.action as BlogAdminAction;

    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }
    if (
      action !== "approve" &&
      action !== "publish" &&
      action !== "move_to_draft" &&
      action !== "discard" &&
      action !== "update" &&
      action !== "generate_image"
    ) {
      return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
    }

    if (action === "update") {
      const title = String(body?.title ?? "").trim();
      const summary = String(body?.summary ?? "").trim();
      const bodyMd = String(body?.bodyMd ?? "").trim();
      if (!title || !summary || !bodyMd) {
        return NextResponse.json({ ok: false, error: "Missing content fields" }, { status: 400 });
      }
    }

    if (action === "generate_image") {
      const post = await getBlogPostById(id);
      if (!post) {
        return NextResponse.json({ ok: false, error: "Not found or unchanged" }, { status: 404 });
      }
      const image = await generateBlogHeroImage({
        title: post.title,
        summary: post.summary,
        bodyMd: post.bodyMd,
        slugSeed: post.slug,
        promptOverride:
          typeof body?.imagePrompt === "string" ? body.imagePrompt.trim() : undefined,
      });
      if (!image?.url) {
        return NextResponse.json({ ok: false, error: "Failed to generate image" }, { status: 404 });
      }

      const saved = await updateBlogPostImage(id, {
        heroImageUrl: image.url,
        heroImageAlt: image.alt ?? post.title,
      });
      if (!saved) {
        return NextResponse.json({ ok: false, error: "Failed to save image" }, { status: 500 });
      }
      return NextResponse.json({
        ok: true,
        heroImageUrl: image.url,
        heroImageAlt: image.alt ?? post.title,
      });
    }

    const updated =
      action === "discard"
        ? await deleteBlogPost(id)
        : action === "update"
        ? await updateBlogPostContent(id, {
            title: String(body?.title ?? "").trim(),
            summary: String(body?.summary ?? "").trim(),
            bodyMd: String(body?.bodyMd ?? "").trim(),
            heroImageUrl:
              typeof body?.heroImageUrl === "string" ? body.heroImageUrl.trim() : null,
            heroImageAlt:
              typeof body?.heroImageAlt === "string" ? body.heroImageAlt.trim() : null,
          })
        : await updateBlogPostStatus(id, toTargetStatus(action));

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "Not found or unchanged" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[blog-admin] failed to update", error);
    return NextResponse.json({ ok: false, error: "Failed to update status" }, { status: 500 });
  }
}
