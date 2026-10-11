export type DataKind =
  | "model-estimate"
  | "calculated"
  | "published-schedule"
  | "official-statistic"
  | "community-map"
  | "editorial"
  | "measured";

export type DataStatus =
  | "available"
  | "partial"
  | "unavailable"
  | "no-current-records"
  | "planned";

export type Envelope<T> = {
  kind: DataKind;
  status: DataStatus;
  source: { id: string; name: string; url?: string; licence?: string };
  validAt?: string;
  observedAt?: string;
  sourceUpdatedAt?: string | null;
  retrievedAt: string;
  caveats: string[];
  data: T | null;
};

export type AgoraBody = {
  weather: Envelope<WeatherData>;
  sea: Envelope<SeaData>;
  wind: Envelope<WindData>;
  sky: Envelope<SkyData>;
};

type WeatherData = {
  temperature: number | null;
  humidity: number | null;
  precipitation: number | null;
  weather_code: number | null;
  temperature_min: number | null;
  temperature_max: number | null;
  daily: { date: string; temperature_min: number | null; temperature_max: number | null; weather_code: number | null }[];
};

type SeaData = { wave_height: number | null; temperature: number | null };
type WindData = { speed: number | null; direction: number | null; unit: string };
type SkyData = {
  solarEvents: unknown;
  moon: unknown;
  isAstronomicalDarkness: boolean | null;
  model: { id?: string; attribution?: string; url?: string } | null;
};

const lat = 15.25;
const lon = -23.15;

const openMeteo = { id: "open-meteo-weather", name: "Open-Meteo", url: "https://open-meteo.com/" };
const openMeteoMarine = { id: "open-meteo-marine", name: "Open-Meteo", url: "https://open-meteo.com/" };
const astronomy = { id: "astronomy-engine", name: "Astronomy Engine", url: "https://github.com/cosinekitty/astronomy" };

const seaCaveat = "Current-condition reading, not a beach-specific surf forecast.";

export function maioClock(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Atlantic/Cape_Verde",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return { date: `${read("year")}-${read("month")}-${read("day")}`, time: `${read("hour")}:${read("minute")}` };
}

function unavailable<T>(kind: DataKind, source: Envelope<T>["source"], retrievedAt: string, caveats: string[] = []): Envelope<T> {
  return { kind, status: "unavailable", source, sourceUpdatedAt: null, retrievedAt, caveats, data: null };
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export async function loadAgora(fetchImpl: typeof fetch, now = new Date()): Promise<AgoraBody> {
  const retrievedAt = now.toISOString();
  const clock = maioClock(now);
  const [weather, sea, wind, sky] = await Promise.all([
    loadWeather(fetchImpl, retrievedAt),
    loadSea(fetchImpl, retrievedAt),
    loadWind(fetchImpl, retrievedAt),
    loadSky(fetchImpl, retrievedAt, clock),
  ]);
  return { weather, sea, wind, sky };
}

async function loadWeather(fetchImpl: typeof fetch, retrievedAt: string): Promise<Envelope<WeatherData>> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
    const data = asRecord(await readJson(await fetchImpl(url)));
    const current = asRecord(data.current);
    const daily = asRecord(data.daily);
    const dates = Array.isArray(daily.time) ? daily.time as string[] : [];
    return {
      kind: "model-estimate",
      status: "available",
      source: openMeteo,
      sourceUpdatedAt: null,
      retrievedAt,
      caveats: [],
      data: {
        temperature: numberOrNull(current.temperature_2m),
        humidity: numberOrNull(current.relative_humidity_2m),
        precipitation: numberOrNull(current.precipitation),
        weather_code: numberOrNull(current.weathercode),
        temperature_min: numberOrNull(Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min[0] : null),
        temperature_max: numberOrNull(Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max[0] : null),
        daily: dates.map((date, index) => ({
          date,
          temperature_min: numberOrNull(Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min[index] : null),
          temperature_max: numberOrNull(Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max[index] : null),
          weather_code: numberOrNull(Array.isArray(daily.weathercode) ? daily.weathercode[index] : null),
        })),
      },
    };
  } catch {
    return unavailable("model-estimate", openMeteo, retrievedAt);
  }
}

async function loadSea(fetchImpl: typeof fetch, retrievedAt: string): Promise<Envelope<SeaData>> {
  try {
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height,sea_surface_temperature`;
    const data = asRecord(await readJson(await fetchImpl(url)));
    const current = asRecord(data.current);
    return {
      kind: "model-estimate",
      status: "available",
      source: openMeteoMarine,
      sourceUpdatedAt: null,
      retrievedAt,
      caveats: [seaCaveat],
      data: {
        wave_height: numberOrNull(current.wave_height),
        temperature: numberOrNull(current.sea_surface_temperature),
      },
    };
  } catch {
    return unavailable("model-estimate", openMeteoMarine, retrievedAt, [seaCaveat]);
  }
}

async function loadWind(fetchImpl: typeof fetch, retrievedAt: string): Promise<Envelope<WindData>> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh`;
    const data = asRecord(await readJson(await fetchImpl(url)));
    const current = asRecord(data.current);
    const units = asRecord(data.current_units);
    const unit = typeof units.wind_speed_10m === "string" ? units.wind_speed_10m : "";
    if (!unit) throw new Error("missing wind unit");
    return {
      kind: "model-estimate",
      status: "available",
      source: openMeteo,
      sourceUpdatedAt: null,
      retrievedAt,
      caveats: [],
      data: {
        speed: numberOrNull(current.wind_speed_10m),
        direction: numberOrNull(current.wind_direction_10m),
        unit,
      },
    };
  } catch {
    return unavailable("model-estimate", openMeteo, retrievedAt);
  }
}

async function loadSky(
  fetchImpl: typeof fetch,
  retrievedAt: string,
  clock: { date: string; time: string },
): Promise<Envelope<SkyData>> {
  const skyUrl = `https://api.maio.cv/api/v1/astronomy/sky?date=${clock.date}&time=${clock.time}`;
  const moonUrl = `https://api.maio.cv/api/v1/astronomy/moon?date=${clock.date}`;
  try {
    const skyResponse = await fetchImpl(skyUrl);
    const sky = asRecord(await readJson(skyResponse));
    let moonPayload: Record<string, unknown> | null = null;
    let moonFailed = false;
    try {
      moonPayload = asRecord(await readJson(await fetchImpl(moonUrl)));
    } catch {
      moonFailed = true;
    }
    const caveats = [...stringList(sky.caveats), ...stringList(moonPayload?.caveats)];
    const model = asRecord(sky.model);
    return {
      kind: "calculated",
      status: moonFailed ? "partial" : "available",
      source: {
        ...astronomy,
        url: typeof model.url === "string" ? model.url : astronomy.url,
      },
      validAt: typeof sky.at === "string" ? sky.at : undefined,
      sourceUpdatedAt: sky.sourceUpdatedAt === null || typeof sky.sourceUpdatedAt === "string" ? sky.sourceUpdatedAt : null,
      retrievedAt,
      caveats,
      data: {
        solarEvents: sky.solarEvents ?? null,
        moon: sky.moon ?? moonPayload?.moon ?? null,
        isAstronomicalDarkness: typeof sky.isAstronomicalDarkness === "boolean" ? sky.isAstronomicalDarkness : null,
        model: {
          id: typeof model.id === "string" ? model.id : undefined,
          attribution: typeof model.attribution === "string" ? model.attribution : undefined,
          url: typeof model.url === "string" ? model.url : undefined,
        },
      },
    };
  } catch {
    return unavailable("calculated", astronomy, retrievedAt);
  }
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
