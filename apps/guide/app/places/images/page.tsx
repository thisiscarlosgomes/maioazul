"use client";

import { useEffect, useMemo, useState } from "react";

type Place = {
  id: string;
  name?: { pt?: string; en?: string } | string;
  image_url?: string | null;
  category?: string;
  coordinates?: [number, number] | null;
};

type MapImageItem = {
  key: string;
  name: string;
  layer: "beach" | "settlement" | "protected";
  image_url?: string | null;
  coordinates?: [number, number] | null;
};

type ExperienceImageItem = {
  id: string;
  title: string;
  image: string;
};

const DEFAULT_IMAGE_URL =
  "https://res.cloudinary.com/dhxfkhewr/image/upload/v1770479984/maio_mmwz9u.png";

const normalizeLabel = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getPointCoordinates = (geometry: any): [number, number] | null => {
  if (!geometry) return null;
  if (geometry.type === "Point" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates as [number, number];
  }
  if (
    geometry.type === "GeometryCollection" &&
    Array.isArray(geometry.geometries)
  ) {
    const point = geometry.geometries.find((g: any) => g?.type === "Point");
    if (point?.coordinates) return point.coordinates as [number, number];
  }
  return null;
};

const getGeometryCenter = (geometry: any): [number, number] | null => {
  const point = getPointCoordinates(geometry);
  if (point) return point;
  if (!geometry) return null;

  const coords: [number, number][] = [];
  const collect = (g: any) => {
    if (!g) return;
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
        g.geometries?.forEach(collect);
        break;
      default:
        break;
    }
  };

  collect(geometry);
  if (!coords.length) return null;

  const [sumLng, sumLat] = coords.reduce(
    (acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat],
    [0, 0]
  );
  return [sumLng / coords.length, sumLat / coords.length];
};

