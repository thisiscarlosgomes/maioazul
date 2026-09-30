import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

/*
 Country dependency
 = hóspedes by country / total hóspedes (per island, per year)
*/

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year") ?? 2025);
    const ilha = searchParams.get("ilha"); // optional

    const client = await clientPromise;
    const db = client.db();

    const annualCol = db.collection("turismo_country_island_annual");
    const legacyCol = db.collection("turismo_country_island");

    const match: Record<string, string | number> = { year };
    if (ilha) match.ilha = ilha;

    const annualExists = await annualCol.countDocuments({
      year,
      granularity: "annual",
    });
    const quarterlyExists = await annualCol.countDocuments({
      year,
      granularity: "quarterly",
    });

    const detailedExists = annualExists > 0 || quarterlyExists > 0;
    const granularity = annualExists > 0 ? "annual" : "quarterly";
    const sourceCollection = detailedExists ? annualCol : legacyCol;
    const sourceMatch =
      detailedExists
        ? { ...match, granularity, pais: { $ne: "Estrangeiros" } }
        : match;

    const data = await sourceCollection
      .aggregate([
        { $match: sourceMatch },

        // aggregate hóspedes per island + country
        {
          $group: {
            _id: { ilha: "$ilha", pais: "$pais" },
            hospedes: { $sum: "$hospedes" },
          },
        },

        // remove zero rows (optional but recommended)
        {
          $match: {
            hospedes: { $gt: 0 },
          },
        },

        // regroup per island
        {
          $group: {
            _id: "$_id.ilha",
            total: { $sum: "$hospedes" },
            countries: {
              $push: {
                pais: "$_id.pais",
                hospedes: "$hospedes",
              },
            },
          },
        },
      ])
      .toArray();

    const result = data.map((r) => ({
      ilha: r._id,
      total_hospedes: r.total,
      countries: r.countries.map((c: { pais: string; hospedes: number }) => ({
        pais: c.pais,
        hospedes: c.hospedes,
        share:
          r.total > 0
            ? Number((c.hospedes / r.total).toFixed(4))
            : 0,
      })),
    }));

    return NextResponse.json({
      year,
      metric: "country_dependency",
      unit: "share_of_hospedes",
      data: result,
      source_dataset:
        detailedExists
          ? `turismo_country_island_annual (${granularity})`
          : "turismo_country_island",
      updatedAt: new Date(),
    });
  } catch (err) {
    console.error("[Country Dependency]", err);
    return NextResponse.json(
      { error: "Failed to compute country dependency" },
      { status: 500 }
    );
  }
}
