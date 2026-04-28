"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CalendarDays, ChevronRight } from "lucide-react";
import SecondaryPageHeader from "@/components/SecondaryPageHeader";
import { useLang } from "@/lib/lang";

type EventItem = {
  id: string;
  title: { en: string; pt: string };
  dateLabel: { en: string; pt: string };
  location?: { en: string; pt: string };
  description: { en: string; pt: string };
  start: { month: number; day: number };
};

const events: EventItem[] = [
  {
    id: "tabanka-santa-cruz",
    title: {
      en: "Festa Tabanka Santa Cruz",
      pt: "Festa Tabanka Santa Cruz",
    },
    dateLabel: {
      en: "April 18 - May 03",
      pt: "18 de abril a 03 de maio",
    },
    location: {
      en: "Santa Cruz",
      pt: "Santa Cruz",
    },
    description: {
      en: "A vibrant cultural celebration with music, traditions, and strong community identity.",
      pt: "Celebração cultural com música, tradições e forte identidade comunitária.",
    },
    start: { month: 4, day: 18 },
  },
  {
    id: "offroad-djarmai",
    title: {
      en: "OffRoad Djarmai & Acao Social",
      pt: "OffRoad Djarmai & Ação Social",
    },
    dateLabel: {
      en: "July 25",
      pt: "25 de julho",
    },
    description: {
      en: "An off-road island adventure combined with social action for local communities.",
      pt: "Aventura off-road pela ilha com ações sociais para comunidades locais.",
    },
    start: { month: 7, day: 25 },
  },
  {
    id: "sete-sois-sete-luas-trust",
    title: {
      en: "Centrum Sete Sois Sete Luas - Maio",
      pt: "Centrum Sete Sóis Sete Luas - Maio",
    },
    dateLabel: {
      en: "May 9 | 19:00",
      pt: "9 de maio | 19h",
    },
    description: {
      en: "Opening of the \"TRUST – Terra terra terra\" exhibition, tasting with Chef Nicolas Duberville, and concert by Banda Oásis. Painting workshops run in Maio schools from May 4 to 7.",
      pt: "Inauguração da exposição \"TRUST – Terra terra terra\", degustação com o Chef Nicolas Duberville e concerto da Banda Oásis. As oficinas de pintura decorrem nas escolas do Maio de 4 a 7 de maio.",
    },
    start: { month: 5, day: 9 },
  },
  {
    id: "beach-volley-camp",
    title: {
      en: "Beach Volley Camp",
      pt: "Beach Volley Camp",
    },
    dateLabel: {
      en: "August 7 - 11",
      pt: "7 - 11 de agosto",
    },
    location: {
      en: "Beach Rotcha",
      pt: "Beach Rotcha",
    },
    description: {
      en: "Beach volleyball camp at Rotcha with training sessions and team drills.",
      pt: "Campo de voleibol de praia na Rotcha com treinos e exercícios em equipa.",
    },
    start: { month: 8, day: 7 },
  },
  {
    id: "maio-summer-games",
    title: {
      en: "Maio Summer Games",
      pt: "Jogos de Verão",
    },
    dateLabel: {
      en: "August 7 - 28",
      pt: "7 - 28 de agosto",
    },
    location: {
      en: "Beach Rocha",
      pt: "Beach Rocha",
    },
    description: {
      en: "Annual summer games with beach sports, friendly competition, and community spirit.",
      pt: "Jogos anuais de verão com desporto de praia e espírito comunitário.",
    },
    start: { month: 8, day: 7 },
  },
  {
    id: "municipal-day",
    title: {
      en: "Municipal Day",
      pt: "Festas dia do Município",
    },
    dateLabel: {
      en: "September 2 - 8",
      pt: "2 - 8 de setembro",
    },
    description: {
      en: "Multi-day municipal celebration with cultural and community activities.",
      pt: "Celebração municipal de vários dias com atividades culturais e comunitárias.",
    },
    start: { month: 9, day: 2 },
  },
  {
    id: "badj-conjunt",
    title: {
      en: "Badje Conjunt",
      pt: "Badje Conjunt",
    },
    dateLabel: {
      en: "September 4",
      pt: "4 de setembro",
    },
    description: {
      en: "Annual local music festival featuring island talent and live performances.",
      pt: "Festival anual de música local com talentos da ilha e atuações ao vivo.",
    },
    start: { month: 9, day: 4 },
  },
];

