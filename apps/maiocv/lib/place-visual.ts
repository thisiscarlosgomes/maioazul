import type { Locale } from "./locale";
import { t, type MessageKey } from "./i18n.ts";

export type PlaceCard = { name: string; detail: string; url: string; image?: string };

export const PLACE_COLLECTIONS: Record<string, { title: MessageKey; kind: MessageKey }> = {
  beaches: { title: "openui.places.beaches", kind: "openui.places.beach" },
  heritage: { title: "openui.places.heritage", kind: "openui.places.heritageKind" },
};

export function placeDataUrl(collection: string) {
  return `https://api.maio.cv/api/v1/collections/${collection}/items?limit=100`;
}

function localized(value: unknown, locale: Locale): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of [locale, "pt"]) {
    const text = record[key];
    if (typeof text === "string" && text.trim()) return text.trim();
  }
  return null;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt");
}

function sourceImage(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com" &&
      url.pathname.startsWith("/dhxfkhewr/image/") ? url.href : undefined;
  } catch { return undefined; }
}

export function placeVisualProgram(payload: unknown, answer: string, collection: string, locale: Locale = "pt"): string | null {
  const config = PLACE_COLLECTIONS[collection];
  if (!config || !payload || typeof payload !== "object") return null;
  const data = payload as { numberMatched?: unknown; features?: unknown };
  if (!Array.isArray(data.features)) return null;
  const normalizedAnswer = normalize(answer);
  const candidates = data.features.flatMap((item): Array<PlaceCard & { position: number }> => {
    if (!item || typeof item !== "object") return [];
    const feature = item as { id?: unknown; properties?: { name?: unknown; displayName?: unknown; attributes?: { location?: unknown; coordinates?: unknown; image_url?: unknown } } };
    const name = localized(feature.properties?.displayName, locale) ?? localized(feature.properties?.name, locale);
    if (!name || typeof feature.id !== "string") return [];
    const key = normalize(name);
    const position = normalizedAnswer.indexOf(key);
    if (position < 0) return [];
    const coordinates = feature.properties?.attributes?.coordinates;
    const validCoordinates = Array.isArray(coordinates) && coordinates.length >= 2 &&
      typeof coordinates[0] === "number" && typeof coordinates[1] === "number" &&
      coordinates[0] >= -180 && coordinates[0] <= 180 && coordinates[1] >= -90 && coordinates[1] <= 90;
    const url = validCoordinates
      ? `https://www.openstreetmap.org/?mlat=${coordinates[1]}&mlon=${coordinates[0]}#map=15/${coordinates[1]}/${coordinates[0]}`
      : `https://api.maio.cv/api/v1/features/${encodeURIComponent(feature.id)}`;
    return [{ name, detail: localized(feature.properties?.attributes?.location, locale) ?? t(config.kind, undefined, locale),
      url, image: sourceImage(feature.properties?.attributes?.image_url), position }];
  });
  const byName = new Map<string, PlaceCard & { position: number }>();
  for (const candidate of candidates) {
    const key = normalize(candidate.name);
    if (!byName.has(key) || (!byName.get(key)?.image && candidate.image)) byName.set(key, candidate);
  }
  const cards = [...byName.values()]
    .sort((a, b) => Number(!!b.image) - Number(!!a.image) || a.position - b.position)
    .slice(0, 3)
    .sort((a, b) => a.position - b.position);
  if (!cards.length) return null;
  const title = t(config.title, undefined, locale);
  const count = typeof data.numberMatched === "number" && Number.isInteger(data.numberMatched) && data.numberMatched > 0
    ? t(collection === "beaches" ? "openui.places.beachesMapped" : "openui.places.placesMapped", { n: data.numberMatched }, locale)
    : t("openui.places.mapped", undefined, locale);
  const items = cards.map(({ name, detail, url, image }) => ({ name, detail, url, image }));
  return `root = PlaceCollection(${[title, count, t("openui.places.source", undefined, locale), JSON.stringify(items)].map(value => JSON.stringify(value)).join(", ")})`;
}
