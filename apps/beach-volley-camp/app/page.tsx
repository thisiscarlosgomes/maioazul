"use client";

import { useEffect, useState } from "react";
import { Facebook, Instagram, Menu, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CampLocale = "pt" | "en" | "fr";

type CampCard = {
  title: string;
  value: string;
  detail: string;
};

type CampCopy = {
  menuOpen: string;
  menuClose: string;
  navProgram: string;
  navCoach: string;
  navPartners: string;
  navJoin: string;
  navOpenRegistration: string;
  heroDate: string;
  magicTitle: string;
  magicP1: string;
  sessionsStrong: string;
  sessionsRest: string;
  openStrong: string;
  openRest: string;
  scholarshipsStrong: string;
  scholarshipsRest: string;
  coachTitle: string;
  coachP1: string;
  coachP2: string;
  coachP3: string;
  programTitle: string;
  openRegistrationCta: string;
  galleryTitle: string;
  maioTitle: string;
  maioP1: string;
  maioStrong: string;
  maioRest: string;
  footerAbout: string;
  footerProgram: string;
  footerJoin: string;
  altTraining: string;
  altCoach: string;
  altGallery1: string;
  altGallery2: string;
  altGallery3: string;
  altGallery4: string;
  altMaio: string;
  structure: CampCard[];
  experience: CampCard[];
};

const localeOptions: Array<{ code: CampLocale; label: string }> = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
];

