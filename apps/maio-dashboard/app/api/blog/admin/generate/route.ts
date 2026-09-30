import { NextResponse } from "next/server";
import { generateBlogDraftsFromInstruction, generateMetricBlogDrafts } from "@/lib/blog/generate";
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
    const rawBody = await request.text();
    const body = rawBody ? (JSON.parse(rawBody) as { prompt?: unknown; maxPosts?: unknown }) : {};
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const bodyMaxPosts =
      typeof body.maxPosts === "number" && Number.isFinite(body.maxPosts)
        ? body.maxPosts
        : null;

    const result = prompt
      ? await generateBlogDraftsFromInstruction({
          instruction: prompt,
          maxPosts: Math.max(1, Math.min(10, Math.floor(bodyMaxPosts ?? 3))),
        })
      : await generateMetricBlogDrafts({
          lookbackHours: parseNumber(url.searchParams.get("lookbackHours"), 24 * 14),
          maxPosts: parseNumber(url.searchParams.get("maxPosts"), 6),
        });
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
