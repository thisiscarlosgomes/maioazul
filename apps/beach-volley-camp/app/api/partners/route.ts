import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import clientPromise from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim();
    const message = String(body?.message || "").trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "maioazul");
    const collection = db.collection("partner_leads");

    await collection.insertOne({
      name,
      email,
      message,
      source: "website",
      createdAt: new Date(),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/partners failed", error);
    const message =
      process.env.NODE_ENV === "development"
        ? (error as Error)?.message || "Failed to submit."
        : "Failed to submit.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
