import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const revalidate = 21600;

const CVSKY_URL = "https://booking.cvsky.cv/ibe";
const FLIGHTMAPPER = {
  raiMmo: "https://info.flightmapper.net/route/Cabo_Verde_Airlines_VR_RAI_MMO",
  mmoRai: "https://info.flightmapper.net/route/Cabo_Verde_Airlines_VR_MMO_RAI",
};
const TIMEZONE = "Atlantic/Cape_Verde";
const MAX_DATES = 7;
type RouteCode = "RAI" | "MMO";

type FlightSchedule = {
  date?: string;
  day: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  airline: string;
  source: string;
  flight?: string;
  status?: string;
};

function today() {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function dateString(date: Date, separator: "-" | "." | "/") {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return separator === "-"
    ? `${year}-${month}-${day}`
    : `${day}${separator}${month}${separator}${year}`;
}

function parseCvskyDate(value: string) {
  const [day, month, year] = value.split(".").map(Number);
  return year && month && day ? new Date(Date.UTC(year, month - 1, day, 12)) : null;
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .trim();
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/json",
      "User-Agent": "VisitMaio-Schedule/1.0 (+https://www.maio.cv)",
    },
    next: { revalidate },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
  return response.text();
}

async function availableDates(from: RouteCode, to: RouteCode) {
  const start = today();
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 28);
  const params = new URLSearchParams({
    depPort: from,
    arrPort: to,
    startDate: dateString(start, "/"),
    endDate: dateString(end, "/"),
  });
  const payload = JSON.parse(
    await fetchText(`${CVSKY_URL}/search/availableFlightDates?${params}`)
  ) as { availableDates?: string[] };
  return (payload.availableDates || []).slice(0, MAX_DATES);
}

function parseCvskyFlight(
  html: string,
  date: Date,
  from: RouteCode,
  to: RouteCode
): FlightSchedule | null {
  const index = html.search(/class="js-journey"[^>]*data-journeyType="OUTBOUND"/);
  if (index < 0) return null;
  const match = html.slice(index, index + 18000).match(
    /mobile-route-block[\s\S]*?<span class="time">\s*([^<]+)<\/span>[\s\S]*?<span class="port">\s*([^<]+)<\/span>[\s\S]*?<span class="flight-no">\s*([^<]+)<\/span>[\s\S]*?<span class="time">\s*([^<]+)<\/span>[\s\S]*?<span class="port">\s*([^<]+)<\/span>/
  );
  if (!match) return null;
  const [, departure, , flight, arrival] = match.map(decodeHtml);
  return {
    date: dateString(date, "-"),
    day: new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(date),
    from,
    to,
    departure,
    arrival,
    airline: "CVSky",
    source: "CVSky",
    flight,
    status: "scheduled",
  };
}

async function cvskyFlight(from: RouteCode, to: RouteCode, value: string) {
  const date = parseCvskyDate(value);
  if (!date) return null;
  const params = new URLSearchParams({
    lang: "en",
    tripType: "ONE_WAY",
    depPort: from,
    arrPort: to,
    departureDate: dateString(date, "/"),
    "passengerQuantities[0].passengerType": "ADLT",
    "passengerQuantities[0].quantity": "1",
  });
  return parseCvskyFlight(
    await fetchText(`${CVSKY_URL}/availability/?${params}`),
    date,
    from,
    to
  );
}

async function cvskyRoute(from: RouteCode, to: RouteCode) {
  const flights = await Promise.all(
    (await availableDates(from, to)).map((date) => cvskyFlight(from, to, date))
  );
  return flights.filter((flight): flight is FlightSchedule => flight !== null);
}

type CachedFlight = {
  departure?: { scheduledTime?: string; iataCode?: string };
  arrival?: { scheduledTime?: string; iataCode?: string };
  airline?: { name?: string };
  flight?: { iataNumber?: string; number?: string };
  status?: string;
};
type CachePayload = { date?: string; data?: CachedFlight[] };

async function readCache(name: string): Promise<CachePayload | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(process.cwd(), "out", name), "utf8"));
  } catch {
    return null;
  }
}

function cachedFlights(payload: CachePayload | null, from: RouteCode, to: RouteCode) {
  if (!Array.isArray(payload?.data)) return [];
  return payload.data
    .filter((item) => item?.departure && item?.arrival)
    .map((item) => ({
      date: item.departure?.scheduledTime?.slice(0, 10) || payload.date,
      day: "",
      from: item.departure?.iataCode || from,
      to: item.arrival?.iataCode || to,
      departure: item.departure?.scheduledTime?.slice(11, 16) || "",
      arrival: item.arrival?.scheduledTime?.slice(11, 16) || "",
      airline: item.airline?.name || "Cabo Verde Airlines",
      source: "Aviationstack (fallback)",
      flight: item.flight?.iataNumber || item.flight?.number,
      status: item.status || "",
    })) as FlightSchedule[];
}

function flightMapperFlights(text: string, from: RouteCode, to: RouteCode) {
  const flights: FlightSchedule[] = [];
  const pattern = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{2}:\d{2})\s+.*?\((RAI|MMO)\)\s+(\d{2}:\d{2})\s+.*?\((RAI|MMO)\)/g;
  const dayIndex: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")))) {
    const [, day, departure, fromCode, arrival, toCode] = match;
    if (fromCode !== from || toCode !== to) continue;
    const date = today();
    date.setUTCDate(date.getUTCDate() + ((dayIndex[day] - date.getUTCDay() + 7) % 7));
    flights.push({ date: dateString(date, "-"), day, from, to, departure, arrival, airline: "Cabo Verde Airlines", source: "FlightMapper (fallback)" });
  }
  return flights;
}

async function fallbackSchedules() {
  const [raiCache, mmoCache] = await Promise.all([
    readCache("stack_today_RAI_MMO.json"),
    readCache("stack_today_MMO_RAI.json"),
  ]);
  const raiMmo = cachedFlights(raiCache, "RAI", "MMO");
  const mmoRai = cachedFlights(mmoCache, "MMO", "RAI");
  if (raiMmo.length || mmoRai.length) {
    return { source: "Aviationstack (fallback)", routes: { rai_mmo: raiMmo, mmo_rai: mmoRai } };
  }
  const [raiHtml, mmoHtml] = await Promise.all([
    fetchText(FLIGHTMAPPER.raiMmo),
    fetchText(FLIGHTMAPPER.mmoRai),
  ]);
  return {
    source: "FlightMapper (fallback)",
    routes: {
      rai_mmo: flightMapperFlights(raiHtml, "RAI", "MMO"),
      mmo_rai: flightMapperFlights(mmoHtml, "MMO", "RAI"),
    },
  };
}

export async function GET() {
  try {
    const [raiMmo, mmoRai] = await Promise.all([
      cvskyRoute("RAI", "MMO"),
      cvskyRoute("MMO", "RAI"),
    ]);
    if (!raiMmo.length && !mmoRai.length) throw new Error("CVSky returned no Maio flights");
    return NextResponse.json({
      updated_at: new Date().toISOString(),
      source: "CVSky",
      routes: { rai_mmo: raiMmo, mmo_rai: mmoRai },
    });
  } catch (error) {
    console.error("CVSky schedule fetch failed; using fallback", error);
    try {
      return NextResponse.json({ updated_at: new Date().toISOString(), ...(await fallbackSchedules()) });
    } catch (fallbackError) {
      console.error("All flight schedule sources failed", fallbackError);
      return NextResponse.json({ error: "Flight schedules unavailable" }, { status: 502 });
    }
  }
}
