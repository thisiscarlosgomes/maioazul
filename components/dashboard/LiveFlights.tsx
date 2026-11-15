"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ADSB_LICENSE,
  ADSB_SOURCE,
  CABO_VERDE_RADIUS_NM,
  FLIGHT_CACHE_TTL_MS,
  MAIO_LATITUDE,
  MAIO_LONGITUDE,
  type LiveAircraft,
  type LiveFlightsPayload,
} from "@/lib/adsb/flights";

const ARCHIPELAGO_BOUNDS: [[number, number], [number, number]] = [
  [-25.45, 14.75],
  [-22.55, 17.25],
];

const LIST_LIMIT = 8;

function planeLabel(plane: LiveAircraft) {
  return plane.callsign ?? plane.registration ?? plane.hex.toUpperCase();
}

function altitudeLabel(plane: LiveAircraft) {
  if (plane.onGround) return "no solo";
  if (plane.altitudeFeet == null) return null;
  return `${Math.round(plane.altitudeFeet).toLocaleString("pt-PT")} ft`;
}

function listMeta(plane: LiveAircraft) {
  const parts = [
    altitudeLabel(plane),
    plane.distanceNauticalMiles == null
      ? null
      : `${Math.round(plane.distanceNauticalMiles)} nm`,
  ].filter(Boolean);
  return parts.join(" · ");
}

function updatedLabel(payload: LiveFlightsPayload) {
  if (!payload.retrievedAt) return null;
  const time = new Date(payload.retrievedAt).toLocaleTimeString("pt-PT", {
    timeZone: "Atlantic/Cape_Verde",
    hour: "2-digit",
    minute: "2-digit",
  });
  return payload.stale ? `${time} · em cache` : time;
}

function showAircraftPopup(
  map: maplibregl.Map,
  popupHolder: { current: maplibregl.Popup | null },
  plane: LiveAircraft,
) {
  popupHolder.current?.remove();
  popupHolder.current = new maplibregl.Popup({
    closeButton: true,
    maxWidth: "220px",
  })
    .setLngLat([plane.longitude, plane.latitude])
    .setDOMContent(popupNode(plane))
    .addTo(map);
}

function popupNode(plane: LiveAircraft) {
  const root = document.createElement("div");
  root.className = "space-y-0.5 text-xs text-neutral-900";
  const title = document.createElement("p");
  title.className = "font-medium";
  title.textContent = planeLabel(plane);
  root.append(title);

  const details = [
    plane.registration,
    plane.aircraftType,
    altitudeLabel(plane),
    plane.groundSpeedKnots == null
      ? null
      : `${Math.round(plane.groundSpeedKnots)} kt`,
  ].filter((line): line is string => Boolean(line));

  for (const line of details) {
    const row = document.createElement("p");
    row.textContent = line;
    root.append(row);
  }
  return root;
}

