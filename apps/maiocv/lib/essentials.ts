import type { Envelope } from "./agora.ts";
import { maioClock } from "./agora.ts";
import { t } from "./i18n.ts";
import type { Locale } from "./locale.ts";
import type { MessageKey } from "./i18n.ts";
import { retrievedLabel } from "./now-view.ts";

const boatsSource = {
  id: "cv-interilhas",
  name: "CV Interilhas",
  url: "https://www.cvinterilhas.cv/routesschedules",
};
const flightsSource = {
  id: "flightmapper",
  name: "FlightMapper",
  url: "https://info.flightmapper.net/",
};
const paymentsSource = {
  id: "dataset-payments",
  name: "INE e SISP",
  url: "https://api.maio.cv/api/v1/sources/dataset-payments",
};

const portal = "https://portal.maio.cv";

export type Sailing = { from: string; to: string; departure: string; date: string };
export type PaymentCount = { year: string; value: number };

export type EssentialsBody = {
  ferry: Envelope<Sailing[]>;
  flight: Envelope<{ status: string; sourceUrls: { id: string; url: string }[] }>;
  payments: Envelope<{ atms: PaymentCount; pos: PaymentCount }>;
};

function unavailable<T>(kind: Envelope<T>["kind"], source: Envelope<T>["source"], retrievedAt: string): Envelope<T> {
  return { kind, status: "unavailable", source, sourceUpdatedAt: null, retrievedAt, caveats: [], data: null };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

const caveatKeys: Record<string, MessageKey> = {
  "Only the explicitly selected source day is parsed. Date-picker options are not confirmed sailing dates.": "ess.caveat.ferry.day",
  "No fallback, extrapolated sailings, vessel names, arrivals or live status. Confirm travel with the operator.": "ess.caveat.ferry.operator",
  "updated_at is null because operator publication time is unknown; retrievedAt is fetch time.": "ess.caveat.timeUnknown",
  "Third-party published timetable, not live operations or airline confirmation.": "ess.caveat.flight.third",
  "Only explicit weekday rows whose published validity includes today are returned. Expired, future-only and undated rows are excluded. No current records does not mean no flights.": "ess.caveat.flight.rows",
  "Unverified local cache files are not used. updated_at is null: publication time is unknown.": "ess.caveat.flight.cache",
};

export function visibleCaveat(text: string, locale: Locale): string {
  return t(caveatKeys[text] ?? "ess.caveat.generic", undefined, locale);
}

const verifiedIntl: Record<Locale, string> = { pt: "pt-PT", en: "en-GB", fr: "fr-FR" };

export function verifiedDate(isoDate: string, locale: Locale): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat(verifiedIntl[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

const flightRouteKeys: Record<string, MessageKey> = {
  rai_mmo: "ess.flight.route.rai_mmo",
  mmo_rai: "ess.flight.route.mmo_rai",
};

export function flightRouteLabel(id: string, locale: Locale): string {
  const key = flightRouteKeys[id];
  return key ? t(key, undefined, locale) : id.replace(/[_-]+/g, " ");
}

export function scheduleSource(
  envelope: { kind: string; source: { name: string }; retrievedAt: string; caveats: string[] },
  locale: Locale,
): { line: string; caveats: string[] } {
  const kind = envelope.kind === "published-schedule"
    ? t("kind.published-schedule", undefined, locale)
    : envelope.kind;
  return {
    line: `${kind} · ${envelope.source.name} · ${retrievedLabel(envelope.retrievedAt, locale)}`,
    caveats: envelope.caveats,
  };
}

export function sailingsForToday(payload: unknown, today: string): Sailing[] {
  const body = asRecord(payload);
  const rows = Array.isArray(body.schedules) ? body.schedules : [];
  return rows.flatMap((row) => {
    const item = asRecord(row);
    if (item.date !== today) return [];
    if (typeof item.departure !== "string" || typeof item.from !== "string" || typeof item.to !== "string") return [];
    return [{ from: item.from, to: item.to, departure: item.departure, date: today }];
  });
}

export function paymentCount(payload: unknown, key: string, island: string, year: string): number | null {
  const rows = asRecord(payload)[key];
  if (!Array.isArray(rows)) return null;
  const row = rows.map(asRecord).find((item) => item.name === island);
  const values = asRecord(row?.values);
  const value = values[year];
  return typeof value === "number" ? value : null;
}

export async function loadEssentials(fetchImpl: typeof fetch, now = new Date()): Promise<EssentialsBody> {
  const retrievedAt = now.toISOString();
  const today = maioClock(now).date;
  const [ferry, flight, payments] = await Promise.all([
    loadFerry(fetchImpl, retrievedAt, today),
    loadFlight(fetchImpl, retrievedAt),
    loadPayments(fetchImpl, retrievedAt),
  ]);
  return { ferry, flight, payments };
}

async function loadFerry(fetchImpl: typeof fetch, retrievedAt: string, today: string): Promise<Envelope<Sailing[]>> {
  try {
    const payload = asRecord(await (await fetchImpl(`${portal}/api/schedules/boats`)).json());
    const sailings = sailingsForToday(payload, today);
    const caveats = Array.isArray(payload.caveats) ? payload.caveats.filter((item): item is string => typeof item === "string") : [];
    return {
      kind: "published-schedule",
      status: sailings.length ? "available" : "no-current-records",
      source: boatsSource,
      sourceUpdatedAt: null,
      retrievedAt: typeof payload.retrievedAt === "string" ? payload.retrievedAt : retrievedAt,
      caveats,
      data: sailings,
    };
  } catch {
    return unavailable("published-schedule", boatsSource, retrievedAt);
  }
}

async function loadFlight(fetchImpl: typeof fetch, retrievedAt: string): Promise<Envelope<{ status: string; sourceUrls: { id: string; url: string }[] }>> {
  try {
    const payload = asRecord(await (await fetchImpl(`${portal}/api/schedules/flights`)).json());
    const urls = asRecord(payload.sourceUrls);
    const sourceUrls = Object.entries(urls).flatMap(([id, url]) => (typeof url === "string" ? [{ id, url }] : []));
    const routes = asRecord(payload.routes);
    const hasRows = Object.values(routes).some((rows) => Array.isArray(rows) && rows.length > 0);
    return {
      kind: "published-schedule",
      status: hasRows ? "available" : "no-current-records",
      source: flightsSource,
      sourceUpdatedAt: null,
      retrievedAt: typeof payload.retrievedAt === "string" ? payload.retrievedAt : retrievedAt,
      caveats: Array.isArray(payload.caveats) ? payload.caveats.filter((item): item is string => typeof item === "string") : [],
      data: { status: typeof payload.status === "string" ? payload.status : "partial", sourceUrls },
    };
  } catch {
    return unavailable("published-schedule", flightsSource, retrievedAt);
  }
}

async function loadPayments(fetchImpl: typeof fetch, retrievedAt: string): Promise<Envelope<{ atms: PaymentCount; pos: PaymentCount }>> {
  try {
    const payload = await (await fetchImpl(`${portal}/api/finance/datasets?dataset=payment_system_2019_2023`)).json();
    const year = "2023";
    const atms = paymentCount(payload, "atm_terminals_by_island", "Maio", year);
    const pos = paymentCount(payload, "pos_terminals_by_island", "Maio", year);
    if (atms === null || pos === null) return unavailable("official-statistic", paymentsSource, retrievedAt);
    return {
      kind: "official-statistic",
      status: "available",
      source: paymentsSource,
      sourceUpdatedAt: null,
      retrievedAt,
      caveats: [],
      data: { atms: { year, value: atms }, pos: { year, value: pos } },
    };
  } catch {
    return unavailable("official-statistic", paymentsSource, retrievedAt);
  }
}