const eventImageById: Record<string, string> = {
  "tabanka-santa-cruz":
    "https://res.cloudinary.com/dhxfkhewr/image/upload/v1777297844/alkjfal2_twmxpt.jpg",
  "offroad-djarmai":
    "https://res.cloudinary.com/dhxfkhewr/image/upload/v1777298628/aflj2af_n2fjnb.jpg",
  "sete-sois-sete-luas-trust":
    "https://res.cloudinary.com/dhxfkhewr/image/upload/v1777368298/maioazul/events/things-to-do/centro-sete-sois-sete-luas-maio-2026.jpg",
  "beach-volley-camp":
    "https://res.cloudinary.com/dhxfkhewr/image/upload/v1770466647/maioazul/camp/volley.jpg",
  "maio-summer-games":
    "https://res.cloudinary.com/dhxfkhewr/image/upload/v1777300998/123482066198_936177338686978_3589996168777256840_n_sxzlzz.jpg",
  "municipal-day":
    "https://res.cloudinary.com/dhxfkhewr/image/upload/v1773216417/ilha_do_maio_cabo_verde_1_2069a985fb_j7urkl.webp",
  "badj-conjunt":
    "https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=1600&auto=format&fit=crop",
};

export default function ThingsToDoPage() {
  const [lang] = useLang();

  const copy = useMemo(
    () => ({
      en: {
        title: "Things to Do",
        subtitle: "Activities and local happenings in Maio, ordered by date.",
        back: "Back to experiences",
      },
      pt: {
        title: "Coisas para Fazer",
        subtitle: "Atividades e acontecimentos locais no Maio, ordenados por data.",
        back: "Voltar a experiências",
      },
    }),
    []
  );

  const sortedEvents = useMemo(
    () =>
      [...events].sort((a, b) => {
        const monthDiff = a.start.month - b.start.month;
        if (monthDiff !== 0) return monthDiff;
        return a.start.day - b.start.day;
      }),
    []
  );

  return (
    <>
      <SecondaryPageHeader
        title={{ en: copy.en.title, pt: copy.pt.title }}
        backHref="/experiences"
      />

      <main className="w-full pb-16 pt-0">
        <section className="relative h-44 w-full overflow-hidden sm:h-56">
          <img
            src="https://res.cloudinary.com/dhxfkhewr/image/upload/v1773214805/600473015_1172435288340497_4740791525896028162_n_qvdffk.jpg"
            alt="Things to do in Maio"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <h2 className="text-center text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {copy[lang].title}
            </h2>
          </div>
        </section>

        <div className="mx-auto mt-6 flex w-full max-w-5xl items-start justify-between gap-4 px-4">
          <div>
            <h1 className="mt-6 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {copy[lang].title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {copy[lang].subtitle}
            </p>
          </div>
        </div>

        <div className="mx-auto mt-8 grid w-full max-w-5xl grid-cols-1 gap-6 px-4 lg:grid-cols-3">
          {sortedEvents.map((event) => (
            <article
              key={event.id}
              className="overflow-hidden rounded-3xl bg-[#f4f4f4] shadow-sm"
            >
              <div className="relative h-[170px] w-full sm:h-[200px]">
                <img
                  src={eventImageById[event.id] || eventImageById["tabanka-santa-cruz"]}
                  alt={event.title[lang]}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#242424] sm:text-xs">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {event.dateLabel[lang]}
                </div>
              </div>

              <div className="px-5 py-5 sm:px-6 sm:py-6">
                <h3 className="text-lg font-semibold tracking-tight text-[#2b2b2b] sm:text-xl">
                  {event.title[lang]}
                </h3>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#3b3b3b] sm:text-base">
                  {event.description[lang]}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mx-auto mt-12 w-full max-w-5xl px-4">
          <Link
            href="/experiences"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            {copy[lang].back}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </>
  );
}
