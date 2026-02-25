import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const municipio = searchParams.get("municipio");
    const year = searchParams.get("year");
    const financiador = searchParams.get("financiador");

    if (!municipio) {
      return NextResponse.json(
        { error: "municipio is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();
    const col = db.collection("transparencia_raw");

    let key: string;

    if (financiador) {
      if (!year) {
        return NextResponse.json(
          { error: "year is required when filtering by financiador" },
          { status: 400 }
        );
      }

      key = `transf:${year}:${municipio}:${financiador}`;
    } else if (year) {
      key = `transf:${year}:${municipio}`;
    } else {
      // default: latest available year
      const latest = await col
        .find({ key: new RegExp(`^transf:\\d{4}:${municipio}$`) })
        .sort({ "meta.year": -1 })
        .limit(1)
        .toArray();

      if (!latest[0]) return NextResponse.json([]);

      key = latest[0].key;
    }

    const doc = await col.findOne({ key });

    if (!doc || !Array.isArray(doc.data)) {
      return NextResponse.json([]);
    }

    const data = doc.data.map((r: any) => ({
      month: Number(r.MES),
      valor_pago: Number(r.VALOR_PAGO ?? 0),
      sigla: r.SIGLA,
    }));

    return NextResponse.json({
      scope: "municipal",
      dataset: "transferencias",
      municipio,
      year: doc.meta?.year,
      financiador,
      view: "month",
      data,
      updatedAt: doc.updatedAt,
      source: "Portal Transparência CV",
    });
  } catch (err) {
    console.error("[Municipal Transferencias]", err);
    return NextResponse.json([], { status: 500 });
  }
}
