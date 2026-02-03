import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET() {
  const lat = 15.25;
  const lon = -23.15;

  const [marineRes, windRes] = await Promise.all([
    fetch(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height,sea_surface_temperature`,
      { next: { revalidate } }
    ),
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,wind_direction_10m`,
      { next: { revalidate } }
    ),
  ]);

  if (!marineRes.ok || !windRes.ok) {
    return NextResponse.json({ error: "Conditions unavailable" }, { status: 500 });
  }

  const marine = await marineRes.json();
  const wind = await windRes.json();

  return NextResponse.json({
    location: "Maio",
    updated_at: new Date().toISOString(),
    wind: {
      speed: wind.current.wind_speed_10m,
      direction: wind.current.wind_direction_10m,
    },
    sea: {
      wave_height: marine.current.wave_height,
      temperature: marine.current.sea_surface_temperature,
    },
  });
}
