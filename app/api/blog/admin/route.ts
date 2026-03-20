import { NextResponse } from "next/server";
import { listBlogPosts, updateBlogPostStatus } from "@/lib/blog/repository";
import type { BlogPostStatus } from "@/lib/blog/types";
import { isAdminAuthenticatedRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";

type BlogAdminAction = "approve" | "publish" | "move_to_draft";

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
    if (action !== "approve" && action !== "publish" && action !== "move_to_draft") {
      return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
    }

    const updated = await updateBlogPostStatus(id, toTargetStatus(action));
    if (!updated) {
      return NextResponse.json({ ok: false, error: "Not found or unchanged" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[blog-admin] failed to update", error);
    return NextResponse.json({ ok: false, error: "Failed to update status" }, { status: 500 });
  }
}
