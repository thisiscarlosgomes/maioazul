import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

type FeedItem = {
  id: string;
  title: string;
  detail: string;
  source: string;
  updatedAt: string;
  href: string;
  tone: "data" | "place" | "system";
};

type RawDoc = {
  key?: string;
  updatedAt?: Date | string;
  meta?: {
    year?: number;
    municipio?: string;
    [key: string]: unknown;
  };
  data?: unknown[];
};

type GroupDoc = {
  _id?: number | string;
  updatedAt?: Date | string;
  count?: number;
};

type PlaceDoc = {
  id?: string;
  name?: string;
  updatedAt?: Date | string;
};

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 60;
const RAW_ITEMS_CAP = 8;

function toIsoDate(value: Date | string | undefined): string | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function toneFromKey(key: string): FeedItem["tone"] {
  if (key.startsWith("transf:")) return "data";
  if (key.startsWith("receitas:")) return "data";
  return "system";
}

function formatRawTitle(key: string): string {
  if (key.startsWith("transf:")) return "Transferências municipais atualizadas";
  if (key.startsWith("receitas:")) return "Dados de receitas nacionais atualizados";
  if (key.startsWith("turism:")) return "Dados municipais de turismo atualizados";
  return "Conjunto de transparência atualizado";
}

function formatRawDetail(doc: RawDoc): string {
  const key = doc.key ?? "conjunto";
  const year = typeof doc.meta?.year === "number" ? doc.meta.year : null;
  const rows = Array.isArray(doc.data) ? doc.data.length : 0;
  const municipio = typeof doc.meta?.municipio === "string" ? doc.meta.municipio : null;

  const parts: string[] = [key];
  if (year) parts.push(String(year));
  if (municipio) parts.push(municipio);
  if (rows > 0) parts.push(`${rows} linhas`);
  return parts.join(" · ");
}

function normalizeLimit(rawLimit: string | null): number {
  const parsed = Number(rawLimit ?? DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(parsed)));
}

export async function GET(req: Request) {
  const limit = normalizeLimit(new URL(req.url).searchParams.get("limit"));

  try {
    const client = await clientPromise;
    const db = client.db();

    const [rawDocs, metricsDocs, budgetDocs, placeDocs, receitaDocs] = await Promise.all([
      db
        .collection<RawDoc>("transparencia_raw")
        .find({}, { projection: { key: 1, meta: 1, updatedAt: 1, data: 1 } })
        .sort({ updatedAt: -1 })
        .limit(RAW_ITEMS_CAP)
        .toArray(),
      db
        .collection("maio_core_metrics")
        .aggregate<GroupDoc>([
          { $match: { updatedAt: { $exists: true } } },
          { $group: { _id: "$year", updatedAt: { $max: "$updatedAt" }, count: { $sum: 1 } } },
          { $sort: { updatedAt: -1 } },
          { $limit: 6 },
        ])
        .toArray(),
      db
        .collection("maio_budget")
        .aggregate<GroupDoc>([
          { $match: { updatedAt: { $exists: true } } },
          { $group: { _id: "$year", updatedAt: { $max: "$updatedAt" }, count: { $sum: 1 } } },
          { $sort: { updatedAt: -1 } },
          { $limit: 6 },
        ])
        .toArray(),
      db
        .collection<PlaceDoc>("places")
        .find({}, { projection: { id: 1, name: 1, updatedAt: 1 } })
        .sort({ updatedAt: -1 })
        .limit(10)
        .toArray(),
      db
        .collection("receitas_cv_recebedorias")
        .aggregate<GroupDoc>([
          { $match: { updatedAt: { $exists: true } } },
          { $group: { _id: "$ano", updatedAt: { $max: "$updatedAt" }, count: { $sum: 1 } } },
          { $sort: { updatedAt: -1 } },
          { $limit: 6 },
        ])
        .toArray(),
    ]);

    const feed: FeedItem[] = [];

    for (const doc of rawDocs) {
      const updatedAt = toIsoDate(doc.updatedAt);
      const key = doc.key ?? "transparencia";
      if (!updatedAt) continue;
      feed.push({
        id: `raw:${key}:${updatedAt}`,
        title: formatRawTitle(key),
        detail: formatRawDetail(doc),
        source: "transparencia_raw",
        updatedAt,
        href: "/dashboard",
        tone: toneFromKey(key),
      });
    }

    for (const doc of metricsDocs) {
      const updatedAt = toIsoDate(doc.updatedAt);
      if (!updatedAt) continue;
      const year = typeof doc._id === "number" ? doc._id : String(doc._id ?? "latest");
      feed.push({
        id: `core:${year}:${updatedAt}`,
        title: "Métricas principais atualizadas",
        detail: `Ano ${year} · ${doc.count ?? 0} linhas de métricas`,
        source: "maio_core_metrics",
        updatedAt,
        href: "/dashboard",
        tone: "data",
      });
    }

    for (const doc of budgetDocs) {
      const updatedAt = toIsoDate(doc.updatedAt);
      if (!updatedAt) continue;
      const year = typeof doc._id === "number" ? doc._id : String(doc._id ?? "latest");
      feed.push({
        id: `budget:${year}:${updatedAt}`,
        title: "Conjunto orçamental atualizado",
        detail: `Ano ${year} · ${doc.count ?? 0} linhas de orçamento`,
        source: "maio_budget",
        updatedAt,
        href: "/orcamento",
        tone: "data",
      });
    }

    for (const doc of receitaDocs) {
      const updatedAt = toIsoDate(doc.updatedAt);
      if (!updatedAt) continue;
      const year = typeof doc._id === "number" ? doc._id : String(doc._id ?? "latest");
      feed.push({
        id: `receitas:${year}:${updatedAt}`,
        title: "Receitas nacionais atualizadas",
        detail: `Ano ${year} · ${doc.count ?? 0} linhas de receitas`,
        source: "receitas_cv_recebedorias",
        updatedAt,
        href: "/dashboard",
        tone: "data",
      });
    }

    for (const doc of placeDocs) {
      const updatedAt = toIsoDate(doc.updatedAt);
      if (!updatedAt) continue;
      const placeId = doc.id ?? "place";
      feed.push({
        id: `place:${placeId}:${updatedAt}`,
        title: "Informação de local atualizada",
        detail: doc.name ? `${doc.name}` : `Local ${placeId}`,
        source: "places",
        updatedAt,
        href: `/places/${placeId}`,
        tone: "place",
      });
    }

    const items = feed
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("[feed] failed to build feed", error);
    return NextResponse.json(
      {
        ok: false,
        generatedAt: new Date().toISOString(),
        count: 0,
        items: [],
      },
      { status: 500 }
    );
  }
}