const campCopy: Record<CampLocale, CampCopy> = {
  pt: {
    menuOpen: "Abrir menu",
    menuClose: "Fechar menu",
    navProgram: "Programa",
    navCoach: "Coach",
    navPartners: "Parcerias",
    navJoin: "Participe",
    navOpenRegistration: "Inscrição aberta",
    heroDate: "Ilha do Maio · 7-11 de Agosto 2026",
    magicTitle: "Uma Experiência Mágica",
    magicP1:
      "Em agosto de 2026 a ilha do Maio acolhe uma experiência rara: treinar beach volley com tempo, espaço e atenção, orientado por coaching de classe mundial, numa ilha onde o jogo acontece ao ritmo do mar.",
    sessionsStrong: "Sessões diárias até ao pôr do sol",
    sessionsRest:
      ", orientação técnica de excelência e a oportunidade de aprender com um dos melhores treinadores do mundo.",
    openStrong: "Aberto a todos",
    openRest:
      ", de iniciantes curiosos a atletas com experiência que querem evoluir no jogo de volleyball.",
    scholarshipsStrong: "Bolsas sociais",
    scholarshipsRest:
      ", parte das inscrições e parcerias apoia bolsas para jovens do Maio, reforçando impacto social e inclusão.",
    coachTitle: "Conhece o nosso coach",
    coachP1:
      "Márcio Araújo (Brasil) é treinador internacional de beach volley, ex-atleta de alto nível e atual Selecionador Nacional de Cabo Verde. Atua também como coach de empowerment da FIVB.",
    coachP2:
      "Especialista na formação de duplas de alta competição, tem experiência em ciclos de qualificação para Campeonatos do Mundo e Jogos Olímpicos.",
    coachP3:
      "Como atleta, foi campeão do mundo em 2005 e vice-campeão olímpico em 2008.",
    programTitle: "Programa do Camp",
    openRegistrationCta: "Inscrição aberta",
    galleryTitle: "2024 Camp em ação",
    maioTitle: "Uma Experiência Maiense",
    maioP1:
      "A Ilha do Maio é um dos segredos mais bem guardados de Cabo Verde. Praias abertas, ritmo tranquilo e uma relação autêntica entre natureza, comunidade e tempo.",
    maioStrong: "segurança, espaço e proximidade",
    maioRest:
      ". Um lugar onde estar já é, por si só, uma experiência transformadora.",
    footerAbout: "Sobre",
    footerProgram: "Programa",
    footerJoin: "Participe",
    altTraining: "Treino no Maio",
    altCoach: "Márcio Araújo no camp Maioazul",
    altGallery1: "Momento do camp Maioazul",
    altGallery2: "Treino de beach volley no Maio",
    altGallery3: "Atletas em ação no camp",
    altGallery4: "Comunidade e desporto no Maio",
    altMaio: "Paisagens do Maio",
    structure: [
      {
        title: "Duração",
        value: "3 dias",
        detail: "Treino e jogo diário até ao pôr do sol",
      },
      {
        title: "Local",
        value: "Arena Maioazul",
        detail: "Campos profissionais dedicados a beach volley",
      },
      {
        title: "Participantes",
        value: "Aberto a todos",
        detail: "Atletas locais, atletas visitantes",
      },
    ],
    experience: [
      {
        title: "COACHING",
        value: "Treino Profissional",
        detail: "Acompanhamento técnico e feedback contínuo",
      },
      {
        title: "Incluído",
        value: "Pacote Incluído",
        detail: "Treinos e transporte ao alojamento",
      },
      {
        title: "Experiência",
        value: "Workshop & Visita Local",
        detail: "Sessão dedicada a conhecer a ilha do Maio",
      },
    ],
  },
  en: {
    menuOpen: "Open menu",
    menuClose: "Close menu",
    navProgram: "Program",
    navCoach: "Coach",
    navPartners: "Partners",
    navJoin: "Join",
    navOpenRegistration: "Registration open",
    heroDate: "Maio Island · August 7-11, 2026",
    magicTitle: "A Magical Experience",
    magicP1:
      "In August 2026, Maio Island hosts a rare experience: beach volleyball training with time, space, and focus, guided by world-class coaching on an island where the game follows the rhythm of the sea.",
    sessionsStrong: "Daily sessions until sunset",
    sessionsRest:
      ", top technical guidance, and the chance to learn from one of the best coaches in the world.",
    openStrong: "Open to everyone",
    openRest:
      ", from curious beginners to experienced athletes who want to level up their game.",
    scholarshipsStrong: "Social scholarships",
    scholarshipsRest:
      ", part of registrations and partnerships supports scholarships for youth from Maio, strengthening social impact and inclusion.",
    coachTitle: "Meet Our Coach",
    coachP1:
      "Márcio Araújo (Brazil) is an international beach volleyball coach, former elite athlete, and current Head Coach of Cabo Verde's national team. He also works as an FIVB empowerment coach.",
    coachP2:
      "A specialist in building high-performance teams, he has experience in qualification cycles for World Championships and Olympic Games.",
    coachP3:
      "As an athlete, he was world champion in 2005 and Olympic silver medalist in 2008.",
    programTitle: "Camp Program",
    openRegistrationCta: "Registration open",
    galleryTitle: "2024 Camp Highlights",
    maioTitle: "A True Maio Experience",
    maioP1:
      "Maio Island is one of Cabo Verde's best-kept secrets. Open beaches, a calm rhythm, and an authentic connection between nature, community, and time.",
    maioStrong: "safety, space, and closeness",
    maioRest: ". A place where simply being there is already transformative.",
    footerAbout: "About",
    footerProgram: "Program",
    footerJoin: "Join",
    altTraining: "Training session in Maio",
    altCoach: "Márcio Araújo at Maioazul camp",
    altGallery1: "Camp moment in Maioazul",
    altGallery2: "Beach volleyball training in Maio",
    altGallery3: "Athletes in action at camp",
    altGallery4: "Community and sport in Maio",
    altMaio: "Maio landscapes",
    structure: [
      {
        title: "Duration",
        value: "3 days",
        detail: "Daily training and games until sunset",
      },
      {
        title: "Location",
        value: "Maioazul Arena",
        detail: "Professional courts dedicated to beach volleyball",
      },
      {
        title: "Participants",
        value: "Open to all",
        detail: "Local and visiting athletes",
      },
    ],
    experience: [
      {
        title: "COACHING",
        value: "Professional Training",
        detail: "Technical support and continuous feedback",
      },
      {
        title: "Included",
        value: "Included Package",
        detail: "Training sessions and transport to lodging",
      },
      {
        title: "Experience",
        value: "Workshop & Local Visit",
        detail: "Dedicated session to discover Maio Island",
      },
    ],
  },
  fr: {
    menuOpen: "Ouvrir le menu",
    menuClose: "Fermer le menu",
    navProgram: "Programme",
    navCoach: "Coach",
    navPartners: "Partenaires",
    navJoin: "Participer",
    navOpenRegistration: "Inscriptions ouvertes",
    heroDate: "Ile de Maio · 7-11 aout 2026",
    magicTitle: "Une Experience Magique",
    magicP1:
      "En aout 2026, l'ile de Maio accueille une experience rare: s'entrainer au beach-volley avec du temps, de l'espace et de l'attention, guide par un coaching de classe mondiale sur une ile ou le jeu suit le rythme de la mer.",
    sessionsStrong: "Sessions quotidiennes jusqu'au coucher du soleil",
    sessionsRest:
      ", accompagnement technique d'excellence et opportunite d'apprendre avec l'un des meilleurs coachs au monde.",
    openStrong: "Ouvert a tous",
    openRest:
      ", des debutants curieux aux athletes experimentes qui veulent progresser.",
    scholarshipsStrong: "Bourses sociales",
    scholarshipsRest:
      ", une partie des inscriptions et partenariats finance des bourses pour les jeunes de Maio, renforcant l'impact social et l'inclusion.",
    coachTitle: "Rencontrez Notre Coach",
    coachP1:
      "Marcio Araujo (Bresil) est coach international de beach-volley, ancien athlete de haut niveau et selectionneur national du Cabo Verde. Il intervient aussi comme coach empowerment pour la FIVB.",
    coachP2:
      "Specialiste de la formation de duos de haute performance, il possede une experience des cycles de qualification pour les Championnats du Monde et les Jeux Olympiques.",
    coachP3:
      "Comme athlete, il a ete champion du monde en 2005 et vice-champion olympique en 2008.",
    programTitle: "Programme du Camp",
    openRegistrationCta: "Inscriptions ouvertes",
    galleryTitle: "Camp 2024 en images",
    maioTitle: "Une Experience Authentique de Maio",
    maioP1:
      "L'ile de Maio est l'un des secrets les mieux gardes du Cabo Verde. Plages ouvertes, rythme paisible et relation authentique entre nature, communaute et temps.",
    maioStrong: "securite, espace et proximite",
    maioRest:
      ". Un lieu ou etre present est deja, en soi, une experience transformatrice.",
    footerAbout: "A propos",
    footerProgram: "Programme",
    footerJoin: "Participer",
    altTraining: "Entrainement a Maio",
    altCoach: "Marcio Araujo au camp Maioazul",
    altGallery1: "Moment du camp Maioazul",
    altGallery2: "Entrainement beach-volley a Maio",
    altGallery3: "Athletes en action au camp",
    altGallery4: "Communaute et sport a Maio",
    altMaio: "Paysages de Maio",
    structure: [
      {
        title: "Duree",
        value: "3 jours",
        detail: "Entrainement et matchs quotidiens jusqu'au coucher du soleil",
      },
      {
        title: "Lieu",
        value: "Arena Maioazul",
        detail: "Terrains professionnels dedies au beach-volley",
      },
      {
        title: "Participants",
        value: "Ouvert a tous",
        detail: "Athletes locaux et visiteurs",
      },
    ],
    experience: [
      {
        title: "COACHING",
        value: "Entrainement Professionnel",
        detail: "Suivi technique et feedback continu",
      },
      {
        title: "Inclus",
        value: "Pack Inclus",
        detail: "Entrainements et transport vers l'hebergement",
      },
      {
        title: "Experience",
        value: "Workshop & Visite Locale",
        detail: "Session dediee a la decouverte de l'ile de Maio",
      },
    ],
  },
};

