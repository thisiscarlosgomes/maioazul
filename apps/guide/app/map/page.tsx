"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ChevronRight,
    Maximize2,
    Minimize2,
    SlidersHorizontal,
    Plus,
    Minus,
    Sun,
    Volume2,
    LocateFixed,
    X,
    Ship,
    Plane,
    Sparkles,
    Waves,
    BadgeDollarSign,
    Smartphone,
} from "lucide-react";
import maplibregl from "maplibre-gl";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { Drawer } from "vaul";
import { hasVoiceForId, playVoice, stopVoice, useVoiceManifest, useVoiceState } from "@/lib/voice";
import { useLang } from "@/lib/lang";
import Link from "next/link";

import { PlacesDrawer } from "@/components/PlacesDrawer";
import { fetchJsonOfflineFirst } from "@/lib/offline";
import { setCachedPlaces } from "@/lib/places-cache";
import CurrencyConverterPanel from "../../components/CurrencyConverterPanel";
import EsimCheckoutPanel from "../../components/EsimCheckoutPanel";

type Place = {
    id: string;
    name?: { pt?: string; en?: string } | string;
    description?: { pt?: string; en?: string } | string;
    image_url?: string;
    coordinates?: [number, number] | null;
    tags?: string[];
    category?: string;
    osm_id?: string | number;
    location?: { pt?: string; en?: string } | string;
};

type SearchItem = {
    id?: string;
    name: string;
    type: "beach" | "settlement" | "protected";
    coordinates: [number, number];
    category?: string;
    description?: any;
};

type ProtectedPlace = SearchItem & { id: string };

const isProtectedPlace = (item: SearchItem): item is ProtectedPlace =>
    item.type === "protected" &&
    typeof item.id === "string" &&
    Array.isArray(item.coordinates);

type BoatSchedule = {
    date?: string;
    day?: string;
    from?: string;
    to?: string;
    departure?: string;
    arrival?: string;
    vessel?: string;
};

type BoatSchedulesResponse = {
    schedules?: BoatSchedule[];
    available_dates?: string[];
    selected_date?: string | null;
    fallback?: boolean;
};

type FlightSchedule = {
    date?: string;
    dateObj?: Date;
    departure?: string;
    arrival?: string;
    flight?: string;
    source?: string;
    status?: string;
};

type FlightSchedulesResponse = {
    routes?: {
        rai_mmo?: FlightSchedule[];
        mmo_rai?: FlightSchedule[];
    };
};

type SurfPoint = {
    label: "6am" | "Noon" | "6pm";
    surf_min_m: number;
    surf_max_m: number;
    swell_m: number;
    swell_period_s: number;
    swell_direction_deg: number;
    wind_kph: number;
    wind_gust_kph: number;
    wind_direction_deg: number;
};

type SurfResponse = {
    location: string;
    updated_at: string;
    points: SurfPoint[];
};

function surfQualityScore(point: SurfPoint) {
    let score = 3;
    if (point.swell_period_s >= 10) score += 1;
    if (point.wind_kph <= 12) score += 1;
    if (point.wind_gust_kph >= 22) score -= 1;
    return Math.max(1, Math.min(5, score));
}

function SurfQualityBar({ score }: { score: number }) {
    const activeColor = score <= 2 ? "bg-amber-400" : "bg-emerald-500";
    return (
        <div className="flex h-8 w-2.5 flex-col-reverse gap-0.5">
            {Array.from({ length: 5 }).map((_, index) => {
                const active = index < score;
                return (
                    <div
                        key={index}
                        className={`h-1.5 rounded-full ${active ? activeColor : "bg-muted"}`}
                    />
                );
            })}
        </div>
    );
}





