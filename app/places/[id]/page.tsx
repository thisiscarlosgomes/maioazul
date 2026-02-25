"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import maplibregl from "maplibre-gl";
import { Drawer } from "vaul";
import { Heart, Maximize2, Minimize2, Pause, Play, Volume2, X } from "lucide-react";
import { useFavorites } from "@/lib/favorites";
import { hasVoiceForId, pauseVoice, playVoice, resumeVoice, stopVoice, useVoiceManifest, useVoiceProgress, useVoiceState } from "@/lib/voice";
import { fetchJsonOfflineFirst } from "@/lib/offline";
import { useLang } from "@/lib/lang";

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
  const [loading, setLoading] = useState(true);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [lang] = useLang();
  const [baseMap, setBaseMap] = useState<"normal" | "satellite">("normal");
  const voiceState = useVoiceState();
  const voiceManifest = useVoiceManifest();
  const voiceActive = voiceState.status === "playing";
  const voicePaused = voiceState.status === "paused";
  const voiceLoading = voiceState.status === "loading";
  const voiceProgress = useVoiceProgress();
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { isFavorite, toggle } = useFavorites();

  const copy = useMemo(
    () => ({
      pt: {
        overview: "Visão geral",
        nearby: "Perto de si",
        close: "Fechar",
        map: "Mapa",
        location: "Localização",
        voiceTitle: "Guia de voz",
        voiceDescription: "Ouça um resumo deste lugar em áudio.",
        voicePlay: "Iniciar",
        voicePause: "Pausar",
        voiceResume: "Continuar",
        voiceCancel: "Cancelar",
        voiceLoading: "A preparar áudio...",
      },
      en: {
        overview: "Overview",
        nearby: "Nearby",
        close: "Close",
        map: "Map",
        location: "Location",
        voiceTitle: "Voice tour",
        voiceDescription: "Listen to a short audio summary for this place.",
        voicePlay: "Play",
        voicePause: "Pause",
        voiceResume: "Resume",
        voiceCancel: "Cancel",
        voiceLoading: "Preparing audio...",
      },
    }),
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("maio-basemap");
    if (stored === "normal" || stored === "satellite") {
      setBaseMap(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("maio-basemap", baseMap);
  }, [baseMap]);

  useEffect(() => {
    fetchJsonOfflineFirst<Place[]>("/api/places")
      .then((data) => {
        setAllPlaces(data);
        setPlace(data.find((p) => p.id === id) || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);


  useEffect(() => {
    if (!place?.coordinates || !mapContainerRef.current) return;

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

    const marker = new maplibregl.Marker({ color: "#2563eb" })
      .setLngLat(place.coordinates)
      .addTo(map);

    const markerEl = marker.getElement();
    const handleMarkerClick = () => setPinOpen(true);
    markerEl.addEventListener("click", handleMarkerClick);

    const setInteractivity = (enabled: boolean) => {
      const action = enabled ? "enable" : "disable";
      map.scrollZoom[action]();
      map.boxZoom[action]();
      map.dragRotate[action]();
      map.dragPan[action]();
      map.keyboard[action]();
      map.doubleClickZoom[action]();
      map.touchZoomRotate[action]();
    };

    setInteractivity(mapFullscreen);
    mapRef.current = map;

    return () => {
      markerEl.removeEventListener("click", handleMarkerClick);
      map.remove();
      mapRef.current = null;
    };
  }, [place, lang]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.resize();
  }, [mapFullscreen]);

  useEffect(() => {
    if (!mapRef.current) return;
    const action = mapFullscreen ? "enable" : "disable";
    mapRef.current.scrollZoom[action]();
    mapRef.current.boxZoom[action]();
    mapRef.current.dragRotate[action]();
    mapRef.current.dragPan[action]();
    mapRef.current.keyboard[action]();
    mapRef.current.doubleClickZoom[action]();
    mapRef.current.touchZoomRotate[action]();
  }, [mapFullscreen]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (mapFullscreen) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      document.body.classList.add("map-fullscreen");
      return () => {
        document.body.style.overflow = previous;
        document.body.classList.remove("map-fullscreen");
      };
    }
    document.body.classList.remove("map-fullscreen");
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

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto pb-32">
        <div className="relative aspect-[16/9] rounded-2xl bg-muted animate-pulse" />
        <div className="px-4 pt-6 space-y-3">
          <div className="h-6 w-2/3 rounded-full bg-muted animate-pulse" />
          <div className="h-4 w-1/2 rounded-full bg-muted animate-pulse" />
          <div className="mt-6 h-4 w-full rounded-full bg-muted animate-pulse" />
          <div className="h-4 w-5/6 rounded-full bg-muted animate-pulse" />
          <div className="h-4 w-4/6 rounded-full bg-muted animate-pulse" />
          <div className="mt-6 h-5 w-32 rounded-full bg-muted animate-pulse" />
          <div className="h-56 w-full rounded-lg bg-muted animate-pulse" />
          <div className="mt-6 h-5 w-28 rounded-full bg-muted animate-pulse" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={`nearby-skel-${i}`}
                className="min-w-[70%] rounded-2xl border bg-background p-3"
              >
                <div className="h-36 w-full rounded-2xl bg-muted animate-pulse" />
                <div className="mt-3 h-4 w-3/5 rounded-full bg-muted animate-pulse" />
                <div className="mt-2 h-3 w-full rounded-full bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!place) return null;

  const nearby = getNearbyPlaces(place, allPlaces);
  const pick = (value?: { pt?: string; en?: string }) =>
    value?.[lang] || value?.en || value?.pt || "";
  const descriptionText = (place.description?.en || "").replace(/\s+/g, " ").trim();
  const canPlayVoice = Boolean(descriptionText) && hasVoiceForId(place.id, voiceManifest);
  const isVoiceForPlace = voiceState.placeId === place.id;
  const tagLabel = (value: string) =>
    value
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const handleVoicePlay = async () => {
    if (!canPlayVoice) return;
    const text = `${place.name?.en || pick(place.name)}. ${descriptionText}`;
    await playVoice({ text, title: pick(place.name), lang: "en", placeId: place.id });
  };

  const handleVoicePauseToggle = () => {
    if (voicePaused) {
      resumeVoice();
    } else {
      if (voiceActive) pauseVoice();
    }
  };

  const handleVoiceCancel = () => {
    stopVoice();
  };

  const formatTime = (value: number) => {
    const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-3xl mx-auto pb-36">
      {/* HERO */}
      <div className="relative aspect-[16/9]">
        <img
          src={place.image_url}
          alt={pick(place.name)}
          className="absolute inset-0 h-full w-full object-cover"
          decoding="async"
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <Link
            href="/map"
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur hover:bg-black/55 active:scale-[0.95]"
          >
            <X className="h-4 w-4" />
          </Link>
          <button
            type="button"
            aria-label={
              isFavorite(place.id)
                ? lang === "pt"
                  ? "Remover favorito"
                  : "Remove favorite"
                : lang === "pt"
                  ? "Guardar favorito"
                  : "Save favorite"
            }
            onClick={() => toggle(place.id)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur transition active:scale-[0.95]"
          >
            <Heart
              className={`h-4 w-4 ${
                isFavorite(place.id) ? "fill-rose-400 text-rose-400" : "text-white"
              }`}
            />
          </button>
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

      <div className="px-4 pt-6" />

      {/* CONTENT */}
      <div className="px-4 pt-1 pb-8 space-y-6 text-sm leading-relaxed">
        {canPlayVoice && (
          <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {copy[lang].voiceTitle}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {copy[lang].voiceDescription}
                </p>
              </div>
              {/* <div className="h-9 w-9 rounded-full border border-border bg-background/95 backdrop-blur shadow-sm flex items-center justify-center text-muted-foreground">
                <Volume2 className="h-4 w-4" />
              </div> */}
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {(voiceActive || voicePaused) && isVoiceForPlace && voiceProgress.duration > 0 && (
                <div className="w-full">
                  <div className="h-1.5 w-full rounded-full bg-muted/70">
                    <div
                      className="h-1.5 rounded-full bg-foreground transition-[width]"
                      style={{
                        width: `${Math.min(
                          100,
                          (voiceProgress.currentTime / voiceProgress.duration) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                {voiceLoading && isVoiceForPlace ? (
                  <div className="text-xs text-muted-foreground">
                    {copy[lang].voiceLoading}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!descriptionText) return;
                      if (isVoiceForPlace && (voiceActive || voicePaused)) {
                        handleVoicePauseToggle();
                      } else {
                        handleVoicePlay();
                      }
                    }}
                    aria-label={
                      isVoiceForPlace && (voiceActive || voicePaused)
                        ? voicePaused
                          ? copy[lang].voiceResume
                          : copy[lang].voicePause
                        : copy[lang].voicePlay
                    }
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-sm hover:bg-accent"
                  >
                    {isVoiceForPlace && (voiceActive || voicePaused) ? (
                      voicePaused ? (
                        <Play className="h-3.5 w-3.5" />
                      ) : (
                        <Pause className="h-3.5 w-3.5" />
                      )
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
                {(voiceActive || voicePaused) && isVoiceForPlace && (
                  <button
                    type="button"
                    onClick={handleVoiceCancel}
                    aria-label={copy[lang].voiceCancel}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-sm hover:bg-accent"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <p>{pick(place.description)}</p>
          {place.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {place.tags.map((tag) => (
                <span
                  key={tag}
                  className="uppercase inline-flex items-center rounded-xl border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-foreground/80"
                >
                  {tagLabel(tag)}
                </span>
              ))}
            </div>
          )}
        </div>

        {place.coordinates && (
          <div className="space-y-3">
            {!mapFullscreen && (
              <div className="text-base font-semibold">{copy[lang].location}</div>
            )}
            <div
              className={
                mapFullscreen
                  ? "fixed inset-0 z-50 bg-background"
                  : "relative h-56 rounded-lg border border-border overflow-hidden bg-muted"
              }
            >
              <div
                ref={mapContainerRef}
                className={`absolute inset-0 h-full w-full ${
                  mapFullscreen ? "" : "pointer-events-none"
                }`}
              />
              <div className="absolute top-3 right-3 z-10">
                <button
                  type="button"
                  onClick={() => setMapFullscreen((v) => !v)}
                  className="rounded-full border border-border bg-background/95 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-accent active:scale-[0.95]"
                >
                  {mapFullscreen ? copy[lang].close : copy[lang].map}
                </button>
              </div>
              {mapFullscreen && (
                <div className="absolute top-3 left-3 z-10">
                  <div className="grid w-full grid-cols-2 gap-1 rounded-lg border border-border bg-background/95 p-1 shadow-sm">
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
              )}
              {mapFullscreen && (
                <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
                  <button
                    type="button"
                    onClick={() => setMapFullscreen(false)}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background/95 px-6 text-sm font-medium shadow-lg hover:bg-accent active:scale-[0.98]"
                  >
                    {copy[lang].close}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}


        {nearby.length > 0 && (
          <div className="space-y-2">
            <div className="text-base font-semibold">{copy[lang].nearby}</div>
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide scroll-smooth overscroll-x-contain">
              {nearby.map((p) => (
                <Link
                  key={p.id}
                  href={`/places/${p.id}`}
                  className="snap-start min-w-[70%] sm:min-w-[44%] rounded-2xl border bg-background p-3 shadow-sm hover:shadow-md transition active:scale-[0.99] active:translate-y-[1px]"
                >
                  <div className="relative overflow-hidden rounded-2xl">
                      <img
                        src={p.image_url || "/image.png"}
                        alt={pick(p.name)}
                        className="h-36 w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div className="mt-3 text-sm font-semibold">
                    {pick(p.name)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {pick(p.description)}
                    </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {place && (
        <Drawer.Root open={pinOpen} onOpenChange={setPinOpen}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" />
            <Drawer.Content className="fixed inset-x-0 bottom-0 z-[70] outline-none">
              <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-t-3xl bg-neutral-950 text-white shadow-2xl">
                <div className="relative h-56 sm:h-64">
                  <img
                    src={place.image_url || "/image.png"}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute right-4 top-4">
                    <button
                      type="button"
                      onClick={() => setPinOpen(false)}
                      className="inline-flex items-center justify-center rounded-full border border-white/20 bg-black/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur hover:bg-black/60"
                    >
                      {copy[lang].close}
                    </button>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/80">
                      <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 uppercase tracking-wide">
                        {place.category || "Place"}
                      </span>
                      <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1">
                        {pick(place.location)}
                      </span>
                    </div>
                    <div className="mt-3 text-2xl font-semibold leading-tight">
                      {pick(place.name)}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 px-5 pb-8 pt-5">
                  <p className="text-sm text-white/75">
                    {pick(place.description)}
                  </p>

                  <div className="grid grid-cols-3 gap-3 text-center text-xs uppercase tracking-wide text-white/70">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <div className="text-lg font-semibold text-white">
                        {place.tags?.length || 0}
                      </div>
                      <div className="mt-1">Tags</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <div className="text-lg font-semibold text-white">
                        {place.category || "Place"}
                      </div>
                      <div className="mt-1">Type</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <div className="text-lg font-semibold text-white">
                        {lang === "pt" ? "Maio" : "Maio"}
                      </div>
                      <div className="mt-1">Island</div>
                    </div>
                  </div>

                  {place.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {place.tags.slice(0, 6).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white/80"
                        >
                          {tagLabel(tag)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}

    </div>
  );
}

/* =======================
   UI bits
======================= */

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
