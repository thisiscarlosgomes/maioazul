import { NextResponse } from "next/server";
import {
  cacheControlFor,
  loadCaboVerdeFlights,
  sharedAdsbCache,
} from "@/lib/adsb/flights";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await loadCaboVerdeFlights({
    now: Date.now(),
    env: process.env,
    fetchImpl: fetch,
    cache: sharedAdsbCache,
  });

  return NextResponse.json(payload, {
    status: payload.status === "unavailable" ? 503 : 200,
    headers: {
      "Cache-Control": cacheControlFor(payload),
    },
  });
}
