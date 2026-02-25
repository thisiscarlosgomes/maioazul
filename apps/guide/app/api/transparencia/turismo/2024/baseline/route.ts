import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";

  const [overview, islandsRes, summary] = await Promise.all([
    fetch(`${base}/api/transparencia/turismo/2024/overview`).then(r => r.json()),
    fetch(`${base}/api/transparencia/turismo/2024/islands`).then(r => r.json()),
    fetch(`${base}/api/transparencia/turismo/2024/structure/summary`).then(r => r.json()),
  ]);

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
