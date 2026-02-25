"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/favorites";
import { useLang } from "@/lib/lang";
import Link from "next/link";
import { getVoiceUrl } from "@/lib/voice";

type Place = {
  id: string;
  name: { pt: string; en: string };
  description: { pt: string; en: string };
  image_url?: string;
  location?: { pt?: string; en?: string };
  coordinates?: [number, number];
};

export default function FavoritesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [lang] = useLang();
  const { favoritesSet, toggle } = useFavorites();
  const [protectedAreas, setProtectedAreas] = useState<any[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadTotal, setDownloadTotal] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const copy = useMemo(
    () => ({
      pt: {
        title: "Perfil",
        subtitle: "Os seus favoritos e downloads offline.",
        empty: "Ainda não guardou nenhum lugar.",
        favorites: "Favoritos",
        downloads: "Offline",
        packTitle: "North Maio Pack",
        packBody: "Guia de voz + mapa para a zona norte.",
        packDownload: "Descarregar",
        packDownloading: "A descarregar…",
        packDone: "Concluído",
      },
      en: {
        title: "Profile",
        subtitle: "Your favorites and offline downloads.",
        empty: "You haven't saved any places yet.",
        favorites: "Favorites",
        downloads: "Offline",
        packTitle: "North Maio Pack",
        packBody: "Voice guide + map for the north area.",
        packDownload: "Download",
        packDownloading: "Downloading…",
        packDone: "Done",
      },
    }),
    []
  );

  useEffect(() => {
    fetch("/data/maio_places_with_coords.json")
      .then((r) => r.json())
      .then(setPlaces)
      .catch(() => {});

    fetch("/data/protected_areas.geojson")
      .then((r) => r.json())
      .then((data) => setProtectedAreas(data?.features || []))
      .catch(() => {});
  }, []);

  const pick = (value?: { pt?: string; en?: string }) =>
    value?.[lang] || value?.en || value?.pt || "";

  const favorites = places.filter((place) => favoritesSet.has(place.id));

  const NORTH_BOUNDS = {
    minLat: 15.2,
    maxLat: 15.42,
    minLng: -23.28,
    maxLng: -23.05,
  };

  const inBounds = (lat: number, lng: number) =>
    lat >= NORTH_BOUNDS.minLat &&
    lat <= NORTH_BOUNDS.maxLat &&
    lng >= NORTH_BOUNDS.minLng &&
    lng <= NORTH_BOUNDS.maxLng;

  const getGeometryCenter = (geometry: any): [number, number] | null => {
    if (!geometry) return null;
    const coords: [number, number][] = [];
    const collect = (g: any) => {
      if (!g) return;
      if (g.type === "Point") coords.push(g.coordinates);
      if (g.type === "MultiPoint" || g.type === "LineString")
        g.coordinates.forEach((c: any) => coords.push(c));
      if (g.type === "MultiLineString" || g.type === "Polygon")
        g.coordinates.forEach((r: any) => r.forEach((c: any) => coords.push(c)));
      if (g.type === "MultiPolygon")
        g.coordinates.forEach((p: any) => p.forEach((r: any) => r.forEach((c: any) => coords.push(c))));
      if (g.type === "GeometryCollection") g.geometries.forEach(collect);
    };
    collect(geometry);
    if (!coords.length) return null;
    let minX = coords[0][0];
    let minY = coords[0][1];
    let maxX = coords[0][0];
    let maxY = coords[0][1];
    coords.forEach(([x, y]) => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });
    return [(minX + maxX) / 2, (minY + maxY) / 2];
  };

  const tileRange = (zoom: number) => {
    const toTile = (lat: number, lng: number) => {
      const latRad = (lat * Math.PI) / 180;
      const n = 2 ** zoom;
      const x = Math.floor(((lng + 180) / 360) * n);
      const y = Math.floor(
        (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n
      );
      return { x, y };
    };
    const nw = toTile(NORTH_BOUNDS.maxLat, NORTH_BOUNDS.minLng);
    const se = toTile(NORTH_BOUNDS.minLat, NORTH_BOUNDS.maxLng);
    return {
      minX: Math.min(nw.x, se.x),
      maxX: Math.max(nw.x, se.x),
      minY: Math.min(nw.y, se.y),
      maxY: Math.max(nw.y, se.y),
    };
  };

  const buildTileUrls = () => {
    const urls: string[] = [];
    const zooms = [10, 11, 12];
    for (const z of zooms) {
      const range = tileRange(z);
      for (let x = range.minX; x <= range.maxX; x += 1) {
        for (let y = range.minY; y <= range.maxY; y += 1) {
          urls.push(`https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`);
        }
      }
    }
    return urls.slice(0, 400);
  };

  const downloadNorthPack = async () => {
    if (typeof window === "undefined" || !("caches" in window)) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const voiceUrls: string[] = [];
      for (const place of places) {
        if (!place.coordinates) continue;
        const [lng, lat] = place.coordinates as [number, number];
        if (!inBounds(lat, lng)) continue;
        const name = place.name?.en || place.name?.pt || "";
        const desc = place.description?.en || "";
        if (!name || !desc) continue;
        const text = `${name}. ${desc}`;
        voiceUrls.push(await getVoiceUrl(text, name));
      }

      for (const feature of protectedAreas) {
        const props = feature?.properties || {};
        const name = props?.name || props?.afia_name || "";
        let desc = props?.description;
        if (typeof desc === "string") {
          try {
            desc = JSON.parse(desc);
          } catch {
            // keep string
          }
        }
        const descriptionText = typeof desc === "string" ? desc : desc?.en || "";
        const center = getGeometryCenter(feature?.geometry);
        if (!center || !name || !descriptionText) continue;
        if (!inBounds(center[1], center[0])) continue;
        const text = `${name}. ${descriptionText}`;
        voiceUrls.push(await getVoiceUrl(text, name));
      }

      const tileUrls = buildTileUrls();
      const total = voiceUrls.length + tileUrls.length;
      setDownloadTotal(total);
      setDownloadProgress(0);

      const cache = await caches.open("maio-offline-pack-v1");
      let done = 0;

      for (const url of voiceUrls) {
        try {
          await cache.add(url);
        } catch {
          // ignore
        } finally {
          done += 1;
          setDownloadProgress(done);
        }
      }

      for (const url of tileUrls) {
        try {
          const req = new Request(url, { mode: "no-cors" });
          const res = await fetch(req);
          await cache.put(req, res);
        } catch {
          // ignore
        } finally {
          done += 1;
          setDownloadProgress(done);
        }
      }
    } catch (err) {
      setDownloadError("Failed to download offline pack.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pt-6 pb-12">
      <div>
        <h1 className="text-2xl font-semibold">{copy[lang].title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {copy[lang].subtitle}
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr,2fr]">
        <div className="rounded-2xl border bg-background p-4 shadow-sm">
          <div className="text-sm font-semibold">{copy[lang].downloads}</div>
          <div className="mt-2 text-sm text-muted-foreground">
            {copy[lang].packTitle}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {copy[lang].packBody}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={downloadNorthPack}
              disabled={downloading}
              className="inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground hover:bg-accent disabled:opacity-50"
            >
              {downloading ? copy[lang].packDownloading : copy[lang].packDownload}
            </button>
            {downloadTotal > 0 && (
              <span className="text-xs text-muted-foreground">
                {Math.round((downloadProgress / downloadTotal) * 100)}%
              </span>
            )}
          </div>
          {downloadError && (
            <div className="mt-2 text-xs text-rose-600">{downloadError}</div>
          )}
          {!downloading && downloadTotal > 0 && downloadProgress >= downloadTotal && (
            <div className="mt-2 text-xs text-emerald-600">{copy[lang].packDone}</div>
          )}
        </div>

        <div>
          <div className="text-sm font-semibold">{copy[lang].favorites}</div>
          {favorites.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              {copy[lang].empty}
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {favorites.map((place) => (
                <Link
                  key={place.id}
                  href={`/places/${place.id}`}
                  className="rounded-2xl border bg-background p-3 shadow-sm hover:shadow-md transition active:scale-[0.99] active:translate-y-[1px]"
                >
                  <div className="relative overflow-hidden rounded-2xl">
                    <img
                      src={place.image_url || "/image.png"}
                      alt={pick(place.name)}
                      className="h-40 w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <button
                      type="button"
                      aria-label={
                        lang === "pt" ? "Remover favorito" : "Remove favorite"
                      }
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        toggle(place.id);
                      }}
                      className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-400 bg-rose-500 text-white backdrop-blur transition active:scale-[0.95]"
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </button>
                  </div>
                  <div className="mt-3 text-base font-semibold">
                    {pick(place.name)}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {pick(place.description)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
