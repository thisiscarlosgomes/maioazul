"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/lang";
import { fetchJsonOfflineFirst } from "@/lib/offline";

type MainSiteHeaderProps = {
  inverted?: boolean;
};

type WeatherSnapshot = {
  temperature?: number;
  weather_code?: number;
};

type AirSnapshot = {
  aqi?: number;
  pm2_5?: number;
};

type WeatherCachePayload = {
  weather: WeatherSnapshot | null;
  air: AirSnapshot | null;
  ts: number;
};

const WEATHER_CACHE_KEY = "maio-header-weather-cache-v1";
const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;
let weatherCacheMemory: WeatherCachePayload | null = null;

const navItems = [
  { href: "/map", key: "explore" },
  { href: "/experiences", key: "experiences" },
  { href: "/manifest", key: "manifest" },
] as const;

function weatherIcon(code: number) {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code <= 48) return "☁️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌫️";
  return "🌦️";
}

function pm25ToUsAqi(pm25: number) {
  const c = Math.max(0, pm25);
  const breakpoints: [number, number, number, number][] = [
    [0, 12, 0, 50],
    [12.1, 35.4, 51, 100],
    [35.5, 55.4, 101, 150],
    [55.5, 150.4, 151, 200],
    [150.5, 250.4, 201, 300],
    [250.5, 350.4, 301, 400],
    [350.5, 500.4, 401, 500],
  ];
  for (const [cLow, cHigh, iLow, iHigh] of breakpoints) {
    if (c >= cLow && c <= cHigh) {
      const aqi = ((iHigh - iLow) / (cHigh - cLow)) * (c - cLow) + iLow;
      return Math.round(aqi);
    }
  }
  return 500;
}

function readWeatherCache(): WeatherCachePayload | null {
  if (weatherCacheMemory) return weatherCacheMemory;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherCachePayload;
    if (!parsed || typeof parsed.ts !== "number") return null;
    weatherCacheMemory = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function writeWeatherCache(payload: WeatherCachePayload) {
  weatherCacheMemory = payload;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(payload));
  } catch {}
}

export default function MainSiteHeader({ inverted = false }: MainSiteHeaderProps) {
  const pathname = usePathname();
  const [lang, setLang] = useLang();
  const [weather, setWeather] = useState<WeatherSnapshot | null>(() => readWeatherCache()?.weather ?? null);
  const [air, setAir] = useState<AirSnapshot | null>(() => readWeatherCache()?.air ?? null);

  const copy = {
    en: {
      explore: "Explore",
      attractions: "Attractions",
      experiences: "Experiences",
      manifest: "Tourist Manifest",
      home: "Visit Maio",
      pt: "Portuguese",
      en: "English",
    },
    pt: {
      explore: "Explorar",
      attractions: "Atrações",
      experiences: "Experiências",
      manifest: "Manifesto Turístico",
      home: "Visit Maio",
      pt: "Português",
      en: "Inglês",
    },
  } as const;

  const colors = inverted
    ? {
        text: "text-white",
        soft: "text-white/80",
        border: "border-white/30",
        bg: "bg-white/10",
        activeBg: "bg-white/25",
        hover: "hover:bg-white/15",
      }
    : {
        text: "text-foreground",
        soft: "text-muted-foreground",
        border: "border-border",
        bg: "bg-background",
        activeBg: "bg-muted",
        hover: "hover:bg-muted/70",
      };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cached = readWeatherCache();
    const now = Date.now();
    const isFresh = Boolean(cached && now - cached.ts < WEATHER_CACHE_TTL_MS);

    if (cached?.weather || cached?.air) {
      setWeather(cached.weather);
      setAir(cached.air);
    }

    if (isFresh) return;

    const run = () => {
      fetchJsonOfflineFirst<any>("/api/maio/weather")
        .then((nextWeather) => {
          setWeather(nextWeather);
          const previous = readWeatherCache();
          writeWeatherCache({
            weather: nextWeather ?? null,
            air: previous?.air ?? null,
            ts: Date.now(),
          });
        })
        .catch(() => {});

      fetchJsonOfflineFirst<any>("/api/maio/air")
        .then((nextAir) => {
          setAir(nextAir);
          const previous = readWeatherCache();
          writeWeatherCache({
            weather: previous?.weather ?? null,
            air: nextAir ?? null,
            ts: Date.now(),
          });
        })
        .catch(() => {});
    };
    const idle = (window as any).requestIdleCallback;
    const id = idle ? idle(run, { timeout: 1500 }) : window.setTimeout(run, 1200);
    return () => {
      if (idle) (window as any).cancelIdleCallback?.(id);
      else window.clearTimeout(id);
    };
  }, []);

  const weatherAqiBadge = useMemo(() => {
    const temp = typeof weather?.temperature === "number" ? Math.round(weather.temperature) : null;
    const icon = weatherIcon(Number(weather?.weather_code ?? 1));
    let aqi: number | null = null;
    if (typeof air?.aqi === "number") {
      aqi = Math.round(air.aqi);
    } else if (typeof air?.pm2_5 === "number") {
      aqi = pm25ToUsAqi(air.pm2_5);
    }
    if (temp == null && aqi == null) return null;
    return { temp, aqi, icon };
  }, [weather, air]);

  return (
    <header
      className={`${
        inverted ? "absolute inset-x-0 top-0 z-40" : "sticky inset-x-0 top-0 z-40 border-b bg-background/95 backdrop-blur"
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" aria-label={copy[lang].home} className="inline-flex items-center">
          <img
            src="/visitmaio.svg"
            alt="Visit Maio"
            className={`h-[1.4rem] w-auto ${inverted ? "brightness-0 invert" : ""}`}
          />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition ${
                  active ? colors.text : colors.soft
                } ${inverted ? "hover:text-white" : "hover:text-foreground"}`}
              >
                {copy[lang][item.key]}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {weatherAqiBadge && (
            <div className="w-[56px] rounded-lg border border-border bg-background/95 px-1.5 py-1 text-foreground shadow-sm backdrop-blur">
              <div className="flex items-center justify-center gap-0.5 leading-none">
                <span className="text-[10px]">{weatherAqiBadge.icon}</span>
                <span className="text-[13px] font-semibold leading-none tracking-tight">
                  {weatherAqiBadge.temp != null ? `${weatherAqiBadge.temp}°` : "—"}
                </span>
              </div>
              <div className="mt-0.5 flex items-center justify-center gap-0.5 leading-none">
                <span className="text-[7px] font-medium uppercase tracking-wide text-muted-foreground">
                  AQI
                </span>
                <span className="text-[10px] font-semibold leading-none">{weatherAqiBadge.aqi ?? "—"}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
              </div>
            </div>
          )}

          <div
            className={`inline-flex items-center rounded-2xl border p-1 ${colors.border} ${colors.bg}`}
            role="group"
            aria-label="Language switcher"
          >
            <button
              type="button"
              onClick={() => setLang("pt")}
              aria-label={copy[lang].pt}
              className={`rounded-xl px-3 py-1.5 text-lg leading-none transition ${
                lang === "pt" ? `${colors.activeBg} ${colors.text}` : `${colors.soft} ${colors.hover}`
              }`}
            >
              🇵🇹
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              aria-label={copy[lang].en}
              className={`rounded-xl px-3 py-1.5 text-lg leading-none transition ${
                lang === "en" ? `${colors.activeBg} ${colors.text}` : `${colors.soft} ${colors.hover}`
              }`}
            >
              🇬🇧
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
