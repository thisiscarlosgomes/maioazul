import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const ilha = searchParams.get("ilha") || "Maio";
    const year = Number(searchParams.get("year") || 2025);

    const client = await clientPromise;
    const db = client.db();

    const turismo = db.collection("turismo_raw");
    const metrics = db.collection("maio_core_metrics");

    /* =========================
       1. Total dormidas (year)
       ========================= */

    const yearly = await turismo.aggregate([
      {
        $match: {
          ilha,
          year,
          tipo_estabelecimento: "Todos",
        },
      },
      {
        $group: {
          _id: null,
          dormidas_total: { $sum: "$dormidas" },
          dormidas_residentes: {
            $sum: {
              $cond: [
                { $eq: ["$nacionalidade", "Caboverdiano residente"] },
                "$dormidas",
                0,
              ],
            },
          },
        },
      },
    ]).toArray();

    if (!yearly[0]) {
      return NextResponse.json({ error: "No tourism data" }, { status: 404 });
    }

    const dormidasTotal = yearly[0].dormidas_total;
    const dormidasResidentes = yearly[0].dormidas_residentes;

    /* =========================
       2. Seasonality (Q3 vs Q1)
       ========================= */

    const seasonal = await turismo.aggregate([
      {
        $match: {
          ilha,
          year,
          quarter: { $in: [1, 3] },
          tipo_estabelecimento: "Todos",
        },
      },
      {
        $group: {
          _id: "$quarter",
          dormidas: { $sum: "$dormidas" },
        },
      },
    ]).toArray();

    const q1 = seasonal.find((d) => d._id === 1)?.dormidas || 0;
    const q3 = seasonal.find((d) => d._id === 3)?.dormidas || 0;

    const seasonalityIndex = q1 > 0 ? q3 / q1 : 0;

    /* =========================
       3. Resident population
       ========================= */

    const pop = await metrics.findOne({
      island: ilha,
      municipality: ilha,
      year,
      metric: "total_population",
    });

    const population = Number(pop?.value || 0);

    /* =========================
       Indicators
       ========================= */

    const tourismPressure =
      population > 0 ? dormidasTotal / population : 0;

    const localRetention =
      dormidasTotal > 0
        ? dormidasResidentes / dormidasTotal
        : 0;

    return NextResponse.json({
      scope: "turismo",
      dataset: "indicators",
      ilha,
      year,
      indicators: {
        tourism_pressure_index: {
          value: tourismPressure,
          unit: "nights_per_resident",
        },
        seasonality_index: {
          value: seasonalityIndex,
          definition: "Q3 dormidas / Q1 dormidas",
        },
        local_retention_proxy: {
          value: localRetention,
          unit: "ratio",
        },
      },
      components: {
        dormidas_total: dormidasTotal,
        dormidas_residentes: dormidasResidentes,
        dormidas_q1: q1,
        dormidas_q3: q3,
        population,
      },
      source: [
        "INE · Estatísticas do Turismo",
        "INE / IMC 2024 (População)",
      ],
    });
  } catch (err) {
    console.error("[Tourism Indicators]", err);
    return NextResponse.json([], { status: 500 });
  }
}
