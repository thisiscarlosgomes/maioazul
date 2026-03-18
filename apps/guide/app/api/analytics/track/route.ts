import { NextResponse } from "next/server";
import type { Collection, Document } from "mongodb";
import clientPromise from "@/lib/mongodb";

type TrackPayload = {
  visitorId?: unknown;
  path?: unknown;
  referrer?: unknown;
  ts?: unknown;
};

export const dynamic = "force-dynamic";
let indexesReady: Promise<void> | null = null;

function ensureIndexes(collection: Collection<Document>) {
  if (!indexesReady) {
    indexesReady = Promise.all([
      collection.createIndex({ createdAt: -1 }),
      collection.createIndex({ visitorId: 1, createdAt: -1 }),
      collection.createIndex({ path: 1, createdAt: -1 }),
    ]).then(() => undefined);
  }
  return indexesReady;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TrackPayload;
    const visitorId =
      typeof body.visitorId === "string" && body.visitorId.trim()
        ? body.visitorId.trim()
        : null;
    const path = typeof body.path === "string" && body.path.startsWith("/") ? body.path : null;

    if (!visitorId || !path) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const ts =
      typeof body.ts === "string" && !Number.isNaN(Date.parse(body.ts))
        ? new Date(body.ts)
        : new Date();

    const referrer = typeof body.referrer === "string" ? body.referrer : null;
    const ua = req.headers.get("user-agent") ?? null;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "maioazul");
    const collection = db.collection("web_events");

    await ensureIndexes(collection);

    await collection.insertOne({
      visitorId,
      path,
      referrer,
      ua,
      createdAt: ts,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
