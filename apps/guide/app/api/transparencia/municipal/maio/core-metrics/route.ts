import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const year = searchParams.get("year");
    const category = searchParams.get("category");
    const metric = searchParams.get("metric");

    const client = await clientPromise;
    const db = client.db();
    const col = db.collection("maio_core_metrics");

    const query: any = {
      island: "Maio",
      municipality: "Maio",
    };

    if (year) query.year = Number(year);
    if (category) query.category = category;
    if (metric) query.metric = metric;

    /* =========================
       Default: latest year
       ========================= */

    if (!year) {
      const latest = await col
        .find({ island: "Maio", municipality: "Maio" })
        .sort({ year: -1 })
        .limit(1)
        .toArray();

      if (!latest[0]) return NextResponse.json([]);

      query.year = latest[0].year;
    }

    const docs = await col
      .find(query)
      .sort({ category: 1, metric: 1 })
      .toArray();

    const data = docs.map((d) => ({
      category: d.category,
      metric: d.metric,
      value: d.value,
      unit: d.unit,
      breakdown: d.breakdown,
    }));

    return NextResponse.json({
      scope: "municipal",
      dataset: "core_metrics",
      island: "Maio",
      municipality: "Maio",
      year: query.year,
      filters: {
        category,
        metric,
      },
      data,
      updatedAt: docs[0]?.updatedAt,
      source: "INE / IMC 2024",
    });
  } catch (err) {
    console.error("[Maio Core Metrics]", err);
    return NextResponse.json([], { status: 500 });
  }
}
