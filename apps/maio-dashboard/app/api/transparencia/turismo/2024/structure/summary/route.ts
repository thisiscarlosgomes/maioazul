import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const year = 2024;

    const rows = await db
      .collection("turismo_structural_country_establishment")
      .find({ year })
      .toArray();

    const buckets: Record<string, { hotel: number; total: number }> = {
      Estrangeiros: { hotel: 0, total: 0 },
      "Cabo Verde": { hotel: 0, total: 0 },
    };

    for (const r of rows) {
      const bucket = buckets[r.pais];
      if (!bucket) continue;

      bucket.total += r.value;

      if (r.tipo_estabelecimento === "Hotéis") {
        bucket.hotel += r.value;
      }
    }

    const result = {
      year,
      foreign: {
        hotel_share: buckets.Estrangeiros.hotel / buckets.Estrangeiros.total,
        non_hotel_share:
          1 - buckets.Estrangeiros.hotel / buckets.Estrangeiros.total,
      },
      domestic: {
        hotel_share:
          buckets["Cabo Verde"].hotel / buckets["Cabo Verde"].total,
        non_hotel_share:
          1 - buckets["Cabo Verde"].hotel / buckets["Cabo Verde"].total,
      },
      updatedAt: new Date(),
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[TourismStructuralBaseline]", err);
    return NextResponse.json(
      { error: "Failed to load structural baseline" },
      { status: 500 }
    );
  }
}
