import { NextResponse } from "next/server";
import { generateMetricBlogDrafts } from "@/lib/blog/generate";
import { isAdminAuthenticatedRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";

function parseNumber(value: string | null, fallback: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function isAuthorized(request: Request) {
  const secret = process.env.BLOG_CRON_SECRET;
  if (!secret) return true;
  const header = request.headers.get("x-blog-secret");
  return header === secret;
}

export async function POST(request: Request) {
  try {
    const isAdminSession = isAdminAuthenticatedRequest(request);
    const hasCronSecret = isAuthorized(request);
    if (!isAdminSession && !hasCronSecret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const lookbackHours = parseNumber(url.searchParams.get("lookbackHours"), 24 * 14);
    const maxPosts = parseNumber(url.searchParams.get("maxPosts"), 6);
    const result = await generateMetricBlogDrafts({ lookbackHours, maxPosts });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[blog-admin-generate] failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to generate drafts",
      },
      { status: 500 }
    );
  }
}
