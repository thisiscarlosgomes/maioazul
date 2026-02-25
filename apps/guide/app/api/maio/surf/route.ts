import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const LAT = 15.25;
const LON = -23.15;
const TZ = "Atlantic/Cape_Verde";

type SurfPoint = {
  time: string;
  label: "6am" | "Noon" | "6pm";
  surf_min_m: number;
  surf_max_m: number;
  swell_m: number;
  swell_period_s: number;
  swell_direction_deg: number;
  wind_kph: number;
  wind_gust_kph: number;
  wind_direction_deg: number;
};

const SLOT_HOURS = [6, 12, 18] as const;
const SLOT_LABEL: Record<number, SurfPoint["label"]> = {
  6: "6am",
  12: "Noon",
  18: "6pm",
};

function roundTo(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function parseHourFromIsoLocal(time: string) {
  const hourPart = time.split("T")[1]?.split(":")[0];
  const hour = Number(hourPart);
  return Number.isFinite(hour) ? hour : null;
}

function buildSurfRangeMeters(waveHeight: number) {
  const base = Number.isFinite(waveHeight) ? waveHeight : 0;
  const min = Math.max(0.1, base * 0.8);
  const max = Math.max(min + 0.1, base * 1.25);
  return {
    min: roundTo(min, 1),
    max: roundTo(max, 1),
  };
}

export async function GET() {
  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine` +
    `?latitude=${LAT}` +
    `&longitude=${LON}` +
    `&timezone=${encodeURIComponent(TZ)}` +
    `&hourly=wave_height,wave_direction,wave_period`;

  const windUrl =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${LAT}` +
    `&longitude=${LON}` +
    `&timezone=${encodeURIComponent(TZ)}` +
    `&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m`;

  const [marineRes, windRes] = await Promise.all([
    fetch(marineUrl, { next: { revalidate } }),
    fetch(windUrl, { next: { revalidate } }),
  ]);

  if (!marineRes.ok || !windRes.ok) {
    return NextResponse.json({ error: "Surf data unavailable" }, { status: 500 });
  }

  const marine = await marineRes.json();
  const wind = await windRes.json();

  const marineTimes: string[] = marine?.hourly?.time ?? [];
  const waveHeights: number[] = marine?.hourly?.wave_height ?? [];
  const waveDirections: number[] = marine?.hourly?.wave_direction ?? [];
  const wavePeriods: number[] = marine?.hourly?.wave_period ?? [];

  const windTimes: string[] = wind?.hourly?.time ?? [];
  const windSpeeds: number[] = wind?.hourly?.wind_speed_10m ?? [];
  const windGusts: number[] = wind?.hourly?.wind_gusts_10m ?? [];
  const windDirections: number[] = wind?.hourly?.wind_direction_10m ?? [];

  const windByTime = new Map<string, { speed: number; gust: number; direction: number }>();
  for (let i = 0; i < windTimes.length; i += 1) {
    windByTime.set(windTimes[i], {
      speed: Number(windSpeeds[i] ?? 0),
      gust: Number(windGusts[i] ?? 0),
      direction: Number(windDirections[i] ?? 0),
    });
  }

  const nowIsoDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const points: SurfPoint[] = [];

  for (const slotHour of SLOT_HOURS) {
    const slot = marineTimes.findIndex((time) => {
      if (!time.startsWith(nowIsoDay)) return false;
      return parseHourFromIsoLocal(time) === slotHour;
    });

    if (slot < 0) continue;

    const time = marineTimes[slot];
    const waveHeight = Number(waveHeights[slot] ?? 0);
    const waveDirection = Number(waveDirections[slot] ?? 0);
    const wavePeriod = Number(wavePeriods[slot] ?? 0);
    const windPoint = windByTime.get(time) ?? { speed: 0, gust: 0, direction: 0 };
    const surfRange = buildSurfRangeMeters(waveHeight);

    points.push({
      time,
      label: SLOT_LABEL[slotHour],
      surf_min_m: surfRange.min,
      surf_max_m: surfRange.max,
      swell_m: roundTo(waveHeight, 1),
      swell_period_s: Math.max(1, Math.round(wavePeriod)),
      swell_direction_deg: Math.round(waveDirection),
      wind_kph: Math.round(windPoint.speed),
      wind_gust_kph: Math.round(windPoint.gust),
      wind_direction_deg: Math.round(windPoint.direction),
    });
  }

  return NextResponse.json({
    location: "Maio",
    timezone: TZ,
    updated_at: new Date().toISOString(),
    points,
  });
}
