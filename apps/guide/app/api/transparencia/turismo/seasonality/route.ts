import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

/*
 Seasonality Index
 = Q3 dormidas / Q1 dormidas
*/

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year") ?? 2025);

    const client = await clientPromise;
    const db = client.db();
    const raw = db.collection("turismo_raw");

    // Aggregate Q1 and Q3 dormidas per island
    const rows = await raw
      .aggregate([
        {
          $match: {
            year,
            quarter: { $in: [1, 3] },
          },
        },
        {
          $group: {
            _id: {
              ilha: "$ilha",
              quarter: "$quarter",
            },
            dormidas: { $sum: "$dormidas" },
          },
        },
        {
          $group: {
            _id: "$_id.ilha",
            q1_dormidas: {
              $sum: {
                $cond: [
                  { $eq: ["$_id.quarter", 1] },
                  "$dormidas",
                  0,
                ],
              },
            },
            q3_dormidas: {
              $sum: {
                $cond: [
                  { $eq: ["$_id.quarter", 3] },
                  "$dormidas",
                  0,
                ],
              },
            },
          },
        },
        { $sort: { "_id": 1 } },
      ])
      .toArray();

    const data = rows.map((r) => {
      const q1 = r.q1_dormidas;
      const q3 = r.q3_dormidas;

      const hasQ1 = typeof q1 === "number" && q1 > 0;
      const hasQ3 = typeof q3 === "number" && q3 > 0;

      let seasonality_index: number | null = null;
      let missing_reason: string | null = null;

      if (hasQ1 && hasQ3) {
        seasonality_index = Number((q3 / q1).toFixed(2));
      } else if (!hasQ1 && hasQ3) {
        missing_reason = "missing_q1";
      } else if (hasQ1 && !hasQ3) {
        missing_reason = "missing_q3";
      } else {
        missing_reason = "missing_q1_q3";
      }

      return {
        ilha: r._id,
        q1_dormidas: q1,
        q3_dormidas: q3,
        seasonality_index,
        missing_reason,
      };
    });

    return NextResponse.json({
      year,
      metric: "seasonality_index",
      definition: "Q3 dormidas / Q1 dormidas",
      data,
      updatedAt: new Date(),
    });
  } catch (err) {
    console.error("[Seasonality Index]", err);
    return NextResponse.json(
      { error: "Failed to compute seasonality index" },
      { status: 500 }
    );
  }
}
