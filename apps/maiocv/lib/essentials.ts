import type { Envelope } from "./agora.ts";
import { maioClock } from "./agora.ts";
import { t } from "./i18n.ts";
import type { Locale } from "./locale.ts";
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
  flight: Envelope<{ status: string; sourceUrls: string[] }>;
  payments: Envelope<{ atms: PaymentCount; pos: PaymentCount }>;
};

function unavailable<T>(kind: Envelope<T>["kind"], source: Envelope<T>["source"], retrievedAt: string): Envelope<T> {
  return { kind, status: "unavailable", source, sourceUpdatedAt: null, retrievedAt, caveats: [], data: null };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
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

async function loadFlight(fetchImpl: typeof fetch, retrievedAt: string): Promise<Envelope<{ status: string; sourceUrls: string[] }>> {
  try {
    const payload = asRecord(await (await fetchImpl(`${portal}/api/schedules/flights`)).json());
    const urls = asRecord(payload.sourceUrls);
    const sourceUrls = Object.values(urls).filter((item): item is string => typeof item === "string");
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
