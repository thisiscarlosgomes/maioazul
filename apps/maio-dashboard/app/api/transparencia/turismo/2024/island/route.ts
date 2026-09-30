import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ilha = searchParams.get("ilha");

    if (!ilha) {
      return NextResponse.json(
        { error: "Missing ilha parameter" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();
    const year = 2024;

    const rows = await db
      .collection("turismo_country_island_annual")
      .find({ year, ilha })
      .toArray();

    let hospedes = 0;
    let dormidas = 0;

    for (const r of rows) {
      if (r.metric === "hospedes") hospedes += r.value;
      if (r.metric === "dormidas") dormidas += r.value;
    }

    if (!hospedes && !dormidas) {
      return NextResponse.json(
        { error: "No data for island" },
        { status: 404 }
      );
    }

    /* =========================
       National totals (2024)
    ========================= */

    const national = await db
      .collection("turismo_country_island_annual")
      .aggregate([
        { $match: { year } },
        {
          $group: {
            _id: "$metric",
            total: { $sum: "$value" }
          }
        }
      ])
      .toArray();

    const natMap = Object.fromEntries(
      national.map((r) => [r._id, r.total])
    );

    const avgStay = hospedes
      ? Number((dormidas / hospedes).toFixed(2))
      : null;

    return NextResponse.json({
      year,
      ilha,
      hospedes,
      dormidas,
      avg_stay: avgStay,
      hospedesShareNational: hospedes / (natMap.hospedes || 1),
      dormidasShareNational: dormidas / (natMap.dormidas || 1),
      source: "INE Cabo Verde · Turismo",
      updatedAt: new Date()
    });
  } catch (err) {
    console.error("[TourismIslandBaseline]", err);
    return NextResponse.json(
      { error: "Failed to load island baseline" },
      { status: 500 }
    );
  }
}
