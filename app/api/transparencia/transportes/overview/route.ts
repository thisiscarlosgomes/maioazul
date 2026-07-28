import path from "path";
import { readFile } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export const revalidate = 21600;

type TransportDoc = {
  dataset?: string;
  scope?: string;
  country?: string;
  as_of_year?: number;
  as_of_date?: string;
  maritime?: {
    ships_by_port_2025?: Array<{
      port?: string;
      island?: string;
      movements?: number;
    }>;
    passengers_by_port_2025?: Array<{
      port?: string;
      island?: string;
      passengers?: number;
    }>;
  };
  air?: {
    aircraft_by_airport_2025?: Array<{
      airport?: string;
      island?: string;
      domestic?: number;
      international?: number | null;
      total?: number;
    }>;
    aircraft_totals_2025?: {
      domestic?: number;
      international?: number;
      total?: number;
    };
    passengers_by_airport_2025?: Array<{
      airport?: string;
      island?: string;
      embarked?: number;
      disembarked?: number;
      transit?: number | null;
      total?: number;
    }>;
    totals_2025?: {
      embarked?: number;
      disembarked?: number;
      transit?: number;
      total?: number;
    };
  };
  comparison_2024_2025?: Array<{
    mode?: string;
    metric?: string;
    value_2024?: number;
    value_2025?: number;
    variation_pct?: number | null;
  }>;
  sources?: Array<{
    id?: string;
    publisher?: string;
    title?: string;
  }>;
  updatedAt?: string | Date | null;
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePayload(payload: TransportDoc, fallback: boolean) {
  return {
    dataset: payload.dataset ?? "cabo_verde_transportes_2025",
    scope: payload.scope ?? "national",
    country: payload.country ?? "Cabo Verde",
    as_of_year: toNumber(payload.as_of_year, 2025),
    as_of_date: payload.as_of_date ?? "2025-12-31",
    maritime: {
      ships_by_port_2025: Array.isArray(payload.maritime?.ships_by_port_2025)
        ? payload.maritime?.ships_by_port_2025
        : [],
      passengers_by_port_2025: Array.isArray(payload.maritime?.passengers_by_port_2025)
        ? payload.maritime?.passengers_by_port_2025
        : [],
    },
    air: {
      aircraft_by_airport_2025: Array.isArray(payload.air?.aircraft_by_airport_2025)
        ? payload.air?.aircraft_by_airport_2025
        : [],
      aircraft_totals_2025: {
        domestic: toNumber(payload.air?.aircraft_totals_2025?.domestic, 0),
        international: toNumber(payload.air?.aircraft_totals_2025?.international, 0),
        total: toNumber(payload.air?.aircraft_totals_2025?.total, 0),
      },
      passengers_by_airport_2025: Array.isArray(payload.air?.passengers_by_airport_2025)
        ? payload.air?.passengers_by_airport_2025
        : [],
      totals_2025: {
        embarked: toNumber(payload.air?.totals_2025?.embarked, 0),
        disembarked: toNumber(payload.air?.totals_2025?.disembarked, 0),
        transit: toNumber(payload.air?.totals_2025?.transit, 0),
        total: toNumber(payload.air?.totals_2025?.total, 0),
      },
    },
    comparison_2024_2025: Array.isArray(payload.comparison_2024_2025)
      ? payload.comparison_2024_2025
      : [],
    sources: Array.isArray(payload.sources) ? payload.sources : [],
    fallback,
    updatedAt: payload.updatedAt ?? null,
  };
}

async function loadFallbackFromLocalFile(): Promise<TransportDoc> {
  const fallbackPath = path.join(
    process.cwd(),
    "data",
    "transport",
    "cabo_verde_transportes_2025.json"
  );
  const raw = await readFile(fallbackPath, "utf8");
  return JSON.parse(raw) as TransportDoc;
}

export async function GET(request: NextRequest) {
  try {
    const year = Number(request.nextUrl.searchParams.get("year") || "2025");
    const client = await clientPromise;
    const db = client.db();
    const col = db.collection<TransportDoc>("transportes_cv");

    const doc = await col
      .find({ dataset: "cabo_verde_transportes_2025", as_of_year: year })
      .sort({ updatedAt: -1 })
      .limit(1)
      .next();

    if (doc) {
      return NextResponse.json(normalizePayload(doc, false), {
        headers: {
          "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
        },
      });
    }

    const fallback = await loadFallbackFromLocalFile();
    return NextResponse.json(normalizePayload(fallback, true), {
      headers: {
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[Transportes Overview]", err);
    return NextResponse.json(
      { error: "Failed to load transportation overview data." },
      { status: 500 }
    );
  }
}
