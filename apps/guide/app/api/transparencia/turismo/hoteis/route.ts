import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

/* =========================
   GET /api/estabelecimentos/overview
========================= */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year") ?? 2024);

    const client = await clientPromise;
    const db = client.db();

    const raw = db.collection("estabelecimentos_raw");

    /* =========================
       1. Aggregate by island + type + metric
    ========================= */

    const rows = await raw
      .aggregate([
        { $match: { year } },
        {
          $group: {
            _id: {
              ilha: "$ilha",
              tipo: "$tipo_estabelecimento",
              metric: "$metric",
            },
            total: { $sum: "$value" },
          },
        },
      ])
      .toArray();

    /* =========================
       2. Normalize structure
    ========================= */

    const islandMap: Record<
      string,
      {
        ilha: string;
        totals: {
          establishments: number;
          staff: number;
          staff_per_establishment: number;
        };
        by_type: Record<
          string,
          {
            establishments: number;
            staff: number;
            staff_per_establishment: number;
          }
        >;
      }
    > = {};

    for (const r of rows) {
      const ilha = r._id.ilha;
      const tipo = r._id.tipo;
      const metric = r._id.metric;

      if (!islandMap[ilha]) {
        islandMap[ilha] = {
          ilha,
          totals: {
            establishments: 0,
            staff: 0,
            staff_per_establishment: 0,
          },
          by_type: {},
        };
      }

      if (!islandMap[ilha].by_type[tipo]) {
        islandMap[ilha].by_type[tipo] = {
          establishments: 0,
          staff: 0,
          staff_per_establishment: 0,
        };
      }

      if (metric === "establishments_count") {
        islandMap[ilha].totals.establishments += r.total;
        islandMap[ilha].by_type[tipo].establishments += r.total;
      }

      if (metric === "staff_count") {
        islandMap[ilha].totals.staff += r.total;
        islandMap[ilha].by_type[tipo].staff += r.total;
      }
    }

    /* =========================
       3. Compute ratios
    ========================= */

    for (const island of Object.values(islandMap)) {
      island.totals.staff_per_establishment =
        island.totals.establishments > 0
          ? Number(
              (
                island.totals.staff /
                island.totals.establishments
              ).toFixed(2)
            )
          : 0;

      for (const type of Object.values(island.by_type)) {
        type.staff_per_establishment =
          type.establishments > 0
            ? Number(
                (
                  type.staff / type.establishments
                ).toFixed(2)
              )
            : 0;
      }
    }

    /* =========================
       4. Response
    ========================= */

    return NextResponse.json({
      year,
      islands: Object.values(islandMap),
      updatedAt: new Date(),
      source:
        "INE Cabo Verde · Inventário Anual de Estabelecimentos Hoteleiros",
    });
  } catch (err) {
    console.error(
      "[Estabelecimentos Overview]",
      err
    );
    return NextResponse.json(
      {
        error:
          "Failed to load establishments overview",
      },
      { status: 500 }
    );
  }
}
