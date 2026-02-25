import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const revalidate = 21600; // 6h

const SOURCES = {
  raiMmo:
    "https://info.flightmapper.net/route/Cabo_Verde_Airlines_VR_RAI_MMO",
  mmoRai:
    "https://info.flightmapper.net/route/Cabo_Verde_Airlines_VR_MMO_RAI",
};

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

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

function parseFlightMapper(
  text: string,
  from: string,
  to: string
): FlightSchedule[] {
  const results: FlightSchedule[] = [];
  const dayTokens = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const directPattern =
    /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{2}:\d{2})\s+.*?\((RAI|MMO)\)\s+(\d{2}:\d{2})\s+.*?\((RAI|MMO)\)/g;

  let directMatch: RegExpExecArray | null;
  while ((directMatch = directPattern.exec(text))) {
    const [, day, departure, fromCode, arrival, toCode] = directMatch;
    if (fromCode !== from || toCode !== to) continue;
    results.push({
      day,
      from: fromCode,
      to: toCode,
      departure,
      arrival,
      airline: "Cabo Verde Airlines",
      source: "FlightMapper",
    });
  }

  if (results.length) return results;

  const blocks = text.split("Cabo Verde Airlines").slice(1);

  blocks.forEach((block) => {
    const timeMatch = block.match(
      /(\d{2}:\d{2}).*?\((RAI|MMO)\).*?(\d{2}:\d{2}).*?\((RAI|MMO)\)/
    );
    if (!timeMatch) return;
    const [, departure, fromCode, arrival, toCode] = timeMatch;
    if (fromCode !== from || toCode !== to) return;

    const tokens = block.match(/Mon|Tue|Wed|Thu|Fri|Sat|Sun|-/g) || [];
    const days: string[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (dayTokens.includes(token)) {
        const next = tokens[i + 1];
        if (next !== "-") {
          days.push(token);
        }
      }
    }

    if (days.length === 0) {
      dayTokens.forEach((d) => days.push(d));
    }

    days.forEach((day) => {
      results.push({
        day,
        from: fromCode,
        to: toCode,
        departure,
        arrival,
        airline: "Cabo Verde Airlines",
        source: "FlightMapper",
      });
    });
  });

  return results;
}

type CachePayload = {
  date?: string;
  route?: string;
  data?: any;
};

const CACHE_DIR = path.join(process.cwd(), "out");
const CACHE_FILES = {
  raiMmo: "stack_today_RAI_MMO.json",
  mmoRai: "stack_today_MMO_RAI.json",
};

async function readCache(fileName: string): Promise<CachePayload | null> {
  try {
    const raw = await fs.readFile(path.join(CACHE_DIR, fileName), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function pickTime(value?: string) {
  if (!value) return "";
  if (value.includes("T")) return value.slice(11, 16);
  return value;
}

function normalizeCache(
  payload: CachePayload | null,
  from: string,
  to: string
): FlightSchedule[] {
  if (!payload || !Array.isArray(payload.data)) return [];
  return payload.data
    .filter((item) => item?.departure && item?.arrival)
    .map((item) => {
      const departureTime = pickTime(item.departure?.scheduledTime);
      const arrivalTime = pickTime(item.arrival?.scheduledTime);
      const date =
        item.departure?.scheduledTime?.slice(0, 10) ||
        item.arrival?.scheduledTime?.slice(0, 10) ||
        payload.date;
      return {
        date,
        day: "",
        from: item.departure?.iataCode || from,
        to: item.arrival?.iataCode || to,
        departure: departureTime,
        arrival: arrivalTime,
        airline: item.airline?.name || "Cabo Verde Airlines",
        source: "Aviationstack (local cache)",
        flight: item.flight?.iataNumber || item.flight?.number,
        status: item.status || "",
      };
    });
}

async function fetchText(url: string) {
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.text();
}

export async function GET() {
  try {
    const [cacheRaiMmo, cacheMmoRai] = await Promise.all([
      readCache(CACHE_FILES.raiMmo),
      readCache(CACHE_FILES.mmoRai),
    ]);

    const cachedRaiMmo = normalizeCache(cacheRaiMmo, "RAI", "MMO");
    const cachedMmoRai = normalizeCache(cacheMmoRai, "MMO", "RAI");

    if (cachedRaiMmo.length || cachedMmoRai.length || cacheRaiMmo || cacheMmoRai) {
      return NextResponse.json({
        updated_at: new Date().toISOString(),
        source: "Aviationstack (local cache)",
        routes: {
          rai_mmo: cachedRaiMmo,
          mmo_rai: cachedMmoRai,
        },
      });
    }

    const [rawRaiMmo, rawMmoRai] = await Promise.all([
      fetchText(SOURCES.raiMmo),
      fetchText(SOURCES.mmoRai),
    ]);

    const raiMmo = parseFlightMapper(stripHtml(rawRaiMmo), "RAI", "MMO");
    const mmoRai = parseFlightMapper(stripHtml(rawMmoRai), "MMO", "RAI");

    return NextResponse.json({
      updated_at: new Date().toISOString(),
      source: "FlightMapper",
      routes: {
        rai_mmo: raiMmo,
        mmo_rai: mmoRai,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Flight schedules unavailable" },
      { status: 500 }
    );
  }
}
