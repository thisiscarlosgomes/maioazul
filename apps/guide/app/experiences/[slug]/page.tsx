"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SecondaryPageHeader from "@/components/SecondaryPageHeader";
import { useLang } from "@/lib/lang";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Place = {
  id: string;
  title: string | { en?: string; pt?: string };
  description?: string | { en?: string; pt?: string };
  location?: string | { en?: string; pt?: string };
  phone: string;
  image?: string;
  images?: string[];
  source_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  email?: string;
};

type ExperienceGroup = {
  slug: string;
  title: { en: string; pt: string };
  places: Place[];
};

export default function ExperienceBySlugPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [lang] = useLang();
  const [group, setGroup] = useState<ExperienceGroup | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [imageIndexByPlace, setImageIndexByPlace] = useState<Record<string, number>>({});

  const copy = useMemo(
    () => ({
      en: {
        fallbackTitle: "Experience",
        subtitle: "Places to explore in this experience. Tap phone to book.",
        location: "Location",
        bookByPhone: "Book",
        openOnAirbnb: "Book",
        openLink: "Open",
        openOnInstagram: "Instagram",
        openOnFacebook: "Facebook",
        email: "Email",
        empty: "No places yet. Add entries in experience_places_by_slug.json.",
      },
      pt: {
        fallbackTitle: "Experiência",
        subtitle: "Lugares para explorar nesta experiência. Toque no telefone para reservar.",
        location: "Localização",
        bookByPhone: "Reservar",
        openOnAirbnb: "Reservar",
        openLink: "Abrir",
        openOnInstagram: "Instagram",
        openOnFacebook: "Facebook",
        email: "Email",
        empty: "Ainda sem lugares. Adicione entradas em experience_places_by_slug.json.",
      },
    }),
    []
  );

  const pickLocalized = (
    value: string | { en?: string; pt?: string } | undefined
  ) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value[lang] || value.en || value.pt || "";
  };

  useEffect(() => {
    fetch("/data/experience_places_by_slug.json")
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          setGroup(null);
          return;
        }
        const match = data.find((item) => item?.slug === slug) || null;
        setGroup(match);
      })
      .catch(() => setGroup(null))
      .finally(() => setLoaded(true));
  }, [slug]);

  useEffect(() => {
    if (!group?.places?.length) return;
    for (const place of group.places) {
      const images =
        Array.isArray(place.images) && place.images.length > 0
          ? place.images
          : place.image
            ? [place.image]
            : [];
      for (const url of images) {
        const img = new Image();
        img.src = url;
      }
    }
  }, [group]);

  useEffect(() => {
    if (!loaded) return;
    if (!group) {
      router.replace("/experiences");
    }
  }, [group, loaded, router]);

  const pageTitle =
    group?.title?.[lang] ||
    group?.title?.en ||
    group?.title?.pt ||
    copy[lang].fallbackTitle;

  return (
    <>
      <SecondaryPageHeader title={pageTitle} backHref="/experiences" />
      <div className="mx-auto max-w-5xl px-4 pb-12 pt-6">
        <p className="text-sm text-muted-foreground">{copy[lang].subtitle}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {group?.places?.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm"
            >
              {(() => {
                const images =
                  Array.isArray(item.images) && item.images.length > 0
                    ? item.images
                    : item.image
                      ? [item.image]
                      : [];
                const currentIndex = Math.min(
                  images.length - 1,
                  Math.max(0, imageIndexByPlace[item.id] ?? 0)
                );
                const currentImage = images[currentIndex] || "";
                const hasMultiple = images.length > 1;
                const placeTitle = pickLocalized(item.title);

                return (
                  <div className="group relative">
                    {currentImage ? (
                      <img
                        src={currentImage}
                        alt={placeTitle}
                        className="h-44 w-full object-cover object-center"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="h-44 w-full bg-muted" />
                    )}

                    {hasMultiple && (
                      <>
                        {currentIndex > 0 ? (
                          <button
                            type="button"
                            aria-label="Previous image"
                            onClick={() =>
                              setImageIndexByPlace((prev) => ({
                                ...prev,
                                [item.id]: Math.max(0, (prev[item.id] ?? 0) - 1),
                              }))
                            }
                            className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          aria-label="Next image"
                          onClick={() =>
                            setImageIndexByPlace((prev) => ({
                              ...prev,
                              [item.id]: Math.min(images.length - 1, (prev[item.id] ?? 0) + 1),
                            }))
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 disabled:opacity-0"
                          disabled={currentIndex >= images.length - 1}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1.5">
                          {images.map((_, idx) => (
                            <button
                              key={`${item.id}-dot-${idx}`}
                              type="button"
                              aria-label={`Go to image ${idx + 1}`}
                              onClick={() =>
                                setImageIndexByPlace((prev) => ({
                                  ...prev,
                                  [item.id]: idx,
                                }))
                              }
                              className={`h-2 w-2 rounded-full ${
                                idx === currentIndex ? "bg-white" : "bg-white/55"
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
              <div className="space-y-2 p-4">
                <h2 className="text-base font-semibold text-foreground">
                  {pickLocalized(item.title)}
                </h2>
                {pickLocalized(item.description)?.trim() ? (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {pickLocalized(item.description)}
                  </p>
                ) : null}
                {pickLocalized(item.location)?.trim() ? (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{copy[lang].location}: </span>
                    {pickLocalized(item.location)}
                  </div>
                ) : null}
                {item.phone ? (
                  <a
                    href={`tel:${item.phone.replace(/\s+/g, "")}`}
                    className="inline-flex rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground hover:bg-accent"
                  >
                    {copy[lang].bookByPhone}: {item.phone}
                  </a>
                ) : null}
                {item.instagram_url ? (
                  <a
                    href={item.instagram_url}
                    target="_blank"
                    rel="noreferrer"
                    className={`${item.phone ? "ml-2 " : ""}inline-flex rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground hover:bg-accent`}
                  >
                    {copy[lang].openOnInstagram}
                  </a>
                ) : null}
                {item.facebook_url ? (
                  <a
                    href={item.facebook_url}
                    target="_blank"
                    rel="noreferrer"
                    className={`${item.phone || item.instagram_url ? "ml-2 " : ""}inline-flex rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground hover:bg-accent`}
                  >
                    {copy[lang].openOnFacebook}
                  </a>
                ) : null}
                {item.email ? (
                  <a
                    href={`mailto:${item.email}`}
                    className={`${item.phone || item.instagram_url || item.facebook_url ? "ml-2 " : ""}inline-flex rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground hover:bg-accent`}
                  >
                    {copy[lang].email}
                  </a>
                ) : null}
                {!item.phone &&
                !item.instagram_url &&
                !item.facebook_url &&
                !item.email &&
                item.source_url?.includes("airbnb.com/rooms/") ? (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground hover:bg-accent"
                  >
                    {copy[lang].openOnAirbnb}
                  </a>
                ) : null}
                {!item.phone &&
                !item.instagram_url &&
                !item.facebook_url &&
                !item.email &&
                item.source_url &&
                !item.source_url.includes("airbnb.com/rooms/") ? (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground hover:bg-accent"
                  >
                    {copy[lang].openLink}
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        {loaded && (!group || !group.places?.length) && (
          <div className="mt-6 rounded-2xl border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
            {copy[lang].empty}
          </div>
        )}
      </div>
    </>
  );
}
