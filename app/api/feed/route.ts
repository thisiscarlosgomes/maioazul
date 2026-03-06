import { NextResponse } from "next/server";
import { MANUAL_FEED_UPDATES } from "@/lib/feed/manual-updates";

export const revalidate = 300;

type FeedItem = {
  id: string;
  title: string;
  detail: string;
  source: string;
  updatedAt: string;
  href: string;
  tone: "data" | "place" | "system";
};

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 60;

function normalizeLimit(rawLimit: string | null): number {
  const parsed = Number(rawLimit ?? DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(parsed)));
}

export async function GET(req: Request) {
  const limit = normalizeLimit(new URL(req.url).searchParams.get("limit"));

  try {
    const items: FeedItem[] = [...MANUAL_FEED_UPDATES]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);

    return NextResponse.json(
      {
        ok: true,
        generatedAt: new Date().toISOString(),
        count: items.length,
        items,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",
        },
      }
    );
  } catch (error) {
    console.error("[feed] failed to build feed", error);
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
