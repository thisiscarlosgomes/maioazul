import { NextResponse } from "next/server";

import { AVAILABLE_BUDGET_YEARS, getBudgetDataset } from "@/lib/budget";

export const revalidate = 3600;

async function getBudgetDatasetFromMongo(year: number) {
  try {
    const { default: clientPromise } = await import("@/lib/mongodb");
    const client = await clientPromise;
    const db = client.db();
    const col = db.collection("maio_budget");

    const doc = await col.findOne(
      {
        dataset: "budget",
        scope: "municipal",
        municipality: "Maio",
        year,
      },
      { projection: { _id: 0, payload: 1 } }
    );

    if (doc && typeof doc === "object" && "payload" in doc && doc.payload) {
      return doc.payload;
    }
  } catch (error) {
    console.warn("[Maio Budget] Mongo lookup failed, falling back to local dataset.", error);
  }

  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year");
    const requestedYear = Number(yearParam);
    const year =
      Number.isFinite(requestedYear) && AVAILABLE_BUDGET_YEARS.includes(requestedYear as 2025 | 2026)
        ? requestedYear
        : AVAILABLE_BUDGET_YEARS[0];

    const mongoPayload = await getBudgetDatasetFromMongo(year);
    const payload = mongoPayload ?? (await getBudgetDataset(String(year)));

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[Maio Budget]", error);
    return NextResponse.json(
      {
        error: "Failed to load Maio budget dataset.",
        availableYears: [...AVAILABLE_BUDGET_YEARS],
      },
      { status: 500 }
    );
  }
}
