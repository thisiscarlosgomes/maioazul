import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // 1h cache

export async function GET() {
  const lat = 15.25;
  const lon = -23.15;

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}` +
    `&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,weathercode` +
    `&daily=temperature_2m_max,temperature_2m_min,weathercode` +
    `&timezone=auto`;

  const res = await fetch(url, { next: { revalidate } });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Weather unavailable" },
      { status: 500 }
    );
  }

  const data = await res.json();

  return NextResponse.json({
    location: "Maio",
    updated_at: new Date().toISOString(),

    // current
    temperature: data.current.temperature_2m,
    humidity: data.current.relative_humidity_2m,
    precipitation: data.current.precipitation,
    weather_code: data.current.weathercode,

    // daily range (today)
    temperature_min: data.daily.temperature_2m_min[0],
    temperature_max: data.daily.temperature_2m_max[0],

    daily: data.daily.time.map((date: string, index: number) => ({
      date,
      temperature_min: data.daily.temperature_2m_min[index],
      temperature_max: data.daily.temperature_2m_max[index],
      weather_code: data.daily.weathercode?.[index] ?? null,
    })),
  });
}
