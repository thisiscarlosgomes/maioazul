import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const CMMAIO_FALLBACK: Record<number, Array<{ MES: number; VALOR_PAGO: number; SIGLA: string }>> = {
  2024: [{ MES: 12, VALOR_PAGO: 125537932, SIGLA: "CMMAIO" }],
  2025: [{ MES: 12, VALOR_PAGO: 107960558, SIGLA: "CMMAIO" }],
  2026: [
    { MES: 1, VALOR_PAGO: 9219167, SIGLA: "CMMAIO" },
    { MES: 2, VALOR_PAGO: 9219167, SIGLA: "CMMAIO" },
    { MES: 3, VALOR_PAGO: 11396945, SIGLA: "CMMAIO" },
    { MES: 4, VALOR_PAGO: 9219167, SIGLA: "CMMAIO" },
  ],
};

function mapTransferRows(rows: Array<{ MES?: number | string; VALOR_PAGO?: number | string; SIGLA?: string }>) {
  return rows.map((r) => ({
    month: Number(r.MES),
    valor_pago: Number(r.VALOR_PAGO ?? 0),
    sigla: r.SIGLA,
  }));
}

function mergeMissingMonths(
  primary: Array<{ month: number; valor_pago: number; sigla?: string }>,
  supplement: Array<{ month: number; valor_pago: number; sigla?: string }>
) {
  const byMonth = new Map<number, { month: number; valor_pago: number; sigla?: string }>();
  for (const row of primary) byMonth.set(Number(row.month), row);
  for (const row of supplement) {
    const month = Number(row.month);
    if (!byMonth.has(month)) byMonth.set(month, row);
  }
  return [...byMonth.values()].sort((a, b) => a.month - b.month);
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

      if (!fallbackRows) return NextResponse.json([]);

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
    const fallbackRows =
      municipio === "CMMAIO" && fallbackYear
        ? mapTransferRows(CMMAIO_FALLBACK[fallbackYear] ?? [])
        : [];
    const completedData = fallbackRows.length
      ? mergeMissingMonths(data, fallbackRows)
      : data;

    return NextResponse.json({
      scope: "municipal",
      dataset: "transferencias",
      municipio,
      year: doc.meta?.year,
      financiador,
      view: "month",
      data: completedData,
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
      // Ignore fallback parsing failures.
    }

    return NextResponse.json([], { status: 500 });
  }
}
