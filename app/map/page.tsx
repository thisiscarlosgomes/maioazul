"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    ChevronRight,
    Maximize2,
    Minimize2,
    SlidersHorizontal,
    Plus,
    Minus,
    RotateCcw,
    Sun,
    Cloud,
    X,
    LocateFixed,
} from "lucide-react";
import maplibregl from "maplibre-gl";
import { ThemeToggle } from "@/components/theme-toggle";
import { Drawer } from "vaul";

import { PlacesDrawer } from "@/components/PlacesDrawer";

import { weatherEmoji, temperatureEmoji, airQualityFromPM25 } from "@/components/weather";




/* =========================
   MAP PAGE
========================= */
export default function MapPage() {
    const defaultCenter: [number, number] = [-23.2, 15.25];
    const defaultZoom = 10.8;
    const maioBounds: maplibregl.LngLatBoundsLike = [
        [-23.28253814, 15.02291128],
        [-23.04484796, 15.44198952],
    ];

    const mapRef = useRef<maplibregl.Map | null>(null);
    const markerRef = useRef<maplibregl.Marker | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [layers, setLayers] = useState({
        protectedAreas: true,
        beaches: true,
        settlements: true,
        trilhas: true, // 👈 NEW
        wind: true,
        airQuality: true,
    });
    const [lang, setLang] = useState<"pt" | "en">("en");

    const [marine, setMarine] = useState<any>(null);
    const [wind, setWind] = useState<any>(null);
    const [air, setAir] = useState<any>(null);
    const [weather, setWeather] = useState<any>(null);

    const [placesOpen, setPlacesOpen] = useState(false);
    const [selectedSettlement, setSelectedSettlement] = useState<any | null>(null);
    const [selectedProtectedArea, setSelectedProtectedArea] = useState<any | null>(null);

    const [selectedBeach, setSelectedBeach] = useState<any | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchItems, setSearchItems] = useState<
        {
            name: string;
            type: "beach" | "settlement" | "protected";
            coordinates: [number, number];
            category?: string;
            description?: any;
        }[]
    >([]);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [baseMap, setBaseMap] = useState<"normal" | "satellite">("normal");
    const [weatherOpen, setWeatherOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [storyPlaces, setStoryPlaces] = useState<any[]>([]);
    const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
    const chapterRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const chapterListRef = useRef<HTMLDivElement | null>(null);

    const [userLocation, setUserLocation] = useState<{
        lat: number;
        lng: number;
    } | null>(null);

    const copy = useMemo(
        () => ({
            pt: {
                title: "Maio Guia",
                explore: "Explore o Maio",
                prev: "Anterior",
                next: "Próximo",
                viewPlace: "Ver lugar →",
                searchPlaceholder: "Pesquisar praias ou povoações...",
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
                exitFullscreen: "Sair da tela cheia",
                zoomIn: "Aumentar zoom",
                zoomOut: "Reduzir zoom",
                resetView: "Repor vista",
                weather: "Clima",
                waves: "Ondas",
                sea: "Mar",
                airQuality: "Qualidade do ar",
                climate: "Clima",
                beach: "Praia",
                protectedArea: "Área protegida",
                clearSearch: "Limpar pesquisa",
            },
            en: {
                title: "Maio Guia",
                explore: "Explore Maio",
                prev: "Previous",
                next: "Next",
                viewPlace: "View place →",
                searchPlaceholder: "Search beaches or settlements...",
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
                exitFullscreen: "Exit fullscreen",
                zoomIn: "Zoom in",
                zoomOut: "Zoom out",
                resetView: "Reset view",
                weather: "Weather",
                waves: "Waves",
                sea: "Sea",
                airQuality: "Air",
                climate: "Weather",
                beach: "Beach",
                protectedArea: "Protected area",
                clearSearch: "Clear search",
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
        window.localStorage.setItem("maio-lang", lang);
    }, [lang]);

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

    const requestUserLocation = () => {
        if (!("geolocation" in navigator)) return;

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                });
                mapRef.current?.flyTo({
                    center: [pos.coords.longitude, pos.coords.latitude],
                    zoom: 13.5,
                    essential: true,
                });
            },
            (err) => {
                console.warn("Geolocation denied or unavailable", err);
            },
            {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 60_000,
            }
        );
    };



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





    useEffect(() => {
        fetch("/api/maio/marine")
            .then((r) => r.json())
            .then(setMarine)
            .catch(() => { });

        fetch("/api/maio/wind")
            .then((r) => r.json())
            .then(setWind)
            .catch(() => { });

        fetch("/api/maio/air")
            .then((r) => r.json())
            .then(setAir)
            .catch(() => { });


        fetch("/api/maio/weather")
            .then((r) => r.json())
            .then(setWeather)
            .catch(() => { });

    }, []);

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

                const items: {
                    name: string;
                    type: "beach" | "settlement" | "protected";
                    coordinates: [number, number];
                    category?: string;
                    description?: any;
                }[] = [];
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
        fetch("/data/maio_places_with_coords.json")
            .then((r) => r.json())
            .then(setStoryPlaces)
            .catch(() => { });
    }, []);

    function weatherIcon(code: number) {
        if (code === 0) return "☀️";
        if (code <= 2) return "🌤️";
        if (code <= 48) return "☁️";
        if (code <= 67) return "🌧️";
        if (code <= 77) return "🌫️";
        return "🌦️";
    }



    function InfoPill({
        label,
        value,
        icon,
    }: {
        label: string;
        value: string;
        icon?: string;
    }) {
        return (
            <div className="inline-flex h-8 sm:h-9 items-center gap-1.5 px-2 sm:px-3 rounded-full border bg-background/90 backdrop-blur text-[11px] sm:text-xs shadow-sm whitespace-nowrap max-w-[48%] sm:max-w-none">

                {icon && <span>{icon}</span>}
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
            </div>
        );
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

                setSelectedBeach({
                    name,
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

                setSelectedSettlement({
                    id: f.properties?.id,
                    name: f.properties?.name,
                    description,
                    image: f.properties?.image,
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

                setSelectedProtectedArea({
                    name:
                        f.properties?.name ||
                        f.properties?.afia_name ||
                        "Área Protegida",
                    category: f.properties?.designation || "Área protegida",
                    description,
                    coordinates: [e.lngLat.lng, e.lngLat.lat],
                });

                map.flyTo({
                    center: [e.lngLat.lng, e.lngLat.lat],
                    zoom: 11,
                    essential: true,
                });
            });

            map.on("click", (e) => {
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

        if (!markerRef.current) {
            markerRef.current = new maplibregl.Marker({ color: "#2563eb" })
                .setLngLat(place.coordinates)
                .addTo(mapRef.current);
        } else {
            markerRef.current.setLngLat(place.coordinates);
        }
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

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !userLocation) return;

        const feature = pointFeature(userLocation.lng, userLocation.lat);

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
    }, [userLocation]);
    useEffect(() => {
        console.log("User location (React state):", userLocation);
    }, [userLocation]);

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredResults = normalizedQuery
        ? searchItems
            .filter((item) => item.name.toLowerCase().includes(normalizedQuery))
            .slice(0, 6)
        : [];

    const buildChapters = (places: any[], language: "pt" | "en") => {
        const short = (text?: string, max = 180) => {
            if (!text) return "";
            const cleaned = text.replace(/\s+/g, " ").trim();
            return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned;
        };

        const chapterDefs = [
            {
                id: "cidade-porto-ingles",
                kicker: { en: "Heritage", pt: "Herança" },
                title: { en: "Vila de Porto Inglês", pt: "Cidade do Porto Inglês" },
                description: {
                    en: "Start in the island’s historic heart, where coastal life and colonial memory meet the slow scale of Maio.",
                    pt: "Comece pelo coração histórico da ilha, onde a vida costeira e a memória colonial se encontram com a escala tranquila do Maio.",
                },
            },
            {
                id: "santana-beach",
                kicker: { en: "North Coast", pt: "Costa Norte" },
                title: { en: "Santana Beach", pt: "Praia de Santana" },
                description: {
                    en: "A long wild bay with strong surf and open dunes — one of the island’s most striking shores.",
                    pt: "Uma longa baía selvagem com ondas fortes e dunas abertas ao vento — um dos pontos mais marcantes do litoral norte.",
                },
            },
            {
                id: "praia-ponta-preta",
                kicker: { en: "Atlantic", pt: "Atlântico" },
                title: { en: "Ponta Preta Beach", pt: "Praia de Ponta Preta" },
                description: {
                    en: "Wide and windy, with open ocean and clear skies. A perfect place to feel the island’s scale.",
                    pt: "Uma faixa larga e ventosa, com mar aberto e céu limpo. Ideal para sentir a escala da ilha.",
                },
            },
            {
                id: "lagoa-cimidor",
                kicker: { en: "Wildlife", pt: "Vida Selvagem" },
                title: { en: "Cimidor Lagoon", pt: "Lagoa Cimidor" },
                description: {
                    en: "A seasonal lagoon with shorebirds and dunes that separate it from the sea — a quiet refuge for biodiversity.",
                    pt: "Uma lagoa temporária com aves limícolas e dunas que isolam o mar. Um refúgio para biodiversidade.",
                },
            },
            {
                id: "dunas-do-morrinho",
                kicker: { en: "Sand", pt: "Areia" },
                title: { en: "Morrinho Dunes", pt: "Dunas do Morrinho" },
                description: {
                    en: "Shifting dunes and a dry landscape shaped by wind and light — one of Maio’s most photogenic scenes.",
                    pt: "Dunas móveis e paisagem árida, moldadas pelo vento e pela luz. Um dos cenários mais fotogénicos do Maio.",
                },
            },
            {
                id: "parque-natural-norte-maio",
                kicker: { en: "Protection", pt: "Proteção" },
                title: { en: "Northern Natural Park", pt: "Parque Natural do Norte" },
                description: {
                    en: "A protected area of sensitive habitats and preserved shoreline, vital for turtles and seabirds.",
                    pt: "Área protegida que guarda habitats sensíveis e linhas de costa preservadas, essenciais para tartarugas e aves.",
                },
            },
            {
                id: "praias-boca-lagoa-seada",
                kicker: { en: "Ribeiras", pt: "Ribeiras" },
                title: { en: "Boca Lagoa & Seada", pt: "Boca Lagoa e Seada" },
                description: {
                    en: "Beaches shaped by seasonal streams, where fresh water meets the Atlantic and the landscape shifts with the rains.",
                    pt: "Praias em diálogo com as ribeiras, onde a água doce encontra o mar e a paisagem muda com as estações.",
                },
            },
            {
                id: "galeao-beach-dunes",
                kicker: { en: "Dunes", pt: "Dunas" },
                title: { en: "Galeão Dunes", pt: "Dunas de Galeão" },
                description: {
                    en: "A quiet sweep of pale sand and wind-formed ridges that open to the sea.",
                    pt: "Uma faixa tranquila de areia clara e dunas moldadas pelo vento, abertas para o mar.",
                },
            },
            {
                id: "praias-guarda-santa-clara",
                kicker: { en: "South Coast", pt: "Costa Sul" },
                title: { en: "Guarda & Santa Clara", pt: "Guarda e Santa Clara" },
                description: {
                    en: "Long beaches with soft light and space to walk, framed by low vegetation and open horizon.",
                    pt: "Praias longas com luz suave e espaço para caminhar, molduradas por vegetação baixa e horizonte aberto.",
                },
            },
            {
                id: "porto-cais-beach-port",
                kicker: { en: "Harbor", pt: "Porto" },
                title: { en: "Porto Cais", pt: "Porto Cais" },
                description: {
                    en: "A working shoreline where fishing boats and daily life give the coast its rhythm.",
                    pt: "Uma costa em atividade, onde os barcos de pesca e o quotidiano dão ritmo ao mar.",
                },
            },
            {
                id: "praia-real",
                kicker: { en: "West Coast", pt: "Costa Oeste" },
                title: { en: "Praia Real", pt: "Praia Real" },
                description: {
                    en: "A broad, calm stretch with gentle waves and a wide sky — ideal for slow afternoons.",
                    pt: "Uma extensão ampla e calma, com ondas suaves e céu aberto — ideal para tardes lentas.",
                },
            },
        ];

        return chapterDefs
            .map((chapter) => {
                const place = places.find((p) => p.id === chapter.id);
                if (!place?.coordinates) return null;
                return {
                    ...chapter,
                    image: place.image_url || "/image.png",
                    kicker: chapter.kicker[language],
                    title: chapter.title[language],
                    description:
                        chapter.description[language] ||
                        short(place.description?.[language]),
                };
            })
            .filter(Boolean) as {
                id: string;
                kicker: string;
                title: string;
                description: string;
                image: string;
            }[];
    };

    const chapters = useMemo(
        () => buildChapters(storyPlaces, lang),
        [storyPlaces, lang]
    );

    useEffect(() => {
        if (!activeChapterId && chapters.length) {
            setActiveChapterId(chapters[0].id);
        }
    }, [activeChapterId, chapters]);

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
        <div className="bg-background relative">
            <div
                className="hidden absolute inset-0 z-0 bg-center bg-no-repeat opacity-[0.04]"
                style={{
                    backgroundImage: "url('/maioazul.png')",
                    backgroundSize: "300px",
                }}
            />

            {!isFullscreen && (
            <div className="fixed inset-x-0 top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
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

            <div className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-6 flex flex-col gap-4">


                <div className="flex flex-col gap-4 overflow-hidden">
                    <div className="order-2 space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-2">
                                <div className="text-base font-semibold text-foreground">
                                    {copy[lang].explore}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href="/places"
                                    aria-label={lang === "pt" ? "Todos os lugares" : "All places"}
                                    className="h-10 w-10 rounded-full border border-border bg-background/95 backdrop-blur shadow-sm hover:bg-accent flex items-center justify-center active:scale-[0.95]"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </a>
                            </div>
                        </div>

                        <div className="relative">
                            <div
                                ref={chapterListRef}
                                className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide scroll-smooth overscroll-x-contain touch-pan-x"
                            >
                                {chapters.map((chapter, index) => (
                                    <div
                                        key={chapter.id}
                                        className="relative snap-start min-w-[72%] sm:min-w-[48%] lg:min-w-[22%]"
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
                                            className={`w-full text-left rounded-2xl border p-3 transition bg-background shadow-sm hover:shadow-md soft-rise active:scale-[0.99] active:translate-y-[1px] ${activeChapterId === chapter.id
                                                    ? "border-foreground"
                                                    : "border-border"
                                                }`}
                                        >
                                            <div className="relative overflow-hidden rounded-2xl">
                                                <img
                                                    src={chapter.image}
                                                    alt={chapter.title}
                                                    className="h-40 w-full object-cover"
                                                    loading="lazy"
                                                    decoding="async"
                                                />
                                                <span className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-[11px] font-medium shadow-sm">
                                                    {chapter.kicker}
                                                </span>
                                            </div>
                                            <div className="mt-3 text-base font-semibold">
                                                {chapter.title}
                                            </div>
                                            <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                                {chapter.description}
                                            </div>
                                            <div className="mt-4" />
                                        </button>
                                        <a
                                            href={`/places/${chapter.id}`}
                                            className="absolute bottom-4 left-4 inline-flex text-xs font-medium text-foreground hover:underline"
                                        >
                                            {copy[lang].viewPlace}
                                        </a>
                                    </div>
                                ))}
                            </div>
                            <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-background via-background/80 to-transparent" />
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

                            <div className="absolute top-3 left-3 right-3 pr-12 z-30 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFiltersOpen((o) => !o)}
                                    aria-label={copy[lang].filters}
                                    className="h-10 w-10 rounded-lg border border-border bg-background/95 backdrop-blur shadow-sm hover:bg-accent flex items-center justify-center"
                                >
                                    <SlidersHorizontal className="h-4 w-4" />
                                </button>

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


                            <Drawer.Root open={filtersOpen} onOpenChange={setFiltersOpen}>
                                <Drawer.Portal>
                                    <Drawer.Overlay className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm" />
                                    <Drawer.Content
                                        className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-border bg-background p-4 shadow-xl"
                                        style={
                                            {
                                                "--initial-transform": "calc(100% + 12px)",
                                            } as React.CSSProperties
                                        }
                                    >
                                        <Drawer.Title className="sr-only">
                                            {lang === "pt" ? "Filtros do mapa" : "Map filters"}
                                        </Drawer.Title>
                                        <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/30" />
                                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                            <button
                                                onClick={() =>
                                                    setLayers((l) => ({
                                                        ...l,
                                                        protectedAreas: !l.protectedAreas,
                                                    }))
                                                }
                                                className={`px-2 py-2 rounded-lg border ${layers.protectedAreas ? "border-green-400" : "opacity-50"
                                                    }`}
                                            >
                                                {copy[lang].protectedAreas}
                                            </button>

                                            <button
                                                onClick={() =>
                                                    setLayers((l) => ({ ...l, beaches: !l.beaches }))
                                                }
                                                className={`px-2 py-2 rounded-lg border ${layers.beaches ? " border-yellow-400" : "opacity-50"
                                                    }`}
                                            >
                                                {copy[lang].beaches}
                                            </button>

                                            <button
                                                onClick={() =>
                                                    setLayers((l) => ({ ...l, settlements: !l.settlements }))
                                                }
                                                className={`px-2 py-2 rounded-lg border ${layers.settlements ? "border-purple-400" : "opacity-50"
                                                    }`}
                                            >
                                                {copy[lang].settlements}
                                            </button>

                                            <button
                                                onClick={() =>
                                                    setLayers((l) => ({ ...l, trilhas: !l.trilhas }))
                                                }
                                                className={`px-2 py-2 rounded-lg border ${layers.trilhas ? "border-orange-500" : "opacity-50"
                                                    }`}
                                            >
                                                {copy[lang].trails}
                                            </button>
                                        </div>

                                        <div className="mt-4 text-xs text-muted-foreground">
                                            {lang === "pt" ? "Mapa base" : "Basemap"}
                                        </div>
                                        <div className="mt-2 grid w-full grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setBaseMap("normal");
                                                    setFiltersOpen(false);
                                                }}
                                                className={`w-full px-3 py-2 rounded-lg border text-xs font-medium transition ${baseMap === "normal"
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
                                                className={`w-full px-3 py-2 rounded-lg border text-xs font-medium transition ${baseMap === "satellite"
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

                            <div className="absolute top-3 right-3 z-30 flex flex-col gap-2">
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
                                {/* <button
                                    type="button"
                                    aria-label={copy[lang].resetView}
                                    onClick={() =>
                                        mapRef.current?.flyTo({
                                            center: defaultCenter,
                                            zoom: defaultZoom,
                                            bearing: 0,
                                            pitch: 0,
                                            essential: true,
                                        })
                                    }
                                    className="h-10 w-10 rounded-lg border border-border bg-background/95 backdrop-blur shadow-sm hover:bg-accent flex items-center justify-center"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                </button> */}
                                <button
                                    type="button"
                                    aria-label={copy[lang].weather}
                                    onClick={() => setWeatherOpen((o) => !o)}
                                    className="h-10 w-10 rounded-lg border border-border bg-background/95 backdrop-blur shadow-sm hover:bg-accent flex items-center justify-center"
                                >
                                    {weatherOpen ? (
                                        <Sun className="h-4 w-4" />
                                    ) : (
                                        <Cloud className="h-4 w-4" />
                                    )}
                                </button>
                                {/* <button
                                    type="button"
                                    aria-label={lang === "pt" ? "A minha localização" : "My location"}
                                    onClick={requestUserLocation}
                                    className="h-10 w-10 rounded-lg border border-border bg-background/95 backdrop-blur shadow-sm hover:bg-accent flex items-center justify-center"
                                >
                                    <LocateFixed className="h-4 w-4" />
                                </button> */}
                            </div>

                            {/* NEW: Settlement info panel */}
                            {selectedSettlement && (
                                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md rounded-xl border bg-background/95 backdrop-blur shadow-lg p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="font-semibold text-sm">
                                                {selectedSettlement.name}
                                            </h3>
                                            {(selectedSettlement.description?.pt ||
                                                selectedSettlement.description?.en) && (
                                                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                                        {selectedSettlement.description?.[lang] ||
                                                            selectedSettlement.description?.pt ||
                                                            selectedSettlement.description?.en}
                                                    </p>
                                                )}




                                        </div>
                                        <button
                                            onClick={() => setSelectedSettlement(null)}
                                            className="text-xs text-muted-foreground hover:text-foreground flex items-center justify-center"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Info pills */}
                            {weatherOpen && (
                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-row flex-wrap items-center gap-2 w-full max-w-[92%] justify-center">

                                    {marine?.sea && (
                                        <>
                                            <InfoPill icon="🌊" label={copy[lang].waves} value={`${marine.sea.wave_height} m`} />
                                            <InfoPill icon="🌡️" label={copy[lang].sea} value={`${marine.sea.temperature} °C`} />
                                        </>
                                    )}
                                    {air && layers.airQuality && (
                                        (() => {
                                            const aq = airQualityFromPM25(air.pm2_5);
                                            return (
                                                <InfoPill
                                                    icon={aq.emoji}
                                                    label={copy[lang].airQuality}
                                                    value={aq.label}
                                                />
                                            );
                                        })()
                                    )}

                                    {weather && wind?.wind && layers.wind && (
                                        <InfoPill
                                            icon={weatherEmoji(weather.weather_code)}
                                            label=""
                                            value={`${weather.temperature.toFixed(1)}°C · 💨 ${wind.wind.speed.toFixed(0)} km/h`}
                                        />
                                    )}



                                </div>
                            )}

                            {/* Protected Area Info Panel */}
                            {selectedProtectedArea && (
                                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md rounded-xl border bg-background/95 backdrop-blur shadow-lg p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="font-semibold text-sm">
                                                {selectedProtectedArea.name}
                                            </h3>
                                            <div className="text-xs text-muted-foreground">
                                                {selectedProtectedArea.description?.[lang] ||
                                                    selectedProtectedArea.description?.pt ||
                                                    selectedProtectedArea.description?.en}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setSelectedProtectedArea(null)}
                                            className="text-xs text-muted-foreground hover:text-foreground flex items-center justify-center"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Beach Info Panel */}
                            {selectedBeach && (
                                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md rounded-xl border bg-background/95 backdrop-blur shadow-lg p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="font-semibold text-sm">
                                                {selectedBeach.name}
                                            </h3>
                                            <div className="text-xs text-muted-foreground">
                                                {copy[lang].beach}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setSelectedBeach(null)}
                                            className="text-xs text-muted-foreground hover:text-foreground flex items-center justify-center"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
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


            </div>
        </div>
    );
}