export default function CampPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [locale, setLocale] = useState<CampLocale>("pt");

  useEffect(() => {
    const lang = new URLSearchParams(window.location.search).get("lang");
    if (lang === "pt" || lang === "en" || lang === "fr") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocale(lang);
    }
  }, []);

  function handleLocaleChange(nextLocale: CampLocale) {
    setLocale(nextLocale);
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    if (nextLocale === "pt") {
      params.delete("lang");
    } else {
      params.set("lang", nextLocale);
    }
    const nextQuery = params.toString();
    const nextUrl = `${url.pathname}${nextQuery ? `?${nextQuery}` : ""}${url.hash}`;
    window.history.replaceState(null, "", nextUrl);
  }

  const t = campCopy[locale];
  const registerHref = locale === "pt" ? "/register" : `/register?lang=${locale}`;

  return (
    <div className="bg-white text-[#111111]">
      <section
        id="sobre"
        className="relative flex min-h-[76vh] items-center justify-center overflow-hidden text-center text-white"
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="https://res.cloudinary.com/dhxfkhewr/image/upload/v1770466647/maioazul/camp/volley.jpg"
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source
            src="https://res.cloudinary.com/dhxfkhewr/video/upload/v1770462484/camp-compressed_upb9oz.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/55 to-black/70" />

        <header className="absolute inset-x-0 top-0 z-50">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-7 pb-2 pt-7">
            <a href="#sobre" aria-label="Maioazul Beach Volley Camp" className="inline-flex">
              <img className="h-[19px] w-auto" src="/mb.svg" alt="Maioazul" />
            </a>
            <nav className="hidden items-center gap-4 text-sm font-semibold text-white/85 md:flex">
              <a className="transition hover:text-[#CEEC58]" href="#estrutura">
                {t.navProgram}
              </a>
              <a className="transition hover:text-[#CEEC58]" href="#coach">
                {t.navCoach}
              </a>
              <a className="transition hover:text-[#CEEC58]" href="https://maioazul.com/partners">
                {t.navPartners}
              </a>
              <a
                className="!text-black inline-flex items-center justify-center rounded-full border border-white/40 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition"
                href={registerHref}
              >
                {t.navJoin}
              </a>
              <Select value={locale} onValueChange={(value) => handleLocaleChange(value as CampLocale)}>
                <SelectTrigger
                  aria-label="Select language"
                  className="rounded-full h-8 w-[56px] border-white/40 bg-white/15 px-3 text-[11px] font-semibold text-white ring-0 focus:ring-0 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-80"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {localeOptions.map((item) => (
                    <SelectItem key={item.code} value={item.code} className="text-xs">
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </nav>
            <div className="flex items-center gap-2 md:hidden">
              <Select value={locale} onValueChange={(value) => handleLocaleChange(value as CampLocale)}>
                <SelectTrigger
                  aria-label="Select language"
                  className="h-8 w-[86px] border-white/70 bg-white px-2 text-xs font-semibold text-[#111111] ring-0 focus:ring-0 [&>svg]:h-3 [&>svg]:w-3"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {localeOptions.map((item) => (
                    <SelectItem key={item.code} value={item.code} className="text-xs">
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                aria-label={menuOpen ? t.menuClose : t.menuOpen}
                aria-expanded={menuOpen}
                className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 p-2 text-white"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div className={`z-50 mx-auto w-full max-w-6xl px-7 pb-5 md:hidden ${menuOpen ? "block" : "hidden"}`}>
            <div className="rounded-[18px] border border-[rgba(17,17,17,0.12)] bg-white p-4 text-[#111111] shadow-[0_20px_40px_rgba(17,17,17,0.12)]">
              <nav className="flex flex-col gap-4 text-sm font-semibold">
                <a className="transition hover:text-[#111111]" href="#estrutura">
                  {t.navProgram}
                </a>
                <a className="transition hover:text-[#111111]" href="#coach">
                  {t.navCoach}
                </a>
                <a className="transition hover:text-[#111111]" href="https://maioazul.com/partners">
                  {t.navPartners}
                </a>
                <a
                  className="inline-flex items-center justify-center rounded-full bg-[#CEEC58] px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-black"
                  href={registerHref}
                >
                  {t.navOpenRegistration}
                </a>
              </nav>
            </div>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-3">
          <h1 className="text-[clamp(2.8rem,6vw,5rem)] leading-tight">Maio Beach Volley Camp</h1>
          <p className="text-[clamp(1.2rem,3vw,1.3rem)] tracking-[0.05em] text-white/85">{t.heroDate}</p>
        </div>
      </section>

      <section id="sobre-detalhe" className="py-16">
        <div className="mx-auto w-full max-w-6xl px-7">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="relative inline-block text-3xl tracking-[-0.02em] sm:text-4xl">
              {t.magicTitle}
              <svg
                className="absolute left-1/2 top-full mt-2 h-3 w-[240px] -translate-x-1/2 text-[#CEEC58]"
                viewBox="0 0 240 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M4 18C32 6 56 6 84 14C112 22 136 22 164 12C192 2 212 4 236 12"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              </svg>
            </h2>
          </div>

          <div className="mt-12 grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_20px_50px_rgba(17,17,17,0.12)]">
              <img
                src="https://res.cloudinary.com/dhxfkhewr/image/upload/v1770466647/maioazul/camp/volley.jpg"
                alt={t.altTraining}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="space-y-6 leading-tight text-[rgba(17,17,17,0.68)]">
              <p className="pt-2 text-lg">{t.magicP1}</p>
              <p className="text-lg">
                <span className="font-semibold text-[#111111]">{t.sessionsStrong}</span>
                {t.sessionsRest}
              </p>
              <p className="text-lg">
                <span className="font-semibold text-[#111111]">{t.openStrong}</span>
                {t.openRest}
              </p>
              <p className="text-lg">
                <span className="font-semibold text-[#111111]">{t.scholarshipsStrong}</span>
                {t.scholarshipsRest}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="coach" className="py-16">
        <div className="mx-auto w-full max-w-6xl px-7">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="relative inline-block text-3xl tracking-[-0.02em] sm:text-4xl">
              {t.coachTitle}
              <svg
                className="absolute left-1/2 top-full mt-2 h-3 w-[240px] -translate-x-1/2 text-[#CEEC58]"
                viewBox="0 0 240 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M4 18C32 6 56 6 84 14C112 22 136 22 164 12C192 2 212 4 236 12"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              </svg>
            </h2>
          </div>

          <div className="mt-12 grid items-start gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="order-2 space-y-6 text-[rgba(17,17,17,0.68)] lg:order-1">
              <p className="text-lg">{t.coachP1}</p>
              <p className="text-lg">{t.coachP2}</p>
              <p className="text-lg">{t.coachP3}</p>
            </div>
            <div className="order-1 overflow-hidden rounded-[18px] bg-white shadow-[0_20px_50px_rgba(17,17,17,0.12)] lg:order-2">
              <img
                src="https://res.cloudinary.com/dhxfkhewr/image/upload/v1770466649/maioazul/camp/coach.jpg"
                alt={t.altCoach}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="estrutura" className="bg-[#ADD7E4]/30 py-16">
        <div className="mx-auto w-full max-w-6xl px-7">
          <h2 className="text-center font-[Playfair_Display] text-3xl tracking-[-0.02em] sm:text-4xl">{t.programTitle}</h2>
          <div className="mt-6 grid gap-2 md:grid-cols-3">
            {t.structure.map((item) => (
              <div key={item.title} className="rounded-[18px] bg-white p-6">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(17,17,17,0.6)]">{item.title}</span>
                <strong className="mt-1 block text-lg font-semibold text-[#111111]">{item.value}</strong>
                <p className="mt-2 text-sm text-[rgba(17,17,17,0.6)]">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-2 grid gap-2 md:grid-cols-3">
            {t.experience.map((item) => (
              <div key={item.title} className="rounded-[18px] bg-white p-6">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(17,17,17,0.6)]">{item.title}</span>
                <strong className="mt-1 block text-lg font-semibold text-[#111111]">{item.value}</strong>
                <p className="mt-2 text-sm text-[rgba(17,17,17,0.6)]">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <a
              className="inline-flex items-center justify-center rounded-full bg-[#CEEC58] px-7 py-3 text-sm font-semibold text-[#111111]"
              href={registerHref}
            >
              {t.openRegistrationCta}
            </a>
          </div>
        </div>
      </section>

      <section id="programa" className="py-16">
        <div className="mx-auto w-full max-w-6xl px-7">
          <div className="mx-auto mb-6 max-w-4xl pb-6 text-center">
            <h2 className="relative inline-block text-3xl tracking-[-0.02em] sm:text-4xl">
              {t.galleryTitle}
              <svg
                className="absolute left-1/2 top-full mt-2 h-3 w-[240px] -translate-x-1/2 text-[#CEEC58]"
                viewBox="0 0 240 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M4 18C32 6 56 6 84 14C112 22 136 22 164 12C192 2 212 4 236 12"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              </svg>
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <img
              src="https://res.cloudinary.com/dhxfkhewr/image/upload/v1770466661/maioazul/camp/5.jpg"
              alt={t.altGallery1}
              className="h-64 w-full rounded-[24px] object-cover sm:h-72 lg:h-80"
            />
            <img
              src="https://res.cloudinary.com/dhxfkhewr/image/upload/v1770466658/maioazul/camp/4.jpg"
              alt={t.altGallery2}
              className="h-64 w-full rounded-[24px] object-cover sm:h-72 lg:h-80"
            />
            <img
              src="https://res.cloudinary.com/dhxfkhewr/image/upload/v1770466655/maioazul/camp/3.jpg"
              alt={t.altGallery3}
              className="h-64 w-full rounded-[24px] object-cover sm:h-72 lg:h-80"
            />
            <img
              src="https://res.cloudinary.com/dhxfkhewr/image/upload/v1770466652/maioazul/camp/2.jpg"
              alt={t.altGallery4}
              className="h-64 w-full rounded-[24px] object-cover sm:h-72 lg:h-80"
            />
          </div>
        </div>
      </section>

      <section id="maio" className="pb-16 pt-8">
        <div className="mx-auto w-full max-w-4xl px-7 text-center">
          <h2 className="relative mb-4 inline-block text-3xl tracking-[-0.02em] sm:text-4xl">{t.maioTitle}</h2>
          <div className="mx-auto mt-8 max-w-2xl text-center">
            <p className="mt-10 text-[rgba(17,17,17,0.68)]">{t.maioP1}</p>
            <p className="text-[rgba(17,17,17,0.68)]">
              <span className="font-semibold text-[#111111]">{t.maioStrong}</span>
              {t.maioRest}
            </p>
          </div>

          <img
            src="https://res.cloudinary.com/dhxfkhewr/image/upload/v1770479984/maio_mmwz9u.png"
            alt={t.altMaio}
            className="mx-auto mt-6 h-100 w-full rounded-[28px] object-cover sm:h-100"
          />
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 border-t border-[rgba(17,17,17,0.12)] px-7 py-6 text-[rgba(17,17,17,0.68)]">
        <div className="flex items-center gap-4">
          <p>© 2026 Maioazul.com</p>
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
        </div>
        <div className="hidden items-center gap-4 text-sm font-semibold text-[#111111]/70 md:flex">
          <a className="transition hover:text-[#111111]" href="#sobre-detalhe">
            {t.footerAbout}
          </a>
          <a className="transition hover:text-[#111111]" href="#estrutura">
            {t.footerProgram}
          </a>
          <a className="transition hover:text-[#111111]" href="https://maioazul.com/partners">
            {t.navPartners}
          </a>
          <a className="transition hover:text-[#111111]" href={registerHref}>
            {t.footerJoin}
          </a>
        </div>
      </footer>
    </div>
  );
}
