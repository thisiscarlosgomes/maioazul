import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 0;

type ChatStatsDoc = {
  _id: string;
  kind: "global" | "daily";
  date?: string;
  updatedAt?: Date | string;
  lastMessageAt?: Date | string;
  requests_total?: number;
  successful_requests_total?: number;
  rate_limited_requests_total?: number;
  failed_requests_total?: number;
  user_messages_total?: number;
  assistant_messages_total?: number;
  tool_calls_total?: number;
  by_surface?: Record<string, Record<string, number>>;
};

type ChatUserDoc = {
  _id: string;
  firstSeenAt?: Date | string;
  lastSeenAt?: Date | string;
};

export async function GET() {
  try {
    const { default: clientPromise } = await import("@/lib/mongodb");
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "maioazul");
    const col = db.collection<ChatStatsDoc>("chat_usage_stats");
    const usersCol = db.collection<ChatUserDoc>("chat_users");
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last48Hours = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const [globalDoc, recentDaily, totalUsers, activeUsers24h, activeUsers48h] = await Promise.all([
      col.findOne(
        { _id: "global" },
        {
          projection: {
            _id: 0,
            kind: 1,
            updatedAt: 1,
            lastMessageAt: 1,
            requests_total: 1,
            successful_requests_total: 1,
            rate_limited_requests_total: 1,
            failed_requests_total: 1,
            user_messages_total: 1,
            assistant_messages_total: 1,
            tool_calls_total: 1,
            by_surface: 1,
          },
        },
      ),
      col
        .find(
          { kind: "daily" },
          {
            projection: {
              _id: 0,
              date: 1,
              requests_total: 1,
              successful_requests_total: 1,
              rate_limited_requests_total: 1,
              failed_requests_total: 1,
              user_messages_total: 1,
              assistant_messages_total: 1,
              tool_calls_total: 1,
            },
          },
        )
        .sort({ date: -1 })
        .limit(7)
        .toArray(),
      usersCol.countDocuments({}),
      usersCol.countDocuments({ lastSeenAt: { $gte: last24Hours } }),
      usersCol.countDocuments({ lastSeenAt: { $gte: last48Hours } }),
    ]);

    return NextResponse.json({
      ok: true,
      global: globalDoc
        ? {
            ...globalDoc,
            total_users: totalUsers,
            active_users_24h: activeUsers24h,
            active_users_48h: activeUsers48h,
          }
        : {
            total_users: totalUsers,
            active_users_24h: activeUsers24h,
            active_users_48h: activeUsers48h,
          },
      recentDaily,
    });
  } catch (error) {
    console.error("[Chat Stats]", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load chat stats.",
      },
      { status: 500 },
    );
  }
}
