"use client";

import Link from "next/link";
import { BedDouble, Gauge, Mountain, TrendingUp, Users } from "lucide-react";
import { useLang } from "@/lib/lang";
import MainSiteHeader from "@/components/MainSiteHeader";

const attractionsCards = [
  {
    key: "heritage",
    image:
      "https://res.cloudinary.com/dhxfkhewr/image/upload/v1773216417/ilha_do_maio_cabo_verde_1_2069a985fb_j7urkl.webp",
  },
  {
    key: "nature",
    image:
      "https://res.cloudinary.com/dhxfkhewr/image/upload/v1773216166/WhatsApp_Image_2026-03-10_at_07.03.38_nzaavt.jpg",
  },
  {
    key: "beach",
    image:
      "https://res.cloudinary.com/dhxfkhewr/image/upload/f_auto,q_auto/v1770281555/places/vila2.jpg",
  },
  {
    key: "culture",
    image:
      "https://res.cloudinary.com/dhxfkhewr/image/upload/v1773216418/ilha_do_maio_cabo_verde_4_4a3d94c87b_gm4le8.jpg",
  },
] as const;

export default function HomePage() {
  const [lang] = useLang();

  const copy = {
    en: {
      kicker: "Visit Maio",
      heroTitle: "An Island That Moves at Its Own Pace",
      heroBody:
        "Discover Maio through quiet beaches, authentic village life, and landscapes shaped by nature, culture, and time. A place of living heritage and lasting possibility.",
      heroCta: "Explore Attractions",
      introTitle: "Maio, a heritage of peace, nature and possibility",
      introBody:
        "From the historic legacy of Porto Inglês and the island's salt pans to its long, empty beaches, quiet settlements and reforested interior, Maio offers a living cultural and natural landscape of remarkable authenticity.",
      introBody2:
        "Rich in identity and defined by peace, preservation and possibility, Maio stands out as a destination with true UNESCO-worthy character and exceptional long-term potential. The salt heritage of Maio, the historic role of Porto Inglês, the island's quiet villages, and the contrast between arid landscapes and major forested areas are all reflected in the official tourism narrative.",
      attractionsTitle: "Attractions",
      attractionsBody: "Explore Maio through four dimensions shaped by place and people.",
      dataTitle: "Maio Data",
      stat1Value: "6,411",
      stat1Label: "Population",
      stat2Value: "270 km²",
      stat2Label: "Total area",
      stat3Value: "20.3%",
      stat3Label: "Occupancy Rate",
      stat4Value: "500 m",
      stat4Label: "Highest peak",
      stat5Value: "2.5",
      stat5Label: "Tourism pressure",
      stat6Value: "67.47%",
      stat6Label: "Investment share",
      heritage: "Heritage",
      nature: "Nature",
      beach: "Beach",
      culture: "Culture",
      seeAll: "See all attractions",
      funFactsTitle: "Did you know?",
      funFacts: [
        "Maio has the largest continuous forest area in Cabo Verde.",
        "Maio is one of Cabo Verde’s most important islands for sea turtle nesting.",
        "The entire island and surrounding marine area are part of a UNESCO Biosphere Reserve.",
        "Maio is home to one of the world’s largest loggerhead turtle nesting colonies.",
      ],
      culturalAttractionsTitle: "Cultural Attractions",
      culturalAttractionsSubtitle: "Povoações referenced under Cultural Attractions (Maio Island).",
      settlements: [
        "Ribeira de São João",
        "Morro",
        "Monte Penoso",
        "Cascabulho",
        "Morrinho",
        "Ribeira de Santo António",
        "Calheta",
        "Vila Porto Inglês",
        "Pedro Vaz",
        "Porto Inglês",
      ],
    },
    pt: {
      kicker: "Visit Maio",
      heroTitle: "Uma Ilha Que Vive no Seu Próprio Ritmo",
      heroBody:
        "Descubra o Maio através de praias tranquilas, vida autêntica de vila e paisagens moldadas pela natureza, cultura e tempo. Um lugar de património vivo e possibilidade duradoura.",
      heroCta: "Explorar Atrações",
      introTitle: "Maio, um património de paz, natureza e possibilidade",
      introBody:
        "Do legado histórico do Porto Inglês e das salinas da ilha às suas longas praias desertas, povoações tranquilas e interior reflorestado, Maio oferece uma paisagem cultural e natural viva de autenticidade notável.",
      introBody2:
        "Rico em identidade e definido pela paz, preservação e possibilidade, Maio destaca-se como um destino com verdadeiro caráter digno da UNESCO e potencial excecional de longo prazo. A herança salineira de Maio, o papel histórico do Porto Inglês, as aldeias tranquilas da ilha e o contraste entre paisagens áridas e grandes áreas florestadas refletem-se na narrativa oficial de turismo.",
      attractionsTitle: "Atrações",
      attractionsBody: "Explore o Maio em quatro dimensões moldadas pelo território e pelas pessoas.",
      dataTitle: "Dados do Maio",
      stat1Value: "6.411",
      stat1Label: "População",
      stat2Value: "270 km²",
      stat2Label: "Área total",
      stat3Value: "20,3%",
      stat3Label: "Taxa de Ocupação",
      stat4Value: "500 m",
      stat4Label: "Pico mais alto",
      stat5Value: "2,5",
      stat5Label: "Pressão turística",
      stat6Value: "67,47%",
      stat6Label: "Quota de investimento",
      heritage: "Património",
      nature: "Natureza",
      beach: "Praia",
      culture: "Cultura",
      seeAll: "Ver todas as atrações",
      funFactsTitle: "Sabia que?",
      funFacts: [
        "O Maio tem a maior área florestal contínua de Cabo Verde.",
        "O Maio é uma das ilhas mais importantes de Cabo Verde para a desova de tartarugas marinhas.",
        "Toda a ilha e a área marinha envolvente fazem parte de uma Reserva da Biosfera da UNESCO.",
        "O Maio abriga uma das maiores colónias de desova de tartaruga-cabeçuda do mundo.",
      ],
      culturalAttractionsTitle: "Atrações Culturais",
      culturalAttractionsSubtitle: "Povoações referidas em Atrações Culturais (Ilha do Maio).",
      settlements: [
        "Ribeira de São João",
        "Morro",
        "Monte Penoso",
        "Cascabulho",
        "Morrinho",
        "Ribeira de Santo António",
        "Calheta",
        "Vila Porto Inglês",
        "Pedro Vaz",
        "Porto Inglês",
      ],
    },
  } as const;

  return (
    <main className="bg-background text-foreground">
      <section className="relative min-h-[72vh] overflow-hidden">
        <img
          src="https://res.cloudinary.com/dhxfkhewr/image/upload/v1773214805/600473015_1172435288340497_4740791525896028162_n_qvdffk.jpg"
          alt="Maio island coast"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/45" />
        <MainSiteHeader inverted />
        <div className="relative mx-auto flex min-h-[72vh] w-full max-w-6xl items-center justify-center px-4 pb-12 pt-28 sm:px-6">
          <div className="max-w-4xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
              {copy[lang].kicker}
            </div>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-white sm:text-5xl">
              {copy[lang].heroTitle}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/90 sm:text-lg">{copy[lang].heroBody}</p>
            <Link
              href="/map"
              className="mx-auto mt-7 inline-flex rounded-full bg-white px-8 py-4 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              {copy[lang].heroCta}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-4 pb-2 pt-16 text-center sm:px-6">
        <h2 className="text-2xl font-semibold sm:text-3xl">{copy[lang].introTitle}</h2>
        <p className="mx-auto mt-5 max-w-4xl text-base leading-relaxed text-muted-foreground">
          {copy[lang].introBody}
        </p>
        <p className="mx-auto mt-4 max-w-4xl text-base leading-relaxed text-muted-foreground">
          {copy[lang].introBody2}
        </p>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6">
        <h2 className="text-center text-2xl font-semibold sm:text-3xl hidden">{copy[lang].dataTitle}</h2>
        <div className="mt-8 grid grid-cols-3 gap-2 md:grid-cols-3">

          <div className="rounded-xl p-2 text-center">
            <div className="flex items-center justify-center gap-2">
              <Gauge className="hidden h-4 w-4 text-muted-foreground sm:block" />
              <div className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {copy[lang].stat2Value}
              </div>
            </div>
            <p className="mt-2 text-sm text-foreground/90">{copy[lang].stat2Label}</p>
          </div>


          <div className="rounded-xl p-2 text-center">
            <div className="flex items-center justify-center gap-2">
              <Users className="hidden h-4 w-4 text-muted-foreground sm:block" />
              <div className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {copy[lang].stat1Value}
              </div>
            </div>
            <p className="mt-2 text-sm text-foreground/90">{copy[lang].stat1Label}</p>
          </div>

          <div className="rounded-xl p-2 text-center">
            <div className="flex items-center justify-center gap-2">
              <BedDouble className="hidden h-4 w-4 text-muted-foreground sm:block" />
              <div className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {copy[lang].stat3Value}
              </div>
            </div>
            <p className="mt-2 text-sm text-foreground/90">{copy[lang].stat3Label}</p>
          </div>

          <div className="hidden rounded-xl p-2 text-center">
            <div className="flex items-center justify-center gap-2">
              <Mountain className="hidden h-4 w-4 text-muted-foreground sm:block" />
              <div className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {copy[lang].stat4Value}
              </div>
            </div>
            <p className="mt-2 text-sm text-foreground/90">{copy[lang].stat4Label}</p>
          </div>

          <div className="hidden  rounded-xl p-2 text-center">
            <div className="flex items-center justify-center gap-2">
              <Gauge className="hidden h-4 w-4 text-muted-foreground sm:block" />
              <div className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {copy[lang].stat5Value}
              </div>
            </div>
            <p className="mt-2 text-sm text-foreground/90">{copy[lang].stat5Label}</p>
          </div>

          <div className="hidden  rounded-xl p-2 text-center">
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="hidden h-4 w-4 text-muted-foreground sm:block" />
              <div className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {copy[lang].stat6Value}
              </div>
            </div>
            <p className="mt-2 text-sm text-foreground/90">{copy[lang].stat6Label}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold capitalize sm:text-3xl">{copy[lang].attractionsTitle}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{copy[lang].attractionsBody}</p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-12">
          <Link
            href="/places?category=culture"
            className="group block md:col-span-8"
          >
            <div className="overflow-hidden rounded-2xl">
              <img
                src={attractionsCards.find((c) => c.key === "culture")?.image}
                alt={copy[lang].culture}
                className="h-56 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-64"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="mt-3 text-xl font-semibold text-foreground">{copy[lang].culture}</div>
          </Link>

          <Link
            href="/places?category=heritage"
            className="group block md:col-span-4"
          >
            <div className="overflow-hidden rounded-2xl">
              <img
                src={attractionsCards.find((c) => c.key === "heritage")?.image}
                alt={copy[lang].heritage}
                className="h-56 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-64"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="mt-3 text-xl font-semibold text-foreground">{copy[lang].heritage}</div>
          </Link>

          <Link
            href="/places?category=beach"
            className="group block md:col-span-5"
          >
            <div className="overflow-hidden rounded-2xl">
              <img
                src={attractionsCards.find((c) => c.key === "beach")?.image}
                alt={copy[lang].beach}
                className="h-56 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-64"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="mt-3 text-xl font-semibold text-foreground">{copy[lang].beach}</div>
          </Link>

          <Link
            href="/places?category=nature"
            className="group block md:col-span-7"
          >
            <div className="overflow-hidden rounded-2xl">
              <img
                src={attractionsCards.find((c) => c.key === "nature")?.image}
                alt={copy[lang].nature}
                className="h-56 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-64"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="mt-3 text-xl font-semibold text-foreground">{copy[lang].nature}</div>
          </Link>
        </div>

        <div className="hidden mt-8 text-center">
          <Link
            href="/places"
            className="inline-flex rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted"
          >
            {copy[lang].seeAll}
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <div className="text-center">
          <h3 className="text-2xl font-semibold sm:text-3xl">{copy[lang].funFactsTitle}</h3>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {copy[lang].funFacts.map((fact, index) => (
            <article
              key={fact}
              className={`rounded-xl border p-4 text-sm leading-relaxed text-foreground/90 ${
                index % 4 === 0
                  ? "border-emerald-200 bg-emerald-50"
                  : index % 4 === 1
                    ? "border-sky-200 bg-sky-50"
                    : index % 4 === 2
                      ? "border-violet-200 bg-violet-50"
                      : "border-amber-200 bg-amber-50"
              }`}
            >
              {fact}
            </article>
          ))}
        </div>
      </section>

      <section className="hidden mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 text-center">
        <h3 className="text-2xl font-semibold sm:text-3xl">{copy[lang].culturalAttractionsTitle}</h3>
        <p className="hidden mt-2 text-sm text-muted-foreground">{copy[lang].culturalAttractionsSubtitle}</p>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {copy[lang].settlements.map((item) => (
            <div
              key={item}
              className="rounded-lg border border-border bg-muted/35 px-3 py-2 text-sm font-medium text-foreground"
            >
              {item}
            </div>
          ))}
        </div>

        <a
          href="https://www.visit-caboverde.com/en/islands/maio-island"
          target="_blank"
          rel="noreferrer"
          className="hidden mt-6 inline-flex text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Source: Visit Cabo Verde · Cultural Attractions
        </a>
      </section>
    </main>
  );
}
