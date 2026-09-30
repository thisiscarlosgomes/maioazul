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
    const annualCountryIsland = db.collection("turismo_country_island_annual");
    const population = db.collection("population"); // assumed existing

    /* =========================
       1. Aggregate tourism flows
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
                dormidas: { $sum: "$dormidas" },
                hospedes: { $sum: "$hospedes" },
              },
            },
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
                dormidas: { $sum: "$dormidas" },
                hospedes: { $sum: "$hospedes" },
              },
            },
          ])
          .toArray();

    /* =========================
       2. Population lookup
    ========================= */

    let populationReferenceYear = year;
    let popRows = await population.find({ year }).toArray();

    if (popRows.length === 0) {
      const latestPopulation = await population
        .find({ year: { $lte: year } })
        .project({ _id: 0, year: 1 })
        .sort({ year: -1 })
        .limit(1)
        .next();

      if (latestPopulation?.year != null) {
        populationReferenceYear = Number(latestPopulation.year);
        popRows = await population.find({ year: populationReferenceYear }).toArray();
      }
    }

    const usesPopulationReference = populationReferenceYear !== year;
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
        population_reference_year: populationReferenceYear,
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
            population_reference_year: populationReferenceYear,
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
      period: hasAnnualIslandDataset ? "annual" : "published_quarters",
      population_reference_year: populationReferenceYear,
      population_reference_used: usesPopulationReference,
      data: nationalRow
        ? [nationalRow, ...islandData]
        : islandData,
      source_dataset: hasAnnualIslandDataset
        ? "turismo_country_island_annual"
        : "turismo_raw",
      methodology: usesPopulationReference
        ? `Dormidas de ${year} disponíveis até ao último trimestre publicado / população residente de ${populationReferenceYear}.`
        : `Dormidas de ${year} / população residente de ${year}.`,
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
