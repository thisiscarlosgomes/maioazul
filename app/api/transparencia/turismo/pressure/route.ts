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

    // 1. Dormidas per island
    const dormidas = await raw
      .aggregate([
        { $match: { year } },
        {
          $group: {
            _id: "$ilha",
            dormidas: { $sum: "$dormidas" },
          },
        },
      ])
      .toArray();

    // 2. Population per island
    const pop = await population.find({ year }).toArray();
    const popMap = Object.fromEntries(pop.map((p) => [p.ilha, p.population]));

    const data = dormidas.map((r) => {
      const residents = popMap[r._id];
      return {
        ilha: r._id,
        dormidas: r.dormidas,
        population: residents,
        pressure_index:
          typeof residents === "number" && residents > 0
            ? Number((r.dormidas / residents).toFixed(2))
            : null,
        population_missing: residents == null,
      };
    });

    return NextResponse.json({
      year,
      metric: "tourism_pressure_index",
      unit: "nights_per_resident",
      data,
      source: "INE Cabo Verde",
      updatedAt: new Date(),
    });
  } catch (err) {
    console.error("[Tourism Pressure]", err);
    return NextResponse.json([], { status: 500 });
  }
}