const getEmbedMapUrl = (coordinates?: [number, number] | null) => {
  if (!coordinates) return "";
  const [lng, lat] = coordinates;
  const delta = 0.02;
  const left = lng - delta;
  const right = lng + delta;
  const top = lat + delta;
  const bottom = lat - delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`;
};

export default function PlaceImagesPage() {
  const [activeTab, setActiveTab] = useState<
    "places" | "map-pins" | "beaches" | "experiences"
  >("places");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedMapUrl, setExpandedMapUrl] = useState<string | null>(null);
  const [expandedMapTitle, setExpandedMapTitle] = useState<string>("");

  const [places, setPlaces] = useState<Place[]>([]);
  const [placeDrafts, setPlaceDrafts] = useState<Record<string, string>>({});
  const [placeTitleDrafts, setPlaceTitleDrafts] = useState<Record<string, string>>({});
  const [placeSaving, setPlaceSaving] = useState<Record<string, boolean>>({});
  const [placeFeedback, setPlaceFeedback] = useState<Record<string, string>>({});

  const [mapItems, setMapItems] = useState<MapImageItem[]>([]);
  const [mapDrafts, setMapDrafts] = useState<Record<string, string>>({});
  const [mapTitleDrafts, setMapTitleDrafts] = useState<Record<string, string>>({});
  const [mapSaving, setMapSaving] = useState<Record<string, boolean>>({});
  const [mapFeedback, setMapFeedback] = useState<Record<string, string>>({});

  const [experienceItems, setExperienceItems] = useState<ExperienceImageItem[]>([]);
  const [experienceDrafts, setExperienceDrafts] = useState<Record<string, string>>({});
  const [experienceTitleDrafts, setExperienceTitleDrafts] = useState<Record<string, string>>({});
  const [experienceSaving, setExperienceSaving] = useState<Record<string, boolean>>({});
  const [experienceFeedback, setExperienceFeedback] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const [
          placesRes,
          overridesRes,
          beachesRes,
          settlementsRes,
          protectedRes,
          experiencesRes,
        ] = await Promise.all([
          fetch("/api/places"),
          fetch("/api/map-pin-images"),
          fetch("/data/beaches_osm.geojson"),
          fetch("/data/settlements.geojson"),
          fetch("/data/protected_areas.geojson"),
          fetch("/api/experience-images"),
        ]);

        const placesData = await placesRes.json();
        if (Array.isArray(placesData)) setPlaces(placesData);

        const overridesRaw = await overridesRes.json().catch(() => ({}));
        const overridesData =
          overridesRaw && typeof overridesRaw === "object" && !Array.isArray(overridesRaw)
            ? (overridesRaw as Record<string, string | { image_url?: string; title?: string }>)
            : {};
        const mapImageDrafts: Record<string, string> = {};
        const mapTitleDraftValues: Record<string, string> = {};
        for (const [key, value] of Object.entries(overridesData)) {
          if (typeof value === "string") {
            mapImageDrafts[key] = value;
          } else {
            if (value?.image_url) mapImageDrafts[key] = value.image_url;
            if (value?.title) mapTitleDraftValues[key] = value.title;
          }
        }
        setMapDrafts(mapImageDrafts);
        setMapTitleDrafts(mapTitleDraftValues);

        const beaches = await beachesRes.json();
        const settlements = await settlementsRes.json();
        const protectedAreas = await protectedRes.json();
        const experiences = await experiencesRes.json().catch(() => []);

        const items = new Map<string, MapImageItem>();
        const register = (
          name: string | undefined,
          layer: MapImageItem["layer"],
          featureImage?: string,
          coordinates?: [number, number] | null
        ) => {
          if (!name) return;
          const key = normalizeLabel(name);
          if (!key || items.has(key)) return;
          items.set(key, {
            key,
            name,
            layer,
            image_url: featureImage || null,
            coordinates: coordinates || null,
          });
        };

        beaches?.features?.forEach((f: any) => {
          const name =
            f?.properties?.name ||
            f?.properties?.afia_name ||
            f?.properties?.["name:pt"] ||
            f?.properties?.["name:en"];
          register(name, "beach", f?.properties?.image, getGeometryCenter(f?.geometry));
        });

        settlements?.features?.forEach((f: any) => {
          register(
            f?.properties?.name,
            "settlement",
            f?.properties?.image,
            getGeometryCenter(f?.geometry)
          );
        });

        protectedAreas?.features?.forEach((f: any) => {
          const name = f?.properties?.name || f?.properties?.afia_name;
          register(
            name,
            "protected",
            f?.properties?.image,
            getGeometryCenter(f?.geometry)
          );
        });

        setMapItems(Array.from(items.values()).sort((a, b) => a.name.localeCompare(b.name)));
        if (Array.isArray(experiences)) setExperienceItems(experiences);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const getPlaceName = (place: Place) => {
    if (typeof place.name === "string") return place.name;
    return place.name?.en || place.name?.pt || place.id;
  };

  const placeFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return places;
    return places.filter((place) => {
      const name = getPlaceName(place).toLowerCase();
      return name.includes(q) || place.id.toLowerCase().includes(q);
    });
  }, [places, query]);

  const mapFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mapItems;
    return mapItems.filter((item) =>
      item.name.toLowerCase().includes(q) ||
      item.key.toLowerCase().includes(q) ||
      item.layer.includes(q)
    );
  }, [mapItems, query]);

  const beachesFiltered = useMemo(
    () => mapFiltered.filter((item) => item.layer === "beach"),
    [mapFiltered]
  );

  const experienceFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return experienceItems;
    return experienceItems.filter((item) =>
      item.title.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
    );
  }, [experienceItems, query]);

  const placeMissing = useMemo(
    () => places.filter((p) => !p.image_url || !String(p.image_url).trim()).length,
    [places]
  );

  const mapOverriddenCount = useMemo(
    () => Object.values(mapDrafts).filter((v) => Boolean(v?.trim())).length,
    [mapDrafts]
  );

  const beachOverriddenCount = useMemo(
    () =>
      beachesFiltered.filter((item) => {
        const draft = mapDrafts[item.key] ?? "";
        const titleDraft = mapTitleDrafts[item.key] ?? "";
        return Boolean(draft.trim() || titleDraft.trim());
      }).length,
    [beachesFiltered, mapDrafts, mapTitleDrafts]
  );

  const experienceDraftCount = useMemo(
    () => experienceItems.filter((item) => item.image && item.image.trim()).length,
    [experienceItems]
  );

  const setPlaceDraft = (id: string, value: string) => {
    setPlaceDrafts((prev) => ({ ...prev, [id]: value }));
    setPlaceFeedback((prev) => ({ ...prev, [id]: "" }));
  };

  const savePlaceImage = async (place: Place) => {
    const nextUrl = (placeDrafts[place.id] ?? place.image_url ?? "").trim();
    const nextTitle = (placeTitleDrafts[place.id] ?? getPlaceName(place)).trim();

    if (!nextUrl && !nextTitle) {
      setPlaceFeedback((prev) => ({
        ...prev,
        [place.id]: "Provide at least title or image URL.",
      }));
      return;
    }

    setPlaceSaving((prev) => ({ ...prev, [place.id]: true }));
    try {
      const res = await fetch(`/api/places/${place.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: nextUrl, name: nextTitle }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to save image.");
      }
      const updated = (await res.json()) as Place;
      setPlaces((prev) =>
        prev.map((p) =>
          p.id === place.id
            ? {
                ...p,
                image_url: updated.image_url,
                name: updated.name ?? nextTitle,
              }
            : p
        )
      );
      setPlaceDrafts((prev) => ({ ...prev, [place.id]: updated.image_url || nextUrl }));
      setPlaceTitleDrafts((prev) => ({ ...prev, [place.id]: getPlaceName(updated) }));
      setPlaceFeedback((prev) => ({ ...prev, [place.id]: "Saved." }));
    } catch (err: any) {
      setPlaceFeedback((prev) => ({
        ...prev,
        [place.id]: err?.message || "Failed to save image.",
      }));
    } finally {
      setPlaceSaving((prev) => ({ ...prev, [place.id]: false }));
    }
  };

  const setMapDraft = (key: string, value: string) => {
    setMapDrafts((prev) => ({ ...prev, [key]: value }));
    setMapFeedback((prev) => ({ ...prev, [key]: "" }));
  };

  const setMapTitleDraft = (key: string, value: string) => {
    setMapTitleDrafts((prev) => ({ ...prev, [key]: value }));
    setMapFeedback((prev) => ({ ...prev, [key]: "" }));
  };

  const saveMapImage = async (item: MapImageItem) => {
    const imageUrl = (mapDrafts[item.key] ?? "").trim();
    const title = (mapTitleDrafts[item.key] ?? "").trim();

    setMapSaving((prev) => ({ ...prev, [item.key]: true }));
    try {
      const res = await fetch("/api/map-pin-images", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: item.key, image_url: imageUrl, title }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to save map pin image.");
      }
      const payload = await res.json();
      setMapDrafts((prev) => ({ ...prev, [item.key]: payload.image_url || "" }));
      setMapTitleDrafts((prev) => ({ ...prev, [item.key]: payload.title || "" }));
      setMapFeedback((prev) => ({ ...prev, [item.key]: "Saved." }));
    } catch (err: any) {
      setMapFeedback((prev) => ({
        ...prev,
        [item.key]: err?.message || "Failed to save map pin image.",
      }));
    } finally {
      setMapSaving((prev) => ({ ...prev, [item.key]: false }));
    }
  };

  const setExperienceDraft = (id: string, value: string) => {
    setExperienceDrafts((prev) => ({ ...prev, [id]: value }));
    setExperienceFeedback((prev) => ({ ...prev, [id]: "" }));
  };

  const setExperienceTitleDraft = (id: string, value: string) => {
    setExperienceTitleDrafts((prev) => ({ ...prev, [id]: value }));
    setExperienceFeedback((prev) => ({ ...prev, [id]: "" }));
  };

  const saveExperienceImage = async (item: ExperienceImageItem) => {
    const image = (experienceDrafts[item.id] ?? item.image ?? "").trim();
    const title = (experienceTitleDrafts[item.id] ?? item.title ?? "").trim();
    if (!image && !title) {
      setExperienceFeedback((prev) => ({
        ...prev,
        [item.id]: "Provide at least title or image URL.",
      }));
      return;
    }

    setExperienceSaving((prev) => ({ ...prev, [item.id]: true }));
    try {
      const res = await fetch("/api/experience-images", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, image, title }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to save experience image.");
      }
      const updated = (await res.json()) as ExperienceImageItem;
      setExperienceItems((prev) =>
        prev.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                image: updated.image || image,
                title: updated.title || title,
              }
            : entry
        )
      );
      setExperienceDrafts((prev) => ({ ...prev, [item.id]: updated.image || image }));
      setExperienceTitleDrafts((prev) => ({
        ...prev,
        [item.id]: updated.title || title,
      }));
      setExperienceFeedback((prev) => ({ ...prev, [item.id]: "Saved." }));
    } catch (err: any) {
      setExperienceFeedback((prev) => ({
        ...prev,
        [item.id]: err?.message || "Failed to save experience image.",
      }));
    } finally {
      setExperienceSaving((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Image Manager</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage images used by places and map pin popups.
        </p>
      </header>

      <section className="mb-6 grid gap-3 rounded-2xl border border-border bg-background p-4 md:grid-cols-5">
        <button
          type="button"
          onClick={() => setActiveTab("places")}
          className={`h-10 rounded-xl text-sm ${
            activeTab === "places"
              ? "bg-foreground text-background"
              : "border border-border text-foreground"
          }`}
        >
          Places
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("map-pins")}
          className={`h-10 rounded-xl text-sm ${
            activeTab === "map-pins"
              ? "bg-foreground text-background"
              : "border border-border text-foreground"
          }`}
        >
          Map pins
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("beaches")}
          className={`h-10 rounded-xl text-sm ${
            activeTab === "beaches"
              ? "bg-foreground text-background"
              : "border border-border text-foreground"
          }`}
        >
          Beaches
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("experiences")}
          className={`h-10 rounded-xl text-sm ${
            activeTab === "experiences"
              ? "bg-foreground text-background"
              : "border border-border text-foreground"
          }`}
        >
          Experiences
        </button>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or id"
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </section>

      {loading ? <p className="text-sm text-muted-foreground">Loading image sources...</p> : null}

      {!loading && activeTab === "places" ? (
        <section>
          <p className="mb-3 text-sm text-muted-foreground">
            Total: {places.length} · Missing: {placeMissing}
          </p>
          <div className="space-y-3">
            {placeFiltered.map((place) => {
              const draft = placeDrafts[place.id] ?? (place.image_url ? String(place.image_url) : "");
              const titleDraft = placeTitleDrafts[place.id] ?? getPlaceName(place);
              const preview = draft.trim() || place.image_url || DEFAULT_IMAGE_URL;
              const mapPreview = getEmbedMapUrl(place.coordinates);
              const msg = placeFeedback[place.id];

              return (
                <article
                  key={place.id}
                  className="rounded-2xl border border-border bg-background p-3 shadow-sm"
                >
                  <div className="grid gap-3 md:grid-cols-[190px_1fr_auto] md:items-start">
                    <div className="grid grid-cols-2 gap-2">
                      <img
                        src={preview}
                        alt={getPlaceName(place)}
                        className="h-20 w-[90px] rounded-lg border border-border object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_IMAGE_URL;
                        }}
                      />
                      {mapPreview ? (
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedMapUrl(mapPreview);
                            setExpandedMapTitle(`${getPlaceName(place)} map`);
                          }}
                          className="relative h-20 w-[90px] overflow-hidden rounded-lg border border-border"
                        >
                          <iframe
                            src={mapPreview}
                            title={`${getPlaceName(place)} map`}
                            className="h-full w-full pointer-events-none"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                        </button>
                      ) : (
                        <div className="flex h-20 w-[90px] items-center justify-center rounded-lg border border-dashed border-border text-[10px] text-muted-foreground">
                          No coords
                        </div>
                      )}
                    </div>

                    <div>
                      <input
                        value={titleDraft}
                        onChange={(e) =>
                          setPlaceTitleDrafts((prev) => ({
                            ...prev,
                            [place.id]: e.target.value,
                          }))
                        }
                        placeholder="Title"
                        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
                      />
                      <p className="truncate text-xs text-muted-foreground">
                        {place.id}
                        {place.category ? ` · ${place.category}` : ""}
                      </p>
                      <input
                        value={draft}
                        onChange={(e) => setPlaceDraft(place.id, e.target.value)}
                        placeholder="https://... or /image.png"
                        className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                      {msg ? (
                        <p className={`mt-1 text-xs ${msg === "Saved." ? "text-green-600" : "text-red-600"}`}>
                          {msg}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex gap-2 md:flex-col">
                      <button
                        type="button"
                        onClick={() => savePlaceImage(place)}
                        disabled={Boolean(placeSaving[place.id])}
                        className="h-10 rounded-xl bg-foreground px-4 text-sm font-medium text-background disabled:opacity-60"
                      >
                        {placeSaving[place.id] ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlaceDraft(place.id, DEFAULT_IMAGE_URL)}
                        className="h-10 rounded-xl border border-border px-4 text-sm"
                      >
                        Use default
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {!loading && (activeTab === "map-pins" || activeTab === "beaches") ? (
        <section>
          <p className="mb-3 text-sm text-muted-foreground">
            {activeTab === "beaches"
              ? `Beaches: ${beachesFiltered.length} · Overrides set: ${beachOverriddenCount}`
              : `Map names: ${mapItems.length} · Overrides set: ${mapOverriddenCount}`}
          </p>
          <div className="space-y-3">
            {(activeTab === "beaches" ? beachesFiltered : mapFiltered).map((item) => {
              const draft = mapDrafts[item.key] ?? "";
              const titleDraft = mapTitleDrafts[item.key] ?? item.name;
              const preview = draft.trim() || item.image_url || DEFAULT_IMAGE_URL;
              const mapPreview = getEmbedMapUrl(item.coordinates);
              const msg = mapFeedback[item.key];

              return (
                <article
                  key={item.key}
                  className="rounded-2xl border border-border bg-background p-3 shadow-sm"
                >
                  <div className="grid gap-3 md:grid-cols-[190px_1fr_auto] md:items-start">
                    <div className="grid grid-cols-2 gap-2">
                      <img
                        src={preview}
                        alt={item.name}
                        className="h-20 w-[90px] rounded-lg border border-border object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_IMAGE_URL;
                        }}
                      />
                      {mapPreview ? (
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedMapUrl(mapPreview);
                            setExpandedMapTitle(`${item.name} map`);
                          }}
                          className="relative h-20 w-[90px] overflow-hidden rounded-lg border border-border"
                        >
                          <iframe
                            src={mapPreview}
                            title={`${item.name} map`}
                            className="h-full w-full pointer-events-none"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                        </button>
                      ) : (
                        <div className="flex h-20 w-[90px] items-center justify-center rounded-lg border border-dashed border-border text-[10px] text-muted-foreground">
                          No coords
                        </div>
                      )}
                    </div>

                    <div>
                      <input
                        value={titleDraft}
                        onChange={(e) => setMapTitleDraft(item.key, e.target.value)}
                        placeholder="Title override"
                        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
                      />
                      <p className="truncate text-xs text-muted-foreground">
                        {item.key} · {item.layer}
                      </p>
                      <input
                        value={draft}
                        onChange={(e) => setMapDraft(item.key, e.target.value)}
                        placeholder="override URL (leave empty to remove)"
                        className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                      {msg ? (
                        <p className={`mt-1 text-xs ${msg === "Saved." ? "text-green-600" : "text-red-600"}`}>
                          {msg}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex gap-2 md:flex-col">
                      <button
                        type="button"
                        onClick={() => saveMapImage(item)}
                        disabled={Boolean(mapSaving[item.key])}
                        className="h-10 rounded-xl bg-foreground px-4 text-sm font-medium text-background disabled:opacity-60"
                      >
                        {mapSaving[item.key] ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMapDraft(item.key, "");
                          setMapTitleDraft(item.key, "");
                        }}
                        className="h-10 rounded-xl border border-border px-4 text-sm"
                      >
                        Clear override
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {!loading && activeTab === "experiences" ? (
        <section>
          <p className="mb-3 text-sm text-muted-foreground">
            Total experience cards: {experienceItems.length} · With images: {experienceDraftCount}
          </p>
          <div className="space-y-3">
            {experienceFiltered.map((item) => {
              const draft = experienceDrafts[item.id] ?? item.image ?? "";
              const titleDraft = experienceTitleDrafts[item.id] ?? item.title;
              const preview = draft.trim() || DEFAULT_IMAGE_URL;
              const msg = experienceFeedback[item.id];

              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-border bg-background p-3 shadow-sm"
                >
                  <div className="grid gap-3 md:grid-cols-[90px_1fr_auto] md:items-start">
                    <img
                      src={preview}
                      alt={item.title}
                      className="h-20 w-[90px] rounded-lg border border-border object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_IMAGE_URL;
                      }}
                    />
                    <div>
                      <input
                        value={titleDraft}
                        onChange={(e) => setExperienceTitleDraft(item.id, e.target.value)}
                        placeholder="Title"
                        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
                      />
                      <p className="truncate text-xs text-muted-foreground">{item.id}</p>
                      <input
                        value={draft}
                        onChange={(e) => setExperienceDraft(item.id, e.target.value)}
                        placeholder="https://... or /image.png"
                        className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                      {msg ? (
                        <p className={`mt-1 text-xs ${msg === "Saved." ? "text-green-600" : "text-red-600"}`}>
                          {msg}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex gap-2 md:flex-col">
                      <button
                        type="button"
                        onClick={() => saveExperienceImage(item)}
                        disabled={Boolean(experienceSaving[item.id])}
                        className="h-10 rounded-xl bg-foreground px-4 text-sm font-medium text-background disabled:opacity-60"
                      >
                        {experienceSaving[item.id] ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExperienceDraft(item.id, DEFAULT_IMAGE_URL)}
                        className="h-10 rounded-xl border border-border px-4 text-sm"
                      >
                        Use default
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {expandedMapUrl ? (
        <div
          className="fixed inset-0 z-[120] bg-black/65 p-4 md:p-8"
          onClick={() => setExpandedMapUrl(null)}
        >
          <div
            className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-background"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="truncate text-sm font-medium">{expandedMapTitle}</h2>
              <button
                type="button"
                onClick={() => setExpandedMapUrl(null)}
                className="rounded-lg border border-border px-3 py-1 text-xs"
              >
                Close
              </button>
            </div>
            <iframe
              src={expandedMapUrl}
              title={expandedMapTitle || "Expanded map"}
              className="h-full w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
