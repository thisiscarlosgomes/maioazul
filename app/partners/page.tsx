"use client";

import { useState } from "react";
import { Facebook, Instagram } from "lucide-react";
import { useLang } from "@/lib/lang";

const worksShowcase = [
  {
    id: "work-1",
    src: "https://res.cloudinary.com/dhxfkhewr/image/upload/v1770565397/mawe_oub10f.jpg",
    alt: "Projeto Maioazul",
  },
  {
    id: "work-2",
    src: "https://res.cloudinary.com/dhxfkhewr/image/upload/v1770565397/mafu_dnx1hn.jpg",
    alt: "Projeto Maioazul",
  },
  {
    id: "work-3",
    src: "https://res.cloudinary.com/dhxfkhewr/image/upload/v1770565397/mab2_bqrxdp.jpg",
    alt: "Projeto Maioazul",
  },
  {
    id: "work-4",
    src: "https://res.cloudinary.com/dhxfkhewr/image/upload/v1770565397/mavol_td0w1p.jpg",
    alt: "Projeto Maioazul",
  },
  {
    id: "work-5",
    src: "https://res.cloudinary.com/dhxfkhewr/image/upload/v1770565396/maje_qkpbmi.jpg",
    alt: "Projeto Maioazul",
  },
  {
    id: "work-6",
    src: "https://res.cloudinary.com/dhxfkhewr/image/upload/v1770565397/maro_qkcpz2.jpg",
    alt: "Projeto Maioazul",
  },
  {
    id: "work-7",
    src: "https://res.cloudinary.com/dhxfkhewr/image/upload/v1770466664/maioazul/camp/6.jpg",
    alt: "Projeto Maioazul",
  },
  {
    id: "work-8",
    src: "https://res.cloudinary.com/dhxfkhewr/image/upload/v1770466652/maioazul/camp/2.jpg",
    alt: "Projeto Maioazul",
  },
  {
    id: "work-9",
    src: "https://res.cloudinary.com/dhxfkhewr/image/upload/v1770565829/mabas_2_qcoxir.jpg",
    alt: "Projeto Maioazul",
  },
];

const copy = {
  pt: {
    heroLabel: "Parcerias",
    heroTitle: "Criar valor que fique no Maio",
    heroDescription:
      "Crescemos com marcas e instituições que acreditam num desenvolvimento construído a partir do Maio. Procuramos parceiros com visão de longo prazo, proximidade ao terreno e compromisso com criar valor que permaneça na ilha.\n\nMais do que patrocínios pontuais, procuramos alianças que reforcem a capacidade económica, institucional e social do território.",
    whyTitle: "Porquê colaborar connosco",
    highlights: [
      {
        title: "Visibilidade transversal",
        description:
          "Presença integrada nas diferentes iniciativas da Maioazul: desporto, eventos, conteúdos, plataformas digitais e projetos territoriais em desenvolvimento.",
      },
      {
        title: "Impacto local",
        description:
          "Apoio direto a projetos no terreno, incluindo bolsas sociais, capacitação local e iniciativas com continuidade ao longo do ano.",
      },
      {
        title: "Parceria de longo prazo",
        description:
          "Mais do que patrocínios pontuais, procuramos parceiros interessados em crescer connosco, co-criando ações, conteúdos e experiências à escala do Maio.",
      },
    ],
    areasTitle: "Áreas abertas a colaboração",
    areasDescription:
      "A Maioazul desenvolve iniciativas concretas na Ilha do Maio, ligando desporto, cultura, economia e conhecimento, e criando oportunidades de colaboração com impacto local real.",
    areasList: [
      "Fundo de microcrédito social para a economia azul",
      "Financiamento da infraestrutura de beach volley no Maio",
      "Apoio a clubes e equipas desportivas locais",
      "Realização de outras atividades náuticas",
      "Apoio a grupos culturais e comunitários",
      "Criação do Portal de Dados da Ilha do Maio",
      "Desenvolvimento da app Guia do Maio",
    ],
    contactTitle: "Vamos conversar?",
    contactDescription:
      "Se a tua marca ou instituição procura uma parceria com propósito, proximidade e visão de longo prazo, queremos falar contigo.",
    contactName: "Nome e organização",
    contactEmail: "Email",
    contactMessage: "Como podemos colaborar?",
    contactSubmit: "Enviar",
    contactSuccess: "Obrigado! Vamos responder em breve.",
    contactError: "Ocorreu um erro. Tenta novamente.",
    footerCopy: "© 2026 Maioazul.com",
    imageAlt: "Ativação de marca no camp",
  },
  en: {
    heroLabel: "Partnerships",
    heroTitle: "Creating value that stays in Maio",
    heroDescription:
      "We grow with brands and institutions that believe in development built from Maio. We seek partners with a long-term vision, close connection to the ground, and a commitment to creating value that remains on the island.\n\nMore than one-off sponsorships, we seek alliances that strengthen the territory’s economic, institutional, and social capacity.",
    whyTitle: "Why partner with us",
    highlights: [
      {
        title: "Cross-platform visibility",
        description:
          "Integrated presence across Maioazul initiatives: sport, events, content, digital platforms, and territorial projects in development.",
      },
      {
        title: "Local impact",
        description:
          "Direct support for on-the-ground projects, including social scholarships, local capacity building, and year-round initiatives.",
      },
      {
        title: "Long-term partnership",
        description:
          "Beyond one-off sponsorships, we seek partners who want to grow with us, co-creating actions, content, and experiences across Maio.",
      },
    ],
    areasTitle: "Areas open to collaboration",
    areasDescription:
      "Maioazul develops concrete initiatives on the island of Maio, connecting sport, culture, economy, and knowledge, and creating opportunities for real local impact.",
    areasList: [
      "Social microcredit fund for the blue economy",
      "Funding for beach volleyball infrastructure in Maio",
      "Support for local sports clubs and teams",
      "Other nautical activities and initiatives",
      "Support for cultural and community groups",
      "Creation of the Maio Island Data Portal",
      "Development of the Maio Guide app",
    ],
    contactTitle: "Let’s talk",
    contactDescription:
      "If your brand or institution is looking for a partnership with purpose, proximity, and long-term vision, we want to talk.",
    contactName: "Name and organization",
    contactEmail: "Email",
    contactMessage: "How can we collaborate?",
    contactSubmit: "Send",
    contactSuccess: "Thank you! We’ll get back to you soon.",
    contactError: "Something went wrong. Please try again.",
    footerCopy: "© 2026 Maioazul.com",
    imageAlt: "Brand activation at the camp",
  },
};


