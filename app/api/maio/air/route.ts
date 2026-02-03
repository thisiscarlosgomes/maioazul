import { NextResponse } from "next/server";

export const revalidate = 21600; // cache 6h

export async function GET() {
  const lat = 15.25;
  const lon = -23.15;

  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${lat}` +
    `&longitude=${lon}` +
    `&hourly=pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,ozone`;

  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) {
    return NextResponse.json({ error: "Air quality unavailable" }, { status: 500 });
  }

  const data = await res.json();

  return NextResponse.json({
    location: "Maio",
    updated_at: new Date().toISOString(),
    pm2_5: data.hourly.pm2_5[0],
    pm10: data.hourly.pm10[0],
    no2: data.hourly.nitrogen_dioxide[0],
    ozone: data.hourly.ozone[0],
  });
}
