import type { AgoraBody, Envelope } from "./agora.ts";
import { t, type MessageKey } from "./i18n.ts";
import type { Locale } from "./locale.ts";

const intlLocale: Record<Locale, string> = { pt: "pt-PT", en: "en-GB", fr: "fr-FR" };
const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

export type NowCardView = {
  id: "weather" | "sea" | "wind" | "sky";
  label: string;
  primary: string;
  secondary: string;
  source: string;
};

export function formatMaioTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: "Atlantic/Cape_Verde",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function retrievedLabel(iso: string, locale: Locale): string {
  return t("agora.retrieved", { time: formatMaioTime(iso, locale) }, locale);
}

function kindLabel(kind: Envelope<unknown>["kind"], locale: Locale): string {
  if (kind === "calculated") return t("kind.calculated", undefined, locale);
  return t("kind.model", undefined, locale);
}

function sourceLine(envelope: Envelope<unknown>, locale: Locale): string {
  const when = envelope.validAt ?? envelope.observedAt ?? envelope.sourceUpdatedAt;
  const time = when ? formatMaioTime(when, locale) : retrievedLabel(envelope.retrievedAt, locale);
  return `${kindLabel(envelope.kind, locale)} · ${envelope.source.name} · ${time}`;
}

function compass(degrees: number, locale: Locale): string {
  const name = directions[Math.round(degrees / 45) % 8] ?? "N";
  return t(`wind.dir.${name}` as MessageKey, undefined, locale);
}

function weatherWords(code: number | null): string {
  const words: Record<number, string> = {
    0: "Clear",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    61: "Rain",
    80: "Showers",
    95: "Thunderstorm",
  };
  if (code === null) return "";
  return words[code] ?? `WMO ${code}`;
}

export function nowCards(body: AgoraBody, locale: Locale): NowCardView[] {
  const weather = body.weather.data;
  const sea = body.sea.data;
  const wind = body.wind.data;
  const sky = body.sky.data;
  const sunset = sky && sky.solarEvents && typeof sky.solarEvents === "object"
    ? (sky.solarEvents as { sunset?: unknown }).sunset
    : null;
  const moon = sky && sky.moon && typeof sky.moon === "object"
    ? (sky.moon as { illuminatedFraction?: unknown }).illuminatedFraction
    : null;

  return [
    {
      id: "weather",
      label: t("agora.weather", undefined, locale),
      primary: weather?.temperature == null
        ? t("agora.error.card", undefined, locale)
        : `${weatherWords(weather.weather_code)} ${Math.round(weather.temperature)}°C`.trim(),
      secondary: weather?.temperature_min == null || weather.temperature_max == null
        ? ""
        : t("agora.range", { min: Math.round(weather.temperature_min), max: Math.round(weather.temperature_max) }, locale),
      source: sourceLine(body.weather, locale),
    },
    {
      id: "sea",
      label: t("agora.sea", undefined, locale),
      primary: sea?.wave_height == null
        ? t("agora.error.sea", undefined, locale)
        : t("agora.wave", { h: sea.wave_height }, locale),
      secondary: sea?.temperature == null ? t("agora.seaCaveat", undefined, locale) : t("agora.seaTemp", { t: Math.round(sea.temperature) }, locale),
      source: sourceLine(body.sea, locale),
    },
    {
      id: "wind",
      label: t("agora.wind", undefined, locale),
      primary: wind?.speed == null ? t("agora.error.card", undefined, locale) : `${Math.round(wind.speed)} ${wind.unit || t("unit.kmh", undefined, locale)}`,
      secondary: wind?.direction == null ? "" : `${compass(wind.direction, locale)} (${Math.round(wind.direction)}°)`,
      source: sourceLine(body.wind, locale),
    },
    {
      id: "sky",
      label: t("agora.sky", undefined, locale),
      primary: typeof sunset === "string"
        ? t("agora.sunset", { time: formatMaioTime(sunset, locale) }, locale)
        : t("agora.error.card", undefined, locale),
      secondary: typeof moon === "number"
        ? t("agora.moon", { pct: Math.round(moon * 100) }, locale)
        : "",
      source: sourceLine(body.sky, locale),
    },
  ];
}
