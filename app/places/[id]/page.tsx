"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import maplibregl from "maplibre-gl";
import { Map as MapIcon } from "lucide-react";

type Place = {
  id: string;
  name: { pt: string; en: string };
  location: { pt: string; en: string };
  category: string;
  tags: string[];
  description: { pt: string; en: string };
  image_url: string;
  source: string;
  coordinates: [number, number] | null;
};

export default function PlacePage() {
  const { id } = useParams();
  const [place, setPlace] = useState<Place | null>(null);
  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  const [tab, setTab] = useState<"overview">("overview");
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [lang, setLang] = useState<"pt" | "en">("en");
  const [baseMap, setBaseMap] = useState<"normal" | "satellite">("normal");
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const copy = useMemo(
    () => ({
      pt: {
        overview: "Visão geral",
        nearby: "Perto de si",
        readMore: "Ler mais",
        close: "Fechar",
        map: "Mapa",
      },
      en: {
        overview: "Overview",
        nearby: "Nearby",
        readMore: "Read more",
        close: "Close",
        map: "Map",
      },
    }),
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("maio-lang");
    if (stored === "pt" || stored === "en") {
      setLang(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("maio-basemap");
    if (stored === "normal" || stored === "satellite") {
      setBaseMap(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("maio-lang", lang);
  }, [lang]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("maio-basemap", baseMap);
  }, [baseMap]);

  useEffect(() => {
    fetch("/data/maio_places_with_coords.json")
      .then((r) => r.json())
      .then((data: Place[]) => {
        setAllPlaces(data);
        setPlace(data.find((p) => p.id === id) || null);
      });
  }, [id]);

  useEffect(() => {
    if (!mapFullscreen || !place?.coordinates || !mapContainerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    if (typeof window !== "undefined" && maplibregl.getWorkerUrl() === "") {
      maplibregl.setWorkerUrl("/maplibre-gl-csp-worker.js");
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      center: place.coordinates,
      zoom: 13,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          osm: {
            type: "raster",
            tiles: [
              "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
          satellite: {
            type: "raster",
            tiles: [
              "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "© Esri, Maxar, Earthstar Geographics",
          },
        },
        layers: [
          {
            id: "background",
            type: "background",
            paint: {
              "background-color": "#f8f7f2",
            },
          },
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
          {
            id: "satellite",
            type: "raster",
            source: "satellite",
            layout: {
              visibility: "none",
            },
          },
        ],
      },
    });

    const popup = new maplibregl.Popup({
      offset: 18,
      className: "place-popup",
    }).setText(place.name[lang]);

    new maplibregl.Marker({ color: "#2563eb" })
      .setLngLat(place.coordinates)
      .setPopup(popup)
      .addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [place, lang, mapFullscreen]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.resize();
  }, [mapFullscreen]);

  useEffect(() => {
    if (mapFullscreen) return;
    if (!mapRef.current) return;
    mapRef.current.remove();
    mapRef.current = null;
  }, [mapFullscreen]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (mapFullscreen) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
    return undefined;
  }, [mapFullscreen]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const showSatellite = baseMap === "satellite";
    if (map.getLayer("osm")) {
      map.setLayoutProperty("osm", "visibility", showSatellite ? "none" : "visible");
    }
    if (map.getLayer("satellite")) {
      map.setLayoutProperty(
        "satellite",
        "visibility",
        showSatellite ? "visible" : "none"
      );
    }
  }, [baseMap]);

  if (!place) return null;

  const nearby = getNearbyPlaces(place, allPlaces);
  const pick = (value?: { pt?: string; en?: string }) =>
    value?.[lang] || value?.en || value?.pt || "";

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* HERO */}
      <div className="relative aspect-[16/9]">
        <img
          src={place.image_url}
          alt={pick(place.name)}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <a
            href="/map"
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur hover:bg-black/55"
          >
            ✕
          </a>
        </div>
        <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-16 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
          <h1 className="text-2xl sm:text-3xl font-semibold leading-tight text-white drop-shadow">
            {pick(place.name)}
          </h1>
          <div className="mt-1 text-sm text-white/85">
            {pick(place.location)}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4" />

      {/* TABS */}
      <div className="mt-6 border-b px-4 flex gap-6 text-sm">
        <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
          {copy[lang].overview}
        </TabButton>
      </div>

      {/* CONTENT */}
      <div className="px-4 py-6 space-y-4 text-sm leading-relaxed">

        {tab === "overview" && (
          <div className="space-y-2">
            <p className={descriptionExpanded ? "" : "line-clamp-4"}>
              {pick(place.description)}
            </p>
            {!descriptionExpanded && (
              <button
                type="button"
                onClick={() => setDescriptionExpanded(true)}
                className="text-xs font-medium text-foreground hover:underline"
              >
                {copy[lang].readMore}
              </button>
            )}
          </div>
        )}


        {nearby.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">{copy[lang].nearby}</div>
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide scroll-smooth overscroll-x-contain touch-pan-x">
              {nearby.map((p) => (
                <a
                  key={p.id}
                  href={`/places/${p.id}`}
                  className="snap-start min-w-[70%] sm:min-w-[44%] rounded-2xl border bg-background p-3 shadow-sm hover:shadow-md transition"
                >
                  <div className="relative overflow-hidden rounded-2xl">
                      <img
                        src={p.image_url || "/image.png"}
                        alt={pick(p.name)}
                        className="h-36 w-full object-cover"
                      />
                    </div>
                    <div className="mt-3 text-sm font-semibold">
                    {pick(p.name)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {pick(p.description)}
                    </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {place.coordinates && !mapFullscreen && (
        <div className="fixed bottom-8 left-1/2 z-40 -translate-x-1/2">
          <button
            type="button"
            onClick={() => setMapFullscreen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-3 text-sm font-medium shadow-lg hover:bg-accent"
          >
            <MapIcon className="h-4 w-4" />
            {copy[lang].map}
          </button>
        </div>
      )}

      {place.coordinates && mapFullscreen && (
        <div className="fixed inset-0 z-50 bg-background">
          <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />
          <div className="absolute top-4 left-4 z-10">
            <div className="grid w-full grid-cols-2 gap-2 rounded-lg border border-border bg-background/95 p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setBaseMap("normal")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  baseMap === "normal"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang === "pt" ? "Normal" : "Normal"}
              </button>
              <button
                type="button"
                onClick={() => setBaseMap("satellite")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  baseMap === "satellite"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang === "pt" ? "Satélite" : "Satellite"}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMapFullscreen(false)}
            className="absolute top-4 right-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur hover:bg-black/55"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

/* =======================
   UI bits
======================= */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-3 ${
        active
          ? "border-b-2 border-foreground font-medium"
          : "text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function getNearbyPlaces(place: Place, allPlaces: Place[]) {
  if (!place.coordinates) return [];

  const [lng1, lat1] = place.coordinates;
  const distanceKm = (coords: [number, number]) => {
    const [lng2, lat2] = coords;
    const toRad = (n: number) => (n * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  return allPlaces
    .filter((p) => p.id !== place.id && p.coordinates)
    .map((p) => ({
      ...p,
      _distance: distanceKm(p.coordinates as [number, number]),
      _sameCategory: p.category === place.category,
    }))
    .sort((a, b) => {
      if (a._sameCategory !== b._sameCategory) {
        return a._sameCategory ? -1 : 1;
      }
      return a._distance - b._distance;
    })
    .slice(0, 8);
}
