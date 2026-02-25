import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 10800; // 3h

export async function GET() {
  const lat = 15.25;
  const lon = -23.15;

  const url =
    `https://marine-api.open-meteo.com/v1/marine` +
    `?latitude=${lat}` +
    `&longitude=${lon}` +
    `&current=wave_height,sea_surface_temperature`;

  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) {
    return NextResponse.json({ error: "Marine data unavailable" }, { status: 500 });
  }

  const data = await res.json();

  return NextResponse.json({
    location: "Maio",
    updated_at: new Date().toISOString(),
    sea: {
      wave_height: data.current.wave_height,
      temperature: data.current.sea_surface_temperature,
    },
  });
}
