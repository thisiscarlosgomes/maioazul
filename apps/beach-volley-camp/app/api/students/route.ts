import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import clientPromise from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim();
    const phone = String(body?.phone || "").trim();
    const age = Number(body?.age);
    const fromMaio =
      body?.fromMaio === true ||
      body?.fromMaio === "true" ||
      body?.fromMaio === "1" ||
      body?.fromMaio === "on";
    const experience = String(body?.experience || "").trim();
    const reason = String(body?.reason || "").trim();
    const applicationType = String(body?.applicationType || "general").trim();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (applicationType === "scholarship") {
      if (!fromMaio) {
        return NextResponse.json(
          { error: "Scholarship is only available for athletes from Maio." },
          { status: 400 }
        );
      }

      if (!Number.isFinite(age) || age <= 0 || age > 20) {
        return NextResponse.json(
          { error: "Scholarship is only available for athletes up to 20 years old." },
          { status: 400 }
        );
      }
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "maioazul");
    const collection = db.collection("student_leads");

    await collection.insertOne({
      name,
      email,
      phone,
      age: Number.isFinite(age) ? age : null,
      fromMaio,
      experience,
      reason,
      applicationType,
      source: "website",
      createdAt: new Date(),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/students failed", error);
    const message =
      process.env.NODE_ENV === "development"
        ? (error as Error)?.message || "Failed to submit."
        : "Failed to submit.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
