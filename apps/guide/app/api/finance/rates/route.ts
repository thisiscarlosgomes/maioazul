import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 1800;

const FALLBACK_EUR_USD = 1.1;

const fallbackRates = (base: string) => {
  if (base === "CVE") {
    return {
      EUR: 1 / 110.265,
      USD: FALLBACK_EUR_USD / 110.265,
    };
  }
  if (base === "EUR") {
    return {
      CVE: 110.265,
      USD: FALLBACK_EUR_USD,
    };
  }
  if (base === "USD") {
    return {
      EUR: 1 / FALLBACK_EUR_USD,
      CVE: 110.265 / FALLBACK_EUR_USD,
    };
  }
  return null;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawBase = (searchParams.get("base") || "CVE").toUpperCase().trim();
  const base = /^[A-Z]{3}$/.test(rawBase) ? rawBase : "CVE";

  try {
    const url = `https://open.er-api.com/v6/latest/${base}`;
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) throw new Error(`Rates request failed: ${res.status}`);
    const data = await res.json();
    if (data?.result !== "success" || typeof data?.rates !== "object") {
      throw new Error("Invalid rates payload");
    }

    return NextResponse.json({
      base,
      updated_at: data.time_last_update_utc || new Date().toISOString(),
      rates: data.rates,
      source: "open.er-api.com",
    });
  } catch {
    const rates = fallbackRates(base);
    if (!rates) {
      return NextResponse.json(
        { error: "Exchange rates unavailable" },
        { status: 502 }
      );
    }
    return NextResponse.json({
      base,
      updated_at: new Date().toISOString(),
      rates,
      source: "fallback",
    });
  }
}

