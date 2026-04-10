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

    // Aggregate Q1, Q2, Q3 and Q4 dormidas per island from raw quarterly rows
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
    const nationalShares =
      nationalAnnual > 0
        ? {
            q1: nationalQ1 / nationalAnnual,
            q2: nationalQ2 / nationalAnnual,
            q3: nationalQ3 / nationalAnnual,
            q4: nationalQ4 / nationalAnnual,
          }
        : null;

    const rowMap = new Map<string, {
      q1_dormidas?: number;
      q2_dormidas?: number;
      q3_dormidas?: number;
      q4_dormidas?: number;
    }>(rows.map((r) => [String(r._id), r]));
    const islands = new Set<string>([
      ...Array.from(rowMap.keys()),
      ...Array.from(annualMap.keys()),
    ]);

    const data = Array.from(islands)
      .sort((a, b) => a.localeCompare(b))
      .map((ilha) => {
      const row = rowMap.get(ilha);
      const q1Reported = Number(row?.q1_dormidas ?? 0);
      const q2Reported = Number(row?.q2_dormidas ?? 0);
      const q3Reported = Number(row?.q3_dormidas ?? 0);
      const q4Reported = Number(row?.q4_dormidas ?? 0);
      const annualDormidas = annualMap.get(ilha) ?? null;

      let q1 = q1Reported;
      let q2 = q2Reported;
      let q3 = q3Reported;
      let q4 = q4Reported;
      let q4_source: "reported" | "derived_difference" | "estimated_national_share" | "missing" =
        q4Reported > 0 ? "reported" : "missing";

      // Island quarterly rows in 2025 can be partial; if they do not reconcile with annual totals,
      // allocate all quarters from annual totals using national quarter weights.
      if (ilha !== "Todas as ilhas" && annualDormidas != null) {
        const reportedSum = q1Reported + q2Reported + q3Reported + q4Reported;
        const hasConsistentQuarterly =
          reportedSum > 0 &&
          annualDormidas > 0 &&
          Math.abs(reportedSum - annualDormidas) / annualDormidas <= 0.02;

        if (hasConsistentQuarterly) {
          if (q4Reported <= 0) {
            const derivedByDifference = annualDormidas - (q1 + q2 + q3);
            if (derivedByDifference >= 0) {
              q4 = derivedByDifference;
              q4_source = "derived_difference";
            }
          }
        } else if (nationalShares) {
          q1 = Math.round(annualDormidas * nationalShares.q1);
          q2 = Math.round(annualDormidas * nationalShares.q2);
          q3 = Math.round(annualDormidas * nationalShares.q3);
          q4 = Math.max(0, annualDormidas - q1 - q2 - q3);
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
