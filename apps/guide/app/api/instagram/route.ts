import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 900;

const GRAPH_API_VERSION = "v25.0";
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
const DEFAULT_LIMIT = 16;
const MAX_LIMIT = 30;

type GraphError = {
  message?: string;
  code?: number;
  type?: string;
  fbtrace_id?: string;
};

type HashtagSearchResponse = {
  data?: Array<{ id: string }>;
  error?: GraphError;
};

type GraphMediaItem = {
  id: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  caption?: string;
};

type RecentMediaResponse = {
  data?: GraphMediaItem[];
  error?: GraphError;
};

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function parseHashtag(value: string | null): string {
  const raw = (value ?? "ilhadomaio").trim().toLowerCase();
  const withoutHash = raw.startsWith("#") ? raw.slice(1) : raw;
  return withoutHash.replace(/[^a-z0-9_.]/g, "");
}

function graphErrorMessage(payload?: GraphError): string {
  if (!payload) return "Instagram Graph API request failed";
  return payload.message ?? `Instagram Graph API request failed (code ${payload.code ?? "unknown"})`;
}

export async function GET(req: Request) {
  const token = process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN;
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!token || !igUserId) {
    return NextResponse.json(
      {
        error:
          "Missing Instagram Graph API configuration. Set INSTAGRAM_GRAPH_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID.",
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const hashtag = parseHashtag(searchParams.get("hashtag"));
  const limit = parseLimit(searchParams.get("limit"));

  if (!hashtag) {
    return NextResponse.json({ error: "Invalid hashtag" }, { status: 400 });
  }

  try {
    const hashtagSearchParams = new URLSearchParams({
      user_id: igUserId,
      q: hashtag,
      access_token: token,
    });

    const hashtagResponse = await fetch(`${GRAPH_BASE_URL}/ig_hashtag_search?${hashtagSearchParams.toString()}`, {
      next: { revalidate },
    });
    const hashtagPayload = (await hashtagResponse.json()) as HashtagSearchResponse;

    if (!hashtagResponse.ok || !hashtagPayload.data?.[0]?.id) {
      return NextResponse.json(
        { error: graphErrorMessage(hashtagPayload.error) },
        { status: hashtagResponse.status || 502 }
      );
    }

    const hashtagId = hashtagPayload.data[0].id;
    const mediaParams = new URLSearchParams({
      user_id: igUserId,
      fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
      limit: String(limit),
      access_token: token,
    });

    const mediaResponse = await fetch(`${GRAPH_BASE_URL}/${hashtagId}/recent_media?${mediaParams.toString()}`, {
      next: { revalidate },
    });
    const mediaPayload = (await mediaResponse.json()) as RecentMediaResponse;

    if (!mediaResponse.ok || !mediaPayload.data) {
      return NextResponse.json(
        { error: graphErrorMessage(mediaPayload.error) },
        { status: mediaResponse.status || 502 }
      );
    }

    const items = mediaPayload.data
      .map((item) => ({
        id: item.id,
        media_type: item.media_type,
        media_url: item.media_url ?? item.thumbnail_url ?? "",
        permalink: item.permalink ?? "",
        caption: item.caption,
      }))
      .filter((item) => Boolean(item.media_url) && Boolean(item.permalink));

    return NextResponse.json(
      {
        hashtag,
        source: "instagram_graph_api",
        count: items.length,
        items,
      },
      {
        headers: {
          "Cache-Control": "s-maxage=900, stale-while-revalidate=3600",
        },
      }
    );
  } catch (error) {
    console.error("Failed to load Instagram hashtag media", error);
    return NextResponse.json({ error: "Failed to load Instagram data" }, { status: 502 });
  }
}
