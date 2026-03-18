import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

type TopPage = {
  path: string;
  views: number;
  uniqueUsers: number;
};

type DailyPoint = {
  day: string;
  views: number;
  uniqueUsers: number;
};

type QueryOptions = {
  days: number;
};

function parseOptions(req: Request): QueryOptions {
  const { searchParams } = new URL(req.url);
  const rawDays = Number(searchParams.get("days") ?? "7");
  const days = Number.isFinite(rawDays) ? Math.min(90, Math.max(1, Math.floor(rawDays))) : 7;
  return { days };
}

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { days } = parseOptions(req);
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "maioazul");
    const collection = db.collection("web_events");

    const [pageViews, distinctVisitors, topPagesRaw, dailyRaw] = await Promise.all([
      collection.countDocuments({ createdAt: { $gte: from } }),
      collection.distinct("visitorId", { createdAt: { $gte: from } }),
      collection
        .aggregate<{
          _id: string;
          views: number;
          users: string[];
        }>([
          { $match: { createdAt: { $gte: from } } },
          { $group: { _id: "$path", views: { $sum: 1 }, users: { $addToSet: "$visitorId" } } },
          { $sort: { views: -1 } },
          { $limit: 15 },
        ])
        .toArray(),
      collection
        .aggregate<{
          _id: string;
          views: number;
          users: string[];
        }>([
          { $match: { createdAt: { $gte: from } } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" },
              },
              views: { $sum: 1 },
              users: { $addToSet: "$visitorId" },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
    ]);

    const topPages: TopPage[] = topPagesRaw.map((row) => ({
      path: row._id || "/",
      views: row.views,
      uniqueUsers: row.users.length,
    }));

    const daily: DailyPoint[] = dailyRaw.map((row) => ({
      day: row._id,
      views: row.views,
      uniqueUsers: row.users.length,
    }));

    return NextResponse.json({
      rangeDays: days,
      summary: {
        users: distinctVisitors.length,
        pageViews,
        pagesTracked: topPages.length,
      },
      topPages,
      daily,
    });
  } catch {
    return NextResponse.json(
      {
        rangeDays: 7,
        summary: { users: 0, pageViews: 0, pagesTracked: 0 },
        topPages: [],
        daily: [],
      },
      { status: 500 }
    );
  }
}
