/**
 * Live ADS-B positions for Ilha do Maio and Cabo Verde.
 *
 * adsb.lol's keyed JSON API is https://api.adsb.lol/v2. The geographic
 * query is `/v2/lat/{lat}/lon/{lon}/dist/{radius}` (radius in nautical
 * miles, integer, 250 maximum): every aircraft inside that circle.
 * The feeder re-api (`https://re-api.adsb.lol?circle=`) can draw the
 * same circle, but its docs limit it to the feeder station's IP, so a
 * Vercel function cannot use it. This module never calls re-api, `/v2/mil`,
 * or a worldwide snapshot.
 *
 * The circle is centered on the same Maio point the weather and marine
 * routes already use. 180 nm reaches the north of Santo Antão (~166 nm)
 * and the rest of the archipelago, and stays inside the 250 nm cap.
 * One cached response serves the page. The free key allows 1,000
 * requests/day, so the success cache is 3 minutes (~480 requests/day
 * from a single cache, under the 20/30s, 120/minute, 300/hour,
 * 1,000/day, 5,000/week and 30,000/month windows).
 */

export const ADSB_API_KEY_ENV = "ADSB_LOL_API_KEY";

export const MAIO_LATITUDE = 15.25;
export const MAIO_LONGITUDE = -23.15;
export const CABO_VERDE_RADIUS_NM = 180;
export const FLIGHT_CACHE_TTL_MS = 180_000;
export const DEFAULT_RETRY_AFTER_SECONDS = 30;
export const MAX_RETRY_AFTER_SECONDS = 24 * 60 * 60;
export const MAX_AIRCRAFT = 400;

const EARTH_RADIUS_NM = 3440.065;

export const ADSB_SOURCE = "adsb.lol" as const;
export const ADSB_LICENSE =
  "Open Data Commons Open Database License (ODbL) v1.0" as const;

export const FLIGHT_CAVEATS = [
  "Positions come from aircraft transmitting ADS-B or MLAT. Aircraft without a transponder, or outside community receiver coverage, are absent.",
  "This is a community observation feed, not air traffic control and not an airline timetable.",
] as const;

export type FlightStatus = "available" | "unavailable" | "unconfigured";

export type LiveAircraft = {
  hex: string;
  callsign: string | null;
  registration: string | null;
  aircraftType: string | null;
  latitude: number;
  longitude: number;
  altitudeFeet: number | null;
  onGround: boolean;
  groundSpeedKnots: number | null;
  trackDegrees: number | null;
  distanceNauticalMiles: number | null;
  directionDegrees: number | null;
  seenSeconds: number | null;
  emergency: string | null;
};

export type LiveFlightsPayload = {
  status: FlightStatus;
  stale: boolean;
  source: typeof ADSB_SOURCE;
  license: typeof ADSB_LICENSE;
  location: {
    name: "Ilha do Maio";
    latitude: number;
    longitude: number;
  };
  region: "Cabo Verde";
  radiusNauticalMiles: number;
  retrievedAt: string | null;
  aircraft: LiveAircraft[];
  truncated: boolean;
  caveats: string[];
  retryAfterSeconds: number | null;
};

export type AdsbCache = {
  freshUntil: number;
  blockedUntil: number;
  fresh: LiveFlightsPayload | null;
  stale: LiveFlightsPayload | null;
  pending: Promise<LiveFlightsPayload> | null;
};

export type AdsbFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export function createAdsbCache(): AdsbCache {
  return {
    freshUntil: 0,
    blockedUntil: 0,
    fresh: null,
    stale: null,
    pending: null,
  };
}

export const sharedAdsbCache = createAdsbCache();

export function readAdsbApiKey(
  env: Record<string, string | undefined>,
): string | null {
  const raw = env[ADSB_API_KEY_ENV];
  if (typeof raw !== "string") return null;
  const key = raw.trim();
  if (!key || /[\r\n]/.test(key)) return null;
  return key;
}

export function caboVerdeFlightsUrl(): string {
  return `https://api.adsb.lol/v2/lat/${MAIO_LATITUDE}/lon/${MAIO_LONGITUDE}/dist/${CABO_VERDE_RADIUS_NM}`;
}

