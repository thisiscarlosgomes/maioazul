import { t, type MessageKey } from "./i18n.ts";
import type { Locale } from "./locale.ts";

export type SearchHit = {
  id: string;
  name: string;
  nameLang: string;
  description: string;
  unmapped: boolean;
  source: string;
};

type Feature = {
  id?: unknown;
  geometry?: unknown;
  properties?: {
    displayName?: unknown;
    name?: unknown;
    nameStatus?: unknown;
    sourceIds?: unknown;
    attributes?: { title?: unknown; description?: unknown };
  };
};

export function nameOf(feature: Feature, locale: Locale): { name: string; lang: string } {
  const properties = feature.properties ?? {};
  if (typeof properties.displayName === "string" && properties.displayName.trim()) {
    return { name: properties.displayName, lang: locale };
  }
  const name = properties.name;
  if (typeof name === "string" && name.trim()) return { name, lang: locale };
  if (name && typeof name === "object") {
    const record = name as Record<string, unknown>;
    const preferred = record[locale];
    if (typeof preferred === "string" && preferred.trim()) return { name: preferred, lang: locale };
    if (typeof record.pt === "string" && record.pt.trim()) return { name: record.pt, lang: "pt" };
  }
  const title = properties.attributes?.title;
  if (typeof title === "string" && title.trim()) return { name: title, lang: locale };
  return { name: "", lang: locale };
}

export function descriptionOf(feature: Feature, locale: Locale): { text: string; lang: string } {
  const description = feature.properties?.attributes?.description;
  if (!description || typeof description !== "object") return { text: "", lang: locale };
  const record = description as Record<string, unknown>;
  const preferred = record[locale];
  if (typeof preferred === "string" && preferred.trim()) return { text: preferred, lang: locale };
  if (typeof record.pt === "string") return { text: record.pt, lang: "pt" };
  return { text: "", lang: locale };
}

export function toHit(feature: Feature, locale: Locale): SearchHit | null {
  if (feature.properties?.nameStatus === "missing") return null;
  const named = nameOf(feature, locale);
  if (!named.name) return null;
  const described = descriptionOf(feature, locale);
  const sources = Array.isArray(feature.properties?.sourceIds)
    ? feature.properties.sourceIds.filter((item): item is string => typeof item === "string")
    : [];
  return {
    id: typeof feature.id === "string" ? feature.id : named.name,
    name: named.name,
    nameLang: named.lang,
    description: described.text,
    unmapped: feature.geometry == null,
    source: sources[0] ?? "",
  };
}

const sourceKeys: Record<string, MessageKey> = {
  beaches_osm: "search.source.beaches_osm",
  "enapor-porto-ingles": "search.source.enapor-porto-ingles",
  "guide-offroad": "search.source.guide-offroad",
  "guide-places": "search.source.guide-places",
  "guide-settlements": "search.source.guide-settlements",
  hydrology: "search.source.hydrology",
  "iae-2024-user-workbook": "search.source.iae-2024-user-workbook",
  "ingt-carta-agricola-maio": "search.source.ingt-carta-agricola-maio",
  "maio-guide": "search.source.maio-guide",
  natural_features: "search.source.natural_features",
  places_osm_raw: "search.source.places_osm_raw",
  "planned-sports": "search.source.planned-sports",
  protected_areas: "search.source.protected_areas",
  settlements: "search.source.settlements",
  "user-porto-ingles-coordinates": "search.source.user-porto-ingles-coordinates",
  "visit-maio": "search.source.visit-maio",
  zoning_special: "search.source.zoning_special",
};

export function sourceName(id: string, locale: Locale): string {
  const key = sourceKeys[id];
  return key ? t(key, undefined, locale) : t("search.source.other", undefined, locale);
}

export async function searchFeatures(fetchImpl: typeof fetch, query: string, locale: Locale): Promise<SearchHit[]> {
  const url = new URL("https://api.maio.cv/api/v1/features");
  url.searchParams.set("q", query.slice(0, 200));
  url.searchParams.set("limit", "25");
  const payload = await (await fetchImpl(url)).json() as { features?: Feature[] };
  const features = Array.isArray(payload.features) ? payload.features : [];
  return features.flatMap((feature) => {
    const hit = toHit(feature, locale);
    return hit ? [hit] : [];
  });
}
