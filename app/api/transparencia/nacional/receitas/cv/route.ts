import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

type RecebedoriaRow = {
  recebedoria: string;
  value: number;
};

type ReceitaYearDoc = {
  dataset: "receitas_cv_recebedorias";
  year: number;
  rows: RecebedoriaRow[];
  total: number;
  updatedAt?: Date | string;
};

const FALLBACK_DATA: ReceitaYearDoc[] = [
  {
    dataset: "receitas_cv_recebedorias",
    year: 2024,
    rows: [
      { recebedoria: "Boa Vista", value: 855091672 },
      { recebedoria: "Brava", value: 41044170 },
      { recebedoria: "Exterior", value: 0 },
      { recebedoria: "Fogo", value: 399928087 },
      { recebedoria: "Maio", value: 68231506 },
      { recebedoria: "Outras fontes", value: 334524151 },
      { recebedoria: "Sal", value: 10937872334 },
      { recebedoria: "Santiago", value: 47966526605 },
      { recebedoria: "Santo Antão", value: 3364019019 },
      { recebedoria: "São Nicolau", value: 171354008 },
      { recebedoria: "São Vicente", value: 5333800987 },
      { recebedoria: "Várias Ilhas de Cabo Verde", value: 0 },
    ],
    total: 69472392539,
  },
  {
    dataset: "receitas_cv_recebedorias",
    year: 2025,
    rows: [
      { recebedoria: "Boa Vista", value: 1029322996 },
      { recebedoria: "Brava", value: 46306538 },
      { recebedoria: "Exterior", value: 0 },
      { recebedoria: "Fogo", value: 398019374 },
      { recebedoria: "Maio", value: 64024623 },
      { recebedoria: "Outras fontes", value: 0 },
      { recebedoria: "Sal", value: 14161768812 },
      { recebedoria: "Santiago", value: 64105724175 },
      { recebedoria: "Santo Antão", value: 3006832326 },
      { recebedoria: "São Nicolau", value: 163052574 },
      { recebedoria: "São Vicente", value: 6427726045 },
      { recebedoria: "Várias Ilhas de Cabo Verde", value: 0 },
    ],
    total: 89402777463,
  },
  {
    dataset: "receitas_cv_recebedorias",
    year: 2026,
    rows: [
      { recebedoria: "Boa Vista", value: 88279986 },
      { recebedoria: "Brava", value: 4180910 },
      { recebedoria: "Exterior", value: 0 },
      { recebedoria: "Fogo", value: 34203322 },
      { recebedoria: "Maio", value: 6424792 },
      { recebedoria: "Outras fontes", value: 0 },
      { recebedoria: "Sal", value: 1255162600 },
      { recebedoria: "Santiago", value: 4294483183 },
      { recebedoria: "Santo Antão", value: 182141318 },
      { recebedoria: "São Nicolau", value: 12113466 },
      { recebedoria: "São Vicente", value: 575709623 },
      { recebedoria: "Várias Ilhas de Cabo Verde", value: 0 },
    ],
    total: 6452699200,
  },
];

const MAIO_KEY = "maio";

function normalizeRows(rows: RecebedoriaRow[]) {
  return rows.map((row) => ({
    recebedoria: row.recebedoria,
    value: Number(row.value || 0),
  }));
}

function mapYearDoc(doc: ReceitaYearDoc) {
  const rows = normalizeRows(doc.rows || []);
  const maio = rows.find(
    (r) => r.recebedoria.trim().toLowerCase() === MAIO_KEY
  )?.value;

  return {
    year: Number(doc.year),
    total: Number(doc.total || 0),
    maio: Number(maio || 0),
    by_recebedoria: rows,
    updatedAt: doc.updatedAt,
  };
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const col = db.collection<ReceitaYearDoc>("receitas_cv_recebedorias");

    const docs = await col
      .find({ dataset: "receitas_cv_recebedorias" })
      .project<ReceitaYearDoc>({ _id: 0 })
      .sort({ year: 1 })
      .toArray();

    const sourceDocs = docs.length ? docs : FALLBACK_DATA;
    const data = sourceDocs.map(mapYearDoc);
    const latestUpdatedAt =
      docs.length > 0
        ? (() => {
            const maxTs = docs.reduce<number>((max, d) => {
              const dt = d.updatedAt
                ? d.updatedAt instanceof Date
                  ? d.updatedAt
                  : new Date(d.updatedAt)
                : null;
              if (!dt || Number.isNaN(dt.getTime())) return max;
              return Math.max(max, dt.getTime());
            }, 0);
            return maxTs > 0 ? new Date(maxTs).toISOString() : null;
          })()
        : null;

    return NextResponse.json({
      scope: "national",
      dataset: "receitas_cv_recebedorias",
      unit: "CVE",
      data,
      source: "Portal Transparência CV · Por Recebedorias",
      fallback: docs.length === 0,
      updatedAt: latestUpdatedAt,
    });
  } catch (err) {
    console.error("[Nacional Receitas CV]", err);
    return NextResponse.json(
      {
        scope: "national",
        dataset: "receitas_cv_recebedorias",
        unit: "CVE",
        data: FALLBACK_DATA.map(mapYearDoc),
        source: "Portal Transparência CV · Por Recebedorias",
        fallback: true,
        updatedAt: null,
      },
      { status: 200 }
    );
  }
}
