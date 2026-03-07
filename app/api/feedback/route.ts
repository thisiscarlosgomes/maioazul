import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const FEEDBACK_COLLECTION = "feedback_entries";
const ALLOWED_CATEGORIES = new Set(["sugestoes", "experiencia", "bugs"]);
const ALLOWED_SATISFACTION = new Set(["very_bad", "bad", "ok", "great"]);

type FeedbackPayload = {
  category?: string;
  feedback?: string;
  satisfaction?: string;
  sourcePath?: string;
};

function getClientAddress(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const directIp =
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("fly-client-ip");

  return directIp?.trim() || null;
}

function getUserFingerprint(request: Request) {
  const clientAddress = getClientAddress(request) ?? "unknown";
  const userAgent = request.headers.get("user-agent")?.trim() ?? "unknown";
  return createHash("sha256")
    .update(`${clientAddress}|${userAgent}`)
    .digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as FeedbackPayload;
    const category = body.category?.trim().toLowerCase();
    const feedback = body.feedback?.trim();
    const satisfaction = body.satisfaction?.trim().toLowerCase();
    const sourcePath = body.sourcePath?.trim() || "unknown";

    if (!category || !ALLOWED_CATEGORIES.has(category)) {
      return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    }

    if (!satisfaction || !ALLOWED_SATISFACTION.has(satisfaction)) {
      return NextResponse.json(
        { error: "Invalid satisfaction value." },
        { status: 400 },
      );
    }

    if (!feedback || feedback.length < 5 || feedback.length > 5000) {
      return NextResponse.json(
        { error: "Feedback must be between 5 and 5000 characters." },
        { status: 400 },
      );
    }

    const doc = {
      category,
      feedback,
      satisfaction,
      sourcePath,
      userFingerprint: getUserFingerprint(request),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!process.env.MONGODB_URI) {
      console.info("[Feedback:FALLBACK]", doc);
      return NextResponse.json({ ok: true, stored: false }, { status: 200 });
    }

    const { default: clientPromise } = await import("@/lib/mongodb");
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "maioazul");
    await db.collection(FEEDBACK_COLLECTION).insertOne(doc);

    return NextResponse.json({ ok: true, stored: true }, { status: 200 });
  } catch (error) {
    console.error("[Feedback API]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected feedback error.",
      },
      { status: 500 },
    );
  }
}
