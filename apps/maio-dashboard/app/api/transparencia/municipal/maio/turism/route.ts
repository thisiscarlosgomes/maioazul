import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const ilha = searchParams.get("ilha");
    const year = searchParams.get("year");
    const quarter = searchParams.get("quarter");
    const tipo = searchParams.get("tipo_estabelecimento");
    const nacionalidade = searchParams.get("nacionalidade");

    const client = await clientPromise;
    const db = client.db();
    const col = db.collection("turismo_raw");

    const query: any = {};

    if (ilha) query.ilha = ilha;
    if (year) query.year = Number(year);
    if (quarter) query.quarter = Number(quarter);
    if (tipo) query.tipo_estabelecimento = tipo;
    if (nacionalidade) query.nacionalidade = nacionalidade;

    /* =========================
       Default: latest year
       ========================= */

    if (!year) {
      const latest = await col
        .find({})
        .sort({ year: -1 })
        .limit(1)
        .toArray();

      if (!latest[0]) return NextResponse.json([]);

      query.year = latest[0].year;
    }

    const docs = await col
      .find(query)
      .sort({ quarter: 1, ilha: 1 })
      .toArray();

    const data = docs.map((d) => {
  const hospedes = Number(d.hospedes || 0);
  const dormidas = Number(d.dormidas || 0);

  return {
    year: d.year,
    quarter: d.quarter,
    ilha: d.ilha,
    tipo_estabelecimento: d.tipo_estabelecimento,
    nacionalidade: d.nacionalidade,
    hospedes,
    dormidas,
    avg_stay: hospedes > 0 ? dormidas / hospedes : 0,
  };
});


    return NextResponse.json({
      scope: "turismo",
      dataset: "hospedes_dormidas",
      filters: { ilha, year, quarter, tipo, nacionalidade },
      data,
      updatedAt: docs[0]?.updatedAt,
      source: "INE · Estatísticas do Turismo",
    });
  } catch (err) {
    console.error("[Turismo API]", err);
    return NextResponse.json([], { status: 500 });
  }
}
