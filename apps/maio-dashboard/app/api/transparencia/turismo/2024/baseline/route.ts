import { NextResponse } from "next/server";

import { GET as getOverview } from "../overview/route";
import { GET as getIslands } from "../islands/route";
import { GET as getSummary } from "../structure/summary/route";

// Each source reads this app's database directly; no public-origin request is needed.
export const dynamic = "force-dynamic";

export async function GET() {
  const responses = await Promise.all([
    getOverview(),
    getIslands(),
    getSummary(),
  ]);

  if (responses.some((response) => !response.ok)) {
    return NextResponse.json(
      { error: "Failed to load 2024 tourism baseline" },
      { status: 503 }
    );
  }

  const [overview, islandsRes, summary] = await Promise.all(
    responses.map((response) => response.json())
  );

  /* =========================
     1. National totals (SUM Q1–Q4)
  ========================= */

  const national = (overview.quarterly || []).reduce(
    (acc: any, q: any) => {
      acc.hospedes += q.hospedes || 0;
      acc.dormidas += q.dormidas || 0;
      return acc;
    },
    { hospedes: 0, dormidas: 0 }
  );

  /* =========================
     2. Islands snapshot
  ========================= */

  const islands = (islandsRes.islands || []).map((i: any) => ({
    ilha: i.ilha,
    hospedes: i.hospedes,
    dormidas: i.dormidas,
    avg_stay: i.avg_stay,
  }));

  return NextResponse.json({
    year: 2024,
    national,
    islands,
    establishments: summary ?? null,
    countries: [], // ❗ intentionally empty for 2024
    source: "INE Cabo Verde · Turismo (Baseline)",
    updatedAt: new Date().toISOString(),
  });
}
