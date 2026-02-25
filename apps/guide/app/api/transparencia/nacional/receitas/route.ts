import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || "year";
    const year = searchParams.get("year");

    const client = await clientPromise;
    const db = client.db();
    const col = db.collection("transparencia_raw");

    let key: string;

    if (view === "year") {
      key = "exec_rec:all:by_year";
    } else {
      if (!year) {
        return NextResponse.json(
          { error: "year is required for this view" },
          { status: 400 }
        );
      }

      if (view === "month") key = `exec_rec:${year}:by_month`;
      else if (view === "category") key = `exec_rec:${year}:by_category`;
      else {
        return NextResponse.json(
          { error: "invalid view" },
          { status: 400 }
        );
      }
    }

    const doc = await col.findOne({ key });

    if (!doc || !Array.isArray(doc.data)) {
      return NextResponse.json([]);
    }

    const data =
      view === "year"
        ? doc.data.map((r: any) => ({
            year: Number(r.DT_ANO),
            valor_pago: Number(r.VALOR_PAGO ?? 0),
            valor_inicial: Number(r.VALOR_INICIAL ?? 0),
          }))
        : view === "month"
        ? doc.data.map((r: any) => ({
            month: Number(r.MES),
            valor_pago: Number(r.VALOR_PAGO ?? 0),
          }))
        : doc.data.map((r: any) => ({
            category: r.RO_N3_NOME,
            valor_pago: Number(r.VALOR_PAGO ?? 0),
          }));

    return NextResponse.json({
      scope: "national",
      dataset: "receitas",
      view,
      year: year ? Number(year) : undefined,
      data,
      updatedAt: doc.updatedAt,
      source: "Portal Transparência CV",
    });
  } catch (err) {
    console.error("[Nacional Receitas]", err);
    return NextResponse.json([], { status: 500 });
  }
}
