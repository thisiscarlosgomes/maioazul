"use client";

import { useEffect, useMemo, useState } from "react";

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
        <div className="inline-flex rounded-full border border-border bg-background/95 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setLang("pt")}
            aria-pressed={lang === "pt"}
            className={`px-3 py-1.5 text-xs font-medium transition ${
              lang === "pt"
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
            className={`px-3 py-1.5 text-xs font-medium transition ${
              lang === "en"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            EN
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {places.map((place) => (
          <a
            key={place.id}
            href={`/places/${place.id}`}
            className="rounded-2xl border bg-background p-3 shadow-sm hover:shadow-md transition"
          >
            <div className="relative overflow-hidden rounded-2xl">
              <img
                src={place.image_url || "/image.png"}
                alt={pick(place.name)}
                className="h-40 w-full object-cover"
              />
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