export function nauticalMilesBetween(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const lat1 = (latitudeA * Math.PI) / 180;
  const lat2 = (latitudeB * Math.PI) / 180;
  const dLat = ((latitudeB - latitudeA) * Math.PI) / 180;
  const dLon = ((longitudeB - longitudeA) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function parseRetryAfterSeconds(
  header: string | null,
  nowMs: number,
): number {
  if (!header) return DEFAULT_RETRY_AFTER_SECONDS;
  const trimmed = header.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return clampRetry(Number(trimmed));
  }
  const date = Date.parse(trimmed);
  if (Number.isFinite(date)) {
    return clampRetry(Math.ceil((date - nowMs) / 1000));
  }
  return DEFAULT_RETRY_AFTER_SECONDS;
}

function clampRetry(seconds: number): number {
  if (!Number.isFinite(seconds)) return DEFAULT_RETRY_AFTER_SECONDS;
  // A zero delay would retry in a tight loop. One second still honors
  // "retry immediately" without hammering the key.
  return Math.min(MAX_RETRY_AFTER_SECONDS, Math.max(1, Math.ceil(seconds)));
}

export function cacheControlFor(payload: LiveFlightsPayload): string {
  if (payload.status === "unconfigured") return "no-store";
  const ttlSeconds = FLIGHT_CACHE_TTL_MS / 1000;
  if (payload.status === "available" && !payload.stale) {
    return `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}, stale-while-revalidate=60`;
  }
  const retry = payload.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS;
  const seconds = Math.max(1, Math.min(retry, ttlSeconds));
  return `public, max-age=${seconds}, s-maxage=${seconds}`;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function trimmedText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 ? text : null;
}

export function normalizeAircraft(raw: unknown): LiveAircraft | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const hex = trimmedText(row.hex);
  if (!hex) return null;

  const latitude = finiteNumber(row.lat);
  const longitude = finiteNumber(row.lon);
  if (
    latitude == null ||
    longitude == null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  const barometric = row.alt_baro;
  const onGround = barometric === "ground";
  const altitudeFeet =
    typeof barometric === "number" && Number.isFinite(barometric)
      ? barometric
      : null;
  const emergency = trimmedText(row.emergency);

  return {
    hex,
    callsign: trimmedText(row.flight),
    registration: trimmedText(row.r),
    aircraftType: trimmedText(row.t),
    latitude,
    longitude,
    altitudeFeet,
    onGround,
    groundSpeedKnots: finiteNumber(row.gs),
    trackDegrees: finiteNumber(row.track),
    distanceNauticalMiles: finiteNumber(row.dst),
    directionDegrees: finiteNumber(row.dir),
    seenSeconds: finiteNumber(row.seen),
    emergency: emergency && emergency !== "none" ? emergency : null,
  };
}

function compareAircraft(a: LiveAircraft, b: LiveAircraft): number {
  if (a.distanceNauticalMiles == null && b.distanceNauticalMiles == null) {
    return a.hex.localeCompare(b.hex);
  }
  if (a.distanceNauticalMiles == null) return 1;
  if (b.distanceNauticalMiles == null) return -1;
  return (
    a.distanceNauticalMiles - b.distanceNauticalMiles ||
    a.hex.localeCompare(b.hex)
  );
}

export function normalizeAircraftList(body: unknown): LiveAircraft[] | null {
  if (!body || typeof body !== "object") return null;
  const ac = (body as { ac?: unknown }).ac;
  if (!Array.isArray(ac)) return null;
  return ac
    .map(normalizeAircraft)
    .filter((plane): plane is LiveAircraft => plane != null)
    .sort(compareAircraft);
}

function basePayload(
  status: FlightStatus,
  nowMs: number,
  aircraft: LiveAircraft[],
  truncated: boolean,
): LiveFlightsPayload {
  return {
    status,
    stale: false,
    source: ADSB_SOURCE,
    license: ADSB_LICENSE,
    location: {
      name: "Ilha do Maio",
      latitude: MAIO_LATITUDE,
      longitude: MAIO_LONGITUDE,
    },
    region: "Cabo Verde",
    radiusNauticalMiles: CABO_VERDE_RADIUS_NM,
    retrievedAt: status === "available" ? new Date(nowMs).toISOString() : null,
    aircraft,
    truncated,
    caveats: [...FLIGHT_CAVEATS],
    retryAfterSeconds: null,
  };
}

function unavailable(
  nowMs: number,
  retryAfterSeconds: number | null,
): LiveFlightsPayload {
  return {
    ...basePayload("unavailable", nowMs, [], false),
    retryAfterSeconds,
  };
}

async function fetchUpstream(
  key: string,
  fetchImpl: AdsbFetch,
  nowMs: number,
): Promise<LiveFlightsPayload> {
  if (!key) return unavailable(nowMs, null);

  let response: Response;
  try {
    response = await fetchImpl(caboVerdeFlightsUrl(), {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-api-key": key,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    return unavailable(nowMs, null);
  }

  if (response.status === 429) {
    return unavailable(
      nowMs,
      parseRetryAfterSeconds(response.headers.get("retry-after"), nowMs),
    );
  }

  if (!response.ok) return unavailable(nowMs, null);

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return unavailable(nowMs, null);
  }

  const aircraft = normalizeAircraftList(body);
  if (!aircraft) return unavailable(nowMs, null);
  const truncated = aircraft.length > MAX_AIRCRAFT;
  return basePayload(
    "available",
    nowMs,
    truncated ? aircraft.slice(0, MAX_AIRCRAFT) : aircraft,
    truncated,
  );
}

function withStale(payload: LiveFlightsPayload, retryAfterSeconds: number | null): LiveFlightsPayload {
  return {
    ...payload,
    stale: true,
    retryAfterSeconds,
  };
}

export async function loadCaboVerdeFlights(options: {
  now: number;
  env: Record<string, string | undefined>;
  fetchImpl: AdsbFetch;
  cache: AdsbCache;
}): Promise<LiveFlightsPayload> {
  const { now, env, fetchImpl, cache } = options;
  const key = readAdsbApiKey(env);
  if (!key) return basePayload("unconfigured", now, [], false);

  if (cache.fresh && cache.freshUntil > now) return cache.fresh;
  if (cache.blockedUntil > now) {
    return cache.stale
      ? withStale(cache.stale, Math.ceil((cache.blockedUntil - now) / 1000))
      : unavailable(now, Math.ceil((cache.blockedUntil - now) / 1000));
  }
  if (cache.pending) return cache.pending;

  const request = fetchUpstream(key, fetchImpl, now)
    .then((result) => {
      if (result.status === "available") {
        cache.fresh = result;
        cache.stale = result;
        cache.freshUntil = now + FLIGHT_CACHE_TTL_MS;
        cache.blockedUntil = 0;
        return result;
      }
      const retry = result.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS;
      cache.blockedUntil = now + retry * 1000;
      if (cache.stale) return withStale(cache.stale, retry);
      return { ...result, retryAfterSeconds: retry };
    })
    .finally(() => {
      if (cache.pending === request) cache.pending = null;
    });

  cache.pending = request;
  return request;
}
