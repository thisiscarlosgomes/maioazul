"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bird,
  Compass,
  Fish,
  Footprints,
  Heart,
  Landmark,
  Leaf,
  LifeBuoy,
  MapPin,
  Mountain,
  Recycle,
  ShieldCheck,
  Sun,
  Tag as TagIcon,
  TreePine,
  Waves,
  Wind,
  Droplets,
} from "lucide-react";
import { useFavorites } from "@/lib/favorites";
import { fetchJsonOfflineFirst } from "@/lib/offline";
import { useLang } from "@/lib/lang";
import { setCachedPlaces } from "@/lib/places-cache";

type Place = {
  id: string;
  name: { pt: string; en: string };
  description: { pt: string; en: string };
  image_url?: string;
  location?: { pt?: string; en?: string };
  tags?: string[];
  tags_en?: string[];
  tips?: Array<{ pt: string; en: string }>;
  coordinates?: [number, number] | null;
  category?: string;
};

export default function PlacesIndexPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [lang] = useLang();
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeIntent, setActiveIntent] = useState<string | null>(null);
  const { isFavorite, toggle } = useFavorites();

  const copy = useMemo(
    () => ({
      pt: {
        title: "Todos os lugares",
        subtitle: "Passeie por praias, povoações e áreas protegidas.",
        voiceTitle: "Guia de voz no mapa",
        voiceDescription:
          "Ative o guia de voz para ouvir curiosidades quando estiver perto das áreas protegidas.",
        voiceCta: "Ver a ilha",
        view: "Ver com calma →",
        searchPlaceholder: "Pesquisar lugares...",
        tagsTitle: "Tags populares",
        clearTags: "Limpar",
        intentsTitle: "O que você quer hoje?",
        intentsReset: "Limpar",
        noResults: "Sem resultados para a pesquisa.",
      },
      en: {
        title: "All places",
        subtitle: "Wander beaches, settlements, and protected areas.",
        voiceTitle: "Voice guide on the map",
        voiceDescription:
          "Enable the voice guide to hear facts when you’re near protected areas.",
        voiceCta: "See the island",
        view: "See gently →",
        searchPlaceholder: "Search places...",
        tagsTitle: "Popular tags",
        clearTags: "Clear",
        intentsTitle: "What are you up for today?",
        intentsReset: "Reset",
        noResults: "No results for that search.",
      },
    }),
    []
  );

  useEffect(() => {
    fetchJsonOfflineFirst<Place[]>("/api/places")
      .then((data) => {
        setPlaces(data);
        setCachedPlaces(data);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const pick = (value?: { pt?: string; en?: string }) =>
    value?.[lang] || value?.en || value?.pt || "";

  const tagLabel = (value: string) =>
    value
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const tagFilters: Record<string, string[]> = {
    praia: ["praia", "beach", "praias"],
    villages: [
      "aldeia",
      "vila",
      "povoação",
      "povoacao",
      "village",
      "villages",
      "town",
    ],
    mountains: ["montanha", "serra", "mountain", "mountains"],
    biodiversity: ["biodiversidade", "biodiversity"],
    parque: ["parque", "park", "parque natural", "natural park"],
    heritage: [
      "património",
      "patrimonio",
      "heritage",
      "cultural",
      "cultura",
      "arquitetura",
      "architectural",
      "arquitectural",
      "história",
      "historia",
      "igreja",
      "church",
      "capela",
      "chapel",
      "colonial",
    ],
  };

  const intentFilters: Record<string, string[]> = {
    beach_day: ["praia", "beach", "praias"],
    nature: [
      "biodiversidade",
      "biodiversity",
      "parque",
      "park",
      "parque natural",
      "natural park",
      "zona húmida",
      "wetland",
      "dunas",
      "dunes",
      "lagoa",
      "lagoon",
    ],
    culture: [
      "património",
      "patrimonio",
      "heritage",
      "cultural",
      "cultura",
      "arquitetura",
      "architectural",
      "arquitectural",
      "história",
      "historia",
      "igreja",
      "church",
      "capela",
      "chapel",
      "colonial",
    ],
    quiet_villages: [
      "aldeia",
      "vila",
      "povoação",
      "povoacao",
      "village",
      "villages",
      "town",
    ],
    family: [
      "praia",
      "beach",
      "comunidade",
      "community",
      "centro",
      "center",
      "porto",
      "port",
      "miradouro",
      "viewpoint",
    ],
    quick_two_hours: [
      "vila",
      "village",
      "town",
    ],
  };

  const intents = useMemo(
    () => [
      {
        id: "beach_day",
        label: { pt: "Dia de praia", en: "Beach day" },
        Icon: Waves,
      },
      {
        id: "nature",
        label: { pt: "Natureza", en: "Nature" },
        Icon: Leaf,
      },
      {
        id: "culture",
        label: { pt: "Cultura", en: "Culture" },
        Icon: Landmark,
      },
      {
        id: "quiet_villages",
        label: { pt: "Vilarejos tranquilos", en: "Quiet villages" },
        Icon: MapPin,
      },
      {
        id: "family",
        label: { pt: "Família", en: "Family-friendly" },
        Icon: Heart,
      },
      {
        id: "quick_two_hours",
        label: { pt: "2 horas rápidas", en: "Quick 2 hours" },
        Icon: Compass,
      },
    ],
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("maio-places-intent");
    if (stored) setActiveIntent(stored);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!activeIntent) {
      window.localStorage.removeItem("maio-places-intent");
    } else {
      window.localStorage.setItem("maio-places-intent", activeIntent);
    }
  }, [activeIntent]);

  const resolveTagCard = (
    tag: string,
    language: "pt" | "en"
  ): { label: string; Icon: typeof Bird } => {
    const normalized = tag.toLowerCase();
    const candidates: Array<{
      label: { en: string; pt: string };
      Icon: typeof Bird;
      keywords: string[];
    }> = [
      {
        label: { en: "UNESCO", pt: "UNESCO" },
        Icon: ShieldCheck,
        keywords: ["unesco"],
      },
      {
        label: { en: "Biosphere", pt: "Biosfera" },
        Icon: Leaf,
        keywords: ["biosphere", "biosfera"],
      },
      {
        label: { en: "Sustainability", pt: "Sustentabilidade" },
        Icon: Recycle,
        keywords: ["sustainability", "sustentabilidade"],
      },
      {
        label: { en: "Marine", pt: "Marinho" },
        Icon: Waves,
        keywords: [
          "marine",
          "marinho",
          "marinhos",
          "sea",
          "oceano",
          "ocean",
          "mar",
          "ecossistemas_marinhos",
        ],
      },
      {
        label: { en: "Responsible Travel", pt: "Turismo Responsável" },
        Icon: LifeBuoy,
        keywords: ["responsible", "responsavel", "responsável", "turismo_responsavel"],
      },
      {
        label: { en: "Turtles", pt: "Tartarugas" },
        Icon: Fish,
        keywords: ["turtle", "tartaruga", "tartarugas"],
      },
      {
        label: { en: "Beach", pt: "Praia" },
        Icon: Waves,
        keywords: ["beach", "praia", "praias"],
      },
      {
        label: { en: "Dunes", pt: "Dunas" },
        Icon: Wind,
        keywords: ["dune", "dunes", "duna", "dunas"],
      },
      {
        label: { en: "Protected", pt: "Protegido" },
        Icon: Leaf,
        keywords: [
          "protected",
          "protegida",
          "protegido",
          "protegidas",
          "paisagens_protegidas",
        ],
      },
      {
        label: { en: "Forest", pt: "Floresta" },
        Icon: TreePine,
        keywords: ["forest", "floresta", "florestal"],
      },
      {
        label: { en: "Mountain", pt: "Monte" },
        Icon: Mountain,
        keywords: ["mountain", "mountains", "monte", "serra"],
      },
      {
        label: { en: "Lagoon", pt: "Lagoa" },
        Icon: Droplets,
        keywords: ["lagoon", "lagoa"],
      },
      {
        label: { en: "Wildlife", pt: "Vida Selvagem" },
        Icon: Bird,
        keywords: ["bird", "birds", "ave", "aves", "fauna", "wildlife"],
      },
      {
        label: { en: "Heritage", pt: "Património" },
        Icon: Landmark,
        keywords: [
          "heritage",
          "patrimonio",
          "património",
          "church",
          "capela",
          "chapel",
          "igreja",
          "cultura",
          "historia",
          "história",
          "colonial",
        ],
      },
      {
        label: { en: "Church", pt: "Igreja" },
        Icon: Landmark,
        keywords: ["church", "igreja", "capela", "chapel"],
      },
      {
        label: { en: "Trail", pt: "Trilho" },
        Icon: Footprints,
        keywords: ["trail", "trails", "trilho", "trilhos", "hike", "trek"],
      },
      {
        label: { en: "Sunlight", pt: "Sol" },
        Icon: Sun,
        keywords: ["sun", "sol", "sunset", "por-do-sol", "por do sol"],
      },
      {
        label: { en: "Village", pt: "Vila" },
        Icon: MapPin,
        keywords: [
          "village",
          "villages",
          "town",
          "cidade",
          "vila",
          "povoação",
          "povoacao",
          "comunidade",
          "centro urbano",
          "porto",
        ],
      },
      {
        label: { en: "Capital", pt: "Capital" },
        Icon: Landmark,
        keywords: ["capital"],
      },
      {
        label: { en: "Port", pt: "Porto" },
        Icon: Compass,
        keywords: [
          "port",
          "porto",
          "porto de pesca",
          "porto antigo",
          "porto inglês",
        ],
      },
      {
        label: { en: "Biodiversity", pt: "Biodiversidade" },
        Icon: Leaf,
        keywords: ["biodiversity", "biodiversidade"],
      },
      {
        label: { en: "Park", pt: "Parque" },
        Icon: TreePine,
        keywords: ["parque", "park", "parque natural", "natural park"],
      },
      {
        label: { en: "Journey", pt: "Viagem" },
        Icon: Compass,
        keywords: ["route", "rota", "journey", "caminho", "itinerario", "itinerário"],
      },
    ];

    const matched = candidates.find((candidate) =>
      candidate.keywords.some((keyword) => normalized.includes(keyword))
    );

    if (matched) {
      return { label: matched.label[language], Icon: matched.Icon };
    }

    return { label: tagLabel(tag), Icon: TagIcon };
  };

  const filteredPlaces = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const hasActiveFilter =
      Boolean(normalized) || Boolean(activeTag) || Boolean(activeIntent);
    const portoIngles = places.find((place) => place.id === "cidade-porto-ingles");
    const portoLat = Array.isArray(portoIngles?.coordinates)
      ? portoIngles.coordinates[1]
      : 15.25;
    const filtered = !normalized
      ? places
      : places.filter((place) => {
          const haystack = [pick(place.name), pick(place.location)]
            .join(" ")
            .toLowerCase();
          return haystack.includes(normalized);
        });

    const withTags =
      !activeTag
        ? filtered
        : filtered.filter((place) => {
            const sourceTags =
              lang === "en" && Array.isArray(place.tags_en) && place.tags_en.length
                ? place.tags_en
                : place.tags || [];
            const tags = sourceTags.map((tag) => tag.toLowerCase());
            const keys = tagFilters[activeTag] || [activeTag];
            return tags.some((tag) => keys.some((key) => tag.includes(key)));
          });

    const withIntent =
      !activeIntent
        ? withTags
        : withTags.filter((place) => {
            const sourceTags =
              lang === "en" && Array.isArray(place.tags_en) && place.tags_en.length
                ? place.tags_en
                : place.tags || [];
            const tags = sourceTags.map((tag) => tag.toLowerCase());
            const keys = intentFilters[activeIntent] || [activeIntent];
            return tags.some((tag) => keys.some((key) => tag.includes(key)));
          });

    const now = new Date();
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone: "Atlantic/Cape_Verde",
      }).format(now)
    );
    const timeOfDay =
      hour < 11 ? "morning" : hour < 16 ? "midday" : "late";

    const scorePlace = (place: Place) => {
      const sourceTags =
        lang === "en" && Array.isArray(place.tags_en) && place.tags_en.length
          ? place.tags_en
          : place.tags || [];
      const tags = sourceTags.map((tag) => tag.toLowerCase());
      const hasTag = (keys: string[]) =>
        tags.some((tag) => keys.some((key) => tag.includes(key)));
      let score = 0;

      if (activeIntent) {
        const keys = intentFilters[activeIntent] || [];
        if (hasTag(keys)) score += 6;
      }

      const category = (place.category || "").toLowerCase();
      if (category.includes("beach")) score += 2;
      if (category.includes("protected")) score += 1;
      if (category.includes("settlement")) score += 1;
      if (category.includes("religious")) score += 1;

      if (timeOfDay === "morning" && hasTag(["vila", "village", "town"])) score += 1;
      if (timeOfDay === "midday" && hasTag(["praia", "beach", "dunas", "dunes"]))
        score += 1;
      if (timeOfDay === "late" && hasTag(["praia", "beach", "miradouro", "viewpoint"]))
        score += 1;

      const lat = Array.isArray(place.coordinates) ? place.coordinates[1] : null;
      if (lat != null) {
        const delta = Math.abs(lat - portoLat);
        const proximity = Math.max(0, 1 - Math.min(delta / 0.25, 1));
        score += proximity * 2;
      }

      return score;
    };

    if (hasActiveFilter) {
      if (activeTag === "praia") {
        const morro = places.find((place) => place.id === "praia-do-morro");
        const morroLat = Array.isArray(morro?.coordinates)
          ? morro.coordinates[1]
          : null;
        const priority = [
          "praia-bitche-rotcha",
          "rotcha",
          "praia-ponta-preta",
          "praias-salina-bancona",
          "praia-do-morro",
          "rnpm-praia-do-morro",
          "praia-baxona",
          "praias-soca-pau-seco",
        ];
        const priorityIndex = new Map(
          priority.map((id, index) => [id, index])
        );
        return withIntent
          .slice()
          .sort((a, b) => {
            const aPriority = priorityIndex.get(a.id);
            const bPriority = priorityIndex.get(b.id);
            if (aPriority !== undefined || bPriority !== undefined) {
              if (aPriority === undefined) return 1;
              if (bPriority === undefined) return -1;
              return aPriority - bPriority;
            }

            const aScore = scorePlace(a);
            const bScore = scorePlace(b);
            if (aScore !== bScore) return bScore - aScore;

            const aLat = Array.isArray(a.coordinates) ? a.coordinates[1] : null;
            const bLat = Array.isArray(b.coordinates) ? b.coordinates[1] : null;
            if (aLat == null && bLat == null) return 0;
            if (aLat == null) return 1;
            if (bLat == null) return -1;

            if (morroLat == null) return aLat - bLat;
            const aNorth = aLat >= morroLat;
            const bNorth = bLat >= morroLat;
            if (aNorth !== bNorth) return aNorth ? -1 : 1;
            return aLat - bLat;
          });
      }

      return withIntent
        .slice()
        .sort((a, b) => {
          const aScore = scorePlace(a);
          const bScore = scorePlace(b);
          if (aScore !== bScore) return bScore - aScore;
          const aLat = Array.isArray(a.coordinates) ? a.coordinates[1] : null;
          const bLat = Array.isArray(b.coordinates) ? b.coordinates[1] : null;
          if (aLat == null && bLat == null) return 0;
          if (aLat == null) return 1;
          if (bLat == null) return -1;
          const aDelta = aLat - portoLat;
          const bDelta = bLat - portoLat;
          const aAbs = Math.abs(aDelta);
          const bAbs = Math.abs(bDelta);
          if (aAbs !== bAbs) return aAbs - bAbs;
          return bDelta - aDelta;
        });
    }

    const curatedOrder = [
      "maio-unesco-biosphere",
      "cidade-porto-ingles",
      "igreja-nossa-senhora-da-luz",
      "praia-baxona",
      "dunas-do-morrinho",
      "parque-natural-norte-maio",
      "lagoa",
      "ppspi-salinas-porto-ingles",
      "ppbf-barreiro-figueira",
    ];
    const curatedIndex = new Map(
      curatedOrder.map((id, index) => [id, index])
    );

    return withIntent
      .slice()
      .sort((a, b) => {
        const aCurated = curatedIndex.get(a.id);
        const bCurated = curatedIndex.get(b.id);
        if (aCurated !== undefined || bCurated !== undefined) {
          if (aCurated === undefined) return 1;
          if (bCurated === undefined) return -1;
          return aCurated - bCurated;
        }
        const aLat = Array.isArray(a.coordinates) ? a.coordinates[1] : -999;
        const bLat = Array.isArray(b.coordinates) ? b.coordinates[1] : -999;
        return aLat - bLat;
      });
  }, [places, query, activeTag, activeIntent, lang]);

  return (
    <div className="max-w-5xl mx-auto px-4 pt-8 pb-16">
      <div className="flex items-start justify-between gap-3 maio-fade-up">
        <div>
          <h1 className="text-2xl font-semibold">{copy[lang].title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy[lang].subtitle}
          </p>
        </div>
      </div>
      <div className="mt-5 maio-fade-in">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {copy[lang].intentsTitle}
          </div>
          {activeIntent && (
            <button
              type="button"
              onClick={() => setActiveIntent(null)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              {copy[lang].intentsReset}
            </button>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {intents.map((intent) => {
            const active = activeIntent === intent.id;
            return (
              <button
                key={intent.id}
                type="button"
                onClick={() =>
                  setActiveIntent((prev) =>
                    prev === intent.id ? null : intent.id
                  )
                }
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-muted/60 text-foreground/80 hover:bg-accent"
                }`}
              >
                <intent.Icon
                  className={`h-3.5 w-3.5 ${
                    active ? "text-background" : "text-muted-foreground"
                  }`}
                />
                {intent.label[lang]}
              </button>
            );
          })}
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
      <div className="mt-5 maio-fade-in">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy[lang].searchPlaceholder}
          className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 maio-fade-up">
        {loading &&
          Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="rounded-2xl border bg-background p-4 shadow-sm"
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
              className="rounded-2xl border bg-background p-4 shadow-sm transition duration-300 ease-out hover:shadow-md active:scale-[0.99] active:translate-y-[1px]"
            >
              <div className="relative overflow-hidden rounded-2xl">
                <img
                  src={place.image_url || "/image.png"}
                  alt={pick(place.name)}
                  className="h-44 w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
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
              {place.tips?.length ? (
                <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
                  {place.tips?.[0]?.[lang] ||
                    place.tips?.[0]?.en ||
                    place.tips?.[0]?.pt}
                </div>
              ) : null}
            </Link>
          ))}
      </div>
      {!loading && !loadError && filteredPlaces.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
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
