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

    const col = db.collection("turismo_country_island");

    const match: any = { year };
    if (ilha) match.ilha = ilha;

    const data = await col
      .aggregate([
        { $match: match },

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
      countries: r.countries.map((c: any) => ({
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

