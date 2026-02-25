import { NextResponse } from "next/server";

export const revalidate = 900; // 15 min

const SOURCE_URL = "https://www.cvinterilhas.cv/routesschedules";

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

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
  fallback?: boolean;
};

function parseAvailableDates(text: string) {
  const matches = [...text.matchAll(/\b(\d{2}\s+[A-Za-z]{3})\b/g)].map(
    (m) => m[1]
  );
  return Array.from(new Set(matches));
}

function parseSelectedDate(text: string) {
  const match = text.match(
    /\b(\d{1,2}\s+[A-Za-z]+\s*-\s*[A-Za-z]+)\b/
  );
  return match ? match[1] : null;
}

function parseSchedules(text: string, selectedDate: string | null): BoatSchedule[] {
  const results: BoatSchedule[] = [];
  const pattern =
    /(LS)\s+(\d{2}:\d{2})\s+(Santiago|Maio)\s+(Santiago|Maio)/g;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const [, line, departure, from, to] = match;
    if (
      (from === "Santiago" && to === "Maio") ||
      (from === "Maio" && to === "Santiago")
    ) {
      results.push({
        line,
        date: selectedDate || "",
        vessel: "CV Interilhas",
        from,
        to,
        departure,
        arrival: "",
      });
    }
  }

  return results;
}

export async function GET() {
  try {
    const res = await fetch(SOURCE_URL, { next: { revalidate } });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Boat schedules unavailable" },
        { status: 500 }
      );
    }
    const html = await res.text();
    const text = stripHtml(html);
    const availableDates = parseAvailableDates(text);
    const selectedDate = parseSelectedDate(text);
    const schedules = parseSchedules(text, selectedDate);

    let fallback = false;
    let finalSchedules = schedules;
    let finalAvailableDates = availableDates;
    let finalSelectedDate = selectedDate;

    const buildFallbackDates = () => {
      const now = new Date();
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Atlantic/Cape_Verde",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .format(now)
        .split("-");
      const cvNoon = new Date(
        Date.UTC(
          Number(parts[0]),
          Number(parts[1]) - 1,
          Number(parts[2]),
          12,
          0,
          0
        )
      );
      const targetDays = new Set(["Wed", "Fri", "Sun"]);
      const dates: string[] = [];
      for (let i = 0; i < 21 && dates.length < 14; i++) {
        const d = new Date(cvNoon);
        d.setUTCDate(d.getUTCDate() + i);
        const label = new Intl.DateTimeFormat("en-US", {
          timeZone: "Atlantic/Cape_Verde",
          weekday: "short",
        }).format(d);
        if (targetDays.has(label)) {
          const dateLabel = new Intl.DateTimeFormat("en-US", {
            timeZone: "Atlantic/Cape_Verde",
            month: "short",
            day: "numeric",
          }).format(d);
          dates.push(dateLabel);
        }
      }
      return dates;
    };

    if (!finalSchedules.length) {
      fallback = true;
      const dates = buildFallbackDates();
      finalAvailableDates = dates;
      finalSelectedDate = dates[0] || null;
      finalSchedules = dates.flatMap((date) => [
        {
          line: "LS",
          date,
          vessel: "CV Interilhas",
          from: "Santiago",
          to: "Maio",
          departure: "07:00",
          arrival: "",
        },
        {
          line: "LS",
          date,
          vessel: "CV Interilhas",
          from: "Maio",
          to: "Santiago",
          departure: "10:00",
          arrival: "",
        },
      ]);
    } else {
      // If we only have a single day from the site, extend with the weekly pattern.
      const uniqueDates = Array.from(new Set(finalSchedules.map((s) => s.date)));
      if (uniqueDates.length <= 1) {
        const dates = buildFallbackDates();
        finalAvailableDates = dates;
        finalSelectedDate = finalSelectedDate || dates[0] || null;
        finalSchedules = dates.flatMap((date) => [
          {
            line: "LS",
            date,
            vessel: "CV Interilhas",
            from: "Santiago",
            to: "Maio",
            departure: "07:00",
            arrival: "",
          },
          {
            line: "LS",
            date,
            vessel: "CV Interilhas",
            from: "Maio",
            to: "Santiago",
            departure: "10:00",
            arrival: "",
          },
        ]);
        fallback = true;
      }
    }

    const response: BoatResponse = {
      source: SOURCE_URL,
      updated_at: new Date().toISOString(),
      selected_date: finalSelectedDate,
      available_dates: finalAvailableDates,
      schedules: finalSchedules,
      fallback,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: "Boat schedules unavailable" },
      { status: 500 }
    );
  }
}
