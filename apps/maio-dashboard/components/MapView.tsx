"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { ThemeToggle } from "@/components/theme-toggle";

export default function MapPage() {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
  if (!containerRef.current || mapRef.current) return;

  if (typeof window !== "undefined" && maplibregl.getWorkerUrl() === "") {
    maplibregl.setWorkerUrl("/maplibre-gl-csp-worker.js");
  }

  const map = new maplibregl.Map({
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
      layers: [
        {
          id: "osm",
          type: "raster",
          source: "osm",
        },
      ],
    },
    center: [-23.0, 15.15],
    zoom: 9,
  });

  map.on("load", () => {
    /* =========================
       SOURCES (AFIA ONLY)
    ========================= */

    map.addSource("protected-areas", {
      type: "geojson",
      data: "/data/protected_areas.geojson",
    });

    map.addSource("zoning-special", {
      type: "geojson",
      data: "/data/zoning_special.geojson",
    });

    /* =========================
       LAYERS
    ========================= */

    // Protected Areas
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

    // Zoning Special
    map.addLayer({
      id: "zoning-special-fill",
      type: "fill",
      source: "zoning-special",
      paint: {
        "fill-color": "#6A1B9A",
        "fill-opacity": 0.15,
      },
    });

    map.addLayer({
      id: "zoning-special-outline",
      type: "line",
      source: "zoning-special",
      paint: {
        "line-color": "#4A148C",
        "line-width": 2,
        "line-dasharray": [4, 2],
      },
    });
  });

  mapRef.current = map;

  return () => {
    map.remove();
    mapRef.current = null;
  };
}, []);


  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Watermark */}
      <div
        className="absolute inset-0 z-0 bg-center bg-no-repeat opacity-[0.04] dark:opacity-[0.035]"
        style={{
          backgroundImage: "url('/maioazul.png')",
          backgroundSize: "300px",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-6 pb-12 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-6 border-b border-border pb-4">
          <div>
            <h1 className="text-xl font-semibold">Maio Guide</h1>
            <p className="text-sm text-muted-foreground">
              Mapa interativo do território do Maio.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Map */}
        <div className="relative h-[70vh] rounded-lg border border-border overflow-hidden bg-muted">
          <div ref={containerRef} className="absolute inset-0 h-full w-full" />
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground">
          Fonte: OpenStreetMap
        </div>
      </div>
    </div>
  );
}