export default function LiveFlights() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupHolderRef = useRef<{ current: maplibregl.Popup | null }>({
    current: null,
  });
  const aircraftRef = useRef<LiveAircraft[]>([]);
  const [payload, setPayload] = useState<LiveFlightsPayload | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch("/api/maio/flights");
        const body = (await response.json()) as LiveFlightsPayload;
        if (!cancelled && body && typeof body.status === "string") {
          setPayload(body);
        }
      } catch {
        if (!cancelled) {
          setPayload((current) =>
            current?.status === "available"
              ? current
              : {
                  status: "unavailable",
                  stale: false,
                  source: ADSB_SOURCE,
                  license: ADSB_LICENSE,
                  location: {
                    name: "Ilha do Maio",
                    latitude: MAIO_LATITUDE,
                    longitude: MAIO_LONGITUDE,
                  },
                  region: "Cabo Verde",
                  radiusNauticalMiles: CABO_VERDE_RADIUS_NM,
                  retrievedAt: null,
                  aircraft: [],
                  truncated: false,
                  caveats: [],
                  retryAfterSeconds: null,
                },
          );
        }
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), FLIGHT_CACHE_TTL_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    if (typeof window !== "undefined" && maplibregl.getWorkerUrl() === "") {
      maplibregl.setWorkerUrl("/maplibre-gl-csp-worker.js");
    }

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
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
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
        bounds: ARCHIPELAGO_BOUNDS,
        fitBoundsOptions: { padding: 28 },
      });
    } catch {
      return;
    }

    map.on("load", () => {
      map.addSource("aircraft", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "aircraft-points",
        type: "circle",
        source: "aircraft",
        paint: {
          "circle-radius": 5,
          "circle-color": [
            "case",
            ["==", ["get", "onGround"], true],
            "#64748b",
            "#1E78FF",
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
        },
      });

      const maio = document.createElement("div");
      maio.textContent = "Maio";
      maio.className =
        "rounded-md bg-background/95 px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-none";
      new maplibregl.Marker({ element: maio, anchor: "bottom" })
        .setLngLat([MAIO_LONGITUDE, MAIO_LATITUDE])
        .addTo(map);

      map.on("click", "aircraft-points", (event) => {
        const hex = event.features?.[0]?.properties?.hex;
        if (typeof hex !== "string") return;
        const plane = aircraftRef.current.find((item) => item.hex === hex);
        if (!plane) return;
        showAircraftPopup(map, popupHolderRef.current, plane);
      });
      map.on("mouseenter", "aircraft-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "aircraft-points", () => {
        map.getCanvas().style.cursor = "";
      });

      setMapReady(true);
    });

    mapRef.current = map;
    const popupHolder = popupHolderRef.current;
    return () => {
      popupHolder.current?.remove();
      popupHolder.current = null;
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const source = map.getSource("aircraft");
    if (!source || source.type !== "geojson") return;
    const aircraft = payload?.aircraft ?? [];
    aircraftRef.current = aircraft;
    (source as maplibregl.GeoJSONSource).setData({
      type: "FeatureCollection",
      features: aircraft.map((plane) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [plane.longitude, plane.latitude],
        },
        properties: {
          hex: plane.hex,
          onGround: plane.onGround,
        },
      })),
    });
  }, [payload, mapReady]);

  function focusAircraft(hex: string) {
    const map = mapRef.current;
    const plane = aircraftRef.current.find((item) => item.hex === hex);
    if (!map || !plane) return;
    map.flyTo({
      center: [plane.longitude, plane.latitude],
      zoom: Math.max(map.getZoom(), 7),
    });
    showAircraftPopup(map, popupHolderRef.current, plane);
  }

  const aircraft = payload?.aircraft ?? [];
  const shown = aircraft.slice(0, LIST_LIMIT);
  const hiddenCount = Math.max(0, aircraft.length - shown.length);
  const updated = payload ? updatedLabel(payload) : null;
  const quiet =
    payload?.status === "unconfigured" || payload?.status === "unavailable";

  return (
    <section className="space-y-2" aria-labelledby="live-flights-heading">
      <div>
        <h2 id="live-flights-heading" className="font-semibold">
          Voos agora
        </h2>
        <p className="text-sm text-muted-foreground">
          Aeronaves com transponder num raio de {CABO_VERDE_RADIUS_NM} nm da
          Ilha do Maio, a cobrir Cabo Verde.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,0.7fr)]">
        <div className="relative h-80 overflow-hidden rounded-lg border border-border bg-muted">
          <div ref={containerRef} className="absolute inset-0 h-full w-full" />
        </div>

        <div className="flex min-h-80 flex-col justify-between gap-4">
          <div>
            {!payload ? (
              <div className="space-y-2" aria-hidden>
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-4/5" />
              </div>
            ) : null}

            {quiet ? (
              <p className="text-sm text-muted-foreground">
                Os voos ao vivo não estão disponíveis agora.
              </p>
            ) : null}

            {payload?.status === "available" && aircraft.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma aeronave com transponder visível neste momento.
              </p>
            ) : null}

            {payload?.status === "available" && shown.length > 0 ? (
              <ul className="divide-y divide-border">
                {shown.map((plane) => (
                  <li key={plane.hex}>
                    <button
                      type="button"
                      onClick={() => focusAircraft(plane.hex)}
                      className="flex w-full items-baseline justify-between gap-3 py-2 text-left text-sm transition hover:text-maio-blue"
                    >
                      <span className="font-medium">{planeLabel(plane)}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {listMeta(plane)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {hiddenCount > 0 ? (
              <p className="pt-2 text-xs text-muted-foreground">
                e mais {hiddenCount} no mapa
              </p>
            ) : null}

            {updated ? (
              <p className="pt-2 text-xs text-muted-foreground">
                Atualizado às {updated} (Cabo Verde)
              </p>
            ) : null}
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              Só entram aviões que estão a transmitir. Sem transponder, ou fora
              da cobertura dos recetores, não aparecem. Não é controlo de
              tráfego aéreo nem o horário da companhia.
            </p>
            <p>
              {ADSB_SOURCE} · {ADSB_LICENSE}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
