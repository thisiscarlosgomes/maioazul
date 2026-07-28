import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

/*
 Population by island
 - total population
 - % of national population
*/

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedYearRaw = searchParams.get("year");
    const requestedYear = Number(requestedYearRaw ?? 2025);
    const islandFilterRaw = searchParams.get("ilha");
    const islandFilter = islandFilterRaw?.trim() || null;

    const client = await clientPromise;
    const db = client.db();

    const population = db.collection("population");

    /*
      Expected population collection shape:
      {
        ilha: "Maio",
        year: 2025,
        population: 6411
      }
    */

    let effectiveYear = Number.isFinite(requestedYear) ? requestedYear : 2025;
    let usedFallbackYear = false;

    let rows = await population
      .find({ year: effectiveYear })
      .project({ _id: 0, ilha: 1, population: 1 })
      .toArray();

    if (rows.length === 0) {
      const latestDoc = await population
        .find({})
        .project({ _id: 0, year: 1 })
        .sort({ year: -1 })
        .limit(1)
        .next();

      if (latestDoc?.year != null) {
        effectiveYear = Number(latestDoc.year);
        usedFallbackYear = true;
        rows = await population
          .find({ year: effectiveYear })
          .project({ _id: 0, ilha: 1, population: 1 })
          .toArray();
      }
    }

    const nationalTotal = rows.reduce(
      (sum, r) => sum + (r.population ?? 0),
      0
    );

    const mapped = rows.map((r) => ({
      ilha: r.ilha,
      population: r.population,
      population_share_national:
        nationalTotal > 0
          ? Number(((r.population / nationalTotal) * 100).toFixed(2))
          : null,
    }));
    const data = islandFilter
      ? mapped.filter((row) => row.ilha?.toLowerCase() === islandFilter.toLowerCase())
      : mapped;

    return NextResponse.json({
      requested_year: Number.isFinite(requestedYear) ? requestedYear : null,
      year: effectiveYear,
      metric: "population",
      unit: "residents",
      data,
      national_total: nationalTotal,
      ilha: islandFilter,
      fallback_year_used: usedFallbackYear,
      source: "INE Cabo Verde",
      updatedAt: new Date(),
    });
  } catch (err) {
    console.error("[Population]", err);
    return NextResponse.json(
      { error: "Failed to load population data" },
      { status: 500 }
    );
  }
}
