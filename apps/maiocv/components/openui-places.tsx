"use client";

import { useMemo } from "react";
import { createLibrary, defineComponent, Renderer } from "@openuidev/react-lang";
import { z } from "zod/v4";
import { t } from "../lib/i18n";
import type { Locale } from "../lib/locale";
import type { PlaceCard } from "../lib/place-visual";

function placeLibrary(locale: Locale) {
  const PlaceCollection = defineComponent({
    name: "PlaceCollection",
    description: "Up to three sourced places mentioned in the assistant answer.",
    props: z.object({ title: z.string(), count: z.string(), source: z.string(), items: z.string() }),
    component: ({ props }) => {
      let places: PlaceCard[] = [];
      try { places = z.array(z.object({ name: z.string(), detail: z.string(), url: z.url(), image: z.url().optional() })).max(3).parse(JSON.parse(props.items)); }
      catch { return null; }
      return (
        <section className="openui-places" aria-label={props.title}>
          <div className="openui-places-header"><strong>{props.title}</strong><span>{props.count}</span></div>
          <div className="openui-places-grid">
            {places.map(place => <a key={place.name} className="openui-place" href={place.url} target="_blank" rel="noopener noreferrer">
              {place.image && <span className="openui-place-image"><img src={place.image} alt="" loading="lazy" /></span>}
              <span className="openui-place-body"><span className="openui-place-icon" aria-hidden="true">↗</span>
                <strong>{place.name}</strong><span className="openui-place-detail">{place.detail}</span></span>
            </a>)}
          </div>
          <small>{t("chat.sourceLine", { source: props.source }, locale)}</small>
        </section>
      );
    },
  });
  return createLibrary({ root: "PlaceCollection", components: [PlaceCollection] });
}

export function OpenUIPlaces({ program, locale = "pt" }: { program: string; locale?: Locale }) {
  const library = useMemo(() => placeLibrary(locale), [locale]);
  return <Renderer response={program} library={library} isStreaming={false} />;
}