export default function PartnersPage() {
  const [partnerStatus, setPartnerStatus] = useState<null | "success" | "error">(null);
  const [lang, setLang] = useLang();
  const t = copy[lang];

  async function handlePartnerSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPartnerStatus(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      message: String(formData.get("message") || "").trim(),
    };

    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      form.reset();
      setPartnerStatus("success");
    } catch {
      setPartnerStatus("error");
    }
  }

  return (
    <div className="bg-white text-[#111111]">
      <header className="border-b border-[rgba(17,17,17,0.08)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-7 py-6">
          <img className="h-[18px] w-auto" src="/maioazul.png" alt="Maioazul" />
          <nav className="flex items-center gap-6 text-sm font-semibold text-[#111111]/75">

            <a className="transition hover:text-[#111111]" href="mailto:hello@maioazul.com">
              hello@maioazul.com
            </a>
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.08em] text-[#111111]/70">
              {(["pt", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`uppercase transition ${
                    lang === l
                      ? "text-[#111111] underline underline-offset-4"
                      : "hover:text-[#111111]"
                  }`}
                  type="button"
                >
                  {l}
                </button>
              ))}
            </div>
          </nav>

        </div>

      </header>

      <section className="relative overflow-hidden pb-10 pt-14">
        <div className="absolute inset-0 bg-gradient-to-b from-[#f9f9f2] via-white to-[#10069F]/10" />
        <div className="relative mx-auto w-full max-w-6xl px-7">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#10069F]">
              {t.heroLabel}
            </p>
            <h1 className="mt-4 pt-4 text-[clamp(2.5rem,4.8vw,3.8rem)] leading-[1.05]">
              {t.heroTitle}
            </h1>
            <p className="mt-4 pt-4 text-lg text-[rgba(17,17,17,0.7)]">
              {t.heroDescription}
            </p>

          </div>
        </div>



         <section className="py-1">
        <div className="mx-auto w-full max-w-6xl px-7">
         

          <div className="mt-8 overflow-hidden rounded-[22px]  bg-white">
            <div className="works-marquee flex w-max gap-4 px-4 py-4">
              {[...worksShowcase, ...worksShowcase].map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className="group relative h-40 w-64 flex-shrink-0 overflow-hidden rounded-[18px]  bg-white"
                >
                  <img
                    src={item.src}
                    alt={item.alt}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>
          <style jsx>{`
            .works-marquee {
              animation: worksScroll 35s linear infinite;
            }
            @keyframes worksScroll {
              from {
                transform: translateX(0);
              }
              to {
                transform: translateX(-50%);
              }
            }
            @media (prefers-reduced-motion: reduce) {
              .works-marquee {
                animation: none;
              }
            }
          `}</style>
        </div>
      </section>


      </section>

      <section id="proposta" className="py-14">
        <div className="mx-auto w-full max-w-6xl px-7">
          <h2 className="text-3xl tracking-[-0.02em] sm:text-4xl">{t.whyTitle}</h2>
          <div className="mt-8 grid gap-2 md:grid-cols-3">
            {t.highlights.map((item) => (
              <div
                key={item.title}
                className="rounded-[18px] border border-[rgba(17,17,17,0.12)] bg-white p-6 pb-8 shadow-[0_18px_40px_rgba(17,17,17,0.08)]"
              >
                <h3 className="text-lg font-semibold text-[#111111]">{item.title}</h3>
                <p className="mt-2 pt-2 text-[rgba(17,17,17,0.68)]">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[18px] border border-[rgba(17,17,17,0.12)] p-6">
              <h3 className="text-xl font-semibold text-[#111111] pt-4">{t.areasTitle}</h3>
              <p className="pt-4 opacity-60">{t.areasDescription}</p>
              <ul className="mt-4 space-y-2 text-[rgba(17,17,17,0.7)]">
                {t.areasList.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className=" h-1 w-1 rounded-full bg-[#10069F]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="overflow-hidden rounded-[18px]">
              <img
                src="https://res.cloudinary.com/dhxfkhewr/image/upload/v1770485409/ma_xuer27.png"
                alt={t.imageAlt}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="contacto" className="bg-[#f7f7f4] py-16">
        <div className="mx-auto w-full max-w-6xl gap-6 px-7 ]">

          <div className="rounded-[18px] border border-[rgba(17,17,17,0.12)] bg-white p-6">
            <h3 className="text-xl font-semibold text-[#111111]">{t.contactTitle}</h3>
            <p className="mt-2 text-[rgba(17,17,17,0.68)]">
              {t.contactDescription}
            </p>
            <form className="mt-4 grid gap-3" onSubmit={handlePartnerSubmit}>
              <input
                className="w-full rounded-[12px] border border-[rgba(17,17,17,0.12)] px-4 py-3 text-sm"
                type="text"
                name="name"
                placeholder={t.contactName}
                required
              />
              <input
                className="w-full rounded-[12px] border border-[rgba(17,17,17,0.12)] px-4 py-3 text-sm"
                type="email"
                name="email"
                placeholder={t.contactEmail}
                required
              />
              <textarea
                className="min-h-[120px] w-full rounded-[12px] border border-[rgba(17,17,17,0.12)] px-4 py-3 text-sm"
                name="message"
                placeholder={t.contactMessage}
                required
              />
              <button
                className="inline-flex items-center justify-center rounded-full bg-[#10069F] px-5 py-3 text-sm font-semibold text-[#fff]"
                type="submit"
              >
                {t.contactSubmit}
              </button>
              {partnerStatus === "success" ? (
                <p className="text-sm text-emerald-600">{t.contactSuccess}</p>
              ) : null}
              {partnerStatus === "error" ? (
                <p className="text-sm text-red-600">{t.contactError}</p>
              ) : null}
            </form>
          </div>
        </div>
      </section>

     

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4  px-7 py-10 text-[rgba(17,17,17,0.68)]">
        <div className="flex items-center gap-4">
          <p>{t.footerCopy}</p>

        </div>
        <div className="flex items-center gap-3 text-[#111111]">
          <a
            href="https://www.instagram.com/maio__azul"
            aria-label="Instagram Maioazul"
            className="transition hover:text-[#111111]/80"
            target="_blank"
            rel="noreferrer"
          >
            <Instagram className="h-5 w-5" />
          </a>
          <a
            href="https://www.facebook.com/profile.php?id=100091540795360"
            aria-label="Facebook Maioazul"
            className="transition hover:text-[#111111]/80"
            target="_blank"
            rel="noreferrer"
          >
            <Facebook className="h-5 w-5" />
          </a>
        </div>

      </footer>
    </div>
  );
}
