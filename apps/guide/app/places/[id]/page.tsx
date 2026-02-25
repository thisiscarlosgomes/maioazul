"use client";

import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import maplibregl from "maplibre-gl";
import { Drawer } from "vaul";
import {
  Bird,
  Compass,
  Droplets,
  Fish,
  Footprints,
  Landmark,
  Leaf,
  LifeBuoy,
  MapPin,
  Mountain,
  Recycle,
  Check,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  TreePine,
  Waves,
  Wind,
  LocateFixed,
  Minus,
  Plus,
  Heart,
  Minimize2,
  Pause,
  Play,
  Volume2,
  X,
} from "lucide-react";
import { useFavorites } from "@/lib/favorites";
import { hasVoiceForId, pauseVoice, playVoice, resumeVoice, setVoiceSpeed, stopVoice, useVoiceManifest, useVoiceProgress, useVoiceSpeed, useVoiceState, VOICE_SPEED_OPTIONS } from "@/lib/voice";
import { fetchJsonOfflineFirst } from "@/lib/offline";
import { useLang } from "@/lib/lang";
import { getCachedPlaces, setCachedPlaces } from "@/lib/places-cache";

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
  tips?: Array<{ pt: string; en: string }>;
};

export default function PlacePage() {
  const { id } = useParams();
  const [place, setPlace] = useState<Place | null>(null);
  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [lang] = useLang();
  const [baseMap, setBaseMap] = useState<"normal" | "satellite">("normal");
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapSearchOpen, setMapSearchOpen] = useState(false);
  const [mapFiltersOpen, setMapFiltersOpen] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const voiceState = useVoiceState();
  const voiceManifest = useVoiceManifest();
  const voiceActive = voiceState.status === "playing";
  const voicePaused = voiceState.status === "paused";
  const voiceLoading = voiceState.status === "loading";
  const voiceProgress = useVoiceProgress();
  const voiceSpeed = useVoiceSpeed();
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { isFavorite, toggle } = useFavorites();

  const tagCards = useMemo(
    () => buildTagCards(place?.tags || [], lang, place?.category),
    [place?.tags, place?.category, lang]
  );

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
        voiceSpeed: "Velocidade",
        tipTitle: "Dica local",
        readMore: "Ler mais",
        readLess: "Ler menos",
        searchPlaceholder: "Pesquisar Maio",
        clearSearch: "Limpar pesquisa",
        filters: "Filtros",
        zoomIn: "Aumentar zoom",
        zoomOut: "Reduzir zoom",
        myLocation: "A minha localização",
        locationDenied: "Permissão de localização negada.",
        locationUnavailable: "Localização indisponível.",
        locationTimeout: "Tempo excedido ao obter localização.",
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
        voiceSpeed: "Speed",
        tipTitle: "Local tip",
        readMore: "Read more",
        readLess: "Read less",
        searchPlaceholder: "Search Maio",
        clearSearch: "Clear search",
        filters: "Filters",
        zoomIn: "Zoom in",
        zoomOut: "Zoom out",
        myLocation: "My location",
        locationDenied: "Location permission denied.",
        locationUnavailable: "Location unavailable.",
        locationTimeout: "Location request timed out.",
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
    setLoading(true);
    const cached = getCachedPlaces<Place>();
    if (cached && cached.length > 0) {
      setAllPlaces(cached);
      setPlace(cached.find((p) => p.id === id) || null);
      setLoading(false);
    }
    let cancelled = false;
    fetchJsonOfflineFirst<Place[]>("/api/places")
      .then((data) => {
        if (cancelled) return;
        setCachedPlaces(data);
        setAllPlaces(data);
        setPlace(data.find((p) => p.id === id) || null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
    if (!mapFullscreen) {
      setMapSearchOpen(false);
      setMapFiltersOpen(false);
    }
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

  useEffect(() => {
    if (!locationError) return;
    const id = window.setTimeout(() => setLocationError(null), 3500);
    return () => window.clearTimeout(id);
  }, [locationError]);

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

  const mapSearchNormalized = mapSearchQuery.trim().toLowerCase();
  const mapSearchResults = mapSearchNormalized
    ? allPlaces
        .filter((p) => p.coordinates && pick(p.name).toLowerCase().includes(mapSearchNormalized))
        .slice(0, 6)
    : [];

  const handleMapLocate = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
          essential: true,
        });
      },
      (err) => {
        const msg =
          err.code === 1
            ? copy[lang].locationDenied
            : err.code === 2
              ? copy[lang].locationUnavailable
              : copy[lang].locationTimeout;
        setLocationError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 5_000,
      }
    );
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
                            ? "Desafixar lugar"
                            : "Unpin place"
                          : lang === "pt"
                            ? "Fixar lugar"
                            : "Pin place"
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
              <div className="flex w-full items-center gap-2">
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
                <div className="relative ml-auto">
                  <button
                    type="button"
                    onClick={() => setVoiceSettingsOpen((v) => !v)}
                    aria-label={copy[lang].voiceSpeed}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-sm hover:bg-accent"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </button>
                  {voiceSettingsOpen && (
                    <div className="absolute right-0 top-12 z-20 min-w-[180px] rounded-xl border border-border bg-background p-2 shadow-lg">
                      <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {copy[lang].voiceSpeed}
                      </div>
                      <div className="mt-1 grid gap-1">
                        {VOICE_SPEED_OPTIONS.map((speed) => (
                          <button
                            key={speed}
                            type="button"
                            onClick={() => {
                              setVoiceSpeed(speed);
                              setVoiceSettingsOpen(false);
                            }}
                            className={`inline-flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold ${
                              Math.abs(voiceSpeed - speed) < 0.01
                                ? "bg-foreground text-background"
                                : "text-foreground hover:bg-accent"
                            }`}
                          >
                            <span>{speed}x</span>
                            {Math.abs(voiceSpeed - speed) < 0.01 ? <Check className="h-3.5 w-3.5" /> : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <p className={showFullDescription ? "" : "line-clamp-3"}>
              {pick(place.description)}
            </p>
            <button
              type="button"
              onClick={() => setShowFullDescription((prev) => !prev)}
              className="mt-2 text-xs font-semibold text-muted-foreground underline hover:text-foreground"
            >
              {showFullDescription ? copy[lang].readLess : copy[lang].readMore}
            </button>
          </div>
          {place.tips?.length ? (
            <div className="rounded-2xl border border-border bg-muted/60 px-4 py-3 text-sm text-foreground/80">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {copy[lang].tipTitle}
              </div>
              <div className="mt-2 space-y-2">
                {place.tips.map((tip, index) => (
                  <p key={`${place.id}-tip-${index}`}>
                    {tip?.[lang] || tip?.en || tip?.pt}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
          {tagCards.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {tagCards.map((card) => (
                <div
                  key={card.id}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/60 px-3 py-2 text-xs font-medium text-foreground/80"
                >
                  <card.Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {card.label}
                </div>
              ))}
            </div>
          )}
          {place.tags?.length > 0 && (
            <div className="hidden flex flex-wrap gap-2 pt-2">
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
              onClick={() => {
                if (mapFullscreen) return;
                const isDesktopViewport =
                  typeof window !== "undefined" &&
                  window.matchMedia("(min-width: 1024px)").matches;
                if (!isDesktopViewport) setMapFullscreen(true);
              }}
            >
              <div
                ref={mapContainerRef}
                className={`absolute inset-0 h-full w-full ${
                  mapFullscreen ? "" : "pointer-events-none"
                }`}
              />
              {mapFullscreen && (
                <div className="absolute top-3 left-3 right-16 sm:right-20 z-10 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMapFiltersOpen(true)}
                    aria-label={copy[lang].filters}
                    className="h-10 w-10 rounded-lg border border-border bg-background/95 backdrop-blur shadow-sm hover:bg-accent flex items-center justify-center"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>
                  <div className="relative flex-1">
                    <input
                      value={mapSearchQuery}
                      onChange={(e) => {
                        setMapSearchQuery(e.target.value);
                        setMapSearchOpen(true);
                      }}
                      onFocus={() => setMapSearchOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && mapSearchResults[0]) {
                          const result = mapSearchResults[0];
                          setMapSearchQuery(pick(result.name));
                          setMapSearchOpen(false);
                          mapRef.current?.flyTo({
                            center: result.coordinates as [number, number],
                            zoom: 14.5,
                            essential: true,
                          });
                        }
                      }}
                      placeholder={copy[lang].searchPlaceholder}
                      className="h-10 w-full rounded-xl border border-border bg-background/95 backdrop-blur px-4 pr-12 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {mapSearchQuery.length > 0 && (
                      <button
                        type="button"
                        aria-label={copy[lang].clearSearch}
                        onClick={() => {
                          setMapSearchQuery("");
                          setMapSearchOpen(false);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-base font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    {mapSearchOpen && mapSearchResults.length > 0 && (
                      <div className="absolute mt-2 w-full rounded-xl border border-border bg-background/95 backdrop-blur shadow-lg overflow-hidden">
                        {mapSearchResults.map((item) => (
                          <button
                            key={`map-search-${item.id}`}
                            type="button"
                            onClick={() => {
                              setMapSearchQuery(pick(item.name));
                              setMapSearchOpen(false);
                              mapRef.current?.flyTo({
                                center: item.coordinates as [number, number],
                                zoom: 14.5,
                                essential: true,
                              });
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-accent"
                          >
                            {pick(item.name)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!mapFullscreen && (
                <div className="absolute top-3 right-3 z-10">
                  <button
                    type="button"
                    onClick={() => setMapFullscreen((v) => !v)}
                    className="rounded-full border border-border bg-background/95 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-accent active:scale-[0.95]"
                  >
                    {copy[lang].map}
                  </button>
                </div>
              )}
              {mapFullscreen && (
                <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
                  <button
                    type="button"
                    aria-label={copy[lang].myLocation}
                    onClick={handleMapLocate}
                    className="h-10 w-10 rounded-full border border-border bg-background/95 backdrop-blur shadow-sm hover:bg-accent flex items-center justify-center"
                  >
                    <LocateFixed className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={copy[lang].close}
                    onClick={() => setMapFullscreen(false)}
                    className="h-10 w-10 rounded-full border border-border bg-background/95 backdrop-blur shadow-sm hover:bg-accent flex items-center justify-center"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </button>
                  <div className="rounded-full border border-border bg-background/95 backdrop-blur shadow-sm overflow-hidden">
                    <button
                      type="button"
                      aria-label={copy[lang].zoomIn}
                      onClick={() => mapRef.current?.zoomIn()}
                      className="h-10 w-10 flex items-center justify-center hover:bg-accent"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <div className="h-px bg-border" />
                    <button
                      type="button"
                      aria-label={copy[lang].zoomOut}
                      onClick={() => mapRef.current?.zoomOut()}
                      className="h-10 w-10 flex items-center justify-center hover:bg-accent"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
              {mapFullscreen && locationError && (
                <div className="absolute top-16 left-3 right-3 z-10 rounded-2xl border border-border bg-background/95 text-xs px-3 py-2 shadow-sm backdrop-blur">
                  {locationError}
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
            <Drawer.Root open={mapFiltersOpen} onOpenChange={setMapFiltersOpen}>
              <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm" />
                <Drawer.Content
                  className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-border bg-background p-5 pb-10 shadow-xl"
                  style={
                    {
                      "--initial-transform": "calc(100% + 12px)",
                      paddingBottom: "calc(3.25rem + env(safe-area-inset-bottom))",
                    } as CSSProperties
                  }
                >
                  <Drawer.Title className="sr-only">
                    {lang === "pt" ? "Filtros do mapa" : "Map filters"}
                  </Drawer.Title>
                  <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/30" />
                  <div className="mt-5 text-sm font-medium text-muted-foreground">
                    {lang === "pt" ? "Vista do mapa" : "Map view"}
                  </div>
                  <div className="mt-2 grid w-full grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBaseMap("normal");
                        setMapFiltersOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium transition ${
                        baseMap === "normal"
                          ? "bg-foreground text-background border-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {lang === "pt" ? "Normal" : "Normal"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBaseMap("satellite");
                        setMapFiltersOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium transition ${
                        baseMap === "satellite"
                          ? "bg-foreground text-background border-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {lang === "pt" ? "Satélite" : "Satellite"}
                    </button>
                  </div>
                </Drawer.Content>
              </Drawer.Portal>
            </Drawer.Root>
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

type TagCard = {
  id: string;
  label: string;
  Icon: typeof Bird;
};

function buildTagCards(tags: string[], lang: "pt" | "en", category?: string): TagCard[] {
  if (!tags.length) return [];
  const normalizedTags = tags.map((tag) => tag.toLowerCase());

  const candidates: Array<{
    id: string;
    label: { en: string; pt: string };
    Icon: typeof Bird;
    keywords: string[];
  }> = [
    {
      id: "unesco",
      label: { en: "UNESCO", pt: "UNESCO" },
      Icon: ShieldCheck,
      keywords: ["unesco"],
    },
    {
      id: "biosphere",
      label: { en: "Biosphere", pt: "Biosfera" },
      Icon: Leaf,
      keywords: ["biosphere", "biosfera"],
    },
    {
      id: "sustainability",
      label: { en: "Sustainability", pt: "Sustentabilidade" },
      Icon: Recycle,
      keywords: ["sustainability", "sustentabilidade"],
    },
    {
      id: "marine",
      label: { en: "Marine", pt: "Marinho" },
      Icon: Waves,
      keywords: ["marine", "marinho", "marinhos", "sea", "oceano", "ocean", "mar", "ecossistemas_marinhos"],
    },
    {
      id: "responsible",
      label: { en: "Responsible Travel", pt: "Turismo Responsável" },
      Icon: LifeBuoy,
      keywords: ["responsible", "responsavel", "responsável", "turismo_responsavel"],
    },
    {
      id: "turtles",
      label: { en: "Turtles", pt: "Tartarugas" },
      Icon: Fish,
      keywords: ["turtle", "tartaruga", "tartarugas"],
    },
    {
      id: "beach",
      label: { en: "Beach", pt: "Praia" },
      Icon: Waves,
      keywords: ["beach", "praia", "praias"],
    },
    {
      id: "dunes",
      label: { en: "Dunes", pt: "Dunas" },
      Icon: Wind,
      keywords: ["dune", "dunes", "duna", "dunas"],
    },
    {
      id: "protected",
      label: { en: "Protected", pt: "Protegido" },
      Icon: Leaf,
      keywords: ["protected", "protegida", "protegido", "protegidas", "paisagens_protegidas"],
    },
    {
      id: "forest",
      label: { en: "Forest", pt: "Floresta" },
      Icon: TreePine,
      keywords: ["forest", "floresta", "florestal"],
    },
    {
      id: "mountain",
      label: { en: "Mountain", pt: "Monte" },
      Icon: Mountain,
      keywords: ["mountain", "monte", "serra"],
    },
    {
      id: "lagoon",
      label: { en: "Lagoon", pt: "Lagoa" },
      Icon: Droplets,
      keywords: ["lagoon", "lagoa"],
    },
    {
      id: "wildlife",
      label: { en: "Wildlife", pt: "Vida Selvagem" },
      Icon: Bird,
      keywords: ["bird", "birds", "ave", "aves", "fauna", "wildlife"],
    },
    {
      id: "heritage",
      label: { en: "Heritage", pt: "Património" },
      Icon: Landmark,
      keywords: ["heritage", "patrimonio", "património", "church", "capela", "chapel", "igreja", "cultura", "historia", "história", "colonial"],
    },
    {
      id: "church",
      label: { en: "Church", pt: "Igreja" },
      Icon: Landmark,
      keywords: ["church", "igreja", "capela", "chapel"],
    },
    {
      id: "trail",
      label: { en: "Trail", pt: "Trilho" },
      Icon: Footprints,
      keywords: ["trail", "trails", "trilho", "trilhos", "hike", "trek"],
    },
    {
      id: "sunset",
      label: { en: "Sunlight", pt: "Sol" },
      Icon: Sun,
      keywords: ["sun", "sol", "sunset", "por-do-sol", "por do sol"],
    },
    {
      id: "village",
      label: { en: "Village", pt: "Vila" },
      Icon: MapPin,
      keywords: ["village", "town", "cidade", "vila", "povoação", "povoacao", "comunidade", "centro urbano", "porto"],
    },
    {
      id: "capital",
      label: { en: "Capital", pt: "Capital" },
      Icon: Landmark,
      keywords: ["capital"],
    },
    {
      id: "port",
      label: { en: "Port", pt: "Porto" },
      Icon: Compass,
      keywords: ["port", "porto", "porto de pesca", "porto antigo", "porto inglês"],
    },
    {
      id: "biodiversity",
      label: { en: "Biodiversity", pt: "Biodiversidade" },
      Icon: Leaf,
      keywords: ["biodiversity", "biodiversidade"],
    },
    {
      id: "journey",
      label: { en: "Journey", pt: "Viagem" },
      Icon: Compass,
      keywords: ["route", "rota", "journey", "caminho", "itinerario", "itinerário"],
    },
  ];

  const matched = candidates.filter((candidate) =>
    candidate.keywords.some((keyword) =>
      normalizedTags.some((tag) => tag.includes(keyword))
    )
  );

  const normalizedCategory = (category || "").toLowerCase();
  const isSettlementCategory = [
    "settlement",
    "povoacao",
    "povoação",
    "cidade",
    "vila",
    "town",
  ].some((key) => normalizedCategory.includes(key));

  const hasCapital = matched.some((item) => item.id === "capital");
  const pruned = hasCapital
    ? matched.filter((item) => item.id !== "village")
    : matched;

  if (
    isSettlementCategory &&
    !hasCapital &&
    !pruned.find((item) => item.id === "village")
  ) {
    const village = candidates.find((item) => item.id === "village");
    if (village) pruned.push(village);
  }

  return pruned.slice(0, 6).map((item) => ({
    id: item.id,
    label: item.label[lang],
    Icon: item.Icon,
  }));
}
