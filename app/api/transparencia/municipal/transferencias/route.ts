import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const CMMAIO_FALLBACK: Record<number, Array<{ MES: number; VALOR_PAGO: number; SIGLA: string }>> = {
  2024: [{ MES: 12, VALOR_PAGO: 125537932, SIGLA: "CMMAIO" }],
  2025: [{ MES: 12, VALOR_PAGO: 107960558, SIGLA: "CMMAIO" }],
  2026: [{ MES: 1, VALOR_PAGO: 9219167, SIGLA: "CMMAIO" }],
};

type TransferenciaRawRow = {
  MES?: number | string;
  VALOR_PAGO?: number | string;
  SIGLA?: string;
};

function mapTransferRows(rows: TransferenciaRawRow[]) {
  return rows.map((r) => ({
    month: Number(r.MES),
    valor_pago: Number(r.VALOR_PAGO ?? 0),
    sigla: r.SIGLA,
  }));
}

function hasUsableMonthlyRows(
  rows: Array<{ month: number; valor_pago: number }>
) {
  return rows.some(
    (row) =>
      Number.isFinite(row.month) &&
      row.month >= 1 &&
      row.month <= 12 &&
      Number.isFinite(row.valor_pago) &&
      row.valor_pago > 0
  );
}

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

    if (!doc || !Array.isArray(doc.data) || doc.data.length === 0) {
      const fallbackYear = year ? Number(year) : null;
      const fallbackRows =
        municipio === "CMMAIO" && fallbackYear
          ? CMMAIO_FALLBACK[fallbackYear]
          : null;

      if (!fallbackRows) {
        return NextResponse.json([]);
      }

      return NextResponse.json({
        scope: "municipal",
        dataset: "transferencias",
        municipio,
        year: fallbackYear,
        financiador,
        view: "month",
        data: mapTransferRows(fallbackRows),
        updatedAt: null,
        source: "Portal Transparência CV",
        fallback: true,
      });
    }

    const data = mapTransferRows(doc.data);
    const fallbackYear = year ? Number(year) : null;

    if (!hasUsableMonthlyRows(data)) {
      const fallbackRows =
        municipio === "CMMAIO" && fallbackYear
          ? CMMAIO_FALLBACK[fallbackYear]
          : null;

      if (fallbackRows) {
        return NextResponse.json({
          scope: "municipal",
          dataset: "transferencias",
          municipio,
          year: fallbackYear,
          financiador,
          view: "month",
          data: mapTransferRows(fallbackRows),
          updatedAt: doc.updatedAt ?? null,
          source: "Portal Transparência CV",
          fallback: true,
        });
      }
    }

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

    try {
      const { searchParams } = new URL(req.url);
      const municipio = searchParams.get("municipio");
      const year = Number(searchParams.get("year"));
      const fallbackRows =
        municipio === "CMMAIO" ? CMMAIO_FALLBACK[year] : undefined;

      if (fallbackRows) {
        return NextResponse.json({
          scope: "municipal",
          dataset: "transferencias",
          municipio,
          year,
          financiador: searchParams.get("financiador"),
          view: "month",
          data: mapTransferRows(fallbackRows),
          updatedAt: null,
          source: "Portal Transparência CV",
          fallback: true,
        });
      }
    } catch {
      // Ignore fallback parsing failure and return default error shape.
    }

    return NextResponse.json([], { status: 500 });
  }
}
