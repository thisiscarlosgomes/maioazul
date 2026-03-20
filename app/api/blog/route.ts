import { NextResponse } from "next/server";
import { listBlogPosts } from "@/lib/blog/repository";
import type { BlogPostStatus } from "@/lib/blog/types";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 60;

function normalizeLimit(raw: string | null): number {
  const parsed = Number(raw ?? DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(parsed)));
}

function normalizeStatus(raw: string | null): BlogPostStatus | "all" {
  if (raw === "draft" || raw === "approved" || raw === "published" || raw === "all") {
    return raw;
  }
  return "published";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = normalizeLimit(searchParams.get("limit"));
    const status = normalizeStatus(searchParams.get("status"));
    const items = await listBlogPosts({ limit, status });

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("[blog] failed to list posts", error);
    return NextResponse.json(
      {
        ok: false,
        generatedAt: new Date().toISOString(),
        count: 0,
        items: [],
      },
      { status: 500 }
    );
  }
}

