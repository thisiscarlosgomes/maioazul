import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    const year = 2024;

    /* =========================
       1. Quarterly national
    ========================= */

    const quarterly = await db
      .collection("turismo_quarterly_national")
      .find({ year })
      .sort({ quarter: 1 })
      .toArray();

    /* =========================
       2. Island totals
    ========================= */

    const islandAgg = await db
      .collection("turismo_country_island_annual")
      .aggregate([
        { $match: { year } },
        {
          $group: {
            _id: { ilha: "$ilha", metric: "$metric" },
            value: { $sum: "$value" }
          }
        }
      ])
      .toArray();

    const islands: Record<string, any> = {};

    for (const r of islandAgg) {
      const ilha = r._id.ilha;
      if (!islands[ilha]) islands[ilha] = { ilha };
      islands[ilha][r._id.metric] = r.value;
    }

    /* =========================
       3. Structural establishment
    ========================= */

    const establishments = await db
      .collection("turismo_structural_country_establishment")
      .find({ year })
      .toArray();

    /* =========================
       Response
    ========================= */

    return NextResponse.json({
      year,
      quarterly,
      islands: Object.values(islands),
      establishments,
      source: "INE Cabo Verde · Turismo",
      updatedAt: new Date()
    });
  } catch (err) {
    console.error("[Turismo 2024 Overview]", err);
    return NextResponse.json(
      { error: "Failed to load 2024 tourism overview" },
      { status: 500 }
    );
  }
}
