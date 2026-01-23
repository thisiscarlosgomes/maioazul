import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

/* =========================
   Config
   ========================= */

const ISLANDS = ["Maio", "Sal", "Boa Vista"];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year") || 2025);

    const client = await clientPromise;
    const db = client.db();
    const col = db.collection("turismo_raw");

    const pipeline = [
      {
        $match: {
          year,
          ilha: { $in: ISLANDS },
          tipo_estabelecimento: "Todos",
        },
      },
      {
        $group: {
          _id: {
            ilha: "$ilha",
            quarter: "$quarter",
          },
          hospedes: { $sum: "$hospedes" },
          dormidas: { $sum: "$dormidas" },
        },
      },
      {
        $project: {
          _id: 0,
          ilha: "$_id.ilha",
          quarter: "$_id.quarter",
          hospedes: 1,
          dormidas: 1,
          avg_stay: {
            $cond: [
              { $gt: ["$hospedes", 0] },
              { $divide: ["$dormidas", "$hospedes"] },
              0,
            ],
          },
        },
      },
      {
        $sort: {
          quarter: 1,
          ilha: 1,
        },
      },
    ];

    const rows = await col.aggregate(pipeline).toArray();

    /* =========================
       Totals per island
       ========================= */

    const totals: Record<string, any> = {};

    for (const r of rows) {
      if (!totals[r.ilha]) {
        totals[r.ilha] = {
          hospedes: 0,
          dormidas: 0,
        };
      }
      totals[r.ilha].hospedes += r.hospedes;
      totals[r.ilha].dormidas += r.dormidas;
    }

    const summary = Object.entries(totals).map(
      ([ilha, v]: any) => ({
        ilha,
        hospedes: v.hospedes,
        dormidas: v.dormidas,
        avg_stay:
          v.hospedes > 0 ? v.dormidas / v.hospedes : 0,
      })
    );

    return NextResponse.json({
      scope: "turismo",
      dataset: "overview",
      year,
      islands: ISLANDS,
      by_quarter: rows,
      summary,
      source: "INE · Estatísticas do Turismo",
    });
  } catch (err) {
    console.error("[Turismo Overview]", err);
    return NextResponse.json([], { status: 500 });
  }
}
