import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

/*
 Tourism Pressure Index
 = total dormidas / resident population
*/

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year") ?? 2025);

    const client = await clientPromise;
    const db = client.db();

    const raw = db.collection("turismo_raw");
    const population = db.collection("population"); // assumed existing

    /* =========================
       1. Aggregate tourism flows
    ========================= */

    const flows = await raw
      .aggregate([
        { $match: { year } },
        {
          $group: {
            _id: "$ilha",
            dormidas: { $sum: "$dormidas" },
            hospedes: { $sum: "$hospedes" },
          },
        },
      ])
      .toArray();

    /* =========================
       2. Population lookup
    ========================= */

    const popRows = await population.find({ year }).toArray();
    const popMap = Object.fromEntries(
      popRows.map((p) => [p.ilha, p.population])
    );

    /* =========================
       3. Per-island pressure
    ========================= */

    const islandData = flows.map((r) => {
      const residents = popMap[r._id];

      return {
        ilha: r._id,
        dormidas: r.dormidas,
        hospedes: r.hospedes,
        population: residents,
        pressure_index:
          typeof residents === "number" && residents > 0
            ? Number((r.dormidas / residents).toFixed(2))
            : null,
        population_missing: residents == null,
      };
    });

    /* =========================
       4. National aggregation
    ========================= */

    const totalDormidas = islandData.reduce(
      (s, r) => s + (r.dormidas || 0),
      0
    );
    const totalHospedes = islandData.reduce(
      (s, r) => s + (r.hospedes || 0),
      0
    );
    const totalPopulation = popRows.reduce(
      (s, r) => s + (r.population || 0),
      0
    );

    const nationalRow =
      totalPopulation > 0
        ? {
            ilha: "Todas as ilhas",
            dormidas: totalDormidas,
            hospedes: totalHospedes,
            population: totalPopulation,
            pressure_index: Number(
              (totalDormidas / totalPopulation).toFixed(2)
            ),
            population_missing: false,
          }
        : null;

    /* =========================
       5. Final response
    ========================= */

    return NextResponse.json({
      year,
      metric: "tourism_pressure_index",
      unit: "nights_per_resident",
      data: nationalRow
        ? [nationalRow, ...islandData]
        : islandData,
      source: "INE Cabo Verde · Turismo + População",
      updatedAt: new Date(),
    });
  } catch (err) {
    console.error("[Tourism Pressure]", err);
    return NextResponse.json(
      { error: "Failed to compute tourism pressure index" },
      { status: 500 }
    );
  }
}
