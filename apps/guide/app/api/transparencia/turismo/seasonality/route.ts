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
    const annualCountryIsland = db.collection("turismo_country_island_annual");

    // Aggregate Q1, Q2, Q3 and Q4 dormidas per island
    const rows = await raw
      .aggregate([
        {
          $match: {
            year,
            tipo_estabelecimento: "Todos",
            quarter: { $in: [1, 2, 3, 4] },
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
            q2_dormidas: {
              $sum: {
                $cond: [
                  { $eq: ["$_id.quarter", 2] },
                  "$dormidas",
                  0,
                ],
              },
            },
            q4_dormidas: {
              $sum: {
                $cond: [
                  { $eq: ["$_id.quarter", 4] },
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

    const annualRows = await annualCountryIsland
      .aggregate([
        {
          $match: {
            year,
            granularity: "annual",
            pais: { $in: ["Cabo Verde", "Estrangeiros"] },
          },
        },
        {
          $group: {
            _id: "$ilha",
            annual_dormidas: { $sum: "$dormidas" },
          },
        },
      ])
      .toArray();

    const annualMap = new Map<string, number>(
      annualRows.map((row) => [String(row._id), Number(row.annual_dormidas ?? 0)])
    );

    const nationalRow = rows.find((r) => String(r._id) === "Todas as ilhas");
    const nationalQ1 = Number(nationalRow?.q1_dormidas ?? 0);
    const nationalQ2 = Number(nationalRow?.q2_dormidas ?? 0);
    const nationalQ3 = Number(nationalRow?.q3_dormidas ?? 0);
    const nationalQ4 = Number(nationalRow?.q4_dormidas ?? 0);
    const nationalAnnual = nationalQ1 + nationalQ2 + nationalQ3 + nationalQ4;
    const nationalQ4Share = nationalAnnual > 0 ? nationalQ4 / nationalAnnual : 0;

    const data = rows.map((r) => {
      const ilha = String(r._id);
      const q1 = Number(r.q1_dormidas ?? 0);
      const q2 = Number(r.q2_dormidas ?? 0);
      const q3 = Number(r.q3_dormidas ?? 0);
      const q4Reported = Number(r.q4_dormidas ?? 0);
      const annualDormidas = annualMap.get(ilha) ?? null;

      let q4 = q4Reported;
      let q4_source: "reported" | "derived_difference" | "estimated_national_share" | "missing" =
        q4Reported > 0 ? "reported" : "missing";

      if (q4Reported <= 0 && annualDormidas != null) {
        const derivedByDifference = annualDormidas - (q1 + q2 + q3);
        if (derivedByDifference >= 0) {
          q4 = derivedByDifference;
          q4_source = "derived_difference";
        } else if (nationalQ4Share > 0) {
          q4 = Math.round(annualDormidas * nationalQ4Share);
          q4_source = "estimated_national_share";
        }
      }

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
        ilha,
        q1_dormidas: q1,
        q2_dormidas: q2,
        q3_dormidas: q3,
        q4_dormidas: q4,
        q4_source,
        seasonality_index,
        missing_reason,
      };
    });

    return NextResponse.json({
      year,
      metric: "seasonality_index",
      definition: "Q3 dormidas / Q1 dormidas",
      supplementary_metric: "q4_dormidas",
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
