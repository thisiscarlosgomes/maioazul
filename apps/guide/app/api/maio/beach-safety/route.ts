import { NextResponse } from "next/server";
import { evaluateBeachSafety } from "@/lib/weather/beachSafety";

export const dynamic = "force-dynamic";
export const revalidate = 1800;

const LAT = 15.25;
const LON = -23.15;

export async function GET() {
  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine` +
    `?latitude=${LAT}` +
    `&longitude=${LON}` +
    `&current=wave_height`;

  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${LAT}` +
    `&longitude=${LON}` +
    `&current=wind_speed_10m,wind_gusts_10m,precipitation,weathercode`;

  const [marineRes, weatherRes] = await Promise.all([
    fetch(marineUrl, { next: { revalidate } }),
    fetch(weatherUrl, { next: { revalidate } }),
  ]);

  if (!marineRes.ok || !weatherRes.ok) {
    return NextResponse.json({ error: "Beach safety conditions unavailable" }, { status: 500 });
  }

  const marine = await marineRes.json();
  const weather = await weatherRes.json();

  const assessment = evaluateBeachSafety({
    windKph: Number(weather?.current?.wind_speed_10m),
    windGustKph: Number(weather?.current?.wind_gusts_10m),
    waveHeightM: Number(marine?.current?.wave_height),
    precipitationMm: Number(weather?.current?.precipitation),
    weatherCode: Number(weather?.current?.weathercode),
  });

  return NextResponse.json({
    location: "Maio",
    updated_at: new Date().toISOString(),
    ...assessment,
  });
}
