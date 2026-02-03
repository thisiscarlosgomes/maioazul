"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/favorites";

type Place = {
  id: string;
  name: { pt: string; en: string };
  description: { pt: string; en: string };
  image_url?: string;
  location?: { pt?: string; en?: string };
};

export default function PlacesIndexPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [lang, setLang] = useState<"pt" | "en">("en");
  const { isFavorite, toggle } = useFavorites();

  const copy = useMemo(
    () => ({
      pt: {
        title: "Todos os lugares",
        subtitle: "Explore praias, povoações e áreas protegidas.",
        view: "Ver lugar →",
      },
      en: {
        title: "All places",
        subtitle: "Explore beaches, settlements, and protected areas.",
        view: "View place →",
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
    fetch("/data/maio_places_with_coords.json")
      .then((r) => r.json())
      .then(setPlaces)
      .catch(() => {});
  }, []);

  const pick = (value?: { pt?: string; en?: string }) =>
    value?.[lang] || value?.en || value?.pt || "";

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

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {places.map((place) => (
          <a
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
                  className={`h-4 w-4 ${isFavorite(place.id) ? "fill-current" : ""}`}
                />
              </button>
            </div>
            <div className="mt-3 text-base font-semibold">
              {pick(place.name)}
            </div>
            <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {pick(place.description)}
            </div>
            <div className="mt-3 text-xs font-medium text-foreground hover:underline">
              {copy[lang].view}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
