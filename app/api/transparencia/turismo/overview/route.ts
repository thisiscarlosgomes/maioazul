import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

/* =========================
   GET /api/turismo/overview
========================= */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year") ?? 2025);

    const client = await clientPromise;
    const db = client.db();

    const raw = db.collection("turismo_raw");
    const annualCountryIsland = db.collection("turismo_country_island_annual");
    const structural = db.collection("turismo_structural");
    const derived = db.collection("turismo_derived");

    /* =========================
       1. Aggregate raw flows
    ========================= */

    const hasAnnualIslandDataset =
      (await annualCountryIsland.countDocuments({
        year,
        granularity: "annual",
      })) > 0;

    const flows = hasAnnualIslandDataset
      ? await annualCountryIsland
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
                hospedes: { $sum: "$hospedes" },
                dormidas: { $sum: "$dormidas" },
              },
            },
            { $sort: { _id: 1 } },
          ])
          .toArray()
      : await raw
          .aggregate([
            {
              $match: {
                year,
                tipo_estabelecimento: "Todos",
                ilha: { $ne: "Todas as ilhas" },
              },
            },
            {
              $group: {
                _id: "$ilha",
                hospedes: { $sum: "$hospedes" },
                dormidas: { $sum: "$dormidas" },
              },
            },
            { $sort: { _id: 1 } },
          ])
          .toArray();

    /* =========================
       2. Avg stay (derived)
    ========================= */

    const avgStay = await derived
      .find({ year, metric: "avg_stay" })
      .toArray();

    const avgStayMap = Object.fromEntries(
      avgStay.map((r) => [r.ilha, r.value])
    );

    /* =========================
       3. Occupancy (Q3 only)
    ========================= */

    const occupancy = await structural
      .aggregate([
        {
          $match: {
            year,
            quarter: 3,
            metric: "occupancy_rate",
          },
        },
        {
          $group: {
            _id: "$ilha",
            value: { $avg: "$value" },
          },
        },
      ])
      .toArray();

    const occupancyMap = Object.fromEntries(
      occupancy.map((r) => [r._id, r.value])
    );

    /* =========================
       4. Assemble response
    ========================= */

    const islands = flows.map((r) => ({
      ilha: r._id,
      hospedes: r.hospedes,
      dormidas: r.dormidas,
      avg_stay: Number(
        (
          avgStayMap[r._id] ??
          (Number(r.hospedes ?? 0) > 0
            ? Number(r.dormidas ?? 0) / Number(r.hospedes ?? 0)
            : 0)
        ).toFixed(2)
      ),
      occupancy_rate: Number(
        (occupancyMap[r._id] ?? 0).toFixed(1)
      ),
    }));

    const national = islands.reduce(
      (acc, row) => {
        acc.hospedes += Number(row.hospedes ?? 0);
        acc.dormidas += Number(row.dormidas ?? 0);
        return acc;
      },
      { hospedes: 0, dormidas: 0 }
    );

    return NextResponse.json({
      year,
      islands,
      national,
      total: national,
      source_dataset: hasAnnualIslandDataset
        ? "turismo_country_island_annual"
        : "turismo_raw",
      updatedAt: new Date(),
      source: "INE Cabo Verde · Turismo",
    });
  } catch (err) {
    console.error("[Turismo Overview]", err);
    return NextResponse.json(
      { error: "Failed to load tourism overview" },
      { status: 500 }
    );
  }
}
