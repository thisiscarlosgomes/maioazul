import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 0;

type VisitorEventDoc = {
  visitorId: string;
  path: string;
  day: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  hits: number;
  userAgent?: string;
};

function isValidVisitorId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 100;
}

function isValidPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 256 &&
    value.startsWith("/") &&
    !value.startsWith("/api")
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { visitorId?: unknown; path?: unknown };
    if (!isValidVisitorId(body.visitorId) || !isValidPath(body.path)) {
      return NextResponse.json({ ok: false, error: "Invalid payload." }, { status: 400 });
    }

    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const { default: clientPromise } = await import("@/lib/mongodb");
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "maioazul");
    const col = db.collection<VisitorEventDoc>("visitor_events");

    await col.updateOne(
      { visitorId: body.visitorId, path: body.path, day },
      {
        $setOnInsert: {
          visitorId: body.visitorId,
          path: body.path,
          day,
          firstSeenAt: now,
        },
        $set: {
          lastSeenAt: now,
          userAgent: request.headers.get("user-agent")?.slice(0, 240) ?? undefined,
        },
        $inc: { hits: 1 },
      },
      { upsert: true },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Visitor Track]", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to track visit.",
      },
      { status: 500 },
    );
  }
}