/* =========================
   MAP PAGE
========================= */
export default function MapPage() {
    const DEFAULT_PLACE_IMAGE =
        "https://res.cloudinary.com/dhxfkhewr/image/upload/v1770479984/maio_mmwz9u.png";
    const defaultCenter: [number, number] = [-23.2, 15.25];
    const defaultZoom = 10.8;
    const maioBounds: maplibregl.LngLatBoundsLike = [
        [-23.28253814, 15.02291128],
        [-23.04484796, 15.44198952],
    ];

    const mapRef = useRef<maplibregl.Map | null>(null);
    const markerRef = useRef<maplibregl.Marker | null>(null);
    const flightMapRef = useRef<maplibregl.Map | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const flightMapContainerRef = useRef<HTMLDivElement>(null);
    const [layers, setLayers] = useState({
        protectedAreas: true,
        beaches: true,
        settlements: true,
        trilhas: true, // 👈 NEW
    });
    const [lang, setLang] = useLang();

    const [marine, setMarine] = useState<any>(null);
    const [wind, setWind] = useState<any>(null);
    const [weather, setWeather] = useState<any>(null);
    const [air, setAir] = useState<any>(null);

    const [placesOpen, setPlacesOpen] = useState(false);
    const [exploreOpen, setExploreOpen] = useState(false);
    const [mapClickCoord, setMapClickCoord] = useState<{ lat: number; lng: number } | null>(null);
    const [coordCopied, setCoordCopied] = useState(false);
    const showClickToCopyCoords = false;
    const [selectedSettlement, setSelectedSettlement] = useState<any | null>(null);
    const [selectedProtectedArea, setSelectedProtectedArea] = useState<any | null>(null);

    const [selectedBeach, setSelectedBeach] = useState<any | null>(null);
    const selectedMapItem =
        selectedSettlement || selectedProtectedArea || selectedBeach;

    const [searchQuery, setSearchQuery] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [baseMap, setBaseMap] = useState<"normal" | "satellite">("normal");
    const baseMapHydratedRef = useRef(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [storyPlaces, setStoryPlaces] = useState<any[]>([]);
    const storyPlacesRef = useRef<Place[]>([]);
    const placeImageCatalogRef = useRef<Place[]>([]);
    const mapPinImageOverridesRef = useRef<
        Record<string, { image_url?: string; title?: string } | string>
    >({});
    const [storyLoading, setStoryLoading] = useState(true);
    const [boatSchedules, setBoatSchedules] = useState<BoatSchedule[]>([]);
    const [boatDates, setBoatDates] = useState<string[]>([]);
    const [boatSelectedDate, setBoatSelectedDate] = useState<string | null>(null);
    const [boatFallback, setBoatFallback] = useState(false);
    const [flightSchedules, setFlightSchedules] = useState<{
        rai_mmo: FlightSchedule[];
        mmo_rai: FlightSchedule[];
    }>({ rai_mmo: [], mmo_rai: [] });
    const [boatsLoading, setBoatsLoading] = useState(true);
    const [flightsLoading, setFlightsLoading] = useState(true);
    const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
    const [flightOverlayOpen, setFlightOverlayOpen] = useState(false);
    const [currencyOpen, setCurrencyOpen] = useState(false);
    const [esimOpen, setEsimOpen] = useState(false);
    const [activeFlight, setActiveFlight] = useState<{
        from: "RAI" | "MMO";
        to: "RAI" | "MMO";
        departure: string;
        arrival: string;
        dateLabel: string;
    } | null>(null);
    const [surfOpen, setSurfOpen] = useState(false);
    const [surfLoading, setSurfLoading] = useState(false);
    const [surfData, setSurfData] = useState<SurfResponse | null>(null);
    const [surfError, setSurfError] = useState(false);
    const surfFetchInFlightRef = useRef(false);
    const chapterRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const chapterListRef = useRef<HTMLDivElement | null>(null);

    const [userLocation, setUserLocation] = useState<{
        lat: number;
        lng: number;
    } | null>(null);
    const defaultTestLocation = { lat: 15.25, lng: -23.15 };
    const [mapReady, setMapReady] = useState(false);
    const [voiceGuideEnabled, setVoiceGuideEnabled] = useState(false);
    const [locationConsent, setLocationConsent] = useState(false);
    const [voicePlace, setVoicePlace] = useState<{
        id: string;
        name: string;
        category?: string;
        description?: any;
        coordinates: [number, number];
    } | null>(null);
    const lastVoicePlaceIdRef = useRef<string | null>(null);
    const voiceState = useVoiceState();
    const voiceManifest = useVoiceManifest();
    const voiceActive = voiceState.status === "playing";
    const voicePaused = voiceState.status === "paused";
    const voiceLoading = voiceState.status === "loading";
    const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
    const [lastLocationUpdate, setLastLocationUpdate] = useState<number | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const debugEnabled = process.env.NODE_ENV !== "production";
    const [debugPanelOpen, setDebugPanelOpen] = useState(false);
    const [debugPlaceId, setDebugPlaceId] = useState<string>("");

    const flightEndpoints = {
        RAI: { name: "Praia (RAI)", coords: [-23.4935, 14.9245] as [number, number] },
        MMO: { name: "Maio (MMO)", coords: [-23.2139, 15.1550] as [number, number] },
    };

    const copy = useMemo(
        () => ({
            pt: {
                title: "Visit Maio",
                explore: "Passear Maio",
                prev: "Anterior",
                next: "Próximo",
                viewPlace: "Ver com calma",
                searchPlaceholder: "Pesquisar a ilha",
                searchType: {
                    beach: "Praia",
                    settlement: "Povoação",
                    protected: "Área protegida",
                },
                filters: "Filtros",
                protectedAreas: "Áreas protegidas",
                beaches: "Praias",
                settlements: "Povoações",
                trails: "Trilhos",
                fullscreen: "Tela cheia",
                exitFullscreen: "Close",
                zoomIn: "Aumentar zoom",
                zoomOut: "Reduzir zoom",
                resetView: "Repor vista",
                weather: "Clima",
                waves: "Ondas",
                sea: "Mar",
                climate: "Clima",
                mapView: "Vista do mapa",
                weatherSection: "Clima hoje",
                dailyForecast: "Previsão diária",
                temperatureLabel: "Temperatura",
                servicesTitle: "Serviços",
                currencyConverterTitle: "Conversor de moeda",
                currencyConverterHint: "Converter CVE para EUR, USD e outras moedas.",
                esimTitle: "Comprar eSIM Cabo Verde",
                esimHint: "Escolher plano e comprar eSIM para usar no Maio.",
                surfConditionsTitle: "Condições de Surf",
                surfConditionsHint: "Ver ondas, ondulação e vento para hoje.",
                surfDrawerTitle: "Condições de Surf",
                surfUnavailable: "Sem dados de surf neste momento.",
                retry: "Tentar novamente",
                surfColTime: "Hora",
                surfColSurf: "Surf",
                surfColSwell: "Ondulação",
                surfColWind: "Vento",
                today: "Hoje",
                boatsSection: "Barcos",
                flightsSection: "Voos",
                todayInMaio: "Hoje no Maio",
                todayHint: "Maio é ensolarado quase todo o ano; o vento decide o melhor roteiro.",
                morning: "Manhã",
                midday: "Meio-dia",
                lateDay: "Fim de tarde",
                conditionsCalm: "Mar calmo: ótimo para praia.",
                conditionsWindy: "Vento forte: melhor escolher interior.",
                conditionsMixed: "Condições mistas: misturar praia e vila.",
                schedulesTitle: "Horários de viagem",
                schedulesHint: "Hoje e próximas partidas disponíveis.",
                scheduleUnavailable: "Sem horários disponíveis.",
                beach: "Praia",
                protectedArea: "Área protegida",
                clearSearch: "Limpar pesquisa",
                voiceGuide: "Guia de voz",
                voiceGuideOn: "Guia de voz ativo",
                voiceGuideOff: "Ativar guia de voz",
                voicePaused: "Guia de voz em pausa",
                voiceNearby: "Você está perto de",
                voiceListening: "À procura de áreas protegidas próximas.",
                voiceLoading: "A preparar áudio...",
                voiceAccuracyLow: "Sinal fraco — melhor aguardar uma posição mais precisa.",
                voiceRefresh: "Atualizar localização",
                locationDenied: "Permissão de localização negada.",
                locationUnavailable: "Localização indisponível.",
                locationTimeout: "Tempo excedido ao obter localização.",
                voicePause: "Pausar",
                voiceResume: "Continuar",
                voiceCancel: "Cancelar",
                close: "Fechar",
            },
            en: {
                title: "Visit Maio",
                explore: "Wander Maio",
                prev: "Previous",
                next: "Next",
                viewPlace: "See gently",
                searchPlaceholder: "Search the island",
                searchType: {
                    beach: "Beach",
                    settlement: "Settlement",
                    protected: "Protected area",
                },
                filters: "Filters",
                protectedAreas: "Protected areas",
                beaches: "Beaches",
                settlements: "Settlements",
                trails: "Trails",
                fullscreen: "Fullscreen",
                exitFullscreen: "Close",
                zoomIn: "Zoom in",
                zoomOut: "Zoom out",
                resetView: "Reset view",
                weather: "Weather",
                waves: "Waves",
                sea: "Sea",
                climate: "Weather",
                mapView: "Map view",
                weatherSection: "Today’s weather",
                dailyForecast: "Daily forecast",
                temperatureLabel: "Temperature",
                servicesTitle: "Services",
                currencyConverterTitle: "Currency converter",
                currencyConverterHint: "Convert CVE to EUR, USD, and other currencies.",
                esimTitle: "Buy Cabo Verde eSIM",
                esimHint: "Choose a plan and buy an eSIM for Maio.",
                surfConditionsTitle: "Surf Conditions",
                surfConditionsHint: "See today’s wave, swell, and wind outlook.",
                surfDrawerTitle: "Surf Conditions",
                surfUnavailable: "No surf data right now.",
                retry: "Retry",
                surfColTime: "Time",
                surfColSurf: "Surf",
                surfColSwell: "Swell",
                surfColWind: "Wind",
                today: "Today",
                boatsSection: "Ferry",
                flightsSection: "Flights",
                todayInMaio: "Today in Maio",
                todayHint: "Maio is sunny most of the year; wind decides the best plan.",
                morning: "Morning",
                midday: "Midday",
                lateDay: "Late day",
                conditionsCalm: "Calm sea: great for beaches.",
                conditionsWindy: "Windy: inland works best.",
                conditionsMixed: "Mixed conditions: beach + town.",
                schedulesTitle: "Travel schedules",
                schedulesHint: "Today and upcoming departures.",
                scheduleUnavailable: "No schedules available.",
                beach: "Beach",
                protectedArea: "Protected area",
                clearSearch: "Clear search",
                voiceGuide: "Voice guide",
                voiceGuideOn: "Voice guide active",
                voiceGuideOff: "Enable voice guide",
                voicePaused: "Voice guide paused",
                voiceNearby: "You are near",
                voiceListening: "Listening for nearby protected areas.",
                voiceLoading: "Preparing audio...",
                voiceAccuracyLow: "Low accuracy — wait for a better fix.",
                voiceRefresh: "Refresh location",
                locationDenied: "Location permission denied.",
                locationUnavailable: "Location unavailable.",
                locationTimeout: "Location request timed out.",
                voicePause: "Pause",
                voiceResume: "Resume",
                voiceCancel: "Cancel",
                close: "Close",
            },
        }),
        []
    );

    const buildSurfFallbackFromCurrent = (): SurfResponse | null => {
        const wave = Number(wind?.sea?.wave_height ?? marine?.sea?.wave_height ?? 0);
        const windSpeed = Number(wind?.wind?.speed ?? 0);
        const windDir = Number(wind?.wind?.direction ?? 315);
        if (!Number.isFinite(wave) || wave <= 0) return null;

        const mk = (label: SurfPoint["label"], mul: number): SurfPoint => {
            const swell = Math.max(0.2, wave * mul);
            const surfMin = Math.max(0.1, swell * 0.8);
            const surfMax = Math.max(surfMin + 0.1, swell * 1.25);
            return {
                label,
                surf_min_m: Math.round(surfMin * 10) / 10,
                surf_max_m: Math.round(surfMax * 10) / 10,
                swell_m: Math.round(swell * 10) / 10,
                swell_period_s: 8,
                swell_direction_deg: Math.round(windDir),
                wind_kph: Math.round(windSpeed),
                wind_gust_kph: Math.round(windSpeed * 1.25),
                wind_direction_deg: Math.round(windDir),
            };
        };

        return {
            location: "Maio",
            updated_at: new Date().toISOString(),
            points: [mk("6am", 1), mk("Noon", 0.9), mk("6pm", 0.8)],
        };
    };

    const loadSurf = useCallback(() => {
        if (surfFetchInFlightRef.current) return;
        let canceled = false;
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 8_000);
        setSurfError(false);
        surfFetchInFlightRef.current = true;
        setSurfLoading(true);
        fetch("/api/maio/surf", { signal: controller.signal, cache: "no-store" })
            .then((res) => {
                if (!res.ok) throw new Error("bad status");
                return res.json();
            })
            .then((data: SurfResponse) => {
                if (canceled) return;
                if (!Array.isArray(data?.points)) throw new Error("bad payload");
                if (data.points.length) {
                    setSurfData(data);
                    setSurfError(false);
                    return;
                }
                const fallback = buildSurfFallbackFromCurrent();
                if (fallback?.points?.length) {
                    setSurfData(fallback);
                    setSurfError(false);
                    return;
                }
                setSurfData(null);
                setSurfError(true);
            })
            .catch(() => {
                if (canceled) return;
                const fallback = buildSurfFallbackFromCurrent();
                if (fallback?.points?.length) {
                    setSurfData(fallback);
                    setSurfError(false);
                } else {
                    setSurfData(null);
                    setSurfError(true);
                }
            })
            .finally(() => {
                if (canceled) return;
                window.clearTimeout(timeout);
                surfFetchInFlightRef.current = false;
                setSurfLoading(false);
            });
        return () => {
            canceled = true;
            window.clearTimeout(timeout);
            controller.abort();
            surfFetchInFlightRef.current = false;
        };
    }, [marine, wind]);

    useEffect(() => {
        if (!surfOpen) return;
        if (surfData?.points?.length) return;
        const cleanup = loadSurf();
        return cleanup;
    }, [surfOpen, surfData, loadSurf]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        if (params.get("debug") === "1") {
            setDebugPanelOpen(true);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const storedConsent = window.localStorage.getItem("maio-location-consent");
        if (storedConsent === "true") {
            setLocationConsent(true);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const stored = window.localStorage.getItem("maio-basemap");
        if (stored === "normal" || stored === "satellite") {
            setBaseMap(stored);
        }
        baseMapHydratedRef.current = true;
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!baseMapHydratedRef.current) return;
        window.localStorage.setItem("maio-basemap", baseMap);
    }, [baseMap]);

    const requestUserLocation = () => {
        if (!("geolocation" in navigator)) return;

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                });
                setLocationAccuracy(pos.coords.accuracy ?? null);
                setLastLocationUpdate(Date.now());
                if (typeof window !== "undefined") {
                    window.localStorage.setItem("maio-location-consent", "true");
                }
                setLocationConsent(true);
                mapRef.current?.flyTo({
                    center: [pos.coords.longitude, pos.coords.latitude],
                    zoom: 13.5,
                    essential: true,
                });
            },
            (err) => {
                console.warn("Geolocation denied or unavailable", err);
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

    useEffect(() => {
        if (!voiceGuideEnabled) return;
        if (!("geolocation" in navigator)) return;

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setUserLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                });
                setLocationAccuracy(pos.coords.accuracy ?? null);
                setLastLocationUpdate(Date.now());
                if (typeof window !== "undefined") {
                    window.localStorage.setItem("maio-location-consent", "true");
                }
                setLocationConsent(true);
            },
            (err) => {
                console.warn("Geolocation denied or unavailable", err);
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

        return () => navigator.geolocation.clearWatch(watchId);
    }, [voiceGuideEnabled]);

    useEffect(() => {
        if (!voiceGuideEnabled) return;
        if (userLocation) return;
        setUserLocation(defaultTestLocation);
        mapRef.current?.flyTo({
            center: [defaultTestLocation.lng, defaultTestLocation.lat],
            zoom: 13.5,
            essential: true,
        });
    }, [voiceGuideEnabled, userLocation]);



    function pointFeature(lng: number, lat: number): GeoJSON.Feature<GeoJSON.Point> {
        return {
            type: "Feature",
            properties: {},
            geometry: {
                type: "Point",
                coordinates: [lng, lat],
            },
        };
    }

    const distanceInMeters = (
        a: { lat: number; lng: number },
        b: { lat: number; lng: number }
    ) => {
        const toRad = (v: number) => (v * Math.PI) / 180;
        const R = 6371e3;
        const phi1 = toRad(a.lat);
        const phi2 = toRad(b.lat);
        const dPhi = toRad(b.lat - a.lat);
        const dLambda = toRad(b.lng - a.lng);

        const h =
            Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
        return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    };

    const getVoiceSummary = (place: {
        name: string;
        description?: any;
        category?: string;
    }) => {
        const raw =
            typeof place.description === "string"
                ? place.description
                : place.description?.en || "";
        const cleaned = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
        return cleaned;
    };

    const canPlayVoice = (place: { id?: string; name?: string; description?: any }) => {
        const summary = getVoiceSummary({
            name: place?.name || "",
            description: place?.description,
            category: (place as any)?.category,
        });
        if (!summary) return false;
        const id = place?.id || place?.name;
        return hasVoiceForId(id || "", voiceManifest);
    };

    const getShortText = (value?: string, max = 140) => {
        if (!value) return "";
        const cleaned = value.replace(/\s+/g, " ").trim();
        return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned;
    };

    const speakForPlace = async (place: {
        id: string;
        name: string;
        description?: any;
        category?: string;
        coordinates: [number, number];
    }) => {
        if (!canPlayVoice(place)) return;
        const summary = getVoiceSummary(place);
        if (!summary) return;
        const text = `${place.name}. ${summary}`;
        await playVoice({ text, title: place.name, lang: "en", placeId: place.id });
    };






    useEffect(() => {
        if (typeof window === "undefined") return;
        const run = () => {
            fetchJsonOfflineFirst<any>("/api/maio/marine")
                .then(setMarine)
                .catch(() => { });

            fetchJsonOfflineFirst<any>("/api/maio/wind")
                .then(setWind)
                .catch(() => { });

            fetchJsonOfflineFirst<any>("/api/maio/weather")
                .then(setWeather)
                .catch(() => { });

            fetchJsonOfflineFirst<any>("/api/maio/air")
                .then(setAir)
                .catch(() => { });
        };
        const idle = (window as any).requestIdleCallback;
        const id = idle ? idle(run, { timeout: 1500 }) : window.setTimeout(run, 1200);
        return () => {
            if (idle) (window as any).cancelIdleCallback?.(id);
            else window.clearTimeout(id);
        };
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const run = () => {
            fetchJsonOfflineFirst<BoatSchedulesResponse>("/api/schedules/boats")
                .then((data) => {
                    setBoatSchedules(data.schedules || []);
                    setBoatDates(data.available_dates || []);
                    setBoatSelectedDate(data.selected_date || null);
                    setBoatFallback(Boolean(data.fallback));
                })
                .catch(() => { })
                .finally(() => setBoatsLoading(false));

            fetchJsonOfflineFirst<FlightSchedulesResponse>("/api/schedules/flights")
                .then((data) =>
                    setFlightSchedules({
                        rai_mmo: data.routes?.rai_mmo || [],
                        mmo_rai: data.routes?.mmo_rai || [],
                    })
                )
                .catch(() => { })
                .finally(() => setFlightsLoading(false));
        };
        const idle = (window as any).requestIdleCallback;
        const id = idle ? idle(run, { timeout: 1200 }) : window.setTimeout(run, 900);
        return () => {
            if (idle) (window as any).cancelIdleCallback?.(id);
            else window.clearTimeout(id);
        };
    }, []);

    const formatBoatDate = (raw?: string) => {
        if (!raw) return lang === "pt" ? "Sem data" : "No date";
        const lower = raw.toLowerCase();
        const today = new Date();
        const todayParts = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Atlantic/Cape_Verde",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        })
            .format(new Date())
            .split("-");
        const todayYear = Number(todayParts[0]);
        const todayMonth = Number(todayParts[1]);
        const todayDay = Number(todayParts[2]);
        const todayKey = todayYear * 10000 + todayMonth * 100 + todayDay;
        if (lower === "today") {
            return lang === "pt"
                ? "Hoje"
                : new Intl.DateTimeFormat("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                }).format(today);
        }

        const monthMap: Record<string, number> = {
            jan: 0,
            feb: 1,
            mar: 2,
            apr: 3,
            may: 4,
            jun: 5,
            jul: 6,
            aug: 7,
            sep: 8,
            oct: 9,
            nov: 10,
            dec: 11,
            january: 0,
            february: 1,
            march: 2,
            april: 3,
            june: 5,
            july: 6,
            august: 7,
            september: 8,
            october: 9,
            november: 10,
            december: 11,
        };

        const cleaned = raw.replace(/[-]/g, " ").replace(/\\s+/g, " ").trim();
        const parts = cleaned.split(" ");
        if (parts.length >= 2) {
            let dayNum = Number(parts[0]);
            let monthKey = parts[1].toLowerCase();
            if (Number.isNaN(dayNum)) {
                const altDay = Number(parts[1]);
                const altMonth = parts[0].toLowerCase();
                if (!Number.isNaN(altDay)) {
                    dayNum = altDay;
                    monthKey = altMonth;
                }
            }
            if (!Number.isNaN(dayNum) && monthMap[monthKey] !== undefined) {
                const monthNum = monthMap[monthKey] + 1;
                let year = todayYear;
                const dateKey = year * 10000 + monthNum * 100 + dayNum;
                if (dateKey < todayKey) {
                    year += 1;
                }
                const date = new Date(Date.UTC(year, monthNum - 1, dayNum, 12, 0, 0));
                return new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    timeZone: "Atlantic/Cape_Verde",
                }).format(date);
            }
        }

        return raw;
    };

    const getCvTodayKey = () => {
        const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Atlantic/Cape_Verde",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        })
            .format(new Date())
            .split("-");
        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const day = Number(parts[2]);
        return { year, month, day, key: year * 10000 + month * 100 + day };
    };

    const boatDateKey = (raw?: string) => {
        if (!raw) return 99999999;
        const cleaned = raw
            .replace(/[-]/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .split(" ");
        const dayNum = Number(cleaned[0]);
        const monthKey = cleaned[1]?.toLowerCase();
        const monthMap: Record<string, number> = {
            jan: 1,
            feb: 2,
            mar: 3,
            apr: 4,
            may: 5,
            jun: 6,
            jul: 7,
            aug: 8,
            sep: 9,
            oct: 10,
            nov: 11,
            dec: 12,
            january: 1,
            february: 2,
            march: 3,
            april: 4,
            june: 6,
            july: 7,
            august: 8,
            september: 9,
            october: 10,
            november: 11,
            december: 12,
        };
        const { year, key: todayKey } = getCvTodayKey();
        if (!Number.isNaN(dayNum) && monthKey && monthMap[monthKey]) {
            let y = year;
            const key = y * 10000 + monthMap[monthKey] * 100 + dayNum;
            if (key < todayKey) {
                y += 1;
            }
            return y * 10000 + monthMap[monthKey] * 100 + dayNum;
        }
        return 99999999;
    };

    const upcomingFlightDates = (dayCode: string, limit = 2) => {
        const dayMap: Record<string, number> = {
            Sun: 0,
            Mon: 1,
            Tue: 2,
            Wed: 3,
            Thu: 4,
            Fri: 5,
            Sat: 6,
        };
        const target = dayMap[dayCode];
        if (target === undefined) return [];
        const { year, month, day } = getCvTodayKey();
        const base = new Date(Date.UTC(year, month - 1, day));
        const results: Date[] = [];
        for (let i = 0; i < 21 && results.length < limit; i++) {
            const d = new Date(base);
            d.setUTCDate(d.getUTCDate() + i);
            if (d.getUTCDay() === target) {
                results.push(d);
            }
        }
        return results;
    };

    const parseCvDate = (dateStr?: string) => {
        if (!dateStr) return null;
        const safe = dateStr.length >= 10 ? dateStr.slice(0, 10) : dateStr;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(safe)) return null;
        return new Date(`${safe}T12:00:00Z`);
    };

    const formatCvDate = (dateStr?: string) => {
        const d = parseCvDate(dateStr);
        if (!d) return "—";
        return new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            timeZone: "Atlantic/Cape_Verde",
        }).format(d);
    };

    const formatCvDateObj = (dateObj?: Date | null) => {
        if (!dateObj) return "—";
        return new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            timeZone: "Atlantic/Cape_Verde",
        }).format(dateObj);
    };

    const isCvToday = (dateStr?: string) => {
        const d = parseCvDate(dateStr);
        if (!d) return false;
        const todayParts = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Atlantic/Cape_Verde",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        })
            .format(new Date())
            .split("-");
        const todayKey =
            Number(todayParts[0]) * 10000 +
            Number(todayParts[1]) * 100 +
            Number(todayParts[2]);
        const dKey = d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
        return dKey === todayKey;
    };

    const computeBoatArrival = (departure?: string) => {
        if (!departure) return "—";
        const match = String(departure).match(/(\d{1,2}):(\d{2})/);
        if (!match) return "—";
        const h = Number(match[1]);
        const m = Number(match[2]);
        if (Number.isNaN(h) || Number.isNaN(m)) return "—";
        const total = h * 60 + m + 105;
        const hh = Math.floor(total / 60) % 24;
        const mm = total % 60;
        return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    };

    const todayConditions = useMemo(() => {
        const wave = marine?.sea?.wave_height;
        const windSpeed = wind?.wind?.speed;
        if (wave == null && windSpeed == null) return null;
        const seaCalm = wave != null && wave <= 1.5;
        const windy = windSpeed != null && windSpeed >= 12;
        const label = seaCalm
            ? copy[lang].conditionsCalm
            : windy
                ? copy[lang].conditionsWindy
                : copy[lang].conditionsMixed;
        return {
            wave,
            windSpeed,
            label,
        };
    }, [marine, wind, lang, copy]);


    const FLIGHT_SCHEDULE = {
        RAI_MMO: {
            Tue: { departure: "10:00", arrival: "10:20" },
            Fri: { departure: "14:50", arrival: "15:10" },
            Sun: { departure: "14:20", arrival: "14:40" },
        },
        MMO_RAI: {
            Tue: { departure: "10:50", arrival: "11:10" },
            Fri: { departure: "15:40", arrival: "16:00" },
            Sun: { departure: "15:10", arrival: "15:30" },
        },
    } as const;

    const nextScheduledDate = (days: Array<keyof typeof FLIGHT_SCHEDULE.RAI_MMO>) => {
        const dayMap: Record<string, number> = {
            Sun: 0,
            Mon: 1,
            Tue: 2,
            Wed: 3,
            Thu: 4,
            Fri: 5,
            Sat: 6,
        };
        const targets = new Set(days.map((d) => dayMap[d]));
        const { year, month, day } = getCvTodayKey();
        const base = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        for (let i = 0; i < 21; i++) {
            const d = new Date(base);
            d.setUTCDate(d.getUTCDate() + i);
            if (targets.has(d.getUTCDay())) {
                return d;
            }
        }
        return base;
    };

    const getTodayFlight = (items: any[], from: "RAI" | "MMO", to: "RAI" | "MMO") => {
        const todayItem = items.find((item) => item?.date && isCvToday(item.date));
        if (!todayItem) return null;
        return {
            ...todayItem,
            from,
            to,
            dateObj: parseCvDate(todayItem.date),
            source: todayItem.source || "Aviationstack",
        };
    };

    const getFallbackFlight = (from: "RAI" | "MMO", to: "RAI" | "MMO") => {
        const schedule = from === "RAI" ? FLIGHT_SCHEDULE.RAI_MMO : FLIGHT_SCHEDULE.MMO_RAI;
        const dateObj = nextScheduledDate(Object.keys(schedule) as Array<keyof typeof schedule>);
        const dayCode = new Intl.DateTimeFormat("en-US", {
            weekday: "short",
            timeZone: "Atlantic/Cape_Verde",
        }).format(dateObj) as keyof typeof schedule;
        const slot = schedule[dayCode] || schedule.Tue;
        return {
            from,
            to,
            departure: slot.departure,
            arrival: slot.arrival,
            dateObj,
            status: lang === "pt" ? "Agendado" : "Scheduled",
            source: "Fixed schedule",
        };
    };

    useEffect(() => {
        const loadSearch = async () => {
            try {
                const [beachesRes, settlementsRes, protectedRes] = await Promise.all([
                    fetch("/data/beaches_osm.geojson"),
                    fetch("/data/settlements.geojson"),
                    fetch("/data/protected_areas.geojson"),
                ]);

                const beaches = await beachesRes.json();
                const settlements = await settlementsRes.json();
                const protectedAreas = await protectedRes.json();

                const items: SearchItem[] = [];
                const seen = new Set<string>();

                beaches.features?.forEach((f: any) => {
                    const name = f.properties?.name;
                    if (!name || !f.geometry) return;
                    const center = getGeometryCenter(f.geometry);
                    if (!center) return;
                    const key = `beach:${name}`.toLowerCase();
                    if (seen.has(key)) return;
                    seen.add(key);
                    items.push({ name, type: "beach", coordinates: center });
                });

                settlements.features?.forEach((f: any) => {
                    const name = f.properties?.name;
                    if (!name || !f.geometry) return;
                    const center = getGeometryCenter(f.geometry);
                    if (!center) return;
                    const key = `settlement:${name}`.toLowerCase();
                    if (seen.has(key)) return;
                    seen.add(key);
                    items.push({ name, type: "settlement", coordinates: center });
                });

                protectedAreas.features?.forEach((f: any) => {
                    const name =
                        f.properties?.name ||
                        f.properties?.afia_name ||
                        "Área Protegida";
                    if (!name || !f.geometry) return;
                    const center = getGeometryCenter(f.geometry);
                    if (!center) return;
                    const key = `protected:${name}`.toLowerCase();
                    if (seen.has(key)) return;
                    seen.add(key);

                    let description = f.properties?.description;
                    if (typeof description === "string") {
                        try {
                            description = JSON.parse(description);
                        } catch {
                            description = null;
                        }
                    }

                    items.push({
                        id: f.properties?.id || name,
                        name,
                        type: "protected",
                        coordinates: center,
                        category: f.properties?.designation || "Área protegida",
                        description,
                    });
                });

                setSearchItems(items);
            } catch (err) {
                console.warn("Failed to load search data", err);
            }
        };

        loadSearch();
    }, []);

    useEffect(() => {
        fetchJsonOfflineFirst<Place[]>("/api/places")
            .then((data) => {
                setStoryPlaces(data);
                setCachedPlaces(data);
            })
            .catch(() => { })
            .finally(() => setStoryLoading(false));
    }, []);

    useEffect(() => {
        storyPlacesRef.current = storyPlaces;
    }, [storyPlaces]);

    useEffect(() => {
        fetch("/data/maio_places_with_coords.json")
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    placeImageCatalogRef.current = data;
                }
            })
            .catch(() => {
                placeImageCatalogRef.current = [];
            });
    }, []);

    useEffect(() => {
        fetch("/api/map-pin-images")
            .then((res) => res.json())
            .then((data) => {
                if (data && typeof data === "object" && !Array.isArray(data)) {
                    mapPinImageOverridesRef.current = data as Record<
                        string,
                        { image_url?: string; title?: string } | string
                    >;
                }
            })
            .catch(() => {
                mapPinImageOverridesRef.current = {};
            });
    }, []);

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

    const weatherAqiBadge = useMemo(() => {
        const temp =
            typeof weather?.temperature === "number" ? Math.round(weather.temperature) : null;
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

    function buildAirbnbPin(label: string) {
        const el = document.createElement("div");
        el.className = "map-pin map-pin--active";
        el.style.display = "inline-flex";
        el.style.alignItems = "center";
        el.style.gap = "6px";
        el.style.padding = "6px 10px";
        el.style.borderRadius = "999px";
        el.style.background = "#0b0b0b";
        el.style.color = "#ffffff";
        el.style.fontSize = "12px";
        el.style.fontWeight = "600";
        el.style.lineHeight = "1.2";
        el.style.boxShadow = "0 10px 24px rgba(0,0,0,0.22)";
        el.style.border = "1px solid rgba(255,255,255,0.15)";
        el.style.maxWidth = "220px";
        el.style.whiteSpace = "normal";
        el.style.overflow = "hidden";
        el.style.textOverflow = "ellipsis";
        el.style.textAlign = "center";
        el.style.position = "relative";

        const text = document.createElement("span");
        text.className = "map-pin-label";
        text.textContent = label;
        el.appendChild(text);

        const pointer = document.createElement("span");
        pointer.className = "map-pin-pointer";
        el.appendChild(pointer);

        return el;
    }



    function getPointCoordinates(
        geometry: GeoJSON.Geometry
    ): [number, number] | null {
        if (geometry.type === "Point") {
            return geometry.coordinates as [number, number];
        }

        // fallback for relations exported with `out center`
        // (MapLibre sometimes encodes these as GeometryCollection)
        if (
            geometry.type === "GeometryCollection" &&
            geometry.geometries?.length
        ) {
            const point = geometry.geometries.find(
                (g) => g.type === "Point"
            ) as GeoJSON.Point | undefined;

            return point?.coordinates as [number, number] | null;
        }

        return null;
    }

    const normalizeLabel = (value: string) =>
        value
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, " ")
            .trim();

    // Known cross-dataset naming variants (GeoJSON vs maio_places_with_coords).
    // Values are pre-normalized to keep lookups cheap.
    const PLACE_NAME_ALIAS_GROUPS: string[][] = [
        ["alcatraz", "alcatraz e pilao cao", "villages of alcatraz and pilao cao"],
        ["pilao cao", "alcatraz e pilao cao", "villages of alcatraz and pilao cao"],
        ["banda riba", "barreiro banda riba", "village of banda riba"],
        ["barreiro", "barreiro banda riba", "barreiro lem varela"],
        ["calheta de baixo", "baxona e ribinha calheta de baixo", "baxona and ribinha lower calheta"],
        ["calheta de cima", "ribona e lem tavares calheta de cima", "ribona and lem tavares upper calheta"],
        ["figueira da horta", "figueira horta", "village of figueira horta"],
        ["lem tavares", "ribona e lem tavares calheta de cima", "ribona and lem tavares upper calheta"],
        ["ribeira dom joao", "ribeira d joao", "ribeira de d joao", "ribeira of d joao"],
        [
            "parque natural de barreiro e figueira",
            "paisagem protegida de barreiro e figueira",
            "protected landscape of barreiro and figueira",
        ],
        ["parque natural do norte", "parque natural do norte da ilha do maio"],
        ["praia da bitxe rotcha", "praia de bitche rotcha"],
        ["praia da salina", "praias da salina e bancona"],
        ["praia de boca ribeira", "praias de prainha e boca ribeira", "prainha and boca ribeira beaches"],
        ["praia de cadjetinha", "praia da cadjetinha de morrinho", "cadjetinha beach of morrinho"],
        ["praia de porto cais", "praia e refugio pesqueiro de porto cais", "beach and port of porto cais"],
        ["praia de prainha", "praias de prainha e boca ribeira", "prainha and boca ribeira beaches"],
        ["praia de santo antonio", "praia e dunas de santo antonio"],
        ["praia de seada", "praias de boca lagoa e seada"],
        ["praiona", "praia e refugio pesqueiro de praiona", "beach and port of praiona"],
        ["porto cais", "praia e refugio pesqueiro de porto cais", "beach and port of porto cais"],
    ];

    const expandNormalizedAliases = (normalizedLabel: string): string[] => {
        const variants = new Set<string>([normalizedLabel]);
        for (const group of PLACE_NAME_ALIAS_GROUPS) {
            if (group.includes(normalizedLabel)) {
                for (const alias of group) variants.add(alias);
            }
        }
        return Array.from(variants);
    };

    const getPlaceNameCandidates = (place: any): string[] => {
        const names: string[] = [];
        const pushIf = (v?: string) => {
            if (typeof v === "string" && v.trim()) names.push(v);
        };

        if (typeof place?.name === "string") {
            pushIf(place.name);
        } else {
            pushIf(place?.name?.pt);
            pushIf(place?.name?.en);
        }

        if (typeof place?.location === "string") {
            pushIf(place.location);
        } else {
            pushIf(place?.location?.pt);
            pushIf(place?.location?.en);
        }

        return names;
    };

    const getMapPinOverrideImage = (name?: string) => {
        if (!name) return undefined;
        const key = normalizeLabel(name);
        const raw = mapPinImageOverridesRef.current[key];
        if (!raw) return undefined;
        if (typeof raw === "string") return raw;
        return raw.image_url;
    };

    const getMapPinOverrideTitle = (name?: string) => {
        if (!name) return undefined;
        const key = normalizeLabel(name);
        const raw = mapPinImageOverridesRef.current[key];
        if (!raw || typeof raw === "string") return undefined;
        return raw.title;
    };

    const findBestPlaceMatch = ({
        id,
        osmId,
        name,
    }: {
        id?: string;
        osmId?: string | number;
        name?: string;
    }) => {
        const allPlaces = [...storyPlacesRef.current, ...placeImageCatalogRef.current];

        const pickWithImageFirst = (items: Place[]) =>
            items.find((p) => p?.image_url) || items[0];

        if (id) {
            const byId = allPlaces.filter((p: any) => p?.id === id);
            if (byId.length) return pickWithImageFirst(byId);
        }

        if (osmId !== undefined && osmId !== null) {
            const byOsm = allPlaces.filter((p: any) => p?.osm_id === osmId);
            if (byOsm.length) return pickWithImageFirst(byOsm);
        }

        if (!name) return undefined;

        const normalizedName = normalizeLabel(name);
        if (!normalizedName) return undefined;
        const queryVariants = expandNormalizedAliases(normalizedName);

        const exact = allPlaces.filter((p: any) =>
            getPlaceNameCandidates(p).some((candidate) => {
                const candidateVariants = expandNormalizedAliases(normalizeLabel(candidate));
                return queryVariants.some((q) => candidateVariants.includes(q));
            })
        );
        if (exact.length) return pickWithImageFirst(exact);

        const partial = allPlaces.filter((p: any) =>
            getPlaceNameCandidates(p).some((candidate) => {
                const candidateVariants = expandNormalizedAliases(normalizeLabel(candidate));
                return queryVariants.some((q) =>
                    candidateVariants.some((c) => c.includes(q) || q.includes(c))
                );
            })
        );
        if (partial.length) return pickWithImageFirst(partial);

        return undefined;
    };

    function clearSelections() {
        setSelectedSettlement(null);
        setSelectedProtectedArea(null);
        setSelectedBeach(null);
    }

    function getGeometryCenter(geometry: GeoJSON.Geometry): [number, number] | null {
        const point = getPointCoordinates(geometry);
        if (point) return point;

        const coords: [number, number][] = [];

        const collect = (g: GeoJSON.Geometry) => {
            switch (g.type) {
                case "Point":
                    coords.push(g.coordinates as [number, number]);
                    break;
                case "MultiPoint":
                case "LineString":
                    (g.coordinates as [number, number][]).forEach((c) => coords.push(c));
                    break;
                case "MultiLineString":
                case "Polygon":
                    (g.coordinates as [number, number][][]).forEach((ring) =>
                        ring.forEach((c) => coords.push(c))
                    );
                    break;
                case "MultiPolygon":
                    (g.coordinates as [number, number][][][]).forEach((poly) =>
                        poly.forEach((ring) => ring.forEach((c) => coords.push(c)))
                    );
                    break;
                case "GeometryCollection":
                    g.geometries.forEach(collect);
                    break;
            }
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
    }




    /* =========================
       MAP INIT
    ========================= */
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        if (typeof window !== "undefined" && maplibregl.getWorkerUrl() === "") {
            maplibregl.setWorkerUrl("/maplibre-gl-csp-worker.js");
        }

        const map = new maplibregl.Map({
            container: containerRef.current,
            center: defaultCenter,
            zoom: defaultZoom,
            maxBounds: maioBounds,
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




        map.on("load", () => {
            setMapReady(true);
            /* =========================
               TRILHAS (OSM)
            ========================= */
            map.addSource("trilhas", {
                type: "geojson",
                data: "/data/trilhas_osm.geojson",
            });


            map.addLayer({
                id: "trilhas-line",
                type: "line",
                source: "trilhas",
                paint: {
                    "line-color": "#c95c21", // green
                    "line-width": [
                        "interpolate",
                        ["linear"],
                        ["zoom"],
                        10, 2,
                        14, 4,
                    ],
                    "line-opacity": 0.9,
                },
            });


            /* =========================
               SOURCES
            ========================= */
            map.addSource("protected-areas", {
                type: "geojson",
                data: "/data/protected_areas.geojson",
            });

            map.addSource("beaches", {
                type: "geojson",
                data: "/data/beaches_osm.geojson",
                generateId: true, // ✅ REQUIRED for feature-state
            });


            map.on("click", "beaches-fill", (e) => {
                if (!e.features?.length) return;

                const f = e.features[0];

                const name =
                    f.properties?.name ||
                    f.properties?.afia_name ||
                    f.properties?.["name:pt"] ||
                    f.properties?.["name:en"] ||
                    "Praia";

                const osmId = f.properties?.osm_id || f.properties?.["@id"];
                const matchedPlace = findBestPlaceMatch({
                    osmId,
                    name,
                });

                setSelectedBeach({
                    name: getMapPinOverrideTitle(name) || name,
                    description: matchedPlace?.description,
                    tags: matchedPlace?.tags,
                    id: matchedPlace?.id,
                    image: getMapPinOverrideImage(name) || matchedPlace?.image_url,
                    coordinates: [e.lngLat.lng, e.lngLat.lat],
                });

                // clear other selections
                setSelectedSettlement(null);
                setSelectedProtectedArea(null);

                map.flyTo({
                    center: [e.lngLat.lng, e.lngLat.lat],
                    zoom: 12,
                    essential: true,
                });
            });


            /* =========================
               LAND CONTEXT (SUBTLE)
            ========================= */
            map.addLayer({
                id: "landmask",
                type: "fill",
                source: "protected-areas",
                paint: {
                    "fill-color": "#FAFAF5",
                    "fill-opacity": 0.25,
                },
            });

            /* =========================
               PROTECTED AREAS
            ========================= */
            map.addLayer({
                id: "protected-areas-fill",
                type: "fill",
                source: "protected-areas",
                paint: {
                    "fill-color": "#66BB6A",
                    "fill-opacity": 0.35,
                },
            });

            map.addLayer({
                id: "protected-areas-outline",
                type: "line",
                source: "protected-areas",
                paint: {
                    "line-color": "#1B5E20",
                    "line-width": 1.5,
                },
            });

            /* =========================
               BEACHES
            ========================= */
            map.addLayer({
                id: "beaches-fill",
                type: "fill",
                source: "beaches",
                filter: ["==", ["get", "natural"], "beach"],
                paint: {
                    "fill-color": "#FFD54F",
                    "fill-opacity": [
                        "case",
                        ["boolean", ["feature-state", "hover"], false],
                        0.7,
                        0.5,
                    ],
                },

            });

            map.addSource("settlements", {
                type: "geojson",
                data: "/data/settlements.geojson",
            });



            map.addLayer({
                id: "settlements-points",
                type: "circle",
                source: "settlements",
                paint: {
                    "circle-radius": [
                        "match",
                        ["get", "place"],
                        "town", 7,
                        "village", 5,
                        "hamlet", 4,
                        4,
                    ],

                    "circle-color": "#a861f4",
                    "circle-opacity": 0.9,
                    "circle-stroke-color": "#ffffff",
                    "circle-stroke-width": 2,
                },
            });
            map.addLayer({
                id: "settlements-labels",
                type: "symbol",
                source: "settlements",
                layout: {
                    "text-field": ["get", "name"],
                    "text-size": [
                        "interpolate",
                        ["linear"],
                        ["zoom"],
                        10, 11,
                        13, 14,
                    ],
                    "text-anchor": "top",
                    "text-offset": [0, 0.8],
                    "text-allow-overlap": false,
                },
                paint: {
                    "text-color": "#263238",
                    "text-halo-color": "#ffffff",
                    "text-halo-width": 1.2,
                    "text-opacity": [
                        "interpolate",
                        ["linear"],
                        ["zoom"],
                        9.8, 0,
                        10.8, 1,
                    ],
                },
            });


            map.addLayer({
                id: "beaches-outline",
                type: "line",
                source: "beaches",
                paint: {
                    "line-color": "#E0A800",
                    "line-width": [
                        "interpolate",
                        ["linear"],
                        ["zoom"],
                        9, 0.6,
                        13, 1.2,
                    ],
                    "line-opacity": 0.35,
                },
            });

            map.addLayer({
                id: "beaches-labels",
                type: "symbol",
                source: "beaches",
                layout: {
                    "symbol-placement": "point",
                    "text-field": [
                        "coalesce",
                        ["get", "name"],
                        ["get", "afia_name"],
                        ["get", "name:pt"],
                        ["get", "name:en"],
                        "Praia",
                    ],
                    "text-size": [
                        "interpolate",
                        ["linear"],
                        ["zoom"],
                        9, 11,
                        12, 13,
                        14, 15,
                    ],
                    "text-anchor": "center",
                    "text-allow-overlap": false,
                },
                paint: {
                    "text-color": "#5D4037",
                    "text-halo-color": "#ffffff",
                    "text-halo-width": 1.4,
                    "text-opacity": [
                        "interpolate",
                        ["linear"],
                        ["zoom"],
                        9, 0,
                        10.5, 1,
                    ],
                },
            });


            /* =========================
             NEW: Settlement interactions
          ========================= */
            map.on("click", "settlements-points", (e) => {
                if (!e.features?.length) return;
                const f = e.features[0];

                const coords = getPointCoordinates(f.geometry);
                if (!coords) return;

                setSelectedBeach(null);

                setSelectedProtectedArea(null);

                let description = f.properties?.description;

                if (typeof description === "string") {
                    try {
                        description = JSON.parse(description);
                    } catch {
                        description = null;
                    }
                }

                const matchedPlace = findBestPlaceMatch({
                    id: f.properties?.id,
                    name: f.properties?.name,
                });

                setSelectedSettlement({
                    id: f.properties?.id,
                    name: getMapPinOverrideTitle(f.properties?.name) || f.properties?.name,
                    description,
                    image:
                        getMapPinOverrideImage(f.properties?.name) ||
                        matchedPlace?.image_url ||
                        f.properties?.image,
                    coordinates: coords,
                });




                map.flyTo({
                    center: coords,
                    zoom: 12,
                    essential: true,
                });
            });


            map.on("click", "protected-areas-fill", (e) => {
                if (!e.features?.length) return;

                const f = e.features[0];

                clearSelections();

                let description = f.properties?.description;

                if (typeof description === "string") {
                    try {
                        description = JSON.parse(description);
                    } catch {
                        description = null;
                    }
                }

                const protectedName =
                    f.properties?.name || f.properties?.afia_name || "Área Protegida";

                const protectedMatch = findBestPlaceMatch({
                    id: f.properties?.id,
                    name: protectedName,
                });

                setSelectedProtectedArea({
                    name: getMapPinOverrideTitle(protectedName) || protectedName,
                    category: f.properties?.designation || "Área protegida",
                    description,
                    image:
                        getMapPinOverrideImage(protectedName) ||
                        protectedMatch?.image_url,
                    coordinates: [e.lngLat.lng, e.lngLat.lat],
                });

                map.flyTo({
                    center: [e.lngLat.lng, e.lngLat.lat],
                    zoom: 11,
                    essential: true,
                });
            });

            map.on("click", (e) => {
                const isDesktopViewport =
                    typeof window !== "undefined" &&
                    window.matchMedia("(min-width: 1024px)").matches;
                if (!isFullscreen && !isDesktopViewport) {
                    setIsFullscreen(true);
                    return;
                }
                const clickableLayers = [
                    "settlements-points",
                    "protected-areas-fill",
                    "beaches-fill",
                ];
                const hits = map.queryRenderedFeatures(e.point, {
                    layers: clickableLayers,
                });
                if (hits.length === 0) {
                    clearSelections();
                }

                const lat = Number(e.lngLat.lat.toFixed(6));
                const lng = Number(e.lngLat.lng.toFixed(6));
                setMapClickCoord({ lat, lng });
                const text = `${lat}, ${lng}`;
                if (navigator.clipboard?.writeText) {
                    navigator.clipboard
                        .writeText(text)
                        .then(() => setCoordCopied(true))
                        .catch(() => {});
                }
            });


            map.on("mouseenter", "protected-areas-fill", () => {
                map.getCanvas().style.cursor = "pointer";
            });

            map.on("mouseleave", "protected-areas-fill", () => {
                map.getCanvas().style.cursor = "";
            });


            map.on("mouseenter", "settlements-points", () => {
                map.getCanvas().style.cursor = "pointer";
            });

            map.on("mouseleave", "settlements-points", () => {
                map.getCanvas().style.cursor = "";
            });

            map.on("mouseenter", "beaches-fill", () => {
                map.getCanvas().style.cursor = "pointer";
            });

            map.on("mouseleave", "beaches-fill", () => {
                map.getCanvas().style.cursor = "";
            });

            let hoveredBeachId: number | null = null;

            map.on("mousemove", "beaches-fill", (e) => {
                if (!e.features?.length) return;

                const id = e.features[0].id as number;

                if (hoveredBeachId !== null) {
                    map.setFeatureState(
                        { source: "beaches", id: hoveredBeachId },
                        { hover: false }
                    );
                }

                hoveredBeachId = id;

                map.setFeatureState(
                    { source: "beaches", id },
                    { hover: true }
                );
            });

            map.on("mouseleave", "beaches-fill", () => {
                if (hoveredBeachId !== null) {
                    map.setFeatureState(
                        { source: "beaches", id: hoveredBeachId },
                        { hover: false }
                    );
                }
                hoveredBeachId = null;
            });









        });



        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!activeChapterId || !mapRef.current) return;
        const place = storyPlaces.find((p) => p.id === activeChapterId);
        if (!place?.coordinates) return;

        mapRef.current.flyTo({
            center: place.coordinates,
            zoom: 13.5,
            essential: true,
        });
    }, [activeChapterId, storyPlaces]);

    useEffect(() => {
        if (!storyPlaces.length) return;
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
                if (!visible.length) return;
                const id = visible[0].target.getAttribute("data-id");
                if (id) setActiveChapterId(id);
            },
            {
                rootMargin: "-20% 0px -60% 0px",
                threshold: [0.2, 0.4, 0.6],
            }
        );

        chapterRefs.current.forEach((el) => {
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [storyPlaces]);

    useEffect(() => {
        if (!activeChapterId || !mapRef.current) return;
        const place = storyPlaces.find((p) => p.id === activeChapterId);
        if (!place?.coordinates) return;

        mapRef.current.flyTo({
            center: place.coordinates,
            zoom: 13.5,
            essential: true,
        });

        const label =
            place.name?.[lang] || place.name?.en || place.name?.pt || place.name || "Spot";

        if (!markerRef.current) {
            markerRef.current = new maplibregl.Marker({
                element: buildAirbnbPin(label),
                anchor: "bottom",
            })
                .setLngLat(place.coordinates)
                .addTo(mapRef.current);
        } else {
            const el = markerRef.current.getElement();
            const text = el?.querySelector(".map-pin-label");
            if (text) text.textContent = label;
            markerRef.current.setLngLat(place.coordinates);
        }
    }, [activeChapterId, storyPlaces, lang]);




    /* =========================
       LAYER TOGGLES
    ========================= */
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const toggle = (ids: string[], visible: boolean) =>
            ids.forEach((id) => {
                if (map.getLayer(id)) {
                    map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
                }
            });

        toggle(
            ["protected-areas-fill", "protected-areas-outline", "landmask"],
            layers.protectedAreas
        );

        toggle(
            ["beaches-fill", "beaches-outline", "beaches-labels"],
            layers.beaches
        ); toggle(
            ["settlements-points", "settlements-labels"],
            layers.settlements
        );

        toggle(
            ["trilhas-line", "trilhas-glow"],
            layers.trilhas
        );


    }, [layers]);


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

    const userLocationLat = userLocation?.lat ?? null;
    const userLocationLng = userLocation?.lng ?? null;

    useEffect(() => {
        const map = mapRef.current;
        if (!map || userLocationLat == null || userLocationLng == null || !mapReady) return;

        const feature = pointFeature(userLocationLng, userLocationLat);

        const source = map.getSource("user-location") as maplibregl.GeoJSONSource | undefined;

        if (source) {
            source.setData(feature);
        } else {
            map.addSource("user-location", {
                type: "geojson",
                data: feature,
            });

            map.addLayer({
                id: "user-location-dot",
                type: "circle",
                source: "user-location",
                paint: {
                    "circle-radius": 7,
                    "circle-color": "#2563eb",
                    "circle-stroke-color": "#ffffff",
                    "circle-stroke-width": 2,
                },
            });
        }
    }, [userLocationLat, userLocationLng, mapReady]);
    useEffect(() => {
        console.log("User location (React state):", userLocation);
    }, [userLocation]);

    const handleVoiceGuideToggle = () => {
        if (!voiceGuideEnabled) {
            requestUserLocation();
            lastVoicePlaceIdRef.current = null;
        } else {
            stopVoice();
            setVoicePlace(null);
            lastVoicePlaceIdRef.current = null;
        }
        setVoiceGuideEnabled((v) => !v);
    };


    const handleLocationRefresh = () => {
        requestUserLocation();
    };

    const handleStoryPlay = (item: any) => {
        if (!canPlayVoice(item)) return;
        const summary = getVoiceSummary(item);
        if (!summary) return;
        playVoice({ text: `${item.name}. ${summary}`, title: item.name, lang: "en" });
    };

    useEffect(() => {
        if (!locationError) return;
        const id = window.setTimeout(() => setLocationError(null), 3500);
        return () => window.clearTimeout(id);
    }, [locationError]);

    useEffect(() => {
        if (!coordCopied) return;
        const id = window.setTimeout(() => setCoordCopied(false), 1200);
        return () => window.clearTimeout(id);
    }, [coordCopied]);

    useEffect(() => {
        if (!voiceGuideEnabled || !userLocation) return;
        if (typeof locationAccuracy === "number" && locationAccuracy > 200) return;
        const protectedPlaces = searchItems.filter(isProtectedPlace);
        if (!protectedPlaces.length) return;

        let nearest: { place: ProtectedPlace; distance: number } | null = null;
        for (const place of protectedPlaces) {
            const distance = distanceInMeters(userLocation, {
                lat: place.coordinates[1],
                lng: place.coordinates[0],
            });
            if (!nearest || distance < nearest.distance) {
                nearest = { place, distance };
            }
        }

        if (!nearest) return;
        const rangeMeters = 650;
        if (nearest.distance <= rangeMeters) {
            if (
                !voiceActive &&
                !voicePaused &&
                !voiceLoading &&
                lastVoicePlaceIdRef.current !== nearest.place.id
            ) {
                const summary = getVoiceSummary(nearest.place);
                if (summary && canPlayVoice(nearest.place)) {
                    lastVoicePlaceIdRef.current = nearest.place.id;
                    setVoicePlace(nearest.place);
                    speakForPlace(nearest.place);
                } else {
                    setVoicePlace(nearest.place);
                }
            } else if (!voicePlace) {
                setVoicePlace(nearest.place);
            }
        }
    }, [voiceGuideEnabled, userLocation, searchItems, voiceActive, voicePaused, voiceLoading, lang]);

    useEffect(() => {
        if (!userLocation || !searchItems.length || !lastVoicePlaceIdRef.current) return;
        const last = searchItems.find(
            (item) => item.id === lastVoicePlaceIdRef.current && item.coordinates
        );
        if (!last || !last.coordinates) {
            lastVoicePlaceIdRef.current = null;
            return;
        }
        const distance = distanceInMeters(userLocation, {
            lat: last.coordinates[1],
            lng: last.coordinates[0],
        });
        if (distance > 900) {
            lastVoicePlaceIdRef.current = null;
        }
    }, [userLocation, searchItems]);

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredResults = normalizedQuery
        ? searchItems
            .filter((item) => item.name.toLowerCase().includes(normalizedQuery))
            .slice(0, 6)
        : [];

    const debugProtectedPlaces = useMemo(() => {
        return searchItems
            .filter(isProtectedPlace)
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [searchItems]);

    const getPlaceLabel = (value?: { pt?: string; en?: string } | string) => {
        if (!value) return "";
        if (typeof value === "string") return value;
        return value.en || value.pt || "";
    };

    const getDefaultImageForPlace = (place: any) => {
        const overrideImage =
            getMapPinOverrideImage(getPlaceLabel(place?.name)) ||
            getMapPinOverrideImage(place?.title) ||
            getMapPinOverrideImage(getPlaceLabel(place?.location));
        const fallbackMatch = findBestPlaceMatch({
            id: place?.id,
            osmId: place?.osm_id,
            name:
                getPlaceLabel(place?.name) ||
                place?.title ||
                getPlaceLabel(place?.location) ||
                "",
        });

        return (
            overrideImage ||
            place?.image_url ||
            fallbackMatch?.image_url ||
            DEFAULT_PLACE_IMAGE
        );
    };

    const buildChapters = (places: any[], language: "pt" | "en") => {
        const short = (text?: string, max = 180) => {
            if (!text) return "";
            const cleaned = text.replace(/\s+/g, " ").trim();
            return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned;
        };

        const labelForCategory = (category?: string) => {
            if (!category) return language === "pt" ? "Lugar" : "Place";
            const normalized = category.toLowerCase();
            const mapped: Record<string, { pt: string; en: string }> = {
                beach: { pt: "Praia", en: "Beach" },
                beaches: { pt: "Praias", en: "Beaches" },
                settlement: { pt: "Povoação", en: "Settlement" },
                settlements: { pt: "Povoações", en: "Settlements" },
                protected: { pt: "Área protegida", en: "Protected area" },
                "protected area": { pt: "Área protegida", en: "Protected area" },
                ribeira: { pt: "Ribeira", en: "Ribeira" },
            };
            if (mapped[normalized]) return mapped[normalized][language];
            return normalized
                .replace(/[-_]/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());
        };

        const curatedOrder = [
            "UNESCO Biosphere Reserve — Maio",
            "City of Porto Inglês",
            "Church of Nossa Senhora da Luz",
            "Baxona Beach",
            "Dunes of Morrinho",
            "Norte da Ilha do Maio Natural Park",
            "Lagoa",
            "Protected Landscape of Salinas do Porto Inglês",
            "Protected Landscape of Barreiro and Figueira",
        ];

        const curated = curatedOrder.map((label) => {
            const key = normalizeLabel(label);
            if (key.includes(normalizeLabel("UNESCO Biosphere Reserve"))) {
                return {
                    label,
                    id: "maio-unesco-biosphere",
                    keys: [
                        key,
                        normalizeLabel("Reserva da Biosfera da UNESCO — Maio"),
                        normalizeLabel("UNESCO Biosphere Reserve Maio"),
                        normalizeLabel("Reserva da Biosfera UNESCO Maio"),
                    ],
                };
            }
            if (key === normalizeLabel("Baxona Beach")) {
                return {
                    label,
                    id: "praia-baxona",
                    keys: [key, normalizeLabel("Praia de Baxona")],
                };
            }
            return { label, keys: [key] };
        });

        const isMatch = (place: any, keys: string[]) => {
            const name =
                typeof place?.name === "string"
                    ? place.name
                    : place?.name?.en || place?.name?.pt || "";
            const location =
                typeof place?.location === "string"
                    ? place.location
                    : place?.location?.en || place?.location?.pt || "";
            const haystack = normalizeLabel(`${name} ${location}`);
            return keys.some((key) => haystack.includes(key));
        };

        const curatedPlaces = curated
            .map((entry) => {
                if (entry.id) {
                    const byId = places.find((place) => place?.id === entry.id);
                    if (byId) return byId;
                }
                return places.find((place) => isMatch(place, entry.keys));
            })
            .filter(Boolean);

        const defaultId = "cidade-porto-ingles";
        if (curatedPlaces.length && curatedPlaces[0]?.id !== defaultId) {
            const targetIndex = curatedPlaces.findIndex((place) => place?.id === defaultId);
            if (targetIndex > -1) {
                const [target] = curatedPlaces.splice(targetIndex, 1);
                curatedPlaces.unshift(target);
            }
        }

        const excludedKeys = [
            normalizeLabel("Artisan Centre of Calheta"),
            normalizeLabel("Baxona and Ribinha (Lower Calheta)"),
            normalizeLabel("Baxona e Ribinha (Calheta de Baixo)"),
        ];

        const fallback = places
            .filter((place) => place?.coordinates && place?.name && place?.description)
            .filter((place) => !curatedPlaces.includes(place))
            .filter((place) => {
                const name =
                    typeof place?.name === "string"
                        ? place.name
                        : place?.name?.en || place?.name?.pt || "";
                const location =
                    typeof place?.location === "string"
                        ? place.location
                        : place?.location?.en || place?.location?.pt || "";
                const haystack = normalizeLabel(`${name} ${location}`);
                return !excludedKeys.some((key) => haystack.includes(key));
            })
            .slice()
            .sort((a, b) => {
                const aName = a.name?.[language] || a.name?.en || a.name?.pt || "";
                const bName = b.name?.[language] || b.name?.en || b.name?.pt || "";
                return aName.localeCompare(bName);
            });

        return [...curatedPlaces, ...fallback]
            .filter((place) => place?.coordinates && place?.name && place?.description)
            .slice(0, 8)
            .map((place) => ({
                id: place.id,
                image: place.image_url || getDefaultImageForPlace(place),
                kicker: labelForCategory(place.category),
                title: place.name?.[language] || place.name?.en || place.name?.pt || "",
                description:
                    short(place.description?.[language]) ||
                    short(place.description?.en) ||
                    short(place.description?.pt),
            }));
    };

    const chapters = useMemo(
        () => buildChapters(storyPlaces, lang),
        [storyPlaces, lang]
    );


    const todayPlan = useMemo(() => {
        const safePlaces = Array.isArray(storyPlaces) ? [...storyPlaces] : [];
        if (!safePlaces.length) return [];

        const getLabel = (obj: any, fallback = "") =>
            obj?.[lang] || obj?.en || obj?.pt || fallback;

        const normalize = (place: any) => ({
            id: place.id,
            title: getLabel(place.name, ""),
            description: getLabel(place.description, ""),
            location: getLabel(place.location, ""),
            category: place.category || "",
            tags: Array.isArray(place.tags) ? place.tags.map((t: string) => t.toLowerCase()) : [],
            imageUrl: place.image_url || "/image.png",
            tips: Array.isArray(place.tips) ? place.tips : [],
        });

        const places = safePlaces.map(normalize).filter((p) => p.title);

        const bucketForPlace = (place: any) => {
            const tags = place.tags || [];
            const category = (place.category || "").toLowerCase();
            const hasAny = (keys: string[]) => keys.some((key) => tags.some((t: string) => t.includes(key)));
            if (category.includes("beach") || hasAny(["praia", "beach"])) return "beach";
            if (category.includes("settlement") || hasAny(["vila", "village", "povoação", "povoacao", "aldeia"]))
                return "settlement";
            if (
                category.includes("religious") ||
                category.includes("historical") ||
                hasAny([
                    "património",
                    "patrimonio",
                    "heritage",
                    "cultura",
                    "cultural",
                    "igreja",
                    "church",
                    "capela",
                    "chapel",
                ])
            )
                return "heritage";
            if (
                category.includes("protected") ||
                hasAny([
                    "parque",
                    "park",
                    "dunas",
                    "dunes",
                    "lagoa",
                    "lagoon",
                    "zona húmida",
                    "wetland",
                    "biodiversidade",
                    "biodiversity",
                ])
            )
                return "nature";
            return "other";
        };

        const today = new Intl.DateTimeFormat("en-US", {
            weekday: "short",
            timeZone: "Atlantic/Cape_Verde",
        }).format(new Date()) as "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

        const seaCalm = todayConditions?.wave != null && todayConditions.wave <= 1.5;
        const windy = todayConditions?.windSpeed != null && todayConditions.windSpeed >= 12;
        const maxBeach = windy ? 1 : seaCalm ? 2 : 1;

        const boostsByCategory: Record<string, number> = {
            beach: seaCalm ? 4 : windy ? -2 : 1,
            dunes: seaCalm ? 2 : windy ? -1 : 1,
            wetland: seaCalm ? 1 : windy ? -1 : 1,
            protected_area: seaCalm ? 1 : 2,
            mountain: windy ? 2 : 1,
            settlement: windy ? 3 : 1,
            religious_heritage: windy ? 3 : 1,
            historical_heritage: windy ? 2 : 1,
            economic_activity: windy ? 2 : 1,
            ribeira: 1,
        };

        const dayBoosts: Record<string, Record<string, number>> = {
            Tue: { settlement: 2, economic_activity: 2, religious_heritage: 1 },
            Fri: { beach: 2, dunes: 2, protected_area: 1 },
            Sun: { religious_heritage: 2, beach: 1, settlement: 1 },
        };

        const slotBoosts: Record<string, Record<string, number>> = {
            morning: { settlement: 2, economic_activity: 2, beach: seaCalm ? 1 : -1 },
            midday: { protected_area: 2, mountain: 2, beach: seaCalm ? 1 : -1 },
            late: { beach: seaCalm ? 3 : 0, settlement: 1 },
        };

        const scorePlace = (place: any, slot: "morning" | "midday" | "late") => {
            let score = 0;
            const cat = place.category;
            score += boostsByCategory[cat] || 0;
            score += dayBoosts[today]?.[cat] || 0;
            score += slotBoosts[slot]?.[cat] || 0;
            if (place.tags.some((t: string) => t.includes("praia"))) score += seaCalm ? 1 : -1;
            if (place.tags.some((t: string) => t.includes("dunas"))) score += seaCalm ? 1 : 0;
            if (place.tags.some((t: string) => t.includes("vida comunitária"))) score += windy ? 1 : 0;
            if (place.tags.some((t: string) => t.includes("património"))) score += windy ? 1 : 0;
            if (place.tags.some((t: string) => t.includes("tartarugas"))) score += seaCalm ? 1 : 0;
            if (slot === "late" && place.id === "praia-baxona") score += 2;
            if (slot === "late" && place.id === "praia-bitche-rotcha") score += 2;
            if (today === "Sun" && place.id === "praia-ponta-preta") score += 2;
            return score;
        };

        const pickTop = (
            slot: "morning" | "midday" | "late",
            used: Set<string>,
            usedBuckets: Map<string, number>
        ) => {
            const ranked = places
                .filter((p) => !used.has(p.id))
                .map((p) => {
                    const bucket = bucketForPlace(p);
                    const repeats = usedBuckets.get(bucket) || 0;
                    let score = scorePlace(p, slot) - repeats * 2;
                    if (bucket === "beach" && (usedBuckets.get("beach") || 0) >= maxBeach) {
                        score -= 1000;
                    }
                    if (slot === "morning" && bucket === "beach" && !seaCalm) score -= 2;
                    return { ...p, score, bucket };
                })
                .sort((a, b) => b.score - a.score);
            const chosen = ranked[0];
            if (chosen) {
                used.add(chosen.id);
                usedBuckets.set(
                    chosen.bucket,
                    (usedBuckets.get(chosen.bucket) || 0) + 1
                );
            }
            return chosen || null;
        };

        const used = new Set<string>();
        const usedBuckets = new Map<string, number>();
        const morning = pickTop("morning", used, usedBuckets);
        const midday = pickTop("midday", used, usedBuckets);
        const late = pickTop("late", used, usedBuckets);

        return [
            { label: copy[lang].morning, spot: morning },
            { label: copy[lang].midday, spot: midday },
            { label: copy[lang].lateDay, spot: late },
        ].filter((item) => item.spot);
    }, [storyPlaces, lang, todayConditions, copy]);

    useEffect(() => {
        if (!activeChapterId && chapters.length) {
            setActiveChapterId(chapters[0].id);
        }
    }, [activeChapterId, chapters]);

    useEffect(() => {
        if (!flightOverlayOpen || !activeFlight || !flightMapContainerRef.current) return;

        if (flightMapRef.current) {
            flightMapRef.current.remove();
            flightMapRef.current = null;
        }

        if (typeof window !== "undefined" && maplibregl.getWorkerUrl() === "") {
            maplibregl.setWorkerUrl("/maplibre-gl-csp-worker.js");
        }

        const map = new maplibregl.Map({
            container: flightMapContainerRef.current,
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
                },
                layers: [
                    {
                        id: "background",
                        type: "background",
                        paint: { "background-color": "#f4f7fb" },
                    },
                    { id: "osm", type: "raster", source: "osm" },
                ],
            },
            interactive: true,
        });

        const from = flightEndpoints[activeFlight.from];
        const to = flightEndpoints[activeFlight.to];
        const bounds = new maplibregl.LngLatBounds(
            [
                Math.min(from.coords[0], to.coords[0]),
                Math.min(from.coords[1], to.coords[1]),
            ],
            [
                Math.max(from.coords[0], to.coords[0]),
                Math.max(from.coords[1], to.coords[1]),
            ]
        );

        map.on("load", () => {
            map.addSource("flight-line", {
                type: "geojson",
                data: {
                    type: "Feature",
                    geometry: {
                        type: "LineString",
                        coordinates: [from.coords, to.coords],
                    },
                    properties: {},
                },
            });
            map.addLayer({
                id: "flight-line",
                type: "line",
                source: "flight-line",
                paint: {
                    "line-color": "#0f172a",
                    "line-width": 2,
                },
            });

            new maplibregl.Marker({ color: "#0ea5e9" })
                .setLngLat(from.coords)
                .addTo(map);
            new maplibregl.Marker({ color: "#22c55e" })
                .setLngLat(to.coords)
                .addTo(map);

            const makeLabel = (text: string, variant: "from" | "to") => {
                const el = document.createElement("div");
                el.style.padding = "6px 10px";
                el.style.borderRadius = "999px";
                el.style.background = "rgba(255,255,255,0.92)";
                el.style.border =
                    variant === "from"
                        ? "1px solid rgba(14,165,233,0.45)"
                        : "1px solid rgba(34,197,94,0.45)";
                el.style.fontSize = "12px";
                el.style.fontWeight = "600";
                el.style.color = variant === "from" ? "#0ea5e9" : "#22c55e";
                el.style.boxShadow = "0 6px 12px rgba(15,23,42,0.1)";
                el.textContent = text;
                return el;
            };

            new maplibregl.Marker({
                element: makeLabel(
                    `${lang === "pt" ? "De" : "From"} ${from.name}`,
                    "from"
                ),
            })
                .setLngLat(from.coords)
                .addTo(map);
            new maplibregl.Marker({
                element: makeLabel(
                    `${lang === "pt" ? "Para" : "To"} ${to.name}`,
                    "to"
                ),
            })
                .setLngLat(to.coords)
                .addTo(map);

            map.fitBounds(bounds, {
                padding: { top: 60, right: 60, bottom: 180, left: 60 },
                maxZoom: 12.5,
                duration: 0,
            });
        });

        const resizeMap = () => {
            if (!flightMapRef.current) return;
            flightMapRef.current.resize();
            flightMapRef.current.fitBounds(bounds, {
                padding: { top: 60, right: 60, bottom: 180, left: 60 },
                maxZoom: 12.5,
                duration: 0,
            });
        };

        const resizeTimer = window.setTimeout(resizeMap, 50);

        flightMapRef.current = map;

        return () => {
            window.clearTimeout(resizeTimer);
            map.remove();
            flightMapRef.current = null;
        };
    }, [flightOverlayOpen, activeFlight]);

    useEffect(() => {
        if (!flightOverlayOpen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.dispatchEvent(
            new CustomEvent("maio-nav-visibility", {
                detail: { hidden: true, hideHeader: true },
            })
        );
        return () => {
            document.body.style.overflow = previous;
            window.dispatchEvent(
                new CustomEvent("maio-nav-visibility", {
                    detail: { hidden: false, hideHeader: false },
                })
            );
        };
    }, [flightOverlayOpen]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        const id = window.setTimeout(() => {
            map.resize();
        }, 50);
        return () => window.clearTimeout(id);
    }, [isFullscreen]);

    useEffect(() => {
        if (typeof document === "undefined") return;
        if (isFullscreen) {
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
    }, [isFullscreen]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        if (map.getLayer("beaches-labels")) {
            map.setLayoutProperty("beaches-labels", "text-field", [
                "coalesce",
                ["get", "name"],
                ["get", "afia_name"],
                ["get", "name:pt"],
                ["get", "name:en"],
                lang === "pt" ? "Praia" : "Beach",
            ]);
        }
    }, [lang]);


    /* =========================
       UI
    ========================= */
    return (
        <>
            <div className="bg-background relative">
            <div
                className="hidden absolute inset-0 z-0 bg-center bg-no-repeat opacity-[0.04]"
                style={{
                    backgroundImage: "url('/maioazul.png')",
                    backgroundSize: "300px",
                }}
            />

            {!isFullscreen && (
                <div className="maio-map-header fixed inset-x-0 top-0 z-40 bg-background/90 backdrop-blur">
                    <div className="max-w-6xl mx-auto px-6 py-4 flex items-start justify-between">
                        <div>
                            <h1 className="text-xl font-semibold">
                                {copy[lang].title}
                            </h1>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="inline-flex rounded-md border border-border bg-background/95 backdrop-blur overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setLang("pt")}
                                    aria-pressed={lang === "pt"}
                                    className={`px-3 py-2 text-xs font-medium transition ${lang === "pt"
                                        ? "bg-foreground text-background"
                                        : "text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    PT
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLang("en")}
                                    aria-pressed={lang === "en"}
                                    className={`px-3 py-2 text-xs font-medium transition ${lang === "en"
                                        ? "bg-foreground text-background"
                                        : "text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    EN
                                </button>
                            </div>
                            <ThemeToggle />
                        </div>

                    </div>
                </div>
            )}

            <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-10 flex flex-col gap-8">


                <div className="flex flex-col gap-5 overflow-hidden">
                    <div className="order-2 space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-2">
                                <div className="text-base font-semibold text-foreground">
                                    {copy[lang].explore}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* <button
                                    type="button"
                                    onClick={() => setExploreOpen(true)}
                                    aria-label={copy[lang].explore}
                                    className="h-8 w-8 rounded-full border border-amber-300/60 bg-gradient-to-br from-amber-200 via-amber-100 to-white text-amber-700 shadow-sm hover:bg-amber-100 flex items-center justify-center transition"
                                >
                                    <Sparkles className="h-3.5 w-3.5" />
                                </button> */}
                                <Link
                                    href="/places"
                                    aria-label={lang === "pt" ? "Todos os lugares" : "All places"}
                                    className="h-8 w-8 rounded-full border border-border bg-background/95 backdrop-blur shadow-sm hover:bg-accent flex items-center justify-center active:scale-[0.95]"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>

                        <div className="relative">
                            <div
                                ref={chapterListRef}
                                className="flex gap-4 overflow-x-auto pb-2 pr-4 snap-x snap-mandatory scrollbar-hide scroll-smooth overscroll-x-contain"
                            >
                                {storyLoading &&
                                    Array.from({ length: 4 }).map((_, index) => (
                                        <div
                                            key={`story-skeleton-${index}`}
                                            className="relative snap-start min-w-[72%] sm:min-w-[48%] lg:min-w-[22%] rounded-2xl border border-black/30 dark:border-white/40 bg-background p-4 shadow-sm"
                                        >
                                            <div className="h-32 w-full rounded-2xl bg-muted animate-pulse" />
                                            <div className="mt-3 h-4 w-3/5 rounded-full bg-muted animate-pulse" />
                                            <div className="mt-2 h-3 w-full rounded-full bg-muted animate-pulse" />
                                            <div className="mt-2 h-3 w-4/5 rounded-full bg-muted animate-pulse" />
                                            <div className="mt-3 h-7 w-28 rounded-full bg-muted animate-pulse" />
                                        </div>
                                    ))}
                                {!storyLoading &&
                                    chapters.map((chapter, index) => (
                                        <div
                                            key={chapter.id}
                                            className={`relative snap-start min-w-[72%] sm:min-w-[48%] lg:min-w-[22%] min-h-[300px] rounded-2xl border bg-background p-4 shadow-sm transition duration-300 ease-out flex flex-col ${activeChapterId === chapter.id
                                                    ? "border-black/60 dark:border-white/70 ring-1 ring-black/10 dark:ring-white/15"
                                                    : "border-black/20 dark:border-white/30"
                                                }`}
                                        >
                                            <button
                                                type="button"
                                                data-id={chapter.id}
                                                ref={(el) => {
                                                    chapterRefs.current[index] = el;
                                                }}
                                                onClick={() => {
                                                    setActiveChapterId(chapter.id);
                                                    chapterRefs.current[index]?.scrollIntoView({
                                                        behavior: "smooth",
                                                        inline: "center",
                                                        block: "nearest",
                                                    });
                                                }}
                                                className="w-full text-left"
                                            >
                                                <div className="relative overflow-hidden rounded-2xl">
                                                    <img
                                                        src={chapter.image}
                                                        alt={chapter.title}
                                                        className="h-32 w-full object-cover"
                                                        loading="lazy"
                                                        decoding="async"
                                                    />
                                                    <span className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-[11px] font-medium shadow-sm">
                                                        {chapter.kicker}
                                                    </span>
                                                </div>
                                                <div className="mt-3 text-base font-semibold line-clamp-1">
                                                    {chapter.title}
                                                </div>
                                                <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                                    {chapter.description}
                                                </div>
                                            </button>
                                            <Link
                                                href={`/places/${chapter.id}`}
                                                prefetch
                                                className="mt-auto inline-flex w-full items-center justify-center rounded-full border border-border bg-background px-3 py-3 text-xs font-medium text-foreground shadow-sm transition duration-300 ease-out hover:bg-accent active:scale-[0.98]"
                                            >
                                                {copy[lang].viewPlace}
                                            </Link>
                                        </div>
                                    ))}
                            </div>
                            <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-background via-background/50 to-transparent" />
                        </div>

                        <div className="mt-5 rounded-2xl border border-border bg-background p-6 shadow-sm maio-fade-up">
                            <div className="mb-6 flex items-center justify-between">
                                <div>
                                    <div className="text-base font-semibold">
                                        {copy[lang].todayInMaio}
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                        {copy[lang].todayHint}
                                    </div>
                                </div>
                                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                                    <Sun className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-3 text-xs text-muted-foreground">
                                {todayConditions?.label ? (
                                    todayConditions.label
                                ) : (
                                    <Skeleton className="h-4 w-44 rounded-full" />
                                )}
                            </div>
                            <div className="mt-4 grid gap-4 sm:grid-cols-3">
                                {todayPlan.length === 0 && (
                                    <>
                                        {Array.from({ length: 3 }).map((_, idx) => (
                                            <div
                                                key={`idea-skeleton-${idx}`}
                                                className="rounded-2xl border border-border bg-background/80 p-4 shadow-sm"
                                            >
                                                <Skeleton className="h-3 w-16 rounded-full" />
                                                <div className="mt-2 flex items-center gap-3">
                                                    <Skeleton className="h-12 w-12 rounded-xl" />
                                                    <div className="flex-1 space-y-2">
                                                        <Skeleton className="h-3 w-3/4 rounded-full" />
                                                        <Skeleton className="h-3 w-1/2 rounded-full" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}
                                {todayPlan.map((item) => (
                                    <Link
                                        key={`${item.label}-${item.spot.id}`}
                                        href={`/places/${item.spot.id}`}
                                        prefetch
                                        className="group rounded-2xl border border-border bg-background/80 p-4 text-left shadow-sm transition duration-300 ease-out"
                                    >
                                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                            {item.label}
                                        </div>
                                        <div className="mt-2 flex items-center gap-3">
                                            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
                                                <img
                                                    src={item.spot.imageUrl || "/image.png"}
                                                    alt={item.spot.title}
                                                    className="h-full w-full object-cover transition group-hover:scale-105"
                                                    loading="lazy"
                                                    decoding="async"
                                                />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-semibold text-foreground line-clamp-1">
                                                    {item.spot.title}
                                                </div>
                                                {item.spot.location && (
                                                    <div className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
                                                        {item.spot.location}
                                                    </div>
                                                )}
                                                {item.spot.tips?.length ? (
                                                    <div className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                                                        {item.spot.tips?.[0]?.[lang] ||
                                                            item.spot.tips?.[0]?.en ||
                                                            item.spot.tips?.[0]?.pt}
                                                    </div>
                                                ) : null}
                                                <div className="mt-1">
                                                    <span className="capitalize inline-flex rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                        {item.spot.category || (lang === "pt" ? "Local" : "Spot")}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="flex items-baseline justify-between gap-4">
                                <div>
                                    <div className="text-base font-semibold">
                                        {copy[lang].schedulesTitle}
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                        {copy[lang].schedulesHint}
                                    </div>
                                </div>
                            </div>
                        </div>

                            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl border border-border bg-background p-6 shadow-sm maio-fade-up">
                                    <div className="flex items-center justify-between">
                                        <div className="text-base font-semibold">
                                            {copy[lang].boatsSection}
                                        </div>
                                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                                        <Ship className="h-4 w-4" />
                                    </div>
                                    </div>
                                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                                    {boatsLoading && (
                                        <div className="space-y-3">
                                            <Skeleton className="h-20 w-full rounded-2xl" />
                                            <Skeleton className="h-20 w-full rounded-2xl" />
                                        </div>
                                    )}
                                    {!boatsLoading && boatSchedules.length === 0 && (
                                        <div>{copy[lang].scheduleUnavailable}</div>
                                    )}
                                    {!boatsLoading && boatSchedules.length > 0 && (
                                        <div>
                                            {boatSchedules
                                                .reduce((acc: any[], item: any) => {
                                                    const rawDate = item.date || item.day;
                                                    const label = formatBoatDate(rawDate);
                                                    const key = rawDate || label;
                                                    if (!acc.find((d) => d.key === key)) {
                                                        acc.push({
                                                            key,
                                                            label,
                                                            items: [item],
                                                            sortKey: boatDateKey(rawDate),
                                                        });
                                                    } else {
                                                        const bucket = acc.find((d) => d.key === key);
                                                        if (bucket && bucket.items.length < 2) bucket.items.push(item);
                                                    }
                                                    return acc;
                                                }, [])
                                                .filter((group: any) => group.sortKey >= getCvTodayKey().key)
                                                .sort((a: any, b: any) => a.sortKey - b.sortKey)
                                                .slice(0, 1)
                                                .map((group, idx) => (
                                                    <div key={`boat-day-${idx}`} className="space-y-3">






                                                        <div className="grid gap-3 sm:grid-cols-1">
                                                            {[group.items.find((i: any) => i.to === "Maio") || group.items[0]]
                                                                .filter(Boolean)
                                                                .map((item: any, j: number) => (
                                                                    <div
                                                                        key={`boat-item-${idx}-${j}`}
                                                                        className="rounded-2xl border border-border bg-background/80 p-4 shadow-sm"
                                                                    >
                                                                        <div className="capitalize mb-2 text-xs font-semibold text-foreground">
                                                                            {group.label}
                                                                        </div>
                                                                        <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
                                                                            <span>{item.from}</span>
                                                                            <span className="relative flex-1 mx-3 h-px bg-border">
                                                                                <span className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-rose-500" />
                                                                                <span className="absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-rose-500" />
                                                                            </span>
                                                                            <span>{item.to}</span>
                                                                        </div>
                                                                        <div className="mt-2 grid grid-cols-2 gap-3 text-sm text-foreground">
                                                                            <div>
                                                                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                                                    {lang === "pt" ? "Partida" : "Departed"}
                                                                                </div>
                                                                                <div className="text-base font-semibold">
                                                                                    {item.departure}
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                                                    {lang === "pt" ? "Chega" : "Arrives"}
                                                                                </div>
                                                                                <div className="text-base font-semibold">
                                                                                    {item.arrival || computeBoatArrival(item.departure)}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="hidden mt-2 text-xs text-muted-foreground">
                                                                            {item.vessel}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            {boatFallback && (
                                                <div className="mt-2 text-xs text-muted-foreground">
                                                    {lang === "pt"
                                                        ? "Horário padrão (Qua, Sex, Dom)"
                                                        : "Default schedule (Wed, Fri, Sun)"}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-border bg-background p-6 shadow-sm maio-fade-up">
                                <div className="flex items-center justify-between">
                                    <div className="text-base font-semibold">
                                        {copy[lang].flightsSection}
                                    </div>
                                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
                                        <Plane className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                                    {flightsLoading && (
                                        <div className="space-y-3">
                                            <Skeleton className="h-20 w-full rounded-2xl" />
                                            <Skeleton className="h-20 w-full rounded-2xl" />
                                        </div>
                                    )}
                                    {!flightsLoading &&
                                        (() => {
                                            const todayRai = getTodayFlight(flightSchedules.rai_mmo, "RAI", "MMO");
                                            const todayMmo = getTodayFlight(flightSchedules.mmo_rai, "MMO", "RAI");
                                            const nextRai = todayRai || getFallbackFlight("RAI", "MMO");
                                            const nextMmo = todayMmo || getFallbackFlight("MMO", "RAI");

                                            const renderCard = (item: any, from: "RAI" | "MMO", to: "RAI" | "MMO") => {
                                                const dateLabel = item?.date
                                                    ? formatCvDate(item.date)
                                                    : formatCvDateObj(item.dateObj);
                                                const isToday = item?.date ? isCvToday(item.date) : false;
                                                const flightLabel = item?.flight ? item.flight : "VR";
                                                const sourceLabel = item?.source || "";
                                                return (
                                                    <button
                                                        key={`${from}-${to}-${item?.departure}-${dateLabel}`}
                                                        type="button"
                                                        onClick={() => {
                                                            setActiveFlight({
                                                                from,
                                                                to,
                                                                departure: item.departure,
                                                                arrival: item.arrival || "",
                                                                dateLabel,
                                                            });
                                                            setFlightOverlayOpen(true);
                                                        }}
                                                        className="rounded-2xl border border-border bg-background/80 p-4 text-left shadow-sm transition duration-300 ease-out active:scale-[0.98]"
                                                    >
                                                        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                                                            <span>{dateLabel}</span>
                                                            {isToday && (
                                                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                                                                    {lang === "pt" ? "Hoje" : "Today"}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
                                                            <span>{from}</span>
                                                            <span className="relative flex-1 mx-3 h-px bg-border">
                                                                <span className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-rose-500" />
                                                                <span className="absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-rose-500" />
                                                            </span>
                                                            <span>{to}</span>
                                                        </div>
                                                        <div className="mt-2 grid grid-cols-2 gap-3 text-sm text-foreground">
                                                            <div>
                                                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                                    {lang === "pt" ? "Partida" : "Departed"}
                                                                </div>
                                                                <div className="text-base font-semibold">
                                                                    {item?.departure || "—"}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                                    {lang === "pt" ? "Chega" : "Arrives"}
                                                                </div>
                                                                <div className="text-base font-semibold">
                                                                    {item?.arrival || "—"}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="hidden mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                                                            <span>{flightLabel}</span>
                                                            <span>{item?.status || (sourceLabel ? sourceLabel : "")}</span>
                                                        </div>
                                                    </button>
                                                );
                                            };

                                            return (
                                                <div className="grid gap-4 sm:grid-cols-1">
                                                    {renderCard(nextRai, "RAI", "MMO")}
                                                </div>
                                            );
                                        })()}
                                    {!flightsLoading && (
                                        <div className="mt-2 text-xs text-muted-foreground">
                                            {lang === "pt"
                                                ? "Horário baseado em dados públicos."
                                                : "Schedule based on public data."}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-10">
                            <div className="rounded-3xl border border-border bg-background p-6 shadow-sm maio-fade-up">
                                <div className="text-lg font-semibold">
                                    {copy[lang].dailyForecast}
                                </div>
                                <div className="hidden mt-4 text-sm font-semibold text-muted-foreground">
                                    {copy[lang].temperatureLabel}
                                </div>
                                <div className="mt-3">
                                    {weather?.daily?.length ? (
                                        <div className="flex gap-1 overflow-x-auto pb-1 sm:grid sm:grid-cols-7 sm:gap-3 sm:overflow-visible">
                                            {weather.daily.slice(0, 7).map((day: any, index: number) => {
                                                const date = new Date(day.date);
                                                const dayLabel =
                                                    index === 0
                                                        ? copy[lang].today
                                                        : new Intl.DateTimeFormat(
                                                              lang === "pt" ? "pt-PT" : "en-US",
                                                              { weekday: "short", timeZone: "Atlantic/Cape_Verde" }
                                                          ).format(date);
                                                const dateLabel = new Intl.DateTimeFormat(
                                                    lang === "pt" ? "pt-PT" : "en-US",
                                                    { month: "numeric", day: "numeric", timeZone: "Atlantic/Cape_Verde" }
                                                ).format(date);
                                                const icon = weatherIcon(day.weather_code ?? weather.weather_code ?? 0);
                                                return (
                                                    <div
                                                        key={`${day.date}-${index}`}
                                                        className={`min-w-[76px] sm:min-w-0 rounded-2xl px-3 py-3 text-center ${index === 0
                                                                ? "bg-black/5 text-foreground dark:bg-white/10"
                                                                : "bg-muted/40 text-foreground"
                                                            }`}
                                                    >
                                                        <div className="text-sm font-semibold capitalize">{dayLabel}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {dateLabel}
                                                        </div>
                                                        <div className="mt-2 text-2xl">{icon}</div>
                                                        <div className="mt-2 text-sm font-semibold">
                                                            {Math.round(day.temperature_max)}°
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {Math.round(day.temperature_min)}°
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex gap-1 overflow-x-auto pb-1 sm:grid sm:grid-cols-7 sm:gap-3 sm:overflow-visible">
                                            {Array.from({ length: 7 }).map((_, i) => (
                                                <div
                                                    key={`forecast-skeleton-${i}`}
                                                    className="min-w-[76px] sm:min-w-0 rounded-2xl px-3 py-3"
                                                >
                                                    <Skeleton className="h-3 w-10 rounded-full" />
                                                    <Skeleton className="mt-2 h-3 w-8 rounded-full" />
                                                    <Skeleton className="mt-3 h-6 w-6 rounded-full" />
                                                    <Skeleton className="mt-3 h-3 w-8 rounded-full" />
                                                    <Skeleton className="mt-2 h-3 w-6 rounded-full" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="rounded-3xl border border-border bg-background p-6 shadow-sm maio-fade-up">
                                <div className="text-lg font-semibold">{copy[lang].servicesTitle}</div>
                                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() => setCurrencyOpen(true)}
                                        className="flex items-center justify-between rounded-2xl bg-muted/40 p-4 transition hover:bg-muted/60"
                                    >
                                        <div className="inline-flex items-center gap-3">
                                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-background text-foreground shadow-sm">
                                                <BadgeDollarSign className="h-4 w-4" />
                                            </span>
                                            <div className="text-sm font-semibold text-foreground">
                                                {copy[lang].currencyConverterTitle}
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEsimOpen(true)}
                                        className="flex items-center justify-between rounded-2xl bg-muted/40 p-4 transition hover:bg-muted/60"
                                    >
                                        <div className="inline-flex items-center gap-3">
                                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-background text-foreground shadow-sm">
                                                <Smartphone className="h-4 w-4" />
                                            </span>
                                            <div className="text-sm font-semibold text-foreground">
                                                {copy[lang].esimTitle}
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSurfOpen(true)}
                                        className="flex items-center justify-between rounded-2xl bg-muted/40 p-4 transition hover:bg-muted/60"
                                    >
                                        <div className="inline-flex items-center gap-3">
                                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-background text-foreground shadow-sm">
                                                <Waves className="h-4 w-4" />
                                            </span>
                                            <div className="text-sm font-semibold text-foreground">
                                                {copy[lang].surfConditionsTitle}
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div
                        className={`order-1 h-[42vh] sm:h-[48vh] lg:h-[52vh] ${isFullscreen ? "fixed inset-0 z-[80] h-auto bg-background" : ""
                            }`}
                    >
                        <div
                            className={`relative h-full rounded-lg border border-border overflow-hidden bg-background ${isFullscreen ? "rounded-none border-0" : ""
                                }`}
                        >
                            <div
                                ref={containerRef}
                                className="absolute inset-0 h-full w-full"
                            />

                            <div className="absolute top-4 left-3 right-16 sm:right-20 lg:right-3 z-30 flex items-center gap-2">
                                {isFullscreen && (
                                    <button
                                        type="button"
                                        onClick={() => setFiltersOpen((o) => !o)}
                                        aria-label={copy[lang].filters}
                                        className="h-10 w-10 rounded-lg border border-border bg-background/95 backdrop-blur shadow-sm hover:bg-accent flex items-center justify-center"
                                    >
                                        <SlidersHorizontal className="h-4 w-4" />
                                    </button>
                                )}

                                <div className="relative flex-1">
                                    <input
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setSearchOpen(true);
                                        }}
                                        onFocus={() => {
                                            setSearchOpen(true);
                                            clearSelections();
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && filteredResults[0]) {
                                                const result = filteredResults[0];
                                                setSearchQuery(result.name);
                                                setSearchOpen(false);
                                                clearSelections();
                                                mapRef.current?.flyTo({
                                                    center: result.coordinates,
                                                    zoom: 15.5,
                                                    essential: true,
                                                });
                                            }
                                        }}
                                        placeholder={copy[lang].searchPlaceholder}
                                        className="h-10 w-full rounded-xl border border-border bg-background/95 backdrop-blur px-4 pr-16 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    {searchQuery.length > 0 && (
                                        <button
                                            type="button"
                                            aria-label={copy[lang].clearSearch}
                                            onClick={() => {
                                                setSearchQuery("");
                                                setSearchOpen(false);
                                                clearSelections();
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-base font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                    {searchOpen && filteredResults.length > 0 && (
                                        <div className="absolute mt-2 w-full rounded-xl border border-border bg-background/95 backdrop-blur shadow-lg overflow-hidden">
                                            {filteredResults.map((item) => (
                                                <button
                                                    key={`${item.type}-${item.name}`}
                                                    type="button"
                                                    onClick={() => {
                                                        setSearchQuery(item.name);
                                                        setSearchOpen(false);
                                                        clearSelections();
                                                        mapRef.current?.flyTo({
                                                            center: item.coordinates,
                                                            zoom: 15.5,
                                                            essential: true,
                                                        });
                                                    }}
                                                    className="w-full px-4 py-2 text-left text-sm hover:bg-accent"
                                                >
                                                    {item.name}
                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                        {item.type === "beach"
                                                            ? copy[lang].searchType.beach
                                                            : item.type === "settlement"
                                                                ? copy[lang].searchType.settlement
                                                                : copy[lang].searchType.protected}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>


                            {voiceGuideEnabled && typeof locationAccuracy === "number" && locationAccuracy > 200 && (
                                <div className="absolute top-16 left-3 right-3 z-30 rounded-2xl border border-amber-300/60 bg-amber-50/90 text-amber-800 text-xs px-3 py-2 backdrop-blur">
                                    {copy[lang].voiceAccuracyLow}
                                </div>
                            )}

                            {locationError && (
                                <div className="absolute top-16 left-3 right-3 z-30 rounded-2xl border border-border bg-background/95 text-xs px-3 py-2 shadow-sm backdrop-blur">
                                    {locationError}
                                </div>
                            )}

                            {showClickToCopyCoords && mapClickCoord && (
                                <div className="absolute bottom-4 left-3 z-30 rounded-2xl border border-border bg-background/95 px-3 py-2 text-xs shadow-sm backdrop-blur">
                                    <div className="font-medium">
                                        {mapClickCoord.lat}, {mapClickCoord.lng}
                                    </div>
                                    <div className="mt-1 text-[10px] text-muted-foreground">
                                        {coordCopied
                                            ? lang === "pt"
                                                ? "Copiado"
                                                : "Copied"
                                            : lang === "pt"
                                                ? "Clique no mapa para copiar"
                                                : "Click the map to copy"}
                                    </div>
                                </div>
                            )}

                            <Drawer.Root
                                open={Boolean(selectedMapItem)}
                                onOpenChange={(open) => {
                                    if (!open) clearSelections();
                                }}
                            >
                                <Drawer.Portal>
                                    <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-sm" />
                                    <Drawer.Content className="fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl border border-border bg-background p-4 pt-6 pb-8 shadow-xl">
                                        <Drawer.Title className="sr-only">
                                            {selectedMapItem?.name || (lang === "pt" ? "Detalhes do local" : "Place details")}
                                        </Drawer.Title>
                                        {selectedMapItem && (
                                            <div className="space-y-3">
                                                <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/30" />
                                                <div className="relative h-44 overflow-hidden rounded-2xl">
                                                    <img
                                                        src={
                                                            selectedMapItem.image ||
                                                            selectedMapItem.image_url ||
                                                            getDefaultImageForPlace(selectedMapItem)
                                                        }
                                                        alt={selectedMapItem.name}
                                                        className="h-full w-full object-cover"
                                                        loading="lazy"
                                                        decoding="async"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={clearSelections}
                                                        aria-label={copy[lang].close}
                                                        className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <div className="px-1">
                                                    <div className="text-base font-semibold text-foreground">
                                                        {selectedMapItem.name}
                                                    </div>
                                                    {getVoiceSummary(selectedMapItem) && (
                                                        <div className="mt-1 text-sm text-muted-foreground">
                                                            {getShortText(getVoiceSummary(selectedMapItem), 220)}
                                                        </div>
                                                    )}
                                                    <div className="mt-3 flex items-center gap-2">
                                                        {selectedMapItem.id && (
                                                            <Link
                                                                href={`/places/${selectedMapItem.id}`}
                                                                prefetch
                                                                className="inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground shadow-sm hover:bg-accent"
                                                            >
                                                                {lang === "pt" ? "Abrir" : "Open"}
                                                            </Link>
                                                        )}
                                                        {canPlayVoice(selectedMapItem) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStoryPlay(selectedMapItem)}
                                                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-accent"
                                                            >
                                                                <Volume2 className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </Drawer.Content>
                                </Drawer.Portal>
                            </Drawer.Root>

                            {debugEnabled && debugPanelOpen && (
                                <div className="absolute bottom-4 left-3 z-30 w-[92%] max-w-sm rounded-2xl border border-border bg-background/95 backdrop-blur shadow-lg p-3">
                                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                        Debug: Location Simulator
                                    </div>
                                    <div className="mt-2">
                                        <select
                                            value={debugPlaceId}
                                            onChange={(e) => setDebugPlaceId(e.target.value)}
                                            className="h-10 w-full rounded-xl border border-border bg-background/95 px-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        >
                                            <option value="">Choose protected area</option>
                                            {debugProtectedPlaces.map((place) => (
                                                <option key={place.id} value={place.id}>
                                                    {place.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={!debugPlaceId}
                                            onClick={() => {
                                                const selected = debugProtectedPlaces.find(
                                                    (p) => p.id === debugPlaceId
                                                );
                                                if (!selected) return;
                                                setUserLocation({
                                                    lat: selected.coordinates[1],
                                                    lng: selected.coordinates[0],
                                                });
                                                mapRef.current?.flyTo({
                                                    center: selected.coordinates,
                                                    zoom: 14,
                                                    essential: true,
                                                });
                                            }}
                                            className="inline-flex items-center justify-center rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent disabled:opacity-50"
                                        >
                                            Set Location
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!debugPlaceId}
                                            onClick={() => {
                                                const selected = debugProtectedPlaces.find(
                                                    (p) => p.id === debugPlaceId
                                                );
                                                if (!selected) return;
                                                setVoicePlace(selected);
                                                speakForPlace(selected);
                                            }}
                                            className="inline-flex items-center justify-center rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent disabled:opacity-50"
                                        >
                                            Play Voice
                                        </button>
                                    </div>
                                </div>
                            )}

                            <Drawer.Root open={filtersOpen} onOpenChange={setFiltersOpen}>
                                <Drawer.Portal>
                                    <Drawer.Overlay className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm" />
                                    <Drawer.Content
                                        className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-border bg-background p-5 pt-7 pb-10 shadow-xl"
                                        style={
                                            {
                                                "--initial-transform": "calc(100% + 12px)",
                                                paddingBottom:
                                                    "calc(3.25rem + env(safe-area-inset-bottom))",
                                            } as React.CSSProperties
                                        }
                                    >
                                        <Drawer.Title className="sr-only">
                                            {lang === "pt" ? "Filtros do mapa" : "Map filters"}
                                        </Drawer.Title>
                                        <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/30" />
                                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                            <button
                                                onClick={() =>
                                                    setLayers((l) => ({
                                                        ...l,
                                                        protectedAreas: !l.protectedAreas,
                                                    }))
                                                }
                                                className={`px-3 py-2.5 rounded-xl border ${layers.protectedAreas ? "border-green-400" : "opacity-50"
                                                    }`}
                                            >
                                                {copy[lang].protectedAreas}
                                            </button>

                                            <button
                                                onClick={() =>
                                                    setLayers((l) => ({ ...l, beaches: !l.beaches }))
                                                }
                                                className={`px-3 py-2.5 rounded-xl border ${layers.beaches ? " border-yellow-400" : "opacity-50"
                                                    }`}
                                            >
                                                {copy[lang].beaches}
                                            </button>

                                            <button
                                                onClick={() =>
                                                    setLayers((l) => ({ ...l, settlements: !l.settlements }))
                                                }
                                                className={`px-3 py-2.5 rounded-xl border ${layers.settlements ? "border-purple-400" : "opacity-50"
                                                    }`}
                                            >
                                                {copy[lang].settlements}
                                            </button>

                                            <button
                                                onClick={() =>
                                                    setLayers((l) => ({ ...l, trilhas: !l.trilhas }))
                                                }
                                                className={`px-3 py-2.5 rounded-xl border ${layers.trilhas ? "border-orange-500" : "opacity-50"
                                                    }`}
                                            >
                                                {copy[lang].trails}
                                            </button>
                                        </div>

                                        <div className="mt-5 text-sm font-medium text-muted-foreground">
                                            {copy[lang].mapView}
                                        </div>
                                        <div className="mt-2 grid w-full grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setBaseMap("normal");
                                                    setFiltersOpen(false);
                                                }}
                                                className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium transition ${baseMap === "normal"
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
                                                    setFiltersOpen(false);
                                                }}
                                                className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium transition ${baseMap === "satellite"
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

                            <Drawer.Root open={exploreOpen} onOpenChange={setExploreOpen}>
                                <Drawer.Portal>
                                    <Drawer.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm" />
                                    <Drawer.Content
                                        className="fixed inset-x-0 bottom-0 z-[60] rounded-t-3xl border border-border bg-background p-5 pt-7 pb-10 shadow-xl"
                                        style={
                                            {
                                                "--initial-transform": "calc(100% + 12px)",
                                                paddingBottom:
                                                    "calc(3.25rem + env(safe-area-inset-bottom))",
                                            } as React.CSSProperties
                                        }
                                    >
                                        <Drawer.Title className="sr-only">
                                            {copy[lang].explore}
                                        </Drawer.Title>
                                        <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/30" />
                                        <div className="mt-4 flex items-center justify-between gap-3">
                                            <div className="text-base font-semibold text-foreground">
                                                {copy[lang].explore}
                                            </div>
                                            <Link
                                                href="/places"
                                                aria-label={lang === "pt" ? "Todos os lugares" : "All places"}
                                                className="h-9 w-9 rounded-full border border-border bg-background/95 backdrop-blur shadow-sm hover:bg-accent flex items-center justify-center active:scale-[0.95]"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Link>
                                        </div>
                                        <div className="relative mt-4">
                                            <div
                                                ref={chapterListRef}
                                                className="flex gap-4 overflow-x-auto pb-2 pr-4 snap-x snap-mandatory scrollbar-hide scroll-smooth overscroll-x-contain"
                                            >
                                                {storyLoading &&
                                                    Array.from({ length: 4 }).map((_, index) => (
                                                        <div
                                                            key={`story-skeleton-${index}`}
                                                            className="relative snap-start min-w-[72%] sm:min-w-[48%] lg:min-w-[22%] rounded-2xl border border-black dark:border-white bg-background p-3 shadow-sm"
                                                        >
                                                            <div className="h-32 w-full rounded-2xl bg-muted animate-pulse" />
                                                            <div className="mt-3 h-4 w-3/5 rounded-full bg-muted animate-pulse" />
                                                            <div className="mt-2 h-3 w-full rounded-full bg-muted animate-pulse" />
                                                            <div className="mt-2 h-3 w-4/5 rounded-full bg-muted animate-pulse" />
                                                            <div className="mt-3 h-7 w-28 rounded-full bg-muted animate-pulse" />
                                                        </div>
                                                    ))}
                                                {!storyLoading &&
                                                    chapters.map((chapter, index) => (
                                                        <div
                                                            key={chapter.id}
                                                            className={`relative snap-start min-w-[72%] sm:min-w-[48%] lg:min-w-[22%] min-h-[300px] rounded-2xl border bg-background p-3 shadow-sm hover:shadow-md transition flex flex-col ${activeChapterId === chapter.id
                                                                ? "border-black dark:border-white shadow-lg ring-1 ring-black/10 dark:ring-white/15"
                                                                : "border-black/20 dark:border-white/30"
                                                                }`}
                                                        >
                                                            <button
                                                                type="button"
                                                                data-id={chapter.id}
                                                                ref={(el) => {
                                                                    chapterRefs.current[index] = el;
                                                                }}
                                                                onClick={() => {
                                                                    setActiveChapterId(chapter.id);
                                                                    chapterRefs.current[index]?.scrollIntoView({
                                                                        behavior: "smooth",
                                                                        inline: "center",
                                                                        block: "nearest",
                                                                    });
                                                                }}
                                                                className="w-full text-left"
                                                            >
                                                                <div className="relative overflow-hidden rounded-2xl">
                                                                    <img
                                                                        src={chapter.image}
                                                                        alt={chapter.title}
                                                                        className="h-32 w-full object-cover"
                                                                        loading="lazy"
                                                                        decoding="async"
                                                                    />
                                                                    <span className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-[11px] font-medium shadow-sm">
                                                                        {chapter.kicker}
                                                                    </span>
                                                                </div>
                                                                <div className="mt-3 text-base font-semibold line-clamp-1">
                                                                    {chapter.title}
                                                                </div>
                                                                <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                                                    {chapter.description}
                                                                </div>
                                                            </button>
                                                            <Link
                                                                href={`/places/${chapter.id}`}
                                                                prefetch
                                                                className="mt-auto inline-flex w-full items-center justify-center rounded-full border border-border bg-background px-3 py-3 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent active:scale-[0.98]"
                                                            >
                                                                {copy[lang].viewPlace}
                                                            </Link>
                                                        </div>
                                                    ))}
                                            </div>
                                            <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-background via-background/50 to-transparent" />
                                        </div>
                                    </Drawer.Content>
                                </Drawer.Portal>
                            </Drawer.Root>

                            <Drawer.Root open={currencyOpen} onOpenChange={setCurrencyOpen}>
                                <Drawer.Portal>
                                    <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-sm" />
                                    <Drawer.Content className="fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl bg-background p-4 pt-6 pb-12 shadow-xl">
                                        <Drawer.Title className="text-base font-semibold text-foreground">
                                            {copy[lang].currencyConverterTitle}
                                        </Drawer.Title>
                                        <div className="mt-4">
                                            <CurrencyConverterPanel />
                                        </div>
                                    </Drawer.Content>
                                </Drawer.Portal>
                            </Drawer.Root>

                            <Drawer.Root open={esimOpen} onOpenChange={setEsimOpen}>
                                <Drawer.Portal>
                                    <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-sm" />
                                    <Drawer.Content className="fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl  bg-background p-4 pt-6 pb-10 shadow-xl">
                                        <Drawer.Title className="text-base font-semibold text-foreground">
                                            {copy[lang].esimTitle}
                                        </Drawer.Title>
                                        <div className="mt-4">
                                            <EsimCheckoutPanel />
                                        </div>
                                    </Drawer.Content>
                                </Drawer.Portal>
                            </Drawer.Root>

                            <Drawer.Root open={surfOpen} onOpenChange={setSurfOpen}>
                                <Drawer.Portal>
                                    <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-sm" />
                                    <Drawer.Content className="fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl  bg-background p-4 pt-6 pb-10 shadow-xl">
                                        <Drawer.Title className="text-base font-semibold text-foreground">
                                            {copy[lang].surfDrawerTitle}
                                        </Drawer.Title>
                                        <div className="mt-1 text-xs text-muted-foreground">
                                            {copy[lang].surfConditionsHint}
                                        </div>
                                        <div className="mt-4 rounded-2xl border border-border">
                                            <div className="grid grid-cols-4 gap-2 border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                <div>{copy[lang].surfColTime}</div>
                                                <div>{copy[lang].surfColSurf}</div>
                                                <div>{copy[lang].surfColSwell}</div>
                                                <div>{copy[lang].surfColWind}</div>
                                            </div>
                                            {surfLoading && (
                                                <div className="space-y-2 px-3 py-3">
                                                    {Array.from({ length: 3 }).map((_, idx) => (
                                                        <div
                                                            key={`surf-row-skeleton-${idx}`}
                                                            className="grid grid-cols-4 gap-2"
                                                        >
                                                            <Skeleton className="h-4 w-14 rounded-full" />
                                                            <Skeleton className="h-4 w-20 rounded-full" />
                                                            <Skeleton className="h-4 w-24 rounded-full" />
                                                            <Skeleton className="h-4 w-20 rounded-full" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {!surfLoading && surfData?.points?.length
                                                ? surfData.points.map((point) => {
                                                      const quality = surfQualityScore(point);
                                                      return (
                                                      <div
                                                          key={`${point.label}-${point.wind_kph}-${point.swell_m}`}
                                                          className="grid grid-cols-4 gap-2 border-b border-border px-3 py-3 text-sm last:border-b-0 items-center justify-center"
                                                      >
                                                          <div className="inline-flex items-center gap-2 font-semibold text-foreground">
                                                              <SurfQualityBar score={quality} />
                                                              <span>{point.label}</span>
                                                          </div>
                                                          <div className="text-foreground font-semibold text-md">
                                                              {point.surf_min_m.toFixed(1)}-{point.surf_max_m.toFixed(1)}m
                                                          </div>
                                                          <div className="text-foreground">
                                                              {point.swell_m.toFixed(1)}m · {point.swell_period_s}s
                                                          </div>
                                                          <div className="text-foreground">
                                                              {point.wind_kph} ({point.wind_gust_kph}) kph
                                                          </div>
                                                      </div>
                                                  );
                                                })
                                                : null}
                                            {!surfLoading && (surfError || !surfData?.points?.length) && (
                                                <div className="px-3 py-3 text-sm text-muted-foreground">
                                                    <div>{copy[lang].surfUnavailable}</div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSurfData(null);
                                                            setSurfError(false);
                                                            loadSurf();
                                                        }}
                                                        className="mt-2 inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-accent"
                                                    >
                                                        {copy[lang].retry}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </Drawer.Content>
                                </Drawer.Portal>
                            </Drawer.Root>

                            <div className="absolute top-4 right-3 z-30 flex flex-col items-end gap-2">
                                {isFullscreen && (
                                    <button
                                        type="button"
                                        aria-label={lang === "pt" ? "A minha localização" : "My location"}
                                        onClick={handleLocationRefresh}
                                        className="h-10 w-10 rounded-full border border-border bg-background/95 backdrop-blur shadow-sm hover:bg-accent flex items-center justify-center lg:hidden"
                                    >
                                        <LocateFixed className="h-4 w-4" />
                                    </button>
                                )}
                                {/* <button
                                    type="button"
                                    onClick={handleVoiceGuideToggle}
                                    aria-label={
                                        voiceGuideEnabled ? copy[lang].voiceGuideOn : copy[lang].voiceGuideOff
                                    }
                                    className={`h-10 w-10 rounded-full border border-border bg-background/95 backdrop-blur shadow-sm flex items-center justify-center transition ${
                                        voiceGuideEnabled
                                            ? "text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    <Volume2 className="h-4 w-4" />
                                </button> */}
                                <button
                                    type="button"
                                    aria-label={
                                        isFullscreen ? copy[lang].exitFullscreen : copy[lang].fullscreen
                                    }
                                    onClick={() => setIsFullscreen((v) => !v)}
                                    className="h-10 w-10 rounded-full border border-border bg-background/95 backdrop-blur shadow-sm hover:bg-accent lg:hidden flex items-center justify-center"
                                >
                                    {isFullscreen ? (
                                        <Minimize2 className="h-4 w-4" />
                                    ) : (
                                        <Maximize2 className="h-4 w-4" />
                                    )}
                                </button>

                                {isFullscreen && (
                                    <div className="w-10 rounded-full border border-border bg-background/95 backdrop-blur shadow-sm overflow-hidden">
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
                                )}

                                {isFullscreen && (
                                    <button
                                        type="button"
                                        onClick={() => setExploreOpen(true)}
                                        aria-label={copy[lang].explore}
                                        className="h-10 w-10 rounded-full border border-amber-300/60 bg-gradient-to-br from-amber-200 via-amber-100 to-white text-amber-700 shadow-sm hover:bg-amber-100 flex items-center justify-center transition"
                                    >
                                        <Sparkles className="h-4 w-4" />
                                    </button>
                                )}

                                {weatherAqiBadge && (
                                    <div className="w-[56px] rounded-lg border border-border bg-background/95 px-1.5 py-1 text-foreground shadow-sm backdrop-blur lg:hidden">
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
                                            <span className="text-[10px] font-semibold leading-none">
                                                {weatherAqiBadge.aqi ?? "—"}
                                            </span>
                                            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {isFullscreen && (
                                <div className="absolute inset-x-0 bottom-8 z-30 flex items-center justify-center gap-3">
                                    {/* <button
                                        type="button"
                                        onClick={() => setFiltersOpen(true)}
                                        aria-label={copy[lang].filters}
                                        className="inline-flex items-center gap-2 rounded-full border border-border bg-background/95 px-5 py-2.5 text-sm font-medium shadow-lg backdrop-blur hover:bg-accent active:scale-[0.98]"
                                    >
                                        <SlidersHorizontal className="h-4 w-4" />
                                        {copy[lang].filters}
                                    </button> */}
                                    <button
                                        type="button"
                                        onClick={() => setIsFullscreen(false)}
                                        aria-label={copy[lang].exitFullscreen}
                                        className="inline-flex items-center justify-center rounded-full border border-border bg-background/95 px-5 py-2.5 text-sm font-medium shadow-lg backdrop-blur hover:bg-accent active:scale-[0.98]"
                                    >
                                        {copy[lang].exitFullscreen}
                                    </button>
                                </div>
                            )}

                        </div>

                </div>

                {flightOverlayOpen && activeFlight && (
                    <div className="fixed inset-0 z-[30] bg-background/80">
                        <div
                            ref={flightMapContainerRef}
                            className="absolute left-0 right-0 top-0 bottom-28"
                        />
                        <button
                            type="button"
                            onClick={() => setFlightOverlayOpen(false)}
                            className="absolute top-4 right-4 z-10 inline-flex items-center justify-center rounded-full border border-border bg-background/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide"
                        >
                            {copy[lang].close}
                        </button>
                        <div className="absolute bottom-6 left-1/2 z-10 w-[92%] max-w-md -translate-x-1/2 rounded-2xl border border-border bg-background/95 p-4 shadow-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-foreground">
                                        {activeFlight.from} → {activeFlight.to}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {activeFlight.dateLabel}
                                    </div>
                                </div>
                                <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                                    {lang === "pt" ? "Confirmado" : "On-time"}
                                </div>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                        {lang === "pt" ? "Partida" : "Departed"}
                                    </div>
                                    <div className="text-2xl font-semibold">
                                        {activeFlight.departure || "—"}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                        {lang === "pt" ? "Chega" : "Arrives"}
                                    </div>
                                    <div className="text-2xl font-semibold">
                                        {activeFlight.arrival || "—"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                        </div>
                    </div>
                </div>

                <PlacesDrawer
                    open={placesOpen}
                    onOpenChange={setPlacesOpen}
                    onSelect={(place) => {
                        console.log("Selected place:", place);
                        // next step: map.flyTo(...)
                    }}
                />


        </>
    );
}
