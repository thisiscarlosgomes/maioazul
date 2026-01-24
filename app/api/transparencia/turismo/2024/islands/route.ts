import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const year = 2024;

    const rows = await db
      .collection("turismo_country_island_annual")
      .aggregate([
        { $match: { year } },
        {
          $group: {
            _id: "$ilha",
            hospedes: {
              $sum: {
                $cond: [{ $eq: ["$metric", "hospedes"] }, "$value", 0]
              }
            },
            dormidas: {
              $sum: {
                $cond: [{ $eq: ["$metric", "dormidas"] }, "$value", 0]
              }
            }
          }
        }
      ])
      .toArray();

    const islands = rows.map((r) => ({
      ilha: r._id,
      hospedes: r.hospedes,
      dormidas: r.dormidas,
      avg_stay: r.hospedes
        ? Number((r.dormidas / r.hospedes).toFixed(2))
        : 0
    }));

    return NextResponse.json({
      year,
      islands,
      updatedAt: new Date()
    });
  } catch (err) {
    console.error("[Turismo 2024 Islands]", err);
    return NextResponse.json(
      { error: "Failed to load island data" },
      { status: 500 }
    );
  }
}
