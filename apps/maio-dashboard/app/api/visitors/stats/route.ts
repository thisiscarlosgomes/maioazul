import { NextResponse } from "next/server";
import { isAdminAuthenticatedRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const revalidate = 0;

type VisitorEventDoc = {
  visitorId: string;
  path: string;
  day: string;
  lastSeenAt?: Date | string;
  hits?: number;
};

type DailyRow = {
  date: string;
  pageviews: number;
  unique_visitors: number;
};

type TopPageRow = {
  path: string;
  pageviews: number;
  unique_visitors: number;
};

export async function GET(request: Request) {
  if (!isAdminAuthenticatedRequest(request)) {
    return unauthorizedAdminResponse();
  }
  try {
    const { default: clientPromise } = await import("@/lib/mongodb");
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "maioazul");
    const col = db.collection<VisitorEventDoc>("visitor_events");

    const sinceDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const sinceDay = sinceDate.toISOString().slice(0, 10);

    const [totals, uniqueVisitorsTotal, lastVisitDoc, recentDaily, topPages] = await Promise.all([
      col
        .aggregate<{ total_pageviews: number; pageviews_7d: number }>([
          {
            $group: {
              _id: null,
              total_pageviews: { $sum: { $ifNull: ["$hits", 0] } },
              pageviews_7d: {
                $sum: {
                  $cond: [{ $gte: ["$day", sinceDay] }, { $ifNull: ["$hits", 0] }, 0],
                },
              },
            },
          },
        ])
        .toArray(),
      col.distinct("visitorId").then((rows) => rows.length),
      col.findOne({}, { sort: { lastSeenAt: -1 }, projection: { _id: 0, lastSeenAt: 1 } }),
      col
        .aggregate<DailyRow>([
          { $match: { day: { $gte: sinceDay } } },
          {
            $group: {
              _id: "$day",
              pageviews: { $sum: { $ifNull: ["$hits", 0] } },
              visitors: { $addToSet: "$visitorId" },
            },
          },
          {
            $project: {
              _id: 0,
              date: "$_id",
              pageviews: 1,
              unique_visitors: { $size: "$visitors" },
            },
          },
          { $sort: { date: -1 } },
          { $limit: 7 },
        ])
        .toArray(),
      col
        .aggregate<TopPageRow>([
          { $match: { day: { $gte: sinceDay } } },
          {
            $group: {
              _id: "$path",
              pageviews: { $sum: { $ifNull: ["$hits", 0] } },
              visitors: { $addToSet: "$visitorId" },
            },
          },
          {
            $project: {
              _id: 0,
              path: "$_id",
              pageviews: 1,
              unique_visitors: { $size: "$visitors" },
            },
          },
          { $sort: { pageviews: -1 } },
          { $limit: 10 },
        ])
        .toArray(),
    ]);

    const uniqueVisitors7d = await col.distinct("visitorId", { day: { $gte: sinceDay } });

    return NextResponse.json({
      ok: true,
      global: {
        total_pageviews: totals[0]?.total_pageviews ?? 0,
        pageviews_7d: totals[0]?.pageviews_7d ?? 0,
        unique_visitors_total: uniqueVisitorsTotal,
        unique_visitors_7d: uniqueVisitors7d.length,
        last_visit_at: lastVisitDoc?.lastSeenAt ?? null,
      },
      recentDaily,
      topPages,
    });
  } catch (error) {
    console.error("[Visitor Stats]", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load visitor stats.",
      },
      { status: 500 },
    );
  }
}
