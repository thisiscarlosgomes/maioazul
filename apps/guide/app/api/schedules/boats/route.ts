import { NextResponse } from "next/server";

export const revalidate = 900; // 15 min

const SOURCE_URL = "https://www.cvinterilhas.cv/routesschedules";
const REQUEST_TIMEOUT_MS = 12_000;

type BoatSchedule = {
  line: string;
  date: string;
  vessel: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
};

type BoatResponse = {
  source: string;
  updated_at: string;
  selected_date: string | null;
  available_dates: string[];
  schedules: BoatSchedule[];
  fallback: false;
  partial?: boolean;
};

type DatePostback = {
  date: string;
  target: string;
};

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(html: string) {
  return decodeHtml(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function getAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"));
  return match ? decodeHtml(match[1]) : "";
}

function parseHiddenFields(html: string) {
  const fields: Record<string, string> = {};
  for (const match of html.matchAll(/<input\b[^>]*>/gi)) {
    const tag = match[0];
    if (getAttribute(tag, "type").toLowerCase() !== "hidden") continue;
    const name = getAttribute(tag, "name");
    if (name) fields[name] = getAttribute(tag, "value");
  }
  return fields;
}

function toIsoDate(raw: string) {
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

function parseDatePostbacks(html: string): DatePostback[] {
  const dates = [...html.matchAll(/<input\b[^>]*hdfDepartureDate[^>]*>/gi)]
    .map((match) => toIsoDate(getAttribute(match[0], "value")))
    .filter(Boolean);
  const targets = [
    ...html.matchAll(
      /__doPostBack\(&#39;([^<]*?rptScheduleDayPick[^<]*?)&#39;,&#39;&#39;\)/g
    ),
  ].map((match) => decodeHtml(match[1]));

  return dates
    .map((date, index) => ({ date, target: targets[index] || "" }))
    .filter((item) => item.target);
}

function parseSchedules(html: string, date: string): BoatSchedule[] {
  const text = stripHtml(html);
  const results: BoatSchedule[] = [];
  const pattern = /(LS)\s+(\d{2}:\d{2})\s+(Santiago|Maio)\s+(Santiago|Maio)/g;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const [, line, departure, from, to] = match;
    if (from === to) continue;
    results.push({
      line,
      date,
      vessel: "CV Interilhas",
      from,
      to,
      departure,
      arrival: "",
    });
  }

  return results;
}

function getCookieHeader(response: Response) {
  const raw = response.headers.get("set-cookie") || "";
  return raw
    .split(/,(?=[^;,]+=)/)
    .map((cookie) => cookie.split(";", 1)[0])
    .filter(Boolean)
    .join("; ");
}

async function fetchSource(init?: RequestInit) {
  return fetch(SOURCE_URL, {
    ...init,
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; MaioGuide/1.0)",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

export async function GET() {
  try {
    const initialResponse = await fetchSource();
    if (!initialResponse.ok) {
      throw new Error(`CV Interilhas returned ${initialResponse.status}`);
    }

    const initialHtml = await initialResponse.text();
    const postbacks = parseDatePostbacks(initialHtml);
    if (!postbacks.length) throw new Error("No schedule dates found");

    const hiddenFields = parseHiddenFields(initialHtml);
    const cookie = getCookieHeader(initialResponse);
    const [first, ...remaining] = postbacks;
    const schedules = parseSchedules(initialHtml, first.date);

    const results = await Promise.allSettled(
      remaining.map(async ({ date, target }) => {
        const body = new URLSearchParams({
          ...hiddenFields,
          __EVENTTARGET: target,
          __EVENTARGUMENT: "",
        });
        const response = await fetchSource({
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            ...(cookie ? { cookie } : {}),
          },
          body,
        });
        if (!response.ok) {
          throw new Error(`Schedule postback returned ${response.status}`);
        }
        return parseSchedules(await response.text(), date);
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") schedules.push(...result.value);
    }

    schedules.sort(
      (a, b) => a.date.localeCompare(b.date) || a.departure.localeCompare(b.departure)
    );
    const availableDates = Array.from(new Set(schedules.map((item) => item.date)));
    const response: BoatResponse = {
      source: SOURCE_URL,
      updated_at: new Date().toISOString(),
      selected_date: availableDates[0] || null,
      available_dates: availableDates,
      schedules,
      fallback: false,
      partial: results.some((result) => result.status === "rejected") || undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to load CV Interilhas schedules", error);
    return NextResponse.json(
      { error: "Boat schedules unavailable" },
      { status: 502 }
    );
  }
}
