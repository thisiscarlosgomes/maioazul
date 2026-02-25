"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/favorites";
import { fetchJsonOfflineFirst } from "@/lib/offline";
import { useLang } from "@/lib/lang";

type Place = {
  id: string;
  name: { pt: string; en: string };
  description: { pt: string; en: string };
  image_url?: string;
  location?: { pt?: string; en?: string };
};

export default function PlacesIndexPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [lang] = useLang();
  const [query, setQuery] = useState("");
  const { isFavorite, toggle } = useFavorites();

  const copy = useMemo(
    () => ({
      pt: {
        title: "Todos os lugares",
        subtitle: "Explore praias, povoações e áreas protegidas.",
        voiceTitle: "Guia de voz no mapa",
        voiceDescription:
          "Ative o guia de voz para ouvir curiosidades quando estiver perto das áreas protegidas.",
        voiceCta: "Abrir o mapa",
        view: "Ver lugar →",
        searchPlaceholder: "Pesquisar lugares...",
        noResults: "Sem resultados para a pesquisa.",
      },
      en: {
        title: "All places",
        subtitle: "Explore beaches, settlements, and protected areas.",
        voiceTitle: "Voice guide on the map",
        voiceDescription:
          "Enable the voice guide to hear facts when you’re near protected areas.",
        voiceCta: "Open the map",
        view: "View place →",
        searchPlaceholder: "Search places...",
        noResults: "No results for that search.",
      },
    }),
    []
  );

  useEffect(() => {
    fetchJsonOfflineFirst<Place[]>("/api/places")
      .then(setPlaces)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const pick = (value?: { pt?: string; en?: string }) =>
    value?.[lang] || value?.en || value?.pt || "";

  const filteredPlaces = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return places;
    return places.filter((place) => {
      const haystack = [pick(place.name), pick(place.location)]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [places, query, lang]);

  return (
    <div className="max-w-5xl mx-auto px-4 pt-6 pb-12">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{copy[lang].title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy[lang].subtitle}
          </p>
        </div>
      </div>
      <div className="hidden mt-4 rounded-2xl border border-border bg-background p-4 shadow-sm">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {copy[lang].voiceTitle}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {copy[lang].voiceDescription}
        </p>
        <Link
          href="/map"
          className="mt-3 inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground hover:bg-accent"
        >
          {copy[lang].voiceCta}
        </Link>
      </div>
      <div className="mt-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy[lang].searchPlaceholder}
          className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading &&
          Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="rounded-2xl border bg-background p-3 shadow-sm"
            >
              <div className="h-40 w-full rounded-2xl bg-muted animate-pulse" />
              <div className="mt-3 h-4 w-3/5 rounded-full bg-muted animate-pulse" />
              <div className="mt-2 h-3 w-full rounded-full bg-muted animate-pulse" />
              <div className="mt-2 h-3 w-4/5 rounded-full bg-muted animate-pulse" />
              <div className="mt-3 h-3 w-20 rounded-full bg-muted animate-pulse" />
            </div>
          ))}
        {!loading &&
          filteredPlaces.length > 0 &&
          filteredPlaces.map((place) => (
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
                    isFavorite(place.id)
                      ? lang === "pt"
                        ? "Remover favorito"
                        : "Remove favorite"
                      : lang === "pt"
                        ? "Guardar favorito"
                        : "Save favorite"
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    toggle(place.id);
                  }}
                  className={`absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur transition active:scale-[0.95] ${
                    isFavorite(place.id)
                      ? "border-rose-400 bg-rose-500 text-white"
                      : "border-white/60 bg-black/40 text-white hover:bg-black/55"
                  }`}
                >
                  <Heart
                    className={`h-4 w-4 ${
                      isFavorite(place.id) ? "fill-current" : ""
                    }`}
                  />
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
      {!loading && !loadError && filteredPlaces.length === 0 && (
        <div className="mt-6 text-sm text-muted-foreground">
          {copy[lang].noResults}
        </div>
      )}
      {!loading && loadError && (
        <div className="mt-6 text-sm text-muted-foreground">
          {lang === "pt"
            ? "Não foi possível carregar os lugares."
            : "Unable to load places right now."}
        </div>
      )}
    </div>
  );
}
