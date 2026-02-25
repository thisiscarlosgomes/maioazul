"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Navigation, Waves } from "lucide-react";
import { useLang } from "@/lib/lang";

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

type SurfResponse = {
  location: string;
  timezone: string;
  updated_at: string;
  points: SurfPoint[];
};

const directionToCompass = (degrees: number) => {
  const labels = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return labels[index];
};

const qualityFromPoint = (point: SurfPoint) => {
  let score = 3;
  if (point.swell_period_s >= 10) score += 1;
  if (point.wind_kph <= 12) score += 1;
  if (point.wind_gust_kph >= 22) score -= 1;
  return Math.max(1, Math.min(5, score));
};

function QualityBar({ score }: { score: number }) {
  const activeColor = score <= 2 ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="flex h-[78px] w-3.5 flex-col-reverse gap-1 md:h-[110px] md:w-5 justify-center">
      {Array.from({ length: 5 }).map((_, index) => {
        const active = index < score;
        return (
          <div
            key={index}
            className={`h-2 rounded-full md:h-3 ${active ? activeColor : "bg-[#dfe4ea]"}`}
          />
        );
      })}
    </div>
  );
}

export default function SportsPage() {
  const [lang] = useLang();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [surf, setSurf] = useState<SurfResponse | null>(null);

  const copy = useMemo(
    () => ({
      en: {
        title: "Sports",
        subtitle: "Live water conditions for surf sessions.",
        surfTitle: "Surf",
        surfDescription: "Forecast for Maio at 6am, noon, and 6pm.",
        comingSoonTitle: "More sports coming soon",
        comingSoonBody: "Kite, SUP, fishing, and more will be added here.",
        surfCol: "Surf (m)",
        swellCol: "Swell",
        windCol: "Wind",
        noData: "No surf data right now.",
        back: "Back to places",
      },
      pt: {
        title: "Desportos",
        subtitle: "Condições do mar em tempo real para sessões de surf.",
        surfTitle: "Surf",
        surfDescription: "Previsão para Maio às 6h, 12h e 18h.",
        comingSoonTitle: "Mais desportos em breve",
        comingSoonBody: "Kite, SUP, pesca e mais atividades vão aparecer aqui.",
        surfCol: "Surf (m)",
        swellCol: "Ondulação",
        windCol: "Vento",
        noData: "Sem dados de surf neste momento.",
        back: "Voltar aos lugares",
      },
    }),
    []
  );

  useEffect(() => {
    let canceled = false;
    fetch("/api/maio/surf")
      .then((res) => {
        if (!res.ok) throw new Error("bad status");
        return res.json();
      })
      .then((data: SurfResponse) => {
        if (canceled) return;
        setSurf(data);
      })
      .catch(() => {
        if (!canceled) setError(true);
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8">
      <Link
        href="/places"
        className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {copy[lang].back}
      </Link>

      <div className="mt-4 maio-fade-up">
        <h1 className="text-2xl font-semibold">{copy[lang].title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy[lang].subtitle}</p>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-background p-4 maio-fade-in">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Waves className="h-5 w-5 text-maio-blue" />
              {copy[lang].surfTitle}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy[lang].surfDescription}</p>
          </div>
          <div className="text-xs text-muted-foreground">{surf?.location || "Maio"}</div>
        </div>

        <div className="mt-4">
          <div>
            <div className="grid grid-cols-[56px_minmax(116px,1.05fr)_minmax(92px,0.9fr)_minmax(92px,0.9fr)] items-center gap-1.5 px-0.5 pb-3 text-[clamp(14px,4vw,16px)] font-semibold leading-none md:grid-cols-[120px_260px_340px_200px] md:gap-4 md:px-2 md:pb-4 md:text-md">
              <div />
              <div>{copy[lang].surfCol}</div>
              <div>{copy[lang].swellCol}</div>
              <div>{copy[lang].windCol}</div>
            </div>

            {!loading && surf?.points?.length
              ? surf.points.map((point) => {
                const quality = qualityFromPoint(point);
                const windRotation = point.wind_direction_deg - 90;
                const windCompass = directionToCompass(point.wind_direction_deg);

                return (
                  <div
                    key={point.time}
                    className="grid grid-cols-[56px_minmax(116px,1.05fr)_minmax(92px,0.9fr)_minmax(92px,0.9fr)] items-center gap-1.5 border-b border-border px-0.5 py-1 md:grid-cols-[120px_260px_340px_200px] md:gap-4 md:px-2 md:py-5"
                  >
                    <div className="self-center flex items-center justify-center gap-1 md:justify-start md:gap-2">
                      <div className="self-center">
                        <QualityBar score={quality} />
                      </div>
                      <div className="text-muted-foreground [writing-mode:vertical-rl] [transform:rotate(180deg)] text-sm leading-none">
                        {point.label}
                      </div>
                    </div>

                    <div className="rounded-lg py-3 text-left md:rounded-xl md:px-8 md:py-5">
                      <div className="text-[clamp(14px,4.6vw,16px)] font-semibold leading-none md:text-md">
                        {point.surf_min_m.toFixed(1)}-{point.surf_max_m.toFixed(1)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 items-center gap-1 md:grid-cols-[1fr_1fr_1fr] md:gap-4">
                      <div className="text-[clamp(13px,4vw,16px)] font-semibold leading-none md:text-md">
                        {point.swell_m.toFixed(1)}
                        <span className="ml-1 text-[clamp(11px,3.2vw,14px)] text-muted-foreground md:text-[18px]">m</span>
                      </div>
                      <div className="text-[clamp(13px,4vw,16px)] font-semibold leading-none md:text-md">
                        {point.swell_period_s}
                        <span className="ml-1 text-[clamp(11px,3.2vw,14px)] text-muted-foreground md:text-[18px]">s</span>
                      </div>


                      <div className="text-[clamp(13px,4vw,16px)] font-semibold leading-none md:text-md">
                        {point.swell_direction_deg}
                         <span className="ml-1 text-[clamp(11px,3.2vw,14px)] text-muted-foreground md:text-[18px]">°</span>
                      </div>



                    </div>

                    <div className="grid grid-cols-1 items-center gap-1 md:grid-cols-[1fr_94px] md:gap-4">
                      <div className="leading-none">
                        <div className="text-[clamp(13px,4vw,16px)] font-semibold md:text-[24px]">{point.wind_kph}</div>
                        <div className="mt-0.5 text-[clamp(13px,4vw,16px)] font-semibold md:mt-1 md:text-[24px]">{point.wind_gust_kph} 


                           <span className="ml-1 text-[clamp(11px,3.2vw,14px)] text-muted-foreground md:text-[18px]">kphs</span>
                        </div>
                      </div>
                      <div className="rounded-lg text-left md:rounded-xl md:p-2.5">
                        <Navigation
                          className="hidden mx-auto h-5 w-5 text-foreground"
                          style={{ transform: `rotate(${windRotation}deg)` }}
                        />
                        <div className="mt-0.5 text-[clamp(10px,3vw,12px)] font-semibold text-muted-foreground md:mt-1 md:text-xl">
                          {windCompass}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
              : null}
          </div>
        </div>

        {!loading && (!surf?.points?.length || error) ? (
          <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            {copy[lang].noData}
          </div>
        ) : null}
      </section>

      <section className="mt-6 rounded-2xl border border-dashed border-border bg-muted/25 p-4">
        <h3 className="text-sm font-semibold">{copy[lang].comingSoonTitle}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{copy[lang].comingSoonBody}</p>
      </section>
    </div>
  );
}
