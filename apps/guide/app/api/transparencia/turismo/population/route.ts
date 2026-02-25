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
    const year = Number(searchParams.get("year") ?? 2025);

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

    const rows = await population
      .find({ year })
      .project({ _id: 0, ilha: 1, population: 1 })
      .toArray();

    const nationalTotal = rows.reduce(
      (sum, r) => sum + (r.population ?? 0),
      0
    );

    const data = rows.map((r) => ({
      ilha: r.ilha,
      population: r.population,
      population_share_national:
        nationalTotal > 0
          ? Number(((r.population / nationalTotal) * 100).toFixed(2))
          : null,
    }));

    return NextResponse.json({
      year,
      metric: "population",
      unit: "residents",
      data,
      national_total: nationalTotal,
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
